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
    '####################',
    '#P.................#',
    '#...H....X..XA..S..#',
    '#..E....####....D..#',
    '#..................#',
    '######...X.E...X...#',
    '######.EA......XH..#',
    '######.X...........#',
    '#..X.........X...D.#',
    '#..A.....H.X...E...#',
    '#..................#',
    '####################',
  ],
}
