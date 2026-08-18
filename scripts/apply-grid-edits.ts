import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const levelsDir = join(process.cwd(), 'src/levels/levels')

const edits = [
  // level-1 D1: (3,16) -> (4,16) (abaixo)
  { file: 'level-1.ts', from: {r: 3, c: 16}, to: {r: 4, c: 16} },
  // level-1 D2: (8,17) -> (8,18) (direita)
  { file: 'level-1.ts', from: {r: 8, c: 17}, to: {r: 8, c: 18} },
  // level-5 D2: (9,12) -> (10,12) (abaixo)
  { file: 'level-5.ts', from: {r: 9, c: 12}, to: {r: 10, c: 12} },
  // level-5 D3: (12,10) -> (13,10) (abaixo)
  { file: 'level-5.ts', from: {r: 12, c: 10}, to: {r: 13, c: 10} },
  // level-6 D1: (12,20) -> (13,20) (abaixo)
  { file: 'level-6.ts', from: {r: 12, c: 20}, to: {r: 13, c: 20} },
  // level-7 D1: (12,19) -> (13,19) (abaixo)
  { file: 'level-7.ts', from: {r: 12, c: 19}, to: {r: 13, c: 19} },
  // level-8 D1: (12,18) -> (11,18) (acima)
  { file: 'level-8.ts', from: {r: 12, c: 18}, to: {r: 11, c: 18} },
  // level-9 D1: (12,18) -> (13,18) (abaixo)
  { file: 'level-9.ts', from: {r: 12, c: 18}, to: {r: 13, c: 18} },
  // level-10 D1: (12,20) -> (13,20) (abaixo)
  { file: 'level-10.ts', from: {r: 12, c: 20}, to: {r: 13, c: 20} },
  // level-11 D1: (12,21) -> (13,21) (abaixo)
  { file: 'level-11.ts', from: {r: 12, c: 21}, to: {r: 13, c: 21} },
  // level-12 D1: (12,21) -> (13,21) (abaixo)
  { file: 'level-12.ts', from: {r: 12, c: 21}, to: {r: 13, c: 21} },
  // level-13 D1: (12,21) -> (13,21) (abaixo)
  { file: 'level-13.ts', from: {r: 12, c: 21}, to: {r: 13, c: 21} },
  // level-14 D1: (12,21) -> (13,21) (abaixo)
  { file: 'level-14.ts', from: {r: 12, c: 21}, to: {r: 13, c: 21} },
  // level-15 D1: (12,21) -> (13,21) (abaixo)
  { file: 'level-15.ts', from: {r: 12, c: 21}, to: {r: 13, c: 21} },
]

function applyEdit(file: string, from: {r: number, c: number}, to: {r: number, c: number}) {
  const filePath = join(levelsDir, file)
  const content = readFileSync(filePath, 'utf-8')
  
  // Find the grid array
  const gridMatch = content.match(/(grid:\s*\[[\s\S]*?\n\s*\])/)
  if (!gridMatch) throw new Error(`Grid not found in ${file}`)
  
  const gridBlock = gridMatch[1]
  const lines = gridBlock.split('\n')
  
  // Find the line with the door marker at 'from' position
  // Grid lines are inside the array, each line is a string like '    "########",'
  const gridLines: string[] = []
  let inGrid = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('grid:')) {
      inGrid = true
      continue
    }
    if (inGrid) {
      if (trimmed === ']') break
      // Extract string content
      const match = trimmed.match(/^['"`](.*)['"`],?$/)
      if (match) gridLines.push(match[1])
    }
  }
  
  // Verify the 'from' position has 'D'
  if (gridLines[from.r][from.c] !== 'D') {
    throw new Error(`${file}: Expected 'D' at (${from.r},${from.c}), found '${gridLines[from.r][from.c]}'`)
  }
  // Verify 'to' position is '.'
  if (gridLines[to.r][to.c] !== '.') {
    throw new Error(`${file}: Target (${to.r},${to.c}) is not '.', it's '${gridLines[to.r][to.c]}'`)
  }
  
  // Perform the move
  const rowArr = gridLines[from.r].split('')
  rowArr[from.c] = '.'
  gridLines[from.r] = rowArr.join('')
  
  const toRowArr = gridLines[to.r].split('')
  toRowArr[to.c] = 'D'
  gridLines[to.r] = toRowArr.join('')
  
  // Reconstruct the grid block
  const indent = '  '
  const newGridLines = gridLines.map(l => `${indent}  '${l}',`).join('\n')
  const newGridBlock = `grid: [\n${newGridLines}\n  ]`
  
  const newContent = content.replace(gridBlock, newGridBlock)
  writeFileSync(filePath, newContent)
  console.log(`  ✓ ${file}: D moved from (${from.r},${from.c}) to (${to.r},${to.c})`)
}

// Group edits by file
const byFile = new Map<string, typeof edits>()
for (const e of edits) {
  const arr = byFile.get(e.file) || []
  arr.push(e)
  byFile.set(e.file, arr)
}

// Apply file by file
for (const [file, fileEdits] of byFile) {
  console.log(`\nEditing ${file}...`)
  for (const e of fileEdits) {
    applyEdit(file, e.from, e.to)
  }
}

console.log('\nAll edits applied. Verifying...')