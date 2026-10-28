/**
 * Continue this Nigeria. When your time ends the same country carries on: every project, price, governor and the naira stay
 * exactly where you left them. Someone new takes the oath, picks a team and makes new promises.
 */
import { subRng } from "../../game/engine/rng";
import type { FixState, Portfolio, Portrait } from "./types";
import { PORTFOLIO_BY_ID, freshCandidates } from "./cabinet";
import { initSpeech } from "./politics";
import { offerAgenda } from "./meta";
import { clamp, clamp100, pushNews, pushReport, snap, uid } from "./util";

export interface Successor { id: string; name: string; portrait: Portrait; blurb: string; source: "vp" | "minister" | "party" | "rival"; portfolio?: Portfolio }
const FIRST = ["Adaora", "Ibrahim", "Folasade", "Chidera", "Musa", "Temitope", "Hauwa", "Emeka", "Yetunde", "Sadiq"];
const LAST = ["Nwankwo", "Abdullahi", "Balogun", "Okeke", "Danladi", "Ogundipe", "Sule", "Madueke", "Fashola", "Kalu"];
const portraitFor = (seed: number, key: string): Portrait => { const r = subRng(seed, "succ", key); return { skin: r.int(1, 5), hair: r.int(0, 3), style: r.int(0, 3), accent: r.int(0, 4) }; };

export function successors(s: FixState): Successor[] {
  const out: Successor[] = [];
  const last = s.terms[s.terms.length - 1];
  if (last?.result === "lost") out.push({ id: "rival", name: s.rival.name, portrait: portraitFor(s.meta.seed, "rival"), blurb: `Beat your party at the polls (${s.rival.party}). Inherits your Nigeria, and a score to settle.`, source: "rival" });
  const vp = s.staff?.vp;
  if (vp) out.push({ id: `vp:${vp.id}`, name: vp.name, portrait: vp.portrait, blurb: `Your Vice President. Knows your methods, ${vp.skill >= 60 ? "capable" : "unproven"}.`, source: "vp" });
  const mins = Object.values(s.cabinet.members).filter(Boolean).sort((a, b) => b!.skill - a!.skill).slice(0, 2);
  for (const m of mins) out.push({ id: `min:${m!.portfolio}`, name: m!.name, portrait: portraitFor(s.meta.seed, m!.id), blurb: `${PORTFOLIO_BY_ID[m!.portfolio].title}. Skill ${m!.skill}. A safe pair of hands.`, source: "minister", portfolio: m!.portfolio });
  const rng = subRng(s.meta.seed, "succ-party", s.cap?.era ?? 1);
  const name = `${rng.pick(FIRST)} ${rng.pick(LAST)}`;
  out.push({ id: "party", name, portrait: portraitFor(s.meta.seed, `party:${name}`), blurb: "The party's compromise candidate. A fresh face with no baggage and no track record.", source: "party" });
  return out;
}

/** the story is over for this person but not for the country */
export function canContinue(s: FixState): string | null {
  if (!s.ended || !s.done) return "There is nothing to continue yet.";
  if (s.flags.exit === "flee") return "You fled the country. Nobody is left to hand it to.";
  return null;
}

export function continueNigeria(s: FixState, id: string): { ok: boolean; message: string } {
  const why = canContinue(s);
  if (why) return { ok: false, message: why };
  const pick = successors(s).find((x) => x.id === id);
  if (!pick) return { ok: false, message: "That person is not available." };
  const era = (s.cap.era ?? 1) + 1;
  const old = s.meta.president;
  // the country carries on exactly as it is: nothing about the economy, the projects or the map is touched
  s.done = false; s.ended = null; s.election = null;
  s.term = 1; s.termStart = s.month; s.baseline = snap(s);
  s.rule.termExtra = 0;
  s.campaign = { rallies: {}, debateShift: 0, mobilise: 0, attacks: 0, actionsThisMonth: 0, month: -1 };
  s.speech = { last: -9, moment: null }; void initSpeech;
  for (const k of ["exit", "lowApproval", "overstays", "illegitimate", "courtObeyed", "awarded", "lootToast"]) delete s.flags[k];
  for (const k of Object.keys(s.flags)) if (k.startsWith("debate:") || k.startsWith("quiet:")) delete s.flags[k];
  // a new person: a clean personal record, their own platform and team
  s.meta.president = pick.name; s.meta.portrait = pick.portrait; s.meta.archetype = "career";
  s.me = { wealth: 250, evidence: 0, scandals: 0, acts: [] };
  s.promises = [];
  s.staff = { cos: null, picked: false };
  if (pick.source === "minister" && pick.portfolio) { delete s.cabinet.members[pick.portfolio]; }
  freshCandidates(s);
  s.cap.era = era; s.cap.dynasty = (s.cap.dynasty ?? 0) + 1; s.cap.pc = 50; s.cap.agenda = [];
  s.flags.formerPresident = old; s.flags.successionAt = s.month; s.flags.coach = 99;
  s.reputation = { reformer: 0, populist: 0, strongman: 0, clean: 0, builder: 0, borrower: 0 };
  // old feuds cool, old backers want a fresh start, and a new face gets a short honeymoon
  for (const e of s.enemies) if (e.status === "active") { e.power = Math.round(e.power * 0.5); if (e.power < 18) e.status = "reconciled"; }
  for (const b of s.backers) { b.mood = 50; b.owed = 0; }
  s.gov.trust = clamp100(s.gov.trust + 5); s.gov.approval = clamp(s.gov.approval + 6, 0, 72);
  s.rival = { ...s.rival, popularity: clamp(s.rival.popularity - 4, 0, 100) };
  offerAgenda(s);
  const kept = s.projects.filter((p) => p.status === "done").length, going = s.projects.filter((p) => p.status === "active" || p.status === "stalled").length;
  pushNews(s, { source: `succession:${era}`, headline: `${pick.name} takes the oath of office`, body: `Nigeria carries on: ${kept} finished projects and ${going} still under construction pass to a new president. Prices, the naira and the states are exactly as ${old} left them.`, tone: "neutral" });
  pushReport(s, { title: `${pick.name} succeeds ${old}`, tone: "neutral", lines: [`Nothing resets. The naira, inflation, debt, every project and every governor stay as they are.`, `${going} projects are still under construction and will continue.`, `A new president means a new team and new promises: pick them now.`, `Previous record: ${s.terms.length} term${s.terms.length === 1 ? "" : "s"} in this country's story.`] });
  void uid;
  return { ok: true, message: `${pick.name} is now President. The country carries on.` };
}
