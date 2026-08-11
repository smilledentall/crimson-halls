import type { LevelDefinition } from '../LevelLoader'

/**
 * Fase 2: corredores bifurcados — faixas de parede com portas criam
 * caminhos alternativos em zigue-zague e uma arena ampla no meio.
 * 5 perseguidores ('E') + 2 atiradores ('S'), vida e munição.
 * Grid validado por flood-fill (todos os marcadores são alcançáveis).
 */
export const level2: LevelDefinition = {
  id: 'level-2',
  name: 'Corredores de Crimson',
  atmosphere: { fogColor: 0x2a0f14 },
  doors: [
    { marker: 'D1', targetLevelId: 'level-3', label: 'Profundezas de Crimson' },
    {
      marker: 'D2',
      targetLevelId: 'level-2b-secret',
      label: 'Passagem Secreta',
      secret: true,
    },
  ],
  grid: [
    '##########################',
    '#........................#',
    '#.PF..E...A...S...F......#',
    '#...........H......D.....#',
    '#.##.###########.#######.#',
    '#.................#......#',
    '#..E...F.A.#S.#F.H...E...#',
    '#............#...........#',
    '#.#######.##########.###.#',
    '#........................#',
    '#..AE.F......H.....FED...#',
    '#........................#',
    '#.#.##########.#######.#.#',
    '#........................#',
  ],
}
