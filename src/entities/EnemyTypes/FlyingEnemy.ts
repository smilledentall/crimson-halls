import { RangedEnemy } from './RangedEnemy'
import type { CombatModifiers, EnemyWorld } from '../Enemy'
import type { EnemyTypeDefinition } from '.'

/**
 * Inimigo voador: herda o comportamento à distância (RangedEnemy) — mantém
 * distância e atira projéteis periódicos — e adiciona flutuação no ar.
 * A flutuação é apenas visual: a colisão e o alvo de raycast continuam 2D
 * (x/z), então ele permanece atingível e não atravessa paredes.
 */
export class FlyingEnemy extends RangedEnemy {
  /** Fase do balanço de flutuação (rad/s). */
  private hoverPhase = 0
  /** Altura média de voo em unidades de mundo. */
  private readonly hoverHeight = 0.85
  /** Amplitude do balanço vertical. */
  private readonly hoverAmplitude = 0.25
  /** Velocidade do balanço. */
  private readonly hoverSpeed = 2.2

  constructor(
    type: EnemyTypeDefinition,
    x: number,
    z: number,
    healthMultiplier = 1,
    combat: CombatModifiers = {},
  ) {
    super(type, x, z, healthMultiplier, combat)
  }

  /** Sobrescreve update para adicionar a flutuação no ar (sem alterar a IA). */
  override update(dt: number, world: EnemyWorld): void {
    super.update(dt, world)
    if (!this.alive) return
    this.hoverPhase += dt * this.hoverSpeed
    // Balanço senoidal; a morte (super.update) cuida do afundamento.
    this.mesh.position.y = this.hoverHeight + Math.sin(this.hoverPhase) * this.hoverAmplitude
  }
}