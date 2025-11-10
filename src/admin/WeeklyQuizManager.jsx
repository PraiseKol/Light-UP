// src/admin/WeeklyQuizManager.jsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

export default function WeeklyQuizManager() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState(getDefaultForm());
  const [editingId, setEditingId] = useState(null);

  // Collapsible states persisted in localStorage
  const [showAddQuiz, setShowAddQuiz] = useState(() => {
    const saved = localStorage.getItem("weeklyShowAddQuiz");
    return saved ? JSON.parse(saved) : true;
  });
  const [showExisting, setShowExisting] = useState(() => {
    const saved = localStorage.getItem("weeklyShowExisting");
    return saved ? JSON.parse(saved) : true;
  });

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
      .from("weekly_quiz")
      .select("*")
      .order("id", { ascending: true });

    if (!error) setQuizzes(data || []);
    else console.error("❌ Error fetching weekly quizzes:", error);

    setLoading(false);
  };

  const updateForm = (key, value) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: value };

      if (key === "mode") {
        if (value === "trivia") {
          updated.options = ["Option 1", "Option 2", "Option 3", "Option 4"];
          updated.answer = "Type correct answer here";
          updated.question = "";
        }
        if (value === "word-fill") {
          updated.options = [];
          updated.answer = "Type correct answer here";
          updated.question = "";
        }
        if (value === "scripture-match") {
          updated.options = ["Option 1", "Option 2", "Option 3", "Option 4"];
          updated.answer = "Type correct answer here";
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
      ({ error } = await supabase
        .from("weekly_quiz")
        .update(payload)
        .eq("id", editingId));
    } else {
      ({ error } = await supabase.from("weekly_quiz").insert([payload]));
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
    const { error } = await supabase.from("weekly_quiz").delete().eq("id", id);
    if (!error) fetchQuizzes();
  };

  const handleDeleteAll = async () => {
    const phrase = prompt(
      `⚠️ This will DELETE ALL quizzes in weekly_quiz.\nType "burn down" to confirm.`
    );
    if (phrase !== "burn down") {
      alert("Delete cancelled.");
      return;
    }
    const { error } = await supabase.from("weekly_quiz").delete();
    if (!error) fetchQuizzes();
  };

  // Pagination logic
  const totalPages = Math.ceil(quizzes.length / quizzesPerPage);
  const displayedQuizzes = quizzes.slice(
    (currentPage - 1) * quizzesPerPage,
    currentPage * quizzesPerPage
  );

  const changePage = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" }); // ✅ Scroll to top
  };

  const toggleShowAddQuiz = () => {
    setShowAddQuiz((prev) => {
      localStorage.setItem("weeklyShowAddQuiz", JSON.stringify(!prev));
      return !prev;
    });
  };

  const toggleShowExisting = () => {
    setShowExisting((prev) => {
      localStorage.setItem("weeklyShowExisting", JSON.stringify(!prev));
      return !prev;
    });
  };

  return (
    <div className="p-4">
      {/* Toggle Add Quiz */}
      <Button className="mb-4" onClick={toggleShowAddQuiz}>
        {showAddQuiz ? "Hide Add New Quiz" : "Show Add New Quiz"}
      </Button>

      {/* Add Quiz Form */}
      {showAddQuiz && (
        <div className="grid gap-3 mb-6">
          <h2 className="text-lg font-bold">
            {editingId ? "Edit Weekly Quiz" : "Add New Weekly Quiz"}
          </h2>

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

          <label>Question</label>
          <textarea
            value={form.question}
            onChange={(e) => updateForm("question", e.target.value)}
            className="border p-2 rounded"
          />

          {/* Options Field (Only for trivia & scripture-match) */}
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
                  <Button
                    variant="destructive"
                    onClick={() => handleRemoveOption(idx)}
                  >
                    ❌
                  </Button>
                </div>
              ))}
              <Button onClick={handleAddOption}>+ Add Option</Button>
            </>
          )}

          <label>Answer</label>
          <input
            value={form.answer}
            onChange={(e) => updateForm("answer", e.target.value)}
            className="border p-2 rounded"
          />

          <div className="flex gap-2">
            <Button onClick={handleSave}>
              {editingId ? "Update Quiz" : "Add Quiz"}
            </Button>
            {editingId && <Button onClick={resetForm}>Cancel</Button>}
          </div>
        </div>
      )}

      {/* Delete All Button */}
      <Button
        variant="destructive"
        className="mb-4 bg-red-700"
        onClick={handleDeleteAll}
      >
        🚨 Delete ALL Weekly Quizzes
      </Button>

      {/* Existing Quizzes */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold">Existing Quizzes</h2>
        <Button onClick={toggleShowExisting}>
          {showExisting ? "Hide Existing Quizzes" : "Show Existing Quizzes"}
        </Button>
      </div>

      {showExisting && (
        <>
          {loading ? (
            <p>Loading quizzes...</p>
          ) : (
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

              {/* Pagination */}
              <div className="flex gap-2 mt-4 items-center">
                <span>Total: {quizzes.length} quizzes</span>
                <Button
                  disabled={currentPage === 1}
                  onClick={() => changePage(currentPage - 1)}
                >
                  Prev
                </Button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => setCurrentPage(Number(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const page = Number(e.target.value);
                      if (page >= 1 && page <= totalPages) {
                        changePage(page);
                      }
                    }
                  }}
                  className="border p-1 w-16 rounded"
                />
                <Button
                  disabled={currentPage === totalPages}
                  onClick={() => changePage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
