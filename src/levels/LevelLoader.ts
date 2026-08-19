import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { WallAABB } from '../core/CollisionSystem'
import { LIGHTING_CONFIG } from '../core/lighting.config'
import type { LevelTextures } from '../core/LevelTextureLoader'

export const TILE_SIZE = 6 // metros por célula do grid
export const WALL_HEIGHT = 5.0
/** Distância da parede adjacente para encostar o cresset (tocha de corredor). */
const CRESSET_WALL_OFFSET = 0.5
/** Distância da face da parede para encostar o CENTRO do plano da porta.
 *  O sprite é paralelo à parede (virado para o ambiente aberto), então o
 *  centro precisa ficar NA face dela; um offset mínimo evita z-fighting
 *  com a caixa da parede (a porta fica rente, sem espaço vazio). */
const DOOR_WALL_OFFSET = 0.05

/** Direções de parede candidatas, em ordem de prioridade de desempate.
 *  Cada entrada: direção, delta (linha, coluna), rotação Y da porta (rad),
 *  face da parede onde o centro da porta deve ficar (coordenada de mundo). */
const DOOR_WALL_CANDIDATES = [
  { dir: 'below', dr: 1, dc: 0, rot: Math.PI,     faceX: null, faceZ: (r: number) => (r + 1) * TILE_SIZE - DOOR_WALL_OFFSET }, // parede abaixo → face norte
  { dir: 'above', dr: -1, dc: 0, rot: 0,          faceX: null, faceZ: (r: number) => r * TILE_SIZE + DOOR_WALL_OFFSET },     // parede acima  → face sul
  { dir: 'right', dr: 0, dc: 1, rot: -Math.PI/2,  faceX: (c: number) => (c + 1) * TILE_SIZE - DOOR_WALL_OFFSET, faceZ: null }, // parede à dir. → face oeste
  { dir: 'left',  dr: 0, dc: -1, rot: Math.PI/2,  faceX: (c: number) => c * TILE_SIZE + DOOR_WALL_OFFSET, faceZ: null },      // parede à esq. → face leste
] as const

/** Tipos de wall válidos para portas. */
type DoorWallDir = 'below' | 'above' | 'right' | 'left'

/**
 * Determina a parede única onde a porta deve ser embutida, calcula posição
 * (rente à face da parede) e rotação (face voltada para o lado aberto).
 *
 * Regra sistemática:
 * 1. Coleta paredes adjacentes ('#') nas 4 direções.
 * 2. Filtra apenas as que têm espaço aberto (não '#') do lado oposto —
 *    a porta deve virar para onde se anda, não para a parede.
 * 3. Se houver várias candidatas válidas, usa prioridade fixa S→N→E→O
 *    (below → above → right → left) para escolha determinística.
 * 4. Se nenhuma tem espaço aberto (porta num canto fechado), cai no primeiro
 *    candidato da lista de prioridade (garante determinismo).
 * 5. Retorna { x, z, rotationY, chosenWall }.
 */
export function computeDoorPlacement(
  grid: string[],
  row: number,
  col: number,
): { x: number; z: number; rotationY: number; chosenWall: DoorWallDir | 'none'; wallFaceX?: number; wallFaceZ?: number; doorCenterX: number; doorCenterZ: number } {
  const rows = grid.length
  const cols = grid[0].length
  const cx = col * TILE_SIZE + TILE_SIZE / 2
  const cz = row * TILE_SIZE + TILE_SIZE / 2

  // Identifica quais das 4 direções têm parede adjacente
  const hasWall: Record<DoorWallDir, boolean> = {
    below: row < rows - 1 && grid[row + 1]?.[col] === '#',
    above: row > 0 && grid[row - 1][col] === '#',
    right: col < cols - 1 && grid[row][col + 1] === '#',
    left:  col > 0 && grid[row][col - 1] === '#',
  }

  const candidates = DOOR_WALL_CANDIDATES.filter(c => hasWall[c.dir])

  // Sem parede adjacente → porta flutuante (centralizada, olha para sul)
  if (candidates.length === 0) {
    return { x: cx, z: cz, rotationY: 0, chosenWall: 'none', doorCenterX: cx, doorCenterZ: cz }
  }

  // Para cada candidata, verifica se o lado oposto é andável (não '#')
  const withOpenSide = candidates.map(c => {
    const checkR = row + c.dr
    const checkC = col + c.dc
    const open = checkR >= 0 && checkR < rows && checkC >= 0 && checkC < cols && grid[checkR][checkC] !== '#'
    return { ...c, open }
  })

  // Prefere paredes com lado aberto; se várias, prioridade S→N→E→O (ordem do array)
  const valid = withOpenSide.filter(c => c.open)
  const chosen = (valid.length > 0 ? valid : withOpenSide)[0]

  // Calcula posição rente à face da parede escolhida
  const x = chosen.faceX ? chosen.faceX(col) : cx
  const z = chosen.faceZ ? chosen.faceZ(row) : cz

  return {
    x,
    z,
    rotationY: chosen.rot,
    chosenWall: chosen.dir,
    wallFaceX: chosen.faceX ? chosen.faceX(col) : undefined,
    wallFaceZ: chosen.faceZ ? chosen.faceZ(row) : undefined,
    doorCenterX: cx,
    doorCenterZ: cz,
  }
}

