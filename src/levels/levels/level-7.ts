import type { LevelDefinition } from '../LevelLoader'

/**
 * Fase 7: galerias dos enxames — primeiro contato com o enxame ('swarm')
 * em ondas rápidas. Grid validado por flood-fill.
 */
export const level7: LevelDefinition = {
  id: 'level-7',
  name: 'Galerias dos Enxames',
  atmosphere: { fogColor: 0x1f1420, ambientColor: 0xb0a0d0, fogFar: 120 },
  doors: [
    { marker: 'D1', targetLevelId: 'level-8', label: 'Santuário dos Escudos' },
  ],
  waves: [
    { enemyType: 'swarm', count: 4, delay: 4 },
    { enemyType: 'swarm', count: 5, delay: 16 },
    { enemyType: 'swarm', count: 6, delay: 30 },
  ],
  waveSpawns: [
    { x: 45, z: 30 },
    { x: 105, z: 45 },
    { x: 75, z: 60 },
    { x: 30, z: 60 },
  ],
grid: [
    '###########################',
    '#P....X....#....X....A...##',
    '#...E........#........E..##',
    '#..............#.........##',
    '#X.......#.........#.....##',
    '#.....................X..##',
    '#.....#......X#.......#..##',
    '#..S....#.........#..S...##',
    '#...........#.........#..##',
    '#X.........#.............##',
    '#.K..........#....K..X#..##',
    '#.....H.....#...H........##',
    '#...T..........A.........##',
    '#..............#...D.....##',
    '###########################',
  ],
}