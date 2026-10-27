/**
 * Events about power and corruption: lawmakers caught stealing, mass protests, coup attempts, sanctions, elite
 * revolts, and the "only in Nigeria" moments (padded budgets, security votes, oil blocks, kidnapped senators...).
 * All people and incidents are fictional.
 */
import type { Opt, Tpl } from "./events";
import type { FixState } from "./types";
import { clamp100, nb } from "./util";
import { LAWS, lmById, lawmakerAction, punish, overthrow } from "./power";
import { STATE_BY_ID } from "../../game/data/states";

const sname = (id: string) => STATE_BY_ID[id]?.name ?? id;
const lmOf = (s: FixState) => lmById(s, String(s.flags.caseLm ?? ""));
const caseLm = (s: FixState, e: { id: string }) => lmById(s, String(s.flags[`ev:${e.id}:lm`] ?? ""));
const PICK_KIND = ["padded the budget with fake constituency projects", "inflated a road contract", "put ghost workers on a ministry payroll", "diverted a constituency fund", "took bribes to award an oil block", "sold admission slots and contracts at a federal agency"];

export const POWER_TEMPLATES: Tpl[] = [
  // ------------------------------------------------------------ a lawmaker is caught
  {
    id: "lmCase", kind: "case", urgency: 2,
    title: (s) => { const l = lmOf(s); return l ? `${l.name} caught stealing ${nb(Number(s.flags.caseAmount ?? 50))}` : "A lawmaker is caught stealing"; },
    cause: (s) => {
      const l = lmOf(s); if (!l) return "A lawmaker is accused of stealing public money.";
      const k = PICK_KIND[(l.id.length + Math.round(Number(s.flags.caseAmount ?? 0))) % PICK_KIND.length];
      const law = LAWS[s.rule.lawLevel];
      return `${l.name} (${l.party}, ${sname(l.stateId)}) allegedly ${k}. Auditors say ${nb(Number(s.flags.caseAmount ?? 50))} is missing. Under today's law (${law.name}) the punishment is: ${law.short.toLowerCase()}. How you handle this will be noticed by every other lawmaker.`;
    },
    options: [
      {
        id: "prosecute", label: "Prosecute", explain: "Let the courts decide. Punishment follows the law as it stands.", cost: 5, tradeoff: "Their friends in the Assembly will not forgive you.", unc: "medium",
        dyn: (s) => ({ label: s.rule.lawLevel === 0 ? "Prosecute (the law is weak: a reprimand)" : s.rule.lawLevel === 1 ? "Prosecute: seize the loot" : s.rule.lawLevel === 2 ? "Prosecute: send to prison" : s.rule.lawLevel === 3 ? "Prosecute: life in prison" : "Prosecute: death sentence", explain: s.rule.lawLevel === 0 ? "A reprimand is all the law allows. It will not scare anyone." : s.rule.lawLevel === 4 ? "The harshest punishment. It will terrify officials, and shock the world." : "Send a message to every other lawmaker." }),
        chance: (s) => 0.4 + 0.5 * (s.rule.judiciary / 100),
        win: { run: (s, e) => { const l = caseLm(s, e); if (!l) return; return punish(s, l, "case"); } },
        lose: { judiciary: -1, trust: -1, run: (s, e) => { const l = caseLm(s, e); if (!l) return; l.greed = clamp100(l.greed + 8); l.loyalty = clamp100(l.loyalty - 8); return `The case collapsed in court. ${l.name} walked free, richer and angrier. Weak courts protect big men.`; } },
        winText: "", loseText: "",
      },
      {
        id: "blackmail", label: "Quietly use it as leverage", explain: "Keep the file. They vote your way from now on.", cost: 0, tradeoff: "If the file leaks, it is your scandal.", unc: "low",
        chance: () => 0.9, win: { run: (s, e) => { const l = caseLm(s, e); if (!l) return; lawmakerAction(s, l.id, "blackmail"); return `${l.name} has seen the file and now votes the way you want.`; } },
        lose: { run: (s, e) => { const l = caseLm(s, e); if (!l) return; l.loyalty = clamp100(l.loyalty - 15); return `${l.name} called your bluff and dared you to publish.`; } }, winText: "", loseText: "",
      },
      {
        id: "protect", label: "Protect them", explain: "Make the case disappear. They owe you.", cost: 0, tradeoff: "You share the guilt; corruption grows.", unc: "medium",
        chance: () => 0.9, win: { run: (s, e) => { const l = caseLm(s, e); if (!l) return; lawmakerAction(s, l.id, "protect"); return `The case against ${l.name} quietly disappeared. They will remember who helped.`; } },
        lose: { evidence: 6, trust: -2 }, winText: "", loseText: "A journalist found out you buried the case.",
      },
      {
        id: "cut", label: "Take a cut of the loot", explain: "Look the other way, for a price.", cost: 0, tradeoff: "You get rich, and leave a paper trail.", unc: "high",
        chance: () => 0.9, win: { run: (s, e) => { const l = caseLm(s, e); if (!l) return; const w = s.me.wealth; lawmakerAction(s, l.id, "cut"); return `${l.name} sends ₦${Math.round(s.me.wealth - w).toLocaleString()}m to your accounts through a shell company.`; } },
        lose: { evidence: 10, scandal: 1, trust: -3 }, winText: "", loseText: "The shell company was traced to you.",
      },
    ],
    expire: { corruption: 1.5, trust: -2, run: (s, e) => { const l = caseLm(s, e); if (l) l.greed = clamp100(l.greed + 5); return l ? `Nothing was done about ${l.name}. Every lawmaker noticed.` : undefined; } }, expireText: () => "Nothing was done. Every lawmaker noticed.",
  },
  // ------------------------------------------------------------ danger meters boil over
  {
    id: "megaProtest", kind: "protest", urgency: 1,
    title: (s, st) => (s.rule.stolenElection && s.month - Number(s.flags.stolenAt ?? -9) < 4 ? `"Give us our vote back": protests in ${st}` : `Mass protests in ${st}`),
    cause: (s, st) => `Tens of thousands fill the streets of ${st}. Street anger is ${Math.round(s.rule.streetAnger)}/100. ${s.rule.stolenElection && s.month - Number(s.flags.stolenAt ?? -9) < 4 ? "They say the election was stolen." : "They are tired of rising prices, corruption and broken promises."} The world is watching how you respond.`,
    options: [
      { id: "concede", label: "Concede: announce real reforms", explain: "Sack a minister, cut a price, free prisoners.", cost: 60, tradeoff: "Looks weak to hardliners.", unc: "medium", chance: (s) => 0.45 + 0.3 * (s.gov.trust / 100) + 0.15 * (s.rule.democracy / 100), win: { anger: -22, trust: 3, elite: -1, mods: { happiness: 2 }, dur: 3 }, lose: { anger: -6, trust: -1 }, winText: "The crowds went home, for now.", loseText: "They say it is too little, too late." },
      { id: "talk", label: "Meet the organisers", explain: "Invite the leaders in for talks.", cost: 15, tradeoff: "May encourage others.", unc: "high", chance: (s) => 0.3 + 0.4 * (s.gov.trust / 100), win: { anger: -12, trust: 2 }, lose: { anger: 4 }, winText: "Talks calmed the capital.", loseText: "Talks broke down." },
      { id: "crackdown", label: "Send in the army", explain: "Clear the streets by force.", cost: 20, tradeoff: "Deaths would turn the world and your own people against you.", unc: "high", chance: (s) => 0.55 + 0.2 * (s.groups.military / 100) - 0.2 * (s.rule.eliteLoyalty < 35 ? 1 : 0), win: { anger: -14, intl: 10, democracy: -10, coup: -2, humanRights: -8, actTag: "crackdown", mods: { happiness: -1.5 }, dur: 3 }, lose: { anger: 14, intl: 14, democracy: -8, coup: 6, humanRights: -12, actTag: "crackdown", trust: -4 }, winText: "Troops cleared the streets. Dozens were killed.", loseText: "Troops fired on protesters. Footage went around the world. The crowds doubled." },
    ],
    expire: { anger: 10, coup: 5, trust: -3 }, expireText: () => "The protests spread to other cities while you did nothing.",
  },
  {
    id: "coupAttempt", kind: "power", urgency: 1,
    title: () => "Soldiers are moving on the presidential villa",
    cause: (s) => `Coup risk had reached ${Math.round(s.rule.coupRisk)}/100. Armoured vehicles are on the road to the villa and state television has gone off the air. You have hours.`,
    options: [
      { id: "loyal", label: "Rally loyal units", explain: "Fight back with the troops you trust.", cost: 0, tradeoff: "If the generals are against you, you lose everything.", unc: "high", chance: (s) => clamp(0.25 + 0.005 * (s.groups.military) + 0.003 * (100 - s.rule.coupRisk) + 0.003 * s.rule.eliteLoyalty, 0.1, 0.85), win: { coup: -25, democracy: -6, intl: 4, run: (s) => { s.groupMood.military -= 6; return "Loyal units crushed the plot. The ringleaders are in custody."; } }, lose: { run: (s) => overthrow(s, "coup") }, winText: "", loseText: "" },
      { id: "buy", label: "Pay off the generals", explain: "Offer them money and posts to stand down.", cost: 150, tradeoff: "A very expensive peace.", unc: "medium", chance: (s) => clamp(0.4 + 0.004 * (s.groups.military) + 0.003 * s.rule.eliteLoyalty, 0.1, 0.85), win: { coup: -22, elite: 4, run: () => "The generals took the money and went back to the barracks." }, lose: { run: (s) => overthrow(s, "coup") }, winText: "", loseText: "" },
      { id: "flee", label: "Flee the capital", explain: "Escape with what you can carry.", cost: 0, tradeoff: "You lose the presidency.", unc: "low", chance: () => 1, win: { run: (s) => { s.flags.exit = "flee"; return overthrow(s, "coup"); } }, lose: {}, winText: "", loseText: "" },
    ],
    expire: { run: (s) => overthrow(s, "coup") }, expireText: () => "The coup succeeded.",
  },
  {
    id: "sanctions", kind: "power", urgency: 2,
    title: () => "ECOWAS and the African Union threaten sanctions",
    cause: (s) => `International pressure stands at ${Math.round(s.rule.intlPressure)}/100. Foreign governments say Nigeria is backsliding on democracy: ${s.rule.acts.slice(-4).join(", ") || "recent decisions"}. Visa bans and frozen accounts are being drawn up.`,
    options: [
      { id: "restore", label: "Restore freedoms", explain: "End emergency rule and the internet blackout, release prisoners, free the press.", cost: 0, tradeoff: "Your grip on power loosens.", unc: "low", chance: () => 0.9, win: { intl: -22, democracy: 8, press: 15, anger: -3, run: (s) => { s.rule.emergencyUntil = Math.min(s.rule.emergencyUntil, s.month); s.rule.shutdownUntil = Math.min(s.rule.shutdownUntil, s.month); return "You eased the clampdown. The sanctions threat was lifted."; } }, lose: { intl: -10 }, winText: "", loseText: "" },
      { id: "lobby", label: "Pay lobbyists and sweeten partners", explain: "Spread money and contracts in foreign capitals.", cost: 150, tradeoff: "Costly, and not guaranteed.", unc: "high", chance: () => 0.5, win: { intl: -16, evidence: 3 }, lose: { intl: 4 }, winText: "Several governments backed off.", loseText: "The lobbying was exposed and made things worse." },
      { id: "defy", label: "Defy the world", explain: "Say Nigeria answers to nobody.", cost: 0, tradeoff: "Sanctions bite: investors flee and dollars dry up.", unc: "low", chance: () => 1, win: { intl: 6, anger: 3, mods: { investor: -7, fxSupply: -0.3 }, dur: 12, groups: { business: -8 }, run: (s) => { s.eco.reserves = Math.max(5, s.eco.reserves - 3); return "Sanctions were imposed. Investors fled and the naira slid."; } }, lose: {}, winText: "", loseText: "" },
    ],
    expire: { intl: 4, mods: { investor: -4 }, dur: 6 }, expireText: () => "Silence was read as defiance. Visa bans began.",
  },
  {
    id: "eliteRevolt", kind: "power", urgency: 2,
    title: () => "Governors and kingmakers threaten to abandon you",
    cause: (s) => `Elite loyalty has fallen to ${Math.round(s.rule.eliteLoyalty)}/100. Governors, party chiefs and the rich who put you in power say they will back someone else.`,
    options: [
      { id: "buy", label: "Buy them back", explain: "Contracts, security votes and posts.", cost: 100, tradeoff: "More corruption.", unc: "low", chance: () => 0.8, win: { elite: 18, corruption: 1.2, evidence: 4, run: (s) => { for (const g of s.governors) g.relation = clamp100(g.relation + 8); return "Money talks. The kingmakers are back on side, for now."; } }, lose: { elite: 5 }, winText: "", loseText: "They took the money and still plotted." },
      { id: "concede", label: "Share power with them", explain: "Give governors a bigger say and slice of the budget.", cost: 20, tradeoff: "A weaker presidency.", unc: "medium", chance: () => 0.7, win: { elite: 12, assembly: 4, governors: 6 }, lose: { elite: 3 }, winText: "Power was shared; the revolt fizzled.", loseText: "They wanted more." },
      { id: "crush", label: "Arrest the ringleaders", explain: "Show who is in charge.", cost: 10, tradeoff: "Fear works until it does not.", unc: "high", chance: (s) => 0.4 + 0.004 * s.groups.military, win: { elite: 6, democracy: -8, intl: 5, anger: 2, actTag: "purgeElite" }, lose: { elite: -10, coup: 8, democracy: -6 }, winText: "The ringleaders were arrested; the rest fell silent.", loseText: "The arrests backfired: even loyalists got nervous." },
    ],
    expire: { elite: -6, coup: 4, assembly: -4 }, expireText: () => "The kingmakers quietly changed sides.",
  },
  // ------------------------------------------------------------ only in Nigeria
  {
    id: "budgetPadding", kind: "moment", urgency: 2,
    title: () => "The Senate has padded your budget",
    cause: () => "Lawmakers have stuffed ₦3 trillion of 'constituency projects' into your budget: roads that do not exist, boreholes never dug, 'empowerment' trucks for cousins. The Senate President says it is 'the people's will'.",
    options: [
      { id: "sign", label: "Sign it", explain: "Keep the peace with the Assembly.", cost: 0, tradeoff: "A fortune is wasted; corruption grows.", unc: "low", chance: () => 1, win: { assembly: 10, lmLoyalty: 4, corruption: 2, treasury: -300, trust: -2, groups: { faith: -4 }, actTag: "paddedBudget" }, lose: {}, winText: "You signed. The budget passed; so did the money.", loseText: "" },
      { id: "veto", label: "Veto it", explain: "Send the budget back.", cost: 0, tradeoff: "Open war with the Assembly.", unc: "medium", chance: (s) => 0.4 + 0.3 * (s.gov.trust / 100), win: { assembly: -6, lmLoyalty: -3, trust: 3, corruption: -0.5, groups: { faith: 4, business: 3 } }, lose: { assembly: -10, lmLoyalty: -5, trust: 1, treasury: -150 }, winText: "Your veto stood. The public cheered.", loseText: "They overrode your veto and padded it again." },
      { id: "trim", label: "Cut it in half and sign", explain: "A compromise.", cost: 0, tradeoff: "Satisfies no one fully.", unc: "medium", chance: () => 0.6, win: { assembly: 2, trust: 1, treasury: -120, corruption: 0.5 }, lose: { assembly: -4, treasury: -250 }, winText: "Half the padding was struck out.", loseText: "Lawmakers refused and added it back." },
    ],
    expire: { assembly: -3, treasury: -300, corruption: 2 }, expireText: () => "The budget became law untouched.",
  },
  {
    id: "securityVotes", kind: "moment", urgency: 2,
    title: () => "Governors demand their 'security votes'",
    cause: () => "Governors want ₦150bn in 'security votes', cash that needs no receipts. Everyone knows where much of it goes.",
    options: [
      { id: "pay", label: "Pay with no questions", explain: "Keep the governors happy.", cost: 150, tradeoff: "Money vanishes.", unc: "low", chance: () => 1, win: { governors: 8, elite: 4, corruption: 1.5, evidence: 3, actTag: "securityVotes" }, lose: {}, winText: "The governors are delighted.", loseText: "" },
      { id: "audit", label: "Pay only against receipts", explain: "Demand accounts.", cost: 80, tradeoff: "Governors will grumble.", unc: "medium", chance: (s) => 0.45 + 0.3 * (s.gov.transparency / 100), win: { governors: -2, trust: 1.5, corruption: -0.5, groups: { faith: 3 } }, lose: { governors: -7, elite: -3 }, winText: "Some governors showed receipts; the rest went quiet.", loseText: "Governors stormed out of the meeting." },
      { id: "refuse", label: "Refuse", explain: "No more blank cheques.", cost: 0, tradeoff: "Governors turn hostile.", unc: "high", chance: () => 1, win: { governors: -9, elite: -4, trust: 2, groups: { faith: 4 } }, lose: {}, winText: "You refused. Several governors threatened to resist the federal government.", loseText: "" },
    ],
    expire: { governors: -3 }, expireText: () => "The governors took your silence as a snub.",
  },
  {
    id: "oilBlocks", kind: "moment", urgency: 3,
    title: () => "Oil blocks are up for grabs",
    cause: () => "Several valuable oil blocks need new owners. Everyone with a briefcase wants a meeting.",
    options: [
      { id: "friends", label: "Give them to your friends", explain: "Reward loyalty. Take a 'consulting fee'.", cost: 0, tradeoff: "Looting the future; leaves a paper trail.", unc: "high", chance: () => 1, win: { run: (s) => { s.me.wealth += 400; s.me.acts.push("kickback"); return "Your friends got the blocks; ₦400m landed in your private accounts."; }, evidence: 10, corruption: 2, elite: 8, mods: { investor: -3 }, dur: 6, actTag: "oilBlockFriends" }, lose: {}, winText: "", loseText: "" },
      { id: "auction", label: "Hold an open auction", explain: "A transparent bidding round.", cost: 10, tradeoff: "Insiders will be furious.", unc: "medium", chance: (s) => 0.5 + 0.3 * (s.gov.procurement / 100), win: { treasury: 800, mods: { investor: 3 }, dur: 6, trust: 2, elite: -5 }, lose: { treasury: 300, elite: -5, corruption: 1 }, winText: "A clean auction raised ₦800bn.", loseText: "Insiders rigged the auction anyway." },
      { id: "hold", label: "Hold them for now", explain: "Delay the decision.", cost: 0, tradeoff: "Production stays idle.", unc: "low", chance: () => 1, win: { elite: -2 }, lose: {}, winText: "The blocks sat idle.", loseText: "" },
    ],
    expire: { elite: -3 }, expireText: () => "Rival bidders went to your rivals.",
  },
  {
    id: "senatorKidnap", kind: "moment", urgency: 1,
    title: (s) => { const l = s.lawmakers.find((x) => x.chamber === "senate" && x.status !== "jailed" && x.status !== "executed"); return `${l ? l.name : "A senator"}'s son has been kidnapped`; },
    cause: () => "Gunmen took the senator's son from school and want ₦200m. The senator is begging you for help. Everyone is watching what you do for a powerful man's child, when ordinary families wait years.",
    options: [
      { id: "ransom", label: "Pay the ransom quietly", explain: "Get the boy home.", cost: 20, tradeoff: "It rewards kidnappers.", unc: "low", chance: () => 0.9, win: { lmLoyalty: 3, assembly: 4, insecurity: 2, trust: -1, groups: { faith: -3 } }, lose: { assembly: -2 }, winText: "The boy came home. The kidnappers know the government pays.", loseText: "The kidnappers took the money and kept the boy." },
      { id: "rescue", label: "Military rescue", explain: "Special forces raid the camp.", cost: 40, tradeoff: "A failed raid can end in tragedy.", unc: "high", chance: (s) => 0.35 + 0.005 * (s.sec.forces), win: { trust: 3, insecurity: -2, assembly: 5, groups: { military: 3 } }, lose: { assembly: -5, trust: -3, anger: 3 }, winText: "Soldiers rescued the boy and several others. The nation cheered.", loseText: "The raid failed and the boy died. The senator blames you." },
      { id: "refuse", label: "Refuse to negotiate", explain: "Treat him like any other victim.", cost: 0, tradeoff: "Powerful men hate being ignored.", unc: "medium", chance: () => 0.5, win: { trust: 2, assembly: -3, groups: { faith: 3 } }, lose: { assembly: -6, lmLoyalty: -3, trust: -1 }, winText: "The boy was freed unharmed after weeks. The public praised your principle.", loseText: "The boy was freed but the senator never forgave you." },
    ],
    expire: { assembly: -4, trust: -1 }, expireText: () => "The senator felt abandoned.",
  },
  {
    id: "ghostWorkers", kind: "moment", urgency: 2,
    title: () => "50,000 ghost workers on the payroll",
    cause: () => "A payroll audit found 50,000 names that do not exist, collecting salaries every month. Some of the money flows to people in your own party.",
    options: [
      { id: "all", label: "Purge them all", explain: "Strike every ghost, friend or foe.", cost: 0, tradeoff: "Your own party will hate it.", unc: "medium", chance: (s) => 0.6 + 0.2 * (s.gov.capacity / 100), win: { mods: { revenue: 45 }, dur: null, trust: 3, elite: -6, assembly: -3, corruption: -1, groups: { workers: -3, faith: 3 } }, lose: { elite: -4, assembly: -2, trust: 1 }, winText: "Fifty thousand ghosts were struck off; ₦45bn a month saved.", loseText: "Only half were removed; officials hid the rest." },
      { id: "opp", label: "Purge only the opposition's", explain: "Save money and score points.", cost: 0, tradeoff: "Selective justice is not justice.", unc: "low", chance: () => 0.8, win: { mods: { revenue: 22 }, dur: null, democracy: -2, trust: -1, elite: 3, actTag: "selectivePurge" }, lose: { trust: -2 }, winText: "Only the opposition's ghosts were struck off.", loseText: "" },
      { id: "ignore", label: "Ignore the report", explain: "Not now.", cost: 0, tradeoff: "The theft goes on.", unc: "low", chance: () => 1, win: { corruption: 0.8, trust: -1 }, lose: {}, winText: "The ghosts stayed on the payroll.", loseText: "" },
    ],
    expire: { corruption: 0.8, trust: -1 }, expireText: () => "The audit was leaked to the press.",
  },
  {
    id: "leakedAudio", kind: "moment", urgency: 1,
    title: () => "Leaked audio: the President promising contracts",
    cause: (s) => `A recording has gone viral: a voice that sounds like yours promising contracts to friends. ${s.rule.pressFreedom > 50 ? "The press is running it on every front page." : "The press is cautious, but social media is not."}`,
    options: [
      { id: "deny", label: "Deny it: call it AI-faked", explain: "Say the audio is fake.", cost: 0, tradeoff: "If experts say it is real, you are finished.", unc: "high", chance: (s) => 0.3 + 0.3 * (1 - s.me.evidence / 100), win: { trust: -1 }, lose: { trust: -5, evidence: 10, scandal: 1 }, winText: "Experts could not agree; the story faded.", loseText: "Forensic experts said the voice was yours." },
      { id: "apologise", label: "Apologise and promise reform", explain: "Own it.", cost: 0, tradeoff: "Admits guilt.", unc: "low", chance: () => 0.9, win: { trust: -1, evidence: -5, groups: { faith: 2 } }, lose: { trust: -3 }, winText: "Voters grumbled but moved on.", loseText: "" },
      { id: "arrest", label: "Arrest the journalist", explain: "Find who leaked it.", cost: 5, tradeoff: "A crackdown on the press.", unc: "medium", chance: () => 0.65, win: { press: -10, democracy: -8, intl: 5, anger: 4, actTag: "arrestedJournalist" }, lose: { press: -10, democracy: -8, intl: 8, anger: 8, trust: -4, actTag: "arrestedJournalist" }, winText: "The leaker was caught; the media went quiet.", loseText: "The arrest turned the journalist into a hero." },
    ],
    expire: { trust: -3, evidence: 6 }, expireText: () => "Your silence made it worse.",
  },
  {
    id: "inecOffer", kind: "moment", urgency: 3,
    title: () => "INEC's chairman hints the election could be 'managed'",
    cause: (s) => `The electoral commission's chairman visits quietly. "Mr/Madam President, elections are about logistics," he says. "Logistics can be arranged." Your current INEC control: ${s.rule.inecControl}%.`,
    options: [
      { id: "accept", label: "Accept the offer", explain: "Let INEC 'manage' the count.", cost: 40, tradeoff: "The first step to a rigged election.", unc: "medium", chance: () => 0.95, win: { inec: 30, evidence: 6, democracy: -6, intl: 2, actTag: "buyINEC" }, lose: {}, winText: "INEC's chairman smiled. 'It will be arranged.'", loseText: "" },
      { id: "refuse", label: "Show him the door", explain: "Keep the commission clean.", cost: 0, tradeoff: "Your rival may not be so principled.", unc: "low", chance: () => 1, win: { trust: 1.5, groups: { faith: 3 } }, lose: {}, winText: "He left empty-handed. You kept your hands clean.", loseText: "" },
      { id: "expose", label: "Expose him publicly", explain: "A major anti-corruption moment.", cost: 0, tradeoff: "Political elites will treat you as a threat.", unc: "medium", chance: () => 0.7, win: { trust: 3.5, elite: -3, press: 3, democracy: 3, groups: { faith: 5 } }, lose: { elite: -3 }, winText: "The chairman resigned in disgrace. The public cheered.", loseText: "He denied everything; no one was punished." },
    ],
    expire: {}, expireText: () => "The chairman went elsewhere.",
  },
  {
    id: "hoarders", kind: "moment", urgency: 1,
    title: () => "Marketers hoard petrol to force a price rise",
    cause: () => "Fuel marketers are hiding petrol in depots to force prices up. Queues are growing and tempers are fraying.",
    options: [
      { id: "arrest", label: "Arrest the hoarders", explain: "Seize their stock and jail the bosses.", cost: 10, tradeoff: "May frighten the market.", unc: "medium", chance: (s) => 0.5 + 0.3 * (s.gov.capacity / 100), win: { mods: { transport: -3, happiness: 1.5 }, dur: 3, trust: 1.5 }, lose: { mods: { happiness: -2 }, dur: 3, trust: -1 }, winText: "Depots were raided; petrol flowed again.", loseText: "The marketers went underground and queues grew." },
      { id: "import", label: "Import extra fuel", explain: "Flood the market with supply.", cost: 80, tradeoff: "Uses dollars.", unc: "low", chance: () => 0.8, win: { mods: { fxDemand: 0.2, happiness: 1.5 }, dur: 3 }, lose: { mods: { fxDemand: 0.2 }, dur: 3 }, winText: "Extra cargoes ended the queues.", loseText: "The cargoes arrived late." },
      { id: "deal", label: "Negotiate", explain: "Meet the marketers' union.", cost: 10, tradeoff: "They may ask for more.", unc: "high", chance: () => 0.4, win: { mods: { happiness: 1 }, dur: 2 }, lose: { mods: { happiness: -1.5 }, dur: 3 }, winText: "A deal was struck.", loseText: "They stalled and prices rose." },
    ],
    expire: { mods: { happiness: -2.5 }, dur: 3, trust: -2 }, expireText: () => "Queues stretched for miles for weeks.",
  },
  {
    id: "asuuStrike", kind: "moment", urgency: 2,
    title: () => "Lecturers go on indefinite strike",
    cause: () => "University lecturers say salaries are worth nothing and campuses are falling apart. Students are at home and parents are angry.",
    options: [
      { id: "pay", label: "Pay what is owed", explain: "Settle arrears and agree improvements.", cost: 70, tradeoff: "Costly.", unc: "low", chance: () => 0.85, win: { groups: { youth: 6, workers: 3 }, trust: 1.5 }, lose: { groups: { youth: 2 } }, winText: "Lecturers returned to class.", loseText: "A partial payment only calmed things." },
      { id: "firm", label: "Stand firm", explain: "No new money.", cost: 0, tradeoff: "A lost academic year.", unc: "high", chance: () => 0.4, win: { trust: -0.5 }, lose: { groups: { youth: -8 }, trust: -2, anger: 3 }, winText: "The strike fizzled.", loseText: "The strike dragged on; students turned against you." },
      { id: "ban", label: "Ban the union", explain: "Declare the strike illegal and arrest leaders.", cost: 5, tradeoff: "A blow to workers' rights.", unc: "medium", chance: () => 0.5, win: { democracy: -6, press: -3, groups: { youth: -4, workers: -4 }, actTag: "banUnion" }, lose: { democracy: -6, anger: 6, groups: { youth: -6, workers: -8 }, actTag: "banUnion" }, winText: "Leaders were arrested and the strike broke.", loseText: "The ban triggered a general strike." },
    ],
    expire: { groups: { youth: -5 }, trust: -1 }, expireText: () => "Another academic year was lost.",
  },
];

