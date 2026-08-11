import * as THREE from 'three'

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

const MAX_PARTICLES = 600
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
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.positions[i * 3 + 1] = HIDDEN_Y
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

    const material = new THREE.PointsMaterial({
      size: 0.06,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
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
  }
}
