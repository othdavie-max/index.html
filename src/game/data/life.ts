/**
 * Life-simulation content: starting backgrounds, courses, jobs, businesses. Amounts are in naira at game-start
 * prices and are simulation assumptions (they scale with the simulated price level at runtime).
 */
import type { EducationLevel } from "./rules";
import type { PlayerAttrs } from "../engine/types";

export interface BackgroundDef {
  id: string;
  label: string;
  blurb: string;
  wealthTier: number; // 0..4
  politicalTies: number; // 0..4
  cash: number;
  savings: number;
  obligation: number; // monthly family obligation
  assets: { label: string; value: number; kind: "property" | "vehicle" | "land" | "equity" | "other" }[];
  debts: { label: string; principal: number; rate: number; months: number }[];
  fatherJobs: string[];
  motherJobs: string[];
  attrMods: Partial<PlayerAttrs>;
  connectionsBase: number; // initial relationships with local political figures
  challenges: string[];
}

export const BACKGROUNDS: BackgroundDef[] = [
  {
    id: "low", label: "Low-income family", wealthTier: 0, politicalTies: 0, cash: 15_000, savings: 0, obligation: 12_000, assets: [], debts: [],
    blurb: "Money is tight. You depend on scholarships, hustle and community goodwill, but you know the daily struggles voters face.",
    fatherJobs: ["subsistence farmer", "commercial motorcyclist", "day labourer", "petty trader"], motherJobs: ["market trader", "food seller", "farmer", "seamstress"],
    attrMods: { integrity: 6, stress: 8, reputation: 2 }, connectionsBase: 0,
    challenges: ["Tuition and upkeep are hard to cover", "Few connections to party insiders", "Family counts on your support"],
  },
  {
    id: "working", label: "Working-class family", wealthTier: 1, politicalTies: 0, cash: 60_000, savings: 40_000, obligation: 15_000, assets: [], debts: [],
    blurb: "Steady but modest income from a trade or low-grade civil service job.",
    fatherJobs: ["artisan", "junior civil servant", "driver", "primary-school teacher"], motherJobs: ["trader", "nurse's aide", "caterer", "tailor"],
    attrMods: { financialMgmt: 3 }, connectionsBase: 1,
    challenges: ["Limited savings", "Little exposure to party politics"],
  },
  {
    id: "middle", label: "Middle-income household", wealthTier: 2, politicalTies: 1, cash: 250_000, savings: 400_000, obligation: 20_000, assets: [{ label: "Family home (share)", value: 6_000_000, kind: "property" }], debts: [],
    blurb: "Professional parents — comfortable, with an education-first outlook and a few useful acquaintances.",
    fatherJobs: ["secondary-school principal", "mid-level bank manager", "engineer", "civil servant (grade level 12)"], motherJobs: ["nurse", "lecturer", "civil servant", "shop owner"],
    attrMods: { intelligence: 3, communication: 2 }, connectionsBase: 2,
    challenges: ["Expected to follow a respectable profession"],
  },
  {
    id: "business", label: "Wealthy business family", wealthTier: 3, politicalTies: 2, cash: 2_000_000, savings: 5_000_000, obligation: 40_000,
    assets: [{ label: "Family home (share)", value: 25_000_000, kind: "property" }, { label: "Family business equity (share)", value: 15_000_000, kind: "equity" }], debts: [],
    blurb: "A prominent trading and logistics family. Money and business contacts are plentiful; trust and ground-level credibility must still be earned.",
    fatherJobs: ["owner of a distribution company", "importer", "construction contractor", "hotel owner"], motherJobs: ["boutique owner", "company director", "real-estate agent", "caterer"],
    attrMods: { financialMgmt: 5, negotiation: 4, reputation: -2 }, connectionsBase: 3,
    challenges: ["Voters suspect wealth equals privilege", "Family expects you to protect the business"],
  },
  {
    id: "political", label: "Politically connected family", wealthTier: 2, politicalTies: 4, cash: 300_000, savings: 600_000, obligation: 30_000, assets: [{ label: "Family home (share)", value: 12_000_000, kind: "property" }], debts: [],
    blurb: "A parent has served as a councillor or party official. Doors open — but so do rivalries, and your name carries baggage.",
    fatherJobs: ["former LGA councillor", "party ward chairman", "retired permanent secretary", "traditional-title holder"], motherJobs: ["women's-wing leader", "trader", "school principal", "civil servant"],
    attrMods: { negotiation: 4, communication: 3 }, connectionsBase: 5,
    challenges: ["Family feuds and expectations", "Seen as an insider by voters"],
  },
  {
    id: "inherited", label: "Inherited wealth, few political ties", wealthTier: 4, politicalTies: 0, cash: 3_000_000, savings: 12_000_000,
    obligation: 25_000, assets: [{ label: "Inherited land and rental property", value: 80_000_000, kind: "property" }],
    debts: [],
    blurb: "Your grandparents left substantial property. You are comfortable but politically unknown.",
    fatherJobs: ["landlord", "retired businessman", "estate manager"], motherJobs: ["homemaker", "retired teacher", "landlady"],
    attrMods: { financialMgmt: 2, ambition: -3 }, connectionsBase: 0,
    challenges: ["No network", "Easily seen as detached from ordinary life"],
  },
  {
    id: "connected_poor", label: "Political connections, limited money", wealthTier: 1, politicalTies: 3, cash: 40_000, savings: 20_000, obligation: 18_000, assets: [], debts: [{ label: "Family loan", principal: 200_000, rate: 12, months: 36 }],
    blurb: "Your relatives are respected in party circles, but the household lives hand-to-mouth supporting the family's political favours.",
    fatherJobs: ["party agent", "local-government staff", "community leader"], motherJobs: ["trader", "party women's wing officer", "caterer"],
    attrMods: { communication: 3, negotiation: 3, financialMgmt: -2 }, connectionsBase: 4,
    challenges: ["Obligations without resources", "Debts incurred for political favours"],
  },
];
export const BACKGROUND_BY_ID: Record<string, BackgroundDef> = Object.fromEntries(BACKGROUNDS.map((b) => [b.id, b]));