const mid = <T,>(a: T[], pick: (a: T[]) => T) => pick(a);
export interface MomentTrigger { tpl: string; gap?: number; p: (s: FixState) => number; place: (s: FixState, pick: <T>(a: T[]) => T) => string }
const BIG = ["NG-FC", "NG-LA", "NG-KN", "NG-RI", "NG-KD"];
export const MOMENT_TRIGGERS: MomentTrigger[] = [
  { tpl: "budgetPadding", gap: 11, p: (s) => (s.month >= 8 && (s.month % 12 === 9 || s.month % 12 === 10) ? 0.45 : 0), place: () => "NG-FC" },
  { tpl: "securityVotes", gap: 9, p: () => 0.04, place: () => "NG-FC" },
  { tpl: "oilBlocks", gap: 18, p: (s) => (s.month >= 5 ? 0.035 : 0), place: () => "NG-RI" },
  { tpl: "senatorKidnap", gap: 14, p: () => 0.022, place: (_s, pick) => mid(["NG-ZA", "NG-KD", "NG-KT", "NG-NI"], pick) },
  { tpl: "ghostWorkers", gap: 20, p: (s) => (s.month >= 3 ? 0.04 : 0), place: () => "NG-FC" },
  { tpl: "leakedAudio", gap: 16, p: (s) => (s.month >= 6 ? 0.012 + 0.0004 * s.me.evidence : 0), place: () => "NG-FC" },
  { tpl: "inecOffer", gap: 18, p: (s) => (s.month >= 14 && s.rule.inecControl < 50 ? 0.05 : 0), place: () => "NG-FC" },
  { tpl: "hoarders", gap: 12, p: (s) => (s.fuel.coverage > 0.05 ? 0.03 : 0.012), place: (s, pick) => mid(BIG, pick) },
  { tpl: "asuuStrike", gap: 14, p: () => 0.03, place: (_s, pick) => mid(["NG-LA", "NG-OY", "NG-EN", "NG-KD"], pick) },
];
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export type { Opt };
