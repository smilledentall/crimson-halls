/** Detecção de dispositivo com tela sensível ao toque (para controles virtuais). */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}
