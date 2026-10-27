/**
 * Data-driven catalogue: policies, projects and one-off measures. Values are SIMULATED game balance for a fictional
 * scenario, not real statistics or forecasts.
 */
import type { Effects, Funding } from "../engine/types";

export type Category =
  | "fiscal" | "money" | "fuel" | "agri" | "power" | "infra" | "industry" | "jobs" | "security" | "education" | "health" | "welfare" | "governance";

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "fiscal", label: "Taxes & public finance" },
  { id: "money", label: "Currency & banking" },
  { id: "fuel", label: "Oil, fuel & energy" },
  { id: "agri", label: "Farming & food" },
  { id: "power", label: "Electricity" },
  { id: "infra", label: "Roads, rail & ports" },
  { id: "industry", label: "Industry & trade" },
  { id: "jobs", label: "Jobs & skills" },
  { id: "security", label: "Security" },
  { id: "education", label: "Education" },
  { id: "health", label: "Health" },
  { id: "welfare", label: "Social support" },
  { id: "governance", label: "Government & integrity" },
];

export interface PolicyDef {
  id: string;
  cat: Category;
  name: string;
  what: string;
  /** one-off cost ₦bn to set up */
  setup: number;
  /** running cost ₦bn per month while active (at start-of-game prices) */
  monthly: number;
  /** months for the effect to reach full strength */
  delay: number;
  short: string;
  long: string;
  risks: string;
  effects: Effects;
}

