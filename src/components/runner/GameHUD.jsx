import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { POWER_UPS } from './GameConstants';

const GameHUD = ({ 
  distance, 
  scrolls, 
  lightOrbs,
  multiplier,
  activePowerUps,
  powerUpInventory,
  onUsePowerUp,
  isPaused,
  onPause,
  onResume,
}) => {
  const formatDistance = (d) => {
    if (d >= 1000) {
      return `${(d / 1000).toFixed(1)}km`;
    }
    return `${Math.floor(d)}m`;
  };

  return (
    <div className="absolute inset-x-0 top-0 z-30 pointer-events-auto">
      {/* Top bar */}
      <div className="flex justify-between items-start p-4 bg-gradient-to-b from-black/30 to-transparent">
        {/* Distance */}
        <motion.div 
          className="bg-black/40 backdrop-blur-sm rounded-xl px-4 py-2"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          <div className="text-xs text-white/70">Distance</div>
          <div className="text-2xl font-bold text-white">
            {formatDistance(distance)}
          </div>
        </motion.div>

        {/* Pause button */}
        <button
          onClick={isPaused ? onResume : onPause}
          className="bg-black/40 backdrop-blur-sm rounded-full w-12 h-12 flex items-center justify-center text-white text-xl hover:bg-black/60 transition-colors"
        >
          {isPaused ? '▶️' : '⏸️'}
        </button>

        {/* Collectibles */}
        <div className="flex flex-col gap-2">
          {/* Scrolls */}
          <div className="bg-black/40 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-xl">📜</span>
            <span className="text-xl font-bold text-white">{scrolls}</span>
          </div>
          
          {/* Multiplier */}
          <AnimatePresence>
            {multiplier > 1 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.5, x: 20 }}
                className="bg-gradient-to-r from-yellow-500/80 to-amber-500/80 backdrop-blur-sm rounded-xl px-4 py-1 text-center"
              >
                <span className="text-white font-bold">x{multiplier.toFixed(1)}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Active power-ups display */}
      <AnimatePresence>
        {Object.keys(activePowerUps).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex justify-center gap-2 mt-2"
          >
            {Object.entries(activePowerUps).map(([key, timeLeft]) => {
              const powerUp = POWER_UPS[key.toUpperCase()];
              if (!powerUp) return null;
              
              return (
                <motion.div
                  key={key}
                  className="px-3 py-1 rounded-full text-white text-sm flex items-center gap-1"
                  style={{ backgroundColor: powerUp.color + 'CC' }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <span>{powerUp.emoji}</span>
                  <span className="font-bold">{Math.ceil(timeLeft / 1000)}s</span>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Power-up buttons (bottom of screen) */}
      <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-3 pointer-events-auto">
        {Object.entries(POWER_UPS).map(([key, powerUp]) => {
          const count = powerUpInventory?.[powerUp.id] || 0;
          const isActive = activePowerUps[powerUp.id];
          
          return (
            <motion.button
              key={key}
              disabled={count === 0 || isActive}
              onClick={() => onUsePowerUp?.(powerUp.id)}
              className={`relative w-14 h-14 rounded-xl flex items-center justify-center text-2xl
                ${count > 0 && !isActive 
                  ? 'bg-white/90 shadow-lg hover:scale-110' 
                  : 'bg-gray-400/50 opacity-50'
                }
                transition-all duration-200
              `}
              whileTap={count > 0 && !isActive ? { scale: 0.9 } : {}}
              style={{
                boxShadow: isActive ? `0 0 20px ${powerUp.color}` : undefined,
              }}
            >
              {powerUp.emoji}
              
              {/* Count badge */}
              {count > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center">
                  {count}
                </div>
              )}
              
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-xl border-2"
                  style={{ borderColor: powerUp.color }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default GameHUD;
