import { STATE_BY_ID, TRAVEL_STATES, travelCost } from "./data";
import { applySupport, defaultAmount, evaluateSupport, primaryProvider } from "./family";
import { I, bump, expandCostFor, jobDef, luckBonus, ownsHouseIn, stateOf } from "./helpers";
import type { AutoDef, EventDef, Player } from "./types";
import { chance, clamp, naira, pick, rand } from "./util";

const adult = (p: Player) => p.age >= 18;
const selfEmployed = (p: Player) => Boolean(jobDef(p)?.selfEmployed);
const festival = (p: Player) => (p.religion === "Muslim" ? "Sallah" : p.religion === "Traditional" ? "New Yam festival" : "Christmas");

export const EVENTS2: EventDef[] = [
  {
    id: "nepa_bill",
    title: "Disco bill",
    weight: (p) => (adult(p) ? 2.5 : 0),
    text: () => "Wahala! Disco bring one 'estimated bill' wey be like say you dey run factory. You dey sit for dark since last month, but the bill no gree reduce.",
    choices: (p) => [
      { label: "Pay am, make we move on", sub: naira(I(p, 150_000)), run: (q) => { q.money -= I(q, 150_000); bump(q, "stress", 4); return "You pay. The light blink twice and go again. Na so e be."; } },
      { label: "Go Disco office to dispute am", run: (q) => { if (chance(0.5)) { q.money -= I(q, 40_000); return "After 5 hours for queue, dem reduce am. You pay small and go home hungry."; } bump(q, "stress", 10); return "Dem tell you: 'Oga, come back tomorrow.' You never see anybody that day."; } },
      { label: "Bypass the meter small small", run: (q) => { if (chance(0.6)) return "Nobody catch you. Your bill drop like magic. Chai, big win."; q.money -= I(q, 400_000); bump(q, "reputation", -5); return "Disco officers catch you o! Dem fine you ₦400K and disconnect you for one month."; } },
    ],
  },
  {
    id: "rent_hike",
    title: "Landlord don talk",
    weight: (p) => (adult(p) && !ownsHouseIn(p, p.state) && !(p.age < 24 && p.family.state === p.state) ? 3 : 0),
    text: (p) => `Your landlord for ${stateOf(p).name} call you: "Rent go increase by 40% this year. Na market price. Pay or you pack your load!"`,
    choices: (p) => [
      { label: "Pay the new rent", sub: naira(I(p, 350_000) * stateOf(p).cost), run: (q) => { q.money -= I(q, 350_000) * stateOf(q).cost; bump(q, "stress", 4); return "You pay am with tear for your heart. Landlords sef."; } },
      { label: "Negotiate with him", run: (q) => { if (chance(0.6)) { q.money -= I(q, 120_000) * stateOf(q).cost; return "After plenty talk and one bottle of Chivita, he reduce the increase. Small mercy."; } q.money -= I(q, 400_000) * stateOf(q).cost; return "He no gree o. Dem even add 'service charge'."; } },
      { label: "Quit and find another place", sub: naira(I(p, 100_000)), run: (q) => { q.money -= I(q, 100_000); bump(q, "stress", 7); return "You hunt for house for weeks, pay agent, pay lawyer, pay caution. House hunting na sport."; } },
    ],
  },
  {
    id: "sapa",
    title: "Sapa don catch you",
    weight: (p) => (adult(p) && p.money < I(p, 120_000) ? 5 : 0),
    text: () => "Oga, your account dey beep zero. Pocket dey whisper 'sapa'. Friends dey call ('make you send small something') and landlord dey knock.",
    choices: (p) => [
      { label: "Borrow from loan app", run: (q) => { q.money += I(q, 100_000); q.debt += I(q, 160_000); bump(q, "stress", 7); return "The loan enter in 2 minutes. The interest enter your life for 2 years."; } },
      { label: "Sell your phone", run: (q) => { q.money += I(q, 200_000); bump(q, "happiness", -8); return "You sell the phone and buy 'Tecno small' for ₦20K. Life continues."; } },
      { label: "Beg family for help", disabled: p.family.happy < 25 ? "Family never dey talk to you" : false, run: (q) => { const n = primaryProvider(q); if (!n) return "You have nobody to ask."; return applySupport(q, n, "emergency", evaluateSupport(q, n, "emergency", defaultAmount(q, "food") * 3)); } },
      { label: "Hustle on any side gig", run: (q) => { q.money += I(q, rand(100_000, 300_000)); bump(q, "stress", 6); return "You wash cars, sell recharge cards, carry loads. Hustle no dey sleep."; } },
    ],
  },
  {
    id: "bank_debit",
    title: "Double debit",
    weight: (p) => (adult(p) && p.money > I(p, 100_000) ? 3 : 0),
    text: () => "You send transfer, e say 'failed'. Next minute, alert: debit twice! Your bank say 'please bear with us, network issue'.",
    choices: () => [
      { label: "Queue at the branch", run: (q) => { bump(q, "stress", 6); if (chance(0.7)) return "After 4 hours with plenty chair-warming, dem refund you."; q.money -= I(q, 30_000); return "The man behind the counter say 'come back next week'. You lose 30K for transport and sorrow."; } },
      { label: "Tweet at the bank", run: (q) => { if (chance(0.65)) { bump(q, "reputation", 2); return "You tweet, tag the bank and the CBN. Within an hour dem refund you and apologise. Twitter is a weapon."; } return "Dem reply 'Kindly DM us' and that's all."; } },
      { label: "Forget am", run: (q) => { q.money -= I(q, 50_000); return "Na only ₦50K abi? E pain you but you let am go."; } },
    ],
  },
  {
    id: "prophet",
    title: "Man of God",
    weight: (p) => (adult(p) && p.religion !== "Traditional" ? 2 : 0),
    text: () => "Prophet call you for corner after service: 'My son/daughter, God show me say marriage is coming, but first you must sow a seed of ₦200,000 for the breakthrough.'",
    choices: (p) => [
      { label: "Sow the seed", sub: naira(I(p, 200_000)), disabled: p.money < I(p, 200_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 200_000); bump(q, "happiness", 3); bump(q, "connections", 2); return "You sow am with faith. Whether the breakthrough go come, na another story."; } },
      { label: "Politely decline", run: () => "'God go provide, Prophet.' You walk away smiling." },
      { label: "Expose him online", run: (q) => { if (chance(0.5)) { bump(q, "reputation", 4); return "Your video go viral. People call you brave."; } bump(q, "reputation", -4); return "His followers attack you online. Wahala."; } },
    ],
  },
  {
    id: "festival",
    title: "Time to go village",
    weight: (p) => (adult(p) && p.family.state !== p.state && p.family.parentsAlive ? 3.5 : 0),
    text: (p) => `${festival(p)} don reach! Everybody dey travel home. Mama call: 'Who go sit for town when the whole family dey gather? Come home o!'`,
    choices: (p) => {
      const cost = I(p, 2) * travelCost(stateOf(p), STATE_BY_ID[p.family.state]) + I(p, 300_000);
      return [
        { label: "Travel home with gifts", sub: naira(cost), disabled: p.money < cost ? "Not enough cash" : false, run: (q) => { q.money -= cost; q.traveled = true; q.family.happy = clamp(q.family.happy + 15); bump(q, "happiness", 8); bump(q, "reputation", 3); return "Full house, rice and stew, and everybody ask 'when you go marry?' Home sweet home."; } },
        { label: "Send money and stay", sub: naira(I(p, 100_000)), run: (q) => { q.money -= I(q, 100_000); q.family.happy = clamp(q.family.happy - 3); return "Mama accept the money but you hear the sadness for her voice."; } },
        { label: "Dodge everyone", run: (q) => { q.family.happy = clamp(q.family.happy - 10); return "You block everyone for three days. Pikin wey no dey go home dey wait for explanation."; } },
      ];
    },
  },
  {
    id: "omo_onile",
    title: "Omo onile",
    weight: (p) => (p.houses.length > 0 ? 3 : 0),
    text: () => "A group of omo onile (local land owners) show for your property: 'This land na our family own. Pay your 'sitting fee' or no peace.'",
    choices: (p) => [
      { label: "Settle them", sub: naira(I(p, 1_500_000)), run: (q) => { q.money -= I(q, 1_500_000); return "You pay their 'fee' and they go away singing your praise."; } },
      { label: "Hire a lawyer", sub: naira(I(p, 800_000)), run: (q) => { q.money -= I(q, 800_000); if (chance(0.6)) return "Your lawyer produce documents and the thing quieten down."; const h = q.houses[0]; if (h) h.value *= 0.9; return "The case drag. The house lose value as tenants fear wahala."; } },
      { label: "Call the police", run: (q) => { if (chance(0.5)) return "Police come and the omo onile run. For now."; q.money -= I(q, 300_000); return "Police ask for 'mobilisation' before dem even move. You pay anyway."; } },
      { label: "Ignore them", run: (q) => { if (chance(0.5)) { const h = q.houses[0]; if (h) h.value *= 0.85; return "They vandalise the site at night. House lose value."; } return "They threaten and leave. Luck dey your side."; } },
    ],
  },
  {
    id: "credit_customer",
    title: "'I go pay tomorrow'",
    weight: (p) => (selfEmployed(p) ? 3 : 0),
    text: () => "Your regular customer dey beg: 'Oga/Madam, put am for my head. I go pay you tomorrow, I swear.' Tomorrow don turn to three months before.",
    choices: () => [
      { label: "Give credit", run: (q) => { if (chance(0.65)) { bump(q, "connections", 2); return "He pay everything and bring extra. Loyal customer is gold."; } q.money -= I(q, 120_000); return "He disappear. Phone dey off. Another ₦120K lost to 'tomorrow'."; } },
      { label: "No credit today", run: (q) => { bump(q, "reputation", -1); return "'Pay cash or no carry.' He grumble but pay."; } },
    ],
  },
  {
    id: "microloan",
    title: "Microfinance loan",
    weight: (p) => {
      const c = expandCostFor(p);
      return selfEmployed(p) && c !== null && p.money < c ? 2.5 : 0;
    },
    text: () => "A loan officer visit your shop: 'Oga/Madam, we fit give you ₦ to grow business. Interest na only 5% per month.' (Do the maths for 12 months.)",
    choices: () => [
      { label: "Take the loan and expand", run: (q) => { const c = expandCostFor(q); const j = jobDef(q); if (c !== null && q.job && j) { q.job.rank = Math.min(q.job.rank + 1, j.ladder.length - 1); q.job.years = 0; q.debt += c * 1.5; return `You expand: ${j.ladder[q.job.rank].title}. The debt too big, but business dey grow.`; } return "No loan for you today."; } },
      { label: "No, interest too heavy", run: () => "Wise. A loan can feed you or finish you." },
    ],
  },
  {
    id: "election_season",
    title: "Election season",
    weight: (p) => (adult(p) ? 2 : 0),
    text: () => "Election season! Party agents dey share rice, branded T-shirts and ₦5,000 per head. 'Vote for us and you go chop better.'",
    choices: () => [
      { label: "Collect the money, vote your conscience", run: (q) => { q.money += I(q, 5_000); bump(q, "smarts", 1); return "You collect the rice, dey smile, and vote for who you want. Ballot no get camera."; } },
      { label: "Sell your PVC", run: (q) => { q.money += I(q, 20_000); bump(q, "reputation", -4); return "₦20K for one card. Democracy sold for pocket money."; } },
      { label: "Become a polling observer", run: (q) => { bump(q, "reputation", 4); bump(q, "connections", 2); bump(q, "stress", 5); return "You watch collation until 3am. You see things. You count and verify."; } },
      { label: "Stay at home", run: (q) => { bump(q, "stress", -2); return "You skip the whole thing. Holiday on election day."; } },
    ],
  },
  {
    id: "twitter_trend",
    title: "You dey trend",
    weight: (p) => (p.age >= 16 ? 1.8 : 0),
    text: () => "You post one sharp tweet at midnight. By morning you dey trend, QTs everywhere, and strangers dey 'drag' you.",
    choices: () => [
      { label: "Apologise", run: (q) => { bump(q, "reputation", -1); bump(q, "stress", -4); return "You apologise. Everyone move on to the next victim by Tuesday."; } },
      { label: "Double down", run: (q) => { if (chance(0.5)) { bump(q, "reputation", 6); return "You win the argument! New followers, new fans, new enemies."; } bump(q, "reputation", -10); bump(q, "stress", 10); return "You get cancelled. Brands unfollow you. Chai."; } },
      { label: "Delete the account", run: (q) => { bump(q, "stress", -6); return "You delete everything and go outside. Fresh air be like new product."; } },
    ],
  },
  {
    id: "village_attack",
    title: "Trouble back home",
    weight: (p) => (adult(p) && STATE_BY_ID[p.family.state].risk >= 6 && p.family.happy > 0 ? 2.2 : 0),
    text: (p) => `Terrible news from ${STATE_BY_ID[p.family.state].name}: armed men don attack communities near your people. Family dey scared and dey ask for help to relocate.`,
    choices: (p) => [
      { label: "Relocate them to a safer state", sub: naira(I(p, 3_000_000)), disabled: p.money < I(p, 3_000_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 3_000_000); const safe = pick(TRAVEL_STATES.filter((s) => s.risk <= 4 && s.opp >= 4)); q.family.state = safe.id; q.family.happy = clamp(q.family.happy + 18); return `You move your people to ${safe.name}. Dem cry with relief.`; } },
      { label: "Send money for their safety", sub: naira(I(p, 500_000)), run: (q) => { q.money -= I(q, 500_000); q.family.happy = clamp(q.family.happy + 6); return "You send what you can. Dem say na prayer go do the rest."; } },
      { label: "Nothing you can do", run: (q) => { q.family.happy = clamp(q.family.happy - 14); bump(q, "stress", 8); return "You feel helpless. The silence from home hit you hard."; } },
    ],
  },
  {
    id: "mother_in_law",
    title: "In-law wahala",
    weight: (p) => (p.spouse ? 2 : 0),
    text: (p) => `${p.spouse?.name}'s mother arrive for 'one-week visit'. Three months later, she dey rearrange your kitchen and critique your cooking.`,
    choices: () => [
      { label: "Welcome her warmly", run: (q) => { if (q.spouse) q.spouse.happy = clamp(q.spouse.happy + 8); q.money -= I(q, 100_000); return "You smile and swallow your feelings. Your spouse loves you more for it."; } },
      { label: "Set boundaries politely", run: (q) => { if (chance(0.5)) return "She grumble but understand. Peace restored."; if (q.spouse) q.spouse.happy = clamp(q.spouse.happy - 10); return "She take offence. Your spouse takes her side."; } },
      { label: "Hide in the office", run: (q) => { bump(q, "stress", 5); return "You work till 10pm every day. Your spouse notice."; } },
    ],
  },
  {
    id: "harassment",
    title: "Stop and search",
    weight: (p) => (p.age >= 18 && p.age <= 35 && !p.politics ? 2 : 0),
    text: () => "Plain-clothes men stop you: 'Wetin dey your phone and laptop? Why you get iPhone? You be Yahoo boy?' You never even do anything.",
    choices: (p) => [
      { label: "Stay calm, show receipts", run: (q) => { bump(q, "smarts", 1); if (chance(0.6)) return "Dem see say you no easy to cheat and let you go."; q.money -= I(q, 40_000); return "Dem still ask for 'something for water'."; } },
      { label: "Pay them to go away", sub: naira(I(p, 30_000)), run: (q) => { q.money -= I(q, 30_000); return "You pay and dem disappear. You dey vex but alive."; } },
      { label: "Record everything on your phone", run: (q) => { if (chance(0.5)) { bump(q, "reputation", 3); return "Dem back off when dem notice the camera. You post the video later."; } bump(q, "health", -8); q.money -= I(q, 50_000); return "Dem collect the phone and slap you. Rough."; } },
    ],
  },
  {
    id: "land_scam",
    title: "Last plot!",
    weight: (p) => (adult(p) && p.money > I(p, 5_000_000) ? 2 : 0),
    text: () => "A smooth-talking agent show you one 'prime plot' near the new airport road: 'Last plot! C of O ready. Price go double next week.'",
    choices: (p) => [
      { label: "Buy it now", sub: naira(p.money * 0.2), run: (q) => { const a = q.money * 0.2; q.money -= a; if (chance(0.5 + luckBonus(q))) { q.money += a * 1.4; return `The plot is genuine! You resell for ${naira(a * 1.4)}. You feel like Dangote.`; } bump(q, "stress", 12); return `The same plot was sold to five people. ${naira(a)} gone. The agent switch off his phone.`; } },
      { label: "Verify with a lawyer first", sub: naira(I(p, 1_000_000)), disabled: p.money < I(p, 1_000_000) ? "Not enough cash" : false, run: (q) => { q.money -= I(q, 1_000_000); if (chance(0.5)) { bump(q, "smarts", 2); return "Your lawyer find out say na scam. You dodge am by inches."; } const a = q.money * 0.15; q.money += a * 0.4; return "The papers are real. You buy small and make small profit."; } },
      { label: "Walk away", run: () => "Too good to be true usually isn't. You pass." },
    ],
  },
  {
    id: "family_land",
    title: "Village land matter",
    weight: (p) => (adult(p) && p.family.state !== p.state && STATE_BY_ID[p.family.state].opp <= 5 ? 2 : 0),
    text: () => "Your uncle call from the village: 'Our land dey in dispute o. You are the first child. You must come home to represent this family!'",
    choices: (p) => [
      { label: "Go home and settle it", sub: naira(I(p, 400_000)), run: (q) => { q.money -= I(q, 400_000); q.traveled = true; q.family.happy = clamp(q.family.happy + 10); bump(q, "reputation", 4); return "You sit with the elders for three days. Kola nut, palm wine, and a fair settlement."; } },
      { label: "Send money for a lawyer", sub: naira(I(p, 250_000)), run: (q) => { q.money -= I(q, 250_000); return "The lawyer collect your money. Case continue."; } },
      { label: "Ignore it", run: (q) => { q.family.happy = clamp(q.family.happy - 10); return "You leave them to manage. The elders no forget."; } },
    ],
  },
  {
    id: "boss_bribe",
    title: "Oga at the top",
    weight: (p) => (p.job && jobDef(p)?.group === "formal" ? 3 : 0),
    text: () => "Your oga call you: 'This contract go pass your table. But something must enter my pocket. You go get your own share. Make we chop together.'",
    choices: () => [
      { label: "Join the arrangement", run: (q) => { const g = I(q, rand(250_000, 1_200_000)); q.money += g; bump(q, "reputation", -6); if (chance(0.12)) { q.job = null; return `You collect ${naira(g)}. Then a whistleblower talk and you get sacked quietly.`; } return `You collect ${naira(g)}. Another 'bonus' for Ghana-must-go.`; } },
      { label: "Refuse and stay clean", run: (q) => { bump(q, "stress", 6); if (chance(0.25)) { q.job = null; return "He sack you for 'poor attitude'. Integrity fit cost you."; } bump(q, "reputation", 4); return "He sulk for a month but respects you quietly."; } },
      { label: "Report him", run: (q) => { if (chance(0.4)) { bump(q, "reputation", 10); return "Management investigate and suspend him. You become a hero."; } q.job = null; bump(q, "stress", 12); return "The report 'disappear' and you are suddenly 'redundant'. Chai."; } },
    ],
  },
  {
    id: "okada_ban",
    title: "Okada ban",
    weight: (p) => (p.job?.id === "keke" || p.job?.id === "conductor" ? 3 : 0),
    text: () => "Government announce new ban on okada and keke on major roads. 'For public safety.' You don't know whether to laugh or cry.",
    choices: () => [
      { label: "Move to a different area", run: (q) => { q.money -= I(q, 150_000); return "You relocate your operation to the inner streets. Passengers fewer, wahala fewer."; } },
      { label: "Join the protest", run: (q) => { if (chance(0.5)) { bump(q, "reputation", 3); return "After days of protest, the government soften the ban."; } q.money -= I(q, 50_000); return "Police scatter the protest. You lose a day's income and a slipper."; } },
      { label: "Sell the bike and start POS", run: (q) => { q.money += I(q, 250_000); q.job = { id: "pos", rank: 0, years: 0 }; return "You sell the bike, buy a POS machine, and open under a big umbrella."; } },
    ],
  },
  {
    id: "apprenticeship",
    title: "Oga offers apprenticeship",
    weight: (p) => (p.tribe === "Igbo" && p.age >= 14 && p.age <= 22 && !p.job && !p.school ? 6 : 0),
    text: () => "A successful trader in the market offer to take you in as an apprentice (imu-ahia): 'Learn the trade under me. After some years, I go settle you with capital to start your own shop.'",
    choices: () => [
      { label: "Accept the apprenticeship", run: (q) => { const id = pick(["provisions", "phone", "thrift", "mechanic", "tailor"]); q.job = { id, rank: 1, years: 0 }; bump(q, "connections", 6); bump(q, "smarts", 3); return "After hard years of sweeping, carrying and learning, Oga settle you with capital and shop. You are your own boss now."; } },
      { label: "No, you go on your own", run: () => "You thank him but go your own way." },
    ],
  },
  {
    id: "mama_put",
    title: "Hunger wahala",
    weight: (p) => (adult(p) && p.stats.happiness < 45 ? 3 : 0),
    text: () => "Things dey hard. Body dey tired and spirit dey low. One mama put dey sell hot jollof and fried plantain nearby, smelling like heaven.",
    choices: (p) => [
      { label: "Buy two plates of jollof and plantain", sub: naira(I(p, 3_000)), run: (q) => { q.money -= I(q, 3_000); bump(q, "happiness", 10); return "Heaven on a plate. For ten minutes, no problem dey this world."; } },
      { label: "Just go home and sleep", run: (q) => { bump(q, "stress", -3); return "You sleep like log. Tomorrow go be better."; } },
    ],
  },
  {
    id: "cousin_visits",
    title: "Cousin from village",
    weight: (p) => (adult(p) && p.family.state !== p.state && (stateOf(p).opp >= 6) ? 2 : 0),
    text: () => "Your cousin land for your house with one bag: 'Cuz, I don come to look for work. Just small time. Maximum one month.' The man still dey your house after three months.",
    choices: () => [
      { label: "Let him stay and help him find a job", run: (q) => { q.money -= I(q, 200_000); q.family.happy = clamp(q.family.happy + 10); bump(q, "reputation", 3); return "He eventually find work and send you a thank-you chicken. Family is family."; } },
      { label: "Tell him to leave politely", run: (q) => { q.family.happy = clamp(q.family.happy - 8); return "The village WhatsApp group hear am before night. Sorry, no vacancy."; } },
    ],
  },
  {
    id: "quick_deal",
    title: "Customs auction",
    weight: (p) => (adult(p) && p.money > I(p, 2_000_000) ? 1.8 : 0),
    text: () => "A friend inside tells you: 'Customs dey auction seized goods tomorrow. 50 cartons of rice for peanut price. We resell and double am.'",
    choices: (p) => [
      { label: "Buy in", sub: naira(p.money * 0.1), run: (q) => { const a = q.money * 0.1; q.money -= a; if (chance(0.6)) { q.money += a * 1.8; return `The goods sell fast! You make ${naira(a * 0.8)} profit.`; } return "The goods stuck at the port. Demurrage and bribes eat everything."; } },
      { label: "Pass", run: () => "You prefer to sleep well at night." },
    ],
  },
  {
    id: "jail_inside",
    title: "Prison life",
    weight: (p) => (p.prison > 0 ? 3 : 0),
    text: () => "Inside the cell, a long-time inmate pulls you aside: 'You new for here. I go teach you how to survive. But you go owe me.'",
    choices: () => [
      { label: "Accept his protection", run: (q) => { bump(q, "stress", -4); bump(q, "connections", 2); return "He teach you the rules and show you which warder to avoid. You survive."; } },
      { label: "Keep to yourself", run: (q) => { bump(q, "health", -4); bump(q, "smarts", 2); return "You read old newspapers and write letters. Lonely, but safer."; } },
    ],
  },
];

