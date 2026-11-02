/**
 * Faith and region in Nigerian politics. Where the president and the vice president come from, and how they pray,
 * moves votes; a same-faith ticket is controversial; a cabinet that leaves a zone out breeds talk of marginalisation;
 * and two tension meters (religious and ethnic) feed the crises Nigeria actually lives with: farmer-herder clashes,
 * blasphemy riots, separatist sit-at-home orders, the power-rotation debate. All people and events are fictional,
 * and the game treats every faith and group with equal respect: what matters is how fairly you govern.
 */
import type { Rng } from "../../game/engine/rng";
import type { FixState } from "./types";
import { STATE_BY_ID, STATES } from "../../game/data/states";
import { addMod, clamp, clamp100, pushNews } from "./util";
import { createEvent } from "./spawn";
import { earnPc } from "./meta";

export type Faith = "muslim" | "christian";
export type ZoneId = "NW" | "NE" | "NC" | "SW" | "SE" | "SS";
export const ZONE_INFO: Record<ZoneId, { name: string; people: string; states: string; muslim: number; north: boolean }> = {
  NW: { name: "North-West", people: "Hausa-Fulani heartland", states: "Kano, Kaduna, Katsina, Sokoto, Kebbi, Zamfara, Jigawa", muslim: 0.94, north: true },
  NE: { name: "North-East", people: "Kanuri, Hausa, Fulani and many smaller groups", states: "Borno, Bauchi, Adamawa, Gombe, Taraba, Yobe", muslim: 0.8, north: true },
  NC: { name: "North-Central", people: "The Middle Belt: Tiv, Nupe, Igala, Berom and dozens more", states: "Benue, Plateau, Niger, Kwara, Kogi, Nasarawa, FCT", muslim: 0.45, north: true },
  SW: { name: "South-West", people: "Yoruba land", states: "Lagos, Oyo, Ogun, Osun, Ondo, Ekiti", muslim: 0.45, north: false },
  SE: { name: "South-East", people: "Igbo land", states: "Anambra, Enugu, Imo, Abia, Ebonyi", muslim: 0.03, north: false },
  SS: { name: "South-South", people: "The Niger Delta: Ijaw, Efik, Ibibio, Urhobo, Edo and more", states: "Rivers, Delta, Bayelsa, Akwa Ibom, Cross River, Edo", muslim: 0.08, north: false },
};
export const ZONE_IDS = Object.keys(ZONE_INFO) as ZoneId[];
export const faithFor = (rng: Rng, zone: string): Faith => (rng.chance(ZONE_INFO[(zone as ZoneId)]?.muslim ?? 0.5) ? "muslim" : "christian");
export const FAITH_NAME: Record<Faith, string> = { muslim: "Muslim", christian: "Christian" };

export const myZone = (s: FixState): ZoneId => ((s.meta.homeZone as ZoneId) ?? "SW");
export const myFaith = (s: FixState): Faith => ((s.meta.faith as Faith) ?? "christian");
export const vpZone = (s: FixState) => s.staff?.vp?.zone as ZoneId | undefined;
export const vpFaith = (s: FixState) => s.staff?.vp?.faith as Faith | undefined;
export const tension = (s: FixState) => ({ rel: Number(s.flags.relTension ?? 35), eth: Number(s.flags.ethTension ?? 38) });
const setT = (s: FixState, rel: number, eth: number) => { const t = tension(s); s.flags.relTension = clamp100(t.rel + rel); s.flags.ethTension = clamp100(t.eth + eth); };
export const nudgeTension = setT;

