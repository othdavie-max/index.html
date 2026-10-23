/**
 * How each kind of business is actually run. A profile lists the decisions the owner makes (levers),
 * the people the business needs (roles) and the one-off things the owner can do (actions).
 * Every option's numbers are relative to 1, so the middle choice is normal and the others trade one thing for another.
 */
export type L = [string, string];

export interface LeverOpt {
  label: L;
  note?: L;
  /** Sales multiplier. */
  rev?: number;
  /** Stock, ingredients or float cost multiplier. */
  cost?: number;
  /** Extra overheads as a share of sales (rent, power, licences, security). */
  over?: number;
  /** Rent multiplier (applied every January). */
  rent?: number;
  /** Monthly drift added to fame and quality. */
  fame?: number;
  q?: number;
  /** Multiplier on theft, robbery and fraud. */
  risk?: number;
  /** Price multiplier (food, shops): volume falls as it rises. */
  pm?: number;
  /** Advertising level 0-3: costs money, lifts sales and fame. */
  ads?: number;
  /** One-off fee, as a share of the start cost, for switching to this option. */
  fee?: number;
}
export interface Lever { id: string; label: L; blurb: L; def: number; opts: LeverOpt[] }

export interface Role {
  id: string;
  label: L;
  blurb: L;
  /** Pay multiplier on the business's base wage. */
  wage: number;
  /** How much each good worker in this role lifts sales. */
  weight: number;
  /** Useful workers per business level. */
  per: number;
  /** The business is worse without at least one (once it has more than a stall's size). */
  need?: boolean;
}

export interface BizAct {
  id: string;
  label: L;
  blurb: L;
  /** Cost as a multiple of the business's start cost. */
  cost: number;
  /** Quality, fame and loyalty bumps. */
  q?: number;
  fame?: number;
  loyalty?: number;
  /** Extra staff slots or similar permanent boost to sales. */
  rev?: number;
  /** A chance of paying back a lump sum (share of the cost). */
  gamble?: { p: number; back: number };
  /** Once per year. */
  once?: boolean;
  minLevel?: number;
}

export interface Profile {
  /** One sentence describing what running this involves. */
  intro: L;
  levers: Lever[];
  roles: Role[];
  /** Roles hired at the start, when the owner can afford it. */
  start: string[];
  /** What the five levels are called. */
  levels: [L, L, L, L, L];
  actions: BizAct[];
  /** Name for the thing that grows (rooms, terminals, chairs, ponds). */
  unit?: L;
}

const o = (en: string, pcm: string, fx: Omit<LeverOpt, "label"> = {}): LeverOpt => ({ label: [en, pcm], ...fx });
const lev = (id: string, en: string, pcm: string, bEn: string, bPcm: string, opts: LeverOpt[], def = 1): Lever => ({ id, label: [en, pcm], blurb: [bEn, bPcm], opts, def });
const role = (id: string, en: string, pcm: string, bEn: string, bPcm: string, wage: number, weight: number, per: number, need = false): Role => ({ id, label: [en, pcm], blurb: [bEn, bPcm], wage, weight, per, need });
const act = (id: string, en: string, pcm: string, bEn: string, bPcm: string, cost: number, fx: Partial<BizAct> = {}): BizAct => ({ id, label: [en, pcm], blurb: [bEn, bPcm], cost, ...fx });
const lv = (...n: [string, string][]): [L, L, L, L, L] => n as unknown as [L, L, L, L, L];

// ---------------------------------------------------------------------------
// Shared levers
// ---------------------------------------------------------------------------
const LOCATION = (bEn = "Where you set up decides who walks past.", bPcm = "Where you set up go decide who dey pass."): Lever => lev("location", "Location", "Location", bEn, bPcm, [
  o("Backstreet", "Inside street", { rev: 0.75, rent: 0.55, fee: 0.02 }),
  o("Main road", "Main road", {}),
  o("Market or town centre", "Market or town centre", { rev: 1.22, rent: 1.5, risk: 1.15, fee: 0.04 }),
  o("Prime address", "Prime address", { rev: 1.45, rent: 2.6, fee: 0.08 }),
]);
const PRICE = (labels: [string, string, string] = ["Cheap", "Fair", "Premium"]): Lever => lev("price", "Prices", "Prices", "Cheap pulls volume, premium needs quality to back it up.", "Cheap dey bring crowd, premium need quality to back am.", [
  o(labels[0], labels[0], { pm: 0.8 }), o(labels[1], labels[1], { pm: 1 }), o(labels[2], labels[2], { pm: 1.25 }),
]);
const ADS = (): Lever => lev("ads", "Advertising", "Advertising", "Billboards, radio jingles and social media.", "Billboard, radio jingle and social media.", [
  o("None", "None", { ads: 0 }), o("Small", "Small", { ads: 1 }), o("Medium", "Medium", { ads: 2 }), o("Heavy", "Heavy", { ads: 3 }),
], 0);
const STOCKQ = (what = "stock"): Lever => lev("stock", `Quality of ${what}`, `Quality of ${what}`, "Cheap inputs save money and cost you reputation.", "Cheap input save money but e dey cost your name.", [
  o("Cheap", "Cheap", { cost: 0.78, q: -0.35 }), o("Standard", "Standard", {}), o("Premium", "Premium", { cost: 1.3, q: 0.35 }),
]);
const POWER = (): Lever => lev("power", "Power supply", "Light", "NEPA, a generator or solar. Every business argues with the grid.", "NEPA, generator or solar. Every business dey argue with the grid.", [
  o("NEPA and prayer", "NEPA and prayer", { over: -0.02, risk: 1.1 }), o("Generator", "Generator", { over: 0.02 }), o("Solar and inverter", "Solar and inverter", { over: 0.035, q: 0.1, fame: 0.1 }),
], 1);
const SECURITY = (): Lever => lev("security", "Security", "Security", "Locks, guards and CCTV. Thieves choose soft targets.", "Lock, guard and CCTV. Thief dey choose soft target.", [
  o("Padlock and faith", "Padlock and faith", { risk: 1.5 }), o("A guard", "One guard", { over: 0.012, risk: 0.8 }), o("Guards and CCTV", "Guards and CCTV", { over: 0.03, risk: 0.45, fame: 0.1 }),
]);

const CLEANER = role("cleaner", "Cleaner", "Cleaner", "Keeps the place clean. Customers notice.", "Dey keep place clean. Customer dey notice.", 0.7, 0.03, 1);
const GUARD = role("guard", "Security guard", "Security guard", "Reduces theft and robbery.", "E dey reduce thief and robbery.", 0.8, 0.0, 1);
const MANAGER_NOTE: L = ["You are the owner. Hire a manager if you want to step away.", "You be owner. Hire manager if you wan step back."];
void MANAGER_NOTE;

// ---------------------------------------------------------------------------
// Archetypes
// ---------------------------------------------------------------------------
const generic = (): Profile => ({
  intro: ["Set your prices, advertising and stock, hire staff and watch the monthly report.", "Set price, advert and stock, hire staff and watch the monthly report."],
  levers: [LOCATION(), PRICE(), ADS(), STOCKQ()],
  roles: [role("staff", "Staff", "Staff", "General workers.", "General worker.", 1, 0.1, 4)],
  start: ["staff"],
  levels: lv(["Starter", "Starter"], ["Established", "Established"], ["Growing", "Growing"], ["Big", "Big"], ["Flagship", "Flagship"]),
  actions: [act("refit", "Refit and repaint", "Refit and repaint", "A fresh look brings customers.", "Fresh look dey bring customer.", 0.08, { q: 6, fame: 3, once: true })],
});

function posProfile(): Profile {
  return {
    intro: ["Rates are fixed, so you win on location, float, bank coverage and honest cash handling.", "Rate fixed, so you win by location, float, bank coverage and how you handle cash."],
    levers: [
      lev("location", "Spot", "Spot", "Footfall is everything: markets, motor parks and campuses win.", "Footfall na everything: market, motor park and campus dey win.", [
        o("Residential street", "Residential street", { rev: 0.7, rent: 0.5, risk: 0.8 }), o("Market stall", "Market stall", { rev: 1.1, rent: 1, risk: 1.1 }), o("Motor park or campus", "Motor park or campus", { rev: 1.4, rent: 1.6, risk: 1.4 }), o("Beside a bank branch", "Beside bank branch", { rev: 1.6, rent: 2.4, risk: 1.2 }),
      ], 1),
      lev("float", "Float (cash on hand)", "Float (cash for hand)", "A big float serves big withdrawals but is a robber's dream and ties up money.", "Big float fit serve big withdrawal but na robber dream and e tie your money.", [
        o("Small float", "Small float", { rev: 0.65, cost: 0.5, risk: 0.6 }), o("Medium float", "Medium float", {}), o("Large float", "Large float", { rev: 1.35, cost: 1.5, risk: 1.7, over: 0.01 }),
      ], 1),
      lev("banks", "Banks and networks", "Banks and networks", "More banks means fewer 'network don fail' moments.", "More bank mean small 'network don fail'.", [
        o("One bank", "One bank", { rev: 0.8, q: -0.2 }), o("Three banks", "Three banks", {}), o("All banks plus backup SIM", "All bank plus backup SIM", { rev: 1.18, over: 0.015, q: 0.15 }),
      ], 1),
      lev("hours", "Opening hours", "Opening hours", "Night customers pay extra but risk is higher.", "Night customer dey pay extra but risk high.", [
        o("Daytime only", "Daytime only", { rev: 0.85, risk: 0.8 }), o("Day and evening", "Day and evening", {}), o("Round the clock", "Round the clock", { rev: 1.25, risk: 1.5, over: 0.02 }),
      ], 1),
      lev("fees", "Fee policy", "Fee policy", "Official rates keep customers; sneaky extra charges bring quick money and angry customers.", "Official rate keep customer; sneaky extra charge bring quick money and vex customer.", [
        o("Official rates", "Official rates", {}), o("Small round-ups", "Small round-ups", { rev: 1.08, fame: -0.25 }), o("Hidden charges", "Hidden charges", { rev: 1.18, fame: -0.9, q: -0.2, risk: 1.2 }),
      ], 0),
    ],
    roles: [
      role("attendant", "POS attendant", "POS attendant", "Runs a terminal at the counter.", "Dey run terminal for counter.", 1, 0.14, 3, true),
      role("float", "Float controller", "Float controller", "Counts cash and catches errors.", "Dey count cash and catch error.", 1.2, 0.04, 1),
      GUARD,
    ],
    start: ["attendant"],
    levels: lv(["Umbrella point", "Umbrella point"], ["Kiosk", "Kiosk"], ["Multi-terminal shop", "Multi-terminal shop"], ["Agent hub", "Agent hub"], ["Agent network", "Agent network"]),
    unit: ["terminals", "terminals"],
    actions: [
      act("terminal", "Add a terminal", "Add terminal", "Another machine means more customers served at once.", "Another machine mean more customer for once.", 0.22, { rev: 0.04, once: true }),
      act("battery", "Buy a backup battery", "Buy backup battery", "No more lost sales when NEPA takes light.", "No more lost sales when NEPA carry light.", 0.1, { q: 3, once: true }),
      act("agentbank", "Become a super-agent", "Become super-agent", "Sign up with a payments company for better commissions.", "Join payments company for better commission.", 0.35, { fame: 5, rev: 0.06, once: true, minLevel: 2 }),
    ],
  };
}

