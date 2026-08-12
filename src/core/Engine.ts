import * as THREE from 'three'
import { AudioManager } from './AudioManager'
import { CollisionSystem } from './CollisionSystem'
import { InputManager } from './InputManager'
import { preloadEnemySprites } from './SpriteLoader'
import { LIGHTING_CONFIG } from './lighting.config'
import { ParticleSystem } from './ParticleSystem'
import { computeSplashDamage } from './splash'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import type { Enemy } from '../entities/Enemy'
import type { EnemyWorld } from '../entities/Enemy'
import { createEnemy, ENEMY_SPRITE_URLS, ENEMY_TYPES } from '../entities/EnemyTypes'
import { Pickup } from '../entities/Pickup'
import { PICKUP_CONFIG } from '../entities/pickup.config'
import { Player } from '../entities/Player'
import { PLAYER_CONFIG } from '../entities/player.config'
import { Projectile } from '../entities/Projectile'
import { Rocket } from '../entities/Rocket'
import { LevelLoader, WALL_HEIGHT } from '../levels/LevelLoader'
import type { ParsedLevel, WaveDefinition } from '../levels/LevelLoader'
import { LEVELS_BY_ID } from '../levels/levels'
import { useGameStore, maxHealthFor } from '../state/gameStore'
import type { GamePhase } from '../state/gameStore'
import { DIFFICULTIES } from '../state/difficulty.config'
import {
  CURRENCY_PER_LEVEL_CLEAR,
  REGEN_INTERVAL_SECONDS,
  SKILL_POINT_PER_LEVEL_CLEAR,
} from '../state/progression.config'
import { SPEED_PER_LEVEL } from '../state/progression.config'
import { applyWeaponUpgrades } from '../weapons/weapon-upgrades'
import { EPILOGUE, getSecretNote, LEVEL_INTROS } from '../narrative/story.config'
import type { LevelAtmosphere } from '../levels/LevelLoader'
import { createWeapon } from '../weapons/Weapon'
import type { Weapon, WeaponContext } from '../weapons/Weapon'
import { WeaponView } from '../weapons/WeaponView'
import { WEAPONS, WEAPON_ORDER } from '../weapons/weapons.config'
import type { WeaponId } from '../weapons/weapons.config'

const BACKGROUND_COLOR = 0x0d0709
const STEP_INTERVAL = 0.35 // segundos entre sons de passos
const DOOR_INTERACT_RANGE = 2.4
const TRANSITION_DURATION = 0.35
const DOOR_LABEL_RANGE = 28
const DOOR_LABEL_FADE = 16

