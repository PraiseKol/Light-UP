import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";
import { levelPhases } from "@/data/levelData";
import { useAuth } from "@/auth/AuthProvider";
import { fetchProgress } from "@/lib/fetchProgress";
import { saveProgress } from "@/lib/saveProgress";
import { fetchTotalScore } from "@/lib/fetchTotalScore";
import { fetchRandomScripture } from "@/lib/fetchRandomScripture";
import { fetchLeaderboard } from "@/lib/fetchLeaderboard";
import { fetchMainLeaderboard, fetchMonthlyLeaderboard } from "@/lib/api/leaderboard";
import { supabase } from "@/lib/supabaseClient";
import { updatePerfectStreak } from "@/utils/talentUtils";
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
import DailyQuestsModal from "@/components/DailyQuestsModal";
import ProfileBadgesModal from "@/components/ProfileBadgesModal";
import { updateQuestProgress } from "@/lib/quests";
import { checkAndGrantAchievements } from "@/lib/achievements";
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
import { getPopGameActive } from "@/lib/api/popGame";
import { getScriptureMatchActive } from "@/lib/api/scriptureMatch";
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
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState({ topPlayers: [], currentUserRank: null });
  const [totalLeaderboard, setTotalLeaderboard] = useState({ topPlayers: [], currentUserRank: null });
  const [monthlyLeaderboard, setMonthlyLeaderboard] = useState({ topPlayers: [], currentUserRank: null });
  const [showStore, setShowStore] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [showExplainerVideo, setShowExplainerVideo] = useState(false);
  const [shakingLevel, setShakingLevel] = useState(null);
  const [showNoLivesModal, setShowNoLivesModal] = useState(false);
  const [avatarAnimation, setAvatarAnimation] = useState({
    isAnimating: false,
    fromPosition: null,
    toPosition: null,
  });
  const [popGameActive, setPopGameActive] = useState(false);
  const [scriptureMatchActive, setScriptureMatchActive] = useState(false);
  const [showQuestsModal, setShowQuestsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const { user } = useAuth();
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

  // Helper: Get highest completed phase for avatar unlocking (computed from completedLevels)
  const highestCompletedPhase = useMemo(() => {
    let maxPhase = 0;
    completedLevels.forEach(levelId => {
      const match = levelId.match(/P(\d+)-L\d+/);
      if (match) {
        const phaseNum = parseInt(match[1]);
        if (phaseNum > maxPhase) maxPhase = phaseNum;
      }
    });
    return maxPhase;
  }, [completedLevels]);

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

  const phaseRefs = useRef([]);
  const levelRefs = useRef({});
  const [showNextLevelModal, setShowNextLevelModal] = useState(false);

  useEffect(() => {
    let leaderboardTimeout;
    const loadLeaderboards = async () => {
      const userId = gameUser?.user_id;
      const weekly = await fetchLeaderboard(userId);
      const total = await fetchMainLeaderboard(userId);
      const monthly = await fetchMonthlyLeaderboard(userId);
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
  }, [gameUser?.user_id]);

  // Auto-show explainer video for first-time users
  useEffect(() => {
    if (gameUser && gameUser.player_name && !gameUser.has_seen_explainer_video) {
      setShowExplainerVideo(true);
    }
  }, [gameUser]);

  // Check for Pop Game visibility (setting-based, not session-based)
  useEffect(() => {
    const checkPopGame = async () => {
      try {
        const isActive = await getPopGameActive();
        setPopGameActive(isActive);
      } catch (err) {
        console.error("Error checking pop game:", err);
      }
    };

    checkPopGame();
    
    // Subscribe to mini game settings updates for pop game
    const channel = supabase
      .channel('pop-game-visibility')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mini_game_settings' }, checkPopGame)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Check for Scripture Match visibility
  useEffect(() => {
    const checkScriptureMatch = async () => {
      try {
        const isActive = await getScriptureMatchActive();
        setScriptureMatchActive(isActive);
      } catch (err) {
        console.error("Error checking scripture match:", err);
      }
    };

    checkScriptureMatch();
    
    // Subscribe to mini game settings updates
    const channel = supabase
      .channel('scripture-match-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mini_game_settings' }, checkScriptureMatch)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

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
    // Always call determineUnlockedPhases - it correctly handles empty arrays
    // and ensures Phase 1 is unlocked for new players
    const unlocked = determineUnlockedPhases(completedLevels, levelPhases);
    setUnlockedPhases(unlocked);
  }, [completedLevels]);

  // 🌟 Auto-scroll to current level (first incomplete level)
  useEffect(() => {
    if (!selectedLevel && completedLevels !== undefined && !progressLoading) {
      const scrollToCurrentLevel = () => {
        // Find the first incomplete level across all phases
        for (const phase of levelPhases) {
          for (const level of phase.levels) {
            if (!completedLevels.includes(level.id)) {
              const levelEl = levelRefs.current[level.id];
              if (levelEl) {
                levelEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
              }
            }
          }
        }
        // If all levels complete, scroll to highest phase
        const highestIndex = Math.max(...(unlockedPhases.length > 0 ? unlockedPhases : [0]));
        if (phaseRefs.current[highestIndex]) {
          phaseRefs.current[highestIndex]?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      };
      
      // Delay to ensure refs are populated
      setTimeout(scrollToCurrentLevel, 300);
    }
  }, [completedLevels, progressLoading, selectedLevel, levelPhases, unlockedPhases]);

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

    // Update daily quest progress + check achievements (non-blocking)
    if (user?.id) {
      updateQuestProgress(user.id, "level_complete", 1).catch(() => {});
      checkAndGrantAchievements(user.id)
        .then((newly) => {
          newly?.forEach((a) =>
            toast.success(`🏅 Achievement unlocked: ${a.title}`, { duration: 4000 })
          );
        })
        .catch(() => {});
    }

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
      // Store position of completed level for animation
      const completedLevelRef = levelRefs.current[selectedLevel.id];
      const nextPhase = levelPhases.find(p => p.phaseNumber === selectedLevel.phaseNumber + 1);
      
      if (completedLevelRef && nextPhase) {
        const fromRect = completedLevelRef.getBoundingClientRect();
        setAvatarAnimation({
          isAnimating: true,
          fromPosition: { x: fromRect.left + fromRect.width / 2, y: fromRect.top + fromRect.height / 2 },
          toPhaseNumber: selectedLevel.phaseNumber + 1,
        });
      }
      
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

    // Daily quests: score earned + perfect score
    if (user?.id) {
      if (score > 0) updateQuestProgress(user.id, "score_earned", score).catch(() => {});
      if (score >= 100) updateQuestProgress(user.id, "perfect_score", 1).catch(() => {});
    }

    // Update perfect streak and check for accuracy bonuses
    const streakResult = await updatePerfectStreak(user.id, score);
    if (streakResult) {
      const { streakCount, bonusAwarded } = streakResult;
      
      // Show bonus toast if awarded
      if (bonusAwarded?.awarded) {
        playSound("bonusAwarded", effectsOn);
        toast.success(`🎯 Accuracy Bonus! +${bonusAwarded.reward} Talents`, {
          duration: 4000,
          style: {
            background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
            color: "#fff",
            border: "2px solid #fff",
            fontWeight: "bold"
          }
        });
      } else if (streakCount >= 3 && score === 100) {
        // Show progress feedback for streaks of 3+
        toast.success(`🔥 Perfect streak: ${streakCount}!`, {
          duration: 2000,
          style: {
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            color: "#fff",
            fontWeight: "bold"
          }
        });
      }
    }
  };

  const handleNextPhaseScroll = () => {
    // Always close modal first
    setShowScriptureModal(false);

    // Trigger avatar animation
    if (avatarAnimation.isAnimating) {
      // Animation plays, then clear after completion
      setTimeout(() => {
        setAvatarAnimation({ isAnimating: false, fromPosition: null, toPhaseNumber: null });
      }, 1500);
    }

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
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-pink-300 via-purple-400 to-blue-400 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-20 h-20 bg-candyYellow/30 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-32 right-20 w-32 h-32 bg-candyPink/30 rounded-full blur-3xl animate-float [animation-delay:1s]" />
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-candyBlue/30 rounded-full blur-3xl animate-float [animation-delay:0.5s]" />
        </div>

        {/* Main loading card */}
        <div className="relative bg-gradient-to-br from-white/95 via-pink-50/90 to-purple-50/90 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_0_rgba(0,0,0,0.1),0_20px_60px_rgba(79,156,249,0.6)] p-8 sm:p-12 max-w-md w-[90%] text-center border-4 border-white/60 animate-popIn">
          {/* Glowing orb decoration at top */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-20 h-20 bg-gradient-to-br from-candyYellow to-candyOrange rounded-full shadow-[0_0_40px_rgba(255,217,61,0.8)] animate-float border-4 border-white/60" />
          
          {/* Title */}
          <div className="text-5xl sm:text-6xl font-black mb-4 bg-gradient-to-r from-candyBlue via-candyPurple to-candyPink bg-clip-text text-transparent drop-shadow-lg animate-float">
            Light UP
          </div>
          
          {/* Animated bouncing orbs */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-candyYellow to-candyOrange rounded-full animate-bounce [animation-delay:-0.3s] shadow-[0_4px_0_rgba(0,0,0,0.1),0_0_20px_rgba(255,217,61,0.5)] border-2 border-white/60" />
            <div className="w-8 h-8 bg-gradient-to-br from-candyPink to-purple-400 rounded-full animate-bounce [animation-delay:-0.15s] shadow-[0_4px_0_rgba(0,0,0,0.1),0_0_20px_rgba(255,107,157,0.5)] border-2 border-white/60" />
            <div className="w-8 h-8 bg-gradient-to-br from-candyBlue to-blue-500 rounded-full animate-bounce shadow-[0_4px_0_rgba(0,0,0,0.1),0_0_20px_rgba(79,156,249,0.5)] border-2 border-white/60" />
          </div>
          
          {/* Subtitle */}
          <div className="text-4xl sm:text-5xl font-black mb-8 bg-gradient-to-r from-candyOrange via-candyYellow to-candyGreen bg-clip-text text-transparent drop-shadow-md animate-float [animation-delay:0.5s]">
            your Word!
          </div>
          
          {/* Progress bar with 3D effect */}
          <div className="relative h-4 bg-gray-300 rounded-full overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] border-2 border-gray-400/30">
            <div
              className="h-full bg-gradient-to-r from-candyBlue via-candyPurple to-candyPink rounded-full animate-pulse shadow-[0_0_15px_rgba(79,156,249,0.6)]"
              style={{ width: "70%" }}
            />
          </div>
          
          {/* Loading message */}
          <p className="mt-6 text-base sm:text-lg text-gray-700 tracking-wide font-bold animate-pulse flex items-center justify-center gap-2">
            <span className="text-2xl animate-spin">✨</span>
            Preparing your spiritual journey...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen flex flex-col overflow-hidden">
      <PWAInstallPrompt />
      <MapBackground />

      {/* Pop Game Red Orb - Admin Controlled Visibility (positioned above Memory Challenge) */}
      {popGameActive && !selectedLevel && (
        <button
          onClick={() => {
            playSound("optionSelect", effectsOn);
            navigate("/pop-game");
          }}
          className="fixed left-2 sm:left-3 z-50 flex flex-col items-center animate-bounce"
          style={{ top: 'calc(30% - 10px)' }}
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-b from-red-400 via-red-500 to-red-700 shadow-[0_0_20px_rgba(239,68,68,0.8),0_4px_0_#991b1b] border-2 border-white/50 flex items-center justify-center ring-4 ring-red-300/50">
            <span className="text-xl sm:text-2xl lg:text-3xl">🎮</span>
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-white bg-red-600/90 px-1.5 sm:px-2 py-0.5 rounded-full mt-1 shadow-lg">
            Free Fall
          </span>
        </button>
      )}

      {/* Scripture Match Yellow Orb - Admin Controlled Visibility (positioned below Pop Game) */}
      {!selectedLevel && scriptureMatchActive && (
        <button
          onClick={() => {
            playSound("optionSelect", effectsOn);
            navigate("/scripture-match");
          }}
          className="fixed left-2 sm:left-3 z-50 flex flex-col items-center hover:scale-110 transition-transform"
          style={{ top: 'calc(30% + 70px)' }}
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-b from-yellow-300 via-yellow-500 to-amber-600 shadow-[0_0_20px_rgba(245,158,11,0.8),0_4px_0_#b45309] border-2 border-white/50 flex items-center justify-center ring-4 ring-yellow-300/50 animate-pulse">
            <span className="text-xl sm:text-2xl lg:text-3xl">🧩</span>
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-white bg-amber-600/90 px-1.5 sm:px-2 py-0.5 rounded-full mt-1 shadow-lg">
            Memory
          </span>
        </button>
      )}

      {/* Fixed Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 candy-gradient py-2 lg:py-3 px-3 lg:px-4 shadow-[0_4px_20px_rgba(79,156,249,0.5)] border-b-4 border-white/30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Player Name & Avatar - Clickable to Settings */}
          <button
            onClick={() => {
              playSound("select", effectsOn);
              setShowSettings(true);
            }}
            className="flex items-center gap-2 lg:gap-3 cursor-pointer hover:scale-105 transition-transform active:scale-95"
          >
            <img
              src={avatar}
              className="w-8 h-8 lg:w-10 lg:h-10 rounded-full border-2 lg:border-3 border-white shadow-lg"
              alt="Avatar"
            />
            <span className="text-white font-black text-sm lg:text-lg drop-shadow-lg">
              {gameUser.player_name || "Unnamed"}
            </span>
          </button>

          {/* Center: Stats */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Score */}
            <Tooltip content="Your total score from completed levels">
              <div className="bg-white/20 backdrop-blur px-2 lg:px-4 py-1.5 lg:py-2 rounded-full border-2 border-white/30 font-black text-white text-xs lg:text-sm cursor-help">
                ⭐ {userScore}
              </div>
            </Tooltip>

            {/* Lives - Clickable to Store */}
            <Tooltip content="Lives regenerate every 30 minutes. Max 5 lives. Click to buy more!">
              <button
                onClick={() => {
                  playSound("select", effectsOn);
                  setShowStore(true);
                }}
                className="hover:scale-105 transition-transform active:scale-95 cursor-pointer"
              >
                <LivesDisplay
                  lives={gameUser.lives}
                  lastLostAt={gameUser.last_life_lost_at}
                />
              </button>
            </Tooltip>

            {/* Talents - Clickable to Store */}
            <Tooltip content="Talents are premium currency. Click to buy more!">
              <button
                onClick={() => {
                  playSound("select", effectsOn);
                  setShowStore(true);
                }}
                className="bg-white/20 backdrop-blur px-2 lg:px-4 py-1.5 lg:py-2 rounded-full border-2 border-white/30 font-black text-white text-xs lg:text-sm cursor-pointer hover:scale-105 transition-transform active:scale-95"
              >
                💎 {gameUser.talents ?? 0}
              </button>
            </Tooltip>
          </div>

          {/* Right: Powerups + Video Tutorial Icon - Clickable to Store */}
          <div className="hidden lg:flex gap-2 items-center">
            <button
              onClick={() => {
                playSound("select", effectsOn);
                setShowStore(true);
              }}
              className="cursor-pointer hover:scale-105 transition-transform active:scale-95 flex gap-2"
            >
              {Object.entries(gameUser.powerups_inventory || {}).map(
                ([key, count]) => (
                  <Tooltip key={key} content={`${getPowerUpTooltip(key)} - Click to buy more!`}>
                    <div className="bg-white/20 px-3 py-2 rounded-full border-2 border-white/30 font-bold text-white text-sm">
                      {getPowerUpIcon(key)} {count}
                    </div>
                  </Tooltip>
                )
              )}
            </button>
            
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
        <div className="fixed top-24 right-2 sm:right-4 z-40 bg-white/90 backdrop-blur rounded-xl shadow-xl p-1.5 sm:p-2 w-14 sm:w-16 border-2 border-blue-200">
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
              const containerHeight = (levelsPerPhase * 92) + 180;

              return (
                <div
                  key={originalIndex}
                  ref={(el) => (phaseRefs.current[originalIndex] = el)}
                  className="relative mb-10"
                >
                  {/* Phase Title Banner */}
                  <div className="sticky top-20 z-10 mb-5">
                    <div className="phase-ribbon-3d py-2 px-4 text-center">
                      <h2 className="text-white font-black text-base lg:text-xl drop-shadow-[0_2px_2px_rgba(120,53,15,0.8)]">
                        📜 {phase.title}
                      </h2>
                    </div>
                  </div>


                  {/* Map Container */}
                  <div className="relative w-full" style={{ minHeight: `${containerHeight}px` }}>
                    {/* Hilly 3D Path SVG - layered shadow + gold + rim highlight */}
                    <svg 
                      className="absolute inset-0 w-full h-full pointer-events-none" 
                      viewBox={`0 0 100 ${containerHeight}`}
                      preserveAspectRatio="none"
                      style={{ zIndex: 0 }}
                    >
                      <defs>
                        <linearGradient id={`goldenPath-${originalIndex}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#FFD93D" />
                          <stop offset="50%" stopColor="#FFC107" />
                          <stop offset="100%" stopColor="#FFD93D" />
                        </linearGradient>
                      </defs>
                      {/* Hill lumps behind path */}
                      {wrappedLevels.map((level) => (
                        <ellipse
                          key={`hill-${level.id}`}
                          cx={level.position.x}
                          cy={level.position.y + 10}
                          rx="18"
                          ry="22"
                          fill="#8b5a2b"
                          opacity="0.15"
                        />
                      ))}
                      {wrappedLevels.map((level, idx) => {
                        if (idx === 0) return null;
                        const prevLevel = wrappedLevels[idx - 1];
                        const x1 = prevLevel.position.x;
                        const y1 = prevLevel.position.y;
                        const x2 = level.position.x;
                        const y2 = level.position.y;
                        const midY = (y1 + y2) / 2;
                        const d = `M ${x1} ${y1} C ${x1} ${midY - 14}, ${x2} ${midY + 14}, ${x2} ${y2}`;

                        return (
                          <g key={`path-${level.id}`}>
                            {/* Ground shadow */}
                            <path
                              d={d}
                              fill="none"
                              stroke="#5b3a1a"
                              strokeWidth="18"
                              strokeLinecap="round"
                              opacity="0.45"
                              transform="translate(0,4)"
                            />
                            {/* Base golden road */}
                            <path
                              d={d}
                              fill="none"
                              stroke={`url(#goldenPath-${originalIndex})`}
                              strokeWidth="14"
                              strokeLinecap="round"
                              opacity="0.95"
                            />
                            {/* Top rim highlight */}
                            <path
                              d={d}
                              fill="none"
                              stroke="#FFF3B0"
                              strokeWidth="4"
                              strokeLinecap="round"
                              opacity="0.85"
                              transform="translate(0,-2)"
                            />
                          </g>
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
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
                              <div className="text-3xl animate-bounce drop-shadow-lg">
                                {getCurrentAvatar()}
                              </div>
                              <span className="bg-yellow-400 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-lg">
                                YOU
                              </span>
                            </div>
                          )}

                          {/* Level Node Button - Responsive with Light Bulb */}
                          <button
                            onClick={() => {
                              if (gameUser.lives === 0) {
                                playSound("error", effectsOn);
                                setShowNoLivesModal(true);
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
                              level-node-3d sm
                              w-11 h-11 sm:w-14 sm:h-14 lg:w-16 lg:h-16
                              flex items-center justify-center
                              ${!isLevelUnlocked ? 'is-locked' : ''}
                              ${isCompleted ? 'is-completed' : ''}
                              ${isCurrentLevel ? 'is-current ring-4 ring-yellow-300/80' : ''}
                              ${shakingLevel === level.id ? 'animate-wiggle' : ''}
                            `}
                          >
                            {isLevelUnlocked ? (
                              <div className="relative flex items-center justify-center">
                                <svg
                                  className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-yellow-200 drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)]"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M12 2C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2 14h-4v-1h4v1zm0-2h-4v-1h4v1zm.85-3.5c-.26.21-.35.28-.85.5v1.5h-4v-1.5c-.5-.22-.59-.29-.85-.5C8.47 10.72 8 9.89 8 9c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .89-.47 1.72-1.15 2.5z"/>
                                </svg>
                                <span className="absolute text-[9px] sm:text-[11px] lg:text-xs font-black text-amber-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">
                                  {level.number}
                                </span>
                              </div>
                            ) : (
                              <Lock className="text-gray-300 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 drop-shadow-[0_2px_2px_rgba(0,0,0,0.4)]" />
                            )}
                          </button>


                          {/* Stars Display for Completed Levels */}
                          {isCompleted && (
                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-0.5">
                              {[...Array(3)].map((_, starIdx) => (
                                <Star
                                  key={starIdx}
                                  className={`w-3.5 h-3.5 ${
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
            onOpenStore={() => setShowStore(true)}
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

      {/* Fixed Bottom Navigation - Desktop - Single Row */}
      <footer className="hidden lg:block fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-b from-pink-200 via-pink-300 to-pink-400 border-t-4 border-pink-500 shadow-[0_-4px_20px_rgba(236,72,153,0.4)]">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            {/* Settings */}
            <Tooltip content="Customize your player name and game settings">
              <button
                onClick={() => {
                  playSound("optionSelect", effectsOn);
                  setShowSettings(true);
                }}
                className="relative"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-b from-blue-300 via-blue-400 to-blue-600 shadow-[0_4px_0_#1e40af,0_6px_10px_rgba(30,64,175,0.4)] border-2 border-white/50 flex items-center justify-center active:translate-y-1 active:shadow-[0_2px_0_#1e40af] transition-all hover:scale-105">
                  <span className="text-2xl">⚙️</span>
                </div>
                <span className="text-[10px] font-bold text-pink-900 mt-0.5 block text-center">Settings</span>
              </button>
            </Tooltip>

            {/* Store */}
            <Tooltip content="Buy power-ups, talents, check bonuses">
              <button
                onClick={() => {
                  playSound("optionSelect", effectsOn);
                  setShowStore(true);
                }}
                className="relative"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-b from-green-300 via-green-400 to-green-600 shadow-[0_4px_0_#166534,0_6px_10px_rgba(22,101,52,0.4)] border-2 border-white/50 flex items-center justify-center active:translate-y-1 active:shadow-[0_2px_0_#166534] transition-all hover:scale-105">
                  <span className="text-2xl">🎁</span>
                </div>
                <span className="text-[10px] font-bold text-pink-900 mt-0.5 block text-center">Shop</span>
              </button>
            </Tooltip>

            {/* Multiplayer */}
            <Tooltip content="Create or join multiplayer games">
              <button
                onClick={() => {
                  playSound("optionSelect", effectsOn);
                  navigate("/multiplayer/create");
                }}
                className="relative"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-b from-purple-300 via-purple-400 to-purple-600 shadow-[0_4px_0_#6b21a8,0_6px_10px_rgba(107,33,168,0.4)] border-2 border-white/50 flex items-center justify-center active:translate-y-1 active:shadow-[0_2px_0_#6b21a8] transition-all hover:scale-105">
                  <span className="text-2xl">🎮</span>
                </div>
                <span className="text-[10px] font-bold text-pink-900 mt-0.5 block text-center">Multi</span>
              </button>
            </Tooltip>

            {/* Competition */}
            <Tooltip content="Join the 24-player tournament">
              <button
                onClick={() => {
                  playSound("optionSelect", effectsOn);
                  navigate("/competition");
                }}
                className="relative"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-b from-red-300 via-red-400 to-red-600 shadow-[0_4px_0_#b91c1c,0_6px_10px_rgba(185,28,28,0.4)] border-2 border-white/50 flex items-center justify-center active:translate-y-1 active:shadow-[0_2px_0_#b91c1c] transition-all hover:scale-105">
                  <span className="text-2xl">🏆</span>
                </div>
                <span className="text-[10px] font-bold text-pink-900 mt-0.5 block text-center">Compete</span>
              </button>
            </Tooltip>

            {/* Events - Highlighted, Slightly Larger */}
            <Tooltip content={challengeAllowed ? "Play weekly challenge" : `Opens ${countdownText}`}>
              <button
                onClick={() => {
                  playSound("optionSelect", effectsOn);
                  handleWeeklyChallengeClick();
                }}
                disabled={!challengeAllowed}
                className="relative"
              >
                <div className={`w-18 h-18 -mt-1 rounded-full bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600 shadow-[0_5px_0_#b45309,0_6px_12px_rgba(180,83,9,0.5)] border-3 border-white flex items-center justify-center transition-all hover:scale-110 ${challengeAllowed && !challengePlayed ? 'ring-4 ring-yellow-200/50 animate-pulse' : ''} ${!challengeAllowed ? 'opacity-50 cursor-not-allowed' : 'active:translate-y-1 active:shadow-[0_2px_0_#b45309]'}`}>
                  <span className="text-3xl">🥊</span>
                </div>
                <span className="text-[10px] font-bold text-pink-900 mt-0.5 block text-center">
                  {challengeAllowed && !challengePlayed ? "WEEKEND" : challengePlayed ? "Played" : "Locked"}
                </span>
              </button>
            </Tooltip>

            {/* Leaderboard */}
            <Tooltip content="View top players">
              <button
                onClick={() => {
                  playSound("optionSelect", effectsOn);
                  setShowLeaderboardModal(true);
                }}
                className="relative"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 shadow-[0_4px_0_#92400e,0_6px_10px_rgba(146,64,14,0.4)] border-2 border-white/50 flex items-center justify-center active:translate-y-1 active:shadow-[0_2px_0_#92400e] transition-all hover:scale-105">
                  <span className="text-2xl">🏆</span>
                </div>
                <span className="text-[10px] font-bold text-pink-900 mt-0.5 block text-center">Ranks</span>
              </button>
            </Tooltip>

            {/* Chat */}
            <Tooltip content="Chat with players globally">
              <button
                onClick={() => {
                  playSound("optionSelect", effectsOn);
                  setShowChatModal(true);
                }}
                className="relative"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-b from-pink-300 via-pink-400 to-pink-600 shadow-[0_4px_0_#be185d,0_6px_10px_rgba(190,24,93,0.4)] border-2 border-white/50 flex items-center justify-center active:translate-y-1 active:shadow-[0_2px_0_#be185d] transition-all hover:scale-105">
                  <span className="text-2xl">💬</span>
                </div>
                <span className="text-[10px] font-bold text-pink-900 mt-0.5 block text-center">Chat</span>
              </button>
            </Tooltip>

            {/* More Options */}
            <Tooltip content="Feedback, Donate, and more">
              <button
                onClick={() => {
                  playSound("optionSelect", effectsOn);
                  setShowMoreModal(true);
                }}
                className="relative"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-b from-gray-300 via-gray-400 to-gray-600 shadow-[0_4px_0_#374151,0_6px_10px_rgba(55,65,81,0.4)] border-2 border-white/50 flex items-center justify-center active:translate-y-1 active:shadow-[0_2px_0_#374151] transition-all hover:scale-105">
                  <span className="text-2xl">⋯</span>
                </div>
                <span className="text-[10px] font-bold text-pink-900 mt-0.5 block text-center">More</span>
              </button>
            </Tooltip>
          </div>
        </div>
      </footer>

      {/* Fixed Bottom Navigation - Mobile */}
      <footer className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-b from-pink-200 via-pink-300 to-pink-400 border-t-4 border-pink-500 shadow-[0_-4px_20px_rgba(236,72,153,0.4)]">
        <div className="flex items-center justify-around px-2 py-2.5">
          {/* Settings */}
          <Tooltip content="Customize settings">
            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                setShowSettings(true);
              }}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-b from-blue-300 via-blue-400 to-blue-600 shadow-[0_4px_0_#1e40af,0_6px_10px_rgba(30,64,175,0.4)] border-2 border-white/50 flex items-center justify-center active:translate-y-1 active:shadow-[0_2px_0_#1e40af] transition-all">
                <span className="text-2xl">⚙️</span>
              </div>
              <span className="text-[10px] font-bold text-pink-900">Settings</span>
            </button>
          </Tooltip>

          {/* Store */}
          <Tooltip content="Buy power-ups and talents, check out bonuses">
            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                setShowStore(true);
              }}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-b from-green-300 via-green-400 to-green-600 shadow-[0_4px_0_#166534,0_6px_10px_rgba(22,101,52,0.4)] border-2 border-white/50 flex items-center justify-center active:translate-y-1 active:shadow-[0_2px_0_#166534] transition-all">
                <span className="text-2xl">🎁</span>
              </div>
              <span className="text-[10px] font-bold text-pink-900">Shop</span>
            </button>
          </Tooltip>

          {/* Weekly Quiz - Center & Highlighted */}
          <Tooltip content={challengeAllowed ? "Play weekly quiz" : `Opens ${countdownText}`}>
            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                handleWeeklyChallengeClick();
              }}
              disabled={!challengeAllowed}
              className="flex flex-col items-center gap-1"
            >
              <div className={`w-16 h-16 -mt-3 rounded-full bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600 shadow-[0_4px_0_#b45309,0_6px_10px_rgba(180,83,9,0.4)] border-4 border-white flex items-center justify-center transition-all ${challengeAllowed && !challengePlayed ? 'ring-4 ring-yellow-200/50 animate-pulse' : ''} ${!challengeAllowed ? 'opacity-50' : 'active:translate-y-1 active:shadow-[0_2px_0_#b45309]'}`}>
                <span className="text-3xl">🥊</span>
              </div>
              <span className="text-[10px] font-bold text-pink-900">WEEKEND</span>
            </button>
          </Tooltip>

          {/* Multiplayer */}
          <Tooltip content="Play with friends">
            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                navigate("/multiplayer/create");
              }}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-b from-purple-300 via-purple-400 to-purple-600 shadow-[0_4px_0_#6b21a8,0_6px_10px_rgba(107,33,168,0.4)] border-2 border-white/50 flex items-center justify-center active:translate-y-1 active:shadow-[0_2px_0_#6b21a8] transition-all">
                <span className="text-xl">🎮</span>
              </div>
              <span className="text-[9px] font-bold text-pink-900">Multi</span>
            </button>
          </Tooltip>

          {/* Competition */}
          <Tooltip content="24-player tournament">
            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                navigate("/competition");
              }}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-b from-red-300 via-red-400 to-red-600 shadow-[0_4px_0_#b91c1c,0_6px_10px_rgba(185,28,28,0.4)] border-2 border-white/50 flex items-center justify-center active:translate-y-1 active:shadow-[0_2px_0_#b91c1c] transition-all">
                <span className="text-xl">🏆</span>
              </div>
              <span className="text-[9px] font-bold text-pink-900">Compete</span>
            </button>
          </Tooltip>

          {/* More */}
          <Tooltip content="More options">
            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                setShowMoreModal(true);
              }}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-b from-gray-300 via-gray-400 to-gray-600 shadow-[0_4px_0_#374151,0_6px_10px_rgba(55,65,81,0.4)] border-2 border-white/50 flex items-center justify-center active:translate-y-1 active:shadow-[0_2px_0_#374151] transition-all">
                <span className="text-xl">⋯</span>
              </div>
              <span className="text-[9px] font-bold text-pink-900">More</span>
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
        totalLeaderboard={totalLeaderboard.topPlayers}
        weeklyLeaderboard={weeklyLeaderboard.topPlayers}
        monthlyLeaderboard={monthlyLeaderboard.topPlayers}
        currentUserOverallRank={totalLeaderboard.currentUserRank}
        currentUserWeeklyRank={weeklyLeaderboard.currentUserRank}
        currentUserMonthlyRank={monthlyLeaderboard.currentUserRank}
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
              setShowQuestsModal(true);
            }}
            className="w-full btn-3d bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold px-6 py-4 rounded-xl shadow-lg hover:scale-105 transition-all"
          >
            ✨ Daily Quests
          </button>

          <button
            onClick={() => {
              playSound("optionSelect", effectsOn);
              setShowMoreModal(false);
              setShowProfileModal(true);
            }}
            className="w-full btn-3d bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-bold px-6 py-4 rounded-xl shadow-lg hover:scale-105 transition-all"
          >
            🏅 Profile & Badges
          </button>

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

      {/* No Lives Modal */}
      <Modal
        isOpen={showNoLivesModal}
        onClose={() => setShowNoLivesModal(false)}
        title="💔 No Lives Remaining"
        className="max-w-sm"
      >
        <div className="text-center py-4">
          <div className="text-6xl mb-4 animate-bounce">⏰</div>
          <p className="text-lg font-bold text-gray-700 mb-2">
            Wait for Regeneration
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Your lives regenerate every 30 minutes.
          </p>
          
          {/* Show live regeneration timer */}
          <div className="bg-pink-100 rounded-xl p-4 mb-4">
            <LivesDisplay 
              lives={gameUser?.lives} 
              lastLostAt={gameUser?.last_life_lost_at} 
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                setShowNoLivesModal(false);
                setShowStore(true);
              }}
              className="btn-3d bg-gradient-to-r from-green-500 to-green-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:scale-105 transition-all"
            >
              💎 Buy a Life (1 Talent)
            </button>
            <button
              onClick={() => {
                playSound("back", effectsOn);
                setShowNoLivesModal(false);
              }}
              className="text-gray-500 font-medium hover:text-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Avatar Animation Between Phases */}
      {avatarAnimation.isAnimating && (
        <div 
          className="fixed pointer-events-none z-[100]"
          style={{
            left: `${avatarAnimation.fromPosition?.x}px`,
            top: `${avatarAnimation.fromPosition?.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="animate-avatarJump flex flex-col items-center">
            <div className="text-5xl drop-shadow-lg">
              {getCurrentAvatar()}
            </div>
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-black text-xs px-3 py-1 rounded-full shadow-lg mt-2">
              ⬆️ MOVING UP!
            </span>
          </div>
        </div>
      )}

      {/* Explainer Video Modal */}
      <ExplainerVideoModal
        isOpen={showExplainerVideo}
        onClose={() => setShowExplainerVideo(false)}
        userId={user?.id}
      />

      <DailyQuestsModal
        isOpen={showQuestsModal}
        onClose={() => setShowQuestsModal(false)}
      />

      <ProfileBadgesModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      <AppToaster />
    </div>
  );
}
