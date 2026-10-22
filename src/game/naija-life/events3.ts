import { INVESTMENTS } from "./data";
import { I, bump, jobDef, randomName, stateOf } from "./helpers";
import type { AutoDef, EventDef, Player } from "./types";
import { chance, clamp, naira, pick, rand, randInt } from "./util";
import { lookToStr, randomLook, strToLook } from "./look";
import { addPartner } from "./relationships";
import { developCondition } from "./health";

const adult = (p: Player) => p.age >= 18;
const food = (p: Player) => ["akara", "corn", "suya", "purewater"].includes(p.job?.id ?? "");
const selfEmployed = (p: Player) => Boolean(jobDef(p)?.selfEmployed);

export const EVENTS3: EventDef[] = [
  // ------------------------------ school age ------------------------------
  {
    id: "waec_cheat",
    title: "Exam malpractice",
    weight: (p) => (p.school?.stage === "secondary" && p.age >= 15 ? 3 : 0),
    text: () => "Exam hall. One boy behind you dey whisper: 'Abeg, na chemistry. Make I copy small.' Another one dey sell 'expo' for ₦5,000 outside.",
    choices: (p) => [
      { label: "Study and write on your own", run: (q) => { bump(q, "smarts", 3); bump(q, "stress", 5); return "You sweat but you write am yourself. Clean conscience."; } },
      { label: "Buy the 'expo'", sub: naira(I(p, 5_000)), run: (q) => { q.money -= I(q, 5_000); if (chance(0.3)) { bump(q, "reputation", -10); bump(q, "smarts", -2); return "Supervisor catch you. Result cancelled. Mama wan flog you."; } bump(q, "smarts", -1); return "The 'expo' work. You pass but your brain dey sleep."; } },
      { label: "Let the boy copy from you", run: (q) => { bump(q, "reputation", 2); bump(q, "connections", 1); return "He finish with your answers. Next week, he buy you suya."; } },
    ],
  },
  {
    id: "teacher_flog",
    title: "Teacher with cane",
    weight: (p) => (p.age >= 6 && p.age <= 16 && p.school ? 1.2 : 0),
    text: () => "You reach school late because of go-slow. Teacher dey stand at the gate with long cane: 'Latecomers, line up!'",
    choices: () => [
      { label: "Take the strokes", run: (q) => { bump(q, "health", -2); bump(q, "stress", 3); return "Six strokes of the cane. You never late again. For a week."; } },
      { label: "Tell your parents to complain", run: (q) => { q.family.happy = clamp(q.family.happy + 2); bump(q, "reputation", -2); return "Your father storm the school. Teacher apologise, but your classmates dey call you 'mama's pikin'."; } },
      { label: "Skip school for the day", run: (q) => { bump(q, "smarts", -2); bump(q, "happiness", 4); return "You go play football by the roadside. Tomorrow you go pay for am."; } },
    ],
  },
  {
    id: "inter_house",
    title: "Inter-house sports",
    weight: (p) => (p.age >= 8 && p.age <= 17 && p.school ? 1 : 0),
    text: () => "Inter-house sports day! Red house, Blue house, Yellow house. Your house captain call your name: 'You must run the 100 metres!'",
    choices: () => [
      { label: "Run like Usain Bolt", run: (q) => { if (chance(0.4 + q.stats.health / 250)) { bump(q, "reputation", 5); bump(q, "happiness", 8); return "You fly like jet! Your house win and everybody carry you shoulder-high."; } bump(q, "health", -3); return "You trip and fall for the 60 metre mark. The dust dey follow you for one week."; } },
      { label: "Sit under the canopy and drink Fanta", run: (q) => { bump(q, "happiness", 3); return "Spectator life is a peaceful life."; } },
    ],
  },
  {
    id: "extra_lessons",
    title: "Lesson teacher",
    weight: (p) => (p.age >= 8 && p.age <= 17 && p.school && p.classAtBirth !== "struggling" ? 1.2 : 0),
    text: () => "Your parents wan send you for evening lessons: 'Mr. Chidi teach Maths well well. Dem say all his students pass JAMB.'",
    choices: () => [
      { label: "Go for lessons", run: (q) => { bump(q, "smarts", 4); bump(q, "stress", 3); return "Sit for room full of sweaty students for two hours. Maths finally begin make sense."; } },
      { label: "Beg to skip", run: (q) => { bump(q, "happiness", 3); bump(q, "smarts", -1); return "You win the argument. Grades pay the price."; } },
    ],
  },
  // ------------------------------ young adult ------------------------------
  {
    id: "fake_job_offer",
    title: "Dubai job offer",
    weight: (p) => (p.age >= 18 && p.age <= 36 && (!p.job || p.money < I(p, 1_000_000)) ? 2.5 : 0),
    text: () => "A WhatsApp message: 'Congratulations! Your CV was selected for a hotel job in Dubai. Salary: $2,000/month. Visa processing fee: ₦400,000 only.'",
    choices: (p) => [
      { label: "Pay the agent", sub: naira(I(p, 400_000)), disabled: p.money < I(p, 400_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 400_000); if (chance(0.15)) { q.money += I(q, 3_000_000); return "Wow, the thing real! You land a hospitality job abroad and start sending dollars home."; } bump(q, "stress", 10); return "The number switch off. The 'agency' vanish. Another Naija scam."; } },
      { label: "Check the agency online", run: (q) => { bump(q, "smarts", 2); return "No website, no address, no registration. You block the number."; } },
      { label: "Ignore it", run: () => "You don see this one before. No be your first time." },
    ],
  },
  {
    id: "club_night",
    title: "Amapiano night",
    weight: (p) => (p.age >= 18 && p.age <= 40 ? 2.5 : 0),
    text: () => "Friday night. Your friends dey call: 'The DJ is bringing the amapiano vibes. Table reservation na ₦150k. Make we go enjoy small!'",
    choices: (p) => [
      { label: "Go all out", sub: naira(I(p, 150_000)), disabled: p.money < I(p, 150_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 150_000); bump(q, "happiness", 10); bump(q, "connections", 3); bump(q, "health", -2); return "You dance till 4am, meet interesting people and hang over till Sunday."; } },
      { label: "Go but spend small", run: (q) => { q.money -= I(q, 20_000); bump(q, "happiness", 4); return "You nurse one drink for four hours and dey enjoy am."; } },
      { label: "Stay home with Netflix", run: (q) => { bump(q, "stress", -3); return "You call am self-care. Your friends call am 'dull'."; } },
    ],
  },
  {
    id: "remote_job",
    title: "Dollar job offer",
    weight: (p) => (p.age >= 20 && p.age <= 45 && p.stats.smarts >= 65 && p.edu === "tertiary" && stateOf(p).opp >= 4 ? 0.9 : 0),
    text: () => "A foreign startup message you on LinkedIn: 'We love your profile. Remote role, $3,000 a month. Interview Friday.'",
    choices: () => [
      { label: "Ace the interview", run: (q) => { if (chance(0.4 + q.stats.smarts / 250)) { q.money += I(q, 4_000_000); bump(q, "happiness", 8); bump(q, "connections", 3); return "You get the job! Dollar salary hit your account every month. Naira dey cry in a corner."; } bump(q, "stress", 4); return "You miss out for the final round. Light cut during the Zoom, abeg."; } },
      { label: "Not for me", run: () => "You prefer to stay where you are." },
    ],
  },
  {
    id: "aunty_matchmaker",
    title: "Aunty's candidate",
    weight: (p) => (!p.spouse && !p.flags.dating && p.age >= 22 && p.age <= 40 ? 2.5 : 0),
    init: (p) => { const g = p.gender === "male" ? "female" : "male"; return { name: randomName(p.tribe, g), look: lookToStr(randomLook(g, { region: stateOf(p).region, religion: p.religion })) }; },
    text: (_p, d) => `Aunty call you after service: 'I don see one very good person for you, ${d.name} from our church/mosque. Responsible, hardworking, fine too. No dull yourself!'`,
    choices: (_p, d) => [
      { label: "Meet them for a date", run: (q) => { if (chance(0.4 + q.stats.looks / 300)) { { const g2 = q.gender === "male" ? "female" : "male"; const pn = addPartner(q, { name: String(d.name), look: strToLook(String(d.look)) ?? randomLook(g2), gender: g2 }, "dating"); q.flags.dating = String(d.name); q.flags.datingLook = String(d.look); q.flags.datingNpc = pn.id; } bump(q, "happiness", 8); return "The date go very well. Aunty don start planning the aso-ebi."; } bump(q, "happiness", -2); return "No spark at all. Aunty vex but she go find another."; } },
      { label: "Politely refuse", run: (q) => { q.family.happy = clamp(q.family.happy - 3); return "Aunty hiss and say 'you go regret this one'."; } },
    ],
  },
  // ------------------------------ adult life ------------------------------
  {
    id: "church_building",
    title: "Building fund",
    weight: (p) => (adult(p) && p.religion !== "Traditional" && p.money > I(p, 1_000_000) ? 2 : 0),
    text: (p) => `${p.religion === "Muslim" ? "Mosque" : "Church"} dey build a new auditorium. The treasurer dey read donors' names aloud and everybody dey wait to hear your own.`,
    choices: (p) => [
      { label: "Give big", sub: naira(Math.max(I(p, 500_000), p.money * 0.04)), run: (q) => { const a = Math.max(I(q, 500_000), q.money * 0.04); q.money -= a; bump(q, "reputation", 7); bump(q, "connections", 3); return `Your name read first and dem clap. ${naira(a)} well spent.`; } },
      { label: "Give small", sub: naira(I(p, 20_000)), run: (q) => { q.money -= I(q, 20_000); bump(q, "reputation", 1); return "Dem thank you with a polite smile."; } },
      { label: "Avoid the service", run: (q) => { bump(q, "reputation", -2); return "You find 'urgent work' that Sunday."; } },
    ],
  },
  {
    id: "solar",
    title: "Solar or generator?",
    weight: (p) => (adult(p) && !p.flags.solar && p.money > I(p, 2_500_000) ? 2.5 : 0),
    text: () => "Another fuel price hike! Generator don dey chop half your salary. A solar installer show you one package: 'Pay once, and NEPA go be your past.'",
    choices: (p) => [
      { label: "Install solar", sub: naira(I(p, 2_500_000)), disabled: p.money < I(p, 2_500_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 2_500_000); q.flags.solar = true; bump(q, "stress", -4); q.prestige += 1; return "Light! Day and night. Your neighbours dey chop envy for breakfast."; } },
      { label: "Keep the generator", run: (q) => { bump(q, "stress", 2); return "You dey manage. One day you go switch."; } },
    ],
  },
  {
    id: "buy_car",
    title: "Car matter",
    weight: (p) => (adult(p) && !p.flags.car && p.money > I(p, 8_000_000) ? 2.5 : 0),
    text: () => "Public transport dey stress you: late buses, 'one chance' fear, standing for 2 hours. A dealer show you one clean Tokunbo ('Belgium used') Toyota.",
    choices: (p) => [
      { label: "Buy the Tokunbo", sub: naira(I(p, 6_000_000)), disabled: p.money < I(p, 6_000_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 6_000_000); q.flags.car = true; q.prestige += 1; bump(q, "happiness", 8); bump(q, "stress", -4); return "Your own car! You dey drive with AC, music, and a small air freshener for mirror."; } },
      { label: "Buy a brand-new SUV", sub: naira(I(p, 28_000_000)), disabled: p.money < I(p, 28_000_000) ? "Only for big people" : false, run: (q) => { q.money -= I(q, 28_000_000); q.flags.car = true; q.prestige += 3; bump(q, "happiness", 12); bump(q, "reputation", 4); return "Fresh from the showroom. Neighbours dey peep through the window."; } },
      { label: "Keep using public transport", run: (q) => { bump(q, "stress", 2); return "You save your money and your patience."; } },
    ],
  },
  {
    id: "car_breakdown",
    title: "Car don scatter",
    weight: (p) => (p.flags.car ? 3 : 0),
    text: () => "Your car stop for the middle of the bridge. Hot sun, honking everywhere, and one 'mechanic' appear from nowhere: 'Oga, na gearbox.' (It was a loose wire.)",
    choices: (p) => [
      { label: "Pay the roadside mechanic", sub: naira(I(p, 120_000)), run: (q) => { q.money -= I(q, 120_000); return "He fix am in 10 minutes and collect ₦120K. 'Na labour', he say."; } },
      { label: "Tow it to your trusted mechanic", sub: naira(I(p, 60_000)), run: (q) => { q.money -= I(q, 60_000); bump(q, "stress", 3); return "Your own mechanic fix am proper. Takes longer, costs less."; } },
    ],
  },
  {
    id: "sibling_wedding",
    title: "Your sibling's wedding",
    weight: (p) => (adult(p) && p.age >= 24 && p.family.parentsAlive ? 2 : 0),
    text: () => "Your younger sibling is getting married and the family expects you to carry the 'big sibling' responsibility: aso-ebi, caterers, and a car for the couple.",
    choices: (p) => [
      { label: "Foot most of the bill", sub: naira(I(p, 3_000_000)), disabled: p.money < I(p, 3_000_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 3_000_000); q.family.happy = clamp(q.family.happy + 15); bump(q, "reputation", 6); return "The whole family call you 'Oga at the top'. Your sibling cry for happiness."; } },
      { label: "Contribute small", sub: naira(I(p, 500_000)), run: (q) => { q.money -= I(q, 500_000); q.family.happy = clamp(q.family.happy + 3); return "You give what you can. They accept with a polite smile."; } },
      { label: "Attend but contribute nothing", run: (q) => { q.family.happy = clamp(q.family.happy - 8); bump(q, "reputation", -3); return "You eat the jollof but family no forget."; } },
    ],
  },
  {
    id: "parent_sick",
    title: "Papa/Mama is sick",
    weight: (p) => (adult(p) && p.age >= 30 && p.family.parentsAlive ? 2.2 : 0),
    text: () => "Phone call at midnight: your parent don collapse. The village clinic want ₦500K deposit before dem touch am. 'Abeg send money quick!'",
    choices: (p) => [
      { label: "Move them to a private hospital in the city", sub: naira(I(p, 2_000_000)), disabled: p.money < I(p, 2_000_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 2_000_000); q.family.happy = clamp(q.family.happy + 12); bump(q, "reputation", 4); return "Dem recover well. Your parent say: 'God go bless you, my pikin.'"; } },
      { label: "Pay the village clinic deposit", sub: naira(I(p, 500_000)), run: (q) => { q.money -= I(q, 500_000); if (chance(0.65)) { q.family.happy = clamp(q.family.happy + 6); return "Dem manage to recover. The clinic drug just enough."; } q.family.parentsAlive = false; bump(q, "happiness", -20); return "Dem no survive. You send money but you never reach home on time."; } },
      { label: "Pray and hope", run: (q) => { q.family.happy = clamp(q.family.happy - 12); bump(q, "stress", 8); return "You feel helpless, and the family remembers."; } },
    ],
  },
  {
    id: "account_freeze",
    title: "Account frozen",
    weight: (p) => (adult(p) && p.money > I(p, 1_000_000) ? 2 : 0),
    text: () => "You wake up and try to transfer: 'Post No Debit (PND) placed on account.' You did one P2P trade last week with a stranger. The bank no talk why.",
    choices: (p) => [
      { label: "Rush to the bank with KYC documents", run: (q) => { bump(q, "stress", 7); if (chance(0.8)) return "After two days and plenty queueing, dem lift the PND. 'System error', dem say."; q.money -= q.money * 0.05; return "They lift it after three weeks and your business suffer. The 'system error' was never explained."; } },
      { label: "Hire a lawyer to write the bank", sub: naira(I(p, 300_000)), run: (q) => { q.money -= I(q, 300_000); return "The lawyer's letter work faster than your tears."; } },
      { label: "Wait it out", run: (q) => { bump(q, "stress", 9); q.money -= I(q, 100_000); return "Everything stand still for a month. You borrow to feed."; } },
    ],
  },
  {
    id: "tax_officer",
    title: "Tax officers",
    weight: (p) => (adult(p) && (selfEmployed(p) || p.job) && p.money > I(p, 5_000_000) ? 2 : 0),
    text: () => "Men in LIRS-type vests enter your shop/office: 'Where your TIN? You never pay tax since 3 years. We wan seal this place!'",
    choices: (p) => [
      { label: "Pay the legit tax", sub: naira(p.money * 0.03), run: (q) => { const a = q.money * 0.03; q.money -= a; bump(q, "reputation", 2); return `You pay ${naira(a)} and get a proper receipt. Clean books, clean sleep.`; } },
      { label: "Settle them quietly", sub: naira(I(p, 400_000)), run: (q) => { q.money -= I(q, 400_000); bump(q, "reputation", -3); return "Cheaper, but the same officers come back every year."; } },
      { label: "Argue and threaten to call a lawyer", run: (q) => { if (chance(0.45)) return "They back down when dem see you know your rights."; q.money -= I(q, 900_000); return "They seal your place for a week and charge reopening 'fees'."; } },
    ],
  },
  {
    id: "nafdac",
    title: "Food inspectors",
    weight: (p) => (food(p) ? 3 : 0),
    text: () => "Health inspectors visit your spot: 'Madam/Oga, where your NAFDAC number and food-handler certificate? We go close this place today!'",
    choices: (p) => [
      { label: "Get proper certification", sub: naira(I(p, 250_000)), run: (q) => { q.money -= I(q, 250_000); bump(q, "reputation", 4); return "You complete the process. Customers see the certificate and trust you more."; } },
      { label: "Settle the inspectors", sub: naira(I(p, 60_000)), run: (q) => { q.money -= I(q, 60_000); return "They collect 'small appreciation' and disappear. Until next season."; } },
      { label: "Close for a week while you sort it", run: (q) => { q.money -= I(q, 100_000); return "You lose a week of sales but avoid wahala."; } },
    ],
  },
  {
    id: "rival_vendor",
    title: "New competitor",
    weight: (p) => (selfEmployed(p) ? 3 : 0),
    text: () => "Another person open the same business right beside yours and cut the price by half. Your customers dey look both side like pedestrian.",
    choices: (p) => [
      { label: "Match the price", run: (q) => { q.money -= I(q, 150_000); return "Price war! Both of you dey bleed, but customers dey happy."; } },
      { label: "Improve your quality", sub: naira(I(p, 200_000)), run: (q) => { q.money -= I(q, 200_000); bump(q, "reputation", 4); return "Better packaging, better taste. Regular customers stay loyal."; } },
      { label: "Sabotage them (reports to LASTMA/officials)", run: (q) => { bump(q, "reputation", -6); if (chance(0.6)) return "Authorities clear his stall. You win, but people talk."; return "He found out. Now there is an ongoing war."; } },
    ],
  },
  {
    id: "celebrity_order",
    title: "Big order",
    weight: (p) => (selfEmployed(p) ? 2 : 0),
    text: () => "A celebrity's PA call: 'Madam/Oga says he heard about your business. We need 500 packs for an event this weekend. Can you deliver?'",
    choices: (p) => [
      { label: "Take it, hire extra hands", sub: naira(I(p, 250_000)), run: (q) => { q.money -= I(q, 250_000); if (chance(0.75)) { const g = I(q, rand(350_000, 1_400_000)); q.money += g; bump(q, "reputation", 6); return `You deliver. The celebrity tag you online and the money enter: ${naira(g)}.`; } bump(q, "stress", 8); return "You couldn't complete on time. They cancelled and refused to pay you for the part you finished."; } },
      { label: "Decline politely", run: () => "You no wan stress your business beyond capacity." },
    ],
  },
  {
    id: "shop_rent",
    title: "Shop rent hike",
    weight: (p) => (selfEmployed(p) ? 2.4 : 0),
    text: () => "Your shop landlord say rent increase by 50% from next month. 'Lagos/Abuja market price, my friend.'",
    choices: (p) => [
      { label: "Pay and keep the spot", sub: naira(I(p, 200_000)), run: (q) => { q.money -= I(q, 200_000); return "Location, location, location. You keep your customers."; } },
      { label: "Relocate to a cheaper area", run: (q) => { q.money -= I(q, 80_000); bump(q, "stress", 5); if (chance(0.5)) return "Fewer customers but cheaper rent. You manage."; q.money -= I(q, 150_000); return "Nobody find you in the new spot. Sales drop for months."; } },
    ],
  },
  {
    id: "wrongful_arrest",
    title: "Wrongfully arrested",
    weight: (p) => (p.age >= 18 && p.age <= 45 && !p.politics ? 1.4 : 0),
    text: () => "Police round up everyone for the area after a robbery. You are among the people for the van. 'Na bail or na cell, oga.'",
    choices: (p) => [
      { label: "Pay for bail", sub: naira(I(p, 150_000)), run: (q) => { q.money -= I(q, 150_000); return "You pay 'bail' (which is free by law) and go home angry."; } },
      { label: "Call a lawyer", sub: naira(I(p, 400_000)), run: (q) => { q.money -= I(q, 400_000); bump(q, "smarts", 1); return "Your lawyer shouts 'illegal detention!' and you walk out within the hour."; } },
      { label: "Wait it out in the cell", run: (q) => { bump(q, "health", -6); bump(q, "stress", 10); return "Two nights in a crowded cell. You smell worse than you ever did."; } },
    ],
  },
  {
    id: "one_chance",
    title: "'One chance' bus",
    weight: (p) => (adult(p) && p.traveled ? 3.5 : adult(p) ? 0.6 : 0),
    text: () => "You board an unmarked bus at night and notice everyone for the back dey silent. The door lock click. 'This na one chance.'",
    choices: () => [
      { label: "Hand over everything quietly", run: (q) => { const l = Math.max(0, q.money * rand(0.05, 0.2)); q.money -= l; bump(q, "stress", 12); return `They empty your pockets (${naira(l)}), take your phone and drop you far from anywhere. You are alive.`; } },
      { label: "Shout and fight", run: (q) => { if (chance(0.35)) { bump(q, "reputation", 4); return "Passengers wake up and fight with you. The robbers jump out. Local heroes."; } q.money -= Math.max(0, q.money * 0.2); const r = developCondition(q, "stab"); return { text: "They stab and beat you badly before dumping you by the roadside.", spawn: r.pending }; } },
    ],
  },
  {
    id: "festival_spend",
    title: "Festival market",
    weight: (p) => (adult(p) && p.money > I(p, 400_000) ? 2.4 : 0),
    text: (p) => (p.religion === "Muslim" ? "Sallah is near. Ram prices don scatter the market: ₦500K for a small ram, family expects a big one." : p.religion === "Traditional" ? "New Yam festival is here. Everyone expects you to bring food and drinks for the village square." : "Christmas is near. Rice, chicken, beans, goat... shopping list as long as Third Mainland Bridge."),
    choices: (p) => [
      { label: "Go big (ram/chicken & hampers for all)", sub: naira(I(p, 600_000)), disabled: p.money < I(p, 600_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 600_000); bump(q, "reputation", 5); q.family.happy = clamp(q.family.happy + 6); bump(q, "happiness", 5); return "Full house, laughter, and neighbours lining up with plates. You carry the festival."; } },
      { label: "Keep it modest", sub: naira(I(p, 150_000)), run: (q) => { q.money -= I(q, 150_000); bump(q, "happiness", 3); return "Small but heartfelt. Nobody complain."; } },
      { label: "Skip the spending", run: (q) => { bump(q, "reputation", -3); return "'Why your house quiet like cemetery?' neighbours ask."; } },
    ],
  },
  {
    id: "crowdfund",
    title: "WhatsApp group appeal",
    weight: (p) => (adult(p) && p.money > I(p, 200_000) ? 2.2 : 0),
    text: () => "A message pops up on the family WhatsApp group: 'Cousin Tunde needs urgent surgery. ₦2.5M required. Please give what you can. God bless you.' Everyone is waiting to see who drops first.",
    choices: (p) => [
      { label: "Drop a big one", sub: naira(I(p, 500_000)), disabled: p.money < I(p, 500_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 500_000); q.family.happy = clamp(q.family.happy + 8); bump(q, "reputation", 5); return "Everyone respond with prayer emojis and send what they can. Tunde pull through."; } },
      { label: "Send something small", sub: naira(I(p, 50_000)), run: (q) => { q.money -= I(q, 50_000); q.family.happy = clamp(q.family.happy + 2); return "You do your part and mute the group."; } },
      { label: "Leave the group", run: (q) => { q.family.happy = clamp(q.family.happy - 10); return "You hit 'Exit group'. Your mother dey call you the next morning."; } },
    ],
  },
  {
    id: "kid_private_school",
    title: "Kids' school wahala",
    weight: (p) => (p.kids.some((k) => k.age >= 4 && k.age <= 14) ? 2.5 : 0),
    text: () => "Your child's teacher call you: 'This child is bright, but the school lack facilities. Many parents move to a private school across town.'",
    choices: (p) => [
      { label: "Move to a good private school", sub: naira(I(p, 1_200_000)), disabled: p.money < I(p, 1_200_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 1_200_000); bump(q, "happiness", 5); return "School bus, small class sizes and a school lunch that no be rice only."; } },
      { label: "Stay and supplement with lessons", sub: naira(I(p, 150_000)), run: (q) => { q.money -= I(q, 150_000); return "Extra lessons at home. Child dey manage."; } },
    ],
  },
  {
    id: "invest_tip",
    title: "Investment tip",
    weight: (p) => (adult(p) && p.money > I(p, 3_000_000) && p.holdings.length === 0 ? 2.2 : 0),
    text: () => "Your colleague talk about how he put money for dollars and treasury bills: 'Naira dey fall every year. Keep your cash for bank and you dey lose.'",
    choices: (p) => [
      { label: "Put 30% into dollars", sub: naira(p.money * 0.3), run: (q) => { const a = q.money * 0.3; const opt = INVESTMENTS.find((o) => o.kind === "usd"); if (!opt) return "No option available."; q.money -= a; q.holdings.push({ id: `usd-${q.age}`, kind: "usd", label: opt.label, invested: a, value: a }); return `You move ${naira(a)} into dollars. At least it will not melt like ice.`; } },
      { label: "Keep it in the bank", run: (q) => { bump(q, "smarts", -1); return "You trust the bank more than the market. Inflation trusts you less."; } },
    ],
  },
  {
    id: "estate_levy",
    title: "Estate levy",
    weight: (p) => (p.houses.length > 0 ? 2 : 0),
    text: () => "The estate association chairman call a meeting: 'Transformer don burst, gate need repairing, security men need payment. Everybody pay ₦250K levy.'",
    choices: (p) => [
      { label: "Pay and keep the peace", sub: naira(I(p, 250_000)), run: (q) => { q.money -= I(q, 250_000); bump(q, "reputation", 2); return "You pay and your estate keeps the light on and the guards awake."; } },
      { label: "Refuse to pay", run: (q) => { bump(q, "reputation", -4); bump(q, "stress", 5); return "They cut your gate access. Awkward neighbours for months."; } },
    ],
  },
  {
    id: "town_hall",
    title: "Town hall meeting",
    weight: (p) => ((p.politics?.office ?? -1) >= 0 ? 3 : 0),
    text: () => "Your constituents gather at the town hall: 'Our roads are bad, our hospital has no drugs, and our youths no get work. What are you doing about it?'",
    choices: () => [
      { label: "Promise real projects (and deliver)", run: (q) => { q.nation.approval = clamp(q.nation.approval + 7); q.nation.economy = clamp(q.nation.economy + 3); q.goodDeeds += 1; return "You announce dates and budgets. For once, the crowd believe you."; } },
      { label: "Promise big and forget", run: (q) => { q.nation.approval = clamp(q.nation.approval + 4); q.nation.heat = clamp(q.nation.heat + 3); return "They clap now. They go remember during the next election."; } },
      { label: "Send your deputy", run: (q) => { q.nation.approval = clamp(q.nation.approval - 5); return "Empty chair for the front row. The press quickly notice."; } },
    ],
  },
];

