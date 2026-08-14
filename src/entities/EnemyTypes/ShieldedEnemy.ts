import { Enemy } from '../Enemy'
import type { CombatModifiers } from '../Enemy'
import type { EnemyTypeDefinition } from '.'

/**
 * Inimigo com escudo: possui vida extra e reduz dano abaixo de um limite.
 * A lógica de dano é semelhante ao tanque, mas pode ser ajustada para
 * efeitos de escudo visual.
 */
export class ShieldedEnemy extends Enemy {
  constructor(
    type: EnemyTypeDefinition,
    x: number,
    z: number,
    healthMultiplier = 1,
    combat: CombatModifiers = {},
  ) {
    super(type, x, z, healthMultiplier, combat)
  }

  /**
   * Aplica dano ao inimigo. Se o dano for menor que o mínimo de dano
   * que o escudo pode bloquear, o dano é reduzido pelo fator de
   * redução de armadura.
   */
  damage(amount: number): void {
    let final = amount
    if (this.type.armorMinDamage != null && amount < this.type.armorMinDamage) {
      final = amount * (this.type.armorReduction ?? 1)
    }
    super.damage(final)
  }
}
