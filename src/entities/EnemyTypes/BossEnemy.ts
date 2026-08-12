import * as THREE from 'three'
import { Enemy } from '../Enemy'
import type { CombatModifiers, EnemyWorld } from '../Enemy'
import type { EnemyTypeDefinition } from '.'
import { ENEMY_SPAWN_MULTIPLIER } from '../../state/progression.config'

const RANGED_RANGE = 24
const PROJECTILE_DAMAGE = 12
const TELEGRAPH_DURATION = 0.55

type BossAction = 'shot' | 'fan' | 'volley' | 'slam' | 'phaseburst'

/**
 * Chefe final da campanha. Reaproveita a máquina de estados base (aproximar,
 * virar, flash, barra, morte) e adiciona:
 * - 3 fases pela vida (66%/33%) — cada uma mais agressiva;
 * - golpe de área (slam) telegrafado (brilho antes de executar);
 * - projéteis em tiro único (fase 1), leque (fase 2) e rajada (fase 3);
 * - invocação de reforços (chaser/kamikaze) a partir da fase 2.
 */
export class BossEnemy extends Enemy {
  private elapsed = 0
  private phase: 1 | 2 | 3 = 1
  private teleTime = 0
  private pendingAction: BossAction | null = null
  private rangedCooldown = 1.2
  private summonTimer = 8

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
    const flesh = this.makeMaterial(this.type.color ?? 0x6a2430, 0.6, 0.3)
    const dark = this.makeMaterial(0x4a1622, 0.7, 0.2)
    const bone = this.makeMaterial(0x8c5a52, 0.8, 0.2)
    const core = this.makeMaterial(0xff7a3a, 0.4, 0.3)

    // Pernas grossas.
    const legGeo = new THREE.BoxGeometry(0.55 * scale, 1.0 * scale, 0.5 * scale)
    const leftLeg = new THREE.Mesh(legGeo, dark)
    leftLeg.position.set(-0.5 * scale, 0.5 * scale, 0)
    const rightLeg = new THREE.Mesh(legGeo, dark)
    rightLeg.position.set(0.5 * scale, 0.5 * scale, 0)
    this.mesh.add(leftLeg, rightLeg)

