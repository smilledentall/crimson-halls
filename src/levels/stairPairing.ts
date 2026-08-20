import type { StairDefinition } from './LevelLoader'

/**
 * Andar mínimo que a auto-correspondência de escadas precisa conhecer:
 * id (para os StairDefinitions), altura (ordenação subir/descer) e o grid
 * (linhas de caracteres com os marcadores 'L'/'l').
 */
export interface StairFloor {
  id: string
  height: number
  grid: string[]
}

interface StairMarker {
  /** Índice 1-based na ordem de varredura do andar (L1, L2... / l1, l2...). */
  scan: number
}

/**
 * Auto-correspondência de escadas do editor (§6 do plano).
 *
 * Convenção dos marcadores:
 * - 'L' = escada de SUBIR — fica no andar MAIS BAIXO.
 * - 'l' = escada de DESCER — fica no andar mais ALTO.
 * - A numeração (L1, l2...) é por andar, em ordem de varredura (linha-mãe,
 *   depois coluna) — a mesma regra que o LevelLoader usa ao cruzar os
 *   marcadores com `definition.stairs`.
 *
 * Regra de pareamento (determinística, consome em ordem):
 * 1. Andares ordenados por altura (crescente; empates preservam a ordem).
 * 2. Para cada andar A com marcadores 'L', cada 'L' (em ordem) casa com o
 *    primeiro 'l' disponível do andar B mais próximo acima (altura maior)
 *    que ainda tenha 'l' sobrando — resultando numa escada 'up' A→B.
 * 3. Sobras (L sem 'l' acima, ou 'l' sem 'L' abaixo) ficam sem par — o
 *    LevelLoader simplesmente ignora escadas cujos marcadores não existem.
 *
 * Isso cobre cadeias (A→B→C sem escada fantasma A→C) e "vãos" (andar do
 * meio sem escada). Andares de MESMA altura nunca pareiam (não há subida).
 */
export function autoPairStairs(floors: StairFloor[]): StairDefinition[] {
  const sorted = [...floors].sort((a, b) => a.height - b.height)
  const ups = new Map<string, StairMarker[]>()
  const downs = new Map<string, StairMarker[]>()
  for (const floor of sorted) {
    ups.set(floor.id, collectMarkers(floor, 'L'))
    downs.set(floor.id, collectMarkers(floor, 'l'))
  }

  // Quantos 'l' de cada andar já foram consumidos por andares mais baixos.
  const downPointer = new Map<string, number>(sorted.map(floor => [floor.id, 0]))

  const stairs: StairDefinition[] = []
  for (let i = 0; i < sorted.length; i++) {
    const from = sorted[i]
    const fromUps = ups.get(from.id)!
    let upIndex = 0
    if (upIndex >= fromUps.length) continue

    for (let j = i + 1; j < sorted.length && upIndex < fromUps.length; j++) {
      const to = sorted[j]
      // Subir exige andar de altura maior (empates não pareiam).
      if (to.height <= from.height) continue
      const toDowns = downs.get(to.id)!
      let p = downPointer.get(to.id)!
      while (upIndex < fromUps.length && p < toDowns.length) {
        stairs.push({
          id: `${from.id}-${to.id}-${fromUps[upIndex].scan}`,
          fromFloor: from.id,
          toFloor: to.id,
          fromMarker: `L${fromUps[upIndex].scan}`,
          toMarker: `l${toDowns[p].scan}`,
          direction: 'up',
        })
        upIndex++
        p++
      }
      downPointer.set(to.id, p)
    }
  }
  return stairs
}

/** Coleta os marcadores de um andar em ordem de varredura (linha, depois coluna). */
function collectMarkers(floor: StairFloor, char: 'L' | 'l'): StairMarker[] {
  const markers: StairMarker[] = []
  let scan = 0
  for (const line of floor.grid) {
    for (const cell of line) {
      if (cell === char) {
        scan++
        markers.push({ scan })
      }
    }
  }
  return markers
}