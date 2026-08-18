import type { LevelDefinition } from '../LevelLoader'

/**
 * Fase 15: núcleo de Crimson — arena final com um boss e ondas de reforço.
 * A porta D1 é a saída da campanha (level-victory).
 */
export const level15: LevelDefinition = {
  id: 'level-15',
  name: 'Núcleo de Crimson',
  atmosphere: { fogColor: 0x460a14, ambientColor: 0xff9090, fogFar: 130 },
  doors: [
    { marker: 'D1', targetLevelId: 'level-victory', label: 'Saída da Campanha', bossLocked: true },
  ],
  waves: [
    { enemyType: 'swarm', count: 4, delay: 8 },
    { enemyType: 'flying', count: 3, delay: 20 },
    { enemyType: 'shielded', count: 3, delay: 30 },
  ],
  waveSpawns: [
    { x: 55, z: 40 },
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
    '#............B...X...X...#',
    '#..T.....X#..#......T....#',
    '#.........#..#..........#',
    '#X.......................#',
    '#.K....H.........X.K.....#',
    '#......#........X#.......#',
    '#....A.......H....#......#',
    '#..................#.D...#',
    '##########################',
  ],
}