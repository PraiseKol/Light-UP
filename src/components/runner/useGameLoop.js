import { useState, useCallback, useRef, useEffect } from 'react';
import { GAME_CONFIG, OBSTACLES, COLLECTIBLES } from './GameConstants';

const getRandomObstacle = (allowedTypes) => {
  const types = allowedTypes || Object.keys(OBSTACLES);
  const randomType = types[Math.floor(Math.random() * types.length)];
  return OBSTACLES[randomType.toUpperCase()] || OBSTACLES.FALLEN_PILLAR;
};

const getRandomCollectible = () => {
  const rand = Math.random();
  let cumulative = 0;
  
  for (const [key, collectible] of Object.entries(COLLECTIBLES)) {
    cumulative += collectible.rarity;
    if (rand <= cumulative) {
      return { ...collectible, key };
    }
  }
  return { ...COLLECTIBLES.SCROLL, key: 'SCROLL' };
};

const getRandomLane = () => Math.floor(Math.random() * 3) - 1; // -1, 0, or 1

export const useGameLoop = (gameState, environment) => {
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(GAME_CONFIG.BASE_SPEED);
  const [obstacles, setObstacles] = useState([]);
  const [collectibles, setCollectibles] = useState([]);
  const [powerUpTokens, setPowerUpTokens] = useState([]);
  
  const lastObstacleTime = useRef(0);
  const lastCollectibleTime = useRef(0);
  const lastSpeedIncrease = useRef(0);
  const gameLoopRef = useRef(null);
  const startTimeRef = useRef(0);
  
  // Reset game state
  const resetGame = useCallback(() => {
    setDistance(0);
    setSpeed(GAME_CONFIG.BASE_SPEED);
    setObstacles([]);
    setCollectibles([]);
    setPowerUpTokens([]);
    lastObstacleTime.current = 0;
    lastCollectibleTime.current = 0;
    lastSpeedIncrease.current = 0;
    startTimeRef.current = Date.now();
  }, []);

  // Spawn obstacle
  const spawnObstacle = useCallback((currentTime) => {
    const timeSinceLastObstacle = currentTime - lastObstacleTime.current;
    const adjustedInterval = GAME_CONFIG.OBSTACLE_SPAWN_INTERVAL / (speed / GAME_CONFIG.BASE_SPEED);
    
    if (timeSinceLastObstacle >= Math.max(adjustedInterval, GAME_CONFIG.MIN_OBSTACLE_GAP)) {
      const allowedTypes = environment?.obstacles || Object.keys(OBSTACLES).map(k => k.toLowerCase());
      const obstacle = getRandomObstacle(allowedTypes);
      const lane = getRandomLane();
      
      // For narrow passage, it spans all lanes
      const isNarrowPassage = obstacle.id === 'narrow_passage';
      
      setObstacles(prev => [...prev, {
        id: `obs-${Date.now()}-${Math.random()}`,
        ...obstacle,
        lane: isNarrowPassage ? 0 : lane,
        spansAllLanes: isNarrowPassage,
        y: -100, // Start above screen
        createdAt: currentTime,
      }]);
      
      lastObstacleTime.current = currentTime;
    }
  }, [speed, environment]);

  // Spawn collectible
  const spawnCollectible = useCallback((currentTime) => {
    const timeSinceLastCollectible = currentTime - lastCollectibleTime.current;
    const adjustedInterval = GAME_CONFIG.COLLECTIBLE_SPAWN_INTERVAL / (speed / GAME_CONFIG.BASE_SPEED);
    
    if (timeSinceLastCollectible >= adjustedInterval) {
      const collectible = getRandomCollectible();
      const lane = getRandomLane();
      
      setCollectibles(prev => [...prev, {
        id: `col-${Date.now()}-${Math.random()}`,
        ...collectible,
        lane,
        y: -50,
        createdAt: currentTime,
      }]);
      
      lastCollectibleTime.current = currentTime;
    }
  }, [speed]);

  // Update positions
  const updatePositions = useCallback((deltaTime) => {
    const moveAmount = speed * (deltaTime / 16.67); // Normalize to 60fps
    
    // Update obstacle positions
    setObstacles(prev => prev
      .map(obs => ({ ...obs, y: obs.y + moveAmount }))
      .filter(obs => obs.y < window.innerHeight + 100)
    );
    
    // Update collectible positions
    setCollectibles(prev => prev
      .map(col => ({ ...col, y: col.y + moveAmount }))
      .filter(col => col.y < window.innerHeight + 100)
    );
    
    // Update power-up token positions
    setPowerUpTokens(prev => prev
      .map(token => ({ ...token, y: token.y + moveAmount }))
      .filter(token => token.y < window.innerHeight + 100)
    );
    
    // Update distance
    setDistance(prev => prev + moveAmount * GAME_CONFIG.DISTANCE_SCORE_MULTIPLIER);
  }, [speed]);

  // Increase speed over time
  const updateSpeed = useCallback((currentTime) => {
    const timeSinceLastIncrease = currentTime - lastSpeedIncrease.current;
    
    if (timeSinceLastIncrease >= GAME_CONFIG.SPEED_INCREMENT_INTERVAL) {
      setSpeed(prev => Math.min(prev + GAME_CONFIG.SPEED_INCREMENT, GAME_CONFIG.MAX_SPEED));
      lastSpeedIncrease.current = currentTime;
    }
  }, []);

  // Remove collected item
  const removeCollectible = useCallback((id) => {
    setCollectibles(prev => prev.filter(c => c.id !== id));
  }, []);

  // Remove obstacle (for collision handling)
  const removeObstacle = useCallback((id) => {
    setObstacles(prev => prev.filter(o => o.id !== id));
  }, []);

  // Main game loop
  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      return;
    }

    let lastFrameTime = Date.now();
    startTimeRef.current = Date.now();
    lastSpeedIncrease.current = Date.now();

    const loop = () => {
      const currentTime = Date.now();
      const deltaTime = currentTime - lastFrameTime;
      lastFrameTime = currentTime;

      updatePositions(deltaTime);
      spawnObstacle(currentTime);
      spawnCollectible(currentTime);
      updateSpeed(currentTime);

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, updatePositions, spawnObstacle, spawnCollectible, updateSpeed]);

  return {
    distance: Math.floor(distance),
    speed,
    obstacles,
    collectibles,
    powerUpTokens,
    resetGame,
    removeCollectible,
    removeObstacle,
    setSpeed,
  };
};
