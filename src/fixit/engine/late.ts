/**
 * The late game never ends. Success brings its own problems (a strong naira, a housing bubble, rivals who want you
 * brought down), the world is shaken every few years by shocks, money can go into a sovereign fund and into
 * ever-larger mega-projects, and the naira can slowly become a currency the world uses.
 */
import type { Rng } from "../../game/engine/rng";
import type { Effects, FixState } from "./types";
import { addMod, clamp, clamp100, nb, pushNews } from "./util";
import { createEvent } from "./spawn";
import { W, saveW, league, gdpUsd, myRank } from "./world";
import { payPc } from "./meta";

const opt = (id: string, label: string, explain: string, tradeoff: string, win: object, lose: object, chance: (s: FixState) => number, cost = 0) => ({ id, label, explain, cost, tradeoff, unc: "medium" as const, chance, win, lose, winText: "", loseText: "" });
const mod = (s: FixState, id: string, label: string, e: Effects, dur: number | null) => addMod(s, `late:${id}`, label, e, { duration: dur, ramp: 2 });
const rival = (s: FixState) => { const id = String(s.flags.lateRival ?? ""); return W(s).c.find((c) => c.id === id) ?? W(s).c[0]; };
const rname = (s: FixState) => rival(s).name;
const rflag = (s: FixState) => rival(s).flag;
const money = (s: FixState, bn: number) => bn * (0.6 + 0.4 * s.eco.priceLevel / 100);

