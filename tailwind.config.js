/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: '#FFD700',
        charcoal: '#2D2D2D',
      },
      animation: {
        gradientBlur: 'gradientBlur 8s ease-in-out infinite',
        floatParticles: 'floatParticles 30s linear infinite',
        fadeInUp: 'fadeInUp 0.8s ease-out',
        popIn: 'popIn 0.4s ease-out',
        fadeScale: 'fadeScale 0.7s ease-out', // ✅ New animation
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
        fadeScale: { // ✅ New keyframes
          '0%': { opacity: 0, transform: 'scale(0.9)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

