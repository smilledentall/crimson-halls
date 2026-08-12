import type { WeaponDefinition, WeaponId } from './weapons.config'

/**
 * Upgrades de arma: multiplicadores aplicados SOBRE os valores base de
 * weapons.config.ts (nunca duplicam a lógica de tiro — só modificam o def).
 */
export const MAX_WEAPON_UPGRADE_LEVEL = 3

/** Custo em núcleos para cada nível (índice = nível atual, 0..2). */
export const WEAPON_UPGRADE_COSTS: Record<WeaponId, number[]> = {
  pistol: [25, 50, 100],
  shotgun: [25, 50, 100],
  rifle: [25, 50, 100],
  rocket: [35, 70, 140],
  chainsaw: [12, 25, 50],
}

/** Bônus por nível de upgrade (conservadores; ajustáveis com playtesting). */
export const WEAPON_UPGRADE_EFFECTS = {
  /** +7% de dano por nível. */
  damagePerLevel: 0.07,
  /** +6% de cadência por nível. */
  fireRatePerLevel: 0.06,
  /** +20% de capacidade de munição por nível (armas com munição finita). */
  capacityPerLevel: 0.2,
  /** -10% de spread por nível (melhora a precisão). */
  spreadPerLevel: 0.1,
}

/** Retorna a definição da arma com os upgrades aplicados (dados derivados). */
export function applyWeaponUpgrades(definition: WeaponDefinition, level: number): WeaponDefinition {
  const lvl = Math.max(0, Math.min(MAX_WEAPON_UPGRADE_LEVEL, level))
  if (lvl === 0) return definition
  const { damagePerLevel, fireRatePerLevel, capacityPerLevel, spreadPerLevel } =
    WEAPON_UPGRADE_EFFECTS
  return {
    ...definition,
    damage: Math.round(definition.damage * (1 + damagePerLevel * lvl)),
    fireRate: definition.fireRate * (1 + fireRatePerLevel * lvl),
    spread: Math.max(0.01, definition.spread * (1 - spreadPerLevel * lvl)),
    ammoCapacity:
      definition.ammoCapacity > 0
        ? Math.round(definition.ammoCapacity * (1 + capacityPerLevel * lvl))
        : 0,
  }
}

/** Custo do próximo nível de upgrade (null = já no máximo). */
export function weaponUpgradeCost(weaponId: WeaponId, currentLevel: number): number | null {
  if (currentLevel >= MAX_WEAPON_UPGRADE_LEVEL) return null
  return WEAPON_UPGRADE_COSTS[weaponId][currentLevel] ?? null
}
