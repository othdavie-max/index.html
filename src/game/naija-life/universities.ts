import { T } from "./util";

export type UniKind = "federal" | "state" | "private";

export interface Uni {
  id: string;
  short: string;
  name: string;
  kind: UniKind;
  state: string;
  /** Yearly fee for an ordinary course, in base-year naira. */
  fee: number;
  /** Base JAMB cut-off mark. Courses add to it. */
  cut: number;
  /** 1-10. Drives pay, hiring and connections after graduation. */
  prestige: number;
  /** When set, only these courses are offered. */
  only?: string[];
  /** Courses this university does not offer. */
  skip?: string[];
  blurb: string;
}

const NO_MED = ["mbbs", "dent", "vet", "pharm", "law", "petr"];

export const UNIS: Uni[] = [
  // Federal
  { id: "unilag", short: "UNILAG", name: "University of Lagos", kind: "federal", state: "lagos", fee: 190_000, cut: 255, prestige: 9, blurb: "Akoka. The Pride of Lagos, with the best connections in the country." },
  { id: "ui", short: "UI", name: "University of Ibadan", kind: "federal", state: "oyo", fee: 170_000, cut: 250, prestige: 10, blurb: "Nigeria's premier university. Ivory-tower prestige." },
  { id: "oau", short: "OAU", name: "Obafemi Awolowo University", kind: "federal", state: "osun", fee: 160_000, cut: 245, prestige: 9, blurb: "Ife. Beautiful campus, famous for activism and brains." },
  { id: "unn", short: "UNN", name: "University of Nigeria, Nsukka", kind: "federal", state: "enugu", fee: 150_000, cut: 235, prestige: 8, blurb: "Nsukka. First indigenous university, proudly Igbo." },
  { id: "abu", short: "ABU", name: "Ahmadu Bello University", kind: "federal", state: "kaduna", fee: 140_000, cut: 230, prestige: 8, blurb: "Zaria. The biggest university in West Africa." },
  { id: "uniben", short: "UNIBEN", name: "University of Benin", kind: "federal", state: "edo", fee: 160_000, cut: 235, prestige: 8, blurb: "Ugbowo. Lively campus, strong in law and medicine." },
  { id: "unilorin", short: "UNILORIN", name: "University of Ilorin", kind: "federal", state: "kwara", fee: 170_000, cut: 240, prestige: 8, blurb: "Ilorin. Well run, few strikes, strict rules." },
  { id: "uniport", short: "UNIPORT", name: "University of Port Harcourt", kind: "federal", state: "rivers", fee: 180_000, cut: 230, prestige: 7, blurb: "Choba. Close to oil money." },
  { id: "futa", short: "FUTA", name: "Federal University of Technology, Akure", kind: "federal", state: "ondo", fee: 170_000, cut: 235, prestige: 7, only: ["civ", "elec", "mech", "chem", "petr", "arch", "surv", "est", "cs", "swe", "is", "bio", "micro", "phys", "chm", "math", "stat", "geo", "agric", "fst"], blurb: "Akure. Technology school for engineers and scientists." },
  { id: "buk", short: "BUK", name: "Bayero University, Kano", kind: "federal", state: "kano", fee: 130_000, cut: 225, prestige: 7, blurb: "Kano. The north's commerce and learning hub." },
  { id: "unizik", short: "UNIZIK", name: "Nnamdi Azikiwe University", kind: "federal", state: "anambra", fee: 160_000, cut: 230, prestige: 7, blurb: "Awka. Big on law, business and medicine." },
  { id: "uniabuja", short: "UNIABUJA", name: "University of Abuja", kind: "federal", state: "abuja", fee: 190_000, cut: 225, prestige: 7, blurb: "Gwagwalada. Close to the seat of power." },
  { id: "futminna", short: "FUTMINNA", name: "Federal University of Technology, Minna", kind: "federal", state: "niger", fee: 120_000, cut: 215, prestige: 6, only: ["civ", "elec", "mech", "chem", "arch", "surv", "est", "cs", "swe", "is", "bio", "micro", "phys", "chm", "math", "stat", "geo", "agric", "fst", "edu"], blurb: "Minna. A solid, cheaper technology school." },
  { id: "unijos", short: "UNIJOS", name: "University of Jos", kind: "federal", state: "plateau", fee: 130_000, cut: 215, prestige: 6, blurb: "Jos. Cool weather and a quiet campus." },
  { id: "unical", short: "UNICAL", name: "University of Calabar", kind: "federal", state: "cross-river", fee: 140_000, cut: 215, prestige: 6, blurb: "Calabar. Friendly city, carnival vibes." },
  { id: "unimaid", short: "UNIMAID", name: "University of Maiduguri", kind: "federal", state: "borno", fee: 90_000, cut: 190, prestige: 5, blurb: "Maiduguri. Very low fees. Security is the worry." },
  // State
  { id: "lasu", short: "LASU", name: "Lagos State University", kind: "state", state: "lagos", fee: 320_000, cut: 235, prestige: 7, blurb: "Ojo. Affordable and well connected for Lagos jobs." },
  { id: "oou", short: "OOU", name: "Olabisi Onabanjo University", kind: "state", state: "ogun", fee: 250_000, cut: 215, prestige: 5, blurb: "Ago-Iwoye. Famous for rowdy student life." },
  { id: "rsu", short: "RSU", name: "Rivers State University", kind: "state", state: "rivers", fee: 280_000, cut: 210, prestige: 5, blurb: "Port Harcourt. Oil-industry links." },
  { id: "absu", short: "ABSU", name: "Abia State University", kind: "state", state: "abia", fee: 200_000, cut: 200, prestige: 4, blurb: "Uturu. A local favourite." },
  { id: "aaua", short: "AAUA", name: "Adekunle Ajasin University", kind: "state", state: "ondo", fee: 180_000, cut: 195, prestige: 4, blurb: "Akungba. Low fees, lively campus." },
  // Private
  { id: "covenant", short: "Covenant", name: "Covenant University", kind: "private", state: "ogun", fee: 2_450_000, cut: 200, prestige: 8, blurb: "Ota. Strict dress code, serious about grades and discipline." },
  { id: "babcock", short: "Babcock", name: "Babcock University", kind: "private", state: "ogun", fee: 2_850_000, cut: 200, prestige: 8, blurb: "Ilishan-Remo. Respected for medicine and nursing." },
  { id: "bowen", short: "Bowen", name: "Bowen University", kind: "private", state: "osun", fee: 1_850_000, cut: 180, prestige: 6, blurb: "Iwo. Baptist-owned, calm and tidy." },
  { id: "abuad", short: "Afe Babalola", name: "Afe Babalola University", kind: "private", state: "ekiti", fee: 3_100_000, cut: 200, prestige: 8, blurb: "Ado-Ekiti. Excellent law, medicine and engineering." },
  { id: "landmark", short: "Landmark", name: "Landmark University", kind: "private", state: "kwara", fee: 1_650_000, cut: 170, prestige: 5, skip: NO_MED, blurb: "Omu-Aran. Farm-centred and entrepreneurial." },
  { id: "redeemers", short: "Redeemer's", name: "Redeemer's University", kind: "private", state: "osun", fee: 1_500_000, cut: 175, prestige: 6, blurb: "Ede. Church-run and orderly." },
  { id: "pau", short: "Pan-Atlantic", name: "Pan-Atlantic University", kind: "private", state: "lagos", fee: 3_400_000, cut: 195, prestige: 8, only: ["ba", "mkt", "bank", "acc", "econ", "mass", "cs", "is", "poli", "intl", "psy", "eng"], blurb: "Lekki. Business and media school with a corporate pipeline." },
  { id: "bingham", short: "Bingham", name: "Bingham University", kind: "private", state: "nasarawa", fee: 1_300_000, cut: 160, prestige: 5, blurb: "Karu. Close to Abuja at lower prices." },
  { id: "madonna", short: "Madonna", name: "Madonna University", kind: "private", state: "anambra", fee: 1_250_000, cut: 170, prestige: 5, blurb: "Okija. Popular for medicine and nursing." },
  { id: "aun", short: "AUN", name: "American University of Nigeria", kind: "private", state: "adamawa", fee: 5_200_000, cut: 190, prestige: 8, skip: ["mbbs", "dent", "vet", "pharm", "nurs", "mls", "physio", "law", "petr", "theatre", "music"], blurb: "Yola. American-style liberal arts, very expensive." },
  { id: "nile", short: "Nile", name: "Nile University of Nigeria", kind: "private", state: "abuja", fee: 2_600_000, cut: 185, prestige: 6, skip: ["mbbs", "dent", "vet", "nurs", "pharm", "petr"], blurb: "Abuja. Business-friendly and close to power." },
  { id: "baze", short: "Baze", name: "Baze University", kind: "private", state: "abuja", fee: 3_000_000, cut: 185, prestige: 6, skip: ["dent", "vet", "petr"], blurb: "Abuja. Modern campus, strong in law and medicine." },
  { id: "caleb", short: "Caleb", name: "Caleb University", kind: "private", state: "lagos", fee: 1_900_000, cut: 170, prestige: 5, skip: ["dent", "vet", "petr", "pharm"], blurb: "Imota. Affordable private option near Lagos." },
];
export const UNI_BY_ID: Record<string, Uni> = Object.fromEntries(UNIS.map((u) => [u.id, u]));

