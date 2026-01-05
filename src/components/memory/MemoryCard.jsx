import React from 'react';
import { motion } from 'framer-motion';

const MemoryCard = ({ 
  card, 
  isFlipped, 
  isMatched, 
  onClick,
  disabled 
}) => {
  const handleClick = () => {
    if (!disabled && !isFlipped && !isMatched) {
      onClick(card);
    }
  };

  const renderCardContent = () => {
    if (card.type === 'symbol') {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <span className="text-3xl sm:text-4xl">{card.content}</span>
          <span className="text-[10px] sm:text-xs text-amber-800 mt-1 font-medium">{card.label}</span>
        </div>
      );
    }

    if (card.type === 'verse_first' || card.type === 'verse_second') {
      return (
        <div className="flex flex-col items-center justify-center h-full p-2">
          <span className="text-xs sm:text-sm text-amber-900 text-center font-medium leading-tight">
            {card.content}...
          </span>
          <span className="text-[9px] sm:text-[10px] text-amber-600 mt-1 italic">{card.reference}</span>
        </div>
      );
    }

    if (card.type === 'symbol_verse') {
      return (
        <div className="flex flex-col items-center justify-center h-full p-2">
          <span className="text-[10px] sm:text-xs text-amber-900 text-center font-medium leading-tight">
            {card.content}
          </span>
          <span className="text-[8px] sm:text-[9px] text-amber-600 mt-1 italic">{card.reference}</span>
        </div>
      );
    }

    return <span className="text-2xl">{card.content}</span>;
  };

  return (
    <div 
      className="relative w-full aspect-[3/4] cursor-pointer perspective-1000"
      onClick={handleClick}
    >
      <motion.div
        className="w-full h-full relative preserve-3d"
        initial={false}
        animate={{ rotateY: isFlipped || isMatched ? 180 : 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Card Back */}
        <div 
          className="absolute inset-0 rounded-xl backface-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="w-full h-full bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 rounded-xl shadow-lg border-2 border-amber-500/50 flex items-center justify-center">
            {/* Pattern */}
            <div className="absolute inset-2 border-2 border-amber-400/30 rounded-lg" />
            <div className="absolute inset-4 border border-amber-400/20 rounded-md" />
            <span className="text-3xl opacity-60">✝️</span>
          </div>
        </div>

        {/* Card Front */}
        <div 
          className={`absolute inset-0 rounded-xl backface-hidden ${
            isMatched 
              ? 'bg-gradient-to-br from-green-100 via-green-50 to-emerald-100 border-green-400 ring-2 ring-green-400/50' 
              : 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-amber-300'
          } border-2 shadow-lg overflow-hidden`}
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          {/* Inner content */}
          {renderCardContent()}
          
          {/* Match glow effect */}
          {isMatched && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-green-400/20 pointer-events-none"
            />
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default MemoryCard;