// ---------------------------------------------------------------- education
export type InstType = "federal" | "state" | "private" | "polytechnic";
export interface CourseDef {
  id: string;
  label: string;
  field: string;
  level: EducationLevel; // level awarded
  years: number;
  /** minimum admission difficulty 0..1 (higher = harder) */
  difficulty: number;
  requires?: EducationLevel;
  requiresField?: string;
  attrGain: Partial<PlayerAttrs>; // total gain over the programme
  certificate: string;
  followOn?: string; // e.g. law → law school
}
export const COURSES: CourseDef[] = [
  { id: "law", label: "LL.B Law", field: "Law", level: "bachelor", years: 5, difficulty: 0.7, attrGain: { communication: 14, negotiation: 10, intelligence: 8 }, certificate: "LL.B Law", followOn: "law_school" },
  { id: "polsci", label: "B.Sc Political Science", field: "Political Science", level: "bachelor", years: 4, difficulty: 0.5, attrGain: { communication: 8, negotiation: 8, intelligence: 6, politicalExperience: 6 }, certificate: "B.Sc Political Science" },
  { id: "economics", label: "B.Sc Economics", field: "Economics", level: "bachelor", years: 4, difficulty: 0.55, attrGain: { financialMgmt: 14, intelligence: 8 }, certificate: "B.Sc Economics" },
  { id: "business", label: "B.Sc Business Administration", field: "Business", level: "bachelor", years: 4, difficulty: 0.45, attrGain: { financialMgmt: 10, leadership: 6, negotiation: 6 }, certificate: "B.Sc Business Administration" },
  { id: "massco", label: "B.Sc Mass Communication", field: "Mass Communication", level: "bachelor", years: 4, difficulty: 0.55, attrGain: { communication: 14, charisma: 6 }, certificate: "B.Sc Mass Communication" },
  { id: "engineering", label: "B.Eng Engineering", field: "Engineering", level: "bachelor", years: 5, difficulty: 0.7, attrGain: { intelligence: 12, leadership: 4, financialMgmt: 4 }, certificate: "B.Eng Engineering" },
  { id: "medicine", label: "MBBS Medicine & Surgery", field: "Medicine", level: "bachelor", years: 6, difficulty: 0.85, attrGain: { intelligence: 14, leadership: 5, reputation: 8 }, certificate: "MBBS" },
  { id: "education", label: "B.Ed Education", field: "Education", level: "bachelor", years: 4, difficulty: 0.35, attrGain: { communication: 8, leadership: 6 }, certificate: "B.Ed" },
  { id: "agric", label: "B.Agric Agriculture", field: "Agriculture", level: "bachelor", years: 5, difficulty: 0.35, attrGain: { financialMgmt: 5, leadership: 5 }, certificate: "B.Agric" },
  { id: "compsci", label: "B.Sc Computer Science", field: "Computer Science", level: "bachelor", years: 4, difficulty: 0.6, attrGain: { intelligence: 12, financialMgmt: 3 }, certificate: "B.Sc Computer Science" },
  { id: "sociology", label: "B.Sc Sociology", field: "Social Sciences", level: "bachelor", years: 4, difficulty: 0.35, attrGain: { communication: 8, leadership: 6, politicalExperience: 4 }, certificate: "B.Sc Sociology" },
  { id: "nd_business", label: "ND Business Studies (Polytechnic)", field: "Business", level: "nd", years: 2, difficulty: 0.25, attrGain: { financialMgmt: 6, leadership: 3 }, certificate: "ND Business Studies" },
  { id: "nd_eng", label: "ND Electrical Engineering (Polytechnic)", field: "Engineering", level: "nd", years: 2, difficulty: 0.3, attrGain: { intelligence: 5, financialMgmt: 2 }, certificate: "ND Electrical Engineering" },
  { id: "law_school", label: "Nigerian Law School (Bar Part II)", field: "Law", level: "bachelor", years: 1, difficulty: 0.4, requires: "bachelor", requiresField: "Law", attrGain: { communication: 6, negotiation: 4 }, certificate: "Called to the Bar (BL)" },
  { id: "msc_public_admin", label: "M.Sc Public Administration", field: "Public Administration", level: "masters", years: 2, difficulty: 0.45, requires: "bachelor", attrGain: { leadership: 8, negotiation: 6, politicalExperience: 5 }, certificate: "M.Sc Public Administration" },
  { id: "mba", label: "MBA", field: "Business", level: "masters", years: 2, difficulty: 0.5, requires: "bachelor", attrGain: { financialMgmt: 10, leadership: 8, negotiation: 6 }, certificate: "MBA" },
  { id: "msc_econ", label: "M.Sc Economics", field: "Economics", level: "masters", years: 2, difficulty: 0.5, requires: "bachelor", attrGain: { financialMgmt: 10, intelligence: 8 }, certificate: "M.Sc Economics" },
];
export const COURSE_BY_ID: Record<string, CourseDef> = Object.fromEntries(COURSES.map((c) => [c.id, c]));

