// ScriptureModal.jsx
export default function ScriptureModal({ text, onNext }) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
        <div className="bg-white p-6 rounded-xl max-w-md text-center shadow-xl">
          <p className="text-lg font-medium text-charcoal mb-4">
            {text || "Lighting your path..."}
          </p>
          <button
            className="bg-gold text-white px-4 py-2 rounded-full shadow hover:bg-yellow-600 transition"
            onClick={onNext}
          >
            Light UP Next Phase
          </button>
        </div>
      </div>
    );
  }
  