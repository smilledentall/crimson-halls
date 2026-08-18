import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const TILE_SIZE = 6

const levelsDir = join(process.cwd(), 'src/levels/levels')
const levelFiles = readdirSync(levelsDir).filter(f => f.endsWith('.ts') && f !== 'index.ts')

function parseLevel(fileName: string): { id: string; name: string; grid: string[]; doors: Array<{marker: string}> } | null {
  const filePath = join(levelsDir, fileName)
  const content = readFileSync(filePath, 'utf-8')
  const gridMatch = content.match(/grid:\s*\[([\s\S]*?)\n\s*\]/)
  if (!gridMatch) return null
  const gridLines = gridMatch[1]
    .split('\n')
    .map(l => l.trim().replace(/^['"`]/, '').replace(/['"`],?$/, ''))
    .filter(l => l.length > 0)
  const doorsMatch = content.match(/doors:\s*\[([\s\S]*?)\n\s*\]/)
  const doors: Array<{marker: string}> = []
  if (doorsMatch) {
    const doorContent = doorsMatch[1]
    const markerMatches = doorContent.matchAll(/marker:\s*['"`]([^'"`]+)['"`]/g)
    for (const m of markerMatches) {
      doors.push({ marker: m[1] })
    }
  }
  const idMatch = content.match(/id:\s*['"`]([^'"`]+)['"`]/)
  const nameMatch = content.match(/name:\s*['"`]([^'"`]+)['"`]/)
  return { id: idMatch?.[1] ?? '', name: nameMatch?.[1] ?? '', grid: gridLines, doors }
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

function computeDoorPlacement(grid: string[], row: number, col: number) {
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

  const walls = []
  if (wallAbove) walls.push({ dir: 'above', checkR: row - 1, checkC: col })
  if (wallBelow) walls.push({ dir: 'below', checkR: row + 1, checkC: col })
  if (wallLeft) walls.push({ dir: 'left', checkR: row, checkC: col - 1 })
  if (wallRight) walls.push({ dir: 'right', checkR: row, checkC: col + 1 })

  return { wallAbove, wallBelow, wallLeft, wallRight, walls, cx, cz }
}

console.log('=== FLOATING DOORS (sem parede adjacente) ===\n')

for (const file of levelFiles) {
  const parsed = parseLevel(file)
  if (!parsed) continue
  const doors = findDoors(parsed.grid)
  for (const d of doors) {
    const analysis = computeDoorPlacement(parsed.grid, d.row, d.col)
    if (analysis.walls.length === 0) {
      // Encontra a parede mais próxima (manhattan distance)
      let bestDist = Infinity
      let bestDir = ''
      let bestTarget: {r: number, c: number} | null = null

      for (let r = 0; r < parsed.grid.length; r++) {
        for (let c = 0; c < parsed.grid[r].length; c++) {
          if (parsed.grid[r][c] === '#') {
            const dist = Math.abs(r - d.row) + Math.abs(c - d.col)
            if (dist < bestDist) {
              bestDist = dist
              if (r < d.row) bestDir = 'above'
              else if (r > d.row) bestDir = 'below'
              else if (c < d.col) bestDir = 'left'
              else bestDir = 'right'
              bestTarget = { r, c }
            }
          }
        }
      }

      console.log(`[${parsed.id}] ${parsed.name} :: ${d.marker} at (row=${d.row}, col=${d.col})`)
      console.log(`  Current grid pos: D at (${d.row}, ${d.col}) — NO adjacent walls`)
      if (bestTarget) {
        console.log(`  Nearest wall: ${bestDir} at (${bestTarget.r}, ${bestTarget.c}) — dist=${bestDist}`)
        console.log(`  → Proposal: move D from (${d.row}, ${d.col}) to adjacent cell toward ${bestDir}`)
        const newR = d.row + (bestDir === 'above' ? -1 : bestDir === 'below' ? 1 : 0)
        const newC = d.col + (bestDir === 'left' ? -1 : bestDir === 'right' ? 1 : 0)
        console.log(`    New D position: (${newR}, ${newC}) — currently '${parsed.grid[newR]?.[newC] ?? 'OOB'}'`)
      }
      console.log()
    }
  }
}