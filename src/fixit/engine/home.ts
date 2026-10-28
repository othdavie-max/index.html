/**
 * The first family. A spouse with opinions, children who make headlines, a secret illness the villa may try to hide,
 * and money that may or may not stay hidden abroad. All people are fictional.
 */
import type { Rng } from "../../game/engine/rng";
import type { FixState } from "./types";
import { clamp100, pushNews } from "./util";
import { createEvent } from "./spawn";

export function homeMonthly(s: FixState, rng: Rng) {
  const H = s.home;
  const open = (t: string) => s.events.some((e) => e.tpl === t && e.status === "open");
  const gap = (k: string, m: number) => s.month - Number(s.flags[`lastHome:${k}`] ?? -99) >= m;
  const mk = (k: string) => { s.flags[`lastHome:${k}`] = s.month; createEvent(s, k, "NG-FC"); };
  // health drifts with stress
  const stress = (s.rule.streetAnger + s.rule.coupRisk) / 200;
  H.health = clamp100(H.health - 0.04 - 0.12 * stress + (H.illness && !H.illness.hidden ? 0.15 : 0));
  if (!H.illness && s.month >= 18 && H.health < 82 && !open("illness") && rng.chance(0.012 + (82 - H.health) * 0.0015)) { H.illness = { since: s.month, hidden: false, acting: false }; mk("illness"); }
  if (H.illness?.hidden) {
    if (rng.chance(0.08)) { pushNews(s, { source: `rumour:${s.month}`, headline: "Where is the president? Rumours swirl about his health", body: "Aides say he is 'working from home'. Opposition leaders demand proof of life.", tone: "bad" }); s.gov.trust = clamp100(s.gov.trust - 2); s.rule.streetAnger = clamp100(s.rule.streetAnger + 2); }
    if (s.month - H.illness.since >= 8 && !open("collapse")) { H.illness.hidden = false; mk("collapse"); }
  }
  if (typeof s.flags.actingUntil === "number" && s.month >= (s.flags.actingUntil as number)) {
    delete s.flags.actingUntil; if (H.illness) H.illness.acting = false;
    if (s.party.vpAmbition >= 60 && s.staff.vp && !open("vpKeeps") && rng.chance(0.55)) mk("vpKeeps");
  }
  if (!open("childScandal") && gap("childScandal", 20) && s.month >= 8 && rng.chance(0.025)) mk("childScandal");
  if (!open("spouseSays") && gap("spouseSays", 9) && s.month >= 5 && rng.chance(0.07)) mk("spouseSays");
  if (!open("moveMoney") && H.abroad === 0 && s.me.wealth >= 250 && gap("moveMoney", 30) && rng.chance(0.05)) mk("moveMoney");
  if (H.abroad > 0 && !open("accountLeak") && gap("accountLeak", 18) && rng.chance(0.004 + H.abroad / 60000)) mk("accountLeak");
}

