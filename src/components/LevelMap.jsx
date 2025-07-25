// src/components/LevelMap.jsx
import { useEffect, useRef, useState } from "react";
import LevelButton from "./LevelButton";
import { Lock } from "lucide-react";
import { levelPhases } from "data/levelData";
import avatarIcon from "assets/avatar.png"; // Correct image import

export default function LevelMap({
  phase,
  onSelectLevel,
  phaseIndex,
  completedLevels,
  currentLevelId,
  isLocked
}) {
  const totalCompleted = phase.levels.filter((lvl) =>
    completedLevels.includes(lvl.id)
  ).length;

  const isPhase1 = phaseIndex === 0;
  const prevPhaseLastLevelId = !isPhase1
    ? levelPhases[phaseIndex - 1].levels.slice(-1)[0].id
    : null;

  const phaseUnlocked = isPhase1 || completedLevels.includes(prevPhaseLastLevelId);

  const [unlocking, setUnlocking] = useState(false);
  const wasLocked = useRef(!phaseUnlocked);

  useEffect(() => {
    if (wasLocked.current && phaseUnlocked) {
      setUnlocking(true);
      wasLocked.current = false;
      setTimeout(() => setUnlocking(false), 800);
    }
  }, [phaseUnlocked]);

  return (
    <div
      className={`relative p-6 bg-gradient-to-br from-white via-gold/10 to-charcoal/5 rounded-xl shadow-lg transition-all duration-700 ${
        unlocking ? "animate-fadeScale" : ""
      }`}
    >
      <h2 className="text-2xl font-bold text-charcoal mb-2 text-center">
        Phase {phase.phaseNumber}: {phase.title || "Untitled Phase"}
      </h2>
      <p className="text-center text-sm text-gray-700 mb-4">
        {totalCompleted}/{phase.levels.length} Completed
      </p>

      <div className="grid grid-cols-5 gap-6 place-items-center relative z-10">
        {phase.levels.map((level, i) => {
          const isFirst = i === 0;
          const prevCompleted = isFirst
            ? phaseUnlocked
            : completedLevels.includes(phase.levels[i - 1].id);

          const isUnlocked = level.completed || prevCompleted;
          const isCurrent = level.id === currentLevelId;

          return (
            <div key={level.id} className="relative">
              <LevelButton
                level={level}
                isUnlocked={isUnlocked}
                onClick={() => {
                  if (isUnlocked && phaseUnlocked) {
                    onSelectLevel(level, i);
                  }
                }}
              />

              {/* ✅ Avatar icon on current level */}
              {isCurrent && (
                <img
                  src={avatarIcon}
                  alt="Avatar"
                  className="w-10 h-10 absolute -top-4 -left-4 rounded-full border-2 border-gold shadow-md animate-bounce z-0"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 🔒 Overlay for locked phase */}
      {!phaseUnlocked && (
        <div className="absolute inset-0 bg-black/40 rounded-xl flex flex-col items-center justify-center z-20 text-white text-center px-4">
          <Lock className="w-10 h-10 mb-2" />
          <p className="text-sm font-medium">
            Complete the Previous Phase to Light UP
          </p>
        </div>
      )}
    </div>
  );
}