export const LATE_TEMPLATES = [
  { id: "lateStrongNaira", kind: "opportunity" as const, urgency: 2, title: () => "The naira is too strong for exporters", cause: (s: FixState) => `At ₦${Math.round(s.eco.fx)} to the dollar, cocoa, sesame and garment exporters say they cannot compete. 'We are winning and losing at the same time,' says one.`,
    options: [
      opt("buy", "Buy dollars and weaken the naira a little", "Central bank buys dollars to ease the pressure.", "Imports get dearer.", { run: (s: FixState) => { s.eco.fx *= 1.12; s.eco.reserves += 2; mod(s, "fxbuy", "Managed naira", { exports: 0.05, inflation: 0.15 }, 12); return "The naira eased and exporters breathed again. Importers grumbled."; } }, { run: (s: FixState) => { s.eco.fx *= 1.04; return "The market called your bluff and the naira barely moved."; } }, () => 0.7),
      opt("sub", "Subsidise exporters", "Cash and cheap loans for firms that sell abroad.", "A recurring bill.", { run: (s: FixState) => { s.fin.treasury -= money(s, 40); mod(s, "exsub", "Exporter support", { exports: 0.1, jobs: -0.3 }, 18); return "Exporters survived, and a few new ones appeared."; } }, { run: (s: FixState) => { s.fin.treasury -= money(s, 40); return "The money went and some of it went to the wrong people."; } }, () => 0.62),
      opt("ride", "Let it ride", "A strong naira is a sign of strength.", "Factories close.", { run: (s: FixState) => { mod(s, "ride", "Cheap imports", { inflation: -0.2 }, 12); return "Prices stayed low. Some exporters adapted."; } }, { run: (s: FixState) => { mod(s, "rideh", "Exporters struggling", { exports: -0.08, jobs: 0.4 }, 12); return "Factories laid off workers, and the unions found the cameras."; } }, () => 0.5),
    ], expire: { run: (s: FixState) => { mod(s, "rideh", "Exporters struggling", { exports: -0.08, jobs: 0.4 }, 12); return "You said nothing and exporters lost heart."; } }, expireText: () => "You said nothing." },
  { id: "lateHousing", kind: "opportunity" as const, urgency: 2, title: () => "A property bubble in Lagos and Abuja", cause: () => "Flats cost more than most people earn in a lifetime. Rich investors keep buying, and bankers say nothing can go wrong.",
    options: [
      opt("tax", "Tax speculators and empty homes", "Make hoarding property expensive.", "The rich will remember.", { run: (s: FixState) => { s.gov.trust = clamp100(s.gov.trust + 2); s.fin.treasury += money(s, 30); s.groupMood.business = clamp(s.groupMood.business - 3, -40, 40); return "Prices cooled and the treasury gained, to the fury of landlords."; } }, { run: (s: FixState) => { s.groupMood.business = clamp(s.groupMood.business - 4, -40, 40); return "The tax was dodged and the bubble kept growing."; } }, () => 0.6),
      opt("build", "Build affordable housing", "Public land, private builders, real supply.", "Takes years and money.", { run: (s: FixState) => { s.fin.treasury -= money(s, 60); mod(s, "housing", "Affordable housing wave", { jobs: -0.5, sme: 1 }, 24); s.gov.happiness = clamp100(s.gov.happiness + 2); return "Cranes rose across the cities and rents began to ease."; } }, { run: (s: FixState) => { s.fin.treasury -= money(s, 60); return "Contractors took the money and delivered a quarter of the homes."; } }, () => 0.58),
      opt("ignore", "Leave the market alone", "Markets know best.", "Bubbles burst.", { run: () => "The market cooled by itself, for now." }, { run: (s: FixState) => { s.eco.growth -= 0.6; s.eco.investor = clamp100(s.eco.investor - 3); return "The bubble burst, banks wobbled and growth fell."; } }, () => 0.4),
    ], expire: { run: (s: FixState) => { s.eco.growth -= 0.4; return "The bubble kept growing."; } }, expireText: () => "The bubble kept growing." },
  { id: "lateInequality", kind: "protest" as const, urgency: 3, title: () => "A tale of two Nigerias", cause: () => "The country is richer than ever, but the new money sits in a few neighbourhoods. A viral video contrasts a Banana Island party with a flooded market. Crowds are forming.",
    options: [
      opt("wealth", "A wealth levy and a big social programme", "Take from the top, give to the bottom.", "Business hates it.", { run: (s: FixState) => { s.fin.treasury -= money(s, 50); s.rule.streetAnger = clamp100(s.rule.streetAnger - 10); s.groupMood.business = clamp(s.groupMood.business - 5, -40, 40); s.gov.happiness = clamp100(s.gov.happiness + 3); return "The streets calmed. The rich threatened to take their money abroad and a few did."; } }, { run: (s: FixState) => { s.rule.streetAnger = clamp100(s.rule.streetAnger - 3); return "A programme was announced and nobody trusted it."; } }, () => 0.62),
      opt("jobs", "Push money to the poorest regions", "Roads, power and schools where it is needed.", "Slow, but it lasts.", { run: (s: FixState) => { s.fin.treasury -= money(s, 70); mod(s, "inequality", "Regional catch-up", { jobs: -0.5, foodSupply: 1 }, 24); s.rule.streetAnger = clamp100(s.rule.streetAnger - 6); return "The gap began to close, slowly."; } }, { run: (s: FixState) => { s.fin.treasury -= money(s, 70); return "Money went in and little came out the other end."; } }, () => 0.55),
      opt("police", "Send in the police", "Keep order first.", "It will be remembered.", { run: (s: FixState) => { s.rule.streetAnger = clamp100(s.rule.streetAnger - 6); s.rule.democracy = clamp100(s.rule.democracy - 2); return "Order returned, quietly and with some bruises."; } }, { run: (s: FixState) => { s.rule.streetAnger = clamp100(s.rule.streetAnger + 8); s.sec.humanRights = clamp100(s.sec.humanRights - 5); return "Footage of the crackdown reached the world in an hour."; } }, () => 0.45),
    ], expire: { run: (s: FixState) => { s.rule.streetAnger = clamp100(s.rule.streetAnger + 8); return "The crowds grew."; } }, expireText: () => "The crowds grew." },
  { id: "lateAutomation", kind: "opportunity" as const, urgency: 2, title: () => "Robots arrive at the factory gates", cause: () => "Your best factories are installing robots. Output is up, and thousands of workers are being told to go home.",
    options: [
      opt("retrain", "Pay for retraining", "Teach workers to run the machines.", "Costly and slow.", { run: (s: FixState) => { s.fin.treasury -= money(s, 45); s.jobs.skills = Math.min(100, s.jobs.skills + 3); mod(s, "retrain", "Retrained workforce", { skills: 1.5, jobs: -0.3 }, 24); return "A generation of workers learned a new trade."; } }, { run: (s: FixState) => { s.fin.treasury -= money(s, 45); return "Classes ran, but the jobs the workers were trained for were elsewhere."; } }, () => 0.62),
      opt("tax", "Tax the robots", "A levy on machines funds the jobless.", "Investors dislike it.", { run: (s: FixState) => { s.fin.treasury += money(s, 35); s.eco.investor = clamp100(s.eco.investor - 2); s.groupMood.workers = clamp(s.groupMood.workers + 3, -40, 40); return "Workers had a cushion, and factory owners grumbled."; } }, { run: (s: FixState) => { s.eco.investor = clamp100(s.eco.investor - 3); return "The tax was dodged and the headline hurt investment."; } }, () => 0.55),
      opt("accept", "Let it happen", "Efficiency wins.", "Many lose their jobs.", { run: (s: FixState) => { mod(s, "robots", "Efficient factories", { manuf: 2, exports: 0.05 }, 24); return "Output jumped. The unions did not clap."; } }, { run: (s: FixState) => { mod(s, "robotsj", "Factory layoffs", { jobs: 0.6 }, 18); s.rule.streetAnger = clamp100(s.rule.streetAnger + 5); return "The layoffs came faster than the retraining."; } }, () => 0.5),
    ], expire: { run: (s: FixState) => { mod(s, "robotsj", "Factory layoffs", { jobs: 0.6 }, 18); return "The layoffs began without any plan."; } }, expireText: () => "The layoffs began without any plan." },
  { id: "lateMigrants", kind: "opportunity" as const, urgency: 2, title: () => "Neighbours' workers arrive in their thousands", cause: () => "Nigeria is the place to be in West Africa. Young people from across the region are arriving for work, and housing, schools and tempers are stretched.",
    options: [
      opt("open", "Open the doors and welcome them", "A bigger market, younger workers.", "Local anger flares.", { run: (s: FixState) => { mod(s, "migrants", "Regional workforce", { manuf: 1, sme: 1, jobs: 0.2 }, 24); s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas + 8); s.groupMood.youth = clamp(s.groupMood.youth - 2, -40, 40); return "Factories filled and neighbours said Nigeria walks the talk."; } }, { run: (s: FixState) => { s.rule.streetAnger = clamp100(s.rule.streetAnger + 5); return "Tension in the cities made headlines."; } }, () => 0.58),
      opt("permit", "A work-permit scheme", "Welcome those with skills and jobs.", "Bureaucracy and bribes.", { run: (s: FixState) => { s.fin.treasury += money(s, 20); mod(s, "permits", "Skilled newcomers", { skills: 1.5 }, 24); return "The scheme filled skill gaps and the treasury gained."; } }, { run: (s: FixState) => { s.gov.corruption = clamp100(s.gov.corruption + 1); return "Permits were sold at the counter."; } }, () => 0.6),
      opt("close", "Tighten the borders", "Nigeria first.", "Neighbours will remember.", { run: (s: FixState) => { s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas - 8); return "Quiet returned to the cities. The neighbours were not pleased."; } }, { run: (s: FixState) => { s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas - 10); s.rule.intlPressure = clamp100(s.rule.intlPressure + 3); return "Videos from the border went viral."; } }, () => 0.5),
    ], expire: { run: (s: FixState) => { s.rule.streetAnger = clamp100(s.rule.streetAnger + 3); return "No plan, and tempers rose."; } }, expireText: () => "No plan." },
  { id: "lateBloc", kind: "global" as const, urgency: 3, title: () => "The great powers want you to pick a side", cause: () => "Washington and Beijing both invite you to their camp. Each promises money and threatens quietly. Staying out has a price too.",
    options: [
      opt("west", "Side with the West", "Markets, standards and security help.", "China will not forget.", { run: (s: FixState) => { s.foreign.rel.usa = clamp100(s.foreign.rel.usa + 10); s.foreign.rel.china = clamp100(s.foreign.rel.china - 10); s.eco.investor = clamp100(s.eco.investor + 3); return "Western money and standards flowed in. Beijing took offence."; } }, { run: (s: FixState) => { s.foreign.rel.china = clamp100(s.foreign.rel.china - 8); return "You took sides and got less than you were promised."; } }, () => 0.6),
      opt("east", "Side with China", "Ports, railways and no lectures.", "Washington will not forget.", { run: (s: FixState) => { s.foreign.rel.china = clamp100(s.foreign.rel.china + 10); s.foreign.rel.usa = clamp100(s.foreign.rel.usa - 10); mod(s, "east", "Chinese infrastructure", { rail: 1, ports: 1, jobs: -0.3 }, 36); return "New railways and ports. Washington took offence."; } }, { run: (s: FixState) => { s.foreign.rel.usa = clamp100(s.foreign.rel.usa - 8); return "You took sides and the projects were delayed."; } }, () => 0.6),
      opt("nonalign", "Stay non-aligned", "Everyone's friend, nobody's ally.", "Both are annoyed.", { run: (s: FixState) => { s.foreign.rel.usa = clamp100(s.foreign.rel.usa + 2); s.foreign.rel.china = clamp100(s.foreign.rel.china + 2); s.gov.trust = clamp100(s.gov.trust + 1.5); return "Nigeria was praised as an independent voice."; } }, { run: (s: FixState) => { s.foreign.rel.usa = clamp100(s.foreign.rel.usa - 4); s.foreign.rel.china = clamp100(s.foreign.rel.china - 4); return "Neither camp was satisfied and both cooled."; } }, () => 0.45),
    ], expire: { run: (s: FixState) => { s.foreign.rel.usa = clamp100(s.foreign.rel.usa - 3); s.foreign.rel.china = clamp100(s.foreign.rel.china - 3); return "You dodged and both noticed."; } }, expireText: () => "You dodged." },
  { id: "lateCurrency", kind: "global" as const, urgency: 3, title: (s: FixState) => `${rflag(s)} Speculators bet against the naira`, cause: (s: FixState) => `Traders linked to ${rname(s)} are shorting the naira. 'They want the rising star to stumble,' says an analyst.`,
    options: [
      opt("defend", "Spend reserves to defend it", "Show them you have deep pockets.", "Reserves fall.", { run: (s: FixState) => { s.eco.reserves = Math.max(0, s.eco.reserves - 4); s.eco.investor = clamp100(s.eco.investor + 2); return "The speculators lost money and learned a lesson."; } }, { run: (s: FixState) => { s.eco.reserves = Math.max(0, s.eco.reserves - 6); s.eco.fx *= 1.08; return "You spent the reserves and the naira fell anyway."; } }, (s) => (s.eco.reserves > 25 ? 0.72 : 0.45)),
      opt("controls", "Capital controls for a few months", "Block the attack.", "Investors hate it.", { run: (s: FixState) => { s.eco.investor = clamp100(s.eco.investor - 4); return "The attack fizzled, but investors will remember the controls."; } }, { run: (s: FixState) => { s.eco.investor = clamp100(s.eco.investor - 7); s.eco.fx *= 1.05; return "Controls leaked and the black market boomed."; } }, () => 0.58),
      opt("bluff", "Call their bluff", "Say you will punish speculators.", "A gamble.", { run: (s: FixState) => { s.gov.trust = clamp100(s.gov.trust + 2); return "The speculators backed off."; } }, { run: (s: FixState) => { s.eco.fx *= 1.1; return "The speculators did not blink. The naira slid."; } }, () => 0.4),
    ], expire: { run: (s: FixState) => { s.eco.fx *= 1.1; return "No response. The naira slid."; } }, expireText: () => "No response." },
  { id: "lateSanction", kind: "global" as const, urgency: 3, title: (s: FixState) => `${rflag(s)} ${rname(s)} threatens trade restrictions`, cause: (s: FixState) => `${rname(s)} says Nigeria is 'distorting markets' and threatens tariffs. Insiders say it is mostly about your rise.`,
    options: [
      opt("talk", "Negotiate quietly", "Offer a few concessions.", "Looks weak at home.", { run: (s: FixState) => { rival(s).rel = clamp100(rival(s).rel + 8); saveW(s, W(s)); return "A deal was struck behind closed doors. Tariffs were shelved."; } }, { run: (s: FixState) => { mod(s, "tariff", "Tariffs on Nigerian goods", { exports: -0.06 }, 12); return "Talks failed and the tariffs came anyway."; } }, (s) => 0.4 + 0.3 * (rival(s).rel / 100)),
      opt("retaliate", "Retaliate in kind", "Tariffs for tariffs.", "Everyone's prices go up.", { run: (s: FixState) => { mod(s, "tariffwar", "Tariff war", { inflation: 0.25, exports: -0.03 }, 12); s.gov.trust = clamp100(s.gov.trust + 2); return "A short tariff war ended in a draw. Nigerians admired your nerve."; } }, { run: (s: FixState) => { mod(s, "tariffwar", "Tariff war", { inflation: 0.4, exports: -0.08 }, 14); return "The tariff war went badly and prices rose."; } }, () => 0.48),
      opt("friends", "Find new markets", "Sell elsewhere.", "Takes time.", { run: (s: FixState) => { mod(s, "newmkts", "New export markets", { exports: 0.06 }, 24); return "Exporters found new customers in Asia and Africa."; } }, { run: (s: FixState) => { mod(s, "tariff", "Tariffs on Nigerian goods", { exports: -0.04 }, 10); return "New markets were slow to open."; } }, () => 0.58),
    ], expire: { run: (s: FixState) => { mod(s, "tariff", "Tariffs on Nigerian goods", { exports: -0.06 }, 12); return "The tariffs arrived."; } }, expireText: () => "The tariffs arrived." },
  { id: "lateCyber", kind: "global" as const, urgency: 3, title: () => "A cyber-attack hits the banks and the grid", cause: (s: FixState) => `Hackers locked bank systems and flickered the grid. Officials suspect a state actor, possibly ${rname(s)}. Nobody can prove it.`,
    options: [
      opt("cyber", "Pay for a national cyber defence", "Build a proper cyber command.", "Costs and secrecy.", { run: (s: FixState) => { s.fin.treasury -= money(s, 30); s.flags.techBoost = Math.min(25, Number(s.flags.techBoost ?? 0) + 1.5); return "Nigeria now has a real cyber command, and a new line in the budget."; } }, { run: (s: FixState) => { s.fin.treasury -= money(s, 30); return "The command was built, but the next attack found a gap."; } }, () => 0.62),
      opt("blame", "Name and shame", "Publish what you know.", "Diplomatic row.", { run: (s: FixState) => { s.gov.trust = clamp100(s.gov.trust + 2); rival(s).rel = clamp100(rival(s).rel - 6); saveW(s, W(s)); return "Nigerians applauded you, and the rival denied everything."; } }, { run: (s: FixState) => { rival(s).rel = clamp100(rival(s).rel - 10); saveW(s, W(s)); s.eco.investor = clamp100(s.eco.investor - 2); return "Without proof, the accusation looked reckless."; } }, () => 0.45),
      opt("quiet", "Fix it quietly", "Patch systems, say little.", "Looks like nothing is happening.", { run: () => "Systems were patched and the story faded." }, { run: (s: FixState) => { s.eco.investor = clamp100(s.eco.investor - 3); return "A second attack hit and the silence looked like negligence."; } }, () => 0.55),
    ], expire: { run: (s: FixState) => { s.eco.investor = clamp100(s.eco.investor - 3); return "A second attack hit."; } }, expireText: () => "A second attack hit." },
  { id: "lateProxy", kind: "insecurity" as const, urgency: 3, title: () => "Foreign money behind the rebels?", cause: (s: FixState) => `Captured fighters carry new weapons and phones paid for from abroad. Intelligence points toward ${rname(s)}. A rising Nigeria is not everyone's friend.`,
    options: [
      opt("expose", "Expose it at the UN", "Make them pay in reputation.", "Needs proof.", { run: (s: FixState) => { rival(s).rel = clamp100(rival(s).rel - 8); saveW(s, W(s)); s.flags.infBoost = Math.min(12, Number(s.flags.infBoost ?? 0) + 0.8); return "A dossier at the UN made headlines. The funding dried up."; } }, { run: (s: FixState) => { s.eco.investor = clamp100(s.eco.investor - 2); return "The dossier was dismissed as thin."; } }, (s) => 0.4 + 0.15 * (s.me.evidence < 40 ? 1 : 0)),
      opt("crack", "Crack down on the rebels", "Hit them before they use the weapons.", "Costly.", { run: (s: FixState) => { s.fin.treasury -= money(s, 40); s.sec.index = Math.max(0, s.sec.index - 4); return "The rebels' new kit was seized. The front quietened."; } }, { run: (s: FixState) => { s.fin.treasury -= money(s, 40); s.sec.index += 3; return "The operation missed. The rebels used what they had."; } }, (s) => 0.4 + 0.3 * (s.mil.strength / 100)),
      opt("deal", "Make a deal with the rival", "Trade quiet for quiet.", "You owe them now.", { run: (s: FixState) => { rival(s).rel = clamp100(rival(s).rel + 10); saveW(s, W(s)); return "The funding stopped. It was never discussed again."; } }, { run: (s: FixState) => { s.gov.trust = clamp100(s.gov.trust - 2); return "The deal leaked and looked shameful."; } }, () => 0.5),
    ], expire: { run: (s: FixState) => { s.sec.index += 3; return "The rebels grew bolder."; } }, expireText: () => "The rebels grew bolder." },
  // era shocks: the whole world is shaken
  { id: "eraRecession", kind: "global" as const, urgency: 3, title: () => "A global recession", cause: () => "Banks fail abroad and demand collapses. Every country is hit. The question is who recovers first.",
    options: [
      opt("stim", "Stimulus: spend your way out", "Roads, jobs and cash.", "Costly.", { run: (s: FixState) => { s.fin.treasury -= money(s, 120); mod(s, "recstim", "Recession stimulus", { jobs: -0.6, sme: 1.2 }, 18); return "Spending kept Nigeria moving while others sank."; } }, { run: (s: FixState) => { s.fin.treasury -= money(s, 120); mod(s, "recstim", "Recession stimulus", { jobs: -0.2 }, 12); return "Stimulus helped less than hoped."; } }, () => 0.6),
      opt("save", "Tighten belts and wait", "Protect the savings.", "Painful at home.", { run: (s: FixState) => { mod(s, "recsave", "Recession austerity", { jobs: 0.4 }, 12); s.eco.investor = clamp100(s.eco.investor + 2); return "Nigeria rode it out with its savings intact."; } }, { run: (s: FixState) => { mod(s, "recsave", "Recession austerity", { jobs: 0.9, sme: -1 }, 18); return "Austerity bit hard and recovery was slow."; } }, () => 0.5),
      opt("buy", "Go bargain hunting abroad", "Buy distressed firms cheaply.", "Risky.", { run: (s: FixState) => { s.fin.treasury -= money(s, 90); s.flags.infBoost = Math.min(12, Number(s.flags.infBoost ?? 0) + 1.2); mod(s, "recbuy", "Bargain buys", { revenue: 18 }, null); return "Nigeria bought stakes in struggling firms and made friends."; } }, { run: (s: FixState) => { s.fin.treasury -= money(s, 90); return "Some bargains were bargains for a reason."; } }, (s) => 0.4 + 0.2 * (s.eco.reserves > 30 ? 1 : 0)),
    ], expire: { run: (s: FixState) => { mod(s, "recsave", "Recession austerity", { jobs: 0.6 }, 12); return "No plan. The recession took its course."; } }, expireText: () => "No plan." },
  { id: "eraPandemic", kind: "global" as const, urgency: 3, title: () => "A new pandemic", cause: () => "A fast-spreading illness crosses the world. Borders close and hospitals fill. How ready is your country?",
    options: [
      opt("lock", "Lock down early", "Hard borders and strict rules.", "The economy stalls.", { run: (s: FixState) => { mod(s, "panlock", "Lockdown", { jobs: 0.7, sme: -1 }, 6); s.gov.happiness = clamp100(s.gov.happiness - 2); s.soc.health = Math.min(100, s.soc.health + 1); return "Early lockdowns kept deaths low and the economy sore."; } }, { run: (s: FixState) => { mod(s, "panlock", "Lockdown", { jobs: 0.9 }, 8); return "The lockdown leaked and the economy suffered all the same."; } }, () => 0.6),
      opt("vac", "Buy vaccines and test everyone", "Spend on science.", "Costly.", { run: (s: FixState) => { s.fin.treasury -= money(s, 80); s.soc.health = Math.min(100, s.soc.health + 3); s.gov.trust = clamp100(s.gov.trust + 3); return "Nigeria got through with fewer deaths and more trust."; } }, { run: (s: FixState) => { s.fin.treasury -= money(s, 80); return "Deliveries were late and spoiled."; } }, (s) => 0.5 + 0.2 * (s.soc.health / 100)),
      opt("open", "Stay open and hope", "Keep the economy going.", "Dangerous.", { run: () => "Lucky: the wave was mild here." }, { run: (s: FixState) => { s.soc.health = Math.max(0, s.soc.health - 4); s.gov.trust = clamp100(s.gov.trust - 4); return "Hospitals overflowed and people blamed you."; } }, () => 0.35),
    ], expire: { run: (s: FixState) => { s.soc.health = Math.max(0, s.soc.health - 3); return "You hesitated. The illness did not."; } }, expireText: () => "You hesitated." },
  { id: "eraAI", kind: "global" as const, urgency: 2, title: () => "The AI revolution", cause: () => "Machines can now do much of what graduates do. A few countries are racing ahead. Nigeria's young population could be a gift or a burden.",
    options: [
      opt("all", "Go all in on AI and skills", "Compute, courses and startups.", "A big bet.", { run: (s: FixState) => { s.fin.treasury -= money(s, 100); s.flags.techBoost = Math.min(25, Number(s.flags.techBoost ?? 0) + 4); mod(s, "ai", "AI economy", { sme: 1.5, exports: 0.05 }, null); return "Nigeria became a hub for AI talent. Rivals took notice."; } }, { run: (s: FixState) => { s.fin.treasury -= money(s, 100); s.flags.techBoost = Math.min(25, Number(s.flags.techBoost ?? 0) + 1.5); return "The bet paid off less than hoped."; } }, (s) => 0.45 + 0.25 * (s.jobs.skills / 100)),
      opt("reg", "Regulate and protect jobs", "Slow it down.", "Falls behind.", { run: (s: FixState) => { s.gov.trust = clamp100(s.gov.trust + 2); return "Workers felt safer and investors felt slower."; } }, { run: (s: FixState) => { s.eco.investor = clamp100(s.eco.investor - 2); return "Regulations were clumsy and startups left."; } }, () => 0.55),
      opt("watch", "Wait and see", "Let others make the mistakes.", "Others pull ahead.", { run: () => "Nothing much happened for a while." }, { run: (s: FixState) => { s.flags.techBoost = Math.max(0, Number(s.flags.techBoost ?? 0) - 1); return "Other countries pulled ahead."; } }, () => 0.5),
    ], expire: { run: (s: FixState) => { s.flags.techBoost = Math.max(0, Number(s.flags.techBoost ?? 0) - 1); return "You waited and the world moved."; } }, expireText: () => "You waited." },
  { id: "eraOilCrash", kind: "global" as const, urgency: 3, title: () => "The oil price collapses", cause: () => "A glut and a technology breakthrough send oil down by half. Producers everywhere are in trouble.",
    options: [
      opt("buffer", "Draw on your savings", "That is what the fund was for.", "Savings fall.", { run: (s: FixState) => { const take = Math.min(s.lend.fund, money(s, 100)); s.lend.fund -= take; s.fin.treasury += take; return `${nb(take)} came out of the savings fund and the budget held.`; } }, { run: (s: FixState) => { s.fin.treasury -= money(s, 20); return "The fund was too small and cuts followed."; } }, (s) => (s.lend.fund > 80 ? 0.8 : 0.4)),
      opt("diversify", "Speed up diversification", "Non-oil exports, now.", "Costly.", { run: (s: FixState) => { s.fin.treasury -= money(s, 60); mod(s, "oildiv", "Diversified economy", { exports: 0.1, manuf: 1 }, 24); return "The non-oil economy picked up the slack."; } }, { run: (s: FixState) => { s.fin.treasury -= money(s, 60); return "Diversification was too slow to matter."; } }, () => 0.55),
      opt("cut", "Cut spending", "Austerity.", "Unpopular.", { run: (s: FixState) => { s.gov.happiness = clamp100(s.gov.happiness - 3); return "The budget balanced and people grumbled."; } }, { run: (s: FixState) => { s.gov.happiness = clamp100(s.gov.happiness - 5); s.rule.streetAnger = clamp100(s.rule.streetAnger + 5); return "The cuts hit hard and crowds appeared."; } }, () => 0.5),
    ], expire: { run: (s: FixState) => { s.fin.treasury -= money(s, 30); return "No plan, and the budget bled."; } }, expireText: () => "No plan." },
  { id: "eraClimate", kind: "global" as const, urgency: 2, title: () => "A climate shock hits the continent", cause: () => "Floods, then drought, then floods again. Crops fail from the Sahel to the Delta. Food prices climb everywhere.",
    options: [
      opt("adapt", "Invest in resilience", "Irrigation, flood walls, seeds.", "Costly.", { run: (s: FixState) => { s.fin.treasury -= money(s, 80); mod(s, "climate", "Climate-proofed farms", { foodSupply: 2, irrigation: 1.5 }, null); return "The investment held. Farms survived what ruined others."; } }, { run: (s: FixState) => { s.fin.treasury -= money(s, 80); return "The walls were built in the wrong places."; } }, () => 0.6),
      opt("import", "Import food and stabilise prices", "Short-term fix.", "Drains dollars.", { run: (s: FixState) => { s.eco.reserves = Math.max(0, s.eco.reserves - 3); mod(s, "climimp", "Emergency imports", { foodPrice: -3 }, 6); return "Imports kept prices down for a season."; } }, { run: (s: FixState) => { s.eco.reserves = Math.max(0, s.eco.reserves - 3); return "Imports arrived late."; } }, () => 0.6),
      opt("hope", "Hope for rain", "Wait.", "Gamble.", { run: () => "The rains returned in time." }, { run: (s: FixState) => { mod(s, "climfail", "Failed harvest", { foodPrice: 6, foodSupply: -3 }, 9); return "The harvest failed. Prices spiked."; } }, () => 0.35),
    ], expire: { run: (s: FixState) => { mod(s, "climfail", "Failed harvest", { foodPrice: 5, foodSupply: -2 }, 8); return "The harvest failed."; } }, expireText: () => "The harvest failed." },
  { id: "eraColdWar", kind: "global" as const, urgency: 3, title: () => "A new cold war between the giants", cause: () => "Washington and Beijing stop talking. Supply chains split and everyone is asked who they are with.",
    options: [
      opt("hub", "Become the neutral hub", "Trade with both, host talks.", "Walks a tightrope.", { run: (s: FixState) => { s.flags.infBoost = Math.min(12, Number(s.flags.infBoost ?? 0) + 1.5); mod(s, "hub", "Neutral trade hub", { exports: 0.08, investor: 1.5 }, null); return "Nigeria became the place where both sides could do business."; } }, { run: (s: FixState) => { s.foreign.rel.usa = clamp100(s.foreign.rel.usa - 4); s.foreign.rel.china = clamp100(s.foreign.rel.china - 4); return "Both sides distrusted the middle."; } }, () => 0.5),
      opt("arm", "Arm up", "Strength keeps the peace.", "Costly.", { run: (s: FixState) => { s.fin.treasury -= money(s, 80); s.flags.milBoost = Math.min(25, Number(s.flags.milBoost ?? 0) + 3); return "A stronger army was a good insurance."; } }, { run: (s: FixState) => { s.fin.treasury -= money(s, 80); return "The new kit sat in the depot."; } }, () => 0.65),
      opt("quiet", "Keep your head down", "Let them fight.", "Opportunities pass.", { run: () => "Nigeria stayed out of it, mostly." }, { run: (s: FixState) => { s.eco.investor = clamp100(s.eco.investor - 2); return "Investors went elsewhere."; } }, () => 0.55),
    ], expire: { run: () => "You said nothing and the cold war went on without you." }, expireText: () => "You said nothing." },
];

