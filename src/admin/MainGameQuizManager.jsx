// src/admin/MainGameQuizManager.jsx
import { useEffect, useState } from "react";
import { supabase } from "lib/supabaseClient";
import { Button } from "components/ui/button";

export default function MainGameQuizManager() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    phase_number: 1,
    level_number: 1,
    mode: "trivia",
    question: "",
    options: [],
    answer: "",
    image_urls: "",
    letters: "",
  });

  const [editingId, setEditingId] = useState(null);

  // Fetch quizzes
  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quiz")
      .select("*")
      .order("phase_number", { ascending: true })
      .order("level_number", { ascending: true });

    if (error) {
      console.error("❌ Error fetching quizzes:", error);
    } else {
      setQuizzes(data || []);
    }
    setLoading(false);
  };

  // Handle form input
  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddOption = () => {
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, ""],
    }));
  };

  const handleOptionChange = (index, value) => {
    const updated = [...form.options];
    updated[index] = value;
    setForm((prev) => ({ ...prev, options: updated }));
  };

  const handleRemoveOption = (index) => {
    const updated = [...form.options];
    updated.splice(index, 1);
    setForm((prev) => ({ ...prev, options: updated }));
  };

  const resetForm = () => {
    setForm({
      phase_number: 1,
      level_number: 1,
      mode: "trivia",
      question: "",
      options: [],
      answer: "",
      image_urls: "",
      letters: "",
    });
    setEditingId(null);
  };

  const handleSave = async () => {
    const payload = {
      phase_number: Number(form.phase_number),
      level_number: Number(form.level_number),
      mode: form.mode,
      question: form.question,
      options: form.options.length > 0 ? form.options : null,
      answer: form.answer,
      image_urls: form.image_urls || null,
      letters: form.letters || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("quiz").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("quiz").insert([payload]));
    }

    if (error) {
      alert("Error saving quiz: " + error.message);
    } else {
      resetForm();
      fetchQuizzes();
    }
  };

  const handleEdit = (quiz) => {
    setEditingId(quiz.id);
    setForm({
      phase_number: quiz.phase_number,
      level_number: quiz.level_number,
      mode: quiz.mode || "trivia",
      question: quiz.question || "",
      options: quiz.options || [],
      answer: quiz.answer || "",
      image_urls: quiz.image_urls || "",
      letters: quiz.letters || "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this quiz?")) return;
    const { error } = await supabase.from("quiz").delete().eq("id", id);
    if (error) alert("Error deleting quiz");
    else fetchQuizzes();
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">
        {editingId ? "Edit Quiz" : "Add New Quiz"}
      </h2>

      {/* Form */}
      <div className="grid gap-3 mb-6">
        <input
          type="number"
          value={form.phase_number}
          onChange={(e) => updateForm("phase_number", e.target.value)}
          placeholder="Phase Number"
          className="border p-2 rounded"
        />
        <input
          type="number"
          value={form.level_number}
          onChange={(e) => updateForm("level_number", e.target.value)}
          placeholder="Level Number"
          className="border p-2 rounded"
        />
        <select
          value={form.mode}
          onChange={(e) => updateForm("mode", e.target.value)}
          className="border p-2 rounded"
        >
          <option value="trivia">Trivia</option>
          <option value="word-fill">Word Fill</option>
          <option value="scripture-match">Scripture Match</option>
          <option value="four-pics">Four Pics</option>
        </select>
        <textarea
          value={form.question}
          onChange={(e) => updateForm("question", e.target.value)}
          placeholder="Question"
          className="border p-2 rounded"
        />
        <input
          value={form.answer}
          onChange={(e) => updateForm("answer", e.target.value)}
          placeholder="Answer"
          className="border p-2 rounded"
        />

        {/* Multiple Choice Options */}
        {form.mode === "trivia" && (
          <div>
            <h4 className="font-medium mb-2">Options</h4>
            {form.options.map((opt, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="border p-2 rounded flex-1"
                />
                <Button
                  variant="destructive"
                  onClick={() => handleRemoveOption(idx)}
                >
                  ❌
                </Button>
              </div>
            ))}
            <Button onClick={handleAddOption}>+ Add Option</Button>
          </div>
        )}

        {/* Word Fill letters */}
        {form.mode === "word-fill" && (
          <input
            value={form.letters}
            onChange={(e) => updateForm("letters", e.target.value)}
            placeholder="Letters (comma-separated)"
            className="border p-2 rounded"
          />
        )}

        {/* Four Pics image URLs */}
        {form.mode === "four-pics" && (
          <input
            value={form.image_urls}
            onChange={(e) => updateForm("image_urls", e.target.value)}
            placeholder="Image URLs (comma-separated)"
            className="border p-2 rounded"
          />
        )}

        <div className="flex gap-2">
          <Button onClick={handleSave}>
            {editingId ? "Update Quiz" : "Add Quiz"}
          </Button>
          {editingId && <Button onClick={resetForm}>Cancel</Button>}
        </div>
      </div>

      {/* Quiz List */}
      <h2 className="text-lg font-bold mb-2">Existing Quizzes</h2>
      {loading ? (
        <p>Loading quizzes...</p>
      ) : (
        <div className="space-y-4">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="border p-3 rounded flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">
                  Phase {quiz.phase_number} - Level {quiz.level_number} ({quiz.mode})
                </p>
                <p>{quiz.question}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleEdit(quiz)}>Edit</Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(quiz.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
