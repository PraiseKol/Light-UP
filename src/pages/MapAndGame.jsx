// src/pages/MapAndGame.jsx
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
  const [currentPhaseIndex] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [completedLevels, setCompletedLevels] = useState([]);
  const [syncedPhase, setSyncedPhase] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const basePhase = levelPhases[currentPhaseIndex];

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

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
        console.log("🔍 Updated completedLevels:", completed);
        setCompletedLevels(completed);

        const updatedLevels = wrapLevelsWithNumberAndCompletion(completed);
        setSyncedPhase({ ...basePhase, levels: updatedLevels });
      }
    };

    loadProgress();
  }, [user]);

  const handleLevelComplete = async () => {
    console.log("Saving progress for user:", user?.id);

    if (!user || !selectedLevel?.id) return;

    // ✅ Save full progress record
    await saveProgress({
      level_id: selectedLevel.id,
      phase: selectedLevel.phaseNumber,
      mode: selectedLevel.mode,
      score: 0, // or actual score if available later
    });

    // ✅ Re-fetch updated progress list
    const updatedCompleted = await fetchProgress(user.id);
    console.log("🔍 Updated completedLevels:", updatedCompleted);
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
        phaseNumber: basePhase.phaseNumber,
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
                phaseNumber: basePhase.phaseNumber,
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
