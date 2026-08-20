import * as THREE from 'three'
import { Enemy } from '../Enemy'
import type { CombatModifiers, EnemyWorld } from '../Enemy'
import type { EnemyTypeDefinition } from '.'

/**
 * SwarmEnemy representa um grupo de inimigos que se move em formação.
 * Cada enxame tem um "âncora" (centro do grupo) que persegue o jogador;
 * os membros mantêm um deslocamento fixo ao redor da âncora, girando
 * lentamente para sugerir um bando coeso. As âncoras são agrupadas por
 * proximidade de spawn (membros dentro de FORMATION_JOIN_RADIUS se juntam
 * à mesma formação, respeitando FORMATION_MAX_MEMBERS).
 */
interface SwarmFormation {
  /** Centro do grupo no mundo (x, z). */
  anchor: THREE.Vector3
  /** Membros ativos (não mortos) da formação. */
  members: SwarmEnemy[]
  /** Deslocamentos locais de cada membro em volta da âncora. */
  offsets: THREE.Vector3[]
  /** Fase atual de rotação do bando. */
  spin: number
}

const FORMATION_JOIN_RADIUS = 4
const FORMATION_MAX_MEMBERS = 7
const FORMATION_SPIN_SPEED = 0.5
const FORMATION_RADIUS = 1.1

// Registro estático de formações por sessão. Formações vazias são removidas.
const formations: SwarmFormation[] = []

export class SwarmEnemy extends Enemy {
  private formation: SwarmFormation | null = null
  private offsetIndex = 0

  constructor(
    type: EnemyTypeDefinition,
    x: number,
    z: number,
    healthMultiplier = 1,
    combat: CombatModifiers = {},
    floorId = '',
  ) {
    super(type, x, z, healthMultiplier, combat, floorId)
    // Swarm enemies are slightly faster and have a smaller health pool.
    this.speedMultiplier *= 1.2
    this.health = Math.max(1, Math.round(this.health * 0.8))
    this.joinFormation(x, z)
  }

  private joinFormation(x: number, z: number): void {
    let target: SwarmFormation | null = null
    for (const formation of formations) {
      if (formation.members.length >= FORMATION_MAX_MEMBERS) continue
      const dx = formation.anchor.x - x
      const dz = formation.anchor.z - z
      if (Math.hypot(dx, dz) <= FORMATION_JOIN_RADIUS) {
        target = formation
        break
      }
    }
    if (!target) {
      target = { anchor: new THREE.Vector3(x, 0, z), members: [], offsets: [], spin: 0 }
      formations.push(target)
    }
    this.formation = target
    this.offsetIndex = target.members.length
    target.members.push(this)
    // Distribui os deslocamentos em volta da âncora.
    const angle = (this.offsetIndex / FORMATION_MAX_MEMBERS) * Math.PI * 2
    target.offsets.push(new THREE.Vector3(Math.cos(angle) * FORMATION_RADIUS, 0, Math.sin(angle) * FORMATION_RADIUS))
  }

  /** Mata o inimigo e o remove da formação (a formação vazia é descartada). */
  protected override die(): void {
    super.die()
    this.leaveFormation()
  }

  private leaveFormation(): void {
    const formation = this.formation
    if (!formation) return
    const index = formation.members.indexOf(this)
    if (index !== -1) {
      formation.members.splice(index, 1)
      formation.offsets.splice(index, 1)
      // Recalcula offsetIndex para todos os membros restantes após o splice.
      for (let i = 0; i < formation.members.length; i++) {
        formation.members[i].offsetIndex = i
      }
    }
    if (formation.members.length === 0) {
      const fIndex = formations.indexOf(formation)
      if (fIndex !== -1) formations.splice(fIndex, 1)
    }
    this.formation = null
  }

  dispose(): void {
    this.leaveFormation()
    super.dispose()
  }

  update(dt: number, world: EnemyWorld): void {
    // Atualiza a rotação do bando e a posição da âncora ANTES do update base
    // (que move a mesh para o alvo). O membro "líder" (offset 0) arrasta a
    // âncora em direção ao jogador; os demais seguem o formato.
    if (this.formation && this.alive && this.formation.members.length > 0) {
      const formation = this.formation
      formation.spin += FORMATION_SPIN_SPEED * dt

      if (this.offsetIndex === 0) {
        const playerPos = world.playerPosition
        const dx = playerPos.x - formation.anchor.x
        const dz = playerPos.z - formation.anchor.z
        const distance = Math.hypot(dx, dz)
        if (distance > 0.001) {
          const step = this.type.speed * this.speedMultiplier * dt
          const resolved = world.collision.resolvePosition(
            { x: formation.anchor.x, z: formation.anchor.z },
            { x: (dx / distance) * step, z: (dz / distance) * step },
            this.type.radius,
          )
          formation.anchor.x = resolved.x
          formation.anchor.z = resolved.z
        }
      }
    }

    super.update(dt, world)

    // Depois do update base, posiciona a mesh na formação (se ainda vivo).
    if (this.formation && this.alive) {
      const spin = this.formation.spin
      const offset = this.formation.offsets[this.offsetIndex]
      const cos = Math.cos(spin)
      const sin = Math.sin(spin)
      const rotatedX = offset.x * cos - offset.z * sin
      const rotatedZ = offset.x * sin + offset.z * cos
      this.mesh.position.x = this.formation.anchor.x + rotatedX
      this.mesh.position.z = this.formation.anchor.z + rotatedZ
    }
  }
}