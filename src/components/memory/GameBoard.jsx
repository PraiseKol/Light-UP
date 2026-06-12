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
  const cols = config.gridCols || 4;

  const colsClass =
    cols <= 2 ? 'grid-cols-2'
    : cols === 3 ? 'grid-cols-3'
    : cols === 4 ? 'grid-cols-4'
    : cols === 5 ? 'grid-cols-5'
    : 'grid-cols-6';

  // Constrain grid width by column count so 2-3 col grids don't render huge on desktop
  const maxWClass =
    cols <= 2 ? 'max-w-xs'
    : cols === 3 ? 'max-w-sm'
    : cols === 4 ? 'max-w-md'
    : cols === 5 ? 'max-w-lg'
    : 'max-w-xl';

  const gapClass = cols >= 5 ? 'gap-1' : cols === 4 ? 'gap-1.5' : 'gap-2';

  // Use square tiles for dense grids, slightly taller for sparse ones
  const aspectClass = cols >= 4 ? 'aspect-square' : 'aspect-[4/5]';

  return (
    <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden px-2 sm:px-4 py-1">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`grid ${colsClass} ${gapClass} w-full ${maxWClass} max-h-full`}
      >
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.25 }}
            className={aspectClass}
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
