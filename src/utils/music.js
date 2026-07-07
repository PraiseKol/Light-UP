// src/utils/music.js
// Procedural background music generator using Web Audio API.
// Themes: "map" (playful marimba), "gameplay" (uplifting orchestral pulse), "menu" (warm hymnal).

let ctx = null;
let masterGain = null;
let currentTheme = null;
let scheduler = null;
let nextNoteTime = 0;
let step = 0;
let isPaused = false;

const STORAGE = { volume: "musicVolume", on: "musicOn" };

let musicVolume = (() => {
  const v = parseFloat(localStorage.getItem(STORAGE.volume));
  return Number.isNaN(v) ? 0.35 : v;
})();
let musicOn = (() => {
  const v = localStorage.getItem(STORAGE.on);
  return v === null ? true : v === "true";
})();

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  masterGain = ctx.createGain();
  masterGain.gain.value = musicOn ? musicVolume : 0;
  masterGain.connect(ctx.destination);
  const resume = () => ctx?.state === "suspended" && ctx.resume();
  ["click", "touchstart", "keydown"].forEach((ev) =>
    window.addEventListener(ev, resume, { passive: true })
  );
  return ctx;
}

// Note helper
const N = (semisFromA4) => 440 * Math.pow(2, semisFromA4 / 12);
// Scale: C major = [-9,-7,-5,-4,-2,0,2,3,5,7,8,10,12] semis from A4

// ---------- Voices ----------
function marimba(freq, when, dur = 0.35, vol = 0.14) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc2.type = "triangle";
  osc.frequency.value = freq;
  osc2.frequency.value = freq * 2;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  const g2 = ctx.createGain();
  g2.gain.value = 0.3;
  osc.connect(g);
  osc2.connect(g2).connect(g);
  g.connect(masterGain);
  osc.start(when); osc2.start(when);
  osc.stop(when + dur + 0.02); osc2.stop(when + dur + 0.02);
}

function pad(freq, when, dur = 2.0, vol = 0.08) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc2.type = "sine";
  osc.frequency.value = freq;
  osc2.frequency.value = freq;
  osc2.detune.value = 8;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.5);
  g.gain.linearRampToValueAtTime(vol * 0.6, when + dur - 0.4);
  g.gain.linearRampToValueAtTime(0.0001, when + dur);
  osc.connect(g); osc2.connect(g);
  g.connect(masterGain);
  osc.start(when); osc2.start(when);
  osc.stop(when + dur + 0.05); osc2.stop(when + dur + 0.05);
}

function pluck(freq, when, dur = 0.6, vol = 0.1) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = 2200;
  osc.type = "triangle";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(filt).connect(g).connect(masterGain);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

// ---------- Themes: return note event for step ----------
// C major key. Semis from A4.
const C_MAJOR = [-9, -7, -5, -4, -2, 0, 2, 3, 5, 7, 8, 10, 12];

