import type { Gender } from "./types";
import { T, rng, chance, clamp, pick, randInt } from "./util";

export interface Look {
  skin: number;
  hair: string;
  hairColor: number;
  beard: string;
  wear: string;
  outfit: string;
  outfitColor: number;
}

export const SKINS = ["#e3b07c", "#c98f5a", "#a96f3f", "#8d5a2e", "#734622", "#5a3418", "#432513", "#2f1a0d"];
export const HAIR_COLORS = ["#16110d", "#2c1b12", "#6b4423", "#a8a8a8", "#ececec", "#d4a93e", "#8a2b2b"];
export const OUTFIT_COLORS = ["#1f9d55", "#f5b82e", "#c0392b", "#2e5eaa", "#7b3fa0", "#e8e2d0", "#14202b", "#d9772b"];

export const HAIRS: { id: string; label: string }[] = [
  { id: "bald", get label() { return T("Bald", "Bald head"); } },
  { id: "low", get label() { return T("Low cut", "Low cut"); } },
  { id: "fade", get label() { return T("High-top fade", "High-top fade"); } },
  { id: "afro", get label() { return T("Afro", "Afro"); } },
  { id: "cornrows", get label() { return T("Cornrows", "Cornrows"); } },
  { id: "dreads", get label() { return T("Dreadlocks", "Dreadlocks"); } },
  { id: "braids", get label() { return T("Long braids", "Long long braids"); } },
  { id: "knots", get label() { return T("Bantu knots", "Bantu knots"); } },
  { id: "twists", get label() { return T("Twists", "Twists"); } },
  { id: "shuku", get label() { return T("Shuku", "Shuku"); } },
  { id: "puff", get label() { return T("Afro puff", "Afro puff"); } },
  { id: "weave", get label() { return T("Long weave", "Long weave"); } },
];
export const BEARDS: { id: string; label: string }[] = [
  { id: "none", get label() { return T("Clean-shaven", "Clean face"); } },
  { id: "stubble", get label() { return T("Stubble", "Small beard"); } },
  { id: "mous", get label() { return T("Moustache", "Moustache"); } },
  { id: "goatee", get label() { return T("Goatee", "Goatee"); } },
  { id: "full", get label() { return T("Full beard", "Full beard"); } },
];
export const WEARS: { id: string; label: string }[] = [
  { id: "none", get label() { return T("Nothing", "Nothing"); } },
  { id: "fila", get label() { return T("Fila cap", "Fila cap"); } },
  { id: "hausa", get label() { return T("Hausa cap", "Hausa cap"); } },
  { id: "gele", get label() { return T("Gele", "Gele"); } },
  { id: "hijab", get label() { return T("Hijab", "Hijab"); } },
  { id: "facecap", get label() { return T("Face cap", "Face cap"); } },
];
export const OUTFITS: { id: string; label: string }[] = [
  { id: "tshirt", get label() { return T("T-shirt", "T-shirt"); } },
  { id: "ankara", get label() { return T("Ankara", "Ankara"); } },
  { id: "agbada", get label() { return T("Agbada", "Agbada"); } },
  { id: "kaftan", get label() { return T("Kaftan", "Kaftan"); } },
  { id: "senator", get label() { return T("Senator wear", "Senator wear"); } },
  { id: "suit", get label() { return T("Suit", "Suit"); } },
  { id: "jersey", get label() { return T("Eagles jersey", "Super Eagles jersey"); } },
];

export const lookToStr = (l: Look) => [l.skin, l.hair, l.hairColor, l.beard, l.wear, l.outfit, l.outfitColor].join("|");
export function strToLook(s: string | undefined | null): Look | null {
  if (!s) return null;
  const [skin, hair, hairColor, beard, wear, outfit, outfitColor] = s.split("|");
  if (outfitColor === undefined) return null;
  return { skin: Number(skin), hair, hairColor: Number(hairColor), beard, wear, outfit, outfitColor: Number(outfitColor) };
}

interface LookCtx {
  region?: string;
  religion?: string;
  skinBase?: number;
}

/** A believable random Nigerian look. */
export function randomLook(gender: Gender, ctx: LookCtx = {}): Look {
  const male = gender === "male";
  const skin = clamp(Math.round((ctx.skinBase ?? 3 + rng() * 3.2) + (rng() - 0.5) * 1.6), 0, SKINS.length - 1);
  const hair = male ? pick(["low", "low", "fade", "afro", "cornrows", "dreads", "twists", "bald", "knots"]) : pick(["puff", "braids", "weave", "cornrows", "knots", "afro", "shuku", "low", "twists"]);
  const north = ctx.region === "North West" || ctx.region === "North East" || ctx.region === "North Central";
  let wear = "none";
  if (ctx.religion === "Muslim") {
    if (!male && chance(0.6)) wear = "hijab";
    else if (male && north && chance(0.5)) wear = "hausa";
  }
  if (wear === "none" && ctx.region === "South West") {
    if (male && chance(0.25)) wear = "fila";
    if (!male && chance(0.35)) wear = "gele";
  }
  if (wear === "none" && !male && chance(0.12)) wear = "gele";
  if (wear === "none" && male && chance(0.1)) wear = "facecap";
  const beard = male ? pick(["none", "none", "stubble", "mous", "goatee", "full"]) : "none";
  const outfit = pick(male ? ["tshirt", "ankara", "kaftan", "agbada", "suit", "jersey"] : ["tshirt", "ankara", "ankara", "suit", "jersey"]);
  return { skin, hair, hairColor: chance(0.92) ? randInt(0, 1) : randInt(5, 6), beard, wear, outfit, outfitColor: randInt(0, OUTFIT_COLORS.length - 1) };
}

/** A child looks like a blend of both parents. */
export function kidLook(dad: Look | null | undefined, mom: Look | null | undefined, gender: Gender): Look {
  const a = dad ?? randomLook("male");
  const b = mom ?? randomLook("female");
  const skin = clamp(Math.round((a.skin + b.skin) / 2 + (rng() - 0.5) * 1.8), 0, SKINS.length - 1);
  const base = randomLook(gender, { skinBase: skin });
  return { ...base, skin, hairColor: chance(0.5) ? a.hairColor : b.hairColor, beard: "none", wear: "none", outfit: pick(["tshirt", "ankara", "jersey"]) };
}

/** A parent who looks related to their child. */
export function parentLook(child: Look, gender: Gender, region?: string, religion?: string): Look {
  const base = randomLook(gender, { region, religion, skinBase: child.skin + (rng() - 0.5) * 1.4 });
  return { ...base, hair: gender === "male" ? pick(["low", "low", "bald", "afro"]) : pick(["weave", "braids", "puff", "low"]), outfit: pick(gender === "male" ? ["agbada", "kaftan", "suit", "ankara"] : ["ankara", "ankara", "kaftan"]) };
}

/** Cosmetic outfit changes based on what a person is doing. */
export function displayLook(look: Look, opts: { age: number; student?: boolean; soldier?: boolean; office?: number; military?: boolean }): Look {
  if (opts.age >= 5 && opts.age < 18 && opts.student) return { ...look, outfit: "uniform", outfitColor: 0 };
  if (opts.military || opts.soldier) return { ...look, outfit: "camo", outfitColor: 0 };
  if ((opts.office ?? -1) >= 3) return { ...look, outfit: "agbada", outfitColor: look.outfitColor };
  if ((opts.office ?? -1) >= 0) return { ...look, outfit: "senator", outfitColor: look.outfitColor };
  return look;
}
