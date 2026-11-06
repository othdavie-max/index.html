/**
 * Your look is part of your politics. What you wear and how you present says something to every group: an agbada
 * speaks to traders and elders, a suit to business and foreign investors, a plain shirt to the young and to workers, a
 * kaftan to the north and the faithful. Each choice pleases some groups and puts others off, a little, permanently.
 * Nothing is strictly best, and flipping your style often makes you look like you have no style at all.
 */
import type { FixState, GroupId, Portrait } from "./types";
import { clamp, clamp100 } from "./util";

type Tilt = Partial<Record<GroupId, number>>;
export interface Look { label: string; icon: string; tilt: Tilt; investor?: number; blurb: string }
export const OUTFIT: Record<number, Look> = {
  0: { label: "Plain shirt", icon: "👕", tilt: { youth: 1, workers: 0.5, business: -0.4, military: -0.2 }, blurb: "Looks like one of the people." },
  1: { label: "Agbada", icon: "🥻", tilt: { traders: 0.8, farmers: 0.4, faith: 0.2, youth: -0.5 }, blurb: "Tradition, wealth and respect for elders." },
  2: { label: "Suit and tie", icon: "🤵🏾", tilt: { business: 1, farmers: -0.4, workers: -0.3, youth: -0.3 }, investor: 0.25, blurb: "Serious, global, a little distant." },
  3: { label: "Kaftan", icon: "👘", tilt: { faith: 0.8, farmers: 0.6, military: 0.3, business: -0.2 }, blurb: "Northern dignity and calm authority." },
};
export const WEAR: Record<number, Look> = {
  0: { label: "Bare-headed", icon: "🙂", tilt: { youth: 0.2 }, blurb: "Modern and open." },
  1: { label: "Fila cap", icon: "🧢", tilt: { traders: 0.3, farmers: 0.3 }, blurb: "Grounded and traditional." },
  2: { label: "Gele", icon: "👑", tilt: { traders: 0.5, faith: 0.1 }, blurb: "Bold and celebratory." },
  3: { label: "Headscarf", icon: "🧕🏾", tilt: { faith: 0.7, youth: -0.1 }, blurb: "Modest, devout." },
  4: { label: "Red cap", icon: "🔴", tilt: { youth: 0.3, workers: 0.2, military: -0.2 }, blurb: "A politician of the movement." },
};
const GLASSES: Look = { label: "Glasses", icon: "👓", tilt: { business: 0.25, youth: 0.1 }, blurb: "Looks like someone who reads." };
const BEARD: Look = { label: "Beard", icon: "🧔🏾", tilt: { military: 0.3, faith: 0.3, youth: -0.1 }, blurb: "Gravitas." };

export interface Image { tilt: Tilt; investor: number; parts: { icon: string; label: string; blurb: string }[] }
export function imageOf(p: Portrait): Image {
  const tilt: Tilt = {}; let investor = 0; const parts: Image["parts"] = [];
  const add = (l: Look) => { for (const [k, v] of Object.entries(l.tilt)) tilt[k as GroupId] = (tilt[k as GroupId] ?? 0) + (v as number); investor += l.investor ?? 0; parts.push({ icon: l.icon, label: l.label, blurb: l.blurb }); };
  add(OUTFIT[(p.outfit ?? 0) % 4]); add(WEAR[(p.wear ?? 0) % 5]);
  if ((p.glasses ?? 0) % 3 > 0) add(GLASSES); if ((p.beard ?? 0) % 3 > 0) add(BEARD);
  return { tilt, investor, parts };
}
/** a soft, permanent pull on each group's mood towards (6 × the tilt) */
export function looksMonthly(s: FixState) {
  const im = imageOf(s.meta.portrait);
  for (const [g, v] of Object.entries(im.tilt) as [GroupId, number][]) {
    const goal = 6 * v, cur = s.groupMood[g];
    if (v > 0 && cur < goal) s.groupMood[g] = clamp(cur + 0.2 * v, -40, 40);
    if (v < 0 && cur > goal) s.groupMood[g] = clamp(cur + 0.2 * v, -40, 40);
  }
  if (im.investor) s.eco.investor = clamp100(s.eco.investor + im.investor * 0.04);
}
export function changeLook(s: FixState, patch: Partial<Portrait>): { ok: boolean; message: string } {
  const last = Number(s.flags.lookChanged ?? -99); const recent = s.month - last < 12 && last >= 0;
  s.meta.portrait = { ...s.meta.portrait, ...patch }; s.flags.lookChanged = s.month;
  if (recent) { s.gov.approval = clamp(s.gov.approval - 0.7, 0, 100); return { ok: true, message: "New look. Commentators note you changed style again: some say you have no identity." }; }
  return { ok: true, message: "New look. Groups will react to it over the coming months." };
}
