import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { levelPhases } from "@/data/levelData";
import { useAuth } from "@/auth/AuthProvider";
import { fetchProgress } from "@/lib/fetchProgress";
import { saveProgress } from "@/lib/saveProgress";
import { fetchTotalScore } from "@/lib/fetchTotalScore";
import { fetchRandomScripture } from "@/lib/fetchRandomScripture";
import { fetchLeaderboard } from "@/lib/fetchLeaderboard";
import { fetchMainLeaderboard, fetchMonthlyLeaderboard } from "@/lib/api/leaderboard";
import { supabase } from "@/lib/supabaseClient";
import { useGameUser } from "@/hooks/useGameUser";
import { LivesDisplay } from "@/components/LivesDisplay";
import MapBackground from "@/components/MapBackground";
import GameScreen from "@/components/GameScreen";
import { Lock, Star } from "lucide-react";
import AppToaster from "@/components/ui/toaster";
import ScriptureModal from "@/components/ScriptureModal";
import SettingsModal from "@/components/SettingsModal";
import FeedbackButton from "@/components/FeedbackButton";
import { toast } from "sonner";
import { markInGame, clearInGame } from "@/utils/inGame";
import { loseLife } from "@/utils/loseLife";
import { playSound } from "@/utils/sound";
import DonationsButton from "@/components/DonationsButton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PowerUpStore from "@/components/PowerUpStore";
import Modal from "@/components/ui/modal";
import { Tooltip } from "@/components/ui/tooltip";
import GlobalChat from "@/components/GlobalChat";
import LeaderboardModal from "@/components/LeaderboardModal";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import ExplainerVideoModal from "@/components/ExplainerVideoModal";
import {
  determineUnlockedPhases,
  wrapLevelsWithStatus,
  getPowerUpIcon,
  getPowerUpTooltip,
} from "@/utils/gameHelpers";
import {
  getWeeklyChallengeStatus,
  hasPlayedThisWeek,
} from "@/utils/weeklyChallenge";
import avatar from "@/assets/avatar.png";

// Avatar configuration matching SettingsModal
const AVATARS = [
  { id: 'avatar1', name: 'Dove', emoji: '🕊️', unlockPhase: 0 },
  { id: 'avatar2', name: 'Lamb', emoji: '🐑', unlockPhase: 0 },
  { id: 'avatar3', name: 'Lion', emoji: '🦁', unlockPhase: 5 },
  { id: 'avatar4', name: 'Eagle', emoji: '🦅', unlockPhase: 10 },
  { id: 'avatar5', name: 'Crown', emoji: '👑', unlockPhase: 20 },
];