export const INSTITUTION_COST: Record<InstType, { label: string; tuitionYear: number; livingMonth: number; admissionBonus: number }> = {
  federal: { label: "Federal university", tuitionYear: 90_000, livingMonth: 35_000, admissionBonus: -0.12 },
  state: { label: "State university", tuitionYear: 220_000, livingMonth: 35_000, admissionBonus: 0 },
  private: { label: "Private university", tuitionYear: 1_800_000, livingMonth: 70_000, admissionBonus: 0.15 },
  polytechnic: { label: "Polytechnic", tuitionYear: 80_000, livingMonth: 30_000, admissionBonus: 0.1 },
};

// ---------------------------------------------------------------- jobs
export interface JobDef {
  id: string;
  label: string;
  sector: "informal" | "private" | "public" | "professional" | "education" | "ngo" | "media";
  minEducation: EducationLevel;
  requiresCert?: string;
  requiresNysc?: boolean;
  salary: number;
  variance: number; // income volatility 0..1 for informal work
  timePct: number;
  /** monthly passive gains */
  gains: Partial<PlayerAttrs & { connections: number; fame: number }>;
  /** how hard to land (0..1) */
  difficulty: number;
  blurb: string;
  progression?: { to: string; afterMonths: number; minPerformance?: number }[];
  isPublicService?: boolean;
}
export const JOBS: JobDef[] = [
  { id: "trader", label: "Market trader", sector: "informal", minEducation: "none", salary: 55_000, variance: 0.45, timePct: 60, gains: { connections: 0.1, communication: 0.05 }, difficulty: 0.05, blurb: "Buy and sell at the local market. Income varies with prices and footfall." },
  { id: "okada", label: "Ride-hailing / commercial rider", sector: "informal", minEducation: "none", salary: 62_000, variance: 0.35, timePct: 70, gains: { connections: 0.05 }, difficulty: 0.05, blurb: "Transport income swings with fuel prices." },
  { id: "farmer", label: "Smallholder farmer", sector: "informal", minEducation: "none", salary: 45_000, variance: 0.5, timePct: 65, gains: { leadership: 0.02 }, difficulty: 0.05, blurb: "Seasonal income that depends on rain, security and input prices." },
  { id: "artisan", label: "Artisan / technician", sector: "informal", minEducation: "secondary", salary: 70_000, variance: 0.3, timePct: 65, gains: { connections: 0.1 }, difficulty: 0.1, blurb: "Skilled trade work — electrical, tailoring, welding." },
  { id: "shop_attendant", label: "Shop attendant", sector: "private", minEducation: "secondary", salary: 52_000, variance: 0.05, timePct: 70, gains: { communication: 0.05 }, difficulty: 0.08, blurb: "Steady, low-paid retail work." },
  { id: "private_teacher", label: "Private-school teacher", sector: "education", minEducation: "nd", salary: 75_000, variance: 0.05, timePct: 60, gains: { communication: 0.1, fame: 0.1 }, difficulty: 0.2, blurb: "Teaching in a private school — modest pay, good local standing." },
  { id: "public_teacher", label: "Public-school teacher", sector: "public", minEducation: "bachelor", requiresNysc: true, salary: 105_000, variance: 0.03, timePct: 55, gains: { communication: 0.1, fame: 0.1, connections: 0.05 }, difficulty: 0.3, isPublicService: true, blurb: "State teaching service. Pensionable; salaries are sometimes delayed.", progression: [{ to: "head_teacher", afterMonths: 60 }] },
  { id: "head_teacher", label: "Head teacher / principal", sector: "public", minEducation: "bachelor", salary: 190_000, variance: 0.03, timePct: 60, gains: { leadership: 0.15, fame: 0.2, connections: 0.1 }, difficulty: 0.6, isPublicService: true, blurb: "Runs a school and sits on community committees." },
  { id: "civil_servant", label: "Civil servant (GL 08)", sector: "public", minEducation: "nd", requiresNysc: true, salary: 140_000, variance: 0.03, timePct: 55, gains: { connections: 0.2, politicalExperience: 0.1, negotiation: 0.05 }, difficulty: 0.35, isPublicService: true, blurb: "Federal or state ministry. Slow promotions; strong network inside government.", progression: [{ to: "senior_civil_servant", afterMonths: 48 }] },
  { id: "senior_civil_servant", label: "Senior civil servant (GL 14)", sector: "public", minEducation: "bachelor", salary: 320_000, variance: 0.03, timePct: 60, gains: { connections: 0.3, politicalExperience: 0.25, negotiation: 0.1, leadership: 0.1 }, difficulty: 0.7, isPublicService: true, blurb: "Directorate-level officer who understands how budgets and procurement really work." },
  { id: "bank_officer", label: "Bank officer", sector: "private", minEducation: "bachelor", requiresNysc: true, salary: 230_000, variance: 0.05, timePct: 70, gains: { financialMgmt: 0.25, connections: 0.15 }, difficulty: 0.45, blurb: "Retail banking; good pay and corporate contacts." },
  { id: "journalist", label: "Journalist", sector: "media", minEducation: "bachelor", requiresNysc: true, salary: 150_000, variance: 0.08, timePct: 65, gains: { communication: 0.25, fame: 0.35, connections: 0.2, integrity: 0.05 }, difficulty: 0.4, blurb: "Reporting builds name recognition and contacts across the political class." },
  { id: "ngo_officer", label: "NGO programme officer", sector: "ngo", minEducation: "bachelor", requiresNysc: true, salary: 190_000, variance: 0.05, timePct: 60, gains: { leadership: 0.15, connections: 0.2, fame: 0.15, integrity: 0.05 }, difficulty: 0.4, blurb: "Community programmes funded by donors." },
  { id: "software_dev", label: "Software developer", sector: "private", minEducation: "bachelor", salary: 380_000, variance: 0.1, timePct: 65, gains: { intelligence: 0.1, financialMgmt: 0.05 }, difficulty: 0.55, blurb: "Well-paid but time-consuming tech work." },
  { id: "engineer", label: "Engineer", sector: "professional", minEducation: "bachelor", requiresNysc: true, salary: 320_000, variance: 0.05, timePct: 70, gains: { intelligence: 0.1, leadership: 0.08, connections: 0.1 }, difficulty: 0.5, blurb: "Works for contractors, utilities or consultancies." },
  { id: "associate_lawyer", label: "Associate lawyer", sector: "professional", minEducation: "bachelor", requiresCert: "Called to the Bar (BL)", requiresNysc: true, salary: 280_000, variance: 0.1, timePct: 75, gains: { communication: 0.2, negotiation: 0.2, connections: 0.2, fame: 0.1 }, difficulty: 0.45, blurb: "Chambers work, litigation and political clients." },
  { id: "junior_doctor", label: "House officer / junior doctor", sector: "professional", minEducation: "bachelor", requiresCert: "MBBS", requiresNysc: true, salary: 420_000, variance: 0.05, timePct: 85, gains: { reputation: 0.1, fame: 0.2, connections: 0.1 }, difficulty: 0.4, blurb: "Punishing hours, high public respect." },
  { id: "lecturer", label: "University lecturer", sector: "education", minEducation: "masters", salary: 260_000, variance: 0.03, timePct: 55, gains: { intelligence: 0.1, communication: 0.1, fame: 0.1 }, difficulty: 0.55, isPublicService: true, blurb: "Teaching and research. Exposed to strike action." },
  { id: "consultant", label: "Independent consultant", sector: "private", minEducation: "bachelor", salary: 250_000, variance: 0.35, timePct: 50, gains: { connections: 0.25, negotiation: 0.1 }, difficulty: 0.5, blurb: "Irregular contracts; flexible time." },
];
export const JOB_BY_ID: Record<string, JobDef> = Object.fromEntries(JOBS.map((j) => [j.id, j]));

