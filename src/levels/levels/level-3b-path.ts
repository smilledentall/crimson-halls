import type { LevelDefinition } from '../LevelLoader'

/**
 * Ramo B da bifurcação do nível 3: conteúdo diferente — atiradores e um
 * kamikaze, com mais munição. Também converge para o nível 4.
 */
export const level3bPath: LevelDefinition = {
  id: 'level-3b-path',
  name: 'Caminho das Gárgulas',
  grid: [
    '##############',
    '#P..A..X....D#',
    '#.E........H.#',
    '#............#',
    '#.....S....X.#',
    '#............#',
    '#..A......K..#',
    '#.X..........#',
    '#...........D#',
    '##############',
  ],
  doors: [
    { marker: 'D1', targetLevelId: 'level-3', label: 'Profundezas de Crimson' },
    { marker: 'D2', targetLevelId: 'level-4', label: 'Salões dos Condenados' },
  ],
}