// ------------------------------------------------------------------------------------------------ what triggers what
interface LateRule { tpl: string; w: (s: FixState, tier: number) => number }
const RULES: LateRule[] = [
  { tpl: "lateStrongNaira", w: (s) => (s.eco.fx < s.baseline.fx * 0.55 ? 3 : 0) },
  { tpl: "lateHousing", w: (s, t) => (t >= 1 && gdpUsd(s) > 1200 ? 2 : 0) },
  { tpl: "lateInequality", w: (s, t) => (t >= 2 ? 2 : 0) },
  { tpl: "lateAutomation", w: (s, t) => (t >= 1 && s.jobs.skills > 55 ? 2 : 0) },
  { tpl: "lateMigrants", w: (s, t) => (t >= 2 ? 2 : 0) },
  { tpl: "lateBloc", w: (s, t) => (t >= 3 ? 3 : 0) },
  { tpl: "lateCurrency", w: (s, t) => (t >= 2 ? 2 : 0) },
  { tpl: "lateSanction", w: (s, t) => (t >= 3 ? 3 : 0) },
  { tpl: "lateCyber", w: (s, t) => (t >= 1 ? 1.5 : 0) },
  { tpl: "lateProxy", w: (s, t) => (t >= 2 ? 1.5 : 0) },
];
const ERAS = ["eraRecession", "eraPandemic", "eraAI", "eraOilCrash", "eraClimate", "eraColdWar"] as const;
const open = (s: FixState, t: string) => s.events.some((e) => e.tpl === t && e.status === "open");

