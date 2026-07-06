// src/components/NoQuizPage.jsx
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function NoQuizPage() {
  const navigate = useNavigate();
  const { config } = useTheme();

  // Memoize twinkling stars to prevent re-renders
  const stars = useMemo(() => 
    [...Array(25)].map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${2 + Math.random() * 2}s`,
    })), []
  );

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 bg-gradient-to-b ${config.background.gradient} relative overflow-hidden`}>
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

      {/* Main card */}
      <div className="modal-3d p-8 max-w-md w-full text-center relative z-10 animate-scale-in">
        <div className="text-6xl mb-4">📖</div>

        <h2 className="text-2xl font-extrabold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent mb-3">
          Quiz Coming Soon!
        </h2>

        <p className="text-purple-800/80 mb-6 text-sm leading-relaxed">
          This level's quiz is being prepared.
          <br />
          Check back soon for new challenges!
        </p>

        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="w-8 h-0.5 bg-gradient-to-r from-transparent to-pink-300"></span>
          <span className="text-xl">{config.decorations.primary[0]}</span>
          <span className="w-8 h-0.5 bg-gradient-to-l from-transparent to-pink-300"></span>
        </div>

        <button
          onClick={() => navigate('/map')}
          className="btn-orb btn-orb-green px-6 py-3 font-bold text-base flex items-center gap-2 mx-auto"
        >
          <span>🗺️</span>
          Back to Map
        </button>
      </div>
    </div>
  );
}