function beautyProfile(kind: "barbing" | "salon" | "spa" | "makeupstudio"): Profile {
  const barber = kind === "barbing";
  const spa = kind === "spa";
  const makeup = kind === "makeupstudio";
  const services: Lever = lev("services", "Services", "Services",
    barber ? "Haircuts are the core. Add facials, dyeing and nails and you widen the crowd." : spa ? "More treatments mean more customers, and more specialists." : makeup ? "Bridal packages pay most. Lessons and lashes fill the gaps." : "Braids, weaves and wigs pay best. Nails and makeup bring in the rest.",
    barber ? "Haircut na the core. Add facial, dye and nails and your crowd go wide." : spa ? "More treatment mean more customer and more specialist." : makeup ? "Bridal package pay most. Lesson and lashes fill the gap." : "Braid, weave and wig pay best. Nails and makeup bring the rest.", barber ? [
      o("Haircuts only", "Haircut only", { rev: 0.85 }), o("Cuts, dye and shaving", "Cut, dye and shaving", {}), o("Unisex: cuts, braids and nails", "Unisex: cut, braid and nails", { rev: 1.3, over: 0.02, fee: 0.05 }),
    ] : spa ? [
      o("Massage only", "Massage only", { rev: 0.85 }), o("Massage and facials", "Massage and facial", {}), o("Full spa: sauna, nails, body treatments", "Full spa: sauna, nails, body treatment", { rev: 1.3, over: 0.03, fee: 0.06 }),
    ] : makeup ? [
      o("Everyday makeup", "Everyday makeup", { rev: 0.85 }), o("Bridal and events", "Bridal and events", {}), o("Bridal, lashes and makeup classes", "Bridal, lashes and makeup class", { rev: 1.3, over: 0.02, fee: 0.04 }),
    ] : [
      o("Braids and styling", "Braid and styling", { rev: 0.85 }), o("Braids, weaves and wigs", "Braid, weave and wig", {}), o("Unisex with nails and makeup", "Unisex with nails and makeup", { rev: 1.3, over: 0.025, fee: 0.05 }),
    ], 1);
  const booking = lev("booking", "Customers", "Customers", "Walk-ins are random; appointments are steady but need a receptionist.", "Walk-in random; appointment steady but you need receptionist.", [
    o("Walk-ins only", "Walk-in only", { rev: 0.95 }), o("Walk-ins and bookings", "Walk-in and booking", {}), o("Mostly appointments", "Mostly appointment", { rev: 1.12, fame: 0.15 }),
  ], 1);
  const loyalty = lev("loyalty", "Loyalty", "Loyalty", "Discounts for regulars build fame; they also cost sales.", "Discount for regular build fame; e also cost sales.", [
    o("No discounts", "No discount", {}), o("Every 5th cut/visit half price", "Every 5th visit half price", { rev: 0.95, fame: 0.35 }), o("Membership club", "Membership club", { rev: 1.0, fame: 0.7, over: 0.01 }),
  ], 0);
  const primary = barber ? role("barber", "Barber", "Barber", "Cuts hair. Skilled barbers have queues.", "Dey cut hair. Skilled barber get queue.", 1, 0.16, 3, true)
    : spa ? role("therapist", "Massage therapist", "Massage therapist", "The heart of a spa.", "Heart of spa.", 1.1, 0.16, 3, true)
    : makeup ? role("mua", "Makeup artist", "Makeup artist", "Bridal faces and photo shoots.", "Bridal face and photo shoot.", 1.2, 0.18, 3, true)
    : role("stylist", "Hair stylist", "Hair stylist", "Braids, weaves and wigs.", "Braid, weave and wig.", 1, 0.16, 4, true);
  return {
    intro: barber ? ["Chairs, barbers and the right service menu. Hire a nail tech and go unisex to widen the crowd.", "Chair, barber and correct service menu. Hire nail tech and go unisex to widen crowd."]
      : spa ? ["Therapists, treatments and calm. Reputation travels by word of mouth.", "Therapist, treatment and calm. Reputation dey travel by mouth."]
      : makeup ? ["You live on bridal bookings, referrals and photos. A good artist is worth a lot.", "You dey live on bridal booking, referral and photo. Good artist worth plenty."]
      : ["Stylists, a good menu and appointments. Add nails and makeup for a one-stop shop.", "Stylist, good menu and appointment. Add nails and makeup make e be one-stop shop."],
    levers: [LOCATION("Foot traffic and a clean frontage matter most."), services, booking, PRICE(["Student-friendly", "Fair", "Luxury"]), loyalty, ADS(), POWER()],
    roles: [primary,
      ...(barber ? [role("stylist", "Hair stylist", "Hair stylist", "Braids and styling, needed for unisex.", "Braid and styling, needed for unisex.", 1, 0.08, 2)] : []),
      role("nails", "Nail technician", "Nail technician", "Manicures and pedicures. Needs the right service menu.", "Manicure and pedicure. You need correct service menu.", 1, 0.07, 2),
      ...(makeup || spa ? [] : [role("mua", "Makeup artist", "Makeup artist", "Makeup for events.", "Makeup for event.", 1.2, 0.06, 1)]),
      role("receptionist", "Receptionist", "Receptionist", "Handles bookings and the till. Needed for appointments.", "Dey handle booking and till. Needed for appointment.", 0.9, 0.05, 1),
      CLEANER,
    ],
    start: barber ? ["barber"] : spa ? ["therapist"] : makeup ? ["mua"] : ["stylist"],
    levels: barber ? lv(["Two-chair shop", "Two-chair shop"], ["Barbing salon", "Barbing salon"], ["Grooming lounge", "Grooming lounge"], ["Premium lounge", "Premium lounge"], ["Grooming brand", "Grooming brand"])
      : spa ? lv(["Massage room", "Massage room"], ["Day spa", "Day spa"], ["Wellness centre", "Wellness centre"], ["Luxury spa", "Luxury spa"], ["Spa group", "Spa group"])
      : makeup ? lv(["Home studio", "Home studio"], ["Makeup studio", "Makeup studio"], ["Beauty studio", "Beauty studio"], ["Celebrity studio", "Celebrity studio"], ["Beauty house", "Beauty house"])
      : lv(["Small salon", "Small salon"], ["Beauty salon", "Beauty salon"], ["Full-service salon", "Full-service salon"], ["Beauty lounge", "Beauty lounge"], ["Salon chain", "Salon chain"]),
    unit: ["chairs", "chairs"],
    actions: [
      act("chairs", barber ? "Add a chair" : "Add a station", barber ? "Add chair" : "Add station", "More chairs mean more customers at once.", "More chair mean more customer for once.", 0.15, { rev: 0.05, once: true }),
      act("equipment", "Buy better equipment", "Buy better equipment", "Clippers, dryers and chairs customers brag about.", "Clipper, dryer and chair wey customer go brag about.", 0.12, { q: 6, once: true }),
      act("promo", "Run a weekend promo", "Run weekend promo", "Discounts bring crowds; some stay.", "Discount bring crowd; some go stay.", 0.04, { fame: 5, gamble: { p: 0.6, back: 1.4 } }),
      act("training", "Send staff for a masterclass", "Send staff for masterclass", "Skills go up and so does pride.", "Skill go up and so pride.", 0.1, { q: 3, loyalty: 8, once: true }),
    ],
  };
}

