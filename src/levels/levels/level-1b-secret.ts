import type { LevelDefinition } from '../LevelLoader'

/**
 * Sala secreta do nível 1: porta escondida num corredor secundário.
 * Recompensa: vida e munição, com um pequeno desafio.
 */
export const level1bSecret: LevelDefinition = {
  id: 'level-1b-secret',
  name: 'Depósito Abandonado',
  grid: [
    '############',
    '#P........D#',
    '#XH........#',
    '#....K..N.A#',
    '#..E...C..H#',
    '#X.........#',
    '#....E....X#',
    '############',
  ],
  doors: [{ marker: 'D1', targetLevelId: 'level-1', label: 'Hall de Entrada' }],
}
