// src/admin/MainGameQuizManager.jsx
import { useEffect, useState } from "react";
import { supabase } from "lib/supabaseClient";
import { Button } from "components/ui/button";

export default function MainGameQuizManager() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(getDefaultForm());
  const [editingId, setEditingId] = useState(null);
  const [imageFiles, setImageFiles] = useState([null, null, null, null]);

  // Collapsible states
  const [collapsedPhases, setCollapsedPhases] = useState(() => {
    const saved = localStorage.getItem("collapsedPhases");
    return saved ? JSON.parse(saved) : {};
  });
  const [showAddQuiz, setShowAddQuiz] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const phasesPerPage = 20;

  function getDefaultForm() {
    return {
      phase_number: 1,
      level_number: 1,
      mode: "trivia",
      question: "",
      options: ["Option 1", "Option 2", "Option 3", "Option 4"],
      answer: "Type correct answer here, without commas or space",
      image_urls: "",
      letters:
        "Once you type your answer, this will be automatically generated",
    };
  }

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quiz")
      .select("*")
      .order("phase_number")
      .order("level_number");

    if (!error) setQuizzes(data || []);
    else console.error("❌ Error fetching quizzes:", error);

    setLoading(false);
  };

  const buildImageUrls = (
    phase,
    level,
    extensions = ["jpg", "jpg", "jpg", "jpg"]
  ) => {
    return extensions
      .map(
        (ext, idx) =>
          `https://rhanvchqlilmzxmufode.supabase.co/storage/v1/object/public/fourpics-images/phase${phase}level${level}image${
            idx + 1
          }.${ext}`
      )
      .join(",");
  };

  const updateForm = (key, value) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: value };

      if (
        (key === "phase_number" || key === "level_number") &&
        updated.mode === "four-pics"
      ) {
        updated.image_urls = buildImageUrls(
          updated.phase_number,
          updated.level_number
        );
      }

      if (key === "mode") {
        if (value === "trivia") {
          updated.options = ["Option 1", "Option 2", "Option 3", "Option 4"];
          updated.answer = "Type correct answer here";
          updated.image_urls = "";
          updated.letters = "";
          updated.question = "";
        }
        if (value === "word-fill") {
          updated.answer = "Type correct answer here";
          updated.options = [];
          updated.image_urls = "";
          updated.letters = "";
          updated.question = "";
        }
        if (value === "scripture-match") {
          updated.answer = "";
          updated.options = [];
          updated.image_urls = "";
          updated.letters = "";
          updated.question = `[
  {
    "reference": "your scripture goes here",
    "verse": "your verse goes here"
  },
  {
    "reference": "your scripture goes here",
    "verse": "your verse goes here"
  },
  {
    "reference": "your scripture goes here",
    "verse": "your verse goes here"
  }
]`;
        }
        if (value === "four-pics") {
          updated.answer = "Type correct answer here, without commas or space";
          updated.hint_letters =
            "System would automatically generate this for you, once you type your answer and move on";
          updated.options = [];
          updated.letters =
            "Once you type your answer, this will be automatically generated";
          updated.image_urls = buildImageUrls(
            updated.phase_number,
            updated.level_number
          );
          updated.question = "";
        }
      }
      return updated;
    });
  };

  const handleImageUpload = async () => {
    if (form.mode !== "four-pics") return null;

    let exts = ["jpg", "jpg", "jpg", "jpg"];
    for (let i = 0; i < 4; i++) {
      const file = imageFiles[i];
      if (!file) continue;

      const ext = file.name.split(".").pop().toLowerCase();
      exts[i] = ext;

      const path = `phase${form.phase_number}level${form.level_number}image${
        i + 1
      }.${ext}`;
      const { error } = await supabase.storage
        .from("fourpics-images")
        .upload(path, file, { upsert: true });

      if (error) {
        console.error(`❌ Error uploading image ${i + 1}:`, error);
        alert(`Error uploading image ${i + 1}`);
      }
    }

    return buildImageUrls(form.phase_number, form.level_number, exts);
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
    setImageFiles([null, null, null, null]);
  };

  const handleSave = async () => {
    let imageUrls = form.image_urls;
    if (form.mode === "four-pics") {
      const uploadedUrls = await handleImageUpload();
      if (uploadedUrls) {
        imageUrls = uploadedUrls;
      }
    }

    const payload = {
      phase_number: Number(form.phase_number),
      level_number: Number(form.level_number),
      mode: form.mode,
      question: form.question,
      options: form.options.length > 0 ? form.options : null,
      answer: form.answer,
      image_urls: imageUrls || null,
      letters: form.letters || null,
      hint_letters: form.hint_letters,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase
        .from("quiz")
        .update(payload)
        .eq("id", editingId));
    } else {
      ({ error } = await supabase.from("quiz").insert([payload]));
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
      phase_number: quiz.phase_number,
      level_number: quiz.level_number,
      mode: quiz.mode || "trivia",
      question: quiz.question || "",
      options: quiz.options || [],
      answer: quiz.answer || "",
      hint_letters: quiz.hint_letters || "",
      image_urls: quiz.image_urls || "",
      letters: quiz.letters || "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this quiz?")) return;
    const { error } = await supabase.from("quiz").delete().eq("id", id);
    if (!error) fetchQuizzes();
  };

  const handleDeletePhase = async (phaseNumber) => {
    const confirmPhrase = prompt(
      `Type "burn down" to confirm deleting ALL quizzes from Phase ${phaseNumber}:`
    );
    if (confirmPhrase !== "burn down") {
      alert("❌ Deletion cancelled. Incorrect confirmation phrase.");
      return;
    }
    const { error } = await supabase
      .from("quiz")
      .delete()
      .eq("phase_number", phaseNumber);
    if (!error) fetchQuizzes();
  };

  const handleDeleteAll = async () => {
    const confirmPhrase = prompt(
      `Type "burn down" to confirm deleting ALL quizzes from ALL phases:`
    );
    if (confirmPhrase !== "burn down") {
      alert("❌ Deletion cancelled. Incorrect confirmation phrase.");
      return;
    }
    const { error } = await supabase.from("quiz").delete();
    if (!error) fetchQuizzes();
  };

  const togglePhaseCollapse = (phase) => {
    setCollapsedPhases((prev) => {
      const updated = { ...prev, [phase]: !prev[phase] };
      localStorage.setItem("collapsedPhases", JSON.stringify(updated));
      return updated;
    });
  };

  // Group quizzes by phase
  const phases = Array.from(new Set(quizzes.map((q) => q.phase_number))).sort(
    (a, b) => a - b
  );

  // Pagination logic
  const totalPages = Math.ceil(phases.length / phasesPerPage);
  const displayedPhases = phases.slice(
    (currentPage - 1) * phasesPerPage,
    currentPage * phasesPerPage
  );

  const totalQuizzesInPage = quizzes.filter((q) =>
    displayedPhases.includes(q.phase_number)
  ).length;

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
          <h2 className="text-lg font-bold">
            {editingId ? "Edit Quiz" : "Add New Quiz"}
          </h2>
          <label>Phase Number</label>
          <input
            type="number"
            value={form.phase_number}
            onChange={(e) => updateForm("phase_number", e.target.value)}
            className="border p-2 rounded"
          />
          <label>Level Number</label>
          <input
            type="number"
            value={form.level_number}
            onChange={(e) => updateForm("level_number", e.target.value)}
            className="border p-2 rounded"
          />
          <label>Game Mode</label>
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

          {form.mode === "trivia" && (
            <>
              <label>Question</label>
              <textarea
                value={form.question}
                onChange={(e) => updateForm("question", e.target.value)}
                className="border p-2 rounded"
              />
              <label>Answer</label>
              <input
                value={form.answer}
                onChange={(e) => updateForm("answer", e.target.value)}
                className="border p-2 rounded"
              />
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

          {form.mode === "word-fill" && (
            <>
              <label>Question</label>
              <textarea
                value={form.question}
                onChange={(e) => updateForm("question", e.target.value)}
                className="border p-2 rounded"
              />
              <label>Answer</label>
              <input
                value={form.answer}
                onChange={(e) => updateForm("answer", e.target.value)}
                className="border p-2 rounded"
              />
            </>
          )}

          {form.mode === "scripture-match" && (
            <>
              <label>Question</label>
              <textarea
                value={form.question}
                onChange={(e) => updateForm("question", e.target.value)}
                className="border p-2 rounded"
                rows={8}
              />
            </>
          )}

          {form.mode === "four-pics" && (
            <>
              <label>Answer</label>
              <input
                value={form.answer.toUpperCase()}
                onChange={(e) =>
                  updateForm("answer", e.target.value.toUpperCase())
                }
                onBlur={() => {
                  const answer = form.answer.trim().toUpperCase();
                  if (!answer) return;

                  // ✅ Hint: last 2 letters (or full answer if shorter)
                  const hint = answer.slice(-2);

                  // ✅ Letters: shuffle answer + random extras (max 12)
                  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                  const extraCount = Math.max(0, 12 - answer.length);
                  const extras = Array.from(
                    { length: extraCount },
                    () => alphabet[Math.floor(Math.random() * alphabet.length)]
                  );
                  const letters = [...answer.split(""), ...extras]
                    .sort(() => Math.random() - 0.5)
                    .join("");

                  // ✅ Update fields so they stay in sync
                  updateForm("hint_letters", hint);
                  updateForm("letters", letters);
                }}
                className="border p-2 rounded uppercase"
              />

              <label>HINT</label>
              <input
                value={form.hint_letters}
                disabled
                className="border p-2 rounded bg-gray-100 cursor-not-allowed"
              />

              <label>Letters</label>
              <input
                value={form.letters}
                readOnly
                className="border p-2 rounded bg-gray-100 cursor-not-allowed"
              />

              <label>Upload 4 Images</label>
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const files = [...imageFiles];
                    files[i] = e.target.files[0];
                    setImageFiles(files);
                  }}
                />
              ))}
            </>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave}>
              {editingId ? "Update Quiz" : "Add Quiz"}
            </Button>
            {editingId && <Button onClick={resetForm}>Cancel</Button>}
          </div>
        </div>
      )}

      <Button
        variant="destructive"
        className="mb-4 bg-red-700"
        onClick={handleDeleteAll}
      >
        🚨 Delete ALL Quizzes (All Phases)
      </Button>

      {loading ? (
        <p>Loading quizzes...</p>
      ) : (
        <>
          {displayedPhases.map((phase) => (
            <div key={phase} className="mb-4 border rounded">
              <div
                className="flex justify-between p-2 bg-gray-200 cursor-pointer"
                onClick={() => togglePhaseCollapse(phase)}
              >
                <span className="font-bold">Phase {phase}</span>
                <Button
                  variant="destructive"
                  className="bg-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePhase(phase);
                  }}
                >
                  Delete Phase
                </Button>
              </div>
              {!collapsedPhases[phase] && (
                <div className="p-2">
                  {quizzes
                    .filter((q) => q.phase_number === phase)
                    .map((quiz) => (
                      <div
                        key={quiz.id}
                        className="border p-3 rounded flex justify-between items-center mb-2"
                      >
                        <div>
                          <p className="font-semibold">
                            Level {quiz.level_number} ({quiz.mode})
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
          ))}

          <div className="flex items-center gap-2 mt-4">
            <span>
              Total Phases: {phases.length} | Total Quizzes: {quizzes.length} |
              Quizzes on this page: {totalQuizzesInPage}
            </span>

            <Button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Prev
            </Button>
            <span>
              Page {currentPage} of {totalPages}
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
      )}
    </div>
  );
}
