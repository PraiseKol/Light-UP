// src/data/levelData.js
const gameModes = ['word-fill', 'scripture-match', 'four-pics', 'trivia'];

function generateLevels(phaseCount = 1) {
  const phases = [];

  for (let p = 1; p <= phaseCount; p++) {
    const phase = {
      phaseNumber: p,
      levels: [],
    };

    for (let i = 1; i <= 10; i++) {
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

export const levelPhases = generateLevels(3); // you can increase phases here
