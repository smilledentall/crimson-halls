import { create } from 'zustand'
import { PLAYER_CONFIG } from '../entities/player.config'
import { SHIELD_CONFIG } from '../entities/shield.config'
import type { WeaponId } from '../weapons/weapons.config'
import { WEAPONS, WEAPON_ORDER } from '../weapons/weapons.config'
import { applyWeaponUpgrades, weaponUpgradeCost } from '../weapons/weapon-upgrades'
import { LEVELS_BY_ID } from '../levels/levels'
import type { LevelDefinition, ParsedStair } from '../levels/LevelLoader'
import { clearSave, loadGame, saveGame, saveProgress } from './saveSystem'
import { DIFFICULTIES } from './difficulty.config'
import type { DifficultyId } from './difficulty.config'
import { SKILLS } from './skills.config'
import type { SkillId } from './skills.config'
import { MAX_HEALTH_PER_LEVEL, DAMAGE_REDUCTION_PER_LEVEL } from './progression.config'
import { loadSettings, saveSettings } from './settings'
import { DEFAULT_SETTINGS } from './settings'
import { isTouchDevice } from '../core/device'
import type { GraphicsQuality, HudFontSize, ScreenShakeSetting } from './settings'

export type GamePhase =
  'menu' | 'playing' | 'paused' | 'gameover' | 'victory' | 'editor' | 'settings' | 'upgrade'

export type VolumeKind = 'master' | 'sfx' | 'music'

export interface GameStore {
  phase: GamePhase
  /** Tela para onde "Voltar" das configurações deve retornar. */
  settingsReturnPhase: GamePhase
  levelId: string
  levelName: string
  /** Andar atual do jogador (multi-andar). '' = andar único (legado). */
  floorId: string
  health: number
  kills: number
  currentWeaponId: WeaponId
  ammo: Record<WeaponId, number>
  /** Nível customizado carregado pelo editor (nulo = campanha normal). */
  customLevel: LevelDefinition | null
  difficulty: DifficultyId
  /** Porta próxima do jogador (prompt de interação). Nulo = nenhuma. */
  interactableDoor: {
    label: string
    targetLevelId: string
    locked: boolean
    secret: boolean
    lockReason: 'boss' | 'lever' | 'sector' | null
  } | null
  /** Válvula/alavanca próxima do jogador. Nulo = nenhuma. */
  interactableLever: { label: string; marker: string } | null
  /** Escada próxima do jogador (transição de andar). Nulo = nenhuma. */
  interactableStair: ParsedStair | null
  /** Barra de chefe fixa no topo (nome + vida). Nulo = sem chefe ativo. */
  bossBar: { name: string; ratio: number } | null
  /** Setor limpo (todos os inimigos mortos) — destrava as portas. */
  levelCleared: boolean
  /** Opacidade do overlay de fade (0 = transparente, 1 = preto), dirigido pela engine. */
  fade: number
  /** Texto de abertura do nível atual (nulo = sem intro). */
  levelIntro: { title: string; lines: string[] } | null
  /** Nota de lore próxima (interativa com G). */
  interactableNote: boolean
  /** Modal de nota aberto. */
  noteModal: string | null
  /** Epílogo pós-chefe (texto de encerramento). */
  epilogue: string[] | null
/** True após o chefe ser derrotado (portas liberadas, saída disponível). */
  victoryAvailable: boolean
  /** Incrementado a cada nova corrida (novo jogo/retry) — zera a sessão da engine. */
  runId: number
  /** Estado da lanterna (ligada/desligada) — momento de jogo, não persiste. */
  flashlightEnabled: boolean

  // Escudo temporário.
  isShieldActive: boolean
  shieldTimeRemaining: number
  shieldCooldownRemaining: number

  // Progressão persistente.
  currency: number
  weaponUpgrades: Partial<Record<WeaponId, number>>
  skillPoints: number
  skillUpgrades: Record<string, number>

  // Configurações persistentes.
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
  /** FPS medido pela engine (para dev/HUD). */
  fps: number

