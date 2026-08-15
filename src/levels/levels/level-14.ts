import type { LevelDefinition } from '../LevelLoader'

/**
 * Fase 14: salões do fim — ondas pesadas de escudos com tanques fixos.
 * Grid validado por flood-fill.
 */
export const level14: LevelDefinition = {
  id: 'level-14',
  name: 'Salões do Fim',
  atmosphere: { fogColor: 0x1a0a24, ambientColor: 0xb080d0, fogFar: 115 },
  doors: [
    { marker: 'D1', targetLevelId: 'level-15', label: 'Núcleo de Crimson' },
  ],
  waves: [
    { enemyType: 'shielded', count: 3, delay: 5 },
    { enemyType: 'shielded', count: 4, delay: 15 },
    { enemyType: 'swarm', count: 6, delay: 26 },
  ],
  waveSpawns: [
    { x: 45, z: 45 },
    { x: 110, z: 45 },
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
    '#..T.....X#..#......T....#',
    '#.........#..#..........#',
    '#X.......................#',
    '#.K....H.........X.K.....#',
    '#......#........X#.......#',
    '#....A.......H....#..D...#',
    '#..................#.....#',
    '##########################',
  ],
}