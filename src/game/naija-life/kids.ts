import { I, bump } from "./helpers";
import { transact } from "./ledger";
import type { EventDef, Kid, Player } from "./types";
import { T, chance, clamp, dual, naira, pick, rand } from "./util";

const kidsWhere = (p: Player, fn: (k: Kid) => boolean) => p.kids.map((k, i) => ({ k, i })).filter((x) => fn(x.k));
const near = (k: Kid) => clamp(k.closeness ?? 60);
const adjust = (p: Player, i: number, d: number) => { const k = p.kids[i]; if (k) k.closeness = clamp((k.closeness ?? 60) + d); };

export const KID_EVENTS: EventDef[] = [
  {
    id: "kid_sick",
    title: dual("Your child is sick", "Your pikin no well"),
    weight: (p) => (kidsWhere(p, (k) => k.age < 16).length ? 1.8 : 0),
    init: (p) => ({ kid: pick(kidsWhere(p, (k) => k.age < 16)).i }),
    text: (p, d) => { const k = p.kids[Number(d.kid)]; return T(`${k?.name ?? "Your child"} has a high fever and will not eat. It could be malaria, or something worse.`, `${k?.name ?? "Your pikin"} get high fever and no wan chop. E fit be malaria or worse.`); },
    choices: (p, d) => {
      const i = Number(d.kid);
      const cost = (n: number) => I(p, n);
      return [
        { label: T("Private hospital", "Private hospital"), sub: naira(cost(180_000)), disabled: p.money < cost(180_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { transact(q, { amount: -cost(180_000), reason: T(`Hospital bill for ${q.kids[i]?.name}`, `Hospital bill for ${q.kids[i]?.name}`), category: "health" }); adjust(q, i, 3); return T("Good care, a quick recovery and a big bill.", "Better care, quick recovery and big bill."); } },
        { label: T("Government hospital", "Government hospital"), sub: naira(cost(30_000)), disabled: p.money < cost(30_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { transact(q, { amount: -cost(30_000), reason: T(`Government hospital for ${q.kids[i]?.name}`, `Government hospital for ${q.kids[i]?.name}`), category: "health" }); bump(q, "stress", 4); return chance(0.07) ? (adjust(q, i, -2), T("A long wait. Your child recovers slowly, and you spend nights in the corridor.", "Long wait. Your pikin recover slow slow, you sleep for corridor.")) : T("A long queue, but your child is treated and gets better.", "Long queue, but dem treat your pikin and e better."); } },
        { label: T("Herbs and prayer", "Herbs and prayer"), sub: T("Cheap but risky", "Cheap but e risky"), run: (q) => { if (chance(0.55)) return T("The fever breaks by morning.", "Fever break by morning."); bump(q, "stress", 8); adjust(q, i, -3); const cost2 = cost(150_000); transact(q, { amount: -Math.min(q.money, cost2), reason: T("Emergency care after home remedies failed", "Emergency care after herbs no work"), category: "health" }); return T("It gets worse. You rush to the hospital in the night.", "E worse. You rush hospital for night."); } },
      ];
    },
  },
  {
    id: "kid_trouble",
    title: dual("Trouble with your child", "Wahala with your pikin"),
    weight: (p) => (kidsWhere(p, (k) => k.age >= 8 && k.age <= 17).length ? 1.6 : 0),
    init: (p) => ({ kid: pick(kidsWhere(p, (k) => k.age >= 8 && k.age <= 17)).i, what: pick([T("was caught fighting at school", "fight for school"), T("has been skipping classes", "dey skip class"), T("was found with a stolen phone", "carry person phone"), T("came home after midnight", "come house after midnight")]) }),
    text: (p, d) => T(`The school calls. ${p.kids[Number(d.kid)]?.name ?? "Your child"} ${d.what}.`, `School call you. ${p.kids[Number(d.kid)]?.name ?? "Your pikin"} ${d.what}.`),
    choices: (p, d) => {
      const i = Number(d.kid);
      return [
        { label: T("Talk it through calmly", "Talk am calm"), run: (q) => { adjust(q, i, 4); bump(q, "stress", 2); return T("It takes a long evening, but your child opens up.", "E take whole evening, but your pikin open up."); } },
        { label: T("Punish strictly", "Beat am well"), run: (q) => { adjust(q, i, -6); return chance(0.6) ? T("The behaviour stops, but the warmth between you cools.", "The behaviour stop, but love between una cool.") : T("It only makes things worse.", "E just make am worse."); } },
        { label: T("Pay to make it go away", "Pay make e go"), sub: naira(I(p, 120_000)), disabled: p.money < I(p, 120_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { transact(q, { amount: -I(q, 120_000), reason: T("Settlement for your child's trouble", "Settlement for your pikin wahala"), category: "family" }); adjust(q, i, -2); return T("The matter is closed quietly. The lesson is not learned.", "Dem close am quietly. Lesson no enter."); } },
      ];
    },
  },
  {
    id: "kid_talent",
    title: dual("Your child shows talent", "Your pikin get talent"),
    weight: (p) => (kidsWhere(p, (k) => k.age >= 6 && k.age <= 16).length ? 1.2 : 0),
    init: (p) => ({ kid: pick(kidsWhere(p, (k) => k.age >= 6 && k.age <= 16)).i, what: pick([T("football", "football"), T("music", "music"), T("mathematics", "mathematics"), T("drawing", "drawing"), T("public speaking", "public speaking")]) }),
    text: (p, d) => T(`${p.kids[Number(d.kid)]?.name ?? "Your child"} is unusually good at ${d.what}. A teacher suggests proper lessons.`, `${p.kids[Number(d.kid)]?.name ?? "Your pikin"} dey sabi ${d.what} well well. Teacher talk say make you register am for lesson.`),
    choices: (p, d) => {
      const i = Number(d.kid);
      return [
        { label: T("Pay for lessons", "Pay for lesson"), sub: naira(I(p, 250_000)), disabled: p.money < I(p, 250_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { transact(q, { amount: -I(q, 250_000), reason: T(`Lessons for ${q.kids[i]?.name}`, `Lesson for ${q.kids[i]?.name}`), category: "education" }); adjust(q, i, 5); const k = q.kids[i]; if (k) k.smarts = (k.smarts ?? 50) + Math.round(rand(2, 6)); bump(q, "happiness", 4); return T("Your child blossoms. You feel proud.", "Your pikin blossom. You proud well well."); } },
        { label: T("Encourage at home", "Encourage am for house"), run: (q) => { adjust(q, i, 2); return T("You cheer from the sidelines. It means a lot.", "You dey cheer for side. E mean plenty."); } },
        { label: T("Say it is a distraction", "Talk say na distraction"), run: (q) => { adjust(q, i, -4); return T("Your child puts the dream away, quietly.", "Your pikin put the dream down, quietly."); } },
      ];
    },
  },
  {
    id: "kid_asks_money",
    title: dual("Your grown child needs help", "Your grown pikin need help"),
    weight: (p) => (kidsWhere(p, (k) => k.age >= 18).length ? 1.8 : 0),
    init: (p) => ({ kid: pick(kidsWhere(p, (k) => k.age >= 18)).i, why: pick([T("rent", "rent"), T("a start-up idea", "business idea"), T("school fees", "school fees"), T("a hospital bill", "hospital bill")]), amt: Math.round(rand(150_000, 2_000_000)) }),
    text: (p, d) => T(`${p.kids[Number(d.kid)]?.name ?? "Your child"} calls: "Daddy/Mummy, I need ${naira(Number(d.amt) * p.index)} for ${d.why}."`, `${p.kids[Number(d.kid)]?.name ?? "Your pikin"} call: "Daddy/Mummy, I need ${naira(Number(d.amt) * p.index)} for ${d.why}."`),
    choices: (p, d) => {
      const i = Number(d.kid);
      const amt = Math.round(Number(d.amt) * p.index);
      return [
        { label: T("Give it", "Give am"), sub: naira(amt), disabled: p.money < amt ? T("Not enough cash", "Cash no reach") : false, run: (q) => { transact(q, { amount: -amt, reason: T(`Help for ${q.kids[i]?.name}`, `Help for ${q.kids[i]?.name}`), category: "family" }); adjust(q, i, 6); return T("They thank you with tears in their eyes.", "Dem thank you with tears for eyes."); } },
        { label: T("Give half and teach them to budget", "Give half, teach am budget"), sub: naira(amt / 2), disabled: p.money < amt / 2 ? T("Not enough cash", "Cash no reach") : false, run: (q) => { transact(q, { amount: -amt / 2, reason: T(`Partial help for ${q.kids[i]?.name}`, `Half help for ${q.kids[i]?.name}`), category: "family" }); adjust(q, i, 2); return T("They grumble, but they manage.", "Dem grumble, but dem manage."); } },
        { label: T("Say no: they must stand on their own", "Say no: make dem stand"), run: (q) => { adjust(q, i, -5); return T("A long silence on the line. Later, a short text: 'okay'.", "Long silence for phone. Later, small text: 'okay'."); } },
      ];
    },
  },
];

export const kidCloseness = near;
