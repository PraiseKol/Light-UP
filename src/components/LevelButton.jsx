// src/components/LevelButton.jsx
import { motion } from "framer-motion";
import { Lock, Crown, Star } from "lucide-react";
import { MdLightbulb } from "react-icons/md";

export default function LevelButton({ level, isUnlocked, onClick }) {
  const baseClass = `
    w-16 h-16 sm:w-20 sm:h-20 lg:w-20 lg:h-20 xl:w-20 xl:h-20
    rounded-full font-bold 
    transition-all duration-200 
    flex items-center justify-center 
    relative
    border-4
  `;

  // 3D Candy-style completed level (golden bubble)
  const completedStyle = `
    bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500
    border-yellow-600
    shadow-[0_6px_0_#b45309,0_2px_10px_rgba(251,191,36,0.6),inset_0_-2px_0_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.4)]
    hover:shadow-[0_4px_0_#b45309,0_2px_8px_rgba(251,191,36,0.8),inset_0_-2px_0_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.4)]
    hover:translate-y-[2px]
    active:shadow-[0_1px_0_#b45309,0_1px_4px_rgba(251,191,36,1),inset_0_-1px_0_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.5)]
    active:translate-y-[5px]
  `;

  // 3D Candy-style unlocked level (blue/purple bubble)
  const unlockedStyle = `
    bg-gradient-to-br from-blue-400 via-purple-400 to-blue-500
    border-blue-600
    shadow-[0_6px_0_#1e40af,0_2px_10px_rgba(96,165,250,0.6),inset_0_-2px_0_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.4)]
    hover:shadow-[0_8px_0_#1e40af,0_2px_12px_rgba(96,165,250,0.8),inset_0_-2px_0_rgba(0,0,0,0.2),inset_0_3px_0_rgba(255,255,255,0.5)]
    hover:translate-y-[-2px]
    active:shadow-[0_2px_0_#1e40af,0_1px_6px_rgba(96,165,250,1),inset_0_-1px_0_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.5)]
    active:translate-y-[4px]
    animate-pulse
  `;

  // 3D locked level (gray bubble)
  const lockedStyle = `
    bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500
    border-gray-500
    shadow-[0_4px_0_#6b7280,0_2px_8px_rgba(156,163,175,0.4),inset_0_-2px_0_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.3)]
    cursor-not-allowed 
    opacity-70
  `;

  return (
    <motion.button
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      whileHover={
        isUnlocked && !level.completed ? { scale: 1.1 } : {}
      }
      whileTap={isUnlocked && !level.completed ? { scale: 0.9 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
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
      {/* Inner highlight/gloss effect */}
      <div className="absolute inset-2 rounded-full bg-gradient-to-b from-white/40 via-transparent to-transparent" />
      
      {level.completed ? (
        <>
          {/* Crown decoration on top */}
          <Crown className="absolute -top-4 left-1/2 -translate-x-1/2 w-6 h-6 text-yellow-600 drop-shadow-lg" />
          
          {/* Lightbulb icon */}
          <MdLightbulb className="w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] relative z-10" />
          
          {/* Sparkle effect */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ 
              boxShadow: [
                "0 0 20px rgba(250,204,21,0.5)",
                "0 0 40px rgba(250,204,21,0.8)",
                "0 0 20px rgba(250,204,21,0.5)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </>
      ) : isUnlocked ? (
        <>
          {/* Level number */}
          <span className="text-3xl sm:text-4xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] relative z-10">
            {level.number}
          </span>
          
          {/* Play indicator */}
          <Star className="absolute -top-2 -right-2 w-5 h-5 text-yellow-300 drop-shadow-lg animate-bounce" />
        </>
      ) : (
        <>
          {/* Lock icon */}
          <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-gray-600 relative z-10" />
        </>
      )}
    </motion.button>
  );
}
