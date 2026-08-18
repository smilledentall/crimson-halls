import type { LevelDefinition } from '../LevelLoader'

/**
 * Fase 12: necrópole de obsidiana — tanques e escudos com ondas pesadas.
 * Grid validado por flood-fill.
 */
export const level12: LevelDefinition = {
  id: 'level-12',
  name: 'Necrópole de Obsidiana',
  atmosphere: { fogColor: 0x141020, ambientColor: 0x8080b0, fogFar: 110 },
  doors: [
    { marker: 'D1', targetLevelId: 'level-13', label: 'Antessala do Núcleo' },
  ],
  waves: [
    { enemyType: 'shielded', count: 3, delay: 6 },
    { enemyType: 'shielded', count: 3, delay: 18 },
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
    '#..T.....X#..#......S....#',
    '#.........#.X#..........#',
    '#X.......................#',
    '#.K....H..........K......#',
    '#......#.........#.......#',
    '#...S.......A.....#......#',
    '#..................#.D...#',
    '##########################',
  ],
}