import { Enemy } from '../Enemy'
import type { CombatModifiers } from '../Enemy'
import type { EnemyTypeDefinition } from '.'

/**
 * Inimigo voador: atira de longe e mantém distância.
 */
export class FlyingEnemy extends Enemy {
  constructor(
    type: EnemyTypeDefinition,
    x: number,
    z: number,
    healthMultiplier = 1,
    combat: CombatModifiers = {},
  ) {
    super(type, x, z, healthMultiplier, combat)
  }
}
