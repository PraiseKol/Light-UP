import React from "react";

export default function GameMap({
  levels = [],
  completedLevels = [],
  unlockedPhases = [],
  onLevelSelect
}) {
  return (
    <div className="relative w-full h-full overflow-auto bg-gradient-to-b from-sky-50 to-blue-100">
      {/* Map Grid or Layout */}
      <div className="grid gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {levels.map((level, idx) => {
          const isCompleted = completedLevels.includes(level.id);
          const isUnlocked = unlockedPhases.includes(level.phase);

          return (
            <button
              key={level.id}
              onClick={() => isUnlocked && onLevelSelect(level)}
              disabled={!isUnlocked}
              className={`p-4 rounded-xl shadow-md border text-center transition ${
                isUnlocked
                  ? "bg-white hover:shadow-lg cursor-pointer"
                  : "bg-gray-200 opacity-60 cursor-not-allowed"
              }`}
            >
              <div className="text-lg font-bold mb-2">
                Level {idx + 1}
              </div>
              <div
                className={`text-sm ${
                  isCompleted ? "text-green-600" : "text-gray-500"
                }`}
              >
                {isCompleted ? "Completed" : isUnlocked ? "Unlocked" : "Locked"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