// ---------------------------------------------------------------- businesses
export interface BusinessTypeDef {
  id: string;
  label: string;
  startup: number;
  revenue: number;
  costs: number;
  employees: number;
  /** how sensitive the business is to power cost (0..1) */
  powerSensitivity: number;
  fuelSensitivity: number;
  /** eligible for government contracts */
  contractor: boolean;
  blurb: string;
}
export const BUSINESS_TYPES: BusinessTypeDef[] = [
  { id: "provisions", label: "Provisions store", startup: 600_000, revenue: 320_000, costs: 250_000, employees: 2, powerSensitivity: 0.3, fuelSensitivity: 0.1, contractor: false, blurb: "Reliable neighbourhood retail." },
  { id: "farm", label: "Commercial farm", startup: 1_500_000, revenue: 520_000, costs: 400_000, employees: 5, powerSensitivity: 0.1, fuelSensitivity: 0.3, contractor: false, blurb: "Exposed to security, rains and input prices." },
  { id: "restaurant", label: "Restaurant & catering", startup: 2_500_000, revenue: 900_000, costs: 720_000, employees: 8, powerSensitivity: 0.6, fuelSensitivity: 0.2, contractor: false, blurb: "Needs steady electricity and footfall." },
  { id: "transport", label: "Transport fleet", startup: 8_000_000, revenue: 2_300_000, costs: 1_900_000, employees: 10, powerSensitivity: 0.05, fuelSensitivity: 0.8, contractor: false, blurb: "Highly sensitive to fuel price." },
  { id: "tech", label: "Tech start-up", startup: 3_000_000, revenue: 700_000, costs: 650_000, employees: 6, powerSensitivity: 0.5, fuelSensitivity: 0.05, contractor: false, blurb: "High variance — can scale quickly or fold." },
  { id: "school", label: "Private school", startup: 6_000_000, revenue: 1_800_000, costs: 1_400_000, employees: 14, powerSensitivity: 0.3, fuelSensitivity: 0.05, contractor: false, blurb: "Builds community standing." },
  { id: "construction", label: "Construction firm", startup: 12_000_000, revenue: 4_200_000, costs: 3_700_000, employees: 18, powerSensitivity: 0.15, fuelSensitivity: 0.4, contractor: true, blurb: "Can bid for public contracts — a route for both legitimate work and conflicts of interest." },
];
export const BUSINESS_BY_ID: Record<string, BusinessTypeDef> = Object.fromEntries(BUSINESS_TYPES.map((b) => [b.id, b]));

/** Start-of-game monthly cost of living (food, transport, utilities, housing) by wealth tier at price level 100. */
export const LIVING_COSTS = {
  food: [28_000, 32_000, 45_000, 80_000, 130_000],
  transport: [10_000, 12_000, 20_000, 40_000, 70_000],
  utilities: [6_000, 8_000, 15_000, 40_000, 70_000],
  rent: [0, 15_000, 40_000, 120_000, 250_000],
};
export const STUDENT_COMMITMENT_TIME = { volunteering: 10, organising: 15, partyWork: 15, studentUnion: 10, professionalBody: 5, selfStudy: 10, constituencyWork: 25, family: 10 };
