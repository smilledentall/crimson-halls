import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings'

describe('settings', () => {
  it('carrega defaults quando não há nada salvo', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('persiste e carrega configurações modificadas', () => {
    const custom = { ...DEFAULT_SETTINGS, mouseSensitivity: 1.7, invertY: true, brightness: 1.2 }
    saveSettings(custom)
    const loaded = loadSettings()
    expect(loaded.mouseSensitivity).toBe(1.7)
    expect(loaded.invertY).toBe(true)
    expect(loaded.brightness).toBe(1.2)
  })

  it('mescla valores parciais com os defaults', () => {
    localStorage.setItem('crimson-halls-settings-v1', JSON.stringify({ hudFontSize: 'large' }))
    const loaded = loadSettings()
    expect(loaded.hudFontSize).toBe('large')
    expect(loaded.mouseSensitivity).toBe(DEFAULT_SETTINGS.mouseSensitivity)
  })

  it('ignora dados corrompidos', () => {
    localStorage.setItem('crimson-halls-settings-v1', '###')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
})
