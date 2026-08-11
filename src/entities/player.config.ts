/**
 * Constantes de balanceamento do jogador.
 * Centralizadas aqui — nunca hardcoded dentro da lógica.
 */
export const PLAYER_CONFIG = {
  maxHealth: 100,
  moveSpeed: 7, // m/s
  sprintMultiplier: 1.3,
  eyeHeight: 1.7, // altura da câmera em relação ao chão
  radius: 0.5, // raio do círculo de colisão no plano XZ
  bobFrequency: 8, // Hz de passadas
  bobAmplitude: 0.05, // metros de oscilação vertical (camera bob)
  lookSensitivity: 0.0022, // rad por pixel de movimento do mouse
  minPitch: -Math.PI / 2 + 0.05,
  maxPitch: Math.PI / 2 - 0.05,
} as const
