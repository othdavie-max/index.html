/**
 * The inner circle acts. Mama Nkechi marches, the general rattles his sabre, the godfather calls in a favour, the
 * journalist publishes, the VP builds a camp, a governor plots. How they feel (see meta.cast) decides what they do, how
 * you answer is remembered (favour and grudge), and repeats escalate. Late-bound to events through spawn.ts.
 */
import type { Rng } from "../../game/engine/rng";
import type { FixState } from "./types";
import { cast } from "./meta";
import { createEvent } from "./spawn";
import { act } from "./act";
import { clamp, clamp100, nb } from "./util";

const FACE_IDS = ["mama", "general", "godfather", "journo", "vp", "governor"] as const;
type FaceId = (typeof FACE_IDS)[number];
export const favour = (s: FixState, id: string) => Number(s.flags[`fav:${id}`] ?? 0);
export const addFavour = (s: FixState, id: string, d: number) => { s.flags[`fav:${id}`] = clamp(favour(s, id) + d, -45, 45); };
const times = (s: FixState, id: string) => Number(s.flags[`arcN:${id}`] ?? 0);
const faceOf = (s: FixState, id: string) => cast(s).find((f) => f.id === id);
const nm = (s: FixState, id: string) => faceOf(s, id)?.name ?? "Someone close to you";
const again = (s: FixState, id: string) => (times(s, id) >= 2 ? " This is not the first time, and patience is running out." : times(s, id) === 1 ? " She has been here before." : "");
const arcOf = (s: FixState): FaceId => (s.flags.arcPending as FaceId) ?? "mama";
const eventArc = (s: FixState, e: { id: string }): FaceId => (s.flags[`ev:${e.id}:arc`] as FaceId) ?? arcOf(s);

interface Rule { face: FaceId; tpl: string; when: (s: FixState, mood: number) => number }
/** the chance each month that this face does something, from how they feel about you */
const RULES: Rule[] = [
  { face: "mama", tpl: "arcMamaMarch", when: (s, m) => (m < 38 ? 0.2 : 0) },
  { face: "mama", tpl: "arcMamaBoon", when: (s, m) => (m >= 72 ? 0.07 : 0) },
  { face: "general", tpl: "arcGeneralRestless", when: (s, m) => (m < 40 ? 0.18 : 0) },
  { face: "general", tpl: "arcGeneralOffer", when: (s, m) => (m >= 70 && s.sec.index > 50 ? 0.08 : 0) },
  { face: "godfather", tpl: "arcGodfatherFavour", when: (s, m) => (m >= 40 ? 0.07 : 0.14) },
  { face: "journo", tpl: "arcJournoStory", when: (s, m) => (s.me.evidence > 15 || s.me.scandals > 0 || m < 35 ? 0.16 : 0.03) },
  { face: "vp", tpl: "arcVpCamp", when: (s) => (s.staff.vp && s.party.vpAmbition > 45 ? 0.12 : 0) },
  { face: "governor", tpl: "arcGovernorBloc", when: (s, m) => (m < 42 ? 0.16 : 0) },
];

export function castArcsMonthly(s: FixState, rng: Rng) {
  // favour and grudge fade slowly
  for (const id of FACE_IDS) { const f = favour(s, id); if (f) s.flags[`fav:${id}`] = Math.abs(f) < 0.5 ? 0 : f * 0.97; }
  if (s.month < 4 || s.events.some((e) => e.tpl.startsWith("arc") && e.status === "open")) return;
  const faces = cast(s);
  for (const r of rng.shuffle([...RULES])) {
    const f = faces.find((x) => x.id === r.face);
    if (!f) continue;
    if (s.month - Number(s.flags[`arcLast:${r.face}`] ?? -99) < 6) continue;
    const p = r.when(s, f.mood);
    if (p <= 0 || !rng.chance(p)) continue;
    s.flags.arcPending = r.face; s.flags[`arcLast:${r.face}`] = s.month;
    const ev = createEvent(s, r.tpl, "NG-FC");
    if (ev) { s.flags[`ev:${ev.id}:arc`] = r.face; s.flags[`arcN:${r.face}`] = times(s, r.face) + 1; }
    return;
  }
}

