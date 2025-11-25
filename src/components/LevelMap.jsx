import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import LevelButton from "./LevelButton";
import MapBackground from "./MapBackground";

export default function LevelMap({
  phase,
  onSelectLevel,
  phaseIndex,
  completedLevels,
  currentLevelId,
  isLocked,
  levelRefs,
}) {
  const scrollContainerRef = useRef(null);
  const buttonRefs = useRef([]);
  const [pathData, setPathData] = useState([]);
  const [containerHeight, setContainerHeight] = useState(0);

  // Determine if a level is unlocked
  const isLevelUnlocked = (level) => {
    const levelIdx = phase.levels.findIndex((l) => l.id === level.id);
    if (levelIdx === 0) return true; // First level always unlocked
    const prevLevel = phase.levels[levelIdx - 1];
    return completedLevels.includes(prevLevel.id);
  };

  const isPhaseUnlocked = phaseIndex === 0 || completedLevels.some((id) => {
    const prevPhaseLastLevel = phase.levels[phase.levels.length - 1];
    return id === prevPhaseLastLevel.id;
  });

  const handleLevelClick = (level) => {
    if (isLevelUnlocked(level) && isPhaseUnlocked) {
      onSelectLevel(level);
    }
  };

  // Auto-scroll to current level
  useEffect(() => {
    if (currentLevelId && buttonRefs.current[currentLevelId]) {
      setTimeout(() => {
        buttonRefs.current[currentLevelId]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
    }
  }, [currentLevelId]);

  // Calculate container height based on level count (140px per level)
  useEffect(() => {
    const levelsPerPhase = phase.levels.length;
    const calculatedHeight = (levelsPerPhase * 140) + 300; // 140px per level + 300px padding
    setContainerHeight(calculatedHeight);
    console.log(`📐 Phase ${phase.phaseNumber} container height: ${calculatedHeight}px for ${levelsPerPhase} levels`);
  }, [phase]);

  // Get button center coordinates
  const getButtonCenter = (idx) => {
    const el = buttonRefs.current[idx];
    if (!el || !scrollContainerRef.current) return null;

    const rect = el.getBoundingClientRect();
    const containerRect = scrollContainerRef.current.getBoundingClientRect();
    const scrollTop = scrollContainerRef.current.scrollTop;

    return {
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top + rect.height / 2 - containerRect.top + scrollTop,
    };
  };

  // Compute paths between levels
  const computePaths = () => {
    const paths = [];

    phase.levels.forEach((level, i) => {
      if (i === 0) return;

      const prevLevel = phase.levels[i - 1];
      const prevCenter = getButtonCenter(i - 1);
      const currCenter = getButtonCenter(i);

      if (!prevCenter || !currCenter) return;

      const prevCompleted = completedLevels.includes(prevLevel.id);
      const currUnlocked = isLevelUnlocked(level);

      let strokeColor;
      let strokeWidth;
      let glow = false;

      if (prevCompleted) {
        strokeColor = "url(#goldenScroll)";
        strokeWidth = 16;
        glow = true;
      } else if (currUnlocked) {
        strokeColor = "url(#divinePath)";
        strokeWidth = 12;
      } else {
        strokeColor = "url(#ancientPath)";
        strokeWidth = 8;
      }

      // Smooth quadratic curve (simpler, more reliable)
      const midY = (prevCenter.y + currCenter.y) / 2;

      paths.push({
        id: `${prevLevel.id}-${level.id}`,
        d: `M ${prevCenter.x} ${prevCenter.y} Q ${prevCenter.x} ${midY}, ${currCenter.x} ${currCenter.y}`,
        color: strokeColor,
        width: strokeWidth,
        glow,
      });
    });

    setPathData(paths);
  };

  useEffect(() => {
    const timer = setTimeout(computePaths, 300); // Increased delay for better mounting
    window.addEventListener("resize", computePaths);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", computePaths);
    };
  }, [phase, completedLevels, currentLevelId]);

  return (
    <div
      ref={scrollContainerRef}
      className="relative w-full h-full overflow-y-auto overflow-x-hidden pb-32"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {/* New biblical landscape background */}
      <MapBackground />

      {/* Phase title banner - Candy Crush style */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 py-4 px-6 mb-8"
      >
        <div className="max-w-md mx-auto relative">
          {/* Ribbon background */}
          <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 rounded-2xl shadow-[0_6px_0_#6b21a8,0_8px_20px_rgba(147,51,234,0.4)] px-6 py-3 border-4 border-purple-700">
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-xl" />
            <h2 className="text-2xl sm:text-3xl font-black text-white text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] relative z-10">
              {phase.title}
            </h2>
          </div>
          
          {/* Decorative ribbons on sides */}
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-12 bg-purple-700 rounded-l-full shadow-lg" />
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-12 bg-purple-700 rounded-r-full shadow-lg" />
        </div>
      </motion.div>

      {/* SVG paths connecting levels - Golden biblical scroll style */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ minHeight: containerHeight }}
      >
        <defs>
          {/* Golden scroll gradient for completed paths */}
          <linearGradient id="goldenScroll" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="1" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="1" />
          </linearGradient>

          {/* Divine path gradient for unlocked paths */}
          <linearGradient id="divinePath" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0.7" />
          </linearGradient>

          {/* Locked path gradient */}
          <linearGradient id="ancientPath" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d1d5db" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#9ca3af" stopOpacity="0.3" />
          </linearGradient>

          {/* Divine glow filter */}
          <filter id="divineGlow">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {pathData.map((p, i) => (
          <g key={i}>
            {/* Shadow layer for 3D depth */}
            <motion.path
              d={p.d}
              fill="none"
              stroke="rgba(0,0,0,0.15)"
              strokeWidth={p.width + 6}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, delay: i * 0.08, ease: "easeInOut" }}
              style={{ transform: "translate(2px, 3px)" }}
            />
            {/* Main path */}
            <motion.path
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={p.width + 4}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={p.glow ? "url(#divineGlow)" : undefined}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, delay: i * 0.08, ease: "easeInOut" }}
            />
          </g>
        ))}
      </svg>

      {/* Level buttons */}
      {phase.levels.map((level, idx) => {
        const isUnlocked = isLevelUnlocked(level);
        return (
          <div
            key={level.id}
            ref={(el) => (buttonRefs.current[idx] = el)}
            className="absolute"
            style={{
              left: `${level.position.x}%`,
              top: `${level.position.y}px`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <LevelButton
              level={level}
              isUnlocked={isUnlocked}
              onClick={handleLevelClick}
            />

            {/* "YOU" indicator above current level */}
            {currentLevelId === level.id && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap"
              >
                <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg border-2 border-white">
                  YOU
                </div>
              </motion.div>
            )}
          </div>
        );
      })}

      {/* Overlay if phase is locked */}
      {(!isPhaseUnlocked || (currentLevelId && !isLevelUnlocked)) && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-gradient-to-br from-white via-purple-50 to-blue-50 rounded-3xl p-8 max-w-sm mx-4 text-center shadow-[0_10px_40px_rgba(0,0,0,0.3)] border-4 border-purple-300"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-7xl mb-4"
            >
              🔒
            </motion.div>
            <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 mb-3">
              {!isPhaseUnlocked ? "Phase Locked" : "Level Locked"}
            </h3>
            <p className="text-gray-700 font-medium text-lg">
              {!isPhaseUnlocked
                ? "Complete previous phases to continue your journey"
                : "Complete earlier levels to unlock this one"}
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