function hotelProfile(kind: "hotel" | "eventcentre"): Profile {
  const ev = kind === "eventcentre";
  return {
    intro: ev ? ["Weddings and launches pay; empty weekdays cost. Manage the calendar, the crowd and the neighbours.", "Wedding and launch dey pay; empty weekday dey cost. Manage calendar, crowd and neighbour."]
      : ["Rooms, ratings and a dozen departments. Occupancy is won by service, location and a working generator.", "Room, rating and plenty department. Occupancy na service, location and working generator."],
    levers: [LOCATION("A hotel by the airport and a hotel in the village are different businesses."),
      lev("tier", ev ? "Hall style" : "Star rating", ev ? "Hall style" : "Star rating", "Higher quality earns more per guest but demands better staff and upkeep.", "Higher quality earn more per guest but need better staff and upkeep.", ev ? [
        o("Open-air and simple", "Open-air and simple", { rev: 0.8, cost: 0.7 }), o("Standard hall", "Standard hall", {}), o("Grand ballroom", "Grand ballroom", { rev: 1.4, cost: 1.4, over: 0.03 }),
      ] : [
        o("Budget lodge", "Budget lodge", { rev: 0.8, cost: 0.7 }), o("3-star hotel", "3-star hotel", {}), o("4-star business hotel", "4-star business hotel", { rev: 1.35, cost: 1.35, over: 0.03 }),
      ], 1),
      lev("market", ev ? "Who you host" : "Who you target", ev ? "Who you host" : "Who you target", ev ? "Weddings pay more but are seasonal; corporate bookings are steady." : "Business travellers are steady; weddings and parties are seasonal peaks.", ev ? "Wedding pay more but na season; company booking steady." : "Business traveller steady; wedding and party na seasonal peak.", [
        o("Locals and walk-ins", "Locals and walk-in", { rev: 0.9 }), o("Weddings and parties", "Wedding and party", { rev: 1.15, risk: 1.2 }), o("Corporate and government", "Corporate and government", { rev: 1.1, fame: 0.25, over: 0.015 }),
      ], 1),
      lev("food", "Kitchen and bar", "Kitchen and bar", "A restaurant adds income and headaches.", "Restaurant add income and headache.", [
        o("No restaurant", "No restaurant", { rev: 0.9, over: -0.01 }), o("Breakfast and snacks", "Breakfast and snacks", {}), o("Full restaurant and bar", "Full restaurant and bar", { rev: 1.2, cost: 1.2, over: 0.025, fee: 0.05 }),
      ], 1),
      SECURITY(), POWER(), PRICE(["Discounted rooms", "Standard rates", "Premium rates"]), ADS()],
    roles: [
      role("reception", "Receptionist", "Receptionist", "Check-ins, bookings and complaints.", "Check-in, booking and complaint.", 1, 0.08, 2, true),
      role("housekeeping", "Housekeeper", "Housekeeper", "Clean rooms keep ratings high.", "Clean room dey keep rating high.", 0.8, 0.07, 4, true),
      role("chef", "Chef and kitchen staff", "Chef and kitchen staff", "Food and drinks revenue.", "Food and drink revenue.", 1.1, 0.07, 3),
      role("waiter", "Waiter or bartender", "Waiter or bartender", "Service at the restaurant and bar.", "Service for restaurant and bar.", 0.8, 0.05, 3),
      role("maint", "Maintenance and generator", "Maintenance and generator", "Keeps the lights on and the pipes dry.", "Dey keep light on and pipe dry.", 1, 0.04, 2),
      GUARD,
    ],
    start: ev ? ["reception", "housekeeping"] : ["reception", "housekeeping"],
    levels: ev ? lv(["Small hall", "Small hall"], ["Event hall", "Event hall"], ["Event centre", "Event centre"], ["Grand event centre", "Grand event centre"], ["Convention centre", "Convention centre"]) : lv(["Guest house (10 rooms)", "Guest house (10 rooms)"], ["Hotel (25 rooms)", "Hotel (25 rooms)"], ["Hotel (50 rooms)", "Hotel (50 rooms)"], ["Hotel (100 rooms)", "Hotel (100 rooms)"], ["Hotel chain", "Hotel chain"]),
    unit: ev ? ["halls", "halls"] : ["rooms", "rooms"],
    actions: [
      act("renovate", "Renovate rooms and lobby", "Renovate room and lobby", "Ratings climb after a proper refit.", "Rating go climb after proper refit.", 0.1, { q: 8, fame: 4, once: true }),
      act("booking", "List on booking sites", "List for booking sites", "Online bookings bring guests and commission fees.", "Online booking bring guest and commission fee.", 0.03, { fame: 6, rev: 0.05, once: true }),
      act("staffparty", "Reward your staff", "Reward your staff", "A party and a bonus keep people from quitting.", "Party and bonus keep people from quitting.", 0.03, { loyalty: 15 }),
      act("licence", "Get licences and certifications", "Get licence and certification", "Officials leave you alone and corporate clients trust you.", "Officials go leave you alone and company go trust you.", 0.05, { fame: 3, q: 3, once: true }),
    ],
  };
}

function foodProfile(kind: "street" | "canteen" | "restaurant" | "bar" | "bakery"): Profile {
  const fixed = {
    street: ["Fry fresh, sell fast. Your spot, your recipe and your pepper win.", "Fry fresh, sell fast. Your spot, recipe and pepper go win."],
    canteen: ["Lunch crowds, pots of stew and a queue. Portions and hygiene decide whether people return.", "Lunch crowd, pot of stew and queue. Portion and hygiene decide who go return."],
    restaurant: ["Menu, chefs and ambience. Hygiene inspectors and online reviews both matter.", "Menu, chef and ambience. Hygiene inspector and online review both matter."],
    bar: ["Drinks, music and football nights. Crowd control and licences matter.", "Drink, music and football night. Crowd control and licence matter."],
    bakery: ["Dough at dawn. Ovens, flour prices and fresh bread by 6am.", "Dough for dawn. Oven, flour price and fresh bread by 6am."],
  }[kind] as L;
  const menu = lev("menu", kind === "bakery" ? "Product range" : "Menu", kind === "bakery" ? "Product range" : "Menu", "A short menu is cheap and fast; a wide one pulls more customers and wastes more food.", "Short menu cheap and fast; wide menu pull more customer and waste more food.", kind === "bakery" ? [
    o("Bread only", "Bread only", { rev: 0.85, cost: 0.85 }), o("Bread, buns and snacks", "Bread, buns and snacks", {}), o("Cakes, pastries and orders", "Cake, pastry and orders", { rev: 1.25, cost: 1.2, over: 0.015, fee: 0.04 }),
  ] : kind === "bar" ? [
    o("Beer and soft drinks", "Beer and soft drinks", { rev: 0.85 }), o("Drinks and pepper soup", "Drinks and pepper soup", {}), o("Full bar, grill and shisha", "Full bar, grill and shisha", { rev: 1.3, cost: 1.3, over: 0.02, risk: 1.2, fee: 0.04 }),
  ] : [
    o("One signature dish", "One signature dish", { rev: 0.85, cost: 0.8 }), o("Five or six dishes", "Five or six dishes", {}), o("Wide menu with drinks", "Wide menu with drinks", { rev: 1.25, cost: 1.25, over: 0.015, fee: 0.04 }),
  ], 1);
  const hygiene = lev("hygiene", "Hygiene", "Hygiene", "Cleaner kitchens avoid NAFDAC trouble and food poisoning.", "Clean kitchen avoid NAFDAC trouble and food poisoning.", [
    o("Basic", "Basic", { over: -0.01, risk: 1.5, q: -0.15 }), o("Good", "Good", { over: 0.01 }), o("Spotless and certified", "Spotless and certified", { over: 0.025, q: 0.2, fame: 0.2, risk: 0.5 }),
  ], 1);
  const hours = lev("hours", "Opening hours", "Opening hours", "Breakfast and lunch are safe; late nights bring rowdy crowds and bigger bills.", "Breakfast and lunch safe; late night bring rowdy crowd and bigger bill.", [
    o("Day only", "Day only", { rev: 0.9 }), o("Day and evening", "Day and evening", {}), o("Late into the night", "Late into the night", { rev: 1.18, risk: 1.4, over: 0.02 }),
  ], 1);
  const roles = kind === "street" ? [
    role("cook", "Cook", "Cook", "Fries, grills and keeps the taste.", "Dey fry, grill and keep taste.", 0.9, 0.14, 3, true), role("seller", "Seller", "Seller", "Sells and handles customers.", "Dey sell and handle customer.", 0.8, 0.09, 3), role("helper", "Helper", "Helper", "Peels, fetches and washes.", "Dey peel, fetch and wash.", 0.6, 0.04, 2),
  ] : kind === "bar" ? [
    role("bartender", "Bartender", "Bartender", "Pours drinks and runs the counter.", "Dey pour drink and run counter.", 0.9, 0.11, 3, true), role("waiter", "Waiter", "Waiter", "Serves tables.", "Dey serve table.", 0.8, 0.08, 3), role("cook", "Grill and kitchen", "Grill and kitchen", "Pepper soup and grilled fish.", "Pepper soup and grilled fish.", 1, 0.07, 2), role("bouncer", "Bouncer", "Bouncer", "Keeps order and cuts risk.", "Dey keep order and cut risk.", 1, 0.0, 2), CLEANER,
  ] : kind === "bakery" ? [
    role("baker", "Baker", "Baker", "Dough, ovens and quality.", "Dough, oven and quality.", 1.1, 0.16, 3, true), role("seller", "Counter staff", "Counter staff", "Sells and packs.", "Dey sell and pack.", 0.8, 0.08, 3), role("rider", "Delivery rider", "Delivery rider", "Takes orders to shops and offices.", "Dey carry order go shops and offices.", 0.9, 0.06, 2),
  ] : [
    role("cook", kind === "restaurant" ? "Chef" : "Cook", kind === "restaurant" ? "Chef" : "Cook", "The kitchen.", "The kitchen.", 1.1, 0.15, 3, true), role("waiter", "Waiter", "Waiter", "Serves tables and takes orders.", "Dey serve table and take order.", 0.8, 0.09, 4), role("cashier", "Cashier", "Cashier", "Takes payments and counts the till.", "Dey take payment and count till.", 0.9, 0.04, 1), CLEANER,
  ];
  return {
    intro: fixed,
    levers: [LOCATION("Offices, motor parks and campuses are lunch gold."), menu, PRICE(["Student prices", "Fair", "Premium"]), hygiene, hours, STOCKQ("ingredients"), ADS(), POWER()],
    roles,
    start: kind === "street" ? [] : [roles[0].id],
    levels: kind === "street" ? lv(["Pot and table", "Pot and table"], ["Stall with a helper", "Stall with helper"], ["Roadside joint", "Roadside joint"], ["Small canteen", "Small canteen"], ["Food brand", "Food brand"]) : lv(["Small joint", "Small joint"], ["Local favourite", "Local favourite"], ["Popular spot", "Popular spot"], ["Big venue", "Big venue"], ["Chain", "Chain"]),
    unit: ["tables", "tables"],
    actions: [
      act("menuTest", "Launch a new dish", "Launch new dish", "A hit dish builds fame, a flop wastes ingredients.", "Hit dish build fame, flop waste ingredient.", 0.04, { fame: 5, gamble: { p: 0.55, back: 1.6 } }),
      act("hygieneCert", "Get NAFDAC and health certificates", "Get NAFDAC and health certificate", "Officials relax and customers trust you.", "Officials relax and customer trust you.", 0.06, { q: 4, fame: 3, once: true }),
      act("catering", "Take a catering order", "Take catering order", "A big event pays well if you deliver.", "Big event pay well if you deliver.", 0.05, { gamble: { p: 0.7, back: 1.5 }, fame: 2 }),
      act("equipment", "Upgrade pots, ovens and freezers", "Upgrade pot, oven and freezer", "Better kit, better food.", "Better kit, better food.", 0.1, { q: 6, once: true }),
    ],
  };
}

