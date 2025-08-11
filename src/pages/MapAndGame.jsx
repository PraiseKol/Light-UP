import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { levelPhases } from "data/levelData";
import { useAuth } from "auth/AuthProvider";
import { fetchProgress } from "lib/fetchProgress";
import { saveProgress } from "lib/saveProgress";
import { fetchTotalScore } from "lib/fetchTotalScore";
import { fetchRandomScripture } from "lib/fetchRandomScripture";
import { fetchLeaderboard } from "lib/fetchLeaderboard";
import { fetchMainLeaderboard } from "lib/api/leaderboard";
import { supabase } from "lib/supabaseClient";

import { useGameUser } from "hooks/useGameUser";
import { LivesDisplay } from "components/LivesDisplay";
import SpiritualParallaxBackground from "components/SpiritualParallaxBackground";
import LevelMap from "components/LevelMap";
import GameScreen from "components/GameScreen";
import AppToaster from "components/ui/toaster";
import ScriptureModal from "components/ScriptureModal";
import SettingsModal from "components/SettingsModal";
import FeedbackButton from "components/FeedbackButton";
import { toast } from "sonner";

import PowerUpStore from "components/PowerUpStore";
import Modal from "components/ui/modal";
import {
  determineUnlockedPhases,
  wrapLevelsWithStatus,
  getPowerUpIcon,
} from "utils/gameHelpers";

import {
  getWeeklyChallengeStatus,
  hasPlayedThisWeek,
} from "utils/weeklyChallenge";

