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
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-white via-blue-50 to-sky-100 text-gray-800">
        <div className="text-4xl font-extrabold mb-4 animate-pulse text-blue-600 drop-shadow-md">
          Light UP
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-4 h-4 bg-yellow-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-4 h-4 bg-yellow-500 rounded-full animate-bounce" />
        </div>
        <div className="text-2xl font-bold mb-4 animate-pulse text-blue-600 drop-shadow-md">
          your Word!
        </div>
        <p className="mt-6 text-sm text-gray-600 tracking-wide">
          Preparing your journey...
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <SpiritualParallaxBackground />

      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Mobile Sidebar Toggle Button */}
        <div className="lg:hidden fixed top-2 left-2 z-50 px-4 py-2">
          <br></br>
          <button
            onClick={() => setMobileActionsOpen(!mobileActionsOpen)}
            className="p-2 bg-gray-500 text-white rounded-md shadow-lg focus:outline-none px-3 py-2 text-sm"
            aria-label="Toggle menu"
          >
            {mobileActionsOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Overlay (click outside to close) */}
        {mobileActionsOpen && (
          <div
            className="fixed inset-0 bg-black  bg-opacity-40 z-40"
            onClick={() => setMobileActionsOpen(false)}
          />
        )}
        {/* Mobile Sidebar */}
        <div
          className={`fixed top-0 left-0 h-full w-64 bg-white/60 backdrop-blur-md p-5 border-r border-gray-300 z-50 transform transition-transform duration-300 ease-in-out ${
            mobileActionsOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Close button (optional) */}
          <button
            onClick={() => {
              playSound("switch", effectsOn); // 🔊 play switch sound
              setMobileActionsOpen(false);
            }}
            className="mb-2 px-2 py-1 bg-red-600 text-white text-[10px] rounded-md"
          >
            ✕
          </button>

          <button
            onClick={() => {
              playSound("optionSelect", effectsOn);
              setShowSettings(true);
            }}
            className="w-full mb-0.5 text-left text-[10px] text-blue-700 font-medium border border-blue-500 rounded-lg px-3 py-1 shadow hover:bg-blue-50"
          >
            ⚙️ Settings
          </button>

          <button
            onClick={() => {
              playSound("optionSelect", effectsOn);
              setShowStore(true);
            }}
            className="w-full mb-0.5 text-left bg-yellow-800 text-white text-[10px] font-medium rounded-lg px-3 py-1 shadow hover:bg-yellow-900"
          >
            🛒 🎁 Store
          </button>

          <button
            onClick={() => {
              playSound("optionSelect", effectsOn);
              navigate("/multiplayer/create");
            }}
            className="w-full mb-0.5 text-left bg-green-500 text-white text-[10px] font-medium rounded-lg px-3 py-1 shadow hover:bg-green-600"
          >
            🎮 Multiplayer
          </button>

          <button
            onClick={() => {
              playSound("optionSelect", effectsOn);
              handleWeeklyChallengeClick();
            }}
            disabled={!challengeAllowed}
            className="w-full mb-0.5 text-left bg-blue-500 text-white text-[10px] font-medium rounded-lg px-3 py-1 shadow hover:bg-blue-600 disabled:opacity-50"
          >
            {challengeAllowed && !challengePlayed
              ? "🥊 Weekend Challenge: Play Now"
              : challengePlayed
              ? "🥊 Already Played"
              : `🥊 Quiz: ${countdownText}`}
          </button>

          <div className="overflow-y-auto max-h-[50vh] mt-4">
            {totalLeaderboard.length > 0 && (
              <div className="bg-white border border-blue-400 rounded-md shadow p-2 mb-1">
                <h2 className="text-[6px] font-bold text-blue-700 mb-1">
                  🏆 Overall Top Players
                </h2>
                <ol className="space-y-0.5 text-[5px]">
                  {totalLeaderboard.map((entry, index) => (
                    <li key={index} className="flex items-center">
                      <span className="whitespace-nowrap">
                        {index + 1}. {entry.player_name || "Unnamed"}
                      </span>
                      {/* dotted connector */}
                      <span className="flex-1 border-b border-dotted border-gray-300 mx-1"></span>
                      <span className="whitespace-nowrap">
                        {entry.total_score} pts
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {weeklyLeaderboard.length > 0 && (
              <div className="bg-white border border-yellow-400 rounded-md shadow p-2">
                <h2 className="text-[6px] font-bold text-yellow-600 mb-1">
                  🏆 Weekend Challenge Top 10
                </h2>
                <ol className="space-y-0.5 text-[5px]">
                  {weeklyLeaderboard.map((entry, index) => (
                    <li key={index} className="flex items-center">
                      <span className="whitespace-nowrap">
                        {index + 1}. {entry.player_name || "Unnamed"}
                      </span>
                      {/* dotted connector */}
                      <span className="flex-1 border-b border-dotted border-gray-300 mx-1"></span>
                      <span className="whitespace-nowrap">
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
        <div className="hidden lg:flex flex-col w-60 p-4 gap-4 bg-white/40 backdrop-blur-md border-r border-gray-300">
          {/* Top Buttons */}
          <button
            onClick={() => {
              playSound("optionSelect", effectsOn); // 🔊 play switch sound
              setShowSettings(true);
            }}
            className="bg-white text-blue-700 font-semibold border border-blue-500 rounded-full px-4 py-2 shadow hover:bg-blue-50"
          >
            ⚙️ Settings
          </button>
          <button
            onClick={() => {
              playSound("optionSelect", effectsOn); // 🔊 play switch sound
              setShowStore(true);
            }}
            className="bg-yellow-800 text-white font-semibold rounded-full px-4 py-2 shadow hover:bg-yellow-900"
          >
            🎁 Store
          </button>
          <button
            onClick={() => {
              playSound("optionSelect", effectsOn); // 🔊 play switch sound
              navigate("/multiplayer/create");
            }}
            className="bg-green-500 text-white font-semibold rounded-full px-4 py-2 shadow hover:bg-green-600"
          >
            🎮 Multiplayer
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
            className="sticky top-20 md:top-5 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-200 
              py-0.5 px-1 sm:py-1 sm:px-2 md:py-2 md:px-3 shadow-sm 
              flex flex-col md:flex-row md:justify-between md:items-center 
              text-[11px] sm:text-[11px] md:text-[15px] font-medium text-gray-700 
              gap-1 sm:gap-2 md:gap-4 text-center md:text-left"
          >
            {/* Player Name */}
            <div className="flex justify-center items-center truncate font-semibold text-blue-700 gap-4 ">
              {gameUser.player_name || "Unnamed"}

              {/* Total Score */}
              <div className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full shadow-sm">
                Total: ⭐ {userScore}
              </div>
            </div>

            {/* Lives */}
            <div className="flex justify-center items-center gap-4">
              <LivesDisplay
                lives={gameUser.lives}
                lastLostAt={gameUser.last_life_lost_at}
              />

              {/* Talents */}
              <div className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full shadow-sm">
                💎 {gameUser.talents ?? 0}
              </div>
            </div>

            {/* Powerups */}
            <div className="text-[10px] md:text-[13px] flex justify-center gap-2 md:gap-3 flex-wrap">
              {Object.entries(gameUser.powerups_inventory || {}).map(
                ([key, count]) => (
                  <div
                    key={key}
                    className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full shadow-sm"
                  >
                    {getPowerUpIcon(key)} {count}
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
        <div className="hidden lg:flex flex-col w-60 p-4 gap-4 bg-white/20 backdrop-blur-md border-l border-gray-300">
          <button
            onClick={() => {
              playSound("optionSelect", effectsOn); // 🔊 play switch sound
              handleWeeklyChallengeClick();
            }}
            disabled={!challengeAllowed}
            className="bg-blue-500 text-white font-semibold rounded-full px-4 py-2 shadow hover:bg-blue-600"
          >
            {challengeAllowed && !challengePlayed
              ? "🥊 Weekend Challenge: Play Now"
              : challengePlayed
              ? " 🥊 Weekend Challenge: Already Played"
              : `🥊 Weekly Quiz: ${countdownText}`}
          </button>
          <button
            onClick={() => {
              playSound("optionSelect", effectsOn); // 🔊 play switch sound
              setShowTotalLeaderboard(!showTotalLeaderboard);
            }}
            className="bg-gray-700 text-white font-semibold rounded-full px-4 py-2 shadow hover:bg-gray-600"
          >
            {showTotalLeaderboard ? "🌟 Hide Leaderboard" : " 🌟 Leaderboard"}
          </button>
          {showTotalLeaderboard && totalLeaderboard.length > 0 && (
            <div className="bg-white border border-blue-400 rounded-md shadow p-1 mb-1">
              <h2 className="text-[11px] font-bold text-blue-700 mb-0.5">
                🏆 Overall Top Players
              </h2>
              <ol className="space-y-0.5 text-[10px]">
                {totalLeaderboard.map((entry, index) => (
                  <li key={index} className="flex justify-between">
                    <span>
                      {index + 1}. {entry.player_name || "Unnamed"}
                    </span>
                    <span>{entry.total_score} pts</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {weeklyLeaderboard.length > 0 && (
            <div className="bg-white border border-yellow-400 rounded-md shadow p-1">
              <h2 className="text-[11px] font-bold text-yellow-600 mb-0.5">
                🏆 Weekend Challenge Top 10
              </h2>
              <ol className="space-y-0.5 text-[10px]">
                {weeklyLeaderboard.map((entry, index) => (
                  <li key={index} className="flex justify-between">
                    <span>
                      {index + 1}. {entry.player_name || "Unnamed"}
                    </span>
                    <span>{entry.score} pts</span>
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
