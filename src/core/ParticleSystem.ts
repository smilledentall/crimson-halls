import * as THREE from 'three'
import vertexShader from '../shaders/particleVertex.glsl?raw'
import fragmentShader from '../shaders/particleFragment.glsl?raw'
import bloodVertexShader from '../shaders/bloodVertex.glsl?raw'
import bloodFragmentShader from '../shaders/bloodFragment.glsl?raw'

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

/** Estado de nascimento de uma partícula (o que a CPU escreve ao emitir). */
interface ParticleSpawn {
  index: number
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  size: number
  maxLife: number
  gravity: number
}

const MAX_PARTICLES = 3000
const MAX_BLOOD = 300
const FLOOR_Y = 0.02

/**
 * Sistema de partículas acelerado por GPU. A CPU apenas emite partículas
 * (escreve o estado de nascimento num pool fixo, sem alocações no loop) e a
 * simulação — integração da velocidade com gravidade, posição, desvanecimento
 * de cor/alpha e "empogamento" do sangue no chão — roda nos VERTEX SHADERS,
 * dirigida pelo uniform uTime. update() só avança o relógio.
 */
export class ParticleSystem {
  private readonly points: THREE.Points
  private readonly geometry: THREE.BufferGeometry
  private readonly bloodPoints: THREE.Points
  private readonly bloodGeometry: THREE.BufferGeometry
  private readonly particleMaterial: THREE.ShaderMaterial
  private readonly bloodMaterial: THREE.ShaderMaterial

  // Atributos de nascimento (1 por partícula, escritos pela CPU ao emitir).
  private readonly birthPositions: Float32Array
  private readonly birthVelocities: Float32Array
  private readonly colors: Float32Array
  private readonly sizes: Float32Array
  private readonly maxLives: Float32Array
  private readonly gravities: Float32Array
  private readonly birthTimes: Float32Array

  private readonly bloodBirthPositions: Float32Array
  private readonly bloodBirthVelocities: Float32Array
  private readonly bloodColors: Float32Array
  private readonly bloodSizes: Float32Array
  private readonly bloodMaxLives: Float32Array
  private readonly bloodGravities: Float32Array
  private readonly bloodBirthTimes: Float32Array

  private readonly pool: ParticleSpawn[] = []
  private cursor = 0
  private readonly bloodPool: ParticleSpawn[] = []
  private bloodCursor = 0

  private quality = 1
  private elapsed = 0

  /** Escala a quantidade de partículas (0..1) — qualidade gráfica baixa. */
  setQuality(quality: number): void {
    this.quality = Math.max(0.1, Math.min(1, quality))
  }

