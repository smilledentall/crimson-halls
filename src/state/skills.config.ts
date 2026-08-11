/**
 * Atributos gerais do jogador, comprados com pontos de habilidade
 * (ganhos por limpar níveis — separados da moeda de upgrades de arma).
 */
export type SkillId = 'maxHealth' | 'speed' | 'damageReduction' | 'regen'

export interface SkillDef {
  id: SkillId
  name: string
  description: string
  maxLevel: number
}

export const SKILLS: Record<SkillId, SkillDef> = {
  maxHealth: {
    id: 'maxHealth',
    name: 'Vitalidade',
    description: '+10 de vida máxima por nível',
    maxLevel: 3,
  },
  speed: {
    id: 'speed',
    name: 'Agilidade',
    description: '+4% de velocidade por nível',
    maxLevel: 3,
  },
  damageReduction: {
    id: 'damageReduction',
    name: 'Couraça',
    description: '-5% de dano recebido por nível',
    maxLevel: 3,
  },
  regen: {
    id: 'regen',
    name: 'Regeneração',
    description: 'Recupera 1 de vida a cada 2s por nível',
    maxLevel: 3,
  },
}

export const SKILL_ORDER: SkillId[] = ['maxHealth', 'speed', 'damageReduction', 'regen']
