/**
 * Níveis de dificuldade — multiplicadores centralizados aplicados sobre os
 * valores já existentes (nenhuma lógica duplicada). O engine/store consultam
 * estas constantes.
 *
 * A dificuldade NÃO é só "esponja de dano": também altera comportamento
 * (velocidade de perseguição, cooldown de ataque e precisão de atiradores).
 */
export type DifficultyId = 'easy' | 'normal' | 'hard' | 'extreme'

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
  /** Multiplica a velocidade de perseguição dos inimigos. */
  enemySpeedMultiplier: number
  /** Multiplica o cooldown de ataque (<1 = atacam com mais frequência). */
  enemyAttackIntervalMultiplier: number
  /** Multiplica a dispersão dos tiros de atiradores (<1 = mais precisos). */
  enemySpreadMultiplier: number
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  easy: {
    id: 'easy',
    name: 'Fácil',
    description: 'Inimigos lentos e imprecisos, menos dano recebido, mais munição.',
    playerDamageReceived: 0.55,
    enemyHealth: 0.8,
    pickupAmmoMultiplier: 1.4,
    waveIntervalMultiplier: 1.6,
    enemySpeedMultiplier: 0.85,
    enemyAttackIntervalMultiplier: 1.15,
    enemySpreadMultiplier: 1.4,
  },
  normal: {
    id: 'normal',
    name: 'Normal',
    description: 'A experiência padrão de Crimson Halls.',
    playerDamageReceived: 1,
    enemyHealth: 1,
    pickupAmmoMultiplier: 1,
    waveIntervalMultiplier: 1,
    enemySpeedMultiplier: 1,
    enemyAttackIntervalMultiplier: 1,
    enemySpreadMultiplier: 1,
  },
  hard: {
    id: 'hard',
    name: 'Difícil',
    description: 'Inimigos velozes, agressivos e precisos, com muita vida; menos munição e dano recebido alto.',
    playerDamageReceived: 1.9,
    enemyHealth: 2,
    pickupAmmoMultiplier: 0.5,
    waveIntervalMultiplier: 0.6,
    enemySpeedMultiplier: 1.3,
    enemyAttackIntervalMultiplier: 0.8,
    enemySpreadMultiplier: 0.6,
  },
  extreme: {
    id: 'extreme',
    name: 'Extremo',
    description: 'Inimigos implacáveis, alta velocidade, dano massivo e pouca munição.',
    playerDamageReceived: 2.5,
    enemyHealth: 3,
    pickupAmmoMultiplier: 0.3,
    waveIntervalMultiplier: 0.4,
    enemySpeedMultiplier: 1.6,
    enemyAttackIntervalMultiplier: 0.6,
    enemySpreadMultiplier: 0.5,
  },
}

export const DIFFICULTY_ORDER: DifficultyId[] = ['easy', 'normal', 'hard', 'extreme']

export function isValidDifficulty(value: unknown): value is DifficultyId {
  return value === 'easy' || value === 'normal' || value === 'hard' || value === 'extreme'
}
