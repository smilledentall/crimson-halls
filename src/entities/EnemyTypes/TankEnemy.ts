import * as THREE from 'three'
import { Enemy } from '../Enemy'
import type { CombatModifiers } from '../Enemy'
import type { EnemyTypeDefinition } from '.'

/**
 * Inimigo blindado (tanque): muito mais vida e lento. Silhueta larga com
 * "placas" achatadas sobrepostas sugerindo blindagem. A barra de vida ganha
 * destaque extra (sprite maior via meshScale).
 */
export class TankEnemy extends Enemy {
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
    const steel = this.makeMaterial(this.type.color ?? 0x4a4a52, 0.7, 0.4)
    const plate = this.makeMaterial(0x3a3a42, 0.8, 0.5)

    // Casco largo.
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.5 * scale, 1.0 * scale, 0.8 * scale), steel)
    hull.position.set(0, 1.25 * scale, 0)
    this.mesh.add(hull)

    // Placas de blindagem na dianteira.
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(
        new THREE.BoxGeometry(0.42 * scale, 0.85 * scale, 0.06 * scale),
        plate,
      )
      p.position.set((i - 1) * 0.5 * scale, 1.22 * scale, 0.42 * scale)
      this.mesh.add(p)
    }

    // Placas no topo.
    for (let i = 0; i < 2; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.6 * scale, 0.06 * scale, 0.7 * scale), plate)
      p.position.set((i - 0.5) * 0.35 * scale, 1.78 * scale, 0)
      this.mesh.add(p)
    }

    // Torre pequena no topo.
    const turret = new THREE.Mesh(
      new THREE.BoxGeometry(0.42 * scale, 0.3 * scale, 0.36 * scale),
      plate,
    )
    turret.position.set(0, 1.96 * scale, 0)
    this.mesh.add(turret)

    // Pernas grossas.
    const legGeo = new THREE.BoxGeometry(0.35 * scale, 0.7 * scale, 0.4 * scale)
    const leftLeg = new THREE.Mesh(legGeo, plate)
    leftLeg.position.set(-0.5 * scale, 0.35 * scale, 0)
    const rightLeg = new THREE.Mesh(legGeo, plate)
    rightLeg.position.set(0.5 * scale, 0.35 * scale, 0)
    this.mesh.add(leftLeg, rightLeg)
  }

  damage(amount: number): void {
    let final = amount
    if (this.type.armorMinDamage != null && amount < this.type.armorMinDamage) {
      final = amount * (this.type.armorReduction ?? 1)
    }
    super.damage(final)
  }
}
