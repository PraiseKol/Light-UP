// src/components/LevelButton.jsx
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { MdLightbulb } from "react-icons/md";

export default function LevelButton({ level, isUnlocked, onClick }) {
  const baseClass = `
    w-16 h-16 sm:w-20 sm:h-20 
    rounded-full font-bold 
    transition-all duration-300 
    flex items-center justify-center 
    relative
  `;

  const completedStyle = `
    golden-gradient text-white 
    shadow-[0_8px_0_#d4a500,0_4px_0_#FFD93D_inset,0_15px_25px_rgba(255,217,61,0.7)] 
    ring-4 ring-candyYellow/50 
    super-glow
    hover:shadow-[0_6px_0_#d4a500,0_3px_0_#FFD93D_inset,0_12px_22px_rgba(255,217,61,0.8)]
    hover:translate-y-[2px]
    active:shadow-[0_2px_0_#d4a500,0_1px_0_#FFD93D_inset,0_6px_12px_rgba(255,217,61,0.9)]
    active:translate-y-[6px]
  `;

  const unlockedStyle = `
    bg-white text-candyBlue 
    shadow-[0_8px_0_#3B7DD6,0_4px_0_#E0F2FE_inset,0_15px_25px_rgba(79,156,249,0.6)] 
    ring-4 ring-candyBlue/40 
    pulse-glow
    hover:shadow-[0_10px_0_#3B7DD6,0_5px_0_#E0F2FE_inset,0_18px_30px_rgba(79,156,249,0.8)]
    hover:translate-y-[-2px]
    active:shadow-[0_3px_0_#3B7DD6,0_2px_0_#E0F2FE_inset,0_8px_15px_rgba(79,156,249,0.9)]
    active:translate-y-[5px]
  `;

  const lockedStyle = `
    bg-gray-300/80 
    shadow-[0_5px_0_#999,0_2px_0_#e5e5e5_inset,0_10px_20px_rgba(0,0,0,0.3)]
    ring-4 ring-gray-400/50 
    text-gray-500 
    cursor-not-allowed 
    opacity-60
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
            size={32}
            className="sm:size-40 text-white drop-shadow-[0_0_12px_rgba(255,255,255,1)] animate-sparkle relative z-10"
          />
          <div className="absolute inset-0 rounded-full bg-candyYellow/20 animate-ping" />
        </>
      ) : isUnlocked ? (
        <>
          <div className="absolute inset-2 rounded-full bg-gradient-to-b from-white/50 to-transparent" />
          <span className="text-2xl sm:text-3xl font-black drop-shadow-lg relative z-10">
            {level.number}
          </span>
        </>
      ) : (
        <Lightbulb
          size={28}
          className="sm:size-32 animate-pulse text-gray-400"
        />
      )}
    </motion.button>
  );
}
