/** Tiny WebAudio sound effects (no files). Muted state is remembered per browser; every call is safe if audio is unavailable. */
let ctx: AudioContext | null = null;
let muted = false;
try { muted = localStorage.getItem("fix:muted") === "1"; } catch { /* storage blocked */ }

export const isMuted = () => muted;
export function setMuted(m: boolean) { muted = m; try { localStorage.setItem("fix:muted", m ? "1" : "0"); } catch { /* ignore */ } }

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "triangle", vol = 0.08) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  const t = a.currentTime + start;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
}

export type Sfx = "tap" | "turn" | "alert" | "good" | "bad" | "gavel" | "fanfare" | "doom";
const SEQ: Record<Sfx, [number, number, number, OscillatorType?][]> = {
  tap: [[660, 0, 0.06, "sine"]],
  turn: [[392, 0, 0.12], [523, 0.1, 0.12], [659, 0.2, 0.2]],
  alert: [[880, 0, 0.09, "square"], [880, 0.14, 0.09, "square"]],
  good: [[523, 0, 0.1], [659, 0.09, 0.1], [784, 0.18, 0.22]],
  bad: [[330, 0, 0.18, "sawtooth"], [247, 0.16, 0.3, "sawtooth"]],
  gavel: [[160, 0, 0.12, "square"], [120, 0.16, 0.2, "square"]],
  fanfare: [[523, 0, 0.14], [659, 0.14, 0.14], [784, 0.28, 0.14], [1047, 0.42, 0.45]],
  doom: [[220, 0, 0.4, "sawtooth"], [185, 0.35, 0.4, "sawtooth"], [147, 0.7, 0.8, "sawtooth"]],
};
export function sfx(name: Sfx) {
  if (muted) return;
  for (const [f, st, d, t] of SEQ[name]) tone(f, st, d, t ?? "triangle", name === "doom" ? 0.06 : 0.07);
}
