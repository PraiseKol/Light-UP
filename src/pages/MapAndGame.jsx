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
import AnimatedBackground from "components/AnimatedBackground";
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
  getWeeklyChallengeStatus,
  hasPlayedThisWeek,
} from "utils/weeklyChallenge";

export default function MapAndGame() {
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
  const [showTotalLeaderboard, setShowTotalLeaderboard] = useState(false);
  const [showStore, setShowStore] = useState(false);

  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const { user } = useAuth();
  const { gameUser, loading: gameUserLoading, refetch } = useGameUser(user?.id);
  const navigate = useNavigate();
  const phaseRefs = useRef([]);

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
      const unlocked = determineUnlockedPhases(completed);
      setUnlockedPhases(unlocked);
      setUserScore(await fetchTotalScore(user.id));
      if (unlocked.length > 0) {
        const highestIndex = Math.max(...unlocked);
        setTimeout(() => {
          phaseRefs.current[highestIndex]?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 500);
      }
    };
    loadProgressAndScore();
  }, [user, navigate]);

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

  const determineUnlockedPhases = (completedIds) => {
    const unlocked = [];
    for (let i = 0; i < levelPhases.length; i++) {
      const isFirst = i === 0;
      const lastLevelId = !isFirst ? levelPhases[i - 1].levels.at(-1).id : null;
      if (isFirst || completedIds.includes(lastLevelId)) unlocked.push(i);
    }
    return unlocked;
  };

  const wrapLevelsWithStatus = (phaseIndex, phase, completedIds) =>
    phase.levels.map((level, index) => ({
      ...level,
      number: index + 1,
      completed: completedIds.includes(level.id),
      phaseNumber: levelPhases[phaseIndex].phaseNumber,
    }));

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
    setUnlockedPhases(determineUnlockedPhases(updatedCompleted));
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

  const getPowerUpIcon = (key) => {
    switch (key) {
      case "divine_hint":
        return "💡";
      case "grace_period":
        return "⏳";
      case "holy_shield":
        return "🛡️";
      case "heavenly_match":
        return "✨";
      default:
        return "🎁";
    }
  };

  if (!user || gameUserLoading || !completedLevels) {
    return <div className="text-center p-6">Loading map...</div>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />
      <div className="flex min-h-screen">
        {/* LEFT SIDEBAR */}
        <div
          className={`${
            leftOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 transition-transform fixed lg:static lg:flex flex-col w-60 p-4 gap-4 bg-white/70 backdrop-blur-md border-r border-gray-300 z-50`}
        >
          <button
            onClick={() => setShowSettings(true)}
            className="bg-white text-blue-700 font-semibold border border-blue-500 rounded-full px-4 py-2 shadow hover:bg-blue-50"
          >
            Settings
          </button>
          <button
            onClick={() => setShowStore(true)}
            className="bg-purple-500 text-white font-semibold rounded-full px-4 py-2 shadow hover:bg-purple-600"
          >
            🛒 Store
          </button>
          <button
            onClick={() => navigate("/multiplayer/create")}
            className="bg-green-500 text-white font-semibold rounded-full px-4 py-2 shadow hover:bg-green-600"
          >
            Create Multiplayer Game
          </button>
        </div>

        {/* CENTER */}
        <div className="flex-1 overflow-y-auto max-h-screen p-4">
          {/* Mobile Sidebar Toggles */}
          <div className="flex justify-between mb-4 lg:hidden">
            <button
              onClick={() => setLeftOpen(!leftOpen)}
              className="bg-blue-500 text-white px-3 py-1 rounded"
            >
              ☰ Menu
            </button>
            <button
              onClick={() => setRightOpen(!rightOpen)}
              className="bg-yellow-500 text-white px-3 py-1 rounded"
            >
              ☰ Actions
            </button>
          </div>

          {/* Sticky Header */}
          <div className="sticky top-0 z-40 bg-white py-2 px-4 shadow-sm flex flex-wrap justify-between items-center text-sm md:text-base font-semibold text-blue-700 gap-4">
            <div className="truncate">{gameUser.player_name || "Unnamed"}</div>
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

          {/* Mobile Left Sidebar Content */}
          {leftOpen && (
            <div className="bg-white p-4 shadow mb-4 lg:hidden space-y-4">
              <button
                onClick={() => setShowSettings(true)}
                className="bg-white text-blue-700 font-semibold border border-blue-500 rounded-full px-4 py-2 shadow hover:bg-blue-50 w-full"
              >
                Settings
              </button>
              <button
                onClick={() => setShowStore(true)}
                className="bg-purple-500 text-white font-semibold rounded-full px-4 py-2 shadow hover:bg-purple-600 w-full"
              >
                🛒 Store
              </button>
              <button
                onClick={() => navigate("/multiplayer/create")}
                className="bg-green-500 text-white font-semibold rounded-full px-4 py-2 shadow hover:bg-green-600 w-full"
              >
                Create Multiplayer Game
              </button>
            </div>
          )}

          {/* Mobile Right Sidebar Content */}
          {rightOpen && (
            <div className="bg-white p-4 shadow mb-4 lg:hidden space-y-4">
              <button
                onClick={handleWeeklyChallengeClick}
                disabled={!challengeAllowed}
                className="bg-yellow-500 text-white font-semibold rounded-full px-4 py-2 shadow hover:bg-yellow-600 w-full"
              >
                {challengeAllowed && !challengePlayed
                  ? "Weekly Challenge"
                  : challengePlayed
                  ? "Weekly Challenge: Already Played"
                  : `Weekly Quiz: ${countdownText}`}
              </button>
              <button
                onClick={() => setShowTotalLeaderboard(!showTotalLeaderboard)}
                className="bg-gray-700 text-white font-semibold rounded-full px-4 py-2 shadow hover:bg-gray-600 w-full"
              >
                {showTotalLeaderboard ? "Hide Leaderboard" : "Total Leaderboard"}
              </button>
              {showTotalLeaderboard && totalLeaderboard.length > 0 && (
                <div className="bg-white border border-blue-400 rounded-lg shadow-lg p-4">
                  <h2 className="text-lg font-bold text-blue-700 mb-2">
                    🌟 Top Players
                  </h2>
                  <ol className="space-y-1 text-sm">
                    {totalLeaderboard.map((entry, index) => (
                      <li key={index} className="flex justify-between">
                        <span>{index + 1}. {entry.player_name || "Unnamed"}</span>
                        <span>{entry.total_score} pts</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {weeklyLeaderboard.length > 0 && (
                <div className="bg-white border border-yellow-400 rounded-lg shadow-lg p-4">
                  <h2 className="text-lg font-bold text-yellow-600 mb-2">
                    🏆 Weekly Top 10
                  </h2>
                  <ol className="space-y-1 text-sm">
                    {weeklyLeaderboard.map((entry, index) => (
                      <li key={index} className="flex justify-between">
                        <span>{index + 1}. {entry.player_name || "Unnamed"}</span>
                        <span>{entry.score} pts</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <FeedbackButton />
            </div>
          )}

          {/* Main Map */}
          {!selectedLevel ? (
            <div className="flex flex-col gap-8">
              {levelPhases.map((phase, index) => {
                const isUnlocked = unlockedPhases.includes(index);
                const wrappedLevels = wrapLevelsWithStatus(
                  index,
                  phase,
                  completedLevels
                );
                const currentPhaseId = getCurrentLevelId(phase);
                return (
                  <div
                    key={index}
                    ref={(el) => (phaseRefs.current[index] = el)}
                    className="relative"
                  >
                    <LevelMap
                      phase={{ ...phase, levels: wrappedLevels }}
                      phaseIndex={index}
                      completedLevels={completedLevels}
                      currentLevelId={currentPhaseId}
                      isLocked={!isUnlocked}
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
        <div
          className={`${
            rightOpen ? "translate-x-0" : "translate-x-full"
          } lg:translate-x-0 transition-transform fixed lg:static lg:flex flex-col w-60 p-4 gap-4 bg-white/70 backdrop-blur-md border-l border-gray-300 z-50`}
        >
          <button
            onClick={handleWeeklyChallengeClick}
            disabled={!challengeAllowed}
            className="bg-yellow-500 text-white font-semibold rounded-full px-4 py-2 shadow hover:bg-yellow-600"
          >
            {challengeAllowed && !challengePlayed
              ? "Weekly Challenge"
              : challengePlayed
              ? "Weekly Challenge: Already Played"
              : `Weekly Quiz: ${countdownText}`}
          </button>
          <button
            onClick={() => setShowTotalLeaderboard(!showTotalLeaderboard)}
            className="bg-gray-700 text-white font-semibold rounded-full px-4 py-2 shadow hover:bg-gray-600"
          >
            {showTotalLeaderboard ? "Hide Leaderboard" : "Total Leaderboard"}
          </button>
          {showTotalLeaderboard && totalLeaderboard.length > 0 && (
            <div className="bg-white border border-blue-400 rounded-lg shadow-lg p-4 overflow-y-auto max-h-full">
              <h2 className="text-lg font-bold text-blue-700 mb-2">
                🌟 Top Players
              </h2>
              <ol className="space-y-1 text-sm">
                {totalLeaderboard.map((entry, index) => (
                  <li key={index} className="flex justify-between">
                    <span>{index + 1}. {entry.player_name || "Unnamed"}</span>
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
                    <span>{index + 1}. {entry.player_name || "Unnamed"}</span>
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
      />
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
