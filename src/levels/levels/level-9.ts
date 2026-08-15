import type { LevelDefinition } from '../LevelLoader'

/**
 * Fase 9: alturas de Crimson — andares ligados por passagens, com voadores
 * em ondas e atiradores fixos em pontos altos. Grid validado por flood-fill.
 */
export const level9: LevelDefinition = {
  id: 'level-9',
  name: 'Alturas de Crimson',
  atmosphere: { fogColor: 0x2a0f1a, ambientColor: 0xe0b0c0, fogFar: 125 },
  doors: [
    { marker: 'D1', targetLevelId: 'level-10', label: 'Forja de Obsidiana' },
  ],
  waves: [
    { enemyType: 'flying', count: 3, delay: 5 },
    { enemyType: 'flying', count: 4, delay: 15 },
  ],
  waveSpawns: [
    { x: 55, z: 35 },
    { x: 100, z: 55 },
    { x: 80, z: 60 },
  ],
  grid: [
    '##########################',
    '#P....X....#....#....A...#',
    '#...E.......#....#....E..#',
    '#............#....#......#',
    '#X....#...........#X.....#',
    '#......#.........#.......#',
    '#..............X.........#',
    '#..S......X#...#....S....#',
    '#..........#...#.........#',
    '#X.........#...#........X#',
    '#.K....H.......X....K....#',
    '#..............#.........#',
    '#...T........A....D......#',
    '#................#.......#',
    '##########################',
  ],
}