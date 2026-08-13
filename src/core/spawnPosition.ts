import type { CollisionSystem } from './CollisionSystem'

export interface SpawnOccupant {
  x: number
  z: number
  radius: number
}

/** Raio do anel em que os deslocamentos aleatórios são tentados. */
const MIN_OFFSET = 2
const MAX_OFFSET = 4
/** Folga mínima extra além da soma dos raios entre dois inimigos. */
const GAP = 0.4
/** Separacão mínima obrigatória entre pontos do mesmo grupo de spawn. */
const MIN_SEPARATION = 1.8

/**
 * Encontra uma posição de spawn livre perto de (baseX, baseZ): sorteia vários
 * candidatos num anel de 2–4 m e escolhe o primeiro que não esteja dentro de
 * parede (via CollisionSystem) nem a menos de ~1.8 m de outro inimigo já
 * posicionado no grupo. Isso garante separação visual mínima entre inimigos
 * duplicados do mesmo marcador, independente da aleatoriedade.
 */
export function findSpawnPosition(
  baseX: number,
  baseZ: number,
  radius: number,
  collision: CollisionSystem,
  occupants: SpawnOccupant[],
  attempts = 24,
): { x: number; z: number } {
  for (let i = 0; i < attempts; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = MIN_OFFSET + Math.random() * (MAX_OFFSET - MIN_OFFSET)
    const x = baseX + Math.cos(angle) * dist
    const z = baseZ + Math.sin(angle) * dist
    if (collision.isBlocked(x, z, radius)) continue
    let overlapped = false
    for (const other of occupants) {
      const minGap = Math.max(MIN_SEPARATION, other.radius + radius + GAP)
      if (Math.hypot(other.x - x, other.z - z) < minGap) {
        overlapped = true
        break
      }
    }
    if (!overlapped) return { x, z }
  }
  // Nenhuma posição livre encontrada: cai no próprio ponto do marcador.
  return { x: baseX, z: baseZ }
}