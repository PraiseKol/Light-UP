import { motion } from "framer-motion";

export default function MapBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Deep teal to navy gradient sky matching reference */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d2847] via-[#1a4a5e] to-[#2d5a4a]" />

      {/* Stars scattered across sky */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-80"
            style={{
              top: `${Math.random() * 70}%`,
              left: `${Math.random() * 100}%`,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Temple silhouette in distance */}
      <div className="absolute bottom-[25%] right-[10%] opacity-30">
        <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
          <rect x="40" y="30" width="40" height="50" fill="#1a3a2e" />
          <polygon points="60,10 30,30 90,30" fill="#1a3a2e" />
          <rect x="50" y="50" width="8" height="30" fill="#0d2020" />
          <rect x="62" y="50" width="8" height="30" fill="#0d2020" />
        </svg>
      </div>

      {/* Tree silhouette on left */}
      <div className="absolute bottom-[20%] left-[8%] opacity-40">
        <svg width="80" height="100" viewBox="0 0 80 100" fill="none">
          <rect x="35" y="60" width="10" height="40" fill="#1a3a2e" />
          <circle cx="40" cy="40" r="30" fill="#2d5a4a" />
          <circle cx="30" cy="30" r="25" fill="#1e4a3a" />
          <circle cx="50" cy="35" r="28" fill="#234a3a" />
        </svg>
      </div>

      {/* Rolling green hills in foreground */}
      <div className="absolute bottom-0 left-0 right-0 h-[30%]">
        <svg
          className="absolute bottom-0 w-full h-full"
          viewBox="0 0 1200 300"
          preserveAspectRatio="none"
        >
          {/* Back hill */}
          <path
            d="M0,150 Q200,80 400,120 T800,100 L1200,140 L1200,300 L0,300 Z"
            fill="#166534"
            opacity="0.6"
          />
          {/* Front hill */}
          <path
            d="M0,180 Q300,120 600,160 T1200,180 L1200,300 L0,300 Z"
            fill="#22c55e"
            opacity="0.8"
          />
        </svg>
      </div>

      {/* Floating light particles (sparkles) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-yellow-200/40 rounded-full blur-sm"
            initial={{
              x: `${Math.random() * 100}%`,
              y: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [
                `${Math.random() * 100}%`,
                `${Math.random() * 100}%`,
              ],
              x: [
                `${Math.random() * 100}%`,
                `${Math.random() * 100}%`,
              ],
            }}
            transition={{
              duration: 15 + Math.random() * 10,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Animated Dove */}
      <motion.div 
        className="absolute top-[15%] right-[12%] text-3xl opacity-70"
        animate={{ y: [0, -15, 0], rotate: [0, 8, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        🕊️
      </motion.div>

      {/* Animated Cross with Glow */}
      <motion.div 
        className="absolute top-[35%] left-[8%] text-4xl"
        animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="text-yellow-300/50 drop-shadow-[0_0_8px_rgba(253,224,71,0.6)]">✝</div>
      </motion.div>

      {/* Animated Angel */}
      <motion.div 
        className="absolute top-[55%] right-[10%] text-3xl opacity-60"
        animate={{ y: [-8, 8, -8] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        👼
      </motion.div>

      {/* Second Dove */}
      <motion.div 
        className="absolute top-[70%] left-[15%] text-2xl opacity-50"
        animate={{ x: [-5, 5, -5], rotate: [-5, 5, -5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        🕊️
      </motion.div>

      {/* Glowing Cross Bottom */}
      <motion.div 
        className="absolute bottom-[35%] right-[18%] text-3xl"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="text-yellow-200/40 drop-shadow-[0_0_10px_rgba(253,224,71,0.5)]">✝</div>
      </motion.div>

      {/* Subtle pattern overlay for texture */}
      <div
        className="absolute inset-0 opacity-3"
        style={{
          backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />
    </div>
  );
}
