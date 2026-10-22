import type { Edu, HoldingKind, HouseKind, Region, StateInfo } from "./types";
import { rng, T } from "./util";

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
  const r = rng();
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
    get blurb() { return T("Fry bean cake by the roadside. Hard, hot, and you can grow it into a brand.", "Dey fry akara for roadside. Hard work, hot fire, but you fit grow am reach big brand."); },
    ladder: ladder(["Roadside akara frying", "Akara stand + 2 helpers", "Akara & pap joint (mama put)", "3 outlets across town", "Packaged akara brand", "Akara FMCG empire"], 600_000, 3.4) },
  { id: "corn", title: "Roasted Corn & Ube Seller", group: "petty", selfEmployed: true, startCost: 60_000, minAge: 12, edu: "none", minOpp: 1,
    get blurb() { return T("Charcoal, corn and pepper. Rain is your enemy.", "Charcoal, corn and pepper. Rain na your number one enemy."); },
    ladder: ladder(["Corn on the roadside", "Corn + ube stand", "Corn & plantain joint", "Roadside fast-food spot", "Regional snack chain"], 450_000, 3.0) },
  { id: "purewater", title: "Pure Water Producer", group: "petty", selfEmployed: true, startCost: 150_000, minAge: 16, edu: "none", minOpp: 1,
    get blurb() { return T("From selling sachets to running a water factory.", "From hawking pure water for road to owning water factory."); },
    ladder: ladder(["Hawk sachet water", "Small water-bagging shed", "Water factory", "Bottled water brand", "Water & beverage company"], 500_000, 3.2) },
  { id: "pos", title: "POS Agent", group: "petty", selfEmployed: true, startCost: 300_000, minAge: 16, edu: "none", minOpp: 2,
    get blurb() { return T("Withdrawals, transfers, and 'network don fail' excuses.", "Withdrawals, transfers, and 'network don fail' excuses every day."); },
    ladder: ladder(["Umbrella POS", "POS kiosk", "Multi-terminal shop", "Fintech agent network", "Agent banking company"], 700_000, 3.0) },
  { id: "suya", title: "Suya Spot Owner", group: "petty", selfEmployed: true, startCost: 120_000, minAge: 16, edu: "none", minOpp: 1,
    get blurb() { return T("Night-time money. Extra onions, extra yaji.", "Night-time money. Add extra onion, add extra yaji."); },
    ladder: ladder(["Suya on the grill stand", "Suya spot", "Suya & grill joint", "Suya franchise", "National suya brand"], 700_000, 3.2) },
  { id: "thrift", title: "Thrift Clothes Trader", group: "petty", selfEmployed: true, startCost: 200_000, minAge: 15, edu: "none", minOpp: 2,
    get blurb() { return T("Okrika bales. Fine gals and boys will pay for 'UK used'.", "Okrika bales. Fine gals and boys go pay well for 'UK used'."); },
    ladder: ladder(["Okrika stall", "Thrift shop", "Online + shop thrift store", "Fashion boutique", "Fashion brand"], 600_000, 3.0) },
  { id: "barber", title: "Barber", group: "petty", selfEmployed: true, startCost: 150_000, minAge: 14, edu: "none", minOpp: 1,
    get blurb() { return T("Clippers, gossip, and Premier League arguments.", "Clippers, gist, and Premier League wahala."); },
    ladder: ladder(["Roadside barber", "Barbing shop", "Grooming lounge", "Grooming chain", "Barber-to-the-stars brand"], 550_000, 2.8) },
  { id: "tailor", title: "Tailor / Fashion Designer", group: "petty", selfEmployed: true, startCost: 250_000, minAge: 14, edu: "none", minOpp: 1,
    get blurb() { return T("Aso-ebi season will either make you or kill you.", "Aso-ebi season fit make you or kill you."); },
    ladder: ladder(["Apprentice with a machine", "Tailor shop", "Fashion house", "Bridal & aso-ebi brand", "Luxury fashion label"], 600_000, 3.0) },
  { id: "salon", title: "Hairdresser", group: "petty", selfEmployed: true, startCost: 250_000, minAge: 14, edu: "none", minOpp: 1,
    get blurb() { return T("Braids, weaves, and customers who 'will pay tomorrow'.", "Braids, weave, and customers wey go 'pay tomorrow'."); },
    ladder: ladder(["Home-service braids", "Small salon", "Beauty salon", "Beauty parlour chain", "Beauty & wig brand"], 600_000, 3.0) },
  { id: "phone", title: "Phone Repairer", group: "petty", selfEmployed: true, startCost: 350_000, minAge: 15, edu: "none", minOpp: 2,
    get blurb() { return T("'Is the screen original?' Always.", "'Na original screen?' Always dem go ask."); },
    ladder: ladder(["Table-side repairs", "Phone repair shop", "Phones & accessories mall shop", "Phone importer", "Phone distribution company"], 800_000, 2.8) },
  { id: "mechanic", title: "Auto Mechanic", group: "petty", selfEmployed: true, startCost: 300_000, minAge: 15, edu: "none", minOpp: 1,
    get blurb() { return T("Oga, the car don knock engine.", "Oga, the car don knock engine."); },
    ladder: ladder(["Roadside mechanic", "Garage", "Auto workshop", "Dealership + garage", "Auto group"], 900_000, 2.8) },
  { id: "keke", title: "Okada / Keke Owner", group: "petty", selfEmployed: true, startCost: 900_000, minAge: 18, edu: "none", minOpp: 2,
    get blurb() { return T("Own the bike and the road. Mind the LASTMA / task force.", "Own the bike, own the road. Just mind LASTMA and task force."); },
    ladder: ladder(["Okada rider", "Keke owner", "Keke fleet (5)", "Transport company", "Mass-transit company"], 900_000, 2.6) },
  { id: "provisions", title: "Provision Store Owner", group: "petty", selfEmployed: true, startCost: 400_000, minAge: 16, edu: "none", minOpp: 1,
    get blurb() { return T("Indomie, Peak milk and credit sales.", "Indomie, Peak milk and 'I go pay you later' credit."); },
    ladder: ladder(["Kiosk", "Provision store", "Mini supermarket", "Supermarket", "Supermarket chain"], 650_000, 3.0) },
  // ---- Employed petty ----
  { id: "conductor", title: "Bus Conductor", group: "petty", selfEmployed: false, startCost: 0, minAge: 16, edu: "none", minOpp: 1,
    get blurb() { return T("'Oshodi! Oshodi! Ojota! Change your change!'", "'Oshodi! Oshodi! Ojota! Hold your change!'"); },
    ladder: fixed([["Conductor", 500_000], ["Bus driver", 1_100_000], ["Park chairman", 3_200_000]]) },
  { id: "guard", title: "Security Guard (Mai Guard)", group: "petty", selfEmployed: false, startCost: 0, minAge: 18, edu: "none", minOpp: 1,
    get blurb() { return T("Night shifts, a torch and a plastic chair.", "Night shift, torch and one plastic chair."); },
    ladder: fixed([["Security guard", 480_000], ["Head of guards", 900_000], ["Security supervisor", 1_800_000]]) },
  { id: "rideapp", title: "Bolt / Uber Driver", group: "petty", selfEmployed: false, startCost: 0, minAge: 21, edu: "secondary", minOpp: 5,
    get blurb() { return T("The app takes its cut and fuel takes the rest.", "The app go take im cut, fuel go carry the rest."); },
    ladder: fixed([["Ride-hailing driver", 1_500_000], ["Top-rated driver", 2_400_000], ["Fleet partner", 5_500_000]]) },
  { id: "attendant", title: "Shop Attendant", group: "petty", selfEmployed: false, startCost: 0, minAge: 16, edu: "primary", minOpp: 1,
    get blurb() { return T("Sell for your oga and pray salary comes on time.", "Sell for your oga and pray make salary enter on time."); },
    ladder: fixed([["Shop attendant", 420_000], ["Shop manager", 1_000_000], ["Store supervisor", 2_200_000]]) },
  // ---- Formal ----
  { id: "teacher", title: "Teacher", group: "formal", selfEmployed: false, startCost: 0, minAge: 21, edu: "tertiary", minOpp: 1,
    get blurb() { return T("Shaping minds on a salary that arrives 'soon'.", "Shaping young minds on salary wey dey always come 'soon'."); }, courses: ["Education", "Arts", "Mass Communication"],
    ladder: fixed([["Teacher", 1_200_000], ["Senior teacher", 2_200_000], ["Vice principal", 4_000_000], ["Principal", 7_000_000]]) },
  { id: "nurse", title: "Nurse", group: "formal", selfEmployed: false, startCost: 0, minAge: 21, edu: "tertiary", minOpp: 2,
    get blurb() { return T("Overworked, underpaid, and already planning Japa.", "Work plenty, pay small, and your mind don dey Japa."); },
    ladder: fixed([["Staff nurse", 2_000_000], ["Senior nurse", 3_500_000], ["Matron", 6_500_000]]) },
  { id: "doctor", title: "Doctor", group: "formal", selfEmployed: false, startCost: 0, minAge: 24, edu: "tertiary", courses: ["Medicine"], minOpp: 3,
    get blurb() { return T("Everyone's mother's favourite job.", "The work wey every mama wan see her pikin do."); },
    ladder: fixed([["House officer", 3_000_000], ["Medical officer", 6_500_000], ["Consultant", 16_000_000], ["Chief medical director", 30_000_000]]) },
  { id: "lawyer", title: "Lawyer", group: "formal", selfEmployed: false, startCost: 0, minAge: 24, edu: "tertiary", courses: ["Law"], minOpp: 3,
    get blurb() { return T("'My Lord, I humbly submit.' Adjournment is your best friend.", "'My Lord, I humbly submit.' Adjournment na your best friend."); },
    ladder: fixed([["Junior associate", 2_500_000], ["Associate", 5_500_000], ["Senior counsel", 14_000_000], ["SAN", 35_000_000]]) },
  { id: "engineer", title: "Engineer", group: "formal", selfEmployed: false, startCost: 0, minAge: 23, edu: "tertiary", courses: ["Engineering"], minOpp: 3,
    get blurb() { return T("Fix generators, roads, and everything in between.", "Fix generator, road, and everything wey spoil."); },
    ladder: fixed([["Graduate engineer", 3_000_000], ["Project engineer", 6_500_000], ["Senior engineer", 13_000_000], ["Engineering director", 28_000_000]]) },
  { id: "dev", title: "Software Developer", group: "formal", selfEmployed: false, startCost: 0, minAge: 21, edu: "tertiary", courses: ["Computer Science", "Engineering"], minOpp: 5,
    get blurb() { return T("Remote dollars, Lagos traffic, and no light.", "Remote dollars, Lagos traffic, and no light."); },
    ladder: fixed([["Junior developer", 3_500_000], ["Developer", 9_000_000], ["Senior developer", 22_000_000], ["Engineering lead", 45_000_000]]) },
  { id: "banker", title: "Banker", group: "formal", selfEmployed: false, startCost: 0, minAge: 22, edu: "tertiary", courses: ["Accounting", "Law", "Arts", "Mass Communication", "Engineering", "Computer Science", "Education"], minOpp: 4,
    get blurb() { return T("Targets, targets, targets. Bring in deposits or bring your CV.", "Targets, targets, targets. Bring deposits or bring your CV."); },
    ladder: fixed([["Customer service rep", 2_200_000], ["Relationship manager", 5_000_000], ["Branch manager", 11_000_000], ["Executive director", 40_000_000]]) },
  { id: "accountant", title: "Accountant", group: "formal", selfEmployed: false, startCost: 0, minAge: 22, edu: "tertiary", courses: ["Accounting"], minOpp: 3,
    get blurb() { return T("Balancing books while the boss balances friends.", "You dey balance books while oga dey balance im friends."); },
    ladder: fixed([["Junior accountant", 2_200_000], ["Accountant", 4_800_000], ["Finance manager", 10_000_000], ["CFO", 30_000_000]]) },
  { id: "civil", title: "Civil Servant", group: "formal", selfEmployed: false, startCost: 0, minAge: 20, edu: "secondary", minOpp: 2,
    get blurb() { return T("Pension, stability, and files that move only with 'something small'.", "Pension, steady work, and files wey no dey move without 'something small'."); },
    ladder: fixed([["Clerk", 1_300_000], ["Executive officer", 2_400_000], ["Director", 5_500_000], ["Permanent secretary", 12_000_000]]) },
  { id: "oil", title: "Oil & Gas Worker", group: "formal", selfEmployed: false, startCost: 0, minAge: 23, edu: "tertiary", courses: ["Engineering", "Accounting", "Computer Science"], minOpp: 6,
    get blurb() { return T("Dollar allowances and fat paychecks, if you know someone.", "Dollar allowance and fat pay, if you sabi person."); },
    ladder: fixed([["Graduate trainee", 6_000_000], ["Process engineer", 15_000_000], ["Operations manager", 35_000_000], ["General manager", 80_000_000]]) },
  { id: "police", title: "Police Officer", group: "formal", selfEmployed: false, startCost: 0, minAge: 20, edu: "secondary", minOpp: 1,
    get blurb() { return T("'Wetin you carry for me?' ... allegedly.", "'Wetin you carry for me?' ... allegedly."); },
    ladder: fixed([["Constable", 1_100_000], ["Inspector", 2_600_000], ["Superintendent", 6_000_000], ["Commissioner", 14_000_000]]) },
  { id: "soldier", title: "Soldier", group: "formal", selfEmployed: false, startCost: 0, minAge: 20, edu: "secondary", minOpp: 1,
    get blurb() { return T("Defending the nation, one barracks at a time.", "Defending the nation, one barracks at a time."); },
    ladder: fixed([["Private", 1_200_000], ["Sergeant", 2_600_000], ["Captain", 6_500_000], ["General", 20_000_000]]) },
  { id: "navy", title: "Naval Officer", group: "formal", selfEmployed: false, startCost: 0, minAge: 20, edu: "secondary", minOpp: 1,
    get blurb() { return T("Guarding the creeks and the Gulf of Guinea.", "Dey guard the creeks and the Gulf of Guinea."); },
    ladder: fixed([["Seaman", 1_200_000], ["Petty Officer", 2_600_000], ["Commander", 6_500_000], ["Admiral", 20_000_000]]) },
  { id: "airforce", title: "Air Force Officer", group: "formal", selfEmployed: false, startCost: 0, minAge: 20, edu: "secondary", minOpp: 1,
    get blurb() { return T("Flying, fixing and defending the skies.", "Dey fly, fix and defend the sky."); },
    ladder: fixed([["Airman", 1_300_000], ["Flight Lieutenant", 3_000_000], ["Squadron Leader", 7_000_000], ["Air Marshal", 21_000_000]]) },
  { id: "journalist", title: "Journalist", group: "formal", selfEmployed: false, startCost: 0, minAge: 21, edu: "tertiary", courses: ["Mass Communication", "Arts"], minOpp: 3,
    get blurb() { return T("Stories, brown envelopes, and press freedom.", "Stories, brown envelopes, and press freedom."); },
    ladder: fixed([["Reporter", 1_500_000], ["Senior reporter", 3_200_000], ["Editor", 7_000_000], ["Editor-in-chief", 16_000_000]]) },
  // ---- Creative: slow burn, huge upside ----
  { id: "actor", title: "Nollywood Actor", group: "creative", selfEmployed: false, startCost: 0, minAge: 17, edu: "secondary", minOpp: 5,
    get blurb() { return T("Auditions, wigs and screaming 'WHYYYY!' on camera.", "Auditions, wigs and shouting 'WHYYYY!' for camera."); },
    ladder: fixed([["Extra", 400_000], ["Supporting actor", 2_500_000], ["Lead actor", 14_000_000], ["Nollywood star", 70_000_000], ["Pan-African icon", 250_000_000]]) },
  { id: "singer", title: "Afrobeats Artist", group: "creative", selfEmployed: false, startCost: 0, minAge: 16, edu: "none", minOpp: 5,
    get blurb() { return T("One hit song away from a different life.", "One hit song away from new life."); },
    ladder: fixed([["Open-mic singer", 300_000], ["Local artist", 2_000_000], ["Rising star", 18_000_000], ["Chart-topper", 120_000_000], ["Global Afrobeats star", 600_000_000]]) },
  { id: "creator", title: "Content Creator / Skit Maker", group: "creative", selfEmployed: false, startCost: 0, minAge: 14, edu: "none", minOpp: 3,
    get blurb() { return T("Ring light, data and a dream to go viral.", "Ring light, data and dream to go viral."); },
    ladder: fixed([["Tiny audience", 200_000], ["Rising creator", 2_200_000], ["Brand deals", 12_000_000], ["Viral sensation", 60_000_000], ["Mega influencer", 220_000_000]]) },
  { id: "tiktoker", title: "TikToker", group: "creative", selfEmployed: false, startCost: 0, minAge: 13, edu: "none", minOpp: 1,
    get blurb() { return T("Short videos, trends and a phone with 4% battery.", "Short videos, trends and phone wey get 4% battery."); },
    ladder: fixed([["Posting for friends", 0], ["Rising TikToker", 0], ["Verified creator", 0], ["Viral star", 0], ["Platform icon", 0]]) },
  { id: "influencer", title: "Instagram Influencer", group: "creative", selfEmployed: false, startCost: 0, minAge: 15, edu: "none", minOpp: 2,
    get blurb() { return T("Photos, brand deals and 'link in bio'.", "Photos, brand deals and 'link in bio'."); },
    ladder: fixed([["Casual poster", 0], ["Micro-influencer", 0], ["Brand ambassador", 0], ["Lifestyle influencer", 0], ["Celebrity influencer", 0]]) },
  { id: "youtuber", title: "YouTuber", group: "creative", selfEmployed: false, startCost: 0, minAge: 14, edu: "none", minOpp: 2,
    get blurb() { return T("Long videos, editing all night, and waiting for the algorithm.", "Long videos, edit all night, and wait for algorithm to show you love."); },
    ladder: fixed([["Starting a channel", 0], ["Small channel", 0], ["Monetised channel", 0], ["Popular channel", 0], ["Big-name creator", 0]]) },
  { id: "streamer", title: "Streamer", group: "creative", selfEmployed: false, startCost: 0, minAge: 16, edu: "none", minOpp: 3,
    get blurb() { return T("Live gaming and chatting while NEPA decides your fate.", "Live gaming and gist while NEPA go decide your fate."); },
    ladder: fixed([["Streaming to ten viewers", 0], ["Growing streamer", 0], ["Partnered streamer", 0], ["Top streamer", 0], ["Streaming superstar", 0]]) },
  { id: "fitness", title: "Fitness Influencer", group: "creative", selfEmployed: false, startCost: 0, minAge: 16, edu: "none", minOpp: 3,
    get blurb() { return T("Workouts, meal plans and mirror selfies.", "Workouts, meal plans and mirror selfies."); },
    ladder: fixed([["Gym selfies", 0], ["Local fitness voice", 0], ["Sponsored coach", 0], ["Fitness brand", 0], ["Fitness celebrity", 0]]) },
  { id: "comedian", title: "Comedian", group: "creative", selfEmployed: false, startCost: 0, minAge: 16, edu: "none", minOpp: 3,
    get blurb() { return T("Open mics, weddings and the occasional TV special.", "Open mics, weddings and sometimes TV special."); },
    ladder: fixed([["Open-mic comic", 350_000], ["Show comedian", 2_000_000], ["Headliner", 9_000_000], ["National act", 40_000_000], ["Comedy superstar", 160_000_000]]) },
  { id: "model", title: "Model", group: "creative", selfEmployed: false, startCost: 0, minAge: 16, edu: "none", minOpp: 4,
    get blurb() { return T("Runways, shoots and the agency's invoices.", "Runways, shoots and agency invoices."); },
    ladder: fixed([["Test shoots", 300_000], ["Local model", 1_800_000], ["Agency model", 8_000_000], ["Campaign face", 30_000_000], ["International model", 120_000_000]]) },
  // ---- Crime ----
  { id: "yahoo", title: "Yahoo Boy (Online Fraud)", group: "crime", selfEmployed: false, startCost: 0, minAge: 17, edu: "none", minOpp: 2,
    get blurb() { return T("Easy money until EFCC knocks on the door.", "Easy money until EFCC knock your door."); },
    ladder: fixed([["Small-time scammer", 1_200_000], ["Mid-level scammer", 5_000_000], ["Big-time fraudster", 18_000_000]]) },
  { id: "kidnapper", title: "Highway Kidnapper (Gang)", group: "crime", selfEmployed: false, startCost: 0, minAge: 18, edu: "none", minOpp: 1,
    get blurb() { return T("Dangerous, violent, and very likely to end badly.", "Dangerous, violent, and e dey very likely to end bad."); },
    ladder: fixed([["Lookout", 1_800_000], ["Gang member", 7_000_000], ["Commander", 25_000_000]]) },
];
export const JOB_BY_ID: Record<string, JobDef> = Object.fromEntries(JOBS.map((j) => [j.id, j]));

