import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@supabase/auth-helpers-react';

import { getOrCreateStats, saveGame } from '@/lib/api/scriptureMatch';
import { generateCards, LEVELS } from '@/data/scriptureMatchData';
import { playSound } from '@/utils/sound';

import MainMenu from '@/components/memory/MainMenu';
import GameBoard from '@/components/memory/GameBoard';
import GameHUD from '@/components/memory/GameHUD';
import LevelCompleteModal from '@/components/memory/LevelCompleteModal';

const ScriptureMatchPage = ({ effectsOn = true }) => {
  const navigate = useNavigate();
  const user = useUser();
  
  // Game states: menu, playing, paused, complete, gameover
  const [gameState, setGameState] = useState('menu');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Current game state
  const [currentLevel, setCurrentLevel] = useState(1);
  const [cards, setCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [moves, setMoves] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [score, setScore] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Timer ref
  const timerRef = useRef(null);

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

  // Timer effect
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 100);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState]);

  // Check for time limit
  useEffect(() => {
    const levelConfig = LEVELS.find(l => l.level === currentLevel);
    if (levelConfig?.timeLimit && gameState === 'playing') {
      const timeLimit = levelConfig.timeLimit * 1000;
      if (timeElapsed >= timeLimit) {
        handleGameOver();
      }
    }
  }, [timeElapsed, currentLevel, gameState]);

  // Start a new game at a specific level
  const startGame = useCallback((level) => {
    const newCards = generateCards(level);
    setCards(newCards);
    setCurrentLevel(level);
    setFlippedCards([]);
    setMatchedPairs([]);
    setMoves(0);
    setTimeElapsed(0);
    setScore(0);
    setIsProcessing(false);
    setGameState('playing');
    
    if (effectsOn) playSound('select');
  }, [effectsOn]);

  // Handle card click
  const handleCardClick = useCallback((card) => {
    if (isProcessing || flippedCards.length >= 2) return;
    if (flippedCards.some(fc => fc.id === card.id)) return;
    if (matchedPairs.includes(card.pairId)) return;

    if (effectsOn) playSound('click');
    
    const newFlipped = [...flippedCards, card];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      setIsProcessing(true);
      
      const [first, second] = newFlipped;
      
      // Check for match
      if (first.pairId === second.pairId && first.id !== second.id) {
        // Match found!
        if (effectsOn) playSound('success');
        
        setTimeout(() => {
          setMatchedPairs(prev => [...prev, first.pairId]);
          setFlippedCards([]);
          setIsProcessing(false);
          
          // Calculate score bonus for this match
          const matchBonus = 100;
          const speedBonus = Math.max(0, 50 - Math.floor(timeElapsed / 1000));
          setScore(prev => prev + matchBonus + speedBonus);
        }, 500);
      } else {
        // No match - flip back
        if (effectsOn) playSound('error');
        
        setTimeout(() => {
          setFlippedCards([]);
          setIsProcessing(false);
        }, 1000);
      }
    }
  }, [flippedCards, matchedPairs, isProcessing, timeElapsed, effectsOn]);

  // Check for level complete
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const totalPairs = cards.length / 2;
    if (matchedPairs.length === totalPairs && totalPairs > 0) {
      // Level complete!
      handleLevelComplete();
    }
  }, [matchedPairs, cards, gameState]);

  // Handle level completion
  const handleLevelComplete = async () => {
    setGameState('complete');
    
    if (effectsOn) playSound('level-up');
    
    // Calculate final score
    const levelConfig = LEVELS.find(l => l.level === currentLevel);
    const efficiencyBonus = Math.max(0, 500 - (moves * 10));
    const timeBonus = Math.max(0, 300 - Math.floor(timeElapsed / 1000) * 2);
    const levelMultiplier = currentLevel;
    const finalScore = (score + efficiencyBonus + timeBonus) * levelMultiplier;
    
    setScore(finalScore);
    
    // Save game to database
    if (user?.id) {
      try {
        const updatedStats = await saveGame(user.id, {
          level: currentLevel,
          moves,
          timeMs: timeElapsed,
          score: finalScore,
          matchType: levelConfig?.matchType || 'symbol_symbol',
          totalMatches: matchedPairs.length
        });
        setStats(updatedStats);
      } catch (error) {
        console.error('Error saving game:', error);
      }
    }
  };

  // Handle game over (time ran out)
  const handleGameOver = () => {
    setGameState('gameover');
    if (effectsOn) playSound('game-over');
  };

  // Handle pause
  const handlePause = () => setGameState('paused');
  const handleResume = () => setGameState('playing');

  // Handle back
  const handleBack = useCallback(() => {
    if (gameState === 'playing' || gameState === 'paused') {
      if (window.confirm('Quit this game? Progress will be lost.')) {
        setGameState('menu');
      }
    } else {
      navigate('/map');
    }
  }, [gameState, navigate]);

  // Next level
  const handleNextLevel = () => {
    const nextLevel = currentLevel + 1;
    if (nextLevel <= LEVELS.length) {
      startGame(nextLevel);
    } else {
      setGameState('menu');
    }
  };

  // Return to menu
  const handleReturnToMenu = () => {
    setGameState('menu');
  };

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

  const levelConfig = LEVELS.find(l => l.level === currentLevel);
  const totalPairs = cards.length / 2;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-100 via-orange-50 to-yellow-100">
      <AnimatePresence mode="wait">
        {gameState === 'menu' && (
          <MainMenu
            key="menu"
            stats={stats}
            onSelectLevel={startGame}
            onBack={() => navigate('/map')}
          />
        )}

        {(gameState === 'playing' || gameState === 'paused') && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen pt-20 pb-8"
          >
            <GameHUD
              level={currentLevel}
              moves={moves}
              matchedCount={matchedPairs.length}
              totalPairs={totalPairs}
              timeElapsed={timeElapsed}
              timeLimit={levelConfig?.timeLimit}
              isPaused={gameState === 'paused'}
              onPause={handlePause}
              onResume={handleResume}
              onBack={handleBack}
            />

            <GameBoard
              cards={cards}
              flippedCards={flippedCards}
              matchedPairs={matchedPairs}
              onCardClick={handleCardClick}
              disabled={isProcessing || gameState === 'paused'}
              level={currentLevel}
            />

            {/* Pause Overlay */}
            <AnimatePresence>
              {gameState === 'paused' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 flex items-center justify-center z-40"
                >
                  <div className="bg-white rounded-2xl p-6 text-center shadow-xl">
                    <h2 className="text-2xl font-bold text-amber-800 mb-4">Paused</h2>
                    <div className="flex gap-4">
                      <button
                        onClick={handleBack}
                        className="px-6 py-2 rounded-xl bg-gray-200 font-bold text-gray-700 hover:bg-gray-300 transition-colors"
                      >
                        Quit
                      </button>
                      <button
                        onClick={handleResume}
                        className="px-6 py-2 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors"
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
          <motion.div
            key="gameover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gradient-to-b from-amber-100 to-orange-100 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl p-6 text-center shadow-xl max-w-sm w-full">
              <div className="text-5xl mb-4">⏰</div>
              <h2 className="text-2xl font-bold text-amber-800 mb-2">Time's Up!</h2>
              <p className="text-amber-600 mb-4">You ran out of time on Level {currentLevel}</p>
              
              <div className="bg-amber-50 rounded-xl p-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-amber-700">Matched</span>
                  <span className="font-bold text-amber-900">{matchedPairs.length}/{totalPairs}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-amber-700">Moves</span>
                  <span className="font-bold text-amber-900">{moves}</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleReturnToMenu}
                  className="flex-1 py-3 rounded-xl bg-gray-200 font-bold text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  Menu
                </button>
                <button
                  onClick={() => startGame(currentLevel)}
                  className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Complete Modal */}
      <LevelCompleteModal
        isOpen={gameState === 'complete'}
        level={currentLevel}
        moves={moves}
        timeMs={timeElapsed}
        score={score}
        isNewHighScore={score > (stats?.high_score || 0)}
        onNextLevel={handleNextLevel}
        onReturnToMenu={handleReturnToMenu}
        hasNextLevel={currentLevel < LEVELS.length}
      />
    </div>
  );
};

export default ScriptureMatchPage;