  setPhase: (phase: GamePhase) => void
  openSettings: () => void
  openUpgrade: () => void
  closeSettings: () => void
  setVolume: (kind: VolumeKind, value: number) => void
  setDifficulty: (difficulty: DifficultyId) => void
  setInteractableDoor: (
    door: {
      label: string
      targetLevelId: string
      locked: boolean
      secret: boolean
      lockReason: 'boss' | 'lever' | 'sector' | null
    } | null,
  ) => void
  setInteractableLever: (lever: { label: string; marker: string } | null) => void
  setInteractableStair: (stair: ParsedStair | null) => void
  setBossBar: (bar: { name: string; ratio: number } | null) => void
  setLevelCleared: (cleared: boolean) => void
  setLevelIntro: (intro: { title: string; lines: string[] } | null) => void
  dismissLevelIntro: () => void
  setInteractableNote: (active: boolean) => void
  setNoteModal: (text: string | null) => void
  setEpilogue: (lines: string[] | null) => void
  dismissEpilogue: () => void
  setVictoryAvailable: (available: boolean) => void
  setFlashlightState: (enabled: boolean) => void

    // Escudo temporário.
    activateShield: () => void
    updateShieldTimers: (dt: number) => void

  enterDoor: (targetLevelId: string) => void
  setMouseSensitivity: (value: number) => void
  setInvertY: (value: boolean) => void
  setGraphicsQuality: (value: GraphicsQuality) => void
  setBrightness: (value: number) => void
  setScreenShake: (value: ScreenShakeSetting) => void
  setColorblindMode: (value: boolean) => void
  setHudFontSize: (value: HudFontSize) => void
  startGame: () => void
  continueGame: () => void
  retryLevel: () => void
  returnToMenu: () => void
  pause: () => void
  resume: () => void
  damage: (amount: number) => void
  addKill: () => void
  addCurrency: (amount: number) => void
  addSkillPoints: (amount: number) => void
  buyWeaponUpgrade: (weaponId: WeaponId) => void
  buySkillUpgrade: (skillId: SkillId) => void
  completeLevel: () => void
  pickupHealth: (amount: number) => void
  pickupAmmo: (weaponId: WeaponId, amount: number) => void
  /** Recarrega todas as armas de munição finita (as infinitas são ignoradas). */
  pickupAmmoAll: (amount: number) => void
  spendAmmo: (weaponId: WeaponId, amount: number) => void
  equipWeapon: (weaponId: WeaponId) => void
  playCustomLevel: (definition: LevelDefinition) => void
  resetProgress: () => void
}

/** Vida máxima efetiva (base + atributo Vitalidade). */
export function maxHealthFor(skills: Record<string, number>): number {
  return PLAYER_CONFIG.maxHealth + MAX_HEALTH_PER_LEVEL * (skills.maxHealth ?? 0)
}

function effectiveCapacity(
  weaponId: WeaponId,
  upgrades: Partial<Record<WeaponId, number>>,
): number {
  return applyWeaponUpgrades(WEAPONS[weaponId], upgrades[weaponId] ?? 0).ammoCapacity
}

function initialAmmo(upgrades: Partial<Record<WeaponId, number>> = {}): Record<WeaponId, number> {
  const ammo = {} as Record<WeaponId, number>
  for (const id of WEAPON_ORDER) ammo[id] = effectiveCapacity(id, upgrades)
  return ammo
}

/** Persiste as configurações atuais do store no localStorage (fora do save). */
function persistSettings(state: GameStore): void {
  saveSettings({
    mouseSensitivity: state.mouseSensitivity,
    invertY: state.invertY,
    masterVolume: state.masterVolume,
    sfxVolume: state.sfxVolume,
    musicVolume: state.musicVolume,
    graphicsQuality: state.graphicsQuality,
    brightness: state.brightness,
    screenShake: state.screenShake,
    colorblindMode: state.colorblindMode,
    hudFontSize: state.hudFontSize,
  })
}

/** Persiste o progresso (moeda/upgrades/pontos) no save, mantendo o checkpoint. */
function persistProgress(state: GameStore): void {
  saveProgress({
    currency: state.currency,
    weaponUpgrades: state.weaponUpgrades,
    skillPoints: state.skillPoints,
    skillUpgrades: state.skillUpgrades,
  })
}

/**
 * Estado global do jogo via zustand. A engine escreve aqui (ex.: dano),
 * a UI React só lê e dispara ações — nenhuma lógica de jogo nos componentes.
 */
