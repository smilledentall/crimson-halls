/**
 * Configuração do Escudo Temporário (data-driven).
 * Centralizado aqui para balanceamento fácil — nunca hardcoded na lógica.
 */
export const SHIELD_CONFIG = {
  // Duração do escudo ativo (segundos).
  duration: 5,
  // Cooldown antes de poder reativar (segundos).
  cooldown: 25,
  // Redução de dano enquanto ativo (0 = nenhum, 1 = imunidade total).
  // 0.75 = 75% de redução (leve 25% do dano).
  damageReduction: 0.75,
} as const