/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: '#FFD700',
        charcoal: '#2D2D2D',
        candyBlue: '#4F9CF9',
        candyPurple: '#9D4EDD',
        candyYellow: '#FFD93D',
        candyGreen: '#3DD68C',
        candyPink: '#FF6B9D',
        candyOrange: '#FF9A56',
        // Christmas colors
        christmasRed: '#DC2626',
        christmasGreen: '#166534',
        christmasGold: '#FFD700',
        snowWhite: '#F8FAFC',
        hollyGreen: '#15803D',
        cranberry: '#991B1B',
        frostBlue: '#DBEAFE',
      },
      animation: {
        gradientBlur: 'gradientBlur 8s ease-in-out infinite',
        floatParticles: 'floatParticles 30s linear infinite',
        fadeInUp: 'fadeInUp 0.8s ease-out',
        popIn: 'popIn 0.4s ease-out',
        fadeScale: 'fadeScale 0.7s ease-out',
        wiggle: 'wiggle 0.5s ease-in-out',
        glow: 'glow 2s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        sparkle: 'sparkle 1.5s ease-in-out infinite',
        cloudDrift: 'cloudDrift 60s linear infinite',
        superGlow: 'superGlow 2s ease-in-out infinite',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.85 },
        },
        gradientBlur: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        floatParticles: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '100% 100%' },
        },
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        popIn: {
          '0%': { transform: 'scale(0.8)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        fadeScale: {
          '0%': { opacity: 0, transform: 'scale(0.9)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 217, 61, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 217, 61, 0.9)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        sparkle: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.5, transform: 'scale(1.2)' },
        },
        cloudDrift: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '100% 0%' },
        },
        superGlow: {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(255, 217, 61, 0.6), 0 0 40px rgba(255, 217, 61, 0.4), 0 0 60px rgba(255, 217, 61, 0.2)'
          },
          '50%': {
            boxShadow: '0 0 30px rgba(255, 217, 61, 0.8), 0 0 60px rgba(255, 217, 61, 0.6), 0 0 90px rgba(255, 217, 61, 0.4)'
          }
        },
      },
    },
  },
  plugins: [],
};

