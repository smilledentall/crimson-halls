import type { LevelDefinition } from '../LevelLoader'

/**
 * Nível-sentinela da saída da campanha. Não é jogável: a porta do nível 5 que
 * aponta para ele é interceptada pela engine, que dispara o epílogo e a vitória.
 * Existe apenas para que a porta de saída tenha um alvo válido no grafo.
 */
export const levelVictory: LevelDefinition = {
  id: 'level-victory',
  name: 'Saída da Campanha',
  grid: ['###', '#P#', '###'],
}
