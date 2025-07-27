// MapAndGame.jsx

import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { levelPhases } from "data/levelData";
import { useAuth } from "auth/AuthProvider";
import { fetchProgress } from "lib/fetchProgress";
import { saveProgress } from "lib/saveProgress";
import { fetchTotalScore } from "lib/fetchTotalScore";
import { fetchRandomScripture } from "lib/fetchRandomScripture";

import { useGameUser } from "hooks/useGameUser";
import { LivesDisplay } from "components/LivesDisplay";

import AnimatedBackground from "components/AnimatedBackground";
import LevelMap from "components/LevelMap";
import GameScreen from "components/GameScreen";
import AppToaster from "components/ui/toaster";
import ScriptureModal from "components/ScriptureModal";
import { toast } from "sonner";

export default function MapAndGame() {
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [completedLevels, setCompletedLevels] = useState([]);
  const [unlockedPhases, setUnlockedPhases] = useState([]);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  const [pendingNextLevel, setPendingNextLevel] = useState(null);
  const [showScriptureModal, setShowScriptureModal] = useState(false);
  const [scriptureText, setScriptureText] = useState("");
  const [userScore, setUserScore] = useState(0);

  const { user } = useAuth();
  const { gameUser, loading: gameUserLoading, refetch } = useGameUser(user?.id);
  const navigate = useNavigate();
  const phaseRefs = useRef([]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const loadProgressAndScore = async () => {
      const completed = await fetchProgress(user.id);
      setCompletedLevels(completed);
      setUnlockedPhases(determineUnlockedPhases(completed));

      const score = await fetchTotalScore(user.id);
      setUserScore(score);
    };

    loadProgressAndScore();
  }, [user, navigate]);

  const determineUnlockedPhases = (completedIds) => {
    const unlocked = [];
    for (let i = 0; i < levelPhases.length; i++) {
      const isFirst = i === 0;
      const lastLevelId = !isFirst ? levelPhases[i - 1].levels.at(-1).id : null;
      if (isFirst || completedIds.includes(lastLevelId)) {
        unlocked.push(i);
      }
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
      (lvl) => !completedLevels.includes(lvl.id)
    );
    return firstIncomplete ? firstIncomplete.id : null;
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

    const unlocked = determineUnlockedPhases(updatedCompleted);
    setUnlockedPhases(unlocked);

    const updatedScore = await fetchTotalScore(user.id);
    setUserScore(updatedScore);

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
      const fetchedScripture = await fetchRandomScripture();
      setScriptureText(
        fetchedScripture ||
          "“The Lord will fight for you; you need only to be still.” — Exodus 14:14"
      );
      setShowScriptureModal(true);
    }

    // 🆕 Optional: update gameUser lives after level is completed
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

    const updatedScore = await fetchTotalScore(user.id);
    setUserScore(updatedScore);
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

  useEffect(() => {
    if (showUnlockAnimation) {
      const timer = setTimeout(() => {
        setShowUnlockAnimation(false);
        if (pendingNextLevel) {
          setSelectedLevel(pendingNextLevel);
          setPendingNextLevel(null);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showUnlockAnimation, pendingNextLevel]);

  if (!user || gameUserLoading || !completedLevels) {
    return <div className="text-center p-6">Loading map...</div>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />

      {showUnlockAnimation && (
        <div className="fixed inset-0 flex items-center justify-center bg-white/80 z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="glow-path-animation w-64 h-2 bg-gradient-to-r from-gold to-yellow-400 animate-pulse rounded-full shadow-lg"></div>
            <p className="text-xl font-semibold text-charcoal">
              Next Level Unlocked!
            </p>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-3xl mx-auto p-4 overflow-y-auto max-h-[90vh] space-y-6">
        <div className="flex justify-between items-center text-base font-semibold text-blue-700 px-2">
          <div>Total Score: {userScore}</div>
          <LivesDisplay
            lives={gameUser.lives}
            lastLostAt={gameUser.last_life_lost_at}
          />
        </div>

        {!selectedLevel ? (
          <div className="flex flex-col gap-8 relative">
            {levelPhases.map((phase, index) => {
              const isUnlocked = unlockedPhases.includes(index);
              const wrappedLevels = wrapLevelsWithStatus(index, phase, completedLevels);
              const currentPhaseId = getCurrentLevelId(phase);

              return (
                <div key={index} ref={(el) => (phaseRefs.current[index] = el)} className="relative">
                  {gameUser.lives <= 0 && isUnlocked && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 rounded-lg" />
                  )}

                  <LevelMap
                    phase={{ ...phase, levels: wrappedLevels }}
                    phaseIndex={index}
                    completedLevels={completedLevels}
                    currentLevelId={currentPhaseId}
                    isLocked={!isUnlocked}
                    onSelectLevel={(level) => {
                      if (gameUser.lives > 0) {
                        setSelectedLevel(level);
                      } else {
                        toast.error("You're out of lives! Please wait to get more.");
                      }
                    }}
                  />

                  {gameUser.lives <= 0 && isUnlocked && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center">
                      <div className="text-center space-y-2 text-lg font-semibold text-red-600 bg-white bg-opacity-90 px-4 py-3 rounded-md shadow-md">
                        <p>😢 You're out of lives</p>
                        <LivesDisplay
                          lives={gameUser.lives}
                          lastLostAt={gameUser.last_life_lost_at}
                        />
                        <p className="text-sm text-gray-700">Wait for lives to regenerate.</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <GameScreen
            level={selectedLevel}
            onBack={() => {
              setSelectedLevel(null);
              refetch?.(); // 🆕 Refresh gameUser lives when exiting level
            }}
            onComplete={handleLevelComplete}
            onScore={handleScore}
            userScore={userScore}
            refetchGameUser={refetch} // 🆕 Pass to GameScreen
          />
        )}
      </div>

      {showScriptureModal && (
        <ScriptureModal text={scriptureText} onNext={handleNextPhaseScroll} />
      )}

      <AppToaster />
    </div>
  );
}
