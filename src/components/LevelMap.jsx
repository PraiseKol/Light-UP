// src/components/LevelMap.jsx
import { useEffect, useRef, useState } from "react";
import LevelButton from "./LevelButton";
import { Lock } from "lucide-react";
import { levelPhases } from "@/data/levelData";
import avatarIcon from "@/assets/avatar.png";
import { useGameUser } from "@/hooks/useGameUser";

export default function LevelMap({
  phase,
  onSelectLevel,
  phaseIndex,
  completedLevels,
  currentLevelId,
  isLocked,
  levelRefs, // 👈 received from parent
}) {
  const containerRef = useRef(null);
  const { gameUser } = useGameUser();

  const [paths, setPaths] = useState([]);

  // 🔥 always scroll to current level (mobile + desktop)
  useEffect(() => {
    if (!containerRef.current) return;

    if (!currentLevelId && completedLevels.length === 0) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    } else if (currentLevelId && levelRefs.current[currentLevelId]) {
      levelRefs.current[currentLevelId].scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }
  }, [currentLevelId, completedLevels, levelRefs]);

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

  // helper: get button center relative to container
  function getButtonCenter(levelId) {
    const el = levelRefs.current[levelId];
    if (!el || !containerRef.current) return null;
    const rect = el.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top + rect.height / 2 - containerRect.top,
    };
  }

  // recompute paths when levels render or resize
  useEffect(() => {
    function computePaths() {
      const newPaths = [];
      phase.levels.forEach((level, i) => {
        if (i === 0) return;
        const prev = phase.levels[i - 1];

        const prevCenter = getButtonCenter(prev.id);
        const currCenter = getButtonCenter(level.id);
        if (!prevCenter || !currCenter) return;

        const prevCompleted = completedLevels.includes(prev.id);
        const glowColor = prevCompleted ? "#e0be12" : "#2c2c2c";
        const strokeW = prevCompleted ? 16 : 12;

        // midpoint curve control points
        const cx1 = (prevCenter.x + currCenter.x) / 2;
        const cy1 = prevCenter.y;
        const cx2 = (prevCenter.x + currCenter.x) / 2;
        const cy2 = currCenter.y;

        newPaths.push({
          id: `${prev.id}-${level.id}`,
          d: `M ${prevCenter.x} ${prevCenter.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${currCenter.x} ${currCenter.y}`,
          color: glowColor,
          width: strokeW,
          glow: prevCompleted,
        });
      });
      setPaths(newPaths);
    }

    computePaths();
    window.addEventListener("resize", computePaths);
    return () => window.removeEventListener("resize", computePaths);
  }, [phase, completedLevels]);

  return (
    <div
      ref={containerRef}
      className="
        relative 
        w-full 
        h-[120vh] sm:h-[150vh]
        overflow-y-auto 
        rounded-xl 
        shadow-lg 
        bg-transparent
        max-w-sm sm:max-w-full
        mx-auto
      "
    >
      {/* Background Phase Title */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <h1 className="text-lg md:text-4xl font-extrabold text-black/20 text-center tracking-wider select-none">
          {`Phase ${phase.phaseNumber} : ${phase.title}`}
        </h1>
      </div>

      {/* SVG curved paths */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {paths.map((p) => (
          <path
            key={p.id}
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth={p.width}
            strokeLinecap="round"
            style={{
              filter: p.glow
                ? "drop-shadow(0 0 8px rgba(255,215,0,0.8))"
                : "none",
            }}
            vectorEffect="non-scaling-stroke"
          />
        ))}
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
            style={{
              left: `${level.position.x}%`,
              top: `${level.position.y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: isCurrent ? 20 : 10,
            }}
            className="absolute"
          >
            <div
              ref={(el) => {
                if (el) levelRefs.current[level.id] = el; // 👈 reliably registers
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
            </div>

            {isCurrent && (
              <div className="absolute -top-6 left-1/4 -translate-x-1/2 flex flex-col items-center">
                <img
                  src={avatarIcon}
                  alt="Avatar"
                  className="w-8 h-8 sm:w-12 sm:h-12 rounded-full shadow-md animate-bounce"
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