    // Cintura + torso (leve inclinação pra frente).
    const pelvis = new THREE.Mesh(
      new THREE.BoxGeometry(1.6 * scale, 0.7 * scale, 0.9 * scale),
      flesh,
    )
    pelvis.position.set(0, 1.35 * scale, 0)
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(1.3 * scale, 1.1 * scale, 0.8 * scale),
      flesh,
    )
    torso.position.set(0, 2.1 * scale, 0)
    torso.rotation.x = -0.1
    this.mesh.add(pelvis, torso)

    // Placas de "carapaça" no peito.
    for (let i = 0; i < 3; i++) {
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.34 * scale, 0.14 * scale, 0.5 * scale),
        bone,
      )
      plate.position.set((i - 1) * 0.36 * scale, 2.35 * scale, 0.2 * scale)
      this.mesh.add(plate)
    }

    // Ombro esféricos.
    const shoulderGeo = new THREE.SphereGeometry(0.4 * scale, 10, 8)
    const leftShoulder = new THREE.Mesh(shoulderGeo, bone)
    leftShoulder.position.set(-0.85 * scale, 2.55 * scale, 0)
    const rightShoulder = new THREE.Mesh(shoulderGeo, bone)
    rightShoulder.position.set(0.85 * scale, 2.55 * scale, 0)
    this.mesh.add(leftShoulder, rightShoulder)

    // Braços grossos.
    const armGeo = new THREE.CylinderGeometry(0.16 * scale, 0.2 * scale, 1.1 * scale, 8)
    const leftArm = new THREE.Mesh(armGeo, dark)
    leftArm.position.set(-1.0 * scale, 1.9 * scale, 0)
    leftArm.rotation.z = 0.3
    const rightArm = new THREE.Mesh(armGeo, dark)
    rightArm.position.set(1.0 * scale, 1.9 * scale, 0)
    rightArm.rotation.z = -0.3
    this.mesh.add(leftArm, rightArm)

    // Núcleo que pulsa no peito.
    const coreSphere = new THREE.Mesh(new THREE.SphereGeometry(0.28 * scale, 10, 8), core)
    coreSphere.position.set(0, 2.12 * scale, 0.45 * scale)
    this.mesh.add(coreSphere)

    // Cabeça + chifres.
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34 * scale, 10, 8), flesh)
    head.position.set(0, 3.0 * scale, 0)
    const hornGeo = new THREE.ConeGeometry(0.14 * scale, 0.5 * scale, 6)
    const leftHorn = new THREE.Mesh(hornGeo, bone)
    leftHorn.position.set(-0.2 * scale, 3.35 * scale, 0)
    leftHorn.rotation.z = 0.35
    const rightHorn = new THREE.Mesh(hornGeo, bone)
    rightHorn.position.set(0.2 * scale, 3.35 * scale, 0)
    rightHorn.rotation.z = -0.35
    this.mesh.add(head, leftHorn, rightHorn)
  }

  update(dt: number, world: EnemyWorld): void {
    super.update(dt, world)
    if (!this.alive || this.state === 'dead') return
    this.elapsed += dt

    // Troca de fase pela vida.
    const nextPhase = this.getPhase()
    if (nextPhase !== this.phase) {
      this.phase = nextPhase
      this.onPhaseUp(world)
    }

    // Telegrafia: brilha antes de executar o golpe forte.
    if (this.teleTime > 0) {
      this.teleTime -= dt
      this.applyTelegraphGlow()
      if (this.teleTime <= 0) {
        this.teleTime = 0
        this.executeAction(world)
      }
    } else {
      this.bossCombat(dt, world)
    }

    this.updateSummons(dt, world)
  }

  protected performAttack(world: EnemyWorld): void {
    // Golpe de área telegrafado (chamado pela base dentro do alcance corpo a corpo).
    if (this.teleTime <= 0 && this.pendingAction === null) {
      this.teleTime = 0.5
      this.pendingAction = 'slam'
      world.roar()
    }
  }

  private getPhase(): 1 | 2 | 3 {
    const ratio = this.maxHealth > 0 ? this.health / this.maxHealth : 0
    if (ratio > 0.66) return 1
    if (ratio > 0.33) return 2
    return 3
  }

  private onPhaseUp(world: EnemyWorld): void {
    this.teleTime = 0.4
    this.pendingAction = 'phaseburst'
    this.summonTimer = 1.5
    world.roar()
  }

  private bossCombat(dt: number, world: EnemyWorld): void {
    this.rangedCooldown -= dt
    const playerPos = world.playerPosition
    const dx = playerPos.x - this.position.x
    const dz = playerPos.z - this.position.z
    const distance = Math.hypot(dx, dz)
    const hasLOS = world.collision.hasClearLine(
      this.position.x,
      this.position.z,
      playerPos.x,
      playerPos.z,
    )
    if (hasLOS && distance <= RANGED_RANGE && this.rangedCooldown <= 0) {
      const action: BossAction = this.phase >= 3 ? 'volley' : this.phase === 2 ? 'fan' : 'shot'
      this.teleTime = TELEGRAPH_DURATION
      this.pendingAction = action
      this.rangedCooldown = (this.phase >= 2 ? 1.6 : 2.4) * this.attackIntervalMultiplier
    }
  }

  private executeAction(world: EnemyWorld): void {
    const action = this.pendingAction
    this.pendingAction = null
    switch (action) {
      case 'shot':
        this.fireProjectiles(world, 1, 0)
        break
      case 'fan':
        this.fireProjectiles(world, 3, 0.32)
        break
      case 'volley':
        this.fireProjectiles(world, 5, 0.45)
        break
      case 'slam': {
        const radius = this.phase >= 3 ? 5.2 : this.phase === 2 ? 4.8 : 4.2
        world.explode(this.position.clone(), radius, this.type.attackDamage)
        break
      }
      case 'phaseburst':
        break // só visual/telegrafia
    }
  }

  private fireProjectiles(world: EnemyWorld, count: number, spacing: number): void {
    const origin = this.position.clone()
    origin.y = 1.7
    const playerPos = world.playerPosition
    const baseAngle = Math.atan2(playerPos.x - origin.x, playerPos.z - origin.z)
    const target = new THREE.Vector3()
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spacing
      const angle = baseAngle + offset
      target.set(
        origin.x + Math.sin(angle) * RANGED_RANGE,
        playerPos.y,
        origin.z + Math.cos(angle) * RANGED_RANGE,
      )
      world.fireProjectile(origin, target, PROJECTILE_DAMAGE)
    }
  }

  private updateSummons(dt: number, world: EnemyWorld): void {
    if (this.phase < 2) return
    this.summonTimer -= dt
    if (this.summonTimer > 0) return
    this.summonTimer = this.phase >= 3 ? 8 : 11
    const count = (this.phase >= 3 ? 2 : 1) * ENEMY_SPAWN_MULTIPLIER
    for (let i = 0; i < count; i++) {
      const enemyType = this.phase >= 3 && i === 1 ? 'kamikaze' : 'chaser'
      const origin = this.position.clone()
      origin.x += (Math.random() * 2 - 1) * 3.5
      origin.z += (Math.random() * 2 - 1) * 3.5
      world.summon(enemyType, origin)
    }
  }

  private applyTelegraphGlow(): void {
    const pulse = 0.6 + 0.4 * Math.sin(this.elapsed * 20)
    for (const material of this.bodyMaterials) {
      material.emissive.setHex(0xffffff)
      material.emissiveIntensity = 0.6 + pulse
    }
    if (this.spriteMaterial) {
      // Sprite: brilha quente (branco-amarelado) durante a telegrafia.
      this.spriteMaterial.color.setRGB(1, 0.85, 0.6)
    }
    this.mesh.scale.setScalar(1 + pulse * 0.05)
  }
}