function retailProfile(kind: "shop" | "supermarket" | "phones" | "books" | "building" | "spares" | "pharmacy" | "online" | "cars"): Profile {
  const intro: Record<string, L> = {
    shop: ["Daily necessities, steady customers and 'I will pay you tomorrow' credit.", "Daily needs, steady customer and 'I go pay you tomorrow' credit."],
    supermarket: ["High volume, thin margins. Tills, shelves, suppliers and shrinkage decide profit.", "High volume, thin margin. Till, shelf, supplier and shrinkage decide profit."],
    phones: ["Gadgets, accessories and repairs. Fake chargers and fast-moving models are your daily wahala.", "Gadget, accessories and repair. Fake charger and fast model na your daily wahala."],
    books: ["School runs make your year. Stock the right textbooks before resumption.", "School run make your year. Stock correct textbook before resumption."],
    building: ["Cement, rods and tiles. Prices swing, buyers want credit and trucks need loading.", "Cement, rod and tile. Price dey swing, buyer want credit and truck need loading."],
    spares: ["Original and Tokunbo parts. Customers want the cheap one that will not fail.", "Original and Tokunbo parts. Customer want cheap one wey no go fail."],
    pharmacy: ["Drugs, prescriptions and regulators. A licensed pharmacist keeps you open, and fakes can close you.", "Drug, prescription and regulator. Licensed pharmacist keep you open, and fake fit close you."],
    online: ["Instagram orders, dispatch riders and returns. Trust and speed win.", "Instagram order, dispatch rider and return. Trust and speed win."],
    cars: ["Import, inspect, price and haggle. Margins are big when you read the market.", "Import, inspect, price and haggle. Margin big when you read market."],
  };
  const credit = lev("credit", "Credit policy", "Credit policy", "Credit brings customers and unpaid debts.", "Credit bring customer and unpaid debt.", [
    o("Cash only", "Cash only", { rev: 0.88 }), o("Credit for trusted regulars", "Credit for trusted regulars", { rev: 1.08, risk: 1.1, fame: 0.1 }), o("Credit for everyone", "Credit for everybody", { rev: 1.2, risk: 1.5, over: 0.03 }),
  ], kind === "cars" || kind === "building" ? 1 : 0);
  const range = lev("range", kind === "phones" ? "Product mix" : "Range", kind === "phones" ? "Product mix" : "Range", "A narrow range is cheap to hold; a wide one catches more buyers.", "Narrow range cheap to hold; wide one catch more buyer.", kind === "phones" ? [
    o("Accessories and repairs", "Accessories and repairs", { rev: 0.8, cost: 0.6 }), o("Phones and accessories", "Phones and accessories", {}), o("Latest phones and laptops", "Latest phones and laptop", { rev: 1.35, cost: 1.6, risk: 1.3, fee: 0.05 }),
  ] : kind === "cars" ? [
    o("Cheap Tokunbo cars", "Cheap Tokunbo cars", { rev: 0.85, cost: 0.6 }), o("Mix of everyday cars", "Mix of everyday cars", {}), o("SUVs and luxury cars", "SUV and luxury cars", { rev: 1.4, cost: 1.7, risk: 1.3, fee: 0.06 }),
  ] : [
    o("Basics only", "Basic only", { rev: 0.82, cost: 0.7 }), o("Standard range", "Standard range", {}), o("Wide range and imports", "Wide range and imports", { rev: 1.25, cost: 1.3, over: 0.015, fee: 0.04 }),
  ], 1);
  const supply = lev("supplier", "Supplier", "Supplier", "Cheap suppliers cut costs and quality; trusted ones cost more and never disappear.", "Cheap supplier cut cost and quality; trusted one cost more and no dey vanish.", [
    o("Cheapest wholesaler", "Cheapest wholesaler", { cost: 0.85, q: -0.2, risk: 1.2 }), o("Reliable distributor", "Reliable distributor", {}), o("Direct from manufacturer", "Direct from manufacturer", { cost: 0.92, q: 0.15, over: 0.015 }),
  ], 1);
  const roles: Role[] = [
    role("attendant", "Shop attendant", "Shop attendant", "Serves customers.", "Dey serve customer.", 0.9, 0.12, 4, true),
    role("cashier", "Cashier", "Cashier", "Handles cash and reduces losses.", "Dey handle cash and reduce loss.", 0.9, 0.04, 2),
    role("storekeeper", "Storekeeper", "Storekeeper", "Counts stock and cuts shrinkage.", "Dey count stock and cut shrinkage.", 0.9, 0.04, 1),
    ...(kind === "pharmacy" ? [role("pharmacist", "Licensed pharmacist", "Licensed pharmacist", "Required by law. Better pharmacists reassure customers.", "Law require am. Better pharmacist dey reassure customer.", 2.2, 0.12, 1, true)] : []),
    ...(kind === "phones" ? [role("tech", "Repair technician", "Repair technician", "Screens and charging ports.", "Screen and charging port.", 1.2, 0.1, 2)] : []),
    ...(kind === "cars" ? [role("sales", "Sales agent", "Sales agent", "Brings buyers and negotiates.", "Dey bring buyer and negotiate.", 1.1, 0.1, 3), role("mechanic", "Inspector and mechanic", "Inspector and mechanic", "Finds the lemons.", "Dey find the bad one.", 1.2, 0.06, 2)] : []),
    ...(kind === "online" ? [role("rider", "Dispatch rider", "Dispatch rider", "Delivers parcels.", "Dey deliver parcel.", 0.9, 0.08, 3), role("support", "Customer support", "Customer support", "Handles DMs and returns.", "Dey handle DM and return.", 0.9, 0.07, 2)] : []),
    ...(kind === "building" ? [role("loader", "Loader and driver", "Loader and driver", "Moves heavy goods.", "Dey move heavy goods.", 0.9, 0.06, 3)] : []),
    GUARD,
  ];
  return {
    intro: intro[kind],
    levers: [LOCATION(), PRICE(["Cheap", "Fair", "Premium"]), range, credit, supply, ADS(), SECURITY()],
    roles,
    start: kind === "online" ? [] : [roles[0].id],
    levels: lv(["Small shop", "Small shop"], ["Busy shop", "Busy shop"], ["Large store", "Large store"], ["Flagship store", "Flagship store"], ["Retail brand", "Retail brand"]),
    unit: ["shelves", "shelves"],
    actions: [
      act("sale", "Run a big sale", "Run big sale", "Clear old stock and bring in crowds.", "Clear old stock and bring crowd.", 0.04, { fame: 4, gamble: { p: 0.6, back: 1.5 } }),
      act("recoverDebt", "Chase debtors", "Chase debtors", "Phone calls, visits and awkward conversations.", "Phone call, visit and awkward conversation.", 0.02, { gamble: { p: 0.65, back: 2.5 } }),
      act("equipment", kind === "supermarket" ? "Install CCTV and a barcode till" : "Fit better shelves and displays", kind === "supermarket" ? "Install CCTV and barcode till" : "Fit better shelf and display", "Stock looks better and goes missing less.", "Stock go look better and go miss less.", 0.08, { q: 5, once: true }),
      act("loyalty", "Start a loyalty card", "Start loyalty card", "Regulars come back more often.", "Regulars go dey come more.", 0.03, { fame: 4, once: true }),
    ],
  };
}

