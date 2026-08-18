import { LevelLoader } from '../src/levels/LevelLoader';
import { ALL_LEVELS } from '../src/levels/levels';

const loader = new LevelLoader();
let totalDoors = 0;
let totalFlanking = 0;
let totalGridX = 0;

for (const lvl of ALL_LEVELS) {
  const parsed = loader.parse(lvl);
  const doors = parsed.doors.length;
  let gridX = 0;
  for (const row of lvl.grid) for (const ch of row) if (ch === 'X') gridX++;
  const flanking = parsed.cressets.length - gridX;
  totalDoors += doors;
  totalFlanking += flanking;
  totalGridX += gridX;
}

console.log('Total levels:', ALL_LEVELS.length);
console.log('Total doors:', totalDoors);
console.log('Total grid X cressets:', totalGridX);
console.log('Total flanking cressets:', totalFlanking);
console.log('Total cressets:', totalGridX + totalFlanking);