  constructor(scene: THREE.Scene) {
    this.birthPositions = new Float32Array(MAX_PARTICLES * 3)
    this.birthVelocities = new Float32Array(MAX_PARTICLES * 3)
    this.colors = new Float32Array(MAX_PARTICLES * 3)
    this.sizes = new Float32Array(MAX_PARTICLES)
    this.maxLives = new Float32Array(MAX_PARTICLES)
    this.gravities = new Float32Array(MAX_PARTICLES)
    this.birthTimes = new Float32Array(MAX_PARTICLES)
    for (let i = 0; i < MAX_PARTICLES; i++) {
      // birthTime muito negativo → age > maxLife → partícula oculta na GPU.
      this.birthTimes[i] = -1e9
      this.sizes[i] = 0.06
      this.maxLives[i] = 1
      this.pool.push({
        index: i,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(0xffffff),
        size: 0.05,
        maxLife: 1,
        gravity: 0,
      })
    }

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute(
      'birthPosition',
      new THREE.BufferAttribute(this.birthPositions, 3),
    )
    this.geometry.setAttribute(
      'birthVelocity',
      new THREE.BufferAttribute(this.birthVelocities, 3),
    )
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))
    this.geometry.setAttribute('maxLife', new THREE.BufferAttribute(this.maxLives, 1))
    this.geometry.setAttribute('gravity', new THREE.BufferAttribute(this.gravities, 1))
    this.geometry.setAttribute('birthTime', new THREE.BufferAttribute(this.birthTimes, 1))
    // Atributo 'position' presente (mesmo que não usado no shader): o three
    // usa position.count como contagem do draw — sem ele, drawCount vira
    // Infinity e o renderer descarta a malha (partículas invisíveis).
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3),
    )

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
    })
    this.particleMaterial = material
    this.points = new THREE.Points(this.geometry, material)
    this.points.frustumCulled = false
    scene.add(this.points)

    // Camada de sangue (normal blending): pool fixo separado.
    this.bloodBirthPositions = new Float32Array(MAX_BLOOD * 3)
    this.bloodBirthVelocities = new Float32Array(MAX_BLOOD * 3)
    this.bloodColors = new Float32Array(MAX_BLOOD * 3)
    this.bloodSizes = new Float32Array(MAX_BLOOD)
    this.bloodMaxLives = new Float32Array(MAX_BLOOD)
    this.bloodGravities = new Float32Array(MAX_BLOOD)
    this.bloodBirthTimes = new Float32Array(MAX_BLOOD)
    for (let i = 0; i < MAX_BLOOD; i++) {
      this.bloodBirthTimes[i] = -1e9
      this.bloodSizes[i] = 0.06
      this.bloodMaxLives[i] = 1
      this.bloodPool.push({
        index: i,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(0x8a0000),
        size: 0.05,
        maxLife: 1,
        gravity: 0,
      })
    }

    this.bloodGeometry = new THREE.BufferGeometry()
    this.bloodGeometry.setAttribute(
      'birthPosition',
      new THREE.BufferAttribute(this.bloodBirthPositions, 3),
    )
    this.bloodGeometry.setAttribute(
      'birthVelocity',
      new THREE.BufferAttribute(this.bloodBirthVelocities, 3),
    )
    this.bloodGeometry.setAttribute('color', new THREE.BufferAttribute(this.bloodColors, 3))
    this.bloodGeometry.setAttribute('size', new THREE.BufferAttribute(this.bloodSizes, 1))
    this.bloodGeometry.setAttribute(
      'maxLife',
      new THREE.BufferAttribute(this.bloodMaxLives, 1),
    )
    this.bloodGeometry.setAttribute(
      'gravity',
      new THREE.BufferAttribute(this.bloodGravities, 1),
    )
    this.bloodGeometry.setAttribute(
      'birthTime',
      new THREE.BufferAttribute(this.bloodBirthTimes, 1),
    )
    // Idem: 'position' presente para o three derivar a contagem do draw.
    this.bloodGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(MAX_BLOOD * 3), 3),
    )

    const bloodMaterial = new THREE.ShaderMaterial({
      vertexShader: bloodVertexShader,
      fragmentShader: bloodFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: { uTime: { value: 0 }, uFloorY: { value: FLOOR_Y } },
    })
    this.bloodMaterial = bloodMaterial
    this.bloodPoints = new THREE.Points(this.bloodGeometry, bloodMaterial)
    this.bloodPoints.frustumCulled = false
    scene.add(this.bloodPoints)
  }

  /** Escreve o estado de nascimento de uma partícula do pool principal. */
  private emitBurst(spec: BurstSpec): void {
    const base = spec.direction.clone().normalize()
    const color = spec.color.clone()
    const count = Math.max(1, Math.round(spec.count * this.quality))
    for (let i = 0; i < count; i++) {
      const p = this.pool[this.cursor]
      this.cursor = (this.cursor + 1) % MAX_PARTICLES

      const vx = base.x + (Math.random() * 2 - 1) * spec.spread
      const vy = base.y + (Math.random() * 2 - 1) * spec.spread + (spec.lift ?? 0)
      const vz = base.z + (Math.random() * 2 - 1) * spec.spread
      const length = Math.hypot(vx, vy, vz) || 1
      const speed = spec.speed * (0.4 + Math.random() * 0.6)

      const idx = p.index
      this.birthPositions[idx * 3] = spec.position.x
      this.birthPositions[idx * 3 + 1] = spec.position.y
      this.birthPositions[idx * 3 + 2] = spec.position.z
      const vMag = speed / length
      this.birthVelocities[idx * 3] = vx * vMag
      this.birthVelocities[idx * 3 + 1] = vy * vMag
      this.birthVelocities[idx * 3 + 2] = vz * vMag
      const c = color.clone().multiplyScalar(0.6 + Math.random() * 0.4)
      this.colors[idx * 3] = c.r
      this.colors[idx * 3 + 1] = c.g
      this.colors[idx * 3 + 2] = c.b
      this.sizes[idx] = spec.size
      this.maxLives[idx] = spec.life * (0.6 + Math.random() * 0.4)
      this.gravities[idx] = spec.gravity
      this.birthTimes[idx] = this.elapsed
    }
    this.geometry.attributes.birthPosition.needsUpdate = true
    this.geometry.attributes.birthVelocity.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true
    this.geometry.attributes.maxLife.needsUpdate = true
    this.geometry.attributes.gravity.needsUpdate = true
    this.geometry.attributes.birthTime.needsUpdate = true
  }

  /** Escreve o estado de nascimento de uma partícula de sangue. */
  private emitBlood(spec: BurstSpec): void {
    const base = spec.direction.clone().normalize()
    const count = Math.max(1, Math.round(spec.count * this.quality))
    for (let i = 0; i < count; i++) {
      const p = this.bloodPool[this.bloodCursor]
      this.bloodCursor = (this.bloodCursor + 1) % MAX_BLOOD

      const vx = base.x + (Math.random() * 2 - 1) * spec.spread
      const vy = base.y + (Math.random() * 2 - 1) * spec.spread + (spec.lift ?? 0)
      const vz = base.z + (Math.random() * 2 - 1) * spec.spread
      const length = Math.hypot(vx, vy, vz) || 1
      const speed = spec.speed * (0.5 + Math.random() * 0.7)

      const idx = p.index
      this.bloodBirthPositions[idx * 3] = spec.position.x
      this.bloodBirthPositions[idx * 3 + 1] = spec.position.y
      this.bloodBirthPositions[idx * 3 + 2] = spec.position.z
      const vMag = speed / length
      this.bloodBirthVelocities[idx * 3] = vx * vMag
      this.bloodBirthVelocities[idx * 3 + 1] = vy * vMag
      this.bloodBirthVelocities[idx * 3 + 2] = vz * vMag
      const c = spec.color.clone().multiplyScalar(0.55 + Math.random() * 0.45)
      this.bloodColors[idx * 3] = c.r
      this.bloodColors[idx * 3 + 1] = c.g
      this.bloodColors[idx * 3 + 2] = c.b
      this.bloodSizes[idx] = spec.size * (0.7 + Math.random() * 0.6)
      this.bloodMaxLives[idx] = spec.life * (0.6 + Math.random() * 0.4)
      this.bloodGravities[idx] = spec.gravity
      this.bloodBirthTimes[idx] = this.elapsed
    }
    this.bloodGeometry.attributes.birthPosition.needsUpdate = true
    this.bloodGeometry.attributes.birthVelocity.needsUpdate = true
    this.bloodGeometry.attributes.color.needsUpdate = true
    this.bloodGeometry.attributes.size.needsUpdate = true
    this.bloodGeometry.attributes.maxLife.needsUpdate = true
    this.bloodGeometry.attributes.gravity.needsUpdate = true
    this.bloodGeometry.attributes.birthTime.needsUpdate = true
  }

  spawnBurst(spec: BurstSpec): void {
    this.emitBurst(spec)
  }

  /**
   * Respingo de sangue: gotas opacas que espirram na direção do tiro, caem
   * com gravidade forte e "empocam" no chão (a GPU encosta na FLOOR_Y e
   * desvanece devagar). Não usa blending aditivo — sangue escuro.
   */
  spawnBlood(spec: BurstSpec): void {
    this.emitBlood(spec)
  }

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

  /** Emissor contínuo de chama (cressets): a CPU emite a cada frame na abertura
   *  da taça e a GPU integra a subida. `intensity` escala a taxa de emissão.
   *  Chame uma vez por frame por fonte.
   */
  spawnFlame(position: THREE.Vector3, intensity = 1): void {
    const scale = this.quality * intensity

    // Núcleo da chama: quase todo frame, maior, mais lento, vida longa.
    if (Math.random() < 0.85 * scale) {
      const p = this.pool[this.cursor]
      this.cursor = (this.cursor + 1) % MAX_PARTICLES
      const idx = p.index
      this.birthPositions[idx * 3] = position.x + (Math.random() * 2 - 1) * 0.03
      this.birthPositions[idx * 3 + 1] = position.y + Math.random() * 0.08
      this.birthPositions[idx * 3 + 2] = position.z + (Math.random() * 2 - 1) * 0.03
      this.birthVelocities[idx * 3] = (Math.random() * 2 - 1) * 0.12
      this.birthVelocities[idx * 3 + 1] = 0.7 + Math.random() * 0.4
      this.birthVelocities[idx * 3 + 2] = (Math.random() * 2 - 1) * 0.12
      this.sizes[idx] = 0.26
      this.maxLives[idx] = 0.65 + Math.random() * 0.3
      this.gravities[idx] = 0.18
      const core = new THREE.Color(
        1,
        0.78 + Math.random() * 0.18,
        0.35 + Math.random() * 0.15,
      )
      this.colors[idx * 3] = core.r
      this.colors[idx * 3 + 1] = core.g
      this.colors[idx * 3 + 2] = core.b
      this.birthTimes[idx] = this.elapsed
    }

    // Labaredas: mais partículas, menores, sobem mais rápido e mais alto.
    const rate = Math.round((3.4 + Math.random() * 1.2) * scale)
    for (let i = 0; i < rate; i++) {
      const p = this.pool[this.cursor]
      this.cursor = (this.cursor + 1) % MAX_PARTICLES
      const idx = p.index
      this.birthPositions[idx * 3] = position.x + (Math.random() * 2 - 1) * 0.07
      this.birthPositions[idx * 3 + 1] = position.y + Math.random() * 0.06
      this.birthPositions[idx * 3 + 2] = position.z + (Math.random() * 2 - 1) * 0.07
      this.birthVelocities[idx * 3] = (Math.random() * 2 - 1) * 0.25
      this.birthVelocities[idx * 3 + 1] = 1.15 + Math.random() * 0.6
      this.birthVelocities[idx * 3 + 2] = (Math.random() * 2 - 1) * 0.25
      this.sizes[idx] = 0.17
      this.maxLives[idx] = 0.45 + Math.random() * 0.25
      this.gravities[idx] = 0.35
      const t = Math.random()
      const flame = new THREE.Color(1, 0.6 + t * 0.3, 0.2 + t * 0.15)
      this.colors[idx * 3] = flame.r
      this.colors[idx * 3 + 1] = flame.g
      this.colors[idx * 3 + 2] = flame.b
      this.birthTimes[idx] = this.elapsed
    }
    this.geometry.attributes.birthPosition.needsUpdate = true
    this.geometry.attributes.birthVelocity.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true
    this.geometry.attributes.maxLife.needsUpdate = true
    this.geometry.attributes.gravity.needsUpdate = true
    this.geometry.attributes.birthTime.needsUpdate = true
  }

  /** Apenas avança o relógio global — a física roda nos vertex shaders. */
  update(dt: number): void {
    this.elapsed += dt
    this.particleMaterial.uniforms.uTime.value = this.elapsed
    this.bloodMaterial.uniforms.uTime.value = this.elapsed
  }

  dispose(): void {
    this.points.parent?.remove(this.points)
    this.geometry.dispose()
    this.particleMaterial.dispose()
    this.bloodPoints.parent?.remove(this.bloodPoints)
    this.bloodGeometry.dispose()
    this.bloodMaterial.dispose()
  }
}