function workshopProfile(kind: "carwash" | "auto" | "cyber" | "borehole" | "solar" | "photo"): Profile {
  const intros: Record<string, L> = {
    carwash: ["Water, soap and speed. Queue size and reputation bring the regulars.", "Water, soap and speed. Queue and name bring regular."],
    auto: ["Diagnose honestly, price fairly and fix right. Customers talk about both.", "Diagnose honestly, price fairly and fix correct. Customer dey talk both."],
    cyber: ["Printing, browsing, exam registrations and passports. Power and a working network are everything.", "Printing, browsing, exam registration and passport. Light and working network na everything."],
    borehole: ["Drill, test and deliver. Each job is a gamble on what is under the ground.", "Drill, test and deliver. Each job na gamble on wetin dey under ground."],
    solar: ["Quote, install, maintain. Customers buy trust as much as panels.", "Quote, install, maintain. Customer dey buy trust as much as panel."],
    photo: ["Weddings, birthdays and brand shoots. Your portfolio and reviews win bookings.", "Wedding, birthday and brand shoot. Your portfolio and review win booking."],
  };
  const work = lev("jobs", kind === "auto" ? "What you fix" : kind === "photo" ? "What you shoot" : "Service range", kind === "auto" ? "Wetin you fix" : kind === "photo" ? "Wetin you shoot" : "Service range", "Specialising earns more per job; being a generalist gets more jobs.", "Specialist earn more per job; generalist get more job.", kind === "auto" ? [
    o("Everyday repairs", "Everyday repairs", { rev: 0.9 }), o("Mechanical and electrical", "Mechanical and electrical", {}), o("Specialist: imports and diagnostics", "Specialist: imports and diagnostics", { rev: 1.35, cost: 1.2, over: 0.02, fee: 0.05 }),
  ] : kind === "photo" ? [
    o("Events and portraits", "Event and portrait", { rev: 0.9 }), o("Weddings and brands", "Wedding and brand", {}), o("Film, drone and magazine work", "Film, drone and magazine work", { rev: 1.35, cost: 1.3, over: 0.02, fee: 0.06 }),
  ] : [
    o("Basic service", "Basic service", { rev: 0.88, cost: 0.8 }), o("Standard service", "Standard service", {}), o("Premium, with extras", "Premium, with extras", { rev: 1.3, cost: 1.25, over: 0.02, fee: 0.04 }),
  ], 1);
  const equip = lev("equipment", "Equipment", "Equipment", "Better tools mean faster, better work, and bigger bills.", "Better tool mean faster, better work and bigger bill.", [
    o("Basic tools", "Basic tools", { rev: 0.9, q: -0.15 }), o("Good tools", "Good tools", {}), o("Modern equipment", "Modern equipment", { rev: 1.15, q: 0.25, over: 0.02 }),
  ], 1);
  const roles: Role[] = [
    role("technician", kind === "carwash" ? "Washer" : kind === "photo" ? "Photographer" : kind === "cyber" ? "Operator" : "Technician", kind === "carwash" ? "Washer" : kind === "photo" ? "Photographer" : kind === "cyber" ? "Operator" : "Technician", "Does the work.", "Dey do the work.", 1, 0.14, 4, true),
    role("apprentice", "Apprentice", "Apprentice", "Cheap helper who learns on the job.", "Cheap helper wey dey learn.", 0.5, 0.05, 3),
    role("sales", kind === "photo" ? "Editor" : "Front desk and sales", kind === "photo" ? "Editor" : "Front desk and sales", "Brings customers and handles payments.", "Dey bring customer and handle payment.", 0.9, 0.06, 1),
    GUARD,
  ];
  return {
    intro: intros[kind],
    levers: [LOCATION(), work, equip, PRICE(), ADS(), POWER(), SECURITY()],
    roles,
    start: [roles[0].id],
    levels: lv(["Roadside setup", "Roadside setup"], ["Workshop", "Workshop"], ["Busy workshop", "Busy workshop"], ["Large centre", "Large centre"], ["Multi-branch company", "Multi-branch company"]),
    unit: ["bays", "bays"],
    actions: [
      act("equipmentBuy", "Buy a major tool or machine", "Buy major tool or machine", "A big purchase that lifts quality and speed.", "Big purchase wey lift quality and speed.", 0.12, { q: 7, rev: 0.03, once: true }),
      act("warranty", "Offer a warranty", "Offer warranty", "Customers trust you; you eat the occasional repeat job.", "Customer trust you; you go chop sometimes repeat job.", 0.04, { fame: 5, once: true }),
      act("contract", "Chase a company contract", "Chase company contract", "Steady work from an office or fleet.", "Steady work from office or fleet.", 0.05, { gamble: { p: 0.5, back: 2.2 }, fame: 2 }),
      act("training", "Train your people", "Train your people", "Skills and loyalty go up.", "Skill and loyalty go up.", 0.06, { q: 3, loyalty: 8, once: true }),
    ],
  };
}

function factoryProfile(kind: "water" | "fashion" | "mill" | "palm" | "cassava" | "cold" | "gas"): Profile {
  const intro: Record<string, L> = {
    water: ["Bagging, branding and distribution. NAFDAC numbers and cheap trucks win markets.", "Bagging, branding and distribution. NAFDAC number and cheap truck win market."],
    fashion: ["Designers, tailors and orders. Aso-ebi season is your Christmas, and delivery dates are your nightmare.", "Designer, tailor and order. Aso-ebi season na your Christmas, delivery date na your nightmare."],
    mill: ["Buy paddy at harvest, store, mill and sell. Timing the market makes or breaks you.", "Buy paddy for harvest, store, mill and sell. Timing market make or break you."],
    palm: ["Buy bunches, press, bottle and sell. Seasonal supply and middlemen are the game.", "Buy bunch, press, bottle and sell. Season supply and middlemen na the game."],
    cassava: ["Peel, grate, ferment, fry. Quality and hygiene decide your garri's name.", "Peel, grate, ferment, fry. Quality and hygiene decide your garri name."],
    cold: ["Store, sell and keep it cold. Light is your biggest cost and your biggest risk.", "Store, sell and keep am cold. Light na your biggest cost and biggest risk."],
    gas: ["Refill, distribute and stay safe. One accident ends the business.", "Refill, distribute and stay safe. One accident end the business."],
  };
  const output = lev("output", kind === "fashion" ? "Order book" : "Production", kind === "fashion" ? "Order book" : "Production", kind === "fashion" ? "Walk-in tailoring, bridal and aso-ebi orders, or ready-to-wear." : "Run fewer shifts or push the machines.", kind === "fashion" ? "Walk-in tailoring, bridal and aso-ebi order, or ready-to-wear." : "Run small shift or push the machine.", kind === "fashion" ? [
    o("Walk-in tailoring", "Walk-in tailoring", { rev: 0.85 }), o("Bridal and aso-ebi orders", "Bridal and aso-ebi order", {}), o("Ready-to-wear label", "Ready-to-wear label", { rev: 1.3, cost: 1.3, over: 0.03, fee: 0.06 }),
  ] : [
    o("One shift", "One shift", { rev: 0.85, cost: 0.85 }), o("Two shifts", "Two shift", {}), o("Around the clock", "Around the clock", { rev: 1.25, cost: 1.15, over: 0.03, q: -0.2, risk: 1.2 }),
  ], 1);
  const channel = lev("channel", "Who you sell to", "Who you sell to", "Retail pays better but needs effort; wholesale moves volume.", "Retail pay better but need effort; wholesale move volume.", [
    o("Walk-in customers", "Walk-in customer", { rev: 0.9 }), o("Shops and retailers", "Shop and retailer", {}), o("Distributors and companies", "Distributor and company", { rev: 1.15, pm: 0.92, fee: 0.04 }),
  ], 1);
  const compliance = lev("compliance", "Standards", "Standards", "Registration and inspections keep officials away.", "Registration and inspection keep officials away.", [
    o("Minimum", "Minimum", { risk: 1.5 }), o("Registered", "Registered", { over: 0.012 }), o("Fully certified", "Fully certified", { over: 0.03, risk: 0.5, fame: 0.25, q: 0.1 }),
  ], 1);
  const roles: Role[] = kind === "fashion" ? [
    role("designer", "Fashion designer", "Fashion designer", "Creates the styles and wins bridal clients.", "Dey create style and win bridal client.", 1.4, 0.12, 2, true), role("tailor", "Tailor", "Tailor", "Sews the orders.", "Dey sew order.", 0.9, 0.12, 5, true), role("sales", "Sales and fittings", "Sales and fittings", "Handles customers and fittings.", "Dey handle customer and fitting.", 0.8, 0.05, 2), GUARD,
  ] : [
    role("operator", "Machine operator", "Machine operator", "Runs the production line.", "Dey run production line.", 1, 0.13, 4, true), role("packer", "Packer and loader", "Packer and loader", "Packs and loads.", "Dey pack and load.", 0.7, 0.05, 4), role("driver", "Delivery driver", "Delivery driver", "Moves product to buyers.", "Dey move product go buyer.", 0.9, 0.06, 3), role("qc", "Quality control", "Quality control", "Keeps quality up and officials happy.", "Dey keep quality up and officials happy.", 1.3, 0.04, 1), GUARD,
  ];
  return {
    intro: intro[kind],
    levers: [LOCATION("Near suppliers or near buyers: each has its price."), output, channel, PRICE(), compliance, STOCKQ(kind === "fashion" ? "fabric" : "inputs"), ADS(), POWER()],
    roles,
    start: [roles[0].id],
    levels: lv(["Small workshop", "Small workshop"], ["Production shed", "Production shed"], ["Factory", "Factory"], ["Large factory", "Large factory"], ["Industrial group", "Industrial group"]),
    unit: ["machines", "machines"],
    actions: [
      act("machine", "Buy a new machine", "Buy new machine", "More output and fewer breakdowns.", "More output and small breakdown.", 0.15, { rev: 0.05, q: 3, once: true }),
      act("brand", "Brand and package it", "Brand and package am", "Nice packaging lets you charge more.", "Nice package go let you charge more.", 0.06, { fame: 6, once: true }),
      act("bulk", "Chase a bulk buyer", "Chase bulk buyer", "A big order, if you can deliver.", "Big order, if you fit deliver.", 0.05, { gamble: { p: 0.55, back: 2.0 } }),
      act("cert", "Get NAFDAC and SON approval", "Get NAFDAC and SON approval", "Doors open and inspectors back off.", "Door open and inspector back off.", 0.06, { fame: 3, q: 3, once: true }),
    ],
  };
}

