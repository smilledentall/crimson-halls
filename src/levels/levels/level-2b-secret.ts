import type { LevelDefinition } from '../LevelLoader'

/**
 * Sala secreta acessível pelo nível 2 (porta secundária 'D2').
 * Um mini-desafio: poucos inimigos, um tanque e pickups valiosos.
 * A porta 'D1' leva de volta ao nível 2.
 */
export const level2bSecret: LevelDefinition = {
  id: 'level-2b-secret',
  name: 'Passagem Secreta',
  grid: [
    '##############',
    '#P..........D#',
    '#.E........E.#',
    '#X...........#',
    '#...K........#',
    '#....C...N...#',
    '#.H........A.#',
    '#...........X#',
    '#X..........T#',
    '#............#',
    '##############',
  ],
  doors: [{ marker: 'D1', targetLevelId: 'level-2', label: 'Corredores de Crimson' }],
}
