// ScriptureModal.jsx
export default function ScriptureModal({ isOpen, onClose, scripture, onNext }) {
  // 🛑 Prevent rendering when modal shouldn't be visible
  if (!isOpen) return null;

  const handleNextClick = () => {
    // First close the modal visually
    onClose?.();

    // Then trigger phase scroll or other logic
    onNext?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white p-6 rounded-2xl max-w-md w-[90%] text-center shadow-2xl border-4 border-gold animate-popIn">
        <h2 className="text-xl font-extrabold text-candyBlue mb-3">
          ✨ Lighting Your Path ✨
        </h2>

        <p className="text-base text-gray-700 mb-6 italic">
          {scripture || "Lighting your path..."}
        </p>

        <button
          className="bg-gradient-to-r from-candyBlue to-candyPurple text-white font-bold px-6 py-3 rounded-full shadow-lg hover:scale-105 transition-all"
          onClick={handleNextClick}
        >
          💡 Light UP Next Phase
        </button>
      </div>
    </div>
  );
}
