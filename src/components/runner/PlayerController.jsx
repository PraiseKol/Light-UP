import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GAME_CONFIG, CHARACTERS } from './GameConstants';

const PlayerController = ({ 
  gameState, 
  selectedCharacter = 'faith_runner',
  onLaneChange,
  activePowerUps = {},
}) => {
  const [lane, setLane] = useState(0); // -1 (left), 0 (center), 1 (right)
  const [action, setAction] = useState('running'); // running, jumping, sliding
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const actionTimeoutRef = useRef(null);

  const character = CHARACTERS[selectedCharacter.toUpperCase()] || CHARACTERS.FAITH_RUNNER;

  // Handle lane change
  const changeLane = useCallback((direction) => {
    setLane(prev => {
      const newLane = Math.max(-1, Math.min(1, prev + direction));
      onLaneChange?.(newLane);
      return newLane;
    });
  }, [onLaneChange]);

  // Handle jump
  const jump = useCallback(() => {
    if (action !== 'running') return;
    setAction('jumping');
    
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    actionTimeoutRef.current = setTimeout(() => {
      setAction('running');
    }, GAME_CONFIG.JUMP_DURATION);
  }, [action]);

  // Handle slide
  const slide = useCallback(() => {
    if (action !== 'running') return;
    setAction('sliding');
    
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    actionTimeoutRef.current = setTimeout(() => {
      setAction('running');
    }, GAME_CONFIG.SLIDE_DURATION);
  }, [action]);

  // Touch handlers
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const minSwipe = 30;

    // Determine swipe direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > minSwipe) {
        changeLane(deltaX > 0 ? 1 : -1);
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > minSwipe) {
        if (deltaY < 0) {
          jump();
        } else {
          slide();
        }
      }
    }
  }, [touchStart, changeLane, jump, slide]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== 'playing') return;
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          changeLane(-1);
          break;
        case 'ArrowRight':
        case 'd':
          changeLane(1);
          break;
        case 'ArrowUp':
        case 'w':
        case ' ':
          jump();
          break;
        case 'ArrowDown':
        case 's':
          slide();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, changeLane, jump, slide]);

  // Reset on game start
  useEffect(() => {
    if (gameState === 'playing') {
      setLane(0);
      setAction('running');
    }
  }, [gameState]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    };
  }, []);

  const laneOffset = lane * GAME_CONFIG.LANE_WIDTH;
  const isFlying = activePowerUps.wings_of_grace;
  const hasShield = activePowerUps.shield_of_faith;

  return (
    <div 
      className="absolute bottom-32 left-1/2 -translate-x-1/2 touch-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ width: '100%', height: '60%' }}
    >
      <motion.div
        className="absolute left-1/2 -translate-x-1/2"
        animate={{
          x: laneOffset,
          y: action === 'jumping' ? -GAME_CONFIG.JUMP_HEIGHT : (action === 'sliding' ? 20 : 0),
          scaleY: action === 'sliding' ? 0.5 : 1,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {/* Character glow */}
        <motion.div
          className="absolute inset-0 rounded-full blur-xl opacity-50"
          style={{ 
            backgroundColor: character.glowColor,
            transform: 'scale(1.5)',
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1.3, 1.6, 1.3],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        
        {/* Shield effect */}
        <AnimatePresence>
          {hasShield && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 0.6, scale: 1.8 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 rounded-full border-4 border-blue-400"
              style={{
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.5), inset 0 0 20px rgba(59, 130, 246, 0.3)',
              }}
            />
          )}
        </AnimatePresence>

        {/* Wings effect */}
        <AnimatePresence>
          {isFlying && (
            <>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: -30, y: [0, -5, 0] }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ y: { duration: 0.3, repeat: Infinity } }}
                className="absolute top-1/2 -translate-y-1/2 text-3xl"
              >
                🕊️
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 30, y: [0, -5, 0] }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ y: { duration: 0.3, repeat: Infinity, delay: 0.15 } }}
                className="absolute top-1/2 -translate-y-1/2 right-0 text-3xl scale-x-[-1]"
              >
                🕊️
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Character body */}
        <motion.div
          className="relative w-16 h-20 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: character.color }}
          animate={action === 'running' ? {
            y: [0, -3, 0],
          } : {}}
          transition={{ duration: 0.3, repeat: Infinity }}
        >
          {/* Head */}
          <div 
            className="absolute -top-6 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full"
            style={{ backgroundColor: '#DEB887' }}
          >
            {/* Simple face */}
            <div className="absolute top-3 left-2 w-2 h-2 bg-gray-800 rounded-full" />
            <div className="absolute top-3 right-2 w-2 h-2 bg-gray-800 rounded-full" />
          </div>
          
          {/* Running animation legs */}
          {action === 'running' && (
            <>
              <motion.div
                className="absolute -bottom-4 left-2 w-3 h-8 rounded-b-lg bg-gray-700"
                animate={{ rotate: [-20, 20, -20] }}
                transition={{ duration: 0.3, repeat: Infinity }}
              />
              <motion.div
                className="absolute -bottom-4 right-2 w-3 h-8 rounded-b-lg bg-gray-700"
                animate={{ rotate: [20, -20, 20] }}
                transition={{ duration: 0.3, repeat: Infinity }}
              />
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PlayerController;
