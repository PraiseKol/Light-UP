import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import PopGameItem from '../components/PopGameItem';
import { 
  getActivePopGameSession, 
  getPlayerAttempts, 
  recordPopGameScore 
} from '../lib/api/popGame';
import { supabase } from '../lib/supabaseClient';
import { playSound } from '../utils/sound';
import { toast } from 'sonner';

const GAME_DURATION = 30;
const COMBO_TIMEOUT = 750; // 0.75 seconds to maintain combo
const MAX_COMBO = 25; // For reaching 7.5x multiplier

// Spawn rates based on rarity (lower points = more common)
const ITEM_TYPES = [
  { type: 'heart', weight: 35 },
  { type: 'santa', weight: 25 },
  { type: 'lamp', weight: 20 },
  { type: 'dove', weight: 13 },
  { type: 'cross', weight: 7 }
];

// Crown is ultra rare - ~1% base chance, may not appear in a round
const CROWN_SPAWN_CHANCE = 0.01;

const getComboMultiplier = (combo) => {
  if (combo >= 25) return 7.5;
  if (combo >= 20) return 6.0;
  if (combo >= 15) return 4.5;
  if (combo >= 12) return 3.5;
  if (combo >= 10) return 3.0;
  if (combo >= 7) return 2.5;
  if (combo >= 5) return 2.0;
  if (combo >= 3) return 1.5;
  if (combo >= 2) return 1.25;
  return 1;
};

// Dynamic spawn rate based on elapsed time (faster spawns as game progresses)
const getSpawnInterval = (elapsedTime) => {
  // Every 2 seconds, spawn gets faster
  const phase = Math.floor(elapsedTime / 2);
  const baseInterval = 350; // Start faster
  const minInterval = 150;
  return Math.max(baseInterval - (phase * 15), minInterval);
};

// Dynamic fall speed based on elapsed time (faster falls as game progresses)
const getFallSpeed = (elapsedTime) => {
  // Every 2 seconds, items fall faster
  const phase = Math.floor(elapsedTime / 2);
  const baseMin = 2.0;
  const baseMax = 3.5;
  const speedBoost = Math.min(phase * 0.1, 1.3); // Up to 1.3s faster
  return {
    min: Math.max(baseMin - speedBoost, 0.8),
    max: Math.max(baseMax - speedBoost, 1.5)
  };
};

// Number of items to spawn per interval based on elapsed time
const getSpawnCount = (elapsedTime) => {
  const phase = Math.floor(elapsedTime / 2);
  if (phase >= 12) return 5; // 24+ seconds
  if (phase >= 10) return 4; // 20+ seconds
  if (phase >= 7) return 4;  // 14+ seconds
  if (phase >= 5) return 3;  // 10+ seconds
  if (phase >= 3) return 3;  // 6+ seconds
  return 2; // Start with 2 items
};

const getRandomItemType = () => {
  // Ultra rare crown check first
  if (Math.random() < CROWN_SPAWN_CHANCE) {
    return 'crown';
  }
  
  const totalWeight = ITEM_TYPES.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of ITEM_TYPES) {
    random -= item.weight;
    if (random <= 0) return item.type;
  }
  return 'heart';
};

