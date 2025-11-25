import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function PWAUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('✅ Service Worker registered successfully');
      // Check for updates every hour
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000); // 1 hour
      }
    },
    onRegisterError(error) {
      console.error('❌ Service Worker registration error:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true);
    }
  }, [needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true); // Force reload with new version
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setNeedRefresh(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] pb-20 sm:pb-4 px-4 pointer-events-none">
      <div className="max-w-xl mx-auto pointer-events-auto">
        {/* Update Banner with Candy Crush Style */}
        <div className="relative bg-gradient-to-br from-pink-400 via-purple-400 to-blue-500 p-1 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-pulse">
          <div className="bg-white/95 backdrop-blur-lg rounded-xl p-4 sm:p-6">
            {/* Icon and Text */}
            <div className="flex items-start gap-4">
              {/* Animated Sparkle Icon */}
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center shadow-[0_4px_16px_rgba(251,191,36,0.5)] animate-bounce">
                <span className="text-2xl">✨</span>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-1">
                  New Version Available! 🎉
                </h3>
                <p className="text-sm sm:text-base text-gray-700">
                  We've made improvements to your experience. Update now to get the latest features!
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              {/* Update Button - 3D Candy Style */}
              <button
                onClick={handleUpdate}
                className="flex-1 relative bg-gradient-to-b from-green-400 via-green-500 to-green-600 text-white font-bold py-3 px-6 rounded-xl shadow-[0_6px_0_#15803d,0_8px_16px_rgba(34,197,94,0.4)] active:shadow-[0_2px_0_#15803d] active:translate-y-1 transition-all duration-150 hover:brightness-110"
              >
                <span className="relative z-10">🔄 Update Now</span>
                <div className="absolute inset-0 bg-white/20 rounded-xl"></div>
              </button>

              {/* Later Button */}
              <button
                onClick={handleDismiss}
                className="relative bg-gradient-to-b from-gray-300 via-gray-400 to-gray-500 text-gray-800 font-semibold py-3 px-4 rounded-xl shadow-[0_4px_0_#6b7280,0_6px_12px_rgba(107,114,128,0.3)] active:shadow-[0_1px_0_#6b7280] active:translate-y-1 transition-all duration-150 hover:brightness-110"
              >
                <span className="relative z-10">Later</span>
                <div className="absolute inset-0 bg-white/20 rounded-xl"></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
