import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "components/ui/card";
import ProgressBar from "components/ui/progress";
import RightAnswerModal from "components/ui/RightAnswerModal";
import WrongAnswerModal from "components/ui/WrongAnswerModal";
import TimeUpModal from "components/ui/TimeUpModal";
import { Button } from "components/ui/button";
import { useTimer } from "hooks/useTimer";
import { useResetLevel } from "hooks/useResetLevel";
import { supabase } from "lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

const triviaBackground =
  "https://rhanvchqlilmzxmufode.supabase.co/storage/v1/object/public/backgrounds/TriviaBackground.png";

const getScoreFromTime = (timeLeft) => {
  if (timeLeft > 20) return 100;
    if (timeLeft > 10) return 75;
    return 50;
};

export default function TriviaMode({
  level,
  question,
  answer,
  options,
  onBack,
  onCorrect,
  onScore,
  onIncorrect,
  activePowerups,
}) {
  const userContext = useUser();
  const user = userContext?.id ? userContext : null;

  const [selected, setSelected] = useState(null);
  const [displayOptions, setDisplayOptions] = useState(options || []);
  const [status, setStatus] = useState("idle");
  const [score, setscore] = useState(0);
  const [showRightModal, setShowRightModal] = useState(false);
  const [showWrongModal, setShowWrongModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);

  const hasAnswered = useRef(false);
  const lifeLostRef = useRef(false);

  const { timeLeft, reset, setIsRunning, setTimeLeft } = useTimer(30, () => {
    if (hasAnswered.current) return;

    if (selected) {
      checkAnswer();
    } else {
      hasAnswered.current = true;
      setStatus("timeup");
      setShowTimeUpModal(true);
      if (!lifeLostRef.current && onIncorrect) {
        lifeLostRef.current = true;
        onIncorrect();
      }
    }
  });

  // ✅ Apply Grace Period
  useEffect(() => {
    if (activePowerups?.grace_period) {
      console.log("⏳ Grace Period active — adding 10 seconds");
      setTimeLeft((prev) => prev + 10);
      activePowerups?.setGraceUsed?.();
    }
  }, [activePowerups, setTimeLeft]);

  // ✅ Apply Divine Hint: Remove two wrong answers
  useEffect(() => {
    if (activePowerups?.divine_hint && Array.isArray(options) && options.length > 2) {
      const wrongOptions = options.filter(
        (opt) => opt.trim().toLowerCase() !== answer.trim().toLowerCase()
      );

      if (wrongOptions.length >= 2) {
        // Pick 1 wrong answer to keep alongside correct
        const keepWrong = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
        const newOptions = [answer, keepWrong].sort(() => Math.random() - 0.5);

        setDisplayOptions(newOptions);
        console.log("✨ Divine Hint applied — reduced options:", newOptions);
        activePowerups?.setDivineHintUsed?.();
      }
    }
  }, [activePowerups?.divine_hint, options, answer, activePowerups]);

  const resetLevel = useResetLevel({
    setModals: {
      setShowRightModal,
      setShowWrongModal,
      setShowTimeUpModal,
    },
    setUserInput: () => setSelected(null),
    setStatus,
    setTimeLeft: reset,
    setIsRunning,
    hasAnsweredRef: hasAnswered,
    onIncorrect,
    forceIncorrectLifeLoss: true,
    lifeLostRef,
  });

  const saveScore = async (newScore) => {
    if (!user) return;

    const { data: existing, error: fetchError } = await supabase
      .from("progress")
      .select("score")
      .eq("user_id", user.id)
      .eq("level_id", level.id)
      .eq("mode", "Trivia")
      .maybeSingle();

    if (fetchError) {
      console.error("Failed to check existing score:", fetchError);
      return;
    }

    const oldScore = existing?.score ?? 0;

    if (newScore > oldScore) {
      const { error: updateError } = await supabase
        .from("progress")
        .upsert(
          {
            user_id: user.id,
            level_id: level.id,
            mode: "Trivia",
            score: newScore,
          },
          { onConflict: ["user_id", "level_id"] }
        );

      if (updateError) {
        console.error("Failed to update score:", updateError);
      }
    }
  };

  const checkAnswer = () => {
    if (hasAnswered.current) return;
    hasAnswered.current = true;
    setIsRunning(false);

    const isCorrect =
      selected?.trim().toLowerCase() === answer.trim().toLowerCase();

    setStatus(isCorrect ? "correct" : "wrong");

    setTimeout(() => {
      if (isCorrect) {
        const score = getScoreFromTime(timeLeft);
        setscore(score);
        saveScore(score);
        if (onScore) onScore(score);
        setShowRightModal(true);
      } else {
        if (!lifeLostRef.current && onIncorrect) {
          lifeLostRef.current = true;
          onIncorrect();
        }
        setShowWrongModal(true);
      }
    }, 400);
  };

  return (
    <div
      className="min-h-screen flex justify-center items-center bg-cover bg-center px-4"
      style={{ backgroundImage: `url(${triviaBackground})` }}
    >
      <div className="w-full max-w-xl animate-fadeInUp">
        <Card className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-xl p-6">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600 font-medium">
                Phase {level?.phaseNumber} • Level {level?.number} Trivia
              </div>
              <div className="text-xs text-gray-500 font-semibold">
                {timeLeft}s
              </div>
            </div>
            <ProgressBar value={timeLeft} max={30} />
          </div>

          <CardHeader className="text-xl text-gray-800 mb-4">
            {question}
          </CardHeader>

          <CardContent>
            <div className="space-y-3 mb-6">
              {displayOptions.map((opt, i) => {
                const isSelected = selected === opt;
                const isDisabled = hasAnswered.current;

                return (
                  <button
                    key={i}
                    disabled={isDisabled}
                    onClick={() => {
                      if (!hasAnswered.current) setSelected(opt);
                    }}
                    className={`w-full px-4 py-3 rounded-md text-left border transition ${
                      isSelected
                        ? "border-blue-600 bg-blue-100 font-semibold"
                        : "border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <Button
              onClick={checkAnswer}
              disabled={!selected || hasAnswered.current}
              className="w-full bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              ✅ Submit
            </Button>
          </CardContent>
        </Card>
      </div>

      <RightAnswerModal
        isOpen={showRightModal}
        onClose={onCorrect}
        onNext={onCorrect}
        onBackToMap={() => window.location.reload()}
        score={score}
      />

      <WrongAnswerModal
        isOpen={showWrongModal}
        onRetry={resetLevel}
        onBack={() => window.location.reload()}
      />

      <TimeUpModal
        isOpen={showTimeUpModal}
        onTryAgain={resetLevel}
        onGoToMap={() => window.location.reload()}
      />
    </div>
  );
}
