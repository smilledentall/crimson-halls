import { useGameStore } from '../state/gameStore'
import { WEAPONS, WEAPON_ORDER } from '../weapons/weapons.config'
import type { WeaponId } from '../weapons/weapons.config'
import {
  MAX_WEAPON_UPGRADE_LEVEL,
  applyWeaponUpgrades,
  WEAPON_UPGRADE_EFFECTS,
  weaponUpgradeCost,
} from '../weapons/weapon-upgrades'
import { SKILL_ORDER, SKILLS } from '../state/skills.config'
import type { SkillId } from '../state/skills.config'

function weaponEffectsLabel(id: WeaponId, level: number): string {
  const base = WEAPONS[id]
  const next = applyWeaponUpgrades(base, level)
  const parts: string[] = []
  if (next.damage !== base.damage) parts.push(`dano ${base.damage}→${next.damage}`)
  if (Math.abs(next.fireRate - base.fireRate) > 0.001)
    parts.push(`cadência +${Math.round(WEAPON_UPGRADE_EFFECTS.fireRatePerLevel * 100 * level)}%`)
  if (next.spread < base.spread)
    parts.push(`precisão +${Math.round(WEAPON_UPGRADE_EFFECTS.spreadPerLevel * 100 * level)}%`)
  if (next.ammoCapacity > base.ammoCapacity)
    parts.push(`munição ${base.ammoCapacity}→${next.ammoCapacity}`)
  return parts.length > 0 ? parts.join(' · ') : '—'
}

/**
 * Tela de melhorias: gasta núcleos em upgrades de arma e pontos de
 * habilidade em atributos do jogador. Persiste tudo no save.
 */
export function Upgrades() {
  const closeSettings = useGameStore(state => state.closeSettings)
  const currency = useGameStore(state => state.currency)
  const weaponUpgrades = useGameStore(state => state.weaponUpgrades)
  const buyWeaponUpgrade = useGameStore(state => state.buyWeaponUpgrade)
  const skillPoints = useGameStore(state => state.skillPoints)
  const skillUpgrades = useGameStore(state => state.skillUpgrades)
  const buySkillUpgrade = useGameStore(state => state.buySkillUpgrade)

  return (
    <div className="upgrades screen">
      <div className="upgrades-header">
        <h2 className="upgrades-title">MELHORIAS</h2>
        <span className="upgrades-currency">Núcleos: {currency}</span>
        <button className="menu-button" onClick={closeSettings} autoFocus>
          Voltar
        </button>
      </div>

      <div className="upgrades-section">
        <h3>Armas</h3>
        <div className="upgrades-grid">
          {WEAPON_ORDER.map(id => {
            const level = weaponUpgrades[id] ?? 0
            const cost = weaponUpgradeCost(id, level)
            const maxed = cost === null
            const affordable = !maxed && currency >= cost
            return (
              <div
                key={id}
                className={`upgrade-card${maxed ? ' maxed' : ''}${affordable ? ' affordable' : ''}`}
              >
                <div className="upgrade-card-top">
                  <span className="upgrade-name">{WEAPONS[id].name}</span>
                  <span className="upgrade-level">
                    {'●'.repeat(level)}
                    {'○'.repeat(MAX_WEAPON_UPGRADE_LEVEL - level)}
                  </span>
                </div>
                <div className="upgrade-effect">{weaponEffectsLabel(id, level + 1)}</div>
                <button
                  className="menu-button upgrade-buy"
                  disabled={maxed || !affordable}
                  onClick={() => buyWeaponUpgrade(id)}
                >
                  {maxed ? 'MÁXIMO' : `Melhorar — ${cost} núcleos`}
                </button>
                {!maxed && !affordable && (
                  <div className="upgrade-blocked">faltam {cost! - currency} núcleos</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="upgrades-section">
        <h3>
          Atributos do jogador{' '}
          <span className="upgrades-points">Pontos de habilidade: {skillPoints}</span>
        </h3>
        <div className="upgrades-grid">
          {SKILL_ORDER.map(skillId => {
            const definition = SKILLS[skillId]
            const level = skillUpgrades[skillId] ?? 0
            const maxed = level >= definition.maxLevel
            const canBuy = !maxed && skillPoints > 0
            return (
              <div
                key={skillId}
                className={`upgrade-card${maxed ? ' maxed' : ''}${canBuy ? ' affordable' : ''}`}
              >
                <div className="upgrade-card-top">
                  <span className="upgrade-name">{definition.name}</span>
                  <span className="upgrade-level">
                    {'●'.repeat(level)}
                    {'○'.repeat(definition.maxLevel - level)}
                  </span>
                </div>
                <div className="upgrade-effect">{definition.description}</div>
                <button
                  className="menu-button upgrade-buy"
                  disabled={maxed || !canBuy}
                  onClick={() => buySkillUpgrade(skillId as SkillId)}
                >
                  {maxed ? 'MÁXIMO' : 'Gastar 1 ponto'}
                </button>
                {!maxed && !canBuy && (
                  <div className="upgrade-blocked">sem pontos de habilidade</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
