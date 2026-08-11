import type { LevelDefinition } from '../LevelLoader'

/**
 * Fase 5 (final da campanha): arena dedicada do chefe "O Thane de Crimson".
 * O boss ('B') SUBSTITUI as antigas ondas — a luta usa pilares de cobertura,
 * e o chefe invoca reforços nas fases 2/3. A porta traseira (D1, bossLocked)
 * fecha atrás do jogador até o chefe morrer; a morte do boss dispara a
 * vitória. A sala secreta (D2) abre com a válvula V1.
 */
export const level5: LevelDefinition = {
  id: 'level-5',
  name: 'Arena do Thane',
  atmosphere: { fogColor: 0x460c18, ambientColor: 0xd0a0b0, fogFar: 120 },
  doors: [
    { marker: 'D1', targetLevelId: 'level-4', label: 'Salões dos Condenados', bossLocked: true },
    {
      marker: 'D2',
      targetLevelId: 'level-5b-secret',
      label: 'Arsenal Final',
      secret: true,
      requires: 'V1',
    },
  ],
  levers: [{ marker: 'V1', label: 'Válvula de emergência' }],
  grid: [
    '##############################',
    '#P....D..............F.......#',
    '#.....###........###.........#',
    '#............................#',
    '#........#...................#',
    '#............B......#........#',
    '#.......###........###......H#',
    '#..A....................V....#',
    '#................###.........#',
    '#............................#',
    '#..............#.............#',
    '#............................#',
    '#..H......D............#.....#',
    '#............................#',
    '##############################',
  ],
}