/** how the ticket reads to the country */
export function ticket(s: FixState): { balancedRegion: boolean; sameFaith: boolean; text: string } | null {
  const z = vpZone(s), f = vpFaith(s); if (!z || !f) return null;
  const balancedRegion = ZONE_INFO[z].north !== ZONE_INFO[myZone(s)].north;
  const sameFaith = f === myFaith(s);
  const text = `${balancedRegion ? "North-South balanced" : "Both from the " + (ZONE_INFO[z].north ? "North" : "South")}, ${sameFaith ? `a ${FAITH_NAME[f]}-${FAITH_NAME[f]} ticket` : "a Muslim-Christian ticket"}`;
  return { balancedRegion, sameFaith, text };
}
/** which zones have someone at the top table (the six key posts, the chief of staff and the vice president) */
export function representation(s: FixState): Record<ZoneId, string[]> {
  const out = Object.fromEntries(ZONE_IDS.map((z) => [z, [] as string[]])) as Record<ZoneId, string[]>;
  for (const m of Object.values(s.cabinet.members)) if (m && out[m.zone as ZoneId]) out[m.zone as ZoneId].push(m.name);
  const cos = s.staff?.cos, vp = s.staff?.vp;
  if (cos?.zone && out[cos.zone as ZoneId]) out[cos.zone as ZoneId].push(cos.name);
  if (vp?.zone && out[vp.zone as ZoneId]) out[vp.zone as ZoneId].push(vp.name);
  out[myZone(s)].push(s.meta.president);
  return out;
}
export const leftOut = (s: FixState) => { const r = representation(s); return ZONE_IDS.filter((z) => r[z].length === 0); };

/** vote effect in one state: home pride, faith affinity, ticket balance */
export function identityVote(s: FixState, stateId: string): number {
  const st = STATE_BY_ID[stateId]; if (!st) return 0; const z = st.zone as ZoneId; const info = ZONE_INFO[z]; if (!info) return 0;
  const lean = myFaith(s) === "muslim" ? info.muslim - 0.5 : 0.5 - info.muslim; // -0.5..0.5
  let v = (z === myZone(s) ? 5 : 0) + lean * 5;
  const t = ticket(s);
  if (t) { if (z === vpZone(s)) v += 2.5; if (t.balancedRegion) v += 1; else if (info.north !== ZONE_INFO[myZone(s)].north) v -= 2.5; if (t.sameFaith) { const otherShare = myFaith(s) === "muslim" ? 1 - info.muslim : info.muslim; v -= otherShare * 5; } }
  if (leftOut(s).includes(z)) v -= 3;
  v -= (tension(s).rel + tension(s).eth - 80) / 40;
  return v;
}