/** applies an era shock to every country; the player's choice decides how Nigeria copes */
function eraShock(s: FixState, id: string, rng: Rng) {
  const w = W(s);
  for (const c of w.c) {
    const hit = id === "eraRecession" || id === "eraPandemic" ? 0.8 : id === "eraOilCrash" ? (["sa", "ru", "ae", "br", "ca"].includes(c.id) ? 0.9 : 0.1) : id === "eraClimate" ? (["africa", "asia"].includes(c.region) ? 0.7 : 0.2) : id === "eraAI" ? 0 : 0.3;
    if (rng.chance(hit)) c.slump = s.month + (id === "eraPandemic" ? 10 : 16);
    if (id === "eraAI") c.tech = clamp100(c.tech + 3 * (c.tech / 100) + rng.next() * 2);
    if (id === "eraColdWar") for (const k of ["us", "cn", "ru"]) if (c.id === k) c.trend.mil += 0.3;
    c.baseG = clamp(c.baseG + 0.1, 0, 8.5);
  }
  if (id === "eraOilCrash") s.eco.oilPrice *= 0.65;
  w.era += 1; w.eraLog.push({ month: s.month, text: ERA_NAME[id] }); saveW(s, w);
}
export const ERA_NAME: Record<string, string> = { eraRecession: "Global recession", eraPandemic: "New pandemic", eraAI: "The AI revolution", eraOilCrash: "Oil price collapse", eraClimate: "Climate shock", eraColdWar: "A new cold war" };

