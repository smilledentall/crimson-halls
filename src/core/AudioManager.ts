import * as THREE from 'three'

/**
 * Camada de áudio via Web Audio API.
 *
 * Sons são registrados por nome: AudioManager.play('pistol'). Se houver um
 * arquivo real em src/assets/sounds/<nome>.wav, ele é carregado e usado;
 * caso contrário, um gerador procedural (placeholder) assume — basta soltar
 * os .wav na pasta para substituir sem tocar em quem chama.
 *
 * Suporta também áudio posicional (PannerNode) para sons de inimigos e
 * música em duas "camadas" (exploração/combate) com crossfade suave.
 */

export type SfxName =
  | 'pistol'
  | 'shotgun'
  | 'rifle'
  | 'rocket'
  | 'chainsaw'
  | 'explosion'
  | 'player_hurt'
  | 'enemy_hit'
  | 'enemy_death'
  | 'enemy_shoot'
  | 'pickup'
  | 'empty_click'
  | 'step'
  | 'door'
  | 'sector_clear'
  | 'lever'
  | 'boss_roar'

const SFX_NAMES: SfxName[] = [
  'pistol',
  'shotgun',
  'rifle',
  'rocket',
  'chainsaw',
  'explosion',
  'player_hurt',
  'enemy_hit',
  'enemy_death',
  'enemy_shoot',
  'pickup',
  'empty_click',
  'step',
  'door',
  'sector_clear',
  'lever',
  'boss_roar',
]

const MUSIC_BASE_GAIN = 0.11

// Arquivos reais (opcionais): carregados do diretório de assets no build.
const soundUrls = import.meta.glob('../assets/sounds/*.wav', { query: '?url', import: 'default' })

