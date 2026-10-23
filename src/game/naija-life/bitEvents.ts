import { I, bump, luckBonus } from "./helpers";
import { transact } from "./ledger";
import { talentOf, TALENTS, groupOf, GROUPS } from "./bitlife";
import type { EventDef, Player } from "./types";
import { T, chance, clamp, dual, naira } from "./util";

const pay = (q: Player, amt: number, why: string) => { const a = Math.min(Math.max(0, q.money), Math.round(amt)); if (a > 0) transact(q, { amount: -a, reason: why, category: "event" }); return a; };
const earn = (q: Player, amt: number, why: string) => { const a = Math.round(amt); transact(q, { amount: a, reason: why, category: "event" }); return a; };
const broke = (p: Player, amt: number) => (p.money < amt ? T("Not enough cash", "Cash no reach") : false);

const talentName = (p: Player) => { const t = TALENTS.find((x) => x.id === talentOf(p).kind); return t ? T(t.en.toLowerCase(), t.pcm.toLowerCase()) : ""; };

export const BIT_EVENTS: EventDef[] = [
  // -------- Talents --------
  {
    id: "talent_discovered", title: dual("A hidden talent", "Hidden talent"),
    weight: (p) => (p.age >= 7 && p.age <= 22 && !p.flags.talentKind && !p.flags.talentOffered ? 1.4 : 0),
    text: () => T("Everyone says you have something special. A teacher, a cousin and a stranger at church all said the same thing this month.", "Everybody say you get something special. Teacher, cousin and stranger for church talk the same thing this month."),
    choices: () => TALENTS.slice(0, 5).map((t) => ({ label: `${t.emoji} ${T(t.en, t.pcm)}`, sub: T(t.blurb[0], t.blurb[1]), run: (q: Player) => { q.flags.talentKind = t.id; q.flags.talentLvl = 8; q.flags.talentOffered = true; return T(`You start taking ${t.en.toLowerCase()} seriously. Visit Work, then Talent, to train.`, `You start to take ${t.pcm.toLowerCase()} serious. Go Work, then Talent, to train.`); } })).concat([{ label: T("Not for me", "No be for me"), sub: undefined, run: (q: Player) => { q.flags.talentOffered = true; return T("You shrug it off. Maybe later.", "You shrug am. Maybe later."); } } as never]),
  },
  {
    id: "talent_audition", title: dual("The audition", "The audition"),
    weight: (p) => (talentOf(p).kind && talentOf(p).level >= 35 && p.age >= 14 && !p.flags.auditionAge ? 3 : 0),
    text: (p) => T(`Word is going round: there is a big ${talentName(p)} audition in Lagos and the judges are the real deal.`, `Gist dey go round: big ${talentName(p)} audition dey Lagos and the judges na real deal.`),
    choices: (p) => [
      { label: T("Go all in", "Go all in"), sub: naira(I(p, 150_000)), disabled: broke(p, I(p, 150_000)), run: (q) => { pay(q, I(q, 150_000), T("Audition costs", "Audition costs")); q.flags.auditionAge = q.age; const lvl = talentOf(q).level; if (chance(clamp(lvl / 110 + luckBonus(q), 0.1, 0.85))) { bump(q, "reputation", 8); bump(q, "happiness", 9); bump(q, "connections", 6); q.flags.talentLvl = Math.min(100, lvl + 12); return T("The judges stand up. You are through, and everyone is talking about it.", "Judges stand up. You pass, and everybody dey talk about am."); } bump(q, "happiness", -5); q.flags.talentLvl = Math.min(100, lvl + 4); return T("A harsh 'no' on live TV. It stings, but you learn more than you expected.", "Harsh 'no' for live TV. E pain, but you learn pass wetin you expect."); } },
      { label: T("Go with a friend, no pressure", "Go with friend, no pressure"), sub: naira(I(p, 30_000)), run: (q) => { pay(q, I(q, 30_000), T("Audition costs", "Audition costs")); q.flags.auditionAge = q.age; q.flags.talentLvl = Math.min(100, talentOf(q).level + 5); return T("You enjoy the day and meet useful people.", "You enjoy the day and meet useful people."); } },
      { label: T("Skip it", "Skip am"), run: (q) => { q.flags.auditionAge = q.age; return T("You tell yourself next year.", "You tell yourself say next year."); } },
    ],
  },
  {
    id: "school_talent_show", title: dual("Talent show", "Talent show"),
    weight: (p) => (p.school && p.age >= 8 && p.age <= 20 && talentOf(p).kind ? 2 : 0),
    text: (p) => T(`Your school is holding a talent show. The whole school will watch your ${talentName(p)}.`, `Your school dey hold talent show. The whole school go watch your ${talentName(p)}.`),
    choices: () => [
      { label: T("Perform", "Perform"), run: (q) => { const l = talentOf(q).level; if (chance(0.35 + l / 160)) { bump(q, "reputation", 4); bump(q, "happiness", 6); q.flags.talentLvl = Math.min(100, l + 4); return T("Standing ovation. The headmaster claps the loudest.", "Standing ovation. Headmaster clap pass."); } bump(q, "happiness", -4); return T("The mic fails and you freeze. Someone films it.", "Mic fail and you freeze. Person film am."); } },
      { label: T("Stay in the crowd", "Stay for crowd"), run: () => T("You clap for the others and keep your secret a bit longer.", "You clap for others and keep your secret small more.") },
    ],
  },
  // -------- Lottery --------
  {
    id: "jackpot_relatives", title: dual("Relatives you have never met", "Relatives wey you never see"),
    weight: () => 0,
    text: () => T("News of your jackpot travelled faster than light. Cousins you have never met are suddenly 'visiting', and a pastor is 'led' to call you.", "Gist of your jackpot waka pass light. Cousins wey you never see dey 'visit', and pastor dey 'led' to call you."),
    choices: (p) => [
      { label: T("Share with the family", "Share with family"), sub: naira(I(p, 10_000_000)), disabled: broke(p, I(p, 10_000_000)), run: (q) => { pay(q, I(q, 10_000_000), T("Sharing a windfall", "Share windfall")); q.family.happy = clamp(q.family.happy + 12); bump(q, "reputation", 8); return T("They sing your praise. Some of them even mean it.", "Dem sing your praise. Some of dem even mean am."); } },
      { label: T("Give a little and stay quiet", "Give small and keep quiet"), sub: naira(I(p, 1_000_000)), disabled: broke(p, I(p, 1_000_000)), run: (q) => { pay(q, I(q, 1_000_000), T("Quiet gifts", "Quiet gifts")); bump(q, "reputation", 2); return T("You hand out envelopes at the gate and shut it.", "You share envelope for gate and close am."); } },
      { label: T("Change your number", "Change your number"), run: (q) => { q.family.happy = clamp(q.family.happy - 8); bump(q, "reputation", -3); return T("Peace and quiet, and a family group chat that hates you.", "Peace and quiet, and family group chat wey hate you."); } },
    ],
  },
  // -------- Local groups --------
  {
    id: "areaboys_invite", title: dual("The boys at the junction", "Boys for junction"),
    weight: (p) => (p.age >= 15 && p.age <= 30 && !groupOf(p) && p.money < I(p, 800_000) ? 0.9 : 0),
    text: () => T("A group of Area Boys at the junction know your name. \"You are one of us, we will protect you. Just pay your dues.\"", "Group of Area Boys for junction sabi your name. \"You be one of us, we go protect you. Just pay your dues.\""),
    choices: () => [
      { label: T("Join them", "Join dem"), sub: T("Regular money, regular trouble", "Regular money, regular wahala"), run: (q) => { q.flags.group = "areaboys"; bump(q, "reputation", -6); return T("You are one of the boys now. The junction is yours, and the police know it.", "You don be one of the boys. The junction na your own, and police sabi am."); } },
      { label: T("Pay a small 'gift' and stay out", "Pay small 'gift' stay out"), sub: T("₦20,000", "₦20,000"), run: (q) => { pay(q, I(q, 20_000), T("A 'gift' at the junction", "'Gift' for junction")); return T("They respect you, and let you pass.", "Dem respect you, and let you pass."); } },
      { label: T("Take another road", "Take another road"), run: (q) => { bump(q, "stress", 3); return T("Longer trip, calmer mind.", "Longer trip, calm mind."); } },
    ],
  },
  {
    id: "cult_invite", title: dual("The confraternity", "The confraternity"),
    weight: (p) => (p.school && p.age >= 16 && p.age <= 26 && p.school.stage === "tertiary" && !groupOf(p) ? 1.2 : 0),
    text: () => T("A senior on campus pulls you aside. \"We look after our own. Free hostel space, protection, good connections. You just have to be one of us.\"", "Senior for campus pull you aside. \"We dey look after our own. Free hostel space, protection, good connections. You just dey be one of us.\""),
    choices: () => [
      { label: T("Join", "Join"), sub: T("Connections, danger, hard to leave", "Connections, danger, hard to leave"), run: (q) => { q.flags.group = "cult"; bump(q, "connections", 8); bump(q, "reputation", -8); return T("The oath is quick and serious. Doors open, and eyes follow you.", "Oath quick and serious. Doors open, and eyes dey follow you."); } },
      { label: T("Politely refuse", "Refuse politely"), run: (q) => { if (chance(0.25)) { bump(q, "health", -10); bump(q, "stress", 6); return T("They do not take it well. A scare, a few bruises.", "Dem no take am well. Small scare, small bruise."); } return T("They shrug. 'Think about it.'", "Dem shrug. 'Think am.'"); } },
      { label: T("Report it to the school", "Report to school"), run: (q) => { bump(q, "reputation", 3); bump(q, "stress", 8); return T("The school takes notes and does nothing. You watch your back for months.", "School take notes and do nothing. You dey watch your back for months."); } },
    ],
  },
  {
    id: "thugs_invite", title: dual("Election season offer", "Election season offer"),
    weight: (p) => (p.age >= 18 && p.age <= 40 && !groupOf(p) && p.money < I(p, 2_000_000) ? 0.8 : 0),
    text: () => T("A politician's aide offers cash and a bike to 'mobilise' on election day. \"Just be there when we need you.\"", "Politician aide offer cash and bike to 'mobilise' for election day. \"Just dey there when we need you.\""),
    choices: () => [
      { label: T("Take the job", "Take the job"), sub: T("Good money, bad name", "Good money, bad name"), run: (q) => { q.flags.group = "thugs"; bump(q, "reputation", -7); return T("You are the politician's boy now. The money is steady and the work is ugly.", "You don be politician boy. Money steady and work ugly."); } },
      { label: T("Take the cash, do nothing", "Take cash, do nothing"), run: (q) => { earn(q, I(q, 80_000), T("Election cash", "Election cash")); if (chance(0.4)) { bump(q, "stress", 6); return T("They notice. Your phone rings at night.", "Dem notice. Your phone dey ring for night."); } return T("Nobody checks.", "Nobody check."); } },
      { label: T("Refuse", "Refuse"), run: (q) => { bump(q, "reputation", 2); return T("You vote, you go home, you sleep fine.", "You vote, you go house, you sleep well."); } },
    ],
  },
  {
    id: "group_quit", title: dual("Time to leave?", "E don reach time to leave?"),
    weight: (p) => (groupOf(p) && p.prison === 0 ? 2 : 0),
    text: (p) => T(`You have been with the ${GROUPS[groupOf(p)]?.en.toLowerCase() ?? "group"} for a while. Is this the life you want?`, `You don dey with ${GROUPS[groupOf(p)]?.pcm.toLowerCase() ?? "the group"} for some time. This na the life you want?`),
    choices: (p) => [
      { label: T("Stay", "Stay"), run: () => T("You stay. You tell yourself it is for the money.", "You stay. You tell yourself say na for money.") },
      { label: T("Leave quietly", "Leave quietly"), sub: groupOf(p) === "cult" ? T("Risky: they do not let go easily", "Risky: dem no dey let go easy") : undefined, run: (q) => { const risk = groupOf(q) === "cult" ? 0.35 : 0.15; delete q.flags.group; if (chance(risk)) { bump(q, "health", -20); bump(q, "stress", 10); return T("They make sure you remember the way out. You are free, and sore.", "Dem make sure you remember the way out. You free, and you dey pain."); } bump(q, "happiness", 6); bump(q, "reputation", 3); return T("You walk away. Nobody follows.", "You waka go. Nobody follow."); } },
    ],
  },
  // -------- Prison extras --------
  {
    id: "prison_fight", title: dual("A fight in the yard", "Fight for yard"),
    weight: (p) => (p.prison > 0 ? 2.2 : 0),
    text: () => T("A big inmate demands your food. The yard goes quiet. Everyone is watching.", "Big inmate demand your food. The yard quiet. Everybody dey watch."),
    choices: () => [
      { label: T("Fight back", "Fight back"), run: (q) => { if (chance(0.45 + q.stats.fitness / 250)) { bump(q, "reputation", 3); bump(q, "health", -6); return T("You win, bruised. Nobody tries you again.", "You win, with bruise. Nobody try you again."); } bump(q, "health", -22); bump(q, "stress", 8); return T("You lose badly. Two weeks in the infirmary.", "You lose badly. Two weeks for infirmary."); } },
      { label: T("Give him the food", "Give am the food"), run: (q) => { bump(q, "stress", 5); bump(q, "happiness", -4); return T("You eat less and stay safe.", "You chop small and stay safe."); } },
      { label: T("Pay a senior inmate for protection", "Pay senior inmate for protection"), sub: T("₦50,000", "₦50,000"), run: (q) => { pay(q, I(q, 50_000), T("Protection in prison", "Protection for prison")); bump(q, "stress", -3); return T("'You are under me now.' The big man finds someone else.", "'You dey under me now.' Big man find another person."); } },
    ],
  },
  {
    id: "prison_riot", title: dual("Riot in the prison", "Riot for prison"),
    weight: (p) => (p.prison > 1 ? 1.1 : 0),
    text: () => T("Overcrowding, bad food and no water. The inmates start banging plates. Smoke comes from the next block.", "Overcrowding, bad food and no water. Inmates start to bang plate. Smoke dey come from next block."),
    choices: () => [
      { label: T("Join the protest", "Join the protest"), run: (q) => { if (chance(0.5)) { q.prison += 1; bump(q, "reputation", -4); bump(q, "health", -8); return T("The warders respond with force. A year is added to your sentence.", "Warders respond with force. Dem add one year to your sentence."); } bump(q, "happiness", 4); return T("The prison promises changes. Some even happen.", "Prison promise changes. Some even happen."); } },
      { label: T("Hide in your cell", "Hide for your cell"), run: (q) => { bump(q, "stress", 7); return T("You wait it out with your hands over your head.", "You wait am out with your hand for head."); } },
    ],
  },
  {
    id: "prison_escape", title: dual("The escape plan", "Escape plan"),
    weight: (p) => (p.prison > 2 ? 0.8 : 0),
    text: () => T("An inmate says a warder can be paid to look away on the night of the next power cut. \"You in?\"", "Inmate talk say warder fit collect money to look another side for night of next power cut. \"You dey inside?\""),
    choices: (p) => [
      { label: T("Try to escape", "Try escape"), sub: naira(I(p, 500_000)), disabled: broke(p, I(p, 500_000)), run: (q) => { pay(q, I(q, 500_000), T("Paid the warder", "Pay warder")); if (chance(0.35 + luckBonus(q))) { q.prison = 0; q.flags.wanted = true; q.crime.heat = 100; bump(q, "reputation", -10); return T("You slip over the wall in the dark. You are free, and you are wanted. Police will not forget.", "You jump the wall for dark. You free, and dem dey find you. Police no go forget."); } q.prison += 3; bump(q, "health", -15); return T("You are caught at the fence. Three more years, and a beating.", "Dem catch you for fence. Three more years, and beating."); } },
      { label: T("Refuse", "Refuse"), run: () => T("Not worth it. You serve your time.", "E no worth am. You serve your time.") },
      { label: T("Tell the warder", "Tell the warder"), run: (q) => { bump(q, "reputation", -2); if (chance(0.3)) { q.prison = Math.max(1, q.prison - 1); return T("The warder is grateful. A year comes off for 'good conduct'.", "Warder grateful. Dem remove one year for 'good conduct'."); } return T("Nothing happens, except inmates now dislike you.", "Nothing happen, apart say inmates no like you again."); } },
    ],
  },
  // -------- Prenup --------
  {
    id: "prenup", title: dual("A prenuptial agreement", "Prenup"),
    weight: () => 0,
    text: () => T("Your lawyer says, with your assets, you should think about a prenup. \"It protects you both.\"", "Your lawyer talk say, with your assets, you suppose think about prenup. \"E protect una both.\""),
    choices: (p) => [
      { label: T("Sign a prenup", "Sign prenup"), sub: naira(I(p, 400_000)), disabled: broke(p, I(p, 400_000)), run: (q) => { pay(q, I(q, 400_000), T("Lawyer for the prenup", "Lawyer for prenup")); q.flags.prenup = true; if (q.spouse) q.spouse.happy = clamp(q.spouse.happy - 8); return T("Your assets are protected. Your partner is quiet for the rest of dinner.", "Your assets protected. Your partner quiet for the rest of dinner."); } },
      { label: T("Trust each other", "Trust each other"), run: (q) => { if (q.spouse) q.spouse.happy = clamp(q.spouse.happy + 6); return T("You decide love does not need paperwork. Hopefully.", "You decide say love no need paper. Hopefully."); } },
    ],
  },
];