export const AUTOS2: AutoDef[] = [
  { id: "flood", weight: (p) => (["bayelsa", "delta", "rivers", "niger", "kogi", "benue", "anambra", "adamawa", "taraba"].includes(p.state) ? 3 : 0), run: (p) => { for (const h of p.houses) if (h.state === p.state) h.value *= 0.92; p.money -= I(p, 150_000); return "Flood! Water enter everywhere and carry chairs go. Everybody dey clean mud for weeks."; } },
  { id: "kids_school", weight: (p) => (p.kids.some((k) => k.age >= 5 && k.age <= 17) ? 5 : 0), run: (p) => { const n = p.kids.filter((k) => k.age >= 5 && k.age <= 17).length; const fee = I(p, 300_000) * n; p.money -= fee; return `School fees and uniform for ${n} child${n > 1 ? "ren" : ""}: ${naira(fee)}. New session, new levy.`; } },
  { id: "nin", weight: (p) => (p.age >= 16 ? 2 : 0), run: (p) => { bump(p, "stress", 4); return "NIN-SIM linking deadline: you queue for 6 hours at NIMC office and the system 'go offline' three times."; } },
  { id: "jollof", weight: () => 2.5, run: (p) => { bump(p, "happiness", 4); return "Jollof war dey Twitter again: Nigeria vs Ghana. You defend the party jollof with your whole chest."; } },
  { id: "eagles", weight: (p) => (p.age >= 8 ? 3 : 0), run: (p) => { if (chance(0.5)) { bump(p, "happiness", 6); return "Super Eagles win! Whole street dey scream, horns dey blow, nobody sleep."; } bump(p, "happiness", -4); return "Super Eagles lose again. National depression for one week."; } },
  { id: "generator_thief", weight: (p) => (adult(p) ? 2 : 0), run: (p) => { p.money -= I(p, 120_000); return "Thieves carry your generator in the night. Now you dey fear NEPA and thieves together."; } },
  { id: "rice_price", weight: (p) => (p.age >= 10 ? 2.5 : 0), run: (p) => { p.money -= adult(p) ? I(p, 60_000) : 0; return "Price of rice dey rise like rocket. 'Bag of rice na new luxury item,' people dey tweet."; } },
  { id: "nlc_strike", weight: (p) => (p.age >= 18 && p.job && jobDef(p)?.group === "formal" ? 2 : 0), run: (p) => { bump(p, "stress", 5); return "NLC declare strike over fuel price. Offices shut. Salary dey delay for two months."; } },
  { id: "salary_delay", weight: (p) => (p.job && jobDef(p)?.group === "formal" ? 2 : 0), run: (p) => { p.money -= I(p, 100_000); bump(p, "stress", 5); return "Salary no come on time again. 'System upgrade,' dem tell you."; } },
  { id: "wedding_jollof", weight: (p) => (adult(p) ? 2 : 0), run: (p) => { bump(p, "happiness", 5); p.money -= I(p, 60_000); return "You attend three weddings the same weekend and wear the same aso-ebi to two."; } },
  { id: "gist", weight: (p) => (p.age >= 12 ? 2 : 0), run: (p) => { bump(p, "happiness", 3); return "Your neighbour tell you the best gist of the year. You can't repeat am, but you will."; } },
  { id: "malaria", weight: (p) => (p.age >= 3 ? 1.5 : 0), run: (p) => { p.flags.spawnCondition = "malaria"; return "Malaria visits again: cold, shivering, and a very bad headache."; } },
  { id: "rebase", weight: (p) => (p.age >= 20 && p.age <= 40 ? 1.5 : 0), run: (p) => { bump(p, "happiness", 3); return "Friends plan 'Detty December' trip to Lagos. You dey look at your account balance like say na horror film."; } },
  { id: "move", weight: (p) => (adult(p) && stateOf(p).opp >= 8 ? 1 : 0), run: (p) => { bump(p, "connections", 1); return "You meet one big man for Lagos/Abuja party who say 'let us talk next week'. He no call, but now you know him."; } },
];
