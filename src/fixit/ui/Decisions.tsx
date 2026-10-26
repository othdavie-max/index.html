"use client";
import { useState } from "react";
import { Clock, Hourglass, MapPin } from "lucide-react";
import { useFix } from "./store";
import { Badge, Button, Callout, Field, Modal } from "../../game/ui/kit";
import { STATES, STATE_BY_ID } from "../../game/data/states";
import { LGAS_BY_STATE } from "../../game/engine/admin";
import { FUNDING_LABEL, PROJECT_BY_ID } from "../data/catalogue";
import type { Funding, FixState, GameEvent } from "../engine/types";
import { canStartProject, performRef, projectCost, startProject, respond } from "../engine/actions";
import type { ActionRef, Challenge, ChallengeAction } from "../engine/challenge";
import { nb, monthLabel } from "../engine/util";
import { SymbolIcon } from "./MapView";
import { Chips, UncBadge } from "./parts";
import { decorate } from "../engine/challenge";
import type { Portfolio } from "../engine/types";
const ADVISER_PORTFOLIO: Record<string, Portfolio> = { "Finance Minister": "finance", "Central Bank Governor": "cbn", "Agriculture Minister": "agriculture", "Power Minister": "power", "National Security Adviser": "security" };

export function ActionCard({ a, onDo }: { a: ChallengeAction; onDo: () => void }) {
  return (
    <div className="fx-act">
      <b>{a.label}</b>
      <div className="g-small" style={{ color: "#475569" }}>{a.explain}</div>
      {a.chips && <Chips chips={a.chips} label="Now" />}
      {a.later && <div className="fx-later"><Hourglass size={14} style={{ flex: "none", marginTop: 1 }} aria-hidden /><span><b>Later:</b> {a.later}</span></div>}
      <div className="g-tiny" style={{ color: "#64748b" }}><b style={{ color: "#334155" }}>Downside:</b> {a.tradeoff}</div>
      <div className="fx-row" style={{ justifyContent: "space-between", marginTop: 2 }}>
        <span className="g-row" style={{ gap: 6, flexWrap: "wrap" }}><span className="g-badge">{a.costLabel}</span><UncBadge u={a.uncertainty} /></span>
        <Button size="sm" variant="primary" disabled={!!a.blocked} onClick={onDo} title={a.blocked}>{a.blocked ?? (a.ref.type === "wait" ? "Hold steady" : a.ref.type === "project" ? "Choose site…" : "Do this")}</Button>
      </div>
    </div>
  );
}

export function ChallengePanel({ ch }: { ch: Challenge }) {
  const { act, state, setTab } = useFix();
  const [project, setProject] = useState<string | null>(null);
  const [why, setWhy] = useState(false);
  if (!state) return null;
  const run = (ref: ActionRef) => {
    if (ref.type === "project") { setProject(ref.defId); return; }
    act((s) => performRef(s, ref));
  };
  return (
    <section className="fx-challenge" data-tone={ch.tone} aria-labelledby="ch-title">
      <div className="g-row g-between g-wrap" style={{ alignItems: "flex-start" }}>
        <div className="g-grow" style={{ minWidth: 240 }}>
          <div className="g-section-title">{ch.id.startsWith("event:") ? "Urgent — needs an answer" : "Your biggest problem right now"}</div>
          <h2 id="ch-title" className="fx-ch-title" style={{ marginTop: 4 }}>{ch.title}</h2>
          <p className="g-small" style={{ marginTop: 6, color: "#334155", fontSize: 14 }}>{ch.subtitle}</p>
        </div>
      </div>
      {ch.why.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button className="g-btn g-btn-ghost g-btn-sm" onClick={() => setWhy(!why)} aria-expanded={why}>{why ? "Hide" : "Why is this happening?"}</button>
          {why && <ul className="fx-why" style={{ marginTop: 6 }}>{ch.why.map((w, i) => <li key={i}>{w}</li>)}</ul>}
        </div>
      )}
      {ch.advice && <div className="fx-advice">{ch.advice.map((a) => { const p = ADVISER_PORTFOLIO[a.who]; const m = p ? state.cabinet.members[p] : undefined; return <div key={a.who} className="fx-bubble"><b>{a.who}{m ? ` · ${m.name}` : p ? " · (vacant)" : ""}</b>“{a.says}”</div>; })}</div>}
      <div className="g-section-title" style={{ marginTop: 14 }}>What will you do?</div>
      <div className="fx-actions">{ch.actions.map((a, i) => <ActionCard key={i} a={a} onDo={() => run(a.ref)} />)}</div>
      {ch.others.length > 0 && <div className="g-tiny g-muted" style={{ marginTop: 10 }}>Also on your desk: {ch.others.map((o) => o.title.toLowerCase()).join(" · ")}. Find more options under <button className="g-btn g-btn-ghost g-btn-sm" onClick={() => setTab("policies")}>Policies</button> and <button className="g-btn g-btn-ghost g-btn-sm" onClick={() => setTab("projects")}>Projects</button>.</div>}
      {project && <StartProjectModal defId={project} onClose={() => setProject(null)} />}
    </section>
  );
}