function farmProfile(kind: "farm" | "poultry" | "fish"): Profile {
  const intro: Record<string, L> = {
    farm: ["Seasons, seeds and storage. Plant at the right time, protect the crop, sell when prices are good.", "Season, seed and storage. Plant for correct time, protect crop, sell when price good."],
    poultry: ["Day-old chicks, feed and vaccines. Disease can wipe a pen overnight.", "Day-old chick, feed and vaccine. Disease fit wipe pen overnight."],
    fish: ["Ponds, feed and water quality. Catfish grow fast if you keep the water right.", "Pond, feed and water quality. Catfish grow fast if you keep water right."],
  };
  const stockLev = lev("stocking", kind === "farm" ? "Crops and acreage" : kind === "poultry" ? "Flock size" : "Pond stocking", kind === "farm" ? "Crop and acreage" : kind === "poultry" ? "Flock size" : "Pond stocking", "Planting more means more harvest, more feed and more risk.", "Plant more mean more harvest, more feed and more risk.", [
    o("Small and safe", "Small and safe", { rev: 0.75, cost: 0.7, risk: 0.7 }), o("Moderate", "Moderate", {}), o("As much as you can", "As much as you fit", { rev: 1.3, cost: 1.35, risk: 1.5, fee: 0.04 }),
  ], 1);
  const inputs = lev("inputs", kind === "farm" ? "Seeds and fertiliser" : "Feed", kind === "farm" ? "Seed and fertiliser" : "Feed", "Quality inputs lift yields and cost more.", "Quality input lift yield and cost more.", [
    o("Cheapest", "Cheapest", { cost: 0.75, q: -0.4, rev: 0.9 }), o("Standard", "Standard", {}), o("Premium, high-yield", "Premium, high-yield", { cost: 1.35, q: 0.4, rev: 1.12 }),
  ], 1);
  const health = lev("health", kind === "farm" ? "Crop protection" : "Vaccines and treatment", kind === "farm" ? "Crop protection" : "Vaccine and treatment", "Losses from pests and disease drop when you spend.", "Loss from pest and disease drop when you spend.", [
    o("Hope for the best", "Hope for the best", { risk: 1.7 }), o("Routine care", "Routine care", { over: 0.015 }), o("Full programme with a vet", "Full programme with vet", { over: 0.035, risk: 0.5, q: 0.15 }),
  ], 1);
  const market = lev("market", "Where you sell", "Where you sell", "Middlemen pay little and fast; contracts pay more and need quality.", "Middlemen pay small and fast; contract pay more and need quality.", [
    o("Middlemen at the farm gate", "Middlemen for farm gate", { rev: 0.82 }), o("Local markets", "Local market", {}), o("Hotels, restaurants and supermarkets", "Hotel, restaurant and supermarket", { rev: 1.2, over: 0.015, fee: 0.04 }),
  ], 1);
  const roles: Role[] = [
    role("hand", kind === "farm" ? "Farm hand" : kind === "poultry" ? "Pen attendant" : "Pond attendant", kind === "farm" ? "Farm hand" : kind === "poultry" ? "Pen attendant" : "Pond attendant", "Daily work on the farm.", "Daily work for farm.", 0.7, 0.1, 5, true),
    role("vet", "Vet or farm technician", "Vet or farm technician", "Prevents disease and boosts yields.", "Dey prevent disease and boost yield.", 1.8, 0.08, 1),
    role("manager", "Farm supervisor", "Farm supervisor", "Keeps workers honest and the farm in order.", "Dey keep worker honest and farm for order.", 1.4, 0.05, 1),
    GUARD,
  ];
  return {
    intro: intro[kind],
    levers: [LOCATION("Land near good roads and markets sells better; remote land is cheap."), stockLev, inputs, health, market, POWER(), SECURITY()],
    roles,
    start: ["hand"],
    levels: lv(["Small plot", "Small plot"], ["Working farm", "Working farm"], ["Commercial farm", "Commercial farm"], ["Large estate", "Large estate"], ["Agro group", "Agro group"]),
    unit: kind === "poultry" ? ["pens", "pens"] : kind === "fish" ? ["ponds", "ponds"] : ["hectares", "hectares"],
    actions: [
      act("storage", "Build storage or a cold room", "Build storage or cold room", "Hold produce until prices are good.", "Hold produce till price good.", 0.1, { rev: 0.04, q: 3, once: true }),
      act("irrigate", kind === "farm" ? "Install irrigation" : "Upgrade the system", kind === "farm" ? "Install irrigation" : "Upgrade the system", "Fewer bad seasons.", "Small bad season.", 0.12, { q: 5, once: true }),
      act("contract", "Sign a supply contract", "Sign supply contract", "Steady buyers, if you deliver.", "Steady buyer, if you deliver.", 0.04, { gamble: { p: 0.55, back: 2.0 }, fame: 2 }),
      act("insure", "Take out farm insurance", "Take farm insurance", "Cushion against floods and disease.", "Cushion against flood and disease.", 0.05, { q: 2, once: true }),
    ],
  };
}

function fleetProfile(kind: "logistics" | "keke" | "rental"): Profile {
  const intro: Record<string, L> = {
    logistics: ["Riders, vans and angry customers. Routes, fuel and drivers decide margins.", "Rider, van and vex customer. Route, fuel and driver decide margin."],
    keke: ["Own the tricycles, hire the drivers, collect daily remittance. Drivers who cheat are your biggest leak.", "Own keke, hire driver, collect daily remittance. Driver wey dey cheat na your biggest leak."],
    rental: ["Weddings, airport runs and VIP rides. Condition, drivers and insurance keep you in business.", "Wedding, airport run and VIP ride. Condition, driver and insurance keep you for business."],
  };
  const operations = lev("service", kind === "logistics" ? "What you carry" : kind === "rental" ? "Who you serve" : "Where you run", kind === "logistics" ? "Wetin you carry" : kind === "rental" ? "Who you serve" : "Where you run", "Specialise or spread across everything.", "Specialise or spread across everything.", kind === "logistics" ? [
    o("Small parcels in town", "Small parcel for town", { rev: 0.85 }), o("Parcels and e-commerce", "Parcel and e-commerce", {}), o("Intercity freight and contracts", "Intercity freight and contract", { rev: 1.35, over: 0.025, risk: 1.3, fee: 0.06 }),
  ] : kind === "rental" ? [
    o("Weddings and events", "Wedding and event", { rev: 0.95 }), o("Airport and corporate", "Airport and corporate", { rev: 1.1 }), o("VIP and convoy", "VIP and convoy", { rev: 1.35, over: 0.025, risk: 1.3, fee: 0.06 }),
  ] : [
    o("One estate or neighbourhood", "One estate or neighbourhood", { rev: 0.85, risk: 0.8 }), o("A few busy routes", "Few busy route", {}), o("City-wide with night runs", "City-wide with night run", { rev: 1.25, risk: 1.5 }),
  ], 1);
  const maint = lev("maintenance", "Maintenance", "Maintenance", "Regular servicing costs money and avoids breakdowns.", "Regular servicing cost money and avoid breakdown.", [
    o("Fix when it breaks", "Fix when e break", { over: -0.01, q: -0.3, risk: 1.5 }), o("Regular service", "Regular service", { over: 0.015 }), o("Premium maintenance", "Premium maintenance", { over: 0.035, q: 0.25, risk: 0.6 }),
  ], 1);
  const pay = lev("pay", "How drivers are paid", "How drivers dey take pay", "Fixed pay is safe; remittance is cheap until drivers cheat.", "Fixed pay safe; remittance cheap till driver dey cheat.", [
    o("Fixed salary", "Fixed salary", { over: 0.03, risk: 0.7 }), o("Daily remittance", "Daily remittance", { rev: 1.1, risk: 1.4 }), o("Commission", "Commission", { rev: 1.05, fame: 0.1 }),
  ], 1);
  const roles: Role[] = [
    role("driver", kind === "logistics" ? "Rider or driver" : "Driver", kind === "logistics" ? "Rider or driver" : "Driver", "Takes the vehicles out.", "Dey carry vehicle go road.", 0.9, 0.13, 6, true),
    role("mechanic", "Mechanic", "Mechanic", "Keeps vehicles running.", "Dey keep vehicle running.", 1.2, 0.05, 1),
    role("dispatcher", "Dispatcher", "Dispatcher", "Plans routes and handles customers.", "Dey plan route and handle customer.", 1, 0.07, 1),
    role("accounts", "Accounts clerk", "Accounts clerk", "Collects remittance and catches leaks.", "Dey collect remittance and catch leak.", 1, 0.03, 1),
  ];
  return {
    intro: intro[kind],
    levers: [LOCATION(), operations, pay, maint, PRICE(), ADS(), SECURITY()],
    roles,
    start: ["driver"],
    levels: lv(["Two vehicles", "Two vehicles"], ["Small fleet", "Small fleet"], ["Fleet of ten", "Fleet of ten"], ["Large fleet", "Large fleet"], ["Transport company", "Transport company"]),
    unit: ["vehicles", "vehicles"],
    actions: [
      act("vehicle", "Add a vehicle", "Add vehicle", "More vehicles, more income, more headaches.", "More vehicle, more income, more headache.", 0.18, { rev: 0.06, once: true }),
      act("tracker", "Install GPS trackers", "Install GPS tracker", "Drivers cheat less and you see everything.", "Driver go cheat less and you go see everything.", 0.06, { q: 4, once: true }),
      act("insure", "Insure the fleet", "Insure the fleet", "An accident no longer ends you.", "Accident no go finish you again.", 0.05, { q: 2, once: true }),
      act("contract", "Win a company contract", "Win company contract", "Regular work from an office or school.", "Regular work from office or school.", 0.04, { gamble: { p: 0.5, back: 2.2 } }),
    ],
  };
}

