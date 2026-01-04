import React from 'react';
import { motion } from 'framer-motion';
import { SCRIPTURES, CHARACTERS } from './GameConstants';

const GameOverScreen = ({ 
  distance, 
  scrolls, 
  lightOrbs,
  isNewHighScore,
  highScore,
  onPlayAgain,
  onReturnToMenu,
  selectedCharacter,
}) => {
  // Get random scripture
  const scripture = SCRIPTURES[Math.floor(Math.random() * SCRIPTURES.length)];
  const character = CHARACTERS[selectedCharacter?.toUpperCase()] || CHARACTERS.FAITH_RUNNER;

  const formatDistance = (d) => {
    if (d >= 1000) {
      return `${(d / 1000).toFixed(2)} km`;
    }
    return `${Math.floor(d)} m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="bg-gradient-to-br from-amber-50 to-yellow-100 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ rotate: -10 }}
            animate={{ rotate: [0, 5, 0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-6xl mb-2"
          >
            ✝️
          </motion.div>
          <h2 className="text-2xl font-bold text-amber-800">Journey Complete</h2>
          
          {isNewHighScore && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="mt-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-4 py-1 rounded-full inline-block"
            >
              🏆 New High Score!
            </motion.div>
          )}
        </div>

        {/* Stats */}
        <div className="space-y-3 mb-6">
          {/* Distance */}
          <div className="bg-white/60 rounded-xl p-3 flex justify-between items-center">
            <span className="text-amber-700 font-medium">Distance Traveled</span>
            <span className="text-xl font-bold text-amber-900">{formatDistance(distance)}</span>
          </div>

          {/* Scrolls */}
          <div className="bg-white/60 rounded-xl p-3 flex justify-between items-center">
            <span className="text-amber-700 font-medium flex items-center gap-2">
              <span>📜</span> Scrolls Collected
            </span>
            <span className="text-xl font-bold text-amber-900">{scrolls}</span>
          </div>

          {/* Light Orbs */}
          <div className="bg-white/60 rounded-xl p-3 flex justify-between items-center">
            <span className="text-amber-700 font-medium flex items-center gap-2">
              <span>✨</span> Light Orbs
            </span>
            <span className="text-xl font-bold text-amber-900">{lightOrbs}</span>
          </div>

          {/* Best Distance */}
          <div className="bg-amber-200/50 rounded-xl p-3 flex justify-between items-center">
            <span className="text-amber-700 font-medium">Best Distance</span>
            <span className="text-xl font-bold text-amber-900">{formatDistance(highScore)}</span>
          </div>
        </div>

        {/* Scripture Quote */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-amber-100 to-yellow-50 rounded-xl p-4 mb-6 border border-amber-200"
        >
          <p className="text-amber-800 italic text-center mb-2">"{scripture.text}"</p>
          <p className="text-amber-600 text-sm text-center font-semibold">— {scripture.ref}</p>
        </motion.div>

        {/* Buttons */}
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReturnToMenu}
            className="flex-1 py-3 px-4 rounded-xl bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-colors"
          >
            Menu
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onPlayAgain}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold shadow-lg hover:shadow-xl transition-all"
          >
            Run Again 🏃
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GameOverScreen;
