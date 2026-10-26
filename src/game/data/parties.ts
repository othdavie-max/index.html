/**
 * FICTIONAL political parties. Names, platforms and leaders are invented for the game; any resemblance to real
 * parties is limited to the broad range of positions and organisational styles found in Nigerian politics.
 * No party is dominant everywhere: `zoneStrength` gives a baseline relative strength per geopolitical zone.
 */
import type { ZoneId } from "./states";

export type Issue = "economy" | "infrastructure" | "security" | "health" | "education" | "power" | "integrity";
export const ISSUES: Issue[] = ["economy", "infrastructure", "security", "health", "education", "power", "integrity"];
export const ISSUE_LABEL: Record<Issue, string> = {
  economy: "Jobs & cost of living", infrastructure: "Roads & transport", security: "Security", health: "Healthcare",
  education: "Education", power: "Electricity", integrity: "Accountability",
};

export interface FactionDef { id: string; name: string; blurb: string }
export interface PartyDef {
  id: string;
  name: string;
  abbr: string;
  color: string;
  textColor: string;
  motto: string;
  style: "machine" | "movement" | "regional" | "ideological";
  blurb: string;
  /** -1 state-led … +1 market-led / -1 traditional … +1 liberal / -1 centralist … +1 devolutionist */
  ideology: { economic: number; social: number; federalism: number };
  priorities: Partial<Record<Issue, number>>;
  factions: FactionDef[];
  orgStrength: number; // 0..100
  zoneStrength: Record<ZoneId, number>;
  fundsM: number; // party treasury, ₦ millions (simulated)
  reputation: number; // 0..100
  /** how strongly the party's vote is concentrated in urban areas (+) or rural areas (-) */
  urbanLean: number;
  leadership: string;
  /** primaries: direct (members) vs indirect (delegates) vs consensus tendency */
  primaryStyle: "delegates" | "direct" | "consensus-prone";
}

