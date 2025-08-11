// src/data/levelData.js
const gameModes = ['word-fill', 'scripture-match', 'four-pics', 'trivia'];

const defaultPhaseTitles = [
  'Foundations', 'Beginnings', 'Growth', 'Challenge',
  'Insight', 'Wisdom', 'Mastery', 'Ascension',
  'Elevation', 'Glory',
  // fill with "Coming soon"
  ...Array(90).fill('Coming soon')
];

/**
 * Generate positions for levels along an upward S-curve
 * @param {number} index Index of level in phase
 * @param {number} total Total levels in phase
 * @returns { x: number, y: number }
 */
function getCurvedPosition(index, total) {
  const progress = index / (total - 1); // 0 → 1
  const amplitudeX = 20; // horizontal swing in %
  const centerX = 50; // middle of the path horizontally

  // S-shape left/right oscillation
  const x = centerX + Math.sin(progress * Math.PI * 2) * amplitudeX;

  // Vertical progression from bottom (100%) to top (0%)
  const y = 100 - progress * 100;

  return { x, y };
}

/**
 * Generate levels and structure phases
 * @param {number} phaseCount
 * @param {number} levelsPerPhase
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
        position: pos, // store position for map rendering
      });
    }

    phases.push(phase);
  }

  return phases;
}

export const levelPhases = generateLevels(100);
