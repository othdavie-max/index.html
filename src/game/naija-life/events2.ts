import { STATE_BY_ID, TRAVEL_STATES, travelCost } from "./data";
import { applySupport, defaultAmount, evaluateSupport, primaryProvider, homeCaller } from "./family";
import { I, bump, expandCostFor, jobDef, luckBonus, ownsHouseIn, stateOf } from "./helpers";
import type { AutoDef, EventDef, Player } from "./types";
import { T, chance, clamp, dual, naira, pick, rand } from "./util";

const adult = (p: Player) => p.age >= 18;
const selfEmployed = (p: Player) => Boolean(jobDef(p)?.selfEmployed);
const festival = (p: Player) => (p.religion === "Muslim" ? "Sallah" : p.religion === "Traditional" ? "New Yam festival" : "Christmas");

export const EVENTS2: EventDef[] = [
  {
    id: "nepa_bill",
    title: dual("Electricity bill", "Disco bill"),
    weight: (p) => (adult(p) ? 2.5 : 0),
    text: () => T("Trouble! The Disco has sent an 'estimated bill' that looks like you are running a factory. You have been sitting in the dark since last month, yet the bill will not come down.", "Wahala! Disco bring one 'estimated bill' wey be like say you dey run factory. You don dey sit for dark since last month, but the bill no gree reduce."),
    choices: (p) => [
      { label: T("Pay it and move on", "Pay am, make we move on"), sub: naira(I(p, 150_000)), run: (q) => { q.money -= I(q, 150_000); bump(q, "stress", 4); return T("You pay. The light blinks twice and goes off again. That is how it is.", "You pay. Light blink two times, e go again. Na so e be."); } },
      { label: T("Go to the Disco office to dispute it", "Go Disco office go argue am"), run: (q) => { if (chance(0.5)) { q.money -= I(q, 40_000); return T("After 5 hours in the queue, they reduce it. You pay a smaller amount and go home hungry.", "After 5 hours for queue, dem reduce am. You pay small and go house with hungry."); } bump(q, "stress", 10); return T("They tell you: 'Oga, come back tomorrow.' You never even see anyone that day.", "Dem tell you: 'Oga, come back tomorrow.' You no even see anybody that day."); } },
      { label: T("Bypass the meter bit by bit", "Bypass the meter small small"), run: (q) => { if (chance(0.6)) return T("Nobody catches you. Your bill drops like magic. A big win.", "Nobody catch you. Your bill drop like magic. Chai, big win."); q.money -= I(q, 400_000); bump(q, "reputation", -5); return T("Disco officers catch you! They fine you ₦400K and disconnect you for one month.", "Disco officers catch you o! Dem fine you ₦400K and cut your light for one month."); } },
    ],
  },
  {
    id: "rent_hike",
    title: dual("The landlord has spoken", "Landlord don talk"),
    weight: (p) => (adult(p) && !ownsHouseIn(p, p.state) && !(p.age < 24 && p.family.state === p.state) ? 3 : 0),
    text: (p) => T(`Your landlord in ${stateOf(p).name} calls you: "Rent will go up by 40% this year. It is the market price. Pay or pack your things!"`, `Your landlord for ${stateOf(p).name} call you: "Rent go increase by 40% this year. Na market price. Pay or you pack your load!"`),
    choices: (p) => [
      { label: T("Pay the new rent", "Pay the new rent"), sub: naira(I(p, 350_000) * stateOf(p).cost), run: (q) => { q.money -= I(q, 350_000) * stateOf(q).cost; bump(q, "stress", 4); return T("You pay with a heavy heart. Landlords, honestly.", "You pay am with tear for your heart. Landlords sef."); } },
      { label: T("Negotiate with him", "Talk to am nicely"), run: (q) => { if (chance(0.6)) { q.money -= I(q, 120_000) * stateOf(q).cost; return T("After a lot of talking and a bottle of Chivita, he reduces the increase. A small mercy.", "After plenty talk and one bottle of Chivita, he reduce the increase. Small mercy."); } q.money -= I(q, 400_000) * stateOf(q).cost; return T("He refuses. They even add a 'service charge'.", "He no gree o. Dem even add 'service charge'."); } },
      { label: T("Move out and find another place", "Pack out, go find another house"), sub: naira(I(p, 100_000)), run: (q) => { q.money -= I(q, 100_000); bump(q, "stress", 7); return T("You hunt for a house for weeks, pay the agent, pay the lawyer, pay caution fee. House hunting is a sport.", "You hunt house for weeks, pay agent, pay lawyer, pay caution. House hunting na sport."); } },
    ],
  },
  {
    id: "sapa",
    title: dual("Sapa has caught you", "Sapa don catch you"),
    weight: (p) => (adult(p) && p.money < I(p, 120_000) ? 5 : 0),
    text: () => T("Your account balance reads zero. Your pocket whispers 'sapa'. Friends are calling ('send me small something') and the landlord is knocking.", "Oga, your account dey beep zero. Pocket dey whisper 'sapa'. Friends dey call ('make you send small something') and landlord dey knock."),
    choices: (p) => [
      { label: T("Borrow from a loan app", "Borrow from loan app"), run: (q) => { q.money += I(q, 100_000); q.debt += I(q, 160_000); bump(q, "stress", 7); return T("The loan arrives in 2 minutes. The interest stays in your life for 2 years.", "The loan enter in 2 minutes. The interest go enter your life for 2 years."); } },
      { label: T("Sell your phone", "Sell your phone"), run: (q) => { q.money += I(q, 200_000); bump(q, "happiness", -8); return T("You sell the phone and buy a small Tecno for ₦20K. Life goes on.", "You sell the phone, buy 'Tecno small' for ₦20K. Life dey continue."); } },
      { label: T("Ask family for help", "Beg family make dem help"), disabled: p.family.happy < 25 ? T("Family is not on speaking terms with you", "Family no dey talk to you") : false, run: (q) => { const n = primaryProvider(q); if (!n) return T("You have nobody to ask.", "You no get anybody to ask."); return applySupport(q, n, "emergency", evaluateSupport(q, n, "emergency", defaultAmount(q, "food") * 3)); } },
      { label: T("Hustle on any side gig", "Hustle any side gig"), run: (q) => { q.money += I(q, rand(100_000, 300_000)); bump(q, "stress", 6); return T("You wash cars, sell recharge cards, carry loads. The hustle never sleeps.", "You wash motor, sell recharge card, carry load. Hustle no dey sleep."); } },
    ],
  },
  {
    id: "bank_debit",
    title: dual("Double debit", "Double debit"),
    weight: (p) => (adult(p) && p.money > I(p, 100_000) ? 3 : 0),
    text: () => T("You send a transfer and it says 'failed'. Next minute, an alert: debited twice! Your bank says 'please bear with us, network issue'.", "You send transfer, e say 'failed'. Next minute, alert: dem debit you twice! Your bank say 'abeg bear with us, network issue'."),
    choices: () => [
      { label: T("Queue at the branch", "Go queue for the bank branch"), run: (q) => { bump(q, "stress", 6); if (chance(0.7)) return T("After 4 hours of warming a chair, they refund you.", "After 4 hours of sitting down dey wait, dem refund you."); q.money -= I(q, 30_000); return T("The man behind the counter says 'come back next week'. You lose 30K on transport and sorrow.", "The man behind the counter say 'come back next week'. You lose 30K for transport and sorrow."); } },
      { label: T("Tweet at the bank", "Tweet the bank"), run: (q) => { if (chance(0.65)) { bump(q, "reputation", 2); return T("You tweet and tag the bank and the CBN. Within an hour they refund you and apologise. Twitter is a weapon.", "You tweet, tag the bank and CBN. Within one hour dem refund you and apologise. Twitter na weapon."); } return T("They reply 'Kindly DM us' and that is all.", "Dem reply 'Kindly DM us' and na so e end."); } },
      { label: T("Forget it", "Forget am"), run: (q) => { q.money -= I(q, 50_000); return T("It is only ₦50K, right? It hurts, but you let it go.", "Na only ₦50K abi? E pain you but you let am go."); } },
    ],
  },
  {
    id: "prophet",
    title: dual("Man of God", "Man of God"),
    weight: (p) => (adult(p) && p.religion !== "Traditional" ? 2 : 0),
    text: () => T("The Prophet calls you aside after service: 'My son/daughter, God has shown me that marriage is coming, but first you must sow a seed of ₦200,000 for the breakthrough.'", "Prophet call you for corner after service: 'My son/daughter, God show me say marriage dey come, but first you must sow seed of ₦200,000 for the breakthrough.'"),
    choices: (p) => [
      { label: T("Sow the seed", "Sow the seed"), sub: naira(I(p, 200_000)), disabled: p.money < I(p, 200_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 200_000); bump(q, "happiness", 3); bump(q, "connections", 2); return T("You sow it in faith. Whether the breakthrough comes is another story.", "You sow am with faith. Whether the breakthrough go come, na another story."); } },
      { label: T("Politely decline", "Decline am nicely"), run: () => T("'God will provide, Prophet.' You walk away smiling.", "'God go provide, Prophet.' You waka go dey smile.") },
      { label: T("Expose him online", "Expose am online"), run: (q) => { if (chance(0.5)) { bump(q, "reputation", 4); return T("Your video goes viral. People call you brave.", "Your video go viral. People call you brave."); } bump(q, "reputation", -4); return T("His followers attack you online. Trouble.", "His followers attack you online. Wahala."); } },
    ],
  },
  {
    id: "festival",
    title: dual("Time to go to the village", "Time don reach to go village"),
    weight: (p) => (adult(p) && p.family.state !== p.state && p.family.parentsAlive ? 3.5 : 0),
    text: (p) => T(`${festival(p)} is here! Everybody is travelling home. ${homeCaller(p)} calls: 'Who sits in town when the whole family is gathering? Come home!'`, `${festival(p)} don reach! Everybody dey travel go house. ${homeCaller(p)} call: 'Who go sit for town when the whole family dey gather? Come home o!'`),
    choices: (p) => {
      const cost = I(p, 2) * travelCost(stateOf(p), STATE_BY_ID[p.family.state]) + I(p, 300_000);
      return [
        { label: T("Travel home with gifts", "Travel go house with gifts"), sub: naira(cost), disabled: p.money < cost ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= cost; q.traveled = true; q.family.happy = clamp(q.family.happy + 15); bump(q, "happiness", 8); bump(q, "reputation", 3); return T("A full house, rice and stew, and everybody asks 'when will you marry?' Home sweet home.", "Full house, rice and stew, and everybody dey ask 'when you go marry?' Home sweet home."); } },
        { label: T("Send money and stay", "Send money, stay where you dey"), sub: naira(I(p, 100_000)), run: (q) => { q.money -= I(q, 100_000); q.family.happy = clamp(q.family.happy - 3); return T("Mama accepts the money but you hear the sadness in her voice.", "Mama collect the money but you hear sadness for her voice."); } },
        { label: T("Avoid everyone", "Dodge everybody"), run: (q) => { q.family.happy = clamp(q.family.happy - 10); return T("You block everyone for three days. A child who does not come home owes an explanation.", "You block everybody for three days. Pikin wey no go house, explanation dey wait am."); } },
      ];
    },
  },
  {
    id: "omo_onile",
    title: dual("Omo onile", "Omo onile"),
    weight: (p) => (p.houses.length > 0 ? 3 : 0),
    text: () => T("A group of omo onile (local land owners) show up at your property: 'This land belongs to our family. Pay your 'sitting fee' or there will be no peace.'", "Group of omo onile (local land owners) show for your property: 'This land na our family own. Pay your 'sitting fee' or no peace.'"),
    choices: (p) => [
      { label: T("Settle them", "Settle dem"), sub: naira(I(p, 1_500_000)), run: (q) => { q.money -= I(q, 1_500_000); return T("You pay their 'fee' and they leave singing your praises.", "You pay their 'fee' and dem go dey sing your praise."); } },
      { label: T("Hire a lawyer", "Hire lawyer"), sub: naira(I(p, 800_000)), run: (q) => { q.money -= I(q, 800_000); if (chance(0.6)) return T("Your lawyer produces documents and the matter quietens down.", "Your lawyer bring documents and the thing quiet down."); const h = q.houses[0]; if (h) h.value *= 0.9; return T("The case drags on. The house loses value as tenants fear trouble.", "The case drag. House lose value as tenants dey fear wahala."); } },
      { label: T("Call the police", "Call police"), run: (q) => { if (chance(0.5)) return T("The police come and the omo onile run away. For now.", "Police come and omo onile run. For now."); q.money -= I(q, 300_000); return T("The police ask for 'mobilisation' before they even move. You pay anyway.", "Police ask for 'mobilisation' before dem even move. You pay anyway."); } },
      { label: T("Ignore them", "Ignore dem"), run: (q) => { if (chance(0.5)) { const h = q.houses[0]; if (h) h.value *= 0.85; return T("They vandalise the site at night. The house loses value.", "Dem vandalise the site for night. House lose value."); } return T("They threaten you and leave. Luck is on your side.", "Dem threaten you and leave. Luck dey your side."); } },
    ],
  },
  {
    id: "credit_customer",
    title: dual("'I'll pay tomorrow'", "'I go pay tomorrow'"),
    weight: (p) => (selfEmployed(p) ? 3 : 0),
    text: () => T("Your regular customer pleads: 'Oga/Madam, put it on my head. I will pay you tomorrow, I swear.' Tomorrow has already turned into three months.", "Your regular customer dey beg: 'Oga/Madam, put am for my head. I go pay you tomorrow, I swear.' Tomorrow don turn three months before."),
    choices: () => [
      { label: T("Give credit", "Give am on credit"), run: (q) => { if (chance(0.65)) { bump(q, "connections", 2); return T("He pays everything and brings extra. A loyal customer is gold.", "He pay everything and bring extra. Loyal customer na gold."); } q.money -= I(q, 120_000); return T("He disappears. The phone is off. Another ₦120K lost to 'tomorrow'.", "He vanish. Phone dey off. Another ₦120K don waste for 'tomorrow'."); } },
      { label: T("No credit today", "No credit today"), run: (q) => { bump(q, "reputation", -1); return T("'Pay cash or don't take it.' He grumbles but pays.", "'Pay cash or no carry.' He grumble but he pay."); } },
    ],
  },
  {
    id: "microloan",
    title: dual("Microfinance loan", "Microfinance loan"),
    weight: (p) => {
      const c = expandCostFor(p);
      return selfEmployed(p) && c !== null && p.money < c ? 2.5 : 0;
    },
    text: () => T("A loan officer visits your shop: 'Oga/Madam, we can give you money to grow your business. Interest is only 5% per month.' (Do the maths for 12 months.)", "Loan officer visit your shop: 'Oga/Madam, we fit give you money to grow your business. Interest na only 5% per month.' (Do the maths for 12 months.)"),
    choices: () => [
      { label: T("Take the loan and expand", "Take the loan, expand"), run: (q) => { const c = expandCostFor(q); const j = jobDef(q); if (c !== null && q.job && j) { q.job.rank = Math.min(q.job.rank + 1, j.ladder.length - 1); q.job.years = 0; q.debt += c * 1.5; return T(`You expand: ${j.ladder[q.job.rank].title}. The debt is huge, but the business is growing.`, `You expand: ${j.ladder[q.job.rank].title}. The debt too big, but business dey grow.`); } return T("No loan for you today.", "No loan for you today."); } },
      { label: T("No, the interest is too heavy", "No, interest too heavy"), run: () => T("Wise. A loan can feed you or finish you.", "You wise. Loan fit feed you, e fit finish you too.") },
    ],
  },
  {
    id: "election_season",
    title: dual("Election season", "Election season"),
    weight: (p) => (adult(p) ? 2 : 0),
    text: () => T("Election season! Party agents are sharing rice, branded T-shirts and ₦5,000 per head. 'Vote for us and you will eat better.'", "Election season! Party agents dey share rice, branded T-shirt and ₦5,000 per head. 'Vote for us and you go chop better.'"),
    choices: () => [
      { label: T("Take the money, vote your conscience", "Collect the money, vote wetin you want"), run: (q) => { q.money += I(q, 5_000); bump(q, "smarts", 1); return T("You collect the rice, smile, and vote for who you want. The ballot has no camera.", "You collect the rice, dey smile, and vote for who you want. Ballot no get camera."); } },
      { label: T("Sell your PVC", "Sell your PVC"), run: (q) => { q.money += I(q, 20_000); bump(q, "reputation", -4); return T("₦20K for one card. Democracy sold for pocket money.", "₦20K for one card. Democracy don sell for pocket money."); } },
      { label: T("Become a polling observer", "Become polling observer"), run: (q) => { bump(q, "reputation", 4); bump(q, "connections", 2); bump(q, "stress", 5); return T("You watch the collation until 3am. You see things. You count and verify.", "You watch collation reach 3am. You see things. You count and verify."); } },
      { label: T("Stay at home", "Stay for house"), run: (q) => { bump(q, "stress", -2); return T("You skip the whole thing. A holiday on election day.", "You skip the whole thing. Na holiday for election day."); } },
    ],
  },
  {
    id: "twitter_trend",
    title: dual("You are trending", "You dey trend"),
    weight: (p) => (p.age >= 16 ? 1.8 : 0),
    text: () => T("You post a sharp tweet at midnight. By morning you are trending, QTs everywhere, and strangers are 'dragging' you.", "You post one sharp tweet for midnight. By morning you don trend, QTs everywhere, and strangers dey 'drag' you."),
    choices: () => [
      { label: T("Apologise", "Apologise"), run: (q) => { bump(q, "reputation", -1); bump(q, "stress", -4); return T("You apologise. Everyone moves on to the next victim by Tuesday.", "You apologise. Everybody don move to the next victim by Tuesday."); } },
      { label: T("Double down", "Double down"), run: (q) => { if (chance(0.5)) { bump(q, "reputation", 6); return T("You win the argument! New followers, new fans, new enemies.", "You win the argument! New followers, new fans, new enemies."); } bump(q, "reputation", -10); bump(q, "stress", 10); return T("You get cancelled. Brands unfollow you. Ouch.", "Dem cancel you. Brands unfollow you. Chai."); } },
      { label: T("Delete the account", "Delete the account"), run: (q) => { bump(q, "stress", -6); return T("You delete everything and go outside. Fresh air feels like a new product.", "You delete everything, go outside. Fresh air be like new product."); } },
    ],
  },
  {
    id: "village_attack",
    title: dual("Trouble back home", "Wahala for house back home"),
    weight: (p) => (adult(p) && STATE_BY_ID[p.family.state].risk >= 6 && p.family.happy > 0 ? 2.2 : 0),
    text: (p) => T(`Terrible news from ${STATE_BY_ID[p.family.state].name}: armed men have attacked communities near your people. The family is scared and asking for help to relocate.`, `Bad news from ${STATE_BY_ID[p.family.state].name}: armed men don attack communities near your people. Family dey fear and dem dey beg for help to relocate.`),
    choices: (p) => [
      { label: T("Relocate them to a safer state", "Move dem go safer state"), sub: naira(I(p, 3_000_000)), disabled: p.money < I(p, 3_000_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 3_000_000); const safe = pick(TRAVEL_STATES.filter((s) => s.risk <= 4 && s.opp >= 4)); q.family.state = safe.id; q.family.happy = clamp(q.family.happy + 18); return T(`You move your people to ${safe.name}. They cry with relief.`, `You move your people go ${safe.name}. Dem cry with relief.`); } },
      { label: T("Send money for their safety", "Send money for their safety"), sub: naira(I(p, 500_000)), run: (q) => { q.money -= I(q, 500_000); q.family.happy = clamp(q.family.happy + 6); return T("You send what you can. They say prayer will do the rest.", "You send wetin you fit. Dem say na prayer go do the rest."); } },
      { label: T("There is nothing you can do", "Nothing you fit do"), run: (q) => { q.family.happy = clamp(q.family.happy - 14); bump(q, "stress", 8); return T("You feel helpless. The silence from home hits you hard.", "You feel say you no fit do anything. The silence from house hit you hard."); } },
    ],
  },
  {
    id: "mother_in_law",
    title: dual("In-law trouble", "In-law wahala"),
    weight: (p) => (p.spouse ? 2 : 0),
    text: (p) => T(`${p.spouse?.name}'s mother arrives for a 'one-week visit'. Three months later, she is rearranging your kitchen and critiquing your cooking.`, `${p.spouse?.name}'s mother come for 'one-week visit'. Three months after, she dey rearrange your kitchen and dey criticise your cooking.`),
    choices: () => [
      { label: T("Welcome her warmly", "Welcome am well well"), run: (q) => { if (q.spouse) q.spouse.happy = clamp(q.spouse.happy + 8); q.money -= I(q, 100_000); return T("You smile and swallow your feelings. Your spouse loves you more for it.", "You smile and swallow your feelings. Your spouse go love you more for am."); } },
      { label: T("Set boundaries politely", "Draw line, but gently"), run: (q) => { if (chance(0.5)) return T("She grumbles but understands. Peace is restored.", "She grumble but she understand. Peace return."); if (q.spouse) q.spouse.happy = clamp(q.spouse.happy - 10); return T("She takes offence. Your spouse takes her side.", "She vex. Your spouse go carry her side."); } },
      { label: T("Hide in the office", "Hide for office"), run: (q) => { bump(q, "stress", 5); return T("You work till 10pm every day. Your spouse notices.", "You dey work reach 10pm every day. Your spouse notice."); } },
    ],
  },
  {
    id: "harassment",
    title: dual("Stop and search", "Dem stop you, dem dey search you"),
    weight: (p) => (p.age >= 18 && p.age <= 35 && !p.politics ? 2 : 0),
    text: () => T("Plain-clothes men stop you: 'What is on your phone and laptop? Why do you have an iPhone? Are you a Yahoo boy?' You have not even done anything.", "Plain-clothes men stop you: 'Wetin dey your phone and laptop? Why you get iPhone? You be Yahoo boy?' You never even do anything."),
    choices: (p) => [
      { label: T("Stay calm, show receipts", "Stay calm, show receipt"), run: (q) => { bump(q, "smarts", 1); if (chance(0.6)) return T("They see you are not easy to cheat and let you go.", "Dem see say you no easy to cheat, dem let you go."); q.money -= I(q, 40_000); return T("They still ask for 'something for water'.", "Dem still ask for 'something for water'."); } },
      { label: T("Pay them to go away", "Pay dem make dem comot"), sub: naira(I(p, 30_000)), run: (q) => { q.money -= I(q, 30_000); return T("You pay and they disappear. You are angry but alive.", "You pay and dem disappear. You dey vex but you dey alive."); } },
      { label: T("Record everything on your phone", "Record everything for your phone"), run: (q) => { if (chance(0.5)) { bump(q, "reputation", 3); return T("They back off when they notice the camera. You post the video later.", "Dem back off when dem see camera. You post the video later."); } bump(q, "health", -8); q.money -= I(q, 50_000); return T("They take the phone and slap you. Rough.", "Dem collect the phone and slap you. E rough."); } },
    ],
  },
  {
    id: "land_scam",
    title: dual("Last plot!", "Last plot o!"),
    weight: (p) => (adult(p) && p.money > I(p, 5_000_000) ? 2 : 0),
    text: () => T("A smooth-talking agent shows you a 'prime plot' near the new airport road: 'Last plot! C of O ready. The price will double next week.'", "Smooth-talking agent show you one 'prime plot' near the new airport road: 'Last plot! C of O ready. Price go double next week.'"),
    choices: (p) => [
      { label: T("Buy it now", "Buy am now"), sub: naira(p.money * 0.2), run: (q) => { const a = q.money * 0.2; q.money -= a; if (chance(0.5 + luckBonus(q))) { q.money += a * 1.4; return T(`The plot is genuine! You resell for ${naira(a * 1.4)}. You feel like Dangote.`, `The plot na real! You resell am for ${naira(a * 1.4)}. You feel like Dangote.`); } bump(q, "stress", 12); return T(`The same plot was sold to five people. ${naira(a)} gone. The agent switched off his phone.`, `Dem sell the same plot to five people. ${naira(a)} don go. The agent switch off his phone.`); } },
      { label: T("Verify with a lawyer first", "Make lawyer check am first"), sub: naira(I(p, 1_000_000)), disabled: p.money < I(p, 1_000_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.money -= I(q, 1_000_000); if (chance(0.5)) { bump(q, "smarts", 2); return T("Your lawyer discovers it is a scam. You dodge it by inches.", "Your lawyer find out say na scam. You dodge am by inch."); } const a = q.money * 0.15; q.money += a * 0.4; return T("The papers are real. You buy a small portion and make a small profit.", "The papers na real. You buy small and make small profit."); } },
      { label: T("Walk away", "Waka go"), run: () => T("If it is too good to be true, it usually is not true. You pass.", "Anything wey sweet pass, e no dey true. You pass.") },
    ],
  },
  {
    id: "family_land",
    title: dual("Village land matter", "Village land matter"),
    weight: (p) => (adult(p) && p.family.state !== p.state && STATE_BY_ID[p.family.state].opp <= 5 ? 2 : 0),
    text: () => T("Your uncle calls from the village: 'Our land is in dispute. You are the first child. You must come home to represent this family!'", "Your uncle call from village: 'Our land dey for dispute o. You be the first child. You must come home represent this family!'"),
    choices: (p) => [
      { label: T("Go home and settle it", "Go house settle am"), sub: naira(I(p, 400_000)), run: (q) => { q.money -= I(q, 400_000); q.traveled = true; q.family.happy = clamp(q.family.happy + 10); bump(q, "reputation", 4); return T("You sit with the elders for three days. Kola nut, palm wine, and a fair settlement.", "You sit with the elders for three days. Kola nut, palm wine, and fair settlement."); } },
      { label: T("Send money for a lawyer", "Send money for lawyer"), sub: naira(I(p, 250_000)), run: (q) => { q.money -= I(q, 250_000); return T("The lawyer collects your money. The case continues.", "Lawyer collect your money. Case still dey go on."); } },
      { label: T("Ignore it", "Ignore am"), run: (q) => { q.family.happy = clamp(q.family.happy - 10); return T("You leave them to manage. The elders do not forget.", "You leave dem to manage. The elders no go forget."); } },
    ],
  },
  {
    id: "boss_bribe",
    title: dual("The boss at the top", "Oga for the top"),
    weight: (p) => (p.job && jobDef(p)?.group === "formal" ? 3 : 0),
    text: () => T("Your boss calls you: 'This contract will pass through your desk. But something must go into my pocket. You will get your own share. Let us eat together.'", "Your oga call you: 'This contract go pass your table. But something must enter my pocket. You go get your own share. Make we chop together.'"),
    choices: () => [
      { label: T("Join the arrangement", "Join the arrangement"), run: (q) => { const g = I(q, rand(250_000, 1_200_000)); q.money += g; bump(q, "reputation", -6); if (chance(0.12)) { q.job = null; return T(`You collect ${naira(g)}. Then a whistleblower speaks up and you are quietly sacked.`, `You collect ${naira(g)}. Then whistleblower open mouth and dem sack you quietly.`); } return T(`You collect ${naira(g)}. Another 'bonus' in a Ghana-must-go bag.`, `You collect ${naira(g)}. Another 'bonus' for Ghana-must-go bag.`); } },
      { label: T("Refuse and stay clean", "Refuse, keep your hand clean"), run: (q) => { bump(q, "stress", 6); if (chance(0.25)) { q.job = null; return T("He sacks you for 'poor attitude'. Integrity can cost you.", "He sack you for 'poor attitude'. Integrity fit cost you."); } bump(q, "reputation", 4); return T("He sulks for a month but quietly respects you.", "He sulk for one month but e respect you for inside."); } },
      { label: T("Report him", "Report am"), run: (q) => { if (chance(0.4)) { bump(q, "reputation", 10); return T("Management investigates and suspends him. You become a hero.", "Management investigate and suspend am. You turn hero."); } q.job = null; bump(q, "stress", 12); return T("The report 'disappears' and you are suddenly 'redundant'. Ouch.", "The report 'disappear' and na so dem say you don 'redundant'. Chai."); } },
    ],
  },
  {
    id: "okada_ban",
    title: dual("Okada ban", "Okada ban"),
    weight: (p) => (p.job?.id === "keke" || p.job?.id === "conductor" ? 3 : 0),
    text: () => T("The government announces a new ban on okada and keke on major roads. 'For public safety.' You do not know whether to laugh or cry.", "Government announce new ban on okada and keke for major roads. 'For public safety.' You no know whether to laugh or cry."),
    choices: () => [
      { label: T("Move to a different area", "Move to another area"), run: (q) => { q.money -= I(q, 150_000); return T("You relocate your operation to the inner streets. Fewer passengers, fewer problems.", "You move your work go inside streets. Passengers few, wahala few too."); } },
      { label: T("Join the protest", "Join the protest"), run: (q) => { if (chance(0.5)) { bump(q, "reputation", 3); return T("After days of protest, the government softens the ban.", "After days of protest, government soften the ban."); } q.money -= I(q, 50_000); return T("The police scatter the protest. You lose a day's income and a slipper.", "Police scatter the protest. You lose one day income and one slippers."); } },
      { label: T("Sell the bike and start POS", "Sell the bike, start POS"), run: (q) => { q.money += I(q, 250_000); q.job = { id: "pos", rank: 0, years: 0 }; return T("You sell the bike, buy a POS machine, and open under a big umbrella.", "You sell the bike, buy POS machine, and open under big umbrella."); } },
    ],
  },
  {
    id: "apprenticeship",
    title: dual("A master offers an apprenticeship", "Oga don offer you apprenticeship"),
    weight: (p) => (p.tribe === "Igbo" && p.age >= 14 && p.age <= 22 && !p.job && !p.school ? 6 : 0),
    text: () => T("A successful trader in the market offers to take you in as an apprentice (imu-ahia): 'Learn the trade under me. After some years, I will settle you with capital to start your own shop.'", "Successful trader for market offer to take you as apprentice (imu-ahia): 'Learn the trade under me. After some years, I go settle you with capital to start your own shop.'"),
    choices: () => [
      { label: T("Accept the apprenticeship", "Accept the apprenticeship"), run: (q) => { const id = pick(["provisions", "phone", "thrift", "mechanic", "tailor"]); q.job = { id, rank: 1, years: 0 }; bump(q, "connections", 6); bump(q, "smarts", 3); return T("After hard years of sweeping, carrying and learning, Oga settles you with capital and a shop. You are your own boss now.", "After hard years of sweeping, carrying load and learning, Oga settle you with capital and shop. You don be your own boss now."); } },
      { label: T("No, go on your own", "No, you go do your own"), run: () => T("You thank him but go your own way.", "You thank am but you go your own way.") },
    ],
  },
  {
    id: "mama_put",
    title: dual("Hunger trouble", "Hunger wahala"),
    weight: (p) => (adult(p) && p.stats.happiness < 45 ? 3 : 0),
    text: () => T("Things are hard. The body is tired and the spirit is low. A mama put nearby is selling hot jollof and fried plantain, smelling like heaven.", "Things dey hard. Body dey tire and spirit dey low. One mama put dey sell hot jollof and fried plantain near you, e smell like heaven."),
    choices: (p) => [
      { label: T("Buy two plates of jollof and plantain", "Buy two plate jollof and plantain"), sub: naira(I(p, 3_000)), run: (q) => { q.money -= I(q, 3_000); bump(q, "happiness", 10); return T("Heaven on a plate. For ten minutes, there is no problem in this world.", "Heaven for plate. For ten minutes, no problem dey this world."); } },
      { label: T("Just go home and sleep", "Just go house sleep"), run: (q) => { bump(q, "stress", -3); return T("You sleep like a log. Tomorrow will be better.", "You sleep like log. Tomorrow go better."); } },
    ],
  },
  {
    id: "cousin_visits",
    title: dual("Cousin from the village", "Cousin from village"),
    weight: (p) => (adult(p) && p.family.state !== p.state && (stateOf(p).opp >= 6) ? 2 : 0),
    text: () => T("Your cousin lands at your house with one bag: 'Cuz, I have come to look for work. Just a short time. One month maximum.' Three months later he is still in your house.", "Your cousin land for your house with one bag: 'Cuz, I don come find work. Na small time. Maximum one month.' The man still dey your house after three months."),
    choices: () => [
      { label: T("Let him stay and help him find a job", "Let am stay, help am find job"), run: (q) => { q.money -= I(q, 200_000); q.family.happy = clamp(q.family.happy + 10); bump(q, "reputation", 3); return T("He eventually finds work and sends you a thank-you chicken. Family is family.", "E reach am, he find work and send thank-you chicken give you. Family na family."); } },
      { label: T("Tell him to leave politely", "Tell am to go, but gently"), run: (q) => { q.family.happy = clamp(q.family.happy - 8); return T("The village WhatsApp group hears about it before nightfall. Sorry, no vacancy.", "Village WhatsApp group hear am before night. Sorry, no space."); } },
    ],
  },
  {
    id: "quick_deal",
    title: dual("Customs auction", "Customs auction"),
    weight: (p) => (adult(p) && p.money > I(p, 2_000_000) ? 1.8 : 0),
    text: () => T("A friend on the inside tells you: 'Customs is auctioning seized goods tomorrow. 50 cartons of rice at peanut prices. We resell and double it.'", "Friend wey dey inside tell you: 'Customs dey auction seized goods tomorrow. 50 cartons of rice for peanut price. We go resell and double am.'"),
    choices: (p) => [
      { label: T("Buy in", "Join buy am"), sub: naira(p.money * 0.1), run: (q) => { const a = q.money * 0.1; q.money -= a; if (chance(0.6)) { q.money += a * 1.8; return T(`The goods sell fast! You make ${naira(a * 0.8)} profit.`, `The goods sell fast! You make ${naira(a * 0.8)} profit.`); } return T("The goods get stuck at the port. Demurrage and bribes eat everything.", "The goods stuck for port. Demurrage and bribe chop everything."); } },
      { label: T("Pass", "Pass"), run: () => T("You prefer to sleep well at night.", "You prefer sleep well for night.") },
    ],
  },
  {
    id: "jail_inside",
    title: dual("Prison life", "Prison life"),
    weight: (p) => (p.prison > 0 ? 3 : 0),
    text: () => T("Inside the cell, a long-time inmate pulls you aside: 'You are new here. I will teach you how to survive. But you will owe me.'", "Inside the cell, one old inmate pull you aside: 'You new for here. I go teach you how to survive. But you go owe me.'"),
    choices: () => [
      { label: T("Accept his protection", "Accept im protection"), run: (q) => { bump(q, "stress", -4); bump(q, "connections", 2); return T("He teaches you the rules and shows you which warder to avoid. You survive.", "He teach you the rules and show you which warder to avoid. You survive."); } },
      { label: T("Keep to yourself", "Mind your own"), run: (q) => { bump(q, "health", -4); bump(q, "smarts", 2); return T("You read old newspapers and write letters. Lonely, but safer.", "You read old newspaper and write letter. E lonely, but e safer."); } },
    ],
  },
];