export default function MapAndGame({ sound, setSound, effectsOn }) {
  const [selectedLevel, setSelectedLevel] = useState(null);
  const safelyNavigatingRef = useRef(false);
  const [unlockedPhases, setUnlockedPhases] = useState([]);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  const [pendingNextLevel, setPendingNextLevel] = useState(null);
  const [showScriptureModal, setShowScriptureModal] = useState(false);
  const [scriptureText, setScriptureText] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [challengeAllowed, setChallengeAllowed] = useState(false);
  const [challengePlayed, setChallengePlayed] = useState(false);
  const [countdownText, setCountdownText] = useState("");
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState([]);
  const [totalLeaderboard, setTotalLeaderboard] = useState([]);
  const [monthlyLeaderboard, setMonthlyLeaderboard] = useState([]);
  const [showStore, setShowStore] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [showExplainerVideo, setShowExplainerVideo] = useState(false);
  const [shakingLevel, setShakingLevel] = useState(null);

  const { user } = useAuth();
  
  // Helper: Get highest completed phase for avatar unlocking
  const getHighestCompletedPhase = () => {
    let maxPhase = 0;
    completedLevels.forEach(levelId => {
      const match = levelId.match(/P(\d+)-L\d+/);
      if (match) {
        const phaseNum = parseInt(match[1]);
        if (phaseNum > maxPhase) maxPhase = phaseNum;
      }
    });
    return maxPhase;
  };

  const highestCompletedPhase = getHighestCompletedPhase();

  // Helper: Convert score to stars (0, 50, 75, 100 → 0, 1, 2, 3 stars)
  const getStarsFromScore = (score) => {
    if (score >= 100) return 3;
    if (score >= 75) return 2;
    if (score >= 50) return 1;
    return 0;
  };

  // Helper: Shake animation for locked levels
  const handleLockedClick = (levelId) => {
    setShakingLevel(levelId);
    setTimeout(() => setShakingLevel(null), 500);
  };

  // Get current avatar emoji
  const getCurrentAvatar = () => {
    const avatarId = gameUser?.selected_avatar || 'avatar1';
    return AVATARS.find(a => a.id === avatarId)?.emoji || '🕊️';
  };
  const { gameUser, loading: gameUserLoading, refetch } = useGameUser(user?.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // progress query
  const { data: completedLevels = [], isLoading: progressLoading } = useQuery({
    queryKey: ["progress", user?.id],
    queryFn: () => fetchProgress(user?.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  });

  // score query
  const { data: userScore = 0, isLoading: scoreLoading } = useQuery({
    queryKey: ["totalScore", user?.id],
    queryFn: () => fetchTotalScore(user?.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  });

  // level scores query for stars display
  const { data: levelScores = {} } = useQuery({
    queryKey: ["levelScores", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('progress')
        .select('level_id, score')
        .eq('user_id', user.id);
      return Object.fromEntries((data || []).map(r => [r.level_id, r.score]));
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  });

  // mutation for saving progress
  const saveProgressMutation = useMutation({
    mutationFn: saveProgress,
    onSuccess: () => {
      queryClient.invalidateQueries(["progress", user?.id]);
      queryClient.invalidateQueries(["totalScore", user?.id]);
      queryClient.invalidateQueries(["levelScores", user?.id]);
    },
  });

  const phaseRefs = useRef([]);
  const levelRefs = useRef({});
  const [showNextLevelModal, setShowNextLevelModal] = useState(false);

  useEffect(() => {
    let leaderboardTimeout;
    const loadLeaderboards = async () => {
      const weekly = await fetchLeaderboard();
      const total = await fetchMainLeaderboard();
      const monthly = await fetchMonthlyLeaderboard();
      setWeeklyLeaderboard(weekly);
      setTotalLeaderboard(total);
      setMonthlyLeaderboard(monthly);
    };

    const loadLeaderboardsDebounced = () => {
      clearTimeout(leaderboardTimeout);
      leaderboardTimeout = setTimeout(loadLeaderboards, 200);
    };

    loadLeaderboards();

    const weeklyChannel = supabase
      .channel("weekly_leaderboard_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "weekly_challenges" },
        () => {
          console.log("📊 Weekly challenge update detected");
          loadLeaderboardsDebounced();
        }
      )
      .subscribe();

    const totalChannel = supabase
      .channel("total_score_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "progress" },
        () => loadLeaderboardsDebounced()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(weeklyChannel);
      supabase.removeChannel(totalChannel);
      clearTimeout(leaderboardTimeout);
    };
  }, []);

  // Auto-show explainer video for first-time users
  useEffect(() => {
    if (gameUser && gameUser.player_name && !gameUser.has_seen_explainer_video) {
      setShowExplainerVideo(true);
    }
  }, [gameUser]);

  const startLevel = async (level) => {
    if (!user || !level) return;
    safelyNavigatingRef.current = true;
    try {
      await markInGame(user.id);
      await refetch?.();
      setSelectedLevel(level);
      setShowNextLevelModal(false);
    } catch (err) {
      console.error("Failed starting level:", err);
    } finally {
      setTimeout(() => {
        safelyNavigatingRef.current = false;
      }, 500);
    }
  };

  useEffect(() => {
    const penalizeIfStaleInGame = async () => {
      if (!user?.id || !gameUser) return;
      if (safelyNavigatingRef.current) return;
      if (gameUser.in_game && !selectedLevel) {
        const startedAt = gameUser.in_game_started_at
          ? new Date(gameUser.in_game_started_at).getTime()
          : 0;
        const justStarted = Date.now() - startedAt < 2000;
        if (justStarted) return;

        toast.error("You left a level in progress — 1 life deducted.");
        try {
          await loseLife(user.id, gameUser.lives);
          await clearInGame(user.id);
          await refetch?.();
        } catch (err) {
          console.error("Error handling stale in_game:", err);
        }
      }
    };

    penalizeIfStaleInGame();
  }, [gameUser, selectedLevel, user?.id, refetch]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (completedLevels.length > 0) {
      const unlocked = determineUnlockedPhases(completedLevels, levelPhases);
      setUnlockedPhases(unlocked);
      const highestIndex = Math.max(...unlocked);
      setTimeout(() => {
        phaseRefs.current[highestIndex]?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }, 500);
    }
  }, [completedLevels]);

  useEffect(() => {
    if (showNextLevelModal) {
      const timer = setTimeout(() => {
        setShowNextLevelModal(false);
        setSelectedLevel(pendingNextLevel);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showNextLevelModal, pendingNextLevel]);

  useEffect(() => {
    if (gameUser && !gameUser.player_name) {
      setShowSettings(true);
    }
  }, [gameUser]);

  // 🛡️ Safety: auto-close stuck scripture modal after 10 seconds
  useEffect(() => {
    if (showScriptureModal) {
      const timer = setTimeout(() => setShowScriptureModal(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showScriptureModal]);

  const handleBackFromGame = () => {
    // ✅ Mark as safe navigation so we don't penalize intentional exits
    safelyNavigatingRef.current = true;

    setSelectedLevel(null);
    const currentLevelId = gameUser.current_level_id;
    const currentLevelEl = levelRefs.current[currentLevelId];
    if (currentLevelEl) {
      setTimeout(() => {
        currentLevelEl.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }, 100);
    }

    // 🔄 Clear the flag shortly after navigation completes
    setTimeout(() => {
      safelyNavigatingRef.current = false;
    }, 1000);
  };

  useEffect(() => {
    const updateChallengeStatus = async () => {
      try {
        // getWeeklyChallengeStatus is now synchronous
        const { allowed, countdownText } = getWeeklyChallengeStatus();
        setChallengeAllowed(Boolean(allowed));
        setCountdownText(countdownText ?? "");
        
        // hasPlayedThisWeek is still async
        if (user?.id) {
          const played = await hasPlayedThisWeek(user.id);
          setChallengePlayed(Boolean(played));
        }
      } catch (err) {
        console.error("Failed to update weekly challenge status:", err);
        setChallengeAllowed(false);
        setCountdownText("");
        if (user?.id) setChallengePlayed(false);
      }
    };

    updateChallengeStatus();
    const interval = setInterval(updateChallengeStatus, 60000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const getCurrentLevelId = (phase) => {
    const firstIncomplete = phase.levels.find(
      (l) => !completedLevels.includes(l.id)
    );
    return firstIncomplete ? firstIncomplete.id : null;
  };

  const handleWeeklyChallengeClick = () => {
    if (challengeAllowed && !challengePlayed) {
      if (window.confirm("You only get one attempt this week. Proceed?")) {
        navigate("/weekly-challenge");
      }
    }
  };

  const handleLevelComplete = async () => {
    if (!user || !selectedLevel?.id) return;

    safelyNavigatingRef.current = true;
    try {
      await clearInGame(user.id);
      await refetch?.();
    } catch (err) {
      console.error("Failed clearing in_game after complete:", err);
    }

    await saveProgressMutation.mutateAsync({
      level_id: selectedLevel.id,
      phase: selectedLevel.phaseNumber,
      mode: selectedLevel.mode,
      score: 0,
    });

    const updatedCompleted = [...completedLevels, selectedLevel.id];
    setSelectedLevel(null);

    const currentPhase = levelPhases.find(
      (p) => p.phaseNumber === selectedLevel.phaseNumber
    );
    const currentIdx = currentPhase.levels.findIndex(
      (l) => l.id === selectedLevel.id
    );
    const nextLevel = currentPhase.levels[currentIdx + 1];
    if (nextLevel) {
      setShowUnlockAnimation(true);
      setPendingNextLevel({
        ...nextLevel,
        number: currentIdx + 2,
        completed: updatedCompleted.includes(nextLevel.id),
        phaseNumber: currentPhase.phaseNumber,
      });
      setShowNextLevelModal(true);
    } else {
      setScriptureText(
        (await fetchRandomScripture()) ||
          `"The Lord will fight for you; you need only to be still." — Exodus 14:14`
      );
      setShowScriptureModal(true);
    }

    setTimeout(() => {
      safelyNavigatingRef.current = false;
    }, 500);
  };

  const handleScore = async (score) => {
    if (!user || !selectedLevel?.id) return;

    await saveProgressMutation.mutateAsync({
      level_id: selectedLevel.id,
      phase: selectedLevel.phaseNumber,
      mode: selectedLevel.mode,
      score,
    });
  };

  const handleNextPhaseScroll = () => {
    // Always close modal first
    setShowScriptureModal(false);

    // Use the highest unlocked phase instead of selectedLevel
    const currentPhaseNum =
      selectedLevel?.phaseNumber ?? Math.max(...unlockedPhases, 0);
    const nextIndex = levelPhases.findIndex(
      (p) => p.phaseNumber === currentPhaseNum + 1
    );

    if (nextIndex !== -1 && phaseRefs.current[nextIndex]) {
      setTimeout(() => {
        phaseRefs.current[nextIndex].scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);
    }
  };

  const handleSavePlayerName = async () => {
    await refetch?.();
    setShowSettings(false);
    toast.success("Settings saved!");
  };

  if (!user || gameUserLoading || progressLoading || scoreLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen candy-gradient">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(79,156,249,0.5)] p-12 max-w-md text-center border-4 border-white/50 animate-popIn">
          <div className="text-6xl font-black mb-6 bg-gradient-to-r from-candyBlue via-candyPurple to-candyPink bg-clip-text text-transparent drop-shadow-2xl animate-float">
            Light UP
          </div>
          <div className="flex items-center justify-center space-x-4 mb-8">
            <div className="w-6 h-6 golden-gradient rounded-full animate-bounce [animation-delay:-0.3s] shadow-lg" />
            <div className="w-6 h-6 bg-candyPink rounded-full animate-bounce [animation-delay:-0.15s] shadow-lg" />
            <div className="w-6 h-6 bg-candyBlue rounded-full animate-bounce shadow-lg" />
          </div>
          <div className="text-5xl font-black mb-8 bg-gradient-to-r from-candyOrange via-candyYellow to-candyGreen bg-clip-text text-transparent drop-shadow-md animate-float [animation-delay:0.5s]">
            your Word!
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full candy-gradient rounded-full animate-pulse shadow-lg"
              style={{ width: "70%" }}
            ></div>
          </div>
          <p className="mt-8 text-base text-gray-600 tracking-wide font-bold animate-pulse">
            ✨ Preparing your spiritual journey...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen flex flex-col overflow-hidden">
      <PWAInstallPrompt />
      <MapBackground />

      {/* Fixed Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 candy-gradient py-2 lg:py-3 px-3 lg:px-4 shadow-[0_4px_20px_rgba(79,156,249,0.5)] border-b-4 border-white/30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Player Name & Avatar */}
          <div className="flex items-center gap-2 lg:gap-3">
            <img
              src={avatar}
              className="w-8 h-8 lg:w-10 lg:h-10 rounded-full border-2 lg:border-3 border-white shadow-lg"
              alt="Avatar"
            />
            <span className="text-white font-black text-sm lg:text-lg drop-shadow-lg">
              {gameUser.player_name || "Unnamed"}
            </span>
          </div>

          {/* Center: Stats */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Score */}
            <Tooltip content="Your total score from completed levels">
              <div className="bg-white/20 backdrop-blur px-2 lg:px-4 py-1.5 lg:py-2 rounded-full border-2 border-white/30 font-black text-white text-xs lg:text-sm cursor-help">
                ⭐ {userScore}
              </div>
            </Tooltip>

            {/* Lives */}
            <Tooltip content="Lives regenerate every 30 minutes. Max 5 lives.">
              <div>
                <LivesDisplay
                  lives={gameUser.lives}
                  lastLostAt={gameUser.last_life_lost_at}
                />
              </div>
            </Tooltip>

            {/* Talents */}
            <Tooltip content="Talents are premium currency. Use them to buy power-ups or a full life!">
              <div className="bg-white/20 backdrop-blur px-2 lg:px-4 py-1.5 lg:py-2 rounded-full border-2 border-white/30 font-black text-white text-xs lg:text-sm cursor-help">
                💎 {gameUser.talents ?? 0}
              </div>
            </Tooltip>
          </div>

          {/* Right: Powerups + Video Tutorial Icon */}
          <div className="hidden lg:flex gap-2 items-center">
            {Object.entries(gameUser.powerups_inventory || {}).map(
              ([key, count]) => (
                <Tooltip key={key} content={getPowerUpTooltip(key)}>
                  <div className="bg-white/20 px-3 py-2 rounded-full border-2 border-white/30 font-bold text-white text-sm cursor-help">
                    {getPowerUpIcon(key)} {count}
                  </div>
                </Tooltip>
              )
            )}
            
            {/* Video Tutorial Replay Button */}
            <Tooltip content="Watch tutorial video">
              <button
                onClick={() => {
                  playSound("optionSelect", effectsOn);
                  setShowExplainerVideo(true);
                }}
                className="bg-purple-500/80 hover:bg-purple-600 px-3 py-2 rounded-full border-2 border-white/30 font-bold text-white text-lg hover:scale-110 transition-all shadow-lg"
              >
                🎬
              </button>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* Mini-Map Progress Indicator */}
      {!selectedLevel && (
        <div className="fixed top-24 right-2 sm:right-4 z-40 bg-white/90 backdrop-blur rounded-xl shadow-xl p-2 sm:p-3 w-16 sm:w-20 border-2 border-blue-200">
          <div className="text-center text-[9px] sm:text-xs font-bold text-gray-700 mb-1">Progress</div>
          <div className="relative h-24 sm:h-32 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="absolute bottom-0 w-full bg-gradient-to-t from-yellow-400 to-yellow-300 transition-all duration-500"
              style={{ height: `${Math.min(100, (completedLevels.length / (levelPhases.length * 10)) * 100)}%` }}
            />
            {/* Current phase marker */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 w-2 sm:w-3 h-2 sm:h-3 bg-blue-500 rounded-full border-2 border-white shadow-lg"
              style={{ 
                bottom: `${Math.min(100, ((highestCompletedPhase) / levelPhases.length) * 100)}%`,
                transition: 'bottom 0.5s ease'
              }}
            />
          </div>
          <div className="text-center text-[9px] sm:text-[10px] font-bold text-gray-600 mt-1">
            Phase {Math.max(1, highestCompletedPhase)}
          </div>
          <div className="text-center text-[8px] sm:text-[9px] text-gray-500">
            {Math.round((completedLevels.length / (levelPhases.length * 10)) * 100)}%
          </div>
        </div>
      )}

      {/* Scrollable Center (ONLY level maps scroll) */}
      <main className="pt-20 pb-28 flex-1 overflow-y-auto">
        {!selectedLevel ? (
          <div className="max-w-4xl mx-auto px-4 py-8">
            {[...levelPhases].reverse().map((phase, reversedIndex) => {
              const originalIndex = levelPhases.length - 1 - reversedIndex;
              const isUnlocked = unlockedPhases.includes(originalIndex);

              const wrappedLevels = wrapLevelsWithStatus(
                originalIndex,
                phase,
                completedLevels,
                levelPhases
              );

              const currentPhaseId = getCurrentLevelId(phase);
              const levelsPerPhase = phase.levels.length;
              const containerHeight = (levelsPerPhase * 130) + 300;

              return (
                <div
                  key={originalIndex}
                  ref={(el) => (phaseRefs.current[originalIndex] = el)}
                  className="relative mb-20"
                >
                  {/* Phase Title Banner */}
                  <div className="sticky top-20 z-10 mb-8">
                    <div className="bg-gradient-to-r from-[#FFD93D] via-[#FFC107] to-[#FFD93D] py-3 px-6 rounded-full shadow-[0_4px_20px_rgba(255,193,7,0.6)] border-4 border-white/50 text-center">
                      <h2 className="text-white font-black text-xl lg:text-2xl drop-shadow-lg">
                        📜 {phase.title}
                      </h2>
                    </div>
                  </div>

                  {/* Map Container */}
                  <div className="relative w-full" style={{ minHeight: `${containerHeight}px` }}>
                    {/* Golden Path SVG */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                      <defs>
                        <linearGradient id={`goldenPath-${originalIndex}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#FFD93D" />
                          <stop offset="50%" stopColor="#FFC107" />
                          <stop offset="100%" stopColor="#FFD93D" />
                        </linearGradient>
                      </defs>
                      {wrappedLevels.map((level, idx) => {
                        if (idx === 0) return null;
                        const prevLevel = wrappedLevels[idx - 1];
                        const x1 = `${prevLevel.position.x}%`;
                        const y1 = prevLevel.position.y;
                        const x2 = `${level.position.x}%`;
                        const y2 = level.position.y;
                        const midY = (y1 + y2) / 2;
                        
                        return (
                          <path
                            key={`path-${level.id}`}
                            d={`M ${x1} ${y1} Q ${x1} ${midY}, ${x2} ${y2}`}
                            fill="none"
                            stroke={`url(#goldenPath-${originalIndex})`}
                            strokeWidth="16"
                            strokeLinecap="round"
                            opacity="0.9"
                          />
                        );
                      })}
                    </svg>

                    {/* Level Nodes */}
                    {wrappedLevels.map((level, idx) => {
                      const isCompleted = completedLevels.includes(level.id);
                      const isCurrentLevel = currentPhaseId === level.id;
                      const isPreviousCompleted = idx === 0 || completedLevels.includes(wrappedLevels[idx - 1].id);
                      const isLevelUnlocked = isUnlocked && isPreviousCompleted;
                      const score = levelScores[level.id] || 0;
                      const stars = getStarsFromScore(score);

                      return (
                        <div
                          key={level.id}
                          ref={(el) => (levelRefs.current[level.id] = el)}
                          className="absolute"
                          style={{
                            left: `${level.position.x}%`,
                            top: `${level.position.y}px`,
                            transform: 'translate(-50%, -50%)',
                            zIndex: 10,
                          }}
                        >
                          {/* Avatar on Current Level */}
                          {isCurrentLevel && (
                            <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                              <div className="text-4xl animate-bounce drop-shadow-lg">
                                {getCurrentAvatar()}
                              </div>
                              <span className="bg-yellow-400 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-lg">
                                YOU
                              </span>
                            </div>
                          )}

                          {/* Level Node Button - Responsive with Light Bulb */}
                          <button
                            onClick={() => {
                              if (gameUser.lives === 0) {
                                toast.error("You're out of lives! Please wait to get more.");
                                return;
                              }
                              if (isLevelUnlocked) {
                                playSound("optionSelect", effectsOn);
                                startLevel(level);
                              } else {
                                playSound("error", effectsOn);
                                handleLockedClick(level.id);
                              }
                            }}
                            disabled={!isLevelUnlocked}
                            className={`
                              relative rounded-full 
                              w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20
                              border-2 sm:border-3 lg:border-4 
                              shadow-2xl transition-all duration-200
                              ${isLevelUnlocked 
                                ? 'bg-[#2563eb] border-[#fbbf24] hover:scale-110 cursor-pointer' 
                                : 'bg-gray-600 border-gray-700 cursor-not-allowed opacity-80'
                              }
                              ${isCurrentLevel ? 'ring-2 sm:ring-3 lg:ring-4 ring-yellow-300 animate-pulse shadow-[0_0_40px_rgba(251,191,36,0.9)]' : ''}
                              ${shakingLevel === level.id ? 'animate-wiggle' : ''}
                            `}
                            style={{
                              boxShadow: isCurrentLevel 
                                ? '0 0 40px rgba(251, 191, 36, 0.9), 0 10px 30px rgba(0, 0, 0, 0.5)' 
                                : '0 10px 30px rgba(0, 0, 0, 0.4)',
                            }}
                          >
                            {isLevelUnlocked ? (
                              <div className="relative flex items-center justify-center">
                                {/* Light Bulb Icon */}
                                <svg 
                                  className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-yellow-300" 
                                  viewBox="0 0 24 24" 
                                  fill="currentColor"
                                >
                                  <path d="M12 2C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2 14h-4v-1h4v1zm0-2h-4v-1h4v1zm.85-3.5c-.26.21-.35.28-.85.5v1.5h-4v-1.5c-.5-.22-.59-.29-.85-.5C8.47 10.72 8 9.89 8 9c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .89-.47 1.72-1.15 2.5z"/>
                                </svg>
                                {/* Level Number inside bulb */}
                                <span className="absolute text-[10px] sm:text-xs lg:text-sm font-black text-amber-900 drop-shadow-sm">
                                  {level.number}
                                </span>
                              </div>
                            ) : (
                              <Lock className="text-gray-400 w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 mx-auto" />
                            )}
                          </button>

                          {/* Stars Display for Completed Levels */}
                          {isCompleted && (
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1">
                              {[...Array(3)].map((_, starIdx) => (
                                <Star
                                  key={starIdx}
                                  className={`w-5 h-5 ${
                                    starIdx < stars 
                                      ? 'text-yellow-400 fill-yellow-400' 
                                      : 'text-gray-500 fill-gray-500'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <GameScreen
            level={selectedLevel}
            onBack={handleBackFromGame}
            onComplete={handleLevelComplete}
            onScore={handleScore}
            onLoseLife={() => {
              return loseLife(gameUser.user_id, gameUser.lives).then(refetch);
            }}
            userScore={userScore}
            refetchGameUser={refetch}
            sound={sound}
            setSound={setSound}
            effectsOn={effectsOn}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation - Desktop */}
      <footer className="hidden lg:block fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-white/95 to-blue-50/95 backdrop-blur-xl border-t-4 border-white/50 shadow-[0_-4px_20px_rgba(79,156,249,0.3)]">
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* Row 1: Primary Actions */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <Tooltip content="Customize your player name and game settings">
              <button
                onClick={() => {
                  playSound("optionSelect", effectsOn);
                  setShowSettings(true);
                }}
                className="btn-3d bg-white text-candyBlue font-bold px-6 py-3 rounded-2xl shadow-lg hover:scale-105 transition-all"
              >
                ⚙️ Settings
              </button>
            </Tooltip>

            <Tooltip content="Buy power-ups with talents. buy talents, check out bonuses earned ">
              <button
                onClick={() => {
                  playSound("optionSelect", effectsOn);
                  setShowStore(true);
                }}
                className="btn-3d golden-gradient text-white font-bold px-6 py-3 rounded-2xl shadow-lg hover:scale-105 transition-all"
              >
                🎁 Store
              </button>
            </Tooltip>

            <Tooltip content="Create or join multiplayer games with friends">
              <button
                onClick={() => {
                  playSound("optionSelect", effectsOn);
                  navigate("/multiplayer/create");
                }}
                className="btn-3d bg-gradient-to-r from-candyGreen to-green-500 text-white font-bold px-6 py-3 rounded-2xl shadow-lg hover:scale-105 transition-all"
              >
                🎮 Multiplayer
              </button>
            </Tooltip>

            <Tooltip content={challengeAllowed ? "Play the weekly challenge to earn bonus rewards!" : `Weekly challenge opens ${countdownText}`}>
              <button
                onClick={() => {
                  playSound("optionSelect", effectsOn);
                  handleWeeklyChallengeClick();
                }}
                disabled={!challengeAllowed}
                className="btn-3d candy-gradient text-white font-bold px-6 py-3 rounded-2xl shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                🥊{" "}
                {challengeAllowed && !challengePlayed
                  ? "Weekly Quiz"
                  : challengePlayed
                  ? "Played"
                  : `Opens ${countdownText}`}
              </button>
            </Tooltip>
          </div>

          {/* Row 2: Secondary Actions */}
          <div className="flex items-center justify-center gap-3">
            <Tooltip content="View top players and weekend top players">
              <button
                onClick={() => {
                  playSound("optionSelect", effectsOn);
                  setShowLeaderboardModal(true);
                }}
                className="btn-3d bg-gradient-to-r from-gray-700 to-gray-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-md hover:scale-105 transition-all"
              >
                🏆 Leaderboards
              </button>
            </Tooltip>

            <Tooltip content="Chat with other players globally">
              <button
                onClick={() => {
                  playSound("optionSelect", effectsOn);
                  setShowChatModal(true);
                }}
                className="btn-3d bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-md hover:scale-105 transition-all"
              >
                💬 Chat
              </button>
            </Tooltip>

            <Tooltip content="Send feedback or report bugs">
              <div>
                <FeedbackButton
                  effectsOn={effectsOn}
                  sound={sound}
                  setSound={setSound}
                />
              </div>
            </Tooltip>

            <Tooltip content="Support the team with a donation">
              <div>
                <DonationsButton
                  userId={user?.id}
                  effectsOn={effectsOn}
                  playSound={playSound}
                  sound={sound}
                />
              </div>
            </Tooltip>
          </div>
        </div>
      </footer>

      {/* Fixed Bottom Navigation - Mobile */}
      <footer className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-white/95 to-blue-50/95 backdrop-blur-xl border-t-4 border-white/50 shadow-[0_-4px_20px_rgba(79,156,249,0.3)]">
        <div className="flex items-center justify-around px-2 py-3">
          {/* Settings */}
          <Tooltip content="Customize settings">
            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                setShowSettings(true);
              }}
              className="flex flex-col items-center gap-1 px-2 py-2 hover:bg-white/50 rounded-xl transition-all"
            >
              <span className="text-2xl">⚙️</span>
              <span className="text-[10px] font-bold text-gray-700">
                Settings
              </span>
            </button>
          </Tooltip>

          {/* Store */}
          <Tooltip content="Buy power-ups and talents, check out bonuses">
            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                setShowStore(true);
              }}
              className="flex flex-col items-center gap-1 px-2 py-2 hover:bg-white/50 rounded-xl transition-all"
            >
              <span className="text-2xl">🎁</span>
              <span className="text-[10px] font-bold text-gray-700">Store</span>
            </button>
          </Tooltip>

          {/* Multiplayer */}
          <Tooltip content="Play with friends">
            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                navigate("/multiplayer/create");
              }}
              className="flex flex-col items-center gap-1 px-2 py-2 hover:bg-white/50 rounded-xl transition-all"
            >
              <span className="text-2xl">🎮</span>
              <span className="text-[10px] font-bold text-gray-700">Multi</span>
            </button>
          </Tooltip>

          {/* Weekly Quiz */}
          <Tooltip content={challengeAllowed ? "Play weekly quiz" : `Opens ${countdownText}`}>
            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                handleWeeklyChallengeClick();
              }}
              disabled={!challengeAllowed}
              className="flex flex-col items-center gap-1 px-2 py-2 hover:bg-white/50 rounded-xl transition-all disabled:opacity-50"
            >
              <span className="text-2xl">🥊</span>
              <span className="text-[10px] font-bold text-gray-700">Quiz</span>
            </button>
          </Tooltip>

          {/* More */}
          <Tooltip content="More options">
            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                setShowMoreModal(true);
              }}
              className="flex flex-col items-center gap-1 px-2 py-2 hover:bg-white/50 rounded-xl transition-all"
            >
              <span className="text-2xl">⋯</span>
              <span className="text-[10px] font-bold text-gray-700">More</span>
            </button>
          </Tooltip>
        </div>
      </footer>

      {/* Modals */}
      <ScriptureModal
        isOpen={showScriptureModal}
        onClose={() => setShowScriptureModal(false)}
        scripture={scriptureText}
        onNext={handleNextPhaseScroll}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        gameUser={gameUser}
        onSave={handleSavePlayerName}
        sound={sound}
        setSound={setSound}
        highestCompletedPhase={highestCompletedPhase}
      />

      <Modal
        isOpen={showStore}
        onClose={() => setShowStore(false)}
        title="🎁 Power-Up Store"
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <PowerUpStore
          gameUser={gameUser}
          user={user}
          onPurchase={refetch}
          effectsOn={effectsOn}
        />
      </Modal>

      <LeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        totalLeaderboard={totalLeaderboard}
        weeklyLeaderboard={weeklyLeaderboard}
        monthlyLeaderboard={monthlyLeaderboard}
        currentUserId={user?.id}
      />

      <Modal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        title="💬 Global Chat"
        className="max-w-2xl max-h-[80vh]"
      >
        <div className="h-[600px]">
          <GlobalChat user={user} />
        </div>
      </Modal>

      {/* Mobile "More" Options Modal */}
      <Modal
        isOpen={showMoreModal}
        onClose={() => setShowMoreModal(false)}
        title="More Options"
        className="max-w-md"
      >
        <div className="space-y-3">
          <button
            onClick={() => {
              playSound("optionSelect", effectsOn);
              setShowMoreModal(false);
              setShowExplainerVideo(true);
            }}
            className="w-full btn-3d bg-gradient-to-r from-purple-500 to-purple-700 text-white font-bold px-6 py-4 rounded-xl shadow-lg hover:scale-105 transition-all"
          >
            🎬 Watch Tutorial
          </button>

          <button
            onClick={() => {
              playSound("optionSelect", effectsOn);
              setShowMoreModal(false);
              setShowLeaderboardModal(true);
            }}
            className="w-full btn-3d bg-gradient-to-r from-gray-700 to-gray-800 text-white font-bold px-6 py-4 rounded-xl shadow-lg hover:scale-105 transition-all"
          >
            🏆 Leaderboards
          </button>

          <button
            onClick={() => {
              playSound("optionSelect", effectsOn);
              setShowMoreModal(false);
              setShowChatModal(true);
            }}
            className="w-full btn-3d bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-6 py-4 rounded-xl shadow-lg hover:scale-105 transition-all"
          >
            💬 Chat
          </button>

          <div className="flex gap-3">
            <FeedbackButton
              effectsOn={effectsOn}
              sound={sound}
              setSound={setSound}
              fullWidth
            />
            <DonationsButton
              userId={user?.id}
              effectsOn={effectsOn}
              playSound={playSound}
              sound={sound}
              fullWidth
            />
          </div>
        </div>
      </Modal>

      {showNextLevelModal && pendingNextLevel && (
        <Modal isOpen={true} onClose={() => {}} title="🎉 Level Complete!">
          <div className="text-center py-6">
            <div className="text-6xl mb-4 animate-bounce">🎊</div>
            <p className="text-2xl font-black text-candyBlue mb-2">
              Next Level Unlocked!
            </p>
            <p className="text-lg text-gray-600 mb-4">
              Level {pendingNextLevel.number}
            </p>
            <p className="text-sm text-gray-500">Starting automatically...</p>
          </div>
        </Modal>
      )}

      {/* Explainer Video Modal */}
      <ExplainerVideoModal
        isOpen={showExplainerVideo}
        onClose={() => setShowExplainerVideo(false)}
        userId={user?.id}
      />

      <AppToaster />
    </div>
  );
}
