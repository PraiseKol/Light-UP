import { useEffect, useRef, useState } from "react";
import { playSound } from "@/utils/sound";

export default function WordFillWeekly({ quiz, onAnswer, effectsOn = true })  {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const startTimeRef = useRef(Date.now());
  const timeoutRef = useRef(null);


  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (!submitted) {
        setSubmitted(true);
        setIsCorrect(false);
        onAnswer(false, 30); // Auto-fallback after 30 seconds
      }
    }, 30000);

    return () => clearTimeout(timeoutRef.current);
  }, [submitted, onAnswer]);

  const handleSubmit = () => {
    if (submitted || !quiz?.answer) return;

    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const correct =
      input.trim().toLowerCase() === quiz.answer.trim().toLowerCase();

    setSubmitted(true);
    setIsCorrect(correct);
    clearTimeout(timeoutRef.current);
    onAnswer(correct, timeTaken);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && input.trim() !== "" && !submitted) {
      handleSubmit();
    }
  };

  // 🛡️ Defensive check
  if (!quiz || !quiz.question || !quiz.answer) {
    return (
      <div className="text-center text-red-600 font-semibold mt-8">
        ⚠️ Error loading Word Fill question.
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 max-w-lg mx-auto text-center animate-fadeIn">
      {/* Question */}
      <h2 className="text-xl font-bold text-gray-800 mb-6">{quiz.question}</h2>

      {/* Input */}
<input
  className="border-2 border-gray-300 focus:border-indigo-500 focus:ring focus:ring-indigo-200 rounded-lg px-4 py-2 w-full max-w-md mb-4 transition"
  placeholder="Type the missing word"
  value={input}
  onChange={(e) => {
    setInput(e.target.value);
    // Optional: play sound on typing
    playSound("switch", effectsOn);
  }}
  onKeyDown={(e) => {
    handleKeyDown(e);
    if (e.key === "Enter") {
      playSound("submitAnswer", effectsOn); // 🔊 submit sound on Enter
    }
  }}
  disabled={submitted}
/>

{/* Submit Button */}
<button
  onClick={() => {
    playSound("submitAnswer", effectsOn); // 🔊 submit sound on button click
    handleSubmit();
  }}
  disabled={submitted || input.trim() === ""}
  className={`px-6 py-2 rounded-lg text-white font-semibold shadow-md transition-transform transform hover:scale-105 ${
    submitted || input.trim() === ""
      ? "bg-gray-400 cursor-not-allowed"
      : "bg-indigo-600 hover:bg-indigo-700"
  }`}
>
  Submit
</button>


      {/* Feedback */}
      {submitted && (
        <div
          className={`mt-4 text-lg font-semibold ${
            isCorrect ? "text-green-600" : "text-red-600"
          }`}
        >
          {isCorrect ? "✅ Correct!" : `❌ Incorrect. Answer: ${quiz.answer}`}
        </div>
      )}
    </div>
  );
}
