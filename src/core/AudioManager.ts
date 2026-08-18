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
  | 'flashlight_click'
  | 'boss_roar'
  | 'fireplace'
  | 'shield_activate'
  | 'shield_deactivate'
  // Enemy-specific sounds (mapped to actual .wav files in assets/sounds/)
  | 'chaser_death'
  | 'chaser_damage'
  | 'ranged_death'
  | 'ranged_damage'
  | 'kamikaze_death'
  | 'kamikaze_damage'
  | 'tank_death'
  | 'tank_damage'
  | 'boss_death'
  | 'boss_damage'
  | 'flying_death'
  | 'flying_damage'
  | 'swarm_death'
  | 'swarm_damage'
  | 'shielded_death'
  | 'shielded_damage'
  | 'kamikaze_death'
  | 'tank_death'
  | 'boss_death'

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
  'flashlight_click',
  'boss_roar',
  'fireplace',
  'shield_activate',
  'shield_deactivate',
  // Enemy-specific sounds
  'chaser_death',
  'chaser_damage',
  'ranged_death',
  'ranged_damage',
  'kamikaze_death',
  'kamikaze_damage',
  'tank_death',
  'tank_damage',
  'boss_death',
  'boss_damage',
  'flying_death',
  'flying_damage',
  'swarm_death',
  'swarm_damage',
  'shielded_death',
  'shielded_damage',
  'kamikaze_death',
  'tank_death',
  'boss_death',
  'fireplace',
]

const MUSIC_BASE_GAIN = 0.11

// Arquivos reais (opcionais): carregados do diretório de assets no build.
const soundUrls = import.meta.glob('../assets/sounds/*.wav', { query: '?url', import: 'default' })
const musicUrls = import.meta.glob('../assets/sounds/*.ogg', { query: '?url', import: 'default' })

