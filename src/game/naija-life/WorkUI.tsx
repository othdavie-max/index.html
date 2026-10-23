"use client";

import { useState } from "react";
import { JOBS, STATE_BY_ID, payMult, type JobDef } from "./data";
import { applyBlock, expandCost, type Action } from "./engine";
import { eduAtLeast, eligibleJobs, jobDef } from "./helpers";
import { officeTitle } from "./politics";
import { meritOf } from "./military";
import { DegreeCard } from "./CampusUI";
import { ActionSheet, Btn, ListGroup, ListRow } from "./ui";
import type { Player } from "./types";
import { T, naira } from "./util";

type Run = (a: Action) => void;

const JOB_EMOJI: Record<string, string> = {
  akara: "🥘", corn: "🌽", purewater: "💧", pos: "💳", suya: "🍢", thrift: "👕", barber: "💈", tailor: "🧵", salon: "💇", phone: "📱", mechanic: "🔧", keke: "🛺", provisions: "🛒", conductor: "🚌", guard: "💂", rideapp: "🚖", attendant: "🏪",
  teacher: "📚", nurse: "🩺", doctor: "👨‍⚕️", lawyer: "⚖️", engineer: "🏗️", dev: "💻", banker: "🏦", accountant: "🧮", civil: "🏛️", oil: "🛢️", police: "👮", soldier: "🪖", navy: "⚓", airforce: "✈️", journalist: "📰",
  actor: "🎬", singer: "🎤", creator: "🎥", tiktoker: "🎵", influencer: "📸", youtuber: "▶️", streamer: "🎮", fitness: "💪", comedian: "😂", model: "👗", yahoo: "💻", kidnapper: "🕶️",
};
const GROUP_TILE: Record<string, string> = { petty: "bg-amber-100", formal: "bg-sky-100", creative: "bg-violet-100", crime: "bg-rose-100" };

export function lockReason(p: Player, j: JobDef): string | null {
  if (p.age < j.minAge) return T(`Age ${j.minAge}+`, `Age ${j.minAge}+`);
  if (!eduAtLeast(p, j.edu)) return j.edu === "tertiary" ? T("Needs a degree", "You need degree") : T(`Needs ${j.edu} school`, `You need ${j.edu} school`);
  if (j.courses && (!p.course || !j.courses.includes(p.course))) return T(`Needs ${j.courses.slice(0, 2).join(" / ")} degree`, `You need ${j.courses.slice(0, 2).join(" / ")} degree`);
  const st = STATE_BY_ID[p.state];
  if (st.opp < j.minOpp) return T(`Needs a bigger market (opportunity ${j.minOpp}+)`, `E need bigger market (opportunity ${j.minOpp}+)`);
  return null;
}

