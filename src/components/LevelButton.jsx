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

  // 3D Candy-style completed level (golden bubble with extra shine)
  const completedStyle = `
    bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500
    border-yellow-600
    shadow-[0_8px_0_#b45309,0_4px_16px_rgba(251,191,36,0.8),inset_0_-3px_0_rgba(0,0,0,0.25),inset_0_3px_0_rgba(255,255,255,0.6)]
    hover:shadow-[0_6px_0_#b45309,0_3px_12px_rgba(251,191,36,0.9),inset_0_-2px_0_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.5)]
    hover:translate-y-[2px]
    active:shadow-[0_2px_0_#b45309,0_2px_6px_rgba(251,191,36,1),inset_0_-1px_0_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.5)]
    active:translate-y-[6px]
  `;

  // 3D Candy-style unlocked level (vibrant blue/purple bubble)
  const unlockedStyle = `
    bg-gradient-to-br from-blue-400 via-purple-500 to-blue-600
    border-blue-700
    shadow-[0_8px_0_#1e40af,0_4px_16px_rgba(96,165,250,0.8),inset_0_-3px_0_rgba(0,0,0,0.25),inset_0_3px_0_rgba(255,255,255,0.5)]
    hover:shadow-[0_10px_0_#1e40af,0_5px_20px_rgba(96,165,250,1),inset_0_-3px_0_rgba(0,0,0,0.2),inset_0_4px_0_rgba(255,255,255,0.6)]
    hover:translate-y-[-2px]
    active:shadow-[0_3px_0_#1e40af,0_2px_8px_rgba(96,165,250,1),inset_0_-1px_0_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.5)]
    active:translate-y-[5px]
    animate-pulse
  `;

  // 3D locked level (subtle gray bubble)
  const lockedStyle = `
    bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500
    border-gray-600
    shadow-[0_5px_0_#6b7280,0_2px_10px_rgba(156,163,175,0.5),inset_0_-2px_0_rgba(0,0,0,0.2),inset_0_2px_0_rgba(255,255,255,0.3)]
    cursor-not-allowed 
    opacity-60
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
      {/* Inner highlight/gloss effect - enhanced */}
      <div className="absolute inset-2 rounded-full bg-gradient-to-b from-white/50 via-white/20 to-transparent" />
      
      {level.completed ? (
        <>
          {/* Crown decoration on top */}
          <Crown className="absolute -top-5 left-1/2 -translate-x-1/2 w-7 h-7 text-yellow-700 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
          
          {/* Checkmark icon for completed */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center relative z-10">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          {/* Sparkle effect - enhanced */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ 
              boxShadow: [
                "0 0 25px rgba(250,204,21,0.6)",
                "0 0 45px rgba(250,204,21,1)",
                "0 0 25px rgba(250,204,21,0.6)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* Corner stars */}
          <Star className="absolute -top-2 -right-2 w-4 h-4 text-yellow-300 fill-yellow-300 drop-shadow-lg" />
          <Star className="absolute -bottom-2 -left-2 w-3 h-3 text-yellow-200 fill-yellow-200 drop-shadow-lg" />
        </>
      ) : isUnlocked ? (
        <>
          {/* Level number with better contrast */}
          <span className="text-4xl sm:text-5xl font-black text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)] relative z-10">
            {level.number}
          </span>
          
          {/* Glowing ring animation */}
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-white/40"
            animate={{ 
              scale: [1, 1.15, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* Play indicator */}
          <Star className="absolute -top-2 -right-2 w-6 h-6 text-yellow-300 fill-yellow-300 drop-shadow-lg animate-bounce" />
        </>
      ) : (
        <>
          {/* Lock icon - larger and more prominent */}
          <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-gray-600 drop-shadow-md relative z-10" />
        </>
      )}
    </motion.button>
  );
}
