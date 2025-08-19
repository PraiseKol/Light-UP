// src/components/LevelMap.jsx
import { useEffect, useRef, useState } from "react";
import LevelButton from "./LevelButton";
import { Lock } from "lucide-react";
import { levelPhases } from "data/levelData";
import avatarIcon from "assets/avatar.png";
import { useGameUser } from "hooks/useGameUser";

export default function LevelMap({
  phase,
  onSelectLevel,
  phaseIndex,
  completedLevels,
  currentLevelId,
  isLocked,
}) {
  const containerRef = useRef(null);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });

  // 👇 Get player info and rank
  const { gameUser } = useGameUser();


  // Measure container size so SVG coordinates match pixel size
  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setSvgSize({ width, height });
    }
  }, []);

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
    <div
      ref={containerRef}
      className="relative w-full h-[150vh] overflow-hidden rounded-xl shadow-lg bg-transparent"
    >
      {/* Background Phase Title */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <h1 className="text-[5rem] font-extrabold text-black/20 text-center tracking-wider select-none">
          {`Phase ${phase.phaseNumber} : ${phase.title}`}
        </h1>
      </div>

      {/* SVG curved path connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {phase.levels.map((level, i) => {
          if (i === 0) return null;
          const prev = phase.levels[i - 1];
          const curr = level;

          const prevCompleted = completedLevels.includes(prev.id);
          const glowColor = prevCompleted ? "#e0be12" : "#2c2c2c";
          const strokeW = prevCompleted ? 16 : 12; // thicker path

          // Map % to actual container pixel coordinates
          const x1 = (prev.position.x / 100) * svgSize.width;
          const y1 = (prev.position.y / 100) * svgSize.height;
          const x2 = (curr.position.x / 100) * svgSize.width;
          const y2 = (curr.position.y / 100) * svgSize.height;

          // Keep horizontal swing near edges but not touching
          const edgeMargin = svgSize.width * 0.07;
          const minX = edgeMargin;
          const maxX = svgSize.width - edgeMargin;

          const adjX1 = Math.min(Math.max(x1, minX), maxX);
          const adjX2 = Math.min(Math.max(x2, minX), maxX);

          // Smooth Bézier control points for flowing curve
          const cx1 = (adjX1 + adjX2) / 2;
          const cy1 = y1;
          const cx2 = (adjX1 + adjX2) / 2;
          const cy2 = y2;

          return (
            <path
              key={`curve-${prev.id}-${curr.id}`}
              d={`M ${adjX1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${adjX2} ${y2}`}
              fill="none"
              stroke={glowColor}
              strokeWidth={strokeW}
              strokeLinecap="round"
              style={{
                filter: prevCompleted
                  ? "drop-shadow(0 0 8px rgba(255,215,0,0.8))"
                  : "none",
              }}
              vectorEffect="non-scaling-stroke"
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

            {isCurrent && (
              <div className="absolute -top-20 left-1/4 -translate-x-1/2 flex flex-col items-center">
                

                {/* Avatar */}
                <img
                  src={avatarIcon}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full shadow-md animate-bounce"
                />
              </div>
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
