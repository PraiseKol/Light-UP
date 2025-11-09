// src/admin/MultiplayerQuizManager.jsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "components/ui/button";

export default function MultiplayerQuizManager() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(getDefaultForm());
  const [editingId, setEditingId] = useState(null);
  const [showAddQuiz, setShowAddQuiz] = useState(true);
  const [showExistingQuiz, setShowExistingQuiz] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const quizzesPerPage = 20;

  function getDefaultForm() {
    return {
      mode: "trivia",
      question: "",
      options: ["Option 1", "Option 2", "Option 3", "Option 4"],
      answer: "Type correct answer here",
    };
  }

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("multiplayer_quiz")
      .select("*")
      .order("id", { ascending: true });

    if (!error) setQuizzes(data || []);
    else console.error("❌ Error fetching quizzes:", error);

    setLoading(false);
  };

  const updateForm = (key, value) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: value };

      if (key === "mode") {
        if (value === "trivia" || value === "scripture-match") {
          updated.options = ["Option 1", "Option 2", "Option 3", "Option 4"];
          updated.answer = "Type correct answer here";
          updated.question = "";
        }
        if (value === "word-fill") {
          updated.answer = "Type correct answer here";
          updated.options = [];
          updated.question = "";
        }
      }
      return updated;
    });
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
    setForm(getDefaultForm());
    setEditingId(null);
  };

  const handleSave = async () => {
    const payload = {
      mode: form.mode,
      question: form.question,
      options: form.options.length > 0 ? form.options : null,
      answer: form.answer,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("multiplayer_quiz").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("multiplayer_quiz").insert([payload]));
    }

    if (!error) {
      resetForm();
      fetchQuizzes();
    } else {
      alert("Error saving quiz: " + error.message);
    }
  };

  const handleEdit = (quiz) => {
    setEditingId(quiz.id);
    setForm({
      mode: quiz.mode || "trivia",
      question: quiz.question || "",
      options: quiz.options || [],
      answer: quiz.answer || "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this quiz?")) return;
    const { error } = await supabase.from("multiplayer_quiz").delete().eq("id", id);
    if (!error) fetchQuizzes();
  };

  const handleDeleteAll = async () => {
    const confirmPhrase = prompt(`Type "burn down" to confirm deleting ALL quizzes from Multiplayer Quiz:`);
    if (confirmPhrase !== "burn down") {
      alert("❌ Deletion cancelled. Incorrect confirmation phrase.");
      return;
    }
    const { error } = await supabase.from("multiplayer_quiz").delete();
    if (!error) fetchQuizzes();
  };

  // Pagination logic
  const totalPages = Math.ceil(quizzes.length / quizzesPerPage);
  const displayedQuizzes = quizzes.slice(
    (currentPage - 1) * quizzesPerPage,
    currentPage * quizzesPerPage
  );

  const handlePageJump = (e) => {
    if (e.key === "Enter") {
      const page = parseInt(e.target.value, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
      e.target.value = "";
    }
  };

  return (
    <div className="p-4">
      {/* Collapsible Add Quiz */}
      <Button className="mb-4" onClick={() => setShowAddQuiz((prev) => !prev)}>
        {showAddQuiz ? "Hide Add New Quiz" : "Show Add New Quiz"}
      </Button>

      {showAddQuiz && (
        <div className="grid gap-3 mb-6">
          <h2 className="text-lg font-bold">{editingId ? "Edit Quiz" : "Add New Quiz"}</h2>
          <label>Game Mode</label>
          <select
            value={form.mode}
            onChange={(e) => updateForm("mode", e.target.value)}
            className="border p-2 rounded"
          >
            <option value="trivia">Trivia</option>
            <option value="word-fill">Word Fill</option>
            <option value="scripture-match">Scripture Match</option>
          </select>

          {(form.mode === "trivia" || form.mode === "scripture-match" || form.mode === "word-fill") && (
            <>
              <label>Question</label>
              <textarea
                value={form.question}
                onChange={(e) => updateForm("question", e.target.value)}
                className="border p-2 rounded"
              />
            </>
          )}

          {(form.mode === "trivia" || form.mode === "scripture-match") && (
            <>
              <label>Options</label>
              {form.options.map((opt, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    className="border p-2 rounded flex-1"
                  />
                  <Button variant="destructive" onClick={() => handleRemoveOption(idx)}>❌</Button>
                </div>
              ))}
              <Button onClick={handleAddOption}>+ Add Option</Button>
            </>
          )}

          {(form.mode === "trivia" || form.mode === "scripture-match" || form.mode === "word-fill") && (
            <>
              <label>Answer</label>
              <input
                value={form.answer}
                onChange={(e) => updateForm("answer", e.target.value)}
                className="border p-2 rounded"
              />
            </>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave}>{editingId ? "Update Quiz" : "Add Quiz"}</Button>
            {editingId && <Button onClick={resetForm}>Cancel</Button>}
          </div>
        </div>
      )}

      {/* Delete all quizzes */}
      <Button
        variant="destructive"
        className="mb-4 bg-red-700"
        onClick={handleDeleteAll}
      >
        🚨 Delete ALL Multiplayer Quizzes
      </Button>

      {/* Existing Quizzes */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold">Existing Quizzes</h2>
        <Button onClick={() => setShowExistingQuiz((prev) => !prev)}>
          {showExistingQuiz ? "Hide" : "Show"} Existing Quizzes
        </Button>
      </div>

      {loading ? (
        <p>Loading quizzes...</p>
      ) : (
        showExistingQuiz && (
          <>
            {displayedQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="border p-3 rounded flex justify-between items-center mb-2"
              >
                <div>
                  <p className="font-semibold">({quiz.mode})</p>
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

            {/* Pagination controls */}
            <div className="flex items-center gap-2 mt-4">
              <Button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                Prev
              </Button>
              <span>
                Page {currentPage} of {totalPages} | Total Quizzes: {quizzes.length}
              </span>
              <input
                type="number"
                min="1"
                max={totalPages}
                placeholder="Go to page"
                onKeyDown={handlePageJump}
                className="border p-1 rounded w-20"
              />
              <Button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </>
        )
      )}
    </div>
  );
}
