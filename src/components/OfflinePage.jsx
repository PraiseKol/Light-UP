// src/components/OfflinePage.jsx
import { useTheme } from '@/context/ThemeContext';

export default function OfflinePage() {
  const { config } = useTheme();

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 bg-gradient-to-b ${config.background.gradient} relative overflow-hidden`}>
      {/* Twinkling stars background */}
      {[...Array(25)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full animate-pulse pointer-events-none"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
          }}
        />
      ))}

      {/* Offline card */}
      <div className="modal-3d p-8 max-w-md w-full text-center relative z-10">

        {/* Signal icon */}
        <div className="text-6xl mb-4">📡</div>
        
        {/* Title */}
        <h2 className="text-2xl font-extrabold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent mb-2">
          You're Offline
        </h2>
        
        {/* Message */}
        <p className="text-gray-600 mb-6 text-sm">
          Don't worry! Your progress is saved.
          <br />
          We'll reconnect automatically when you're back online.
        </p>

        {/* Animated connection dots */}
        <div className="flex justify-center items-center gap-2 mb-3">
          <div 
            className="w-3 h-3 bg-pink-400 rounded-full animate-pulse"
            style={{ animationDelay: '0s' }}
          />
          <div 
            className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"
            style={{ animationDelay: '0.3s' }}
          />
          <div 
            className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"
            style={{ animationDelay: '0.6s' }}
          />
        </div>
        
        <p className="text-xs text-gray-400">
          Waiting for connection...
        </p>
      </div>
    </div>
  );
}
