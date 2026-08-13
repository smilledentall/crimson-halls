import type { LevelDefinition } from '../LevelLoader'

/**
 * Fase 3: labirinto maior — três colunas de zonas ligadas por portas
 * estreitas, com arena central e presença de atiradores em várias salas.
 * 6 perseguidores ('E') + 3 atiradores ('S'), vida e munição.
 * Grid validado por flood-fill (todos os marcadores são alcançáveis).
 */
export const level3: LevelDefinition = {
  id: 'level-3',
  name: 'Profundezas de Crimson',
  atmosphere: { fogColor: 0x33101a, ambientColor: 0xd8c0d0, fogFar: 140 },
  doors: [
    { marker: 'D1', targetLevelId: 'level-3a-path', label: 'Caminho da Cripta' },
    { marker: 'D2', targetLevelId: 'level-3b-path', label: 'Caminho das Gárgulas' },
    {
      marker: 'D3',
      targetLevelId: 'level-3c-secret',
      label: 'Tesouro de Crimson',
      secret: true,
      requires: 'V1',
    },
  ],
  levers: [{ marker: 'V1', label: 'Válvula de emergência' }],
grid: [
    '##############################',
    '#P...H....#.........#.A......#',
    '#..E...X..#.........#...EX...#',
    '#.........#...XS....#........#',
    '#.........#.....D...#........#',
    '#.........#.........#........#',
    '#.#######...#######.#.######.#',
    '#....H....#.XA.........A....D#',
    '#..EX..X..#....E.......HE....#',
    '#.........#.....XV...........#',
    '#............................#',
    '#.#######.#.#######.#.######.#',
    '#.....X.X.#..A.SX...#...E....#',
    '#..S..H.D.#.........#........#',
    '##############################',
  ],
}
