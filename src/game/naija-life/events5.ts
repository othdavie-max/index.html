import { HOME_TIERS, HOUSE_KINDS, STATE_BY_ID } from "./data";
import { capacityOf, evaluateSupport, newInformalLoan, npcAge, npcsByRole, primaryProvider, remember } from "./family";
import { I, bump, eligibleJobs, luckBonus, stateOf } from "./helpers";
import { monthIndex, transact } from "./ledger";
import { borrowFrom, giftTo, lendTo, resolveInformalLoan } from "./loans";
import type { Choice, EventData, EventDef, House, Npc, Player } from "./types";
import { VEHICLE_MODELS, addVehicle } from "./vehicles";
import { moveHomeToFamily, rentPlace } from "./world";
import { T, chance, clamp, dual, naira, pick, rand, randInt, uid, weightedPick } from "./util";

const NEIGHBOURHOOD: Record<string, string> = { lagos: "Lekki", abuja: "Maitama", rivers: "GRA Port Harcourt", oyo: "Bodija, Ibadan", kano: "Nassarawa GRA", enugu: "Independence Layout" };
const first = (n: Npc | null | undefined) => (n ? n.name.split(" ")[0] : T("Your family", "Your family"));
/** Pidgin wording for English data strings picked when an event is created. */
const PCM: Record<string, string> = {
  "a hospital bill": "hospital bill", "rent that is due": "rent wey don due", "stock for the shop": "stock for shop", "a flight ticket": "flight ticket", "a wedding contribution": "wedding contribution", "a school fee": "school fee", "a phone repair": "phone repair",
  "school fees": "school fees", "transport to an interview": "transport go interview", "a new phone": "new phone", "rent": "rent", "data and airtime": "data and airtime",
};
const pcm = (v: unknown) => PCM[String(v)] ?? String(v);
const call = (n: Npc | null | undefined) => (n ? (n.role === "mom" ? T("Your mother", "Your mama") : n.role === "dad" ? T("Your father", "Your papa") : n.role === "grandparent" ? T("Your grandparent", "Your grandparent") : `${first(n)}`) : T("Your family", "Your family"));

/** Records a gifted house so the asset and the reason both show up in the money history. */
export function giftHouse(p: Player, kind: "apartment" | "bungalow" | "land", giver: string, valueBase: number): House {
  const value = Math.round(valueBase * stateOf(p).cost * Math.pow(p.index, 0.95));
  const useHere = !p.houses.some((h) => h.state === p.state && h.use === "owner") && kind !== "land";
  const h: House = { id: uid(), state: p.state, kind, value, use: useHere ? "owner" : "empty" };
  p.houses.push(h);
  if (useHere) p.housing = { type: "owned", stateId: p.state, annualRent: 0, paidUntil: 0, arrears: 0, landlord: "" };
  transact(p, { amount: 0, memo: true, reason: T(`Gift from ${giver}: ${HOUSE_KINDS[kind].label.toLowerCase()} worth ${naira(value)}`, `Gift from ${giver}: ${HOUSE_KINDS[kind].label.toLowerCase()} wey worth ${naira(value)}`), category: "asset" });
  p.prestige += 1;
  return h;
}

// ---------------------------------------------------------------------------
// Graduation: what the family does depends on wealth AND personality.
// ---------------------------------------------------------------------------
export type GradPkg = "apartment" | "car" | "cashBig" | "cashSmall" | "jobOffer" | "startupPlan" | "workForIt" | "contribute" | "familyBusiness" | "nothing";

