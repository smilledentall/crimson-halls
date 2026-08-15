import type { LevelDefinition } from '../LevelLoader'

/**
 * Fase 13: antessala do núcleo — voadores e enxames em ondas alternadas,
 * com um tanque guardando o centro. Grid validado por flood-fill.
 */
export const level13: LevelDefinition = {
  id: 'level-13',
  name: 'Antessala do Núcleo',
  atmosphere: { fogColor: 0x2a0a1a, ambientColor: 0xe0a0c0, fogFar: 120 },
  doors: [
    { marker: 'D1', targetLevelId: 'level-14', label: 'Salões do Fim' },
  ],
  waves: [
    { enemyType: 'flying', count: 3, delay: 5 },
    { enemyType: 'swarm', count: 6, delay: 16 },
    { enemyType: 'flying', count: 4, delay: 28 },
  ],
  waveSpawns: [
    { x: 55, z: 35 },
    { x: 100, z: 55 },
    { x: 80, z: 60 },
  ],
  grid: [
    '##########################',
    '#P....X....#....X....A...#',
    '#...E.......#.......E....#',
    '#............#...........#',
    '#X....#...#.........#....#',
    '#......#...#.........#X..#',
    '#................X...X...#',
    '#..S.....X#..#......S....#',
    '#.........#..#..........#',
    '#X.......................#',
    '#.K....H.......T...K.....#',
    '#......#........X#.......#',
    '#....A.......H....#..D...#',
    '#..................#.....#',
    '##########################',
  ],
}