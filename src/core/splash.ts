/**
 * Lógica pura de dano em área (splash), usada por foguetes e kamikazes.
 * Mantida desacoplada do Three.js para ser testável.
 */

/** Fator de dano (0..1) pela distância dentro do raio. 0 fora do raio. */
export function splashFalloff(distance: number, radius: number): number {
  if (radius <= 0) return distance <= 0 ? 1 : 0
  if (distance > radius) return 0
  return 1 - distance / radius
}

/** Dano em área aplicado a um alvo (com fator opcional para o próprio jogador). */
export function computeSplashDamage(
  distance: number,
  radius: number,
  baseDamage: number,
  factor = 1,
): number {
  return Math.round(baseDamage * factor * splashFalloff(distance, radius))
}
