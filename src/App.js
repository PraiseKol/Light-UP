// src/App.jsx
import { useState } from 'react';
import { levelPhases } from './data/levelData';
import LevelMap from './components/LevelMap';
import GameScreen from './components/GameScreen';
import AnimatedBackground from './components/AnimatedBackground';
import AppToaster from './components/ui/toaster'; // custom toaster using react-hot-toast

export default function App() {
  const [currentPhaseIndex] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState(null);

  const currentPhase = levelPhases[currentPhaseIndex];

  const handleLevelComplete = () => {
    setSelectedLevel(null);
    // Optionally unlock next level logic here
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 max-w-4xl mx-auto p-4">
        {!selectedLevel ? (
          <LevelMap
            phase={currentPhase}
            onSelectLevel={(level) => setSelectedLevel(level)}
          />
        ) : (
          <GameScreen
            level={selectedLevel}
            onBack={() => setSelectedLevel(null)}
            onComplete={handleLevelComplete}
          />
        )}
      </div>

      <AppToaster /> {/* Toasts show globally */}
    </div>
  );
}
