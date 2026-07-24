// src/data/levelData.js
const gameModes = ['word-fill', 'scripture-match', 'four-pics', 'trivia'];

// Designed mode sequence for levels 1-9 of a phase (level 10 is always the
// trivia "boss level" — see getModeForLevel below). Rotated per phase so
// consecutive phases don't feel identical, while staying deterministic
// (unlike the old Math.random() version, this never changes between loads).
const MODE_PATTERN = ['word-fill', 'scripture-match', 'four-pics', 'trivia', 'word-fill', 'four-pics', 'scripture-match', 'trivia', 'four-pics'];

function getModeForLevel(phaseNumber, levelIndex, levelsPerPhase) {
  // Boss level: always trivia
  if (levelIndex === levelsPerPhase - 1) return 'trivia';

  const rotation = (phaseNumber - 1) % MODE_PATTERN.length;
  const patternIndex = (levelIndex + rotation) % MODE_PATTERN.length;
  return MODE_PATTERN[patternIndex];
}

const defaultPhaseTitles = [
  'The Birth and Early Life of Jesus', 'Jesus Baptism and Temptation', 'Jesus Miracles and Healings', 'The Parables of Jesus',
  'The Sermon on the Mount', 'Calling of the Disciples', 'Key Teachings of Jesus', 'The Last Supper and Betrayal',
  'The Crucifixion and Death of Jesus', 'The Resurrection and Ascension', 'Pentecost and the Holy Spirit',
  'The Early Church Community','Peters Ministry and Miracles','The Conversion of Saul (Paul)','Pauls First Missionary Journey',
  'Pauls Second Missionary Journey','The Jerusalem Council','Pauls Third Missionary Journey','Pauls Arrest and Imprisonment',
  'The Spread of the Gospel to Rome','','','','','','','','','','','','','','','','','','','','','','','','','','',
  '','','','','','','','','',
  '','','','','','','','','',
  ...Array(90).fill('Coming soon')
];

/**
 * Generate positions for levels along a snaking path (Candy Crush style)
 * Creates a winding S-curve from bottom to top
 */
function getCurvedPosition(index, total) {
  // Zigzag pattern: right(75%) → center(50%) → left(25%) → center(50%) → repeat
  const xPositions = [75, 50, 25, 50];
  const x = xPositions[index % 4];
  
  // REVERSED: Level 1 at BOTTOM (highest y), Level 10 at TOP (lowest y)
  // Tighter spacing so more nodes are visible per screen
  const verticalSpacing = 92;
  const y = verticalSpacing * (total - 1 - index);

  return { x, y };
}

/**
 * Generate all phases with levels positioned along curves
 */
function generateLevels(phaseCount = 8, levelsPerPhase = 10) {
  const phases = [];

  for (let p = 1; p <= phaseCount; p++) {
    const phase = {
      phaseNumber: p,
      title: defaultPhaseTitles[p - 1] || `Phase ${p}`,
      levels: [],
    };

    for (let i = 0; i < levelsPerPhase; i++) {
      const pos = getCurvedPosition(i, levelsPerPhase);
      phase.levels.push({
        id: `P${p}-L${i + 1}`,
        number: i + 1,
        mode: getModeForLevel(p, i, levelsPerPhase),
        completed: false,
        position: pos,
      });
    }

    phases.push(phase);
  }

  return phases;
}

export const levelPhases = generateLevels(100);
