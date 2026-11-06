/**
 * Policy and project catalogue plus the (simplified) division of constitutional responsibilities.
 *
 * Costs are in ₦ MILLION at game-start prices (they scale with the simulated price level) and are FICTIONAL GAME
 * VALUES, not real budget figures. Effects are total indicator changes realised progressively as a project is
 * delivered, then maintained (or eroded) by upkeep spending.
 */
import type { Indicator } from "../engine/types";

export type Level = "local" | "state" | "federal";
export type Funding = "budget" | "borrowing" | "partnership" | "donor";

export interface PolicyDef {
  id: string;
  level: Level;
  label: string;
  description: string;
  costM: number;
  months: number;
  institution: string;
  effects: Partial<Record<Indicator, number>>;
  /** extra short-term jobs/activity while building (economy indicator, per month) */
  duringBuild: number;
  maintenancePct: number; // % of cost per year
  /** probability per month of a delay (uncertainty) */
  delayRisk: number;
  funding: Funding[];
  benefits: string[];
  drawbacks: string[];
  /** needs legislative support at or above this level to start */
  minSupport?: number;
}

export const POLICIES: PolicyDef[] = [
  // ---- local government (Fourth Schedule functions; shared: primary health, adult/vocational education, agriculture)
  { id: "l_boreholes", level: "local", label: "Community borehole programme", description: "Drill and solarise boreholes in underserved wards.", costM: 40, months: 4, institution: "LG Department of Works & Water", effects: { health: 3, economy: 0.5 }, duringBuild: 0.2, maintenancePct: 6, delayRisk: 0.06, funding: ["budget", "donor"], benefits: ["Cleaner water, fewer disease outbreaks"], drawbacks: ["Needs maintenance or pumps fail"] },
  { id: "l_phc", level: "local", label: "Primary health centre upgrade", description: "Rehabilitate clinics, stock drugs and recruit nurses (shared with the state).", costM: 90, months: 8, institution: "LG Health Department", effects: { health: 6 }, duringBuild: 0.2, maintenancePct: 10, delayRisk: 0.08, funding: ["budget", "donor"], benefits: ["Better primary care access"], drawbacks: ["Recurrent staffing costs"] },
  { id: "l_roads", level: "local", label: "Rural road grading and culverts", description: "Open up farm-to-market roads and drains.", costM: 120, months: 7, institution: "LG Works Department", effects: { infrastructure: 5, economy: 1.5 }, duringBuild: 0.3, maintenancePct: 8, delayRisk: 0.1, funding: ["budget", "borrowing"], benefits: ["Lower transport costs for farmers"], drawbacks: ["Washed out quickly without drainage upkeep"] },
  { id: "l_market", level: "local", label: "Market stalls, drainage and sanitation", description: "Modernise the main market and its refuse disposal.", costM: 150, months: 9, institution: "LG Markets & Sanitation Unit", effects: { economy: 3, health: 1.5, infrastructure: 1.5 }, duringBuild: 0.4, maintenancePct: 6, delayRisk: 0.08, funding: ["budget", "partnership"], benefits: ["Higher trader incomes", "Revenue from stall rents"], drawbacks: ["Traders disrupted during works"] },
  { id: "l_schools", level: "local", label: "Primary school renovation", description: "Rebuild classrooms and supply desks (primary education is shared with the state).", costM: 110, months: 8, institution: "LG Education Authority", effects: { education: 5 }, duringBuild: 0.2, maintenancePct: 6, delayRisk: 0.08, funding: ["budget", "donor"], benefits: ["Better learning conditions"], drawbacks: ["Teachers' pay is a separate state matter"] },
  { id: "l_solar", level: "local", label: "Street lighting and solar mini-grid", description: "Light the main streets and power the market.", costM: 130, months: 6, institution: "LG Works Department", effects: { power: 5, security: 1.5, economy: 1 }, duringBuild: 0.2, maintenancePct: 7, delayRisk: 0.1, funding: ["budget", "partnership"], benefits: ["Safer nights, longer trading hours"], drawbacks: ["Panels and batteries need upkeep"] },
  { id: "l_skills", level: "local", label: "Youth skills and vocational centre", description: "Train young people in trades and digital skills (vocational education is shared).", costM: 95, months: 7, institution: "LG Youth & Vocational Department", effects: { economy: 3, education: 2, security: 1 }, duringBuild: 0.2, maintenancePct: 9, delayRisk: 0.07, funding: ["budget", "donor"], benefits: ["More youth employment"], drawbacks: ["Takes time to show results"] },

  // ---- state (concurrent & residual matters: state roads, health, secondary education, agriculture, security support)
  { id: "s_roads", level: "state", label: "State road rehabilitation", description: "Rehabilitate state trunk roads and bridges.", costM: 18_000, months: 18, institution: "State Ministry of Works", effects: { infrastructure: 9, economy: 3 }, duringBuild: 0.5, maintenancePct: 5, delayRisk: 0.1, funding: ["budget", "borrowing", "partnership"], benefits: ["Faster, cheaper movement of goods"], drawbacks: ["Traffic disruption", "Prone to cost overruns"], minSupport: 35 },
  { id: "s_power", level: "state", label: "State embedded power plant", description: "Build a state-owned gas or solar plant to serve key industrial clusters (shared power responsibilities).", costM: 25_000, months: 24, institution: "State Ministry of Energy", effects: { power: 10, economy: 4 }, duringBuild: 0.4, maintenancePct: 6, delayRisk: 0.12, funding: ["borrowing", "partnership", "budget"], benefits: ["More reliable electricity for businesses"], drawbacks: ["Large capital cost", "Fuel supply risk"], minSupport: 40 },
  { id: "s_hospitals", level: "state", label: "General hospital upgrade", description: "Upgrade state general hospitals, diagnostics and staffing.", costM: 12_000, months: 16, institution: "State Ministry of Health", effects: { health: 9 }, duringBuild: 0.3, maintenancePct: 8, delayRisk: 0.09, funding: ["budget", "donor", "borrowing"], benefits: ["Reduced referrals out of state"], drawbacks: ["High recurrent costs"] },
  { id: "s_schools", level: "state", label: "Secondary schools and teacher training", description: "Rebuild secondary schools and train teachers (education is a concurrent matter).", costM: 10_000, months: 18, institution: "State Ministry of Education", effects: { education: 9 }, duringBuild: 0.3, maintenancePct: 7, delayRisk: 0.08, funding: ["budget", "donor", "borrowing"], benefits: ["Better exam results and employability"], drawbacks: ["Payroll pressure"] },
  { id: "s_security", level: "state", label: "State security trust fund", description: "Fund logistics and intelligence support for security agencies (policing itself is federal).", costM: 6_000, months: 10, institution: "State Security Council", effects: { security: 8, economy: 1 }, duringBuild: 0.1, maintenancePct: 15, delayRisk: 0.05, funding: ["budget"], benefits: ["Faster response to threats"], drawbacks: ["You do not control the police command", "Results are uncertain"] },
  { id: "s_agri", level: "state", label: "Agricultural processing hubs", description: "Build storage and processing hubs for farmers.", costM: 9_000, months: 14, institution: "State Ministry of Agriculture", effects: { economy: 7, infrastructure: 1.5 }, duringBuild: 0.4, maintenancePct: 6, delayRisk: 0.1, funding: ["budget", "partnership", "donor"], benefits: ["Higher farm incomes", "Less post-harvest loss"], drawbacks: ["Needs security on farms"] },
  { id: "s_flood", level: "state", label: "Flood control and drainage", description: "Dredge channels and build drainage in flood-prone areas.", costM: 8_000, months: 14, institution: "State Ministry of Environment", effects: { infrastructure: 4, health: 2 }, duringBuild: 0.2, maintenancePct: 6, delayRisk: 0.1, funding: ["budget", "donor", "borrowing"], benefits: ["Lower flood losses"], drawbacks: ["Benefits only seen in the rainy season"] },
  { id: "s_tvet", level: "state", label: "Technical colleges and apprenticeships", description: "Re-equip technical colleges and fund apprenticeships.", costM: 5_000, months: 12, institution: "State Board of Technical Education", effects: { economy: 4, education: 4 }, duringBuild: 0.2, maintenancePct: 8, delayRisk: 0.07, funding: ["budget", "donor"], benefits: ["Skilled labour for employers"], drawbacks: ["Slow payoff"] },

  // ---- federal (Exclusive Legislative List: federal highways, railways, defence, police, currency, etc.)
  { id: "f_highways", level: "federal", label: "Federal highways and rail corridor", description: "Rebuild federal highways and a rail corridor (federal roads and railways are an exclusive federal responsibility).", costM: 900_000, months: 36, institution: "Federal Ministry of Works / Transport", effects: { infrastructure: 5, economy: 1.8 }, duringBuild: 0.2, maintenancePct: 4, delayRisk: 0.1, funding: ["budget", "borrowing", "partnership"], benefits: ["Lower cost of moving goods across states"], drawbacks: ["Large debt if borrowed", "Contract-inflation risk"], minSupport: 45 },
  { id: "f_power", level: "federal", label: "Grid transmission and generation upgrade", description: "Upgrade transmission, fix bottlenecks and add gas supply.", costM: 700_000, months: 36, institution: "Federal Ministry of Power", effects: { power: 6, economy: 1.5 }, duringBuild: 0.15, maintenancePct: 5, delayRisk: 0.12, funding: ["budget", "borrowing", "partnership", "donor"], benefits: ["Fewer grid collapses", "Lower business costs"], drawbacks: ["Gas supply and tariff politics"], minSupport: 45 },
  { id: "f_health", level: "federal", label: "National health insurance expansion", description: "Expand coverage and fund tertiary hospitals.", costM: 500_000, months: 30, institution: "Federal Ministry of Health", effects: { health: 5 }, duringBuild: 0.1, maintenancePct: 9, delayRisk: 0.08, funding: ["budget", "donor", "borrowing"], benefits: ["Fewer out-of-pocket health shocks"], drawbacks: ["Recurrent fiscal commitment"] },
  { id: "f_education", level: "federal", label: "Universities and schools support fund", description: "Fund federal universities, polytechnics and basic-education grants.", costM: 450_000, months: 30, institution: "Federal Ministry of Education", effects: { education: 5 }, duringBuild: 0.1, maintenancePct: 8, delayRisk: 0.07, funding: ["budget", "donor", "borrowing"], benefits: ["Fewer strikes, better outcomes"], drawbacks: ["Slow payoff"] },
  { id: "f_security", level: "federal", label: "Security modernisation and community policing", description: "Equip and train defence and police forces (federal responsibility) and support community-based intelligence.", costM: 650_000, months: 30, institution: "Ministries of Defence & Police Affairs", effects: { security: 6 }, duringBuild: 0.05, maintenancePct: 12, delayRisk: 0.1, funding: ["budget", "borrowing"], benefits: ["Improved response capability"], drawbacks: ["Results uncertain and uneven by region"], minSupport: 40 },
  { id: "f_cash", level: "federal", label: "Targeted cash transfers and jobs scheme", description: "Support poor households and fund public-works jobs.", costM: 400_000, months: 18, institution: "Federal Ministry of Humanitarian Affairs", effects: { economy: 2.5 }, duringBuild: 0.6, maintenancePct: 14, delayRisk: 0.07, funding: ["budget", "borrowing", "donor"], benefits: ["Immediate relief for households", "Boosts local demand"], drawbacks: ["Adds to inflationary pressure if borrowed", "Targeting leakage risk"] },
  { id: "f_industrial", level: "federal", label: "Industrial parks and refining capacity", description: "Fund special economic zones and domestic refining partnerships.", costM: 800_000, months: 40, institution: "Federal Ministry of Industry & Petroleum Resources", effects: { economy: 5, power: 1 }, duringBuild: 0.3, maintenancePct: 5, delayRisk: 0.14, funding: ["partnership", "borrowing", "budget"], benefits: ["Jobs and import substitution"], drawbacks: ["High delay risk", "Needs reliable power and security"], minSupport: 45 },
];
export const POLICY_BY_ID: Record<string, PolicyDef> = Object.fromEntries(POLICIES.map((p) => [p.id, p]));