export const AUTOS2: AutoDef[] = [
  { id: "flood", weight: (p) => (["bayelsa", "delta", "rivers", "niger", "kogi", "benue", "anambra", "adamawa", "taraba"].includes(p.state) ? 3 : 0), run: (p) => { for (const h of p.houses) if (h.state === p.state) h.value *= 0.92; p.money -= I(p, 150_000); return T("Flood! Water gets everywhere and carries chairs away. Everybody is cleaning mud for weeks.", "Flood! Water enter everywhere and carry chairs go. Everybody dey clean mud for weeks."); } },
  { id: "kids_school", weight: (p) => (p.kids.some((k) => k.age >= 5 && k.age <= 17) ? 5 : 0), run: (p) => { const n = p.kids.filter((k) => k.age >= 5 && k.age <= 17).length; const fee = I(p, 300_000) * n; p.money -= fee; return T(`School fees and uniform for ${n} child${n > 1 ? "ren" : ""}: ${naira(fee)}. New session, new levy.`, `School fees and uniform for ${n} pikin${n > 1 ? " dem" : ""}: ${naira(fee)}. New session, new levy.`); } },
  { id: "nin", weight: (p) => (p.age >= 16 ? 2 : 0), run: (p) => { bump(p, "stress", 4); return T("NIN-SIM linking deadline: you queue for 6 hours at the NIMC office and the system 'goes offline' three times.", "NIN-SIM linking deadline: you queue for 6 hours for NIMC office and the system 'go offline' three times."); } },
  { id: "jollof", weight: () => 2.5, run: (p) => { bump(p, "happiness", 4); return T("The jollof war is on Twitter again: Nigeria vs Ghana. You defend party jollof with your whole chest.", "Jollof war dey Twitter again: Nigeria vs Ghana. You defend party jollof with your whole chest."); } },
  { id: "eagles", weight: (p) => (p.age >= 8 ? 3 : 0), run: (p) => { if (chance(0.5)) { bump(p, "happiness", 6); return T("Super Eagles win! The whole street is screaming, horns are blowing, nobody sleeps.", "Super Eagles win! Whole street dey scream, horns dey blow, nobody sleep."); } bump(p, "happiness", -4); return T("Super Eagles lose again. National depression for one week.", "Super Eagles lose again. National depression for one week."); } },
  { id: "generator_thief", weight: (p) => (adult(p) ? 2 : 0), run: (p) => { p.money -= I(p, 120_000); return T("Thieves carry off your generator in the night. Now you fear NEPA and thieves together.", "Thieves carry your generator for night. Now you dey fear NEPA and thieves together."); } },
  { id: "rice_price", weight: (p) => (p.age >= 10 ? 2.5 : 0), run: (p) => { p.money -= adult(p) ? I(p, 60_000) : 0; return T("The price of rice is rising like a rocket. 'A bag of rice is the new luxury item,' people tweet.", "Price of rice dey rise like rocket. 'Bag of rice na new luxury item,' people dey tweet."); } },
  { id: "nlc_strike", weight: (p) => (p.age >= 18 && p.job && jobDef(p)?.group === "formal" ? 2 : 0), run: (p) => { bump(p, "stress", 5); return T("NLC declares a strike over fuel price. Offices shut. Salary is delayed for two months.", "NLC declare strike over fuel price. Offices shut. Salary dey delay for two months."); } },
  { id: "salary_delay", weight: (p) => (p.job && jobDef(p)?.group === "formal" ? 2 : 0), run: (p) => { p.money -= I(p, 100_000); bump(p, "stress", 5); return T("Salary does not come on time again. 'System upgrade,' they tell you.", "Salary no come on time again. 'System upgrade,' dem tell you."); } },
  { id: "wedding_jollof", weight: (p) => (adult(p) ? 2 : 0), run: (p) => { bump(p, "happiness", 5); p.money -= I(p, 60_000); return T("You attend three weddings the same weekend and wear the same aso-ebi to two.", "You attend three weddings the same weekend and wear the same aso-ebi to two of dem."); } },
  { id: "gist", weight: (p) => (p.age >= 12 ? 2 : 0), run: (p) => { bump(p, "happiness", 3); return T("Your neighbour tells you the best gist of the year. You cannot repeat it, but you will.", "Your neighbour tell you the best gist of the year. You no suppose repeat am, but you go repeat am."); } },
  { id: "malaria", weight: (p) => (p.age >= 3 ? 1.5 : 0), run: (p) => { p.flags.spawnCondition = "malaria"; return T("Malaria visits again: cold, shivering, and a terrible headache.", "Malaria visit you again: cold, shaking body, and serious headache."); } },
  { id: "rebase", weight: (p) => (p.age >= 20 && p.age <= 40 ? 1.5 : 0), run: (p) => { bump(p, "happiness", 3); return T("Friends plan a 'Detty December' trip to Lagos. You look at your account balance like it is a horror film.", "Friends plan 'Detty December' trip go Lagos. You dey look your account balance like say na horror film."); } },
  { id: "move", weight: (p) => (adult(p) && stateOf(p).opp >= 8 ? 1 : 0), run: (p) => { bump(p, "connections", 1); return T("You meet a big man at a Lagos/Abuja party who says 'let us talk next week'. He never calls, but now you know him.", "You meet one big man for Lagos/Abuja party wey say 'make we talk next week'. He no call, but now you know am."); } },
];