export class AudioManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private musicMasterGain: GainNode | null = null
  private musicExploreGain: GainNode | null = null
  private musicCombatGain: GainNode | null = null
  private musicAmbientGain: GainNode | null = null
  private musicNodes: OscillatorNode[] = []
  private noiseBuffer: AudioBuffer | null = null
  private loadedBuffers = new Map<SfxName, AudioBuffer>()
  private preloadStarted = false
  private musicStarted = false
  private ambientBuffer: AudioBuffer | null = null
  private ambientSource: AudioBufferSourceNode | null = null

  /** Loops posicionais aguardando o buffer (ex.: fogueiras/cressets). */
  private pendingLoops: Array<{
    name: SfxName
    panner: PannerNode
    gain: GainNode
    handle: { source: AudioBufferSourceNode | null; stopped: boolean }
  }> = []

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

  /**
   * Inicia um som posicional em LOOP (ex.: fogueira dos cressets). Retorna um
   * handle com `stop()` e `setVolume()`. A atenuação de distância NÃO fica no
   * panner (que só faz panorâmica estéreo): quem regula o volume é o GainNode
   * via `setVolume`, chamado a cada frame com a distância jogador→fonte. Se o
   * .wav ainda não terminou de carregar, o loop entra em fila e toca assim que
   * o buffer chega.
   */
  startLoopingPositional(
    name: SfxName,
    position: THREE.Vector3,
  ): { stop: () => void; setVolume: (v: number) => void } | null {
    if (!this.ctx || !this.sfxGain) return null
    const panner = this.ctx.createPanner()
    panner.panningModel = 'equalpower'
    // Amplitude constante no panner (rolloff 0): a distância é tratada pelo
    // GainNode manual, senão teríamos atenuação dupla.
    panner.distanceModel = 'inverse'
    panner.refDistance = 1
    panner.maxDistance = 100000
    panner.rolloffFactor = 0
    panner.positionX.value = position.x
    panner.positionY.value = position.y
    panner.positionZ.value = position.z
    panner.connect(this.sfxGain)

    const gain = this.ctx.createGain()
    gain.gain.value = 0
    gain.connect(panner)

    const handle: { source: AudioBufferSourceNode | null; stopped: boolean } = {
      source: null,
      stopped: false,
    }

    const buffer = this.loadedBuffers.get(name)
    if (buffer) {
      handle.source = this.startLoop(buffer, gain)
    } else {
      this.pendingLoops.push({ name, panner, gain, handle })
    }

    return {
      stop: () => {
        if (handle.stopped) return
        handle.stopped = true
        handle.source?.stop()
        handle.source?.disconnect()
        gain.disconnect()
        panner.disconnect()
        this.pendingLoops = this.pendingLoops.filter(entry => entry.panner !== panner)
      },
      setVolume: (v: number) => {
        if (handle.stopped || !this.ctx) return
        gain.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.ctx.currentTime, 0.12)
      },
    }
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

    // Carrega cave.ogg como camada de exploração (substitui os osciladores procedurais)
    this.loadExplorationMusic()

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

  /** Carrega cave.ogg como camada de exploração (substitui osciladores procedurais). */
  private async loadExplorationMusic(): Promise<void> {
    if (!this.ctx) return
    const loader = musicUrls['../assets/sounds/cave.ogg']
    if (!loader) {
      console.warn('[AudioManager] cave.ogg não encontrado em assets/sounds/')
      return
    }
    try {
      const url = await loader()
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to load cave.ogg')
      const arrayBuffer = await response.arrayBuffer()
      this.ambientBuffer = await this.ctx!.decodeAudioData(arrayBuffer)
      this.playExplorationLoop()
    } catch (e) {
      console.warn('[AudioManager] Falha ao carregar cave.ogg:', e)
    }
  }

  private playExplorationLoop(): void {
    if (!this.ctx || !this.ambientBuffer || this.ambientSource) return
    // Cadeia real: ambientSource → musicAmbientGain → musicExploreGain → musicMasterGain → masterGain.
    // O musicAmbientGain é o controle de volume do cave.ogg; sem ele o nó ficava órfão
    // (o source ia direto ao musicExploreGain) e o ganho não tinha efeito nenhum.
    this.musicAmbientGain = this.ctx.createGain()
    this.musicAmbientGain.gain.value = 6.0 // Volume da música de exploração (compensa o MUSIC_BASE_GAIN baixo)
    this.musicAmbientGain.connect(this.musicExploreGain!)

    this.ambientSource = this.ctx.createBufferSource()
    this.ambientSource.buffer = this.ambientBuffer
    this.ambientSource.loop = true
    this.ambientSource.connect(this.musicAmbientGain!)
    this.ambientSource.start()
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
    this.musicAmbientGain?.disconnect()
    this.musicMasterGain?.disconnect()
    if (this.ambientSource) {
      this.ambientSource.stop()
      this.ambientSource = null
    }
    this.musicExploreGain = null
    this.musicCombatGain = null
    this.musicAmbientGain = null
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

    // Mapeamento de nomes lógicos para arquivos reais em assets/sounds/
    const soundFileMap: Record<string, string> = {
      'chaser_death': 'deaths',
      'chaser_damage': 'pains',
      'ranged_death': 'deaths',
      'ranged_damage': 'paine',
      'kamikaze_death': 'deathd',
      'kamikaze_damage': 'painb',
      'tank_death': 'deathb',
      'tank_damage': 'painb',
      'boss_death': 'deathe',
      'boss_damage': 'paine',
      'flying_death': 'deaths',
      'flying_damage': 'painb',
      'swarm_death': 'deaths',
      'swarm_damage': 'pains',
      'shielded_death': 'deathb',
      'shielded_damage': 'paine',
    }

    for (const name of SFX_NAMES) {
      const fileName = soundFileMap[name] ?? name
      const loader = soundUrls[`../assets/sounds/${fileName}.wav`]
      if (!loader) continue
      try {
        const url = await loader()
        const response = await fetch(url)
        if (!response.ok) continue
        const arrayBuffer = await response.arrayBuffer()
        const buffer = await ctx.decodeAudioData(arrayBuffer)
        this.loadedBuffers.set(name, buffer)
        this.flushPendingLoops()
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

  private startLoop(buffer: AudioBuffer, destination: AudioNode): AudioBufferSourceNode {
    const source = this.ctx!.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(destination)
    source.start()
    return source
  }

  /** Dispara os loops posicionais cujo buffer já chegou (chamado após cada preload). */
  private flushPendingLoops(): void {
    if (this.pendingLoops.length === 0) return
    const remaining: typeof this.pendingLoops = []
    for (const entry of this.pendingLoops) {
      const buffer = this.loadedBuffers.get(entry.name)
      if (buffer && !entry.handle.stopped) {
        entry.handle.source = this.startLoop(buffer, entry.gain)
      } else if (!entry.handle.stopped) {
        remaining.push(entry)
      }
    }
    this.pendingLoops = remaining
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
    flashlight_click: dest => {
      this.playTone(1200, 0.03, 0.12, 'square', dest)
      this.playTone(800, 0.04, 0.1, 'square', dest)
    },
    boss_roar: dest => {
      this.playNoiseBurst(0.6, 0.8, 500, dest)
      this.playTone(90, 0.6, 0.5, 'sawtooth', dest, 45)
      this.playTone(120, 0.5, 0.3, 'square', dest, 60)
    },
    fireplace: dest => {
      this.playNoiseBurst(0.4, 0.25, 900, dest)
      this.playTone(70, 0.35, 0.12, 'sine', dest, 45)
    },
    shield_activate: dest => {
      this.playTone(800, 0.1, 0.2, 'sine', dest)
      this.playTone(1200, 0.15, 0.15, 'sine', dest, 1600)
    },
    shield_deactivate: dest => {
      this.playTone(600, 0.15, 0.15, 'sine', dest)
      this.playTone(400, 0.2, 0.1, 'sine', dest, 200)
    },
    // Enemy-specific sounds (fallback procedural - real files loaded from assets/sounds/)
    chaser_death: dest => {
      this.playNoiseBurst(0.25, 0.4, 1200, dest)
      this.playTone(200, 0.3, 0.3, 'sawtooth', dest, 80)
    },
    chaser_damage: dest => this.playNoiseBurst(0.08, 0.5, 2200, dest),
    ranged_death: dest => {
      this.playNoiseBurst(0.2, 0.35, 1500, dest)
      this.playTone(250, 0.25, 0.3, 'sawtooth', dest, 100)
    },
    ranged_damage: dest => this.playNoiseBurst(0.07, 0.45, 2800, dest),
    kamikaze_death: dest => {
      this.playNoiseBurst(0.4, 0.5, 800, dest)
      this.playTone(150, 0.4, 0.4, 'sawtooth', dest, 50)
    },
    kamikaze_damage: dest => this.playNoiseBurst(0.1, 0.4, 2000, dest),
    tank_death: dest => {
      this.playNoiseBurst(0.5, 0.6, 600, dest)
      this.playTone(80, 0.6, 0.5, 'sine', dest, 40)
    },
    tank_damage: dest => this.playNoiseBurst(0.15, 0.5, 1000, dest),
    boss_death: dest => {
      this.playNoiseBurst(0.8, 0.7, 400, dest)
      this.playTone(60, 0.8, 0.6, 'sawtooth', dest, 30)
      this.playTone(90, 0.6, 0.4, 'square', dest, 50)
    },
    boss_damage: dest => this.playNoiseBurst(0.2, 0.6, 800, dest),
    flying_death: dest => {
      this.playNoiseBurst(0.3, 0.4, 1800, dest)
      this.playTone(300, 0.35, 0.35, 'sawtooth', dest, 120)
    },
    flying_damage: dest => this.playNoiseBurst(0.06, 0.5, 3000, dest),
    swarm_death: dest => {
      this.playNoiseBurst(0.15, 0.3, 2000, dest)
      this.playTone(400, 0.2, 0.25, 'square', dest, 150)
    },
    swarm_damage: dest => this.playNoiseBurst(0.05, 0.3, 2500, dest),
    shielded_death: dest => {
      this.playNoiseBurst(0.4, 0.5, 900, dest)
      this.playTone(120, 0.4, 0.4, 'sine', dest, 60)
    },
    shielded_damage: dest => this.playNoiseBurst(0.12, 0.45, 1500, dest),
  }
}
