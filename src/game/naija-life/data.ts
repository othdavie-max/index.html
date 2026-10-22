import type { Edu, HoldingKind, HouseKind, Region, StateInfo } from "./types";

// ---------------------------------------------------------------------------
// States. opp = opportunity, cost = cost of living, risk = insecurity.
// ---------------------------------------------------------------------------
type Row = [id: string, name: string, region: Region, capital: string, opp: number, cost: number, risk: number];
const ROWS: Row[] = [
  ["abuja", "FCT Abuja", "North Central", "Abuja", 10, 1.8, 4],
  ["lagos", "Lagos", "South West", "Ikeja", 10, 1.9, 5],
  ["rivers", "Rivers", "South South", "Port Harcourt", 8, 1.5, 6],
  ["kano", "Kano", "North West", "Kano", 7, 1.0, 4],
  ["oyo", "Oyo", "South West", "Ibadan", 6, 1.0, 3],
  ["kaduna", "Kaduna", "North West", "Kaduna", 6, 1.0, 7],
  ["enugu", "Enugu", "South East", "Enugu", 6, 0.9, 4],
  ["anambra", "Anambra", "South East", "Awka", 7, 1.1, 5],
  ["delta", "Delta", "South South", "Asaba", 6, 1.1, 6],
  ["edo", "Edo", "South South", "Benin City", 5, 0.9, 5],
  ["ogun", "Ogun", "South West", "Abeokuta", 6, 1.1, 4],
  ["imo", "Imo", "South East", "Owerri", 5, 0.9, 5],
  ["plateau", "Plateau", "North Central", "Jos", 5, 0.9, 5],
  ["kwara", "Kwara", "North Central", "Ilorin", 5, 0.8, 3],
  ["osun", "Osun", "South West", "Osogbo", 4, 0.7, 3],
  ["ondo", "Ondo", "South West", "Akure", 4, 0.8, 5],
  ["ekiti", "Ekiti", "South West", "Ado-Ekiti", 4, 0.7, 3],
  ["cross-river", "Cross River", "South South", "Calabar", 4, 0.8, 3],
  ["akwa-ibom", "Akwa Ibom", "South South", "Uyo", 5, 1.0, 4],
  ["bayelsa", "Bayelsa", "South South", "Yenagoa", 4, 0.9, 6],
  ["abia", "Abia", "South East", "Umuahia", 5, 0.9, 4],
  ["ebonyi", "Ebonyi", "South East", "Abakaliki", 3, 0.6, 3],
  ["benue", "Benue", "North Central", "Makurdi", 3, 0.7, 7],
  ["nasarawa", "Nasarawa", "North Central", "Lafia", 4, 0.8, 6],
  ["kogi", "Kogi", "North Central", "Lokoja", 3, 0.7, 7],
  ["niger", "Niger", "North Central", "Minna", 3, 0.6, 7],
  ["katsina", "Katsina", "North West", "Katsina", 3, 0.6, 6],
  ["zamfara", "Zamfara", "North West", "Gusau", 2, 0.5, 9],
  ["sokoto", "Sokoto", "North West", "Sokoto", 3, 0.6, 6],
  ["kebbi", "Kebbi", "North West", "Birnin Kebbi", 2, 0.5, 6],
  ["jigawa", "Jigawa", "North West", "Dutse", 2, 0.5, 4],
  ["bauchi", "Bauchi", "North East", "Bauchi", 3, 0.6, 5],
  ["gombe", "Gombe", "North East", "Gombe", 3, 0.6, 4],
  ["adamawa", "Adamawa", "North East", "Yola", 3, 0.6, 6],
  ["taraba", "Taraba", "North East", "Jalingo", 2, 0.6, 7],
  ["borno", "Borno", "North East", "Maiduguri", 2, 0.6, 9],
  ["yobe", "Yobe", "North East", "Damaturu", 2, 0.5, 7],
];

export const STATES: StateInfo[] = [
  ...ROWS.map(([id, name, region, capital, opp, cost, risk]) => ({ id, name, region, capital, opp, cost, risk })),
  { id: "abroad", name: "Abroad (Japa)", region: "South West", capital: "London", opp: 10, cost: 2.6, risk: 1, abroad: true },
];

