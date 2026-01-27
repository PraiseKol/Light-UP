// src/components/ui/WeeklyChallengeLoadingSkeleton.jsx
import { useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';

// Shimmer animation component
function Shimmer({ className = '' }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </div>
  );
}

// Skeleton box component
function SkeletonBox({ className = '', shimmer = true }) {
  return (
    <div className={`bg-white/30 rounded-xl ${className} ${shimmer ? 'relative overflow-hidden' : ''}`}>
      {shimmer && (
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      )}
    </div>
  );
}

export default function WeeklyChallengeLoadingSkeleton() {
  const { config } = useTheme();

  // Memoize twinkling stars
  const stars = useMemo(() => 
    [...Array(30)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${2 + Math.random() * 2}s`,
    })), []
  );

  // Spiritual loading messages
  const loadingMessages = [
    "✨ Lighting up your word...",
    "📜 Preparing your challenge...",
    "🕊️ Gathering wisdom...",
    "⭐ Setting the stage..."
  ];
  
  const message = useMemo(() => 
    loadingMessages[Math.floor(Math.random() * loadingMessages.length)], []
  );

  return (
    <div className={`min-h-screen flex flex-col bg-gradient-to-b ${config.background.gradient} relative overflow-hidden`}>
      {/* Twinkling stars background */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute w-1 h-1 bg-white rounded-full animate-pulse pointer-events-none"
          style={{
            top: star.top,
            left: star.left,
            animationDelay: star.delay,
            animationDuration: star.duration,
          }}
        />
      ))}

      {/* Skeleton HUD */}
      <div className="flex-shrink-0 flex justify-between items-center px-4 py-3 bg-gradient-to-r from-pink-100/80 to-purple-100/80 backdrop-blur-md shadow-md">
        <div className="flex items-center gap-3">
          <SkeletonBox className="w-8 h-8" />
          <SkeletonBox className="w-16 h-5" />
        </div>
        <div className="flex items-center gap-4">
          <SkeletonBox className="w-20 h-5" />
          <SkeletonBox className="w-24 h-5" />
        </div>
      </div>

      {/* Skeleton Progress bar */}
      <div className="px-4 py-3">
        <SkeletonBox className="w-full h-3 rounded-full" />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center px-4 relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 max-w-lg w-full border-2 border-pink-200">
          {/* Loading message */}
          <div className="text-center mb-6">
            <div className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent animate-pulse">
              {message}
            </div>
          </div>

          {/* Skeleton question area */}
          <div className="space-y-4 mb-6">
            <SkeletonBox className="w-full h-6" />
            <SkeletonBox className="w-3/4 h-6 mx-auto" />
          </div>

          {/* Skeleton answer/letter boxes */}
          <div className="flex justify-center gap-2 mb-6">
            {[...Array(6)].map((_, i) => (
              <SkeletonBox 
                key={i} 
                className="w-10 h-12 rounded-lg" 
              />
            ))}
          </div>

          {/* Skeleton options grid */}
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <SkeletonBox 
                key={i} 
                className="h-14 rounded-xl" 
              />
            ))}
          </div>
        </div>
      </div>

      {/* Skeleton stats bar */}
      <div className="flex-shrink-0 flex justify-center gap-8 px-4 py-4 bg-gradient-to-r from-pink-100/80 to-purple-100/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-green-500">✅</span>
          <SkeletonBox className="w-12 h-5" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-500">❌</span>
          <SkeletonBox className="w-12 h-5" />
        </div>
      </div>

      {/* Add shimmer keyframes to document */}
      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
