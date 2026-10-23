// Sounds are made with the Web Audio API, so there are no files to download.
// Browsers only allow audio after a tap, so the audio context starts on the first tap.

export type Sfx = "tap" | "grow" | "coin" | "spend" | "pop" | "win" | "bad" | "death" | "alarm" | "buy" | "page";

const KEY = "naija-life-sound-v1";
export interface SoundSettings { sfx: boolean; music: boolean }
let settings: SoundSettings = { sfx: true, music: false };
try {
  const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
  if (raw) settings = { ...settings, ...(JSON.parse(raw) as Partial<SoundSettings>) };
} catch { /* storage unavailable */ }

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicTimer: ReturnType<typeof setInterval> | null = null;
const last: Partial<Record<Sfx, number>> = {};

export const getSound = (): SoundSettings => ({ ...settings });
export function setSound(next: Partial<SoundSettings>) {
  settings = { ...settings, ...next };
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  if (settings.music) startMusic(); else stopMusic();
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination); } catch { return null; }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Call from a tap handler so the browser allows sound. */
export function unlockAudio() {
  audio();
  if (settings.music) startMusic();
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.15, to?: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (to) o.frequency.exponentialRampToValueAtTime(to, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(master!);
  o.start(start);
  o.stop(start + dur + 0.05);
}

function noise(c: AudioContext, start: number, dur: number, from: number, to: number, vol = 0.12) {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource();
  s.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.setValueAtTime(from, start);
  f.frequency.exponentialRampToValueAtTime(to, start + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  s.connect(f).connect(g).connect(master!);
  s.start(start);
}

export function sfx(name: Sfx) {
  if (!settings.sfx) return;
  const c = audio();
  if (!c || !master) return;
  const now = c.currentTime;
  const t = performance.now();
  if (t - (last[name] ?? 0) < (name === "tap" ? 40 : 120)) return;
  last[name] = t;
  switch (name) {
    case "tap": tone(c, 880, now, 0.06, "sine", 0.07, 660); break;
    case "page": tone(c, 520, now, 0.07, "triangle", 0.06, 700); break;
    case "grow":
      noise(c, now, 0.35, 300, 2400, 0.1);
      tone(c, 523.25, now + 0.12, 0.25, "triangle", 0.14);
      tone(c, 659.25, now + 0.22, 0.3, "triangle", 0.14);
      tone(c, 783.99, now + 0.32, 0.4, "triangle", 0.12);
      break;
    case "coin":
      tone(c, 987.77, now, 0.09, "square", 0.07);
      tone(c, 1318.5, now + 0.08, 0.28, "square", 0.07);
      break;
    case "spend":
      tone(c, 520, now, 0.1, "triangle", 0.1);
      tone(c, 390, now + 0.09, 0.18, "triangle", 0.1);
      break;
    case "buy":
      noise(c, now, 0.07, 3000, 3000, 0.09);
      tone(c, 1568, now + 0.08, 0.5, "sine", 0.12);
      break;
    case "pop":
      tone(c, 660, now, 0.16, "sine", 0.14);
      tone(c, 990, now + 0.07, 0.2, "sine", 0.1);
      break;
    case "win":
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, f, now + i * 0.09, 0.35, "triangle", 0.13));
      tone(c, 1318.5, now + 0.4, 0.6, "sine", 0.1);
      break;
    case "bad":
      tone(c, 160, now, 0.28, "sawtooth", 0.09, 90);
      break;
    case "death":
      [0, 1.2].forEach((d) => { tone(c, 196, now + d, 1.6, "sine", 0.16); tone(c, 294, now + d, 1.4, "sine", 0.08); });
      break;
    case "alarm":
      for (let i = 0; i < 4; i++) tone(c, i % 2 ? 520 : 760, now + i * 0.22, 0.2, "square", 0.08);
      break;
  }
}

// A gentle looping beat with a pentatonic tune
const SCALE = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];
const BASS = [130.81, 130.81, 146.83, 98, 130.81, 130.81, 164.81, 146.83];
const TUNE = [4, 5, 4, 2, 3, 4, 2, 0, 4, 5, 6, 5, 4, 3, 2, 3];
let step = 0;
let nextTime = 0;
function startMusic() {
  if (musicTimer || !settings.music) return;
  const c = audio();
  if (!c || !master) return;
  nextTime = c.currentTime + 0.1;
  musicTimer = setInterval(() => {
    if (!ctx || !master || !settings.music) return;
    while (nextTime < ctx.currentTime + 0.4) {
      const i = step % 16;
      if (i % 4 === 0) tone(ctx, 70, nextTime, 0.2, "sine", 0.18, 40);
      if (i % 2 === 1) noise(ctx, nextTime, 0.05, 6000, 8000, 0.03);
      if (i % 2 === 0) tone(ctx, BASS[(i / 2) % 8], nextTime, 0.22, "triangle", 0.05);
      tone(ctx, SCALE[TUNE[i]] * 2, nextTime, 0.18, "sine", 0.035);
      nextTime += 0.15;
      step++;
    }
  }, 120);
}
function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}
