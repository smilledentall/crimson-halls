import * as THREE from 'three'
import type { CollisionSystem } from '../core/CollisionSystem'
import type { EnemyTypeDefinition } from './EnemyTypes'

export type EnemyState = 'idle' | 'chasing' | 'attacking' | 'retreating' | 'dead'

/** Informações do mundo que a IA do inimigo precisa (fornecidas pela engine). */
export interface EnemyWorld {
  playerPosition: THREE.Vector3
  collision: CollisionSystem
  damagePlayer: (amount: number) => void
  fireProjectile: (origin: THREE.Vector3, target: THREE.Vector3, damage: number) => void
  /** Explosão em área (kamikaze). A engine aplica dano no jogador/inimigos. */
  explode: (position: THREE.Vector3, radius: number, damage: number) => void
  /** Invoca um inimigo menor (reforço de chefe). */
  summon: (enemyType: string, origin: THREE.Vector3) => void
  /** Som dramático (rugido de chefe). */
  roar: () => void
}

const AGGRO_RANGE = 50
const DEATH_DURATION = 0.5
const FLASH_DURATION = 0.1
const BAR_VISIBLE_TIME = 3
const BAR_WIDTH = 128
const BAR_HEIGHT = 12

/**
 * Inimigo base: IA de perseguição + ataque corpo a corpo.
 * O corpo é um THREE.Group composto de sub-meshes (silhueta por tipo via
 * `buildSilhouette`); `hitMesh` (um volume invisível) é o alvo do raycast —
 * substitui a necessidade de acertar as sub-meshes individualmente.
 * Flash de dano (emissivo) e morte (queda simples) aplicados a todas as
 * partes. Barra de vida (Sprite) aparece com fade ao levar dano.
 */
export class Enemy {
  readonly type: EnemyTypeDefinition
  /** Raiz do corpo (posição/rotação/escala em grupo). */
  readonly mesh: THREE.Group
  /** Volume invisível usado como alvo do raycast. */
  readonly hitMesh: THREE.Mesh
  readonly position: THREE.Vector3
  health: number
  readonly maxHealth: number
  alive = true
  state: EnemyState = 'idle'
  /** True quando o inimigo já detonou sua explosão (kamikaze). */
  exploded = false

  protected readonly bodyMaterials: THREE.MeshStandardMaterial[] = []
  protected readonly scaleFactor: number
  protected flashTimer = 0
  protected attackCooldown = 0
  protected deathTimer = 0

  private barSprite: THREE.Sprite | null = null
  private barMaterial: THREE.SpriteMaterial | null = null
  private barCanvas: HTMLCanvasElement | null = null
  private barContext: CanvasRenderingContext2D | null = null
  private barTexture: THREE.CanvasTexture | null = null
  private lastBarRatio = 1
  private barTimer = 0
  private barOpacity = 0

  constructor(type: EnemyTypeDefinition, x: number, z: number, healthMultiplier = 1) {
    this.type = type
    this.health = Math.max(1, Math.round(type.health * healthMultiplier))
    this.maxHealth = this.health

    const scale = type.meshScale ?? 1
    this.scaleFactor = scale

    this.mesh = new THREE.Group()

    // Alvo do raycast (invisível), dimensões do inimigo.
    const hitMat = new THREE.MeshBasicMaterial({ visible: false })
    const hitGeo = new THREE.BoxGeometry(0.8 * scale, 1.8 * scale, 0.6 * scale)
    this.hitMesh = new THREE.Mesh(hitGeo, hitMat)
    this.hitMesh.position.y = (1.8 * scale) / 2
    this.hitMesh.userData.enemy = this
    this.mesh.add(this.hitMesh)

    this.buildSilhouette(scale)
    this.buildHealthBar(scale)
    this.mesh.userData.enemy = this
    this.position = this.mesh.position
    this.mesh.position.set(x, 0, z)
  }

