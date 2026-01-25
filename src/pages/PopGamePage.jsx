import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Shield, Clock, Sparkles } from 'lucide-react';
import PopGameItem from '../components/PopGameItem';
import { 
  getPopGameActive,
  getPlayerBestScores, 
  updatePlayerBestScores,
  fetchPopGameLeaderboard 
} from '../lib/api/popGame';
import PopGameLeaderboardModal from '../components/PopGameLeaderboardModal';
import { supabase } from '../lib/supabaseClient';
import { playSound } from '../utils/sound';
import { toast } from 'sonner';
import { useGameUser } from '../hooks/useGameUser';
import { loseLife } from '../utils/loseLife';
import HolyShieldButton from '../components/HolyShieldButton';

const GAME_DURATION = 30;
const COMBO_TIMEOUT = 750; // 0.75 seconds to maintain combo
const MAX_COMBO = 25; // For reaching 7.5x multiplier

// Spawn rates based on rarity (lower points = more common)
const ITEM_TYPES = [
  { type: 'heart', weight: 35 },
  { type: 'santa', weight: 25 },
  { type: 'lamp', weight: 20 },
  { type: 'dove', weight: 13 },
  { type: 'cross', weight: 7 },
  { type: 'bomb', weight: 5 }
];

// Bomb spawn chance - independent of regular items
const BOMB_SPAWN_CHANCE = 0.05; // 5% chance

// Crown is ultra rare - ~1% base chance, may not appear in a round
const CROWN_SPAWN_CHANCE_NORMAL = 0.01;
const CROWN_SPAWN_CHANCE_DIVINE = 0.02; // Double when Divine Hint is active

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

// Dynamic spawn rate based on elapsed time (slower, more manageable spawns)
const getSpawnInterval = (elapsedTime) => {
  const phase = Math.floor(elapsedTime / 3);
  const baseInterval = 600;
  const minInterval = 350;
  return Math.max(baseInterval - (phase * 25), minInterval);
};

// Dynamic fall speed based on elapsed time (increases every 3 seconds)
const getFallSpeed = (elapsedTime) => {
  const phase = Math.floor(elapsedTime / 3);
  const baseMin = 3.0;
  const baseMax = 4.5;
  const speedBoost = Math.min(phase * 0.15, 1.5);
  return {
    min: Math.max(baseMin - speedBoost, 1.2),
    max: Math.max(baseMax - speedBoost, 2.0)
  };
};

// Number of items to spawn per interval based on elapsed time
const getSpawnCount = (elapsedTime) => {
  const phase = Math.floor(elapsedTime / 3);
  if (phase >= 8) return 3;
  if (phase >= 6) return 3;
  if (phase >= 4) return 2;
  if (phase >= 2) return 2;
  return 1;
};