export function graduationData(p: Player, graduate: boolean): EventData | null {
  const prov = primaryProvider(p);
  if (!prov) return null;
  const cap = capacityOf(p, prov);
  const idx = p.index;
  const g = prov.generosity;
  const s = prov.strictness;
  const a = p.fam.archetype;
  const grad = graduate ? 1 : 0.2;
  const rich = ["nepo", "newlyRich", "upperMiddle", "strictRich"].includes(a);
  const items: { item: GradPkg; w: number }[] = [
    { item: "apartment", w: a === "nepo" && g > 55 && s < 60 && cap > 14e6 * idx ? 24 * grad : a === "upperMiddle" && g > 72 && s < 50 && cap > 10e6 * idx ? 3 * grad : 0 },
    { item: "car", w: g > 50 && s < 65 && cap > 6e6 * idx ? (a === "nepo" ? 14 : 6) * grad : 0 },
    { item: "cashBig", w: g > 40 && cap > 3.5e6 * idx ? 15 : 0 },
    { item: "cashSmall", w: g > 22 && cap > 450e3 * idx ? 18 : 0 },
    { item: "jobOffer", w: p.fam.connections && rich ? 14 : 0 },
    { item: "startupPlan", w: s > 55 && prov.responsibility > 55 && cap > 4e6 * idx ? 16 : 0 },
    { item: "workForIt", w: s > 58 ? 18 + (a === "strictRich" ? 14 : 0) : 3 },
    { item: "contribute", w: p.fam.expectContribution || cap < 500e3 * idx ? 32 : 0 },
    { item: "familyBusiness", w: g > 45 && cap > 2.2e6 * idx && prov.responsibility > 40 ? 8 : 0 },
    { item: "nothing", w: 4 },
  ];
  const pkg = weightedPick(items) ?? "nothing";
  let amount = 0;
  if (pkg === "cashBig") amount = Math.round(Math.min(cap * 0.6, 5e6 * idx * rand(0.6, 1.3)) / 50_000) * 50_000;
  if (pkg === "cashSmall") amount = Math.round(Math.min(cap * 0.5, 800e3 * idx * rand(0.5, 1.1)) / 5_000) * 5_000;
  if (pkg === "startupPlan") amount = Math.round(Math.min(cap * 0.8, 7e6 * idx * rand(0.5, 1.2)) / 100_000) * 100_000;
  if (pkg === "familyBusiness") amount = Math.round(Math.min(cap * 0.5, 3e6 * idx * rand(0.6, 1.2)) / 100_000) * 100_000;
  return { pkg, amount, who: prov.id, month: randInt(6, 12), graduate };
}

function graduationText(p: Player, d: EventData): string {
  const who = p.npcs[String(d.who)];
  const nm = call(who);
  const nb = NEIGHBOURHOOD[p.state] ?? STATE_BY_ID[p.state].capital;
  const amt = naira(Number(d.amount));
  switch (d.pkg as GradPkg) {
    case "apartment": return T(`${nm} has decided to get you an apartment in ${nb}. "A good start in life," ${first(who)} says, handing you the keys.`, `${nm} don decide to buy apartment for you for ${nb}. "Na good start for life," ${first(who)} talk as e dey hand you the keys.`);
    case "car": return T(`${nm} bought you a car as a graduation gift. It is parked outside, with a ribbon on the bonnet.`, `${nm} buy car give you as graduation gift. E park outside, with ribbon for the bonnet.`);
    case "cashBig": return T(`${nm} sent you ${amt} to help you settle down after graduation. "Use it wisely," reads the message.`, `${nm} send ${amt} give you make you settle after graduation. "Use am well," na wetin the message talk.`);
    case "cashSmall": return T(`${nm} gave you ${amt} for your first month. "The rest is on you now, my dear."`, `${nm} give you ${amt} for your first month. "The rest na you, my dear."`);
    case "jobOffer": return T(`Your uncle offered you a position in his company. "Family first," he says. "But you must work."`, `Your uncle offer you work for im company. "Family first," e talk. "But you must work o."`);
    case "startupPlan": return T(`${nm} says: "I will invest in your business if you show me a proper plan. Not a dream, a plan."`, `${nm} talk: "I go put money for your business if you show me correct plan. No be dream, plan."`);
    case "workForIt": return T(`${nm} says: "You have graduated. It is time to get a job. I paid your school fees. The rest is up to you."`, `${nm} talk: "You don graduate. Time don reach to find work. I don pay your school fees. The rest na your own."`);
    case "contribute": return T(`${nm} is proud that you have finished school, and asks that you start contributing towards household expenses once you earn.`, `${nm} proud say you don finish school, and e want make you start to contribute for house expenses as soon as you start to earn.`);
    case "familyBusiness": return T(`Your family has offered to fund a business for you with ${amt}, but they expect you to manage it responsibly.`, `Your family wan fund business for you with ${amt}, but dem expect say you go manage am well.`);
    default: return T("Your family celebrates your graduation with a big meal. That is all.", "Your family celebrate your graduation with big food. Na only that one.");
  }
}

