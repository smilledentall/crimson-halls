import type { LevelDefinition } from '../LevelLoader'

/**
 * Fase 9: alturas de Crimson — andares ligados por passagens, com voadores
 * em ondas e atiradores fixos em pontos altos. Grid validado por flood-fill.
 */
export const level9: LevelDefinition = {
  id: 'level-9',
  name: 'Alturas de Crimson',
  startFloorId: 'floor-1',
  atmosphere: { fogColor: 0x2a0f1a, ambientColor: 0xe0b0c0, fogFar: 125 },
  floors: [
    {
      id: 'floor-1',
      name: 'Térreo',
      height: 0,
      grid: [
        '###########################',
        '#P....X....#....#....A...##',
        '#...E.......#....#....E..##',
        '#............#....#......##',
        '#X....#...........#X.....##',
        '#......#.........#.......##',
        '#..............X.........##',
        '#..S......X#...#.L..S....##',
        '###########################',
      ],
      doors: [],
    },
    {
      id: 'floor-2',
      name: 'Torres Superiores',
      height: 6,
      grid: [
        '###########################',
        '#..........#...#.l.......##',
        '#X.........#...#........X##',
        '#.K....H.......X....K....##',
        '#..............#.........##',
        '#...T........A...........##',
        '#................#D......##',
        '###########################',
      ],
      doors: [
        { marker: 'D1', targetLevelId: 'level-10', label: 'Forja de Obsidiana' },
      ],
    },
  ],
  stairs: [
    {
      id: 'stair-1-2',
      fromFloor: 'floor-1',
      toFloor: 'floor-2',
      fromMarker: 'L1',
      toMarker: 'l1',
      direction: 'up',
    },
  ],
  waves: [
    { enemyType: 'flying', count: 3, delay: 5, floorId: 'floor-2' },
    { enemyType: 'flying', count: 4, delay: 15, floorId: 'floor-2' },
  ],
  waveSpawns: [
    { x: 55, z: 35, floorId: 'floor-2' },
    { x: 100, z: 30, floorId: 'floor-2' },
    { x: 80, z: 20, floorId: 'floor-2' },
  ],
}