export const HOME_TEMPLATES = [
  {
    id: "illness", kind: "story" as const, urgency: 1,
    title: () => "The president is seriously ill",
    cause: (s: FixState) => `Doctors in the villa clinic say it is serious: ${s.home.health < 60 ? "you need long treatment" : "you need rest and tests"}. ${s.staff.vp ? `${s.staff.vp.name}, the VP, is waiting in the corridor, with a hopeful face.` : ""} Everyone is asking the same question: who runs the country?`,
    options: [
      { id: "disclose", label: "Tell the nation honestly", explain: "Share a statement and rest.", cost: 0, tradeoff: "Rivals get ideas.", unc: "low" as const, chance: () => 0.95, win: { trust: 2.5, run: (s: FixState) => { if (s.home.illness) s.home.illness.hidden = false; s.home.health = clamp100(s.home.health + 6); s.party.vpAmbition += 12; return "Nigerians were moved by your honesty. Well-wishers flooded the villa gates. The VP looks very concerned."; } }, lose: {}, winText: "", loseText: "" },
      { id: "hide", label: "Hide it: 'the president is working from home'", explain: "Stay in control.", cost: 0, tradeoff: "It will leak, and the longer you hide, the worse the leak.", unc: "high" as const, chance: () => 0.95, win: { run: (s: FixState) => { if (s.home.illness) s.home.illness.hidden = true; return "The statement said you were 'working from home'. The villa is very quiet."; } }, lose: {}, winText: "", loseText: "" },
      { id: "acting", label: "Hand power to the VP for three months", explain: "Take proper treatment, abroad if needed.", cost: 20, tradeoff: "He may not give it back.", unc: "high" as const, chance: () => 0.95, win: { assembly: 4, run: (s: FixState) => { s.flags.actingUntil = s.month + 3; if (s.home.illness) { s.home.illness.acting = true; s.home.illness.hidden = false; } s.home.health = clamp100(s.home.health + 14); s.party.vpAmbition += 25; return "A letter to the Assembly named the VP acting president. You left for treatment."; } }, lose: {}, winText: "", loseText: "" },
    ],
    expire: { run: (s: FixState) => { if (s.home.illness) s.home.illness.hidden = true; s.gov.trust = Math.max(0, s.gov.trust - 2); return "The silence was taken as an attempt to hide it."; } }, expireText: () => "",
  },
  {
    id: "collapse", kind: "power" as const, urgency: 1,
    title: () => "The president collapses in public",
    cause: () => "After months of 'working from home', you collapsed at a public ceremony. Cameras caught everything. The opposition says the government lied to the nation.",
    options: [
      { id: "apologise", label: "Address the nation from the hospital bed", explain: "Admit it and apologise.", cost: 0, tradeoff: "It is humiliating but honest.", unc: "medium" as const, chance: () => 0.6, win: { trust: 1, run: (s: FixState) => { s.party.vpAmbition += 15; return "People were furious and then forgiving. The VP is the man of the hour."; } }, lose: { trust: -5, anger: 6, run: (s: FixState) => { s.party.vpAmbition += 20; return "The apology came too late. Nobody believed another word."; } }, winText: "", loseText: "" },
      { id: "deny", label: "Deny it: 'a brief fainting spell'", explain: "Keep the fiction going.", cost: 0, tradeoff: "Nobody will believe you.", unc: "high" as const, chance: () => 0.3, win: { run: () => "The story died down in a week." }, lose: { trust: -8, anger: 8, run: (s: FixState) => { s.party.vpAmbition += 25; s.rival.popularity = clamp100(s.rival.popularity + 4); return "Your own doctors contradicted you on television."; } }, winText: "", loseText: "" },
    ],
    expire: { trust: -6, anger: 6 }, expireText: () => "Your silence made it worse.",
  },
  {
    id: "vpKeeps", kind: "power" as const, urgency: 1,
    title: (s: FixState) => `${s.staff.vp?.name ?? "The vice president"} does not want to hand power back`,
    cause: () => "You are back, rested, and the VP says the 'transition needs more time'. He has changed the heads of two agencies and moved the guard. The Chief of Defence Staff has not said a word.",
    options: [
      { id: "demand", label: "Demand the keys, in front of the cabinet", explain: "A direct confrontation.", cost: 0, tradeoff: "Open conflict, and the army watches.", unc: "high" as const, chance: (s: FixState) => 0.4 + 0.3 * (s.groups.military / 100), win: { run: (s: FixState) => { s.party.vpAmbition = 40; if (s.staff.vp) s.staff.vp.loyalty = Math.max(0, s.staff.vp.loyalty - 15); return "He handed it back with a smile that scared everyone in the room."; } }, lose: { coup: 8, elite: -4, run: (s: FixState) => { s.party.vpAmbition += 12; return "He refused. Officers loyal to him now guard the second floor."; } }, winText: "", loseText: "" },
      { id: "share", label: "Share power: make him a co-governor of the north", explain: "Buy his loyalty with a region.", cost: 0, tradeoff: "He gets stronger.", unc: "low" as const, chance: () => 0.8, win: { elite: 2, run: (s: FixState) => { s.party.vpAmbition = 55; s.party.vpStage = 0; return "He accepted a huge portfolio. It was settled in a private dinner."; } }, lose: {}, winText: "", loseText: "" },
    ],
    expire: { coup: 6, run: (s: FixState) => { s.party.vpAmbition += 10; return undefined; } }, expireText: () => "He took your delay as consent.",
  },
  {
    id: "childScandal", kind: "scandal" as const, urgency: 3,
    title: () => "Your son's party video goes viral",
    cause: () => "A video shows your son spraying cash at a lavish party in Lagos while fuel queues stretch outside. #PresidentsSon is trending. Your spouse is furious, but not at him.",
    options: [
      { id: "apologise", label: "Apologise publicly and send him to work", explain: "Own it.", cost: 0, tradeoff: "A day of ridicule.", unc: "low" as const, chance: () => 0.8, win: { trust: 1, run: () => "He volunteered at a hospital for a month. People forgave you." }, lose: { trust: -2 }, winText: "", loseText: "The apology was mocked as insincere." },
      { id: "cover", label: "Have the video taken down and the host 'invited' for a chat", explain: "Make it disappear.", cost: 5, tradeoff: "If found out it is a bigger story.", unc: "high" as const, chance: () => 0.45, win: { run: () => "The video vanished from the platforms. Mostly." }, lose: { trust: -5, evidence: 5, run: () => "The cover-up became the story. Journalists found the 'chat'." }, winText: "", loseText: "" },
      { id: "ignore", label: "Say nothing", explain: "It will pass.", cost: 0, tradeoff: "It might not.", unc: "medium" as const, chance: () => 0.5, win: {}, lose: { trust: -3 }, winText: "It passed in a week.", loseText: "It became a symbol for the whole presidency." },
    ],
    expire: { trust: -2 }, expireText: () => "The silence was noticed.",
  },
  {
    id: "spouseSays", kind: "moment" as const, urgency: 5,
    title: (s: FixState) => `${s.home.spouse.name} wants a word`,
    cause: (s: FixState) => {
      const say = s.rule.executions > 0 ? "I cannot sleep. People are afraid of you. I did not marry a man who hangs people." : s.me.evidence > 35 ? "The market women talk. They say your people are eating. Please clean this house before it falls on us." : s.gov.happiness < 40 ? "I went to the market. They are suffering. Please do something that people can feel." : "You are doing better than you think. But do not forget who you were before this house.";
      return `Late at night, ${s.home.spouse.name} sits with you. "${say}"`;
    },
    options: [
      { id: "listen", label: "Listen, and promise to do better", explain: "You respect their judgement.", cost: 0, tradeoff: "It may change what you do.", unc: "low" as const, chance: () => 1, win: { trust: 0.8, run: (s: FixState) => { s.me.evidence = Math.max(0, s.me.evidence - 3); s.rule.abuse = Math.max(0, s.rule.abuse - 6); return "It was a long talk. You slept better afterwards."; } }, lose: {}, winText: "", loseText: "" },
      { id: "dismiss", label: "Tell them you know what you are doing", explain: "You are the president.", cost: 0, tradeoff: "Home becomes colder.", unc: "low" as const, chance: () => 1, win: { run: (s: FixState) => { s.home.health = clamp100(s.home.health - 1); return "The silence at breakfast lasted three days."; } }, lose: {}, winText: "", loseText: "" },
    ],
    expire: {}, expireText: () => "",
  },
  {
    id: "moveMoney", kind: "request" as const, urgency: 4,
    title: () => "Your lawyer says your money is exposed",
    cause: (s: FixState) => `Your private wealth is about ₦${Math.round(s.me.wealth).toLocaleString()}m, all of it traceable at home. A friendly lawyer in London offers 'discreet structures'.`,
    options: [
      { id: "shell", label: "Move it into shell companies abroad", explain: "Hide it well.", cost: 0, tradeoff: "A leak would be explosive.", unc: "high" as const, chance: () => 0.9, win: { evidence: 4, run: (s: FixState) => { s.home.abroad = Math.round(s.me.wealth * 0.6); return "The money is now safely invisible. Probably."; } }, lose: {}, winText: "", loseText: "" },
      { id: "flat", label: "Buy property in Dubai and London", explain: "Bricks are safer than accounts.", cost: 0, tradeoff: "Property records are public.", unc: "medium" as const, chance: () => 0.9, win: { evidence: 2, run: (s: FixState) => { s.home.abroad = Math.round(s.me.wealth * 0.4); return "Three flats and a house. A journalist has already asked about the flats."; } }, lose: {}, winText: "", loseText: "" },
      { id: "keep", label: "Leave it as it is", explain: "Stay clean-ish.", cost: 0, tradeoff: "If you fall, you have no escape fund.", unc: "low" as const, chance: () => 1, win: { trust: 0.5 }, lose: {}, winText: "Nothing changed.", loseText: "" },
    ],
    expire: {}, expireText: () => "",
  },
  {
    id: "accountLeak", kind: "scandal" as const, urgency: 1,
    title: () => "Leaked: the president's accounts abroad",
    cause: (s: FixState) => `An investigative consortium published documents about ₦${Math.round(s.home.abroad).toLocaleString()}m held abroad in your family's name. #WhereIsTheMoney is trending in three languages.`,
    options: [
      { id: "deny", label: "Deny everything and sue", explain: "Lawyers and loud statements.", cost: 10, tradeoff: "If the documents are real, you look like a liar.", unc: "high" as const, chance: (s: FixState) => 0.3 + 0.3 * (s.rule.judiciary / 100), win: { trust: 0, run: () => "The story faded under a barrage of letters from your lawyers." }, lose: { trust: -7, evidence: 12, scandal: 1, run: () => "The documents were authentic. 'Liar' trended for a week." }, winText: "", loseText: "" },
      { id: "return", label: "Repatriate the money and call it an 'oversight'", explain: "Bring it home.", cost: 0, tradeoff: "You lose your escape fund.", unc: "low" as const, chance: () => 0.9, win: { trust: -2, run: (s: FixState) => { s.me.wealth = Math.max(0, s.me.wealth - s.home.abroad * 0.3); s.home.abroad = 0; return "You paid a large fine and brought the rest home. The press called it 'damage control'."; } }, lose: {}, winText: "", loseText: "" },
    ],
    expire: { trust: -5, evidence: 8 }, expireText: () => "Silence confirmed the story.",
  },
];