const base = (id: string, label: string, explain: string, tradeoff: string, win: object, lose: object, chance: number | ((s: FixState) => number), winText: string, loseText: string, cost = 0) => ({
  id, label, explain, cost, tradeoff, unc: "medium" as const, chance: typeof chance === "number" ? () => chance : chance, win, lose, winText, loseText,
});

export const ARC_TEMPLATES = [
  // ---------------------------------------------------------------- Mama Nkechi
  {
    id: "arcMamaMarch", kind: "protest" as const, urgency: 2,
    title: (s: FixState) => `${nm(s, "mama")} and the market women threaten to march`,
    cause: (s: FixState) => `Petrol is ₦${Math.round(s.fuel.pump)} and her stall sells half of what it did. "Oga, we voted for you. We will block the road at Balogun on Monday."${again(s, "mama")}`,
    options: [
      base("meet", "Visit the market and listen", "Walk the stalls with her, in person.", "Costs your time, and she will hold you to what you say.", { groups: { traders: 5 }, trust: 1.5, run: (s: FixState) => { addFavour(s, "mama", 14); return "You ate akara at her stall and promised to look at prices. The march was called off."; } }, { groups: { traders: -2 }, run: (s: FixState) => { addFavour(s, "mama", -4); return "The visit looked staged. She smiled for the cameras and marched anyway."; } }, (s) => 0.45 + 0.4 * s.gov.trust / 100, "", "", 3),
      base("relief", "Market stall grants and cheaper transport", "Cash for traders and a fares scheme.", "Costs money, and it ends when the money does.", { groups: { traders: 4 }, mods: { happiness: 1.5, foodPrice: -1 }, dur: 4, run: (s: FixState) => { addFavour(s, "mama", 10); return "The grants reached the stalls. The women sent a thank-you song to the radio."; } }, { groups: { traders: -1 }, corruption: 1, run: (s: FixState) => { addFavour(s, "mama", -2); return "Half of it was eaten by officials on the way. Mama Nkechi says so on the radio."; } }, (s) => 0.5 + 0.35 * s.gov.capacity / 100, "", "", 80),
      base("police", "Send police to keep the road open", "Keep order, stop the blockade.", "Beating women traders is a disaster on camera.", { unrest: -6, run: (s: FixState) => { addFavour(s, "mama", -16); return "The road stayed open. The market women have not forgiven you."; } }, { unrest: 10, trust: -4, anger: 8, run: (s: FixState) => { addFavour(s, "mama", -25); return "Police tear-gassed women traders. The photo is on every front page."; } }, 0.4, "", ""),
    ],
    expire: { groups: { traders: -6 }, unrest: 12, trust: -2, anger: 6, run: (s: FixState) => { addFavour(s, "mama", -18); return "Nobody came. The women blocked the road for three days and the world watched."; } }, expireText: () => "You did not answer, and the market women blocked the road for days.",
  },
  {
    id: "arcMamaBoon", kind: "opportunity" as const, urgency: 3,
    title: (s: FixState) => `${nm(s, "mama")} wants to thank you in front of ten thousand women`,
    cause: () => "The market women's association is holding a rally and asking you to come. They have been telling every customer you are 'our own'.",
    options: [
      base("go", "Attend and speak", "Turn up in aso-ebi and eat with them.", "They will remember your promises.", { groups: { traders: 6, faith: 1 }, trust: 2, run: (s: FixState) => { addFavour(s, "mama", 12); s.campaign.mobilise += 0.6; return "Ten thousand women sang your name. Word spreads from every market."; } }, { groups: { traders: 2 } }, 0.85, "", ""),
      base("skip", "Send your best regards", "You are busy.", "She will notice.", { run: (s: FixState) => { addFavour(s, "mama", -6); return "A polite letter was read out. The mood dipped."; } }, {}, 1, "", ""),
    ],
    expire: {}, expireText: () => "The rally went ahead without you.",
  },
  // ---------------------------------------------------------------- the General
  {
    id: "arcGeneralRestless", kind: "story" as const, urgency: 2,
    title: (s: FixState) => `${nm(s, "general")} warns that the barracks are restless`,
    cause: (s: FixState) => `Pay is late, equipment is old, and the officers' mess talks politics. "Sir, I can hold them for now. I would like not to have to."${s.rule.coupRisk > 35 ? " Coup risk is already high." : ""}${again(s, "general")}`,
    options: [
      base("pay", "Pay arrears and approve new equipment", "Settle with the army properly.", "Expensive, and it sets a precedent.", { coup: -10, run: (s: FixState) => { addFavour(s, "general", 16); return "The arrears were cleared. The officers' mess went quiet."; } }, { coup: -4, run: (s: FixState) => { addFavour(s, "general", 6); return "Some of it reached the boys. The rest vanished into contracts."; } }, 0.8, "", "", 90),
      base("talk", "Dine with the generals and promise reforms", "Charm, a handshake and a vague promise.", "Promises are remembered.", { coup: -5, run: (s: FixState) => { addFavour(s, "general", 6); s.flags.armyPromise = s.month; return "The generals went home content. They will check you kept your word."; } }, { coup: 4, run: (s: FixState) => { addFavour(s, "general", -6); return "They smelled empty words. Whispers started."; } }, (s) => 0.4 + 0.4 * s.gov.trust / 100, "", ""),
      base("replace", "Quietly replace the Chief of Defence Staff", "Put in someone loyal.", "A purge can trigger what it was meant to prevent.", { coup: -6, anger: 1, run: (s: FixState) => { addFavour(s, "general", -30); s.groupMood.military = clamp(s.groupMood.military - 6, -40, 40); return "A new man took over. The old general left, saying nothing, which is worse."; } }, { coup: 12, elite: -4, run: (s: FixState) => { addFavour(s, "general", -40); return "The sacked general met other officers that night."; } }, 0.5, "", ""),
    ],
    expire: { coup: 7, run: (s: FixState) => { addFavour(s, "general", -14); return "He said nothing. The barracks took that as an answer."; } }, expireText: () => "You ignored him, and the barracks noticed.",
  },
  {
    id: "arcGeneralOffer", kind: "opportunity" as const, urgency: 3,
    title: (s: FixState) => `${nm(s, "general")} offers to handle the worst hotspot himself`,
    cause: () => "A battalion could be moved to the worst-hit area for a few months, quietly, with no new money. He asks only that you keep the politicians out of it.",
    options: [
      base("yes", "Give him the mission", "Trust the army with it.", "A general who succeeds becomes more powerful.", { mods: { security: 3 }, dur: 6, run: (s: FixState) => { addFavour(s, "general", 8); s.rule.coupRisk = clamp100(s.rule.coupRisk + 1.5); return "Calm returned to the hotspot. The general's name is on every lip."; } }, { mods: { security: 1 }, trust: -1, run: (s: FixState) => { addFavour(s, "general", 2); return "Results were thin, and the army was blamed for abuses."; } }, (s) => 0.55 + 0.25 * (s.mil.strength / 100), "", ""),
      base("no", "Thank him but keep control", "Stay in charge.", "He will feel he is not trusted.", { run: (s: FixState) => { addFavour(s, "general", -4); return "He nodded and left. Said nothing."; } }, {}, 1, "", ""),
    ],
    expire: {}, expireText: () => "He did not wait.",
  },
  // ---------------------------------------------------------------- the godfather
  {
    id: "arcGodfatherFavour", kind: "request" as const, urgency: 3,
    title: (s: FixState) => `${nm(s, "godfather")} calls in a favour`,
    cause: (s: FixState) => `"My boy, you remember who put you there. A company of mine wants a small road contract, worth ${nb(60)}. Nothing illegal. Just friendly."${again(s, "godfather")}`,
    options: [
      base("give", "Give him the contract", "Keep him happy.", "A paper trail, and the next favour is bigger.", { corruption: 0.8, evidence: 4, run: (s: FixState) => { addFavour(s, "godfather", 18); const b = s.backers[0]; if (b) b.mood = clamp100(b.mood + 8); s.me.wealth += 6; return "He called you 'my son' at the party meeting. The files grew by one page."; } }, { evidence: 8, scandal: 1, trust: -3, run: (s: FixState) => { addFavour(s, "godfather", 6); return "The contract leaked. The newspapers did the arithmetic."; } }, 0.8, "", ""),
      base("bid", "Tell him to bid like everyone else", "Open competition.", "He may bid and win, or he may sulk.", { trust: 1.5, run: (s: FixState) => { addFavour(s, "godfather", -6); return "He bid, lost, and was gracious about it in public. In private, less so."; } }, { trust: 1, run: (s: FixState) => { addFavour(s, "godfather", -14); return "He took the refusal personally. His allies in the Assembly heard about it."; } }, 0.55, "", ""),
      base("refuse", "Refuse flatly", "Public office is not private business.", "He made you. He can unmake you.", { trust: 3, corruption: -0.3, run: (s: FixState) => { addFavour(s, "godfather", -22); return "The refusal reached the papers. Nigerians cheered. The godfather did not."; } }, { trust: 3, run: (s: FixState) => { addFavour(s, "godfather", -30); s.assembly.support = clamp100(s.assembly.support - 4); return "He is telling senators that you have forgotten the road that brought you."; } }, 0.6, "", ""),
    ],
    expire: { run: (s: FixState) => { addFavour(s, "godfather", -10); return "You did not reply. He reads silence as insult."; } }, expireText: () => "You did not reply, and he noticed.",
  },
  // ---------------------------------------------------------------- the journalist
  {
    id: "arcJournoStory", kind: "scandal" as const, urgency: 2,
    title: (s: FixState) => `${nm(s, "journo")} is publishing a story about you and wants a comment`,
    cause: (s: FixState) => `${s.me.evidence > 25 ? "She has contracts and bank records." : s.rule.executions > 0 ? "She has been asking about the executions." : "She has been talking to your ministers."} "You have until Friday, Sir. I would rather hear your side."${again(s, "journo")}`,
    options: [
      base("open", "Give an honest interview", "Answer everything and hand over what you can.", "If there is something to find, she will find it.", { trust: 2.5, evidence: -3, run: (s: FixState) => { addFavour(s, "journo", 16); return "The piece ran as 'The President who answered'. Even your critics were fair."; } }, { trust: -2, evidence: 6, run: (s: FixState) => { addFavour(s, "journo", 8); return "You answered honestly, and the honest answers hurt."; } }, (s) => 0.8 - 0.45 * (s.me.evidence / 100), "", ""),
      base("spin", "Send your spokesman with a statement", "Say as little as you can.", "She will write it anyway.", { run: (s: FixState) => { addFavour(s, "journo", -8); return "The statement ran in the last paragraph. The story ran in the first."; } }, { trust: -2.5, evidence: 4, run: (s: FixState) => { addFavour(s, "journo", -12); return "'The President declined to comment' became the headline."; } }, 0.5, "", ""),
      base("squeeze", "Have her editor 'reminded' about advertising", "Lean on the paper.", "If it leaks, it is a press freedom scandal.", { press: -6, run: (s: FixState) => { addFavour(s, "journo", -25); act(s, "squeezePress", { democracy: -3, press: -6, intl: 2 }); return "The story was shelved. She posted a thread about why. It spread faster."; } }, { press: -8, scandal: 1, trust: -4, intl: 4, run: (s: FixState) => { addFavour(s, "journo", -35); return "The phone call to her editor was recorded and published."; } }, 0.45, "", ""),
    ],
    expire: { trust: -2, evidence: 3, run: (s: FixState) => { addFavour(s, "journo", -10); return "You ignored the deadline. The story ran with 'could not be reached'."; } }, expireText: () => "You ignored her deadline.",
  },
  // ---------------------------------------------------------------- the Vice President
  {
    id: "arcVpCamp", kind: "story" as const, urgency: 3,
    title: (s: FixState) => `${nm(s, "vp")} is quietly building his own camp`,
    cause: (s: FixState) => `Three governors and two senators have been seen at his house. Aides say he is 'just being a good Vice President'. Everyone in the party knows what it looks like. ${s.party.vpAmbition > 65 ? "His ambition is plain." : ""}${again(s, "vp")}`,
    options: [
      base("role", "Give him a real job to run", "A big portfolio, with a real result to deliver.", "It makes him stronger if he succeeds.", { run: (s: FixState) => { s.party.vpAmbition = clamp100(s.party.vpAmbition - 15); addFavour(s, "vp", 14); return "He threw himself into the work. For now the camp has no time to meet."; } }, { run: (s: FixState) => { s.party.vpAmbition = clamp100(s.party.vpAmbition - 4); addFavour(s, "vp", 4); return "He took the job and kept the camp too."; } }, 0.6, "", ""),
      base("talk", "Have it out with him, privately", "Look him in the eye.", "If he is lying, he knows you know.", { run: (s: FixState) => { s.party.vpAmbition = clamp100(s.party.vpAmbition - 8); addFavour(s, "vp", 4); return "He swore loyalty on his mother's name. You half believe him."; } }, { run: (s: FixState) => { s.party.vpAmbition = clamp100(s.party.vpAmbition + 6); addFavour(s, "vp", -8); return "He denied everything and left angrier than he came."; } }, (s) => 0.4 + 0.3 * (s.staff.vp?.loyalty ?? 50) / 100, "", ""),
      base("sideline", "Cut him out of every meeting", "Show him his place.", "A sidelined deputy is a dangerous deputy.", { run: (s: FixState) => { s.party.vpAmbition = clamp100(s.party.vpAmbition + 10); addFavour(s, "vp", -20); return "He accepted it in silence, which is not the same as agreeing."; } }, { run: (s: FixState) => { s.party.vpAmbition = clamp100(s.party.vpAmbition + 18); addFavour(s, "vp", -30); s.party.oldguard = clamp100(s.party.oldguard - 6); return "He went to the old guard. Dinner invitations were sent."; } }, 0.45, "", ""),
    ],
    expire: { run: (s: FixState) => { s.party.vpAmbition = clamp100(s.party.vpAmbition + 6); addFavour(s, "vp", -8); return "You did nothing. The camp grew."; } }, expireText: () => "You did nothing, and the camp grew.",
  },
  // ---------------------------------------------------------------- a governor
  {
    id: "arcGovernorBloc", kind: "request" as const, urgency: 3,
    title: (s: FixState) => `${nm(s, "governor")} is forming a bloc of governors`,
    cause: (s: FixState) => `"Abuja has forgotten the states. A few of us are meeting to agree what we will ask for, and what we will withhold at the next vote."${again(s, "governor")}`,
    options: [
      base("fund", "Release overdue federal money to his state", "Buy peace, pay what was promised.", "The others will ask for the same.", { governors: 3, run: (s: FixState) => { addFavour(s, "governor", 14); return "The money moved. The bloc meeting was called off 'for scheduling reasons'."; } }, { governors: 1, run: (s: FixState) => { addFavour(s, "governor", 4); return "It was less than he hoped. The bloc stayed alive."; } }, 0.8, "", "", 100),
      base("meet", "Host all the governors at the villa", "Open talks with everyone.", "You will be asked for things.", { governors: 4, assembly: 2, run: (s: FixState) => { addFavour(s, "governor", 8); return "The governors went home with a communique and a plan."; } }, { governors: -1, run: (s: FixState) => { addFavour(s, "governor", -2); return "The dinner ended in a row about money."; } }, 0.6, "", "", 10),
      base("divide", "Divide them: favour some, snub the others", "Old politics.", "It works until it does not.", { governors: -2, assembly: 1, run: (s: FixState) => { addFavour(s, "governor", -16); return "Three governors broke from the bloc. One of them will remember."; } }, { governors: -4, assembly: -3, elite: -3, run: (s: FixState) => { addFavour(s, "governor", -22); return "The plan leaked. The bloc got stronger."; } }, 0.55, "", ""),
    ],
    expire: { governors: -3, assembly: -3, run: (s: FixState) => { addFavour(s, "governor", -12); return "You did not respond. The bloc met without you."; } }, expireText: () => "You did not respond.",
  },
];
void eventArc;
