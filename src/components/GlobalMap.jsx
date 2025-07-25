import React from "react";
import { Lock } from "lucide-react";

export default function GlobalMap({ phases, completedLevels, onSelectPhase }) {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-center mb-6 text-charcoal">Select a Phase</h1>
      <div className="grid grid-cols-2 gap-6">
        {phases.map((phase, index) => {
          const isFirst = index === 0;
          const prevPhase = phases[index - 1];
          const lastLevelOfPrevPhase = prevPhase?.levels[prevPhase.levels.length - 1];
          const prevCompleted = isFirst || completedLevels.includes(lastLevelOfPrevPhase?.id);
          const isUnlocked = prevCompleted;

          return (
            <div
              key={phase.phaseNumber}
              className={`relative border rounded-xl p-4 transition-all duration-300 cursor-pointer ${
                isUnlocked ? "bg-white hover:shadow-lg" : "bg-gray-100 cursor-not-allowed"
              }`}
              onClick={() => {
                if (isUnlocked) onSelectPhase(index);
              }}
            >
              <h2 className="text-xl font-semibold mb-1 text-charcoal">Phase {phase.phaseNumber}</h2>
              <p className="text-sm text-gray-700 italic">{phase.title || "Untitled Phase"}</p>

              {!isUnlocked && (
                <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center">
                  <div className="flex flex-col items-center text-white">
                    <Lock className="w-6 h-6 mb-1" />
                    <span className="text-xs">Complete the Previous Phase</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