function institutionProfile(kind: "school" | "college" | "clinic" | "gym"): Profile {
  const intro: Record<string, L> = {
    school: ["Fees, teachers and PTA. Results and reputation fill the classrooms.", "Fees, teacher and PTA. Result and name fill classroom."],
    college: ["JAMB and WAEC crash courses. Pass rates are your advert.", "JAMB and WAEC crash course. Pass rate na your advert."],
    clinic: ["Doctors, nurses and a pharmacy. Patients want trust, not the cheapest bed.", "Doctor, nurse and pharmacy. Patient want trust, no be cheapest bed."],
    gym: ["Memberships, trainers and equipment. January is full, March is empty.", "Membership, trainer and equipment. January full, March empty."],
  };
  const levers: Lever[] = kind === "school" ? [
    lev("fees", "School fees", "School fees", "Higher fees mean better teachers and fewer pupils.", "Higher fees mean better teacher and fewer pupil.", [o("Affordable", "Affordable", { pm: 0.8 }), o("Standard", "Standard", { pm: 1 }), o("Premium", "Premium", { pm: 1.25, fame: 0.1 })], 1),
    lev("curriculum", "Curriculum", "Curriculum", "Extras attract parents and cost money.", "Extras attract parent and cost money.", [o("Nigerian curriculum", "Nigerian curriculum", {}), o("Plus ICT and French", "Plus ICT and French", { rev: 1.1, over: 0.015, fame: 0.2 }), o("British and Nigerian", "British and Nigerian", { rev: 1.3, over: 0.035, fame: 0.4, fee: 0.06 })], 0),
    lev("class", "Class size", "Class size", "Crowded classes earn more and teach less.", "Crowded class earn more and teach less.", [o("Small classes", "Small class", { rev: 0.85, q: 0.2 }), o("Normal", "Normal", {}), o("Packed classrooms", "Packed classroom", { rev: 1.2, q: -0.35 })], 1),
  ] : kind === "college" ? [
    lev("fees", "Course fees", "Course fees", "Cheap fees fill seats; premium fees need results.", "Cheap fee fill seat; premium fee need result.", [o("Cheap", "Cheap", { pm: 0.8 }), o("Standard", "Standard", { pm: 1 }), o("Premium", "Premium", { pm: 1.25 })], 1),
    lev("programmes", "Programmes", "Programmes", "JAMB, WAEC, or both with professional exams.", "JAMB, WAEC, or both with professional exam.", [o("JAMB only", "JAMB only", { rev: 0.9 }), o("JAMB and WAEC", "JAMB and WAEC", {}), o("All plus professional exams", "All plus professional exam", { rev: 1.3, over: 0.025, fee: 0.05 })], 1),
    lev("guarantee", "Pass guarantee", "Pass guarantee", "Bold promises fill classes and cost refunds.", "Bold promise fill class and cost refund.", [o("No promises", "No promise", {}), o("'We guarantee A1'", "'We guarantee A1'", { rev: 1.15, fame: 0.4, risk: 1.3 })], 0),
  ] : kind === "clinic" ? [
    lev("services", "Services", "Services", "More departments mean more patients and more staff.", "More department mean more patient and more staff.", [o("Consultation and malaria", "Consultation and malaria", { rev: 0.8 }), o("General clinic with lab", "General clinic with lab", {}), o("Maternity, surgery and scans", "Maternity, surgery and scan", { rev: 1.4, over: 0.035, risk: 1.3, fee: 0.07 })], 1),
    lev("pricing", "Fees", "Fees", "Deposits, insurance and charity cases.", "Deposit, insurance and charity case.", [o("Charity-minded", "Charity-minded", { pm: 0.8, fame: 0.4 }), o("Standard fees", "Standard fees", { pm: 1 }), o("Premium private care", "Premium private care", { pm: 1.3 })], 1),
    lev("insurance", "HMO partnerships", "HMO partnerships", "HMOs bring patients and pay late.", "HMO bring patient and pay late.", [o("Cash patients only", "Cash patient only", { rev: 0.9 }), o("A few HMOs", "Few HMO", { rev: 1.1, over: 0.01 }), o("All major HMOs", "All major HMO", { rev: 1.25, over: 0.02 })], 1),
  ] : [
    lev("fees", "Membership fees", "Membership fees", "Cheap draws crowds, premium needs equipment to justify it.", "Cheap draw crowd, premium need equipment to justify am.", [o("Student rates", "Student rate", { pm: 0.8 }), o("Standard", "Standard", { pm: 1 }), o("Premium club", "Premium club", { pm: 1.3, fame: 0.2 })], 1),
    lev("equipment", "Equipment", "Equipment", "Machines and weights make a gym.", "Machine and weight make gym.", [o("Basic weights", "Basic weights", { rev: 0.85 }), o("Full floor", "Full floor", {}), o("Modern machines and a pool", "Modern machine and pool", { rev: 1.3, over: 0.04, fee: 0.07 })], 1),
    lev("classes", "Classes", "Classes", "Group classes keep people coming back.", "Group class keep people dey come back.", [o("None", "None", {}), o("Weekly classes", "Weekly class", { rev: 1.1, fame: 0.3 }), o("Daily classes and personal training", "Daily class and personal training", { rev: 1.25, fame: 0.5, over: 0.02 })], 0),
  ];
  const roles: Role[] = kind === "school" ? [
    role("teacher", "Teacher", "Teacher", "Teaches classes. Quality shows in results.", "Dey teach class. Quality dey show for result.", 1, 0.13, 5, true), role("head", "Head teacher", "Head teacher", "Runs the school day.", "Dey run school day.", 1.8, 0.06, 1, true), role("admin", "Admin and bursar", "Admin and bursar", "Collects fees and keeps records.", "Dey collect fee and keep record.", 1, 0.04, 1), role("cleaner", "Cleaner and gateman", "Cleaner and gateman", "Keeps the compound.", "Dey keep compound.", 0.6, 0.02, 2),
  ] : kind === "college" ? [
    role("tutor", "Tutor", "Tutor", "Teaches lessons.", "Dey teach lesson.", 1, 0.14, 5, true), role("admin", "Admin", "Admin", "Registration and records.", "Registration and record.", 0.9, 0.04, 1), role("marketer", "Marketer", "Marketer", "Brings in students.", "Dey bring student.", 0.9, 0.06, 2),
  ] : kind === "clinic" ? [
    role("doctor", "Doctor", "Doctor", "Diagnoses and treats. Needed to run a clinic.", "Dey diagnose and treat. Needed to run clinic.", 3, 0.16, 2, true), role("nurse", "Nurse", "Nurse", "Cares for patients.", "Dey care for patient.", 1.2, 0.09, 4, true), role("lab", "Lab scientist", "Lab scientist", "Tests and results.", "Test and result.", 1.3, 0.06, 1), role("admin", "Records and billing", "Records and billing", "Handles records, HMO claims and deposits.", "Dey handle record, HMO claim and deposit.", 0.9, 0.03, 1), CLEANER,
  ] : [
    role("trainer", "Personal trainer", "Personal trainer", "Coaches members. Popular trainers bring crowds.", "Dey coach member. Popular trainer bring crowd.", 1.1, 0.13, 3, true), role("front", "Front desk", "Front desk", "Memberships and the till.", "Membership and till.", 0.8, 0.05, 1), role("instructor", "Class instructor", "Class instructor", "Runs group classes.", "Dey run group class.", 1, 0.07, 2), CLEANER,
  ];
  return {
    intro: intro[kind],
    levers: [LOCATION(), ...levers, ADS(), POWER()],
    roles,
    start: kind === "school" ? ["teacher", "head"] : [roles[0].id],
    levels: lv(["Starter", "Starter"], ["Established", "Established"], ["Well known", "Well known"], ["Leading", "Leading"], ["Flagship", "Flagship"]),
    unit: kind === "school" ? ["classrooms", "classrooms"] : kind === "clinic" ? ["beds", "beds"] : kind === "gym" ? ["stations", "stations"] : ["classrooms", "classrooms"],
    actions: [
      act("expand", "Add a classroom, ward or floor", "Add classroom, ward or floor", "More capacity means more customers.", "More capacity mean more customer.", 0.15, { rev: 0.05, once: true }),
      act("accredit", "Get accreditation", "Get accreditation", "Official approval builds trust.", "Official approval build trust.", 0.08, { fame: 5, q: 3, once: true }),
      act("open", "Hold an open day", "Hold open day", "Parents and families see what you offer.", "Parent and family see wetin you offer.", 0.03, { fame: 4, gamble: { p: 0.55, back: 1.5 } }),
      act("training", "Train staff", "Train staff", "Skills and loyalty rise.", "Skill and loyalty rise.", 0.06, { q: 3, loyalty: 8, once: true }),
    ],
  };
}

