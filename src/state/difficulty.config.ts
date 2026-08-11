/**
 * Níveis de dificuldade — multiplicadores centralizados aplicados sobre os
 * valores já existentes (nenhuma lógica duplicada). O engine/store consultam
 * estas constantes.
 */
export type DifficultyId = 'easy' | 'normal' | 'hard'

export interface DifficultyConfig {
  id: DifficultyId
  name: string
  description: string
  /** Multiplica o dano recebido pelo jogador. */
  playerDamageReceived: number
  /** Multiplica a vida dos inimigos. */
  enemyHealth: number
  /** Multiplica a munição concedida pelos pickups. */
  pickupAmmoMultiplier: number
  /** Multiplica os intervalos das ondas do nível 5 (maior = mais lento). */
  waveIntervalMultiplier: number
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  easy: {
    id: 'easy',
    name: 'Fácil',
    description: 'Menos dano recebido, inimigos mais fracos, mais munição e ondas mais lentas.',
    playerDamageReceived: 0.6,
    enemyHealth: 0.75,
    pickupAmmoMultiplier: 1.5,
    waveIntervalMultiplier: 1.5,
  },
  normal: {
    id: 'normal',
    name: 'Normal',
    description: 'A experiência padrão de Crimson Halls.',
    playerDamageReceived: 1,
    enemyHealth: 1,
    pickupAmmoMultiplier: 1,
    waveIntervalMultiplier: 1,
  },
  hard: {
    id: 'hard',
    name: 'Difícil',
    description: 'Mais dano recebido, inimigos resistentes, menos munição e ondas mais rápidas.',
    playerDamageReceived: 1.5,
    enemyHealth: 1.3,
    pickupAmmoMultiplier: 0.6,
    waveIntervalMultiplier: 0.7,
  },
}

export const DIFFICULTY_ORDER: DifficultyId[] = ['easy', 'normal', 'hard']

export function isValidDifficulty(value: unknown): value is DifficultyId {
  return value === 'easy' || value === 'normal' || value === 'hard'
}