export interface Major {
  id: string;
  get label(): string;
  /** The broad field jobs ask for. */
  field: string;
  years: number;
  /** Added to the university's JAMB cut-off. */
  cut: number;
  /** Fee multiplier. */
  fee: number;
  /** 0-1: how hard it is to score well. */
  hard: number;
}
const m = (id: string, en: string, pcm: string, field: string, years: number, cut: number, fee: number, hard: number): Major => ({ id, get label() { return T(en, pcm); }, field, years, cut, fee, hard });
export const MAJORS: Major[] = [
  m("mbbs", "Medicine and Surgery", "Medicine and Surgery", "Medicine", 6, 60, 1.8, 0.9),
  m("dent", "Dentistry", "Dentistry", "Medicine", 6, 50, 1.8, 0.85),
  m("vet", "Veterinary Medicine", "Veterinary Medicine", "Agriculture", 6, 30, 1.3, 0.8),
  m("nurs", "Nursing Science", "Nursing Science", "Nursing", 5, 30, 1.4, 0.7),
  m("pharm", "Pharmacy", "Pharmacy", "Nursing", 5, 40, 1.5, 0.8),
  m("mls", "Medical Laboratory Science", "Medical Laboratory Science", "Nursing", 5, 25, 1.3, 0.75),
  m("physio", "Physiotherapy", "Physiotherapy", "Nursing", 5, 20, 1.3, 0.7),
  m("law", "Law", "Law", "Law", 5, 40, 1.3, 0.8),
  m("civ", "Civil Engineering", "Civil Engineering", "Engineering", 5, 30, 1.4, 0.85),
  m("elec", "Electrical Engineering", "Electrical Engineering", "Engineering", 5, 30, 1.4, 0.85),
  m("mech", "Mechanical Engineering", "Mechanical Engineering", "Engineering", 5, 25, 1.4, 0.8),
  m("chem", "Chemical Engineering", "Chemical Engineering", "Engineering", 5, 25, 1.4, 0.8),
  m("petr", "Petroleum Engineering", "Petroleum Engineering", "Engineering", 5, 35, 1.5, 0.85),
  m("arch", "Architecture", "Architecture", "Engineering", 5, 20, 1.3, 0.75),
  m("surv", "Surveying and Geoinformatics", "Surveying and Geoinformatics", "Engineering", 5, 10, 1.1, 0.6),
  m("cs", "Computer Science", "Computer Science", "Computer Science", 4, 30, 1.3, 0.7),
  m("swe", "Software Engineering", "Software Engineering", "Computer Science", 4, 30, 1.3, 0.7),
  m("is", "Information Systems", "Information Systems", "Computer Science", 4, 15, 1.1, 0.55),
  m("acc", "Accounting", "Accounting", "Accounting", 4, 25, 1.0, 0.6),
  m("bank", "Banking and Finance", "Banking and Finance", "Business", 4, 10, 1.0, 0.5),
  m("ba", "Business Administration", "Business Administration", "Business", 4, 5, 1.0, 0.45),
  m("mkt", "Marketing", "Marketing", "Business", 4, 0, 1.0, 0.4),
  m("est", "Estate Management", "Estate Management", "Business", 5, 15, 1.1, 0.55),
  m("econ", "Economics", "Economics", "Social Sciences", 4, 20, 1.0, 0.6),
  m("poli", "Political Science", "Political Science", "Social Sciences", 4, 10, 1.0, 0.45),
  m("intl", "International Relations", "International Relations", "Social Sciences", 4, 15, 1.0, 0.5),
  m("soc", "Sociology", "Sociology", "Social Sciences", 4, 0, 1.0, 0.4),
  m("psy", "Psychology", "Psychology", "Social Sciences", 4, 15, 1.0, 0.55),
  m("mass", "Mass Communication", "Mass Communication", "Mass Communication", 4, 20, 1.0, 0.5),
  m("eng", "English and Literary Studies", "English and Literary Studies", "Arts", 4, 5, 1.0, 0.45),
  m("hist", "History and Diplomacy", "History and Diplomacy", "Arts", 4, 0, 1.0, 0.4),
  m("theatre", "Theatre and Creative Arts", "Theatre and Creative Arts", "Arts", 4, 0, 1.0, 0.4),
  m("music", "Music", "Music", "Arts", 4, 0, 1.0, 0.4),
  m("edu", "Education", "Education", "Education", 4, -10, 0.85, 0.35),
  m("bio", "Biochemistry", "Biochemistry", "Science", 4, 25, 1.1, 0.7),
  m("micro", "Microbiology", "Microbiology", "Science", 4, 15, 1.1, 0.65),
  m("phys", "Physics", "Physics", "Science", 4, 10, 1.0, 0.75),
  m("chm", "Chemistry", "Chemistry", "Science", 4, 10, 1.0, 0.7),
  m("math", "Mathematics", "Mathematics", "Science", 4, 5, 1.0, 0.75),
  m("stat", "Statistics", "Statistics", "Science", 4, 0, 1.0, 0.6),
  m("geo", "Geology", "Geology", "Science", 4, 10, 1.1, 0.65),
  m("agric", "Agriculture", "Agriculture", "Agriculture", 4, -5, 0.9, 0.5),
  m("fst", "Food Science and Technology", "Food Science and Technology", "Agriculture", 4, 0, 0.9, 0.5),
];
export const MAJOR_BY_ID: Record<string, Major> = Object.fromEntries(MAJORS.map((x) => [x.id, x]));

export const offers = (u: Uni, majorId: string): boolean => (u.only ? u.only.includes(majorId) : !(u.skip ?? []).includes(majorId));
export const majorsOf = (u: Uni): Major[] => MAJORS.filter((x) => offers(u, x.id));
export const cutoffFor = (u: Uni, mj: Major) => Math.min(340, u.cut + mj.cut);

export const KIND_LABEL: Record<UniKind, () => string> = {
  federal: () => T("Federal", "Federal"),
  state: () => T("State", "State"),
  private: () => T("Private", "Private"),
};