export default function MapAndGame({ sound, setSound }) {
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [completedLevels, setCompletedLevels] = useState([]);
  const [unlockedPhases, setUnlockedPhases] = useState([]);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  const [pendingNextLevel, setPendingNextLevel] = useState(null);
  const [showScriptureModal, setShowScriptureModal] = useState(false);
  const [scriptureText, setScriptureText] = useState("");
  const [userScore, setUserScore] = useState(0);
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
  const phaseRefs = useRef([]);
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

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
  
    const loadProgressAndScore = async () => {
      const completed = await fetchProgress(user.id);
      setCompletedLevels(completed);
  
      const unlocked = determineUnlockedPhases(completed, levelPhases);
      setUnlockedPhases(unlocked);
  
      setUserScore(await fetchTotalScore(user.id));
  
      if (unlocked.length > 0) {
        const highestIndex = Math.max(...unlocked);
        setTimeout(() => {
          phaseRefs.current[highestIndex]?.scrollIntoView({
            behavior: "smooth",
            block: "end", // so it aligns at the bottom
          });
        }, 500);
      }      
    };
  
    loadProgressAndScore();
  }, [user, navigate, levelPhases]);
  

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

  useEffect(() => {
    const updateChallengeStatus = async () => {
      const { allowed, countdownText } = getWeeklyChallengeStatus();
      setChallengeAllowed(allowed);
      setCountdownText(countdownText);
      if (user?.id) {
        setChallengePlayed(await hasPlayedThisWeek(user.id));
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
    await saveProgress({
      level_id: selectedLevel.id,
      phase: selectedLevel.phaseNumber,
      mode: selectedLevel.mode,
      score: 0,
    });
    const updatedCompleted = await fetchProgress(user.id);
    setCompletedLevels(updatedCompleted);
    setSelectedLevel(null);
    setUnlockedPhases(determineUnlockedPhases(updatedCompleted, levelPhases));
    setUserScore(await fetchTotalScore(user.id));
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
      setShowNextLevelModal(true); // Show modal
    } else {
      setScriptureText(
        (await fetchRandomScripture()) ||
          "“The Lord will fight for you; you need only to be still.” — Exodus 14:14"
      );
      setShowScriptureModal(true);
    }
    await refetch?.();
  };

  const handleScore = async (score) => {
    if (!user || !selectedLevel?.id) return;
    await saveProgress({
      level_id: selectedLevel.id,
      phase: selectedLevel.phaseNumber,
      mode: selectedLevel.mode,
      score,
    });
    setUserScore(await fetchTotalScore(user.id));
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

  if (!user || gameUserLoading || !completedLevels) {
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
        <div className="lg:hidden fixed top-2 left-2 z-50">
          <br></br>
          <button
            onClick={() => setMobileActionsOpen(!mobileActionsOpen)}
            className="p-2 bg-blue-600 text-white rounded-md shadow-lg focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileActionsOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Overlay (click outside to close) */}
        {mobileActionsOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-40"
            onClick={() => setMobileActionsOpen(false)}
          />
        )}
        {/* Mobile Sidebar */}
        <div
          className={`fixed top-0 left-0 h-full w-64 bg-white/60 backdrop-blur-md p-4 border-r border-gray-300 z-50 transform transition-transform duration-300 ease-in-out
          ${mobileActionsOpen ? "translate-x-0" : "-translate-x-full"}
           `}
        >
          {/* Close button (optional) */}
          <button
            onClick={() => setMobileActionsOpen(false)}
            className="mb-4 p-2 bg-red-500 text-white rounded-md"
          >
            ✕
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="w-full mb-2 text-left text-blue-700 font-semibold border border-blue-500 rounded-full px-4 py-2 shadow hover:bg-blue-50"
          >
            ⚙️ Settings
          </button>
          <button
            onClick={() => setShowStore(true)}
            className="w-full mb-2 text-left bg-yellow-800 text-white font-semibold rounded-full px-4 py-2 shadow hover:bg-yellow-900"
          >
            🛒 🎁 Store
          </button>
          <button
            onClick={() => navigate("/multiplayer/create")}
            className="w-full mb-2 text-left bg-green-500 text-white font-semibold rounded-full px-4 py-2 shadow hover:bg-green-600"
          >
            🎮 Multiplayer
          </button>

          <button
            onClick={handleWeeklyChallengeClick}
            disabled={!challengeAllowed}
            className="w-full mb-2 text-left bg-blue-500 text-white font-semibold rounded-full px-4 py-2 shadow hover:bg-blue-600"
          >
            {challengeAllowed && !challengePlayed
              ? "🥊 Weekly Challenge"
              : challengePlayed
              ? "🥊 Played"
              : `🥊 Quiz: ${countdownText}`}
          </button>

          <div className="overflow-y-auto max-h-[50vh] mt-4">
            {totalLeaderboard.length > 0 && (
              <div className="bg-white border border-blue-400 rounded-lg shadow-lg p-3 mb-4">
                <h2 className="text-sm font-bold text-blue-700 mb-2">
                  🏆 Top Players
                </h2>
                <ol className="space-y-1 text-xs">
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
              <div className="bg-white border border-yellow-400 rounded-lg shadow-lg p-3">
                <h2 className="text-sm font-bold text-yellow-600 mb-2">
                  🏆 Weekly Top 10
                </h2>
                <ol className="space-y-1 text-xs">
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
          </div>

          <div className="mt-4">
            <FeedbackButton fullWidth />
          </div>
        </div>

        {/* LEFT SIDEBAR (desktop) */}
        <div className="hidden lg:flex flex-col w-60 p-4 gap-4 bg-white/40 backdrop-blur-md border-r border-gray-300">
          <button
            onClick={() => setShowSettings(true)}
            className="bg-white text-blue-700 font-semibold border border-blue-500 rounded-full px-4 py-2 shadow hover:bg-blue-50"
          >
            ⚙️ Settings
          </button>
          <button
            onClick={() => setShowStore(true)}
            className="bg-yellow-800 text-white font-semibold rounded-full px-4 py-2 shadow hover:bg-yellow-900"
          >
            🎁 Store
          </button>
          <button
            onClick={() => navigate("/multiplayer/create")}
            className="bg-green-500 text-white font-semibold rounded-full px-4 py-2 shadow hover:bg-green-600"
          >
            🎮 Multiplayer
          </button>
        </div>

        {/* CENTER CONTENT */}
        <div className="flex-1 overflow-y-auto max-h-screen p-4">
          {/* Sticky Header */}
          <br></br> <br></br>
          <div className="sticky top-0 z-40 bg-white py-2 px-4 shadow-sm flex flex-wrap justify-between items-center text-sm md:text-base font-semibold text-blue-700 gap-4">
            <div className="truncate"> {gameUser.player_name || "Unnamed"}</div>
            <div className="flex items-center gap-1">
              💎 Talents: {gameUser.talents ?? 0}
            </div>
            <div>Total Score: {userScore}</div>
            <LivesDisplay
              lives={gameUser.lives}
              lastLostAt={gameUser.last_life_lost_at}
            />
            <div className="flex gap-4">
              {Object.entries(gameUser.powerups_inventory || {}).map(
                ([key, count]) => (
                  <div key={key} className="flex items-center gap-1">
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
                        if (gameUser.lives > 0) setSelectedLevel(level);
                        else
                          toast.error(
                            "You're out of lives! Please wait to get more."
                          );
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <GameScreen
              level={selectedLevel}
              onBack={() => {
                setSelectedLevel(null);
                refetch?.();
              }}
              onComplete={handleLevelComplete}
              onScore={handleScore}
              userScore={userScore}
              refetchGameUser={refetch}
            />
          )}
        </div>

        {/* RIGHT SIDEBAR (desktop) */}
        <div className="hidden lg:flex flex-col w-60 p-4 gap-4 bg-white/20 backdrop-blur-md border-l border-gray-300">
          <button
            onClick={handleWeeklyChallengeClick}
            disabled={!challengeAllowed}
            className="bg-blue-500 text-white font-semibold rounded-full px-4 py-2 shadow hover:bg-blue-600"
          >
            {challengeAllowed && !challengePlayed
              ? "🥊 Weekly Challenge"
              : challengePlayed
              ? " 🥊 Weekly Challenge: Played"
              : `🥊 Weekly Quiz: ${countdownText}`}
          </button>
          <button
            onClick={() => setShowTotalLeaderboard(!showTotalLeaderboard)}
            className="bg-gray-700 text-white font-semibold rounded-full px-4 py-2 shadow hover:bg-gray-600"
          >
            {showTotalLeaderboard ? "🌟 Hide Leaderboard" : " 🌟 Leaderboard"}
          </button>
          {showTotalLeaderboard && totalLeaderboard.length > 0 && (
            <div className="bg-white border border-blue-400 rounded-lg shadow-lg p-4 overflow-y-auto max-h-full">
              <h2 className="text-lg font-bold text-blue-700 mb-2">
                🏆 Top Players
              </h2>
              <ol className="space-y-1 text-sm">
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
            <div className="bg-white border border-yellow-400 rounded-lg shadow-lg p-4 overflow-y-auto max-h-full">
              <h2 className="text-lg font-bold text-yellow-600 mb-2">
                🏆 Weekly Top 10
              </h2>
              <ol className="space-y-1 text-sm">
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
          <div className="mt-auto">
            <FeedbackButton />
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
        <PowerUpStore gameUser={gameUser} onPurchase={refetch} />
      </Modal>
      {showScriptureModal && (
        <ScriptureModal text={scriptureText} onNext={handleNextPhaseScroll} />
      )}
      <AppToaster />
    </div>
  );
}
