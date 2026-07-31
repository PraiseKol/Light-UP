import React from 'react';
import { ArrowLeft, Pause, Play } from 'lucide-react';

const GameHUD = ({
  level,
  moves,
  matchedCount,
  totalPairs,
  timeElapsed,
  timeLimit,
  isPaused,
  lives,
  isShieldActive,
  matchTypeHint,
  onPause,
  onResume,
  onBack
}) => {
  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timeRemaining = timeLimit ? (timeLimit * 1000) - timeElapsed : null;
  const isLowTime = timeRemaining && timeRemaining < 30000;

  return (
    <div className="candy-gradient shadow-md safe-area-pt shrink-0">
      <div className="max-w-2xl mx-auto px-2 sm:px-4 py-2 sm:py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Back Button + Lives */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onBack}
              className="orb-glass !w-9 !h-9 sm:!w-10 sm:!h-10 flex items-center justify-center text-white"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            
            <div className={`chip-3d chip-3d-heart !py-1 !px-2 text-xs sm:text-sm ${isShieldActive ? 'ring-2 ring-yellow-300 animate-pulse' : ''}`}>
              ❤️ <span>{lives ?? '?'}</span>
              {isShieldActive && <span className="ml-0.5">🛡️</span>}
            </div>
          </div>

          {/* Level & Progress */}
          <div className="flex-1 text-center min-w-0">
            <div className="text-sm sm:text-lg font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">Level {level}</div>
            <div className="flex items-center justify-center gap-2 sm:gap-4 text-[10px] sm:text-sm text-white/90 font-semibold">
              <span>Moves: <span className="font-black text-white">{moves}</span></span>
              <span>Matched: <span className="font-black text-white">{matchedCount}/{totalPairs}</span></span>
            </div>
            {matchTypeHint && (
              <div className="mt-0.5 text-[10px] sm:text-xs text-white/80 truncate">
                {matchTypeHint.icon} {matchTypeHint.text}
              </div>
            )}
          </div>

          {/* Timer / Pause */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {timeLimit ? (
              <div className={`chip-3d !py-1 !px-2 text-xs sm:text-sm font-black font-mono ${isLowTime ? 'ring-2 ring-red-400 animate-pulse text-red-600' : ''}`}>
                {formatTime(Math.max(0, timeRemaining))}
              </div>
            ) : (
              <div className="chip-3d !py-1 !px-2 text-xs sm:text-sm font-black font-mono">
                {formatTime(timeElapsed)}
              </div>
            )}

            <button
              onClick={isPaused ? onResume : onPause}
              className="orb-glass-featured !w-9 !h-9 sm:!w-10 sm:!h-10 flex items-center justify-center text-amber-900"
            >
              {isPaused ? <Play className="w-4 h-4 sm:w-5 sm:h-5" /> : <Pause className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameHUD;