export function lateMonthly(s: FixState, rng: Rng) {
  const w = W(s); const tier = w.tier;
  fundMonthly(s, rng); megaMonthly(s); blocMonthly(s);
  if (s.month < 24) return;
  // the world is shaken every three to five years
  if (!s.flags.eraNext) s.flags.eraNext = s.month + rng.int(30, 54);
  if (s.month >= Number(s.flags.eraNext) && !ERAS.some((e) => open(s, e))) {
    const used = w.eraLog.map((l) => l.text); const pool = ERAS.filter((e) => !used.slice(-3).includes(ERA_NAME[e]));
    const id = rng.pick(pool.length ? pool : ERAS);
    eraShock(s, id, rng); s.flags.eraNext = s.month + rng.int(36, 60); s.flags.lateAt = s.month;
    pushNews(s, { source: `${id}:${s.month}`, headline: `${ERA_NAME[id]} shakes the world`, body: "Every country is hit. Rankings will move.", tone: "bad" });
    createEvent(s, id, "NG-FC"); return;
  }
  // success makes enemies and problems
  const since = s.month - Number(s.flags.lateAt ?? -99);
  if (since < 4 || tier < 1 && s.eco.fx >= s.baseline.fx * 0.55) return;
  if (!rng.chance(clamp(0.05 + 0.035 * tier, 0.05, 0.22))) return;
  const pool = RULES.map((r) => ({ r, w: r.w(s, tier) })).filter((x) => x.w > 0 && !open(s, x.r.tpl));
  if (!pool.length) return;
  const tot = pool.reduce((a, b) => a + b.w, 0); let x = rng.next() * tot, i = 0; for (; i < pool.length - 1; i++) { x -= pool[i].w; if (x <= 0) break; }
  const rows = league(s); const me = rows.findIndex((r) => r.me); const rv = rows[Math.max(0, me - 1)]?.id !== "NG" && me > 0 ? rows[me - 1] : rows[Math.min(rows.length - 1, me + 1)];
  s.flags.lateRival = rv.id; s.flags.lateAt = s.month;
  createEvent(s, pool[i].r.tpl, "NG-FC");
}

