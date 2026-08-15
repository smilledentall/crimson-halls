import type { LevelDefinition } from '../LevelLoader'

/**
 * Fase 6: caldeiras de lava — salas largas com pilares de fogo, introduz o
 * voador ('flying') em ondas. Grid validado por flood-fill.
 */
export const level6: LevelDefinition = {
  id: 'level-6',
  name: 'Caldeiras de Lava',
  atmosphere: { fogColor: 0x4a1408, ambientColor: 0xffa060, fogFar: 130 },
  doors: [
    { marker: 'D1', targetLevelId: 'level-7', label: 'Galerias dos Enxames' },
  ],
  waves: [
    { enemyType: 'flying', count: 2, delay: 8 },
    { enemyType: 'flying', count: 3, delay: 20 },
  ],
  waveSpawns: [
    { x: 60, z: 30 },
    { x: 120, z: 60 },
    { x: 90, z: 60 },
  ],
  grid: [
    '##########################',
    '#P.....X.......A....X....#',
    '#...E....#......#..E.....#',
    '#........#......#........#',
    '#X................X......#',
    '#.....####......####.....#',
    '#.....X....X.............#',
    '#.S........#X...#......S.#',
    '#.........#.....#X.......#',
    '#...............X........#',
    '#.K....H............K....#',
    '#.........X........A.....#',
    '#..T......#....#....D....#',
    '#.........H....A.........#',
    '##########################',
  ],
}