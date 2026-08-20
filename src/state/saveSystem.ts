import type { WeaponId } from '../weapons/weapons.config'
import { CAMPAIGN_ORDER, LEVELS_BY_ID } from '../levels/levels'
import { isValidDifficulty } from './difficulty.config'
import type { DifficultyId } from './difficulty.config'

export const SAVE_VERSION = 4
const SAVE_KEY = 'crimson-halls-save-v1'

export interface SaveData {
  version: number
  levelId: string
  /** Andar do checkpoint (multi-andar). Ausente/omisso = nível legado (andar único). */
  floorId?: string
  health: number
  ammo: Record<WeaponId, number>
  kills: number
  difficulty: DifficultyId
  /** Núcleos (moeda de progressão). */
  currency: number
  /** Nível de upgrade comprado por arma (0..MAX). */
  weaponUpgrades: Partial<Record<WeaponId, number>>
  /** Pontos de habilidade não gastos. */
  skillPoints: number
  /** Nível comprado por atributo. */
  skillUpgrades: Record<string, number>
}

/** Persiste um checkpoint completo (nível, vida, progressão...). */
export function saveGame(data: Omit<SaveData, 'version'>): void {
  // floorId vazio (andar único) é omitido do save — compat com níveis legados.
  const { floorId, ...rest } = data
  const payload: SaveData = {
    version: SAVE_VERSION,
    ...rest,
    ...(floorId ? { floorId } : {}),
  }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
  } catch {
    // localStorage indisponível (modo privado, quota) — ignora silenciosamente.
  }
}

/**
 * Atualiza apenas o progresso (núcleos, upgrades, pontos) no save, mantendo
 * o checkpoint (nível/vida) intacto. Chamado sempre que o jogador ganha/gasta
 * progresso — assim moeda ganha no meio de um nível sobrevive a sair/continuar.
 */
export function saveProgress(
  progress: Pick<SaveData, 'currency' | 'weaponUpgrades' | 'skillPoints' | 'skillUpgrades'>,
): void {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    const current = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...current, ...progress }))
  } catch {
    // ignora
  }
}

/** Núcleos/upgrades/pontos padrão para migração de saves antigos. */
function defaultProgression() {
  return {
    currency: 0,
    weaponUpgrades: {} as Partial<Record<WeaponId, number>>,
    skillPoints: 0,
    skillUpgrades: {},
  }
}

function normalizeDifficulty(value: unknown): DifficultyId {
  return isValidDifficulty(value) ? (value as DifficultyId) : 'normal'
}

/**
 * Carrega o checkpoint. Aceita saves antigos (versão 1 com `levelIndex`,
 * versão 2 com `levelId`) migrando para o modelo atual, com progressão default.
 */
export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as SaveData & { levelIndex?: number }

    if (data.version === 1 || data.version === 2) {
      const levelId =
        data.version === 1
          ? (CAMPAIGN_ORDER[typeof data.levelIndex === 'number' ? data.levelIndex : 0] ??
            CAMPAIGN_ORDER[0])
          : (data.levelId ?? CAMPAIGN_ORDER[0])
      const ammo = (data.ammo as Record<WeaponId, number>) ?? ({} as Record<WeaponId, number>)
      return {
        version: SAVE_VERSION,
        levelId,
        health: typeof data.health === 'number' ? data.health : 100,
        ammo,
        kills: typeof data.kills === 'number' ? data.kills : 0,
        difficulty: normalizeDifficulty(data.difficulty),
        ...defaultProgression(),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        ...(data.weaponUpgrades ? { weaponUpgrades: data.weaponUpgrades } : {}),
        ...(data.skillPoints !== undefined ? { skillPoints: data.skillPoints } : {}),
        ...(data.skillUpgrades ? { skillUpgrades: data.skillUpgrades } : {}),
      }
    }

    // v3 = mesma estrutura, sem floorId (campo opcional ausente → migração não
    // destrutiva: continuaGame usa o andar padrão do nível). v4 = formato atual.
    if (data.version === 3 || data.version === SAVE_VERSION) {
      if (!LEVELS_BY_ID[data.levelId]) return null
      return {
        version: SAVE_VERSION,
        levelId: data.levelId,
        floorId: data.version === SAVE_VERSION ? data.floorId : undefined,
        health: data.health,
        ammo: data.ammo,
        kills: data.kills,
        difficulty: normalizeDifficulty(data.difficulty),
        currency: data.currency ?? 0,
        weaponUpgrades: data.weaponUpgrades ?? {},
        skillPoints: data.skillPoints ?? 0,
        skillUpgrades: data.skillUpgrades ?? {},
      }
    }

    return null
  } catch {
    return null
  }
}

export function hasSave(): boolean {
  return loadGame() !== null
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // ignora
  }
}
