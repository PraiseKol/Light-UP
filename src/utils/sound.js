// src/utils/sound.js

// Map of sound keys to file paths
const soundFiles = {
  // UI sounds
  click: "/sounds/click.wav",
  select: "/sounds/select.wav",
  success: "/sounds/success.wav",
  error: "/sounds/error.wav",
  back: "/sounds/back.wav",
  switch: "/sounds/switch.wav",
  optionSelect: "/sounds/optionSelect.wav",
  slide: "/sounds/slide.mp3",

  // Game sounds
  creatingGame: "/sounds/creating-game.wav",
  countdown: "/sounds/countdown.wav",
  gameOver: "/sounds/game-over.wav",
  levelUp: "/sounds/level-up.wav",
  lifeLost: "/sounds/life-lost.wav",
  purchase: "/sounds/purchase.wav",
  submitAnswer: "/sounds/submitAnswer.mp3",

  // Power-up specific sounds
  divineHint: "/sounds/divine-hint.mp3",
  gracePeriod: "/sounds/grace-period.mp3",
  holyShield: "/sounds/holy-shield.mp3",
  heavenlyMatch: "/sounds/heavenly-match.mp3",
  powerUpUsed: "/sounds/power-up.wav", // Fixed: was missing

  // New feedback sounds
  bonusAwarded: "/sounds/level-up.wav", // Reused for bonus celebrations
  modalOpen: "/sounds/slide.mp3", // Subtle modal entrance
};

// Get stored volume or default to 0.3
let globalVolume = parseFloat(localStorage.getItem("soundVolume") || "0.3");

// Preload Audio objects
const sounds = {};
Object.keys(soundFiles).forEach((key) => {
  const audio = new Audio(soundFiles[key]);
  audio.preload = "auto";
  audio.volume = globalVolume;
  sounds[key] = audio;
});

/**
 * Set global volume for all sounds (0-1)
 * @param {number} level - Volume level between 0 and 1
 */
export function setVolume(level) {
  globalVolume = Math.max(0, Math.min(1, level));
  localStorage.setItem("soundVolume", globalVolume.toString());
  Object.values(sounds).forEach((audio) => {
    audio.volume = globalVolume;
  });
}

/**
 * Get current global volume
 * @returns {number} Current volume level (0-1)
 */
export function getVolume() {
  return globalVolume;
}

/**
 * Plays a sound effect if effects are enabled.
 * @param {string} name - Key from soundFiles
 * @param {boolean} effectsOn - Whether effects are enabled
 */
export function playSound(name, effectsOn = true) {
  if (!effectsOn) return;

  const audio = sounds[name];
  if (!audio) {
    console.warn(`No sound found for key: ${name}`);
    return;
  }

  // Reset playback so sound can overlap if triggered multiple times
  audio.currentTime = 0;
  audio.play().catch((err) => {
    console.error(`Sound '${name}' failed to play:`, err);
  });
}
