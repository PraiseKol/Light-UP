import { useState, useEffect, useRef, useCallback } from "react";
import { getQuestion } from "lib/getQuestion";
import { useTimer } from "hooks/useTimer";
import RightAnswerModal from "components/ui/RightAnswerModal";
import WrongAnswerModal from "components/ui/WrongAnswerModal";
import TimeUpModal from "components/ui/TimeUpModal";
import { Button } from "components/ui/button";
import { useResetLevel } from "hooks/useResetLevel";
import ProgressBar from "components/ui/progress";
import { supabase } from "lib/supabaseClient";
import { loseLife } from "utils/loseLife";

export default function FourPicsMode({
  level,
  onBack,
  onCorrect = () => {},
  onScore = () => {},
  activePowerups,
}) {
  const INITIAL_TIME = 30;

  const [input, setInput] = useState("");
  const [usedIndexes, setUsedIndexes] = useState([]);
  const [shuffledLetters, setShuffledLetters] = useState([]);
  const [lockedIndexes, setLockedIndexes] = useState([]); // ✅ new: divine hint locks
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRightModal, setShowRightModal] = useState(false);
  const [showWrongModal, setShowWrongModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [score, setscore] = useState(null);

  const hasAnswered = useRef(false);
  const lifeLostRef = useRef(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("❌ Failed to load user:", error.message);
      } else {
        setUser(user);
      }
    };
    getUser();
  }, []);

  const handleLifeLoss = async () => {
    if (lifeLostRef.current || !user?.id) return;
    lifeLostRef.current = true;

    try {
      const { data } = await supabase
        .from("game_users")
        .select("lives")
        .eq("user_id", user.id)
        .maybeSingle();

      const currentLives = data?.lives;

      if (currentLives > 0) {
        await loseLife(user.id, currentLives);
        console.log("💔 Life lost");
      } else {
        console.log("🚫 No lives left");
      }
    } catch (err) {
      console.error("❌ Error reducing life:", err.message);
    }
  };

  const { timeLeft, setTimeLeft, setIsRunning } = useTimer(INITIAL_TIME, () => {
    if (!input.trim()) {
      handleLifeLoss();
      setShowTimeUpModal(true);
    } else {
      checkAnswer();
    }
  });

  // ✅ Apply Grace Period once
  useEffect(() => {
    if (activePowerups?.grace_period) {
      console.log("⏳ Grace Period active — adding 10 seconds");
      setTimeLeft((prev) => prev + 10);
      activePowerups?.setGraceUsed?.();
    }
  }, [activePowerups, setTimeLeft]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getQuestion(level.phaseNumber, level.number);
      if (data) {
        setQuestion(data);
        const letters = data.letters?.split("") || [];
        setShuffledLetters(letters.sort(() => Math.random() - 0.5));
      }
      setLoading(false);
    };
    load();
  }, [level]);

  
