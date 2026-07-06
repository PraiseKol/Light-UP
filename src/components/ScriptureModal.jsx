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
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center backdrop-blur-md">
      {/* Animated background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-candyYellow/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-candyPurple/20 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
      </div>

      {/* Main modal card */}
      <div className="modal-3d relative p-8 max-w-md w-[90%] text-center animate-popIn">
        {/* Glowing light bulb orb at top */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 icon-orb yellow !w-20 !h-20 !text-4xl animate-float">
          💡
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-candyBlue via-candyPurple to-candyPink bg-clip-text text-transparent mb-6 mt-10 drop-shadow-lg">
          ✨ Lighting Your Path ✨
        </h2>

        {/* Scripture text */}
        <div className="bg-white/70 backdrop-blur rounded-2xl p-4 mb-8 border-2 border-purple-100 shadow-inner">
          <p className="text-sm sm:text-base text-purple-900 italic leading-relaxed font-medium">
            {scripture || "Lighting your path..."}
          </p>
        </div>

        {/* 3D orb button */}
        <button
          className="btn-orb btn-orb-purple px-8 py-4 font-black text-base sm:text-lg mx-auto"
          onClick={handleNextClick}
        >
          <span className="flex items-center gap-2 justify-center">
            <span className="text-2xl">💡</span>
            <span>Light UP Next Phase</span>
          </span>
        </button>
      </div>
    </div>
  );
}
