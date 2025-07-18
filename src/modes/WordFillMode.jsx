// Add at the top of your file (after imports):
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "components/ui/card";
import { Input } from "components/ui/input";
import RightAnswerModal from "components/ui/RightAnswerModal";
import WrongAnswerModal from "components/ui/WrongAnswerModal";
import TimeUpModal from "components/ui/TimeUpModal";
import ProgressBar from "components/ui/progress";

// Keyframes for fadeInUp animation (global CSS or Tailwind config if using custom utilities):
// .animate-fadeInUp {
//   animation: fadeInUp 0.6s ease-out;
// }
// @keyframes fadeInUp {
//   from { opacity: 0; transform: translateY(20px); }
//   to { opacity: 1; transform: translateY(0); }
// }

export default function WordFillMode({ question, answer, level, onCorrect }) {
  const [userInput, setUserInput] = useState("");
  const [status, setStatus] = useState("idle");
  const [timeLeft, setTimeLeft] = useState(30);
  const [showRightModal, setShowRightModal] = useState(false);
  const [showWrongModal, setShowWrongModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const timerRef = useRef(null);
  const hasAnswered = useRef(false);

  // Stop timer
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const checkAnswer = () => {
    stopTimer(); // stop timer on submit
    hasAnswered.current = true;

    const isCorrect =
      userInput.trim().toLowerCase() === answer.trim().toLowerCase();

    setStatus(isCorrect ? "correct" : "wrong");

    setTimeout(() => {
      if (isCorrect) {
        setShowRightModal(true);
      } else {
        setShowWrongModal(true);
      }
    }, 500);
  };

  // Timer countdown
  useEffect(() => {
    if (hasAnswered.current) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === 1) {
          clearInterval(timerRef.current);
          if (userInput.trim() === "") {
            setShowTimeUpModal(true);
          } else {
            checkAnswer(); // auto-submit
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [userInput]);


  

  // Background image
  const backgroundUrl =
    "https://rhanvchqlilmzxmufode.supabase.co/storage/v1/object/public/backgrounds//WordFillBackground.jpg";

  return (
    <div
      className="min-h-screen flex justify-center items-center bg-cover bg-center px-4"
      style={{ backgroundImage: `url(${backgroundUrl})` }}
    >
      <div className="w-full max-w-xl animate-fadeInUp">
        <Card className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-xl p-6">
          <div className="text-xs text-gray-500 mb-2">
            Phase {level?.phaseNumber} • Level {level?.number}
          </div>

          <ProgressBar value={timeLeft} max={30} className="mb-4" />

          <CardHeader className="text-xl text-gray-800 leading-snug">
            {question}
          </CardHeader>

          <CardContent>
            <Input
              value={userInput}
              onChange={(e) => {
                setUserInput(e.target.value);
                setStatus("idle");
              }}
              disabled={status === "correct"}
              placeholder="Type your answer..."
              className={`mb-3 ${
                status === "wrong"
                  ? "border-red-500"
                  : status === "correct"
                  ? "border-green-500"
                  : ""
              }`}
            />

            {status === "wrong" && (
              <div className="text-sm text-red-500">Incorrect. Try again.</div>
            )}
            {status === "correct" && (
              <div className="text-sm text-green-600 animate-pulse">
                Correct! 🎉
              </div>
            )}

            <button
              onClick={checkAnswer}
              disabled={status === "correct"}
              className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Submit Answer
            </button>
          </CardContent>
        </Card>
      </div>

      {/* ✅ Modals */}
      <RightAnswerModal
        isOpen={showRightModal}
        onClose={() => onCorrect()}
        onNext={() => onCorrect()} // stays as next level
        onBackToMap={() => window.location.reload()} // or navigate to Map screen if using React Router
      />

      <WrongAnswerModal
        isOpen={showWrongModal}
        onRetry={() => {
          setShowWrongModal(false);
          setUserInput("");
          setStatus("idle");
          setTimeLeft(30);
          hasAnswered.current = false;
        }}
        onBack={() => window.location.reload()}
      />

      <TimeUpModal
        isOpen={showTimeUpModal}
        onRetry={() => {
          setShowWrongModal(false);
          setUserInput("");
          setStatus("idle");
          setTimeLeft(30);
          hasAnswered.current = false;
        }}
        onGoToMap={() => window.location.reload()}
      />
    </div>
  );
}
