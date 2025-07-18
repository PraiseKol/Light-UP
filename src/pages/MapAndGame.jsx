// src/pages/MapAndGame.jsx
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
  const [currentPhaseIndex] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [completedLevels, setCompletedLevels] = useState([]);
  const [syncedPhase, setSyncedPhase] = useState(null);
  const { user } = useAuth();

  const basePhase = levelPhases[currentPhaseIndex];

  const wrapLevelsWithNumberAndCompletion = (completedIds) => {
    return basePhase.levels.map((level, index) => ({
      ...level,
      number: index + 1,
      completed: completedIds.includes(level.id),
    }));
  };

  useEffect(() => {
    const loadProgress = async () => {
      if (user) {
        const completed = await fetchProgress(user.id);
        setCompletedLevels(completed);

        const updatedLevels = wrapLevelsWithNumberAndCompletion(completed);
        setSyncedPhase({ ...basePhase, levels: updatedLevels });
      }
    };

    loadProgress();
  }, [user]);

  const handleLevelComplete = async () => {
    if (!user || !selectedLevel?.id) return;

    await saveProgress(user.id, selectedLevel.id);

    const updatedCompleted = await fetchProgress(user.id);
    setCompletedLevels(updatedCompleted);

    const updatedLevels = wrapLevelsWithNumberAndCompletion(updatedCompleted);
    setSyncedPhase({ ...basePhase, levels: updatedLevels });

    const currentIdx = basePhase.levels.findIndex(
      (l) => l.id === selectedLevel.id
    );
    const nextLevel = basePhase.levels[currentIdx + 1];

    if (nextLevel) {
      setSelectedLevel({
        ...nextLevel,
        number: currentIdx + 2,
        completed: updatedCompleted.includes(nextLevel.id),
        phaseNumber: basePhase.phaseNumber, // ✅ make sure it's included
      });
    } else {
      setSelectedLevel(null);
    }
  };

  if (!syncedPhase) {
    return <div className="text-center p-6">Loading map...</div>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 max-w-4xl mx-auto p-4">
        {!selectedLevel ? (
          <LevelMap
            phase={syncedPhase}
            onSelectLevel={(level, index) =>
              setSelectedLevel({
                ...level,
                number: index + 1,
                phaseNumber: basePhase.phaseNumber, // ✅ Fix added here
              })
            }
          />
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
