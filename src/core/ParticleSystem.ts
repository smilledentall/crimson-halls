import * as THREE from 'three'
import vertexShader from '../shaders/particleVertex.glsl?raw'
import fragmentShader from '../shaders/particleFragment.glsl?raw'

export interface BurstSpec {
  position: THREE.Vector3
  /** Número de partículas. */
  count: number
  /** Direção base do jato (sofre dispersão aleatória). */
  direction: THREE.Vector3
  speed: number
  /** Dispersão angular máxima, em radianos. */
  spread: number
  size: number
  /** Tempo de vida em segundos. */
  life: number
  /** Aceleração para baixo (m/s²). 0 = sem gravidade. */
  gravity: number
  color: THREE.Color
  /** Componente extra de velocidade para cima (poeira). */
  lift?: number
}

interface Particle {
  index: number
  active: boolean
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  size: number
  life: number
  maxLife: number
  gravity: number
}

const MAX_PARTICLES = 1500
const HIDDEN_Y = -1000

/**
 * Sistema de partículas simples e reutilizável, baseado em THREE.Points
 * com um pool fixo (sem alocações no loop). Efeitos são disparados com
 * spawnBurst(spec) — o core não conhece efeitos específicos.
 */
export class ParticleSystem {
  private readonly points: THREE.Points
  private readonly geometry: THREE.BufferGeometry
  private readonly positions: Float32Array
  private readonly colors: Float32Array
  private readonly sizes: Float32Array
  private readonly alphas: Float32Array
  private readonly pool: Particle[] = []
  private cursor = 0
  private anyActive = false
  private quality = 1

  /** Escala a quantidade de partículas (0..1) — qualidade gráfica baixa. */
  setQuality(quality: number): void {
    this.quality = Math.max(0.1, Math.min(1, quality))
  }