export const PARTIES: PartyDef[] = [
  {
    id: "NRC", name: "Nigerian Renewal Congress", abbr: "NRC", color: "#0072B2", textColor: "#ffffff",
    motto: "Reform. Build. Deliver.", style: "machine",
    blurb: "A big-tent governing machine with deep funding and a nationwide structure. Market-friendly reform, infrastructure and investment.",
    ideology: { economic: 0.55, social: -0.1, federalism: -0.1 },
    priorities: { economy: 0.3, infrastructure: 0.25, power: 0.15, security: 0.15, education: 0.05, health: 0.05, integrity: 0.05 },
    factions: [
      { id: "governors", name: "Governors' Caucus", blurb: "State chief executives who control delegates and local machines." },
      { id: "technocrats", name: "Reform Technocrats", blurb: "Economists and professionals pushing market reform." },
      { id: "oldguard", name: "Old Guard", blurb: "Veteran power-brokers and party financiers." },
    ],
    orgStrength: 82, zoneStrength: { SW: 0.46, NC: 0.4, NW: 0.36, NE: 0.28, SE: 0.12, SS: 0.26 },
    fundsM: 6000, reputation: 52, urbanLean: 0.1,
    leadership: "National Chairman, National Working Committee, Board of Trustees",
    primaryStyle: "delegates",
  },
  {
    id: "PHP", name: "Peoples' Heritage Party", abbr: "PHP", color: "#D55E00", textColor: "#ffffff",
    motto: "Together, the People's Way.", style: "machine",
    blurb: "A long-established centrist party with a welfarist tradition and a history of internal factional disputes.",
    ideology: { economic: -0.1, social: -0.15, federalism: 0.1 },
    priorities: { economy: 0.25, health: 0.15, education: 0.15, security: 0.15, infrastructure: 0.15, power: 0.05, integrity: 0.1 },
    factions: [
      { id: "stalwarts", name: "Founding Stalwarts", blurb: "Elder statesmen guarding the party's legacy." },
      { id: "renewal", name: "Renewal Wing", blurb: "Younger members pushing for open primaries." },
      { id: "southern-bloc", name: "Southern Bloc", blurb: "Coastal-state governors and financiers." },
    ],
    orgStrength: 70, zoneStrength: { SS: 0.4, NC: 0.3, NE: 0.3, NW: 0.26, SE: 0.28, SW: 0.2 },
    fundsM: 3800, reputation: 44, urbanLean: 0,
    leadership: "National Chairman, National Executive Committee, Board of Trustees",
    primaryStyle: "delegates",
  },
  {
    id: "LCM", name: "Labour & Civic Movement", abbr: "LCM", color: "#CC79A7", textColor: "#0b0f19",
    motto: "Dignity at Work.", style: "movement",
    blurb: "A social-democratic movement built on unions, civil society and urban youth. Enthusiastic but thinly funded.",
    ideology: { economic: -0.55, social: 0.35, federalism: 0 },
    priorities: { economy: 0.3, education: 0.2, health: 0.2, integrity: 0.15, power: 0.05, security: 0.05, infrastructure: 0.05 },
    factions: [
      { id: "unions", name: "Union Bloc", blurb: "Trade-union officials and workers' associations." },
      { id: "campus", name: "Campus & Civic Wing", blurb: "Student leaders and civic activists." },
      { id: "professionals", name: "Professionals' Forum", blurb: "Doctors, lawyers and academics." },
    ],
    orgStrength: 38, zoneStrength: { SE: 0.3, SS: 0.17, SW: 0.15, NC: 0.14, NE: 0.05, NW: 0.05 },
    fundsM: 400, reputation: 62, urbanLean: 0.5,
    leadership: "National Chairman, National Executive Council with union representation",
    primaryStyle: "direct",
  },
  {
    id: "SDU", name: "Sahel Development Union", abbr: "SDU", color: "#009E73", textColor: "#ffffff",
    motto: "Farm. Secure. Prosper.", style: "regional",
    blurb: "A rural-focused regional party emphasising agriculture, local security and traditional institutions in the north.",
    ideology: { economic: 0.1, social: -0.5, federalism: 0.2 },
    priorities: { security: 0.3, economy: 0.2, education: 0.15, health: 0.15, infrastructure: 0.15, power: 0.03, integrity: 0.02 },
    factions: [
      { id: "councils", name: "Emirate & Traditional Councils Allies", blurb: "Community leaders with strong rural networks." },
      { id: "agri", name: "Agrarian Reformers", blurb: "Farmers' cooperatives and agribusiness." },
      { id: "youth", name: "Northern Youth Forum", blurb: "Younger members seeking jobs and skills programmes." },
    ],
    orgStrength: 56, zoneStrength: { NW: 0.34, NE: 0.32, NC: 0.12, SW: 0.04, SS: 0.03, SE: 0.02 },
    fundsM: 1500, reputation: 48, urbanLean: -0.35,
    leadership: "National Chairman, Council of Elders, State Coordinators",
    primaryStyle: "consensus-prone",
  },
  {
    id: "ARA", name: "Alliance for Regional Autonomy", abbr: "ARA", color: "#E69F00", textColor: "#0b0f19",
    motto: "Resource Control. Self-Determination.", style: "regional",
    blurb: "Campaigns for fiscal federalism, resource control and devolved power, with strongholds in the south-east and the creeks.",
    ideology: { economic: 0.2, social: 0.05, federalism: 0.9 },
    priorities: { economy: 0.2, infrastructure: 0.2, security: 0.15, integrity: 0.1, education: 0.1, health: 0.1, power: 0.15 },
    factions: [
      { id: "creeks", name: "Coastal Coalition", blurb: "Riverine and oil-producing communities' representatives." },
      { id: "business", name: "Commerce Caucus", blurb: "Traders' and manufacturers' associations." },
      { id: "diaspora", name: "Diaspora Chapter", blurb: "Overseas members who fund and advise." },
    ],
    orgStrength: 50, zoneStrength: { SE: 0.34, SS: 0.24, SW: 0.12, NC: 0.07, NE: 0.03, NW: 0.02 },
    fundsM: 1100, reputation: 50, urbanLean: 0.15,
    leadership: "National Leader, National Caucus, Zonal Coordinators",
    primaryStyle: "consensus-prone",
  },
  {
    id: "YVP", name: "Youth Vanguard Party", abbr: "YVP", color: "#56B4E9", textColor: "#0b0f19",
    motto: "Next Generation Now.", style: "movement",
    blurb: "A new, volatile, social-media-driven party of young professionals promising technology, jobs and clean politics.",
    ideology: { economic: 0.25, social: 0.6, federalism: 0.1 },
    priorities: { economy: 0.25, education: 0.2, integrity: 0.2, power: 0.1, health: 0.1, infrastructure: 0.1, security: 0.05 },
    factions: [
      { id: "creators", name: "Digital Organisers", blurb: "Online mobilisers and content creators." },
      { id: "founders", name: "Founders' Circle", blurb: "Startup founders and young entrepreneurs." },
    ],
    orgStrength: 24, zoneStrength: { SW: 0.1, SE: 0.08, SS: 0.08, NC: 0.07, NE: 0.03, NW: 0.03 },
    fundsM: 250, reputation: 58, urbanLean: 0.7,
    leadership: "National Convener and a rotating steering committee",
    primaryStyle: "direct",
  },
  {
    id: "DJU", name: "Democratic Justice Union", abbr: "DJU", color: "#F0E442", textColor: "#0b0f19",
    motto: "Law. Rights. Accountability.", style: "ideological",
    blurb: "A small liberal-legalist party that campaigns on constitutional rights, judicial independence and anti-corruption.",
    ideology: { economic: 0.15, social: 0.5, federalism: 0.3 },
    priorities: { integrity: 0.35, security: 0.1, education: 0.15, health: 0.1, economy: 0.15, infrastructure: 0.05, power: 0.1 },
    factions: [
      { id: "lawyers", name: "Lawyers' Chapter", blurb: "Bar members and rights advocates." },
      { id: "civic", name: "Civic Society Network", blurb: "NGOs and community watchdogs." },
    ],
    orgStrength: 18, zoneStrength: { SW: 0.08, SE: 0.05, SS: 0.06, NC: 0.06, NE: 0.04, NW: 0.03 },
    fundsM: 180, reputation: 60, urbanLean: 0.4,
    leadership: "National Chairman, Legal Committee",
    primaryStyle: "direct",
  },
];

export const PARTY_BY_ID: Record<string, PartyDef> = Object.fromEntries(PARTIES.map((p) => [p.id, p]));
