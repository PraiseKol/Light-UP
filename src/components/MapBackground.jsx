import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { useMemo } from "react";

// Snowfall effect for Christmas theme
function SnowfallEffect() {
  const snowflakes = useMemo(() => 
    [...Array(40)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 5,
      duration: 8 + Math.random() * 6,
      size: Math.random() > 0.7 ? 'text-lg' : 'text-sm',
    })), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {snowflakes.map((flake) => (
        <motion.div
          key={flake.id}
          className={`absolute ${flake.size} opacity-80`}
          style={{ left: flake.left }}
          initial={{ y: -20, opacity: 0 }}
          animate={{ 
            y: '100vh', 
            opacity: [0, 1, 1, 0],
            x: [0, 10, -10, 5, 0]
          }}
          transition={{
            duration: flake.duration,
            repeat: Infinity,
            delay: flake.delay,
            ease: 'linear',
          }}
        >
          ❄️
        </motion.div>
      ))}
    </div>
  );
}

export default function MapBackground() {
  const { config, theme } = useTheme();
  
  // Memoize stars and particles to prevent re-renders
  const stars = useMemo(() => 
    [...Array(60)].map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      duration: 2 + Math.random() * 3,
      delay: Math.random() * 2,
    })), []
  );

  const particles = useMemo(() => 
    [...Array(20)].map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      duration: 4 + Math.random() * 3,
      delay: Math.random() * 2,
    })), []
  );

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Dynamic gradient background based on theme */}
      <div className={`absolute inset-0 bg-gradient-to-b ${config.background.gradient}`} />

      {/* Optional themed 3D illustrated background image */}
      {config.background.image && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${config.background.image})` }}
          />
          <div className={`absolute inset-0 ${config.background.overlay || 'bg-black/25'}`} />
        </>
      )}

      {/* Global "planet curvature" shading — ONE fixed layer covering the
          whole viewport, not repeated per phase. This is what actually sells
          "looking at a globe": a soft light highlight near the top (like a
          sun grazing the surface) fading into a dark curved edge vignette
          all the way around. Lives here so it never seams or boxes when the
          map scrolls through multiple phases — combine with the per-node
          rotateY/scale/brightness falloff in MapAndGame.jsx for the full
          effect. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 55% 40% at 50% 6%, rgba(255,255,255,0.12), transparent 60%),
            radial-gradient(ellipse 140% 95% at 50% 50%, transparent 50%, rgba(0,0,0,0.5) 100%)
          `,
        }}
      />

      {/* Twinkling stars */}
      <div className="absolute inset-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute w-1 h-1 bg-white rounded-full opacity-80"
            style={{
              top: star.top,
              left: star.left,
              animation: `twinkle ${star.duration}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Snowfall for Christmas theme */}
      {config.decorations.snowfall && <SnowfallEffect />}

      {/* Floating light particles */}
      <div className="absolute inset-0">
        {particles.map((p) => (
          <motion.div
            key={`particle-${p.id}`}
            className={`absolute w-2 h-2 ${config.background.particleColor} rounded-full blur-sm`}
            style={{ top: p.top, left: p.left }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
            }}
          />
        ))}
      </div>

      {/* Animated Decoration 1 - Primary floating */}
      <motion.div
        className="absolute top-[15%] right-[15%] text-3xl opacity-70"
        animate={{ y: [0, -15, 0], rotate: [0, 8, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        {config.decorations.primary[0]}
      </motion.div>

      {/* Animated Decoration 2 - Flying across */}
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
        {config.decorations.floating}
      </motion.div>

      {/* Animated Decoration 3 */}
      <motion.div
        className="absolute top-[70%] left-[15%] text-2xl opacity-50"
        animate={{ x: [-5, 5, -5], rotate: [-5, 5, -5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        {config.decorations.primary[2]}
      </motion.div>

      {/* Glowing Accent 1 */}
      <motion.div
        className="absolute top-[35%] left-[8%] text-4xl"
        animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div 
          className="drop-shadow-[0_0_12px_var(--glow-color)]"
          style={{ '--glow-color': config.accent.glow }}
        >
          {config.decorations.primary[1]}
        </div>
      </motion.div>

      {/* Glowing Accent 2 */}
      <motion.div
        className="absolute bottom-[35%] right-[18%] text-3xl"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div 
          className="opacity-60 drop-shadow-[0_0_10px_var(--glow-color)]"
          style={{ '--glow-color': config.accent.glow }}
        >
          {config.decorations.secondary[0]}
        </div>
      </motion.div>

      {/* Animated Secondary Element */}
      <motion.div
        className="absolute top-[55%] right-[10%] text-3xl opacity-60"
        animate={{ y: [-8, 8, -8] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {config.decorations.secondary[1] || config.decorations.primary[2]}
      </motion.div>

      {/* Rolling hills with theme colors — dimmed when background image is set */}
      {!config.background.image && (
        <div className="absolute bottom-0 left-0 right-0 h-[25%]">
          <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="none">
            <path
              d="M0,150 Q200,80 400,120 T800,100 L1200,140 L1200,300 L0,300 Z"
              fill={config.hills.back}
              opacity="0.6"
            />
            <path
              d="M0,180 Q300,120 600,160 T1200,180 L1200,300 L0,300 Z"
              fill={config.hills.front}
              opacity="0.8"
            />
          </svg>
        </div>
      )}

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
