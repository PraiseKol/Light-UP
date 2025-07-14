// src/components/GameScreen.jsx
import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import ProgressBar from "../components/ui/progress";
import { toast } from "react-hot-toast";

import TriviaMode from "../modes/TriviaMode";
import WordFillMode from "../modes/WordFillMode";
import ScriptureMatchMode from "../modes/ScriptureMatchMode";
import FourPicsMode from "../modes/FourPicsMode";

export default function GameScreen({ level, onBack, onComplete }) {
  const [progress, setProgress] = useState(0);

  const handleLevelComplete = () => {
    setProgress(100);
    toast.success("🎉 Level completed!");
    onComplete(); // proceed immediately without modal
  };

  const renderMode = () => {
    const modeProps = {
      onComplete: handleLevelComplete,
      onBack,
    };

    switch (level.mode) {
      case "trivia":
        return <TriviaMode {...modeProps} />;
      case "word-fill":
        return <WordFillMode {...modeProps} />;
      case "scripture-match":
        return <ScriptureMatchMode {...modeProps} />;
      case "four-pics":
        return <FourPicsMode {...modeProps} />;
      default:
        return (
          <Card className="w-full max-w-lg text-center">
            <CardContent className="p-6">
              <p className="text-lg">
                Game mode <strong>{level.mode}</strong> is coming soon!
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="relative animate-fadeInUp">
      

      <div className="pt-12 pb-4 text-center">
        <h2 className="text-2xl font-bold text-charcoal">
          Level {level.number} —{" "}
          <span className="capitalize">{level.mode.replace("-", " ")}</span>
        </h2>
        <div className="mt-4 max-w-sm mx-auto">
          <ProgressBar value={progress} className="h-2 bg-gray-200" />
        </div>
      </div>

      <div className="flex justify-center px-4">{renderMode()}</div>
    </div>
  );
}
