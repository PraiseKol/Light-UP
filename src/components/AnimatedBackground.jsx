// src/components/AnimatedBackground.jsx
export default function AnimatedBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <div className="w-full h-full bg-gradient-to-b from-white via-gold/10 to-charcoal/10 animate-gradientBlur" />
      <div className="absolute inset-0 bg-[url\\('/sparkles.svg'\\')] opacity-10 animate-floatParticles" />
    </div>
  );
}
