import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { WallAABB } from '../core/CollisionSystem'
import { LIGHTING_CONFIG } from '../core/lighting.config'
import { clonedCeilingTexture, clonedFloorTexture, clonedWallTexture } from '../core/Textures'

export const TILE_SIZE = 6 // metros por célula do grid
export const WALL_HEIGHT = 3.2

export interface LevelDefinition {
  id: string
  name: string
  /** Grid visto de cima; cada caractere é uma célula de TILE_SIZE x TILE_SIZE. */
  grid: string[]
  /** Portas (saídas): cada 'D' do grid recebe um marcador D1, D2... em ordem de varredura. */
  doors?: DoorDefinition[]
  /** Válvulas/alavancas: cada 'V' do grid recebe um marcador V1, V2... */
  levers?: LeverDefinition[]
  /** Ondas de inimigos que surgem ao longo do tempo (opcional). */
  waves?: WaveDefinition[]
  /** Pontos de surgimento das ondas, em coordenadas de mundo (opcional). */
  waveSpawns?: Array<{ x: number; z: number }>
  /** Atmosfera específica do nível (névoa/luz) — opcional. */
  atmosphere?: LevelAtmosphere
}

export interface DoorDefinition {
  /** 'D1', 'D2', ... — corresponde às células 'D' do grid, em ordem de varredura. */
  marker: string
  /** Id do nível de destino. Vazio = porta inerte. */
  targetLevelId: string
  /** Nome exibido no prompt de interação. */
  label?: string
  /** Sala secreta: glow magenta (sutil), fora da progressão principal. */
  secret?: boolean
  /** Marcador de válvula ('V1', ...) que precisa ser ativada para destravar. */
  requires?: string
  /** Porta trancada até o chefe da fase morrer (ex.: saída da arena do boss). */
  bossLocked?: boolean
}

export interface LeverDefinition {
  /** 'V1', 'V2', ... — corresponde às células 'V' do grid, em ordem de varredura. */
  marker: string
  /** Nome exibido no prompt de interação. */
  label?: string
}

/** Variações de atmosfera por nível (névoa/luz) — suaves, sobre o base. */
export interface LevelAtmosphere {
  fogColor?: number
  fogNear?: number
  fogFar?: number
  ambientColor?: number
  ambientIntensity?: number
}

export interface ParsedDoor {
  marker: string
  x: number
  z: number
  targetLevelId: string
  label: string
  secret: boolean
  requires: string
  bossLocked: boolean
}

export interface ParsedLever {
  marker: string
  x: number
  z: number
  label: string
}

export interface WaveDefinition {
  enemyType: string
  count: number
  /** Segundos após o início do nível até a onda começar. */
  delay: number
}

export interface EnemySpawn {
  x: number
  z: number
  enemyType: string
}

export interface PickupSpawn {
  x: number
  z: number
  kind: 'health' | 'ammo' | 'currency'
}

export interface LightSpec {
  x: number
  z: number
  y: number
  color: number
  intensity: number
  distance: number
  flicker: boolean
}

export interface ParsedLevel {
  id: string
  name: string
  walls: WallAABB[]
  playerSpawn: { x: number; z: number; yaw: number }
  enemySpawns: EnemySpawn[]
  pickups: PickupSpawn[]
  lights: LightSpec[]
  doors: ParsedDoor[]
  levers: ParsedLever[]
  notes: Array<{ x: number; z: number }>
  waves: WaveDefinition[]
  waveSpawns: Array<{ x: number; z: number }>
  atmosphere: LevelAtmosphere
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
}

const CHAR_WALL = '#'
const CHAR_PLAYER = 'P'
const CHAR_ENEMY = 'E'
const CHAR_SHOOTER = 'S'
const CHAR_KAMIKAZE = 'K'
const CHAR_TANK = 'T'
const CHAR_BOSS = 'B'
const CHAR_HEALTH = 'H'
const CHAR_AMMO = 'A'
const CHAR_CURRENCY = 'C'
const CHAR_LIGHT = 'F'
const CHAR_DOOR = 'D'
const CHAR_LEVER = 'V'
const CHAR_NOTE = 'N'

/**
 * Constrói os dados de colisão (AABBs) e a geometria do nível a partir
 * de um grid de texto. Os spawns ficam no centro da célula.
 */
