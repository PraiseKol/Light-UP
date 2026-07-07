// src/utils/sound.js
// Procedural Web Audio SFX engine. No files, no downloads, tuned per action.
// Public API kept backwards-compatible: playSound(name, effectsOn), getVolume(), setVolume(v)

let ctx = null;
let masterGain = null;

// Persisted preferences
const STORAGE = {
  sfxVolume: "sfxVolume",
  sfxOn: "sfxOn",
  legacy: "soundVolume",
};

let sfxVolume = (() => {
  const v = parseFloat(localStorage.getItem(STORAGE.sfxVolume));
  if (!Number.isNaN(v)) return v;
  const legacy = parseFloat(localStorage.getItem(STORAGE.legacy));
  return Number.isNaN(legacy) ? 0.6 : legacy;
})();

let sfxOn = localStorage.getItem(STORAGE.sfxOn);
sfxOn = sfxOn === null ? true : sfxOn === "true";

function ensureCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = sfxVolume;
    masterGain.connect(ctx.destination);
    // Resume on any user gesture (Safari/iOS autoplay policy)
    const resume = () => {
      if (ctx && ctx.state === "suspended") ctx.resume();
    };
    ["click", "touchstart", "keydown"].forEach((ev) =>
      window.addEventListener(ev, resume, { once: false, passive: true })
    );
    return ctx;
  } catch {
    return null;
  }
}

// ---------- Preferences (used by SettingsModal / AudioContext) ----------
export function setVolume(level) {
  sfxVolume = Math.max(0, Math.min(1, level));
  localStorage.setItem(STORAGE.sfxVolume, String(sfxVolume));
  localStorage.setItem(STORAGE.legacy, String(sfxVolume)); // legacy compat
  if (masterGain) masterGain.gain.value = sfxVolume;
}
export function getVolume() {
  return sfxVolume;
}
export function setSfxEnabled(enabled) {
  sfxOn = !!enabled;
  localStorage.setItem(STORAGE.sfxOn, String(sfxOn));
}
export function isSfxEnabled() {
  return sfxOn;
}

// ---------- Low-level synth helpers ----------
function tone({ freq = 440, dur = 0.15, type = "sine", vol = 0.4, attack = 0.005, release = 0.08, detune = 0, endFreq = null, delay = 0 } = {}) {
  const c = ensureCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + dur);
  osc.detune.value = detune;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
  osc.connect(g).connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + dur + release + 0.02);
}

