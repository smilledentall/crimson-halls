import { useGameStore } from '../state/gameStore'
import type { GraphicsQuality, HudFontSize, ScreenShakeSetting } from '../state/settings'

function Segmented<T extends string>(props: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className="segmented">
      {props.options.map(option => (
        <button
          key={option.value}
          className={`segmented-button${props.value === option.value ? ' active' : ''}`}
          onClick={() => props.onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Tela de configurações: sensibilidade, eixo Y, volumes, qualidade gráfica,
 * brilho e acessibilidade. Tudo persiste em localStorage separado do save.
 */
export function Settings() {
  const closeSettings = useGameStore(state => state.closeSettings)
  const mouseSensitivity = useGameStore(state => state.mouseSensitivity)
  const setMouseSensitivity = useGameStore(state => state.setMouseSensitivity)
  const invertY = useGameStore(state => state.invertY)
  const setInvertY = useGameStore(state => state.setInvertY)
  const masterVolume = useGameStore(state => state.masterVolume)
  const sfxVolume = useGameStore(state => state.sfxVolume)
  const musicVolume = useGameStore(state => state.musicVolume)
  const setVolume = useGameStore(state => state.setVolume)
  const graphicsQuality = useGameStore(state => state.graphicsQuality)
  const setGraphicsQuality = useGameStore(state => state.setGraphicsQuality)
  const brightness = useGameStore(state => state.brightness)
  const setBrightness = useGameStore(state => state.setBrightness)
  const screenShake = useGameStore(state => state.screenShake)
  const setScreenShake = useGameStore(state => state.setScreenShake)
  const colorblindMode = useGameStore(state => state.colorblindMode)
  const setColorblindMode = useGameStore(state => state.setColorblindMode)
  const hudFontSize = useGameStore(state => state.hudFontSize)
  const setHudFontSize = useGameStore(state => state.setHudFontSize)

  const volumeRows: Array<{ kind: 'master' | 'sfx' | 'music'; label: string; value: number }> = [
    { kind: 'master', label: 'Mestre', value: masterVolume },
    { kind: 'sfx', label: 'Efeitos', value: sfxVolume },
    { kind: 'music', label: 'Música', value: musicVolume },
  ]

  return (
    <div className="settings screen">
      <div className="settings-header">
        <h2 className="settings-title">CONFIGURAÇÕES</h2>
        <button className="menu-button" onClick={closeSettings} autoFocus>
          Voltar
        </button>
      </div>

      <div className="settings-grid">
        <section className="settings-section">
          <h3>Controles</h3>
          <label className="settings-row">
            <span>Sensibilidade do mouse</span>
            <input
              type="range"
              min={0.2}
              max={2.5}
              step={0.05}
              value={mouseSensitivity}
              onChange={event => setMouseSensitivity(Number(event.target.value))}
            />
            <span className="settings-value">{mouseSensitivity.toFixed(2)}x</span>
          </label>
          <label className="settings-row settings-check">
            <span>Inverter eixo Y</span>
            <input
              type="checkbox"
              checked={invertY}
              onChange={event => setInvertY(event.target.checked)}
            />
          </label>
        </section>

        <section className="settings-section">
          <h3>Áudio</h3>
          {volumeRows.map(row => (
            <label key={row.kind} className="settings-row">
              <span>Volume {row.label}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={row.value}
                onChange={event => setVolume(row.kind, Number(event.target.value))}
              />
              <span className="settings-value">{Math.round(row.value * 100)}%</span>
            </label>
          ))}
        </section>

        <section className="settings-section">
          <h3>Vídeo</h3>
          <div className="settings-row">
            <span>Qualidade gráfica</span>
            <Segmented<GraphicsQuality>
              value={graphicsQuality}
              onChange={setGraphicsQuality}
              options={[
                { value: 'low', label: 'Baixa' },
                { value: 'medium', label: 'Média' },
                { value: 'high', label: 'Alta' },
              ]}
            />
          </div>
          <label className="settings-row">
            <span>Brilho / gama</span>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={brightness}
              onChange={event => setBrightness(Number(event.target.value))}
            />
            <span className="settings-value">{Math.round(brightness * 100)}%</span>
          </label>
        </section>

        <section className="settings-section">
          <h3>Acessibilidade</h3>
          <div className="settings-row">
            <span>Screen shake</span>
            <Segmented<ScreenShakeSetting>
              value={screenShake}
              onChange={setScreenShake}
              options={[
                { value: 'off', label: 'Desligado' },
                { value: 'reduced', label: 'Reduzido' },
                { value: 'full', label: 'Completo' },
              ]}
            />
          </div>
          <label className="settings-row settings-check">
            <span>Modo daltônico (crosshair/indicadores com contraste)</span>
            <input
              type="checkbox"
              checked={colorblindMode}
              onChange={event => setColorblindMode(event.target.checked)}
            />
          </label>
          <div className="settings-row">
            <span>Tamanho da fonte do HUD</span>
            <Segmented<HudFontSize>
              value={hudFontSize}
              onChange={setHudFontSize}
              options={[
                { value: 'small', label: 'Pequeno' },
                { value: 'medium', label: 'Médio' },
                { value: 'large', label: 'Grande' },
              ]}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
