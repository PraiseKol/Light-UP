import { useEffect, useRef, useState } from "react";
import LevelButton from "./LevelButton";
import { Lock } from "lucide-react";
import { levelPhases } from "@/data/levelData";
import avatarIcon from "@/assets/avatar.png";
import { useGameUser } from "@/hooks/useGameUser";

import clouds from "@/assets/clouds.png";          // ✅ Vercel-safe import
import goldenPath from "@/assets/golden-path.png"; // ✅ Vercel-safe import

export default function LevelMap({
  phase,
  onSelectLevel,
  phaseIndex,
  completedLevels,
  currentLevelId,
  isLocked,
  levelRefs,
}) {
  const containerRef = useRef(null);
  const { gameUser } = useGameUser();
  const [paths, setPaths] = useState([]);

  // Auto-scroll to current level
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

  // Get button center
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

  // Compute connecting glow paths
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

        newPaths.push({
          id: `${prev.id}-${level.id}`,
          d: `M ${prevCenter.x} ${prevCenter.y}
               C ${(prevCenter.x + currCenter.x) / 2} ${prevCenter.y},
                 ${(prevCenter.x + currCenter.x) / 2} ${currCenter.y},
                 ${currCenter.x} ${currCenter.y}`,
          color: prevCompleted ? "url(#goldGradient)" : "#888888",
          width: prevCompleted ? 20 : 14,
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
        relative w-full min-h-[1400px] pb-20
        rounded-3xl shadow-[0_10px_50px_rgba(79,156,249,0.4)]
        bg-gradient-to-b from-sky-100/40 via-purple-50/30 to-pink-50/40
        backdrop-blur-sm border-4 border-white/50
        max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto mb-12
      "
      style={{
        backgroundImage: `url(${clouds})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Phase Title */}
      <div className="text-center py-8 sticky top-0 z-10 bg-gradient-to-b from-white/40 via-blue-50/30 to-transparent backdrop-blur-md">
        <h2 className="text-4xl md:text-7xl font-black bg-gradient-to-r from-candyBlue via-candyPurple to-candyPink bg-clip-text text-transparent drop-shadow-[0_4px_10px_rgba(79,156,249,0.4)]">
          Phase {phase.phaseNumber}
        </h2>
      </div>

      {/* SVG paths */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFD93D" />
            <stop offset="50%" stopColor="#FFA500" />
            <stop offset="100%" stopColor="#FFD93D" />
          </linearGradient>

          <filter id="pathGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
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
              filter: p.glow
                ? "url(#pathGlow) drop-shadow(0 0 12px rgba(255,215,0,0.9))"
                : "none",
            }}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* LEVEL BUTTONS */}
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
            <div
              ref={(el) => {
                if (el) levelRefs.current[level.id] = el;
              }}
            >
              <LevelButton
                level={level}
                isUnlocked={isUnlocked}
                onClick={() => isUnlocked && phaseUnlocked && onSelectLevel(level)}
              />
            </div>

            {/* Current player indicator */}
            {isCurrent && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center animate-float">
                <img
                  src={avatarIcon}
                  alt="Avatar"
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-[0_6px_20px_rgba(79,156,249,0.8)] border-4 border-white ring-4 ring-candyBlue/40 animate-pulse"
                />
                <div className="mt-2 px-3 py-1 bg-gradient-to-r from-candyYellow to-yellow-600 text-white text-xs font-black rounded-full shadow-lg">
                  YOU
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Lock Overlay */}
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

      {/* 🌟 Golden Path at Bottom
      <div
        className="absolute bottom-0 left-0 w-full h-40 opacity-90 pointer-events-none"
        style={{
          backgroundImage: `url(${goldenPath})`,
          backgroundSize: "cover",
          backgroundPosition: "bottom",
          backgroundRepeat: "no-repeat",
        }}
      /> */}
    </div>
  );
}