export interface ResponsibilityRow { area: string; federal: string; state: string; local: string }
/** Simplified summary of the division of powers, for in-game reference. Summarised from the 1999 Constitution
 * (Exclusive and Concurrent Legislative Lists, residual matters, and the Fourth Schedule). Not legal advice. */
export const RESPONSIBILITIES: ResponsibilityRow[] = [
  { area: "Defence & armed forces", federal: "Exclusive", state: "—", local: "—" },
  { area: "Police & internal security", federal: "Exclusive (a single federal police force)", state: "May fund and coordinate; no command", local: "—" },
  { area: "Currency, banking, foreign exchange", federal: "Exclusive", state: "—", local: "—" },
  { area: "Federal highways, railways, aviation", federal: "Exclusive", state: "State roads", local: "Local roads and streets" },
  { area: "Electricity", federal: "Dominant (grid, generation); simulated as shared", state: "May develop plants and distribution in the state", local: "Street lighting" },
  { area: "Primary & adult education", federal: "Policy and funding support", state: "Concurrent", local: "Shared with state" },
  { area: "Secondary & tertiary education", federal: "Federal institutions", state: "State institutions", local: "—" },
  { area: "Health", federal: "Tertiary hospitals, national policy", state: "Secondary care, state hospitals", local: "Primary health services (shared)" },
  { area: "Agriculture", federal: "National policy (some)", state: "Concurrent/residual", local: "Development of agriculture (shared)" },
  { area: "Markets, motor parks, refuse, sanitation", federal: "—", state: "—", local: "Local government" },
  { area: "Birth, death & marriage registration", federal: "—", state: "—", local: "Local government (Fourth Schedule)" },
  { area: "Taxes & revenue", federal: "Federation Account: oil, VAT, company tax", state: "Internally generated revenue + share", local: "Rates, levies + share" },
];

/** Vertical sharing of the Federation Account as commonly cited (federal / states / local). Simulation assumption. */
export const VERTICAL_SHARING = { federal: 0.5268, states: 0.2672, local: 0.206 };