export class AudioManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private musicMasterGain: GainNode | null = null
  private musicExploreGain: GainNode | null = null
  private musicCombatGain: GainNode | null = null
  private musicNodes: OscillatorNode[] = []
  private noiseBuffer: AudioBuffer | null = null
  private loadedBuffers = new Map<SfxName, AudioBuffer>()
  private preloadStarted = false
  private musicStarted = false

  private masterVolume = 0.6
  private sfxVolume = 1
  private musicVolume = 1

  /** Cria/retoma o AudioContext — deve ser chamado a partir de um gesto do usuário. */
  resume(): void {
    if (!this.ctx) {
      this.init()
      this.startPreload()
    }
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume()
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend()
  }

  setMasterVolume(value: number): void {
    this.masterVolume = value
    if (this.masterGain) this.masterGain.gain.value = value
  }

  setSfxVolume(value: number): void {
    this.sfxVolume = value
    if (this.sfxGain) this.sfxGain.gain.value = value
  }

  setMusicVolume(value: number): void {
    this.musicVolume = value
    if (this.musicMasterGain) this.musicMasterGain.gain.value = value
  }

  /** Atualiza a posição do ouvinte (jogador) para o áudio posicional. */
  updateListener(position: THREE.Vector3): void {
    if (!this.ctx) return
    this.ctx.listener.positionX.value = position.x
    this.ctx.listener.positionY.value = position.y
    this.ctx.listener.positionZ.value = position.z
  }

  /** Toca um efeito (não posicional). */
  play(name: SfxName): void {
    if (!this.ctx || !this.sfxGain) return
    const buffer = this.loadedBuffers.get(name)
    if (buffer) {
      this.playBuffer(buffer, this.sfxGain)
      return
    }
    this.sfx[name]?.(this.sfxGain)
  }

  /** Toca um efeito posicionado no mundo — volume varia com a distância. */
  playPositional(name: SfxName, position: THREE.Vector3): void {
    if (!this.ctx || !this.sfxGain) return
    const panner = this.ctx.createPanner()
    panner.panningModel = 'equalpower'
    panner.distanceModel = 'inverse'
    panner.refDistance = 8
    panner.maxDistance = 60
    panner.rolloffFactor = 1.2
    panner.positionX.value = position.x
    panner.positionY.value = position.y
    panner.positionZ.value = position.z
    panner.connect(this.sfxGain)

    const buffer = this.loadedBuffers.get(name)
    if (buffer) {
      this.playBuffer(buffer, panner)
      return
    }
    this.sfx[name]?.(panner)
  }

  /** Música ambiente em duas camadas (exploração/combate) com crossfade. */
  startMusic(): void {
    if (!this.ctx || !this.masterGain || this.musicStarted) return
    this.musicStarted = true

    this.musicMasterGain = this.ctx.createGain()
    this.musicMasterGain.gain.value = this.musicVolume
    this.musicMasterGain.connect(this.masterGain)

    this.musicExploreGain = this.ctx.createGain()
    this.musicExploreGain.gain.value = MUSIC_BASE_GAIN
    this.musicExploreGain.connect(this.musicMasterGain)

    this.musicCombatGain = this.ctx.createGain()
    this.musicCombatGain.gain.value = 0
    this.musicCombatGain.connect(this.musicMasterGain)

    // Camada de exploração: drone grave e calmo.
    for (const frequency of [55, 55.7, 110.3]) {
      const osc = this.ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = frequency
      osc.connect(this.musicExploreGain)
      osc.start()
      this.musicNodes.push(osc)
    }
    // Camada de combate: tons dissonantes, mais presentes.
    for (const frequency of [110, 117, 165.5]) {
      const osc = this.ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = frequency
      osc.connect(this.musicCombatGain)
      osc.start()
      this.musicNodes.push(osc)
    }

    const lfo = this.ctx.createOscillator()
    lfo.frequency.value = 0.08
    const lfoGain = this.ctx.createGain()
    lfoGain.gain.value = 0.02
    lfo.connect(lfoGain).connect(this.musicExploreGain.gain)
    lfo.start()
    this.musicNodes.push(lfo)
  }

  /** 0 = exploração pura, 1 = combate total. Crossfade suave via setTargetAtTime. */
  setCombatIntensity(intensity: number): void {
    if (!this.ctx || !this.musicExploreGain || !this.musicCombatGain) return
    const target = Math.max(0, Math.min(1, intensity))
    const now = this.ctx.currentTime
    this.musicExploreGain.gain.setTargetAtTime(MUSIC_BASE_GAIN * (1 - target), now, 0.5)
    this.musicCombatGain.gain.setTargetAtTime(MUSIC_BASE_GAIN * target, now, 0.5)
  }

  stopMusic(): void {
    for (const node of this.musicNodes) node.stop()
    this.musicNodes = []
    this.musicExploreGain?.disconnect()
    this.musicCombatGain?.disconnect()
    this.musicMasterGain?.disconnect()
    this.musicExploreGain = null
    this.musicCombatGain = null
    this.musicMasterGain = null
    this.musicStarted = false
  }

  private init(): void {
    this.ctx = new AudioContext()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = this.masterVolume
    this.masterGain.connect(this.ctx.destination)
    this.sfxGain = this.ctx.createGain()
    this.sfxGain.gain.value = this.sfxVolume
    this.sfxGain.connect(this.masterGain)
    this.noiseBuffer = this.createNoiseBuffer(this.ctx)
  }

  /** Carrega os .wav reais da pasta assets/sounds (se existirem). */
  private startPreload(): void {
    if (this.preloadStarted) return
    this.preloadStarted = true
    void this.preload()
  }

  private async preload(): Promise<void> {
    const ctx = this.ctx
    if (!ctx) return
    for (const name of SFX_NAMES) {
      const loader = soundUrls[`../assets/sounds/${name}.wav`]
      if (!loader) continue
      try {
        const url = await loader()
        const response = await fetch(url)
        if (!response.ok) continue
        const arrayBuffer = await response.arrayBuffer()
        const buffer = await ctx.decodeAudioData(arrayBuffer)
        this.loadedBuffers.set(name, buffer)
      } catch {
        // arquivo ausente/corrompido → mantém o gerador procedural
      }
    }
  }

  private playBuffer(buffer: AudioBuffer, destination: AudioNode): void {
    if (!this.ctx) return
    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    source.connect(destination)
    source.start()
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = ctx.sampleRate
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    return buffer
  }

  private playNoiseBurst(
    duration: number,
    volume: number,
    filterFreq: number,
    dest: AudioNode,
  ): void {
    if (!this.ctx || !this.noiseBuffer) return
    const source = this.ctx.createBufferSource()
    source.buffer = this.noiseBuffer
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = filterFreq
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(volume, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration)
    source.connect(filter).connect(gain).connect(dest)
    source.start()
    source.stop(this.ctx.currentTime + duration)
  }

  private playTone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    dest: AudioNode,
    slideTo?: number,
  ): void {
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime)
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, slideTo),
        this.ctx.currentTime + duration,
      )
    }
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(volume, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration)
    osc.connect(gain).connect(dest)
    osc.start()
    osc.stop(this.ctx.currentTime + duration)
  }

  /** Registro de efeitos: um gerador por nome (fallback procedural). */
  private readonly sfx: Record<SfxName, (dest: AudioNode) => void> = {
    pistol: dest => {
      this.playNoiseBurst(0.18, 0.7, 2200, dest)
      this.playTone(180, 0.12, 0.4, 'square', dest, 60)
    },
    shotgun: dest => {
      this.playNoiseBurst(0.35, 0.9, 1200, dest)
      this.playTone(120, 0.25, 0.5, 'sawtooth', dest, 40)
    },
    rifle: dest => {
      this.playNoiseBurst(0.12, 0.4, 3000, dest)
      this.playTone(240, 0.08, 0.25, 'square', dest, 90)
    },
    rocket: dest => {
      this.playNoiseBurst(0.25, 0.8, 1500, dest)
      this.playTone(140, 0.2, 0.5, 'sawtooth', dest, 40)
    },
    chainsaw: dest => {
      this.playTone(200, 0.08, 0.3, 'sawtooth', dest)
      this.playTone(330, 0.08, 0.2, 'square', dest)
    },
    explosion: dest => {
      this.playNoiseBurst(0.5, 1, 700, dest)
      this.playTone(90, 0.45, 0.6, 'sine', dest, 35)
    },
    player_hurt: dest => this.playTone(160, 0.25, 0.35, 'sawtooth', dest, 80),
    enemy_hit: dest => this.playNoiseBurst(0.06, 0.4, 2500, dest),
    enemy_death: dest => {
      this.playNoiseBurst(0.2, 0.3, 1400, dest)
      this.playTone(300, 0.4, 0.3, 'sawtooth', dest, 60)
    },
    enemy_shoot: dest => this.playNoiseBurst(0.15, 0.3, 1800, dest),
    pickup: dest => {
      this.playTone(440, 0.12, 0.2, 'square', dest)
      this.playTone(660, 0.14, 0.2, 'square', dest)
    },
    empty_click: dest => this.playTone(200, 0.05, 0.15, 'square', dest),
    step: dest => this.playTone(90, 0.06, 0.12, 'sine', dest),
    door: dest => {
      this.playNoiseBurst(0.25, 0.4, 900, dest)
      this.playTone(160, 0.3, 0.25, 'sine', dest, 80)
    },
    sector_clear: dest => {
      this.playTone(523, 0.12, 0.2, 'square', dest)
      this.playTone(659, 0.14, 0.2, 'square', dest)
      this.playTone(784, 0.2, 0.22, 'square', dest)
    },
    lever: dest => {
      this.playNoiseBurst(0.15, 0.3, 1200, dest)
      this.playTone(400, 0.2, 0.3, 'sine', dest, 200)
      this.playTone(500, 0.15, 0.2, 'square', dest, 300)
    },
    boss_roar: dest => {
      this.playNoiseBurst(0.6, 0.8, 500, dest)
      this.playTone(90, 0.6, 0.5, 'sawtooth', dest, 45)
      this.playTone(120, 0.5, 0.3, 'square', dest, 60)
    },
  }
}
