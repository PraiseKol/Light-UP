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
        const glowColor = prevCompleted ? "url(#goldGradient)" : "#888888";
        const strokeW = prevCompleted ? 20 : 14;

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
      className="relative w-full min-h-[1500px] pb-12
        rounded-3xl shadow-[0_10px_50px_rgba(79,156,249,0.4)]
        bg-gradient-to-b from-sky-100/40 via-purple-50/30 to-pink-50/40
        backdrop-blur-sm 
        border-4 border-white/50 
        max-w-3xl mx-auto mb-8"
      style={{
        backgroundImage: `url('/clouds.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Phase Title */}
      <div className="text-center py-8 sticky top-0 z-10 bg-gradient-to-b from-white/40 via-blue-50/30 to-transparent backdrop-blur-md">
        <h2 className="text-4xl md:text-7xl font-black bg-gradient-to-r from-candyBlue via-candyPurple to-candyPink bg-clip-text text-transparent drop-shadow-[0_4px_10px_rgba(79,156,249,0.4)]">
          Phase {phase.phaseNumber}
        </h2>
      </div>

      {/* SVG paths with enhanced glow */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFD93D" />
            <stop offset="50%" stopColor="#FFA500" />
            <stop offset="100%" stopColor="#FFD93D" />
          </linearGradient>
          
          <filter id="pathGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {paths.map((p) => (
          <path
            key={p.id}
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth={p.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: p.glow ? "url(#pathGlow) drop-shadow(0 0 12px rgba(255,215,0,0.9))" : "none",
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
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center animate-float">
                <img
                  src={avatarIcon}
                  alt="Avatar"
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-[0_6px_20px_rgba(79,156,249,0.8)] border-3 sm:border-4 border-white ring-4 ring-candyBlue/40 animate-pulse"
                />
                <div className="mt-2 px-3 py-1 bg-gradient-to-r from-candyYellow to-yellow-500 text-white text-xs font-black rounded-full shadow-lg">
                  YOU
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Lock overlay */}
      {(!phaseUnlocked || (phaseUnlocked && isLocked)) && (
        <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center z-30">
          <div className="bg-white/20 backdrop-blur-md rounded-full p-8 mb-6 shadow-[0_0_40px_rgba(255,255,255,0.3)] animate-float">
            <Lock className="w-16 h-16 text-white drop-shadow-lg animate-pulse" />
          </div>
          <p className="text-white text-xl font-black drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            {!phaseUnlocked 
              ? `Complete Phase ${phase.phaseNumber - 1} to Unlock`
              : "Out of Lives - Visit the Store!"}
          </p>
        </div>
      )}
    </div>
  );
}