export const useGameStore = create<GameStore>(set => {
  const initialSettings = loadSettings()
  // Em dispositivos touch, forçar qualidade Baixa por padrão (a menos que o
  // jogador já tenha mudado manualmente) — performance é crítica no mobile.
  const touchLowQuality =
    isTouchDevice() && initialSettings.graphicsQuality === DEFAULT_SETTINGS.graphicsQuality
  return {
    phase: 'menu',
    settingsReturnPhase: 'menu',
    levelId: 'level-1',
    levelName: LEVELS_BY_ID['level-1'].name,
    floorId: '',
    health: PLAYER_CONFIG.maxHealth,
    kills: 0,
    currentWeaponId: 'pistol',
    ammo: initialAmmo(),
    customLevel: null,
    difficulty: 'normal',
    interactableDoor: null,
    interactableLever: null,
    interactableStair: null,
    bossBar: null,
    levelCleared: false,
    fade: 0,
    levelIntro: null,
    interactableNote: false,
    noteModal: null,
    epilogue: null,
    victoryAvailable: false,
    runId: 0,
    flashlightEnabled: true,

    // Escudo temporário.
    isShieldActive: false,
    shieldTimeRemaining: 0,
    shieldCooldownRemaining: 0,

    currency: 0,
    weaponUpgrades: {},
    skillPoints: 0,
    skillUpgrades: {},

    mouseSensitivity: initialSettings.mouseSensitivity,
    invertY: initialSettings.invertY,
    masterVolume: initialSettings.masterVolume,
    sfxVolume: initialSettings.sfxVolume,
    musicVolume: initialSettings.musicVolume,
    graphicsQuality: touchLowQuality ? 'low' : initialSettings.graphicsQuality,
    brightness: initialSettings.brightness,
    screenShake: initialSettings.screenShake,
    colorblindMode: initialSettings.colorblindMode,
    hudFontSize: initialSettings.hudFontSize,
    fps: 0,

    setPhase: phase => set({ phase }),

    openSettings: () => set(state => ({ phase: 'settings', settingsReturnPhase: state.phase })),

    openUpgrade: () => set(state => ({ phase: 'upgrade', settingsReturnPhase: state.phase })),

    closeSettings: () => set(state => ({ phase: state.settingsReturnPhase })),

    setVolume: (kind, value) => {
      const clamped = Math.max(0, Math.min(1, value))
      set(state => {
        const next =
          kind === 'master'
            ? { masterVolume: clamped }
            : kind === 'sfx'
              ? { sfxVolume: clamped }
              : { musicVolume: clamped }
        const merged = { ...state, ...next }
        persistSettings(merged as GameStore)
        return next
      })
    },

    setDifficulty: difficulty => set({ difficulty }),

    setMouseSensitivity: value => {
      const clamped = Math.max(0.2, Math.min(2.5, value))
      set(state => {
        const merged = { ...state, mouseSensitivity: clamped }
        persistSettings(merged)
        return { mouseSensitivity: clamped }
      })
    },

    setInvertY: invertY => {
      set(state => {
        const merged = { ...state, invertY }
        persistSettings(merged)
        return { invertY }
      })
    },

    setGraphicsQuality: graphicsQuality => {
      set(state => {
        const merged = { ...state, graphicsQuality }
        persistSettings(merged)
        return { graphicsQuality }
      })
    },

    setBrightness: value => {
      const clamped = Math.max(0.5, Math.min(1.5, value))
      set(state => {
        const merged = { ...state, brightness: clamped }
        persistSettings(merged)
        return { brightness: clamped }
      })
    },

    setScreenShake: screenShake => {
      set(state => {
        const merged = { ...state, screenShake }
        persistSettings(merged)
        return { screenShake }
      })
    },

    setColorblindMode: colorblindMode => {
      set(state => {
        const merged = { ...state, colorblindMode }
        persistSettings(merged)
        return { colorblindMode }
      })
    },

    setHudFontSize: hudFontSize => {
      set(state => {
        const merged = { ...state, hudFontSize }
        persistSettings(merged)
        return { hudFontSize }
      })
    },

    startGame: () => {
      // Novo jogo sobrescreve o save e zera a progressão.
      clearSave()
      set(state => ({
        phase: 'playing',
        levelId: 'level-1',
        levelName: LEVELS_BY_ID['level-1'].name,
        floorId: '',
        health: PLAYER_CONFIG.maxHealth,
        kills: 0,
        currentWeaponId: 'pistol',
        ammo: initialAmmo(),
        customLevel: null,
        currency: 0,
        weaponUpgrades: {},
        skillPoints: 0,
        skillUpgrades: {},
        victoryAvailable: false,
        runId: state.runId + 1,
        flashlightEnabled: true,
      }))
    },

    continueGame: () => {
      const save = loadGame()
      if (!save) return
      const level = LEVELS_BY_ID[save.levelId]
      if (!level) return
      const upgrades = save.weaponUpgrades ?? {}
      set(state => ({
        phase: 'playing',
        levelId: save.levelId,
        levelName: level.name,
        floorId: save.floorId ?? '',
        health: save.health,
        kills: save.kills,
        ammo: { ...initialAmmo(upgrades), ...save.ammo },
        currentWeaponId: 'pistol',
        customLevel: null,
        difficulty: save.difficulty,
        currency: save.currency ?? 0,
        weaponUpgrades: upgrades,
        skillPoints: save.skillPoints ?? 0,
        skillUpgrades: save.skillUpgrades ?? {},
        victoryAvailable: false,
        runId: state.runId + 1,
        flashlightEnabled: true,
      }))
    },

    retryLevel: () =>
      set(state => ({
        phase: 'playing',
        health: maxHealthFor(state.skillUpgrades),
        currentWeaponId: 'pistol',
        flashlightEnabled: true,
      })),

    /** Vitória (nível final). Chamado pela engine após a morte do chefe. */
    completeLevel: () =>
      set(state => {
        if (state.customLevel) return { phase: 'victory' }
        saveGame({
          levelId: state.levelId,
          floorId: state.floorId,
          health: maxHealthFor(state.skillUpgrades),
          ammo: state.ammo,
          kills: state.kills,
          difficulty: state.difficulty,
          currency: state.currency,
          weaponUpgrades: state.weaponUpgrades,
          skillPoints: state.skillPoints,
          skillUpgrades: state.skillUpgrades,
        })
        return { phase: 'victory' }
      }),

    setInteractableDoor: door => set({ interactableDoor: door }),
    setInteractableLever: lever => set({ interactableLever: lever }),
    setInteractableStair: stair => set({ interactableStair: stair }),
    setBossBar: bar => set({ bossBar: bar }),
    setLevelCleared: cleared => set({ levelCleared: cleared }),

    setLevelIntro: intro => set({ levelIntro: intro }),
    dismissLevelIntro: () => set({ levelIntro: null }),
    setInteractableNote: active => set({ interactableNote: active }),
    setNoteModal: text => set({ noteModal: text }),
    setEpilogue: lines => set({ epilogue: lines }),
    dismissEpilogue: () => {
      set({ epilogue: null, victoryAvailable: false })
      useGameStore.getState().completeLevel()
    },
    setVictoryAvailable: available => set({ victoryAvailable: available }),
    setFlashlightState: enabled => set({ flashlightEnabled: enabled }),

    enterDoor: targetLevelId =>
      set(state => {
        const level = LEVELS_BY_ID[targetLevelId]
        if (!level) return state
        // Checkpoint: sai por uma porta → salva o estado no novo nível.
        saveGame({
          levelId: targetLevelId,
          floorId: state.floorId,
          health: state.health,
          ammo: state.ammo,
          kills: state.kills,
          difficulty: state.difficulty,
          currency: state.currency,
          weaponUpgrades: state.weaponUpgrades,
          skillPoints: state.skillPoints,
          skillUpgrades: state.skillUpgrades,
        })
        return {
          phase: 'playing',
          levelId: targetLevelId,
          levelName: level.name,
          customLevel: null,
        }
      }),

    returnToMenu: () => set({ phase: 'menu', customLevel: null }),

    pause: () => set({ phase: 'paused' }),

    resume: () => set({ phase: 'playing' }),

    damage: amount =>
      set(state => {
        const multiplier = DIFFICULTIES[state.difficulty].playerDamageReceived
        const reduction =
          1 - DAMAGE_REDUCTION_PER_LEVEL * (state.skillUpgrades.damageReduction ?? 0)
        // Escudo temporário: multiplicador adicional de redução de dano se ativo.
        // shieldMultiplier = 0.25 significa 75% de redução (toma 25% do dano).
        const shieldMultiplier = state.isShieldActive ? (1 - SHIELD_CONFIG.damageReduction) : 1
        const effectiveMultiplier = Math.max(0.1, reduction * shieldMultiplier)
        const total = amount * multiplier * effectiveMultiplier
        return { health: Math.max(0, state.health - Math.round(total)) }
      }),

    addKill: () => set(state => ({ kills: state.kills + 1 })),

    addCurrency: amount =>
      set(state => {
        const currency = state.currency + Math.max(0, amount)
        persistProgress({ ...state, currency } as GameStore)
        return { currency }
      }),

    addSkillPoints: amount =>
      set(state => {
        const skillPoints = state.skillPoints + Math.max(0, amount)
        persistProgress({ ...state, skillPoints } as GameStore)
        return { skillPoints }
      }),

    buyWeaponUpgrade: weaponId =>
      set(state => {
        const level = state.weaponUpgrades[weaponId] ?? 0
        const cost = weaponUpgradeCost(weaponId, level)
        if (cost === null || state.currency < cost) return state
        const weaponUpgrades = { ...state.weaponUpgrades, [weaponId]: level + 1 }
        persistProgress({ ...state, currency: state.currency - cost, weaponUpgrades } as GameStore)
        return { currency: state.currency - cost, weaponUpgrades }
      }),

    buySkillUpgrade: skillId =>
      set(state => {
        const level = state.skillUpgrades[skillId] ?? 0
        const definition = SKILLS[skillId]
        if (!definition || level >= definition.maxLevel || state.skillPoints <= 0) return state
        const skillUpgrades = { ...state.skillUpgrades, [skillId]: level + 1 }
        persistProgress({
          ...state,
          skillPoints: state.skillPoints - 1,
          skillUpgrades,
        } as GameStore)
        return { skillPoints: state.skillPoints - 1, skillUpgrades }
      }),

    pickupHealth: amount =>
      set(state => ({
        health: Math.min(maxHealthFor(state.skillUpgrades), state.health + amount),
      })),

    pickupAmmo: (weaponId, amount) =>
      set(state => {
        const multiplier = DIFFICULTIES[state.difficulty].pickupAmmoMultiplier
        const granted = Math.max(1, Math.round(amount * multiplier))
        const capacity = effectiveCapacity(weaponId, state.weaponUpgrades)
        const next =
          capacity === 0 ? state.ammo[weaponId] : Math.min(capacity, state.ammo[weaponId] + granted)
        return { ammo: { ...state.ammo, [weaponId]: next } }
      }),

    pickupAmmoAll: amount =>
      set(state => {
        const multiplier = DIFFICULTIES[state.difficulty].pickupAmmoMultiplier
        const granted = Math.max(1, Math.round(amount * multiplier))
        const ammo = { ...state.ammo }
        for (const id of WEAPON_ORDER) {
          const capacity = effectiveCapacity(id, state.weaponUpgrades)
          if (capacity === 0) continue // arma infinita (pistola/motosserra) — nada a recarregar
          ammo[id] = Math.min(capacity, ammo[id] + granted)
        }
        return { ammo }
      }),

    spendAmmo: (weaponId, amount) =>
      set(state => ({
        ammo: { ...state.ammo, [weaponId]: Math.max(0, state.ammo[weaponId] - amount) },
      })),

    equipWeapon: weaponId => set({ currentWeaponId: weaponId }),

    playCustomLevel: definition =>
      set(state => ({
        phase: 'playing',
        customLevel: definition,
        levelId: definition.id,
        levelName: definition.name,
        health: PLAYER_CONFIG.maxHealth,
        kills: 0,
        currentWeaponId: 'pistol',
        ammo: initialAmmo(),
        victoryAvailable: false,
        runId: state.runId + 1,
      })),

    resetProgress: () => {
      clearSave()
      set(state => ({
        phase: 'menu',
        customLevel: null,
        currency: 0,
        weaponUpgrades: {},
        skillPoints: 0,
        skillUpgrades: {},
        victoryAvailable: false,
        runId: state.runId + 1,
      }))
    },

    // Escudo temporário.
    activateShield: () =>
      set(state => {
        // Ignora se já ativo ou em cooldown.
        if (state.isShieldActive || state.shieldCooldownRemaining > 0) return state
        return {
          isShieldActive: true,
          shieldTimeRemaining: SHIELD_CONFIG.duration,
          shieldCooldownRemaining: SHIELD_CONFIG.cooldown,
        }
      }),

    /** Decrementa timers do escudo (chamado a cada frame pela Engine). */
    updateShieldTimers: (dt: number) =>
      set(state => {
        if (!state.isShieldActive && state.shieldCooldownRemaining <= 0) return state
        const next = { ...state }
        if (next.isShieldActive) {
          next.shieldTimeRemaining = Math.max(0, next.shieldTimeRemaining - dt)
          if (next.shieldTimeRemaining <= 0) {
            next.isShieldActive = false
          }
        }
        if (next.shieldCooldownRemaining > 0) {
          next.shieldCooldownRemaining = Math.max(0, next.shieldCooldownRemaining - dt)
        }
        return next
      }),
  }
})
