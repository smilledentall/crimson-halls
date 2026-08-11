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

/** Todos os níveis, incluindo salas secretas e ramos alternativos. */
export const ALL_LEVELS: LevelDefinition[] = [
  level1,
  level2,
  level3,
  level4,
  level5,
  level1bSecret,
  level2bSecret,
  level3aPath,
  level3bPath,
  level3cSecret,
  level4bSecret,
  level5bSecret,
]

/** Campanha principal linear (1→2→3→4→5). */
export const CAMPAIGN_ORDER: string[] = ['level-1', 'level-2', 'level-3', 'level-4', 'level-5']

/** Lookup por id. */
export const LEVELS_BY_ID: Record<string, LevelDefinition> = Object.fromEntries(
  ALL_LEVELS.map(level => [level.id, level]),
)

/** Campanha em ordem (para UI/HUD e migração de save). */
export const LEVELS: LevelDefinition[] = CAMPAIGN_ORDER.map(id => LEVELS_BY_ID[id])
