import { INVESTMENTS } from "./data";
import { I, bump, jobDef, randomName, stateOf } from "./helpers";
import type { AutoDef, EventDef, Player } from "./types";
import { T, chance, clamp, dual, naira, pick, rand, randInt } from "./util";
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
    title: dual("Exam malpractice", "Exam runs"),
    weight: (p) => (p.school?.stage === "secondary" && p.age >= 15 ? 3 : 0),
    text: () => T("Exam hall. A boy behind you whispers: 'Please, it's chemistry. Let me copy a little.' Another one is selling 'expo' (leaked answers) for ₦5,000 outside.", "Exam hall. One boy behind you dey whisper: 'Abeg, na chemistry. Make I copy small.' Another one dey sell 'expo' for ₦5,000 outside."),
    choices: (p) => [
      { label: T("Study and write on your own", "Read and write am yourself"), run: (q) => { bump(q, "smarts", 3); bump(q, "stress", 5); return T("You sweat, but you write it yourself. Clean conscience.", "You sweat but you write am yourself. Your conscience clean."); } },
      { label: T("Buy the 'expo'", "Buy the 'expo'"), sub: naira(I(p, 5_000)), run: (q) => { q.money -= I(q, 5_000); if (chance(0.3)) { bump(q, "reputation", -10); bump(q, "smarts", -2); return T("The supervisor catches you. Result cancelled. Mama wants to flog you.", "Supervisor catch you. Dem cancel your result. Mama wan flog you."); } bump(q, "smarts", -1); return T("The 'expo' works. You pass, but your brain goes to sleep.", "The 'expo' work. You pass but your brain dey sleep."); } },
      { label: T("Let the boy copy from you", "Allow the boy copy"), run: (q) => { bump(q, "reputation", 2); bump(q, "connections", 1); return T("He finishes with your answers. Next week, he buys you suya.", "He use your answers finish. Next week, he buy you suya."); } },
    ],
  },
  {
    id: "teacher_flog",
    title: dual("Teacher with cane", "Teacher with cane"),
    weight: (p) => (p.age >= 6 && p.age <= 16 && p.school ? 1.2 : 0),
    text: () => T("You reach school late because of traffic. The teacher is standing at the gate with a long cane: 'Latecomers, line up!'", "You reach school late because of go-slow. Teacher dey stand for gate with long cane: 'Latecomers, line up!'"),
    choices: () => [
      { label: T("Take the strokes", "Collect the strokes"), run: (q) => { bump(q, "health", -2); bump(q, "stress", 3); return T("Six strokes of the cane. You are never late again. For a week.", "Six strokes of cane. You no go late again. For one week."); } },
      { label: T("Tell your parents to complain", "Tell your parents make dem complain"), run: (q) => { q.family.happy = clamp(q.family.happy + 2); bump(q, "reputation", -2); return T("Your father storms the school. The teacher apologises, but your classmates call you 'mama's boy'.", "Your papa storm the school. Teacher apologise, but your mates dey call you 'mama's pikin'."); } },
      { label: T("Skip school for the day", "Skip school today"), run: (q) => { bump(q, "smarts", -2); bump(q, "happiness", 4); return T("You go and play football by the roadside. Tomorrow you will pay for it.", "You go play football by the roadside. Tomorrow you go pay for am."); } },
    ],
  },
  {
    id: "inter_house",
    title: dual("Inter-house sports", "Inter-house sports"),
    weight: (p) => (p.age >= 8 && p.age <= 17 && p.school ? 1 : 0),
    text: () => T("Inter-house sports day! Red house, Blue house, Yellow house. Your house captain calls your name: 'You must run the 100 metres!'", "Inter-house sports day! Red house, Blue house, Yellow house. Your house captain call your name: 'You must run the 100 metres!'"),
    choices: () => [
      { label: T("Run like Usain Bolt", "Run like Usain Bolt"), run: (q) => { if (chance(0.4 + q.stats.health / 250)) { bump(q, "reputation", 5); bump(q, "happiness", 8); return T("You fly like a jet! Your house wins and everybody carries you shoulder-high.", "You fly like jet! Your house win and everybody carry you shoulder-high."); } bump(q, "health", -3); return T("You trip and fall at the 60 metre mark. The dust follows you for a week.", "You trip fall for 60 metre mark. The dust follow you for one week."); } },
      { label: T("Sit under the canopy and drink Fanta", "Sit under canopy drink Fanta"), run: (q) => { bump(q, "happiness", 3); return T("Spectator life is a peaceful life.", "Spectator life na peaceful life."); } },
    ],
  },
  {
    id: "extra_lessons",
    title: dual("Lesson teacher", "Lesson teacher"),
    weight: (p) => (p.age >= 8 && p.age <= 17 && p.school && p.classAtBirth !== "struggling" ? 1.2 : 0),
    text: () => T("Your parents want to send you to evening lessons: 'Mr. Chidi teaches Maths very well. They say all his students pass JAMB.'", "Your parents wan send you go evening lessons: 'Mr. Chidi dey teach Maths well well. Dem say all him students pass JAMB.'"),
    choices: () => [
      { label: T("Go for lessons", "Go for lessons"), run: (q) => { bump(q, "smarts", 4); bump(q, "stress", 3); return T("You sit in a room full of sweaty students for two hours. Maths finally begins to make sense.", "You sit for room full of sweaty students for two hours. Maths finally begin make sense."); } },
      { label: T("Beg to skip", "Beg make you no go"), run: (q) => { bump(q, "happiness", 3); bump(q, "smarts", -1); return T("You win the argument. Your grades pay the price.", "You win the argument. Your grades go pay the price."); } },
    ],
  },
  // ------------------------------ young adult ------------------------------
  {
    id: "fake_job_offer",
    title: dual("Dubai job offer", "Dubai job offer"),
    weight: (p) => (p.age >= 18 && p.age <= 36 && (!p.job || p.money < I(p, 1_000_000)) ? 2.5 : 0),
    text: () => T("A WhatsApp message: 'Congratulations! Your CV was selected for a hotel job in Dubai. Salary: $2,000/month. Visa processing fee: ₦400,000 only.'", "WhatsApp message land: 'Congratulations! Dem select your CV for hotel job for Dubai. Salary: $2,000/month. Visa processing fee: ₦400,000 only.'"),
    choices: (p) => [
      { label: T("Pay the agent", "Pay the agent"), sub: naira(I(p, 400_000)), disabled: p.money < I(p, 400_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 400_000); if (chance(0.15)) { q.money += I(q, 3_000_000); return T("Wow, it is real! You land a hospitality job abroad and start sending dollars home.", "Wow, the thing real o! You land hospitality job abroad and start to send dollars come house."); } bump(q, "stress", 10); return T("The number is switched off. The 'agency' vanishes. Another Naija scam.", "The number switch off. The 'agency' vanish. Another Naija scam."); } },
      { label: T("Check the agency online", "Check the agency online"), run: (q) => { bump(q, "smarts", 2); return T("No website, no address, no registration. You block the number.", "No website, no address, no registration. You block the number."); } },
      { label: T("Ignore it", "Ignore am"), run: () => T("You have seen this before. It is not your first time.", "You don see this one before. No be your first time.") },
    ],
  },
  {
    id: "club_night",
    title: dual("Amapiano night", "Amapiano night"),
    weight: (p) => (p.age >= 18 && p.age <= 40 ? 2.5 : 0),
    text: () => T("Friday night. Your friends are calling: 'The DJ is bringing the amapiano vibes. Table reservation is ₦150k. Let's go and enjoy ourselves!'", "Friday night. Your friends dey call: 'The DJ go bring amapiano vibes. Table reservation na ₦150k. Make we go enjoy small!'"),
    choices: (p) => [
      { label: T("Go all out", "Go full throttle"), sub: naira(I(p, 150_000)), disabled: p.money < I(p, 150_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 150_000); bump(q, "happiness", 10); bump(q, "connections", 3); bump(q, "health", -2); return T("You dance till 4am, meet interesting people and nurse a hangover till Sunday.", "You dance reach 4am, meet fine people and hangover follow you reach Sunday."); } },
      { label: T("Go but spend small", "Go but spend small"), run: (q) => { q.money -= I(q, 20_000); bump(q, "happiness", 4); return T("You nurse one drink for four hours and enjoy it.", "You nurse one drink for four hours and dey enjoy am."); } },
      { label: T("Stay home with Netflix", "Stay house watch Netflix"), run: (q) => { bump(q, "stress", -3); return T("You call it self-care. Your friends call it 'dull'.", "You call am self-care. Your friends call am 'dull'."); } },
    ],
  },
  {
    id: "remote_job",
    title: dual("Dollar job offer", "Dollar job offer"),
    weight: (p) => (p.age >= 20 && p.age <= 45 && p.stats.smarts >= 65 && p.edu === "tertiary" && stateOf(p).opp >= 4 ? 0.9 : 0),
    text: () => T("A foreign startup messages you on LinkedIn: 'We love your profile. Remote role, $3,000 a month. Interview Friday.'", "One foreign startup message you for LinkedIn: 'We love your profile. Remote role, $3,000 a month. Interview Friday.'"),
    choices: () => [
      { label: T("Ace the interview", "Slay the interview"), run: (q) => { if (chance(0.4 + q.stats.smarts / 250)) { q.money += I(q, 4_000_000); bump(q, "happiness", 8); bump(q, "connections", 3); return T("You get the job! A dollar salary hits your account every month. The naira weeps in a corner.", "You get the job! Dollar salary dey hit your account every month. Naira dey cry for corner."); } bump(q, "stress", 4); return T("You miss out in the final round. The light went off during the Zoom call.", "You miss am for the final round. Light go off for middle of the Zoom, abeg."); } },
      { label: T("Not for me", "Not for me"), run: () => T("You prefer to stay where you are.", "You prefer to stay where you dey.") },
    ],
  },
  {
    id: "aunty_matchmaker",
    title: dual("Aunty's candidate", "Aunty don find person"),
    weight: (p) => (!p.spouse && !p.flags.dating && p.age >= 22 && p.age <= 40 ? 2.5 : 0),
    init: (p) => { const g = p.gender === "male" ? "female" : "male"; return { name: randomName(p.tribe, g), look: lookToStr(randomLook(g, { region: stateOf(p).region, religion: p.religion })) }; },
    text: (_p, d) => T(`Aunty calls you after service: 'I have found a very good person for you, ${d.name} from our church/mosque. Responsible, hardworking, good-looking too. Don't be foolish!'`, `Aunty call you after service: 'I don see one very good person for you, ${d.name} from our church/mosque. Responsible, hardworking, fine too. No dull yourself!'`),
    choices: (_p, d) => [
      { label: T("Meet them for a date", "Go meet am for date"), run: (q) => { if (chance(0.4 + q.stats.looks / 300)) { { const g2 = q.gender === "male" ? "female" : "male"; const pn = addPartner(q, { name: String(d.name), look: strToLook(String(d.look)) ?? randomLook(g2), gender: g2 }, "dating"); q.flags.dating = String(d.name); q.flags.datingLook = String(d.look); q.flags.datingNpc = pn.id; } bump(q, "happiness", 8); return T("The date goes very well. Aunty has already started planning the aso-ebi.", "The date go very well. Aunty don start to plan aso-ebi."); } bump(q, "happiness", -2); return T("No spark at all. Aunty is upset but she will find another.", "No spark at all. Aunty vex but she go find another one."); } },
      { label: T("Politely refuse", "Gently refuse"), run: (q) => { q.family.happy = clamp(q.family.happy - 3); return T("Aunty hisses and says 'you will regret this one'.", "Aunty hiss and talk say 'you go regret this one'."); } },
    ],
  },
  // ------------------------------ adult life ------------------------------
  {
    id: "church_building",
    title: dual("Building fund", "Building fund"),
    weight: (p) => (adult(p) && p.religion !== "Traditional" && p.money > I(p, 1_000_000) ? 2 : 0),
    text: (p) => T(`The ${p.religion === "Muslim" ? "mosque" : "church"} is building a new auditorium. The treasurer is reading donors' names aloud and everybody is waiting to hear yours.`, `${p.religion === "Muslim" ? "Mosque" : "Church"} dey build new auditorium. The treasurer dey read donors' names loud-loud and everybody dey wait to hear your own.`),
    choices: (p) => [
      { label: T("Give big", "Give big"), sub: naira(Math.max(I(p, 500_000), p.money * 0.04)), run: (q) => { const a = Math.max(I(q, 500_000), q.money * 0.04); q.money -= a; bump(q, "reputation", 7); bump(q, "connections", 3); return T(`Your name is read first and they clap. ${naira(a)} well spent.`, `Dem read your name first and dem clap. ${naira(a)} well spent.`); } },
      { label: T("Give small", "Give small"), sub: naira(I(p, 20_000)), run: (q) => { q.money -= I(q, 20_000); bump(q, "reputation", 1); return T("They thank you with a polite smile.", "Dem thank you with polite smile."); } },
      { label: T("Avoid the service", "Dodge the service"), run: (q) => { bump(q, "reputation", -2); return T("You find 'urgent work' that Sunday.", "You find 'urgent work' that Sunday."); } },
    ],
  },
  {
    id: "solar",
    title: dual("Solar or generator?", "Solar or generator?"),
    weight: (p) => (adult(p) && !p.flags.solar && p.money > I(p, 2_500_000) ? 2.5 : 0),
    text: () => T("Another fuel price hike! The generator is eating half your salary. A solar installer shows you a package: 'Pay once, and NEPA will be your past.'", "Another fuel price hike! Generator don dey chop half your salary. One solar installer show you package: 'Pay once, and NEPA go be your past.'"),
    choices: (p) => [
      { label: T("Install solar", "Install solar"), sub: naira(I(p, 2_500_000)), disabled: p.money < I(p, 2_500_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 2_500_000); q.flags.solar = true; bump(q, "stress", -4); q.prestige += 1; return T("Light! Day and night. Your neighbours have envy for breakfast.", "Light! Day and night. Your neighbours dey chop envy for breakfast."); } },
      { label: T("Keep the generator", "Keep the generator"), run: (q) => { bump(q, "stress", 2); return T("You manage. One day you will switch.", "You dey manage. One day you go switch."); } },
    ],
  },
  {
    id: "buy_car",
    title: dual("Car matter", "Car matter"),
    weight: (p) => (adult(p) && !p.flags.car && p.money > I(p, 8_000_000) ? 2.5 : 0),
    text: () => T("Public transport is stressing you: late buses, 'one chance' fear, standing for 2 hours. A dealer shows you a clean Tokunbo ('Belgium used') Toyota.", "Public transport dey stress you: late bus, 'one chance' fear, standing for 2 hours. One dealer show you clean Tokunbo ('Belgium used') Toyota."),
    choices: (p) => [
      { label: T("Buy the Tokunbo", "Buy the Tokunbo"), sub: naira(I(p, 6_000_000)), disabled: p.money < I(p, 6_000_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 6_000_000); q.flags.car = true; q.prestige += 1; bump(q, "happiness", 8); bump(q, "stress", -4); return T("Your own car! You drive with AC, music, and a little air freshener on the mirror.", "Your own car! You dey drive with AC, music, and small air freshener for mirror."); } },
      { label: T("Buy a brand-new SUV", "Buy brand-new SUV"), sub: naira(I(p, 28_000_000)), disabled: p.money < I(p, 28_000_000) ? T("Only for big people", "Na for big people") : false, run: (q) => { q.money -= I(q, 28_000_000); q.flags.car = true; q.prestige += 3; bump(q, "happiness", 12); bump(q, "reputation", 4); return T("Fresh from the showroom. Neighbours peep through their windows.", "Fresh from showroom. Neighbours dey peep for window."); } },
      { label: T("Keep using public transport", "Continue to enter bus"), run: (q) => { bump(q, "stress", 2); return T("You save your money and your patience.", "You save your money and your patience."); } },
    ],
  },
  {
    id: "car_breakdown",
    title: dual("Car has broken down", "Car don scatter"),
    weight: (p) => (p.flags.car ? 3 : 0),
    text: () => T("Your car stops in the middle of the bridge. Hot sun, honking everywhere, and a 'mechanic' appears from nowhere: 'Oga, it's the gearbox.' (It was a loose wire.)", "Your car stop for middle of the bridge. Hot sun, horn everywhere, and one 'mechanic' show from nowhere: 'Oga, na gearbox.' (Na loose wire.)"),
    choices: (p) => [
      { label: T("Pay the roadside mechanic", "Pay the roadside mechanic"), sub: naira(I(p, 120_000)), run: (q) => { q.money -= I(q, 120_000); return T("He fixes it in 10 minutes and collects ₦120K. 'It's labour,' he says.", "He fix am in 10 minutes and collect ₦120K. 'Na labour', he talk."); } },
      { label: T("Tow it to your trusted mechanic", "Tow am go your own mechanic"), sub: naira(I(p, 60_000)), run: (q) => { q.money -= I(q, 60_000); bump(q, "stress", 3); return T("Your own mechanic fixes it properly. It takes longer but costs less.", "Your own mechanic fix am proper. E take longer, but e cost less."); } },
    ],
  },
  {
    id: "sibling_wedding",
    title: dual("Your sibling's wedding", "Your sibling wedding"),
    weight: (p) => (adult(p) && p.age >= 24 && p.family.parentsAlive ? 2 : 0),
    text: () => T("Your younger sibling is getting married and the family expects you to carry the 'big sibling' responsibility: aso-ebi, caterers, and a car for the couple.", "Your younger sibling wan marry and family expect say you go carry the 'big sibling' load: aso-ebi, caterers, and car for the couple."),
    choices: (p) => [
      { label: T("Foot most of the bill", "Pay most of the bill"), sub: naira(I(p, 3_000_000)), disabled: p.money < I(p, 3_000_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 3_000_000); q.family.happy = clamp(q.family.happy + 15); bump(q, "reputation", 6); return T("The whole family calls you 'Oga at the top'. Your sibling cries with happiness.", "The whole family dey call you 'Oga at the top'. Your sibling cry for happiness."); } },
      { label: T("Contribute small", "Contribute small"), sub: naira(I(p, 500_000)), run: (q) => { q.money -= I(q, 500_000); q.family.happy = clamp(q.family.happy + 3); return T("You give what you can. They accept with a polite smile.", "You give wetin you fit give. Dem accept am with polite smile."); } },
      { label: T("Attend but contribute nothing", "Go but give nothing"), run: (q) => { q.family.happy = clamp(q.family.happy - 8); bump(q, "reputation", -3); return T("You eat the jollof, but the family does not forget.", "You chop the jollof but family no go forget."); } },
    ],
  },
  {
    id: "parent_sick",
    title: dual("Papa/Mama is sick", "Papa/Mama dey sick"),
    weight: (p) => (adult(p) && p.age >= 30 && p.family.parentsAlive ? 2.2 : 0),
    text: () => T("Phone call at midnight: your parent has collapsed. The village clinic wants a ₦500K deposit before they touch them. 'Please send money quickly!'", "Phone call for midnight: your parent don collapse. Village clinic want ₦500K deposit before dem touch am. 'Abeg send money quick!'"),
    choices: (p) => [
      { label: T("Move them to a private hospital in the city", "Carry am go private hospital for town"), sub: naira(I(p, 2_000_000)), disabled: p.money < I(p, 2_000_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 2_000_000); q.family.happy = clamp(q.family.happy + 12); bump(q, "reputation", 4); return T("They recover well. Your parent says: 'God bless you, my child.'", "Dem recover well. Your parent talk: 'God go bless you, my pikin.'"); } },
      { label: T("Pay the village clinic deposit", "Pay the village clinic deposit"), sub: naira(I(p, 500_000)), run: (q) => { q.money -= I(q, 500_000); if (chance(0.65)) { q.family.happy = clamp(q.family.happy + 6); return T("They manage to recover. The clinic drugs were just enough.", "Dem manage recover. The clinic drug just do."); } q.family.parentsAlive = false; bump(q, "happiness", -20); return T("They do not survive. You sent money, but you did not reach home in time.", "Dem no survive. You send money but you no reach house on time."); } },
      { label: T("Pray and hope", "Pray and hope"), run: (q) => { q.family.happy = clamp(q.family.happy - 12); bump(q, "stress", 8); return T("You feel helpless, and the family remembers.", "You feel say you no fit do anything, and family no go forget."); } },
    ],
  },
  {
    id: "account_freeze",
    title: dual("Account frozen", "Account don freeze"),
    weight: (p) => (adult(p) && p.money > I(p, 1_000_000) ? 2 : 0),
    text: () => T("You wake up and try to transfer: 'Post No Debit (PND) placed on account.' You did one P2P trade last week with a stranger. The bank does not say why.", "You wake up try transfer: 'Post No Debit (PND) placed on account.' You do one P2P trade last week with stranger. Bank no talk why."),
    choices: (p) => [
      { label: T("Rush to the bank with KYC documents", "Run go bank with KYC papers"), run: (q) => { bump(q, "stress", 7); if (chance(0.8)) return T("After two days and plenty of queueing, they lift the PND. 'System error,' they say.", "After two days and plenty queue, dem lift the PND. 'System error', dem talk."); q.money -= q.money * 0.05; return T("They lift it after three weeks and your business suffers. The 'system error' is never explained.", "Dem lift am after three weeks and your business suffer. Nobody explain the 'system error'."); } },
      { label: T("Hire a lawyer to write the bank", "Hire lawyer to write the bank"), sub: naira(I(p, 300_000)), run: (q) => { q.money -= I(q, 300_000); return T("The lawyer's letter works faster than your tears.", "Lawyer letter work quick pass your tears."); } },
      { label: T("Wait it out", "Wait am out"), run: (q) => { bump(q, "stress", 9); q.money -= I(q, 100_000); return T("Everything stands still for a month. You borrow to feed.", "Everything stand still for one month. You borrow money chop."); } },
    ],
  },
  {
    id: "tax_officer",
    title: dual("Tax officers", "Tax officers"),
    weight: (p) => (adult(p) && (selfEmployed(p) || p.job) && p.money > I(p, 5_000_000) ? 2 : 0),
    text: () => T("Men in LIRS-type vests walk into your shop/office: 'Where is your TIN? You have not paid tax in 3 years. We want to seal this place!'", "Men wey wear LIRS-type vest enter your shop/office: 'Where your TIN? You never pay tax since 3 years. We wan seal this place!'"),
    choices: (p) => [
      { label: T("Pay the legit tax", "Pay the correct tax"), sub: naira(p.money * 0.03), run: (q) => { const a = q.money * 0.03; q.money -= a; bump(q, "reputation", 2); return T(`You pay ${naira(a)} and get a proper receipt. Clean books, clean sleep.`, `You pay ${naira(a)} and collect correct receipt. Clean books, clean sleep.`); } },
      { label: T("Settle them quietly", "Settle dem quietly"), sub: naira(I(p, 400_000)), run: (q) => { q.money -= I(q, 400_000); bump(q, "reputation", -3); return T("Cheaper, but the same officers come back every year.", "E cheap, but the same officers go dey come back every year."); } },
      { label: T("Argue and threaten to call a lawyer", "Argue and threaten to call lawyer"), run: (q) => { if (chance(0.45)) return T("They back down when they see you know your rights.", "Dem back down when dem see say you sabi your rights."); q.money -= I(q, 900_000); return T("They seal your place for a week and charge reopening 'fees'.", "Dem seal your place for one week and still charge you reopening 'fees'."); } },
    ],
  },
  {
    id: "nafdac",
    title: dual("Food inspectors", "Food inspectors"),
    weight: (p) => (food(p) ? 3 : 0),
    text: () => T("Health inspectors visit your spot: 'Madam/Oga, where is your NAFDAC number and food-handler certificate? We will close this place today!'", "Health inspectors visit your spot: 'Madam/Oga, where your NAFDAC number and food-handler certificate? We go close this place today!'"),
    choices: (p) => [
      { label: T("Get proper certification", "Get correct certificate"), sub: naira(I(p, 250_000)), run: (q) => { q.money -= I(q, 250_000); bump(q, "reputation", 4); return T("You complete the process. Customers see the certificate and trust you more.", "You finish the process. Customers see the certificate and trust you pass before."); } },
      { label: T("Settle the inspectors", "Settle the inspectors"), sub: naira(I(p, 60_000)), run: (q) => { q.money -= I(q, 60_000); return T("They collect 'small appreciation' and disappear. Until next season.", "Dem collect 'small appreciation' and disappear. Until next season."); } },
      { label: T("Close for a week while you sort it", "Close one week make you sort am"), run: (q) => { q.money -= I(q, 100_000); return T("You lose a week of sales but avoid trouble.", "You lose one week sales but you avoid wahala."); } },
    ],
  },
  {
    id: "rival_vendor",
    title: dual("New competitor", "New competitor"),
    weight: (p) => (selfEmployed(p) ? 3 : 0),
    text: () => T("Someone opens the same business right beside yours and cuts the price by half. Your customers look both ways like pedestrians.", "Another person open the same business right beside yours and cut price by half. Your customers dey look both side like pedestrian."),
    choices: (p) => [
      { label: T("Match the price", "Match the price"), run: (q) => { q.money -= I(q, 150_000); return T("Price war! Both of you are bleeding, but customers are happy.", "Price war! Both of una dey bleed, but customers dey happy."); } },
      { label: T("Improve your quality", "Make your quality better"), sub: naira(I(p, 200_000)), run: (q) => { q.money -= I(q, 200_000); bump(q, "reputation", 4); return T("Better packaging, better taste. Regular customers stay loyal.", "Better packaging, better taste. Your regular customers stay loyal."); } },
      { label: T("Sabotage them (report to LASTMA/officials)", "Spoil their market (report dem to LASTMA/officials)"), run: (q) => { bump(q, "reputation", -6); if (chance(0.6)) return T("Authorities clear his stall. You win, but people talk.", "Authorities clear his stall. You win, but people dey talk."); return T("He found out. Now there is an ongoing war.", "He find out. Now e don turn war."); } },
    ],
  },
  {
    id: "celebrity_order",
    title: dual("Big order", "Big order"),
    weight: (p) => (selfEmployed(p) ? 2 : 0),
    text: () => T("A celebrity's PA calls: 'Madam/Oga heard about your business. We need 500 packs for an event this weekend. Can you deliver?'", "One celebrity PA call you: 'Madam/Oga don hear about your business. We need 500 packs for event this weekend. You fit deliver?'"),
    choices: (p) => [
      { label: T("Take it, hire extra hands", "Take am, hire extra hands"), sub: naira(I(p, 250_000)), run: (q) => { q.money -= I(q, 250_000); if (chance(0.75)) { const g = I(q, rand(350_000, 1_400_000)); q.money += g; bump(q, "reputation", 6); return T(`You deliver. The celebrity tags you online and the money comes in: ${naira(g)}.`, `You deliver. The celebrity tag you online and money enter: ${naira(g)}.`); } bump(q, "stress", 8); return T("You could not finish on time. They cancelled and refused to pay for the part you completed.", "You no fit finish on time. Dem cancel and refuse to pay you for the part wey you don finish."); } },
      { label: T("Decline politely", "Refuse politely"), run: () => T("You do not want to stretch your business beyond capacity.", "You no wan stress your business pass im capacity.") },
    ],
  },
  {
    id: "shop_rent",
    title: dual("Shop rent hike", "Shop rent don rise"),
    weight: (p) => (selfEmployed(p) ? 2.4 : 0),
    text: () => T("Your shop landlord says rent goes up by 50% from next month. 'Lagos/Abuja market price, my friend.'", "Your shop landlord talk say rent go increase by 50% from next month. 'Lagos/Abuja market price, my friend.'"),
    choices: (p) => [
      { label: T("Pay and keep the spot", "Pay and keep your spot"), sub: naira(I(p, 200_000)), run: (q) => { q.money -= I(q, 200_000); return T("Location, location, location. You keep your customers.", "Location, location, location. You keep your customers."); } },
      { label: T("Relocate to a cheaper area", "Move go cheaper area"), run: (q) => { q.money -= I(q, 80_000); bump(q, "stress", 5); if (chance(0.5)) return T("Fewer customers but cheaper rent. You manage.", "Customers reduce but rent cheap. You dey manage."); q.money -= I(q, 150_000); return T("Nobody finds you in the new spot. Sales drop for months.", "Nobody fit find you for the new spot. Sales drop for months."); } },
    ],
  },
  {
    id: "wrongful_arrest",
    title: dual("Wrongfully arrested", "Dem arrest you anyhow"),
    weight: (p) => (p.age >= 18 && p.age <= 45 && !p.politics ? 1.4 : 0),
    text: () => T("Police round up everyone in the area after a robbery. You are among the people in the van. 'Bail or cell, oga.'", "Police round up everybody for the area after robbery. You dey among the people for the van. 'Na bail or na cell, oga.'"),
    choices: (p) => [
      { label: T("Pay for bail", "Pay bail"), sub: naira(I(p, 150_000)), run: (q) => { q.money -= I(q, 150_000); return T("You pay 'bail' (which is free by law) and go home angry.", "You pay 'bail' (wey be free by law) and go house with anger."); } },
      { label: T("Call a lawyer", "Call lawyer"), sub: naira(I(p, 400_000)), run: (q) => { q.money -= I(q, 400_000); bump(q, "smarts", 1); return T("Your lawyer shouts 'illegal detention!' and you walk out within the hour.", "Your lawyer shout 'illegal detention!' and you comot within one hour."); } },
      { label: T("Wait it out in the cell", "Wait for inside cell"), run: (q) => { bump(q, "health", -6); bump(q, "stress", 10); return T("Two nights in a crowded cell. You smell worse than you ever have.", "Two nights for crowded cell. You smell pass how you don smell before."); } },
    ],
  },
  {
    id: "one_chance",
    title: dual("'One chance' bus", "'One chance' bus"),
    weight: (p) => (adult(p) && p.traveled ? 3.5 : adult(p) ? 0.6 : 0),
    text: () => T("You board an unmarked bus at night and notice everyone at the back is silent. The door lock clicks. 'This is one chance.'", "You enter unmarked bus for night and notice say everybody for back dey quiet. The door lock click. 'This na one chance.'"),
    choices: () => [
      { label: T("Hand over everything quietly", "Give dem everything quietly"), run: (q) => { const l = Math.max(0, q.money * rand(0.05, 0.2)); q.money -= l; bump(q, "stress", 12); return T(`They empty your pockets (${naira(l)}), take your phone and drop you far from anywhere. You are alive.`, `Dem empty your pocket (${naira(l)}), carry your phone and drop you far from anywhere. At least you dey alive.`); } },
      { label: T("Shout and fight", "Shout and fight back"), run: (q) => { if (chance(0.35)) { bump(q, "reputation", 4); return T("Passengers wake up and fight with you. The robbers jump out. Local heroes.", "Passengers wake up join you fight. The robbers jump comot. Una be local heroes."); } q.money -= Math.max(0, q.money * 0.2); const r = developCondition(q, "stab"); return { text: T("They stab and beat you badly before dumping you by the roadside.", "Dem stab you and beat you well well before dem throw you for roadside."), spawn: r.pending }; } },
    ],
  },
  {
    id: "festival_spend",
    title: dual("Festival market", "Festival market"),
    weight: (p) => (adult(p) && p.money > I(p, 400_000) ? 2.4 : 0),
    text: (p) => (p.religion === "Muslim" ? T("Sallah is near. Ram prices have scattered the market: ₦500K for a small ram, and the family expects a big one.", "Sallah don near. Ram price don scatter market: ₦500K for small ram, family still expect big one.") : p.religion === "Traditional" ? T("The New Yam festival is here. Everyone expects you to bring food and drinks to the village square.", "New Yam festival don reach. Everybody expect say you go bring food and drinks for village square.") : T("Christmas is near. Rice, chicken, beans, goat... a shopping list as long as Third Mainland Bridge.", "Christmas don near. Rice, chicken, beans, goat... shopping list long like Third Mainland Bridge.")),
    choices: (p) => [
      { label: T("Go big (ram/chicken & hampers for all)", "Go big (ram/chicken & hampers for everybody)"), sub: naira(I(p, 600_000)), disabled: p.money < I(p, 600_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 600_000); bump(q, "reputation", 5); q.family.happy = clamp(q.family.happy + 6); bump(q, "happiness", 5); return T("Full house, laughter, and neighbours lining up with plates. You carry the festival.", "Full house, laughter, and neighbours dey line up with plate. You carry the festival."); } },
      { label: T("Keep it modest", "Keep am simple"), sub: naira(I(p, 150_000)), run: (q) => { q.money -= I(q, 150_000); bump(q, "happiness", 3); return T("Small but heartfelt. Nobody complains.", "E small but e come from heart. Nobody complain."); } },
      { label: T("Skip the spending", "No spend anything"), run: (q) => { bump(q, "reputation", -3); return T("'Why is your house as quiet as a cemetery?' the neighbours ask.", "'Why your house quiet like cemetery?' neighbours ask."); } },
    ],
  },
  {
    id: "crowdfund",
    title: dual("WhatsApp group appeal", "WhatsApp group appeal"),
    weight: (p) => (adult(p) && p.money > I(p, 200_000) ? 2.2 : 0),
    text: () => T("A message pops up on the family WhatsApp group: 'Cousin Tunde needs urgent surgery. ₦2.5M required. Please give what you can. God bless you.' Everyone is waiting to see who drops first.", "Message pop up for family WhatsApp group: 'Cousin Tunde need urgent surgery. ₦2.5M required. Abeg give wetin you fit. God bless you.' Everybody dey wait see who go drop first."),
    choices: (p) => [
      { label: T("Drop a big one", "Drop big money"), sub: naira(I(p, 500_000)), disabled: p.money < I(p, 500_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 500_000); q.family.happy = clamp(q.family.happy + 8); bump(q, "reputation", 5); return T("Everyone responds with prayer emojis and sends what they can. Tunde pulls through.", "Everybody reply with prayer emojis and send wetin dem fit. Tunde survive."); } },
      { label: T("Send something small", "Send small something"), sub: naira(I(p, 50_000)), run: (q) => { q.money -= I(q, 50_000); q.family.happy = clamp(q.family.happy + 2); return T("You do your part and mute the group.", "You do your own and mute the group."); } },
      { label: T("Leave the group", "Comot from the group"), run: (q) => { q.family.happy = clamp(q.family.happy - 10); return T("You hit 'Exit group'. Your mother calls you the next morning.", "You press 'Exit group'. Your mama call you next morning."); } },
    ],
  },
  {
    id: "kid_private_school",
    title: dual("Kids' school wahala", "Pikin school wahala"),
    weight: (p) => (p.kids.some((k) => k.age >= 4 && k.age <= 14) ? 2.5 : 0),
    text: () => T("Your child's teacher calls you: 'This child is bright, but the school lacks facilities. Many parents are moving to a private school across town.'", "Your pikin teacher call you: 'This child bright, but the school no get facilities. Plenty parents don move go private school for other side of town.'"),
    choices: (p) => [
      { label: T("Move to a good private school", "Move am go good private school"), sub: naira(I(p, 1_200_000)), disabled: p.money < I(p, 1_200_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 1_200_000); bump(q, "happiness", 5); return T("A school bus, small class sizes and a school lunch that is not just rice.", "School bus, small class and school lunch wey no be rice only."); } },
      { label: T("Stay and supplement with lessons", "Stay and add extra lessons"), sub: naira(I(p, 150_000)), run: (q) => { q.money -= I(q, 150_000); return T("Extra lessons at home. The child manages.", "Extra lessons for house. The pikin dey manage."); } },
    ],
  },
  {
    id: "invest_tip",
    title: dual("Investment tip", "Investment gist"),
    weight: (p) => (adult(p) && p.money > I(p, 3_000_000) && p.holdings.length === 0 ? 2.2 : 0),
    text: () => T("Your colleague talks about how he put money into dollars and treasury bills: 'The naira falls every year. Keep your cash in the bank and you are losing.'", "Your colleague dey talk how he put money for dollars and treasury bills: 'Naira dey fall every year. Keep your cash for bank and you dey lose.'"),
    choices: (p) => [
      { label: T("Put 30% into dollars", "Put 30% inside dollars"), sub: naira(p.money * 0.3), run: (q) => { const a = q.money * 0.3; const opt = INVESTMENTS.find((o) => o.kind === "usd"); if (!opt) return T("No option available.", "No option dey."); q.money -= a; q.holdings.push({ id: `usd-${q.age}`, kind: "usd", label: opt.label, invested: a, value: a }); return T(`You move ${naira(a)} into dollars. At least it will not melt like ice.`, `You move ${naira(a)} enter dollars. At least e no go melt like ice.`); } },
      { label: T("Keep it in the bank", "Keep am for bank"), run: (q) => { bump(q, "smarts", -1); return T("You trust the bank more than the market. Inflation trusts you less.", "You trust bank pass market. Inflation no trust you."); } },
    ],
  },
  {
    id: "estate_levy",
    title: dual("Estate levy", "Estate levy"),
    weight: (p) => (p.houses.length > 0 ? 2 : 0),
    text: () => T("The estate association chairman calls a meeting: 'The transformer has burst, the gate needs repairing, the security men need payment. Everybody pays a ₦250K levy.'", "Estate association chairman call meeting: 'Transformer don burst, gate need repair, security men need pay. Everybody go pay ₦250K levy.'"),
    choices: (p) => [
      { label: T("Pay and keep the peace", "Pay and keep peace"), sub: naira(I(p, 250_000)), run: (q) => { q.money -= I(q, 250_000); bump(q, "reputation", 2); return T("You pay and your estate keeps the light on and the guards awake.", "You pay and your estate keep light on and guards dey awake."); } },
      { label: T("Refuse to pay", "Refuse to pay"), run: (q) => { bump(q, "reputation", -4); bump(q, "stress", 5); return T("They cut your gate access. Awkward neighbours for months.", "Dem cut your gate access. Neighbours go dey look you anyhow for months."); } },
    ],
  },
  {
    id: "town_hall",
    title: dual("Town hall meeting", "Town hall meeting"),
    weight: (p) => ((p.politics?.office ?? -1) >= 0 ? 3 : 0),
    text: () => T("Your constituents gather at the town hall: 'Our roads are bad, our hospital has no drugs, and our youths have no work. What are you doing about it?'", "Your people gather for town hall: 'Our road bad, our hospital no get drugs, and our youths no get work. Wetin you dey do about am?'"),
    choices: () => [
      { label: T("Promise real projects (and deliver)", "Promise real projects (and do am)"), run: (q) => { q.nation.approval = clamp(q.nation.approval + 7); q.nation.economy = clamp(q.nation.economy + 3); q.goodDeeds += 1; return T("You announce dates and budgets. For once, the crowd believes you.", "You announce dates and budgets. For once, the crowd believe you."); } },
      { label: T("Promise big and forget", "Promise big then forget"), run: (q) => { q.nation.approval = clamp(q.nation.approval + 4); q.nation.heat = clamp(q.nation.heat + 3); return T("They clap now. They will remember during the next election.", "Dem clap now. Dem go remember for next election."); } },
      { label: T("Send your deputy", "Send your deputy"), run: (q) => { q.nation.approval = clamp(q.nation.approval - 5); return T("An empty chair in the front row. The press quickly notices.", "Empty chair for front row. Press quick notice."); } },
    ],
  },
];