// ------------------------------------------------------------------ events
const opt = (id: string, label: string, explain: string, tradeoff: string, win: object, lose: object, chance: (s: FixState) => number, cost = 0) => ({ id, label, explain, cost, tradeoff, unc: "medium" as const, chance, win, lose: Object.keys(lose).length ? lose : win, winText: "", loseText: "" });
const calmZone = (s: FixState, z: ZoneId, d: number) => { for (const st of STATES) if (st.zone === z && s.regions[st.id]) s.regions[st.id].unrest = clamp100(s.regions[st.id].unrest + d); };
export const ID_TEMPLATES = [
  { id: "idFarmers", kind: "insecurity" as const, urgency: 3, title: () => "Farmers and herders clash in the Middle Belt", cause: () => "Cattle strayed into a farm in Benue. By nightfall two villages were burning. Each side says the other is being protected by Abuja, and preachers on both sides are on the radio.",
    options: [
      opt("ranch", "Fund ranches and grazing reserves", "Settle cattle in ranches with water and vets; protect farmland by law.", "Costly, slow, and herders' groups resist at first.", { run: (s: FixState) => { addMod(s, "id:ranch", "Ranching programme", { foodSupply: 1, security: 1 }, { duration: null, ramp: 6 }); setT(s, -8, -8); calmZone(s, "NC", -12); return "Ranches are being built. Both farmers' and herders' leaders call it a start."; } }, { run: (s: FixState) => { setT(s, -2, -2); return "The money was announced, but little reached the ground. The clashes paused, then resumed."; } }, () => 0.62, 45),
      opt("troops", "Send troops to keep them apart", "Stop the killing first.", "Soldiers cannot stay forever.", { run: (s: FixState) => { calmZone(s, "NC", -8); setT(s, -3, -3); return "The army separated the communities. An uneasy calm returned."; } }, { run: (s: FixState) => { s.sec.humanRights = clamp100(s.sec.humanRights - 4); setT(s, 4, 4); return "Soldiers were accused of taking sides. Both communities are angrier."; } }, () => 0.55, 15),
      opt("leaders", "Bring imams, pastors and chiefs together", "A peace council of faith and traditional leaders.", "Talk is cheap if nothing follows.", { run: (s: FixState) => { setT(s, -10, -6); s.gov.trust = clamp100(s.gov.trust + 1.5); return "Imams and pastors walked through both villages hand in hand. The photographs went everywhere."; } }, { run: (s: FixState) => { setT(s, 2, 2); return "Hardliners boycotted the council. It made headlines and little else."; } }, () => 0.5),
    ], expire: { run: (s: FixState) => { setT(s, 8, 8); calmZone(s, "NC", 10); return "Nobody acted. Reprisals spread to three more villages."; } }, expireText: () => "Nobody acted." },
  { id: "idBlasphemy", kind: "protest" as const, urgency: 3, title: () => "A mob over a blasphemy accusation", cause: () => "A student is accused of insulting religion in a WhatsApp group. A crowd has surrounded the police station where she is held. The world is watching what you do.",
    options: [
      opt("protect", "Protect her and arrest the ringleaders", "The law, not the mob.", "Some clerics will call you an enemy of faith.", { run: (s: FixState) => { s.rule.judiciary = clamp100(s.rule.judiciary + 2); s.rule.intlPressure = clamp100(s.rule.intlPressure - 2); setT(s, 3, 0); s.gov.trust = clamp100(s.gov.trust + 1.5); return "Police held the line. Respected scholars on both sides backed the rule of law."; } }, { run: (s: FixState) => { setT(s, 6, 0); return "Riots broke out in two cities before order returned."; } }, () => 0.6),
      opt("clerics", "Ask senior clerics to calm the crowd", "Let respected voices lead.", "Slow, and the crowd may not wait.", { run: (s: FixState) => { setT(s, -6, 0); return "A respected emir spoke to the crowd himself. It dispersed peacefully."; } }, { run: (s: FixState) => { setT(s, 4, 0); s.rule.intlPressure = clamp100(s.rule.intlPressure + 3); return "The crowd ignored the appeal. The story went around the world."; } }, () => 0.55),
      opt("silent", "Stay silent; it is a state matter", "Do not touch religion.", "Silence is a choice too.", { run: () => "The state handled it. Many felt the president had abandoned the victim." }, { run: (s: FixState) => { setT(s, 8, 0); s.rule.intlPressure = clamp100(s.rule.intlPressure + 4); s.gov.trust = clamp100(s.gov.trust - 2); return "The mob broke in. The country is ashamed, and so is its president."; } }, () => 0.35),
    ], expire: { run: (s: FixState) => { setT(s, 8, 0); s.rule.intlPressure = clamp100(s.rule.intlPressure + 4); return "You said nothing. It ended badly."; } }, expireText: () => "You said nothing." },
  { id: "idSitAtHome", kind: "protest" as const, urgency: 3, title: () => "Separatists order a 'sit-at-home' in the South-East", cause: () => "A separatist movement has ordered markets and schools in the South-East shut every Monday. Traders are losing fortunes, young men say the region is marginalised, and gunmen enforce the order.",
    options: [
      opt("develop", "Dialogue plus a big South-East development push", "Ports, roads and a seat at the table.", "Costly; hardliners will still call it a trick.", { run: (s: FixState) => { addMod(s, "id:se", "South-East development push", { roads: 1, sme: 1 }, { duration: 24, ramp: 3 }); setT(s, 0, -10); calmZone(s, "SE", -15); return "Markets reopened. A new seaport and a federal road deal changed the conversation."; } }, { run: (s: FixState) => { setT(s, 0, -2); return "The money came, but the sit-at-home continued on and off."; } }, () => 0.6, 60),
      opt("crackdown", "Crack down on the enforcers", "Arrest gunmen, protect traders.", "Heavy-handed operations create martyrs.", { run: (s: FixState) => { calmZone(s, "SE", -6); setT(s, 0, 2); return "The gunmen were pushed back. Markets reopened, under guard."; } }, { run: (s: FixState) => { s.sec.humanRights = clamp100(s.sec.humanRights - 6); setT(s, 0, 10); calmZone(s, "SE", 10); return "A raid killed civilians. The movement's support grew overnight."; } }, () => 0.45),
      opt("release", "Release detained activists as a peace gesture", "Lower the temperature.", "Others will say you rewarded violence.", { run: (s: FixState) => { setT(s, 0, -8); s.rule.eliteLoyalty = clamp100(s.rule.eliteLoyalty - 2); return "The releases calmed the streets. Some northern papers called it weakness."; } }, { run: (s: FixState) => { setT(s, 0, 3); return "The releases were celebrated, and the sit-at-home continued anyway."; } }, () => 0.5),
    ], expire: { run: (s: FixState) => { setT(s, 0, 8); calmZone(s, "SE", 10); return "Mondays stayed empty. The region's economy bled."; } }, expireText: () => "Nothing changed." },
  { id: "idLopsided", kind: "scandal" as const, urgency: 2, title: (s: FixState) => `"Where is our share?" ${leftOut(s).map((z) => ZONE_INFO[z].name).join(" and ") || "a zone"} feels left out`, cause: (s: FixState) => `Newspapers have counted your top appointments. ${leftOut(s).map((z) => ZONE_INFO[z].name).join(" and ")} has nobody at the top table. Elders are talking about marginalisation, and the constitution's "federal character" rule is being quoted at you.`,
    options: [
      opt("appoint", "Promise a senior post to the zone", "Fix it at the next reshuffle.", "Someone else loses out.", { run: (s: FixState) => { setT(s, 0, -6); for (const z of leftOut(s)) calmZone(s, z, -8); s.flags.zonePromise = s.month; return "The elders accepted your word. They will be counting."; } }, {}, () => 1),
      opt("merit", "Defend merit: the best people, wherever they come from", "Competence first.", "True, but it sounds like an excuse to the left-out.", { run: (s: FixState) => { setT(s, 0, 3); for (const z of leftOut(s)) calmZone(s, z, 5); return "Technocrats applauded. The left-out zone did not."; } }, {}, () => 1),
    ], expire: { run: (s: FixState) => { setT(s, 0, 5); return "You ignored it. It became an election issue."; } }, expireText: () => "Ignored." },
  { id: "idZoning", kind: "story" as const, urgency: 2, title: () => "Party elders: 'power must rotate'", cause: (s: FixState) => `With the next election coming, elders say it is ${ZONE_INFO[myZone(s)].north ? "the South's" : "the North's"} turn after you. Some want you to promise to step aside after this term; others want you to back a successor from ${ZONE_INFO[myZone(s)].north ? "the South" : "the North"}.`,
    options: [
      opt("honour", "Honour rotation: back a successor from the other half", "Keep the unwritten deal.", "Your own region is unhappy.", { run: (s: FixState) => { setT(s, 0, -10); calmZone(s, myZone(s), 4); earnPc(s, 3); return "The country exhaled. Your home region grumbled but understood."; } }, {}, () => 1),
      opt("open", "Say the best candidate should win, from anywhere", "Democracy, not arithmetic.", "The other half hears 'we are keeping it'.", { run: (s: FixState) => { setT(s, 0, 6); return "Constitutionally correct. Politically explosive."; } }, {}, () => 1),
    ], expire: { run: (s: FixState) => { setT(s, 0, 4); return "You avoided the question. That was an answer too."; } }, expireText: () => "Avoided." },
  { id: "idInterfaith", kind: "opportunity" as const, urgency: 1, title: () => "An interfaith festival in Jos", cause: () => "Christian and Muslim youth groups want to hold a joint festival in Jos, a city scarred by past clashes. They ask the president to come.",
    options: [
      opt("go", "Go, and dance with both", "Show up in person.", "Security is a worry.", { run: (s: FixState) => { setT(s, -10, -5); s.gov.approval = clamp(s.gov.approval + 2, 0, 100); return "Your photo eating suya with an imam and a bishop became the image of the year."; } }, {}, () => 1, 3),
      opt("fund", "Fund it, but stay away", "Support without the risk.", "Less powerful.", { run: (s: FixState) => { setT(s, -4, -2); return "The festival was a success. Many wished you had come."; } }, {}, () => 1, 3),
    ], expire: { run: () => "The festival happened without you." }, expireText: () => "It happened without you." },
];

