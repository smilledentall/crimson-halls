import type { LevelDefinition } from '../LevelLoader'
import { level1 } from './level-1'
import { level1bSecret } from './level-1b-secret'
import { level2 } from './level-2'
import { level2bSecret } from './level-2b-secret'
import { level3 } from './level-3'
import { level3aPath } from './level-3a-path'
import { level3bPath } from './level-3b-path'
import { level3cSecret } from './level-3c-secret'
import { level4 } from './level-4'
import { level4bSecret } from './level-4b-secret'
import { level5 } from './level-5'
import { level5bSecret } from './level-5b-secret'
import { level6 } from './level-6'
import { level7 } from './level-7'
import { level8 } from './level-8'
import { level9 } from './level-9'
import { level10 } from './level-10'
import { level11 } from './level-11'
import { level12 } from './level-12'
import { level13 } from './level-13'
import { level14 } from './level-14'
import { level15 } from './level-15'
import { levelVictory } from './level-victory'

/** Id do nível-sentinela da saída da campanha (porta de vitória). */
export const VICTORY_LEVEL_ID = 'level-victory'

/** Todos os níveis, incluindo salas secretas e ramos alternativos. */
export const ALL_LEVELS: LevelDefinition[] = [
  level1,
  level2,
  level3,
  level4,
  level5,
  level6,
  level7,
  level8,
  level9,
  level10,
  level11,
  level12,
  level13,
  level14,
  level15,
  level1bSecret,
  level2bSecret,
  level3aPath,
  level3bPath,
  level3cSecret,
  level4bSecret,
  level5bSecret,
  levelVictory,
]

/** Campanha principal linear (1→2→3→4→5→6→…→15). */
export const CAMPAIGN_ORDER: string[] = [
  'level-1',
  'level-2',
  'level-3',
  'level-4',
  'level-5',
  'level-6',
  'level-7',
  'level-8',
  'level-9',
  'level-10',
  'level-11',
  'level-12',
  'level-13',
  'level-14',
  'level-15',
]

/** Lookup por id. */
export const LEVELS_BY_ID: Record<string, LevelDefinition> = Object.fromEntries(
  ALL_LEVELS.map(level => [level.id, level]),
)

/** Campanha em ordem (para UI/HUD e migração de save). */
export const LEVELS: LevelDefinition[] = CAMPAIGN_ORDER.map(id => LEVELS_BY_ID[id])