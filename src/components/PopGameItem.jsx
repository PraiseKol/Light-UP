import React from 'react';
import { motion } from 'framer-motion';

const ITEM_CONFIG = {
  heart: { emoji: '❤️', points: 5, color: 'from-red-400 to-pink-500' },
  santa: { emoji: '🎅', points: 5, color: 'from-red-500 to-red-700' },
  lamp: { emoji: '🪔', points: 10, color: 'from-amber-400 to-orange-500' },
  dove: { emoji: '🕊️', points: 15, color: 'from-white to-gray-200' },
  cross: { emoji: '✝️', points: 20, color: 'from-yellow-300 to-amber-500' }
};

const PopGameItem = ({ item, onPop }) => {
  const config = ITEM_CONFIG[item.type];
  
  const handleClick = (e) => {
    e.stopPropagation();
    onPop(item.id, config.points);
  };

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
      onClick={handleClick}
      className="absolute cursor-pointer select-none"
      style={{ left: item.x }}
    >
      <div className={`
        w-14 h-14 sm:w-16 sm:h-16 rounded-full 
        bg-gradient-to-br ${config.color}
        flex items-center justify-center
        shadow-lg shadow-black/30
        border-2 border-white/50
        hover:scale-110 active:scale-90
        transition-transform duration-100
      `}>
        <span className="text-2xl sm:text-3xl">{config.emoji}</span>
      </div>
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 
        text-xs font-bold text-white bg-black/50 px-1.5 rounded-full">
        +{config.points}
      </div>
    </motion.div>
  );
};

export default PopGameItem;