/** Real-world wages are lower than first guessed; formal jobs pay more steadily than hustles. */
export const PAY_SCALE: Record<JobGroup, number> = { petty: 0.6, formal: 0.8, creative: 0.6, crime: 0.7 };

export function payMult(job: JobDef, st: StateInfo): number {
  switch (job.group) {
    case "formal": return 0.55 + 0.1 * st.opp;
    case "petty": return 0.8 + 0.1 * st.opp;
    case "creative": return 0.5 + 0.1 * st.opp;
    default: return 0.8 + 0.04 * st.opp;
  }
}

// ---------------------------------------------------------------------------
// Houses
// ---------------------------------------------------------------------------
export const HOUSE_KINDS: Record<HouseKind, { label: string; build: number; rent: number }> = {
  land: { get label() { return T("Plot of land", "Plot of land"); }, build: 4_000_000, rent: 0 },
  apartment: { get label() { return T("Apartment", "Apartment"); }, build: 22_000_000, rent: 2_200_000 },
  bungalow: { get label() { return T("Bungalow", "Bungalow"); }, build: 10_000_000, rent: 1_100_000 },
  duplex: { get label() { return T("Duplex", "Duplex"); }, build: 35_000_000, rent: 3_500_000 },
  flats: { get label() { return T("Block of flats", "Block of flats"); }, build: 90_000_000, rent: 9_000_000 },
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
  { id: "borehole", get label() { return T("Sink boreholes for your community", "Drill borehole for your community"); }, get desc() { return T("Clean water. The village will sing your name.", "Clean water. Whole village go dey sing your name."); }, cost: 8_000_000, prestige: 1, reputation: 5, good: true, once: false },
  { id: "owambe", get label() { return T("Throw a mega owambe (spray the naira)", "Throw mega owambe (spray the naira)"); }, get desc() { return T("Aso-ebi, live band, and a DJ who calls your name 40 times.", "Aso-ebi, live band, and DJ wey go call your name 40 times."); }, cost: 5_000_000, prestige: 1, reputation: 4, connections: 3, happiness: 8, once: false },
  { id: "praise", get label() { return T("Hire praise singers & hype men", "Hire praise singers & hype men"); }, get desc() { return T("A man with a mic who will say you're 'Alhaji of the year'.", "One man with mic wey go dey shout say you be 'Alhaji of the year'."); }, cost: 2_000_000, prestige: 1, reputation: 3, happiness: 4, once: false },
  { id: "bodyguards", get label() { return T("Private security team", "Private security team"); }, get desc() { return T("Big men in black. Lower kidnap risk every year.", "Big men for black. Kidnap risk go reduce every year."); }, cost: 25_000_000, upkeep: 15_000_000, prestige: 1, once: true, safety: 0.55 },
  { id: "title", get label() { return T("Buy a chieftaincy title", "Buy chieftaincy title"); }, get desc() { return T("Chief, Otunba, Ezeji, Dr. (honoris causa). Money gets you titles.", "Chief, Otunba, Ezeji, Dr. (honoris causa). Money fit buy you title."); }, cost: 15_000_000, prestige: 3, reputation: 8, connections: 5, once: true },
  { id: "foundation", get label() { return T("Start a foundation", "Start foundation"); }, get desc() { return T("Scholarships, free surgeries, and good headlines.", "Scholarships, free surgeries, and good headlines."); }, cost: 60_000_000, upkeep: 8_000_000, prestige: 4, reputation: 14, good: true, once: true },
  { id: "schools", get label() { return T("Fund 10 village schools", "Fund 10 village schools"); }, get desc() { return T("Real classrooms and real teachers. A legacy people remember.", "Real classrooms and real teachers. Legacy wey people go remember."); }, cost: 120_000_000, prestige: 4, reputation: 10, good: true, once: false },
  { id: "convoy", get label() { return T("Land Cruiser convoy + escorts", "Land Cruiser convoy + escorts"); }, get desc() { return T("Sirens, tinted glass, and traffic that opens like the Red Sea.", "Siren, tinted glass, and traffic wey dey open like Red Sea."); }, cost: 40_000_000, upkeep: 8_000_000, prestige: 3, reputation: 2, once: true, safety: 0.6 },
  { id: "mansion", get label() { return T("Mansion in Banana Island / Maitama", "Mansion for Banana Island / Maitama"); }, get desc() { return T("Marble floors, gold taps, a generator the size of a bus.", "Marble floor, gold tap, generator wey big like bus."); }, cost: 600_000_000, upkeep: 20_000_000, prestige: 8, happiness: 10, once: true, minWealth: 400_000_000 },
  { id: "dubai", get label() { return T("Property in Dubai", "Property for Dubai"); }, get desc() { return T("A penthouse where nobody asks questions.", "Penthouse where nobody go ask you question."); }, cost: 400_000_000, prestige: 5, happiness: 5, once: true, minWealth: 300_000_000 },
  { id: "london", get label() { return T("London townhouse", "London townhouse"); }, get desc() { return T("For the kids' school runs and your 'medical check-ups'.", "For pikin dem school runs and your 'medical check-up'."); }, cost: 650_000_000, prestige: 6, happiness: 6, once: true, minWealth: 500_000_000 },
  { id: "jet", get label() { return T("Private jet", "Private jet"); }, get desc() { return T("Skip every checkpoint on earth. Fuel costs more than the plane.", "Jump every checkpoint for world. Fuel cost pass the plane."); }, cost: 800_000_000, upkeep: 120_000_000, prestige: 10, reputation: -2, happiness: 8, once: true, minWealth: 700_000_000, safety: 0.4 },
  { id: "club", get label() { return T("Buy a football club", "Buy football club"); }, get desc() { return T("Win the league, or at least own the stadium.", "Win the league, or at least own the stadium."); }, cost: 1_200_000_000, upkeep: 150_000_000, prestige: 9, reputation: 10, connections: 6, once: true, minWealth: 1_000_000_000 },
  { id: "university", get label() { return T("Build a private university", "Build private university"); }, get desc() { return T("Your name on every building. Fees pay for the next one.", "Your name for every building. School fees go pay for the next one."); }, cost: 20_000_000_000, upkeep: 600_000_000, prestige: 14, reputation: 12, good: true, once: true, minWealth: 15_000_000_000 },
  { id: "hajj", get label() { return T("Sponsor 1,000 people for Hajj / pilgrimage", "Sponsor 1,000 people for Hajj / pilgrimage"); }, get desc() { return T("Prayers from a thousand mouths. Very good press.", "Prayers from one thousand mouth. Very correct press."); }, cost: 1_500_000_000, prestige: 6, reputation: 16, good: true, once: false, minWealth: 1_000_000_000 },
  { id: "godfather", get label() { return T("Pay homage to a political godfather", "Pay homage to political godfather"); }, get desc() { return T("The right handshake opens the right doors.", "The correct handshake dey open the correct doors."); }, cost: 100_000_000, prestige: 1, connections: 10, once: false },
];

