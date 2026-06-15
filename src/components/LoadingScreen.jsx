import { motion } from "framer-motion";
import loadingArt from "@/assets/lightup-loading.jpg";

export default function LoadingScreen({ message = "Loading" }) {
  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-gradient-to-b from-[#1a1240] via-[#2a1a5e] to-[#0f0a2a]">
      {/* Hero artwork */}
      <div className="absolute inset-0">
        <img
          src={loadingArt}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover opacity-90"
        />
        {/* Bottom gradient to cover any AI text artifacts & blend into wordmark */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0f0a2a] via-[#0f0a2a]/80 to-transparent" />
        {/* Soft top vignette */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/40 to-transparent" />
      </div>

      {/* Floating sparkles */}
      {[...Array(14)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-yellow-200 pointer-events-none"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            fontSize: `${10 + Math.random() * 12}px`,
            filter: "drop-shadow(0 0 6px rgba(255,217,61,0.8))",
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.6, 1.2, 0.6],
            y: [0, -8, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        >
          ✦
        </motion.div>
      ))}

      {/* Wordmark + loader */}
      <div className="absolute inset-x-0 bottom-0 pb-12 sm:pb-16 px-6 flex flex-col items-center text-center">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl sm:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-300 to-amber-500 drop-shadow-[0_4px_0_rgba(124,58,237,0.9)]"
          style={{ WebkitTextStroke: "1px rgba(255,255,255,0.15)" }}
        >
          LightUP
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-1 text-pink-100/80 text-xs sm:text-sm font-medium tracking-wider uppercase"
        >
          ✦ Test Your Biblical Knowledge ✦
        </motion.p>

        <div className="mt-6 flex items-center gap-2">
          <span className="text-white/90 font-semibold text-base sm:text-lg">
            {message}
          </span>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-yellow-300 shadow-[0_0_10px_rgba(255,217,61,0.9)]"
              animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