function JobSheet({ p, j, run, onClose }: { p: Player; j: JobDef; run: Run; onClose: () => void }) {
  const st = STATE_BY_ID[p.state];
  const block = applyBlock(p, j.id);
  const pay = naira(j.ladder[0].pay * payMult(j, st) * Math.pow(p.index, 0.92));
  const go = (a: Action) => { run(a); onClose(); };
  return (
    <ActionSheet emoji={JOB_EMOJI[j.id] ?? "💼"} tile={GROUP_TILE[j.group]} title={j.title} sub={`~${pay}${T("/yr to start", "/yr to start")}`} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-600">{j.blurb}</p>
      <div className="mb-3 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
        {j.ladder.slice(0, 4).map((r, i) => <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5">{r.title}</span>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Btn disabled={Boolean(block)} onClick={() => go({ t: "apply", job: j.id })}>
          {j.selfEmployed ? T(`Start (${naira(j.startCost * Math.pow(p.index, 0.9))})`, `Start (${naira(j.startCost * Math.pow(p.index, 0.9))})`) : T("Apply", "Apply")}
        </Btn>
        {!j.selfEmployed && j.group === "formal" && (
          <Btn tone="ghost" disabled={Boolean(block) || p.money < 300_000 * p.index} onClick={() => go({ t: "apply", job: j.id, bribe: true })}>
            {T(`Apply + 'settle' (${naira(300_000 * p.index)})`, `Apply + 'settle' (${naira(300_000 * p.index)})`)}
          </Btn>
        )}
      </div>
      {block && <p className="mt-2 text-xs text-red-600">{block}</p>}
    </ActionSheet>
  );
}

export function JobsView({ p, run }: { p: Player; run: Run }) {
  const [pick, setPick] = useState<JobDef | null>(null);
  const [mine, setMine] = useState(false);
  const st = STATE_BY_ID[p.state];
  const cur = jobDef(p);
  const eligible = eligibleJobs(p);
  const cost = expandCost(p);
  const locked = JOBS.filter((j) => j.id !== "kidnapper" && !eligible.includes(j));
  const pay = (j: JobDef) => `~${naira(j.ladder[0].pay * payMult(j, st) * Math.pow(p.index, 0.92))}${T("/yr", "/yr")}`;
  const rows = (jobs: JobDef[]) => jobs.map((j) => (
    <ListRow key={j.id} emoji={JOB_EMOJI[j.id] ?? "💼"} tile={GROUP_TILE[j.group]} name={j.title} desc={j.blurb} right={pay(j)} onClick={() => setPick(j)} />
  ));
  const section = (title: string, sub: string, jobs: JobDef[]) => jobs.length > 0 && <ListGroup title={title} sub={sub}>{rows(jobs)}</ListGroup>;
  return (
    <>
      <ListGroup title={T("You", "You")}>
        <ListRow
          emoji={cur ? JOB_EMOJI[cur.id] ?? "💼" : "🧑"} tile="bg-blue-100"
          name={p.job && cur ? cur.ladder[Math.min(p.job.rank, cur.ladder.length - 1)].title : p.politics && p.politics.office >= 0 ? officeTitle(p) : T("Not working", "No dey work")}
          desc={p.job && cur ? `${cur.title} · ${T(`${p.job.years} yr in this role`, `${p.job.years} yr for this role`)}${["soldier", "navy", "airforce", "police"].includes(cur.id) ? ` · ${T("service record", "service record")} ${meritOf(p)}/100` : ""}` : T("Pick something below or hustle", "Pick one thing below or go hustle")}
          onClick={p.job && cur ? () => setMine(true) : undefined}
        />
        <ListRow
          emoji="🎓" tile="bg-violet-100" name={T("Education", "Education")}
          desc={p.school ? T(`In school · ${p.school.yearsLeft} yr left`, `You dey school · ${p.school.yearsLeft} yr remain`) : p.edu === "none" ? T("No schooling yet", "You never go school yet") : `${p.edu}${p.course ? ` · ${p.course}` : ""}`}
        />
      </ListGroup>
      <div className="-mt-2 mb-3 px-1"><DegreeCard p={p} run={run} /></div>
      {p.age >= 14 && (
        <>
          {section(T("Start a hustle", "Start hustle"), T("Self-employed. You can grow these into empires.", "Work for yourself. You fit grow am reach empire."), eligible.filter((j) => j.selfEmployed))}
          {section(T("Jobs", "Jobs"), T("Salaried work. Promotions come with time and connections.", "Salary work. Promotion dey come with time and connections."), eligible.filter((j) => !j.selfEmployed && (j.group === "petty" || j.group === "formal")))}
          {section(T("Creative careers", "Creative work"), T("Slow start, huge upside.", "Start slow, but the gain big."), eligible.filter((j) => j.group === "creative"))}
          {section(T("Risky paths", "Risky road"), T("Fast money. Heavy consequences.", "Fast money. Heavy wahala."), eligible.filter((j) => j.group === "crime"))}
          {locked.length > 0 && (
            <ListGroup title={T(`Locked careers (${locked.length})`, `Locked work (${locked.length})`)}>
              {locked.map((j) => <ListRow key={j.id} emoji="🔒" tile="bg-slate-100" name={j.title} desc={lockReason(p, j) ?? ""} />)}
            </ListGroup>
          )}
        </>
      )}
      {pick && <JobSheet p={p} j={pick} run={run} onClose={() => setPick(null)} />}
      {mine && cur && p.job && (
        <ActionSheet emoji={JOB_EMOJI[cur.id] ?? "💼"} tile={GROUP_TILE[cur.group]} title={cur.ladder[Math.min(p.job.rank, cur.ladder.length - 1)].title} sub={cur.title} onClose={() => setMine(false)}>
          <div className="flex flex-wrap gap-2">
            {cost !== null && <Btn tone="gold" disabled={p.money < cost} onClick={() => { run({ t: "expand" }); setMine(false); }}>{T(`Expand business (${naira(cost)})`, `Expand business (${naira(cost)})`)}</Btn>}
            <Btn tone="ghost" onClick={() => { run({ t: "quit" }); setMine(false); }}>{T("Quit", "Quit")}</Btn>
          </div>
          {cur.selfEmployed && cost !== null && <p className="mt-2 text-[11px] text-slate-500">{T(`Next: ${cur.ladder[p.job.rank + 1].title}. Invest in your business to grow it. Moving to another state leaves it behind.`, `Next: ${cur.ladder[p.job.rank + 1].title}. Put money inside your business make am grow. If you move go another state, you leave am.`)}</p>}
        </ActionSheet>
      )}
    </>
  );
}
