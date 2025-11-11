// src/components/LevelButton.jsx
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { MdLightbulb } from "react-icons/md";

export default function LevelButton({ level, isUnlocked, onClick }) {
  const baseClass =
    "w-16 h-16 sm:w-20 sm:h-20 rounded-full font-bold transition-all duration-300 flex items-center justify-center relative";

  const completedStyle = "golden-gradient text-white shadow-[0_8px_20px_rgba(255,217,61,0.6)] ring-4 ring-candyYellow/40 animate-glow";
  const unlockedStyle = "bg-white text-candyBlue shadow-[0_8px_20px_rgba(79,156,249,0.4)] ring-4 ring-candyBlue/30 pulse-glow hover:shadow-[0_12px_30px_rgba(79,156,249,0.6)]";
  const lockedStyle =
    "bg-gray-400/50 ring-4 ring-gray-300/50 text-gray-300 cursor-not-allowed opacity-60";

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
          <MdLightbulb
            size={32}
            className="sm:size-36 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)] animate-sparkle"
          />
          <div className="absolute inset-0 rounded-full bg-candyYellow/20 animate-ping" />
        </>
      ) : isUnlocked ? (
        <span className="text-2xl sm:text-3xl font-black">{level.number}</span>
      ) : (
        <Lightbulb
          size={24}
          className="sm:size-28 animate-pulse text-gray-300"
        />
      )}
    </motion.button>
  );
}
