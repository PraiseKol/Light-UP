// src/data/phaseBackgrounds.js
//
// Maps a phase number to a real illustrated background image, if one has
// been generated and dropped into /public/phase-backgrounds/.
//
// HOW TO ADD A REAL IMAGE FOR A PHASE:
//   1. Generate the image using the matching prompt in
//      PHASE_IMAGE_PROMPTS.md (Midjourney, DALL-E, Firefly, etc.)
//   2. Save it as /public/phase-backgrounds/phase-<N>.jpg
//   3. Add a line below: `1: '/phase-backgrounds/phase-1.jpg',`
//
// Any phase NOT listed here automatically falls back to the procedural
// terrain generator (ProceduralTerrain.jsx) — so this list can be filled
// in gradually, phase by phase, with zero risk to the phases not done yet.

export const PHASE_BACKGROUNDS = {
  // 1: '/phase-backgrounds/phase-1.jpg',  // The Birth and Early Life of Jesus
  // 2: '/phase-backgrounds/phase-2.jpg',  // Jesus Baptism and Temptation
  // ...add more as real art is generated
};

export function getPhaseBackgroundImage(phaseNumber) {
  return PHASE_BACKGROUNDS[phaseNumber] || null;
}
