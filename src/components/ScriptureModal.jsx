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
      <div className="relative bg-gradient-to-br from-white/95 via-pink-50/90 to-purple-50/90 backdrop-blur-xl p-8 rounded-[2rem] max-w-md w-[90%] text-center shadow-[0_8px_0_rgba(0,0,0,0.1),0_20px_60px_rgba(79,156,249,0.7)] border-4 border-white/60 animate-popIn">
        {/* Glowing light bulb icon at top */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-24 h-24 bg-gradient-to-br from-candyYellow to-candyOrange rounded-full shadow-[0_0_50px_rgba(255,217,61,0.9)] animate-float border-4 border-white/60 flex items-center justify-center">
          <span className="text-5xl">💡</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-candyBlue via-candyPurple to-candyPink bg-clip-text text-transparent mb-6 mt-6 drop-shadow-lg">
          ✨ Lighting Your Path ✨
        </h2>

        {/* Scripture text */}
        <div className="bg-white/60 backdrop-blur rounded-2xl p-4 mb-8 border-2 border-white/60 shadow-inner">
          <p className="text-sm sm:text-base text-gray-800 italic leading-relaxed font-medium">
            {scripture || "Lighting your path..."}
          </p>
        </div>

        {/* 3D Candy-style button */}
        <button
          className="relative bg-gradient-to-br from-candyBlue to-candyPurple text-white font-black text-base sm:text-lg px-8 py-4 rounded-full shadow-[0_6px_0_rgba(79,70,229,0.8),0_8px_20px_rgba(79,156,249,0.6)] border-4 border-white/40 hover:shadow-[0_4px_0_rgba(79,70,229,0.8),0_6px_20px_rgba(79,156,249,0.7)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-[0_2px_0_rgba(79,70,229,0.8)] transition-all duration-150 hover:scale-105"
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
