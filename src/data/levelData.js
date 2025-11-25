// src/data/levelData.js
const gameModes = ['word-fill', 'scripture-match', 'four-pics', 'trivia'];

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
  
  // 130px vertical spacing between levels, starting from bottom
  const verticalSpacing = 130;
  const y = verticalSpacing * index;

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
        mode: gameModes[Math.floor(Math.random() * gameModes.length)],
        completed: false,
        position: pos,
      });
    }

    phases.push(phase);
  }

  return phases;
}

export const levelPhases = generateLevels(100);
