import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COMPLETION_SCRIPTURES } from '@/data/scriptureMatchData';

const LevelCompleteModal = ({
  isOpen,
  level,
  moves,
  timeMs,
  score,
  isNewHighScore,
  onNextLevel,
  onReturnToMenu,
  hasNextLevel
}) => {
  const scripture = COMPLETION_SCRIPTURES[Math.floor(Math.random() * COMPLETION_SCRIPTURES.length)];
  
  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStars = () => {
    // Calculate stars based on moves efficiency
    // Fewer moves = more stars
    const baseMoves = level * 4; // Expected minimum moves for level
    const ratio = baseMoves / moves;
    
    if (ratio >= 0.8) return 3;
    if (ratio >= 0.5) return 2;
    return 1;
  };

  const stars = getStars();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 50 }}
            className="bg-gradient-to-b from-amber-50 to-orange-50 rounded-2xl shadow-2xl max-w-md w-full p-6 border-4 border-amber-400"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="text-5xl mb-3"
              >
                🎉
              </motion.div>
              <h2 className="text-2xl font-bold text-amber-800">Level Complete!</h2>
              {isNewHighScore && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-lg font-bold text-yellow-600 mt-1"
                >
                  ⭐ New High Score! ⭐
                </motion.div>
              )}
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0, rotate: -180 }}
                  animate={{ 
                    opacity: i <= stars ? 1 : 0.3, 
                    scale: 1, 
                    rotate: 0 
                  }}
                  transition={{ delay: 0.3 + i * 0.15, type: 'spring' }}
                  className="text-4xl"
                >
                  ⭐
                </motion.span>
              ))}
            </div>

            {/* Stats */}
            <div className="bg-white/60 rounded-xl p-4 mb-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-amber-700">Level</span>
                <span className="font-bold text-amber-900">{level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-700">Moves</span>
                <span className="font-bold text-amber-900">{moves}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-700">Time</span>
                <span className="font-bold text-amber-900">{formatTime(timeMs)}</span>
              </div>
              <div className="flex justify-between border-t border-amber-200 pt-2 mt-2">
                <span className="text-amber-700">Score</span>
                <span className="font-bold text-xl text-amber-900">{score}</span>
              </div>
            </div>

            {/* Scripture */}
            <div className="bg-amber-100/50 rounded-xl p-4 mb-6 text-center">
              <p className="text-amber-800 italic text-sm">"{scripture.text}"</p>
              <p className="text-amber-600 text-xs mt-1">— {scripture.ref}</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onReturnToMenu}
                className="flex-1 py-3 rounded-xl bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-colors"
              >
                Menu
              </motion.button>
              
              {hasNextLevel && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onNextLevel}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold shadow-lg hover:from-amber-600 hover:to-yellow-600 transition-all"
                >
                  Next Level →
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LevelCompleteModal;