/// ✅ Divine Hint logic - always reveal LAST 2 letters & lock them
useEffect(() => {
  if (question?.answer && activePowerups?.divine_hint) {
    const answer = question.answer.split("");
    const answerLength = answer.length;

    // Always target last 2 positions
    const positions = [answerLength - 2, answerLength - 1];

    let revealed = Array(answerLength).fill("");
    let updatedUsedIndexes = [...usedIndexes];
    let locked = [];

    positions.forEach((pos) => {
      revealed[pos] = answer[pos]; // put correct letter in slot

      // lock letter in shuffled grid
      const idxInShuffled = shuffledLetters.findIndex(
        (ltr, i) =>
          ltr === answer[pos] &&
          !updatedUsedIndexes.includes(i) &&
          !locked.includes(i)
      );
      if (idxInShuffled !== -1) {
        updatedUsedIndexes.push(idxInShuffled);
        locked.push(idxInShuffled);
      }
    });

    setInput(revealed.join("")); // <-- full string with hints already in place
    setUsedIndexes(updatedUsedIndexes);
    setLockedIndexes(locked);

    console.log("✨ Divine Hint filled LAST 2 letters & locked them");
    activePowerups?.setDivineHintUsed?.();
  }
}, [question, activePowerups, shuffledLetters]);



  const calculateScore = () => {
    const elapsed = INITIAL_TIME - timeLeft;
    const third = INITIAL_TIME / 3;
    if (elapsed <= third) return 100;
    if (elapsed <= 2 * third) return 75;
    return 50;
  };

  const saveScore = async (newScore) => {
    if (!user || !level) return;

    const levelId = level.id || `P${level.phaseNumber}-L${level.number}`;

    const { data: existingData } = await supabase
      .from("progress")
      .select("id, score")
      .eq("user_id", user.id)
      .eq("level_id", levelId)
      .maybeSingle();

    const existingScore = existingData?.score;

    if (existingScore === undefined || existingScore === null) {
      await supabase.from("progress").insert({
        user_id: user.id,
        level_id: levelId,
        phase: level.phaseNumber,
        mode: "FourPics",
        score: newScore,
        updated_at: new Date().toISOString(),
      });
      setscore(newScore);
      onScore(newScore);
      return;
    }

    if (newScore > existingScore) {
      await supabase
        .from("progress")
        .update({
          score: newScore,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("level_id", levelId);
      setscore(newScore);
      onScore(newScore);
    } else {
      setscore(existingScore);
    }
  };

  const checkAnswer = () => {
    if (!question?.answer || hasAnswered.current) return;
    hasAnswered.current = true;
    setIsRunning(false);

    const correct =
      input.trim().toLowerCase() === question.answer.toLowerCase();

    if (correct) {
      const score = calculateScore();
      saveScore(score);
      setShowRightModal(true);
    } else {
      handleLifeLoss();
      setShowWrongModal(true);
    }
  };

  // ✅ Update letter click to place in first empty non-locked slot
const handleLetterClick = useCallback(
  (letter, idx) => {
    if (hasAnswered.current || usedIndexes.includes(idx) || lockedIndexes.includes(idx)) return;

    setInput((prev) => {
      let arr = prev.split("");
      const firstEmpty = arr.findIndex((ch, i) => ch === "" && !lockedIndexes.includes(i));
      if (firstEmpty !== -1) arr[firstEmpty] = letter;
      return arr.join("");
    });

    setUsedIndexes((prev) => [...prev, idx]);
  },
  [usedIndexes, lockedIndexes]
);
  // ✅ Prevent backspace from removing locked hints
const handleBackspace = () => {
  if (hasAnswered.current) return;

  setInput((prev) => {
    let arr = prev.split("");
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i] !== "" && !lockedIndexes.includes(i)) {
        const letterToRemove = arr[i];
        arr[i] = "";
        // also free this letter in usedIndexes
        setUsedIndexes((prev) => {
          const reverseUsed = [...prev].reverse();
          const idxToRemove = reverseUsed.find(
            (idx) => shuffledLetters[idx] === letterToRemove && !lockedIndexes.includes(idx)
          );
          if (idxToRemove !== undefined) {
            return prev.filter((p) => p !== idxToRemove);
          }
          return prev;
        });
        break;
      }
    }
    return arr.join("");
  });
};

  const resetLevel = useResetLevel({
    setModals: {
      setShowRightModal,
      setShowWrongModal,
      setShowTimeUpModal,
    },
    setUserInput: setInput,
    setTimeLeft,
    setIsRunning,
    hasAnsweredRef: hasAnswered,
    onReset: () => {
      lifeLostRef.current = false;
      setLockedIndexes([]); // reset locked on retry
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

  if (loading) return <div className="p-6 text-center">Loading question...</div>;
  if (!question?.answer || !question?.image_urls) {
    return (
      <div className="p-6 text-center text-red-600">
        ❌ Invalid question data.
      </div>
    );
  }
  if (!user) return <div className="p-6 text-center">Loading user...</div>;

  const images = question.image_urls.split(",").map((url) => url.trim());
  const answerLength = question.answer.length;

  return (
    <div className="p-6 bg-gradient-to-br from-yellow-50 to-orange-100 rounded-xl shadow-lg max-w-2xl mx-auto animate-fadeInUp">
      <div className="space-y-1 mb-4">
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500 mb-2">
            Phase {level?.phaseNumber} • Level {level?.number} Four Pics One Word
          </div>
          <span className="text-sm text-gray-600 font-semibold">{timeLeft}s</span>
        </div>
        <ProgressBar value={timeLeft} max={INITIAL_TIME} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {images.map((src, idx) => (
          <img
            key={idx}
            src={src}
            alt={`Hint ${idx + 1}`}
            className="w-full h-32 object-contain rounded-lg border border-gray-200 shadow-sm"
          />
        ))}
      </div>

      <div className="flex justify-center gap-2 mb-4 text-xl font-semibold tracking-wide">
        {Array.from({ length: answerLength }).map((_, i) => (
          <div key={i} className="w-10 h-10 border-b-4 border-gold text-center">
            {input[i] || ""}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-6 gap-3 max-w-md mx-auto mb-6">
        {shuffledLetters.map((ltr, idx) => (
          <button
            key={idx}
            onClick={() => handleLetterClick(ltr, idx)}
            disabled={
              usedIndexes.includes(idx) || hasAnswered.current || lockedIndexes.includes(idx)
            }
            className={`w-10 h-10 text-lg font-bold rounded-lg transition shadow ${
              lockedIndexes.includes(idx)
                ? "bg-green-300 text-black cursor-not-allowed" // locked looks different
                : usedIndexes.includes(idx)
                ? "bg-gray-300 text-gray-500"
                : "bg-gold text-black hover:bg-yellow-400"
            }`}
          >
            {ltr}
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-4">
        <Button
          onClick={handleBackspace}
          disabled={input.length === 0 || hasAnswered.current}
          className="bg-gray-200 hover:bg-gray-300 text-black"
        >
          ⌫
        </Button>
        <Button
          onClick={checkAnswer}
          disabled={hasAnswered.current || input.length !== answerLength}
        >
          ✅ Submit
        </Button>
      </div>

      <RightAnswerModal
        isOpen={showRightModal}
        onClose={onCorrect}
        onNext={onCorrect}
        onBackToMap={() => window.location.reload()}
        score={score}
      />

      <WrongAnswerModal isOpen={showWrongModal} onRetry={resetLevel} onBack={onBack} />

      <TimeUpModal isOpen={showTimeUpModal} onTryAgain={resetLevel} onGoToMap={onBack} />
    </div>
  );
}