export interface InvestOption {
  kind: HoldingKind;
  label: string;
  desc: string;
  min: number;
}
export const INVESTMENTS: InvestOption[] = [
  { kind: "savings", get label() { return T("High-yield savings", "High-yield savings"); }, get desc() { return T("Safe, earns interest and can be withdrawn any time. Rarely beats inflation.", "Safe, e dey earn interest and you fit withdraw any time. E no too dey beat inflation."); }, min: 100_000 },
  { kind: "tbill", get label() { return T("Treasury bills (fixed income)", "Treasury bills (fixed income)"); }, get desc() { return T("Government paper paying a fixed rate. Selling within a year costs 3%.", "Government paper wey dey pay fixed rate. If you sell am before one year, e go cost 3%."); }, min: 500_000 },
  { kind: "fund", get label() { return T("Diversified mutual fund", "Diversified mutual fund"); }, get desc() { return T("A mix of Nigerian stocks and bonds. Smoother, steadier ride.", "Mix of Nigerian stocks and bonds. Smoother, steadier ride."); }, min: 250_000 },
  { kind: "stocks", get label() { return T("NGX equities (Nigerian stocks)", "NGX equities (Nigerian stocks)"); }, get desc() { return T("Banks, cement and telecom. Prices move every month.", "Banks, cement and telecom. Price dey move every month."); }, min: 500_000 },
  { kind: "usd", get label() { return T("Dollar savings", "Dollar savings"); }, get desc() { return T("Hedge against naira crashes. Safe, steady.", "Cover yourself when naira crash. Safe, steady."); }, min: 500_000 },
  { kind: "crypto", get label() { return T("Cryptocurrency", "Cryptocurrency"); }, get desc() { return T("Wild swings every month. Platforms can also disappear.", "Wild swings every month. Platform fit even vanish."); }, min: 300_000 },
  { kind: "farm", get label() { return T("Commercial farm stake", "Commercial farm stake"); }, get desc() { return T("Food never goes out of fashion. Bandits and floods might.", "Food no dey ever go out of fashion. Bandits and flood fit mess am up."); }, min: 5_000_000 },
  { kind: "school", get label() { return T("Private school chain", "Private school chain"); }, get desc() { return T("Steady fees. Parents always find a way.", "Steady school fees. Parents must find way."); }, min: 20_000_000 },
  { kind: "oil", get label() { return T("Marginal oil field stake", "Marginal oil field stake"); }, get desc() { return T("Huge returns, huge risk, huge politics.", "Big returns, big risk, big politics."); }, min: 300_000_000 },
  { kind: "bank", get label() { return T("Stake in a bank", "Stake for a bank"); }, get desc() { return T("Slow, very stable returns and plenty of prestige.", "Slow, very stable returns and plenty prestige."); }, min: 5_000_000_000 },
];