// ------------------------------------------------------------------------------------------------ the sovereign fund
export const FUND_STYLES = [
  { id: "safe", label: "Safe", blurb: "Bonds. Slow and steady.", mean: 0.0033, sd: 0.002 },
  { id: "balanced", label: "Balanced", blurb: "A mix of stocks and bonds.", mean: 0.0055, sd: 0.012 },
  { id: "bold", label: "Bold", blurb: "Stocks, startups and land. Big swings.", mean: 0.0085, sd: 0.032 },
] as const;
export const fundStyle = (s: FixState) => FUND_STYLES.find((f) => f.id === String(s.flags.fundStyle ?? "safe")) ?? FUND_STYLES[0];
export function setFundStyle(s: FixState, id: string): { ok: boolean; message: string } { if (!FUND_STYLES.some((f) => f.id === id)) return { ok: false, message: "Unknown." }; s.flags.fundStyle = id; return { ok: true, message: `The fund will invest in a ${id} way.` }; }
function fundMonthly(s: FixState, rng: Rng) {
  if (s.lend.fund <= 0) return;
  const st = fundStyle(s); if (st.id === "safe") return; // the lending module pays the safe 4%
  const shock = W(s).c.filter((c) => c.slump).length / 22;
  const r = st.mean - 0.0033 + rng.normal(0, st.sd) - shock * 0.012;
  s.lend.fund = Math.max(0, s.lend.fund * (1 + r));
  s.flags.fundPeak = Math.max(Number(s.flags.fundPeak ?? 0), s.lend.fund);
  if (r < -0.04 && s.lend.fund > 100) pushNews(s, { source: `fundloss:${s.month}`, headline: "Nigeria's sovereign fund has a bad month", body: "Markets fell and the bold portfolio fell harder.", tone: "bad" });
}

