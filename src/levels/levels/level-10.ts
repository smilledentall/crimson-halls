import type { LevelDefinition } from '../LevelLoader'

/**
 * Fase 10: forja de obsidiana — mistura de escudos e enxames com um tanque
 * fixo guardando o caminho. Grid validado por flood-fill.
 */
export const level10: LevelDefinition = {
  id: 'level-10',
  name: 'Forja de Obsidiana',
  atmosphere: { fogColor: 0x101018, ambientColor: 0x8888c0, fogFar: 115 },
  doors: [
    { marker: 'D1', targetLevelId: 'level-11', label: 'Salões Assombrados' },
  ],
  waves: [
    { enemyType: 'shielded', count: 2, delay: 7 },
    { enemyType: 'swarm', count: 5, delay: 18 },
  ],
  waveSpawns: [
    { x: 45, z: 45 },
    { x: 110, z: 40 },
    { x: 75, z: 60 },
  ],
  grid: [
    '##########################',
    '#P....X....#....X....A...#',
    '#...E.......#.......E....#',
    '#............#...........#',
    '#X....#...........#X.....#',
    '#.....#...........#.....#',
    '#.......................#',
    '#..S.....X#.....X#...S...#',
    '#.........#......#.......#',
    '#X......................X#',
    '#.K.....H...........K....#',
    '#............T...........#',
    '#....A..............D....#',
    '#.............X..........#',
    '##########################',
  ],
}