import type { LevelDefinition } from '../LevelLoader'

/**
 * Sala secreta do nível 5 (arena final), destravada por uma válvula ('V1')
 * na própria arena. Um bônus de vida e munição antes da última onda.
 */
export const level5bSecret: LevelDefinition = {
  id: 'level-5b-secret',
  name: 'Arsenal Final',
  grid: [
    '############',
    '#P........D#',
    '#...H....A.#',
    '#....N.....#',
    '#.A....C.H.#',
    '#..........#',
    '#..........#',
    '############',
  ],
  doors: [{ marker: 'D1', targetLevelId: 'level-5', label: 'Arena Final de Crimson' }],
}
