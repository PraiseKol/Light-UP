import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@supabase/auth-helpers-react';
import toast from 'react-hot-toast';

import { getOrCreateStats, saveGame } from '@/lib/api/scriptureMatch';
import { generateCards, LEVELS, getMatchTypeHint, getPageForLevel, PAGES } from '@/data/scriptureMatchData';
import { playSound } from '@/utils/sound';
import { useGameUser } from '@/hooks/useGameUser';
import { loseLife } from '@/utils/loseLife';
import { supabase } from '@/lib/supabaseClient';

import MainMenu from '@/components/memory/MainMenu';
import GameBoard from '@/components/memory/GameBoard';
import GameHUD from '@/components/memory/GameHUD';
import LevelCompleteModal from '@/components/memory/LevelCompleteModal';
import HolyShieldButton from '@/components/HolyShieldButton';

const ScriptureMatchPage = ({ effectsOn = true }) => {
  const navigate = useNavigate();
  const user = useUser();
  const { gameUser, loading: loadingGameUser, refetch } = useGameUser(user?.id);
  
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
  const [shieldWasActive, setShieldWasActive] = useState(false);
  const [lifeLostThisGame, setLifeLostThisGame] = useState(false);
  
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

  // Check if shield is active
  const isShieldActive = gameUser?.holy_shield_until && 
    new Date(gameUser.holy_shield_until).getTime() > Date.now();

  // Deduct powerup from inventory
  const deductPowerup = async (key) => {
    if (!user?.id || !gameUser?.powerups_inventory?.[key]) return;
    
    await supabase
      .from('game_users')
      .update({
        powerups_inventory: {
          ...gameUser.powerups_inventory,
          [key]: Math.max(0, (gameUser.powerups_inventory[key] ?? 0) - 1)
        }
      })
      .eq('user_id', user.id);
    
    await refetch();
  };

  // Start a new game at a specific level
  const startGame = useCallback((level) => {
    // Check if user has lives
    if (gameUser && gameUser.lives <= 0) {
      toast.error("No lives left! Wait for regeneration.");
      return;
    }
    
    const newCards = generateCards(level);
    setCards(newCards);
    setCurrentLevel(level);
    setFlippedCards([]);
    setMatchedPairs([]);
    setMoves(0);
    setTimeElapsed(0);
    setScore(0);
    setIsProcessing(false);
    setShieldWasActive(false);
    setLifeLostThisGame(false); // Reset life loss flag
    setGameState('playing');
    
    if (effectsOn) playSound('select');
  }, [effectsOn, gameUser]);

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
  const handleGameOver = async () => {
    // Prevent multiple life deductions
    if (lifeLostThisGame) return;
    
    setGameState('gameover');
    if (effectsOn) playSound('game-over');
    
    // Check if Holy Shield is active
    const shieldActive = gameUser?.holy_shield_until && 
      new Date(gameUser.holy_shield_until).getTime() > Date.now();
    
    if (shieldActive) {
      setShieldWasActive(true);
      toast.success("🛡️ Holy Shield protected you!");
    } else if (user?.id && gameUser?.lives > 0) {
      // Lose a life (only once per game)
      setLifeLostThisGame(true);
      await loseLife(user.id, gameUser.lives);
      await refetch();
      if (effectsOn) playSound('life-lost');
    }
  };

  // Divine Hint - reveal and match one pair
  const handleDivineHint = useCallback(() => {
    const hintCount = gameUser?.powerups_inventory?.divine_hint || 0;
    if (hintCount <= 0) {
      toast.error("No Divine Hints available!");
      return;
    }
    if (gameState !== 'playing' || isProcessing) return;
    
    // Find an unmatched pair
    const unmatchedCards = cards.filter(c => !matchedPairs.includes(c.pairId));
    if (unmatchedCards.length < 2) return;
    
    // Get a pair (find two cards with same pairId)
    const firstCard = unmatchedCards[0];
    const secondCard = unmatchedCards.find(c => c.pairId === firstCard.pairId && c.id !== firstCard.id);
    
    if (!firstCard || !secondCard) return;
    
    setIsProcessing(true);
    
    // Reveal them temporarily
    setFlippedCards([firstCard, secondCard]);
    if (effectsOn) playSound('divine-hint');
    
    // After delay, mark as matched
    setTimeout(() => {
      setMatchedPairs(prev => [...prev, firstCard.pairId]);
      setFlippedCards([]);
      setIsProcessing(false);
      setMoves(prev => prev + 1);
    }, 1500);
    
    // Deduct from inventory
    deductPowerup('divine_hint');
    toast.success("🧩 Divine Hint revealed a pair!");
  }, [gameUser, gameState, isProcessing, cards, matchedPairs, effectsOn]);

  // Grace Period - add 15 seconds
  const handleGracePeriod = useCallback(() => {
    const graceCount = gameUser?.powerups_inventory?.grace_period || 0;
    if (graceCount <= 0) {
      toast.error("No Grace Period available!");
      return;
    }
    if (gameState !== 'playing') return;
    
    const levelConfig = LEVELS.find(l => l.level === currentLevel);
    if (!levelConfig?.timeLimit) {
      toast.info("No time limit on this level!");
      return;
    }
    
    // Add 15 seconds by reducing timeElapsed
    setTimeElapsed(prev => Math.max(0, prev - 15000));
    if (effectsOn) playSound('grace-period');
    toast.success("⏳ +15 seconds added!");
    
    deductPowerup('grace_period');
  }, [gameUser, gameState, currentLevel, effectsOn]);

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

  if (loading || loadingGameUser) {
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
  const matchTypeHint = levelConfig ? getMatchTypeHint(levelConfig.matchType) : null;

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
            className="h-[100dvh] flex flex-col overflow-hidden"
          >
            <GameHUD
              level={currentLevel}
              moves={moves}
              matchedCount={matchedPairs.length}
              totalPairs={totalPairs}
              timeElapsed={timeElapsed}
              timeLimit={levelConfig?.timeLimit}
              isPaused={gameState === 'paused'}
              lives={gameUser?.lives}
              isShieldActive={isShieldActive}
              matchTypeHint={matchTypeHint}
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

            {/* Power-up Bar */}
            <div className="bg-slate-800/90 backdrop-blur-lg border-t border-white/10 p-2 sm:p-2.5 safe-area-pb shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.35)]">
              <div className="flex justify-around items-center max-w-md mx-auto gap-2">
                {/* Divine Hint Button */}
                <button
                  onClick={handleDivineHint}
                  disabled={!gameUser?.powerups_inventory?.divine_hint || isProcessing}
                  className={`orb-power flex flex-col items-center px-3 py-1.5 text-white ${
                    !gameUser?.powerups_inventory?.divine_hint || isProcessing ? 'is-empty' : ''
                  }`}
                >
                  <span className="text-base sm:text-lg">🧩</span>
                  <span className="text-[9px] sm:text-[10px] font-bold">Hint x{gameUser?.powerups_inventory?.divine_hint || 0}</span>
                </button>
                
                {/* Grace Period Button - only on timed levels */}
                {levelConfig?.timeLimit && (
                  <button
                    onClick={handleGracePeriod}
                    disabled={!gameUser?.powerups_inventory?.grace_period}
                    className={`orb-power flex flex-col items-center px-3 py-1.5 text-white ${
                      !gameUser?.powerups_inventory?.grace_period ? 'is-empty' : ''
                    }`}
                  >
                    <span className="text-base sm:text-lg">⏳</span>
                    <span className="text-[9px] sm:text-[10px] font-bold">+15s x{gameUser?.powerups_inventory?.grace_period || 0}</span>
                  </button>
                )}
                
                {/* Holy Shield Button */}
                <HolyShieldButton 
                  gameUser={gameUser} 
                  refetch={refetch} 
                  effectsOn={effectsOn} 
                />
              </div>
            </div>

            {/* Pause Overlay */}
            <AnimatePresence>
              {gameState === 'paused' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40 p-4"
                >
                  <div className="modal-3d max-w-xs w-full">
                    <div className="modal-3d-header text-center">
                      <span className="text-lg font-black">⏸️ Paused</span>
                    </div>
                    <div className="p-4 flex gap-3">
                      <button
                        onClick={handleBack}
                        className="chip-3d flex-1 !py-3 font-black"
                      >
                        Quit
                      </button>
                      <button
                        onClick={handleResume}
                        className="btn-orb btn-orb-green flex-1 !py-3 font-black"
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
            <div className="modal-3d max-w-sm w-full">
              <div className="modal-3d-header text-center">
                <span className="text-3xl inline-block mr-2">⏰</span>
                <span className="text-lg sm:text-xl font-black">Time's Up!</span>
              </div>
              <div className="p-4 sm:p-5 text-center">
                <p className="text-amber-600 text-sm mb-4">You ran out of time on Level {currentLevel}</p>
                
                {shieldWasActive && (
                  <div className="chip-3d !bg-gradient-to-b !from-yellow-200 !to-amber-400 !text-amber-900 inline-flex items-center gap-2 mb-4 !py-2 !px-3">
                    <span>🛡️</span>
                    <span className="text-sm">Holy Shield protected you from losing a life!</span>
                  </div>
                )}
                
                <div className="row-3d !items-stretch flex-col mb-4">
                  <div className="flex justify-between text-sm py-0.5">
                    <span className="text-amber-700 font-semibold">Matched</span>
                    <span className="font-black text-amber-900">{matchedPairs.length}/{totalPairs}</span>
                  </div>
                  <div className="flex justify-between text-sm py-0.5">
                    <span className="text-amber-700 font-semibold">Moves</span>
                    <span className="font-black text-amber-900">{moves}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 mt-1 border-t-2 border-amber-200">
                    <span className="text-amber-700 font-semibold">Lives remaining</span>
                    <div className="heart-meter">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`heart-pip ${i < (gameUser?.lives ?? 0) ? '' : 'is-empty'}`}>❤️</span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleReturnToMenu}
                    className="chip-3d flex-1 !py-3 font-black"
                  >
                    Menu
                  </button>
                  <button
                    onClick={() => startGame(currentLevel)}
                    disabled={gameUser?.lives <= 0}
                    className="btn-orb btn-orb-green flex-1 !py-3 font-black disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {gameUser?.lives <= 0 ? 'No Lives' : 'Try Again'}
                  </button>
                </div>
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
