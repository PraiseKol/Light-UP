import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Pause, Play } from 'lucide-react';

const GameHUD = ({
  level,
  moves,
  matchedCount,
  totalPairs,
  timeElapsed,
  timeLimit,
  isPaused,
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
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-amber-100/95 to-amber-50/90 backdrop-blur-sm border-b-2 border-amber-300 shadow-lg">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Back Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-amber-700 hover:bg-amber-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>

          {/* Level & Progress */}
          <div className="flex-1 mx-4">
            <div className="text-center">
              <div className="text-lg font-bold text-amber-800">Level {level}</div>
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="text-amber-700">
                  Moves: <span className="font-bold text-amber-900">{moves}</span>
                </span>
                <span className="text-amber-700">
                  Matched: <span className="font-bold text-amber-900">{matchedCount}/{totalPairs}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Timer / Pause */}
          <div className="flex items-center gap-2">
            {timeLimit && (
              <div className={`px-3 py-1 rounded-full font-mono font-bold text-sm ${
                isLowTime 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-white text-amber-800 shadow-md'
              }`}>
                {formatTime(Math.max(0, timeRemaining))}
              </div>
            )}
            
            {!timeLimit && (
              <div className="px-3 py-1 rounded-full bg-white text-amber-800 shadow-md font-mono text-sm">
                {formatTime(timeElapsed)}
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={isPaused ? onResume : onPause}
              className="w-10 h-10 rounded-full bg-amber-500 text-white shadow-md flex items-center justify-center hover:bg-amber-600 transition-colors"
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameHUD;
