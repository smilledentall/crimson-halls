import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const TILE_SIZE = 6
const DOOR_WALL_OFFSET = 0.05

// Parse all level files
const levelsDir = join(process.cwd(), 'src/levels/levels')
const levelFiles = readdirSync(levelsDir).filter(f => f.endsWith('.ts') && f !== 'index.ts')

interface DoorAnalysis {
  levelId: string
  levelName: string
  doorMarker: string
  row: number
  col: number
  grid: string[]
  // Current logic results
  current: {
    x: number
    z: number
    rotationY: number
    wallAbove: boolean
    wallBelow: boolean
    wallLeft: boolean
    wallRight: boolean
  }
  // New logic results (to be implemented)
  proposed: {
    x: number
    z: number
    rotationY: number
    chosenWall: 'above' | 'below' | 'left' | 'right' | 'none'
    reason: string
  }
  differs: boolean
}

function parseLevel(fileName: string): { id: string; name: string; grid: string[]; doors: Array<{marker: string}> } | null {
  const filePath = join(levelsDir, fileName)
  const content = readFileSync(filePath, 'utf-8')
  // Extract grid
  const gridMatch = content.match(/grid:\s*\[([\s\S]*?)\n\s*\]/)
  if (!gridMatch) return null
  const gridLines = gridMatch[1]
    .split('\n')
    .map(l => l.trim().replace(/^['"`]/, '').replace(/['"`],?$/, ''))
    .filter(l => l.length > 0)
  // Extract doors array
  const doorsMatch = content.match(/doors:\s*\[([\s\S]*?)\n\s*\]/)
  const doors: Array<{marker: string}> = []
  if (doorsMatch) {
    const doorContent = doorsMatch[1]
    const markerMatches = doorContent.matchAll(/marker:\s*['"`]([^'"`]+)['"`]/g)
    for (const m of markerMatches) {
      doors.push({ marker: m[1] })
    }
  }
  // Extract id and name
  const idMatch = content.match(/id:\s*['"`]([^'"`]+)['"`]/)
  const nameMatch = content.match(/name:\s*['"`]([^'"`]+)['"`]/)
  return {
    id: idMatch?.[1] ?? '',
    name: nameMatch?.[1] ?? '',
    grid: gridLines,
    doors
  }
}

function analyzeDoor(grid: string[], row: number, col: number, _doorIndex: number) {
  const rows = grid.length
  const cols = grid[0].length
  const x = col * TILE_SIZE
  const z = row * TILE_SIZE
  const cx = x + TILE_SIZE / 2
  const cz = z + TILE_SIZE / 2

  const wallAbove = row > 0 && grid[row - 1][col] === '#'
  const wallBelow = row < rows - 1 && grid[row + 1]?.[col] === '#'
  const wallLeft = col > 0 && grid[row][col - 1] === '#'
  const wallRight = col < cols - 1 && grid[row][col + 1] === '#'

  // === CURRENT LOGIC (from LevelLoader.ts) ===
  let dx = cx
  let dz = cz
  if (wallLeft && !wallRight) dx = x + DOOR_WALL_OFFSET
  else if (wallRight && !wallLeft) dx = x + TILE_SIZE - DOOR_WALL_OFFSET
  if (wallAbove && !wallBelow) dz = z + DOOR_WALL_OFFSET
  else if (wallBelow && !wallAbove) dz = z + TILE_SIZE - DOOR_WALL_OFFSET

  let rotationY = 0
  if (wallRight && !wallLeft) rotationY = -Math.PI / 2
  else if (wallLeft && !wallRight) rotationY = Math.PI / 2
  else if (wallAbove && !wallBelow) rotationY = 0
  else if (wallBelow && !wallAbove) rotationY = Math.PI
  else if (wallAbove && wallBelow) rotationY = Math.PI / 2 // passagem leste-oeste
  else if (wallLeft && wallRight) rotationY = 0 // passagem norte-sul

  return {
    row, col,
    wallAbove, wallBelow, wallLeft, wallRight,
    current: { x: dx, z: dz, rotationY },
    gridContext: {
      above: row > 0 ? grid[row - 1][col] : 'OOB',
      below: row < rows - 1 ? grid[row + 1]?.[col] : 'OOB',
      left: col > 0 ? grid[row][col - 1] : 'OOB',
      right: col < cols - 1 ? grid[row][col + 1] : 'OOB',
    }
  }
}

function findDoors(grid: string[]): Array<{row: number, col: number, marker: string}> {
  const doors: Array<{row: number, col: number, marker: string}> = []
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === 'D') {
        doors.push({ row: r, col: c, marker: `D${doors.length + 1}` })
      }
    }
  }
  return doors
}

// === NEW SYSTEMATIC LOGIC ===
// Rule: A door must be embedded in exactly ONE wall face.
// Priority order for wall selection when multiple adjacent walls exist:
// 1. The wall that has OPEN space on the other side (the "room" side)
// 2. If multiple walls have open space, prefer the wall that leads to the larger connected open area (flood fill)
// 3. Deterministic tiebreaker: priority order [below, above, right, left] (S, N, E, W) - i.e., prefer south wall, then north, then east, then west
// This matches the reading order of the grid (top to bottom, left to right)

function computeProposedPosition(grid: string[], row: number, col: number) {
  const rows = grid.length
  const cols = grid[0].length
  const x = col * TILE_SIZE
  const z = row * TILE_SIZE
  const cx = x + TILE_SIZE / 2
  const cz = z + TILE_SIZE / 2

  const wallAbove = row > 0 && grid[row - 1][col] === '#'
  const wallBelow = row < rows - 1 && grid[row + 1]?.[col] === '#'
  const wallLeft = col > 0 && grid[row][col - 1] === '#'
  const wallRight = col < cols - 1 && grid[row][col + 1] === '#'

  const walls = [
    { dir: 'above' as const, wall: wallAbove, dx: 0, dz: -1, rot: 0, offsetX: 0, offsetZ: DOOR_WALL_OFFSET },
    { dir: 'below' as const, wall: wallBelow, dx: 0, dz: 1, rot: Math.PI, offsetX: 0, offsetZ: -DOOR_WALL_OFFSET },
    { dir: 'left' as const, wall: wallLeft, dx: -1, dz: 0, rot: Math.PI / 2, offsetX: DOOR_WALL_OFFSET, offsetZ: 0 },
    { dir: 'right' as const, wall: wallRight, dx: 1, dz: 0, rot: -Math.PI / 2, offsetX: -DOOR_WALL_OFFSET, offsetZ: 0 },
  ].filter(w => w.wall)

  if (walls.length === 0) {
    // No adjacent wall - door floating in open space, keep centered, face south
    return {
      x: cx, z: cz, rotationY: 0,
      chosenWall: 'none' as const,
      reason: 'No adjacent walls; centered facing south'
    }
  }

  // For each candidate wall, check if the opposite side is open (walkable)
  // The door should face the open side
  const candidates = walls.map(w => {
    const checkRow = row + w.dz
    const checkCol = col + w.dx
    const oppositeOpen = checkRow >= 0 && checkRow < rows && checkCol >= 0 && checkCol < cols && grid[checkRow][checkCol] !== '#'
    return { ...w, oppositeOpen }
  })

  // Prefer walls where opposite side is open
  const openCandidates = candidates.filter(c => c.oppositeOpen)
  const chosen = openCandidates.length > 0 ? openCandidates[0] : candidates[0]

  // If multiple open candidates, use priority: below > above > right > left
  if (openCandidates.length > 1) {
    const priority = { below: 0, above: 1, right: 2, left: 3 }
    openCandidates.sort((a, b) => priority[a.dir] - priority[b.dir])
    return {
      x: cx + openCandidates[0].offsetX,
      z: cz + openCandidates[0].offsetZ,
      rotationY: openCandidates[0].rot,
      chosenWall: openCandidates[0].dir,
      reason: `Multiple open walls; priority chose ${openCandidates[0].dir}`
    }
  }

  const doorX = chosen.dir === 'left' ? x + DOOR_WALL_OFFSET
    : chosen.dir === 'right' ? x + TILE_SIZE - DOOR_WALL_OFFSET
    : cx
  const doorZ = chosen.dir === 'above' ? z + DOOR_WALL_OFFSET
    : chosen.dir === 'below' ? z + TILE_SIZE - DOOR_WALL_OFFSET
    : cz

  return {
    x: doorX,
    z: doorZ,
    rotationY: chosen.rot,
    chosenWall: chosen.dir,
    reason: chosen.oppositeOpen ? `Embedded in ${chosen.dir} wall, facing open space` : `Embedded in ${chosen.dir} wall (only option)`
  }
}

// Analyze all levels
const allAnalyses: DoorAnalysis[] = []

for (const file of levelFiles) {
  const parsed = parseLevel(file)
  if (!parsed) continue
  const doors = findDoors(parsed.grid)
  for (let i = 0; i < doors.length; i++) {
    const d = doors[i]
    const current = analyzeDoor(parsed.grid, d.row, d.col, i)
    const proposed = computeProposedPosition(parsed.grid, d.row, d.col)
    const differs = Math.abs(current.current.x - proposed.x) > 0.01 ||
                    Math.abs(current.current.z - proposed.z) > 0.01 ||
                    Math.abs(current.current.rotationY - proposed.rotationY) > 0.01
    allAnalyses.push({
      levelId: parsed.id,
      levelName: parsed.name,
      doorMarker: d.marker,
      row: d.row,
      col: d.col,
      grid: parsed.grid,
      current: {
        x: current.current.x,
        z: current.current.z,
        rotationY: current.current.rotationY,
        wallAbove: current.wallAbove,
        wallBelow: current.wallBelow,
        wallLeft: current.wallLeft,
        wallRight: current.wallRight,
      },
      proposed: {
        x: proposed.x,
        z: proposed.z,
        rotationY: proposed.rotationY,
        chosenWall: proposed.chosenWall,
        reason: proposed.reason
      },
      differs
    })
  }
}

// Print report
console.log('=== DOOR POSITIONING ANALYSIS ===\n')
console.log(`Total doors analyzed: ${allAnalyses.length}`)
console.log(`Doors needing change: ${allAnalyses.filter(a => a.differs).length}\n`)

for (const a of allAnalyses) {
  const diffMark = a.differs ? ' *** CHANGES ***' : ''
  console.log(`${a.levelId} :: ${a.levelName} :: ${a.doorMarker} at (row=${a.row}, col=${a.col})${diffMark}`)
  console.log(`  Grid context:  above=${a.current.wallAbove ? '#' : '.'} below=${a.current.wallBelow ? '#' : '.'} left=${a.current.wallLeft ? '#' : '.'} right=${a.current.wallRight ? '#' : '.'}`)
  console.log(`  CURRENT:       x=${a.current.x.toFixed(3)} z=${a.current.z.toFixed(3)} rotY=${a.current.rotationY.toFixed(3)} (${(a.current.rotationY * 180 / Math.PI).toFixed(0)}°)`)
  console.log(`  PROPOSED:      x=${a.proposed.x.toFixed(3)} z=${a.proposed.z.toFixed(3)} rotY=${a.proposed.rotationY.toFixed(3)} (${(a.proposed.rotationY * 180 / Math.PI).toFixed(0)}°) wall=${a.proposed.chosenWall}`)
  console.log(`  Reason:        ${a.proposed.reason}`)
  console.log()
}