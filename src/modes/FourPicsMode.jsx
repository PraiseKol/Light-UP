import { useState, useEffect, useRef, useCallback } from "react";
import { getQuestion } from "lib/getQuestion";
import { useTimer } from "hooks/useTimer";
import RightAnswerModal from "components/ui/RightAnswerModal";
import WrongAnswerModal from "components/ui/WrongAnswerModal";
import TimeUpModal from "components/ui/TimeUpModal";
import { Button } from "components/ui/button";
import { useResetLevel } from "hooks/useResetLevel";
import ProgressBar from "components/ui/progress";
import { supabase } from "@/lib/supabaseClient";
import { playSound } from "utils/sound";

export default function FourPicsMode({
  level,
  onBack,
  onCorrect = () => {},
  onScore = () => {},
  onIncorrect,
  activePowerups,
  effectsOn = true,
}) {
  const INITIAL_TIME = 30;

  const [input, setInput] = useState([]);
  const [usedIndexes, setUsedIndexes] = useState([]);
  const [shuffledLetters, setShuffledLetters] = useState([]);
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRightModal, setShowRightModal] = useState(false);
  const [showWrongModal, setShowWrongModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [score, setScore] = useState(null);
  const [divineHintApplied, setDivineHintApplied] = useState(false);
  const [user, setUser] = useState(null);

  const hasAnswered = useRef(false);
  const lifeLostRef = useRef(false);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (!error) setUser(user);
    };
    getUser();
  }, []);

  const { timeLeft, setTimeLeft, setIsRunning } = useTimer(INITIAL_TIME, () => {
    if (input.every((slot) => slot === "")) {
      handleLifeLoss();
      playSound("error", effectsOn);
      setShowTimeUpModal(true);
    } else {
      checkAnswer();
    }
    setIsRunning(false);
  });

  useEffect(() => {
    if (activePowerups?.grace_period) {
      setTimeLeft((prev) => prev + 15);
      activePowerups?.setGraceUsed?.();
    }
  }, [activePowerups, setTimeLeft]);

  useEffect(() => {
    setLoading(true);
    const loadQuestion = async () => {
      const data = await getQuestion(level.phaseNumber, level.number);
      if (data) {
        setQuestion(data);
        const letters = data.letters?.split("") || [];
        setShuffledLetters(letters.sort(() => Math.random() - 0.5));
        setInput(Array(data.answer.length).fill(""));
        setUsedIndexes([]);
        setDivineHintApplied(false);
        setTimeLeft(INITIAL_TIME);
        setIsRunning(true);
      }
      setLoading(false);
    };
    loadQuestion();
  }, [level, setIsRunning, setTimeLeft]);

  const applyDivineHint = useCallback(() => {
    if (!question?.hint_letters || divineHintApplied) return;
    const hintArr = question.hint_letters.toUpperCase().split("");
    const answerLength = question.answer.length;
    setInput((prev) => {
      const arr = [...prev];
      for (let i = 0; i < hintArr.length; i++) {
        arr[answerLength - hintArr.length + i] = hintArr[i];
      }
      return arr;
    });
    setDivineHintApplied(true);
    activePowerups?.setDivineHintUsed?.();
  }, [question, divineHintApplied, activePowerups]);

  useEffect(() => {
    if (activePowerups?.divine_hint && !divineHintApplied) {
      applyDivineHint();
    }
  }, [activePowerups, divineHintApplied, applyDivineHint]);

  const calculateScore = () => {
    if (timeLeft > 20) return 100;
    if (timeLeft > 10) return 75;
    return 50;
  };

  const saveScore = async (earnedScore) => {
    if (!user || !question) return;
    const levelId = question.id || `P${level.phaseNumber}-L${level.number}`;

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
            mode: "FourPics",
            score: earnedScore,
          },
          { onConflict: ["user_id", "level_id"] }
        );
      }
      setScore(earnedScore);
      onScore(earnedScore);
    } catch (err) {
      console.error("Failed to save FourPics score:", err);
    }
  };

  const handleLifeLoss = async () => {
    if (lifeLostRef.current || !user?.id) return;
    lifeLostRef.current = true;
    if (onIncorrect) onIncorrect();
  };

  const checkAnswer = () => {
    if (!question?.answer || hasAnswered.current) return;
    hasAnswered.current = true;
    setIsRunning(false);

    const correct =
      input.join("").toLowerCase() === question.answer.toLowerCase();
    if (correct) {
      playSound("success", effectsOn);
      const earned = calculateScore();
      saveScore(earned);
      setShowRightModal(true);
    } else {
      handleLifeLoss();
      playSound("error", effectsOn);
      setShowWrongModal(true);
    }
  };

  const handleLetterClick = useCallback(
    (letter, idx) => {
      if (hasAnswered.current || usedIndexes.includes(idx)) return;
      const emptyIndex = input.findIndex((ch) => ch === "");
      if (emptyIndex !== -1) {
        setInput((prev) => {
          const arr = [...prev];
          arr[emptyIndex] = letter;
          return arr;
        });
        setUsedIndexes((prev) => [...prev, idx]);
      }
    },
    [usedIndexes, input]
  );

  const handleBackspace = () => {
    if (hasAnswered.current) return;
    for (let i = input.length - 1; i >= 0; i--) {
      if (input[i] !== "") {
        const removed = input[i];
        setInput((prev) => {
          const arr = [...prev];
          arr[i] = "";
          return arr;
        });
        setUsedIndexes((prev) =>
          prev.filter((idx) => shuffledLetters[idx] !== removed)
        );
        break;
      }
    }
  };

  const resetLevel = useResetLevel({
    setModals: { setShowRightModal, setShowWrongModal, setShowTimeUpModal },
    setUserInput: () => {
      setInput(Array(question?.answer?.length || 0).fill(""));
      setUsedIndexes([]);
      setDivineHintApplied(false);
    },
    setTimeLeft: () => {
      setTimeLeft(INITIAL_TIME);
      setIsRunning(true);
    },
    hasAnsweredRef: hasAnswered,
    onReset: () => {
      lifeLostRef.current = false;
    },
    reshuffleLetters: () => {
      if (question?.letters) {
        const reshuffled = question.letters
          .split("")
          .sort(() => Math.random() - 0.5);
        setShuffledLetters(reshuffled);
        setUsedIndexes([]);
      }
    },
  });

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center p-6 text-gray-600">
        <svg
          className="animate-spin h-6 w-6 mb-2 text-blue-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          ></path>
        </svg>
        <span className="text-sm">Loading question...</span>
      </div>
    );

  if (!question?.answer || !question?.image_urls)
    return (
      <div className="p-6 text-center text-red-600">
        ❌ Invalid question data.
      </div>
    );
  if (!user) return <div className="p-6 text-center">Loading user...</div>;

  const images = question.image_urls.split(",").map((url) => url.trim());

  return (
    <div className="p-8 md:p-6 bg-gradient-to-br from-yellow-50 to-orange-100 rounded-xl shadow-lg max-w-2xl mx-auto animate-fadeInUp">
      <div className="space-y-1 mb-2 md:mb-4">
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500 mb-1 md:mb-2">
            Phase {level?.phaseNumber} • Level {level?.number} Four Pics One
            Word
          </div>
          <span className="text-xs md:text-sm text-gray-600 font-semibold">
            {timeLeft}s
          </span>
        </div>
        <ProgressBar value={timeLeft} max={INITIAL_TIME} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
        {images.map((src, idx) => (
          <img
            key={idx}
            src={src}
            alt={`Hint ${idx + 1}`}
            className="w-full h-32 object-contain rounded-lg border border-gray-200 shadow-sm"
          />
        ))}
      </div>

      <div className="flex justify-center gap-1.5 md:gap-2 mb-3 md:mb-4 text-sm md:text-xl font-semibold tracking-wide">
        {input.map((ch, i) => (
          <div key={i} className="w-10 h-10 border-b-4 border-gold text-center">
            {ch || ""}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 md:grid-cols-6 gap-2 md:gap-3 max-w-md mx-auto mb-3 md:mb-6">
        {shuffledLetters.map((ltr, idx) => (
          <button
            key={idx}
            onClick={() => {
              playSound("click", effectsOn);
              handleLetterClick(ltr, idx);
            }}
            disabled={usedIndexes.includes(idx) || hasAnswered.current}
            className={`w-8 md:w-10 h-8 md:h-10 text-3xs md:text-lg font-semibold md:font-bold rounded-lg transition shadow ${
              usedIndexes.includes(idx)
                ? "bg-gray-300 text-gray-500"
                : "bg-gold text-black hover:bg-yellow-400"
            }`}
          >
            {ltr}
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-3 md:gap-4">
        <Button
          onClick={() => {
            playSound("back", effectsOn);
            handleBackspace();
          }}
          disabled={input.every((slot) => slot === "") || hasAnswered.current}
          className="bg-gray-200 hover:bg-gray-300 text-black"
        >
          ⌫
        </Button>
        <Button
          onClick={() => {
            playSound("submitAnswer", effectsOn);
            checkAnswer();
          }}
          disabled={hasAnswered.current || input.includes("")}
        >
          ✅ Submit
        </Button>
        {activePowerups?.divine_hint && (
          <Button
            onClick={applyDivineHint}
            disabled={divineHintApplied}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            ✨ Divine Hint
          </Button>
        )}
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
      />
      <TimeUpModal
        isOpen={showTimeUpModal}
        onTryAgain={() => resetLevel({ skipIncorrect: true })}
        onGoToMap={onBack}
        effectsOn={effectsOn}
      />
    </div>
  );
}
