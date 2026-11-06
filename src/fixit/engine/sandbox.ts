/** Sandbox: no term limits, deep pockets, every screen open, and tools to bend the rules. Sandbox games do not enter the Hall of Presidents. */
import type { FixState } from "./types";
import { UNLOCKS } from "./meta";
import { clamp100 } from "./util";

export const isSandbox = (s: FixState) => !!s.flags.sandbox;
export function applySandbox(s: FixState) {
  s.flags.sandbox = 1;
  s.fin.treasury *= 4;
  if (s.cap) { s.cap.pc = 100; s.cap.legacy = true; s.cap.unlocked = UNLOCKS.map((u) => u.id); }
}
export const SANDBOX_TOOLS: { id: string; label: string; run: (s: FixState) => string }[] = [
  { id: "cash", label: "Add ₦1 trillion", run: (s) => { s.fin.treasury += 1000; return "₦1 trillion added to the treasury."; } },
  { id: "pc", label: "Refill political capital", run: (s) => { if (s.cap) s.cap.pc = 100; return "Political capital refilled."; } },
  { id: "calm", label: "Calm the streets", run: (s) => { s.rule.streetAnger = 10; s.rule.coupRisk = 5; for (const r of Object.values(s.regions)) r.unrest = Math.min(r.unrest, 15); return "The streets are calm and the barracks quiet."; } },
  { id: "love", label: "Make the world like you", run: (s) => { try { const w = JSON.parse(String(s.flags.world)); for (const c of w.c) c.rel = Math.max(c.rel, 70); s.flags.world = JSON.stringify(w); } catch { /* no world yet */ } s.gov.trust = clamp100(s.gov.trust + 10); return "Every capital suddenly returns your calls."; } },
  { id: "army", label: "Strengthen the army", run: (s) => { s.mil.strength = clamp100(s.mil.strength + 15); return "The armed forces are stronger."; } },
];
