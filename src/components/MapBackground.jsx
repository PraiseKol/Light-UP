import { motion } from "framer-motion";

export default function MapBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Sky gradient - warm biblical sunset/dawn colors */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-300 via-purple-200 to-orange-100" />

      {/* Distant mountains layer */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2">
        <svg
          className="absolute bottom-0 w-full h-full opacity-30"
          viewBox="0 0 1200 400"
          preserveAspectRatio="none"
        >
          <path
            d="M0,300 Q200,150 400,200 T800,180 L1200,220 L1200,400 L0,400 Z"
            fill="#8B5CF6"
            opacity="0.3"
          />
          <path
            d="M0,320 Q300,180 600,220 T1200,250 L1200,400 L0,400 Z"
            fill="#7C3AED"
            opacity="0.2"
          />
        </svg>
      </div>

      {/* Mid-ground rolling hills */}
      <div className="absolute bottom-0 left-0 right-0 h-2/5">
        <svg
          className="absolute bottom-0 w-full h-full"
          viewBox="0 0 1200 300"
          preserveAspectRatio="none"
        >
          <path
            d="M0,200 Q200,120 400,160 T800,140 L1200,180 L1200,300 L0,300 Z"
            fill="#86efac"
            opacity="0.6"
          />
          <path
            d="M0,220 Q300,150 600,180 T1200,200 L1200,300 L0,300 Z"
            fill="#4ade80"
            opacity="0.5"
          />
        </svg>
      </div>

      {/* Animated floating light particles (divine light) - Further optimized */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-yellow-200/30 rounded-full blur-sm"
            initial={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
            }}
            animate={{
              y: [
                Math.random() * 100 + "%",
                Math.random() * 100 + "%",
              ],
              x: [
                Math.random() * 100 + "%",
                Math.random() * 100 + "%",
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
