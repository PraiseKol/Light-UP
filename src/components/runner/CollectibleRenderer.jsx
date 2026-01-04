import React from 'react';
import { motion } from 'framer-motion';
import { GAME_CONFIG } from './GameConstants';

const CollectibleRenderer = ({ collectibles, onCollect, playerLane, playerY }) => {
  const getLanePosition = (lane) => {
    const centerX = window.innerWidth / 2;
    return centerX + (lane * GAME_CONFIG.LANE_WIDTH);
  };

  const renderCollectible = (collectible) => {
    const size = collectible.id === 'crown' ? 50 : collectible.id === 'olive_branch' ? 45 : 40;
    
    return (
      <motion.div
        key={collectible.id}
        className="absolute cursor-pointer"
        style={{
          left: getLanePosition(collectible.lane) - size / 2,
          top: collectible.y,
          width: size,
          height: size,
        }}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ 
          scale: 1, 
          rotate: 0,
          y: [0, -5, 0],
        }}
        transition={{
          scale: { duration: 0.3 },
          rotate: { duration: 0.3 },
          y: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
        }}
        whileHover={{ scale: 1.2 }}
        onClick={() => onCollect?.(collectible)}
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full blur-md"
          style={{ 
            backgroundColor: collectible.color,
            opacity: 0.5,
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        
        {/* Collectible item */}
        <div 
          className="absolute inset-0 flex items-center justify-center text-2xl"
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}
        >
          {collectible.emoji}
        </div>

        {/* Sparkle effects for rare items */}
        {(collectible.id === 'crown' || collectible.id === 'olive_branch') && (
          <>
            <motion.div
              className="absolute -top-1 -right-1 text-xs"
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5],
                rotate: [0, 180, 360],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ✨
            </motion.div>
            <motion.div
              className="absolute -bottom-1 -left-1 text-xs"
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5],
                rotate: [0, -180, -360],
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            >
              ✨
            </motion.div>
          </>
        )}

        {/* Light rays for light orb */}
        {collectible.id === 'light_orb' && (
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <div
                key={angle}
                className="absolute top-1/2 left-1/2 w-0.5 h-6 bg-yellow-300 opacity-50"
                style={{
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-15px)`,
                }}
              />
            ))}
          </motion.div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="absolute inset-0 pointer-events-auto overflow-hidden">
      {collectibles.map(renderCollectible)}
    </div>
  );
};

export default CollectibleRenderer;
