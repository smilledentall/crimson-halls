import * as THREE from 'three'
import { Enemy } from '../Enemy'
import type { CombatModifiers, EnemyWorld } from '../Enemy'
import type { EnemyTypeDefinition } from '.'

/**
 * Inimigo com escudo destrutível: uma bolha translúcida absorve o dano até
 * ser quebrada. Enquanto o escudo existe, o dano vai para ele; quando
 * quebra, o excedente atinge o corpo. A bolha some com uma animação de
 * explosão rápida. Depois da quebra, a armadura ainda reduz dano baixo.
 */
export class ShieldedEnemy extends Enemy {
  /** Saúde do escudo (separada do corpo). */
  private shieldHealth: number
  private readonly maxShieldHealth: number
  /** True depois que o escudo quebrou (não regenera). */
  private shieldBroken = false
  private shieldMesh: THREE.Mesh | null = null
  private shieldMaterial: THREE.MeshStandardMaterial | null = null
  private shieldBreakTimer = 0

  constructor(
    type: EnemyTypeDefinition,
    x: number,
    z: number,
    healthMultiplier = 1,
    combat: CombatModifiers = {},
  ) {
    super(type, x, z, healthMultiplier, combat)
    this.maxShieldHealth = Math.max(1, Math.round((type.shield ?? type.health) * 0.5))
    this.shieldHealth = this.maxShieldHealth
    this.buildShield()
  }

  private buildShield(): void {
    const scale = this.type.meshScale ?? 1
    this.shieldMaterial = new THREE.MeshStandardMaterial({
      color: 0x55aaff,
      transparent: true,
      opacity: 0.32,
      roughness: 0.1,
      metalness: 0.3,
      emissive: 0x2266ff,
      emissiveIntensity: 0.8,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    this.shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.05 * scale, 20, 14),
      this.shieldMaterial,
    )
    this.shieldMesh.position.set(0, 1.2 * scale, 0)
    this.shieldMesh.scale.set(1, 1.35, 1)
    this.mesh.add(this.shieldMesh)
  }

  /** Escudo ativo e intacto? */
  hasShield(): boolean {
    return !this.shieldBroken && this.shieldHealth > 0
  }

  /** Fração restante do escudo (0..1) para HUD/efeitos. */
  shieldRatio(): number {
    return this.maxShieldHealth > 0 ? this.shieldHealth / this.maxShieldHealth : 0
  }

  damage(amount: number): void {
    if (!this.alive) return

    if (this.hasShield()) {
      const overflow = amount - this.shieldHealth
      this.shieldHealth = Math.max(0, this.shieldHealth - amount)
      this.updateShieldAppearance()
      if (this.shieldHealth <= 0) this.breakShield()
      // Excedente do dano (se o tiro quebrou o escudo) vai para o corpo.
      if (overflow > 0 && this.shieldBroken) super.damage(overflow)
      return
    }

    // Sem escudo: armadura reduz dano baixo (como o tanque).
    let final = amount
    if (this.type.armorMinDamage != null && amount < this.type.armorMinDamage) {
      final = amount * (this.type.armorReduction ?? 1)
    }
    super.damage(final)
  }

  private updateShieldAppearance(): void {
    if (!this.shieldMaterial || !this.shieldMesh) return
    const ratio = this.shieldRatio()
    // Quanto mais dano, mais opaco/vermelho (estressado).
    this.shieldMaterial.opacity = 0.18 + ratio * 0.2
    this.shieldMaterial.color.setHex(ratio > 0.5 ? 0x55aaff : 0xff6655)
    this.shieldMaterial.emissive.setHex(ratio > 0.5 ? 0x2266ff : 0xff2200)
    this.shieldMesh.scale.set(1, 1.35, 1)
    if (this.shieldBreakTimer <= 0) this.shieldMesh.visible = true
  }

  private breakShield(): void {
    this.shieldBroken = true
    this.shieldBreakTimer = 0.35
    this.updateShieldAppearance()
  }

  update(dt: number, world: EnemyWorld): void {
    super.update(dt, world)
    if (!this.alive) return

    if (this.shieldBreakTimer > 0) {
      // Animação de quebra: o escudo cresce e desaparece.
      this.shieldBreakTimer -= dt
      const p = 1 - Math.max(0, this.shieldBreakTimer / 0.35)
      if (this.shieldMesh && this.shieldMaterial) {
        const scale = 1 + p * 0.6
        this.shieldMesh.scale.set(scale, scale * 1.35, scale)
        this.shieldMaterial.opacity = Math.max(0, 0.32 * (1 - p))
      }
      if (this.shieldBreakTimer <= 0 && this.shieldMesh) {
        this.shieldMesh.visible = false
      }
    }
  }

  dispose(): void {
    this.shieldMaterial?.dispose()
    if (this.shieldMesh) this.shieldMesh.geometry.dispose()
    super.dispose()
  }
}