import type { Player } from "./types";
import type { Scn } from "./scenarios";

const kind = (...ids: string[]) => (p: Player) => p.businesses.some((b) => b.status === "open" && ids.includes(b.kind));
const crewOf = (...ids: string[]) => (p: Player) => p.businesses.some((b) => b.status === "open" && ids.includes(b.kind) && (b.crew?.length ?? 0) > 0);

/** Things that only happen to a particular kind of business. */
export const SCN_KIND: Scn[] = [
  // ---- POS ----
  { id: "pos_network", title: ["'Network don fail'", "'Network don fail'"], ages: [16, 90], w: 1.2, rarity: 1, when: kind("pos"),
    text: ["A queue of angry customers: the bank network is down and your transfers are hanging.", "Queue of vex customer: bank network don down and your transfer dey hang."],
    choices: [
      { label: ["Switch to another bank", "Use another bank"], biz: { fame: 2 }, text: ["Backup terminals save the day.", "Backup terminal save the day."] },
      { label: ["Ask customers to wait", "Beg customer make dem wait"], biz: { fame: -3 }, fx: { s: 3 }, text: ["Half of them walk to the next POS.", "Half of dem waka go next POS."] },
      { label: ["Buy a better SIM and router", "Buy better SIM and router"], cost: 60_000, biz: { q: 4, fame: 2 }, text: ["Fewer failures from now on.", "Fewer failure from now."] },
    ] },
  { id: "pos_fake_alert", title: ["Customer 'sent' the money", "Customer 'send' the money"], ages: [16, 90], w: 1, rarity: 1, when: kind("pos"),
    text: ["A man shows a transfer receipt and asks for ₦150,000 cash. Your account has not received anything.", "Man show transfer receipt and ask for ₦150,000 cash. Your account never receive anything."],
    choices: [
      { label: ["Wait for the alert", "Wait for alert"], fx: { s: 2 }, text: ["He leaves angrily. No alert ever came.", "E comot vex. Alert no come at all."] },
      { label: ["Give the cash", "Give the cash"], fx: { m: -150_000, h: -3 }, text: ["It was a fake receipt.", "Na fake receipt."] },
      { label: ["Call his bank", "Call him bank"], fx: { s: 1, c: 1 }, text: ["The bank confirms it was reversed.", "Bank confirm say dem reverse am."] },
    ] },
  { id: "pos_robbery", title: ["Float robbery", "Float robbery"], ages: [16, 90], w: 0.5, rarity: 1, when: kind("pos"),
    text: ["Two men on a bike snatch your cash box at closing time.", "Two men for bike snatch your cash box for closing time."],
    choices: [
      { label: ["Chase them", "Chase dem"], fx: { hp: -4, s: 5 }, text: ["They get away; you get a scraped knee.", "Dem escape; you get scratch knee."], bad: { p: 0.3, fx: { m: -80_000 }, text: ["Plus a hospital bill.", "Plus hospital bill."] } },
      { label: ["Report to the police", "Report to police"], fx: { m: -250_000, s: 3 }, text: ["They take a report and ask for 'airtime'.", "Dem take report and ask for 'airtime'."] },
      { label: ["Hire a security guard", "Hire security guard"], cost: 120_000, fx: { m: -250_000 }, biz: { q: 2 }, text: ["Loss accepted. A guard now stands at the door.", "Loss accepted. Guard now stand for door."] },
    ] },
  { id: "pos_limit", title: ["CBN limit", "CBN limit"], ages: [16, 90], w: 0.7, rarity: 1, when: kind("pos", "fintech"),
    text: ["New rules cap daily cash withdrawals and agents must register. Customers complain about the new limits.", "New rule cap daily withdrawal and agent must register. Customer dey complain about limit."],
    choices: [
      { label: ["Register as a super-agent", "Register as super-agent"], cost: 150_000, biz: { fame: 4, q: 2 }, text: ["Paperwork done. You are official.", "Paperwork done. You don official."] },
      { label: ["Carry on quietly", "Continue quietly"], fx: { s: 2 }, text: ["For now nobody checks.", "For now nobody dey check."], bad: { p: 0.4, fx: { m: -120_000, r: -2 }, text: ["A surprise inspection fines you.", "Surprise inspection fine you."] } },
      { label: ["Pass the charges to customers", "Pass the charge to customer"], biz: { fame: -4 }, fx: { m: 60_000 }, text: ["Extra income, extra anger.", "Extra income, extra vex."] },
    ] },
  // ---- Salon, barber, spa ----
  { id: "salon_nail_request", title: ["'Do you do nails?'", "'You dey do nails?'"], ages: [16, 90], w: 1.1, rarity: 1, when: kind("barbing", "salon", "spa", "makeupstudio"),
    text: ["Three customers in one week ask for nails, lashes or a service you do not offer. You are losing them to the salon down the road.", "Three customer for one week ask for nails, lashes or service wey you no dey do. You dey lose dem to salon down the road."],
    choices: [
      { label: ["Hire a nail tech and add it", "Hire nail tech and add am"], cost: 130_000, biz: { fame: 3, q: 2 }, text: ["New service, new customers.", "New service, new customer."] },
      { label: ["Refer them to a friend's shop", "Refer dem to friend shop"], fx: { c: 2 }, text: ["She sends customers back your way.", "She dey send customer back to you."] },
      { label: ["Ignore it", "Ignore am"], biz: { fame: -3 }, text: ["Customers keep asking.", "Customer dey ask."] },
    ] },
  { id: "salon_poach", title: ["Your best stylist is poached", "Dem poach your best stylist"], ages: [16, 90], w: 0.9, rarity: 1, when: crewOf("barbing", "salon", "spa", "makeupstudio"),
    text: ["A rival shop offers your top stylist double pay. Half your regulars follow her.", "Rival shop offer your top stylist double pay. Half of your regulars dey follow her."],
    choices: [
      { label: ["Match the offer", "Match the offer"], cost: 100_000, biz: { loyalty: 6 }, text: ["She stays, and everyone else asks for a raise.", "She stay, and everybody else ask for raise."] },
      { label: ["Let her go", "Let her go"], biz: { fame: -4, loseStaff: true }, text: ["You lose her and some customers.", "You lose her and some customer."] },
      { label: ["Offer a share of profit", "Offer share of profit"], biz: { loyalty: 12, fame: 1 }, fx: { m: -60_000 }, text: ["She stays as a partner.", "She stay as partner."] },
    ] },
  { id: "salon_reaction", title: ["Allergic reaction", "Allergic reaction"], ages: [16, 90], w: 0.7, rarity: 1, when: kind("barbing", "salon", "spa", "makeupstudio"),
    text: ["A customer has a reaction to a chemical product and her face swells. Her sister is recording a video.", "Customer get reaction from chemical product and her face swell. Her sister dey record video."],
    choices: [
      { label: ["Pay her hospital bill", "Pay her hospital bill"], cost: 90_000, biz: { fame: 1 }, fx: { r: 2 }, text: ["She recovers and tells the world you were kind.", "She recover and tell the world say you kind."] },
      { label: ["Deny responsibility", "Deny responsibility"], biz: { fame: -8 }, fx: { r: -3, s: 3 }, text: ["The video goes viral.", "The video blow."] },
      { label: ["Switch to safer products", "Switch to safer product"], cost: 140_000, biz: { q: 5 }, text: ["Expensive but safe.", "E cost but e safe."] },
    ] },
  // ---- Hotels ----
  { id: "hotel_vip", title: ["A VIP checks in", "VIP check in"], ages: [18, 90], w: 1, rarity: 1, when: kind("hotel"),
    text: ["A senator's convoy arrives unannounced and wants your best rooms immediately. 'Money is not the issue.'", "Senator convoy land unannounced and want your best room now. 'Money no be issue.'"],
    choices: [
      { label: ["Give them everything", "Give dem everything"], biz: { fame: 6, loyalty: -4 }, fx: { m: 400_000, s: 3 }, text: ["Big money, small chaos.", "Big money, small chaos."], bad: { p: 0.35, fx: { m: -300_000 }, text: ["They leave without paying.", "Dem comot without paying."] } },
      { label: ["Insist on booking and a deposit", "Insist on booking and deposit"], biz: { fame: 2 }, fx: { m: 250_000 }, text: ["Awkward, but they pay in advance.", "Awkward, but dem pay before."] },
      { label: ["Say you are full", "Talk say you don full"], fx: { s: -1 }, text: ["Safe, and a little boring.", "Safe, small boring."] },
    ] },
  { id: "hotel_review", title: ["One-star review", "One-star review"], ages: [18, 90], w: 1, rarity: 1, when: kind("hotel", "eventcentre"),
    text: ["A guest posts: 'Cockroach in the room, no water, rude staff.' It is getting shares.", "Guest post: 'Cockroach for room, no water, rude staff.' E dey get shares."],
    choices: [
      { label: ["Apologise and refund", "Apologise and refund"], cost: 60_000, biz: { fame: 2, q: 2 }, text: ["The review is updated to four stars.", "Review update to four stars."] },
      { label: ["Reply with 'facts'", "Reply with 'facts'"], biz: { fame: -5 }, fx: { r: -2 }, text: ["The comments get worse.", "Comments worse."] },
      { label: ["Fumigate and retrain staff", "Fumigate and retrain staff"], cost: 180_000, biz: { q: 6, loyalty: 3 }, text: ["Real fix, not just PR.", "Real fix, no be just PR."] },
    ] },
  { id: "hotel_water", title: ["No water on a full night", "No water for full night"], ages: [18, 90], w: 0.8, rarity: 1, when: kind("hotel", "eventcentre", "lounge"),
    text: ["The borehole pump packs up on a night when all rooms are full. Guests queue at reception with empty buckets.", "Borehole pump pack up for night wey all room full. Guest queue for reception with empty bucket."],
    choices: [
      { label: ["Buy tanker water immediately", "Buy tanker water now"], cost: 70_000, text: ["Crisis managed.", "Crisis manage."] },
      { label: ["Offer discounts", "Offer discount"], fx: { m: -50_000 }, biz: { fame: -1 }, text: ["Most guests accept.", "Most guest accept."] },
      { label: ["Drill a new borehole", "Drill new borehole"], cost: 600_000, biz: { q: 5 }, text: ["Never again.", "Never again."] },
    ] },
  // ---- Food ----
  { id: "food_tomato", title: ["Tomato scarcity", "Tomato scarcity"], ages: [14, 90], w: 1.2, rarity: 1, when: kind("akara", "mama_foods", "bukka", "restaurant", "lounge", "beerparlour", "bakery"),
    text: ["Tomato and pepper prices triple overnight. Your stew costs more to make than to sell.", "Tomato and pepper price triple overnight. Your stew cost more to make than to sell."],
    choices: [
      { label: ["Raise prices", "Raise price"], biz: { fame: -3 }, fx: { m: 30_000 }, text: ["Customers grumble but most stay.", "Customer grumble but most stay."] },
      { label: ["Cut portions quietly", "Reduce portion quietly"], biz: { q: -4, fame: -2 }, fx: { m: 40_000 }, text: ["Someone notices and posts about it.", "Somebody notice and post am."] },
      { label: ["Absorb the cost", "Absorb the cost"], fx: { m: -90_000 }, biz: { fame: 3 }, text: ["Your regulars love you for it.", "Your regulars love you for am."] },
    ] },
  { id: "food_big_order", title: ["A big catering order", "Big catering order"], ages: [14, 90], w: 1, rarity: 1, when: kind("akara", "mama_foods", "bukka", "restaurant", "bakery"),
    text: ["Someone is burying her father and wants food for 500 guests in three days.", "Somebody dey bury her papa and want food for 500 guest in three days."],
    choices: [
      { label: ["Take it and hire helpers", "Take am and hire helper"], cost: 150_000, fx: { m: 450_000, s: 5 }, biz: { fame: 4 }, text: ["Long nights and big pots, and a huge payout.", "Long night and big pot, and huge payment."], bad: { p: 0.3, fx: { m: -120_000, r: -2 }, text: ["You run out of food at 3pm.", "Food finish by 3pm."] } },
      { label: ["Take half the order", "Take half the order"], fx: { m: 220_000, s: 2 }, text: ["Comfortable and profitable.", "Comfortable and profitable."] },
      { label: ["Decline", "Decline"], text: ["You keep your regulars happy.", "You keep your regulars happy."] },
    ] },
  // ---- Retail ----
  { id: "retail_fake_goods", title: ["Fake goods in the shop", "Fake goods for shop"], ages: [16, 90], w: 1, rarity: 1, when: kind("phoneshop", "provisions", "supermarket", "autospares", "pharmacy", "ecommerce", "bookshop"),
    text: ["A customer returns a product and says it is fake. Your supplier swears it is original.", "Customer return product and talk say e fake. Your supplier swear say e original."],
    choices: [
      { label: ["Refund and drop the supplier", "Refund and drop supplier"], cost: 80_000, biz: { q: 4, fame: 2 }, text: ["Your shop's name is safe.", "Your shop name safe."] },
      { label: ["Refuse the refund", "Refuse the refund"], biz: { fame: -5 }, fx: { r: -2 }, text: ["Word spreads.", "Word waka."] },
      { label: ["Replace it quietly", "Replace am quietly"], cost: 40_000, text: ["Crisis over, lesson learnt.", "Crisis don end, lesson learnt."] },
    ] },
  { id: "retail_pharmacy_nafdac", title: ["Pharmacy raid", "Pharmacy raid"], ages: [20, 90], w: 1, rarity: 1, when: kind("pharmacy"),
    text: ["The pharmacists' council visits. Your pharmacist's licence is up for renewal and one shelf has drugs without a batch number.", "Pharmacists council visit. Your pharmacist licence need renewal and one shelf get drug without batch number."],
    choices: [
      { label: ["Pay for the licence and clear the shelf", "Pay for licence and clear shelf"], cost: 200_000, biz: { q: 4 }, text: ["Clean record. They leave.", "Clean record. Dem comot."] },
      { label: ["'Settle' the officers", "'Settle' the officers"], cost: 80_000, fx: { r: -3 }, text: ["They overlook it, this time.", "Dem overlook am, this time."], bad: { p: 0.3, fx: { m: -250_000 }, text: ["They come back with friends.", "Dem come back with friends."] } },
      { label: ["Argue", "Argue"], fx: { s: 4 }, biz: { fame: -3 }, text: ["Your shop is sealed for two weeks.", "Dem seal your shop two weeks."] },
    ] },
  { id: "retail_cars_lemon", title: ["The car you bought is a lemon", "The car you buy na lemon"], ages: [22, 90], w: 1, rarity: 1, when: kind("cardealer", "autospares"),
    text: ["A container arrives. Two of the 'clean' cars have flood damage the seller didn't mention.", "Container land. Two of the 'clean' car get flood damage wey seller no talk."],
    choices: [
      { label: ["Sell them cheap, with honesty", "Sell dem cheap, honestly"], fx: { m: -250_000, r: 2 }, biz: { fame: 2 }, text: ["Lower profit, higher trust.", "Lower profit, higher trust."] },
      { label: ["Hide it and sell", "Hide am and sell"], fx: { m: 200_000 }, biz: { fame: -6 }, text: ["Quick cash, and a vengeful buyer.", "Quick cash, and vex buyer."], bad: { p: 0.5, fx: { m: -400_000, r: -4 }, text: ["The buyer sues.", "Buyer sue you."] } },
      { label: ["Repair and resell", "Repair and resell"], cost: 300_000, fx: { m: 520_000 }, text: ["Margin saved after a lot of work.", "Margin save after plenty work."] },
    ] },
  // ---- Farms ----
  { id: "farm_flood", title: ["Flood on the farm", "Flood for farm"], ages: [18, 90], w: 0.9, rarity: 1, when: kind("farm", "poultry", "fishfarm"),
    text: ["Heavy rain washes across the farm. Part of the crop, feed store or pond walls give way.", "Heavy rain waka cross farm. Part of crop, feed store or pond wall give way."],
    choices: [
      { label: ["Repair immediately", "Repair now"], cost: 250_000, biz: { q: 3 }, text: ["Costly but contained.", "E cost but e contain."] },
      { label: ["Salvage what you can and wait", "Save wetin you fit and wait"], fx: { m: -150_000, s: 4 }, biz: { q: -5 }, text: ["A long clean-up.", "Long clean-up."] },
      { label: ["Claim insurance", "Claim insurance"], fx: { m: 80_000, s: 3 }, text: ["A fraction of the loss, after weeks.", "Fraction of the loss, after weeks."] },
    ] },
  { id: "farm_disease", title: ["Disease outbreak", "Disease outbreak"], ages: [18, 90], w: 0.9, rarity: 1, when: kind("poultry", "fishfarm", "farm"),
    text: ["Birds are dying in the morning or the fish are floating. Your attendant says 'oga, it is serious'.", "Bird dey die for morning or fish dey float. Attendant talk say 'oga, e serious'."],
    choices: [
      { label: ["Call a vet at once", "Call vet sharp sharp"], cost: 180_000, biz: { q: 2 }, text: ["Treatment saves most of the stock.", "Treatment save most of the stock."] },
      { label: ["Try local remedies", "Try local remedy"], cost: 20_000, fx: { m: -250_000 }, biz: { q: -6 }, text: ["Half the stock is lost.", "Half stock don loss."] },
      { label: ["Cull and restart", "Cull and restart"], fx: { m: -500_000, s: 6 }, text: ["A painful, clean slate.", "Painful, clean slate."] },
    ] },
  { id: "farm_harvest", title: ["Bumper harvest", "Bumper harvest"], ages: [18, 90], w: 0.9, rarity: 1, when: kind("farm", "ricemill", "palmoil", "cassava"),
    text: ["The weather behaved. Your yields are far above expectations, and so is everyone else's. Prices are about to fall.", "Weather behave. Your yield pass expectation, and everybody own too. Price go fall soon."],
    choices: [
      { label: ["Sell it all immediately", "Sell am all now"], fx: { m: 300_000 }, text: ["Quick cash, lower price.", "Quick cash, lower price."] },
      { label: ["Store and wait for better prices", "Store am and wait for better price"], cost: 80_000, fx: { m: 600_000 }, text: ["Patience pays.", "Patience pay."], bad: { p: 0.35, fx: { m: -250_000 }, text: ["The store floods and some goes bad.", "Store flood and some spoil."] } },
      { label: ["Process into higher-value goods", "Process am to higher-value goods"], cost: 150_000, fx: { m: 520_000 }, biz: { fame: 3 }, text: ["More work, more margin.", "More work, more margin."] },
    ] },
  // ---- Fleets ----
  { id: "fleet_accident", title: ["Accident on the road", "Accident for road"], ages: [18, 90], w: 1, rarity: 1, when: kind("logistics", "keke_fleet", "rentcar"),
    text: ["One of your vehicles hits a pedestrian. Police, a crowd and the driver's panicked phone call.", "One of your vehicle hit pedestrian. Police, crowd and driver panic call."],
    choices: [
      { label: ["Go to the scene and take care of it", "Go scene and handle am"], cost: 250_000, fx: { r: 2, s: 5 }, text: ["Hospital bills paid, case settled.", "Hospital bill pay, case settle."] },
      { label: ["Let the driver handle it", "Let driver handle am"], fx: { m: -400_000, r: -3 }, text: ["It escalates.", "E escalate."] },
      { label: ["Use your insurance", "Use your insurance"], fx: { m: -60_000, s: 3 }, text: ["It works, slowly.", "E work, slowly."] },
    ] },
  { id: "fleet_cheat", title: ["Drivers dodge remittance", "Drivers dey dodge remittance"], ages: [18, 90], w: 1, rarity: 1, when: crewOf("logistics", "keke_fleet", "rentcar"),
    text: ["Daily remittance is down twenty percent. A driver has been running 'private trips'.", "Daily remittance don drop twenty percent. Driver dey do 'private trip'."],
    choices: [
      { label: ["Install trackers", "Install tracker"], cost: 160_000, biz: { q: 3 }, text: ["Cheating drops overnight.", "Cheating drop overnight."] },
      { label: ["Sack the culprit", "Sack the culprit"], fx: { s: 3 }, biz: { loseStaff: true, loyalty: -4 }, text: ["Others get the message.", "Others get message."] },
      { label: ["Talk to everybody", "Talk to everybody"], biz: { loyalty: 4 }, text: ["It improves, a bit.", "E improve small."] },
    ] },
  // ---- Schools, clinics, gyms ----
  { id: "school_pta", title: ["PTA meeting", "PTA meeting"], ages: [20, 90], w: 1, rarity: 1, when: kind("school", "college"),
    text: ["Parents storm the PTA meeting: 'results are poor and fees are too high'.", "Parent storm PTA meeting: 'result poor and fee too high'."],
    choices: [
      { label: ["Improve teaching and hold fees", "Improve teaching and hold fee"], cost: 200_000, biz: { q: 5, fame: 3 }, text: ["Results improve next term.", "Result improve next term."] },
      { label: ["Cut fees a little", "Reduce fee small"], fx: { m: -150_000 }, biz: { fame: 4 }, text: ["Parents calm down.", "Parent calm down."] },
      { label: ["Defend your policy", "Defend your policy"], fx: { s: 4 }, biz: { fame: -4 }, text: ["Several parents withdraw their children.", "Many parent withdraw their pikin."] },
    ] },
  { id: "clinic_outbreak", title: ["Outbreak in town", "Outbreak for town"], ages: [22, 90], w: 0.9, rarity: 1, when: kind("clinic", "pharmacy"),
    text: ["Cholera cases surge. Your clinic is packed, and supplies are running low.", "Cholera case surge. Your clinic full and supply dey finish."],
    choices: [
      { label: ["Buy supplies at any price", "Buy supply at any price"], cost: 400_000, fx: { m: 900_000, r: 4 }, biz: { fame: 6 }, text: ["You help hundreds. The community thanks you.", "You help hundreds. Community thank you."] },
      { label: ["Triage and refer", "Triage and refer"], fx: { m: 200_000 }, biz: { fame: 2 }, text: ["Responsible, if unglamorous.", "Responsible, if no too glamorous."] },
      { label: ["Close early to protect staff", "Close early to protect staff"], biz: { fame: -5, loyalty: 6 }, text: ["Your staff are grateful. The town is not.", "Staff grateful. Town no."] },
    ] },
  { id: "gym_january", title: ["January rush", "January rush"], ages: [18, 90], w: 1, rarity: 1, when: kind("gym", "spa"),
    text: ["New Year resolutions fill the gym. By March, half of them will not be back.", "New Year resolution fill gym. By March, half no go return."],
    choices: [
      { label: ["Sell annual memberships", "Sell annual membership"], fx: { m: 500_000 }, text: ["Cash up front; empty machines later.", "Cash upfront; empty machine later."] },
      { label: ["Run a 30-day challenge", "Run 30-day challenge"], cost: 60_000, biz: { fame: 5, q: 2 }, fx: { m: 300_000 }, text: ["Customers stay longer.", "Customer stay longer."] },
      { label: ["Do nothing special", "Do nothing special"], text: ["Business as usual.", "Business as usual."] },
    ] },
  // ---- Tech, finance, media ----
  { id: "tech_investor", title: ["An investor calls", "Investor call"], ages: [20, 90], w: 0.9, rarity: 1, when: kind("techstart", "fintech", "ecommerce"),
    text: ["A venture fund offers ₦25m for 20% of your company, with a catch: they want a board seat.", "Venture fund offer ₦25m for 20% of your company, with catch: dem want board seat."],
    choices: [
      { label: ["Take the money", "Take the money"], fx: { m: 25_000_000, s: 4 }, biz: { q: 6, fame: 5 }, text: ["Now you answer to a board.", "Now you dey answer to board."] },
      { label: ["Negotiate for 10%", "Negotiate for 10%"], fx: { m: 12_000_000, s: 3 }, biz: { q: 4, fame: 3 }, text: ["Smaller cheque, bigger share for you.", "Smaller cheque, bigger share for you."] },
      { label: ["Stay independent", "Stay independent"], fx: { s: -1 }, text: ["Your company, your rules.", "Your company, your rules."] },
    ] },
  { id: "tech_outage", title: ["System outage", "System outage"], ages: [20, 90], w: 1, rarity: 1, when: kind("techstart", "fintech", "ecommerce", "cybercafe", "radio"),
    text: ["Your server goes down on the busiest day of the month. Customers are tweeting.", "Your server go down for busiest day of month. Customer dey tweet."],
    choices: [
      { label: ["Fix it with an expert", "Fix am with expert"], cost: 180_000, biz: { q: 3 }, text: ["Back in four hours.", "Back after four hours."] },
      { label: ["Fix it yourself overnight", "Fix am yourself overnight"], fx: { s: 6, sm: 1 }, text: ["You do it. Coffee and anger.", "You do am. Coffee and anger."], bad: { p: 0.4, fx: { m: -100_000 }, biz: { fame: -3 }, text: ["It takes two days.", "E take two days."] } },
      { label: ["Apologise and offer credits", "Apologise and offer credit"], fx: { m: -120_000 }, biz: { fame: 2 }, text: ["Customers are forgiving.", "Customer dey forgive."] },
    ] },
  { id: "label_hit", title: ["A song blows up", "Song blow"], ages: [18, 90], w: 1, rarity: 1, when: kind("recordlabel", "radio", "filmhouse"),
    text: ["One of your tracks takes off on TikTok. Everybody wants a share.", "One of your track blow for TikTok. Everybody want share."],
    choices: [
      { label: ["Push it hard with ads and radio", "Push am with ads and radio"], cost: 400_000, fx: { m: 1_200_000 }, biz: { fame: 10 }, text: ["Chart position and a payday.", "Chart position and payday."] },
      { label: ["Ride the wave quietly", "Ride the wave quietly"], fx: { m: 400_000 }, biz: { fame: 4 }, text: ["Nice royalties.", "Nice royalty."] },
      { label: ["Renegotiate with the artist", "Renegotiate with artist"], fx: { m: 700_000, r: -2 }, biz: { loyalty: -10 }, text: ["More money for you, bad blood with them.", "More money for you, bad blood with am."] },
    ] },
  { id: "realty_scam", title: ["Land scam attempt", "Land scam attempt"], ages: [20, 90], w: 1, rarity: 1, when: kind("realestate", "buildmat"),
    text: ["A client brings land documents to sell. Something about the survey plan looks wrong.", "Client bring land document to sell. Something for survey plan no look correct."],
    choices: [
      { label: ["Verify at the land registry", "Verify for land registry"], cost: 50_000, biz: { q: 3 }, fx: { r: 2 }, text: ["Fake. You saved yourself a lawsuit.", "Fake. You save yourself lawsuit."] },
      { label: ["Sell it anyway", "Sell am anyway"], fx: { m: 600_000 }, biz: { fame: -4 }, text: ["Quick commission.", "Quick commission."], bad: { p: 0.45, fx: { m: -900_000, r: -5 }, text: ["The real owner appears.", "Real owner show."] } },
      { label: ["Refuse and report", "Refuse and report"], fx: { r: 3, s: 2 }, text: ["Your integrity is noted.", "Your integrity noted."] },
    ] },
  { id: "fuel_queue", title: ["Fuel scarcity queue", "Fuel scarcity queue"], ages: [20, 90], w: 1, rarity: 1, when: kind("fuelstation", "gasplant"),
    text: ["Supply is tight and cars queue for a kilometre outside your station. Some drivers offer you extra to jump the line.", "Supply tight and car queue one kilometre for your station. Some driver offer you extra to jump line."],
    choices: [
      { label: ["Serve in order", "Serve in order"], biz: { fame: 4 }, fx: { r: 2 }, text: ["Slow, fair, trusted.", "Slow, fair, trusted."] },
      { label: ["Take the extra money", "Take extra money"], fx: { m: 250_000 }, biz: { fame: -4 }, text: ["Profit, but queue jumpers cause fights.", "Profit, but queue-jumper cause fight."] },
      { label: ["Ration to each car", "Ration per car"], biz: { fame: 1 }, text: ["Everyone complains equally.", "Everybody complain equally."] },
    ] },
];
