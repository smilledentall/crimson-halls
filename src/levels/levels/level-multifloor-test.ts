import type { LevelDefinition } from '../LevelLoader'

/**
 * Nível de teste isolado do sistema multi-andar (§9 do plano). Fora da
 * campanha: sem inimigos, sem portas, sem ondas, sem save. Dois andares
 * empilhados com o mesmo layout XZ — o térreo tem o spawn (P) e a escada de
 * subida (L); o andar superior tem a escada de descida (l).
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
        '#P...........#',
        '#............#',
        '#...L........#',
        '#............#',
        '#............#',
        '##############',
      ],
    },
    {
      id: 'floor-2',
      name: 'Andar Superior',
      height: 5,
      grid: [
        '##############',
        '#............#',
        '#............#',
        '#...l........#',
        '#............#',
        '#............#',
        '##############',
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