function noise({ dur = 0.2, vol = 0.3, filterFreq = 2000, filterType = "lowpass", Q = 1, delay = 0 } = {}) {
  const c = ensureCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const bufferSize = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  filter.Q.value = Q;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(masterGain);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

function chord(freqs, opts = {}) {
  freqs.forEach((f) => tone({ ...opts, freq: f }));
}

// Musical note helpers (A4 = 440)
const N = (semisFromA4) => 440 * Math.pow(2, semisFromA4 / 12);
// C major scale reference: C4=-9, D4=-7, E4=-5, F4=-4, G4=-2, A4=0, B4=2, C5=3, E5=7, G5=10

// ---------- Named SFX ----------
const SFX = {
  // UI
  tap: () => tone({ freq: 900, endFreq: 600, dur: 0.06, type: "sine", vol: 0.25, release: 0.05 }),
  click: () => SFX.tap(),
  select: () => {
    tone({ freq: 880, dur: 0.08, type: "triangle", vol: 0.3 });
    tone({ freq: 1320, dur: 0.12, type: "sine", vol: 0.2, delay: 0.04 });
  },
  back: () => tone({ freq: 500, endFreq: 220, dur: 0.18, type: "sine", vol: 0.28, release: 0.1 }),
  switch: () => {
    tone({ freq: 700, dur: 0.04, type: "square", vol: 0.15 });
    tone({ freq: 1100, dur: 0.05, type: "square", vol: 0.15, delay: 0.03 });
  },
  toggle: () => SFX.switch(),
  modalOpen: () => {
    tone({ freq: 440, endFreq: 880, dur: 0.22, type: "sine", vol: 0.22, release: 0.12 });
    tone({ freq: 660, dur: 0.2, type: "triangle", vol: 0.12, delay: 0.05 });
  },
  modalClose: () => tone({ freq: 660, endFreq: 330, dur: 0.18, type: "sine", vol: 0.2 }),
  slide: () => noise({ dur: 0.18, vol: 0.15, filterFreq: 3000, filterType: "bandpass", Q: 2 }),

  // Game feedback
  optionSelect: () => {
    tone({ freq: 700, dur: 0.05, type: "triangle", vol: 0.25 });
    tone({ freq: 1050, dur: 0.08, type: "sine", vol: 0.18, delay: 0.03 });
  },
  submitAnswer: () => {
    noise({ dur: 0.12, vol: 0.18, filterFreq: 1500, filterType: "highpass", Q: 1 });
    tone({ freq: 520, endFreq: 780, dur: 0.15, type: "sine", vol: 0.22, delay: 0.03 });
  },
  success: () => SFX.correct(),
  correct: () => {
    // Bright ascending harp glissando C-E-G-C
    [N(-9), N(-5), N(-2), N(3)].forEach((f, i) =>
      tone({ freq: f, dur: 0.15, type: "triangle", vol: 0.32, delay: i * 0.07, release: 0.15 })
    );
    tone({ freq: N(7), dur: 0.4, type: "sine", vol: 0.22, delay: 0.28, release: 0.35 });
    // sparkle
    tone({ freq: 2400, dur: 0.05, type: "sine", vol: 0.1, delay: 0.35 });
    tone({ freq: 3200, dur: 0.05, type: "sine", vol: 0.08, delay: 0.42 });
  },
  error: () => SFX.wrong(),
  wrong: () => {
    // Soft comedic descending "aww"
    tone({ freq: 400, endFreq: 260, dur: 0.18, type: "triangle", vol: 0.28 });
    tone({ freq: 300, endFreq: 200, dur: 0.22, type: "sine", vol: 0.22, delay: 0.15 });
  },
  timeUp: () => {
    // Dramatic bell knell
    [N(-14), N(-14), N(-14)].forEach((f, i) =>
      tone({ freq: f, dur: 0.5, type: "sine", vol: 0.35, delay: i * 0.28, release: 0.5 })
    );
  },
  countdown: () => {
    tone({ freq: 880, dur: 0.06, type: "square", vol: 0.22 });
    tone({ freq: 660, dur: 0.06, type: "square", vol: 0.18, delay: 0.1 });
  },
  lifeLost: () => {
    noise({ dur: 0.08, vol: 0.35, filterFreq: 200, filterType: "lowpass" });
    tone({ freq: 220, endFreq: 80, dur: 0.35, type: "sawtooth", vol: 0.28, delay: 0.02 });
  },
  levelUp: () => {
    // Triumphant fanfare C-E-G-C
    [N(-9), N(-5), N(-2), N(3)].forEach((f, i) =>
      tone({ freq: f, dur: 0.18, type: "triangle", vol: 0.35, delay: i * 0.09 })
    );
    chord([N(-9), N(-5), N(-2), N(3)], { dur: 0.55, type: "sine", vol: 0.22, delay: 0.42, release: 0.5 });
    tone({ freq: 3000, dur: 0.06, type: "sine", vol: 0.12, delay: 0.5 });
    tone({ freq: 4200, dur: 0.06, type: "sine", vol: 0.1, delay: 0.6 });
  },
  starEarned: () => {
    tone({ freq: 2000, endFreq: 3200, dur: 0.15, type: "sine", vol: 0.22, release: 0.15 });
    tone({ freq: 2600, dur: 0.1, type: "triangle", vol: 0.15, delay: 0.06 });
  },
  perfectStreak: () => {
    // Angelic choir stinger — layered sines
    [N(-9), N(-5), N(-2), N(3), N(7)].forEach((f, i) =>
      tone({ freq: f, dur: 0.9, type: "sine", vol: 0.14, delay: i * 0.04, attack: 0.15, release: 0.6 })
    );
    tone({ freq: 3500, dur: 0.08, type: "sine", vol: 0.12, delay: 0.5 });
  },
  phaseUnlock: () => {
    // Grand gate-opening chord
    noise({ dur: 0.4, vol: 0.18, filterFreq: 800, filterType: "lowpass" });
    chord([N(-21), N(-14), N(-9), N(-5), N(-2)], { dur: 0.8, type: "sawtooth", vol: 0.12, attack: 0.1, release: 0.6, delay: 0.1 });
    chord([N(-9), N(-5), N(-2), N(3)], { dur: 0.6, type: "triangle", vol: 0.2, delay: 0.35 });
  },
  bonusAwarded: () => {
    // Celebratory ta-da
    tone({ freq: N(-2), dur: 0.15, type: "triangle", vol: 0.3 });
    tone({ freq: N(3), dur: 0.4, type: "triangle", vol: 0.32, delay: 0.15, release: 0.3 });
    tone({ freq: 3000, dur: 0.06, type: "sine", vol: 0.12, delay: 0.2 });
  },

  // Power-ups
  divineHint: () => {
    noise({ dur: 0.3, vol: 0.12, filterFreq: 4000, filterType: "highpass" });
    tone({ freq: 1200, endFreq: 2800, dur: 0.35, type: "sine", vol: 0.25, release: 0.2 });
    tone({ freq: 2400, dur: 0.15, type: "triangle", vol: 0.18, delay: 0.2 });
  },
  gracePeriod: () => {
    // Clock rewind
    for (let i = 0; i < 6; i++) {
      tone({ freq: 800 - i * 60, dur: 0.04, type: "square", vol: 0.15, delay: i * 0.05 });
    }
    tone({ freq: N(3), dur: 0.4, type: "sine", vol: 0.2, delay: 0.35, release: 0.3 });
  },
  holyShield: () => {
    // Shimmering barrier hum
    tone({ freq: N(-9), dur: 0.6, type: "sine", vol: 0.2, attack: 0.1, release: 0.4 });
    tone({ freq: N(-5), dur: 0.6, type: "sine", vol: 0.18, attack: 0.1, release: 0.4, detune: 5 });
    tone({ freq: N(-2), dur: 0.6, type: "triangle", vol: 0.14, attack: 0.15, release: 0.4 });
    tone({ freq: 3200, dur: 0.08, type: "sine", vol: 0.1, delay: 0.3 });
  },
  heavenlyMatch: () => {
    // Dove flutter + glow
    for (let i = 0; i < 5; i++) {
      noise({ dur: 0.06, vol: 0.08, filterFreq: 2500, filterType: "bandpass", Q: 4, delay: i * 0.06 });
    }
    chord([N(-2), N(3), N(7)], { dur: 0.5, type: "sine", vol: 0.18, delay: 0.3, release: 0.4 });
  },
  powerUpUsed: () => {
    tone({ freq: 600, endFreq: 1800, dur: 0.2, type: "triangle", vol: 0.25, release: 0.15 });
    tone({ freq: 2400, dur: 0.08, type: "sine", vol: 0.15, delay: 0.15 });
  },
  powerUpPurchase: () => SFX.purchase(),
  purchase: () => {
    // Coin cash-register with sparkle
    tone({ freq: 1400, dur: 0.08, type: "square", vol: 0.22 });
    tone({ freq: 1800, dur: 0.1, type: "triangle", vol: 0.2, delay: 0.06 });
    tone({ freq: 2200, dur: 0.15, type: "sine", vol: 0.18, delay: 0.12, release: 0.15 });
    tone({ freq: 3200, dur: 0.06, type: "sine", vol: 0.12, delay: 0.2 });
  },

  // Mini-games / social
  creatingGame: () => {
    tone({ freq: 440, endFreq: 880, dur: 0.4, type: "sawtooth", vol: 0.2, release: 0.2 });
  },
  gameOver: () => {
    // Solemn organ resolve
    [N(-14), N(-9), N(-14), N(-16)].forEach((f, i) =>
      tone({ freq: f, dur: 0.5, type: "sawtooth", vol: 0.22, delay: i * 0.35, release: 0.4 })
    );
  },
  bombTap: () => {
    noise({ dur: 0.25, vol: 0.4, filterFreq: 400, filterType: "lowpass" });
    tone({ freq: 150, endFreq: 40, dur: 0.3, type: "sawtooth", vol: 0.25 });
  },
  cardFlip: () => {
    noise({ dur: 0.08, vol: 0.15, filterFreq: 4000, filterType: "highpass" });
    tone({ freq: 500, endFreq: 800, dur: 0.06, type: "sine", vol: 0.15, delay: 0.04 });
  },
  matchFound: () => {
    tone({ freq: N(-2), dur: 0.1, type: "triangle", vol: 0.28 });
    tone({ freq: N(3), dur: 0.18, type: "triangle", vol: 0.28, delay: 0.08, release: 0.15 });
  },
  notification: () => {
    tone({ freq: 1200, dur: 0.08, type: "sine", vol: 0.22 });
    tone({ freq: 1600, dur: 0.12, type: "sine", vol: 0.2, delay: 0.06 });
  },
  questComplete: () => {
    noise({ dur: 0.2, vol: 0.1, filterFreq: 3000, filterType: "bandpass", Q: 3 });
    [N(-2), N(3), N(7)].forEach((f, i) =>
      tone({ freq: f, dur: 0.18, type: "triangle", vol: 0.25, delay: 0.15 + i * 0.08 })
    );
  },
};

// Aliases for legacy keys
SFX["life-lost"] = SFX.lifeLost;
SFX["level-up"] = SFX.levelUp;
SFX["game-over"] = SFX.gameOver;
SFX["divine-hint"] = SFX.divineHint;
SFX["grace-period"] = SFX.gracePeriod;
SFX["holy-shield"] = SFX.holyShield;
SFX["heavenly-match"] = SFX.heavenlyMatch;
SFX["power-up"] = SFX.powerUpUsed;

// Debounce to avoid audio spam from rapid identical triggers
const lastPlay = {};
export function playSound(name, effectsOn = true) {
  if (!effectsOn || !sfxOn) return;
  const now = performance.now();
  if (lastPlay[name] && now - lastPlay[name] < 30) return; // 30ms debounce per key
  lastPlay[name] = now;
  const fn = SFX[name];
  if (!fn) {
    // Silently degrade instead of console spam
    return;
  }
  try {
    fn();
  } catch (err) {
    // never let audio break the app
    console.debug("sfx failed:", name, err);
  }
}

// Legacy exports (some files import these)
export default { playSound, setVolume, getVolume };