export const AUTOS3: AutoDef[] = [
  { id: "up_nepa", weight: (p) => (p.age >= 8 ? 3 : 0), run: (p) => { bump(p, "happiness", 6); return T("'UP NEPA!' The light comes and stays three days straight. The whole street screams with joy.", "'UP NEPA!' Light come and stay three days straight. The whole street dey scream for joy."); } },
  { id: "heat_wave", weight: (p) => (["kano", "sokoto", "katsina", "borno", "yobe", "jigawa", "zamfara", "bauchi", "gombe", "kebbi"].includes(p.state) ? 3 : 1), run: (p) => { bump(p, "health", -3); bump(p, "stress", 3); return T("Heat wave. The fan blows hot air, and sleep becomes a rumour.", "Heat wave. Fan dey blow hot air, and sleep become rumour."); } },
  { id: "agbero", weight: (p) => (p.age >= 16 && p.traveled ? 3 : 1), run: (p) => { if (p.age >= 18) p.money -= I(p, 15_000); return T("An agbero at the motor park demands 'ticket' money before you can board. Forget what you know, just pay.", "Agbero for motor park demand 'ticket' money before you fit load. Forget wetin you sabi, just pay."); } },
  { id: "aso_ebi", weight: (p) => (adult(p) ? 2.5 : 0), run: (p) => { p.money -= I(p, 90_000); bump(p, "happiness", 2); return T("The aso-ebi fabric arrives and the tailor tells you to 'come back next week' four times.", "Aso-ebi fabric reach and the tailor tell you 'come back next week' four times."); } },
  { id: "pidgin_proverb", weight: () => 2, run: (p) => { bump(p, "smarts", 1); return pick([T("An elder tells you: 'What an old man sees sitting down, a young child cannot see even if he climbs a tree.'", "Elder tell you: 'Wetin old man see sitting down, small pikin no fit see am even if e climb tree.'"), T("Your grandmother reminds you: 'Slow and steady wins the race, but bring food along.'", "Your grandma remind you: 'Slow and steady dey win race, but carry chop follow.'"), T("Auntie says: 'Only the one carrying the load knows its weight.'", "Auntie talk: 'Na who dey carry load dey know the weight.'")]); } },
  { id: "birthday", weight: (p) => (adult(p) ? 1.5 : 0), run: (p) => { bump(p, "happiness", 5); p.money -= I(p, 30_000); return T("Friends surprise you with cake and suya. You pretend to be shy. You are not.", "Friends surprise you with cake and suya. You pretend say you shy. You no shy at all."); } },
  { id: "sidehustle_win", weight: (p) => (adult(p) ? 1.5 : 0), run: (p) => { const g = I(p, randInt(30_000, 150_000)); p.money += g; return T(`A small deal you almost forgot about pays out: ${naira(g)}.`, `One small deal wey you almost forget pay out: ${naira(g)}.`); } },
  { id: "police_extortion", weight: (p) => (adult(p) && !p.politics ? 1.5 : 0), run: (p) => { p.money -= I(p, 20_000); bump(p, "stress", 3); return T("Police stop your bus 'for routine check' and the whole bus pays 'tea money'.", "Police stop your bus 'for routine check' and the whole bus pay 'tea money'."); } },
  { id: "enrol_kids", weight: (p) => (p.kids.length > 0 ? 1.5 : 0), run: (p) => { bump(p, "happiness", 3); return T("Your child says something so smart that you post it on the family WhatsApp group.", "Your pikin talk something so sharp wey you carry am go family WhatsApp group."); } },
  { id: "bad_road", weight: (p) => (stateOf(p).opp <= 4 ? 3 : 1), run: (p) => { bump(p, "stress", 3); p.money -= adult(p) ? I(p, 40_000) : 0; return T("The road to the main market has collapsed again. Taxi fares double, and the councillor 'is aware'.", "The road to main market don collapse again. Taxi fare double, and the councillor talk say 'e dey aware'."); } },
  { id: "enter_trouble_free", weight: (p) => (p.age >= 12 ? 1.5 : 0), run: (p) => { bump(p, "reputation", 1); return T("You help an old woman cross the road and she blesses you for ten minutes.", "You help old woman cross road and she bless you for ten minutes."); } },
];
