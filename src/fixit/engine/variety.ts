/** Variety: the same crisis should not read the same twice, and repeats should escalate instead of just recurring. Leaf module. */
import { subRng } from "../../game/engine/rng";
import type { FixState } from "./types";

const OPENERS: Record<string, ((st: string) => string)[]> = {
  foodProtest: [(st) => `Market women in ${st} have shut their stalls.`, (st) => `A video from ${st} of empty rice sacks and angry shoppers is all over Naija X.`, (st) => `Traders are chanting outside the council office in ${st}.`],
  fuelProtest: [(st) => `Queues snake round the filling stations in ${st}.`, (st) => `Okada riders in ${st} have parked their bikes in protest.`, (st) => `Drivers in ${st} are selling petrol by the bottle at black-market prices.`],
  labourStrike: [() => "The union boss says the strike notice is already printed.", () => "Offices go quiet as workers stay at home.", () => "Banners are out and the megaphones are charged."],
  youthProtest: [(st) => `Graduates in ${st} have taken their CVs to the streets.`, (st) => `A hashtag started in ${st} has gone national.`, (st) => `Young people in ${st} are camped outside the secretariat.`],
  banditry: [(st) => `Villagers in ${st} fled overnight as gunmen rode in on motorbikes.`, (st) => `A farming community in ${st} woke up to gunfire.`, (st) => `Travellers on the ${st} road were abducted at dawn.`],
  pipelineAttack: [() => "Flames light up the creeks before dawn.", () => "Engineers report a fresh cut on the main trunk line.", () => "Militants send a message by text: \"We are back.\""],
  flood: [(st) => `Rivers have burst their banks around ${st}.`, (st) => `Families in ${st} are wading out with mattresses on their heads.`, (st) => `A dam release upstream has caught ${st} off guard.`],
  foodCrisis: [() => "Warehouses are empty and prices rise by the day.", () => "Mothers are counting every cup of garri.", () => "The price of a basket of food has doubled in two years, the radio says."],
  gridCollapse: [() => "The whole country goes dark at once.", () => "NEPA has taken the light again, and nobody can say when it returns.", () => "The grid collapses for the second time in a week."],
  ministerScandal: [() => "A whistleblower has leaked documents to the press.", () => "A bank statement is trending, and it is not good.", () => "The auditors have found a gap nobody can explain."],
};
const REPEAT = ["", "This is the second time this year.", "The third time this year, and patience is gone.", "It keeps happening, and people say you do not learn."];

export interface Flavour { intro: string; rep: number; line: string }
export function flavour(s: FixState, tpl: string, st: string): Flavour {
  const rep = s.events.filter((e) => e.tpl === tpl && e.born >= s.month - 12 && e.born < s.month).length;
  const list = OPENERS[tpl];
  const rng = subRng(s.meta.seed, "variant", tpl, s.month);
  // never repeat the opener used last time
  const lastIdx = Number(s.flags[`opener:${tpl}`] ?? -1);
  let idx = list ? rng.int(0, list.length - 1) : 0;
  if (list && list.length > 1 && idx === lastIdx) idx = (idx + 1) % list.length;
  if (list) s.flags[`opener:${tpl}`] = idx;
  return { intro: list ? list[idx](st) : "", rep, line: REPEAT[Math.min(3, rep)] };
}
