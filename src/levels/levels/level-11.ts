import type { LevelDefinition } from '../LevelLoader'

/**
 * Fase 11: salões assombrados — atiradores em várias salas com ondas de
 * enxames. Grid validado por flood-fill.
 */
export const level11: LevelDefinition = {
  id: 'level-11',
  name: 'Salões Assombrados',
  atmosphere: { fogColor: 0x0f1520, ambientColor: 0x90a0c0, fogFar: 105 },
  doors: [
    { marker: 'D1', targetLevelId: 'level-12', label: 'Necrópole de Obsidiana' },
  ],
  waves: [
    { enemyType: 'swarm', count: 4, delay: 6 },
    { enemyType: 'swarm', count: 6, delay: 16 },
  ],
  waveSpawns: [
    { x: 40, z: 40 },
    { x: 110, z: 60 },
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
    '#.........#.X#..........#',
    '#X.......................#',
    '#.K....H..........K......#',
    '#......#.........#.......#',
    '#...T.......A.....#......#',
    '#..................#.D...#',
    '##########################',
  ],
}