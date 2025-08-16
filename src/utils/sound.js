// src/utils/sound.js

// Map of sound keys to file paths
const soundFiles = {
  click: "/sounds/click.wav",
  select: "/sounds/select.wav",
  success: "/sounds/success.wav",
  error: "/sounds/error.wav",
  creatingGame: "/sounds/creating-game.wav",
  countdown: "/sounds/countdown.wav",
  gameOver: "/sounds/game-over.wav",
  levelUp: "/sounds/level-up.wav",
  lifeLost: "/sounds/life-lost.wav",
  powerUpUsed: "/sounds/power-up.wav",
  purchase: "/sounds/purchase.wav",
  back: "/sounds/back.wav",
  switch: "/sounds/switch.wav",
  optionSelect: "/sounds/optionSelect.wav",
  submitAnswer: "/sounds/submitAnswer.mp3",
};

// Preload Audio objects
const sounds = {};
Object.keys(soundFiles).forEach((key) => {
  const audio = new Audio(soundFiles[key]);
  audio.preload = "auto"; // ensure browser preloads
  audio.volume = 0.3;     // default volume, adjust if needed
  sounds[key] = audio;
});

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


// give me an updated version of this:

// // src/utils/sound.js
// const soundFiles = {
//     click: "/sounds/click.wav",
//     select: "/sounds/select.wav",
//     success: "/sounds/success.wav",
//     error: "/sounds/error.wav",
//     creatingGame: "/sounds/creating-game.wav",
//     countdown: "/sounds/countdown.wav",
//     gameOver: "/sounds/game-over.wav",
//     levelUp: "/sounds/level-up.wav",
//     lifeLost: "/sounds/life-lost.wav",
//     powerUpUsed: "/sounds/power-up.wav",
//     purchase: "/sounds/purchase.wav",
//     back: "/sounds/back.wav",
//     switch: "/sounds/switch.wav",
//     optionSelect: "/sounds/optionSelect.wav",
//     submitAnswer: "/sounds/submitAnswer.mp3"
//   };
  
//   /**
//    * Plays a sound effect if effects are enabled.
//    * @param {string} name - The key from soundFiles
//    * @param {boolean} effectsOn - Whether effects are enabled
//    */
//   export function playSound(name, effectsOn) {
//     if (!effectsOn) return;
//     const file = soundFiles[name];
//     if (!file) {
//       console.warn(`No sound found for key: ${name}`);
//       return;
//     }
  
//     const audio = new Audio(file);
//     audio.play().catch(err =>
//       console.error(`Sound '${name}' failed to play:`, err)
//     );
//   }
  