export function EventCard({ e, compact }: { e: GameEvent; compact?: boolean }) {
  const { act, state } = useFix();
  if (!state) return null;
  const left = e.deadline - state.month;
  return (
    <div className="g-card-flat g-col" style={{ gap: 8, borderLeft: `5px solid ${e.kind === "opportunity" ? "#00c875" : "#e11d48"}` }}>
      <div className="g-row g-wrap" style={{ gap: 8 }}>
        <SymbolIcon k={e.kind} size={22} />
        <b className="g-grow" style={{ minWidth: 180 }}>{e.title}</b>
        <Badge tone={e.scale >= 4 ? "red" : e.scale >= 3 ? "amber" : undefined}>Scale {e.scale}/5</Badge>
        <Badge tone={left <= 1 ? "red" : "amber"}><Clock size={12} /> {left <= 0 ? "answer now" : `${left} month${left === 1 ? "" : "s"} left`}</Badge>
        <Badge><MapPin size={12} /> {STATE_BY_ID[e.stateId]?.name}</Badge>
      </div>
      <div className="g-small" style={{ color: "#334155" }}>{e.cause}</div>
      {!compact && (
        <div className="fx-actions" style={{ marginTop: 2 }}>
          {e.options.map((o) => {
            const cost = o.cost * (0.6 + 0.4 * (state.eco.priceLevel / 100));
            return <ActionCard key={o.id} a={decorate(state, { ref: { type: "respond", eventId: e.id, optionId: o.id }, label: o.label, explain: o.explain, costLabel: cost > 0 ? nb(cost) : "No cash", tradeoff: o.tradeoff, uncertainty: o.uncertainty, blocked: cost > state.fin.treasury ? "Not enough cash" : undefined })} onDo={() => act((s) => respond(s, e.id, o.id))} />;
          })}
        </div>
      )}
    </div>
  );
}

export function StartProjectModal({ defId, stateId: fixedState, lgaId, onClose }: { defId: string; stateId?: string; lgaId?: string; onClose: () => void }) {
  const { state, act } = useFix();
  const def = PROJECT_BY_ID[defId];
  const sites = def.sites ?? STATES.map((x) => x.id);
  const [st, setSt] = useState(fixedState && sites.includes(fixedState) ? fixedState : sites[0]);
  const [fund, setFund] = useState<Funding>(def.funding[0]);
  const [lga, setLga] = useState<string>(lgaId && fixedState === st ? lgaId : "");
  const [favour, setFavour] = useState(false);
  if (!state) return null;
  const err = canStartProject(state, defId, st, fund);
  const cost = projectCost(state, defId, fund);
  const s: FixState = state;
  const cap = Math.round(s.gov.capacity);
  const lgas = LGAS_BY_STATE[st] ?? [];
  const explain: Record<Funding, string> = {
    treasury: "Paid from cash as work proceeds. Stalls if the treasury runs dry.",
    domestic: "Borrowed at home: no cash now, but debt and interest rise.",
    concessional: "Cheap dollar loan: most of the cost is borrowed abroad, repaid in dollars (a weaker naira makes it dearer). Slower, with conditions.",
    ppp: "Private partner pays most of the cost; about 12% dearer overall, and needs investor confidence of 35+.",
  };
  return (
    <Modal title={`Start: ${def.name}`} onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!!err} onClick={() => { const r = act((x) => startProject(x, defId, st, fund, { lgaId: lga || undefined, favour })); if (r.ok) onClose(); }}>Start project</Button></>}>
      <div className="g-col">
        <div className="g-small">{def.what}</div>
        <div className="g-small"><b>Promised benefit:</b> {def.benefitText}. <b>Typical cost:</b> {nb(cost)} over about {def.months} months.</div>
        <Field label="Where?">{(id) => <select id={id} className="g-select" value={st} onChange={(e) => { setSt(e.target.value); setLga(""); }}>{sites.map((x) => <option key={x} value={x}>{STATE_BY_ID[x]?.name}</option>)}</select>}</Field>
        <Field label="Local government area (optional)">{(id) => <select id={id} className="g-select" value={lga} onChange={(e) => setLga(e.target.value)}><option value="">Anywhere in the state</option>{lgas.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>}</Field>
        <Field label="How will you pay for it?" help={explain[fund]}>{(id) => <select id={id} className="g-select" value={fund} onChange={(e) => setFund(e.target.value as Funding)}>{def.funding.map((f) => <option key={f} value={f}>{FUNDING_LABEL[f]}</option>)}</select>}</Field>
        <label className="g-row g-small" style={{ alignItems: "flex-start" }}><input type="checkbox" checked={favour} onChange={(e) => setFavour(e.target.checked)} style={{ marginTop: 3 }} /><span>Give the contract to a friend&apos;s firm. <span className="g-muted">You would quietly benefit personally, but quality drops, money leaks and it leaves a paper trail.</span></span></label>
        {cap < def.capacityNeed && <Callout tone="warn">Government delivery capacity is {cap}; this needs about {def.capacityNeed}. Expect delays and overruns.</Callout>}
        {err && <Callout tone="bad">{err}</Callout>}
      </div>
    </Modal>
  );
}
export { performRef, monthLabel };
