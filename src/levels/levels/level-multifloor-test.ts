import type { LevelDefinition } from '../LevelLoader'

/**
 * Nível de teste isolado do sistema multi-andar (§9 do plano). Fora da
 * campanha: sem portas, sem ondas, sem save. Dois andares empilhados com o
 * mesmo layout XZ — o térreo tem o spawn (P) e a escada de subida (L); o
 * andar superior tem a escada de descida (l).
 *
 * TESTE TEMPORÁRIO (§8): um inimigo (E = Perseguidor) em cada andar, para
 * validar LOS/perseguição/ataque por andar. Remover após a validação.
 *
 * TESTE TEMPORÁRIO (§12 cressets/notas): 3 tochas (X) no andar superior e
 * uma nota (N) em cada andar, para validar o offset de Y dos cressets, o
 * culling de luz/chama/áudio por andar e o prompt de nota por andar.
 * O térreo NÃO tem tocha (fica escuro de propósito — usar a lanterna, L);
 * a nota do térreo fica perto do spawn para ser encontrável no escuro.
 * Remover após a validação.
 */
export const levelMultiFloorTest: LevelDefinition = {
  id: 'level-multifloor-test',
  name: 'Teste Multi-Andar',
  startFloorId: 'floor-1',
  floors: [
    {
      id: 'floor-1',
      name: 'Térreo',
      height: 0,
      grid: [
        '##############',
        '#P.N........E#',
        '#............#',
        '#...L........#',
        '#............#',
        '#...........D#',
        '##############',
      ],
      doors: [
        { marker: 'D1', targetLevelId: 'level-multifloor-test', label: 'Retorno Térreo' },
      ],
    },
    {
      id: 'floor-2',
      name: 'Andar Superior',
      height: 5,
      grid: [
        '##############',
        '#.X........X.#',
        '#..........E.#',
        '#...l........#',
        '#..X.........#',
        '#.......N.D.D#',
        '##############',
      ],
      doors: [
        { marker: 'D1', targetLevelId: 'level-1', label: 'Saída Andar Superior' },
        { marker: 'D2', targetLevelId: 'level-2', label: 'Boss Lock', bossLocked: true },
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
}