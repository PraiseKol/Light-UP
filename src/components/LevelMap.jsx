// src/components/LevelMap.jsx
import { useEffect, useRef, useState } from "react";
import LevelButton from "./LevelButton";
import { Lock } from "lucide-react";
import { levelPhases } from "data/levelData";
import SpiritualParallaxBackground from "./SpiritualParallaxBackground";
import avatarIcon from "assets/avatar.png";

export default function LevelMap({
  phase,
  onSelectLevel,
  phaseIndex,
  completedLevels,
  currentLevelId,
  isLocked,
}) {
  const isPhase1 = phaseIndex === 0;
  const prevPhaseLastLevelId = !isPhase1
    ? levelPhases[phaseIndex - 1].levels.slice(-1)[0].id
    : null;

  const phaseUnlocked =
    isPhase1 || completedLevels.includes(prevPhaseLastLevelId);

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
    <div className="relative w-full h-[500px] overflow-hidden rounded-xl shadow-lg">
      {/* Background */}
      <SpiritualParallaxBackground />

      {/* SVG path connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {phase.levels.map((level, i) => {
          if (i === 0) return null;
          const prev = phase.levels[i - 1];
          const curr = level;

          const prevCompleted = completedLevels.includes(prev.id);
          const glowColor = prevCompleted ? "#FFD700" : "#888";

          return (
            <line
              key={`line-${prev.id}-${curr.id}`}
              x1={`${prev.position.x}%`}
              y1={`${prev.position.y}%`}
              x2={`${curr.position.x}%`}
              y2={`${curr.position.y}%`}
              stroke={glowColor}
              strokeWidth={prevCompleted ? 4 : 2}
              strokeLinecap="round"
              style={{
                filter: prevCompleted
                  ? "drop-shadow(0 0 6px rgba(255,215,0,0.8))"
                  : "none",
              }}
            />
          );
        })}
      </svg>

      {/* Levels */}
      {phase.levels.map((level, i) => {
        const isFirst = i === 0;
        const prevCompleted = isFirst
          ? phaseUnlocked
          : completedLevels.includes(phase.levels[i - 1].id);

        const isUnlocked = level.completed || prevCompleted;
        const isCurrent = level.id === currentLevelId;

        return (
          <div
            key={level.id}
            className="absolute"
            style={{
              left: `${level.position.x}%`,
              top: `${level.position.y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: isCurrent ? 20 : 10,
            }}
          >
            <LevelButton
              level={level}
              isUnlocked={isUnlocked}
              onClick={() => {
                if (isUnlocked && phaseUnlocked) {
                  onSelectLevel(level, i);
                }
              }}
            />

            {/* Avatar */}
            {isCurrent && (
              <img
                src={avatarIcon}
                alt="Avatar"
                className="w-10 h-10 absolute -top-12 left-1/2 -translate-x-1/2 rounded-full border-2 border-gold shadow-md animate-bounce"
              />
            )}
          </div>
        );
      })}

      {/* Lock overlay */}
      {(!phaseUnlocked || (phaseUnlocked && isLocked)) && (
        <div
          className="absolute inset-0 bg-black/50 rounded-xl flex flex-col items-center justify-center z-20 text-white text-center px-4"
          title={
            !phaseUnlocked
              ? "Complete the previous phase first."
              : "You're out of lives! Please wait or get more from the store."
          }
        >
          <Lock className="w-10 h-10 mb-2" />
          <p className="text-sm font-medium">
            {!phaseUnlocked
              ? "Complete the Previous Phase to Light UP"
              : "No lives left! Come back later."}
          </p>
        </div>
      )}
    </div>
  );
}
