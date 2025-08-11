// src/components/LevelButton.jsx
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { MdLightbulb } from "react-icons/md";

export default function LevelButton({ level, isUnlocked, onClick }) {
  const baseClass =
    "w-16 h-16 rounded-full font-bold shadow-xl transition-all duration-300 flex items-center justify-center";

  const completedStyle = "bg-black text-yellow-300 ring-4 ring-blue-400 ";
  const unlockedStyle = "bg-black text-white glow-ring";
  const lockedStyle =
    "bg-black ring-4 ring-yellow-400 text-yellow-400 cursor-not-allowed";

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={isUnlocked && !level.completed ? { scale: 1.1 } : {}}
      transition={{ type: "spring", stiffness: 200 }}
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
        <MdLightbulb
          size={30}
          className="text-yellow-300 drop-shadow-[0_0_6px_rgba(253,224,71,0.8)] animate-flicker"
        />
      ) : isUnlocked ? (
        level.number
      ) : (
        <Lightbulb size={25} className="animate-pulse text-yellow-300" />
      )}
    </motion.button>
  );
}
