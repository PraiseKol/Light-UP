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
 * Generate positions for levels along a tall upward smooth S-curve
 * that stays within the phase bounds
 */
function getCurvedPosition(index, total) {
  const progress = index / (total - 1); // 0 → 1

  // Horizontal position - percentage for left/right positioning
  const amplitudeX = 35; // Reduced to prevent edge clipping
  const centerX = 50; // middle of container
  const x = centerX + Math.sin(progress * Math.PI * 3) * amplitudeX;

  // Vertical position - PIXELS for proper spacing (Candy Crush style)
  const verticalSpacing = 120; // 120px between each level
  const topPadding = 100; // Start 100px from top
  const y = topPadding + (index * verticalSpacing);

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
