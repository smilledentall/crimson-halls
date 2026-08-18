import fs from 'fs';
import path from 'path';

const levelsDir = path.join(process.cwd(), 'src/levels/levels');
const files = fs.readdirSync(levelsDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');

for (const file of files) {
  const content = fs.readFileSync(path.join(levelsDir, file), 'utf-8');
  const gridMatch = content.match(/grid:\s*\[([\s\S]*?)\n\s*\]/);
  if (!gridMatch) continue;
  const gridText = gridMatch[1];
  const lines = gridText.split('\n')
    .map(l => l.trim().replace(/^['"`]/, '').replace(/['"`],?$/, ''))
    .filter(l => l.length > 0);
  if (lines.length === 0) continue;
  const cols = lines[0].length;
  const consistent = lines.every(l => l.length === cols);
  if (cols <= 26) {
    console.log(file, '->', cols, 'cols', consistent ? 'consistent' : 'INCONSISTENT');
  } else {
    console.log(file, '->', cols, 'cols (OK)');
  }
}