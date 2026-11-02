/**
 * Shared character generator: names that fit the zone a person comes from, titles that fit their gender and job,
 * quirks, nicknames and portraits. All people are fictional.
 */
import type { Rng } from "../../game/engine/rng";
import type { Portrait } from "./types";

export type Zone = "NW" | "NE" | "NC" | "SW" | "SE" | "SS";
const NAMES: Record<Zone, { m: string[]; f: string[]; last: string[] }> = {
  NW: { m: ["Aminu", "Bashir", "Sani", "Usman", "Lawal", "Abdullahi", "Nasir", "Kabiru", "Shehu", "Ibrahim", "Mansur", "Yahaya"], f: ["Hadiza", "Zainab", "Aisha", "Halima", "Maryam", "Fatima", "Rabi", "Hauwa", "Bilkisu", "Sadiya"], last: ["Dikko", "Tambuwal", "Ganduje", "Wamakko", "Shinkafi", "Yari", "Bichi", "Kwankwaso", "Radda", "Matawalle", "Dutsinma", "Gusau"] },
  NE: { m: ["Babagana", "Kashim", "Umar", "Bukar", "Ahmadu", "Mohammed", "Mustapha", "Adamu", "Ali", "Goni", "Jibrin", "Isa"], f: ["Aishatu", "Fatimah", "Hajara", "Amina", "Falmata", "Yagana", "Khadija", "Safiya", "Asabe"], last: ["Zulum", "Shettima", "Buni", "Fintiri", "Bala", "Inuwa", "Gaidam", "Geidam", "Abubakar", "Kyari", "Mustapha", "Bulama"] },
  NC: { m: ["Terver", "Samuel", "Simon", "Yakubu", "Abubakar", "David", "Emmanuel", "Gabriel", "Nenpin", "Ochai", "Mohammed", "Joseph"], f: ["Ene", "Mercy", "Ladi", "Grace", "Nguavese", "Comfort", "Amina", "Esther", "Ojoma"], last: ["Ortom", "Alia", "Mutfwang", "Lalong", "Sule", "Bago", "Ododo", "Akume", "Iyorchia", "Achuba", "Gyang", "Abdulrazaq"] },
  SW: { m: ["Babajide", "Oluseyi", "Adebayo", "Kunle", "Tunde", "Femi", "Dapo", "Segun", "Gbenga", "Kayode", "Rotimi", "Ademola"], f: ["Folake", "Funmilayo", "Yetunde", "Bisi", "Ronke", "Abiodun", "Kemi", "Titilayo", "Morenike", "Omotola"], last: ["Adeleke", "Makinde", "Abiodun", "Oyebanji", "Aiyedatiwa", "Sanwo-Olu", "Fashola", "Ogunleye", "Adeyemi", "Olatunji", "Akinyemi", "Bakare"] },
  SE: { m: ["Chukwuemeka", "Obinna", "Ifeanyi", "Ugochukwu", "Nnamdi", "Emeka", "Ikenna", "Chinedu", "Kelechi", "Uche", "Chidi", "Obiora"], f: ["Ngozi", "Adaeze", "Chiamaka", "Ifeoma", "Nneka", "Chioma", "Uju", "Obiageli", "Amaka", "Ebere"], last: ["Soludo", "Otti", "Mbah", "Uzodimma", "Nwifuru", "Obiano", "Okafor", "Nwosu", "Eze", "Okonkwo", "Igwe", "Umeh"] },
  SS: { m: ["Douye", "Siminalayi", "Godwin", "Bassey", "Udom", "Ebiye", "Oghenekaro", "Tamuno", "Edet", "Ovie", "Monday", "Preye"], f: ["Ebiere", "Tari", "Imaobong", "Ese", "Ufuoma", "Ebiakpo", "Nkoyo", "Owanate", "Edidiong"], last: ["Diri", "Fubara", "Eno", "Otu", "Oborevwori", "Okpebholo", "Akpan", "Ekpo", "Bassey", "Tonye-Briggs", "Okon", "Ekanem"] },
};
export const ZONES: Zone[] = ["NW", "NE", "NC", "SW", "SE", "SS"];
export interface Person { name: string; first: string; last: string; female: boolean; zone: Zone }
export function person(rng: Rng, zone: Zone, femaleChance = 0.35): Person {
  const female = rng.chance(femaleChance); const z = NAMES[zone];
  const first = rng.pick(female ? z.f : z.m), last = rng.pick(z.last);
  return { name: `${first} ${last}`, first, last, female, zone };
}
/** a title that fits the person: northern men are often Alhaji, women Hajiya; doctors, engineers and lawyers everywhere */
export function titleFor(rng: Rng, p: Person, kind: "minister" | "governor"): string {
  const north = p.zone === "NW" || p.zone === "NE";
  const pool = kind === "governor" ? ["Gov."] : p.female ? (north ? ["Hajiya", "Dr", "Barr.", "Prof."] : ["Mrs", "Dr", "Barr.", "Prof.", "Engr"]) : north ? ["Alhaji", "Dr", "Engr", "Prof.", "Mallam"] : ["Chief", "Dr", "Engr", "Prof.", "Barr.", "Mr"];
  return rng.pick(pool);
}
/** a varied face: hairstyle, headwear, glasses, beard and outfit that fit the person (and where they come from) */
export function portraitFor(rng: Rng, female: boolean, zone?: Zone): Portrait {
  const north = zone === "NW" || zone === "NE";
  return {
    skin: rng.int(1, 5), hair: rng.chance(0.15) ? 3 : rng.int(0, 2), accent: rng.int(0, 7),
    style: female ? rng.pick([2, 4, 6]) : rng.pick([0, 1, 3, 5, 7]),
    wear: female ? (north ? rng.pick([3, 3, 2]) : rng.pick([0, 2, 2, 0])) : north ? rng.pick([1, 1, 0]) : zone === "SE" ? rng.pick([4, 0, 0]) : zone === "SW" ? rng.pick([1, 0, 0]) : rng.pick([0, 0, 1]),
    glasses: rng.chance(0.25) ? rng.int(1, 2) : 0, beard: female ? 0 : rng.pick([0, 0, 1, 2]), outfit: north ? rng.pick([3, 1, 2]) : rng.pick([0, 1, 2, 2]),
  };
}
export const QUIRKS = ["Never sleeps more than four hours", "Answers every message with a voice note", "Has a WhatsApp group for everything", "Collects vintage Peugeot 504s", "Quotes Chinua Achebe in every memo", "Cannot stand journalists", "Owns a suspicious number of houses in Abuja", "Plays chess with the Senate President", "Fasts every Monday and Thursday", "Is famous for never smiling", "Has a cousin in every ministry", "Writes everything in red ink", "Supports Arsenal with frightening passion", "Was once arrested at a protest", "Brings jollof to every meeting", "Is never seen without a fila or gele", "Speaks Hausa, Igbo, Yoruba and Pidgin fluently", "Keeps a diary nobody is allowed to read", "Starts every speech with a proverb", "Drives an old Volvo on purpose", "Has 400,000 followers on Naija X", "Hosts a radio phone-in every Sunday", "Was a champion debater at university", "Runs marathons, and makes aides run too"];
export const pronouns = (female: boolean) => (female ? { He: "She", he: "she", his: "her", him: "her" } : { He: "He", he: "he", his: "his", him: "him" });
export const fill = (text: string, p: { female: boolean }, extra: Record<string, string> = {}) => { const P = pronouns(p.female); return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in P ? P[k as keyof typeof P] : extra[k] ?? m)); };
