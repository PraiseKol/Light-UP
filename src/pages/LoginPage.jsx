// src/pages/LoginPage.jsx
import { useAuth } from "../auth/AuthProvider";

export default function LoginPage() {
  const { login } = useAuth();

  return (
  <div className="h-screen flex items-center justify-center bg-gradient-to-br from-yellow-200 via-blue-50 to-white text-charcoal">
    <div className="backdrop-blur-xl bg-white/40 border border-white/20 rounded-2xl shadow-2xl p-10 max-w-lg w-full text-center animate-fadeIn">
      <h1 className="text-4xl font-extrabold flex items-center justify-center gap-2">
        <span className="animate-bounce">🕹️</span>
        <span className="text-blue-700 drop-shadow-lg">LightUP</span>
        Game App
        <span className="animate-bounce delay-200">🎮</span>
      </h1>

      <p className="text-lg text-gray-700 mt-4">
        Play, learn, and be inspired — anytime, anywhere! <div>⛪📖</div>
      </p>

      <div className="mb-4">
          <label className="text-2xl text-gray-700 mb-1 block font-medium">
            Invite Code
          </label>
          <input
            className="w-full border border-blue-300 rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-900 focus:outline-none"
            
            
            placeholder="Your Invite Code Goes Here"
          />
        </div>

      <button
        onClick={login}
        className="mt-8 bg-gold text-black px-8 py-3 rounded-full text-lg font-semibold shadow-lg hover:shadow-goldGlow hover:scale-105 transition-all duration-300"
      >
        Sign in with Google
      </button>
    </div>
  </div>
);

  
  
}