/**
 * Calcula as posições dos dois cressets que flanqueiam uma porta na mesma parede.
 * Retorna array com 0, 1 ou 2 posições dependendo do espaço disponível na parede.
 * Para portas flutuantes (sem parede adjacente), coloca cressets nas laterais
 * perpendiculares ao sentido da porta (padrão: virada para sul → cressets a E/W).
 */
export function computeDoorCressets(
  grid: string[],
  row: number,
  col: number,
  doorPlacement: ReturnType<typeof computeDoorPlacement>
): Array<{ x: number; z: number; mounted: boolean }> {
  const rows = grid.length
  const cols = grid[0].length
  const wallDir = doorPlacement.chosenWall
  const results: Array<{ x: number; z: number; mounted: boolean }> = []

  // Distância do centro da porta até o centro do cresset (metros)
  // Porta tem 2.4m de largura; 2.5m do centro = ~1.3m da borda da porta
  const CRESSET_DOOR_OFFSET = 2.5

  // Verifica continuidade da parede nas células adjacentes ao longo da parede
  function hasWallAt(r: number, c: number): boolean {
    return r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === '#'
  }

  // Porta flutuante (sem parede adjacente): coloca cressets nas laterais
  // perpendiculares ao sentido da porta (rotationY). Padrão: virada para sul (0)
  // → cressets a leste (+X) e oeste (-X) do centro da porta.
  if (wallDir === 'none') {
    const rot = doorPlacement.rotationY
    const cx = doorPlacement.doorCenterX
    const cz = doorPlacement.doorCenterZ

    // Para rotação 0 (sul), laterais são ±X; para PI/2 (leste), laterais são ±Z; etc.
    const dx = Math.cos(rot + Math.PI / 2) * CRESSET_DOOR_OFFSET
    const dz = Math.sin(rot + Math.PI / 2) * CRESSET_DOOR_OFFSET

    results.push(
      { x: cx + dx, z: cz + dz, mounted: false },
      { x: cx - dx, z: cz - dz, mounted: false },
    )
    return results
  }

  // Porta embutida em parede: cressets ao longo da parede
  if (wallDir === 'above' || wallDir === 'below') {
    // Parede horizontal (norte-sul): cressets à esquerda e direita do centro da porta
    const wallZ = doorPlacement.wallFaceZ!
    const doorCenterX = doorPlacement.doorCenterX

    // Lado esquerdo (menor X): verifica célula à esquerda
    const leftCol = col - 1
    const checkRow = wallDir === 'above' ? row - 1 : row + 1
    if (hasWallAt(checkRow, leftCol) || hasWallAt(checkRow, col)) {
      results.push({
        x: doorCenterX - CRESSET_DOOR_OFFSET,
        z: wallZ,
        mounted: true,
      })
    }

    // Lado direito (maior X): verifica célula à direita
    const rightCol = col + 1
    if (hasWallAt(checkRow, rightCol) || hasWallAt(checkRow, col)) {
      results.push({
        x: doorCenterX + CRESSET_DOOR_OFFSET,
        z: wallZ,
        mounted: true,
      })
    }
  } else if (wallDir === 'left' || wallDir === 'right') {
    // Parede vertical (leste-oeste): cressets acima e abaixo do centro da porta
    const wallX = doorPlacement.wallFaceX!
    const doorCenterZ = doorPlacement.doorCenterZ

    // Lado "acima" (menor Z): verifica célula acima
    const upRow = row - 1
    const checkCol = wallDir === 'left' ? col - 1 : col + 1
    if (hasWallAt(upRow, checkCol) || hasWallAt(row, checkCol)) {
      results.push({
        x: wallX,
        z: doorCenterZ - CRESSET_DOOR_OFFSET,
        mounted: true,
      })
    }

    // Lado "abaixo" (maior Z): verifica célula abaixo
    const downRow = row + 1
    if (hasWallAt(downRow, checkCol) || hasWallAt(row, checkCol)) {
      results.push({
        x: wallX,
        z: doorCenterZ + CRESSET_DOOR_OFFSET,
        mounted: true,
      })
    }
  }

  return results
}