export const AUTOS3: AutoDef[] = [
  { id: "up_nepa", weight: (p) => (p.age >= 8 ? 3 : 0), run: (p) => { bump(p, "happiness", 6); return "'UP NEPA!' Light come and stay three days straight. The whole street dey scream with joy."; } },
  { id: "heat_wave", weight: (p) => (["kano", "sokoto", "katsina", "borno", "yobe", "jigawa", "zamfara", "bauchi", "gombe", "kebbi"].includes(p.state) ? 3 : 1), run: (p) => { bump(p, "health", -3); bump(p, "stress", 3); return "Heat wave. Fan dey blow hot air, and sleep become a rumour."; } },
  { id: "agbero", weight: (p) => (p.age >= 16 && p.traveled ? 3 : 1), run: (p) => { if (p.age >= 18) p.money -= I(p, 15_000); return "Agbero for the motor park demand 'ticket' money before you can load. Forget wetin you know, just pay."; } },
  { id: "aso_ebi", weight: (p) => (adult(p) ? 2.5 : 0), run: (p) => { p.money -= I(p, 90_000); bump(p, "happiness", 2); return "Aso-ebi fabric arrive and the tailor tells you to 'come back next week' four times."; } },
  { id: "pidgin_proverb", weight: () => 2, run: (p) => { bump(p, "smarts", 1); return pick(["Elder tell you: 'Wetin old man see sitting down, small pikin no fit see am even if e climb tree.'", "Your grandmother remind you: 'Slow and steady wins the race, but bring chop along.'", "Auntie says: 'Na who dey carry load dey know the weight.'"]); } },
  { id: "birthday", weight: (p) => (adult(p) ? 1.5 : 0), run: (p) => { bump(p, "happiness", 5); p.money -= I(p, 30_000); return "Friends surprise you with cake and suya. You pretend to be shy. You are not."; } },
  { id: "sidehustle_win", weight: (p) => (adult(p) ? 1.5 : 0), run: (p) => { const g = I(p, randInt(30_000, 150_000)); p.money += g; return `A small deal you almost forgot about pay out: ${naira(g)}.`; } },
  { id: "police_extortion", weight: (p) => (adult(p) && !p.politics ? 1.5 : 0), run: (p) => { p.money -= I(p, 20_000); bump(p, "stress", 3); return "Police stop your bus 'for routine check' and the whole bus pay 'tea money'."; } },
  { id: "enrol_kids", weight: (p) => (p.kids.length > 0 ? 1.5 : 0), run: (p) => { bump(p, "happiness", 3); return "Your child say something so smart that you take it for the family WhatsApp group."; } },
  { id: "bad_road", weight: (p) => (stateOf(p).opp <= 4 ? 3 : 1), run: (p) => { bump(p, "stress", 3); p.money -= adult(p) ? I(p, 40_000) : 0; return "The road to the main market don collapse again. Taxi fares double, and the councillor 'is aware'."; } },
  { id: "enter_trouble_free", weight: (p) => (p.age >= 12 ? 1.5 : 0), run: (p) => { bump(p, "reputation", 1); return "You help an old woman cross the road and she bless you for ten minutes."; } },
];