const PopGamePage = () => {
  const navigate = useNavigate();
  const { session } = useSessionContext();
  const { gameUser, loading: loadingGameUser, refetch } = useGameUser(session?.user?.id);
  
  const [gameState, setGameState] = useState('loading'); // loading, ready, playing, finished
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [items, setItems] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [bestScores, setBestScores] = useState([]);
  const [combo, setCombo] = useState(0);
  const [showComboPopup, setShowComboPopup] = useState(false);
  const [lastPoints, setLastPoints] = useState({ points: 0, bonus: 0, x: 0, y: 0 });
  const [effectsOn, setEffectsOn] = useState(true);
  
  // Leaderboard states
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState({ topPlayers: [], currentUserRank: null });
  
  // Power-up states
  const [divineHintActive, setDivineHintActive] = useState(false);
  const [gracePeriodUsed, setGracePeriodUsed] = useState(false);
  const [shieldProtected, setShieldProtected] = useState(false);
  
  const itemIdRef = useRef(0);
  const gameAreaRef = useRef(null);
  const comboTimerRef = useRef(null);
  const poppedItemsRef = useRef(new Set());

  // Get crown spawn chance based on Divine Hint
  const getCrownSpawnChance = useCallback(() => {
    return divineHintActive ? CROWN_SPAWN_CHANCE_DIVINE : CROWN_SPAWN_CHANCE_NORMAL;
  }, [divineHintActive]);

  const getRandomItemType = useCallback(() => {
    // Ultra rare crown check first (doubled if Divine Hint active)
    if (Math.random() < getCrownSpawnChance()) {
      return 'crown';
    }
    
    const totalWeight = ITEM_TYPES.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of ITEM_TYPES) {
      random -= item.weight;
      if (random <= 0) return item.type;
    }
    return 'heart';
  }, [getCrownSpawnChance]);

  // Load data - no session requirement, just check if pop game is enabled
  useEffect(() => {
    const loadData = async () => {
      if (!session?.user?.id) return;

      try {
        // Check if pop game is enabled
        const isActive = await getPopGameActive();
        if (!isActive) {
          toast.error('Pop Game is not currently active');
          navigate('/');
          return;
        }

        // Get player data
        const { data: userData } = await supabase
          .from('game_users')
          .select('player_name, effects_on, lives')
          .eq('user_id', session.user.id)
          .single();
        
        setPlayerName(userData?.player_name || 'Player');
        setEffectsOn(userData?.effects_on !== false);

        // Check lives
        if (userData?.lives <= 0) {
          toast.error('No lives remaining!');
          navigate('/');
          return;
        }

        // Get best scores
        const scores = await getPlayerBestScores(session.user.id);
        setBestScores(scores);

        // Load leaderboard data
        const lbData = await fetchPopGameLeaderboard(session.user.id);
        setLeaderboardData(lbData);

        setGameState('ready');
      } catch (error) {
        console.error('Error loading pop game:', error);
        toast.error('Failed to load game');
        navigate('/');
      }
    };

    if (!loadingGameUser) {
      loadData();
    }
  }, [session, navigate, loadingGameUser]);

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
  }, [gameState, timeLeft, getRandomItemType]);

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

  // Clean up fallen items and reset combo when items are missed
  useEffect(() => {
    if (gameState !== 'playing') return;

    const cleanupInterval = setInterval(() => {
      setItems(prev => {
        let itemMissed = false;
        const filtered = prev.filter(item => {
          const element = document.getElementById(`item-${item.id}`);
          if (!element) return true;
          const rect = element.getBoundingClientRect();
          const isVisible = rect.top < window.innerHeight + 100;
          if (!isVisible && !poppedItemsRef.current.has(item.id)) {
            itemMissed = true;
          }
          return isVisible;
        });
        
        if (itemMissed) {
          setCombo(0);
          if (comboTimerRef.current) {
            clearTimeout(comboTimerRef.current);
            comboTimerRef.current = null;
          }
        }
        
        return filtered;
      });
    }, 500);

    return () => clearInterval(cleanupInterval);
  }, [gameState]);

  // Save score when finished (NO life loss on time-out - lives are only lost on bomb hits)
  useEffect(() => {
    if (gameState !== 'finished' || !session?.user?.id) return;

    const handleGameEnd = async () => {
      try {
        // Save to best scores
        const isNewBest = await updatePlayerBestScores(session.user.id, score);
        if (isNewBest) {
          const updatedScores = await getPlayerBestScores(session.user.id);
          setBestScores(updatedScores);
        }
        
        // Refresh user data to get updated lives (in case bomb was hit)
        await refetch();
        
        playSound('levelUp', effectsOn);
      } catch (error) {
        console.error('Error saving score:', error);
      }
    };

    handleGameEnd();
  }, [gameState, session?.user?.id, score, refetch, effectsOn]);

  // Deduct power-up helper
  const deductPowerup = async (key) => {
    if (!session?.user?.id || !gameUser?.powerups_inventory?.[key]) return;
    
    await supabase
      .from('game_users')
      .update({
        powerups_inventory: {
          ...gameUser.powerups_inventory,
          [key]: Math.max(0, (gameUser.powerups_inventory[key] ?? 0) - 1)
        }
      })
      .eq('user_id', session.user.id);
    
    await refetch();
  };

  // Grace Period handler (+5 seconds)
  const handleGracePeriod = async () => {
    if (!gameUser?.powerups_inventory?.grace_period) return;
    if (gameState !== 'playing' || gracePeriodUsed) return;
    
    setTimeLeft(prev => prev + 5);
    playSound('grace-period', effectsOn);
    toast.success("⏳ +5 seconds added!");
    
    await deductPowerup('grace_period');
    setGracePeriodUsed(true);
  };

  // Divine Hint handler (double crown chance)
  const handleDivineHint = async () => {
    if (!gameUser?.powerups_inventory?.divine_hint) return;
    if (gameState !== 'playing' || divineHintActive) return;
    
    setDivineHintActive(true);
    playSound('divine-hint', effectsOn);
    toast.success("👑 Crown chance doubled for this round!");
    
    await deductPowerup('divine_hint');
  };

  const handlePop = useCallback(async (itemId, points, x, y, isTimeBonus = false, isBomb = false) => {
    if (gameState !== 'playing' || timeLeft <= 0) return;
    if (poppedItemsRef.current.has(itemId)) return;
    poppedItemsRef.current.add(itemId);
    setItems(prev => prev.filter(item => item.id !== itemId));
    
    // Handle BOMB hit - lose life + 25% score penalty
    if (isBomb) {
      // Reset combo on bomb hit
      setCombo(0);
      if (comboTimerRef.current) {
        clearTimeout(comboTimerRef.current);
        comboTimerRef.current = null;
      }
      
      // 25% score penalty
      setScore(prev => Math.floor(prev * 0.75));
      
      // Show bomb hit feedback
      setLastPoints({ points: 0, bonus: 0, x, y, isBomb: true });
      setShowComboPopup(true);
      setTimeout(() => setShowComboPopup(false), 800);
      
      // Check Holy Shield for life protection
      const isShieldActive = gameUser?.holy_shield_until && 
        new Date(gameUser.holy_shield_until).getTime() > Date.now();
      
      if (isShieldActive) {
        setShieldProtected(true);
        toast.success("🛡️ Shield blocked the bomb! (-25% score only)");
        playSound('power-up', effectsOn);
      } else if (session?.user?.id && gameUser?.lives > 0) {
        // Lose a life
        await loseLife(session.user.id, gameUser.lives);
        await refetch();
        playSound('life-lost', effectsOn);
        toast.error("💣 BOOM! Lost a life & 25% score!");
      }
      
      playSound('error', effectsOn);
      return;
    }
    
    if (comboTimerRef.current) {
      clearTimeout(comboTimerRef.current);
    }
    
    if (isTimeBonus) {
      setTimeLeft(prev => prev + 10);
      setLastPoints({ points: 0, bonus: 0, x, y, isTime: true });
      setShowComboPopup(true);
      setTimeout(() => setShowComboPopup(false), 500);
      playSound('powerUp', effectsOn);
      
      setCombo(prev => {
        const newCombo = Math.min(prev + 1, MAX_COMBO);
        comboTimerRef.current = setTimeout(() => {
          setCombo(0);
        }, COMBO_TIMEOUT);
        return newCombo;
      });
      return;
    }
    
    setCombo(prev => {
      const newCombo = Math.min(prev + 1, MAX_COMBO);
      const multiplier = getComboMultiplier(newCombo);
      const bonusPoints = Math.floor(points * multiplier) - points;
      const totalPoints = points + bonusPoints;
      
      setScore(s => s + totalPoints);
      
      setLastPoints({ points, bonus: bonusPoints, x, y, isTime: false });
      setShowComboPopup(true);
      setTimeout(() => setShowComboPopup(false), 300);
      
      comboTimerRef.current = setTimeout(() => {
        setCombo(0);
      }, COMBO_TIMEOUT);
      
      return newCombo;
    });
    
    playSound('click', effectsOn);
  }, [gameState, timeLeft, effectsOn, gameUser, session?.user?.id, refetch]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setItems([]);
    setCombo(0);
    setDivineHintActive(false);
    setGracePeriodUsed(false);
    setShieldProtected(false);
    poppedItemsRef.current.clear();
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    setGameState('playing');
    playSound('switch', effectsOn);
  };

  const playAgain = async () => {
    // Refresh game user to check lives
    await refetch();
    if (gameUser?.lives <= 0) {
      toast.error('No lives remaining!');
      return;
    }
    setGameState('ready');
  };

  // Render different states
  if (gameState === 'loading' || loadingGameUser) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-[#0c1445] via-[#1e3a5f] to-[#0d1b2a] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
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
          <div className="text-white/70 text-sm flex items-center justify-center gap-2">
            <span>❤️ {gameUser?.lives ?? 0}</span>
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

          {/* Divine Hint indicator */}
          {divineHintActive && (
            <div className="px-3 py-1 rounded-full bg-yellow-500 text-white text-sm font-bold animate-pulse">
              👑 2x Crown Chance Active!
            </div>
          )}
        </div>
      )}

      {/* Power-up bar during gameplay */}
      {gameState === 'playing' && gameUser && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-sm p-3 flex justify-around items-center gap-2">
          {/* Grace Period */}
          <button
            onClick={handleGracePeriod}
            disabled={!gameUser.powerups_inventory?.grace_period || gracePeriodUsed}
            className={`flex flex-col items-center px-3 py-2 rounded-xl text-white text-sm transition-all ${
              gameUser.powerups_inventory?.grace_period && !gracePeriodUsed
                ? 'bg-purple-500 hover:bg-purple-600 active:scale-95'
                : 'bg-gray-500/50 opacity-50'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-xs">+5s</span>
            <span className="text-[10px]">x{gameUser.powerups_inventory?.grace_period || 0}</span>
          </button>
          
          {/* Divine Hint */}
          <button
            onClick={handleDivineHint}
            disabled={!gameUser.powerups_inventory?.divine_hint || divineHintActive}
            className={`flex flex-col items-center px-3 py-2 rounded-xl text-white text-sm transition-all ${
              gameUser.powerups_inventory?.divine_hint && !divineHintActive
                ? 'bg-yellow-500 hover:bg-yellow-600 active:scale-95'
                : 'bg-gray-500/50 opacity-50'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-xs">2x👑</span>
            <span className="text-[10px]">x{gameUser.powerups_inventory?.divine_hint || 0}</span>
          </button>
          
          {/* Holy Shield */}
          <HolyShieldButton gameUser={gameUser} refetch={refetch} effectsOn={effectsOn} />
        </div>
      )}

      {/* Floating points popup */}
      <AnimatePresence>
        {showComboPopup && (lastPoints.bonus > 0 || lastPoints.isTime || lastPoints.isBomb) && (
          <motion.div
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -50, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: lastPoints.isBomb ? 0.8 : 0.5 }}
            className="absolute z-50 pointer-events-none text-center"
            style={{ left: lastPoints.x - 40, top: lastPoints.y - 30 }}
          >
            {lastPoints.isBomb ? (
              <div className="text-red-500 font-bold text-2xl animate-pulse">
                💣 BOOM!
                <div className="text-sm">-25% score!</div>
              </div>
            ) : lastPoints.isTime ? (
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
            
            <div className="grid grid-cols-7 gap-1 mb-3 text-sm">
              <div className="text-center">
                <div className="text-lg">❤️</div>
                <div className="text-gray-500 text-[10px]">+5</div>
              </div>
              <div className="text-center">
                <div className="text-lg">🎅</div>
                <div className="text-gray-500 text-[10px]">+5</div>
              </div>
              <div className="text-center">
                <div className="text-lg">🪔</div>
                <div className="text-gray-500 text-[10px]">+10</div>
              </div>
              <div className="text-center">
                <div className="text-lg">🕊️</div>
                <div className="text-gray-500 text-[10px]">+15</div>
              </div>
              <div className="text-center">
                <div className="text-lg">✝️</div>
                <div className="text-gray-500 text-[10px]">+20</div>
              </div>
              <div className="text-center">
                <div className="text-lg">👑</div>
                <div className="text-gray-500 text-[10px]">+10s</div>
              </div>
              <div className="text-center">
                <div className="text-lg">💣</div>
                <div className="text-red-500 text-[10px] font-bold">AVOID!</div>
              </div>
            </div>
            
            {/* Bomb warning */}
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 text-xs text-red-700">
              ⚠️ Avoid 💣 bombs! They cost a life + 25% score
            </div>
            
            <div className="text-xs text-amber-600 mb-3">
              ⚡ Higher combos = faster spawns & speed!
            </div>

            {/* Best Scores */}
            {bestScores.length > 0 && (
              <div className="bg-amber-50 rounded-lg p-3 mb-4">
                <h3 className="font-bold text-amber-800 mb-2">🏆 Your Top 3</h3>
                <div className="flex justify-center gap-4">
                  {bestScores.map((s, i) => (
                    <div key={i} className="text-center">
                      <div className="text-lg">{['🥇', '🥈', '🥉'][i]}</div>
                      <div className="font-bold text-amber-700">{s.score}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leaderboard Button */}
            <button
              onClick={() => setShowLeaderboard(true)}
              className="w-full py-3 mb-3 bg-gradient-to-r from-amber-400 to-orange-500 
                text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform
                flex items-center justify-center gap-2"
            >
              🏆 View Leaderboard
            </button>

            <div className="text-sm text-gray-500 mb-4 flex items-center justify-center gap-2">
              <span>❤️ {gameUser?.lives ?? 0} lives</span>
            </div>

            <button
              onClick={startGame}
              disabled={!gameUser || gameUser.lives <= 0}
              className={`w-full py-4 text-white text-xl font-bold rounded-2xl shadow-lg
                transition-transform ${
                  gameUser?.lives > 0 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 active:scale-95'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
            >
              {gameUser?.lives > 0 ? 'Start Game!' : 'No Lives Left'}
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

            {bestScores.length > 0 && score >= bestScores[0]?.score && (
              <div className="text-green-600 font-bold mb-4">
                🏆 New Best Score!
              </div>
            )}

            {/* Top 3 Best Scores */}
            {bestScores.length > 0 && (
              <div className="bg-amber-50 rounded-lg p-3 mb-4">
                <h3 className="font-bold text-amber-800 mb-2">🏆 Your Top 3</h3>
                <div className="flex justify-center gap-4">
                  {bestScores.map((s, i) => (
                    <div key={i} className="text-center">
                      <div className="text-lg">{['🥇', '🥈', '🥉'][i]}</div>
                      <div className={`font-bold ${s.score === score ? 'text-green-600' : 'text-amber-700'}`}>
                        {s.score}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shield/Life Status */}
            {shieldProtected && (
              <div className="bg-yellow-100 text-yellow-800 rounded-lg px-3 py-2 mb-4 flex items-center justify-center gap-2">
                <Shield className="w-5 h-5" />
                Holy Shield protected you!
              </div>
            )}

            {/* Lives Remaining */}
            <div className="flex items-center justify-center gap-2 mb-4 text-gray-600">
              <span>Lives remaining:</span>
              <span className="font-bold text-red-500">❤️ {gameUser?.lives ?? 0}</span>
            </div>

            <div className="space-y-3">
              <button
                onClick={playAgain}
                disabled={!gameUser || gameUser.lives <= 0}
                className={`w-full py-3 font-bold rounded-xl shadow-lg ${
                  gameUser?.lives > 0
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                }`}
              >
                {gameUser?.lives > 0 ? 'Play Again' : 'No Lives Left'}
              </button>
              <button
                onClick={() => setShowLeaderboard(true)}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 
                  text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform
                  flex items-center justify-center gap-2"
              >
                🏆 View Leaderboard
              </button>
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

      {/* Leaderboard Modal */}
      <PopGameLeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        topPlayers={leaderboardData.topPlayers}
        currentUserRank={leaderboardData.currentUserRank}
        currentUserId={session?.user?.id}
      />
    </div>
  );
};

export default PopGamePage;