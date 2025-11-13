// utils/gameHelpers.js

export const determineUnlockedPhases = (completedIds, levelPhases) => {
    const unlocked = [];
    for (let i = 0; i < levelPhases.length; i++) {
      const isFirst = i === 0;
      const lastLevelId = !isFirst ? levelPhases[i - 1].levels.at(-1).id : null;
      if (isFirst || completedIds.includes(lastLevelId)) unlocked.push(i);
    }
    return unlocked;
  };
  
  export const wrapLevelsWithStatus = (phaseIndex, phase, completedIds, levelPhases) =>
    phase.levels.map((level, index) => ({
      ...level,
      number: index + 1,
      completed: completedIds.includes(level.id),
      phaseNumber: levelPhases[phaseIndex].phaseNumber,
    }));
  
export const getPowerUpIcon = (key) => {
  switch (key) {
    case "divine_hint": return "🧩";
    case "grace_period": return "⏳";
    case "holy_shield": return "🛡️";
    case "heavenly_match": return "👑";
    default: return "🎁";
  }
};

export const getPowerUpTooltip = (key) => {
  switch (key) {
    case "divine_hint": return "Divine Hint: Reveals the correct answer";
    case "grace_period": return "Grace Period: Extends your time by 30 seconds";
    case "holy_shield": return "Holy Shield: Protects you from losing a life for 5 minutes";
    case "heavenly_match": return "Heavenly Match: Automatically matches one pair";
    default: return "Power-up";
  }
};
  