// MapAndGame.jsx
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { levelPhases } from "../data/levelData";
import { useAuth } from "../auth/AuthProvider";
import { fetchProgress } from "../lib/fetchProgress";
import { saveProgress } from "../lib/saveProgress";

import AnimatedBackground from "../components/AnimatedBackground";
import LevelMap from "../components/LevelMap";
import GameScreen from "../components/GameScreen";
import AppToaster from "../components/ui/toaster";

export default function MapAndGame() {
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [completedLevels, setCompletedLevels] = useState([]);
  const [unlockedPhases, setUnlockedPhases] = useState([]);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  const [pendingNextLevel, setPendingNextLevel] = useState(null);

  const { user } = useAuth();
  const navigate = useNavigate();

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
    const firstIncomplete = phase.levels.find((lvl) => !completedLevels.includes(lvl.id));
    return firstIncomplete ? firstIncomplete.id : null;
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const loadProgress = async () => {
      const completed = await fetchProgress(user.id);
      setCompletedLevels(completed);

      const unlocked = determineUnlockedPhases(completed);
      setUnlockedPhases(unlocked);
    };

    loadProgress();
  }, [user, navigate]);

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

    const unlocked = determineUnlockedPhases(updatedCompleted);
    setUnlockedPhases(unlocked);

    const currentPhase = levelPhases.find(
      (p) => p.phaseNumber === selectedLevel.phaseNumber
    );

    const currentIdx = currentPhase.levels.findIndex((l) => l.id === selectedLevel.id);
    const nextLevel = currentPhase.levels[currentIdx + 1];

    setSelectedLevel(null);
    setShowUnlockAnimation(true);

    if (nextLevel) {
      setPendingNextLevel({
        ...nextLevel,
        number: currentIdx + 2,
        completed: updatedCompleted.includes(nextLevel.id),
        phaseNumber: currentPhase.phaseNumber,
      });
    } else {
      setPendingNextLevel(null);
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

  if (!user || !completedLevels) {
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
        {!selectedLevel ? (
          <div className="flex flex-col gap-8">
            {levelPhases.map((phase, index) => (
              <LevelMap
                key={index}
                phase={{
                  ...phase,
                  levels: wrapLevelsWithStatus(index, phase, completedLevels),
                }}
                phaseIndex={index}
                completedLevels={completedLevels}
                currentLevelId={getCurrentLevelId(phase)}
                onSelectLevel={(level, i) => setSelectedLevel(level)}
                isLocked={!unlockedPhases.includes(index)}
              />
            ))}
          </div>
        ) : (
          <GameScreen
            level={selectedLevel}
            onBack={() => setSelectedLevel(null)}
            onComplete={handleLevelComplete}
          />
        )}
      </div>

      <AppToaster />
    </div>
  );
}
