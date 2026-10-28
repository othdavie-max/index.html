"use client";
import { useState } from "react";
import { Hammer } from "lucide-react";
import { useFix, useS } from "../store";
import { Badge, Button, Callout, Card, EmptyState, Tabs } from "../../../game/ui/kit";
import { STATE_BY_ID } from "../../../game/data/states";
import { FUNDING_LABEL, PROJECTS, PROJECT_BY_ID } from "../../data/catalogue";
import { cancelProject, projectCost } from "../../engine/actions";
import { monthLabel, nb } from "../../engine/util";
import type { Project } from "../../engine/types";
import { StartProjectModal } from "../Decisions";
import { Chips } from "../parts";
import { chips } from "../../engine/forecast";

function ProjectCard({ p }: { p: Project }) {
  const { act } = useFix();
  const s = useS();
  const d = PROJECT_BY_ID[p.defId];
  const expected = p.status === "done" ? Math.round((p.benefitScale ?? 1) * 100) : null;
  const finish = p.status === "done" ? null : monthLabel(s.month + Math.ceil((1 - p.progress) * (p.months + p.delay)));
  return (
    <Card className="g-col">
      <div className="g-row g-between g-wrap"><b>{p.name}</b><Badge tone={p.status === "done" ? "green" : p.status === "stalled" ? "amber" : p.status === "cancelled" ? "red" : "blue"}>{p.status === "done" ? "Completed" : p.status === "stalled" ? "Stalled" : p.status === "cancelled" ? "Cancelled" : "Under way"}</Badge></div>
      <div className="g-small g-muted">{STATE_BY_ID[p.stateId]?.name}{p.lgaId ? "" : ""} · {FUNDING_LABEL[p.funding]}{p.favour ? " · awarded to a friend's firm" : ""}</div>
      <div className="fx-proj-bar" data-s={p.status} role="progressbar" aria-label={`${p.name} ${Math.round(p.progress * 100)}% complete`} aria-valuenow={Math.round(p.progress * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${p.progress * 100}%` }} /></div>
      <div className="fx-act-meta">
        <span><b>Progress:</b> {Math.round(p.progress * 100)}%{finish ? ` · expected finish ${finish}` : ` · finished ${monthLabel(p.done ?? 0)}`}</span>
        <span><b>Money:</b> spent {nb(p.spent)} of {nb(p.cost)} (budget {nb(p.baseCost)}); about {nb(p.leaked)} lost to leakage</span>
        <span><b>Contractor:</b> {Math.round(p.quality * 100)}/100 · delays so far {Math.round(p.delay)} month(s)</span>
        <span><b>{expected !== null ? "Actual vs promised:" : "Promised:"}</b> {expected !== null ? `delivering ${expected}% of the promise. ` : ""}{d.benefitText}</span>
      </div>
      {p.notes.slice(-2).map((n, i) => <div key={i} className="g-tiny" style={{ color: "#92400e" }}>• {n}</div>)}
      {(p.status === "active" || p.status === "stalled") && <div><Button size="sm" variant="ghost" onClick={() => act((x) => cancelProject(x, p.id))}>Cancel project</Button></div>}
    </Card>
  );
}

export function Projects() {
  const s = useS();
  const [tab, setTab] = useState<"active" | "new" | "done">(s.projects.length ? "active" : "new");
  const [defId, setDefId] = useState<string | null>(null);
  const [countAtOpen, setCountAtOpen] = useState(0);
  const active = s.projects.filter((p) => p.status === "active" || p.status === "stalled");
  const done = s.projects.filter((p) => p.status === "done" || p.status === "cancelled");
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <div className="g-row g-between g-wrap"><div className="g-page-title">Projects</div><div className="g-small g-muted">Government cash {nb(s.fin.treasury)} · delivery capacity {Math.round(s.gov.capacity)}/100 · procurement quality {Math.round(s.gov.procurement)}/100</div></div>
      <Tabs tabs={[{ id: "active", label: `Under way (${active.length})` }, { id: "new", label: "Start a project" }, { id: "done", label: `Finished (${done.length})` }]} value={tab} onChange={setTab} />
      {tab === "active" && (active.length === 0 ? <EmptyState icon={<Hammer size={30} />} title="No projects under way" body="Projects take many months and cost real money, but they are how lasting change happens." action={<Button variant="primary" onClick={() => setTab("new")}>Start a project</Button>} /> : <div className="g-grid g-grid-2">{active.map((p) => <ProjectCard key={p.id} p={p} />)}</div>)}
      {tab === "done" && (done.length === 0 ? <EmptyState title="Nothing finished yet" /> : <div className="g-grid g-grid-2">{done.map((p) => <ProjectCard key={p.id} p={p} />)}</div>)}
      {tab === "new" && (
        <>
          <Callout tone="info">Every project can slip: delays, cost overruns and leakage depend on government capacity, procurement quality and corruption. Benefits arrive only when it is finished, and often fall short of the promise.</Callout>
          <div className="g-grid g-grid-2">
            {[...PROJECTS].filter((d) => !d.retired).sort((a, b) => Number(a.cat === "National dreams") - Number(b.cat === "National dreams")).map((d) => {
              const count = s.projects.filter((p) => p.defId === d.id && p.status !== "cancelled").length;
              const lock = d.unlock?.(s) ?? null;
              return (
                <Card key={d.id} className="g-col">
                  <div className="g-row g-between g-wrap"><b>{d.name}</b><Badge>{d.cat}</Badge></div>
                  <div className="g-small">{d.what}</div>
                  <Chips chips={chips(d.benefit)} label="When done" />
                  <div className="fx-act-meta">
                    <span><b>Cost:</b> about {nb(projectCost(s, d.id, "treasury"))} over {d.months} months</span>
                    <span><b>Benefit:</b> {d.benefitText}</span>
                    <span><b>Needs capacity:</b> {d.capacityNeed} (you have {Math.round(s.gov.capacity)}) · <b>Risk of delay/overrun:</b> {d.risk >= 0.55 ? "high" : d.risk >= 0.35 ? "medium" : "lower"}</span>
                    <span><b>Funding options:</b> {d.funding.map((f) => FUNDING_LABEL[f]).join(", ")}</span>
                  </div>
                  {lock && <div className="g-small" style={{ color: "#92400e" }}>🔒 {lock}</div>}
                  <div className="g-row g-between"><span className="g-tiny g-muted">{count}/{d.max ?? "∞"} started</span><Button size="sm" variant="primary" disabled={!!lock} onClick={() => { setCountAtOpen(s.projects.length); setDefId(d.id); }}>Choose site &amp; funding</Button></div>
                </Card>
              );
            })}
          </div>
        </>
      )}
      {defId && <StartProjectModal defId={defId} onClose={() => { setDefId(null); if (s.projects.length > countAtOpen) setTab("active"); }} />}
    </div>
  );
}