const VIGNETTE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    intensity: { value: 0.32 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float intensity;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float dist = distance(vUv, vec2(0.5));
      color.rgb *= 1.0 - intensity * smoothstep(0.45, 0.9, dist);
      gl_FragColor = color;
    }
  `,
}

/**
 * Orquestra o jogo: renderer Three.js, input, áudio, colisão, armas,
 * inimigos e o loop. A engine NÃO depende de React — ela reage às mudanças
 * do gameStore e escreve de volta nele. A UI apenas lê/aciona o store.
 */
export class Engine {
  private container: HTMLElement | null = null
  private renderer: THREE.WebGLRenderer | null = null
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private readonly clock = new THREE.Clock()
  private input: InputManager | null = null
  private readonly collision = new CollisionSystem()
  private readonly audio = new AudioManager()
  private readonly levelLoader = new LevelLoader()
  private player: Player | null = null
  private levelRoot: THREE.Group | null = null
  /** Geometria estática cacheada por id de nível (não regenera a cada troca). */
  private levelGroupCache = new Map<string, THREE.Group>()
  private currentParsed: ParsedLevel | null = null
  private doorMeshes: THREE.Group[] = []
  private noteMeshes: THREE.Group[] = []
  private ambientLight: THREE.AmbientLight | null = null
  private doorLabels: Array<{
    material: THREE.SpriteMaterial
    texture: THREE.CanvasTexture
    x: number
    z: number
    secret: boolean
    requires: string
    bossLocked: boolean
  }> = []
  private leverMeshes: THREE.Group[] = []
  private leverGlowMaterials: THREE.MeshStandardMaterial[] = []
  private activatedLevers = new Set<string>()
  private interactKeyHeld = false
  private boss: Enemy | null = null
  private bossDefeated = false
  private bossDefeatActive = false
  private bossDefeatTimer = 0
  private bossDefeatAccum = 0
  private lastBossPct = -1
  private activeSummons = 0
  private regenTimer = 0
  private transitionState: 'idle' | 'fading-in' | 'fading-out' = 'idle'
  private transitionTarget: string | null = null
  private transitionFade = 0
  private weapons: Partial<Record<WeaponId, Weapon>> = {}
  private weaponView: WeaponView | null = null
  private enemies: Enemy[] = []
  private pickups: Pickup[] = []
  private projectiles: Projectile[] = []
  private rockets: Rocket[] = []
  private wallMeshes: THREE.Object3D[] = []
  private particles: ParticleSystem | null = null
  private minimapCanvas: HTMLCanvasElement | null = null
  private minimapCtx: CanvasRenderingContext2D | null = null
  private weaponKeysHeld = new Array<boolean>(WEAPON_ORDER.length).fill(false)
  private pendingWaves: WaveDefinition[] = []
  private waveTime = 0
  private spawnedEnemyCount = 0
  private totalEnemiesToSpawn = 0
  private levelCleared = false
  private doorGlowMaterials: Array<{
    material: THREE.MeshStandardMaterial
    secret: boolean
    requires: string
    bossLocked: boolean
  }> = []
  private composer: EffectComposer | null = null
  private bloomPass: UnrealBloomPass | null = null
  private levelLights: Array<{ light: THREE.PointLight; base: number; flicker: boolean }> = []
  private effectLights: Array<{ light: THREE.PointLight; life: number; maxLife: number }> = []
  private shake = 0
  private flickerTime = 0

  private rafId = 0
  private initialized = false
  private currentLevelId = ''
  private lastPhase: GamePhase = 'menu'
  private exitPointerIntentional = false
  private lastStepTime = 0
  private pauseKeyHeld = false
  private frameCount = 0
  private lastFpsSampleTime = 0
  private unsubscribe: (() => void) | null = null
  private unsubscribeVolume: (() => void) | null = null

  isInitialized(): boolean {
    return this.initialized
  }

  // ---- Bridge para os controles virtuais (touch) ----

  setTouchMove(x: number, z: number): void {
    this.input?.setVirtualMove(x, z)
  }

  addTouchLook(dx: number, dy: number): void {
    this.input?.addVirtualLook(dx, dy)
  }

  setTouchFire(held: boolean): void {
    this.input?.setVirtualFire(held)
  }

  init(container: HTMLElement): void {
    if (this.initialized) return
    this.container = container

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(BACKGROUND_COLOR)
    if (LIGHTING_CONFIG.fogEnabled) {
      this.scene.fog = new THREE.Fog(
        LIGHTING_CONFIG.fogColor,
        LIGHTING_CONFIG.fogNear,
        LIGHTING_CONFIG.fogFar,
      )
    } else {
      this.scene.fog = null
    }

    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      500,
    )
    // A câmera entra na cena para que o WeaponView (filho dela) seja renderizado.
    this.scene.add(this.camera)

    // Iluminação atmosférica: ambiente + hemisfério + lanterna do jogador.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = LIGHTING_CONFIG.exposure
    const ambientLight = new THREE.AmbientLight(
      LIGHTING_CONFIG.ambientColor,
      LIGHTING_CONFIG.ambientIntensity,
    )
    this.ambientLight = ambientLight
    this.scene.add(ambientLight)
    const hemisphere = new THREE.HemisphereLight(
      LIGHTING_CONFIG.hemisphereSky,
      LIGHTING_CONFIG.hemisphereGround,
      LIGHTING_CONFIG.hemisphereIntensity,
    )
    this.scene.add(hemisphere)

    // Lanterna acoplada à câmera: visibilidade mínima garantida em todo o mapa.
    const flashlight = new THREE.SpotLight(
      LIGHTING_CONFIG.flashlightColor,
      LIGHTING_CONFIG.flashlightIntensity,
      LIGHTING_CONFIG.flashlightDistance,
      LIGHTING_CONFIG.flashlightAngle,
      LIGHTING_CONFIG.flashlightPenumbra,
      2,
    )
    this.camera.add(flashlight)
    flashlight.target.position.set(0, 0, -1)
    this.camera.add(flashlight.target)

    // Log de diagnóstico: valores de iluminação realmente aplicados.
    console.log('[engine] iluminação aplicada:', {
      exposure: this.renderer.toneMappingExposure,
      toneMapping: this.renderer.toneMapping === THREE.ACESFilmicToneMapping ? 'ACES' : 'outro',
      ambient: {
        color: `#${ambientLight.color.getHexString()}`,
        intensity: ambientLight.intensity,
      },
      hemisphere: { intensity: hemisphere.intensity },
      flashlight: {
        intensity: flashlight.intensity,
        distance: flashlight.distance,
        angle: flashlight.angle,
      },
      fog: this.scene.fog ? 'ligado' : 'desligado',
    })

    // Pré-carrega os sprites dos inimigos (chroma key) antes do primeiro nível.
    void preloadEnemySprites(ENEMY_SPRITE_URLS)

    // Post-processing: bloom + vinheta.
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.6,
      0.55,
      0.65,
    )
    this.composer.addPass(this.bloomPass)
    this.composer.addPass(new OutputPass())
    this.composer.addPass(new ShaderPass(VIGNETTE_SHADER))

    this.input = new InputManager(this.renderer.domElement, locked =>
      this.handlePointerLockChange(locked),
    )
    this.player = new Player(this.collision)

    this.weaponView = new WeaponView(this.camera)
    this.weapons = this.createWeapons()
    this.particles = new ParticleSystem(this.scene)

    // A engine reage às mudanças de fase/estado do store, nunca ao contrário.
    this.unsubscribe = useGameStore.subscribe((state, prev) => {
      if (state.phase !== prev.phase) this.handlePhaseChange(state.phase)
    })
    this.unsubscribeVolume = useGameStore.subscribe((state, prev) => {
      if (state.masterVolume !== prev.masterVolume) this.audio.setMasterVolume(state.masterVolume)
      if (state.sfxVolume !== prev.sfxVolume) this.audio.setSfxVolume(state.sfxVolume)
      if (state.musicVolume !== prev.musicVolume) this.audio.setMusicVolume(state.musicVolume)
      if (state.graphicsQuality !== prev.graphicsQuality) this.applyGraphicsQuality()
      if (state.brightness !== prev.brightness) this.applyBrightness()
      if (state.weaponUpgrades !== prev.weaponUpgrades) this.weapons = this.createWeapons()
      // Intro dispensada → pede o Pointer Lock para o jogador retomar o controle.
      if (state.levelIntro !== prev.levelIntro && !state.levelIntro) {
        if (state.phase === 'playing' && this.input && !this.input.isPointerLocked()) {
          this.input.requestPointerLock()
        }
      }
    })

    const initial = useGameStore.getState()
    this.audio.setMasterVolume(initial.masterVolume)
    this.audio.setSfxVolume(initial.sfxVolume)
    this.audio.setMusicVolume(initial.musicVolume)
    this.applyGraphicsQuality()
    this.applyBrightness()

    window.addEventListener('resize', this.handleResize)

    this.initialized = true
    this.lastPhase = useGameStore.getState().phase
    this.clock.start()
    this.rafId = requestAnimationFrame(this.loop)
  }

  dispose(): void {
    if (!this.initialized) return
    cancelAnimationFrame(this.rafId)
    window.removeEventListener('resize', this.handleResize)
    this.unsubscribe?.()
    this.unsubscribe = null
    this.unsubscribeVolume?.()
    this.unsubscribeVolume = null
    this.input?.detach()
    this.input = null
    this.clearLevel()
    this.clearLevelGroupCache()
    this.clearAllLights()
    this.particles?.dispose()
    this.particles = null
    this.composer?.dispose()
    this.composer = null
    this.minimapCanvas = null
    this.minimapCtx = null
    if (this.renderer) {
      this.renderer.dispose()
      this.renderer.domElement.remove()
      this.renderer = null
    }
    this.scene = null
    this.camera = null
    this.player = null
    this.levelRoot = null
    this.currentParsed = null
    this.container = null
    this.initialized = false
  }

  /** Conecta o <canvas> do minimapa desenhado pela própria engine (2D). */
  attachMinimap(canvas: HTMLCanvasElement): void {
    this.minimapCanvas = canvas
    this.minimapCtx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio, 2)
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr))
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr))
  }

  private createWeapons(): Partial<Record<WeaponId, Weapon>> {
    const camera = this.camera
    if (!camera) return {}
    const context: WeaponContext = {
      camera,
      getTargets: () => {
        const targets: THREE.Object3D[] = [...this.wallMeshes]
        for (const enemy of this.enemies) {
          if (enemy.alive) targets.push(enemy.hitMesh)
        }
        return targets
      },
      getEnemies: () => this.enemies,
      getAmmo: id => useGameStore.getState().ammo[id],
      spendAmmo: (id, amount) => useGameStore.getState().spendAmmo(id, amount),
      onEnemyHit: (enemy, damage) => {
        enemy.damage(damage)
        this.audio.playPositional('enemy_hit', enemy.position)
        this.spawnEnemyHitParticles(enemy)
      },
      onImpact: (point, normal) => {
        this.spawnWallImpactParticles(point, normal)
      },
      spawnRocket: (origin, direction, speed) => {
        const rocket = new Rocket({ origin, direction, speed })
        this.rockets.push(rocket)
        this.scene?.add(rocket.mesh)
        this.audio.play('rocket')
      },
    }
    const weapons: Partial<Record<WeaponId, Weapon>> = {}
    const upgrades = useGameStore.getState().weaponUpgrades
    for (const id of WEAPON_ORDER) {
      // Upgrades aplicados SOBRE a definição base (dano, cadência, spread, munição).
      weapons[id] = createWeapon(applyWeaponUpgrades(WEAPONS[id], upgrades[id] ?? 0), context)
    }
    return weapons
  }

  private readonly handleResize = (): void => {
    if (!this.container || !this.renderer || !this.camera) return
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.renderer.setSize(width, height)
    this.composer?.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  private readonly loop = (): void => {
    if (!this.initialized) return
    this.rafId = requestAnimationFrame(this.loop)

    const dt = Math.min(this.clock.getDelta(), 0.05)
    const store = useGameStore.getState()

    // Recarrega o nível certo caso o id mude (fora de transição por porta).
    if (
      store.phase === 'playing' &&
      this.transitionState === 'idle' &&
      store.levelId !== this.currentLevelId
    ) {
      this.startLevel(store.levelId)
    }

    if (this.transitionState !== 'idle') {
      this.updateTransition(dt)
    } else if (
      store.phase === 'playing' &&
      !store.levelIntro &&
      !store.epilogue &&
      this.player &&
      this.input
    ) {
      this.player.lookSensitivity = store.mouseSensitivity * PLAYER_CONFIG.lookSensitivity
      this.player.invertY = store.invertY
      this.player.speedMultiplier = 1 + SPEED_PER_LEVEL * (store.skillUpgrades.speed ?? 0)
      this.player.update(dt, this.input)
      if (this.camera) this.player.applyToCamera(this.camera)
      this.applyShake(dt)
      this.audio.updateListener(this.player.position)

      if (this.player.getIsMoving() && this.clock.elapsedTime - this.lastStepTime > STEP_INTERVAL) {
        this.audio.play('step')
        this.lastStepTime = this.clock.elapsedTime
      }

      this.updateRegen(dt)

      this.updateWeapons(dt)
      this.processWaves(dt)
      this.updateEnemies(dt)
      this.updateProjectiles(dt)
      this.updateRockets(dt)
      this.updatePickups(dt)
      this.handleWeaponSwitchKeys()
      this.handlePauseKey()
      this.updateCombatMusic()
      this.updateDoorInteraction()
      this.updateLeverInteraction()
      this.updateNoteInteraction()
      this.handleInteractKey()
      this.updateBossBar()
      if (this.bossDefeatActive) this.updateBossDefeat(dt)

      if (store.health <= 0) {
        this.audio.play('player_hurt')
        store.setPhase('gameover')
      }
    }

    this.weaponView?.update(dt)
    this.particles?.update(dt)
    this.updateEffectLights(dt)
    this.updateLevelLightFlicker(dt)
    this.pulseDoors(dt)
    this.pulseLevers(dt)
    this.updateDoorLabels()
    this.updateMinimap()

    if (this.composer) {
      this.composer.render()
    } else if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera)
    }

    this.updateFps()
  }

  /** Mede FPS (amostra a cada 0,5s) e publica no store para o HUD/dev. */
  private updateFps(): void {
    this.frameCount++
    const elapsed = this.clock.elapsedTime
    if (elapsed - this.lastFpsSampleTime < 0.5) return
    const fps = Math.round(this.frameCount / (elapsed - this.lastFpsSampleTime))
    useGameStore.setState({ fps })
    this.frameCount = 0
    this.lastFpsSampleTime = elapsed
  }

  /** Adiciona um "choque" de câmera (soma ao valor atual). */
  private addShake(amount: number): void {
    this.shake = Math.min(1, this.shake + amount)
  }

  private applyShake(dt: number): void {
    if (this.shake <= 0.001 || !this.camera) return
    const setting = useGameStore.getState().screenShake
    const factor = setting === 'off' ? 0 : setting === 'reduced' ? 0.35 : 1
    if (factor <= 0) {
      this.shake = 0
      return
    }
    this.shake = Math.max(0, this.shake - dt * 1.6)
    const s = this.shake * factor
    this.camera.position.x += (Math.random() - 0.5) * s * 0.5
    this.camera.position.y += (Math.random() - 0.5) * s * 0.4
    this.camera.position.z += (Math.random() - 0.5) * s * 0.5
  }

  /** Aplica qualidade gráfica: bloom on/off, pixel ratio e densidade de partículas. */
  private applyGraphicsQuality(): void {
    const quality = useGameStore.getState().graphicsQuality
    const dpr = window.devicePixelRatio || 1
    if (quality === 'low') {
      if (this.bloomPass) this.bloomPass.enabled = false
      this.renderer?.setPixelRatio(1)
      this.particles?.setQuality(0.5)
    } else if (quality === 'medium') {
      if (this.bloomPass) this.bloomPass.enabled = true
      this.renderer?.setPixelRatio(Math.min(dpr, 1.5))
      this.particles?.setQuality(0.75)
    } else {
      if (this.bloomPass) this.bloomPass.enabled = true
      this.renderer?.setPixelRatio(Math.min(dpr, 2))
      this.particles?.setQuality(1)
    }
  }

  /** Brilho: ajusta a exposição do tone mapping (compensa monitor mal calibrado). */
  private applyBrightness(): void {
    const brightness = useGameStore.getState().brightness
    if (this.renderer) this.renderer.toneMappingExposure = LIGHTING_CONFIG.exposure * brightness
  }

  /** Luz temporária de efeito (explosão, muzzle flash) que decai e some. */
  private addEffectLight(
    position: THREE.Vector3,
    color: number,
    intensity: number,
    life: number,
  ): void {
    if (!this.scene) return
    const light = new THREE.PointLight(color, intensity, 14, 2)
    light.position.copy(position)
    this.scene.add(light)
    this.effectLights.push({ light, life, maxLife: life })
  }

  private updateEffectLights(dt: number): void {
    for (let i = this.effectLights.length - 1; i >= 0; i--) {
      const entry = this.effectLights[i]
      entry.life -= dt
      if (entry.life <= 0) {
        this.scene?.remove(entry.light)
        entry.light.dispose()
        this.effectLights.splice(i, 1)
      } else {
        entry.light.intensity *= 1 - dt * 6
      }
    }
  }

  /** Tochas/luzes de emergência piscando levemente. */
  private updateLevelLightFlicker(dt: number): void {
    if (this.levelLights.length === 0) return
    this.flickerTime += dt
    const t = this.flickerTime
    for (const entry of this.levelLights) {
      if (!entry.flicker) continue
      const pulse = 0.78 + 0.22 * Math.abs(Math.sin(t * 3 + entry.light.id * 7))
      entry.light.intensity = entry.base * pulse
    }
  }

  /** Musica: crossfade exploração/combate conforme a distância do inimigo mais próximo. */
  private updateCombatMusic(): void {
    // Chefe vivo: tema de combate forçado, independente da distância.
    if (this.boss && this.boss.alive) {
      this.audio.setCombatIntensity(1)
      return
    }
    let nearest = Infinity
    for (const enemy of this.enemies) {
      if (!enemy.alive || !this.player) continue
      const dist = Math.hypot(
        enemy.position.x - this.player.position.x,
        enemy.position.z - this.player.position.z,
      )
      if (dist < nearest) nearest = dist
    }
    const intensity = nearest < Infinity ? Math.max(0, Math.min(1, 1 - nearest / 30)) : 0
    this.audio.setCombatIntensity(intensity)
  }

  private updateWeapons(dt: number): void {
    const weapon = this.weapons[useGameStore.getState().currentWeaponId]
    if (!weapon || !this.input) return

    // Só dispara com o Pointer Lock ativo (desktop) ou com o botão virtual (touch).
    const triggerHeld =
      (this.input.isPointerLocked() && this.input.isMouseDown(0)) || this.input.isVirtualFire()
    weapon.setTriggerHeld(triggerHeld)
    weapon.update(dt)

    const event = weapon.consumeShotEvent()
    if (event === 'fired') {
      this.weaponView?.triggerRecoil()
      this.audio.play(weapon.definition.id)
      if (weapon.definition.id === 'rocket') {
        this.addShake(0.4)
      }
      // Muzzle flash: luz pontual temporária na frente da câmera.
      if (this.camera) {
        const flashPos = new THREE.Vector3()
        this.camera.getWorldPosition(flashPos)
        const forward = new THREE.Vector3()
        this.camera.getWorldDirection(forward)
        flashPos.addScaledVector(forward, 1.2)
        this.addEffectLight(flashPos, 0xffd27a, weapon.definition.id === 'rocket' ? 60 : 25, 0.06)
      }
    } else if (event === 'dry') {
      this.audio.play('empty_click')
    }
  }

  private updateEnemies(dt: number): void {
    if (!this.player) return
    const world: EnemyWorld = {
      playerPosition: this.player.position,
      collision: this.collision,
      damagePlayer: amount => {
        useGameStore.getState().damage(amount)
        this.audio.play('player_hurt')
        this.addShake(0.25)
      },
      fireProjectile: (origin, target, damage) => {
        const projectile = new Projectile({ origin, target, speed: 12, damage })
        this.projectiles.push(projectile)
        this.scene?.add(projectile.mesh)
        this.audio.playPositional('enemy_shoot', origin)
      },
      explode: (position, radius, damage) => {
        this.explodeAt(position, radius, damage)
      },
      summon: (enemyType, origin) => {
        if (this.activeSummons >= 6) return
        const type = ENEMY_TYPES.find(t => t.id === enemyType) ?? ENEMY_TYPES[0]
        const healthMult = DIFFICULTIES[useGameStore.getState().difficulty].enemyHealth
        const enemy = createEnemy(type, origin.x, origin.z, healthMult)
        this.enemies.push(enemy)
        this.scene?.add(enemy.mesh)
        this.activeSummons++
        this.audio.play('enemy_shoot')
      },
      roar: () => {
        this.audio.play('boss_roar')
      },
    }

    for (const enemy of this.enemies) enemy.update(dt, world)

    // Chefe derrotado: inicia a sequência elaborada e dispara a vitória.
    if (this.boss && !this.boss.alive && !this.bossDefeatActive) {
      this.startBossDefeat()
    }

    // Remove mortos após a animação de encolhimento e conta o abate.
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]
      if (!enemy.alive && enemy.readyForRemoval()) {
        this.scene?.remove(enemy.mesh)
        enemy.dispose()
        this.enemies.splice(i, 1)
        useGameStore.getState().addKill()
        useGameStore.getState().addCurrency(enemy.type.reward)
        this.audio.playPositional('enemy_death', enemy.position)
        this.spawnEnemyDeathParticles(enemy)
        // Kamikaze explode ao morrer (a menos que já tenha detonado no contato).
        if (enemy.type.explodesOnDeath && !enemy.exploded) {
          this.explodeAt(
            enemy.position.clone(),
            enemy.type.explosionRadius ?? 3,
            enemy.type.explosionDamage ?? 25,
          )
        }
      }
    }

    // Limpar todos os inimigos NÃO avança sozinho: marca o setor como limpo e
    // recompensa com moeda + ponto de habilidade. A vitória do nível final
    // vem da morte do chefe, não do sector-clear.
    const allSpawned = this.spawnedEnemyCount >= this.totalEnemiesToSpawn
    if (!this.levelCleared && allSpawned && this.enemies.length === 0) {
      this.levelCleared = true
      useGameStore.getState().setLevelCleared(true)
      this.refreshDoorStates()
      this.audio.play('sector_clear')
      useGameStore.getState().addCurrency(CURRENCY_PER_LEVEL_CLEAR)
      useGameStore.getState().addSkillPoints(SKILL_POINT_PER_LEVEL_CLEAR)
    }
  }

  /** Sequência elaborada de derrota do chefe: explosões → vitória. */
  private startBossDefeat(): void {
    this.bossDefeated = true
    this.bossDefeatActive = true
    this.bossDefeatTimer = 2.6
    this.bossDefeatAccum = 0
    this.refreshDoorStates()
    this.addShake(0.8)
    this.audio.play('boss_roar')
  }

  private updateBossDefeat(dt: number): void {
    this.bossDefeatTimer -= dt
    this.bossDefeatAccum += dt
    if (this.bossDefeatAccum >= 0.4) {
      this.bossDefeatAccum = 0
      const base = this.boss?.position ?? new THREE.Vector3(0, 1, 0)
      const angle = Math.random() * Math.PI * 2
      const radius = 1 + Math.random() * 3
      const pos = new THREE.Vector3(
        base.x + Math.cos(angle) * radius,
        base.y + Math.random() * 2,
        base.z + Math.sin(angle) * radius,
      )
      this.particles?.explosion(pos, 1.2 + Math.random() * 0.8)
      this.addEffectLight(pos, 0xff9f43, 45, 0.3)
      this.addShake(0.35)
      this.audio.play('explosion')
    }
    if (this.bossDefeatTimer <= 0) {
      this.bossDefeatActive = false
      // Epílogo (tela de encerramento) antes da vitória.
      useGameStore.getState().setEpilogue(EPILOGUE)
    }
  }

  /** Barra de chefe fixa no topo (sempre visível enquanto ele está vivo). */
  private updateBossBar(): void {
    if (this.boss && this.boss.alive && !this.bossDefeatActive) {
      const ratio = this.boss.maxHealth > 0 ? this.boss.health / this.boss.maxHealth : 0
      const pct = Math.floor(ratio * 100)
      if (pct !== this.lastBossPct) {
        this.lastBossPct = pct
        useGameStore.getState().setBossBar({ name: this.boss.type.name, ratio })
      }
    } else if (this.lastBossPct !== -1) {
      this.lastBossPct = -1
      useGameStore.getState().setBossBar(null)
    }
  }

  /** Regeneração lenta de vida (atributo Regeneração). */
  private updateRegen(dt: number): void {
    const store = useGameStore.getState()
    const regenLevel = store.skillUpgrades.regen ?? 0
    if (regenLevel <= 0) return
    this.regenTimer += dt
    if (this.regenTimer < REGEN_INTERVAL_SECONDS) return
    this.regenTimer = 0
    if (store.health < maxHealthFor(store.skillUpgrades)) {
      store.pickupHealth(1)
    }
  }

  /** Processa o spawn das ondas de inimigos (nível 5). */
  private processWaves(dt: number): void {
    if (this.pendingWaves.length === 0) return
    this.waveTime += dt
    while (this.pendingWaves.length > 0 && this.pendingWaves[0].delay <= this.waveTime) {
      const wave = this.pendingWaves.shift()
      if (!wave) break
      for (let i = 0; i < wave.count; i++) this.spawnWaveEnemy(wave.enemyType)
    }
  }

  /** Spawna um inimigo de onda em um ponto aleatório de waveSpawns. */
  private spawnWaveEnemy(enemyType: string): void {
    const parsed = this.currentParsed
    if (!parsed || !this.scene || parsed.waveSpawns.length === 0) return
    const point = parsed.waveSpawns[Math.floor(Math.random() * parsed.waveSpawns.length)]
    if (!point) return
    const jitter = 1.5
    const x = point.x + (Math.random() * 2 - 1) * jitter
    const z = point.z + (Math.random() * 2 - 1) * jitter
    const type = ENEMY_TYPES.find(t => t.id === enemyType) ?? ENEMY_TYPES[0]
    const healthMult = DIFFICULTIES[useGameStore.getState().difficulty].enemyHealth
    const enemy = createEnemy(type, x, z, healthMult)
    this.enemies.push(enemy)
    this.scene.add(enemy.mesh)
    this.spawnedEnemyCount++
  }

  /** Atualiza os foguetes do lançador: movimento + colisão + explosão. */
  private updateRockets(dt: number): void {
    if (!this.player) return
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const rocket = this.rockets[i]
      rocket.update(dt)
      const pos = rocket.mesh.position
      let exploded = !rocket.alive
      if (!exploded && this.collision.isBlocked(pos.x, pos.z, 0.2)) exploded = true
      if (!exploded) {
        for (const enemy of this.enemies) {
          if (!enemy.alive) continue
          if (Math.hypot(enemy.position.x - pos.x, enemy.position.z - pos.z) < 1.1) {
            exploded = true
            break
          }
        }
      }
      if (exploded) {
        const weapon = this.weapons['rocket']
        const radius = weapon?.definition.splashRadius ?? 4.5
        const damage = weapon?.definition.damage ?? 60
        this.explodeAt(pos, radius, damage)
        this.scene?.remove(rocket.mesh)
        rocket.dispose()
        this.rockets.splice(i, 1)
      }
    }
  }

  /** Explosão em área (foguete ou kamikaze): dano em inimigos + jogador + partículas. */
  private explodeAt(position: THREE.Vector3, radius: number, damage: number): void {
    this.particles?.explosion(position, radius > 4 ? 1.6 : 1)
    this.audio.playPositional('explosion', position)
    this.addEffectLight(position, 0xff9f43, 40, 0.35)
    this.addShake(0.55)
    // dano nos inimigos
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      const dist = Math.hypot(enemy.position.x - position.x, enemy.position.z - position.z)
      enemy.damage(computeSplashDamage(dist, radius, damage))
    }
    // dano no jogador (self-splash)
    if (this.player) {
      const dist = Math.hypot(
        this.player.position.x - position.x,
        this.player.position.z - position.z,
      )
      const selfDamage = computeSplashDamage(dist, radius, damage, 0.6)
      if (selfDamage > 0) {
        useGameStore.getState().damage(selfDamage)
        this.audio.play('player_hurt')
        this.addShake(0.3)
      }
    }
  }

  private updateProjectiles(dt: number): void {
    if (!this.player) return
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i]
      projectile.update(dt, this.collision)

      if (projectile.alive && projectile.mesh.position.distanceTo(this.player.position) < 0.5) {
        useGameStore.getState().damage(projectile.damage)
        this.audio.play('player_hurt')
        this.addShake(0.25)
        projectile.alive = false
      }

      if (!projectile.alive) {
        this.scene?.remove(projectile.mesh)
        projectile.dispose()
        this.projectiles.splice(i, 1)
      }
    }
  }

  private updatePickups(dt: number): void {
    if (!this.player) return
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i]
      pickup.update(dt)

      if (!pickup.collected) {
        const dx = pickup.mesh.position.x - this.player.position.x
        const dz = pickup.mesh.position.z - this.player.position.z
        if (Math.hypot(dx, dz) <= PICKUP_CONFIG.collectRadius) {
          this.applyPickup(pickup)
          pickup.collect()
        }
      }

      // Remove após a animação de coleta ("pop").
      if (pickup.readyForRemoval()) {
        this.scene?.remove(pickup.mesh)
        pickup.dispose()
        this.pickups.splice(i, 1)
      }
    }
  }

  private applyPickup(pickup: Pickup): void {
    const store = useGameStore.getState()
    if (pickup.definition.kind === 'health') {
      store.pickupHealth(PICKUP_CONFIG.healthAmount)
    } else if (pickup.definition.kind === 'currency') {
      store.addCurrency(PICKUP_CONFIG.currencyAmount)
    } else {
      // Munição vai para a arma atualmente equipada.
      store.pickupAmmo(store.currentWeaponId, PICKUP_CONFIG.ammoAmount)
    }
    this.audio.play('pickup')
  }

  /** Faísca/poeira no ponto de impacto do tiro na parede. */
  private spawnWallImpactParticles(point: THREE.Vector3, normal: THREE.Vector3): void {
    if (!this.particles) return
    const position = point.clone().addScaledVector(normal, 0.04)
    // Poeira sai para fora da parede (sentido da normal) com um pouco pra cima.
    const direction = normal.clone().add(new THREE.Vector3(0, 0.35, 0))
    this.particles.spawnBurst({
      position,
      count: 8,
      direction,
      speed: 2.2,
      spread: 0.5,
      size: 0.05,
      life: 0.4,
      gravity: 7,
      lift: 0.3,
      color: new THREE.Color(0xb0a08c),
    })
  }

  /** Respingo de sangue no inimigo ao receber dano. */
  private spawnEnemyHitParticles(enemy: Enemy): void {
    if (!this.particles || !this.player) return
    const direction = new THREE.Vector3().subVectors(this.player.position, enemy.position)
    direction.y = 0
    this.particles.spawnBurst({
      position: enemy.position.clone().add(new THREE.Vector3(0, 1.1, 0)),
      count: 10,
      direction,
      speed: 3,
      spread: 0.8,
      size: 0.06,
      life: 0.35,
      gravity: 9,
      color: new THREE.Color(0xb32635),
    })
  }

  /** Pequena explosão de partículas na morte do inimigo. */
  private spawnEnemyDeathParticles(enemy: Enemy): void {
    if (!this.particles) return
    this.particles.spawnBurst({
      position: enemy.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
      count: 26,
      direction: new THREE.Vector3(0, 1, 0),
      speed: 3.5,
      spread: 1.2,
      size: 0.07,
      life: 0.6,
      gravity: 8,
      lift: 1.2,
      color: new THREE.Color(0xd4344a),
    })
    this.particles.spawnBurst({
      position: enemy.position.clone().add(new THREE.Vector3(0, 0.9, 0)),
      count: 14,
      direction: new THREE.Vector3(0, 0.4, 0),
      speed: 1.6,
      spread: 1,
      size: 0.05,
      life: 0.8,
      gravity: 3,
      lift: 0.6,
      color: new THREE.Color(0x3a2025),
    })
  }

  /** Desenha o minimapa (2D) a partir do grid + entidades. */
  private updateMinimap(): void {
    const ctx = this.minimapCtx
    const canvas = this.minimapCanvas
    const parsed = this.currentParsed
    if (!ctx || !canvas || !parsed || !this.player) return

    const w = canvas.width
    const h = canvas.height
    const scale = Math.min(w / parsed.bounds.maxX, h / parsed.bounds.maxZ)
    const ox = (w - parsed.bounds.maxX * scale) / 2
    const oz = (h - parsed.bounds.maxZ * scale) / 2

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(8, 3, 4, 0.78)'
    ctx.fillRect(0, 0, w, h)

    // Paredes.
    ctx.fillStyle = '#4a2a30'
    for (const wall of parsed.walls) {
      ctx.fillRect(
        ox + wall.minX * scale,
        oz + wall.minZ * scale,
        (wall.maxX - wall.minX) * scale,
        (wall.maxZ - wall.minZ) * scale,
      )
    }

    // Pickups não coletados.
    for (const pickup of this.pickups) {
      ctx.fillStyle =
        pickup.definition.kind === 'health'
          ? '#2ee07a'
          : pickup.definition.kind === 'currency'
            ? '#ffb04a'
            : '#ffd24a'
      ctx.beginPath()
      ctx.arc(
        ox + pickup.mesh.position.x * scale,
        oz + pickup.mesh.position.z * scale,
        2.4,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }

    // Portas: retângulo na cor da porta; trancada = opacidade baixa + X.
    for (const door of parsed.doors) {
      const px = ox + door.x * scale
      const pz = oz + door.z * scale
      const unlocked = this.doorUnlocked({ requires: door.requires, bossLocked: door.bossLocked })
      ctx.globalAlpha = unlocked ? 1 : 0.4
      ctx.fillStyle = door.secret ? '#e04aff' : '#35e0c0'
      ctx.fillRect(px - 2.6, pz - 2.6, 5.2, 5.2)
      ctx.strokeStyle = 'rgba(8, 3, 4, 0.6)'
      ctx.lineWidth = 0.8
      ctx.strokeRect(px - 2.6, pz - 2.6, 5.2, 5.2)
      if (!unlocked) {
        ctx.globalAlpha = 1
        ctx.strokeStyle = '#ff4a5a'
        ctx.lineWidth = 1.1
        ctx.beginPath()
        ctx.moveTo(px - 3, pz - 3)
        ctx.lineTo(px + 3, pz + 3)
        ctx.moveTo(px + 3, pz - 3)
        ctx.lineTo(px - 3, pz + 3)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1

    // Válvulas: círculo âmbar.
    ctx.fillStyle = '#ffb04a'
    for (const lever of parsed.levers) {
      ctx.beginPath()
      ctx.arc(ox + lever.x * scale, oz + lever.z * scale, 2.6, 0, Math.PI * 2)
      ctx.fill()
    }

    // Inimigos vivos.
    ctx.fillStyle = '#e2364a'
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      ctx.beginPath()
      ctx.arc(ox + enemy.position.x * scale, oz + enemy.position.z * scale, 2.6, 0, Math.PI * 2)
      ctx.fill()
    }

    // Jogador: triângulo apontando na direção do yaw.
    const px = ox + this.player.position.x * scale
    const pz = oz + this.player.position.z * scale
    ctx.save()
    ctx.translate(px, pz)
    ctx.rotate(-this.player.yaw)
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.moveTo(0, -5)
    ctx.lineTo(3.5, 4)
    ctx.lineTo(-3.5, 4)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  /** Teclas 1..n trocam a arma (com edge trigger). */
  private handleWeaponSwitchKeys(): void {
    if (!this.input) return
    for (let i = 0; i < WEAPON_ORDER.length; i++) {
      const held = this.input.isKeyDown(`Digit${i + 1}`)
      if (held && !this.weaponKeysHeld[i]) {
        useGameStore.getState().equipWeapon(WEAPON_ORDER[i])
      }
      this.weaponKeysHeld[i] = held
    }
  }

  /** Tecla P alterna pausa com "edge trigger" (uma pressão = um toggle). */
  private handlePauseKey(): void {
    const pressed = this.input?.isKeyDown('KeyP') ?? false
    if (pressed && !this.pauseKeyHeld) {
      const phase = useGameStore.getState().phase
      if (phase === 'playing') useGameStore.getState().pause()
      else if (phase === 'paused') useGameStore.getState().resume()
    }
    this.pauseKeyHeld = pressed
  }

  /** Detecta a porta mais próxima do jogador e expõe o prompt no store. */
  private updateDoorInteraction(): void {
    if (!this.player) return
    let nearest: {
      label: string
      targetLevelId: string
      locked: boolean
      secret: boolean
      lockReason: 'boss' | 'lever' | 'sector' | null
    } | null = null
    let nearestDist = Infinity
    for (const door of this.currentParsed?.doors ?? []) {
      if (!door.targetLevelId || !LEVELS_BY_ID[door.targetLevelId]) continue
      const dist = Math.hypot(door.x - this.player.position.x, door.z - this.player.position.z)
      if (dist < DOOR_INTERACT_RANGE && dist < nearestDist) {
        const unlocked = this.doorUnlocked({ requires: door.requires, bossLocked: door.bossLocked })
        let lockReason: 'boss' | 'lever' | 'sector' | null = null
        if (!unlocked) {
          lockReason = door.bossLocked ? 'boss' : door.requires ? 'lever' : 'sector'
        }
        nearest = {
          label: door.label,
          targetLevelId: door.targetLevelId,
          locked: !unlocked,
          secret: door.secret,
          lockReason,
        }
        nearestDist = dist
      }
    }
    const current = useGameStore.getState().interactableDoor
    if (current?.targetLevelId !== nearest?.targetLevelId) {
      useGameStore.getState().setInteractableDoor(nearest)
    }
  }

  /** Detecta a válvula mais próxima e expõe o prompt no store. */
  private updateLeverInteraction(): void {
    if (!this.player) return
    let nearest: { label: string; marker: string } | null = null
    let nearestDist = Infinity
    for (const lever of this.currentParsed?.levers ?? []) {
      if (this.activatedLevers.has(lever.marker)) continue
      const dist = Math.hypot(lever.x - this.player.position.x, lever.z - this.player.position.z)
      if (dist < DOOR_INTERACT_RANGE && dist < nearestDist) {
        nearest = { label: lever.label, marker: lever.marker }
        nearestDist = dist
      }
    }
    const current = useGameStore.getState().interactableLever
    if (current?.marker !== nearest?.marker) {
      useGameStore.getState().setInteractableLever(nearest)
    }
  }

  /** Tecla G (edge trigger): usa a porta, ativa a válvula ou lê a nota. */
  private handleInteractKey(): void {
    const pressed = this.input?.isKeyDown('KeyG') ?? false
    if (pressed && !this.interactKeyHeld) {
      const store = useGameStore.getState()
      const door = store.interactableDoor
      if (door && !door.locked && LEVELS_BY_ID[door.targetLevelId]) {
        this.beginTransition(door.targetLevelId)
      } else if (store.interactableLever) {
        this.activateLever(store.interactableLever.marker)
      } else if (store.interactableNote) {
        useGameStore.getState().setNoteModal(getSecretNote(this.currentLevelId))
      }
    }
    this.interactKeyHeld = pressed
  }

  /** Detecta se há uma nota de lore por perto e expõe o prompt. */
  private updateNoteInteraction(): void {
    if (!this.player) return
    let near = false
    for (const note of this.currentParsed?.notes ?? []) {
      const dist = Math.hypot(note.x - this.player.position.x, note.z - this.player.position.z)
      if (dist < DOOR_INTERACT_RANGE) {
        near = true
        break
      }
    }
    const current = useGameStore.getState().interactableNote
    if (current !== near) useGameStore.getState().setInteractableNote(near)
  }

  /** Ativa uma válvula e destrava as portas que dependem dela. */
  private activateLever(marker: string): void {
    if (this.activatedLevers.has(marker)) return
    this.activatedLevers.add(marker)
    this.audio.play('lever')
    this.refreshDoorStates()
    useGameStore.getState().setInteractableLever(null)
  }

  /** Inicia a transição de nível por porta (fade in → troca → fade out). */
  private beginTransition(targetLevelId: string): void {
    this.transitionTarget = targetLevelId
    this.transitionFade = 0
    this.transitionState = 'fading-in'
    useGameStore.getState().setInteractableDoor(null)
    this.audio.play('door')
    useGameStore.setState({ fade: 0 })
  }

  private updateTransition(dt: number): void {
    if (this.transitionState === 'fading-in') {
      this.transitionFade = Math.min(1, this.transitionFade + dt / TRANSITION_DURATION)
      if (this.transitionFade >= 1) {
        this.transitionState = 'fading-out'
        this.swapLevel()
      }
    } else if (this.transitionState === 'fading-out') {
      this.transitionFade = Math.max(0, this.transitionFade - dt / TRANSITION_DURATION)
      if (this.transitionFade <= 0) {
        this.transitionState = 'idle'
        this.transitionTarget = null
      }
    }
    useGameStore.setState({ fade: this.transitionFade })
  }

  /** Troca o nível no meio da transição (tela preta) e registra o checkpoint. */
  private swapLevel(): void {
    const target = this.transitionTarget
    if (!target || !LEVELS_BY_ID[target]) return
    useGameStore.getState().enterDoor(target)
    this.startLevel(target)
  }

  private handlePhaseChange(phase: GamePhase): void {
    const store = useGameStore.getState()

    switch (phase) {
      case 'playing':
        this.audio.resume()
        this.audio.startMusic()
        // Recarrega o nível ao iniciar/recomeçar, mas NÃO ao voltar de pausa.
        if (this.lastPhase !== 'paused') this.startLevel(store.levelId)
        // Só pede o Pointer Lock depois da intro do nível ser dispensada.
        if (!useGameStore.getState().levelIntro && this.input && !this.input.isPointerLocked()) {
          this.input.requestPointerLock()
        }
        break

      case 'paused':
        this.exitPointerIntentional = true
        this.input?.exitPointerLock()
        this.audio.suspend()
        break

      case 'menu':
        this.exitPointerIntentional = true
        this.input?.exitPointerLock()
        this.audio.stopMusic()
        this.audio.suspend()
        break

      case 'editor':
        this.exitPointerIntentional = true
        this.input?.exitPointerLock()
        this.audio.stopMusic()
        this.audio.suspend()
        break

      case 'settings':
        this.exitPointerIntentional = true
        this.input?.exitPointerLock()
        this.audio.stopMusic()
        this.audio.suspend()
        break

      case 'upgrade':
        this.exitPointerIntentional = true
        this.input?.exitPointerLock()
        this.audio.stopMusic()
        this.audio.suspend()
        break

      case 'gameover':
        this.exitPointerIntentional = true
        this.input?.exitPointerLock()
        this.audio.stopMusic()
        break

      case 'victory':
        this.exitPointerIntentional = true
        this.input?.exitPointerLock()
        this.audio.stopMusic()
        break
    }

    this.lastPhase = phase
  }

  private handlePointerLockChange(locked: boolean): void {
    if (locked) return
    // Saída do Pointer Lock que NÃO fomos nós (ex.: Esc) pausa o jogo.
    if (this.exitPointerIntentional) {
      this.exitPointerIntentional = false
      return
    }
    const phase = useGameStore.getState().phase
    if (phase === 'playing') useGameStore.getState().pause()
  }

  private startLevel(levelId: string): void {
    if (!this.scene || !this.player) return
    // Nível customizado do editor tem prioridade sobre a campanha.
    const custom = useGameStore.getState().customLevel
    const definition = custom ?? LEVELS_BY_ID[levelId]
    if (!definition) return
    const parsed = this.levelLoader.parse(definition)

    this.clearLevel()
    this.collision.setWalls(parsed.walls)

    // Reaproveita a malha estática (paredes/chão/teto) já gerada para este nível.
    const groupKey = definition.id
    let group = this.levelGroupCache.get(groupKey)
    if (!group) {
      group = this.levelLoader.buildLevel(parsed)
      this.levelGroupCache.set(groupKey, group)
    }
    this.levelRoot = group
    this.scene.add(group)

    // Paredes que bloqueiam o raycast das armas.
    this.wallMeshes = []
    group.traverse(child => {
      if (child.userData.isWall) this.wallMeshes.push(child)
    })

    // Spawn de inimigos (a fábrica escolhe a classe certa por tipo).
    const difficulty = useGameStore.getState().difficulty
    const enemyHealthMult = DIFFICULTIES[difficulty].enemyHealth
    const waveIntervalMult = DIFFICULTIES[difficulty].waveIntervalMultiplier
    this.spawnedEnemyCount = 0
    this.waveTime = 0
    this.pendingWaves = [...(parsed.waves ?? [])]
      .map(wave => ({ ...wave, delay: wave.delay * waveIntervalMult }))
      .sort((a, b) => a.delay - b.delay)
    this.totalEnemiesToSpawn =
      parsed.enemySpawns.length + (parsed.waves ?? []).reduce((sum, wave) => sum + wave.count, 0)
    // Setor começa "não limpo": portas trancadas até zerar os inimigos.
    this.levelCleared = false
    this.boss = null
    this.bossDefeated = false
    this.bossDefeatActive = false
    this.bossDefeatTimer = 0
    this.bossDefeatAccum = 0
    this.lastBossPct = -1
    this.activeSummons = 0
    useGameStore.getState().setLevelCleared(false)
    useGameStore.getState().setBossBar(null)
    for (const spawn of parsed.enemySpawns) {
      const type = ENEMY_TYPES.find(t => t.id === spawn.enemyType) ?? ENEMY_TYPES[0]
      const enemy = createEnemy(type, spawn.x, spawn.z, enemyHealthMult)
      this.enemies.push(enemy)
      this.scene.add(enemy.mesh)
      this.spawnedEnemyCount++
      if (type.id === 'boss') this.boss = enemy
    }

    // Spawn de pickups.
    for (const spawn of parsed.pickups) {
      const pickup = new Pickup(spawn)
      this.pickups.push(pickup)
      this.scene.add(pickup.mesh)
    }

    // Luzes do nível (tochas / emergência) com leve flicker.
    for (const spec of parsed.lights) {
      const light = new THREE.PointLight(spec.color, spec.intensity, spec.distance, 2)
      light.position.set(spec.x, spec.y, spec.z)
      this.scene.add(light)
      this.levelLights.push({ light, base: spec.intensity, flicker: spec.flicker })
    }

    // Portas: estrutura simples com brilho emissivo (indica interatividade).
    // Destravam por setor limpo, por válvula (`requires`) ou pela morte do chefe.
    this.doorGlowMaterials = []
    this.doorLabels = []
    for (const door of parsed.doors) {
      const mesh = this.buildDoorMesh(
        door.x,
        door.z,
        door.secret,
        door.requires,
        door.bossLocked,
        door.label,
      )
      this.doorMeshes.push(mesh)
      this.scene.add(mesh)
    }

    // Válvulas/alavancas (destravam portas com `requires`).
    this.activatedLevers = new Set()
    this.leverGlowMaterials = []
    for (const lever of parsed.levers) {
      const mesh = this.buildLeverMesh(lever.x, lever.z)
      this.leverMeshes.push(mesh)
      this.scene.add(mesh)
    }
    this.refreshDoorStates()

    // Notas de lore (salas secretas).
    for (const note of parsed.notes) {
      const mesh = this.buildNoteMesh(note.x, note.z)
      this.noteMeshes.push(mesh)
      this.scene.add(mesh)
    }
    useGameStore.getState().setInteractableNote(false)
    useGameStore.getState().setNoteModal(null)

    // Atmosfera do nível (névoa/luz) sobre os defaults.
    this.applyAtmosphere(parsed.atmosphere)

    // Texto de abertura (se houver narrativa para este nível).
    const intro = LEVEL_INTROS[levelId]
    useGameStore.getState().setLevelIntro(intro ?? null)

    console.log(
      `[engine] nível '${parsed.name}': tochas=${this.levelLights.length}, ` +
        `inimigos fixos=${parsed.enemySpawns.length}, ondas=${parsed.waves.length}, ` +
        `portas=${parsed.doors.length}, válvulas=${parsed.levers.length}, notas=${parsed.notes.length}`,
    )

    this.player.spawn(parsed.playerSpawn)
    this.currentParsed = parsed
    this.currentLevelId = levelId

    // Zera o gatilho das armas ao trocar de nível.
    for (const weapon of Object.values(this.weapons)) weapon?.setTriggerHeld(false)
  }

  /** Monta o objeto 3D de uma porta (marco + plano luminoso + label). */
  private buildDoorMesh(
    x: number,
    z: number,
    secret: boolean,
    requires: string,
    bossLocked: boolean,
    label: string,
  ): THREE.Group {
    const group = new THREE.Group()
    const frameMat = new THREE.MeshStandardMaterial({
      color: secret ? 0x3a1a2a : bossLocked ? 0x3a3a20 : 0x2a2020,
      roughness: 0.9,
      metalness: 0.2,
    })
    const glowColor = secret ? 0xe04aff : 0x35e0c0
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x1a3a34,
      emissive: glowColor,
      emissiveIntensity: 0.2,
      roughness: 0.5,
    })
    this.doorGlowMaterials.push({ material: glowMat, secret, requires, bossLocked })

    const postGeo = new THREE.BoxGeometry(0.5, WALL_HEIGHT, 0.5)
    const left = new THREE.Mesh(postGeo, frameMat)
    left.position.set(x - 1.2, WALL_HEIGHT / 2, z)
    const right = new THREE.Mesh(postGeo, frameMat)
    right.position.set(x + 1.2, WALL_HEIGHT / 2, z)
    const lintelGeo = new THREE.BoxGeometry(3, 0.5, 0.5)
    const lintel = new THREE.Mesh(lintelGeo, frameMat)
    lintel.position.set(x, WALL_HEIGHT - 0.25, z)

    const planeGeo = new THREE.BoxGeometry(2.4, WALL_HEIGHT - 0.5, 0.12)
    const glow = new THREE.Mesh(planeGeo, glowMat)
    glow.position.set(x, (WALL_HEIGHT - 0.5) / 2, z)

    group.add(left, right, lintel, glow)

    // Label do destino (billboard), na cor da porta (teal/magenta).
    if (label) {
      const texture = this.createDoorLabelTexture(label, secret ? '#e04aff' : '#35e0c0')
      const mat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      })
      const sprite = new THREE.Sprite(mat)
      sprite.position.set(0, WALL_HEIGHT + 0.9, 0)
      const textScale = Math.min(6, Math.max(2.6, label.length * 0.22))
      sprite.scale.set(textScale, textScale * 0.19 + 0.35, 1)
      group.add(sprite)
      this.doorLabels.push({ material: mat, texture, x, z, secret, requires, bossLocked })
    }

    return group
  }

  /** Gera a textura de texto do label (com contorno escuro pra legibilidade). */
  private createDoorLabelTexture(text: string, color: string): THREE.CanvasTexture {
    const width = 256
    const height = 48
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      const texture = new THREE.CanvasTexture(canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      return texture
    }
    ctx.clearRect(0, 0, width, height)
    ctx.font = 'bold 30px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 7
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)'
    ctx.strokeText(text, width / 2, height / 2 + 2)
    ctx.fillStyle = color
    ctx.fillText(text, width / 2, height / 2 + 2)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  /** Monta o objeto 3D de uma válvula/alavanca (caixa com luz âmbar). */
  private buildLeverMesh(x: number, z: number): THREE.Group {
    const group = new THREE.Group()
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a30,
      roughness: 0.8,
      metalness: 0.3,
    })
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x3a2c1a,
      emissive: 0xffb04a,
      emissiveIntensity: 0.8,
      roughness: 0.5,
    })
    this.leverGlowMaterials.push(glowMat)

    const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.7), boxMat)
    box.position.set(x, 0.6, z)
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.5, 10), glowMat)
    valve.rotation.x = Math.PI / 2
    valve.position.set(x, 1.2, z)
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.3), glowMat)
    handle.position.set(x, 1.4, z)

    group.add(box, valve, handle)
    return group
  }

  /** Monta o objeto 3D de uma nota de lore (livro/rolo brilhante). */
  private buildNoteMesh(x: number, z: number): THREE.Group {
    const group = new THREE.Group()
    const cover = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.12, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.8, metalness: 0.1 }),
    )
    cover.position.y = 0.55
    const page = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.02, 0.3),
      new THREE.MeshStandardMaterial({
        color: 0xd8cfae,
        emissive: 0x8a7a4a,
        emissiveIntensity: 0.5,
        roughness: 0.7,
      }),
    )
    page.position.y = 0.62
    group.add(cover, page)
    group.position.set(x, 0, z)
    return group
  }

  /** Aplica a atmosfera do nível (névoa/luz) sobre os defaults do config. */
  private applyAtmosphere(atm: LevelAtmosphere): void {
    if (this.scene?.fog instanceof THREE.Fog) {
      this.scene.fog.color.setHex(atm.fogColor ?? LIGHTING_CONFIG.fogColor)
      this.scene.fog.near = atm.fogNear ?? LIGHTING_CONFIG.fogNear
      this.scene.fog.far = atm.fogFar ?? LIGHTING_CONFIG.fogFar
    }
    if (this.ambientLight) {
      this.ambientLight.color.setHex(atm.ambientColor ?? LIGHTING_CONFIG.ambientColor)
      this.ambientLight.intensity = atm.ambientIntensity ?? LIGHTING_CONFIG.ambientIntensity
    }
  }

  /** Regra de destravamento de uma porta: chefe morto > válvula > setor limpo. */
  private doorUnlocked(entry: { requires: string; bossLocked: boolean }): boolean {
    if (entry.bossLocked) return this.bossDefeated
    if (entry.requires) return this.activatedLevers.has(entry.requires)
    return useGameStore.getState().levelCleared
  }

  /** Aplica o estado de destravado de cada porta (chefe/válvula/setor). */
  private refreshDoorStates(): void {
    for (const entry of this.doorGlowMaterials) {
      const unlocked = this.doorUnlocked(entry)
      const bright = entry.secret ? 0xe04aff : 0x35e0c0
      const dim = entry.secret ? 0x7a1a52 : 0x1a6a5c
      entry.material.emissive.setHex(unlocked ? bright : dim)
      entry.material.emissiveIntensity = unlocked ? 0.9 : 0.18
    }
  }

  /** Pulso sutil no glow das portas destravadas (indica interatividade). */
  private pulseDoors(dt: number): void {
    if (this.doorGlowMaterials.length === 0) return
    this.flickerTime += dt
    const pulse = 0.7 + 0.3 * Math.sin(this.flickerTime * 3)
    for (const entry of this.doorGlowMaterials) {
      if (this.doorUnlocked(entry)) entry.material.emissiveIntensity = pulse
    }
  }

  /** Pulso sutil nas válvulas não ativadas (convida a interação). */
  private pulseLevers(dt: number): void {
    if (this.leverGlowMaterials.length === 0) return
    this.flickerTime += dt
    const pulse = 0.5 + 0.5 * Math.sin(this.flickerTime * 2.2)
    for (const material of this.leverGlowMaterials) {
      material.emissiveIntensity = 0.5 + pulse * 0.4
    }
  }

  /** Fade dos labels de porta pela distância e estado (trancado = mais sutil). */
  private updateDoorLabels(): void {
    if (this.doorLabels.length === 0 || !this.player) return
    const px = this.player.position.x
    const pz = this.player.position.z
    for (const entry of this.doorLabels) {
      const dist = Math.hypot(entry.x - px, entry.z - pz)
      const fade = Math.max(0, Math.min(1, (DOOR_LABEL_RANGE - dist) / DOOR_LABEL_FADE))
      const unlocked = this.doorUnlocked(entry)
      entry.material.opacity = fade * (unlocked ? 1 : 0.5)
    }
  }

  private clearLevel(): void {
    // A malha estática fica em cache (levelGroupCache) — aqui só sai da cena,
    // sem descartar geometria, para a próxima visita ser instantânea.
    if (this.levelRoot && this.scene) this.scene.remove(this.levelRoot)
    this.levelRoot = null
    this.wallMeshes = []
    for (const enemy of this.enemies) {
      this.scene?.remove(enemy.mesh)
      enemy.dispose()
    }
    this.enemies = []
    for (const pickup of this.pickups) {
      this.scene?.remove(pickup.mesh)
      pickup.dispose()
    }
    this.pickups = []
    for (const projectile of this.projectiles) {
      this.scene?.remove(projectile.mesh)
      projectile.dispose()
    }
    this.projectiles = []
    for (const rocket of this.rockets) {
      this.scene?.remove(rocket.mesh)
      rocket.dispose()
    }
    this.rockets = []
    for (const door of this.doorMeshes) {
      this.scene?.remove(door)
      door.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          const material = child.material
          if (Array.isArray(material)) material.forEach(m => m.dispose())
          else material.dispose()
        }
      })
    }
    this.doorMeshes = []
    this.doorGlowMaterials = []
    for (const entry of this.doorLabels) {
      entry.material.dispose()
      entry.texture.dispose()
    }
    this.doorLabels = []
    for (const lever of this.leverMeshes) {
      this.scene?.remove(lever)
      lever.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          const material = child.material
          if (Array.isArray(material)) material.forEach(m => m.dispose())
          else material.dispose()
        }
      })
    }
    this.leverMeshes = []
    for (const note of this.noteMeshes) {
      this.scene?.remove(note)
      note.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          const material = child.material
          if (Array.isArray(material)) material.forEach(m => m.dispose())
          else material.dispose()
        }
      })
    }
    this.noteMeshes = []
    this.leverGlowMaterials = []
    this.activatedLevers = new Set()
    this.pendingWaves = []
    this.waveTime = 0
    this.spawnedEnemyCount = 0
    this.totalEnemiesToSpawn = 0
    this.levelCleared = false
    useGameStore.getState().setInteractableDoor(null)
    useGameStore.getState().setInteractableLever(null)
    useGameStore.getState().setLevelCleared(false)
  }

  /** Descarta a geometria estática cacheada (usado apenas no dispose da engine). */
  private clearLevelGroupCache(): void {
    for (const group of this.levelGroupCache.values()) {
      group.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          const material = child.material
          if (Array.isArray(material)) material.forEach(m => m.dispose())
          else material.dispose()
        }
      })
    }
    this.levelGroupCache.clear()
  }

  private clearAllLights(): void {
    for (const entry of this.levelLights) {
      this.scene?.remove(entry.light)
      entry.light.dispose()
    }
    this.levelLights = []
    for (const entry of this.effectLights) {
      this.scene?.remove(entry.light)
      entry.light.dispose()
    }
    this.effectLights = []
  }
}
