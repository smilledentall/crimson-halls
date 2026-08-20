import * as THREE from 'three'
import type { Enemy } from '../entities/Enemy'
import type { WeaponDefinition, WeaponId } from './weapons.config'

export interface WeaponContext {
  camera: THREE.PerspectiveCamera
  /** Alvos do raycast: malhas de parede + malhas de inimigos vivos. */
  getTargets: () => THREE.Object3D[]
  /** Inimigos vivos (para corpo a corpo/área). */
  getEnemies: () => Enemy[]
  /** Andar atual do jogador (multi-andar) — filtrar alvos de melee. */
  getPlayerFloor: () => string
  getAmmo: (weaponId: WeaponId) => number
  spendAmmo: (weaponId: WeaponId, amount: number) => void
  onEnemyHit: (enemy: Enemy, damage: number) => void
  onImpact: (point: THREE.Vector3, normal: THREE.Vector3) => void
  /** Dispara um foguete do lançador (a engine gerencia a entidade). */
  spawnRocket: (origin: THREE.Vector3, direction: THREE.Vector3, speed: number) => void
}

export type ShotEvent = 'fired' | 'dry' | null

/**
 * Classe base de arma: cadência, gatilho (semi/automático) e munição.
 * Cada tipo (hitscan/projétil/corpo a corpo) implementa `fireWeapon`.
 */
export abstract class Weapon {
  readonly definition: WeaponDefinition
  protected readonly ctx: WeaponContext

  private cooldownRemaining = 0
  private triggerHeld = false
  private pendingTrigger = false
  private shotEvent: ShotEvent = null

  protected constructor(definition: WeaponDefinition, ctx: WeaponContext) {
    this.definition = definition
    this.ctx = ctx
  }

  setTriggerHeld(held: boolean): void {
    // Semi-auto dispara uma vez por "pressionar"; automático dispara enquanto segurado.
    if (held && !this.triggerHeld) this.pendingTrigger = true
    this.triggerHeld = held
  }

  update(dt: number): void {
    this.cooldownRemaining = Math.max(0, this.cooldownRemaining - dt)
    const wantFire = this.definition.automatic ? this.triggerHeld : this.pendingTrigger
    if (!wantFire || this.cooldownRemaining > 0) return
    this.shoot()
  }

  /** Lê e limpa o evento do último update (disparou / sem munição / nada). */
  consumeShotEvent(): ShotEvent {
    const event = this.shotEvent
    this.shotEvent = null
    return event
  }

  private shoot(): void {
    const { definition, ctx } = this
    this.pendingTrigger = false
    this.cooldownRemaining = 1 / definition.fireRate

    if (definition.ammoCapacity > 0 && ctx.getAmmo(definition.id) < 1) {
      this.shotEvent = 'dry'
      return
    }
    if (definition.ammoCapacity > 0) ctx.spendAmmo(definition.id, 1)

    this.fireWeapon()
    this.shotEvent = 'fired'
  }

  protected abstract fireWeapon(): void
}

/** Tiro hitscan (raycast com dispersão e pellets) — pistola, escopeta, rifle. */
export class HitscanWeapon extends Weapon {
  private readonly raycaster = new THREE.Raycaster()
  private readonly origin = new THREE.Vector3()
  private readonly spreadDirection = new THREE.Vector3()

  constructor(definition: WeaponDefinition, ctx: WeaponContext) {
    super(definition, ctx)
  }

  protected fireWeapon(): void {
    for (let i = 0; i < this.definition.pellets; i++) this.firePellet()
  }

  private firePellet(): void {
    const { definition, ctx, raycaster } = this
    ctx.camera.getWorldPosition(this.origin)

    // Dispersão em espaço local da câmera, depois rotacionada para o mundo.
    const spreadX = (Math.random() * 2 - 1) * definition.spread
    const spreadY = (Math.random() * 2 - 1) * definition.spread
    this.spreadDirection.set(spreadX, spreadY, -1).normalize()
    this.spreadDirection.applyQuaternion(ctx.camera.quaternion)

    raycaster.set(this.origin, this.spreadDirection)
    raycaster.far = definition.range > 0 ? definition.range : Infinity

    const hits = raycaster.intersectObjects(ctx.getTargets(), false)
    const hit = hits[0]
    if (!hit) return

    const enemy = hit.object.userData.enemy as Enemy | undefined
    if (enemy) ctx.onEnemyHit(enemy, definition.damage)
    else ctx.onImpact(hit.point, hit.face?.normal ?? this.spreadDirection.clone())
  }
}

/** Lançador de foguetes: dispara um projétil que explode em área. */
export class RocketWeapon extends Weapon {
  private readonly origin = new THREE.Vector3()
  private readonly direction = new THREE.Vector3()

  constructor(definition: WeaponDefinition, ctx: WeaponContext) {
    super(definition, ctx)
  }

  protected fireWeapon(): void {
    this.ctx.camera.getWorldPosition(this.origin)
    this.ctx.camera.getWorldDirection(this.direction)
    this.ctx.spawnRocket(this.origin, this.direction, this.definition.projectileSpeed ?? 16)
  }
}

/** Alcance do golpe em arco à frente da câmera (60° de cada lado). */
const MELEE_ARC_COS = Math.cos(Math.PI / 3)

/** Motosserra/arma corpo a corpo: acerta inimigos próximos dentro do arco frontal. */
export class MeleeWeapon extends Weapon {
  private readonly origin = new THREE.Vector3()
  private readonly forward = new THREE.Vector3()
  private readonly toEnemy = new THREE.Vector3()

  constructor(definition: WeaponDefinition, ctx: WeaponContext) {
    super(definition, ctx)
  }

  protected fireWeapon(): void {
    const { ctx, definition } = this
    ctx.camera.getWorldPosition(this.origin)
    ctx.camera.getWorldDirection(this.forward)

    for (const enemy of ctx.getEnemies()) {
      if (!enemy.alive) continue
      // Multi-andar: o golpe só atinge inimigos do andar atual do jogador.
      if (enemy.floorId !== ctx.getPlayerFloor()) continue
      this.toEnemy.subVectors(enemy.position, this.origin)
      this.toEnemy.y = 0
      const distance = this.toEnemy.length()
      if (distance > definition.range) continue
      this.toEnemy.normalize()
      if (this.forward.dot(this.toEnemy) < MELEE_ARC_COS) continue
      ctx.onEnemyHit(enemy, definition.damage)
    }
  }
}

/** Fábrica: escolhe a implementação certa conforme o kind da arma. */
export function createWeapon(definition: WeaponDefinition, ctx: WeaponContext): Weapon {
  switch (definition.kind) {
    case 'projectile':
      return new RocketWeapon(definition, ctx)
    case 'melee':
      return new MeleeWeapon(definition, ctx)
    default:
      return new HitscanWeapon(definition, ctx)
  }
}
