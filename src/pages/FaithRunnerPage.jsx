import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@supabase/auth-helpers-react';

import { getOrCreateStats, saveRun } from '@/lib/api/faithRunner';
import { playSound } from '@/utils/sound';

import ParallaxBackground from '@/components/runner/ParallaxBackground';
import PlayerController from '@/components/runner/PlayerController';
import ObstacleRenderer from '@/components/runner/ObstacleRenderer';
import CollectibleRenderer from '@/components/runner/CollectibleRenderer';
import GameHUD from '@/components/runner/GameHUD';
import GameOverScreen from '@/components/runner/GameOverScreen';
import MainMenu from '@/components/runner/MainMenu';
import { useGameLoop } from '@/components/runner/useGameLoop';
import { GAME_CONFIG, POWER_UPS, COLLECTIBLES, ENVIRONMENTS } from '@/components/runner/GameConstants';

const FaithRunnerPage = ({ effectsOn = true }) => {
  const navigate = useNavigate();
  const user = useUser();
  
  // Game states: menu, countdown, playing, paused, gameover
  const [gameState, setGameState] = useState('menu');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Current run stats
  const [scrollsCollected, setScrollsCollected] = useState(0);
  const [lightOrbsCollected, setLightOrbsCollected] = useState(0);
  const [obstaclesAvoided, setObstaclesAvoided] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [powerUpsUsed, setPowerUpsUsed] = useState(0);
  
  // Player state
  const [playerLane, setPlayerLane] = useState(0);
  const [playerAction, setPlayerAction] = useState('running');
  const [activePowerUps, setActivePowerUps] = useState({});
  const [powerUpInventory, setPowerUpInventory] = useState({
    shield_of_faith: 2,
    wings_of_grace: 1,
    speed_of_spirit: 1,
    lamp_of_truth: 1,
  });
  
  // Environment
  const [currentEnvironment, setCurrentEnvironment] = useState('desert_path');
  
  // Countdown
  const [countdown, setCountdown] = useState(3);
  
  // Collision tracking
  const lastCollisionRef = useRef(0);
  const stumbleCountRef = useRef(0);
  
  // Game loop
  const { 
    distance, 
    speed, 
    obstacles, 
    collectibles, 
    resetGame: resetGameLoop,
    removeCollectible,
    removeObstacle,
    setSpeed,
  } = useGameLoop(gameState, ENVIRONMENTS[currentEnvironment.toUpperCase()]);

  // Load user stats on mount
  useEffect(() => {
    const loadStats = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      try {
        const data = await getOrCreateStats(user.id);
        setStats(data);
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStats();
  }, [user?.id]);

  // Handle countdown
  useEffect(() => {
    if (gameState !== 'countdown') return;
    
    if (countdown <= 0) {
      setGameState('playing');
      return;
    }
    
    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
      if (effectsOn) playSound('countdown');
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [gameState, countdown, effectsOn]);

  // Collision detection
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const checkCollisions = () => {
      const now = Date.now();
      if (now - lastCollisionRef.current < 500) return; // Cooldown
      
      // Check if player has shield or wings
      if (activePowerUps.shield_of_faith || activePowerUps.wings_of_grace) {
        return;
      }
      
      // Player hitbox (approximate)
      const playerY = window.innerHeight - 180; // Bottom area where player is
      const playerHeight = 100;
      
      for (const obstacle of obstacles) {
        // Check if obstacle is in player's area
        if (obstacle.y + obstacle.height < playerY || obstacle.y > playerY + playerHeight) {
          continue;
        }
        
        // Check lane collision
        const playerInObstacleLane = obstacle.spansAllLanes 
          ? playerLane !== 0 // Narrow passage - only center is safe
          : obstacle.lane === playerLane;
        
        if (!playerInObstacleLane) {
          // Avoided!
          if (obstacle.y > playerY) {
            setObstaclesAvoided(prev => prev + 1);
          }
          continue;
        }
        
        // Check action requirements
        let collision = true;
        
        if (obstacle.action === 'jump' && playerAction === 'jumping') {
          collision = false;
        } else if (obstacle.action === 'slide' && playerAction === 'sliding') {
          collision = false;
        } else if (obstacle.action === 'center' && playerLane === 0) {
          collision = false;
        } else if (obstacle.action === 'avoid' && obstacle.lane !== playerLane) {
          collision = false;
        }
        
        if (collision) {
          // Handle collision
          lastCollisionRef.current = now;
          stumbleCountRef.current += 1;
          
          if (effectsOn) playSound('error');
          
          if (stumbleCountRef.current >= 3) {
            // Game over
            handleGameOver();
          } else {
            // Stumble - slow down temporarily
            setSpeed(Math.max(GAME_CONFIG.BASE_SPEED, speed * 0.7));
          }
          
          removeObstacle(obstacle.id);
          break;
        }
      }
    };
    
    const interval = setInterval(checkCollisions, 50);
    return () => clearInterval(interval);
  }, [gameState, obstacles, playerLane, playerAction, activePowerUps, speed, effectsOn]);

  // Collectible collection
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const checkCollections = () => {
      const playerY = window.innerHeight - 180;
      const playerHeight = 100;
      
      for (const collectible of collectibles) {
        // Check if collectible is in player's area
        if (collectible.y + 40 < playerY || collectible.y > playerY + playerHeight) {
          continue;
        }
        
        // Check lane
        if (collectible.lane !== playerLane) continue;
        
        // Collect!
        handleCollect(collectible);
        removeCollectible(collectible.id);
      }
    };
    
    const interval = setInterval(checkCollections, 50);
    return () => clearInterval(interval);
  }, [gameState, collectibles, playerLane]);

  // Handle collecting items
  const handleCollect = useCallback((collectible) => {
    if (effectsOn) playSound('success');
    
    switch (collectible.id) {
      case 'scroll':
        setScrollsCollected(prev => prev + Math.floor(COLLECTIBLES.SCROLL.value * multiplier));
        break;
      case 'light_orb':
        setLightOrbsCollected(prev => prev + 1);
        setMultiplier(prev => Math.min(prev + 0.5, 3)); // Max 3x multiplier
        // Multiplier decays after 5 seconds
        setTimeout(() => setMultiplier(prev => Math.max(1, prev - 0.5)), 5000);
        break;
      case 'olive_branch':
        setScrollsCollected(prev => prev + Math.floor(COLLECTIBLES.OLIVE_BRANCH.value * multiplier));
        break;
      case 'crown':
        setScrollsCollected(prev => prev + Math.floor(COLLECTIBLES.CROWN.value * multiplier));
        if (effectsOn) playSound('level-up');
        break;
      default:
        break;
    }
  }, [multiplier, effectsOn]);

  // Handle power-up usage
  const handleUsePowerUp = useCallback((powerUpId) => {
    const count = powerUpInventory[powerUpId] || 0;
    if (count <= 0 || activePowerUps[powerUpId]) return;
    
    const powerUp = Object.values(POWER_UPS).find(p => p.id === powerUpId);
    if (!powerUp) return;
    
    const level = stats?.power_up_levels?.[powerUpId] || 1;
    const duration = powerUp.baseDuration + (level - 1) * powerUp.durationPerLevel;
    
    // Activate power-up
    setActivePowerUps(prev => ({ ...prev, [powerUpId]: duration }));
    setPowerUpInventory(prev => ({ ...prev, [powerUpId]: prev[powerUpId] - 1 }));
    setPowerUpsUsed(prev => prev + 1);
    
    if (effectsOn) playSound('power-up');
    
    // Speed boost effect
    if (powerUpId === 'speed_of_spirit') {
      setSpeed(prev => prev * 1.5);
    }
    
    // Countdown timer for UI
    const interval = setInterval(() => {
      setActivePowerUps(prev => {
        const newTime = (prev[powerUpId] || 0) - 100;
        if (newTime <= 0) {
          clearInterval(interval);
          const { [powerUpId]: _, ...rest } = prev;
          
          // Reset speed boost
          if (powerUpId === 'speed_of_spirit') {
            setSpeed(p => p / 1.5);
          }
          
          return rest;
        }
        return { ...prev, [powerUpId]: newTime };
      });
    }, 100);
  }, [powerUpInventory, activePowerUps, stats, effectsOn]);

  // Start game
  const startGame = useCallback(() => {
    resetGameLoop();
    setScrollsCollected(0);
    setLightOrbsCollected(0);
    setObstaclesAvoided(0);
    setMultiplier(1);
    setPowerUpsUsed(0);
    setPlayerLane(0);
    setPlayerAction('running');
    setActivePowerUps({});
    stumbleCountRef.current = 0;
    lastCollisionRef.current = 0;
    setCountdown(3);
    setGameState('countdown');
    
    // Rotate environment randomly
    const envKeys = Object.keys(ENVIRONMENTS);
    const randomEnv = envKeys[Math.floor(Math.random() * envKeys.length)].toLowerCase();
    setCurrentEnvironment(randomEnv);
  }, [resetGameLoop]);

  // Handle game over
  const handleGameOver = useCallback(async () => {
    setGameState('gameover');
    
    if (effectsOn) playSound('game-over');
    
    // Save run to database
    if (user?.id) {
      try {
        const updatedStats = await saveRun(user.id, {
          distance: Math.floor(distance),
          scrolls: scrollsCollected,
          lightOrbs: lightOrbsCollected,
          obstaclesAvoided,
          powerUpsUsed,
          environment: currentEnvironment,
        });
        setStats(updatedStats);
      } catch (error) {
        console.error('Error saving run:', error);
      }
    }
  }, [user?.id, distance, scrollsCollected, lightOrbsCollected, obstaclesAvoided, powerUpsUsed, currentEnvironment, effectsOn]);

  // Handle pause
  const handlePause = useCallback(() => {
    setGameState('paused');
  }, []);

  const handleResume = useCallback(() => {
    setGameState('playing');
  }, []);

  // Handle back to map
  const handleBack = useCallback(() => {
    navigate('/map');
  }, [navigate]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-amber-100 to-yellow-200 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-6xl"
        >
          ✝️
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden select-none touch-none">
      {/* Background */}
      <ParallaxBackground 
        environment={currentEnvironment} 
        speed={speed} 
        gameState={gameState}
      />

      {/* Game content */}
      <AnimatePresence mode="wait">
        {gameState === 'menu' && (
          <MainMenu
            key="menu"
            stats={stats}
            selectedCharacter={stats?.selected_character}
            onStartGame={startGame}
            onOpenShop={() => {}} // TODO: Implement shop
            onBack={handleBack}
          />
        )}

        {gameState === 'countdown' && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-50"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-9xl font-bold text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
            >
              {countdown > 0 ? countdown : 'GO!'}
            </motion.div>
          </motion.div>
        )}

        {(gameState === 'playing' || gameState === 'paused') && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            {/* Obstacles */}
            <ObstacleRenderer 
              obstacles={obstacles} 
              lampActive={!!activePowerUps.lamp_of_truth}
            />

            {/* Collectibles */}
            <CollectibleRenderer 
              collectibles={collectibles}
              onCollect={handleCollect}
              playerLane={playerLane}
            />

            {/* Player */}
            <PlayerController
              gameState={gameState}
              selectedCharacter={stats?.selected_character}
              onLaneChange={setPlayerLane}
              activePowerUps={activePowerUps}
            />

            {/* HUD */}
            <GameHUD
              distance={distance}
              scrolls={scrollsCollected}
              lightOrbs={lightOrbsCollected}
              multiplier={multiplier}
              activePowerUps={activePowerUps}
              powerUpInventory={powerUpInventory}
              onUsePowerUp={handleUsePowerUp}
              isPaused={gameState === 'paused'}
              onPause={handlePause}
              onResume={handleResume}
            />

            {/* Stumble indicator */}
            {stumbleCountRef.current > 0 && (
              <div className="absolute top-24 left-1/2 -translate-x-1/2 flex gap-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full ${
                      i < stumbleCountRef.current ? 'bg-red-500' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Pause overlay */}
            <AnimatePresence>
              {gameState === 'paused' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center z-40"
                >
                  <div className="bg-white rounded-2xl p-6 text-center">
                    <h2 className="text-2xl font-bold mb-4">Paused</h2>
                    <div className="flex gap-4">
                      <button
                        onClick={handleBack}
                        className="px-6 py-2 rounded-xl bg-gray-200 font-bold"
                      >
                        Quit
                      </button>
                      <button
                        onClick={handleResume}
                        className="px-6 py-2 rounded-xl bg-amber-500 text-white font-bold"
                      >
                        Resume
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <GameOverScreen
            key="gameover"
            distance={Math.floor(distance)}
            scrolls={scrollsCollected}
            lightOrbs={lightOrbsCollected}
            isNewHighScore={distance > (stats?.high_score || 0)}
            highScore={Math.max(stats?.high_score || 0, Math.floor(distance))}
            onPlayAgain={startGame}
            onReturnToMenu={() => setGameState('menu')}
            selectedCharacter={stats?.selected_character}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FaithRunnerPage;
