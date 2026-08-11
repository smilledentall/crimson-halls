/**
 * Configurações persistentes (separadas do save de progresso).
 * A chave é versionada; "Reiniciar progresso" NÃO apaga estas opções.
 */

export type GraphicsQuality = 'low' | 'medium' | 'high'
export type ScreenShakeSetting = 'off' | 'reduced' | 'full'
export type HudFontSize = 'small' | 'medium' | 'large'

export interface SettingsData {
  mouseSensitivity: number
  invertY: boolean
  masterVolume: number
  sfxVolume: number
  musicVolume: number
  graphicsQuality: GraphicsQuality
  brightness: number
  screenShake: ScreenShakeSetting
  colorblindMode: boolean
  hudFontSize: HudFontSize
}

const SETTINGS_KEY = 'crimson-halls-settings-v1'

export const DEFAULT_SETTINGS: SettingsData = {
  mouseSensitivity: 1,
  invertY: false,
  masterVolume: 0.6,
  sfxVolume: 1,
  musicVolume: 1,
  graphicsQuality: 'high',
  brightness: 1,
  screenShake: 'full',
  colorblindMode: false,
  hudFontSize: 'medium',
}

export function loadSettings(): SettingsData {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<SettingsData>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: SettingsData): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // localStorage indisponível — ignora
  }
}
