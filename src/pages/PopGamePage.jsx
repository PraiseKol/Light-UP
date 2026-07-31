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
import freefallBg from '@/assets/freefall-bg.jpg';

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
        backgroundImage: `url(${freefallBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#a8b89a',
      }}
    >
      {/* Atmosphere overlay — subtle vignette for HUD readability, no more scattered emoji clutter */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/30 via-transparent to-black/40" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64
        bg-gradient-to-b from-yellow-100/30 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-2.5 sm:p-3 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent backdrop-blur-sm">
        <button
          onClick={() => navigate('/map')}
          className="orb-glass !w-10 !h-10 sm:!w-11 sm:!h-11 flex items-center justify-center text-white"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="text-center">
          <div className="text-white font-black text-sm sm:text-lg tracking-wide drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
            🎮 Free Fall
          </div>
          <div className="heart-meter justify-center mt-0.5">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={`heart-pip ${i < (gameUser?.lives ?? 0) ? '' : 'is-empty'}`}>❤️</span>
            ))}
          </div>
        </div>

        <div className="w-10 sm:w-11 flex items-center justify-end">
          {gameState === 'playing' && (
            <div className={`chip-3d !py-1 !px-2.5 text-sm sm:text-base font-black ${timeLeft <= 5 ? 'ring-2 ring-red-400 animate-pulse' : ''}`}>
              {timeLeft}s
            </div>
          )}
        </div>
      </div>

      {/* Score and Combo display during game */}
      {gameState === 'playing' && (
        <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
          <motion.div 
            key={score}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="chip-3d chip-3d-star !text-2xl sm:!text-3xl !py-2 !px-6 font-black"
          >
            {score}
          </motion.div>
          
          {/* Combo indicator */}
          {combo >= 2 && (
            <motion.div
              key={combo}
              initial={{ scale: 1.3, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              className={`px-4 py-1 rounded-full font-black text-white shadow-[0_3px_0_rgba(0,0,0,0.3)] border-2 border-white/40 ${
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
            <div className="chip-3d !py-1 !px-3 text-xs sm:text-sm font-black text-amber-700 animate-pulse">
              👑 2x Crown Chance Active!
            </div>
          )}
        </div>
      )}

      {/* Power-up bar during gameplay */}
      {gameState === 'playing' && gameUser && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-800/90 backdrop-blur-lg border-t border-white/10 p-2 sm:p-2.5 flex justify-around items-center gap-2 shadow-[0_-4px_10px_rgba(0,0,0,0.35)]">
          <button
            onClick={handleGracePeriod}
            disabled={!gameUser.powerups_inventory?.grace_period || gracePeriodUsed}
            className={`orb-power flex flex-col items-center px-3 py-1.5 text-white text-sm ${
              !gameUser.powerups_inventory?.grace_period || gracePeriodUsed ? 'is-empty' : ''
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px] sm:text-xs font-bold">+5s</span>
            <span className="text-[9px] sm:text-[10px]">x{gameUser.powerups_inventory?.grace_period || 0}</span>
          </button>
          
          <button
            onClick={handleDivineHint}
            disabled={!gameUser.powerups_inventory?.divine_hint || divineHintActive}
            className={`orb-power flex flex-col items-center px-3 py-1.5 text-white text-sm ${
              !gameUser.powerups_inventory?.divine_hint || divineHintActive ? 'is-empty' : ''
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[10px] sm:text-xs font-bold">2x👑</span>
            <span className="text-[9px] sm:text-[10px]">x{gameUser.powerups_inventory?.divine_hint || 0}</span>
          </button>
          
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
              <div className="text-red-500 font-bold text-2xl animate-pulse drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
                💣 BOOM!
                <div className="text-sm">-25% score!</div>
              </div>
            ) : lastPoints.isTime ? (
              <div className="text-yellow-300 font-bold text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
                ⏰ +10 SEC!
              </div>
            ) : (
              <>
                <div className="text-green-400 font-bold text-lg drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
                  +{lastPoints.points + lastPoints.bonus}
                </div>
                <div className="text-amber-300 text-xs font-semibold drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
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
        <div className="absolute inset-0 flex items-center justify-center z-30 p-3 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-3d max-w-sm w-full my-4"
          >
            <div className="modal-3d-header text-center">
              <h2 className="text-lg sm:text-xl font-black">🎮 Ready to Play?</h2>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-gray-600 text-sm text-center mb-4">
                Tap falling items to collect points! Chain taps for combo bonuses!
              </p>

              {/* Item legend */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mb-3">
                {[
                  { e: '❤️', v: '+5' }, { e: '🎅', v: '+5' }, { e: '🪔', v: '+10' },
                  { e: '🕊️', v: '+15' }, { e: '✝️', v: '+20' }, { e: '👑', v: '+10s' },
                  { e: '💣', v: 'AVOID', danger: true },
                ].map((it, i) => (
                  <div key={i} className="chip-3d flex-col !py-1.5 !px-1">
                    <div className="text-base sm:text-lg leading-none">{it.e}</div>
                    <div className={`text-[9px] font-bold mt-0.5 ${it.danger ? 'text-red-600' : 'text-gray-500'}`}>{it.v}</div>
                  </div>
                ))}
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-xl px-3 py-2 mb-3 text-xs text-red-700 font-semibold text-center">
                ⚠️ Avoid 💣 bombs! They cost a life + 25% score
              </div>

              <div className="text-xs text-amber-600 font-semibold mb-4 text-center">
                ⚡ Higher combos = faster spawns & speed!
              </div>

              {/* Best Scores */}
              {bestScores.length > 0 && (
                <div className="row-3d !items-stretch flex-col mb-4">
                  <h3 className="font-black text-amber-800 text-sm mb-2 text-center">🏆 Your Top 3</h3>
                  <div className="flex justify-center gap-4">
                    {bestScores.map((s, i) => (
                      <div key={i} className="text-center">
                        <div className="text-lg">{['🥇', '🥈', '🥉'][i]}</div>
                        <div className="font-black text-amber-700">{s.score}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowLeaderboard(true)}
                className="btn-orb w-full font-black py-2.5 mb-3 flex items-center justify-center gap-2"
              >
                🏆 View Leaderboard
              </button>

              <button
                onClick={startGame}
                disabled={!gameUser || gameUser.lives <= 0}
                className="btn-orb btn-orb-green w-full py-3.5 text-lg font-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {gameUser?.lives > 0 ? 'Start Game!' : 'No Lives Left'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Finished state */}
      {gameState === 'finished' && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40 p-3 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-3d max-w-sm w-full my-4"
          >
            <div className="modal-3d-header text-center">
              <h2 className="text-lg sm:text-xl font-black">🎉 Time's Up!</h2>
            </div>
            <div className="p-4 sm:p-5 text-center">
              <div className="chip-3d chip-3d-star inline-flex !text-4xl !py-3 !px-8 font-black mb-1">
                {score}
              </div>
              <p className="text-gray-500 text-sm mb-3">points earned</p>

              {bestScores.length > 0 && score >= bestScores[0]?.score && (
                <div className="text-green-600 font-black mb-3">
                  🏆 New Best Score!
                </div>
              )}

              {bestScores.length > 0 && (
                <div className="row-3d !items-stretch flex-col mb-4">
                  <h3 className="font-black text-amber-800 text-sm mb-2">🏆 Your Top 3</h3>
                  <div className="flex justify-center gap-4">
                    {bestScores.map((s, i) => (
                      <div key={i} className="text-center">
                        <div className="text-lg">{['🥇', '🥈', '🥉'][i]}</div>
                        <div className={`font-black ${s.score === score ? 'text-green-600' : 'text-amber-700'}`}>
                          {s.score}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {shieldProtected && (
                <div className="chip-3d !bg-gradient-to-b !from-yellow-200 !to-amber-400 !text-amber-900 inline-flex items-center gap-2 mb-4 !py-2 !px-4">
                  <Shield className="w-4 h-4" />
                  Holy Shield protected you!
                </div>
              )}

              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-sm text-gray-500">Lives remaining:</span>
                <div className="heart-meter">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`heart-pip ${i < (gameUser?.lives ?? 0) ? '' : 'is-empty'}`}>❤️</span>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={playAgain}
                  disabled={!gameUser || gameUser.lives <= 0}
                  className="btn-orb btn-orb-green w-full py-3 font-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {gameUser?.lives > 0 ? 'Play Again' : 'No Lives Left'}
                </button>
                <button
                  onClick={() => setShowLeaderboard(true)}
                  className="btn-orb w-full py-2.5 font-black flex items-center justify-center gap-2"
                >
                  🏆 View Leaderboard
                </button>
                <button
                  onClick={() => navigate('/map')}
                  className="btn-orb btn-orb-purple w-full py-2.5 font-black"
                >
                  Back to Map
                </button>
              </div>
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
