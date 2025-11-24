import { useAuth } from "@/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import SpiritualParallaxBackground from "@/components/SpiritualParallaxBackground";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/map");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Spiritual Parallax Background */}
      <SpiritualParallaxBackground />

      {/* Floating Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Bibles */}
        <div className="absolute top-20 left-10 text-6xl opacity-20 animate-pulse">
          📖
        </div>
        <div className="absolute bottom-32 right-20 text-5xl opacity-15 animate-pulse" style={{ animationDelay: '1s' }}>
          ✝️
        </div>
        <div className="absolute top-40 right-32 text-4xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}>
          ⭐
        </div>
        <div className="absolute bottom-40 left-32 text-5xl opacity-15 animate-pulse" style={{ animationDelay: '1.5s' }}>
          🕊️
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-md w-full">
        {/* Game Logo/Title Section */}
        <div className="text-center mb-8 space-y-4">
          {/* Glowing Logo Effect */}
          <div className="inline-block">
            <div className="text-7xl mb-2 animate-pulse">📖</div>
          </div>
          
          <h1 className="text-6xl font-black bg-gradient-to-r from-yellow-400 via-yellow-300 to-orange-400 bg-clip-text text-transparent drop-shadow-2xl">
            LightUP
          </h1>
          
          <p className="text-xl font-bold text-white drop-shadow-lg">
            ⚔️ Test Your Biblical Knowledge
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 space-y-6 border-4 border-purple-200">
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-black text-gray-800">
              Start Your Spiritual Journey
            </h2>
            <p className="text-gray-600 font-medium">
              Sign in to unlock divine challenges
            </p>
          </div>

          {/* Google Sign In Button - Game Style */}
          <button
            onClick={login}
            className="w-full golden-gradient text-white font-black py-5 px-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 btn-3d text-lg"
          >
            <div className="flex items-center justify-center gap-3">
              <svg className="w-7 h-7" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Sign in with Google</span>
            </div>
          </button>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-3 rounded-xl text-center">
              <div className="text-2xl mb-1">🎯</div>
              <p className="text-xs font-bold text-gray-700">Multiple Modes</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 rounded-xl text-center">
              <div className="text-2xl mb-1">🏆</div>
              <p className="text-xs font-bold text-gray-700">Leaderboards</p>
            </div>
            <div className="bg-gradient-to-br from-pink-50 to-yellow-50 p-3 rounded-xl text-center">
              <div className="text-2xl mb-1">⚡</div>
              <p className="text-xs font-bold text-gray-700">Power-ups</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-3 rounded-xl text-center">
              <div className="text-2xl mb-1">📅</div>
              <p className="text-xs font-bold text-gray-700">Weekly Challenges</p>
            </div>
          </div>

          <div className="text-center text-xs text-gray-500 pt-2">
            By signing in, you agree to our Terms & Privacy Policy
          </div>
        </div>

        {/* Bottom Tagline */}
        <div className="text-center mt-6">
          <p className="text-white font-bold text-lg drop-shadow-lg">
            ✨ Illuminate Your Faith Through Play ✨
          </p>
        </div>
      </div>
    </div>
  );
}