/** Converte um id de nível técnico ("level-4b-secret") em texto legível para
 *  exibição quando a porta não tem label configurado. */
export function humanizeLevelId(levelId: string): string {
  return levelId
    .replace(/^level-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

/** Ajusta as UVs de uma caixa para que a textura tila a cada `tileSize` metros,
 *  evitando esticamento em paredes de comprimentos variados. */
function scaleBoxUVs(
  geometry: THREE.BoxGeometry,
  width: number,
  depth: number,
  height: number,
  tileSize: number,
): void {
  const uv = geometry.getAttribute('uv')
  const index = geometry.getIndex()
  if (!index) return

  const repeatX = Math.max(1, Math.round(width / tileSize))
  const repeatZ = Math.max(1, Math.round(depth / tileSize))
  const repeatY = Math.max(1, Math.round(height / tileSize))

  // BoxGeometry: cada face tem seu próprio grupo (px,nx,py,ny,pz,nz).
  const faceRanges = [
    { x: repeatZ, y: repeatY }, // faces laterais (normal ±X) usam largura=depth
    { x: repeatZ, y: repeatY }, // (segunda face X)
    { x: repeatX, y: repeatZ }, // topo/fundo (normal ±Y)
    { x: repeatX, y: repeatZ }, // (segunda face Y)
    { x: repeatX, y: repeatY }, // frente/trás (normal ±Z)
    { x: repeatX, y: repeatY }, // (segunda face Z)
  ]

  for (let g = 0; g < geometry.groups.length; g++) {
    const group = geometry.groups[g]
    const scale = faceRanges[g % faceRanges.length]
    for (let i = group.start; i < group.start + group.count; i++) {
      const vertexIndex = index.getX(i)
      uv.setXY(
        vertexIndex,
        uv.getX(vertexIndex) * scale.x,
        uv.getY(vertexIndex) * scale.y,
      )
    }
  }
  uv.needsUpdate = true
}

/** Definição de um andar/piso de nível multi-andar (novo formato). */
export interface FloorDefinition {
  /** Identificador único do andar (ex.: 'floor-1'). */
  id: string
  /** Nome opcional para exibição (ex.: 'Térreo'). */
  name?: string
  /** Grid 2D do andar (mesmos caracteres do formato legado). */
  grid: string[]
  /** Altura base do piso (Y), em metros. */
  height: number
  /** Portas exclusivas do andar (opcional). */
  doors?: DoorDefinition[]
  /** Válvulas/alavancas exclusivas do andar (opcional). */
  levers?: LeverDefinition[]
  /** Atmosfera específica do andar (opcional). */
  atmosphere?: LevelAtmosphere
}

/** Definição de uma escada entre andares (novo formato). */
export interface StairDefinition {
  /** Identificador único da escada. */
  id: string
  /** ID do andar de origem. */
  fromFloor: string
  /** ID do andar de destino. */
  toFloor: string
  /** Marcador no grid de origem (ex.: 'L1'). */
  fromMarker: string
  /** Marcador no grid de destino (ex.: 'l1'). */
  toMarker: string
  /** Direção da escada. */
  direction: 'up' | 'down'
}

export interface LevelDefinition {
  id: string
  name: string
  /** Grid visto de cima; cada caractere é uma célula de TILE_SIZE x TILE_SIZE.
   *  Presente no formato legado (andar único); ausente em níveis com `floors`
   *  (o conteúdo vive em cada `FloorDefinition.grid`). */
  grid?: string[]
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
  /** Novo formato multi-andar: andares do nível (opcional; se presente, usa
   *  parseMultiFloor e o grid raiz fica vazio). */
  floors?: FloorDefinition[]
  /** Novo formato multi-andar: escadas entre os andares (opcional). */
  stairs?: StairDefinition[]
  /** Novo formato multi-andar: andar inicial (padrão: primeiro andar). */
  startFloorId?: string
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

/** Variações de atmosfera por nível (névoa/luz) — suaves, sobre o base.
 *  IMPORTANTE: a calibração da tocha (cresset) é ÚNICA e central em
 *  LIGHTING_CONFIG — não deve ser sobrescrita aqui por tema/nível. */
export interface LevelAtmosphere {
  fogColor?: number
  fogNear?: number
  fogFar?: number
  ambientColor?: number
  ambientIntensity?: number
  hemisphereSky?: number
  hemisphereGround?: number
  hemisphereIntensity?: number
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
  /** Rotação em Y (rad) do plano da porta para encarar o ambiente aberto. */
  rotationY: number
}

export interface ParsedLever {
  marker: string
  x: number
  z: number
  label: string
}

/** Escada já posicionada no grid (par resultado do cruzamento dos marcadores
 *  'L'/'l' com a configuração `stairs`). Uma entrada por lado: o marcador 'L'
 *  vira uma entrada com destino no 'l', e o 'l' vira uma entrada de volta. */
export interface ParsedStair {
  id: string
  /** Andar onde fica a ENTRADA desta escada. */
  floorId: string
  /** Andar de destino. */
  targetFloorId: string
  /** Posição da entrada (centro da célula do marcador). */
  x: number
  z: number
  /** Posição de chegada no andar de destino (centro do marcador parceiro). */
  targetX: number
  targetZ: number
  /** 'up' = sobe do andar atual; 'down' = desce. */
  direction: 'up' | 'down'
  /** Marcador do grid (ex.: 'L1'/'l1'). */
  marker: string
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

export interface CressetSpawn {
  x: number
  z: number
  /** true = montado na parede, false = em pé no chão. */
  mounted: boolean
  /** Cor e intensidade da PointLight embutida (cresset = única fonte de tocha).
   *  Valores centrais (LIGHTING_CONFIG) — calibração oficial, sem overrides. */
  color: number
  intensity: number
  distance: number
  decay: number
  /** Altura da chama VISUAL (a partícula de fogo nasce a 1.78 m). */
  flameHeight: number
  /** Altura da ORIGEM da luz (acima da chama, subindo ao teto). */
  lightHeight: number
}

export interface ParsedFloor {
  id: string
  name: string
  /** Altura base do piso (Y), em metros. */
  height: number
  walls: WallAABB[]
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  /** Spawn do jogador definido neste andar (P); ausente se não houver. */
  playerSpawn?: { x: number; z: number; yaw: number }
  /** Entradas de escada localizadas neste andar (marcadores L/l). */
  stairs?: ParsedStair[]
}

export interface ParsedLevel {
  id: string
  name: string
  walls: WallAABB[]
  playerSpawn: { x: number; z: number; yaw: number }
  enemySpawns: EnemySpawn[]
  pickups: PickupSpawn[]
  /** Cressets ('X'): cada um carrega a própria PointLight embutida. */
  cressets: CressetSpawn[]
  doors: ParsedDoor[]
  levers: ParsedLever[]
  notes: Array<{ x: number; z: number }>
  waves: WaveDefinition[]
  waveSpawns: Array<{ x: number; z: number }>
  atmosphere: LevelAtmosphere
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  /** Escadas posicionadas (entradas nos respectivos andares). */
  stairs: ParsedStair[]
  /** Multi-andar: andares parseados (ausente no formato legado). */
  floors?: ParsedFloor[]
  /** Multi-andar: andar ativo inicial (ausente no formato legado). */
  startFloorId?: string
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
const CHAR_CRESSET = 'X'
const CHAR_DOOR = 'D'
const CHAR_LEVER = 'V'
const CHAR_NOTE = 'N'
const CHAR_STAIR_UP = 'L'
const CHAR_STAIR_DOWN = 'l'

/**
 * Constrói os dados de colisão (AABBs) e a geometria do nível a partir
 * de um grid de texto. Os spawns ficam no centro da célula.
 */
export class LevelLoader {
  /**
   * Suporta os dois formatos: se a definição tem `floors` usa o parser
   * multi-andar; caso contrário, usa o parser legado (andar único) — sem
   * nenhuma mudança de comportamento para os níveis existentes.
   */
  parse(definition: LevelDefinition): ParsedLevel {
    if (definition.floors && definition.floors.length > 0) {
      return this.parseMultiFloor(definition)
    }
    return this.parseLegacy(definition)
  }

  /**
   * Parser legado (andar único): comportamento atual, inalterado.
   */
  private parseLegacy(definition: LevelDefinition): ParsedLevel {
    const walls: WallAABB[] = []
    const enemySpawns: EnemySpawn[] = []
    const pickups: PickupSpawn[] = []
    const cressets: CressetSpawn[] = []
    const doors: ParsedDoor[] = []
    const levers: ParsedLever[] = []
    const notes: Array<{ x: number; z: number }> = []
    let playerSpawn = { x: TILE_SIZE, z: TILE_SIZE, yaw: 0 }

    // O parser legado só é chamado quando não há `floors`; ainda assim o grid
    // é opcional no tipo — ausência vira nível vazio (seguro, sem crash).
    const grid = definition.grid ?? []
    const rows = grid.length
    const cols = Math.max(...grid.map(row => row.length))

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const char = grid[row][col]
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
          case CHAR_CRESSET: {
            const cx = x + TILE_SIZE / 2
            const cz = z + TILE_SIZE / 2
            const wallAbove = row > 0 && grid[row - 1][col] === '#'
            const wallBelow = row < rows - 1 && grid[row + 1]?.[col] === '#'
            const wallLeft = col > 0 && grid[row][col - 1] === '#'
            const wallRight = col < grid[row].length - 1 && grid[row][col + 1] === '#'
            // Desloca o cresset para perto da parede adjacente (como uma tocha
            // de corredor), em vez de deixá-lo no centro da célula obstruindo
            // o caminho. Sem parede ao lado, mantém centralizado.
            let fx = cx
            let fz = cz
            if (wallLeft && !wallRight) fx = x + CRESSET_WALL_OFFSET
            else if (wallRight && !wallLeft) fx = x + TILE_SIZE - CRESSET_WALL_OFFSET
            if (wallAbove && !wallBelow) fz = z + CRESSET_WALL_OFFSET
            else if (wallBelow && !wallAbove) fz = z + TILE_SIZE - CRESSET_WALL_OFFSET
            // Calibração oficial da tocha — sempre os valores centrais de
            // LIGHTING_CONFIG, nunca sobrescrita por tema/nível.
            cressets.push({
              x: fx,
              z: fz,
              // Montado na parede se toca um '#'; senão, em pé no chão.
              mounted: wallAbove || wallBelow || wallLeft || wallRight,
              // Luz embutida: o cresset é a única fonte de tocha do jogo.
              color: LIGHTING_CONFIG.torchColor,
              intensity: LIGHTING_CONFIG.torchIntensity,
              distance: LIGHTING_CONFIG.torchDistance,
              decay: LIGHTING_CONFIG.torchDecay,
              flameHeight: LIGHTING_CONFIG.torchFlameHeight,
              lightHeight: LIGHTING_CONFIG.torchLightHeight,
            })
            break
          }
          case CHAR_DOOR: {
            // Marcador D1, D2... em ordem de varredura (linha, depois coluna).
            const marker = `D${doors.length + 1}`
            const config = (definition.doors ?? []).find(door => door.marker === marker)
            const doorPlacement = computeDoorPlacement(grid, row, col)
            doors.push({
              marker,
              x: doorPlacement.x,
              z: doorPlacement.z,
              targetLevelId: config?.targetLevelId ?? '',
              label: config?.label || humanizeLevelId(config?.targetLevelId ?? ''),
              secret: config?.secret ?? false,
              requires: config?.requires ?? '',
              bossLocked: config?.bossLocked ?? false,
              rotationY: doorPlacement.rotationY,
            })

            // Adiciona dois cressets flanqueando a porta na mesma parede
            const doorCressets = computeDoorCressets(grid, row, col, doorPlacement)
            for (const cr of doorCressets) {
              cressets.push({
                x: cr.x,
                z: cr.z,
                mounted: cr.mounted,
                color: LIGHTING_CONFIG.torchColor,
                intensity: LIGHTING_CONFIG.torchIntensity,
                distance: LIGHTING_CONFIG.torchDistance,
                decay: LIGHTING_CONFIG.torchDecay,
                flameHeight: LIGHTING_CONFIG.torchFlameHeight,
                lightHeight: LIGHTING_CONFIG.torchLightHeight,
              })
            }
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
      cressets,
      doors,
      levers,
      notes,
      waves: definition.waves ?? [],
      waveSpawns: definition.waveSpawns ?? [],
      atmosphere: definition.atmosphere ?? {},
      stairs: [],
      bounds: { minX: 0, maxX: cols * TILE_SIZE, minZ: 0, maxZ: rows * TILE_SIZE },
    }
  }

  /**
   * Parser multi-andar (novo formato): para cada andar extrai paredes (com
   * `floorId`), spawn do jogador ('P') e limites; o nível inteiro usa o spawn
   * do andar inicial. Nesta fase não há inimigos, portas, cressets, alavancas,
   * pickups nem notas por andar — o foco é o teste estrutural isolado (§9).
   */
  private parseMultiFloor(definition: LevelDefinition): ParsedLevel {
    // Células de escada por andar: key = `${floorId}:${marker}`.
    const stairCells = new Map<string, { x: number; z: number }>()

    const floors: ParsedFloor[] = (definition.floors ?? []).map(floor => {
      const walls: WallAABB[] = []
      let playerSpawn: { x: number; z: number; yaw: number } | undefined
      const grid = floor.grid
      const rows = grid.length
      const cols = Math.max(1, ...grid.map(row => row.length))
      let stairUpCount = 0
      let stairDownCount = 0

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < grid[row].length; col++) {
          const char = grid[row][col]
          const x = col * TILE_SIZE
          const z = row * TILE_SIZE
          if (char === CHAR_WALL) {
            walls.push({
              minX: x,
              maxX: x + TILE_SIZE,
              minZ: z,
              maxZ: z + TILE_SIZE,
              floorId: floor.id,
            })
          } else if (char === CHAR_PLAYER) {
            playerSpawn = { x: x + TILE_SIZE / 2, z: z + TILE_SIZE / 2, yaw: 0 }
          } else if (char === CHAR_STAIR_UP) {
            stairUpCount++
            stairCells.set(`${floor.id}:L${stairUpCount}`, {
              x: x + TILE_SIZE / 2,
              z: z + TILE_SIZE / 2,
            })
          } else if (char === CHAR_STAIR_DOWN) {
            stairDownCount++
            stairCells.set(`${floor.id}:l${stairDownCount}`, {
              x: x + TILE_SIZE / 2,
              z: z + TILE_SIZE / 2,
            })
          }
        }
      }

      return {
        id: floor.id,
        name: floor.name ?? humanizeLevelId(floor.id),
        height: floor.height,
        walls,
        playerSpawn,
        bounds: { minX: 0, maxX: cols * TILE_SIZE, minZ: 0, maxZ: rows * TILE_SIZE },
      }
    })

    // Monta as escadas: cada stair do grid vira duas entradas (ida e volta).
    const stairs: ParsedStair[] = []
    for (const stairDef of definition.stairs ?? []) {
      const from = stairCells.get(`${stairDef.fromFloor}:${stairDef.fromMarker}`)
      const to = stairCells.get(`${stairDef.toFloor}:${stairDef.toMarker}`)
      if (!from || !to) continue
      stairs.push({
        id: stairDef.id,
        floorId: stairDef.fromFloor,
        targetFloorId: stairDef.toFloor,
        x: from.x,
        z: from.z,
        targetX: to.x,
        targetZ: to.z,
        direction: stairDef.direction,
        marker: stairDef.fromMarker,
      })
      stairs.push({
        id: `${stairDef.id}-reverse`,
        floorId: stairDef.toFloor,
        targetFloorId: stairDef.fromFloor,
        x: to.x,
        z: to.z,
        targetX: from.x,
        targetZ: from.z,
        direction: stairDef.direction === 'up' ? 'down' : 'up',
        marker: stairDef.toMarker,
      })
    }

    // Distribui as entradas nos andares correspondentes.
    for (const floor of floors) {
      floor.stairs = stairs.filter(stair => stair.floorId === floor.id)
    }

    const startFloor =
      floors.find(floor => floor.id === definition.startFloorId) ?? floors[0]

    return {
      id: definition.id,
      name: definition.name,
      walls: floors.flatMap(floor => floor.walls),
      playerSpawn: startFloor?.playerSpawn ?? { x: TILE_SIZE, z: TILE_SIZE, yaw: 0 },
      enemySpawns: [],
      pickups: [],
      cressets: [],
      doors: [],
      levers: [],
      notes: [],
      waves: definition.waves ?? [],
      waveSpawns: definition.waveSpawns ?? [],
      atmosphere: definition.atmosphere ?? {},
      bounds: {
        minX: 0,
        maxX: Math.max(0, ...floors.map(floor => floor.bounds.maxX)),
        minZ: 0,
        maxZ: Math.max(0, ...floors.map(floor => floor.bounds.maxZ)),
      },
      stairs,
      floors,
      startFloorId: startFloor?.id,
    }
  }

  /** Gera a malha estática do nível (paredes, chão e teto) em um único Group. */
  buildLevel(parsed: ParsedLevel, textures: LevelTextures): THREE.Group {
    const group = new THREE.Group()

    if (parsed.floors && parsed.floors.length > 0) {
      for (const floor of parsed.floors) {
        group.add(this.buildFloorGroup(floor, textures))
      }
    } else {
      group.add(
        this.buildFloorGroup(
          {
            id: '',
            name: parsed.name,
            height: 0,
            walls: parsed.walls,
            bounds: parsed.bounds,
          },
          textures,
        ),
      )
      for (const cresset of parsed.cressets) {
        group.add(this.buildCresset(cresset))
      }
    }

    return group
  }

  /** Geometria de um andar: paredes (com floorId), chão e teto. */
  private buildFloorGroup(floor: ParsedFloor, textures: LevelTextures): THREE.Group {
    const group = new THREE.Group()
    const { bounds, height } = floor

    const wallGeometries: THREE.BufferGeometry[] = []
    for (const wall of floor.walls) {
      const width = wall.maxX - wall.minX
      const depth = wall.maxZ - wall.minZ
      const geo = new THREE.BoxGeometry(width, WALL_HEIGHT, depth)
      scaleBoxUVs(geo, width, depth, WALL_HEIGHT, TILE_SIZE)
      geo.translate(wall.minX + width / 2, height + WALL_HEIGHT / 2, wall.minZ + depth / 2)
      wallGeometries.push(geo)
    }

    if (wallGeometries.length > 0) {
      // Junta todas as paredes em uma única geometria: menos draw calls.
      const merged = mergeGeometries(wallGeometries)
      if (merged) {
        const material = new THREE.MeshStandardMaterial({
          map: textures.wall,
          roughness: 0.9,
          metalness: 0.05,
        })
        const wallMesh = new THREE.Mesh(merged, material)
        // Marca para a engine coletar e usar como bloqueador no raycast.
        wallMesh.userData.isWall = true
        wallMesh.userData.floorId = floor.id
        group.add(wallMesh)
      }
    }
    for (const geo of wallGeometries) geo.dispose()

    const floorRepeatX = Math.max(1, Math.round(bounds.maxX / TILE_SIZE))
    const floorRepeatZ = Math.max(1, Math.round(bounds.maxZ / TILE_SIZE))

    const floorTexture = textures.floor.clone()
    floorTexture.needsUpdate = true
    floorTexture.wrapS = THREE.RepeatWrapping
    floorTexture.wrapT = THREE.RepeatWrapping
    floorTexture.repeat.set(floorRepeatX, floorRepeatZ)

    const floorGeo = new THREE.PlaneGeometry(bounds.maxX, bounds.maxZ)
    floorGeo.rotateX(-Math.PI / 2)
    const floorMaterial = textures.lavaFloor
      ? new THREE.MeshStandardMaterial({
          map: floorTexture,
          roughness: 0.6,
          metalness: 0.2,
          emissive: new THREE.Color(0xff5a1a),
          emissiveMap: floorTexture,
          emissiveIntensity: 0.9,
        })
      : new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.95, metalness: 0 })
    const floorMesh = new THREE.Mesh(floorGeo, floorMaterial)
    floorMesh.position.set(bounds.maxX / 2, height, bounds.maxZ / 2)
    group.add(floorMesh)

    const ceilingTexture = textures.ceiling.clone()
    ceilingTexture.needsUpdate = true
    ceilingTexture.wrapS = THREE.RepeatWrapping
    ceilingTexture.wrapT = THREE.RepeatWrapping
    ceilingTexture.repeat.set(floorRepeatX, floorRepeatZ)

    const ceilingGeo = new THREE.PlaneGeometry(bounds.maxX, bounds.maxZ)
    ceilingGeo.rotateX(Math.PI / 2)
    const ceiling = new THREE.Mesh(
      ceilingGeo,
      new THREE.MeshStandardMaterial({ map: ceilingTexture, roughness: 1, metalness: 0 }),
    )
    ceiling.position.set(bounds.maxX / 2, height + WALL_HEIGHT, bounds.maxZ / 2)
    group.add(ceiling)

    // Escadas (visual placeholder): degraus ascendentes + marcador emissivo.
    for (const stair of floor.stairs ?? []) {
      group.add(this.buildStair(stair, height))
    }

    return group
  }

  /** Visual placeholder de escada: degraus subindo até um marcador emissivo. */
  private buildStair(stair: ParsedStair, floorHeight: number): THREE.Group {
    const group = new THREE.Group()
    const stone = new THREE.MeshStandardMaterial({
      color: 0x4a4a55,
      roughness: 0.85,
      metalness: 0.2,
    })
    const glow = new THREE.MeshStandardMaterial({
      color: 0xffa34a,
      emissive: 0xff7a22,
      emissiveIntensity: 0.9,
      roughness: 0.5,
      metalness: 0,
    })

    // Três degraus ascendentes ao longo de -Z (virados para quem chega).
    const stepGeo = new THREE.BoxGeometry(1.5, 0.8, 1.0)
    const step1 = new THREE.Mesh(stepGeo, stone)
    step1.position.set(0, floorHeight + 0.4, 0.6)
    const step2 = new THREE.Mesh(stepGeo, stone)
    step2.position.set(0, floorHeight + 1.2, -0.4)
    const step3 = new THREE.Mesh(stepGeo, stone)
    step3.position.set(0, floorHeight + 2.0, -1.4)
    group.add(step1, step2, step3)

    // Marcador emissivo no topo da escada (indica o ponto de interação).
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), glow)
    marker.position.set(0, floorHeight + 2.55, -1.4)
    group.add(marker)

    // Pequena coluna de apoio para dar presença física à entrada.
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.1, 0.25), stone)
    post.position.set(0, floorHeight + 0.55, 0.1)
    group.add(post)

    group.position.set(stair.x, 0, stair.z)
    return group
  }

  /** Candelabro de pé: base no chão, haste vertical subindo e taça cônica no topo. */
  private buildCresset(cresset: CressetSpawn): THREE.Group {
    const group = new THREE.Group()
    const metal = new THREE.MeshStandardMaterial({
      color: 0x3a3238,
      roughness: 0.85,
      metalness: 0.45,
    })

    // Base/apoio no chão.
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.06, 12), metal)
    base.position.y = 0.03
    group.add(base)

    // Haste fina vertical, do chão até a taça (altura de tocha de corredor).
    const rodLength = 1.35
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, rodLength, 8), metal)
    rod.position.y = 0.06 + rodLength / 2
    group.add(rod)

    // Taça cônica (boca larga em cima), apoiada no topo da haste.
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.09, 0.34, 12), metal)
    cup.position.y = 0.06 + rodLength + 0.17
    group.add(cup)

    // Aro da boca.
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.045, 12), metal)
    rim.position.y = 0.06 + rodLength + 0.34
    group.add(rim)

    group.position.x = cresset.x
    group.position.z = cresset.z
    group.position.y = 0
    return group
  }
}
