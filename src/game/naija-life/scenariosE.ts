import type { Player } from "./types";
import type { Scn } from "./scenarios";

const has = (p: Player) => p.businesses.some((b) => b.status === "open");
const food = (p: Player) => p.businesses.some((b) => b.status === "open" && ["akara", "bukka", "restaurant", "bakery", "mama_foods", "supermarket", "provisions", "water", "coldroom", "lounge", "beerparlour", "hotel"].includes(b.kind));
const staffed = (p: Player) => p.businesses.some((b) => b.status === "open" && (b.crew?.length ?? 0) > 0);

/** Things that happen to people who own a business. These are not rare: owning a business is a full-time wahala. */
export const SCN_BIZ: Scn[] = [
  { id: "biz_strike", title: ["Staff down tools", "Staff down tools"], ages: [18, 90], w: 1.1, rarity: 1, when: staffed,
    text: ["Your staff gather at the door: 'Oga, we are not working until the salary is increased.'", "Your staff gather for door: 'Oga, we no go work till salary increase.'"],
    choices: [
      { label: ["Agree to a raise", "Agree to raise"], cost: 120_000, biz: { loyalty: 12 }, text: ["Work resumes with smiles. Your wage bill goes up.", "Work resume with smile. Wage bill go up."] },
      { label: ["Negotiate a compromise", "Negotiate compromise"], fx: { s: 3 }, biz: { loyalty: 4 }, text: ["Two meetings later: a small raise and some free lunch.", "Two meeting later: small raise and free lunch."], bad: { p: 0.3, biz: { loseStaff: true }, text: ["One of them leaves anyway.", "One of dem leave anyway."] } },
      { label: ["Sack the ringleader", "Sack the ringleader"], fx: { r: -2, s: 3 }, biz: { loyalty: -10, loseStaff: true, q: -3 }, text: ["Others return to work, but scared and quiet.", "Others return to work, but dem dey fear and quiet."] },
    ] },
  { id: "biz_nafdac", title: ["NAFDAC visit", "NAFDAC visit"], ages: [18, 90], w: 1, rarity: 1, when: food,
    text: ["Inspectors walk in unannounced and start opening freezers. 'Where is your NAFDAC number?'", "Inspector enter unannounced and begin to open freezer. 'Where your NAFDAC number?'"],
    choices: [
      { label: ["Show your papers", "Show your papers"], fx: { r: 1 }, biz: { fame: 2 }, text: ["Everything is in order. They leave with a lunch pack.", "Everything correct. Dem comot with lunch pack."] },
      { label: ["'Settle' them", "'Settle' dem"], cost: 80_000, fx: { r: -1 }, text: ["They discover your papers are 'almost' complete.", "Dem discover say your paper 'almost' complete."] },
      { label: ["Get the proper registration now", "Do the proper registration now"], cost: 250_000, biz: { q: 4, fame: 2 }, text: ["Weeks of paperwork, but you sleep better.", "Weeks of paperwork, but you sleep better."] },
    ] },
  { id: "biz_blackout", title: ["A week without light", "One week no light"], ages: [18, 90], w: 1.1, rarity: 1, when: has,
    text: ["The transformer is down. A week without light, your diesel is gone and customers are walking.", "Transformer don spoil. One week no light, your diesel don finish and customer dey waka."],
    choices: [
      { label: ["Buy diesel and keep trading", "Buy diesel and keep trading"], cost: 150_000, text: ["The generator roars and the customers stay.", "Generator dey roar and customer dey stay."] },
      { label: ["Close early each day", "Close early every day"], biz: { fame: -3 }, fx: { s: 2 }, text: ["Sales dip but costs stay low.", "Sales drop but cost stay low."] },
      { label: ["Invest in solar", "Invest for solar"], cost: 900_000, biz: { q: 3, fame: 2 }, text: ["Expensive, but next blackout will not hurt.", "E cost, but next blackout no go hurt."] },
    ] },
  { id: "biz_supplier_scam", title: ["Supplier disappears", "Supplier vanish"], ages: [18, 90], w: 0.9, rarity: 1, when: has,
    text: ["You paid a new supplier in advance for a big shipment. His phone is now switched off.", "You pay new supplier for big shipment. Him phone don off."],
    choices: [
      { label: ["Report to the police", "Report to police"], fx: { m: -150_000, s: 3 }, text: ["They take a statement and ask for 'transport money'.", "Dem take statement and ask for 'transport money'."] },
      { label: ["Find him through other traders", "Find am through other traders"], fx: { s: 3, c: 1 }, text: ["Someone knows his cousin. You recover half.", "Somebody know him cousin. You recover half."], bad: { p: 0.5, fx: { m: -150_000 }, text: ["The cousin is also missing.", "The cousin sef don miss."] } },
      { label: ["Absorb the loss and move on", "Absorb the loss and move on"], fx: { m: -250_000, h: -2 }, text: ["From now on you only pay on delivery.", "From now you go only pay for delivery."] },
    ] },
  { id: "biz_food_poison", title: ["Customer falls ill", "Customer get sick"], ages: [18, 90], w: 0.8, rarity: 1, when: food,
    text: ["A customer posts that he got food poisoning after eating from you. The post is gaining traction.", "Customer post say food from your place give am stomach upset. The post dey spread."],
    choices: [
      { label: ["Apologise and cover his bills", "Apologise and pay his bill"], cost: 120_000, biz: { fame: -2, q: 2 }, fx: { r: 2 }, text: ["He deletes the post. Your reputation survives.", "E delete the post. Your name survive."] },
      { label: ["Deny everything", "Deny everything"], biz: { fame: -10 }, fx: { r: -3, s: 3 }, text: ["The comments get worse.", "Comments worse."] },
      { label: ["Invite him for a free meal and hygiene tour", "Invite am for free food and hygiene tour"], biz: { fame: 3, q: 3 }, text: ["He posts again: 'they handled it well'.", "E post again: 'dem handle am well'."] },
    ] },
  { id: "biz_fire", title: ["Fire at the shop", "Fire for shop"], ages: [18, 90], w: 0.5, rarity: 1, when: has,
    text: ["A spark from a generator and the shop catches fire. Neighbours form a bucket line.", "Spark from generator and shop catch fire. Neighbour form bucket line."],
    choices: [
      { label: ["Fight the fire with the neighbours", "Fight the fire with neighbours"], fx: { hp: -3, r: 3, s: 5 }, biz: { q: -6 }, text: ["Half the stock is saved.", "Half stock dey safe."] },
      { label: ["Call the fire service", "Call fire service"], fx: { m: -50_000, s: 4 }, biz: { q: -10 }, text: ["They arrive after the worst is over.", "Dem reach after the worst don pass."] },
      { label: ["Collect insurance (if you have it)", "Claim insurance (if you get)"], fx: { s: 3 }, biz: { q: -8 }, text: ["Months of paperwork and a smaller cheque.", "Months of paperwork and smaller cheque."] },
    ] },
  { id: "biz_robbery", title: ["Armed robbery", "Armed robbery"], ages: [18, 90], w: 0.4, rarity: 1, when: has,
    text: ["Armed men storm the shop at closing time. 'Lie down! Where is the money?'", "Armed men enter shop for closing time. 'Lie down! Where money dey?'"],
    choices: [
      { label: ["Hand over everything", "Give dem everything"], fx: { m: -300_000, s: 8, h: -4 }, text: ["They take the cash and your confidence.", "Dem carry cash and your confidence."] },
      { label: ["Play hero", "Play hero"], fx: { hp: -6, s: 6 }, text: ["A scuffle. Someone is hurt.", "Scuffle. Somebody get injury."], bad: { p: 0.4, fx: { hp: -8, m: -500_000 }, text: ["Worse than expected.", "E worse pass wetin you expect."] } },
      { label: ["Hide the cash earlier (smart)", "Hide cash earlier (sharp)"], fx: { m: -80_000, s: 5 }, text: ["They take only the till. Smart.", "Dem carry only till. Sharp."] },
    ] },
  { id: "biz_partner", title: ["Partner wants out", "Partner wan comot"], ages: [20, 90], w: 0.7, rarity: 1, when: has,
    text: ["Your friend-turned-partner wants his share out. 'I need the money for my wedding.'", "Your friend-turned-partner want him share comot. 'I need the money for my wedding.'"],
    choices: [
      { label: ["Buy him out", "Buy am out"], cost: 600_000, fx: { c: 1 }, text: ["You keep the business and the friendship (mostly).", "You keep business and friendship (mostly)."] },
      { label: ["Negotiate a payment plan", "Negotiate payment plan"], cost: 200_000, fx: { s: 2 }, text: ["He agrees to monthly payments.", "E agree for monthly payment."] },
      { label: ["Refuse and fight", "Refuse and fight"], fx: { s: 5, c: -2, r: -2 }, biz: { q: -3 }, text: ["Lawyers, letters and bad blood.", "Lawyer, letter and bad blood."] },
    ] },
  { id: "biz_pregnancy", title: ["Staff pregnancy", "Staff get belle"], ages: [20, 90], w: 0.8, rarity: 1, when: staffed,
    text: ["Your best sales girl is expecting. She asks about maternity leave.", "Your best sales girl dey expect. She ask about maternity leave."],
    choices: [
      { label: ["Give full leave", "Give full leave"], cost: 90_000, biz: { loyalty: 12, q: -2 }, fx: { r: 3 }, text: ["She returns three months later, loyal for life.", "She return three months later, loyal for life."] },
      { label: ["Give half leave", "Give half leave"], cost: 30_000, biz: { loyalty: 3 }, text: ["She is happy enough.", "She happy small."] },
      { label: ["Let her go", "Let her go"], fx: { r: -4, s: 2 }, biz: { loyalty: -8, loseStaff: true }, text: ["The rest of the staff are watching.", "The rest of staff dey watch."] },
    ] },
  { id: "biz_firs", title: ["Tax audit", "Tax audit"], ages: [20, 90], w: 0.8, rarity: 1, when: has,
    text: ["The tax office sends a letter: 'Your accounts for the last three years will be reviewed.'", "Tax office send letter: 'We go review your accounts for last three years.'"],
    choices: [
      { label: ["Hire an accountant", "Hire accountant"], cost: 180_000, fx: { r: 1, s: -1 }, text: ["Everything is sorted for a modest fee.", "Everything sorted for small fee."] },
      { label: ["Handle it yourself", "Handle am yourself"], fx: { s: 4 }, text: ["A week of stress and a small penalty.", "One week of stress and small penalty."], bad: { p: 0.5, fx: { m: -250_000 }, text: ["They find mistakes.", "Dem find mistake."] } },
      { label: ["Pay an 'arrangement'", "Pay 'arrangement'"], cost: 300_000, fx: { r: -2 }, text: ["The case disappears. Your conscience does not.", "Case vanish. Your conscience no vanish."] },
    ] },
  { id: "biz_pricewar", title: ["Price war", "Price war"], ages: [18, 90], w: 1, rarity: 1, when: has,
    text: ["A big competitor opens across the street and cuts prices in half.", "Big competitor open across street and cut price half."],
    choices: [
      { label: ["Match their prices", "Match their price"], fx: { m: -120_000 }, biz: { fame: 3 }, text: ["Margins drop, customers stay.", "Margin drop, customer stay."] },
      { label: ["Compete on quality", "Compete on quality"], cost: 150_000, biz: { q: 6, fame: 2 }, text: ["Loyal customers notice.", "Loyal customer notice."] },
      { label: ["Ignore them", "Ignore dem"], biz: { fame: -6 }, text: ["Customers drift away.", "Customer dey drift."] },
    ] },
  { id: "biz_tender", title: ["A tender comes up", "Tender show"], ages: [22, 90], w: 0.7, rarity: 1, when: (p) => p.businesses.some((b) => b.status === "open" && b.level >= 2),
    text: ["A government agency announces a supply tender your business could win. 'The process is competitive'.", "Government agency announce supply tender wey your business fit win. 'The process na competitive'."],
    choices: [
      { label: ["Bid honestly", "Bid honestly"], cost: 100_000, fx: { s: 2 }, biz: { fame: 4 }, text: ["You lose to a company owned by someone's cousin.", "You lose to company wey belong to somebody cousin."], bad: { p: 0.3, fx: { m: 1_200_000, r: 2 }, text: ["Actually, you win. First payment arrives in months.", "Actually, you win. First payment go enter after months."] } },
      { label: ["Use your connections", "Use your connection"], cost: 400_000, fx: { c: 1 }, text: ["You win, and then wait 8 months for payment.", "You win, then wait 8 months for payment."], bad: { p: 0.6, fx: { m: 1_800_000 }, text: ["Contract paid in full.", "Contract don pay full."] } },
      { label: ["Skip it", "Skip am"], text: ["Government tenders are a long road.", "Government tender na long road."] },
    ] },
  { id: "biz_viral_review", title: ["Customer review goes viral", "Customer review blow"], ages: [18, 90], w: 1, rarity: 1, when: (p) => has(p) && Boolean(p.possessions.smartphone),
    text: ["A blogger posts an honest review of your place. Thousands have seen it.", "Blogger post honest review of your place. Thousands don see am."],
    choices: [
      { label: ["Thank them and invite more people", "Thank dem and invite more people"], biz: { fame: 8 }, text: ["New customers are queueing.", "New customer dey queue."] },
      { label: ["Reply defensively", "Reply defensively"], fx: { r: -2 }, biz: { fame: -4 }, text: ["The thread turns into a fight.", "The thread turn fight."] },
      { label: ["Fix what they criticised", "Fix wetin dem criticise"], cost: 100_000, biz: { q: 5, fame: 4 }, text: ["Next review: five stars.", "Next review: five star."] },
    ] },
  { id: "biz_generator", title: ["Generator breakdown", "Generator break down"], ages: [18, 90], w: 1, rarity: 1, when: has,
    text: ["Your generator gives up at the worst moment. The mechanic says 'it is the engine'.", "Your generator give up for worst moment. Mechanic say 'na the engine'."],
    choices: [
      { label: ["Repair it", "Repair am"], cost: 120_000, text: ["Back in business, until the next time.", "Back for business, till next time."] },
      { label: ["Buy a new one", "Buy new one"], cost: 450_000, biz: { q: 2 }, text: ["Quieter and more efficient.", "Quieter and better."] },
      { label: ["Rent for the week", "Rent for one week"], cost: 40_000, fx: { s: 2 }, text: ["A temporary fix, a permanent headache.", "Temporary fix, permanent headache."] },
    ] },
  { id: "biz_expand_offer", title: ["The shop next door is available", "Shop next door don free"], ages: [20, 90], w: 0.8, rarity: 1, when: (p) => p.businesses.some((b) => b.status === "open" && b.level < 5),
    text: ["The shop beside yours is free. The landlord wants a year's rent upfront.", "The shop beside yours don free. Landlord want one year rent upfront."],
    choices: [
      { label: ["Take it and expand", "Take am and expand"], cost: 700_000, biz: { q: 6, fame: 5 }, text: ["More space, more customers, more worries.", "More space, more customer, more worry."] },
      { label: ["Negotiate a half-year", "Negotiate half year"], cost: 350_000, biz: { q: 3, fame: 2 }, text: ["He agrees. Not generous, not greedy.", "E agree. No generous, no greedy."] },
      { label: ["Pass", "Pass"], text: ["Someone else takes it by Monday.", "Another person take am by Monday."] },
    ] },
  { id: "biz_copycat", title: ["Your staff opens a rival", "Your staff open rival"], ages: [20, 90], w: 0.6, rarity: 1, when: staffed,
    text: ["A former staff member opens a shop with your recipe, your suppliers and half your customers.", "Your former staff open shop with your recipe, your supplier and half of your customer."],
    choices: [
      { label: ["Out-compete them", "Out-compete dem"], cost: 120_000, biz: { q: 4, fame: 3 }, text: ["Better service wins in the end.", "Better service go win for end."] },
      { label: ["Talk to him and offer partnership", "Talk to am and offer partnership"], fx: { c: 2 }, text: ["He declines politely.", "E decline politely."], bad: { p: 0.5, fx: { m: 200_000 }, text: ["Actually he agrees and brings new customers.", "E agree and bring new customer."] } },
      { label: ["Let it go", "Let am go"], biz: { fame: -4 }, text: ["Some customers follow him.", "Some customer follow am."] },
    ] },
  { id: "biz_training_offer", title: ["Training for your staff", "Training for your staff"], ages: [20, 90], w: 0.8, rarity: 1, when: staffed,
    text: ["A consultant offers a two-day customer-service workshop for your team.", "Consultant offer two-day customer-service workshop for your team."],
    choices: [
      { label: ["Book it", "Book am"], cost: 200_000, biz: { q: 4, loyalty: 6 }, text: ["The team comes back motivated.", "Team come back with energy."] },
      { label: ["Train them yourself", "Train dem yourself"], fx: { s: 2 }, biz: { q: 2, loyalty: 2 }, text: ["It takes a weekend but it works.", "E take weekend but e work."] },
      { label: ["Skip", "Skip"], text: ["No time for that.", "No time for that."] },
    ] },
  { id: "biz_festival_rush", title: ["Festive season rush", "Festive season rush"], ages: [18, 90], w: 1, rarity: 1, when: has,
    text: ["Christmas is two weeks away. Everyone wants everything yesterday.", "Christmas dey two weeks away. Everybody want everything yesterday."],
    choices: [
      { label: ["Stock up heavily", "Stock up well well"], cost: 400_000, biz: { fame: 4 }, fx: { m: 700_000 }, text: ["Everything sells. Your arms ache.", "Everything sell. Your hand dey pain."] },
      { label: ["Stock moderately", "Stock small"], cost: 150_000, fx: { m: 300_000 }, text: ["Steady sales, no regrets.", "Steady sales, no regret."] },
      { label: ["Take a holiday", "Go holiday"], fx: { h: 4, s: -3 }, biz: { fame: -3 }, text: ["Peace and quiet. The cash register notices.", "Peace and quiet. Cash register notice."] },
    ] },
  { id: "biz_bank_loan", title: ["Bank offers a business loan", "Bank offer business loan"], ages: [22, 90], w: 0.7, rarity: 1, when: (p) => p.businesses.some((b) => b.status === "open" && b.profit > 0),
    text: ["The bank manager calls: 'we have a business loan for you, 25% interest, small collateral.'", "Bank manager call: 'we get business loan for you, 25% interest, small collateral.'"],
    choices: [
      { label: ["Take it and invest", "Take am and invest"], fx: { m: 1_500_000, s: 3 }, biz: { q: 6, fame: 4 }, text: ["Growth is real, so is the repayment schedule.", "Growth real, repayment schedule real too."], bad: { p: 0.3, fx: { m: -600_000 }, text: ["Slow months make payments hard.", "Slow month make payment hard."] } },
      { label: ["Decline", "Decline"], text: ["Slow and steady.", "Slow and steady."] },
    ] },
  { id: "biz_union", title: ["Association dues", "Association dues"], ages: [18, 90], w: 0.9, rarity: 1, when: has,
    text: ["The traders' association says your 'dues' are three years behind. 'Pay, or your shop gets locked.'", "Traders association talk say your 'dues' don late three years. 'Pay, or dem go lock your shop.'"],
    choices: [
      { label: ["Pay the dues", "Pay the dues"], cost: 90_000, fx: { c: 2 }, text: ["Suddenly everyone is friendly.", "Suddenly everybody dey friendly."] },
      { label: ["Negotiate", "Negotiate"], cost: 40_000, text: ["They accept half.", "Dem accept half."] },
      { label: ["Refuse", "Refuse"], fx: { s: 4, c: -2 }, biz: { fame: -3 }, text: ["Locks, drama and a long day.", "Lock, drama and long day."] },
    ] },
];
