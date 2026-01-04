import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CHARACTERS, ENVIRONMENTS, POWER_UPS, SCRIPTURES } from './GameConstants';

const MainMenu = ({ 
  stats, 
  selectedCharacter,
  onSelectCharacter,
  onStartGame,
  onOpenShop,
  onBack,
}) => {
  const scripture = SCRIPTURES[Math.floor(Math.random() * SCRIPTURES.length)];
  const character = CHARACTERS[selectedCharacter?.toUpperCase()] || CHARACTERS.FAITH_RUNNER;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #FFE4B5 0%, #DEB887 50%, #D2B48C 100%)',
      }}
    >
      {/* Header with back button */}
      <div className="flex items-center justify-between p-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-2xl"
        >
          ←
        </motion.button>
        
        <div className="text-center">
          <h1 className="text-3xl font-bold text-amber-800">Faith Runner</h1>
          <p className="text-amber-600 text-sm">Run in Faith</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onOpenShop}
          className="w-12 h-12 rounded-full bg-yellow-400 shadow-lg flex items-center justify-center text-2xl"
        >
          🛒
        </motion.button>
      </div>

      {/* Scripture banner */}
      <div className="mx-4 mb-4 bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-amber-200">
        <p className="text-amber-800 text-center italic text-sm">"{scripture.text}"</p>
        <p className="text-amber-600 text-center text-xs mt-1">— {scripture.ref}</p>
      </div>

      {/* Character display */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* Character preview */}
        <motion.div
          className="relative mb-6"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {/* Glow */}
          <motion.div
            className="absolute inset-0 rounded-full blur-2xl opacity-50"
            style={{ backgroundColor: character.glowColor, transform: 'scale(2)' }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          
          {/* Character */}
          <div 
            className="relative w-24 h-32 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: character.color }}
          >
            {/* Head */}
            <div 
              className="absolute -top-8 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full"
              style={{ backgroundColor: '#DEB887' }}
            >
              <div className="absolute top-4 left-3 w-2.5 h-2.5 bg-gray-800 rounded-full" />
              <div className="absolute top-4 right-3 w-2.5 h-2.5 bg-gray-800 rounded-full" />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-gray-700 rounded-full" />
            </div>
          </div>
          
          <p className="text-center mt-4 font-bold text-amber-800">{character.name}</p>
        </motion.div>

        {/* Stats display */}
        <div className="w-full max-w-xs space-y-2 mb-6">
          <div className="flex justify-between bg-white/50 rounded-lg px-4 py-2">
            <span className="text-amber-700">High Score</span>
            <span className="font-bold text-amber-900">{stats?.high_score || 0}m</span>
          </div>
          <div className="flex justify-between bg-white/50 rounded-lg px-4 py-2">
            <span className="text-amber-700">Total Runs</span>
            <span className="font-bold text-amber-900">{stats?.total_runs || 0}</span>
          </div>
          <div className="flex justify-between bg-white/50 rounded-lg px-4 py-2">
            <span className="text-amber-700">📜 Scrolls</span>
            <span className="font-bold text-amber-900">{stats?.total_scrolls || 0}</span>
          </div>
        </div>

        {/* Play button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStartGame}
          className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xl font-bold shadow-lg"
          style={{
            boxShadow: '0 10px 30px rgba(245, 158, 11, 0.4)',
          }}
        >
          <motion.span
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="inline-block"
          >
            🏃 Start Running
          </motion.span>
        </motion.button>

        {/* Controls hint */}
        <div className="mt-6 text-center text-amber-700/70 text-sm">
          <p>Swipe ← → to change lanes</p>
          <p>Swipe ↑ to jump, ↓ to slide</p>
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="h-24 relative overflow-hidden">
        <motion.div
          className="absolute inset-0 flex items-end justify-center gap-8 text-4xl opacity-50"
          animate={{ x: [0, -50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        >
          <span>🌵</span>
          <span>🏛️</span>
          <span>⛰️</span>
          <span>🌸</span>
          <span>🌵</span>
          <span>🏛️</span>
          <span>⛰️</span>
          <span>🌸</span>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default MainMenu;
