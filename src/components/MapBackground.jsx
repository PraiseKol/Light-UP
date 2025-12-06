import { motion } from "framer-motion";
import { useMemo } from "react";

export default function MapBackground() {
  // Generate snowflakes with random properties
  const snowflakes = useMemo(
    () =>
      [...Array(50)].map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        size: Math.random() * 10 + 4,
        duration: Math.random() * 10 + 8,
        delay: Math.random() * 8,
        opacity: Math.random() * 0.7 + 0.3,
      })),
    [],
  );

  // Christmas lights colors
  const lightColors = ["#ff0000", "#00ff00", "#ffff00", "#ff00ff", "#00ffff", "#ff6600"];

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Winter night sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c1445] via-[#1e3a5f] to-[#1b4332]" />

      {/* Stars scattered across sky */}
      <div className="absolute inset-0">
        {[...Array(60)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-80"
            style={{
              top: `${Math.random() * 60}%`,
              left: `${Math.random() * 100}%`,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Large Christmas Star */}
      <motion.div
        className="absolute top-[8%] left-1/2 -translate-x-1/2 text-6xl animate-star-glow"
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
      >
        ⭐
      </motion.div>

      {/* Christmas Lights String at top */}
      <div className="absolute top-0 left-0 right-0 flex justify-around py-2">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="w-3 h-4 rounded-full animate-twinkle-lights"
            style={{
              backgroundColor: lightColors[i % lightColors.length],
              boxShadow: `0 0 10px ${lightColors[i % lightColors.length]}`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* Flying Reindeer */}
      <motion.div
        className="absolute top-[12%] text-3xl"
        animate={{
          x: ["-10%", "110%"],
          y: [0, -20, 0, -15, 0],
        }}
        transition={{
          x: { duration: 25, repeat: Infinity, ease: "linear" },
          y: { duration: 3, repeat: Infinity },
        }}
      >
        🕊️
      </motion.div>

      {/* Falling Snowflakes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {snowflakes.map((flake) => (
          <div
            key={flake.id}
            className="absolute text-white animate-snowfall"
            style={{
              left: flake.left,
              top: "-20px",
              fontSize: `${flake.size}px`,
              animationDuration: `${flake.duration}s`,
              animationDelay: `${flake.delay}s`,
              opacity: flake.opacity,
            }}
          >
            ❄
          </div>
        ))}
      </div>

      {/* Christmas Village silhouette with lit windows */}
      <div className="absolute bottom-[22%] right-[8%] opacity-50">
        <svg width="180" height="120" viewBox="0 0 180 120" fill="none">
          {/* House 1 */}
          <rect x="10" y="60" width="40" height="40" fill="#1a2a1e" />
          <polygon points="30,40 5,60 55,60" fill="#1a2a1e" />
          <rect x="22" y="75" width="8" height="8" fill="#ffd700" opacity="0.8" />
          <rect x="35" y="75" width="8" height="8" fill="#ffd700" opacity="0.6" />
          {/* House 2 */}
          <rect x="60" y="50" width="50" height="50" fill="#1a2a1e" />
          <polygon points="85,25 55,50 115,50" fill="#1a2a1e" />
          <rect x="70" y="65" width="10" height="10" fill="#ffd700" opacity="0.7" />
          <rect x="90" y="65" width="10" height="10" fill="#ffd700" opacity="0.9" />
          {/* Church with steeple */}
          <rect x="125" y="45" width="45" height="55" fill="#1a2a1e" />
          <polygon points="147.5,15 120,45 175,45" fill="#1a2a1e" />
          <rect x="143" y="20" width="9" height="20" fill="#1a2a1e" />
          <text x="145" y="35" fontSize="8" fill="#ffd700">
            ✝
          </text>
          <rect x="138" y="60" width="8" height="8" fill="#ffd700" opacity="0.8" />
          <rect x="155" y="60" width="8" height="8" fill="#ffd700" opacity="0.6" />
        </svg>
      </div>

      {/* Christmas Tree silhouettes */}
      <div className="absolute bottom-[18%] left-[5%] opacity-60">
        <svg width="60" height="80" viewBox="0 0 60 80" fill="none">
          <polygon points="30,5 10,35 50,35" fill="#166534" />
          <polygon points="30,20 5,55 55,55" fill="#15803d" />
          <polygon points="30,40 0,80 60,80" fill="#14532d" />
          <rect x="25" y="75" width="10" height="10" fill="#5c4033" />
          {/* Tree lights */}
          <circle cx="25" cy="25" r="2" fill="#ff0000" className="animate-twinkle-lights" />
          <circle
            cx="35"
            cy="30"
            r="2"
            fill="#ffff00"
            className="animate-twinkle-lights"
            style={{ animationDelay: "0.3s" }}
          />
          <circle
            cx="20"
            cy="45"
            r="2"
            fill="#00ff00"
            className="animate-twinkle-lights"
            style={{ animationDelay: "0.6s" }}
          />
          <circle
            cx="40"
            cy="50"
            r="2"
            fill="#ff00ff"
            className="animate-twinkle-lights"
            style={{ animationDelay: "0.9s" }}
          />
          <circle
            cx="30"
            cy="65"
            r="2"
            fill="#00ffff"
            className="animate-twinkle-lights"
            style={{ animationDelay: "1.2s" }}
          />
        </svg>
      </div>

      {/* Snow-covered rolling hills */}
      <div className="absolute bottom-0 left-0 right-0 h-[30%]">
        <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="none">
          {/* Back hill with snow cap */}
          <path d="M0,150 Q200,80 400,120 T800,100 L1200,140 L1200,300 L0,300 Z" fill="#166534" opacity="0.6" />
          <path
            d="M0,150 Q200,80 400,120 T800,100 L1200,140"
            fill="none"
            stroke="#f8fafc"
            strokeWidth="8"
            opacity="0.4"
          />
          {/* Front hill with snow cap */}
          <path d="M0,180 Q300,120 600,160 T1200,180 L1200,300 L0,300 Z" fill="#22c55e" opacity="0.8" />
          <path d="M0,180 Q300,120 600,160 T1200,180" fill="none" stroke="#ffffff" strokeWidth="10" opacity="0.6" />
        </svg>
      </div>

      {/* Snow ground overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white/30 to-transparent" />

      {/* Snow drifts/piles */}
      <div className="absolute bottom-0 left-[10%] w-24 h-8 bg-white/60 rounded-t-full blur-sm" />
      <div className="absolute bottom-0 left-[35%] w-32 h-10 bg-white/50 rounded-t-full blur-sm" />
      <div className="absolute bottom-0 right-[20%] w-28 h-9 bg-white/55 rounded-t-full blur-sm" />
      <div className="absolute bottom-0 right-[5%] w-20 h-7 bg-white/45 rounded-t-full blur-sm" />

      {/* Snowman */}
      <motion.div
        className="absolute bottom-[12%] right-[30%]"
        animate={{ rotate: [-2, 2, -2] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="text-4xl">⛄</div>
      </motion.div>

      {/* Second Snowman */}
      <motion.div
        className="absolute bottom-[14%] left-[25%]"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="text-3xl opacity-80">⛄</div>
      </motion.div>

      {/* Nativity Scene silhouette */}
      <div className="absolute bottom-[25%] left-[40%] opacity-30">
        <svg width="100" height="60" viewBox="0 0 100 60" fill="none">
          <path d="M50,10 L30,40 L70,40 Z" fill="#1a2a1e" />
          <rect x="35" y="40" width="30" height="20" fill="#1a2a1e" />
          <ellipse cx="50" cy="50" rx="8" ry="6" fill="#2a3a2e" />
        </svg>
      </div>

      {/* Animated Dove */}
      <motion.div
        className="absolute top-[18%] right-[15%] text-3xl opacity-70"
        animate={{ y: [0, -15, 0], rotate: [0, 8, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        🕊️
      </motion.div>

      {/* Glowing Cross with Christmas candle light effect */}
      <motion.div
        className="absolute top-[35%] left-[8%] text-4xl"
        animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="text-christmasGold drop-shadow-[0_0_12px_rgba(255,215,0,0.8)]">✝</div>
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
        <div className="text-christmasGold/60 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">✝</div>
      </motion.div>

      {/* Subtle pattern overlay for texture */}
      <div
        className="absolute inset-0 opacity-3"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />
    </div>
  );
}
