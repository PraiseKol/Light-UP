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
    const baseMoves = level * 4;
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 50 }}
            className="modal-3d max-w-md w-full"
          >
            <div className="modal-3d-header text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="text-3xl inline-block mr-2"
              >
                🎉
              </motion.div>
              <span className="text-lg sm:text-xl font-black">Level Complete!</span>
            </div>

            <div className="p-4 sm:p-5">
              {isNewHighScore && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-base font-black text-yellow-600 mb-3"
                >
                  ⭐ New High Score! ⭐
                </motion.div>
              )}

              {/* Stars */}
              <div className="flex justify-center gap-2 mb-5">
                {[1, 2, 3].map((i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0, rotate: -180 }}
                    animate={{ opacity: i <= stars ? 1 : 0.25, scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3 + i * 0.15, type: 'spring' }}
                    className="text-4xl drop-shadow-[0_2px_2px_rgba(180,83,9,0.4)]"
                  >
                    ⭐
                  </motion.span>
                ))}
              </div>

              {/* Stats */}
              <div className="row-3d !items-stretch flex-col mb-4">
                <div className="flex justify-between text-sm py-1">
                  <span className="text-amber-700 font-semibold">Level</span>
                  <span className="font-black text-amber-900">{level}</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-amber-700 font-semibold">Moves</span>
                  <span className="font-black text-amber-900">{moves}</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-amber-700 font-semibold">Time</span>
                  <span className="font-black text-amber-900">{formatTime(timeMs)}</span>
                </div>
                <div className="flex justify-between text-base border-t-2 border-amber-200 pt-2 mt-1">
                  <span className="text-amber-700 font-bold">Score</span>
                  <span className="font-black text-xl text-amber-900">{score}</span>
                </div>
              </div>

              {/* Scripture */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 mb-4 text-center">
                <p className="text-amber-800 italic text-sm">"{scripture.text}"</p>
                <p className="text-amber-600 text-xs mt-1 font-semibold">— {scripture.ref}</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onReturnToMenu}
                  className="chip-3d flex-1 !py-3 font-black"
                >
                  Menu
                </button>
                
                {hasNextLevel && (
                  <button
                    onClick={onNextLevel}
                    className="btn-orb btn-orb-green flex-1 !py-3 font-black"
                  >
                    Next Level →
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LevelCompleteModal;
