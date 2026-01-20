import { motion } from "framer-motion";

export default function MapBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Deep purple-blue gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-900 via-purple-900 to-blue-900" />

      {/* Twinkling stars */}
      <div className="absolute inset-0">
        {[...Array(60)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-80"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Floating light particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-2 h-2 bg-candyYellow/30 rounded-full blur-sm"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Animated Dove 1 */}
      <motion.div
        className="absolute top-[15%] right-[15%] text-3xl opacity-70"
        animate={{ y: [0, -15, 0], rotate: [0, 8, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        🕊️
      </motion.div>

      {/* Animated Dove 2 */}
      <motion.div
        className="absolute top-[12%] text-2xl opacity-60"
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

      {/* Animated Dove 3 */}
      <motion.div
        className="absolute top-[70%] left-[15%] text-2xl opacity-50"
        animate={{ x: [-5, 5, -5], rotate: [-5, 5, -5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        🕊️
      </motion.div>

      {/* Glowing Cross 1 */}
      <motion.div
        className="absolute top-[35%] left-[8%] text-4xl"
        animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="text-candyYellow drop-shadow-[0_0_12px_rgba(255,217,61,0.8)]">✝</div>
      </motion.div>

      {/* Glowing Cross 2 */}
      <motion.div
        className="absolute bottom-[35%] right-[18%] text-3xl"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="text-candyYellow/60 drop-shadow-[0_0_10px_rgba(255,217,61,0.5)]">✝</div>
      </motion.div>

      {/* Animated Angel */}
      <motion.div
        className="absolute top-[55%] right-[10%] text-3xl opacity-60"
        animate={{ y: [-8, 8, -8] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        👼
      </motion.div>

      {/* Rolling hills */}
      <div className="absolute bottom-0 left-0 right-0 h-[25%]">
        <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="none">
          {/* Back hill */}
          <path d="M0,150 Q200,80 400,120 T800,100 L1200,140 L1200,300 L0,300 Z" fill="#4c1d95" opacity="0.6" />
          {/* Front hill */}
          <path d="M0,180 Q300,120 600,160 T1200,180 L1200,300 L0,300 Z" fill="#6d28d9" opacity="0.8" />
        </svg>
      </div>

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