// ------------------------------------------------------------------------------------------------ mega-projects, forever
export interface Mega { id: string; icon: string; name: string; blurb: string; cost: number; months: number; need?: (s: FixState) => string | null; after?: string; done: (s: FixState, level: number) => string }
const boost = (s: FixState, k: "techBoost" | "milBoost" | "infBoost", v: number, cap: number) => { s.flags[k] = Math.min(cap, Number(s.flags[k] ?? 0) + v); };
export const MEGAS: Mega[] = [
  { id: "university", icon: "🎓", name: "A world-class university", blurb: "Labs, scholars and a campus people cross oceans for.", cost: 250, months: 30, done: (s, l) => { boost(s, "techBoost", 4 / l, 25); s.jobs.skills = Math.min(100, s.jobs.skills + 2 / l); return "Students from three continents enrol. Nigeria's skills score rises."; } },
  { id: "capital", icon: "🏙️", name: "A new capital city", blurb: "A planned, smart city built from nothing.", cost: 900, months: 48, need: (s) => (s.eco.gdpIdx >= 140 ? null : "The economy must be bigger first."), done: (s, l) => { boost(s, "infBoost", 2.5 / l, 25); addMod(s, `mega:capital:${l}`, "A new capital", { jobs: -0.6, sme: 1 }, { duration: null, ramp: 4 }); return "Ministers move in and the cameras follow. Nigeria looks like a country of the future."; } },
  { id: "rail", icon: "🚄", name: "Lagos–Kano bullet train", blurb: "Fast rail across the country.", cost: 700, months: 40, need: (s) => (s.infra.rail >= 25 ? null : "Build ordinary railways first."), done: (s, l) => { addMod(s, `mega:rail:${l}`, "Bullet train", { rail: 3, jobs: -0.5, exports: 0.05 }, { duration: null, ramp: 3 }); boost(s, "infBoost", 1 / l, 25); return "The first fast train glides north. Cities that were days apart are hours apart."; } },
  { id: "nuclear", icon: "⚛️", name: "A nuclear power fleet", blurb: "Clean baseload that never sleeps.", cost: 600, months: 54, need: (s) => (s.jobs.skills >= 50 ? null : "You need skilled engineers first."), done: (s, l) => { addMod(s, `mega:nuclear:${l}`, "Nuclear power", { power: 4, grid: 1, maint: 1 }, { duration: null, ramp: 4 }); boost(s, "techBoost", 2 / l, 25); return "The first reactor comes online and the lights stay on."; } },
  { id: "space", icon: "🚀", name: "A national space programme", blurb: "Satellites, launches and national pride.", cost: 400, months: 36, need: (s) => (s.jobs.skills >= 55 ? null : "You need more skilled people first."), done: (s, l) => { boost(s, "techBoost", 4 / l, 25); boost(s, "infBoost", 3 / l, 25); s.gov.happiness = clamp100(s.gov.happiness + 2); return "A Nigerian rocket reaches orbit. Children draw rockets instead of cars."; } },
  { id: "olympics", icon: "🏟️", name: "Host the Olympic Games", blurb: "The whole world watches Lagos.", cost: 300, months: 36, need: (s) => (myRank(s) <= 12 ? null : "The bid committee wants a top-12 nation."), done: (s, l) => { boost(s, "infBoost", 3 / l, 25); s.gov.happiness = clamp100(s.gov.happiness + 4); addMod(s, `mega:games:${l}`, "Games legacy", { sme: 1, exports: 0.03 }, { duration: 24, ramp: 2 }); return "Four billion people watched Nigeria host the world. The jollof ran out on the second day."; } },
  { id: "moon", icon: "🌙", name: "A Moon base", blurb: "Africa's first outpost on the Moon.", cost: 1400, months: 60, after: "space", done: (s, l) => { boost(s, "techBoost", 5 / l, 25); boost(s, "infBoost", 4 / l, 25); return "Nigerians step onto the Moon. The league table shakes."; } },
  { id: "fusion", icon: "☀️", name: "A fusion pilot plant", blurb: "Limitless clean energy, if it works.", cost: 1600, months: 66, after: "nuclear", done: (s, l) => { addMod(s, `mega:fusion:${l}`, "Fusion power", { power: 6, grid: 2 }, { duration: null, ramp: 4 }); boost(s, "techBoost", 5 / l, 25); return "A glowing plasma ring hums in Kaduna. Energy suddenly feels cheap."; } },
  { id: "bank", icon: "🏛️", name: "An African Development Bank of your own", blurb: "Lend across the continent in naira.", cost: 800, months: 36, need: (s) => (myRank(s) <= 10 ? null : "Only a top-10 power can start a world-class bank."), done: (s, l) => { boost(s, "infBoost", 3 / l, 25); addMod(s, `mega:bank:${l}`, "Pan-African bank", { revenue: 25, investor: 1 }, { duration: null, ramp: 3 }); return "Loans in naira flow from Lagos to Nairobi. Africa starts doing sums in your currency."; } },
];
export const MEGA_BY_ID = Object.fromEntries(MEGAS.map((m) => [m.id, m])) as Record<string, Mega>;
export interface MegaRun { id: string; level: number; start: number; spent: number; paused?: boolean }
export const megas = (s: FixState): { run: MegaRun[]; done: Record<string, number> } => { try { return JSON.parse(String(s.flags.mega ?? "")) as { run: MegaRun[]; done: Record<string, number> }; } catch { return { run: [], done: {} }; } };
const saveMegas = (s: FixState, m: { run: MegaRun[]; done: Record<string, number> }) => { s.flags.mega = JSON.stringify(m); };
export const megaLevel = (s: FixState, id: string) => (megas(s).done[id] ?? 0) + 1;
export const megaCost = (s: FixState, m: Mega) => Math.round(m.cost * Math.pow(1.7, megaLevel(s, m.id) - 1) * (0.6 + 0.4 * s.eco.priceLevel / 100));
export function megaBlock(s: FixState, m: Mega): string | null {
  const st = megas(s); if (st.run.some((r) => r.id === m.id)) return "Already under way.";
  if (st.run.length >= 3) return "Three mega-projects at a time is the limit.";
  if (m.after && !(st.done[m.after] > 0)) return `Needs the ${MEGA_BY_ID[m.after].name.toLowerCase()} first.`;
  const n = m.need?.(s); if (n) return n;
  if (s.fin.treasury < megaCost(s, m) / m.months * 3) return "Not enough cash to even start.";
  return null;
}
export function startMega(s: FixState, id: string): { ok: boolean; message: string } {
  const m = MEGA_BY_ID[id]; if (!m) return { ok: false, message: "Unknown." }; const b = megaBlock(s, m); if (b) return { ok: false, message: b };
  const err = payPc(s, 4, "launch a mega-project"); if (err) return { ok: false, message: err };
  const st = megas(s); st.run.push({ id, level: megaLevel(s, id), start: s.month, spent: 0 }); saveMegas(s, st);
  return { ok: true, message: `${m.name}${megaLevel(s, id) > 1 ? ` (level ${megaLevel(s, id)})` : ""} is under way. It will take about ${Math.round(m.months / 12 * 10) / 10} years.` };
}
export function cancelMega(s: FixState, id: string): { ok: boolean; message: string } { const st = megas(s); st.run = st.run.filter((r) => r.id !== id); saveMegas(s, st); return { ok: true, message: "The project is cancelled. What was spent is gone." }; }
function megaMonthly(s: FixState) {
  const st = megas(s); if (!st.run.length) return;
  for (const r of [...st.run]) {
    const m = MEGA_BY_ID[r.id]; const total = m.cost * Math.pow(1.7, r.level - 1) * (0.6 + 0.4 * s.eco.priceLevel / 100); const step = total / m.months;
    if (s.fin.treasury < step) { r.paused = true; continue; }
    r.paused = false; s.fin.treasury -= step; r.spent += step;
    if (r.spent >= total * 0.999) {
      st.run = st.run.filter((x) => x !== r); st.done[r.id] = r.level;
      const text = m.done(s, r.level);
      pushNews(s, { source: `mega:${r.id}:${r.level}`, headline: `${m.name}${r.level > 1 ? ` II`.replace("II", ["", "II", "III", "IV", "V"][r.level - 1] ?? String(r.level)) : ""} is complete`, body: text, tone: "good" });
      s.timeline.push({ month: s.month, title: `${m.name} complete`, text, tone: "good", chain: "mega" });
    }
  }
  saveMegas(s, st);
}