export const POLICIES: PolicyDef[] = [
  // fiscal
  { id: "taxDrive", cat: "fiscal", name: "Tax collection drive", what: "Digitise tax filing and chase large defaulters.", setup: 60, monthly: 12, delay: 9, short: "Little at first; offices and systems take time.", long: "More non-oil revenue every month.", risks: "Hurts small firms if aggressive; needs honest tax officials.", effects: { taxCompl: 8, revenue: 90, investor: -1 } },
  { id: "vatCut", cat: "fiscal", name: "Cut VAT on food and farm inputs", what: "Lower sales tax on basic foods and fertiliser.", setup: 10, monthly: 0, delay: 1, short: "Food gets a little cheaper straight away.", long: "Permanently lower revenue.", risks: "Government loses money in a tight year.", effects: { foodPrice: -3.5, revenue: -110 } },
  // money
  { id: "fxWindow", cat: "money", name: "Unify and open the FX market", what: "Let dollars trade at one transparent rate and clear the backlog.", setup: 40, monthly: 0, delay: 4, short: "Naira may jump weaker first as the true price shows.", long: "Investors return; dollar queues disappear.", risks: "Imports cost more at first; sharp inflation spike possible.", effects: { investor: 9, fxSupply: 0.35 } },
  { id: "tightMoney", cat: "money", name: "High interest rates", what: "Central bank raises borrowing rates to cool prices.", setup: 0, monthly: 0, delay: 5, short: "Pushes inflation down slowly.", long: "Supports the naira.", risks: "Fewer business loans means fewer new jobs; costs the government more to borrow.", effects: { inflation: -3.5, fxSupply: 0.25, jobs: -0.35, sme: -2 } },
  // fuel
  { id: "gasFlares", cat: "fuel", name: "Gas-to-power deal", what: "Pay producers on time so gas flows to power plants.", setup: 120, monthly: 18, delay: 6, short: "Payments start immediately.", long: "More gas means more electricity.", risks: "A recurring bill; relies on honest invoices.", effects: { gas: 14, revenue: 20 } },
  { id: "pipelineGuard", cat: "fuel", name: "Pipeline protection contracts", what: "Hire local security firms and community monitors for pipelines.", setup: 45, monthly: 9, delay: 5, short: "Fewer theft points soon.", long: "Crude theft falls; production rises.", risks: "Contracts can be captured by political friends.", effects: { oilTheft: -9, security: 1.5 } },
  // agri
  { id: "farmInputs", cat: "agri", name: "Fertiliser and seed support", what: "Subsidised fertiliser and improved seed for smallholders.", setup: 30, monthly: 38, delay: 5, short: "Takes a full planting season to show.", long: "Bigger harvests every year.", risks: "Inputs can be diverted before they reach farmers.", effects: { inputs: 14, foodSupply: 2 } },
  { id: "foodImport", cat: "agri", name: "Waive duties on food imports", what: "Allow staples in cheaply to bring prices down fast.", setup: 5, monthly: 0, delay: 1, short: "Shelves fill and prices ease quickly.", long: "Hurts local farmers and uses up dollars.", risks: "Pressure on the naira; farmers lose income.", effects: { foodPrice: -5, fxDemand: 0.28, foodSupply: 3, revenue: -45, jobs: 0.1 } },
  // power
  { id: "powerPay", cat: "power", name: "Clear power-sector debts", what: "Pay what is owed to generators and set realistic tariffs for big users.", setup: 200, monthly: 10, delay: 5, short: "Big one-off bill.", long: "Plants run more often; investors trust the sector.", risks: "Hard to see results at first; tariff anger among industry.", effects: { power: 450, investor: 2, revenue: 25 } },
  { id: "gridMaint", cat: "power", name: "Grid maintenance programme", what: "Fix substations and lines on a regular schedule.", setup: 25, monthly: 14, delay: 8, short: "Fewer breakdowns after a few months.", long: "A more stable grid.", risks: "Repair crews cost money before blackouts ease.", effects: { grid: 7, maint: 3 } },
  // infra
  { id: "roadMaint", cat: "infra", name: "Road maintenance fund", what: "Keep existing roads and bridges in repair.", setup: 20, monthly: 22, delay: 6, short: "Potholes get filled.", long: "Roads stop deteriorating; freight costs fall.", risks: "Pays little political credit compared with new roads.", effects: { maint: 6, roads: 3 } },
  { id: "portReform", cat: "infra", name: "Port efficiency reform", what: "Cut clearance steps, go paperless, curb illegal checkpoints.", setup: 35, monthly: 6, delay: 8, short: "Slow; interest groups resist.", long: "Faster, cheaper imports and exports.", risks: "Port workers may strike.", effects: { ports: 6, exports: 0.08, procurement: 1 } },
  // industry
  { id: "exportZones", cat: "industry", name: "Export and manufacturing zones", what: "Tax breaks and reliable power for factories that export.", setup: 80, monthly: 16, delay: 12, short: "Factories need a year to open.", long: "Jobs and dollars from exports.", risks: "Needs steady electricity to work.", effects: { manuf: 7, exports: 0.28, jobs: -0.25, revenue: -35 } },
  { id: "smeLoans", cat: "industry", name: "Small business loan scheme", what: "Cheap loans for small firms through partner banks.", setup: 50, monthly: 24, delay: 6, short: "Money reaches firms within months.", long: "New small businesses and jobs.", risks: "Loans may go to the well-connected; some will default.", effects: { sme: 8, jobs: -0.3, inflation: 0.4 } },
  // jobs
  { id: "skillsCorps", cat: "jobs", name: "Youth skills and apprenticeship corps", what: "Pay for trade and digital training with job placements.", setup: 40, monthly: 28, delay: 10, short: "A small stipend gives young people hope.", long: "A more productive workforce.", risks: "Training without jobs creates frustration.", effects: { skills: 9, jobs: -0.35, happiness: 1.2 } },
  { id: "publicWorks", cat: "jobs", name: "Public works employment", what: "Pay people to clean drains, repair roads and build.", setup: 20, monthly: 45, delay: 2, short: "Jobs within weeks.", long: "Temporary; leaves a bill.", risks: "Costly; jobs end when money does.", effects: { jobs: -0.6, happiness: 1.5, maint: 1.5 } },
  // security
  { id: "troopSurge", cat: "security", name: "Security surge in hotspots", what: "More troops, vehicles and intelligence where attacks are worst.", setup: 120, monthly: 55, delay: 4, short: "Fewer attacks within months.", long: "Needs to be sustained.", risks: "Costly; abuses by troops would hurt trust and the law.", effects: { security: 9, forces: 8, trust: -0.5 } },
  { id: "communityPolicing", cat: "security", name: "Community policing and early warning", what: "Train local police and tip-off networks, and pay informants lawfully.", setup: 40, monthly: 15, delay: 8, short: "Slow to build.", long: "Lasting, lawful security.", risks: "Takes time while attacks continue.", effects: { security: 6, trust: 1.5, forces: 3 } },
  // education
  { id: "eduBudget", cat: "education", name: "Raise education spending", what: "More teachers, books and classrooms.", setup: 30, monthly: 60, delay: 18, short: "Almost nothing for a year.", long: "A more skilled workforce.", risks: "Costly with slow payoff; cutting this later does lasting damage.", effects: { education: 10, skills: 3, happiness: 0.6 } },
  { id: "eduCut", cat: "education", name: "Trim education spending", what: "Freeze hiring and delay classroom upkeep to save money.", setup: 0, monthly: -35, delay: 2, short: "Saves money straight away.", long: "Skills and productivity erode for years; slow to rebuild.", risks: "Teacher strikes; lasting damage to the future workforce.", effects: { education: -9, skills: -2, happiness: -0.6 } },
  // health
  { id: "healthBudget", cat: "health", name: "Raise health spending", what: "Clinics, drugs and nurses.", setup: 30, monthly: 60, delay: 12, short: "Clinics stocked within months.", long: "Healthier, more productive people.", risks: "Costly; hard to show in one term.", effects: { health: 10, happiness: 0.9 } },
  { id: "healthCut", cat: "health", name: "Trim health spending", what: "Reduce drug purchases and clinic upkeep to save money.", setup: 0, monthly: -35, delay: 2, short: "Saves money straight away.", long: "More illness, lower productivity; outbreaks become likelier.", risks: "Outbreaks; lasting damage that takes years to repair.", effects: { health: -9, happiness: -0.8 } },
  // welfare
  { id: "cashTransfers", cat: "welfare", name: "Cash transfers to the poorest households", what: "Monthly payments by phone to registered poor families.", setup: 70, monthly: 80, delay: 3, short: "Cushions price shocks quickly.", long: "Needs honest registers and ongoing funds.", risks: "Leakage if records are bad; needs stable funding.", effects: { welfare: 8, happiness: 2.5, wage: 0.15 } },
  { id: "minWage", cat: "welfare", name: "Raise the minimum wage", what: "A legal pay floor for workers.", setup: 5, monthly: 30, delay: 2, short: "Pay rises for formal workers.", long: "May cost jobs and push up prices.", risks: "Informal workers do not benefit; inflation pressure.", effects: { wage: 0.6, happiness: 1.5, inflation: 1.0, jobs: 0.25 } },
  // governance
  { id: "eProcure", cat: "governance", name: "Open contracting and e-procurement", what: "Publish every contract online with prices and winners.", setup: 25, monthly: 4, delay: 8, short: "Insiders resist; slow.", long: "Fewer rigged contracts, cheaper projects.", risks: "Political allies lose easy money, so expect pushback.", effects: { procurement: 14, transparency: 12, corruption: -4 } },
  { id: "civilService", cat: "governance", name: "Civil service reform", what: "Merit hiring, training and clearing ghost workers.", setup: 45, monthly: 8, delay: 14, short: "Fighting over jobs; little change at first.", long: "Faster, better delivery.", risks: "Union and political resistance.", effects: { capacity: 12, corruption: -3, trust: 0.5 } },
];
export const POLICY_BY_ID: Record<string, PolicyDef> = Object.fromEntries(POLICIES.map((p) => [p.id, p]));

