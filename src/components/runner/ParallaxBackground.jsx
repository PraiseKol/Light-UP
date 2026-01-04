import React from 'react';
import { motion } from 'framer-motion';
import { ENVIRONMENTS, GAME_CONFIG } from './GameConstants';

const ParallaxBackground = ({ environment = 'desert_path', speed, gameState }) => {
  const env = ENVIRONMENTS[environment.toUpperCase()] || ENVIRONMENTS.DESERT_PATH;
  const isPlaying = gameState === 'playing';
  
  // Calculate animation speed based on game speed
  const getAnimationDuration = (baseSpeed) => {
    const speedMultiplier = speed / GAME_CONFIG.BASE_SPEED;
    return baseSpeed / speedMultiplier;
  };

  const renderEnvironment = () => {
    switch (environment.toLowerCase()) {
      case 'desert_path':
        return (
          <>
            {/* Sky gradient */}
            <div 
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, #87CEEB 0%, #E6D5AC 70%, #EDC9AF 100%)`,
              }}
            />
            
            {/* Sun */}
            <motion.div
              className="absolute top-10 right-10 w-20 h-20 rounded-full"
              style={{
                background: 'radial-gradient(circle, #FFD700 0%, #FFA500 70%, transparent 100%)',
                boxShadow: '0 0 60px rgba(255, 215, 0, 0.5)',
              }}
              animate={isPlaying ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 3, repeat: Infinity }}
            />

            {/* Distant mountains */}
            <motion.div
              className="absolute bottom-1/3 left-0 right-0 h-40"
              style={{
                background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 100'%3E%3Cpolygon points='0,100 50,40 100,80 150,30 200,70 250,20 300,60 350,35 400,100' fill='%23C4A574'/%3E%3C/svg%3E")`,
                backgroundSize: '400px 100px',
                backgroundRepeat: 'repeat-x',
              }}
              animate={isPlaying ? { backgroundPositionX: ['0px', '-400px'] } : {}}
              transition={{ duration: getAnimationDuration(20), repeat: Infinity, ease: 'linear' }}
            />

            {/* Sand dunes layer */}
            <motion.div
              className="absolute bottom-1/4 left-0 right-0 h-32"
              style={{
                background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 80'%3E%3Cellipse cx='75' cy='80' rx='100' ry='40' fill='%23D2B48C'/%3E%3Cellipse cx='225' cy='80' rx='100' ry='50' fill='%23DEB887'/%3E%3C/svg%3E")`,
                backgroundSize: '300px 80px',
                backgroundRepeat: 'repeat-x',
              }}
              animate={isPlaying ? { backgroundPositionX: ['0px', '-300px'] } : {}}
              transition={{ duration: getAnimationDuration(12), repeat: Infinity, ease: 'linear' }}
            />

            {/* Ground/road */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-1/4"
              style={{
                background: `linear-gradient(180deg, #D2B48C 0%, #C4A574 50%, #A0845C 100%)`,
              }}
            />

            {/* Road lanes */}
            <div className="absolute bottom-0 left-0 right-0 h-1/4 flex justify-center">
              <div className="relative w-64 h-full">
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: `repeating-linear-gradient(
                      0deg,
                      transparent 0px,
                      transparent 40px,
                      rgba(139, 115, 85, 0.3) 40px,
                      rgba(139, 115, 85, 0.3) 50px
                    )`,
                  }}
                  animate={isPlaying ? { backgroundPositionY: ['0px', '90px'] } : {}}
                  transition={{ duration: getAnimationDuration(0.5), repeat: Infinity, ease: 'linear' }}
                />
                {/* Lane dividers */}
                <div className="absolute top-0 left-1/3 w-0.5 h-full bg-amber-700/30" />
                <div className="absolute top-0 right-1/3 w-0.5 h-full bg-amber-700/30" />
              </div>
            </div>

            {/* Desert decorations */}
            <motion.div
              className="absolute bottom-1/4 left-0 right-0 h-20 pointer-events-none"
              animate={isPlaying ? { x: ['0%', '-50%'] } : {}}
              transition={{ duration: getAnimationDuration(15), repeat: Infinity, ease: 'linear' }}
            >
              {/* Cacti and rocks */}
              <div className="absolute left-[10%] bottom-0 text-4xl">🌵</div>
              <div className="absolute left-[30%] bottom-0 text-2xl">🪨</div>
              <div className="absolute left-[60%] bottom-0 text-4xl">🌵</div>
              <div className="absolute left-[85%] bottom-0 text-2xl">🪨</div>
              <div className="absolute left-[110%] bottom-0 text-4xl">🌵</div>
              <div className="absolute left-[130%] bottom-0 text-2xl">🪨</div>
              <div className="absolute left-[160%] bottom-0 text-4xl">🌵</div>
            </motion.div>
          </>
        );

      case 'holy_city':
        return (
          <>
            {/* Sky */}
            <div 
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, #E6E6FA 0%, #D8BFD8 50%, #DDD 100%)`,
              }}
            />

            {/* Distant buildings */}
            <motion.div
              className="absolute bottom-1/3 left-0 right-0 h-48"
              style={{
                background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 120'%3E%3Crect x='20' y='40' width='60' height='80' fill='%238B7355'/%3E%3Crect x='100' y='20' width='40' height='100' fill='%23A0845C'/%3E%3Crect x='160' y='50' width='80' height='70' fill='%238B7355'/%3E%3Crect x='260' y='30' width='50' height='90' fill='%23A0845C'/%3E%3Crect x='330' y='45' width='55' height='75' fill='%238B7355'/%3E%3C/svg%3E")`,
                backgroundSize: '400px 120px',
                backgroundRepeat: 'repeat-x',
              }}
              animate={isPlaying ? { backgroundPositionX: ['0px', '-400px'] } : {}}
              transition={{ duration: getAnimationDuration(25), repeat: Infinity, ease: 'linear' }}
            />

            {/* Stone road */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-1/4"
              style={{
                background: `linear-gradient(180deg, #B8B8B8 0%, #A0A0A0 50%, #888 100%)`,
              }}
            />

            {/* Arches */}
            <motion.div
              className="absolute bottom-1/4 left-0 right-0 h-32"
              animate={isPlaying ? { x: ['0%', '-100%'] } : {}}
              transition={{ duration: getAnimationDuration(10), repeat: Infinity, ease: 'linear' }}
            >
              <div className="absolute left-[20%] bottom-0 text-6xl opacity-50">🏛️</div>
              <div className="absolute left-[70%] bottom-0 text-6xl opacity-50">🏛️</div>
              <div className="absolute left-[120%] bottom-0 text-6xl opacity-50">🏛️</div>
              <div className="absolute left-[170%] bottom-0 text-6xl opacity-50">🏛️</div>
            </motion.div>
          </>
        );

      case 'valley_of_light':
        return (
          <>
            {/* Golden sky */}
            <div 
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, #FFE4B5 0%, #FFDAB9 40%, #98FB98 100%)`,
              }}
            />

            {/* Light rays */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-1/2 opacity-30"
              animate={isPlaying ? { opacity: [0.2, 0.4, 0.2] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 w-20 h-full bg-gradient-to-b from-yellow-200 to-transparent"
                  style={{ 
                    left: `${15 + i * 20}%`,
                    transform: `rotate(${-15 + i * 8}deg)`,
                  }}
                />
              ))}
            </motion.div>

            {/* Hills */}
            <motion.div
              className="absolute bottom-1/4 left-0 right-0 h-40"
              style={{
                background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 100'%3E%3Cellipse cx='100' cy='100' rx='150' ry='60' fill='%2390EE90'/%3E%3Cellipse cx='300' cy='100' rx='150' ry='50' fill='%2398FB98'/%3E%3C/svg%3E")`,
                backgroundSize: '400px 100px',
                backgroundRepeat: 'repeat-x',
              }}
              animate={isPlaying ? { backgroundPositionX: ['0px', '-400px'] } : {}}
              transition={{ duration: getAnimationDuration(18), repeat: Infinity, ease: 'linear' }}
            />

            {/* Glowing path */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-1/4"
              style={{
                background: `linear-gradient(180deg, #90EE90 0%, #7CCD7C 50%, #6B8E6B 100%)`,
              }}
            />

            {/* Flowers */}
            <motion.div
              className="absolute bottom-1/4 left-0 right-0 h-16"
              animate={isPlaying ? { x: ['0%', '-50%'] } : {}}
              transition={{ duration: getAnimationDuration(12), repeat: Infinity, ease: 'linear' }}
            >
              <div className="absolute left-[5%] bottom-0 text-2xl">🌸</div>
              <div className="absolute left-[20%] bottom-0 text-2xl">🌼</div>
              <div className="absolute left-[40%] bottom-0 text-2xl">🌺</div>
              <div className="absolute left-[55%] bottom-0 text-2xl">🌸</div>
              <div className="absolute left-[75%] bottom-0 text-2xl">🌼</div>
              <div className="absolute left-[95%] bottom-0 text-2xl">🌺</div>
              <div className="absolute left-[105%] bottom-0 text-2xl">🌸</div>
              <div className="absolute left-[120%] bottom-0 text-2xl">🌼</div>
              <div className="absolute left-[140%] bottom-0 text-2xl">🌺</div>
            </motion.div>
          </>
        );

      case 'mountain_trails':
        return (
          <>
            {/* Cool sky */}
            <div 
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, #B0C4DE 0%, #A9C4D9 50%, #87CEEB 100%)`,
              }}
            />

            {/* Distant mountains */}
            <motion.div
              className="absolute bottom-1/3 left-0 right-0 h-60"
              style={{
                background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 150'%3E%3Cpolygon points='0,150 80,40 160,150' fill='%236B7B8B'/%3E%3Cpolygon points='100,150 200,20 300,150' fill='%23708090'/%3E%3Cpolygon points='250,150 350,50 450,150' fill='%236B7B8B'/%3E%3C/svg%3E")`,
                backgroundSize: '400px 150px',
                backgroundRepeat: 'repeat-x',
              }}
              animate={isPlaying ? { backgroundPositionX: ['0px', '-400px'] } : {}}
              transition={{ duration: getAnimationDuration(30), repeat: Infinity, ease: 'linear' }}
            />

            {/* Rocky path */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-1/4"
              style={{
                background: `linear-gradient(180deg, #808080 0%, #696969 50%, #555 100%)`,
              }}
            />

            {/* Cliff edges */}
            <motion.div
              className="absolute bottom-1/4 left-0 right-0 h-20"
              animate={isPlaying ? { x: ['0%', '-100%'] } : {}}
              transition={{ duration: getAnimationDuration(8), repeat: Infinity, ease: 'linear' }}
            >
              <div className="absolute left-[15%] bottom-0 text-4xl">⛰️</div>
              <div className="absolute left-[45%] bottom-0 text-3xl">🪨</div>
              <div className="absolute left-[75%] bottom-0 text-4xl">⛰️</div>
              <div className="absolute left-[115%] bottom-0 text-3xl">🪨</div>
              <div className="absolute left-[145%] bottom-0 text-4xl">⛰️</div>
              <div className="absolute left-[175%] bottom-0 text-3xl">🪨</div>
            </motion.div>
          </>
        );

      default:
        return <div className="absolute inset-0 bg-gradient-to-b from-sky-400 to-green-300" />;
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      {renderEnvironment()}
    </div>
  );
};

export default ParallaxBackground;
