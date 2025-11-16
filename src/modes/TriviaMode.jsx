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
  effectsOn = true,
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
    if (hasAnswered.current) return;

    if (selected) {
      checkAnswer();
    } else {
      hasAnswered.current = true;
      setStatus("timeup");
      playSound("error", effectsOn);
      setShowTimeUpModal(true);
      if (!lifeLostRef.current && onIncorrect) {
        lifeLostRef.current = true;
        onIncorrect();
      }
    }
  });

  useEffect(() => {
    cardContentRef.current?.focus();
  }, []);

  // Grace Period
  useEffect(() => {
    if (activePowerups?.grace_period) {
      setTimeLeft((prev) => prev + 15);
      activePowerups?.setGraceUsed?.();
    }
  }, [activePowerups, setTimeLeft]);

  // Divine Hint: reduce options
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

    const levelId = `phase-${level.phaseNumber}-level-${level.number}`; // unique levelId

    try {
      // Upsert score (only overwrite if new score is higher)
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
    <div
      className="min-h-screen flex justify-center items-center bg-cover bg-center px2 md:px-4"
      style={{ backgroundImage: `url(${triviaBackground})` }}
    >
      <div className="w-full max-w-xl animate-fadeInUp">
        <Card className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-xl p-3 md:p-6">
          <div className="space-y-1 mb-2 md:mb-4">
            <div className="flex justify-between items-center">
              <div className="text-xs md:text-sm text-gray-600 font-normal md:font-medium">
                Phase {level?.phaseNumber} • Level {level?.number} Trivia
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 font-semibold">
                {timeLeft}s
              </div>
            </div>
            
            <ProgressBar value={timeLeft} max={30} />
          
          </div>

          <CardHeader className="text-sm md:text-xl text-gray-800 mb-4">
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
                    className={`w-full px-3 md:px-4 py-2 md:py-3 rounded-md text-left border transition ${
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
              onClick={() => {
                playSound("submitAnswer", effectsOn);
                checkAnswer();
              }}
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
        onBackToMap={() => {
          // ✅ Ensure no life loss when navigating back after correct answer
          hasAnswered.current = true;
          lifeLostRef.current = true;
          setIsRunning(false);
          onBack();
        }}
        score={score}
        effectsOn={effectsOn}
      />

      <WrongAnswerModal
        isOpen={showWrongModal}
        onRetry={() => resetLevel({ skipIncorrect: true })}
        onBack={() => {
          // ✅ Life already lost when modal appeared, prevent double deduction
          hasAnswered.current = true;
          lifeLostRef.current = true;
          setIsRunning(false);
          onBack();
        }}
        effectsOn={effectsOn}
      />

      <TimeUpModal
        isOpen={showTimeUpModal}
        onTryAgain={() => resetLevel({ skipIncorrect: true })}
        onGoToMap={() => {
          // ✅ Life already lost when time ran out, prevent double deduction
          hasAnswered.current = true;
          lifeLostRef.current = true;
          setIsRunning(false);
          onBack();
        }}
        effectsOn={effectsOn}
      />
    </div>
  );
}