// ---------------------------------------------------------------- projects
export interface ProjectDef {
  id: string;
  name: string;
  cat: string;
  what: string;
  /** ₦bn at start-of-game prices */
  cost: number;
  months: number;
  /** share of cost payable in dollars (rises with a weaker naira) */
  fxShare: number;
  /** minimum state capacity (0..100) for smooth delivery */
  capacityNeed: number;
  risk: number; // base delay/overrun risk 0..1
  /** advertised benefit when done */
  benefit: Effects;
  benefitText: string;
  funding: Funding[];
  /** states where it makes sense; empty = anywhere */
  sites?: string[];
  max?: number;
  /** national dreams unlock once the basics work: returns why not, or null */
  unlock?: (s: import("../engine/types").FixState) => string | null;
}

export const PROJECTS: ProjectDef[] = [
  // ------------------------------------------------------------ national dreams (late game)
  { id: "dreamWorldCup", name: "Host the World Cup (stadiums and fan cities)", cat: "National dreams", what: "Win the right to host a World Cup: eight stadiums, airports and trains. The whole country will be watching.", cost: 2600, months: 48, fxShare: 0.5, capacityNeed: 62, risk: 0.55, benefit: { happiness: 3, investor: 4, jobs: 1.2, transport: 3 }, benefitText: "A national celebration, jobs, investor confidence and transport", funding: ["treasury", "domestic", "concessional", "ppp"], sites: ["NG-LA", "NG-FC", "NG-RI"], max: 1, unlock: (s) => (s.projects.filter((p) => p.status === "done").length >= 4 ? null : "Finish four other projects first: a country that cannot deliver the basics cannot deliver a dream.") },
  { id: "dreamRailCalabar", name: "Lagos–Calabar coastal railway", cat: "National dreams", what: "A 1,400 km coastal rail line from Lagos to Calabar.", cost: 3400, months: 54, fxShare: 0.6, capacityNeed: 65, risk: 0.6, benefit: { rail: 14, ports: 4, transport: 4, jobs: 1.5 }, benefitText: "Cheaper freight, faster travel, a connected coast", funding: ["treasury", "concessional", "ppp"], sites: ["NG-LA", "NG-CR"], max: 1, unlock: (s) => (s.projects.filter((p) => p.status === "done").length >= 4 ? null : "Finish four other projects first: a country that cannot deliver the basics cannot deliver a dream.") },
  { id: "dreamPower24", name: "24-hour electricity programme", cat: "National dreams", what: "Gas, solar and grid upgrades so the light stays on, day and night.", cost: 2200, months: 40, fxShare: 0.55, capacityNeed: 60, risk: 0.5, benefit: { power: 1600, grid: 8, gas: 6, maint: 4 }, benefitText: "A giant leap in electricity supply", funding: ["treasury", "concessional", "ppp"], max: 1, unlock: (s) => (s.projects.filter((p) => p.status === "done").length >= 4 ? null : "Finish four other projects first: a country that cannot deliver the basics cannot deliver a dream.") },
  { id: "dreamTechCity", name: "Africa's tech capital: Silicon Lagos", cat: "National dreams", what: "A campus city for startups with fast internet, a university and a visa for talent.", cost: 900, months: 30, fxShare: 0.35, capacityNeed: 55, risk: 0.4, benefit: { skills: 4, investor: 5, jobs: 1.4, exports: 0.4, sme: 2 }, benefitText: "Thousands of tech jobs and foreign money", funding: ["treasury", "domestic", "ppp"], sites: ["NG-LA", "NG-FC", "NG-OG"], max: 1, unlock: (s) => (s.projects.filter((p) => p.status === "done").length >= 4 ? null : "Finish four other projects first: a country that cannot deliver the basics cannot deliver a dream.") },
  { id: "dreamPeace", name: "End the insurgency: peace and reconstruction", cat: "National dreams", what: "A massive security-and-development push in the north-east: soldiers, schools, farms and jobs for returning families.", cost: 1800, months: 40, fxShare: 0.25, capacityNeed: 58, risk: 0.55, benefit: { security: 10, forces: 4, jobs: 0.6 }, benefitText: "A lasting drop in insecurity", funding: ["treasury", "domestic", "concessional"], sites: ["NG-BO", "NG-YO", "NG-AD"], max: 1, unlock: (s) => (s.projects.filter((p) => p.status === "done").length >= 4 ? null : "Finish four other projects first: a country that cannot deliver the basics cannot deliver a dream.") },
  { id: "dreamSpace", name: "Nigerian space programme: first astronaut", cat: "National dreams", what: "A satellite factory and a seat on a rocket. Pure pride, plus some very good engineering jobs.", cost: 500, months: 36, fxShare: 0.7, capacityNeed: 50, risk: 0.5, benefit: { happiness: 2.5, skills: 2, investor: 2, trust: 2 }, benefitText: "National pride, skilled jobs and a headline the whole world reads", funding: ["treasury", "ppp"], sites: ["NG-FC"], max: 1, unlock: (s) => (s.projects.filter((p) => p.status === "done").length >= 4 ? null : "Finish four other projects first: a country that cannot deliver the basics cannot deliver a dream.") },

  { id: "refinery", name: "Refinery rehabilitation", cat: "Oil & fuel", what: "Restore an ageing state refinery so more fuel is made at home.", cost: 1400, months: 30, fxShare: 0.55, capacityNeed: 55, risk: 0.5, benefit: { refinery: 160 }, benefitText: "+160,000 barrels/day of fuel made locally", funding: ["treasury", "domestic", "concessional", "ppp"], sites: ["NG-RI", "NG-DE", "NG-KD"], max: 3 },
  { id: "pipelineSecure", name: "Pipeline monitoring network", cat: "Oil & fuel", what: "Sensors, patrols and community stations along the main crude lines.", cost: 260, months: 14, fxShare: 0.4, capacityNeed: 45, risk: 0.35, benefit: { oilTheft: -10, crude: 60 }, benefitText: "Less crude theft, more production", funding: ["treasury", "domestic", "ppp"], sites: ["NG-RI", "NG-BY", "NG-DE", "NG-AK"], max: 2 },
  { id: "storage", name: "Grain storage and cold chain", cat: "Food", what: "Warehouses, silos and cold rooms close to farms and markets.", cost: 360, months: 16, fxShare: 0.3, capacityNeed: 40, risk: 0.3, benefit: { storage: 14, postHarvest: 5 }, benefitText: "Less food rots; prices steadier through the year", funding: ["treasury", "domestic", "concessional", "ppp"], max: 4 },
  { id: "irrigation", name: "Irrigation scheme", cat: "Food", what: "Dams, canals and pumps for dry-season farming.", cost: 520, months: 24, fxShare: 0.4, capacityNeed: 50, risk: 0.45, benefit: { irrigation: 15, foodSupply: 3 }, benefitText: "Dry-season harvests; less weather risk", funding: ["treasury", "domestic", "concessional"], max: 3 },
  { id: "farmRoads", name: "Farm-to-market roads", cat: "Food", what: "All-weather rural roads linking farms to towns.", cost: 280, months: 14, fxShare: 0.2, capacityNeed: 35, risk: 0.35, benefit: { postHarvest: 4, foodSupply: 2, roads: 3 }, benefitText: "Food reaches markets faster and cheaper", funding: ["treasury", "domestic", "concessional"], max: 5 },
  { id: "foodProcessing", name: "Food processing hubs", cat: "Food", what: "Mills and factories that turn raw crops into packaged goods.", cost: 340, months: 18, fxShare: 0.45, capacityNeed: 45, risk: 0.35, benefit: { postHarvest: 3, manuf: 4, jobs: -0.3, exports: 0.07 }, benefitText: "Jobs, less waste and food exports", funding: ["treasury", "ppp", "concessional"], max: 3 },
  { id: "transmission", name: "Power transmission upgrade", cat: "Electricity", what: "New lines and transformers so power can actually reach people.", cost: 700, months: 24, fxShare: 0.55, capacityNeed: 50, risk: 0.45, benefit: { grid: 12, power: 350 }, benefitText: "A stronger grid; about +350 MW reaches users", funding: ["treasury", "concessional", "ppp"], max: 3 },
  { id: "solar", name: "Solar mini-grids", cat: "Electricity", what: "Local solar plants for towns and industrial clusters.", cost: 300, months: 12, fxShare: 0.65, capacityNeed: 30, risk: 0.25, benefit: { power: 220 }, benefitText: "+220 MW of local power; less diesel", funding: ["treasury", "concessional", "ppp"], max: 6 },
  { id: "gasPlant", name: "Gas power plant", cat: "Electricity", what: "A new gas-fired plant near a gas supply.", cost: 900, months: 28, fxShare: 0.7, capacityNeed: 55, risk: 0.5, benefit: { power: 600, gas: 4 }, benefitText: "+600 MW if gas supply holds", funding: ["treasury", "concessional", "ppp"], max: 2 },
  { id: "highway", name: "Highway and bridges", cat: "Roads & rail", what: "Dual carriageways and bridges on key freight corridors.", cost: 800, months: 30, fxShare: 0.3, capacityNeed: 45, risk: 0.6, benefit: { roads: 9, maint: 0 }, benefitText: "Faster, cheaper movement of goods", funding: ["treasury", "domestic", "concessional", "ppp"], max: 4 },
  { id: "rail", name: "Rail line", cat: "Roads & rail", what: "Freight and passenger rail linking cities and ports.", cost: 1500, months: 36, fxShare: 0.7, capacityNeed: 60, risk: 0.65, benefit: { rail: 14, roads: 1 }, benefitText: "Cheap bulk freight; fewer trucks on roads", funding: ["treasury", "concessional", "ppp"], max: 2 },
  { id: "port", name: "Port expansion", cat: "Roads & rail", what: "Deeper berths, cranes and a dry port.", cost: 650, months: 22, fxShare: 0.6, capacityNeed: 50, risk: 0.45, benefit: { ports: 11, exports: 0.1 }, benefitText: "Faster clearance, more exports", funding: ["treasury", "concessional", "ppp"], sites: ["NG-LA", "NG-RI", "NG-DE", "NG-CR", "NG-AK"], max: 2 },
  { id: "schools", name: "School building programme", cat: "People", what: "Classrooms, labs and teacher housing.", cost: 320, months: 18, fxShare: 0.1, capacityNeed: 35, risk: 0.3, benefit: { education: 7 }, benefitText: "Better schools", funding: ["treasury", "domestic", "concessional"], max: 6 },
  { id: "hospitals", name: "Hospitals and clinics", cat: "People", what: "Primary clinics and a referral hospital.", cost: 380, months: 18, fxShare: 0.3, capacityNeed: 40, risk: 0.3, benefit: { health: 7 }, benefitText: "Better care closer to home", funding: ["treasury", "domestic", "concessional"], max: 6 },
  { id: "industrial", name: "Manufacturing and export park", cat: "Industry", what: "Serviced land with power, roads and one-stop permits.", cost: 480, months: 20, fxShare: 0.4, capacityNeed: 50, risk: 0.4, benefit: { manuf: 8, exports: 0.22, jobs: -0.5, sme: 3 }, benefitText: "Factories, exports and jobs", funding: ["treasury", "ppp", "concessional"], max: 3 },
  { id: "transit", name: "City public transport", cat: "People", what: "Buses and rapid transit that cut commuting costs.", cost: 420, months: 18, fxShare: 0.5, capacityNeed: 45, risk: 0.4, benefit: { transport: -6, happiness: 1.5 }, benefitText: "Cheaper commutes; softer fuel-price shocks", funding: ["treasury", "ppp", "concessional"], sites: ["NG-LA", "NG-KN", "NG-FC", "NG-RI", "NG-OY", "NG-KD", "NG-EN"], max: 3 },
  { id: "securityInfra", name: "Security posts and surveillance", cat: "Security", what: "Barracks, radios, drones and rapid-response bases.", cost: 340, months: 14, fxShare: 0.5, capacityNeed: 45, risk: 0.35, benefit: { security: 7, forces: 6 }, benefitText: "Faster response to attacks", funding: ["treasury", "domestic"], max: 4 },
  { id: "water", name: "Water and sanitation", cat: "People", what: "Boreholes, treatment plants and drains.", cost: 260, months: 14, fxShare: 0.25, capacityNeed: 30, risk: 0.25, benefit: { health: 4, happiness: 1, welfare: 3 }, benefitText: "Cleaner water; fewer outbreaks", funding: ["treasury", "domestic", "concessional"], max: 6 },
];
export const PROJECT_BY_ID: Record<string, ProjectDef> = Object.fromEntries(PROJECTS.map((p) => [p.id, p]));
export const FUNDING_LABEL: Record<Funding, string> = {
  treasury: "Government cash",
  domestic: "Borrow from local banks",
  concessional: "Foreign development loan",
  ppp: "Private partnership",
};

