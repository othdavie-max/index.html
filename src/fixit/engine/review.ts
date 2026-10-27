/** The 12-month review: your biggest decisions of the year, what they led to, and what has become permanent. */
import { hashString } from "../../game/engine/rng";
import type { FixState } from "./types";
import { promiseScore } from "./promises";
import { LAWS } from "./power";

export interface ReviewItem { month: number; title: string; text: string; tone: "good" | "bad" | "neutral" }
export interface Review { year: number; decisions: ReviewItem[]; echoes: ReviewItem[]; permanent: string[]; line: string }
const HEAVY = /prosecut|execut|sack|arrest|crush|veto|sign|refuse|peg|print|accept|decree|annul|postpone|investigat|expose|buy|appease|hold the line|promise|decline|ban|close/i;

export function yearReview(s: FixState, year = Math.floor(s.month / 12)): Review {
  const from = Math.max(0, (year - 1) * 12), to = year * 12;
  const reps = s.reports.filter((r) => r.month >= from && r.month < to && r.title.includes(":"));
  const score = (r: (typeof reps)[number]) => (HEAVY.test(r.title) ? 3 : 1) + (r.tone === "bad" ? 1 : 0) + (r.lines.length > 2 ? 1 : 0) + (hashString(r.id) % 3) * 0.1;
  const decisions: ReviewItem[] = [...reps].sort((a, b) => score(b) - score(a)).slice(0, 5).sort((a, b) => a.month - b.month).map((r) => ({ month: r.month, title: r.title, text: r.lines[0] ?? "", tone: r.tone }));
  const echoes: ReviewItem[] = s.timeline.filter((t) => t.month >= from && t.month < to && t.chain && t.chain !== "enemy").slice(-6).map((t) => ({ month: t.month, title: t.title, text: t.text, tone: t.tone }));
  const permanent: string[] = [];
  const dead = s.gone.filter((g) => g.how === "executed");
  if (dead.length) permanent.push(`${dead.length} official${dead.length > 1 ? "s" : ""} executed on your watch: ${dead.slice(0, 3).map((g) => g.name).join(", ")}${dead.length > 3 ? "…" : ""}. They never come back.`);
  const jailed = s.gone.filter((g) => g.how === "jailed");
  if (jailed.length) permanent.push(`${jailed.length} in prison (they will be released one day, and they will remember).`);
  const foes = s.enemies.filter((e) => e.status === "active");
  if (foes.length) permanent.push(`${foes.length} active enem${foes.length > 1 ? "ies" : "y"}${foes[0] ? `, the strongest is ${[...foes].sort((a, b) => b.power - a.power)[0].name}` : ""}.`);
  if (s.rule.lawLevel > 0) permanent.push(`Anti-corruption law in force: ${LAWS[s.rule.lawLevel].name}.`);
  if (s.rule.maxTerms >= 99) permanent.push("Term limits are scrapped. History will not forget it.");
  const { kept, total } = promiseScore(s);
  if (total) permanent.push(`Promises: ${kept} of ${total} on track.`);
  const lost = s.families.filter((f) => f.status === "left");
  if (lost.length) permanent.push(`${lost.map((f) => f.name).join(", ")} ${lost.length > 1 ? "have" : "has"} left your Nigeria.`);
  const done = s.projects.filter((p) => p.status === "done").length;
  if (done) permanent.push(`${done} project${done > 1 ? "s" : ""} built and standing.`);
  const line = s.gov.happiness >= 60 ? "A year Nigerians will remember kindly." : s.gov.happiness >= 42 ? "A year of progress and pain." : "A hard year. People are tired.";
  return { year, decisions, echoes, permanent, line };
}
