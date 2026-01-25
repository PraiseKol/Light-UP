import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { useMemo } from 'react';

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

// Floating decorative elements
function FloatingDecorations({ decorations }) {
  const elements = useMemo(() => [
    // Primary decorations - larger and more prominent
    { emoji: decorations.primary[0], top: '15%', right: '15%', size: 'text-3xl', animY: [-15, 15], animRotate: [0, 8, -8, 0], duration: 5 },
    { emoji: decorations.primary[1], top: '35%', left: '8%', size: 'text-4xl', animY: [0, -10, 0], animScale: [1, 1.1, 1], duration: 4 },
    { emoji: decorations.primary[2], bottom: '35%', right: '18%', size: 'text-3xl', animY: [-8, 8], duration: 4 },
    // Secondary decorations - smaller accents
    { emoji: decorations.secondary[0], top: '55%', right: '10%', size: 'text-2xl', animY: [-8, 8], duration: 6, opacity: 0.6 },
    { emoji: decorations.secondary[1], top: '70%', left: '15%', size: 'text-2xl', animX: [-5, 5], animRotate: [-5, 5], duration: 6, opacity: 0.5 },
    // Floating animation across screen
    { emoji: decorations.floating, top: '12%', size: 'text-2xl', isFloating: true, opacity: 0.6 },
  ], [decorations]);

  return (
    <>
      {elements.map((el, i) => (
        el.isFloating ? (
          <motion.div
            key={i}
            className={`absolute ${el.size}`}
            style={{ top: el.top, opacity: el.opacity }}
            animate={{
              x: ['-10%', '110%'],
              y: [0, -20, 0, -15, 0],
            }}
            transition={{
              x: { duration: 25, repeat: Infinity, ease: 'linear' },
              y: { duration: 3, repeat: Infinity },
            }}
          >
            {el.emoji}
          </motion.div>
        ) : (
          <motion.div
            key={i}
            className={`absolute ${el.size}`}
            style={{ 
              top: el.top, 
              bottom: el.bottom, 
              left: el.left, 
              right: el.right,
              opacity: el.opacity ?? 0.7
            }}
            animate={{
              y: el.animY,
              x: el.animX,
              rotate: el.animRotate,
              scale: el.animScale,
            }}
            transition={{ duration: el.duration, repeat: Infinity, ease: 'easeInOut' }}
          >
            {el.emoji}
          </motion.div>
        )
      ))}
    </>
  );
}

// Floating light particles
function FloatingParticles({ color }) {
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
    <div className="absolute inset-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute w-2 h-2 ${color} rounded-full blur-sm`}
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
  );
}

// Rolling hills at bottom
function Hills({ hills }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[25%]">
      <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="none">
        <path 
          d="M0,150 Q200,80 400,120 T800,100 L1200,140 L1200,300 L0,300 Z" 
          fill={hills.back} 
          opacity="0.6" 
        />
        <path 
          d="M0,180 Q300,120 600,160 T1200,180 L1200,300 L0,300 Z" 
          fill={hills.front} 
          opacity="0.8" 
        />
      </svg>
    </div>
  );
}

// Twinkling stars
function Stars({ count = 60 }) {
  const stars = useMemo(() => 
    [...Array(count)].map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      duration: 2 + Math.random() * 3,
      delay: Math.random() * 2,
    })), [count]
  );

  return (
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
  );
}

export default function ThemedBackground({ starCount = 60, showHills = true }) {
  const { config } = useTheme();
  
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className={`absolute inset-0 bg-gradient-to-b ${config.background.gradient}`} />
      
      {/* Twinkling stars */}
      <Stars count={starCount} />
      
      {/* Snowfall for Christmas theme */}
      {config.decorations.snowfall && <SnowfallEffect />}
      
      {/* Floating decorations */}
      <FloatingDecorations decorations={config.decorations} />
      
      {/* Themed particles */}
      <FloatingParticles color={config.background.particleColor} />
      
      {/* Rolling hills */}
      {showHills && <Hills hills={config.hills} />}
      
      {/* Subtle pattern overlay for texture */}
      <div
        className="absolute inset-0 opacity-3"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  );
}
