/**
 * Constantes do sistema de progressão (moeda, pontos de habilidade,
 * recompensas por abate/limpeza de setor e pickups de moeda).
 * Valores conservadores — ajustáveis com playtesting.
 */
export const CURRENCY_PER_LEVEL_CLEAR = 8
export const SKILL_POINT_PER_LEVEL_CLEAR = 1
export const PICKUP_CURRENCY_AMOUNT = 5

/** Multiplicador global de inimigos por spawn (densidade; 1 = um por marcador). */
export const ENEMY_SPAWN_MULTIPLIER = 1

/** Chance de um spawn fixo do grid nascer como outro tipo do roster da fase
 *  (variedade de encontro a cada entrada no nível). */
export const RANDOM_ENEMY_VARIANT_CHANCE = 0.5

/** Faixa do multiplicador aleatório de inimigos por entrada na fase: a cada
 *  início de nível rola um valor entre MIN e MAX e multiplica os spawns fixos
 *  do grid (chefes nunca duplicam). */
export const MIN_RANDOM_ENEMY_MULTIPLIER = 2
export const MAX_RANDOM_ENEMY_MULTIPLIER = 3

/** Bônus de atributos por nível (composto com o base de player.config). */
export const MAX_HEALTH_PER_LEVEL = 10
export const SPEED_PER_LEVEL = 0.04
export const DAMAGE_REDUCTION_PER_LEVEL = 0.05
export const REGEN_INTERVAL_SECONDS = 2
