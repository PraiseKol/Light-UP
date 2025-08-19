// src/data/levelData.js
const gameModes = ['word-fill', 'scripture-match', 'four-pics', 'trivia'];

const defaultPhaseTitles = [
  'Foundations', 'Beginnings', 'Growth', 'Challenge',
  'Insight', 'Wisdom', 'Mastery', 'Ascension',
  'Elevation', 'Glory',
  ...Array(90).fill('Coming soon')
];

/**
 * Generate positions for levels along a tall upward smooth S-curve
 * that stays within the phase bounds
 */
function getCurvedPosition(index, total) {
  const progress = index / (total - 1); // 0 → 1

  // Keep the swing close but not touching edges
  const amplitudeX = 42; // max deviation from center
  const centerX = 50; // middle of container

  // Smooth sinusoidal horizontal sway
  const x = centerX + Math.sin(progress * Math.PI * 2) * amplitudeX;

  // Keep y strictly inside [5%, 95%] of phase height
  const topMargin = 10;
  const bottomMargin = 95;
  const y = bottomMargin - progress * (bottomMargin - topMargin);

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