function graduationChoices(p: Player, d: EventData): Choice[] {
  const who = p.npcs[String(d.who)];
  const amt = Number(d.amount);
  const done = (q: Player) => { if (!q.fam.given.includes("graduationGift")) q.fam.given.push("graduationGift"); q.month = Number(d.month ?? 12); };
  const thank = (q: Player, n: Npc | undefined, text: string) => { if (n) { n.closeness = clamp(n.closeness + 4); remember(q, n, text, "good"); } };
  const independent = (q: Player, n: Npc | undefined) => { bump(q, "reputation", 3); if (n) { n.closeness = clamp(n.closeness + 2); remember(q, n, T("Chose to build things on your own.", "You choose to build your own life."), "good"); } };
  switch (d.pkg as GradPkg) {
    case "apartment":
      return [
        { label: T("Accept the keys", "Collect the keys"), run: (q) => { done(q); const h = giftHouse(q, "apartment", first(who), 22_000_000 * rand(0.9, 1.4)); thank(q, who, T("Bought you an apartment after graduation.", "Buy apartment for you after graduation.")); return T(`You move into your new apartment in ${STATE_BY_ID[h.state].name}. Worth ${naira(h.value)}. Life is easier now.`, `You enter your new apartment for ${STATE_BY_ID[h.state].name}. E worth ${naira(h.value)}. Life don easy now.`); } },
        { label: T("Thank them, but say you will earn your own", "Thank dem, but say you go work for your own"), run: (q) => { done(q); independent(q, who); return T(`${first(who)} is proud and a bit surprised: "Alright then. My door stays open."`, `${first(who)} proud and e surprise small: "Alright then. My door dey open."`); } },
      ];
    case "car":
      return [
        { label: T("Take the car", "Take the car"), run: (q) => { done(q); const m = VEHICLE_MODELS.find((x) => x.id === (q.fam.archetype === "nepo" ? "lexus-used" : "corolla-used")) ?? VEHICLE_MODELS[2]; const v = addVehicle(q, m); transact(q, { amount: 0, memo: true, reason: T(`Gift from ${first(who)}: ${v.name} worth ${naira(v.value)}`, `Gift from ${first(who)}: ${v.name} wey worth ${naira(v.value)}`), category: "asset" }); thank(q, who, T("Bought you a car after graduation.", "Buy car for you after graduation.")); return T(`You drive off in your ${v.name}.`, `You drive your ${v.name} comot.`); } },
        { label: T("Decline politely", "Refuse politely"), run: (q) => { done(q); independent(q, who); return T("You keep taking the bus. Your parents shake their heads, smiling.", "You continue to enter bus. Your parent dey shake head as dem dey smile."); } },
      ];
    case "cashBig":
    case "cashSmall":
      return [
        { label: T(`Accept ${naira(amt)}`, `Collect ${naira(amt)}`), run: (q) => { done(q); transact(q, { amount: amt, reason: T(`Graduation gift from ${first(who)}`, `Graduation gift from ${first(who)}`), category: "gift" }); if (who) who.gaveThisYear += amt / q.index; thank(q, who, T("Gave you money after graduation.", "Give you money after graduation.")); return T(`${naira(amt)} lands in your account. Time to settle down.`, `${naira(amt)} enter your account. Time don reach to settle.`); } },
        { label: T("Ask for a bit more", "Ask for small extra"), run: (q) => { done(q); const more = chance(0.3 + (who?.generosity ?? 40) / 300) ? Math.round(amt * 1.3) : amt; transact(q, { amount: more, reason: T(`Graduation gift from ${first(who)}`, `Graduation gift from ${first(who)}`), category: "gift" }); if (who && more === amt) { who.closeness = clamp(who.closeness - 3); } return more > amt ? T(`${first(who)} sighs and adds a bit more. You got ${naira(more)}.`, `${first(who)} sigh and add small extra. You collect ${naira(more)}.`) : T(`${first(who)} says no extra. You get ${naira(amt)}.`, `${first(who)} talk say no extra. You collect ${naira(amt)}.`); } },
      ];
    case "jobOffer":
      return [
        { label: T("Accept the job offer", "Accept the job offer"), run: (q) => {
          done(q);
          const options = eligibleJobs(q).filter((j) => j.group === "formal");
          const best = options.sort((a, b) => b.ladder[1].pay - a.ladder[1].pay)[0];
          if (best) { q.job = { id: best.id, rank: 1, years: 0 }; bump(q, "connections", 3); return T(`You start at your uncle's company as ${best.ladder[1].title}. People whisper that you got the job through family. You work harder to prove them wrong.`, `You start work for your uncle company as ${best.ladder[1].title}. People dey whisper say na family connection give you the work. You work harder to prove dem wrong.`); }
          bump(q, "connections", 2);
          return T("Your uncle's company has no role that fits your qualifications. He promises to introduce you around.", "Your uncle company no get role wey fit your qualifications. E promise say e go introduce you to people.");
        } },
        { label: T("Decline, you want to be hired on merit", "Refuse, you wan get work by merit"), run: (q) => { done(q); independent(q, who); return T("Your uncle laughs: \"Pride. Fine.\"", "Your uncle laugh: \"Pride. Fine.\""); } },
      ];
    case "startupPlan":
      return [
        { label: T("Present a proper business plan", "Show correct business plan"), run: (q) => {
          done(q);
          const pr = clamp(0.3 + q.stats.smarts / 200 + luckBonus(q) + (q.edu === "tertiary" ? 0.12 : 0), 0.1, 0.85);
          if (chance(pr) && who) {
            transact(q, { amount: amt, reason: T(`Startup capital from ${first(who)} (to be repaid)`, `Startup capital from ${first(who)} (you go pay back)`), category: "loan" });
            q.loans.push(newInformalLoan(q, who, amt, 30, T("Family business investment", "Family business investment")));
            who.gaveThisYear += amt / q.index;
            remember(q, who, T("Backed your business plan.", "Support your business plan."), "good");
            return T(`${first(who)} is impressed by your plan and invests ${naira(amt)}, as a loan to repay over time. Don't disappoint.`, `${first(who)} like your plan and put ${naira(amt)}, as loan wey you go pay back small small. No disappoint am.`);
          }
          if (who) who.closeness = clamp(who.closeness - 1);
          return T(`${first(who)} reads your plan: "The numbers do not add up. Come back when they do."`, `${first(who)} read your plan: "The numbers no add up. Come back when e don correct."`);
        } },
        { label: T("Ask for the money without a plan", "Ask for money without plan"), run: (q) => { done(q); if (who) { who.closeness = clamp(who.closeness - 5); remember(q, who, T("Asked for startup money with no plan.", "Ask for startup money without plan."), "bad"); } return T(`${first(who)} frowns: "No plan, no money."`, `${first(who)} frown face: "No plan, no money."`); } },
        { label: T("Say you will find your own funding", "Say you go find your own money"), run: (q) => { done(q); independent(q, who); return T("You smile and go to find other options.", "You smile and go find other way."); } },
      ];
    case "workForIt":
      return [
        { label: T("Accept it: time to work", "Accept am: time to work"), run: (q) => { done(q); q.fam.cutOff.push("allowance", "rent"); bump(q, "smarts", 1); bump(q, "stress", 3); if (who) who.closeness = clamp(who.closeness + 1); return T("You nod. Your parents will still help in real emergencies, but pocket money and rent are over.", "You nod head. Your parent go still help for real emergency, but pocket money and rent don finish."); } },
        { label: T("Argue that it is too soon", "Argue say e too early"), run: (q) => { done(q); q.fam.cutOff.push("allowance", "rent"); if (who) { who.closeness = clamp(who.closeness - 4); remember(q, who, T("Argued when told to work after graduation.", "Argue when dem tell you to work after graduation."), "bad"); } bump(q, "stress", 5); return T(`${first(who)}: "Your mates are already working. Find a job."`, `${first(who)}: "Your mates don dey work. Go find work."`); } },
      ];
    case "contribute":
      return [
        { label: T("Of course, you will help", "Of course, you go help"), run: (q) => { done(q); q.fam.expectContribution = true; if (who) { who.closeness = clamp(who.closeness + 5); } bump(q, "reputation", 2); return T("You promise to send money home once you earn. Your family prays over you.", "You promise to send money house once you start to earn. Your family pray for you."); } },
        { label: T("Say you need to settle first", "Say make you settle first"), run: (q) => { done(q); q.fam.expectContribution = false; if (who) who.closeness = clamp(who.closeness - 3); return T("They understand, mostly. The conversation will come back.", "Dem understand, mostly. The talk go come back."); } },
      ];
    case "familyBusiness":
      return [
        { label: T("Accept and run it responsibly", "Accept and run am well"), run: (q) => { done(q); transact(q, { amount: amt, reason: T(`Family business capital from ${first(who)}`, `Family business capital from ${first(who)}`), category: "gift" }); if (who) { who.gaveThisYear += amt / q.index; remember(q, who, T("Funded a business for you. They expect responsibility.", "Fund business for you. Dem expect you to be responsible."), "good"); } q.flags.familyBusinessTrust = q.age; return T(`You receive ${naira(amt)}, with the family watching closely.`, `You collect ${naira(amt)}, as the family dey watch you well well.`); } },
        { label: T("Decline", "Refuse"), run: (q) => { done(q); independent(q, who); return T("You turn it down. They respect it, and also worry a bit.", "You reject am. Dem respect am, but dem still dey worry small."); } },
      ];
    default:
      return [{ label: T("Thank them", "Thank dem"), run: (q) => { done(q); thank(q, who, T("Celebrated your graduation.", "Celebrate your graduation.")); return T("A nice meal and some pictures. On to the next chapter.", "Sweet food and some pictures. Make we go next chapter."); } }];
  }
}

