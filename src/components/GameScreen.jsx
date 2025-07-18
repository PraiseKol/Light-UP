// src/pages/GameScreen.jsx
import { useEffect, useState } from "react";
import { getQuestion } from "lib/getQuestion";
import WordFillMode from "modes/WordFillMode";
import TriviaMode from "modes/TriviaMode"; // 👈 import TriviaMode

export default function GameScreen({ level, onBack, onComplete }) {
  const [questionData, setQuestionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (!level?.phaseNumber || !level?.number) {
        console.warn("Invalid level:", level);
        setLoading(false);
        return;
      }

      const q = await getQuestion(level.phaseNumber, level.number);
      if (q) {
        setQuestionData(q);
      } else {
        console.error("No question found for this level.");
      }
      setLoading(false);
    };

    load();
  }, [level]);

  if (loading) return <div className="p-6">Loading game...</div>;
  if (!questionData) return <div className="p-6">No question found.</div>;

  const { mode } = questionData;

  if (mode === "word-fill") {
    return (
      <WordFillMode
        level={level}
        question={questionData.question}
        answer={questionData.answer}
        onBack={onBack}
        onCorrect={onComplete}
      />
    );
  }

  if (mode === "trivia") {
    return (
      <TriviaMode
        level={level}
        question={questionData.question}
        answer={questionData.answer}
        options={questionData.options}
        onCorrect={onComplete}
        onBackToMap={onBack}
      />
    );
  }

  return (
    <div className="p-6">
      Mode not supported yet: <strong>{mode}</strong>
    </div>
  );
}
