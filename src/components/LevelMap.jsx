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
        rounded-3xl 
        shadow-[0_10px_50px_rgba(79,156,249,0.3)]
        bg-gradient-to-b from-white/20 via-blue-50/10 to-purple-50/10
        backdrop-blur-md
        border-2 border-white/30
        max-w-sm sm:max-w-full
        mx-auto
        scroll-smooth
      "
    >
      {/* Background Phase Title */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <h1 className="text-3xl md:text-6xl font-black bg-gradient-to-r from-candyBlue/30 via-candyPurple/30 to-candyPink/30 bg-clip-text text-transparent text-center tracking-wider select-none drop-shadow-2xl animate-fadeInUp">
          {`Phase ${phase.phaseNumber}: ${phase.title}`}
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
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center animate-float">
                <img
                  src={avatarIcon}
                  alt="Avatar"
                  className="w-10 h-10 sm:w-14 sm:h-14 rounded-full shadow-[0_4px_15px_rgba(79,156,249,0.6)] border-4 border-white animate-pulse"
                />
                <div className="mt-1 px-2 py-0.5 bg-candyYellow text-white text-[10px] font-black rounded-full shadow-md">
                  YOU
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Lock overlay */}
      {(!phaseUnlocked || (phaseUnlocked && isLocked)) && (
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/70 to-black/90 backdrop-blur-xl rounded-3xl flex flex-col items-center justify-center z-20 text-white text-center px-4 animate-fadeIn"
          title={
            !phaseUnlocked
              ? "Complete the previous phase first."
              : "You're out of lives! Please wait or get more from the store."
          }
        >
          <div className="bg-white/20 backdrop-blur-md rounded-full p-8 mb-6 shadow-[0_0_40px_rgba(255,255,255,0.3)] animate-float">
            <Lock className="w-16 h-16 animate-pulse text-candyYellow" />
          </div>
          <p className="text-2xl font-black mb-3 bg-gradient-to-r from-candyYellow to-candyOrange bg-clip-text text-transparent">
            {!phaseUnlocked ? "🔒 Phase Locked" : "💔 Out of Lives"}
          </p>
          <p className="text-base font-semibold opacity-90 max-w-xs">
            {!phaseUnlocked
              ? "Complete the Previous Phase to Light UP"
              : "Come back later or visit the store!"}
          </p>
        </div>
      )}
    </div>
  );
}
