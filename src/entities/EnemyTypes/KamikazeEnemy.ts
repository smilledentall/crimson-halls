import * as THREE from 'three'
import { Enemy } from '../Enemy'
import type { CombatModifiers, EnemyWorld } from '../Enemy'
import type { EnemyTypeDefinition } from '.'

const PULSE_RANGE = 8

/**
 * Inimigo explosivo (kamikaze): avança rápido e explode ao encostar no
 * jogador ou ao morrer, causando dano de área. Quando o jogador se aproxima,
 * ele "pulsa" (emissivo acelera) avisando que vai detonar.
 * Silhueta "inchada" e irregular — reforça a instabilidade mesmo parado.
 */
export class KamikazeEnemy extends Enemy {
  private elapsed = 0

  constructor(
    type: EnemyTypeDefinition,
    x: number,
    z: number,
    healthMultiplier = 1,
    combat: CombatModifiers = {},
  ) {
    super(type, x, z, healthMultiplier, combat)
  }

  protected buildSilhouette(scale: number): void {
    const body = this.makeMaterial(this.type.color ?? 0xd4344a, 0.5, 0.2)
    const dark = this.makeMaterial(0xb32635, 0.55, 0.2)

    // Corpo esférico central.
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.55 * scale, 12, 10), body)
    core.position.set(0, 0.95 * scale, 0)
    this.mesh.add(core)

    // Protuberâncias irregulares ao redor.
    const bumps: Array<[number, number, number, number]> = [
      [0.42, 0.68, -0.32, 0.18],
      [-0.38, 0.75, -0.28, 0.15],
      [0.3, 1.18, 0.38, 0.14],
      [-0.35, 1.05, 0.4, 0.16],
      [0.05, 0.42, 0.52, 0.17],
      [-0.05, 1.35, 0.02, 0.12],
    ]
    for (const [bx, by, bz, br] of bumps) {
      const bump = new THREE.Mesh(new THREE.SphereGeometry(br * scale, 8, 6), dark)
      bump.position.set(bx * scale, by * scale, bz * scale)
      this.mesh.add(bump)
    }
  }

  update(dt: number, world: EnemyWorld): void {
    super.update(dt, world)
    if (this.state === 'dead') return

    this.elapsed += dt
    const playerPos = world.playerPosition
    const distance = Math.hypot(playerPos.x - this.position.x, playerPos.z - this.position.z)
    const intensity = Math.max(0, 1 - distance / PULSE_RANGE)
    if (intensity <= 0) return

    const pulse = 0.5 + 0.5 * Math.sin(this.elapsed * 8 + intensity * 14)
    const emissive = 0.4 + pulse * intensity * 2
    for (const material of this.bodyMaterials) {
      material.emissive.setHex(0xff2200)
      material.emissiveIntensity = emissive
    }
    if (this.spriteMaterial) {
      // Sprite: pulsa "quente" (vermelho intenso) conforme a proximidade.
      const hot = pulse * intensity
      this.spriteMaterial.color.setRGB(1, Math.max(0.35, 1 - hot), Math.max(0.35, 1 - hot))
    }
    this.mesh.scale.setScalar(1 + pulse * 0.2 * intensity)
  }

  protected performAttack(world: EnemyWorld): void {
    this.exploded = true
    world.explode(
      this.position.clone(),
      this.type.explosionRadius ?? 3,
      this.type.explosionDamage ?? 25,
    )
    this.die()
  }
}