  /** Cria um material registrado no flash: as sub-meshes usam `makeMaterial`. */
  protected makeMaterial(
    color: number,
    roughness = 0.6,
    metalness = 0.2,
  ): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      emissive: 0x000000,
      emissiveIntensity: 1,
    })
    this.bodyMaterials.push(material)
    return material
  }

  /** Constrói a silhueta do corpo — base: Perseguidor (postura agressiva). */
  protected buildSilhouette(scale: number): void {
    const body = this.makeMaterial(this.type.color ?? 0x7a1f22, 0.55, 0.25)
    const dark = this.makeMaterial(0x5a1a1e, 0.7, 0.15)

    // Torso inclinado pra frente (postura agressiva / "correndo").
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.72 * scale, 0.8 * scale, 0.44 * scale),
      body,
    )
    torso.position.set(0, 1.05 * scale, 0)
    torso.rotation.x = 0.25
    this.mesh.add(torso)

    // Cabeça destacada do tronco.
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2 * scale, 10, 8), dark)
    head.position.set(0, 1.62 * scale, 0.08 * scale)
    this.mesh.add(head)

    // Braços finos projetados pra frente/trás (correndo).
    const armGeo = new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 0.65 * scale, 6)
    const leftArm = new THREE.Mesh(armGeo, dark)
    leftArm.position.set(-0.4 * scale, 1.25 * scale, -0.05 * scale)
    leftArm.rotation.z = 0.5
    leftArm.rotation.x = -0.5
    const rightArm = new THREE.Mesh(armGeo, dark)
    rightArm.position.set(0.4 * scale, 1.25 * scale, 0.1 * scale)
    rightArm.rotation.z = -0.5
    rightArm.rotation.x = 0.5
    this.mesh.add(leftArm, rightArm)

    // Pernas.
    const legGeo = new THREE.BoxGeometry(0.2 * scale, 0.75 * scale, 0.22 * scale)
    const leftLeg = new THREE.Mesh(legGeo, dark)
    leftLeg.position.set(-0.2 * scale, 0.375 * scale, -0.03 * scale)
    leftLeg.rotation.x = 0.3
    const rightLeg = new THREE.Mesh(legGeo, dark)
    rightLeg.position.set(0.2 * scale, 0.375 * scale, 0.03 * scale)
    rightLeg.rotation.x = -0.3
    this.mesh.add(leftLeg, rightLeg)
  }

  /** Barra de vida (Sprite) acima da cabeça. Sem DOM (testes) não cria. */
  private buildHealthBar(scale: number): void {
    if (typeof document === 'undefined') return
    const canvas = document.createElement('canvas')
    canvas.width = BAR_WIDTH
    canvas.height = BAR_HEIGHT
    const context = canvas.getContext('2d')
    if (!context) return
    this.barCanvas = canvas
    this.barContext = context

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    this.barTexture = texture
    this.barMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0,
    })
    this.barSprite = new THREE.Sprite(this.barMaterial)
    // Acima do hitbox; o sprite escala com o tipo (Tanque ganha barra maior).
    this.barSprite.position.set(0, 1.8 * scale + 0.3, 0)
    this.barSprite.scale.set(1.15 * scale, 0.15 * scale, 1)
    this.mesh.add(this.barSprite)
    this.drawBar(1)
    this.lastBarRatio = 1
  }

  private drawBar(ratio: number): void {
    if (!this.barContext || !this.barCanvas) return
    const context = this.barContext
    const w = this.barCanvas.width
    const h = this.barCanvas.height
    context.clearRect(0, 0, w, h)
    context.fillStyle = 'rgba(8, 6, 6, 0.85)'
    context.fillRect(0, 0, w, h)
    const color = ratio > 0.6 ? '#2ee07a' : ratio > 0.25 ? '#ffc24a' : '#e2364a'
    context.fillStyle = color
    context.fillRect(1, 1, (w - 2) * ratio, h - 2)
    context.strokeStyle = 'rgba(0, 0, 0, 0.9)'
    context.lineWidth = 2
    context.strokeRect(1, 1, w - 2, h - 2)
    if (this.barTexture) this.barTexture.needsUpdate = true
  }

  damage(amount: number): void {
    if (!this.alive) return
    this.health = Math.max(0, this.health - amount)
    this.flashTimer = FLASH_DURATION
    const ratio = this.maxHealth > 0 ? this.health / this.maxHealth : 0
    if (ratio !== this.lastBarRatio) {
      this.drawBar(ratio)
      this.lastBarRatio = ratio
    }
    this.barTimer = BAR_VISIBLE_TIME
    if (this.health <= 0) this.die()
  }

  /** Mata o inimigo (entra na animação de morte). */
  protected die(): void {
    if (!this.alive) return
    this.health = 0
    this.alive = false
    this.state = 'dead'
    this.deathTimer = DEATH_DURATION
  }

  private setEmissive(color: number): void {
    for (const material of this.bodyMaterials) material.emissive.setHex(color)
  }

  update(dt: number, world: EnemyWorld): void {
    // Barra de vida: fade in quando leva dano, fade out depois de um tempo.
    if (this.barSprite && this.barMaterial) {
      if (this.state === 'dead') this.barTimer = 0
      else this.barTimer = Math.max(0, this.barTimer - dt)
      const show =
        this.alive && this.maxHealth > 0 && this.health < this.maxHealth && this.barTimer > 0
      const target = show ? 1 : 0
      this.barOpacity += (target - this.barOpacity) * Math.min(1, dt * 8)
      if (Math.abs(this.barOpacity - target) < 0.005) this.barOpacity = target
      this.barMaterial.opacity = this.barOpacity
    }

    if (this.state === 'dead') {
      this.deathTimer -= dt
      // Ragdoll simples: o corpo cai pra frente em torno da base e afunda um pouco.
      const progress = 1 - Math.max(0, this.deathTimer / DEATH_DURATION)
      const eased = 1 - (1 - progress) * (1 - progress)
      this.mesh.rotation.x = eased * (Math.PI / 2)
      this.mesh.position.y = -eased * 0.1
      this.setEmissive(0xff0000)
      return
    }

    this.flashTimer = Math.max(0, this.flashTimer - dt)
    this.attackCooldown = Math.max(0, this.attackCooldown - dt)

    const playerPos = world.playerPosition
    const dx = playerPos.x - this.position.x
    const dz = playerPos.z - this.position.z
    const distance = Math.hypot(dx, dz)

    const hasLineOfSight = world.collision.hasClearLine(
      this.position.x,
      this.position.z,
      playerPos.x,
      playerPos.z,
    )

    if (hasLineOfSight && distance <= AGGRO_RANGE) {
      if (this.shouldRetreat(distance)) {
        this.state = 'retreating'
        this.move(-1, dx, dz, distance, dt, world)
      } else if (this.shouldAttack(distance)) {
        this.state = 'attacking'
        if (this.attackCooldown <= 0) {
          this.performAttack(world)
          this.attackCooldown = this.type.attackInterval
        }
      } else {
        this.state = 'chasing'
        this.move(1, dx, dz, distance, dt, world)
      }
    } else {
      this.state = 'idle'
    }

    // Vira de frente para o jogador.
    this.mesh.rotation.y = Math.atan2(dx, dz)

    // Flash vermelho ao levar dano (em todas as partes do corpo).
    this.setEmissive(this.flashTimer > 0 ? 0xff2222 : 0x000000)
  }

  /** Move na direção do jogador (1) ou para longe dele (-1), deslizando nas paredes. */
  protected move(
    directionMultiplier: number,
    dx: number,
    dz: number,
    distance: number,
    dt: number,
    world: EnemyWorld,
  ): void {
    const step = directionMultiplier * this.type.speed * dt
    const resolved = world.collision.resolvePosition(
      { x: this.position.x, z: this.position.z },
      { x: (dx / distance) * step, z: (dz / distance) * step },
      this.type.radius,
    )
    this.position.x = resolved.x
    this.position.z = resolved.z
  }

  protected shouldAttack(distance: number): boolean {
    return distance <= this.type.attackRange
  }

  protected shouldRetreat(_distance: number): boolean {
    return false
  }

  /** Ataque corpo a corpo por padrão; a variação à distância sobrescreve. */
  protected performAttack(world: EnemyWorld): void {
    world.damagePlayer(this.type.attackDamage)
  }

  readyForRemoval(): boolean {
    return this.state === 'dead' && this.deathTimer <= 0
  }

  dispose(): void {
    const seen = new Set<THREE.Material>()
    this.mesh.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        const material = child.material
        if (Array.isArray(material)) {
          material.forEach(m => {
            if (!seen.has(m)) {
              m.dispose()
              seen.add(m)
            }
          })
        } else if (!seen.has(material)) {
          material.dispose()
          seen.add(material)
        }
      }
    })
    this.barTexture?.dispose()
    this.barMaterial?.dispose()
  }
}
