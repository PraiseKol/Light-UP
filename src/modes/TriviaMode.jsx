import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import ProgressBar from "@/components/ui/progress";
import RightAnswerModal from "@/components/ui/RightAnswerModal";
import WrongAnswerModal from "@/components/ui/WrongAnswerModal";
import TimeUpModal from "@/components/ui/TimeUpModal";
import { Button } from "@/components/ui/button";
import { useTimer } from "@/hooks/useTimer";
import { useResetLevel } from "@/hooks/useResetLevel";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { playSound } from "@/utils/sound";

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
  effectsOn = true,
  gameUser,
}) {
  const userContext = useUser();
  const user = userContext?.id ? userContext : null;

  const [selected, setSelected] = useState(null);
  const [displayOptions, setDisplayOptions] = useState(options || []);
  const [status, setStatus] = useState("idle");
  const [score, setScore] = useState(0);
  const [showRightModal, setShowRightModal] = useState(false);
  const [showWrongModal, setShowWrongModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);

  const hasAnswered = useRef(false);
  const lifeLostRef = useRef(false);
  const cardContentRef = useRef(null);

  const { timeLeft, reset, setIsRunning, setTimeLeft } = useTimer(30, () => {
    setIsRunning(false);
    if (hasAnswered.current) return;

    if (selected) {
      checkAnswer();
    } else {
      hasAnswered.current = true;
      setStatus("timeup");
      playSound("error", effectsOn);
      if (!lifeLostRef.current && onIncorrect) {
        lifeLostRef.current = true;
        onIncorrect();
      }
      setShowTimeUpModal(true);
    }
  });

  useEffect(() => {
    cardContentRef.current?.focus();
  }, []);

  useEffect(() => {
    if (activePowerups?.grace_period) {
      setTimeLeft((prev) => prev + 15);
      activePowerups?.setGraceUsed?.();
    }
  }, [activePowerups, setTimeLeft]);

  useEffect(() => {
    if (
      activePowerups?.divine_hint &&
      Array.isArray(options) &&
      options.length > 2
    ) {
      const wrongOptions = options.filter(
        (opt) => opt.trim().toLowerCase() !== answer.trim().toLowerCase()
      );
      if (wrongOptions.length >= 2) {
        const keepWrong =
          wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
        const newOptions = [answer, keepWrong].sort(() => Math.random() - 0.5);
        setDisplayOptions(newOptions);
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

  const saveScore = async (earnedScore) => {
    if (!user || !level) return;

    const levelId = `phase-${level.phaseNumber}-level-${level.number}`;

    try {
      const { data: existing } = await supabase
        .from("progress")
        .select("score")
        .eq("user_id", user.id)
        .eq("level_id", levelId)
        .maybeSingle();

      const oldScore = existing?.score ?? 0;

      if (earnedScore > oldScore) {
        await supabase.from("progress").upsert(
          {
            user_id: user.id,
            level_id: levelId,
            phase: level.phaseNumber,
            mode: "Trivia",
            score: earnedScore,
          },
          { onConflict: ["user_id", "level_id"] }
        );
      }
    } catch (err) {
      console.error("Failed to save Trivia score:", err);
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
        playSound("success", effectsOn);
        lifeLostRef.current = true;
        const earned = getScoreFromTime(timeLeft);
        setScore(earned);
        saveScore(earned);
        if (onScore) onScore(earned);
        setShowRightModal(true);
      } else {
        playSound("error", effectsOn);
        if (!lifeLostRef.current && onIncorrect) {
          lifeLostRef.current = true;
          onIncorrect();
        }
        setShowWrongModal(true);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-b from-[#1a365d] via-[#2d3748] to-[#1a202c] px-2 md:px-4 py-4">
      <div className="w-full max-w-xl animate-fadeInUp">
        <Card className="bg-gradient-to-br from-pink-50 via-white to-blue-50 backdrop-blur-md border-4 border-pink-300 shadow-2xl p-3 md:p-6 rounded-2xl">
          <div className="space-y-1 mb-2 md:mb-4">
            <div className="flex justify-between items-center">
              <div className="text-xs md:text-sm text-pink-700 font-bold">
                Phase {level?.phaseNumber} • Level {level?.number} Trivia
              </div>
              <div className="text-[10px] md:text-xs text-orange-600 font-black bg-yellow-100 px-2 py-1 rounded-full">
                {timeLeft}s
              </div>
            </div>
            
            <ProgressBar value={timeLeft} max={30} />
          
          </div>

          <CardHeader className="text-sm md:text-xl text-gray-900 font-bold mb-4 leading-snug">
            {question}
          </CardHeader>

          <CardContent
            ref={cardContentRef}
            tabIndex={0}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                selected !== null &&
                !hasAnswered.current
              ) {
                playSound("submitAnswer", effectsOn);
                checkAnswer();
              }
            }}
          >
            <div className="space-y-2 md:space-y-3 mb-3 md:mb-6">
              {displayOptions.map((opt, i) => {
                const isSelected = selected === opt;
                const isDisabled = hasAnswered.current;

                return (
                  <button
                    key={i}
                    disabled={isDisabled}
                    onClick={() => {
                      if (!hasAnswered.current) setSelected(opt);
                      playSound("optionSelect", effectsOn);
                    }}
                    className={`w-full px-3 md:px-4 py-2 md:py-3 rounded-xl text-left font-semibold border-2 transition-all shadow-lg ${
                      isSelected
                        ? "border-pink-500 bg-gradient-to-r from-pink-100 to-yellow-100 scale-105 shadow-pink-300"
                        : "border-gray-300 bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-300"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <Button
              onClick={() => {
                playSound("submitAnswer", effectsOn);
                checkAnswer();
              }}
              disabled={!selected || hasAnswered.current}
              className="w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white font-black text-lg py-3 rounded-xl shadow-[0_4px_0_#059669] hover:scale-105 active:translate-y-1 active:shadow-[0_2px_0_#059669] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✅ Submit Answer
            </Button>
          </CardContent>
        </Card>
      </div>

      <RightAnswerModal
        isOpen={showRightModal}
        onClose={onCorrect}
        onNext={onCorrect}
        onBackToMap={onBack}
        score={score}
        effectsOn={effectsOn}
      />

      <WrongAnswerModal
        isOpen={showWrongModal}
        onRetry={() => resetLevel({ skipIncorrect: true })}
        onBack={onBack}
        effectsOn={effectsOn}
        currentLives={gameUser?.lives || 0}
      />

      <TimeUpModal
        isOpen={showTimeUpModal}
        onTryAgain={() => resetLevel({ skipIncorrect: true })}
        onGoToMap={onBack}
        effectsOn={effectsOn}
        currentLives={gameUser?.lives || 0}
      />
    </div>
  );
}