function creativeProfile(kind: "tech" | "fintech" | "record" | "film" | "radio" | "realty" | "solar" | "mall" | "fuel"): Profile {
  const intros: Record<string, L> = {
    tech: ["Build product, find users, raise money. Burn rate and runway are everything.", "Build product, find user, raise money. Burn rate and runway na everything."],
    fintech: ["Wallets, cards and compliance. CBN rules and fraud teams decide survival.", "Wallet, card and compliance. CBN rule and fraud team decide survival."],
    record: ["Sign artists, make hits, share royalties. One hit pays for ten flops.", "Sign artist, make hit, share royalty. One hit pay for ten flop."],
    film: ["Scripts, cast and locations. Release dates and piracy decide profits.", "Script, cast and location. Release date and piracy decide profit."],
    radio: ["Ads, presenters and listeners. Programming wins audiences and sponsors.", "Ads, presenter and listener. Programming win audience and sponsor."],
    realty: ["Agents, listings and commissions. Trust and a pipeline of clients decide your year.", "Agent, listing and commission. Trust and pipeline of client decide your year."],
    solar: ["Quote, install, maintain. Large contracts need capital and credibility.", "Quote, install, maintain. Big contract need capital and credibility."],
    mall: ["Tenants, security and upkeep. Fill the units and keep the lifts working.", "Tenant, security and upkeep. Fill the unit and keep lift working."],
    fuel: ["Supply, pumps and queues. The pump price is regulated; supply and honesty are your edge.", "Supply, pump and queue. Pump price regulated; supply and honesty na your edge."],
  };
  const focus = lev("focus", kind === "tech" ? "Product focus" : kind === "fintech" ? "Product" : kind === "record" ? "Strategy" : kind === "film" ? "Slate" : kind === "radio" ? "Programming" : kind === "realty" ? "Market" : kind === "solar" ? "Customers" : kind === "mall" ? "Tenant mix" : "Brand", kind === "tech" ? "Product focus" : kind === "fintech" ? "Product" : kind === "record" ? "Strategy" : kind === "film" ? "Slate" : kind === "radio" ? "Programming" : kind === "realty" ? "Market" : kind === "solar" ? "Customers" : kind === "mall" ? "Tenant mix" : "Brand", "Stay narrow and safe, or chase scale and risk.", "Stay narrow and safe, or chase scale and risk.", [
    o("Niche and safe", "Niche and safe", { rev: 0.85, risk: 0.8, cost: 0.85 }), o("Balanced", "Balanced", {}), o("Go big", "Go big", { rev: 1.35, risk: 1.5, cost: 1.3, over: 0.02, fee: 0.06 }),
  ], 1);
  const roles: Role[] = kind === "tech" ? [
    role("dev", "Software developer", "Software developer", "Builds the product.", "Dey build the product.", 1.6, 0.14, 4, true), role("designer", "Designer", "Designer", "Makes it usable.", "Make am usable.", 1.3, 0.06, 1), role("sales", "Growth and sales", "Growth and sales", "Finds users and customers.", "Dey find user and customer.", 1.1, 0.08, 2), role("support", "Support", "Support", "Keeps users happy.", "Dey keep user happy.", 0.8, 0.04, 2),
  ] : kind === "fintech" ? [
    role("dev", "Engineer", "Engineer", "Builds and secures the platform.", "Dey build and secure platform.", 1.6, 0.13, 4, true), role("compliance", "Compliance officer", "Compliance officer", "Keeps CBN away from your door.", "Dey keep CBN away from your door.", 1.5, 0.05, 1, true), role("risk", "Fraud analyst", "Fraud analyst", "Catches bad actors.", "Dey catch bad actor.", 1.4, 0.06, 2), role("support", "Customer support", "Customer support", "Handles disputes.", "Dey handle dispute.", 0.8, 0.05, 3),
  ] : kind === "record" ? [
    role("producer", "Producer", "Producer", "Makes the beats and the hits.", "Dey make beat and hit.", 1.4, 0.13, 3, true), role("artist", "Signed artist", "Signed artist", "Brings the fans.", "Bring the fans.", 1.2, 0.11, 4), role("manager", "Marketing and PR", "Marketing and PR", "Gets songs on radio and playlists.", "Dey put song for radio and playlist.", 1, 0.07, 2), role("engineer", "Sound engineer", "Sound engineer", "Mixes and masters.", "Dey mix and master.", 1.1, 0.05, 1),
  ] : kind === "film" ? [
    role("director", "Director", "Director", "Leads the shoot.", "Dey lead shoot.", 1.8, 0.13, 2, true), role("actor", "Actor", "Actor", "Brings audiences.", "Bring audience.", 1.4, 0.1, 5), role("crew", "Crew", "Crew", "Camera, sound and lights.", "Camera, sound and light.", 0.9, 0.07, 5), role("editor", "Editor", "Editor", "Cuts the film.", "Dey cut the film.", 1.1, 0.05, 1),
  ] : kind === "radio" ? [
    role("presenter", "On-air presenter", "On-air presenter", "Loud, loved or both.", "Loud, loved or both.", 1.1, 0.12, 4, true), role("engineer", "Broadcast engineer", "Broadcast engineer", "Keeps the signal alive.", "Dey keep signal alive.", 1.3, 0.05, 1, true), role("sales", "Ad sales", "Ad sales", "Sells airtime to sponsors.", "Dey sell airtime to sponsor.", 1, 0.09, 3), role("producer", "Producer", "Producer", "Plans shows.", "Dey plan show.", 1, 0.05, 2),
  ] : kind === "realty" ? [
    role("agent", "Estate agent", "Estate agent", "Finds clients and closes deals.", "Dey find client and close deal.", 1, 0.14, 5, true), role("surveyor", "Valuer", "Valuer", "Gives credible valuations.", "Dey give credible valuation.", 1.4, 0.06, 1), role("lawyer", "Property lawyer", "Property lawyer", "Prevents land scams.", "Dey prevent land scam.", 1.6, 0.05, 1), role("marketer", "Marketer", "Marketer", "Listings and ads.", "Listing and advert.", 0.9, 0.05, 2),
  ] : kind === "solar" ? [
    role("installer", "Installer", "Installer", "Fits panels and inverters.", "Dey fit panel and inverter.", 1, 0.13, 5, true), role("engineer", "Solar engineer", "Solar engineer", "Designs systems.", "Dey design system.", 1.6, 0.07, 1), role("sales", "Sales", "Sales", "Wins quotes.", "Dey win quote.", 1, 0.07, 2),
  ] : kind === "mall" ? [
    role("manager", "Property manager", "Property manager", "Keeps tenants happy.", "Dey keep tenant happy.", 1.6, 0.08, 1, true), role("maint", "Maintenance", "Maintenance", "Lifts, generators and plumbing.", "Lift, generator and plumbing.", 1, 0.06, 4), role("security", "Security", "Security", "Guards the plaza.", "Dey guard plaza.", 0.8, 0.05, 4), role("cleaner", "Cleaning crew", "Cleaning crew", "Keeps it clean.", "Dey keep am clean.", 0.6, 0.03, 4),
  ] : [
    role("attendant", "Pump attendant", "Pump attendant", "Fuels vehicles.", "Dey fuel vehicle.", 0.8, 0.12, 6, true), role("manager", "Station manager", "Station manager", "Controls stock and cash.", "Dey control stock and cash.", 1.6, 0.06, 1, true), role("accounts", "Accounts", "Accounts", "Reconciles sales and supply.", "Dey reconcile sale and supply.", 1, 0.04, 1), GUARD,
  ];
  const pricing = kind === "fuel" ? lev("honesty", "Pump honesty", "Pump honesty", "Rigged pumps bring quick money and trouble when caught.", "Rigged pump bring quick money and trouble when dem catch you.", [o("Honest litres", "Honest litre", {}), o("Short-measure a little", "Short-measure small", { rev: 1.1, risk: 1.6, fame: -0.6 })], 0)
    : kind === "mall" ? lev("rent", "Rent policy", "Rent policy", "High rents bring income and empty units.", "High rent bring income and empty unit.", [o("Cheap rent, full units", "Cheap rent, full unit", { pm: 0.85 }), o("Market rent", "Market rent", { pm: 1 }), o("Premium rent", "Premium rent", { pm: 1.25, fame: -0.1 })], 1)
    : PRICE();
  return {
    intro: intros[kind],
    levers: [LOCATION(), focus, pricing, ADS(), POWER(), SECURITY()],
    roles,
    start: [roles[0].id],
    levels: lv(["Starter", "Starter"], ["Established", "Established"], ["Growing", "Growing"], ["Major", "Major"], ["Industry leader", "Industry leader"]),
    unit: kind === "fuel" ? ["pumps", "pumps"] : kind === "mall" ? ["units", "units"] : undefined,
    actions: [
      act("invest", "Invest in the core", "Invest for the core", "Better tools, systems and spaces.", "Better tool, system and space.", 0.1, { q: 6, rev: 0.03, once: true }),
      act("pr", "Launch a PR campaign", "Launch PR campaign", "Fame, free press and a few awkward interviews.", "Fame, free press and few awkward interview.", 0.04, { fame: 6, gamble: { p: 0.5, back: 1.4 } }),
      act("partner", "Sign a strategic partner", "Sign strategic partner", "A bigger name opens doors.", "Bigger name open door.", 0.06, { gamble: { p: 0.5, back: 2.2 }, fame: 2 }),
      act("team", "Team retreat and bonuses", "Team retreat and bonus", "People stay when they feel valued.", "People dey stay when dem feel say dem valuable.", 0.03, { loyalty: 15 }),
    ],
  };
}

const MAP: Record<string, () => Profile> = {
  akara: () => foodProfile("street"), mama_foods: () => foodProfile("street"),
  bukka: () => foodProfile("canteen"), restaurant: () => foodProfile("restaurant"),
  lounge: () => foodProfile("bar"), beerparlour: () => foodProfile("bar"), bakery: () => foodProfile("bakery"),
  pos: posProfile,
  barbing: () => beautyProfile("barbing"), salon: () => beautyProfile("salon"), spa: () => beautyProfile("spa"), makeupstudio: () => beautyProfile("makeupstudio"),
  hotel: () => hotelProfile("hotel"), eventcentre: () => hotelProfile("eventcentre"),
  provisions: () => retailProfile("shop"), supermarket: () => retailProfile("supermarket"), phoneshop: () => retailProfile("phones"), bookshop: () => retailProfile("books"),
  buildmat: () => retailProfile("building"), autospares: () => retailProfile("spares"), pharmacy: () => retailProfile("pharmacy"), ecommerce: () => retailProfile("online"), cardealer: () => retailProfile("cars"),
  carwash: () => workshopProfile("carwash"), autoshop: () => workshopProfile("auto"), cybercafe: () => workshopProfile("cyber"), borehole: () => workshopProfile("borehole"), solarco: () => creativeProfile("solar"), photostudio: () => workshopProfile("photo"),
  water: () => factoryProfile("water"), fashion: () => factoryProfile("fashion"), ricemill: () => factoryProfile("mill"), palmoil: () => factoryProfile("palm"), cassava: () => factoryProfile("cassava"), coldroom: () => factoryProfile("cold"), gasplant: () => factoryProfile("gas"),
  farm: () => farmProfile("farm"), poultry: () => farmProfile("poultry"), fishfarm: () => farmProfile("fish"),
  logistics: () => fleetProfile("logistics"), keke_fleet: () => fleetProfile("keke"), rentcar: () => fleetProfile("rental"),
  school: () => institutionProfile("school"), college: () => institutionProfile("college"), clinic: () => institutionProfile("clinic"), gym: () => institutionProfile("gym"),
  techstart: () => creativeProfile("tech"), fintech: () => creativeProfile("fintech"), recordlabel: () => creativeProfile("record"), filmhouse: () => creativeProfile("film"), radio: () => creativeProfile("radio"),
  realestate: () => creativeProfile("realty"), mall: () => creativeProfile("mall"), fuelstation: () => creativeProfile("fuel"),
};

/** Make each lever's default option neutral, so only the choices you change move the numbers. */
function normalise(p: Profile): Profile {
  for (const l of p.levers) {
    const d = l.opts[l.def];
    const rv = d.rev ?? 1, ct = d.cost ?? 1, rk = d.risk ?? 1, rn = d.rent ?? 1, ov = d.over ?? 0, fm = d.fame ?? 0, qq = d.q ?? 0;
    for (const x of l.opts) {
      if (x.rev !== undefined || rv !== 1) x.rev = (x.rev ?? 1) / rv;
      if (x.cost !== undefined || ct !== 1) x.cost = (x.cost ?? 1) / ct;
      if (x.risk !== undefined || rk !== 1) x.risk = (x.risk ?? 1) / rk;
      if (x.rent !== undefined || rn !== 1) x.rent = (x.rent ?? 1) / rn;
      if (x.over !== undefined || ov !== 0) x.over = (x.over ?? 0) - ov;
      if (x.fame !== undefined || fm !== 0) x.fame = (x.fame ?? 0) - fm;
      if (x.q !== undefined || qq !== 0) x.q = (x.q ?? 0) - qq;
    }
  }
  return p;
}

const cache: Record<string, Profile> = {};
export function profileOf(kindId: string): Profile {
  return (cache[kindId] ??= normalise((MAP[kindId] ?? generic)()));
}
