// src/components/ProceduralTerrain.jsx
//
// Generates a unique-looking layered landscape purely from code, seeded by
// phase number — so every one of the 100 phases can look distinct even
// before real illustrated art exists for it. Falls back to real photos/art
// automatically once one is added to phaseBackgrounds.js for that phase.
//
// Design intent: everything here is a soft, blended SILHOUETTE layer
// (single flat color at low opacity, matching the phase's world theme) —
// not a bright foreground icon. That's the deliberate fix for the earlier
// version, which scattered sharp cartoon icons on top of the path and
// looked cluttered. This should read as atmosphere, the way a real painted
// game background uses layered distant scenery.

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// A few distinct silhouette "landmark" shapes, picked per phase — kept
// simple and flat so they read as distant scenery, not detailed foreground
// objects.
function LandmarkSilhouette({ kind, color, opacity }) {
  const shapes = {
    tents: (
      <g fill={color} opacity={opacity}>
        <path d="M20 60 L35 25 L50 60 Z" />
        <path d="M45 60 L58 32 L71 60 Z" />
        <path d="M65 60 L80 20 L95 60 Z" />
      </g>
    ),
    ark: (
      <g fill={color} opacity={opacity}>
        <path d="M10 55 Q50 68 90 55 L82 62 Q50 72 18 62 Z" />
        <rect x="30" y="38" width="40" height="18" rx="3" />
        <path d="M28 38 L50 26 L72 38 Z" />
      </g>
    ),
    city: (
      <g fill={color} opacity={opacity}>
        <rect x="10" y="35" width="14" height="30" />
        <rect x="28" y="20" width="16" height="45" />
        <rect x="48" y="30" width="14" height="35" />
        <rect x="66" y="15" width="18" height="50" />
        <rect x="88" y="32" width="12" height="33" />
      </g>
    ),
    mountains: (
      <g fill={color} opacity={opacity}>
        <path d="M0 65 L20 30 L38 50 L58 15 L78 45 L100 65 Z" />
      </g>
    ),
    boat: (
      <g fill={color} opacity={opacity}>
        <path d="M15 55 Q50 65 85 55 L78 60 L22 60 Z" />
        <line x1="50" y1="55" x2="50" y2="25" stroke={color} strokeWidth="2" />
        <path d="M50 27 L68 50 L50 50 Z" />
      </g>
    ),
  };
  return shapes[kind] || null;
}

const LANDMARK_KINDS = ["tents", "ark", "city", "mountains", "boat"];

export default function ProceduralTerrain({ phaseNumber, worldTheme }) {
  const rand = seededRandom(phaseNumber * 7919 + 13);

  // Pick 1-2 distant landmark silhouettes for this phase, positioned low
  // (near the "ground") so they read as scenery the path runs past, not
  // objects sitting on the path.
  const landmarkCount = 1 + Math.floor(rand() * 2);
  const landmarks = Array.from({ length: landmarkCount }, () => ({
    kind: LANDMARK_KINDS[Math.floor(rand() * LANDMARK_KINDS.length)],
    left: 8 + rand() * 70,
    bottom: rand() * 60,
    width: 90 + rand() * 60,
  }));

  // Two hill layers with a different wave shape per phase, for a unique
  // silhouette skyline every time without needing image assets.
  const hillSeedA = 20 + rand() * 40;
  const hillSeedB = 15 + rand() * 35;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base sky wash from the world theme */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${worldTheme.skyTop} 0%, ${worldTheme.skyBottom} 100%)`,
        }}
      />

      {/* Distant landmark silhouettes — flat, muted, low on the horizon */}
      {landmarks.map((lm, i) => (
        <svg
          key={i}
          viewBox="0 0 100 70"
          style={{
            position: "absolute",
            left: `${lm.left}%`,
            bottom: `${lm.bottom}%`,
            width: `${lm.width}px`,
            height: "auto",
          }}
        >
          <LandmarkSilhouette kind={lm.kind} color={worldTheme.hill} opacity={0.35} />
        </svg>
      ))}

      {/* Back hill layer */}
      <svg
        className="absolute bottom-0 w-full"
        style={{ height: "35%" }}
        viewBox="0 0 400 100"
        preserveAspectRatio="none"
      >
        <path
          d={`M0,${70} Q${100},${70 - hillSeedA} ${200},${60} T400,${65}` + " L400,100 L0,100 Z"}
          fill={worldTheme.hill}
          opacity="0.28"
        />
      </svg>

      {/* Front hill layer — darker, closer */}
      <svg
        className="absolute bottom-0 w-full"
        style={{ height: "22%" }}
        viewBox="0 0 400 100"
        preserveAspectRatio="none"
      >
        <path
          d={`M0,${75} Q${120},${75 - hillSeedB} ${250},${68} T400,${72}` + " L400,100 L0,100 Z"}
          fill={worldTheme.hill}
          opacity="0.45"
        />
      </svg>
    </div>
  );
}
