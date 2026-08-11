import * as THREE from 'three'
import { Enemy } from '../Enemy'
import type { EnemyWorld } from '../Enemy'
import type { EnemyTypeDefinition } from '.'

/**
 * Inimigo à distância: mantém distância mínima do jogador (recua se ele se
 * aproximar demais) e dispara projéteis periódicos em linha reta.
 * Silhueta ereta/cautelosa com um "arma" saliente na frente do corpo.
 */
export class RangedEnemy extends Enemy {
  constructor(type: EnemyTypeDefinition, x: number, z: number, healthMultiplier = 1) {
    super(type, x, z, healthMultiplier)
  }

  protected buildSilhouette(scale: number): void {
    const body = this.makeMaterial(this.type.color ?? 0x7a1f22, 0.55, 0.25)
    const dark = this.makeMaterial(0x5a1a1e, 0.7, 0.15)

    // Torso ereto, mais estreito.
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.6 * scale, 1.0 * scale, 0.35 * scale),
      body,
    )
    torso.position.set(0, 1.1 * scale, 0)
    this.mesh.add(torso)

    // Cabeça no topo.
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18 * scale, 10, 8), dark)
    head.position.set(0, 1.68 * scale, 0)
    this.mesh.add(head)

    // "Arma"/órgão de ataque saliente na frente do peito.
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05 * scale, 0.07 * scale, 0.6 * scale, 6),
      dark,
    )
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, 1.28 * scale, 0.25 * scale)
    this.mesh.add(barrel)
    const emitter = new THREE.Mesh(
      new THREE.SphereGeometry(0.06 * scale, 8, 6),
      this.makeMaterial(0xff9f43, 0.4, 0.3),
    )
    emitter.position.set(0, 1.28 * scale, 0.62 * scale)
    this.mesh.add(emitter)

    // Pernas eretas.
    const legGeo = new THREE.BoxGeometry(0.2 * scale, 0.8 * scale, 0.2 * scale)
    const leftLeg = new THREE.Mesh(legGeo, dark)
    leftLeg.position.set(-0.18 * scale, 0.4 * scale, 0)
    const rightLeg = new THREE.Mesh(legGeo, dark)
    rightLeg.position.set(0.18 * scale, 0.4 * scale, 0)
    this.mesh.add(leftLeg, rightLeg)
  }

  protected shouldAttack(distance: number): boolean {
    return distance <= this.type.attackRange
  }

  protected shouldRetreat(distance: number): boolean {
    return distance < this.type.retreatRange
  }

  protected performAttack(world: EnemyWorld): void {
    const origin = this.position.clone()
    origin.y = 1.6 // altura do "cano"
    const target = new THREE.Vector3(
      world.playerPosition.x,
      world.playerPosition.y,
      world.playerPosition.z,
    )
    world.fireProjectile(origin, target, this.type.attackDamage)
  }
}