// ---------------------------------------------------------------- measures (challenge actions)
export type Unc = "low" | "medium" | "high";
export interface MeasureDef {
  id: string;
  name: string;
  explain: string;
  cost: number; // ₦bn up front
  monthlyCost?: number; // ₦bn per month during duration
  duration: number;
  tradeoff: string;
  unc: Unc;
  effects: Effects;
  cooldown?: number;
}
export const MEASURES: MeasureDef[] = [
  { id: "grainReserve", name: "Release grain reserves", explain: "Sell stored grain at lower prices for a few months.", cost: 80, duration: 4, tradeoff: "Uses up your safety stock for the lean season.", unc: "low", effects: { foodPrice: -6, foodSupply: 3 }, cooldown: 8 },
  { id: "foodVouchers", name: "Food vouchers for the poorest", explain: "Targeted vouchers for registered poor households.", cost: 40, monthlyCost: 70, duration: 3, tradeoff: "Does not lower prices; leakage if registers are poor.", unc: "medium", effects: { happiness: 3, welfare: 5, wage: 0.1 }, cooldown: 6 },
  { id: "fxSale", name: "Sell dollars to support the naira", explain: "The central bank sells reserves to meet demand.", cost: 0, duration: 3, tradeoff: "Burns reserves that cannot be spent twice.", unc: "medium", effects: { fxSupply: 0.55, investor: 1 }, cooldown: 5 },
  { id: "importCurb", name: "Restrict non-essential imports", explain: "Limits luxury imports to save dollars.", cost: 5, duration: 6, tradeoff: "Smuggling, shortages and anger among traders.", unc: "high", effects: { fxDemand: -0.45, investor: -3, inflation: 0.8, trust: -1 }, cooldown: 6 },
  { id: "fuelTransferWave", name: "Emergency transport allowance", explain: "A temporary cash allowance for commuters and traders.", cost: 30, monthlyCost: 55, duration: 3, tradeoff: "Temporary; costs a lot and the fuel price stays high.", unc: "low", effects: { happiness: 3.5, trust: 1 }, cooldown: 6 },
  { id: "overtimeGrid", name: "Emergency grid repairs", explain: "Overtime crews fix the worst substations now.", cost: 60, duration: 5, tradeoff: "Short-term fix; the real problem is capacity.", unc: "medium", effects: { power: 380, grid: 3 }, cooldown: 6 },
  { id: "dieselRelief", name: "Support for diesel and gas users", explain: "Temporary help for factories on generators.", cost: 45, monthlyCost: 25, duration: 4, tradeoff: "Rewards firms for self-generation; costs money.", unc: "low", effects: { manuf: 3, jobs: -0.12 }, cooldown: 8 },
  { id: "wageDeal", name: "Pay deal with unions", explain: "Settle wage arrears and agree a modest rise.", cost: 90, monthlyCost: 25, duration: 6, tradeoff: "Raises the pay bill for good; other groups will ask.", unc: "low", effects: { happiness: 2, trust: 2, wage: 0.3, inflation: 0.5 }, cooldown: 6 },
  { id: "jobsBlitz", name: "Youth jobs blitz", explain: "Fast-track hiring for roads, tech and farm work.", cost: 50, monthlyCost: 40, duration: 4, tradeoff: "Temporary; leaves people disappointed when it ends.", unc: "medium", effects: { jobs: -0.55, happiness: 1.8 }, cooldown: 8 },
  { id: "securityPush", name: "Rapid security deployment", explain: "Move units and drones to the worst-hit area for a few months.", cost: 70, monthlyCost: 30, duration: 4, tradeoff: "Does not fix root causes; risks abuses if not supervised.", unc: "high", effects: { security: 6, forces: 2, trust: -0.8 }, cooldown: 5 },
  { id: "dialogue", name: "National dialogue and communication drive", explain: "Explain choices openly and meet the groups concerned.", cost: 12, duration: 3, tradeoff: "Words alone do not lower prices; can be seen as spin.", unc: "high", effects: { trust: 3, happiness: 1 }, cooldown: 4 },
  { id: "auditSweep", name: "Anti-corruption audit sweep", explain: "Audit big contracts and publish results.", cost: 35, duration: 6, tradeoff: "Angers allies; may expose your own side.", unc: "medium", effects: { corruption: -2.5, transparency: 4, trust: 1.5 }, cooldown: 8 },
  { id: "investorRoadshow", name: "Investor roadshow", explain: "Pitch reforms and projects abroad.", cost: 15, duration: 6, tradeoff: "Money follows results, not speeches.", unc: "high", effects: { investor: 4, fxSupply: 0.2 }, cooldown: 6 },
];
export const MEASURE_BY_ID: Record<string, MeasureDef> = Object.fromEntries(MEASURES.map((m) => [m.id, m]));

