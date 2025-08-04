// src/admin/WeeklyQuizManager.jsx
import { useState, useEffect } from "react";
import { supabase } from "lib/supabaseClient";
import { Button } from "components/ui/button";

export default function WeeklyQuizManager() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [image, setImage] = useState(null);

  // Load quizzes on mount
  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("weekly_quiz")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Error fetching weekly quiz:", error);
    } else {
      setQuizzes(data);
    }
    setLoading(false);
  };

  const handleAddQuiz = async () => {
    if (!question || options.some((opt) => !opt)) {
      alert("Please fill in all fields");
      return;
    }

    let image_url = null;
    if (image) {
      const fileName = `${Date.now()}-${image.name}`;
      const { error: storageError } = await supabase.storage
        .from("quiz-images")
        .upload(fileName, image);

      if (storageError) {
        alert("Error uploading image");
        return;
      }

      image_url = supabase.storage
        .from("quiz-images")
        .getPublicUrl(fileName).data.publicUrl;
    }

    const { error } = await supabase.from("weekly_quiz").insert([
      {
        question,
        options,
        correct_index: correctIndex,
        image_url,
      },
    ]);

    if (error) {
      alert("Error adding quiz");
    } else {
      resetForm();
      fetchQuizzes();
    }
  };

  const handleDeleteQuiz = async (id) => {
    if (!window.confirm("Delete this question?")) return;
    const { error } = await supabase.from("weekly_quiz").delete().eq("id", id);
    if (error) {
      alert("Error deleting quiz");
    } else {
      fetchQuizzes();
    }
  };

  const resetForm = () => {
    setQuestion("");
    setOptions(["", "", "", ""]);
    setCorrectIndex(0);
    setImage(null);
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">📅 Manage Weekly Quiz</h2>

      {/* Add Quiz Form */}
      <div className="bg-gray-50 p-4 rounded mb-6">
        <h3 className="font-semibold mb-2">Add New Question</h3>
        <input
          type="text"
          placeholder="Question"
          className="border w-full px-3 py-2 mb-2 rounded"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        {options.map((opt, idx) => (
          <input
            key={idx}
            type="text"
            placeholder={`Option ${idx + 1}`}
            className="border w-full px-3 py-2 mb-2 rounded"
            value={opt}
            onChange={(e) =>
              setOptions((prev) =>
                prev.map((o, i) => (i === idx ? e.target.value : o))
              )
            }
          />
        ))}

        <label className="block text-sm mb-1">Correct Option:</label>
        <select
          className="border px-3 py-2 rounded mb-2"
          value={correctIndex}
          onChange={(e) => setCorrectIndex(Number(e.target.value))}
        >
          {options.map((_, idx) => (
            <option key={idx} value={idx}>
              Option {idx + 1}
            </option>
          ))}
        </select>

        <input
          type="file"
          accept="image/*"
          className="mb-2"
          onChange={(e) => setImage(e.target.files[0])}
        />

        <Button onClick={handleAddQuiz}>Add Question</Button>
      </div>

      {/* Quiz List */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="p-3 border rounded flex justify-between items-center"
            >
              <div>
                <p className="font-medium">{quiz.question}</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteQuiz(quiz.id)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
