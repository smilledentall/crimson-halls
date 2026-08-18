import type { LevelDefinition } from '../LevelLoader'

/**
 * Sala secreta do nível 4, atrás de um caminho não óbvio. Mini-desafio
 * (atirador + kamikaze + tanque) com munição de foguete como recompensa.
 */
export const level4bSecret: LevelDefinition = {
  id: 'level-4b-secret',
  name: 'Arsenal Esquecido',
grid: [
    '##############',
    '#P...H....E.D#',
    '#XK..........#',
    '#....S.......#',
    '#........A..X#',
    '#..A....C....#',
    '#X..N.......T#',
    '##############',
  ],
  doors: [{ marker: 'D1', targetLevelId: 'level-4', label: 'Salões dos Condenados' }],
}
