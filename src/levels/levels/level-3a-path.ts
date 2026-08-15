import type { LevelDefinition } from '../LevelLoader'

/**
 * Ramo A da bifurcação do nível 3: mais perseguidores e um tanque,
 * com munição extra. Volta ao nível 3 ou segue ao nível 4.
 */
export const level3aPath: LevelDefinition = {
  id: 'level-3a-path',
  name: 'Caminho da Cripta',
  grid: [
    '##############',
    '#P..X..A....D#',
    '#.E........E.#',
    '#............#',
    '#...K........#',
    '#............#',
    '#..H.......T.#',
    '#............#',
    '#....X...X..D#',
    '##############',
  ],
  doors: [
    { marker: 'D1', targetLevelId: 'level-4', label: 'Salões dos Condenados' },
    { marker: 'D2', targetLevelId: 'level-3', label: 'Profundezas de Crimson' },
  ],
}
