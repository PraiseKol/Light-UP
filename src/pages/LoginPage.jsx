import { useAuth } from "@/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Book, Trophy, Zap, Users } from "lucide-react";
import { playSound } from "@/utils/sound";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/map");
    }
  }, [user, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800">
      {/* Animated star field */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Glowing orbs */}
      <motion.div
        className="absolute top-20 left-10 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 5, repeat: Infinity }}
      />

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        {/* Logo and title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 1, delay: 0.2 }}
            className="inline-block mb-4"
          >
            <div className="relative">
              <Book className="w-20 h-20 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]" />
              <Sparkles className="w-8 h-8 text-yellow-300 absolute -top-2 -right-2 animate-pulse" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 mb-2 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]"
          >
            LightUP
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-blue-200 text-lg font-medium"
          >
            📖 Test Your Biblical Knowledge
          </motion.p>
        </div>

        {/* Glass morphism login card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
        >
          <h2 className="text-2xl font-bold text-white text-center mb-6">
            Start Your Journey
          </h2>

          {/* Google Sign-In Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              playSound("click", true);
              login();
            }}
            className="w-full bg-white hover:bg-gray-50 text-gray-800 font-bold py-4 px-6 rounded-xl shadow-[0_8px_0_#cbd5e1,0_4px_0_#ffffff_inset,0_15px_25px_rgba(0,0,0,0.3)] hover:shadow-[0_6px_0_#cbd5e1,0_3px_0_#ffffff_inset,0_12px_22px_rgba(0,0,0,0.4)] active:shadow-[0_2px_0_#cbd5e1,0_1px_0_#ffffff_inset,0_6px_12px_rgba(0,0,0,0.5)] hover:translate-y-[-2px] active:translate-y-[6px] transition-all duration-150 flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-lg">Sign in with Google</span>
          </motion.button>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="text-center p-3 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
              <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <p className="text-xs text-white/90 font-medium">Power-ups</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
              <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <p className="text-xs text-white/90 font-medium">Leaderboards</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
              <Users className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <p className="text-xs text-white/90 font-medium">Multiplayer</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
              <Book className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <p className="text-xs text-white/90 font-medium">Weekly Quiz</p>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-blue-200/60 text-sm mt-6">
          Join thousands on their spiritual journey ✨
        </p>
      </motion.div>
    </div>
  );
}
