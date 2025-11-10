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
import {
  determineUnlockedPhases,
  wrapLevelsWithStatus,
  getPowerUpIcon,
} from "@/utils/gameHelpers";
import {
  getWeeklyChallengeStatus,
  hasPlayedThisWeek,
} from "@/utils/weeklyChallenge";

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
  const [showTotalLeaderboard, setShowTotalLeaderboard] = useState(true);
  const [showStore, setShowStore] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false); // accordion toggle

  const { user } = useAuth();
  const { gameUser, loading: gameUserLoading, refetch } = useGameUser(user?.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // progress query
  const { data: completedLevels = [], isLoading: progressLoading } = useQuery({
    queryKey: ["progress", user?.id],
    queryFn: () => fetchProgress(user?.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60, // 1 min
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
  const levelRefs = useRef({}); // 👈 add this
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

    let totalChannel;
    if (showTotalLeaderboard) {
      totalChannel = supabase
        .channel("total_score_updates")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "progress" },
          () => loadLeaderboardsDebounced()
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(weeklyChannel);
      if (totalChannel) supabase.removeChannel(totalChannel);
      clearTimeout(leaderboardTimeout);
    };
  }, [showTotalLeaderboard]);

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
      if (safelyNavigatingRef.current) return; // 👈 do not penalize during intentional exits
      // If DB says user is in-game but local UI has no selected level,
      // it usually means user refreshed/left mid-level -> lose a life.
      if (gameUser.in_game && !selectedLevel) {
        // give a short grace to avoid penalizing race conditions (optional)
        // e.g., ignore if in_game_started_at is very recent (last 2s)
        const startedAt = gameUser.in_game_started_at
          ? new Date(gameUser.in_game_started_at).getTime()
          : 0;
        const justStarted = Date.now() - startedAt < 2000; // 2 seconds
        if (justStarted) return; // skip quick races

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
  }, [user, navigate, levelPhases]);

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
  }, [completedLevels, levelPhases]);

  useEffect(() => {
    if (showNextLevelModal) {
      const timer = setTimeout(() => {
        setShowNextLevelModal(false);
        setSelectedLevel(pendingNextLevel);
      }, 3000); // 3 seconds
      return () => clearTimeout(timer);
    }
  }, [showNextLevelModal, pendingNextLevel]);

  useEffect(() => {
    if (gameUser && !gameUser.player_name) {
      setShowSettings(true);
    }
  }, [gameUser]);

  // Inside MapAndGame.jsx

  const handleBackFromGame = () => {
    setSelectedLevel(null);
  
    // 👇 Scroll to the player's current level button
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
      await refetch?.(); // make sure in_game is false before collapsing the game view
    } catch (err) {
      console.error("Failed clearing in_game after complete:", err);
    }

    await saveProgressMutation.mutateAsync({
      level_id: selectedLevel.id,
      phase: selectedLevel.phaseNumber,
      mode: selectedLevel.mode,
      score: 0,
    });

    // build an updated list of completed levels including the current one
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
        completed: updatedCompleted.includes(nextLevel.id), // ✅ now defined
        phaseNumber: currentPhase.phaseNumber,
      });
      setShowNextLevelModal(true);
    } else {
      setScriptureText(
        (await fetchRandomScripture()) ||
          "“The Lord will fight for you; you need only to be still.” — Exodus 14:14"
      );
      setShowScriptureModal(true);
    }

    // ⏳ delay resetting the guard
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
    const currentPhaseNum = selectedLevel?.phaseNumber;
    const nextIndex = levelPhases.findIndex(
      (p) => p.phaseNumber === currentPhaseNum + 1
    );
    setShowScriptureModal(false);
    if (nextIndex !== -1 && phaseRefs.current[nextIndex]) {
      phaseRefs.current[nextIndex].scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const handleSavePlayerName = async () => {
    await refetch?.();
    setShowSettings(false);
    toast.success("Settings saved!");
  };

  if (!user || gameUserLoading || progressLoading || scoreLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-100">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-12 max-w-md text-center border-2 border-white/50">
          <div className="text-5xl font-extrabold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent drop-shadow-lg animate-pulse">
            Light UP
          </div>
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-5 h-5 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full animate-bounce [animation-delay:-0.3s] shadow-lg" />
            <div className="w-5 h-5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full animate-bounce [animation-delay:-0.15s] shadow-lg" />
            <div className="w-5 h-5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-bounce shadow-lg" />
          </div>
          <div className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent drop-shadow-md animate-pulse">
            your Word!
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full animate-pulse" style={{width: '70%'}}></div>
          </div>
          <p className="mt-6 text-sm text-gray-600 tracking-wide font-medium">
            ✨ Preparing your spiritual journey...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100">
      <SpiritualParallaxBackground />

      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Mobile Sidebar Toggle Button */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <button
            onClick={() => setMobileActionsOpen(!mobileActionsOpen)}
            className="p-3 bg-white/90 backdrop-blur-sm text-gray-800 rounded-2xl shadow-xl hover:shadow-2xl focus:outline-none transition-all duration-300 hover:scale-105 border border-white/50"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileActionsOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Overlay (click outside to close) */}
        {mobileActionsOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setMobileActionsOpen(false)}
          />
        )}
        {/* Mobile Sidebar */}
        <div
          className={`fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-white/95 to-blue-50/95 backdrop-blur-xl p-6 border-r border-white/30 shadow-2xl z-50 transform transition-all duration-500 ease-out ${
            mobileActionsOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800">Menu</h2>
            <button
              onClick={() => {
                playSound("switch", effectsOn);
                setMobileActionsOpen(false);
              }}
              className="p-2 hover:bg-red-100 text-red-600 rounded-xl transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                setShowSettings(true);
              }}
              className="w-full text-left text-sm text-blue-700 font-semibold border-2 border-blue-400 rounded-2xl px-4 py-3 shadow-md hover:shadow-xl hover:bg-blue-50 transition-all duration-200 hover:scale-105 bg-white/70"
            >
              <span className="text-lg mr-2">⚙️</span> Settings
            </button>

            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                setShowStore(true);
              }}
              className="w-full text-left bg-gradient-to-r from-yellow-600 to-yellow-700 text-white text-sm font-semibold rounded-2xl px-4 py-3 shadow-md hover:shadow-xl hover:from-yellow-700 hover:to-yellow-800 transition-all duration-200 hover:scale-105"
            >
              <span className="text-lg mr-2">🛒</span> Store & Gifts
            </button>

            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                navigate("/multiplayer/create");
              }}
              className="w-full text-left bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-semibold rounded-2xl px-4 py-3 shadow-md hover:shadow-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 hover:scale-105"
            >
              <span className="text-lg mr-2">🎮</span> Multiplayer
            </button>

            <button
              onClick={() => {
                playSound("optionSelect", effectsOn);
                handleWeeklyChallengeClick();
              }}
              disabled={!challengeAllowed}
              className="w-full text-left bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-2xl px-4 py-3 shadow-md hover:shadow-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <span className="text-lg mr-2">🥊</span>{" "}
              {challengeAllowed && !challengePlayed
                ? "Play Weekly Quiz"
                : challengePlayed
                ? "Already Played"
                : `Opens ${countdownText}`}
            </button>
          </div>

          {/* Leaderboards */}
          <div className="overflow-y-auto max-h-[50vh] space-y-3">
            {totalLeaderboard.length > 0 && (
              <div className="bg-gradient-to-br from-white/80 to-blue-50/80 backdrop-blur-sm border-2 border-blue-300 rounded-2xl shadow-lg p-3">
                <h2 className="text-xs font-bold text-blue-700 mb-2 flex items-center">
                  <span className="text-lg mr-1">🏆</span> Overall Top Players
                </h2>
                <ol className="space-y-1 text-[10px]">
                  {totalLeaderboard.map((entry, index) => (
                    <li key={index} className="flex items-center bg-white/60 rounded-lg px-2 py-1">
                      <span className="font-bold text-blue-600 w-5">{index + 1}.</span>
                      <span className="flex-1 truncate font-medium">
                        {entry.player_name || "Unnamed"}
                      </span>
                      <span className="font-bold text-blue-700 ml-2">
                        {entry.total_score} pts
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {weeklyLeaderboard.length > 0 && (
              <div className="bg-gradient-to-br from-white/80 to-yellow-50/80 backdrop-blur-sm border-2 border-yellow-400 rounded-2xl shadow-lg p-3">
                <h2 className="text-xs font-bold text-yellow-700 mb-2 flex items-center">
                  <span className="text-lg mr-1">⭐</span> Weekly Quiz Top 10
                </h2>
                <ol className="space-y-1 text-[10px]">
                  {weeklyLeaderboard.map((entry, index) => (
                    <li key={index} className="flex items-center bg-white/60 rounded-lg px-2 py-1">
                      <span className="font-bold text-yellow-600 w-5">{index + 1}.</span>
                      <span className="flex-1 truncate font-medium">
                        {entry.player_name || "Unnamed"}
                      </span>
                      <span className="font-bold text-yellow-700 ml-2">
                        {entry.score} pts
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Spacer to push chat to the bottom */}

            {/* Global Chat */}
            <GlobalChat user={user} />
          </div>

          <div className="mt-auto flex gap-2 ">
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

        {/* LEFT SIDEBAR (desktop) */}
        <div className="hidden lg:flex flex-col w-72 p-5 gap-4 bg-gradient-to-b from-white/90 to-blue-50/90 backdrop-blur-xl border-r border-white/30 shadow-xl">
          {/* Top Buttons */}
          <button
            onClick={() => {
              playSound("optionSelect", effectsOn);
              setShowSettings(true);
            }}
            className="bg-white text-blue-700 font-semibold border-2 border-blue-400 rounded-2xl px-5 py-3 shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all duration-200 hover:scale-105"
          >
            <span className="text-lg mr-2">⚙️</span> Settings
          </button>
          <button
            onClick={() => {
              playSound("optionSelect", effectsOn);
              setShowStore(true);
            }}
            className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white font-semibold rounded-2xl px-5 py-3 shadow-lg hover:shadow-xl hover:from-yellow-700 hover:to-yellow-800 transition-all duration-200 hover:scale-105"
          >
            <span className="text-lg mr-2">🎁</span> Store
          </button>
          <button
            onClick={() => {
              playSound("optionSelect", effectsOn);
              navigate("/multiplayer/create");
            }}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-2xl px-5 py-3 shadow-lg hover:shadow-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 hover:scale-105"
          >
            <span className="text-lg mr-2">🎮</span> Multiplayer
          </button>

          {/* Spacer to push chat to the bottom */}
          <div className="flex-1" />

          {/* Global Chat */}
          <GlobalChat user={user} />
        </div>
        {/* CENTER CONTENT */}
        <div className="flex-1 overflow-y-auto max-h-screen p-4">
          {/* Sticky Header */}
          <div
            className="sticky top-20 md:top-5 z-40 bg-gradient-to-r from-white/95 to-blue-50/95 backdrop-blur-xl border-2 border-white/50 
              py-3 px-4 sm:py-4 sm:px-6 md:py-5 md:px-8 shadow-xl rounded-3xl
              flex flex-col md:flex-row md:justify-between md:items-center 
              text-xs sm:text-sm md:text-base font-medium text-gray-700 
              gap-3 sm:gap-4 md:gap-6 text-center md:text-left mb-6"
          >
            {/* Player Name */}
            <div className="flex justify-center items-center gap-4 font-bold text-blue-700">
              <span className="text-lg">{gameUser.player_name || "Unnamed"}</span>

              {/* Total Score */}
              <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg font-bold">
                ⭐ {userScore}
              </div>
            </div>

            {/* Lives */}
            <div className="flex justify-center items-center gap-4">
              <LivesDisplay
                lives={gameUser.lives}
                lastLostAt={gameUser.last_life_lost_at}
              />

              {/* Talents */}
              <div className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-2xl shadow-lg font-bold">
                💎 {gameUser.talents ?? 0}
              </div>
            </div>

            {/* Powerups */}
            <div className="text-sm flex justify-center gap-3 flex-wrap">
              {Object.entries(gameUser.powerups_inventory || {}).map(
                ([key, count]) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl shadow-md font-semibold hover:scale-105 transition-transform"
                  >
                    {getPowerUpIcon(key)} <span className="text-gray-700">{count}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {!selectedLevel ? (
            <div className="flex flex-col gap-8">
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
                      sound={sound} // pass current sound state
                      setSound={setSound} // pass setter so modal can update global sound immediately
                      effectsOn={effectsOn}
                      levelRefs={levelRefs} // 👈 pass down
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
              sound={sound} // pass current sound state
              setSound={setSound} // pass setter so modal can update global sound immediately
              effectsOn={effectsOn}
            />
          )}
        </div>

        {/* RIGHT SIDEBAR (desktop) */}
        <div className="hidden lg:flex flex-col w-80 p-5 gap-4 bg-gradient-to-b from-white/90 to-indigo-50/90 backdrop-blur-xl border-l border-white/30 shadow-xl">
          <button
            onClick={() => {
              playSound("optionSelect", effectsOn);
              handleWeeklyChallengeClick();
            }}
            disabled={!challengeAllowed}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-2xl px-5 py-3 shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <span className="text-lg mr-2">🥊</span>
            {challengeAllowed && !challengePlayed
              ? "Play Weekly Quiz"
              : challengePlayed
              ? "Already Played"
              : `Opens ${countdownText}`}
          </button>
          <button
            onClick={() => {
              playSound("optionSelect", effectsOn);
              setShowTotalLeaderboard(!showTotalLeaderboard);
            }}
            className="bg-gradient-to-r from-gray-700 to-gray-800 text-white font-semibold rounded-2xl px-5 py-3 shadow-lg hover:shadow-xl hover:from-gray-800 hover:to-gray-900 transition-all duration-200 hover:scale-105"
          >
            <span className="text-lg mr-2">🌟</span>
            {showTotalLeaderboard ? "Hide Leaderboard" : "Show Leaderboard"}
          </button>
          {showTotalLeaderboard && totalLeaderboard.length > 0 && (
            <div className="bg-gradient-to-br from-white/80 to-blue-50/80 backdrop-blur-sm border-2 border-blue-300 rounded-2xl shadow-lg p-4">
              <h2 className="text-sm font-bold text-blue-700 mb-3 flex items-center">
                <span className="text-xl mr-2">🏆</span> Overall Top Players
              </h2>
              <ol className="space-y-2 text-xs">
                {totalLeaderboard.map((entry, index) => (
                  <li key={index} className="flex items-center bg-white/60 rounded-xl px-3 py-2 hover:bg-white/80 transition-colors">
                    <span className="font-bold text-blue-600 w-6">{index + 1}.</span>
                    <span className="flex-1 truncate font-medium">
                      {entry.player_name || "Unnamed"}
                    </span>
                    <span className="font-bold text-blue-700 ml-2">
                      {entry.total_score} pts
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {weeklyLeaderboard.length > 0 && (
            <div className="bg-gradient-to-br from-white/80 to-yellow-50/80 backdrop-blur-sm border-2 border-yellow-400 rounded-2xl shadow-lg p-4">
              <h2 className="text-sm font-bold text-yellow-700 mb-3 flex items-center">
                <span className="text-xl mr-2">⭐</span> Weekly Quiz Top 10
              </h2>
              <ol className="space-y-2 text-xs">
                {weeklyLeaderboard.map((entry, index) => (
                  <li key={index} className="flex items-center bg-white/60 rounded-xl px-3 py-2 hover:bg-white/80 transition-colors">
                    <span className="font-bold text-yellow-600 w-6">{index + 1}.</span>
                    <span className="flex-1 truncate font-medium">
                      {entry.player_name || "Unnamed"}
                    </span>
                    <span className="font-bold text-yellow-700 ml-2">
                      {entry.score} pts
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="mt-auto flex gap-1">
            <div>
              <FeedbackButton
                effectsOn={effectsOn}
                sound={sound}
                setSound={setSound}
              />
            </div>
            <div>
              <DonationsButton
                userId={user?.id} // 👈 pass the actual user id here
                effectsOn={effectsOn}
                playSound={playSound}
                sound={sound}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        gameUser={gameUser}
        onSave={handleSavePlayerName}
        sound={sound} // pass current sound state
        setSound={setSound} // pass setter so modal can update global sound immediately
        effectsOn={effectsOn}
      />
      <Modal
        isOpen={showNextLevelModal}
        onClose={() => {
          setShowNextLevelModal(false);
          setSelectedLevel(pendingNextLevel);
        }}
        title="Level Complete!"
      >
        <div className="text-center p-4">
          <p className="mb-4">🎉 Great job! Ready for the next challenge?</p>
          <button
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            onClick={() => {
              setShowNextLevelModal(false);
              setSelectedLevel(pendingNextLevel);
            }}
          >
            Next Level →
          </button>
        </div>
      </Modal>

      <Modal isOpen={showStore} onClose={() => setShowStore(false)} title="">
        <PowerUpStore
          sound={sound} // pass current sound state
          setSound={setSound} // pass setter so modal can update global sound immediately
          effectsOn={effectsOn}
          gameUser={gameUser}
          onPurchase={refetch}
        />
      </Modal>
      {showScriptureModal && (
        <ScriptureModal text={scriptureText} onNext={handleNextPhaseScroll} />
      )}
      <AppToaster />
    </div>
  );
}