// ---------------------------------------------------------------------------
// Housing tiers (annual rent in base-year naira before the state's cost factor)
// ---------------------------------------------------------------------------
export interface HomeTier {
  id: string;
  label: string;
  rent: number;
  comfort: number;
  blurb: string;
}
export const HOME_TIERS: HomeTier[] = [
  { id: "room", get label() { return T("Shared room", "Shared room"); }, rent: 110_000, comfort: -2, get blurb() { return T("A room in a compound, shared bathroom.", "One room for compound, shared bathroom."); } },
  { id: "selfcon", get label() { return T("Self-contain", "Self-contain"); }, rent: 300_000, comfort: 0, get blurb() { return T("Your own room with a private bathroom.", "Your own room with private bathroom."); } },
  { id: "onebed", get label() { return T("1-bedroom flat", "1-bedroom flat"); }, rent: 700_000, comfort: 2, get blurb() { return T("A proper small flat.", "Correct small flat."); } },
  { id: "twobed", get label() { return T("2-bedroom flat", "2-bedroom flat"); }, rent: 1_500_000, comfort: 4, get blurb() { return T("Room for family and a visitor.", "Space for family and visitor."); } },
  { id: "duplex", get label() { return T("Rented duplex", "Rented duplex"); }, rent: 4_500_000, comfort: 7, get blurb() { return T("A fine house in a good estate.", "Fine house for good estate."); } },
];

// ---------------------------------------------------------------------------
// School fees per year in base-year naira
// ---------------------------------------------------------------------------
export type SchoolType = "public" | "private" | "elite";
export const SCHOOL_FEES: Record<string, Record<SchoolType, number>> = {
  primary: { public: 30_000, private: 350_000, elite: 1_800_000 },
  secondary: { public: 60_000, private: 600_000, elite: 2_800_000 },
  tertiary: { public: 180_000, private: 1_200_000, elite: 3_500_000 },
};
export const POLY_FEE = 140_000;
export const VOCATIONAL_FEE = 250_000;
