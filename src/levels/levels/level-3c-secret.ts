import type { LevelDefinition } from '../LevelLoader'

/**
 * Sala secreta do nível 3, destravada por uma válvula ('V1') no nível
 * principal. Sem inimigos — um tesouro de vida e munição.
 */
export const level3cSecret: LevelDefinition = {
  id: 'level-3c-secret',
  name: 'Tesouro de Crimson',
  grid: [
    '############',
    '#P....A...D#',
    '#..H...A.X.#',
    '#....AC....#',
    '#......N.H.#',
    '#..A.X..A..#',
    '#....X.....#',
    '############',
  ],
  doors: [{ marker: 'D1', targetLevelId: 'level-3', label: 'Profundezas de Crimson' }],
}
