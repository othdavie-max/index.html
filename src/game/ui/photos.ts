/**
 * Painted portrait library (public/avatars). Twelve base faces (six women, six men) with a plain top that comes in six colours,
 * and one face with six full outfits. A Portrait (the old drawn-face data) maps to a photo-quality painting here, so every
 * minister, governor and aide gets a real face without changing any engine code. Anything missing falls back to the drawn face.
 */
export interface FaceDef { id: string; female: boolean; tone: number; name: string }
export const FACES: FaceDef[] = [
  { id: "m1", female: false, tone: 4, name: "Deep brown, fade" }, { id: "m2", female: false, tone: 2, name: "Grey beard" }, { id: "m3", female: false, tone: 3, name: "Twists" },
  { id: "m4", female: false, tone: 1, name: "Silver beard" }, { id: "m5", female: false, tone: 5, name: "Bald, moustache" }, { id: "m6", female: false, tone: 3, name: "Short afro" },
  { id: "w1", female: true, tone: 4, name: "Short curls" }, { id: "w2", female: true, tone: 2, name: "Low bun" }, { id: "w3", female: true, tone: 3, name: "Box braids" },
  { id: "w4", female: true, tone: 1, name: "Silver curls" }, { id: "w5", female: true, tone: 5, name: "Cornrows" }, { id: "w6", female: true, tone: 3, name: "Afro" },
];
export const TOPS: { key: string; name: string; css: string }[] = [{ key: "t", name: "Teal", css: "#4E8C8A" }, { key: "n", name: "Navy", css: "#25375f" }, { key: "m", name: "Maroon", css: "#7a2a38" }, { key: "o", name: "Olive", css: "#56693f" }, { key: "c", name: "Charcoal", css: "#3b3f46" }, { key: "w", name: "Cream", css: "#d9d4c8" }];
export const OUTFITS: Record<string, { key: string; name: string; icon: string; outfit: number; wear: number }[]> = {
  m2: [{ key: "agbada", name: "Agbada and fila", icon: "🥻", outfit: 1, wear: 1 }, { key: "suit", name: "Suit and tie", icon: "🤵🏾", outfit: 2, wear: 0 }, { key: "kaftan", name: "White kaftan and cap", icon: "👘", outfit: 3, wear: 1 }, { key: "casual", name: "Casual shirt", icon: "👕", outfit: 0, wear: 0 }, { key: "senator", name: "Senator wear", icon: "🧥", outfit: 3, wear: 0 }, { key: "ankara", name: "Ankara and cap", icon: "🎨", outfit: 1, wear: 4 }],
  w2: [{ key: "gele", name: "Gele and lace", icon: "👑", outfit: 1, wear: 2 }, { key: "suit", name: "Navy blazer", icon: "👩🏾‍💼", outfit: 2, wear: 0 }, { key: "hijab", name: "Hijab and tunic", icon: "🧕🏾", outfit: 3, wear: 3 }, { key: "casual", name: "Casual blouse", icon: "👚", outfit: 0, wear: 0 }, { key: "jacket", name: "Emerald jacket", icon: "🧥", outfit: 3, wear: 0 }, { key: "ankara", name: "Ankara and head tie", icon: "🎨", outfit: 1, wear: 2 }],
};
export const hasOutfits = (face?: string) => !!face && !!OUTFITS[face];
const hash = (...n: number[]) => { let h = 2166136261; for (const x of n) { h ^= x + 0x9e3779b9; h = Math.imul(h, 16777619) >>> 0; } return h; };
export interface PhotoKey { face?: string; look?: string; top?: string; skin: number; style: number; hair: number; accent: number; wear?: number; glasses?: number; beard?: number; outfit?: number }
/** the file (without extension) for a portrait */
export function photoFile(p: PhotoKey): string {
  let face = p.face;
  if (!face || !FACES.some((f) => f.id === face)) {
    const female = [2, 4, 6].includes(p.style % 8); const tone = Math.max(1, Math.min(5, p.skin));
    const pool = FACES.filter((f) => f.female === female); const near = pool.filter((f) => Math.abs(f.tone - tone) <= 1);
    const from = near.length ? near : pool; face = from[hash(p.style, p.hair, p.skin, p.beard ?? 0, p.glasses ?? 0, p.wear ?? 0) % from.length].id;
  }
  if (p.look && OUTFITS[face]?.some((o) => o.key === p.look)) return `${face}-o-${p.look}`;
  const top = p.top ?? TOPS[(p.accent ?? 0) % TOPS.length].key;
  return `${face}-${top}`;
}
export function photoUrl(file: string): string {
  if (typeof window === "undefined") return `/avatars/${file}.webp`;
  return (window as unknown as { __FIX_SITE?: boolean }).__FIX_SITE ? new URL(`avatars/${file}.webp`, document.baseURI).href : `/avatars/${file}.webp`;
}
/** if the portrait files cannot be loaded at all (for example in the single-file preview), stop asking for them and use the drawn faces */
let failures = 0;
export const photosBroken = () => failures >= 3;
export const photoFailed = () => { failures++; };