// ---------------------------------------------------------------------------
// New events
// ---------------------------------------------------------------------------
export const EVENTS5: EventDef[] = [
  {
    id: "graduation_support",
    title: dual("After graduation", "After graduation"),
    weight: () => 0,
    text: (p, d) => graduationText(p, d),
    choices: (p, d) => graduationChoices(p, d),
  },
  {
    id: "move_out",
    title: dual("Time to leave the nest?", "Time to leave house?"),
    weight: () => 0,
    text: (p) => {
      const prov = primaryProvider(p);
      return prov && prov.strictness > 60
        ? T(`${first(prov)} says: "You are earning now. A grown ${p.gender === "male" ? "man" : "woman"} does not live in his parents' house forever."`, `${first(prov)} talk: "You don dey earn now. Grown ${p.gender === "male" ? "man" : "woman"} no dey stay for im parents house forever."`)
        : T("You have a job now. Do you keep sharing your family's house, or get your own place?", "You don get work now. You go still dey share your family house, or you go get your own place?");
    },
    choices: (p) => {
      const st = stateOf(p);
      const cost = (id: string) => Math.round((HOME_TIERS.find((t) => t.id === id)?.rent ?? 0) * st.cost * Math.pow(p.index, 0.95) * 1.1);
      const mk = (id: string, label: string): Choice => ({ label, sub: T(`${naira(cost(id))} up front`, `${naira(cost(id))} for upfront`), disabled: p.money < cost(id) ? T("Not enough cash", "Cash no reach") : false, run: (q) => rentPlace(q, id) });
      return [
        mk("room", T("Take a shared room", "Take shared room")),
        mk("selfcon", T("Rent a self-contain", "Rent self-contain")),
        mk("onebed", T("Rent a 1-bedroom flat", "Rent 1-bedroom flat")),
        { label: T("Stay with family a bit longer", "Stay with family small more"), run: (q) => { const prov = primaryProvider(q); if (prov && prov.strictness > 60) { prov.closeness = clamp(prov.closeness - 3); return T(`${first(prov)} sighs: "Alright, but not forever."`, `${first(prov)} sigh: "Alright, but no be forever."`); } return T("Staying home saves money. Nobody complains.", "To stay house dey save money. Nobody dey complain."); } },
      ];
    },
  },
  {
    id: "eviction_notice",
    title: dual("Landlord at your door", "Landlord dey your door"),
    weight: () => 0,
    valid: (p) => p.housing.type === "rented" || p.housing.type === "hostel",
    text: (p) => T(`You are ${p.housing.arrears} months behind on rent. Your landlord arrives with two men: "Pay up or pack out by Friday."`, `You owe ${p.housing.arrears} months rent. Your landlord come with two men: "Pay up or pack out by Friday."`),
    choices: (p) => {
      const friend = Object.values(p.npcs).filter((n) => n.role === "friend" && n.alive).sort((a, b) => b.generosity * b.income - a.generosity * a.income)[0];
      return [
        { label: T("Beg for more time", "Beg for more time"), run: (q) => { if (chance(0.5 + q.stats.reputation / 400)) { q.housing.paidUntil = monthIndex(q) + 2; q.housing.arrears = 0; return T("The landlord relents: \"Two more months. No more.\"", "Landlord soften: \"Two more months. No more.\""); } q.housing.arrears = 3; bump(q, "stress", 8); return T("He is not moved. \"Friday. Last warning.\"", "E no gree. \"Friday. Last warning.\""); } },
        { label: friend ? T(`Borrow from ${first(friend)}`, `Borrow from ${first(friend)}`) : T("Borrow from a friend", "Borrow from friend"), disabled: friend ? false : T("No friend to ask", "No friend to ask"), run: (q) => {
          if (!friend) return "";
          const need = Math.round(q.housing.annualRent * 0.35);
          const r = borrowFrom(q, friend, need, (pp, n, a) => evaluateSupport(pp, n, "rent", a));
          if (r.loan && q.money >= 0) { q.housing.paidUntil = monthIndex(q) + 3; q.housing.arrears = 0; q.money -= 0; }
          return r.text;
        } },
        { label: T("Move back in with family", "Go back stay with family"), run: (q) => { moveHomeToFamily(q); return T("You pack your things and go back home. Bruised pride, but a roof.", "You pack your things and go back house. Pride don bruise, but you get roof."); } },
        { label: T("Let him throw you out", "Let am throw you out"), run: (q) => { moveHomeToFamily(q); bump(q, "reputation", -4); bump(q, "stress", 10); return T("Your belongings end up on the road. A neighbour helps you carry them to family.", "Your things land for road. One neighbour help you carry dem go family house."); } },
      ];
    },
  },
  {
    id: "loan_due",
    title: dual("Time to repay", "Time to pay back"),
    weight: () => 0,
    valid: (p) => p.loans.some((l) => l.status === "active"),
    text: (p, d) => {
      const loan = p.loans.find((l) => l.id === d.loanId);
      if (!loan) return T("A loan reminder pops up.", "Loan reminder pop up.");
      const n = loan.lenderId ? p.npcs[loan.lenderId] : null;
      const who = n ? first(n) : loan.lenderName;
      return T(
        `${who} reminds you about the ${naira(loan.balance)} you borrowed${loan.note ? ` (${loan.note})` : ""}. "When is it coming?"`,
        `${who} remind you about the ${naira(loan.balance)} wey you borrow${loan.note ? ` (${loan.note})` : ""}. "When e dey come?"`,
      );
    },
    choices: (p, d) => {
      const loan = p.loans.find((l) => l.id === d.loanId);
      const bal = loan?.balance ?? 0;
      const id = String(d.loanId);
      const month = Number(d.month ?? 12);
      return [
        { label: T("Pay it in full", "Pay am finish"), sub: naira(bal), disabled: p.money < bal * 0.2 ? T("You have almost nothing", "You never get nothing") : false, run: (q) => { q.month = month; return resolveInformalLoan(q, id, "pay"); } },
        { label: T("Pay half now", "Pay half now"), sub: naira(bal / 2), disabled: p.money < bal / 2 ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.month = month; return resolveInformalLoan(q, id, "half"); } },
        { label: T("Ask for more time", "Ask for more time"), run: (q) => resolveInformalLoan(q, id, "delay") },
        { label: T("Explain your situation honestly", "Explain your situation true true"), run: (q) => resolveInformalLoan(q, id, "explain") },
        { label: T("Ignore it and hope it goes away", "Ignore am and hope say e go go"), run: (q) => resolveInformalLoan(q, id, "default") },
      ];
    },
  },
  {
    id: "friend_request",
    title: dual("A friend needs help", "Friend need help"),
    weight: (p) => (Object.values(p.npcs).some((n) => n.role === "friend" && n.alive) ? 2.4 : 0),
    init: (p) => {
      const friends = Object.values(p.npcs).filter((n) => n.role === "friend" && n.alive);
      const f = pick(friends);
      const need = Math.round((f.income * 0.03 + 40_000) * rand(0.5, 1.6));
      return { friendId: f.id, amount: need, why: pick(["a hospital bill", "rent that is due", "stock for the shop", "a flight ticket", "a wedding contribution", "a school fee", "a phone repair"]) };
    },
    text: (p, d) => T(
      `${first(p.npcs[String(d.friendId)])} calls you: "I'm in a small situation. Can you help me with ${naira(Number(d.amount) * p.index)} for ${String(d.why)}?"`,
      `${first(p.npcs[String(d.friendId)])} call you: "I dey small situation. You fit help me with ${naira(Number(d.amount) * p.index)} for ${pcm(d.why)}?"`,
    ),
    choices: (p, d) => {
      const f = p.npcs[String(d.friendId)];
      const amt = Math.round(Number(d.amount) * p.index);
      const noCash = T("Not enough cash", "Cash no reach");
      return [
        { label: T("Give it as a gift", "Give am as gift"), sub: naira(amt), disabled: p.money < amt ? noCash : false, run: (q) => giftTo(q, q.npcs[f.id], amt) },
        { label: T("Lend it (expect it back)", "Lend am (expect am back)"), sub: naira(amt), disabled: p.money < amt ? noCash : false, run: (q) => lendTo(q, q.npcs[f.id], amt, 4) },
        { label: T("Give a smaller amount", "Give smaller amount"), sub: naira(amt / 3), disabled: p.money < amt / 3 ? noCash : false, run: (q) => giftTo(q, q.npcs[f.id], Math.round(amt / 3)) },
        { label: T("Say you cannot help right now", "Say you no fit help now"), run: (q) => { const n = q.npcs[f.id]; n.closeness = clamp(n.closeness - 4); if (n.generosity < 40) n.trust = clamp(n.trust - 2); remember(q, n, T("Said no when they needed help.", "Say no when dem need help."), "bad"); return T(`${first(n)} says "No wahala", but the call ends quickly.`, `${first(n)} talk "No wahala", but the call end quick.`); } },
      ];
    },
  },
  {
    id: "friend_help",
    title: dual("A friend steps in", "Friend come help"),
    weight: (p) => (p.age >= 14 && p.money < I(p, 150_000) && Object.values(p.npcs).some((n) => n.role === "friend" && n.alive && n.generosity > 50 && n.income > 600_000) ? 3.5 : 0),
    init: (p) => {
      const f = pick(Object.values(p.npcs).filter((n) => n.role === "friend" && n.alive && n.generosity > 50 && n.income > 600_000));
      return { friendId: f.id, amount: Math.round(Math.min(f.income * 0.04, 150_000) + 20_000) };
    },
    text: (p, d) => T(
      `${first(p.npcs[String(d.friendId)])} heard things are hard for you: "I sent something small. Don't argue." ${naira(Number(d.amount) * p.index)} is waiting in your account.`,
      `${first(p.npcs[String(d.friendId)])} hear say things hard for you: "I send something small. No argue." ${naira(Number(d.amount) * p.index)} dey your account.`,
    ),
    choices: (p, d) => {
      const f = p.npcs[String(d.friendId)];
      const amt = Math.round(Number(d.amount) * p.index);
      return [
        { label: T("Accept it as a gift", "Take am as gift"), run: (q) => { transact(q, { amount: amt, reason: T(`Gift from ${f.name}`, `Gift from ${f.name}`), category: "gift" }); const n = q.npcs[f.id]; n.closeness = clamp(n.closeness + 5); remember(q, n, T(`Helped you when you were broke (${naira(amt)}).`, `Help you when you broke (${naira(amt)}).`), "good"); return T(`You say thank you three times. Real friends exist.`, `You thank am three times. Real friends still dey.`); } },
        { label: T("Accept it as a loan", "Take am as loan"), run: (q) => { const n = q.npcs[f.id]; transact(q, { amount: amt, reason: T(`Borrowed from ${f.name}`, `Borrow from ${f.name}`), category: "loan" }); q.loans.push(newInformalLoan(q, n, amt, 4, T("Help from a friend", "Help from friend"))); n.trust = clamp(n.trust + 3); return T(`You promise to pay back every kobo. ${first(n)} just laughs.`, `You promise say you go pay back every kobo. ${first(n)} just laugh.`); } },
        { label: T("Politely refuse", "Refuse politely"), run: (q) => { bump(q, "reputation", 2); const n = q.npcs[f.id]; n.closeness = clamp(n.closeness + 1); return T("Pride, they call it. Maybe so.", "Dem go call am pride. Maybe so."); } },
      ];
    },
  },
  {
    id: "sibling_ask",
    title: dual("Your sibling needs money", "Your sibling need money"),
    weight: (p) => (npcsByRole(p, "sibling").some((s) => s.alive) && p.money > I(p, 80_000) ? 2 : 0),
    init: (p) => {
      const s = pick(npcsByRole(p, "sibling").filter((x) => x.alive));
      return { sibId: s.id, amount: Math.round(rand(30_000, 200_000)), why: pick(["school fees", "transport to an interview", "a new phone", "rent", "data and airtime", "a hospital bill"]) };
    },
    text: (p, d) => T(
      `${first(p.npcs[String(d.sibId)])} (age ${npcAge(p, p.npcs[String(d.sibId)])}) calls: "Please, I need ${naira(Number(d.amount) * p.index)} for ${String(d.why)}. I will pay you back one day."`,
      `${first(p.npcs[String(d.sibId)])} (age ${npcAge(p, p.npcs[String(d.sibId)])}) call: "Abeg, I need ${naira(Number(d.amount) * p.index)} for ${pcm(d.why)}. I go pay you back one day."`,
    ),
    choices: (p, d) => {
      const s = p.npcs[String(d.sibId)];
      const amt = Math.round(Number(d.amount) * p.index);
      const noCash = T("Not enough cash", "Cash no reach");
      return [
        { label: T("Send it", "Send am"), sub: naira(amt), disabled: p.money < amt ? noCash : false, run: (q) => giftTo(q, q.npcs[s.id], amt) },
        { label: T("Lend it", "Lend am"), sub: naira(amt), disabled: p.money < amt ? noCash : false, run: (q) => lendTo(q, q.npcs[s.id], amt, 6) },
        { label: T("Say no, you have your own problems", "Say no, you get your own wahala"), run: (q) => { const n = q.npcs[s.id]; n.closeness = clamp(n.closeness - 5); return T(`${first(n)} says nothing, then hangs up.`, `${first(n)} no talk anything, then cut the call.`); } },
      ];
    },
  },
  {
    id: "phone_stolen",
    title: dual("Phone snatched!", "Dem snatch your phone!"),
    weight: (p) => (p.possessions.phone ? (stateOf(p).opp >= 7 ? 1.8 : 1.0) : 0),
    text: () => T("Stuck in traffic with the window down, a hand reaches in and your phone is gone before you can react.", "You dey go-slow with window down, one hand enter and your phone don vanish before you fit react."),
    choices: (p) => [
      { label: T("Report to the police", "Report to police"), run: (q) => { if (chance(0.12)) { return T("Against all odds, officers track it down in a week. You recover your phone.", "Na wa o, police track am down within one week. You get your phone back."); } q.possessions.phone = false; q.possessions.smartphone = false; return T("They record a statement and tell you to wait. The phone never returns.", "Dem write statement and tell you make you wait. The phone no ever come back."); } },
      { label: T("Buy a cheap basic phone", "Buy cheap basic phone"), sub: naira(I(p, 25_000)), disabled: p.money < I(p, 25_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { transact(q, { amount: -I(q, 25_000), reason: T("Replacement basic phone", "Replacement basic phone"), category: "personal" }); q.possessions.phone = true; q.possessions.smartphone = false; return T("You get a small phone with a loud ringtone. It works.", "You get small phone with loud ringtone. E dey work."); } },
      { label: T("Buy a new smartphone", "Buy new smartphone"), sub: naira(I(p, 180_000)), disabled: p.money < I(p, 180_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { transact(q, { amount: -I(q, 180_000), reason: T("New smartphone", "New smartphone"), category: "personal" }); q.possessions.phone = true; q.possessions.smartphone = true; return T("A fresh smartphone, and a lesson about window glass.", "Fresh smartphone, and lesson about window glass."); } },
      { label: T("Go without for now", "Manage without for now"), run: (q) => { q.possessions.phone = false; q.possessions.smartphone = false; bump(q, "stress", 4); return T("Life without a phone feels like living in 1995.", "Life without phone be like say you dey 1995."); } },
    ],
  },
  {
    id: "inheritance_dispute",
    title: dual("The family disputes the estate", "Family dey fight over the estate"),
    weight: () => 0,
    text: (p, d) => T(`Relatives contest the estate. A cousin says the deceased promised them a share, and a lawyer's letter demands ${naira(Number(d.claim ?? 0))}.`, `Relatives dey contest the estate. One cousin talk say the dead promise am share, and lawyer letter dey demand ${naira(Number(d.claim ?? 0))}.`),
    choices: (p, d) => {
      const claim = Number(d.claim ?? 0);
      return [
        { label: T("Settle amicably", "Settle am in peace"), sub: naira(claim * 0.4), run: (q) => { const pay = Math.min(q.money, Math.round(claim * 0.4)); if (pay > 0) transact(q, { amount: -pay, reason: T("Settlement with relatives over the estate", "Settlement with relatives over the estate"), category: "legal" }); for (const n of Object.values(q.npcs)) if (["uncle", "aunt", "sibling", "cousin"].includes(n.role)) n.closeness = clamp(n.closeness + 3); return T(`You pay ${naira(pay)} and keep the family together.`, `You pay ${naira(pay)} and keep the family together.`); } },
        { label: T("Fight it in court", "Fight am for court"), sub: naira(claim * 0.15), run: (q) => { const fee = Math.min(q.money, Math.round(claim * 0.15)); if (fee > 0) transact(q, { amount: -fee, reason: T("Legal fees in the inheritance dispute", "Legal fees for the inheritance dispute"), category: "legal" }); if (chance(0.55)) { for (const n of Object.values(q.npcs)) if (["uncle", "aunt", "sibling", "cousin"].includes(n.role)) n.closeness = clamp(n.closeness - 8); return T("The court upholds the will. Relatives stop speaking to you.", "Court uphold the will. Relatives stop to talk to you."); } const loss = Math.min(q.money, Math.round(claim * 0.7)); if (loss > 0) transact(q, { amount: -loss, reason: T("Court-ordered payment to relatives", "Court order payment to relatives"), category: "legal" }); return T(`You lose the case and have to pay ${naira(loss)}.`, `You lose the case and you must pay ${naira(loss)}.`); } },
        { label: T("Negotiate privately", "Negotiate for private"), sub: naira(claim * 0.2), run: (q) => { const pay = Math.min(q.money, Math.round(claim * 0.2)); if (pay > 0) transact(q, { amount: -pay, reason: T("Private settlement with relatives", "Private settlement with relatives"), category: "legal" }); return T("A family meeting with the elders settles it for less.", "Family meeting with the elders settle am for less."); } },
      ];
    },
  },
  {
    id: "unexpected_inheritance",
    title: dual("A relative remembers you", "Relative remember you"),
    weight: (p) => (p.age >= 22 ? 0.25 : 0),
    text: () => T("A lawyer's letter arrives: a distant relative has passed away and named you in the will.", "Lawyer letter land: one far relative don die and put your name for the will."),
    choices: (p) => [
      { label: T("Attend the reading", "Go the will reading"), run: (q) => {
        if (chance(0.25)) { const h = giftHouse(q, "land", T("a distant relative", "a far relative"), 3_000_000); return T(`You inherit a plot of land worth ${naira(h.value)}. Relatives start sending messages.`, `You inherit plot of land wey worth ${naira(h.value)}. Relatives start to send message.`); }
        const amt = Math.round(I(q, rand(300_000, 3_500_000)));
        transact(q, { amount: amt, reason: T("Inheritance from a distant relative", "Inheritance from far relative"), category: "inheritance" });
        return T(`You receive ${naira(amt)}. A few cousins glare at you across the room.`, `You collect ${naira(amt)}. Some cousins dey look you eye for the room.`);
      } },
    ],
  },
];
