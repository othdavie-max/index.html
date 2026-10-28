/** Derived, read-only views for the UI: upcoming deadlines, suggested next steps, headline numbers. */
import type { GameState } from "./types";
import { availableRaces, activeCandidacy } from "./campaign";
import { ruleOf } from "./world";
import { playerAge, formatMonth } from "./calendar";
import { monthlyLivingCost } from "./life";
import { execInfo } from "./governance";
import { liquid } from "./finance";
import { partyDefOf } from "./queries";
import { EDUCATION_RANK } from "../data/rules";
/** screen ids (kept here so the engine never imports from the UI layer) */
export type Tab = "home" | "life" | "map" | "politics" | "elections" | "government" | "economy" | "news" | "settings";

export interface Upcoming { month: number; label: string; kind: "election" | "life" | "legal" | "party" | "gov"; tab?: Tab }

export function upcoming(state: GameState, limit = 8): Upcoming[] {
  const m = state.clock.monthIndex;
  const p = state.player;
  const rule = ruleOf(state);
  const out: Upcoming[] = [];
  const add = (month: number, label: string, kind: Upcoming["kind"], tab?: Tab) => { if (month >= m) out.push({ month, label, kind, tab }); };

  if (p.education.enrolled) add(m + p.education.enrolled.monthsRemaining, "Graduation", "life", "life");
  if (typeof state.flags["nyscEnd"] === "number") add(state.flags["nyscEnd"] as number, "NYSC service year ends", "life", "life");
  for (const c of p.integrity.cases) if (!c.outcome) add(c.nextStepMonth, `Legal: ${c.title}`, "legal", "politics");
  if (typeof state.flags["jailedUntil"] === "number" && (state.flags["jailedUntil"] as number) > m) add(state.flags["jailedUntil"] as number, "Release from custody", "legal");
  const po = p.politics.membership?.office;
  if (po) add(po.since + 48, `Party term ends: ${po.post}`, "party", "politics");
  if (typeof p.flags["partyFoundingStart"] === "number" && (p.flags["partyFoundingStart"] as number) >= 0) add((p.flags["partyFoundingStart"] as number) + 12, "Party registration decision", "party", "politics");

  // age milestones that unlock offices
  const ageNow = playerAge(state);
  for (const a of [21, 25, 35]) if (ageNow < a) { add(p.birthMonth + a * 12, `You turn ${a}${a === 25 ? " — eligible for Assembly, House of Reps and LGA chair" : a === 35 ? " — eligible for Senate, Governor, President" : ""}`, "life"); break; }

  // player's own candidacy milestones
  const cand = activeCandidacy(state);
  if (cand) {
    const c = state.contests[cand.contestId];
    if (c) {
      const E = c.electionMonth;
      if (cand.stage === "aspirant") add(E - rule.timeline.primaryMonth, `Party primary: ${c.label}`, "election", "elections");
      add(E - rule.timeline.campaignStarts, "Campaign period opens", "election", "elections");
      add(E - 2, "Candidates' debate", "election", "elections");
      add(E, `Election day: ${c.label}`, "election", "elections");
    }
  } else {
    // upcoming windows for races near the player
    for (const r of availableRaces(state)) {
      if (r.seat.office === "councillor") continue;
      if (r.windowOpensIn >= 0 && !r.open) add(r.seat.nextElection - rule.timeline.aspirantWindowOpens, `Aspirants' window opens: ${r.seat.label}`, "election", "elections");
      if (r.open) add(r.seat.nextElection - rule.timeline.primaryMonth, `Primaries close the window: ${r.seat.label}`, "election", "elections");
    }
  }
  const pres = state.seats["pres"];
  add(pres.nextElection, "Presidential election day", "election", "elections");
  const seatId = p.politics.seatId;
  if (seatId) {
    const s = state.seats[seatId];
    add(s.nextElection, `Your seat is up for election: ${s.label}`, "election", "elections");
  }
  // dedupe by label
  const seen = new Set<string>();
  return out.sort((a, b) => a.month - b.month).filter((u) => { const k = `${u.month}${u.label}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, limit);
}

export interface Suggestion { id: string; title: string; body: string; tab: Tab; sub?: string; cta: string }
export function suggestions(state: GameState): Suggestion[] {
  const p = state.player;
  const out: Suggestion[] = [];
  const age = playerAge(state);
  const cost = monthlyLivingCost(state);
  const monthly = cost.food + cost.transport + cost.utilities + cost.rent;
  const liq = liquid(p.finances);
  const exec = execInfo(state);

  if (p.integrity.cases.some((c) => !c.outcome)) out.push({ id: "legal", title: "You face a legal case", body: "Consider retaining counsel — it improves your odds at trial but does not erase the evidence.", tab: "politics", sub: "ethics", cta: "Open legal file" });
  if (p.attrs.stress > 72) out.push({ id: "rest", title: "You are close to burnout", body: "Drop a commitment or two (My Life → Time) and spend time with family.", tab: "life", sub: "time", cta: "Review your time" });
  if (liq < monthly * 2 && p.occupation.kind !== "politician") out.push({ id: "money", title: "Money is getting tight", body: `You have about ${Math.max(0, Math.floor(liq / Math.max(1, monthly)))} months of essentials left. Find income.`, tab: "life", sub: "work", cta: "Find work" });
  const cand = activeCandidacy(state);
  if (cand?.stage === "nominee") {
    const c = state.contests[cand.contestId];
    if (c && (c.phase === "campaign" || c.phase === "runoff")) out.push({ id: "campaign", title: `Run your campaign: ${c.label}`, body: "Set monthly campaign budgets, raise lawful funds and prepare for the debate.", tab: "elections", sub: "campaign", cta: "Plan campaign" });
  } else if (cand?.stage === "aspirant") out.push({ id: "primary", title: "Win over party delegates", body: "Your primary is coming. Mobilise delegates lawfully and build ties with party officials.", tab: "elections", sub: "primary", cta: "Prepare for the primary" });
  if (!cand && p.politics.membership && !p.politics.seatId) {
    const open = availableRaces(state).find((r) => r.open && r.eligibility.eligible && r.seat.office !== "president");
    if (open) out.push({ id: "declare", title: `Aspirants' window open: ${open.seat.label}`, body: "You meet the eligibility rules. Picking up the nomination form costs money — and primaries are competitive.", tab: "elections", sub: "races", cta: "See the race" });
  }
  if (state.pending.length) out.unshift({ id: "decision", title: "A decision is waiting", body: state.pending[0].title, tab: "home", cta: "Decide now" });
  if (exec && !state.government.projects.some((x) => x.status === "active")) out.push({ id: "project", title: "Launch a project", body: "You hold executive power. Projects take time to deliver — start one early.", tab: "government", sub: "projects", cta: "Browse projects" });
  if (p.occupation.kind === "unemployed" && !p.education.enrolled && !p.business) out.push({ id: "work", title: age <= 19 ? "Choose your path" : "Study, work or start a business", body: "Education, jobs and business all shape your skills, money and network.", tab: "life", sub: p.education.level === "secondary" ? "education" : "work", cta: "Open My Life" });
  if (p.education.nysc === "pending") out.push({ id: "nysc", title: "Start your NYSC year", body: "National Youth Service is required for many jobs and posts you to a state.", tab: "life", sub: "education", cta: "Start NYSC" });
  if (age >= 18 && !p.politics.membership && p.fame.national + Math.max(0, ...Object.values(p.fame.lgas)) > 2) out.push({ id: "party", title: "Explore political parties", body: "Politics starts with a party card. Compare platforms before you join.", tab: "politics", sub: "parties", cta: "Meet the parties" });
  if (age >= 18 && !p.commitments.volunteering && !p.commitments.organising && !p.commitments.partyWork && !p.commitments.studentUnion) out.push({ id: "community", title: "Get involved locally", body: "Volunteering and organising build name recognition and political experience.", tab: "life", sub: "time", cta: "Choose commitments" });
  return out.slice(0, 4);
}

export function happiness(state: GameState): number {
  const a = state.player.attrs;
  return Math.max(0, Math.min(100, 100 - a.stress * 0.7 + (a.health - 60) * 0.1 + (state.player.commitments.family ? 4 : 0)));
}

export function politicalStatus(state: GameState): string {
  const p = state.player;
  const seat = p.politics.seatId ? state.seats[p.politics.seatId] : null;
  if (seat) return seat.label;
  if (p.politics.appointment) return p.politics.appointment.label;
  const cand = activeCandidacy(state);
  if (cand) return `${cand.stage === "nominee" ? "Candidate" : "Aspirant"}, ${state.seats[cand.seatId].label}`;
  const m = p.politics.membership;
  if (m) return `${partyDefOf(state, m.partyId)?.abbr} member${m.office ? ` — ${m.office.post}` : ""}`;
  return "No party";
}

export function educationLabel(state: GameState): string {
  const e = state.player.education;
  return EDUCATION_RANK[e.level] >= 4 && e.certificates.length ? e.certificates[e.certificates.length - 1] : e.level === "secondary" ? "Secondary school (SSCE)" : e.level;
}
export { formatMonth };

/** Simulated national opinion poll of party support: registered-voter-weighted local lean, adjusted by party momentum. */
export function nationalPoll(state: GameState): { partyId: string; share: number }[] {
  const tot: Record<string, number> = {};
  let w = 0;
  for (const l of Object.values(state.lgas)) {
    w += l.registered;
    for (const [p, a] of Object.entries(l.affinity)) tot[p] = (tot[p] ?? 0) + a * l.registered * (1 + 0.6 * (state.parties[p]?.momentum ?? 0));
  }
  const sum = Object.values(tot).reduce((a, b) => a + b, 0) || 1;
  void w;
  return Object.entries(tot).map(([partyId, v]) => ({ partyId, share: v / sum })).sort((a, b) => b.share - a.share);
}

export interface GuideStep { id: string; title: string; body: string; done: boolean; tab: Tab; sub?: string; cta: string }
/** A short beginner checklist derived from real game state (ticks itself as the player progresses). */
export function startGuide(state: GameState): GuideStep[] {
  const p = state.player;
  const c = p.commitments;
  return [
    { id: "advance", title: "Move time forward one month", body: "Press the green “Next month” button at the top. Nothing happens until you do.", done: state.clock.monthIndex > 0, tab: "home", cta: "Show me" },
    { id: "path", title: "Choose what to do with your life", body: "Go to school, get a job or start a business. This is how you earn money and skills.", done: !!p.education.enrolled || p.occupation.kind !== "unemployed" || !!p.business || p.education.certificates.length > 1, tab: "life", sub: p.education.level === "secondary" ? "education" : "work", cta: "Open My Life" },
    { id: "community", title: "Get known in your community", body: "Volunteer or organise locally. Voters can only vote for someone they have heard of.", done: c.volunteering || c.organising || c.partyWork || c.studentUnion || Object.values(p.fame.lgas).some((v) => v >= 5), tab: "life", sub: "time", cta: "Pick commitments" },
    { id: "party", title: "Join a political party", body: "In Nigeria you can only run for office through a party. Compare them and join one.", done: !!p.politics.membership, tab: "politics", sub: "parties", cta: "See the parties" },
    { id: "race", title: "Find an election you can run in", body: "The Elections screen shows each race and what you still need (age, party, money).", done: p.politics.candidacies.length > 0 || p.politics.electionHistory.length > 0 || !!p.politics.seatId, tab: "elections", sub: "races", cta: "See races" },
  ];
}