// ------------------------------------------------------------------------------------------------ blocs and the naira
export const blocShare = (s: FixState) => { const w = W(s); const tot = w.c.reduce((a, c) => a + Math.log10(c.gdp), 0); return Math.round(w.naira.reduce((a, id) => a + Math.log10(w.c.find((c) => c.id === id)?.gdp ?? 10), 0) / tot * 100); };
export const NAIRA_STEPS = [{ at: 8, label: "A regional currency", text: "Traders from Accra to Douala start quoting prices in naira." }, { at: 20, label: "A major trade currency", text: "Banks in London and Dubai open naira desks." }, { at: 34, label: "A rival to the dollar", text: "Central banks hold naira in their reserves. The dollar is no longer alone." }] as const;
function blocMonthly(s: FixState) {
  const w = W(s); if (!w.naira.length) return;
  const share = blocShare(s); const hit = Number(s.flags.nairaStep ?? 0);
  if (hit < NAIRA_STEPS.length && share >= NAIRA_STEPS[hit].at) {
    s.flags.nairaStep = hit + 1; const st = NAIRA_STEPS[hit];
    pushNews(s, { source: `naira:${hit}`, headline: `The naira becomes: ${st.label.toLowerCase()}`, body: st.text, tone: "good" });
    s.timeline.push({ month: s.month, title: `The naira: ${st.label.toLowerCase()}`, text: st.text, tone: "good", chain: "naira" });
    addMod(s, `naira:${hit}`, `Naira: ${st.label.toLowerCase()}`, { investor: 1.5 + hit, revenue: 18 + 20 * hit, inflation: -0.1 }, { duration: null, ramp: 4 });
    s.eco.fx = Math.max(60, s.eco.fx * 0.93);
    if (hit === 2) { w.reserve = true; saveW(s, w); s.flags.infBoost = Math.min(25, Number(s.flags.infBoost ?? 0) + 4); }
  }
}