// ------------------------------------------------------------------ the month
export function identityMonthly(s: FixState, rng: Rng) {
  if (!s.staff?.picked) return;
  const t = tension(s), tk = ticket(s), out = leftOut(s);
  let dr = (s.sec.index - 50) / 120 + (s.jobs.youth - 30) / 150 + (tk?.sameFaith ? 0.35 : 0) - 0.25;
  let de = out.length * 0.35 + (s.jobs.youth - 30) / 150 + (s.eco.foodInflation - 20) / 200 - 0.25 + (tk && !tk.balancedRegion ? 0.25 : 0);
  if (t.rel > 70) dr -= 0.2; if (t.eth > 70) de -= 0.2; // things boil over, then cool
  setT(s, dr, de);
  const nt = tension(s);
  // tension shows up in the regions and in the mood
  if (nt.rel > 60) calmZone(s, "NC", 0.6);
  if (nt.eth > 60) { calmZone(s, "SE", 0.5); for (const z of out) calmZone(s, z, 0.5); }
  s.gov.trust = clamp100(s.gov.trust - Math.max(0, (nt.rel + nt.eth - 120) / 400));
  // the controversies, when they first happen
  if (tk && !s.flags.ticketNews) { s.flags.ticketNews = 1; pushNews(s, { source: "ticket", headline: tk.sameFaith ? `Same-faith ticket sparks debate` : "A balanced ticket, say commentators", body: tk.text + (tk.sameFaith ? ". Religious leaders on the other side say they feel shut out." : ". Elders from both halves of the country approve."), tone: tk.sameFaith ? "bad" : "good" }); if (tk.sameFaith) setT(s, 8, 0); }
  // crises
  const open = (id: string) => s.events.some((e) => e.tpl === id && e.status === "open");
  const gap = (id: string, m: number) => s.month - Number(s.flags[`idAt:${id}`] ?? -99) >= m;
  const go = (id: string, st: string) => { s.flags[`idAt:${id}`] = s.month; createEvent(s, id, st); };
  if (!open("idFarmers") && gap("idFarmers", 10) && rng.chance(0.03 + nt.rel / 900 + Math.max(0, s.sec.index - 50) / 600)) go("idFarmers", "NG-BE");
  if (!open("idBlasphemy") && gap("idBlasphemy", 16) && rng.chance(0.012 + Math.max(0, nt.rel - 45) / 800)) go("idBlasphemy", "NG-SO");
  if (!open("idSitAtHome") && gap("idSitAtHome", 12) && rng.chance(0.015 + Math.max(0, nt.eth - 40) / 500 + (out.includes("SE") ? 0.03 : 0))) go("idSitAtHome", "NG-AN");
  if (out.length && !open("idLopsided") && gap("idLopsided", 12) && s.month >= 3 && rng.chance(0.25)) go("idLopsided", "NG-FC");
  if (!open("idZoning") && gap("idZoning", 40) && s.month - s.termStart >= 30 && s.term >= 1 && rng.chance(0.15)) go("idZoning", "NG-FC");
  if (!open("idInterfaith") && gap("idInterfaith", 14) && s.month >= 6 && rng.chance(0.05)) go("idInterfaith", "NG-PL");
}
