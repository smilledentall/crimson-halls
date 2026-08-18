import { useGameStore } from '../state/gameStore'
import { WEAPONS, WEAPON_ORDER } from '../weapons/weapons.config'
import { CAMPAIGN_ORDER } from '../levels/levels'

function healthColor(health: number): string {
  if (health > 60) return '#2ee07a'
  if (health > 25) return '#ffc24a'
  return '#e2364a'
}

/**
 * HUD: crosshair, vida, munição, abates, nível, slots de armas (1..n) e FPS.
 * Componente puramente reativo — apenas lê o store, nunca roda lógica de jogo.
 */
export function HUD() {
  const health = useGameStore(state => state.health)
  const kills = useGameStore(state => state.kills)
  const currentWeaponId = useGameStore(state => state.currentWeaponId)
  const ammo = useGameStore(state => state.ammo)
  const levelName = useGameStore(state => state.levelName)
  const levelId = useGameStore(state => state.levelId)
  const interactableDoor = useGameStore(state => state.interactableDoor)
  const interactableLever = useGameStore(state => state.interactableLever)
  const interactableNote = useGameStore(state => state.interactableNote)
  const noteModal = useGameStore(state => state.noteModal)
  const bossBar = useGameStore(state => state.bossBar)
  const victoryAvailable = useGameStore(state => state.victoryAvailable)
  const levelCleared = useGameStore(state => state.levelCleared)
  const fps = useGameStore(state => state.fps)
  const colorblindMode = useGameStore(state => state.colorblindMode)
  const hudFontSize = useGameStore(state => state.hudFontSize)
  const flashlightEnabled = useGameStore(state => state.flashlightEnabled)

  const weapon = WEAPONS[currentWeaponId]
  const infiniteAmmo = weapon.ammoCapacity === 0
  const ammoDisplay = infiniteAmmo ? '\u221E' : ammo[currentWeaponId]
  const criticalHealth = health <= 25

  // Progresso da campanha (níveis fora da campanha mostram só o nome).
  const campaignIndex = CAMPAIGN_ORDER.indexOf(levelId)
  const campaignLabel =
    campaignIndex >= 0 ? `Nível ${campaignIndex + 1}/${CAMPAIGN_ORDER.length} — ` : ''

  return (
    <div className={`hud ${hudFontSize}${colorblindMode ? ' colorblind' : ''}`}>
      <div className={`crosshair${colorblindMode ? ' cb' : ''}`} aria-hidden="true" />

      <div className="hud-health">
        <span className="hud-label">VIDA</span>
        <div className={`health-bar${criticalHealth ? ' critical' : ''}`}>
          <div
            className={`health-fill${colorblindMode ? ' striped' : ''}`}
            style={{
              width: `${health}%`,
              background: colorblindMode ? undefined : healthColor(health),
            }}
          />
        </div>
        <span className="hud-value">{health}</span>
      </div>

      <div className="hud-ammo">
        <span className="hud-label">{weapon.name}</span>
        <span className="hud-value ammo-count">{ammoDisplay}</span>
      </div>

      <div className="weapon-slots" aria-hidden="true">
        {WEAPON_ORDER.map((id, index) => {
          const isActive = id === currentWeaponId
          const hasInfiniteAmmo = WEAPONS[id].ammoCapacity === 0
          const ammoLeft = ammo[id]
          const lowAmmo = !hasInfiniteAmmo && ammoLeft <= WEAPONS[id].ammoCapacity * 0.25
          return (
            <div
              key={id}
              className={`weapon-slot${isActive ? ' active' : ''}${lowAmmo ? ' low' : ''}`}
            >
              <span className="slot-key">{index + 1}</span>
              <span className="slot-name">{WEAPONS[id].shortName}</span>
              <span className="slot-ammo">{hasInfiniteAmmo ? '\u221E' : ammoLeft}</span>
            </div>
          )
        })}
      </div>

      <div className="hud-kills">Abates: {kills}</div>
      <div className="hud-fps">FPS: {fps}</div>
      <div className="hud-level">
        {campaignLabel}
        {levelName}
      </div>

      <div className={`flashlight-indicator${flashlightEnabled ? ' on' : ' off'}`}>
        <span className="flashlight-icon">{flashlightEnabled ? '\u{1F4A1}' : '\u{1F635}'}</span>
        Lanterna: {flashlightEnabled ? 'ON' : 'OFF'}
        <span className="flashlight-key">[L]</span>
      </div>

      {levelCleared && <div className="sector-clear-banner">SETOR LIMPO</div>}

      {victoryAvailable && (
        <div className="sector-clear-banner victory-hint">
          O Thane caiu — explore e use a saída para encerrar a missão
        </div>
      )}

      {bossBar && (
        <div className="boss-bar">
          <span className="boss-name">{bossBar.name}</span>
          <div className="boss-health-track">
            <div
              className="boss-health-fill"
              style={{
                width: `${bossBar.ratio * 100}%`,
                background: healthColor(bossBar.ratio * 100),
              }}
            />
          </div>
        </div>
      )}

      {interactableDoor &&
        (interactableDoor.locked ? (
          <div className="door-prompt locked">
            {interactableDoor.lockReason === 'boss'
              ? 'O chefe ainda vive — não há fuga'
              : interactableDoor.lockReason === 'lever'
                ? 'Ative a válvula para abrir'
                : 'Limpe o setor para abrir a porta'}
          </div>
        ) : (
          <div className={`door-prompt${interactableDoor.secret ? ' secret' : ''}`}>
            {interactableDoor.secret
              ? `G — Sala secreta: ${interactableDoor.label}`
              : `G — Entrar em ${interactableDoor.label}`}
          </div>
        ))}

      {interactableLever && (
        <div className="lever-prompt">G — Ativar {interactableLever.label}</div>
      )}

      {interactableNote && !noteModal && <div className="door-prompt">G — Ler nota</div>}
    </div>
  )
}
