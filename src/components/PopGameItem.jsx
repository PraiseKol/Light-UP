import React, { useState } from 'react';
import { motion } from 'framer-motion';

const ITEM_CONFIG = {
  heart: { emoji: '❤️', points: 5, color: 'from-red-400 to-pink-500' },
  santa: { emoji: '🎅', points: 5, color: 'from-red-500 to-red-700' },
  lamp: { emoji: '🪔', points: 10, color: 'from-amber-400 to-orange-500' },
  dove: { emoji: '🕊️', points: 15, color: 'from-white to-gray-200' },
  cross: { emoji: '✝️', points: 20, color: 'from-yellow-300 to-amber-500' }
};

const PopGameItem = ({ item, onPop }) => {
  const [isPopped, setIsPopped] = useState(false);
  const config = ITEM_CONFIG[item.type];
  
  const handleInteraction = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent double-tap issues
    if (isPopped) return;
    setIsPopped(true);
    
    const rect = e.currentTarget.getBoundingClientRect();
    onPop(item.id, config.points, rect.left + rect.width / 2, rect.top);
  };

  if (isPopped) return null;

  return (
    <motion.div
      initial={{ y: -60, opacity: 0, rotate: 0 }}
      animate={{ 
        y: window.innerHeight + 60, 
        opacity: 1,
        rotate: [0, 10, -10, 5, -5, 0]
      }}
      exit={{ scale: 1.5, opacity: 0 }}
      transition={{ 
        y: { duration: item.speed, ease: 'linear' },
        rotate: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
        opacity: { duration: 0.3 }
      }}
      onPointerDown={handleInteraction}
      onTouchStart={handleInteraction}
      className="absolute cursor-pointer select-none touch-none"
      style={{ 
        left: item.x,
        zIndex: 50
      }}
    >
      {/* Larger invisible hit area for easier tapping */}
      <div className="relative">
        <div 
          className="absolute -inset-4 sm:-inset-3"
          aria-hidden="true"
        />
        <div className={`
          w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full 
          bg-gradient-to-br ${config.color}
          flex items-center justify-center
          shadow-lg shadow-black/30
          border-2 border-white/50
          transition-transform duration-75
          active:scale-90
        `}>
          <span className="text-3xl sm:text-4xl pointer-events-none">{config.emoji}</span>
        </div>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 
          text-xs font-bold text-white bg-black/50 px-1.5 rounded-full pointer-events-none">
          +{config.points}
        </div>
      </div>
    </motion.div>
  );
};

export default PopGameItem;
