import React from 'react';
import { motion } from 'framer-motion';
import MemoryCard from './MemoryCard';
import { LEVELS } from '@/data/scriptureMatchData';

const GameBoard = ({ 
  cards, 
  flippedCards, 
  matchedPairs, 
  onCardClick, 
  disabled,
  level 
}) => {
  const config = LEVELS.find(l => l.level === level) || LEVELS[0];
  
  // Responsive grid sizing
  const getGridClass = () => {
    const cols = config.gridCols;
    if (cols <= 2) return 'grid-cols-2';
    if (cols === 3) return 'grid-cols-3';
    if (cols === 4) return 'grid-cols-4';
    if (cols === 5) return 'grid-cols-5';
    return 'grid-cols-6';
  };

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-2 sm:px-4 flex items-center justify-center overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`grid ${getGridClass()} gap-1.5 sm:gap-2 w-full`}
      >
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <MemoryCard
              card={card}
              isFlipped={flippedCards.some(fc => fc.id === card.id)}
              isMatched={matchedPairs.includes(card.pairId)}
              onClick={onCardClick}
              disabled={disabled}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default GameBoard;
