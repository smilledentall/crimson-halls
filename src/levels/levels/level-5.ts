import type { LevelDefinition } from '../LevelLoader'

/**
 * Fase 5 (final da campanha): arena dedicada do chefe "O Thane de Crimson".
 * O boss ('B') SUBSTITUI as antigas ondas. Ao derrotá-lo, as portas destravam:
 * a traseira (D1, bossLocked) volta ao nível 4 e a sala secreta (D3) abre com
 * a válvula V1. A vitória só dispara quando o jogador sai pela PORTA DE SAÍDA
 * (D2 → level-victory), dando tempo de explorar o conteúdo antes de encerrar.
 */
export const level5: LevelDefinition = {
  id: 'level-5',
  name: 'Arena do Thane',
  atmosphere: { 
    fogColor: 0x460c18, 
    ambientColor: 0xd8c0d0, 
    fogFar: 140, 
    ambientIntensity: 0.25,
    fogNear: 18 
  },
  doors: [
    { marker: 'D1', targetLevelId: 'level-4', label: 'Salões dos Condenados', bossLocked: true },
    { marker: 'D2', targetLevelId: 'level-6', label: 'Caldeiras de Lava', bossLocked: true },
    {
      marker: 'D3',
      targetLevelId: 'level-5b-secret',
      label: 'Arsenal Final',
      secret: true,
      requires: 'V1',
    },
  ],
  levers: [{ marker: 'V1', label: 'Válvula de emergência' }],
grid: [
    '##############################',  //  0
    '#P....D....X....X..X.........#',  //  1
    '#.....#.#........#.#.........#',  //  2
    '#............................#',  //  3
    '#........#...................#',  //  4
    '#............B......#........#',  //  5
    '#.......###........###......H#',  //  6
    '#..A.....................V...#',  //  7
    '#................###.........#',  //  8
    '#...........#..X...........#.#',  //  9: # at 12 (above D2)
    '#...........D..#...........#.#',  // 10: D2 at 12
    '#X..........#..............#.#',  // 11: # at 12 (below D2)
    '#..H...................#.....#',  // 12
    '#.........D...............X..#',  // 13
    '##############################',  // 14
  ],
}
