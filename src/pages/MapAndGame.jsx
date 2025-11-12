import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { levelPhases } from "@/data/levelData";
import { useAuth } from "@/auth/AuthProvider";
import { fetchProgress } from "@/lib/fetchProgress";
import { saveProgress } from "@/lib/saveProgress";
import { fetchTotalScore } from "@/lib/fetchTotalScore";
import { fetchRandomScripture } from "@/lib/fetchRandomScripture";
import { fetchLeaderboard } from "@/lib/fetchLeaderboard";
import { fetchMainLeaderboard } from "@/lib/api/leaderboard";
import { supabase } from "@/lib/supabaseClient";
import { useGameUser } from "@/hooks/useGameUser";
import { LivesDisplay } from "@/components/LivesDisplay";
import SpiritualParallaxBackground from "@/components/SpiritualParallaxBackground";
import LevelMap from "@/components/LevelMap";
import GameScreen from "@/components/GameScreen";
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
import GlobalChat from "@/components/GlobalChat";
import LeaderboardModal from "@/components/LeaderboardModal";
import {
  determineUnlockedPhases,
  wrapLevelsWithStatus,
  getPowerUpIcon,
} from "@/utils/gameHelpers";
import {
  getWeeklyChallengeStatus,
  hasPlayedThisWeek,
} from "@/utils/weeklyChallenge";
import avatar from "@/assets/avatar.png";

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
  const [showStore, setShowStore] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);

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

  // mutation for saving progress
  const saveProgressMutation = useMutation({
    mutationFn: saveProgress,
    onSuccess: () => {
      queryClient.invalidateQueries(["progress", user?.id]);
      queryClient.invalidateQueries(["totalScore", user?.id]);
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
      setWeeklyLeaderboard(weekly);
      setTotalLeaderboard(total);
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
        { event: "*", schema: "public", table: "weekly_challenge_results" },
        () => loadLeaderboardsDebounced()
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
  };

  useEffect(() => {
    const updateChallengeStatus = async () => {
      try {
        const { allowed, countdownText } = await getWeeklyChallengeStatus();
        setChallengeAllowed(Boolean(allowed));
        setCountdownText(countdownText ?? "");
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
      <SpiritualParallaxBackground />

      {/* Fixed Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 candy-gradient py-3 px-4 shadow-[0_4px_20px_rgba(79,156,249,0.5)] border-b-4 border-white/30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Player Name & Avatar */}
          <div className="flex items-center gap-3">
            <img
              src={avatar}
              className="w-10 h-10 rounded-full border-3 border-white shadow-lg"
              alt="Avatar"
            />
            <span className="text-white font-black text-base sm:text-lg drop-shadow-lg">
              {gameUser.player_name || "Unnamed"}
            </span>
          </div>

          {/* Center: Stats */}
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            {/* Score */}
            <div className="bg-white/20 backdrop-blur px-3 sm:px-4 py-2 rounded-full border-2 border-white/30 font-black text-white text-sm">
              ⭐ {userScore}
            </div>

            {/* Lives */}
            <LivesDisplay
              lives={gameUser.lives}
              lastLostAt={gameUser.last_life_lost_at}
            />

            {/* Talents */}
            <div className="bg-white/20 backdrop-blur px-3 sm:px-4 py-2 rounded-full border-2 border-white/30 font-black text-white text-sm">
              💎 {gameUser.talents ?? 0}
            </div>
          </div>

          {/* Right: Powerups */}
          <div className="hidden lg:flex gap-2">
            {Object.entries(gameUser.powerups_inventory || {}).map(
              ([key, count]) => (
                <div
                  key={key}
                  className="bg-white/20 px-3 py-2 rounded-full border-2 border-white/30 font-bold text-white text-sm"
                >
                  {getPowerUpIcon(key)} {count}
                </div>
              )
            )}
          </div>
        </div>
      </header>

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

              return (
                <div
                  key={originalIndex}
                  ref={(el) => (phaseRefs.current[originalIndex] = el)}
                  className="relative"
                >
                  <LevelMap
                    phase={{ ...phase, levels: wrappedLevels }}
                    phaseIndex={originalIndex}
                    completedLevels={completedLevels}
                    currentLevelId={currentPhaseId}
                    isLocked={gameUser.lives === 0}
                    onSelectLevel={(level) => {
                      if (gameUser.lives > 0) startLevel(level);
                      else
                        toast.error(
                          "You're out of lives! Please wait to get more."
                        );
                    }}
                    sound={sound}
                    setSound={setSound}
                    effectsOn={effectsOn}
                    levelRefs={levelRefs}
                  />
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
            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                setShowSettings(true);
              }}
              className="btn-3d bg-white text-candyBlue font-bold px-6 py-3 rounded-2xl shadow-lg hover:scale-105 transition-all"
            >
              ⚙️ Settings
            </button>

            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                setShowStore(true);
              }}
              className="btn-3d golden-gradient text-white font-bold px-6 py-3 rounded-2xl shadow-lg hover:scale-105 transition-all"
            >
              🎁 Store
            </button>

            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                navigate("/multiplayer/create");
              }}
              className="btn-3d bg-gradient-to-r from-candyGreen to-green-500 text-white font-bold px-6 py-3 rounded-2xl shadow-lg hover:scale-105 transition-all"
            >
              🎮 Multiplayer
            </button>

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
          </div>

          {/* Row 2: Secondary Actions */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                setShowLeaderboardModal(true);
              }}
              className="btn-3d bg-gradient-to-r from-gray-700 to-gray-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-md hover:scale-105 transition-all"
            >
              🏆 Leaderboards
            </button>

            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                setShowChatModal(true);
              }}
              className="btn-3d bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-md hover:scale-105 transition-all"
            >
              💬 Chat
            </button>

            <FeedbackButton
              effectsOn={effectsOn}
              sound={sound}
              setSound={setSound}
            />

            <DonationsButton
              userId={user?.id}
              effectsOn={effectsOn}
              playSound={playSound}
              sound={sound}
            />
          </div>
        </div>
      </footer>

      {/* Fixed Bottom Navigation - Mobile */}
      <footer className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-white/95 to-blue-50/95 backdrop-blur-xl border-t-4 border-white/50 shadow-[0_-4px_20px_rgba(79,156,249,0.3)]">
        <div className="flex items-center justify-around px-2 py-3">
          {/* Settings */}
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

          {/* Store */}
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

          {/* Multiplayer */}
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

          {/* Weekly Quiz */}
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

          {/* More */}
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
        onSave={handleSavePlayerName}
        sound={sound}
        setSound={setSound}
        effectsOn={effectsOn}
      />

      <PowerUpStore
        isOpen={showStore}
        onClose={() => setShowStore(false)}
        userId={user?.id}
        effectsOn={effectsOn}
        refetchGameUser={refetch}
      />

      <LeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        totalLeaderboard={totalLeaderboard}
        weeklyLeaderboard={weeklyLeaderboard}
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
            />
            <DonationsButton
              userId={user?.id}
              effectsOn={effectsOn}
              playSound={playSound}
              sound={sound}
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

      <AppToaster />
    </div>
  );
}
