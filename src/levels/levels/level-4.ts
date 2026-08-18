import type { LevelDefinition } from '../LevelLoader'

/**
 * Fase 4: corredores bifurcados — introduz gradualmente o kamikaze ('K')
 * e o tanque blindado ('T') junto dos inimigos já conhecidos.
 * Grid validado por flood-fill (todos os marcadores são alcançáveis).
 */
export const level4: LevelDefinition = {
  id: 'level-4',
  name: 'Salões dos Condenados',
  atmosphere: { fogColor: 0x3a1020, ambientColor: 0xd8b0c0 },
  doors: [
    { marker: 'D1', targetLevelId: 'level-5', label: 'Arena Final de Crimson' },
    { marker: 'D2', targetLevelId: 'level-4b-secret', label: 'Arsenal Esquecido', secret: true },
  ],
grid: [
    '###########################',
    '#.........................#',
    '#.P....E......S.....K.....#',
    '#.X.........H.........X...#',
    '#.#.########.########.##..#',
    '#.........X..............D#',
    '#...E...A..T.#....K.......#',
    '#...X.........#..X......X..#',
    '#.####.########.########..#',
    '#.........................#',
    '#....E...H...S...A..K.....#',
    '#..X..X.....X............D#',
    '#.##.#############.#####..#',
    '#....X....................#',
    '###########################',
  ],
}
