import { useEffect, useRef, useState } from "react";

export default function WordFillWeekly({ quiz, onAnswer }) {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const startTimeRef = useRef(Date.now());
  const timeoutRef = useRef(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (!submitted) {
        setSubmitted(true);
        onAnswer(false, 30); // Auto-fallback after 30 seconds
      }
    }, 30000);

    return () => clearTimeout(timeoutRef.current);
  }, [submitted, onAnswer]);

  const handleSubmit = () => {
    if (submitted || !quiz?.answer) return;

    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const isCorrect =
      input.trim().toLowerCase() === quiz.answer.trim().toLowerCase();

    setSubmitted(true);
    clearTimeout(timeoutRef.current);
    onAnswer(isCorrect, timeTaken);
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
    <div className="p-4 text-center">
      <h2 className="text-lg font-semibold mb-4">{quiz.question}</h2>

      <input
        className="border border-gray-300 rounded px-3 py-2 mb-4 w-full max-w-md"
        placeholder="Type the missing word"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={submitted}
      />

      <br />

      <button
        onClick={handleSubmit}
        disabled={submitted || input.trim() === ""}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        Submit
      </button>
    </div>
  );
}
