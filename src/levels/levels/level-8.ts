import type { LevelDefinition } from '../LevelLoader'

/**
 * Fase 8: santuário dos escudos — inimigos blindados ('shielded') em ondas,
 * exigindo trocar para armas de dano alto. Grid validado por flood-fill.
 */
export const level8: LevelDefinition = {
  id: 'level-8',
  name: 'Santuário dos Escudos',
  atmosphere: { fogColor: 0x242030, ambientColor: 0x9080b0, fogFar: 110 },
  doors: [
    { marker: 'D1', targetLevelId: 'level-9', label: 'Alturas de Crimson' },
  ],
  waves: [
    { enemyType: 'shielded', count: 2, delay: 6 },
    { enemyType: 'shielded', count: 3, delay: 18 },
    { enemyType: 'shielded', count: 3, delay: 32 },
  ],
  waveSpawns: [
    { x: 40, z: 40 },
    { x: 110, z: 50 },
    { x: 75, z: 60 },
  ],
  grid: [
    '##########################',
    '#P.....X....#....X.......#',
    '#....E...#.........#..E..#',
    '#..............#.........#',
    '#X...#.............#....X#',
    '#......#...........#.....#',
    '#........................#',
    '#..S......X#....#X...S...#',
    '#...........#....#.......#',
    '#.K...................K..#',
    '#......X#.........#X.....#',
    '#..H......#....#..D.H....#',
    '#...T.......A............#',
    '#................#.......#',
    '##########################',
  ],
}