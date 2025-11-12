// src/components/LevelButton.jsx
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { MdLightbulb } from "react-icons/md";

export default function LevelButton({ level, isUnlocked, onClick }) {
  const baseClass = `
    w-20 h-20 sm:w-24 sm:h-24 
    rounded-full font-bold 
    transition-all duration-300 
    flex items-center justify-center 
    relative
  `;

  const completedStyle = `
    golden-gradient text-white 
    shadow-[0_6px_0_#d4a500,0_12px_20px_rgba(255,217,61,0.6)] 
    ring-4 ring-candyYellow/40 
    super-glow
    hover:shadow-[0_4px_0_#d4a500,0_8px_20px_rgba(255,217,61,0.7)]
    active:shadow-[0_2px_0_#d4a500,0_4px_10px_rgba(255,217,61,0.8)]
    active:translate-y-1
  `;

  const unlockedStyle = `
    bg-white text-candyBlue 
    shadow-[0_6px_0_#4F9CF9,0_12px_20px_rgba(79,156,249,0.5)] 
    ring-4 ring-candyBlue/30 
    pulse-glow
    hover:shadow-[0_8px_0_#4F9CF9,0_16px_30px_rgba(79,156,249,0.7)]
    hover:translate-y-[-2px]
    active:shadow-[0_2px_0_#4F9CF9,0_6px_15px_rgba(79,156,249,0.8)]
    active:translate-y-1
  `;

  const lockedStyle = `
    bg-gray-300/60 
    shadow-[0_4px_0_#999,0_8px_15px_rgba(0,0,0,0.2)]
    ring-4 ring-gray-400/40 
    text-gray-400 
    cursor-not-allowed 
    opacity-50
  `;

  return (
    <motion.button
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      whileHover={isUnlocked && !level.completed ? { scale: 1.15, rotate: 5 } : {}}
      whileTap={isUnlocked && !level.completed ? { scale: 0.95 } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`${baseClass} ${
        level.completed
          ? completedStyle
          : isUnlocked
          ? unlockedStyle
          : lockedStyle
      }`}
      disabled={!isUnlocked}
      onClick={() => isUnlocked && onClick(level)}
    >
      {level.completed ? (
        <>
          <div className="absolute inset-2 rounded-full bg-gradient-to-b from-white/30 to-transparent" />
          <MdLightbulb
            size={40}
            className="sm:size-48 text-white drop-shadow-[0_0_12px_rgba(255,255,255,1)] animate-sparkle relative z-10"
          />
          <div className="absolute inset-0 rounded-full bg-candyYellow/20 animate-ping" />
        </>
      ) : isUnlocked ? (
        <>
          <div className="absolute inset-2 rounded-full bg-gradient-to-b from-white/50 to-transparent" />
          <span className="text-3xl sm:text-4xl font-black drop-shadow-lg relative z-10">
            {level.number}
          </span>
        </>
      ) : (
        <Lightbulb
          size={32}
          className="sm:size-36 animate-pulse text-gray-400"
        />
      )}
    </motion.button>
  );
}
