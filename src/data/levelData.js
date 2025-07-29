// src/data/levelData.js

const gameModes = ['word-fill', 'scripture-match', 'four-pics', 'trivia'];

const defaultPhaseTitles = [
  'Foundations', 'Beginnings', 'Growth', 'Challenge',
  'Insight', 'Wisdom', 'Mastery', 'Ascension',
  'Elevation', 'Glory',
  'Coming soon', 'Coming soon', 'Coming soon', 'Coming soon', 'Coming soon','Coming soon', 'Coming soon', 
  'Coming soon', 'Coming soon', 'Coming soon', 'Coming soon', 'Coming soon', 'Coming soon','Coming soon', 
  'Coming soon', 'Coming soon', 'Coming soon','Coming soon', 'Coming soon', 'Coming soon','Coming soon', 
  'Coming soon', 'Coming soon', 'Coming soon', 'Coming soon', 'Coming soon','Coming soon', 'Coming soon', 
  'Coming soon','Coming soon', 'Coming soon', 'Coming soon', 'Coming soon', 'Coming soon', 'Coming soon',
  'Coming soon', 'Coming soon', 'Coming soon','Coming soon', 'Coming soon', 'Coming soon', 'Coming soon', 
  'Coming soon', 'Coming soon','Coming soon', 'Coming soon', 'Coming soon','Coming soon', 'Coming soon', 
  'Coming soon','Coming soon', 'Coming soon', 'Coming soon','Coming soon', 'Coming soon', 'Coming soon',
  'Coming soon', 'Coming soon', 'Coming soon', 'Coming soon', 'Coming soon', 'Coming soon','Coming soon', 
  'Coming soon', 'Coming soon','Coming soon', 'Coming soon', 'Coming soon','Coming soon', 'Coming soon', 
  'Coming soon', 'Coming soon', 'Coming soon','Coming soon', 'Coming soon', 'Coming soon', 'Coming soon', 
  'Coming soon', 'Coming soon','Coming soon', 'Coming soon', 'Coming soon','Coming soon', 'Coming soon', 
  'Coming soon', 'Coming soon', 'Coming soon','Coming soon', 'Coming soon', 'Coming soon', 
  

];

/**
 * Generate levels and structure phases
 * @param {number} phaseCount Total number of phases
 * @param {number} levelsPerPhase Number of levels in each phase
 * @returns Array of structured phases
 */
function generateLevels(phaseCount = 8, levelsPerPhase = 10) {
  const phases = [];

  for (let p = 1; p <= phaseCount; p++) {
    const phase = {
      phaseNumber: p,
      title: defaultPhaseTitles[p - 1] || `Phase ${p}`,
      levels: [],
    };

    for (let i = 1; i <= levelsPerPhase; i++) {
      phase.levels.push({
        id: `P${p}-L${i}`,
        number: i,
        mode: gameModes[Math.floor(Math.random() * gameModes.length)],
        completed: false,
      });
    }

    phases.push(phase);
  }

  return phases;
}

export const levelPhases = generateLevels(100); // Update to desired phase count