export class LevelLoader {
  parse(definition: LevelDefinition): ParsedLevel {
    const walls: WallAABB[] = []
    const enemySpawns: EnemySpawn[] = []
    const pickups: PickupSpawn[] = []
    const lights: LightSpec[] = []
    const doors: ParsedDoor[] = []
    const levers: ParsedLever[] = []
    const notes: Array<{ x: number; z: number }> = []
    let playerSpawn = { x: TILE_SIZE, z: TILE_SIZE, yaw: 0 }

    const rows = definition.grid.length
    const cols = Math.max(...definition.grid.map(row => row.length))

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < definition.grid[row].length; col++) {
        const char = definition.grid[row][col]
        const x = col * TILE_SIZE
        const z = row * TILE_SIZE
        switch (char) {
          case CHAR_WALL:
            walls.push({ minX: x, maxX: x + TILE_SIZE, minZ: z, maxZ: z + TILE_SIZE })
            break
          case CHAR_PLAYER:
            playerSpawn = { x: x + TILE_SIZE / 2, z: z + TILE_SIZE / 2, yaw: 0 }
            break
          case CHAR_ENEMY:
            enemySpawns.push({ x: x + TILE_SIZE / 2, z: z + TILE_SIZE / 2, enemyType: 'chaser' })
            break
          case CHAR_SHOOTER:
            enemySpawns.push({ x: x + TILE_SIZE / 2, z: z + TILE_SIZE / 2, enemyType: 'shooter' })
            break
          case CHAR_KAMIKAZE:
            enemySpawns.push({ x: x + TILE_SIZE / 2, z: z + TILE_SIZE / 2, enemyType: 'kamikaze' })
            break
          case CHAR_TANK:
            enemySpawns.push({ x: x + TILE_SIZE / 2, z: z + TILE_SIZE / 2, enemyType: 'tank' })
            break
          case CHAR_BOSS:
            enemySpawns.push({ x: x + TILE_SIZE / 2, z: z + TILE_SIZE / 2, enemyType: 'boss' })
            break
          case CHAR_HEALTH:
            pickups.push({ x: x + TILE_SIZE / 2, z: z + TILE_SIZE / 2, kind: 'health' })
            break
          case CHAR_AMMO:
            pickups.push({ x: x + TILE_SIZE / 2, z: z + TILE_SIZE / 2, kind: 'ammo' })
            break
          case CHAR_CURRENCY:
            pickups.push({ x: x + TILE_SIZE / 2, z: z + TILE_SIZE / 2, kind: 'currency' })
            break
          case CHAR_LIGHT:
            lights.push({
              x: x + TILE_SIZE / 2,
              z: z + TILE_SIZE / 2,
              y: LIGHTING_CONFIG.torchHeight,
              color: LIGHTING_CONFIG.torchColor,
              intensity: LIGHTING_CONFIG.torchIntensity,
              distance: LIGHTING_CONFIG.torchDistance,
              flicker: true,
            })
            break
          case CHAR_DOOR: {
            // Marcador D1, D2... em ordem de varredura (linha, depois coluna).
            const marker = `D${doors.length + 1}`
            const config = (definition.doors ?? []).find(door => door.marker === marker)
            doors.push({
              marker,
              x: x + TILE_SIZE / 2,
              z: z + TILE_SIZE / 2,
              targetLevelId: config?.targetLevelId ?? '',
              label: config?.label || config?.targetLevelId || '',
              secret: config?.secret ?? false,
              requires: config?.requires ?? '',
              bossLocked: config?.bossLocked ?? false,
            })
            break
          }
          case CHAR_LEVER: {
            const marker = `V${levers.length + 1}`
            const config = (definition.levers ?? []).find(lever => lever.marker === marker)
            levers.push({
              marker,
              x: x + TILE_SIZE / 2,
              z: z + TILE_SIZE / 2,
              label: config?.label || 'Válvula de emergência',
            })
            break
          }
          case CHAR_NOTE:
            notes.push({ x: x + TILE_SIZE / 2, z: z + TILE_SIZE / 2 })
            break
        }
      }
    }

    return {
      id: definition.id,
      name: definition.name,
      walls,
      playerSpawn,
      enemySpawns,
      pickups,
      lights,
      doors,
      levers,
      notes,
      waves: definition.waves ?? [],
      waveSpawns: definition.waveSpawns ?? [],
      atmosphere: definition.atmosphere ?? {},
      bounds: { minX: 0, maxX: cols * TILE_SIZE, minZ: 0, maxZ: rows * TILE_SIZE },
    }
  }

  /** Gera a malha estática do nível (paredes, chão e teto) em um único Group. */
  buildLevel(parsed: ParsedLevel): THREE.Group {
    const group = new THREE.Group()

    const wallGeometries: THREE.BufferGeometry[] = []
    for (const wall of parsed.walls) {
      const width = wall.maxX - wall.minX
      const depth = wall.maxZ - wall.minZ
      const geo = new THREE.BoxGeometry(width, WALL_HEIGHT, depth)
      geo.translate(wall.minX + width / 2, WALL_HEIGHT / 2, wall.minZ + depth / 2)
      wallGeometries.push(geo)
    }

    if (wallGeometries.length > 0) {
      // Junta todas as paredes em uma única geometria: menos draw calls.
      const merged = mergeGeometries(wallGeometries)
      if (merged) {
        const wallTexture = clonedWallTexture(2, 2)
        const material = new THREE.MeshStandardMaterial({
          map: wallTexture,
          roughness: 0.9,
          metalness: 0.05,
        })
        const wallMesh = new THREE.Mesh(merged, material)
        // Marca para a engine coletar e usar como bloqueador no raycast.
        wallMesh.userData.isWall = true
        group.add(wallMesh)
      }
    }
    for (const geo of wallGeometries) geo.dispose()

    const { bounds } = parsed
    const tileRepeat = Math.max(1, Math.round(bounds.maxX / 6))
    const floorTexture = clonedFloorTexture(tileRepeat, Math.max(1, Math.round(bounds.maxZ / 6)))
    const floorGeo = new THREE.PlaneGeometry(bounds.maxX, bounds.maxZ)
    floorGeo.rotateX(-Math.PI / 2)
    const floor = new THREE.Mesh(
      floorGeo,
      new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.95, metalness: 0 }),
    )
    floor.position.set(bounds.maxX / 2, 0, bounds.maxZ / 2)
    group.add(floor)

    const ceilingTexture = clonedCeilingTexture(
      tileRepeat,
      Math.max(1, Math.round(bounds.maxZ / 6)),
    )
    const ceilingGeo = new THREE.PlaneGeometry(bounds.maxX, bounds.maxZ)
    ceilingGeo.rotateX(Math.PI / 2)
    const ceiling = new THREE.Mesh(
      ceilingGeo,
      new THREE.MeshStandardMaterial({ map: ceilingTexture, roughness: 1, metalness: 0 }),
    )
    ceiling.position.set(bounds.maxX / 2, WALL_HEIGHT, bounds.maxZ / 2)
    group.add(ceiling)

    return group
  }
}
