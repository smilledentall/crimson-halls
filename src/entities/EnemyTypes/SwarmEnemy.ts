import { Enemy } from '../Enemy'
import type { EnemyWorld, CombatModifiers } from '../Enemy'
import type { EnemyTypeDefinition } from '.'

/**
 * SwarmEnemy represents a group of small enemies that move together.
 * For now, it behaves like a normal Enemy but with a custom update
 * that makes it move in a simple circular pattern.
 */
export class SwarmEnemy extends Enemy {
  /** Base position for orbit */
  private readonly baseX: number
  private readonly baseZ: number
  /** Radius of the circular path around the initial position */
  private readonly orbitRadius = 2
  /** Speed of the orbit in radians per second */
  private readonly orbitSpeed = 1
  /** Current angle on the orbit */
  private angle = 0

  constructor(
    type: EnemyTypeDefinition,
    x: number,
    z: number,
    healthMultiplier = 1,
    combat: CombatModifiers = {},
  ) {
    super(type, x, z, healthMultiplier, combat)
    // Swarm enemies are slightly faster and have a smaller health pool
    this.speedMultiplier *= 1.2
    this.health = Math.max(1, Math.round(this.health * 0.8))
    this.baseX = this.position.x
    this.baseZ = this.position.z
  }

  /** Override update to add orbit movement */
  update(dt: number, world: EnemyWorld): void {
    super.update(dt, world)
    // Simple circular orbit around the initial position
    this.angle += this.orbitSpeed * dt
    const offsetX = Math.cos(this.angle) * this.orbitRadius
    const offsetZ = Math.sin(this.angle) * this.orbitRadius
    this.mesh.position.x = this.baseX + offsetX
    this.mesh.position.z = this.baseZ + offsetZ
  }
}
