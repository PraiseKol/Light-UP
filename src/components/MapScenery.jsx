// src/components/MapScenery.jsx
// Hand-illustrated SVG scenery pieces scattered along the world map path.
// No image-generation tool was available, so these are vector illustrations
// built by hand rather than painted/photographic art — styled to read as
// a simple, warm, storybook-biblical aesthetic (flat shapes + soft
// gradients) rather than trying to fake photorealism.

export function Ark({ size = 56, style }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 100 70" style={style}>
      <defs>
        <linearGradient id="arkWood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c98a4b" />
          <stop offset="100%" stopColor="#8b5a2b" />
        </linearGradient>
      </defs>
      {/* hull */}
      <path d="M8 42 Q50 62 92 42 L84 54 Q50 66 16 54 Z" fill="#6b3f1d" />
      <rect x="14" y="26" width="72" height="18" rx="4" fill="url(#arkWood)" stroke="#5c3819" strokeWidth="1.5" />
      {/* cabin */}
      <rect x="30" y="12" width="40" height="16" rx="3" fill="#a9662f" stroke="#5c3819" strokeWidth="1.5" />
      <path d="M28 12 L50 2 L72 12 Z" fill="#7a4a22" stroke="#5c3819" strokeWidth="1.5" />
      {/* windows */}
      <circle cx="40" cy="20" r="3" fill="#fef3c7" />
      <circle cx="50" cy="20" r="3" fill="#fef3c7" />
      <circle cx="60" cy="20" r="3" fill="#fef3c7" />
      {/* plank lines */}
      <line x1="14" y1="34" x2="86" y2="34" stroke="#5c3819" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

export function Tent({ size = 44, color = "#c2410c", style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" style={style}>
      <path d="M30 6 L54 52 L6 52 Z" fill={color} stroke="#7c2d12" strokeWidth="2" />
      <path d="M30 6 L38 52 L22 52 Z" fill="#7c2d12" opacity="0.35" />
      <path d="M22 52 L30 34 L38 52 Z" fill="#451a03" />
      <line x1="30" y1="6" x2="30" y2="52" stroke="#451a03" strokeWidth="1.5" />
    </svg>
  );
}

export function PalmTree({ size = 48, style }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 60 80" style={style}>
      <path d="M28 80 Q26 50 32 28" stroke="#8b5a2b" strokeWidth="5" fill="none" strokeLinecap="round" />
      {[
        "M30 28 Q10 18 2 24",
        "M30 28 Q14 8 6 4",
        "M30 28 Q30 4 26 -2",
        "M30 28 Q46 8 54 4",
        "M30 28 Q50 18 58 24",
      ].map((d, i) => (
        <path key={i} d={d} stroke="#16a34a" strokeWidth="7" fill="none" strokeLinecap="round" />
      ))}
    </svg>
  );
}

export function MountainSilhouette({ width = 300, color = "#0000" , style }) {
  return (
    <svg width={width} height={width * 0.28} viewBox="0 0 300 84" style={style} preserveAspectRatio="none">
      <path d="M0 84 L40 30 L75 60 L120 10 L170 55 L210 25 L250 60 L300 20 L300 84 Z" fill={color} />
    </svg>
  );
}

export function Dove({ size = 32, style }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 60 36" style={style}>
      <path d="M2 20 Q18 2 30 14 Q42 2 58 20 Q40 16 30 24 Q20 16 2 20 Z" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" opacity="0.95" />
    </svg>
  );
}

export function Rainbow({ width = 140, style }) {
  const bands = ["#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#8b5cf6"];
  return (
    <svg width={width} height={width * 0.5} viewBox="0 0 140 70" style={style}>
      {bands.map((c, i) => (
        <path
          key={c}
          d={`M ${5 + i * 5} 68 A ${65 - i * 5} ${65 - i * 5} 0 0 1 ${135 - i * 5} 68`}
          fill="none"
          stroke={c}
          strokeWidth="6"
          opacity="0.85"
        />
      ))}
    </svg>
  );
}

export function SunGlow({ size = 90, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <defs>
        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff7cc" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#fde047" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#sunGlow)" />
      <circle cx="50" cy="50" r="18" fill="#fef9c3" />
    </svg>
  );
}

export function CloudPuff({ width = 120, style }) {
  return (
    <svg width={width} height={width * 0.5} viewBox="0 0 120 60" style={style}>
      <ellipse cx="30" cy="38" rx="26" ry="16" fill="white" />
      <ellipse cx="60" cy="28" rx="32" ry="20" fill="white" />
      <ellipse cx="92" cy="38" rx="24" ry="15" fill="white" />
    </svg>
  );
}

// Deterministic pseudo-random scenery placement — seeded by phase number
// so the same phase always renders the same scattered scenery, but each
// phase looks different from the next.
const SCENERY_KINDS = [Tent, PalmTree, Ark, Dove];

export function generateScenery(phaseNumber, count = 5) {
  const items = [];
  let seed = phaseNumber * 7919;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < count; i++) {
    const Kind = SCENERY_KINDS[Math.floor(rand() * SCENERY_KINDS.length)];
    items.push({
      Kind,
      left: 5 + rand() * 90,
      top: 5 + rand() * 90,
      size: 28 + rand() * 26,
      flip: rand() > 0.5,
      opacity: 0.75 + rand() * 0.25,
    });
  }
  return items;
}
