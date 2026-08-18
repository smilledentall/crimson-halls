import type { LevelDefinition } from '../LevelLoader'

/**
 * Fase 1: hall de entrada com várias salas ligadas a uma arena central.
 * 4 perseguidores ('E') + 1 atirador ('S'), vida e munição.
 * Grid validado por flood-fill (todos os marcadores são alcançáveis).
 */
export const level1: LevelDefinition = {
  id: 'level-1',
  name: 'Hall de Entrada',
  doors: [
    { marker: 'D1', targetLevelId: 'level-2', label: 'Corredores de Crimson' },
    { marker: 'D2', targetLevelId: 'level-1b-secret', label: 'Depósito Abandonado', secret: true },
  ],
grid: [
    '####################',  // 0
    '#P.................#',  // 1
    '#...H....X...A..S.#.#', // 2: # at index 17 (above D1)
    '#..E....####X....D.#',  // 3: D1 at index 17
    '######.....E.....#X#',  // 4: # at index 17 (below D1)
    '######.EA.......H.X#',  // 5
    '######X............#',  // 6
    '#..X..............D#',  // 7
    '#..A.....H.....E...#',  // 8
    '#..........X.X.....#',  // 9
    '####################',  // 10
  ],
}