// ---------------------------------------------------------------- regions
type Z = "NC" | "NE" | "NW" | "SE" | "SS" | "SW";
export const ZONE_PRIORS: Record<Z, { food: number; insecurity: number; jobless: number; power: number; flood: number }> = {
  NE: { food: 66, insecurity: 82, jobless: 66, power: 78, flood: 34 },
  NW: { food: 62, insecurity: 72, jobless: 62, power: 72, flood: 32 },
  NC: { food: 52, insecurity: 62, jobless: 52, power: 62, flood: 44 },
  SE: { food: 46, insecurity: 38, jobless: 52, power: 56, flood: 46 },
  SS: { food: 46, insecurity: 50, jobless: 46, power: 52, flood: 68 },
  SW: { food: 40, insecurity: 24, jobless: 42, power: 42, flood: 40 },
};
export const REGION_OVERRIDES: Record<string, Partial<{ food: number; insecurity: number; jobless: number; power: number; flood: number }>> = {
  "NG-BO": { insecurity: 94, food: 76 }, "NG-YO": { insecurity: 86 }, "NG-ZA": { insecurity: 92 }, "NG-KT": { insecurity: 84 }, "NG-KD": { insecurity: 74 },
  "NG-BE": { insecurity: 80 }, "NG-PL": { insecurity: 74 }, "NG-NI": { insecurity: 70, flood: 62 }, "NG-KO": { flood: 66, insecurity: 64 },
  "NG-BY": { flood: 88, insecurity: 56 }, "NG-RI": { insecurity: 58, flood: 72, jobless: 52 }, "NG-DE": { flood: 74 }, "NG-AN": { flood: 62 },
  "NG-JI": { flood: 55 }, "NG-LA": { power: 30, jobless: 48, food: 38, insecurity: 22 }, "NG-FC": { power: 28, jobless: 40, insecurity: 40 },
  "NG-KN": { jobless: 66, power: 66 }, "NG-AK": { insecurity: 44 }, "NG-OG": { power: 36 },
};