const PopGamePage = () => {
  const navigate = useNavigate();
  const { session } = useSessionContext();
  const [gameState, setGameState] = useState('loading'); // loading, ready, playing, finished
  const [session_, setSession_] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [items, setItems] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [bestScore, setBestScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [showComboPopup, setShowComboPopup] = useState(false);
  const [lastPoints, setLastPoints] = useState({ points: 0, bonus: 0, x: 0, y: 0 });
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [effectsOn, setEffectsOn] = useState(true);
  const itemIdRef = useRef(0);
  const gameAreaRef = useRef(null);
  const comboTimerRef = useRef(null);
  const poppedItemsRef = useRef(new Set());

  // Load session and attempts
  useEffect(() => {
    const loadData = async () => {
      if (!session?.user?.id) return;

      try {
        // Get player name and effects preference
        const { data: userData } = await supabase
          .from('game_users')
          .select('player_name, effects_on')
          .eq('user_id', session.user.id)
          .single();
        
        setPlayerName(userData?.player_name || 'Player');
        setEffectsOn(userData?.effects_on !== false);

        // Get active session
        const activeSession = await getActivePopGameSession();
        if (!activeSession) {
          toast.error('No active pop game session');
          navigate('/');
          return;
        }
        setSession_(activeSession);
        setMaxAttempts(activeSession.max_attempts || 3);

        // Get player attempts
        const playerAttempts = await getPlayerAttempts(activeSession.id, session.user.id);
        setAttempts(playerAttempts);
        setCurrentAttempt(playerAttempts.length + 1);
        
        // Calculate best score
        const best = playerAttempts.reduce((max, a) => Math.max(max, a.score), 0);
        setBestScore(best);

        if (playerAttempts.length >= (activeSession.max_attempts || 3)) {
          setGameState('no_attempts');
        } else {
          setGameState('ready');
        }
      } catch (error) {
        console.error('Error loading pop game:', error);
        toast.error('Failed to load game');
        navigate('/');
      }
    };

    loadData();
  }, [session, navigate]);

  // Spawn items during gameplay with time-based dynamic rates
  useEffect(() => {
    if (gameState !== 'playing') return;

    let spawnTimer = null;
    
    const scheduleNextSpawn = () => {
      const elapsedTime = GAME_DURATION - timeLeft;
      const interval = getSpawnInterval(elapsedTime);
      spawnTimer = setTimeout(() => {
        const gameWidth = gameAreaRef.current?.clientWidth || 300;
        const currentElapsed = GAME_DURATION - timeLeft;
        const spawnCount = getSpawnCount(currentElapsed);
        const { min, max } = getFallSpeed(currentElapsed);
        
        setItems(prev => {
          const newItems = [];
          for (let i = 0; i < spawnCount; i++) {
            newItems.push({
              id: itemIdRef.current++,
              type: getRandomItemType(),
              x: Math.random() * (gameWidth - 80) + 20,
              speed: min + Math.random() * (max - min)
            });
          }
          return [...prev, ...newItems];
        });
        
        scheduleNextSpawn();
      }, interval);
    };
    
    scheduleNextSpawn();

    return () => {
      if (spawnTimer) clearTimeout(spawnTimer);
    };
  }, [gameState, timeLeft]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('finished');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // Clean up fallen items
  useEffect(() => {
    if (gameState !== 'playing') return;

    const cleanupInterval = setInterval(() => {
      setItems(prev => prev.filter(item => {
        const element = document.getElementById(`item-${item.id}`);
        if (!element) return true;
        const rect = element.getBoundingClientRect();
        return rect.top < window.innerHeight + 100;
      }));
    }, 1000);

    return () => clearInterval(cleanupInterval);
  }, [gameState]);

  // Save score when finished
  useEffect(() => {
    if (gameState !== 'finished' || !session_) return;

    const saveScore = async () => {
      try {
        await recordPopGameScore(
          session_.id,
          session.user.id,
          playerName,
          currentAttempt,
          score
        );
        
        if (score > bestScore) {
          setBestScore(score);
        }
        
        playSound('levelUp', effectsOn);
      } catch (error) {
        console.error('Error saving score:', error);
      }
    };

    saveScore();
  }, [gameState]);

  const handlePop = useCallback((itemId, points, x, y, isTimeBonus = false) => {
    // Prevent clicks after game ends
    if (gameState !== 'playing' || timeLeft <= 0) return;
    if (poppedItemsRef.current.has(itemId)) return;
    poppedItemsRef.current.add(itemId);
    setItems(prev => prev.filter(item => item.id !== itemId));
    
    // Clear existing combo timer
    if (comboTimerRef.current) {
      clearTimeout(comboTimerRef.current);
    }
    
    // Handle time bonus (crown)
    if (isTimeBonus) {
      setTimeLeft(prev => prev + 10);
      setLastPoints({ points: 0, bonus: 0, x, y, isTime: true });
      setShowComboPopup(true);
      setTimeout(() => setShowComboPopup(false), 500);
      playSound('powerUp', effectsOn);
      
      // Still continue combo for crown
      setCombo(prev => {
        const newCombo = Math.min(prev + 1, MAX_COMBO);
        comboTimerRef.current = setTimeout(() => {
          setCombo(0);
        }, COMBO_TIMEOUT);
        return newCombo;
      });
      return;
    }
    
    // Calculate combo and bonus
    setCombo(prev => {
      const newCombo = Math.min(prev + 1, MAX_COMBO);
      const multiplier = getComboMultiplier(newCombo);
      const bonusPoints = Math.floor(points * multiplier) - points;
      const totalPoints = points + bonusPoints;
      
      setScore(s => s + totalPoints);
      
      // Show popup with points info
      setLastPoints({ points, bonus: bonusPoints, x, y, isTime: false });
      setShowComboPopup(true);
      setTimeout(() => setShowComboPopup(false), 300);
      
      // Reset combo after timeout
      comboTimerRef.current = setTimeout(() => {
        setCombo(0);
      }, COMBO_TIMEOUT);
      
      return newCombo;
    });
    
    playSound('click', effectsOn);
  }, [gameState, timeLeft, effectsOn]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setItems([]);
    setCombo(0);
    poppedItemsRef.current.clear();
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    setGameState('playing');
    playSound('switch', effectsOn);
  };

  const playAgain = () => {
    if (currentAttempt >= maxAttempts) {
      setGameState('no_attempts');
      return;
    }
    setCurrentAttempt(prev => prev + 1);
    setGameState('ready');
  };

  // Render different states
  if (gameState === 'loading') {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-[#0c1445] via-[#1e3a5f] to-[#0d1b2a] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (gameState === 'no_attempts') {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-[#0c1445] via-[#1e3a5f] to-[#0d1b2a] flex flex-col items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/20 text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">No More Attempts!</h2>
          <p className="text-white/70 mb-4">You've used all {maxAttempts} attempts.</p>
          <div className="text-4xl font-bold text-amber-400 mb-6">
            Best Score: {bestScore}
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full font-bold shadow-lg"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={gameAreaRef}
      className="min-h-[100dvh] relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #87CEEB 0%, #E6D5AC 50%, #D4C4A8 100%)'
      }}
    >
      {/* Decorative clouds */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 text-6xl opacity-60 animate-pulse">☁️</div>
        <div className="absolute top-20 right-20 text-5xl opacity-50">☁️</div>
        <div className="absolute top-5 left-1/2 text-7xl opacity-40">☁️</div>
      </div>

      {/* Light rays */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64 
        bg-gradient-to-b from-yellow-200/40 to-transparent pointer-events-none" />

      {/* Olive branches */}
      <div className="absolute bottom-0 left-0 text-4xl opacity-70">🫒</div>
      <div className="absolute bottom-0 right-0 text-4xl opacity-70 scale-x-[-1]">🫒</div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 flex items-center justify-between bg-black/20 backdrop-blur-sm">
        <button 
          onClick={() => navigate('/')}
          className="p-2 rounded-full bg-white/20 text-white"
        >
          <ArrowLeft size={24} />
        </button>
        
        <div className="text-center">
          <div className="text-white font-bold text-lg">Free Fall Pop</div>
          <div className="text-white/70 text-sm">
            Attempt {currentAttempt}/{maxAttempts}
          </div>
        </div>

        <div className="text-right">
          {gameState === 'playing' && (
            <div className="text-2xl font-bold text-white">
              {timeLeft}s
            </div>
          )}
        </div>
      </div>

      {/* Score and Combo display during game */}
      {gameState === 'playing' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
          <motion.div 
            key={score}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-4xl font-bold text-amber-600 bg-white/80 px-6 py-2 rounded-full shadow-lg"
          >
            {score}
          </motion.div>
          
          {/* Combo indicator */}
          {combo >= 2 && (
            <motion.div
              key={combo}
              initial={{ scale: 1.3, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              className={`px-4 py-1 rounded-full font-bold text-white shadow-lg ${
                combo >= 25 ? 'bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 text-xl animate-pulse' :
                combo >= 20 ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-lg' :
                combo >= 15 ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-lg' :
                combo >= 10 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                combo >= 7 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                combo >= 5 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                combo >= 3 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                'bg-gradient-to-r from-blue-400 to-blue-600'
              }`}
            >
              {combo >= 25 ? '👑 LEGENDARY! x7.5' :
               combo >= 20 ? `🔥🔥 INSANE! x6.0` :
               combo >= 15 ? `🔥 ON FIRE! x4.5` :
               combo >= 12 ? `🔥 BLAZING! x3.5` :
               combo >= 10 ? `⚡ SUPER! x3.0` :
               combo >= 7 ? `⚡ COMBO x${combo}! (x2.5)` :
               combo >= 5 ? `✨ COMBO x${combo}! (x2.0)` :
               combo >= 3 ? `✨ COMBO x${combo}! (x1.5)` :
               `COMBO x${combo}! (x1.25)`}
            </motion.div>
          )}
        </div>
      )}

      {/* Floating points popup */}
      <AnimatePresence>
        {showComboPopup && (lastPoints.bonus > 0 || lastPoints.isTime) && (
          <motion.div
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -50, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute z-50 pointer-events-none text-center"
            style={{ left: lastPoints.x - 40, top: lastPoints.y - 30 }}
          >
            {lastPoints.isTime ? (
              <div className="text-yellow-400 font-bold text-xl">
                ⏰ +10 SEC!
              </div>
            ) : (
              <>
                <div className="text-green-500 font-bold text-lg">
                  +{lastPoints.points + lastPoints.bonus}
                </div>
                <div className="text-amber-500 text-xs font-semibold">
                  (+{lastPoints.bonus} bonus!)
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Falling items */}
      <AnimatePresence>
        {items.map(item => (
          <PopGameItem 
            key={item.id} 
            item={item} 
            onPop={handlePop}
          />
        ))}
      </AnimatePresence>

      {/* Ready state */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl text-center max-w-sm mx-4"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-2">🎮 Ready to Play?</h2>
            <p className="text-gray-600 mb-4">
              Tap falling items to collect points!<br/>
              Chain taps for combo bonuses!
            </p>
            
            <div className="grid grid-cols-6 gap-1.5 mb-4 text-sm">
              <div className="text-center">
                <div className="text-xl">❤️</div>
                <div className="text-gray-500 text-xs">+5</div>
              </div>
              <div className="text-center">
                <div className="text-xl">🎅</div>
                <div className="text-gray-500 text-xs">+5</div>
              </div>
              <div className="text-center">
                <div className="text-xl">🪔</div>
                <div className="text-gray-500 text-xs">+10</div>
              </div>
              <div className="text-center">
                <div className="text-xl">🕊️</div>
                <div className="text-gray-500 text-xs">+15</div>
              </div>
              <div className="text-center">
                <div className="text-xl">✝️</div>
                <div className="text-gray-500 text-xs">+20</div>
              </div>
              <div className="text-center">
                <div className="text-xl">👑</div>
                <div className="text-gray-500 text-xs">+10s</div>
              </div>
            </div>
            
            <div className="text-xs text-amber-600 mb-3">
              ⚡ Higher combos = faster spawns & speed!
            </div>

            <div className="text-sm text-gray-500 mb-4">
              Attempts remaining: {maxAttempts - currentAttempt + 1}
            </div>

            <button
              onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 
                text-white text-xl font-bold rounded-2xl shadow-lg
                hover:from-green-600 hover:to-emerald-700 
                active:scale-95 transition-transform"
            >
              Start Game!
            </button>
          </motion.div>
        </div>
      )}

      {/* Finished state */}
      {gameState === 'finished' && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/30">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl text-center max-w-sm mx-4"
          >
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Time's Up!</h2>
            
            <div className="text-5xl font-bold text-amber-500 my-4">
              {score}
            </div>
            <p className="text-gray-500 mb-2">points earned</p>

            {score > bestScore - score && score > 0 && (
              <div className="text-green-600 font-bold mb-4">
                🏆 New Best Score!
              </div>
            )}

            <div className="text-gray-600 mb-6">
              Best Score: <span className="font-bold text-amber-600">{Math.max(bestScore, score)}</span>
            </div>

            <div className="space-y-3">
              {currentAttempt < maxAttempts && (
                <button
                  onClick={playAgain}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 
                    text-white font-bold rounded-xl shadow-lg"
                >
                  Play Again ({maxAttempts - currentAttempt} left)
                </button>
              )}
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 
                  text-white font-bold rounded-xl shadow-lg"
              >
                Back to Map
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PopGamePage;
