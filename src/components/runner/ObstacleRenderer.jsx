import React from 'react';
import { motion } from 'framer-motion';
import { GAME_CONFIG } from './GameConstants';

const ObstacleRenderer = ({ obstacles, lampActive }) => {
  const getLanePosition = (lane) => {
    const centerX = window.innerWidth / 2;
    return centerX + (lane * GAME_CONFIG.LANE_WIDTH);
  };

  const renderObstacle = (obstacle) => {
    const baseStyles = {
      position: 'absolute',
      left: getLanePosition(obstacle.lane) - obstacle.width / 2,
      top: obstacle.y,
      width: obstacle.spansAllLanes ? GAME_CONFIG.LANE_WIDTH * 3 : obstacle.width,
      height: obstacle.height,
    };

    // Lamp of Truth highlights dangerous obstacles
    const isHighlighted = lampActive;

    switch (obstacle.id) {
      case 'fallen_pillar':
        return (
          <motion.div
            key={obstacle.id}
            style={baseStyles}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative"
          >
            {/* Main pillar */}
            <div 
              className="absolute inset-0 rounded-lg"
              style={{
                background: `linear-gradient(135deg, #8B7355 0%, #6B5344 50%, #8B7355 100%)`,
                boxShadow: isHighlighted 
                  ? '0 0 20px rgba(255, 0, 0, 0.5)' 
                  : '0 4px 8px rgba(0,0,0,0.3)',
                transform: 'rotate(-15deg)',
              }}
            />
            {/* Stone texture lines */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-1/4 left-0 right-0 h-0.5 bg-gray-800" />
              <div className="absolute top-2/4 left-0 right-0 h-0.5 bg-gray-800" />
              <div className="absolute top-3/4 left-0 right-0 h-0.5 bg-gray-800" />
            </div>
            {/* Warning indicator when lamp active */}
            {isHighlighted && (
              <motion.div
                className="absolute -top-2 -right-2 text-xl"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                ⚠️
              </motion.div>
            )}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs opacity-70">
              ↓ SLIDE
            </div>
          </motion.div>
        );

      case 'broken_bridge':
        return (
          <motion.div
            key={obstacle.id}
            style={baseStyles}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative"
          >
            {/* Bridge planks */}
            <div 
              className="absolute inset-0 flex gap-1"
              style={{
                boxShadow: isHighlighted 
                  ? '0 0 20px rgba(255, 0, 0, 0.5)' 
                  : '0 4px 8px rgba(0,0,0,0.3)',
              }}
            >
              <div className="flex-1 bg-amber-800 rounded transform -rotate-12" />
              <div className="w-8 bg-transparent" /> {/* Gap */}
              <div className="flex-1 bg-amber-800 rounded transform rotate-6" />
            </div>
            {isHighlighted && (
              <motion.div
                className="absolute -top-2 -right-2 text-xl"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                ⚠️
              </motion.div>
            )}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs opacity-70">
              ↑ JUMP
            </div>
          </motion.div>
        );

      case 'river_gap':
        return (
          <motion.div
            key={obstacle.id}
            style={baseStyles}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative overflow-hidden rounded"
          >
            {/* Water */}
            <motion.div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(180deg, #4A90D9 0%, #2E5A8C 100%)',
                boxShadow: isHighlighted 
                  ? '0 0 20px rgba(255, 0, 0, 0.5)' 
                  : 'inset 0 0 10px rgba(0,0,0,0.3)',
              }}
              animate={{
                backgroundPosition: ['0% 0%', '100% 0%'],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
            {/* Water ripples */}
            <motion.div 
              className="absolute inset-0 opacity-30"
              animate={{ x: [-20, 20, -20] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="absolute top-1/3 left-0 right-0 h-1 bg-white/50 rounded-full" />
              <div className="absolute top-2/3 left-0 right-0 h-1 bg-white/50 rounded-full" />
            </motion.div>
            {isHighlighted && (
              <motion.div
                className="absolute -top-2 -right-2 text-xl"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                ⚠️
              </motion.div>
            )}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs opacity-70">
              ↑ JUMP
            </div>
          </motion.div>
        );

      case 'rock_slide':
        return (
          <motion.div
            key={obstacle.id}
            style={baseStyles}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative"
          >
            {/* Rocks */}
            <div 
              className="absolute inset-0 flex flex-wrap gap-1 items-center justify-center"
              style={{
                boxShadow: isHighlighted 
                  ? '0 0 20px rgba(255, 0, 0, 0.5)' 
                  : '0 4px 8px rgba(0,0,0,0.3)',
              }}
            >
              <div className="w-8 h-8 bg-gray-600 rounded-lg transform rotate-12" />
              <div className="w-10 h-10 bg-gray-500 rounded-lg transform -rotate-6" />
              <div className="w-6 h-6 bg-gray-700 rounded-lg transform rotate-45" />
            </div>
            {isHighlighted && (
              <motion.div
                className="absolute -top-2 -right-2 text-xl"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                ⚠️
              </motion.div>
            )}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs opacity-70">
              ← → AVOID
            </div>
          </motion.div>
        );

      case 'narrow_passage':
        return (
          <motion.div
            key={obstacle.id}
            style={{
              ...baseStyles,
              left: getLanePosition(0) - (GAME_CONFIG.LANE_WIDTH * 1.5),
              width: GAME_CONFIG.LANE_WIDTH * 3,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative flex"
          >
            {/* Left wall */}
            <div 
              className="flex-1 rounded-r-lg"
              style={{
                background: 'linear-gradient(90deg, #8B4513 0%, #654321 100%)',
                boxShadow: isHighlighted 
                  ? '0 0 20px rgba(255, 0, 0, 0.5)' 
                  : '4px 0 8px rgba(0,0,0,0.3)',
              }}
            />
            {/* Center passage */}
            <div className="w-20 relative">
              {isHighlighted && (
                <motion.div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  ✓
                </motion.div>
              )}
            </div>
            {/* Right wall */}
            <div 
              className="flex-1 rounded-l-lg"
              style={{
                background: 'linear-gradient(270deg, #8B4513 0%, #654321 100%)',
                boxShadow: isHighlighted 
                  ? '0 0 20px rgba(255, 0, 0, 0.5)' 
                  : '-4px 0 8px rgba(0,0,0,0.3)',
              }}
            />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs opacity-70">
              CENTER LANE
            </div>
          </motion.div>
        );

      default:
        return (
          <div
            key={obstacle.id}
            style={{
              ...baseStyles,
              backgroundColor: obstacle.color,
              borderRadius: '8px',
            }}
          />
        );
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {obstacles.map(renderObstacle)}
    </div>
  );
};

export default ObstacleRenderer;