const THEMES = {
  // Playful marimba on the map — bouncy 16-step loop
  map: {
    bpm: 108,
    play(t, s) {
      const bar = s % 16;
      // Bass root every 4 steps: C2, G2, A2, F2
      const bassPattern = [N(-33), null, null, null, N(-26), null, null, null, N(-24), null, null, null, N(-29), null, null, null];
      if (bassPattern[bar] !== null) pluck(bassPattern[bar], t, 0.5, 0.14);
      // Melody — cheerful arpeggio C-E-G-C-B-G-E-D
      const mel = [N(-9), N(-5), N(-2), N(3), N(2), N(-2), N(-5), N(-7), N(-9), N(-4), N(0), N(3), N(2), N(0), N(-4), N(-7)];
      marimba(mel[bar], t, 0.28, 0.12);
      // Sparkle on beat 1 & 9
      if (bar === 0 || bar === 8) marimba(mel[bar] * 2, t + 0.05, 0.2, 0.05);
      // Chord pad every 8 steps
      if (bar === 0) {
        pad(N(-21), t, 4, 0.05); pad(N(-14), t, 4, 0.04); pad(N(-9), t, 4, 0.04);
      }
      if (bar === 8) {
        pad(N(-19), t, 4, 0.05); pad(N(-12), t, 4, 0.04); pad(N(-7), t, 4, 0.04);
      }
    },
  },
  // Uplifting orchestral pulse for gameplay — sparser, doesn't distract
  gameplay: {
    bpm: 92,
    play(t, s) {
      const bar = s % 16;
      // Slow pad chords (I - vi - IV - V)
      if (bar === 0) { pad(N(-21), t, 3.4, 0.06); pad(N(-14), t, 3.4, 0.05); pad(N(-9), t, 3.4, 0.05); }
      if (bar === 4) { pad(N(-24), t, 3.4, 0.06); pad(N(-17), t, 3.4, 0.05); pad(N(-12), t, 3.4, 0.05); }
      if (bar === 8) { pad(N(-16), t, 3.4, 0.06); pad(N(-9), t, 3.4, 0.05); pad(N(-4), t, 3.4, 0.05); }
      if (bar === 12) { pad(N(-14), t, 3.4, 0.06); pad(N(-7), t, 3.4, 0.05); pad(N(-2), t, 3.4, 0.05); }
      // Gentle pulse pluck on every other step
      if (bar % 2 === 0) {
        const roots = [N(-21), N(-21), N(-24), N(-24), N(-16), N(-16), N(-14), N(-14)];
        pluck(roots[bar / 2], t, 0.5, 0.06);
      }
      // Subtle melody note on select beats
      const melPattern = { 2: N(3), 6: N(7), 10: N(8), 14: N(5) };
      if (melPattern[bar]) pluck(melPattern[bar], t, 0.8, 0.05);
    },
  },
  // Warm hymnal for menus/shops — very calm
  menu: {
    bpm: 72,
    play(t, s) {
      const bar = s % 16;
      // I - IV - V - I hymn chords
      if (bar === 0)  { pad(N(-21), t, 4.3, 0.07); pad(N(-14), t, 4.3, 0.05); pad(N(-9), t, 4.3, 0.05); pad(N(-5), t, 4.3, 0.04); }
      if (bar === 4)  { pad(N(-17), t, 4.3, 0.07); pad(N(-9), t, 4.3, 0.05); pad(N(-5), t, 4.3, 0.05); pad(N(0), t, 4.3, 0.04); }
      if (bar === 8)  { pad(N(-19), t, 4.3, 0.07); pad(N(-12), t, 4.3, 0.05); pad(N(-7), t, 4.3, 0.05); pad(N(-2), t, 4.3, 0.04); }
      if (bar === 12) { pad(N(-21), t, 4.3, 0.07); pad(N(-14), t, 4.3, 0.05); pad(N(-9), t, 4.3, 0.05); pad(N(-5), t, 4.3, 0.04); }
      // Occasional soft pluck melody
      const mel = { 3: N(3), 7: N(0), 11: N(2), 15: N(-2) };
      if (mel[bar]) pluck(mel[bar], t, 1.2, 0.04);
    },
  },
};

// ---------- Scheduler ----------
const LOOKAHEAD = 25; // ms
const SCHEDULE_AHEAD = 0.2; // seconds

function tick() {
  if (!ctx || !currentTheme || isPaused) return;
  const theme = THEMES[currentTheme];
  if (!theme) return;
  const stepDur = 60 / theme.bpm / 2; // 8th notes
  while (nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
    theme.play(nextNoteTime, step);
    nextNoteTime += stepDur;
    step++;
  }
}

export function playMusic(theme) {
  if (!theme || currentTheme === theme) return;
  const c = ensureCtx();
  if (!c) return;
  // Fade out current, then swap
  if (currentTheme) {
    const g = masterGain.gain;
    g.cancelScheduledValues(c.currentTime);
    g.setValueAtTime(g.value, c.currentTime);
    g.linearRampToValueAtTime(0, c.currentTime + 0.4);
    setTimeout(() => startTheme(theme), 420);
  } else {
    startTheme(theme);
  }
}

function startTheme(theme) {
  if (!ctx) return;
  currentTheme = theme;
  step = 0;
  nextNoteTime = ctx.currentTime + 0.08;
  const target = musicOn ? musicVolume : 0;
  masterGain.gain.cancelScheduledValues(ctx.currentTime);
  masterGain.gain.setValueAtTime(0, ctx.currentTime);
  masterGain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.6);
  if (!scheduler) scheduler = setInterval(tick, LOOKAHEAD);
}

export function stopMusic() {
  if (!ctx) return;
  const g = masterGain.gain;
  g.cancelScheduledValues(ctx.currentTime);
  g.setValueAtTime(g.value, ctx.currentTime);
  g.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
  setTimeout(() => {
    currentTheme = null;
    if (scheduler) { clearInterval(scheduler); scheduler = null; }
  }, 350);
}

export function setMusicVolume(v) {
  musicVolume = Math.max(0, Math.min(1, v));
  localStorage.setItem(STORAGE.volume, String(musicVolume));
  if (masterGain && musicOn) {
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(musicVolume, ctx.currentTime + 0.15);
  }
}
export function getMusicVolume() { return musicVolume; }

export function setMusicEnabled(enabled) {
  musicOn = !!enabled;
  localStorage.setItem(STORAGE.on, String(musicOn));
  if (masterGain && ctx) {
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(musicOn ? musicVolume : 0, ctx.currentTime + 0.25);
  }
}
export function isMusicEnabled() { return musicOn; }

// Pause on tab blur / resume on focus
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    isPaused = document.hidden;
    if (!isPaused && ctx?.state === "suspended") ctx.resume();
  });
}