export const STATE_BY_ID: Record<string, StateInfo> = Object.fromEntries(STATES.map((s) => [s.id, s]));
export const TRAVEL_STATES = STATES.filter((s) => !s.abroad);

// Birth lottery: most Nigerians are not born in Abuja.
const BIRTH_BOOST: Record<string, number> = {
  kano: 9, lagos: 9, kaduna: 8, oyo: 6, rivers: 6, katsina: 6, bauchi: 5, jigawa: 5, benue: 5, anambra: 5,
  borno: 5, delta: 5, niger: 6, imo: 4, "akwa-ibom": 5, ogun: 5, sokoto: 5, zamfara: 5, abuja: 3,
};
export function birthWeight(id: string): number {
  return BIRTH_BOOST[id] ?? 3;
}

export function travelCost(from: StateInfo, to: StateInfo): number {
  if (from.id === to.id) return 0;
  if (from.region === to.region) return 45_000;
  if (to.id === "abuja" || from.id === "abuja") return 90_000;
  return 150_000;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------
export const TRIBES_BY_REGION: Record<Region, string[]> = {
  "North Central": ["Tiv", "Nupe", "Gbagyi", "Igala", "Idoma", "Berom", "Hausa"],
  "North East": ["Kanuri", "Fulani", "Hausa", "Bura"],
  "North West": ["Hausa", "Fulani"],
  "South East": ["Igbo"],
  "South South": ["Ijaw", "Edo", "Efik", "Urhobo", "Ibibio"],
  "South West": ["Yoruba"],
};
export const ALL_TRIBES = ["Hausa", "Fulani", "Yoruba", "Igbo", "Tiv", "Nupe", "Gbagyi", "Igala", "Idoma", "Berom", "Kanuri", "Bura", "Ijaw", "Edo", "Efik", "Urhobo", "Ibibio"];

export const RELIGIONS = ["Christian", "Muslim", "Traditional"];
export function defaultReligion(region: Region): string {
  const north = region === "North West" || region === "North East";
  const r = Math.random();
  if (north) return r < 0.85 ? "Muslim" : r < 0.97 ? "Christian" : "Traditional";
  if (region === "North Central") return r < 0.5 ? "Christian" : r < 0.97 ? "Muslim" : "Traditional";
  if (region === "South West") return r < 0.5 ? "Christian" : r < 0.97 ? "Muslim" : "Traditional";
  return r < 0.95 ? "Christian" : "Traditional";
}

type NamePool = { male: string[]; female: string[]; surnames: string[] };
const POOLS: Record<string, NamePool> = {
  north: {
    male: ["Musa", "Aminu", "Ibrahim", "Sani", "Yusuf", "Abubakar", "Garba", "Bello", "Usman"],
    female: ["Fatima", "Zainab", "Hauwa", "Aisha", "Maryam", "Hadiza", "Rakiya", "Amina"],
    surnames: ["Danjuma", "Bako", "Lawal", "Mohammed", "Abdullahi", "Suleiman", "Shehu", "Sule"],
  },
  yoruba: {
    male: ["Tunde", "Seun", "Femi", "Kunle", "Bayo", "Dayo", "Segun", "Lekan"],
    female: ["Bisi", "Funke", "Yetunde", "Folake", "Tolani", "Sade", "Titi", "Kemi"],
    surnames: ["Adeyemi", "Balogun", "Ogunleye", "Adebayo", "Akinola", "Oladipo", "Fashola", "Ajayi"],
  },
  igbo: {
    male: ["Chidi", "Emeka", "Obinna", "Ifeanyi", "Nnamdi", "Uche", "Kelechi", "Chuka"],
    female: ["Ngozi", "Chioma", "Adaeze", "Nneka", "Ify", "Amara", "Ebere", "Obiageli"],
    surnames: ["Okafor", "Nwosu", "Eze", "Obi", "Okeke", "Nnaji", "Umeh", "Chukwu"],
  },
  south: {
    male: ["Efe", "Tamuno", "Etim", "Ebi", "Ibinabo", "Ovie", "Ekong", "Preye"],
    female: ["Ibiere", "Ekaette", "Tonye", "Omone", "Iniobong", "Ofonime", "Ufuoma", "Ebiere"],
    surnames: ["Ekpo", "Okonkwo", "Duke", "Etuk", "Amadi", "Ogbe", "Eyo", "Bassey"],
  },
  central: {
    male: ["Terver", "Aondoakaa", "Ocheni", "Audu", "Emmanuel", "Agbo", "Gideon", "Danladi"],
    female: ["Mbalumun", "Ene", "Hembadoon", "Blessing", "Ladi", "Patience", "Jummai", "Rhoda"],
    surnames: ["Iorkyaa", "Ochigbo", "Attah", "Achimugu", "Gyang", "Dogo", "Agu", "Orkar"],
  },
};
export function poolFor(tribe: string): NamePool {
  if (["Hausa", "Fulani", "Kanuri", "Bura", "Nupe"].includes(tribe)) return POOLS.north;
  if (tribe === "Yoruba") return POOLS.yoruba;
  if (tribe === "Igbo") return POOLS.igbo;
  if (["Ijaw", "Edo", "Efik", "Urhobo", "Ibibio"].includes(tribe)) return POOLS.south;
  return POOLS.central;
}

export const COURSES = ["Medicine", "Law", "Engineering", "Computer Science", "Accounting", "Mass Communication", "Education", "Arts"];

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------
export interface Rung {
  title: string;
  pay: number;
  /** Self-employed: cost to expand to the next rung. */
  upgrade?: number;
}
export type JobGroup = "petty" | "formal" | "creative" | "crime";
export interface JobDef {
  id: string;
  title: string;
  group: JobGroup;
  selfEmployed: boolean;
  startCost: number;
  minAge: number;
  edu: Edu;
  courses?: string[];
  minOpp: number;
  ladder: Rung[];
  blurb: string;
}

function ladder(names: string[], base: number, growth: number): Rung[] {
  return names.map((title, i) => {
    const pay = Math.round(base * Math.pow(growth * 0.84, i));
    return { title, pay, upgrade: i < names.length - 1 ? Math.round(pay * 1.1) : undefined };
  });
}
function fixed(rows: [string, number][]): Rung[] {
  return rows.map(([title, pay]) => ({ title, pay }));
}

export const JOBS: JobDef[] = [
  // ---- Self-employed hustle: you can scale these ----
  { id: "akara", title: "Akara Seller", group: "petty", selfEmployed: true, startCost: 80_000, minAge: 14, edu: "none", minOpp: 1,
    blurb: "Fry bean cake by the roadside. Hard, hot, and you can grow it into a brand.",
    ladder: ladder(["Roadside akara frying", "Akara stand + 2 helpers", "Akara & pap joint (mama put)", "3 outlets across town", "Packaged akara brand", "Akara FMCG empire"], 600_000, 3.4) },
  { id: "corn", title: "Roasted Corn & Ube Seller", group: "petty", selfEmployed: true, startCost: 60_000, minAge: 12, edu: "none", minOpp: 1,
    blurb: "Charcoal, corn and pepper. Rain is your enemy.",
    ladder: ladder(["Corn on the roadside", "Corn + ube stand", "Corn & plantain joint", "Roadside fast-food spot", "Regional snack chain"], 450_000, 3.0) },
  { id: "purewater", title: "Pure Water Producer", group: "petty", selfEmployed: true, startCost: 150_000, minAge: 16, edu: "none", minOpp: 1,
    blurb: "From selling sachets to running a water factory.",
    ladder: ladder(["Hawk sachet water", "Small water-bagging shed", "Water factory", "Bottled water brand", "Water & beverage company"], 500_000, 3.2) },
  { id: "pos", title: "POS Agent", group: "petty", selfEmployed: true, startCost: 300_000, minAge: 16, edu: "none", minOpp: 2,
    blurb: "Withdrawals, transfers, and 'network don fail' excuses.",
    ladder: ladder(["Umbrella POS", "POS kiosk", "Multi-terminal shop", "Fintech agent network", "Agent banking company"], 700_000, 3.0) },
  { id: "suya", title: "Suya Spot Owner", group: "petty", selfEmployed: true, startCost: 120_000, minAge: 16, edu: "none", minOpp: 1,
    blurb: "Night-time money. Extra onions, extra yaji.",
    ladder: ladder(["Suya on the grill stand", "Suya spot", "Suya & grill joint", "Suya franchise", "National suya brand"], 700_000, 3.2) },
  { id: "thrift", title: "Thrift Clothes Trader", group: "petty", selfEmployed: true, startCost: 200_000, minAge: 15, edu: "none", minOpp: 2,
    blurb: "Okrika bales. Fine gals and boys will pay for 'UK used'.",
    ladder: ladder(["Okrika stall", "Thrift shop", "Online + shop thrift store", "Fashion boutique", "Fashion brand"], 600_000, 3.0) },
  { id: "barber", title: "Barber", group: "petty", selfEmployed: true, startCost: 150_000, minAge: 14, edu: "none", minOpp: 1,
    blurb: "Clippers, gossip, and Premier League arguments.",
    ladder: ladder(["Roadside barber", "Barbing shop", "Grooming lounge", "Grooming chain", "Barber-to-the-stars brand"], 550_000, 2.8) },
  { id: "tailor", title: "Tailor / Fashion Designer", group: "petty", selfEmployed: true, startCost: 250_000, minAge: 14, edu: "none", minOpp: 1,
    blurb: "Aso-ebi season will either make you or kill you.",
    ladder: ladder(["Apprentice with a machine", "Tailor shop", "Fashion house", "Bridal & aso-ebi brand", "Luxury fashion label"], 600_000, 3.0) },
  { id: "salon", title: "Hairdresser", group: "petty", selfEmployed: true, startCost: 250_000, minAge: 14, edu: "none", minOpp: 1,
    blurb: "Braids, weaves, and customers who 'will pay tomorrow'.",
    ladder: ladder(["Home-service braids", "Small salon", "Beauty salon", "Beauty parlour chain", "Beauty & wig brand"], 600_000, 3.0) },
  { id: "phone", title: "Phone Repairer", group: "petty", selfEmployed: true, startCost: 350_000, minAge: 15, edu: "none", minOpp: 2,
    blurb: "'Is the screen original?' Always.",
    ladder: ladder(["Table-side repairs", "Phone repair shop", "Phones & accessories mall shop", "Phone importer", "Phone distribution company"], 800_000, 2.8) },
  { id: "mechanic", title: "Auto Mechanic", group: "petty", selfEmployed: true, startCost: 300_000, minAge: 15, edu: "none", minOpp: 1,
    blurb: "Oga, the car don knock engine.",
    ladder: ladder(["Roadside mechanic", "Garage", "Auto workshop", "Dealership + garage", "Auto group"], 900_000, 2.8) },
  { id: "keke", title: "Okada / Keke Owner", group: "petty", selfEmployed: true, startCost: 900_000, minAge: 18, edu: "none", minOpp: 2,
    blurb: "Own the bike and the road. Mind the LASTMA / task force.",
    ladder: ladder(["Okada rider", "Keke owner", "Keke fleet (5)", "Transport company", "Mass-transit company"], 900_000, 2.6) },
  { id: "provisions", title: "Provision Store Owner", group: "petty", selfEmployed: true, startCost: 400_000, minAge: 16, edu: "none", minOpp: 1,
    blurb: "Indomie, Peak milk and credit sales.",
    ladder: ladder(["Kiosk", "Provision store", "Mini supermarket", "Supermarket", "Supermarket chain"], 650_000, 3.0) },
  // ---- Employed petty ----
  { id: "conductor", title: "Bus Conductor", group: "petty", selfEmployed: false, startCost: 0, minAge: 16, edu: "none", minOpp: 1,
    blurb: "'Oshodi! Oshodi! Ojota! Change your change!'",
    ladder: fixed([["Conductor", 500_000], ["Bus driver", 1_100_000], ["Park chairman", 3_200_000]]) },
  { id: "guard", title: "Security Guard (Mai Guard)", group: "petty", selfEmployed: false, startCost: 0, minAge: 18, edu: "none", minOpp: 1,
    blurb: "Night shifts, a torch and a plastic chair.",
    ladder: fixed([["Security guard", 480_000], ["Head of guards", 900_000], ["Security supervisor", 1_800_000]]) },
  { id: "rideapp", title: "Bolt / Uber Driver", group: "petty", selfEmployed: false, startCost: 0, minAge: 21, edu: "secondary", minOpp: 5,
    blurb: "The app takes its cut and fuel takes the rest.",
    ladder: fixed([["Ride-hailing driver", 1_500_000], ["Top-rated driver", 2_400_000], ["Fleet partner", 5_500_000]]) },
  { id: "attendant", title: "Shop Attendant", group: "petty", selfEmployed: false, startCost: 0, minAge: 16, edu: "primary", minOpp: 1,
    blurb: "Sell for your oga and pray salary comes on time.",
    ladder: fixed([["Shop attendant", 420_000], ["Shop manager", 1_000_000], ["Store supervisor", 2_200_000]]) },
  // ---- Formal ----
  { id: "teacher", title: "Teacher", group: "formal", selfEmployed: false, startCost: 0, minAge: 21, edu: "tertiary", minOpp: 1,
    blurb: "Shaping minds on a salary that arrives 'soon'.", courses: ["Education", "Arts", "Mass Communication"],
    ladder: fixed([["Teacher", 1_200_000], ["Senior teacher", 2_200_000], ["Vice principal", 4_000_000], ["Principal", 7_000_000]]) },
  { id: "nurse", title: "Nurse", group: "formal", selfEmployed: false, startCost: 0, minAge: 21, edu: "tertiary", minOpp: 2,
    blurb: "Overworked, underpaid, and already planning Japa.",
    ladder: fixed([["Staff nurse", 2_000_000], ["Senior nurse", 3_500_000], ["Matron", 6_500_000]]) },
  { id: "doctor", title: "Doctor", group: "formal", selfEmployed: false, startCost: 0, minAge: 24, edu: "tertiary", courses: ["Medicine"], minOpp: 3,
    blurb: "Everyone's mother's favourite job.",
    ladder: fixed([["House officer", 3_000_000], ["Medical officer", 6_500_000], ["Consultant", 16_000_000], ["Chief medical director", 30_000_000]]) },
  { id: "lawyer", title: "Lawyer", group: "formal", selfEmployed: false, startCost: 0, minAge: 24, edu: "tertiary", courses: ["Law"], minOpp: 3,
    blurb: "'My Lord, I humbly submit.' Adjournment is your best friend.",
    ladder: fixed([["Junior associate", 2_500_000], ["Associate", 5_500_000], ["Senior counsel", 14_000_000], ["SAN", 35_000_000]]) },
  { id: "engineer", title: "Engineer", group: "formal", selfEmployed: false, startCost: 0, minAge: 23, edu: "tertiary", courses: ["Engineering"], minOpp: 3,
    blurb: "Fix generators, roads, and everything in between.",
    ladder: fixed([["Graduate engineer", 3_000_000], ["Project engineer", 6_500_000], ["Senior engineer", 13_000_000], ["Engineering director", 28_000_000]]) },
  { id: "dev", title: "Software Developer", group: "formal", selfEmployed: false, startCost: 0, minAge: 21, edu: "tertiary", courses: ["Computer Science", "Engineering"], minOpp: 5,
    blurb: "Remote dollars, Lagos traffic, and no light.",
    ladder: fixed([["Junior developer", 3_500_000], ["Developer", 9_000_000], ["Senior developer", 22_000_000], ["Engineering lead", 45_000_000]]) },
  { id: "banker", title: "Banker", group: "formal", selfEmployed: false, startCost: 0, minAge: 22, edu: "tertiary", courses: ["Accounting", "Law", "Arts", "Mass Communication", "Engineering", "Computer Science", "Education"], minOpp: 4,
    blurb: "Targets, targets, targets. Bring in deposits or bring your CV.",
    ladder: fixed([["Customer service rep", 2_200_000], ["Relationship manager", 5_000_000], ["Branch manager", 11_000_000], ["Executive director", 40_000_000]]) },
  { id: "accountant", title: "Accountant", group: "formal", selfEmployed: false, startCost: 0, minAge: 22, edu: "tertiary", courses: ["Accounting"], minOpp: 3,
    blurb: "Balancing books while the boss balances friends.",
    ladder: fixed([["Junior accountant", 2_200_000], ["Accountant", 4_800_000], ["Finance manager", 10_000_000], ["CFO", 30_000_000]]) },
  { id: "civil", title: "Civil Servant", group: "formal", selfEmployed: false, startCost: 0, minAge: 20, edu: "secondary", minOpp: 2,
    blurb: "Pension, stability, and files that move only with 'something small'.",
    ladder: fixed([["Clerk", 1_300_000], ["Executive officer", 2_400_000], ["Director", 5_500_000], ["Permanent secretary", 12_000_000]]) },
  { id: "oil", title: "Oil & Gas Worker", group: "formal", selfEmployed: false, startCost: 0, minAge: 23, edu: "tertiary", courses: ["Engineering", "Accounting", "Computer Science"], minOpp: 6,
    blurb: "Dollar allowances and fat paychecks, if you know someone.",
    ladder: fixed([["Graduate trainee", 6_000_000], ["Process engineer", 15_000_000], ["Operations manager", 35_000_000], ["General manager", 80_000_000]]) },
  { id: "police", title: "Police Officer", group: "formal", selfEmployed: false, startCost: 0, minAge: 20, edu: "secondary", minOpp: 1,
    blurb: "'Wetin you carry for me?' ... allegedly.",
    ladder: fixed([["Constable", 1_100_000], ["Inspector", 2_600_000], ["Superintendent", 6_000_000], ["Commissioner", 14_000_000]]) },
  { id: "soldier", title: "Soldier", group: "formal", selfEmployed: false, startCost: 0, minAge: 20, edu: "secondary", minOpp: 1,
    blurb: "Defending the nation, one barracks at a time.",
    ladder: fixed([["Private", 1_200_000], ["Sergeant", 2_600_000], ["Captain", 6_500_000], ["General", 20_000_000]]) },
  { id: "journalist", title: "Journalist", group: "formal", selfEmployed: false, startCost: 0, minAge: 21, edu: "tertiary", courses: ["Mass Communication", "Arts"], minOpp: 3,
    blurb: "Stories, brown envelopes, and press freedom.",
    ladder: fixed([["Reporter", 1_500_000], ["Senior reporter", 3_200_000], ["Editor", 7_000_000], ["Editor-in-chief", 16_000_000]]) },
  // ---- Creative: slow burn, huge upside ----
  { id: "actor", title: "Nollywood Actor", group: "creative", selfEmployed: false, startCost: 0, minAge: 17, edu: "secondary", minOpp: 5,
    blurb: "Auditions, wigs and screaming 'WHYYYY!' on camera.",
    ladder: fixed([["Extra", 400_000], ["Supporting actor", 2_500_000], ["Lead actor", 14_000_000], ["Nollywood star", 70_000_000], ["Pan-African icon", 250_000_000]]) },
  { id: "singer", title: "Afrobeats Artist", group: "creative", selfEmployed: false, startCost: 0, minAge: 16, edu: "none", minOpp: 5,
    blurb: "One hit song away from a different life.",
    ladder: fixed([["Open-mic singer", 300_000], ["Local artist", 2_000_000], ["Rising star", 18_000_000], ["Chart-topper", 120_000_000], ["Global Afrobeats star", 600_000_000]]) },
  { id: "creator", title: "Content Creator / Skit Maker", group: "creative", selfEmployed: false, startCost: 0, minAge: 14, edu: "none", minOpp: 3,
    blurb: "Ring light, data and a dream to go viral.",
    ladder: fixed([["Tiny audience", 200_000], ["Rising creator", 2_200_000], ["Brand deals", 12_000_000], ["Viral sensation", 60_000_000], ["Mega influencer", 220_000_000]]) },
  // ---- Crime ----
  { id: "yahoo", title: "Yahoo Boy (Online Fraud)", group: "crime", selfEmployed: false, startCost: 0, minAge: 17, edu: "none", minOpp: 2,
    blurb: "Easy money until EFCC knocks on the door.",
    ladder: fixed([["Small-time scammer", 1_200_000], ["Mid-level scammer", 5_000_000], ["Big-time fraudster", 18_000_000]]) },
  { id: "kidnapper", title: "Highway Kidnapper (Gang)", group: "crime", selfEmployed: false, startCost: 0, minAge: 18, edu: "none", minOpp: 1,
    blurb: "Dangerous, violent, and very likely to end badly.",
    ladder: fixed([["Lookout", 1_800_000], ["Gang member", 7_000_000], ["Commander", 25_000_000]]) },
];
export const JOB_BY_ID: Record<string, JobDef> = Object.fromEntries(JOBS.map((j) => [j.id, j]));

export function payMult(job: JobDef, st: StateInfo): number {
  switch (job.group) {
    case "formal": return 0.55 + 0.1 * st.opp;
    case "petty": return 0.7 + 0.09 * st.opp;
    case "creative": return 0.5 + 0.1 * st.opp;
    default: return 0.8 + 0.04 * st.opp;
  }
}

// ---------------------------------------------------------------------------
// Houses
// ---------------------------------------------------------------------------
export const HOUSE_KINDS: Record<HouseKind, { label: string; build: number; rent: number }> = {
  bungalow: { label: "Bungalow", build: 10_000_000, rent: 1_100_000 },
  duplex: { label: "Duplex", build: 35_000_000, rent: 3_500_000 },
  flats: { label: "Block of flats", build: 90_000_000, rent: 9_000_000 },
};

// ---------------------------------------------------------------------------
// Politics
// ---------------------------------------------------------------------------
export interface Office {
  title: string;
  /** Base cost of contesting. */
  cost: number;
  /** Base yearly legit pay + allowances. */
  salary: number;
  /** Scale of the budget you control (drives loot and impact). */
  scale: number;
  minConnections: number;
  term: number;
}
export const OFFICES: Office[] = [
  { title: "Councillor", cost: 3_000_000, salary: 4_000_000, scale: 30_000_000, minConnections: 15, term: 3 },
  { title: "LG Chairman", cost: 25_000_000, salary: 25_000_000, scale: 300_000_000, minConnections: 25, term: 3 },
  { title: "House of Reps Member", cost: 150_000_000, salary: 120_000_000, scale: 2_000_000_000, minConnections: 40, term: 4 },
  { title: "Senator", cost: 400_000_000, salary: 260_000_000, scale: 8_000_000_000, minConnections: 55, term: 4 },
  { title: "Governor", cost: 1_200_000_000, salary: 600_000_000, scale: 40_000_000_000, minConnections: 70, term: 4 },
  { title: "President", cost: 6_000_000_000, salary: 2_000_000_000, scale: 300_000_000_000, minConnections: 85, term: 4 },
];

// ---------------------------------------------------------------------------
// Where the big money goes
// ---------------------------------------------------------------------------
export interface Luxury {
  id: string;
  label: string;
  desc: string;
  /** Base cost (multiplied by the price index). */
  cost: number;
  /** Yearly upkeep (multiplied by the price index). */
  upkeep?: number;
  prestige: number;
  reputation?: number;
  connections?: number;
  happiness?: number;
  good?: boolean;
  once: boolean;
  minWealth?: number;
  /** Multiplier on kidnap risk while owned. */
  safety?: number;
}
export const LUXURIES: Luxury[] = [
  { id: "borehole", label: "Sink boreholes for your community", desc: "Clean water. The village will sing your name.", cost: 8_000_000, prestige: 1, reputation: 5, good: true, once: false },
  { id: "owambe", label: "Throw a mega owambe (spray the naira)", desc: "Aso-ebi, live band, and a DJ who calls your name 40 times.", cost: 5_000_000, prestige: 1, reputation: 4, connections: 3, happiness: 8, once: false },
  { id: "praise", label: "Hire praise singers & hype men", desc: "A man with a mic who will say you're 'Alhaji of the year'.", cost: 2_000_000, prestige: 1, reputation: 3, happiness: 4, once: false },
  { id: "bodyguards", label: "Private security team", desc: "Big men in black. Lower kidnap risk every year.", cost: 25_000_000, upkeep: 15_000_000, prestige: 1, once: true, safety: 0.55 },
  { id: "title", label: "Buy a chieftaincy title", desc: "Chief, Otunba, Ezeji, Dr. (honoris causa). Money gets you titles.", cost: 15_000_000, prestige: 3, reputation: 8, connections: 5, once: true },
  { id: "foundation", label: "Start a foundation", desc: "Scholarships, free surgeries, and good headlines.", cost: 60_000_000, upkeep: 8_000_000, prestige: 4, reputation: 14, good: true, once: true },
  { id: "schools", label: "Fund 10 village schools", desc: "Real classrooms and real teachers. A legacy people remember.", cost: 120_000_000, prestige: 4, reputation: 10, good: true, once: false },
  { id: "convoy", label: "Land Cruiser convoy + escorts", desc: "Sirens, tinted glass, and traffic that opens like the Red Sea.", cost: 40_000_000, upkeep: 8_000_000, prestige: 3, reputation: 2, once: true, safety: 0.6 },
  { id: "mansion", label: "Mansion in Banana Island / Maitama", desc: "Marble floors, gold taps, a generator the size of a bus.", cost: 600_000_000, upkeep: 20_000_000, prestige: 8, happiness: 10, once: true, minWealth: 400_000_000 },
  { id: "dubai", label: "Property in Dubai", desc: "A penthouse where nobody asks questions.", cost: 400_000_000, prestige: 5, happiness: 5, once: true, minWealth: 300_000_000 },
  { id: "london", label: "London townhouse", desc: "For the kids' school runs and your 'medical check-ups'.", cost: 650_000_000, prestige: 6, happiness: 6, once: true, minWealth: 500_000_000 },
  { id: "jet", label: "Private jet", desc: "Skip every checkpoint on earth. Fuel costs more than the plane.", cost: 800_000_000, upkeep: 120_000_000, prestige: 10, reputation: -2, happiness: 8, once: true, minWealth: 700_000_000, safety: 0.4 },
  { id: "club", label: "Buy a football club", desc: "Win the league, or at least own the stadium.", cost: 1_200_000_000, upkeep: 150_000_000, prestige: 9, reputation: 10, connections: 6, once: true, minWealth: 1_000_000_000 },
  { id: "university", label: "Build a private university", desc: "Your name on every building. Fees pay for the next one.", cost: 20_000_000_000, upkeep: 600_000_000, prestige: 14, reputation: 12, good: true, once: true, minWealth: 15_000_000_000 },
  { id: "hajj", label: "Sponsor 1,000 people for Hajj / pilgrimage", desc: "Prayers from a thousand mouths. Very good press.", cost: 1_500_000_000, prestige: 6, reputation: 16, good: true, once: false, minWealth: 1_000_000_000 },
  { id: "godfather", label: "Pay homage to a political godfather", desc: "The right handshake opens the right doors.", cost: 100_000_000, prestige: 1, connections: 10, once: false },
];

export interface InvestOption {
  kind: HoldingKind;
  label: string;
  desc: string;
  min: number;
}
export const INVESTMENTS: InvestOption[] = [
  { kind: "usd", label: "Dollar savings", desc: "Hedge against naira crashes. Safe, steady.", min: 500_000 },
  { kind: "stocks", label: "NGX stocks", desc: "Banks and cement. Moderate risk.", min: 1_000_000 },
  { kind: "crypto", label: "Crypto / 'high-yield' platforms", desc: "To the moon... or to zero. Rug pulls are real.", min: 500_000 },
  { kind: "farm", label: "Commercial farm", desc: "Food never goes out of fashion. Bandits and floods might.", min: 5_000_000 },
  { kind: "oil", label: "Marginal oil field stake", desc: "Huge returns, huge risk, huge politics.", min: 300_000_000 },
  { kind: "school", label: "Private school chain", desc: "Steady fees. Parents always find a way.", min: 20_000_000 },
  { kind: "bank", label: "Buy a stake in a bank", desc: "Slow, very stable returns and plenty of prestige.", min: 5_000_000_000 },
];
