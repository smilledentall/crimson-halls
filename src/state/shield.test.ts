import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useGameStore } from './gameStore'
import { SHIELD_CONFIG } from '../entities/shield.config'

describe('Shield System', () => {
  beforeEach(() => {
    // Reset store to initial state
    useGameStore.setState({
      isShieldActive: false,
      shieldTimeRemaining: 0,
      shieldCooldownRemaining: 0,
      health: 100,
      skillUpgrades: {},
      difficulty: 'normal',
    })
    vi.useFakeTimers()
  })

  it('ativa o escudo quando não está ativo nem em cooldown', () => {
    const { activateShield } = useGameStore.getState()
    activateShield()
    const s = useGameStore.getState()
    expect(s.isShieldActive).toBe(true)
    expect(s.shieldTimeRemaining).toBe(SHIELD_CONFIG.duration)
    expect(s.shieldCooldownRemaining).toBe(SHIELD_CONFIG.cooldown)
  })

  it('ignora ativação se escudo já estiver ativo', () => {
    const { activateShield } = useGameStore.getState()
    activateShield()
    const firstTime = useGameStore.getState().shieldTimeRemaining
    activateShield() // segunda tentativa
    const s = useGameStore.getState()
    expect(s.shieldTimeRemaining).toBe(firstTime) // não resetou
  })

  it('ignora ativação se estiver em cooldown', () => {
    const { activateShield, updateShieldTimers } = useGameStore.getState()
    activateShield()
    updateShieldTimers(SHIELD_CONFIG.duration) // escudo expira
    // agora está em cooldown
    activateShield()
    const s = useGameStore.getState()
    expect(s.isShieldActive).toBe(false) // não ativou
    expect(s.shieldCooldownRemaining).toBeGreaterThan(0)
  })

  it('desativa automaticamente após duração expirar', () => {
    const { activateShield, updateShieldTimers } = useGameStore.getState()
    activateShield()
    expect(useGameStore.getState().isShieldActive).toBe(true)
    updateShieldTimers(SHIELD_CONFIG.duration)
    const s = useGameStore.getState()
    expect(s.isShieldActive).toBe(false)
    expect(s.shieldTimeRemaining).toBe(0)
  })

  it('reduz dano quando escudo ativo', () => {
    const { activateShield, damage } = useGameStore.getState()
    activateShield()
    const initialHealth = 100
    const baseDamage = 50
    // damage usa DIFFICULTIES.normal.playerDamageReceived = 1.0
    // e DAMAGE_REDUCTION_PER_LEVEL = 0.05 (skill 0)
    // shield reduction = 0.75
    // effectiveReduction = 0.75 (sem skills)
    // total = 50 * 1.0 * 0.25 = 12.5 -> 13 rounded
    damage(baseDamage)
    const s = useGameStore.getState()
    expect(s.health).toBe(initialHealth - 13) // 87
  })

  it('não reduz dano além do normal quando escudo inativo', () => {
    const { damage } = useGameStore.getState()
    const baseDamage = 50
    // sem skills, sem escudo: reduction = 0 -> effectiveReduction = 1 (min 0.1)
    damage(baseDamage)
    const s = useGameStore.getState()
    expect(s.health).toBe(50) // 100 - 50
  })

  it('cooldown decrementa e permite reativação após expirar', () => {
    const { activateShield, updateShieldTimers } = useGameStore.getState()
    activateShield()
    updateShieldTimers(SHIELD_CONFIG.duration) // escudo expira
    // agora em cooldown: cooldown roda junto com a duração
    // após 5s de duração, cooldown tem 25-5=20s restantes
    expect(useGameStore.getState().shieldCooldownRemaining).toBe(SHIELD_CONFIG.cooldown - SHIELD_CONFIG.duration)
    // avança o cooldown restante
    updateShieldTimers(SHIELD_CONFIG.cooldown - SHIELD_CONFIG.duration)
    const s = useGameStore.getState()
    expect(s.shieldCooldownRemaining).toBe(0)
    // agora pode ativar de novo
    useGameStore.getState().activateShield()
    expect(useGameStore.getState().isShieldActive).toBe(true)
  })
})