  constructor(scene: THREE.Scene) {
    this.positions = new Float32Array(MAX_PARTICLES * 3)
    this.colors = new Float32Array(MAX_PARTICLES * 3)
    this.sizes = new Float32Array(MAX_PARTICLES)
    this.alphas = new Float32Array(MAX_PARTICLES)
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.positions[i * 3 + 1] = HIDDEN_Y
      this.sizes[i] = 0.06
      this.alphas[i] = 0
      this.pool.push({
        index: i,
        active: false,
        position: new THREE.Vector3(0, HIDDEN_Y, 0),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(0xffffff),
        size: 0.05,
        life: 0,
        maxLife: 1,
        gravity: 0,
      })
    }

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1))

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.points = new THREE.Points(this.geometry, material)
    this.points.frustumCulled = false
    scene.add(this.points)
  }

  spawnBurst(spec: BurstSpec): void {
    const base = spec.direction.clone().normalize()
    const color = spec.color.clone()
    const count = Math.max(1, Math.round(spec.count * this.quality))
    for (let i = 0; i < count; i++) {
      const p = this.pool[this.cursor]
      this.cursor = (this.cursor + 1) % MAX_PARTICLES

      // Direção aleatória dentro de um cone em volta da direção base.
      const vx = base.x + (Math.random() * 2 - 1) * spec.spread
      const vy = base.y + (Math.random() * 2 - 1) * spec.spread + (spec.lift ?? 0)
      const vz = base.z + (Math.random() * 2 - 1) * spec.spread
      const length = Math.hypot(vx, vy, vz) || 1
      const speed = spec.speed * (0.4 + Math.random() * 0.6)

      p.active = true
      p.position.copy(spec.position)
      p.velocity.set((vx / length) * speed, (vy / length) * speed, (vz / length) * speed)
      p.maxLife = spec.life * (0.6 + Math.random() * 0.4)
      p.life = p.maxLife
      p.size = spec.size
      p.gravity = spec.gravity
      p.color.copy(color).multiplyScalar(0.6 + Math.random() * 0.4)
      this.syncParticle(p)
    }
    this.anyActive = true
  }

  /** Explosão reutilizável (foguete, kamikaze). `scale` controla o tamanho. */
  explosion(position: THREE.Vector3, scale = 1): void {
    const pos = position.clone()
    this.spawnBurst({
      position: pos,
      count: Math.round(20 * scale),
      direction: new THREE.Vector3(0, 1, 0),
      speed: 5.5 * scale,
      spread: 1.5,
      size: 0.12 * scale,
      life: 0.6,
      gravity: 7,
      lift: 1.4,
      color: new THREE.Color(0xff9f43),
    })
    this.spawnBurst({
      position: pos,
      count: Math.round(12 * scale),
      direction: new THREE.Vector3(0, 0.4, 0),
      speed: 2,
      spread: 1.6,
      size: 0.09 * scale,
      life: 0.9,
      gravity: 2,
      lift: 0.6,
      color: new THREE.Color(0x3a2025),
    })
    this.spawnBurst({
      position: pos,
      count: Math.round(10 * scale),
      direction: new THREE.Vector3(0, 0.3, 0),
      speed: 7 * scale,
      spread: 2,
      size: 0.05,
      life: 0.3,
      gravity: 0,
      lift: 0,
      color: new THREE.Color(0xffe0a0),
    })
  }

  /** Emissor contínuo de chama (cressets): partículas nascem na abertura da
   *  taça, sobem uma distância curta com pouca dispersão lateral (labareda).
   *  Chame uma vez por frame por fonte; `intensity` escala a taxa de emissão.
   *
   *  Duas camadas: um núcleo denso/brilhante no centro (maior, mais lento,
   *  mais vida) dá o "corpo" da chama, e labaredas menores ao redor sobem
   *  mais rápido — profundidade visual sem explodir a contagem de partículas.
   */
  spawnFlame(position: THREE.Vector3, intensity = 1): void {
    const scale = this.quality * intensity

    // Núcleo da chama: 1 a cada ~2 frames, maior e mais lento, vida longa.
    if (Math.random() < 0.55 * scale) {
      const core = this.pool[this.cursor]
      this.cursor = (this.cursor + 1) % MAX_PARTICLES
      core.active = true
      core.position.set(
        position.x + (Math.random() * 2 - 1) * 0.02,
        position.y + Math.random() * 0.05,
        position.z + (Math.random() * 2 - 1) * 0.02,
      )
      core.velocity.set(
        (Math.random() * 2 - 1) * 0.1,
        0.5 + Math.random() * 0.3,
        (Math.random() * 2 - 1) * 0.1,
      )
      core.maxLife = 0.55 + Math.random() * 0.25
      core.life = core.maxLife
      core.size = 0.17
      core.gravity = 0.2
      core.color.copy(new THREE.Color(1, 0.75 + Math.random() * 0.2, 0.35 + Math.random() * 0.15))
      this.syncParticle(core)
    }

    // Labaredas: mais partículas, menores, sobem mais rápido e mais alto.
    const rate = Math.round((2.2 + Math.random() * 0.8) * scale)
    for (let i = 0; i < rate; i++) {
      const p = this.pool[this.cursor]
      this.cursor = (this.cursor + 1) % MAX_PARTICLES
      p.active = true
      // Nasce bem na abertura da taça, com leve jitter horizontal.
      p.position.set(
        position.x + (Math.random() * 2 - 1) * 0.05,
        position.y + Math.random() * 0.04,
        position.z + (Math.random() * 2 - 1) * 0.05,
      )
      // Sobe quase vertical, com dispersão lateral mínima (chama fina).
      p.velocity.set(
        (Math.random() * 2 - 1) * 0.2,
        0.9 + Math.random() * 0.5,
        (Math.random() * 2 - 1) * 0.2,
      )
      // Vida curta: a labareda sobe pouco e some.
      p.maxLife = 0.35 + Math.random() * 0.2
      p.life = p.maxLife
      p.size = 0.11
      p.gravity = 0.4 // leve desaceleração — não sobe como balão
      // Núcleo amarelo esbranquiçado, ponta mais alaranjada.
      const t = Math.random()
      p.color.copy(new THREE.Color(1, 0.6 + t * 0.3, 0.2 + t * 0.15))
      this.syncParticle(p)
    }
    this.anyActive = true
  }

  update(dt: number): void {
    if (!this.anyActive) return
    let remaining = false
    for (const p of this.pool) {
      if (!p.active) continue
      p.life -= dt
      if (p.life <= 0) {
        p.active = false
        p.position.y = HIDDEN_Y
        this.syncParticle(p)
        continue
      }
      p.velocity.y -= p.gravity * dt
      p.position.addScaledVector(p.velocity, dt)
      // Desvanece com a vida (com AdditiveBlending, escurecer = sumir).
      p.color.multiplyScalar(Math.max(0, 1 - dt * 5))
      this.syncParticle(p)
      remaining = true
    }
    this.anyActive = remaining
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true
    this.geometry.attributes.alpha.needsUpdate = true
  }

  dispose(): void {
    this.points.parent?.remove(this.points)
    this.geometry.dispose()
    const material = this.points.material
    if (Array.isArray(material)) material.forEach(m => m.dispose())
    else material.dispose()
  }

  private syncParticle(p: Particle): void {
    const i = p.index * 3
    this.positions[i] = p.position.x
    this.positions[i + 1] = p.position.y
    this.positions[i + 2] = p.position.z
    this.colors[i] = p.color.r
    this.colors[i + 1] = p.color.g
    this.colors[i + 2] = p.color.b
    this.sizes[p.index] = p.size
    this.alphas[p.index] = p.active ? Math.max(0, Math.min(1, p.life / p.maxLife)) : 0
  }
}
