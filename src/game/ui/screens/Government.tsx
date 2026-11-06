"use client";
import { useEffect, useState } from "react";
import { Building2, Banknote, Hammer, Users, Scale, AlertTriangle, Landmark } from "lucide-react";
import { useGame, useS } from "../store";
import { Badge, Bar, Button, Callout, Card, ConfirmDialog, EmptyState, Field, Meter, Tabs, nairaM, naira } from "../kit";
import { execInfo, jurisdictionBudget, nomineesFor, POSTS, efficiency, deficitTarget } from "../../engine/governance";
import { POLICIES, RESPONSIBILITIES, type Funding, type PolicyDef } from "../../data/policies";
import { BUDGET_LINES, BUDGET_LABEL, type BudgetLine } from "../../engine/types";
import { DEFAULT_ALLOCATIONS, subsidyCostAnnualBn, importParityFuelPrice } from "../../engine/economy";
import { playerSeat, priceLevel } from "../../engine/queries";
import { formatMonthShort } from "../../engine/calendar";
import { ruleOf } from "../../engine/world";

type Sub = "overview" | "budget" | "projects" | "people" | "legislature" | "questionable";
const FUNDING_LABEL: Record<Funding, string> = { budget: "Treasury budget", borrowing: "Borrowing", partnership: "Public-private partnership (50% private)", donor: "Donor grant (slower)" };

export function GovernmentScreen() {
  const state = useS();
  const { subTab } = useGame();
  const info = execInfo(state);
  const [tab, setTab] = useState<Sub>("overview");
  useEffect(() => { if (subTab && ["overview", "budget", "projects", "people", "legislature", "questionable"].includes(subTab)) setTab(subTab as Sub); }, [subTab]);
  const seat = playerSeat(state);
  const tabs: { id: Sub; label: string }[] = info
    ? [{ id: "overview", label: "Overview" }, { id: "budget", label: "Budget" }, { id: "projects", label: "Projects" }, { id: "people", label: "Appointments" }, { id: "legislature", label: "Legislature" }, { id: "questionable", label: "Questionable options" }]
    : [{ id: "overview", label: "Overview" }];
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <div className="g-row g-between g-wrap"><div className="g-page-title">Government</div>{seat && <Badge tone="navy"><Landmark size={12} /> {seat.label}</Badge>}</div>
      <Tabs<Sub> value={tab} onChange={setTab} tabs={tabs} />
      {tab === "overview" && <Overview />}
      {info && tab === "budget" && <Budget />}
      {info && tab === "projects" && <Projects />}
      {info && tab === "people" && <People />}
      {info && tab === "legislature" && <Legislature />}
      {info && tab === "questionable" && <Questionable />}
    </div>
  );
}

function Overview() {
  const state = useS();
  const { dispatch } = useGame();
  const info = execInfo(state);
  const g = state.government;
  const seat = playerSeat(state);
  const p = state.player;
  const level = info?.level ?? (seat ? (seat.office === "reps" || seat.office === "senate" ? "federal" : "state") : p.politics.appointment?.level ?? "state");
  const col = level === "federal" ? "federal" : level === "state" ? "state" : "local";
  const b = info ? jurisdictionBudget(state, info) : null;
  return (
    <div className="g-col">
      {!seat && p.politics.appointment && <Callout tone="info">You serve as <b>{p.politics.appointment.label}</b>. Appointees advise and implement but do not control budgets. Win office to unlock full powers.</Callout>}
      {seat && !info && <Callout tone="info">As <b>{seat.label}</b> you make laws, oversee the executive and serve your constituents — you do not run a budget yourself. Build approval through constituency work, and use your seat to support a bid for executive office.</Callout>}
      <div className="g-grid g-grid-3">
        <Card><div className="g-tiny g-muted">Approval</div><div className="g-num" style={{ fontSize: 24, fontWeight: 800 }}>{Math.round(g.approval)}%</div><Bar value={g.approval / 100} label="Approval" /></Card>
        <Card><div className="g-tiny g-muted">Legislative support</div><div className="g-num" style={{ fontSize: 24, fontWeight: 800 }}>{Math.round(g.legislativeSupport)}</div><Bar value={g.legislativeSupport / 100} tone="blue" label="Support" /></Card>
        {b ? <Card><div className="g-tiny g-muted">Public treasury (not your money)</div><div className="g-num" style={{ fontSize: 24, fontWeight: 800 }}>{nairaM(b.treasuryM)}</div><div className="g-tiny g-muted">Revenue ≈ {nairaM(b.revenueMonthlyM)}/month</div></Card> : <Card><div className="g-tiny g-muted">Constituency work</div><Button size="sm" disabled={!seat} onClick={() => dispatch({ t: "commitment", key: "constituencyWork", on: !p.commitments.constituencyWork }, { silent: true })}>{p.commitments.constituencyWork ? "Active (25% time)" : "Start constituency work"}</Button></Card>}
      </div>
      <Callout tone="info"><b>Public and personal money are separate.</b> Government funds can only reach your personal account through an explicit corrupt action, which is traceable and carries serious consequences.</Callout>
      <Card title="Who does what? (simplified)" icon={<Scale size={16} />}>
        <p className="g-small g-muted" style={{ marginBottom: 6 }}>Summarised from the 1999 Constitution's legislative lists and Fourth Schedule; real practice has many nuances. Your level is highlighted.</p>
        <div className="g-scroll-x"><table className="g-table"><thead><tr><th>Area</th><th style={{ background: col === "federal" ? "#e3faf0" : undefined }}>Federal</th><th style={{ background: col === "state" ? "#e3faf0" : undefined }}>State</th><th style={{ background: col === "local" ? "#e3faf0" : undefined }}>Local government</th></tr></thead><tbody>
          {RESPONSIBILITIES.map((r) => <tr key={r.area}><td><b>{r.area}</b></td><td style={{ background: col === "federal" ? "#f3fdf8" : undefined }}>{r.federal}</td><td style={{ background: col === "state" ? "#f3fdf8" : undefined }}>{r.state}</td><td style={{ background: col === "local" ? "#f3fdf8" : undefined }}>{r.local}</td></tr>)}
        </tbody></table></div>
      </Card>
      {g.actions.length > 0 && <Card title="Recent government actions">{[...g.actions].reverse().slice(0, 8).map((a, i) => <div key={i} className="g-list-row g-small"><Badge>{formatMonthShort(state, a.m)}</Badge>{a.text}</div>)}</Card>}
    </div>
  );
}

function Budget() {
  const state = useS();
  const { dispatch } = useGame();
  const info = execInfo(state)!;
  const b = jurisdictionBudget(state, info);
  const [alloc, setAlloc] = useState<Record<BudgetLine, number>>(() => ({ ...(state.government.allocations ?? DEFAULT_ALLOCATIONS) }));
  const total = BUDGET_LINES.reduce((t, k) => t + alloc[k], 0) || 1;
  const e = state.economy;
  const [sub, setSub] = useState(e.fuelSubsidy);
  const [def, setDef] = useState(deficitTarget(state));
  const [confirm, setConfirm] = useState<null | "budget" | "fuel" | "deficit">(null);
  return (
    <div className="g-col">
      <Card title={`${info.label} budget`} icon={<Banknote size={16} />}>
        <div className="g-small g-muted" style={{ marginBottom: 8 }}>Treasury {nairaM(b.treasuryM)} · monthly programme revenue ≈ {nairaM(b.revenueMonthlyM)}. Shares are normalised to 100%; effects on services build gradually and depend on how competent and honest your administration is. {info.level === "local" ? "Local governments share the Federation Account's local tier." : ""}</div>
        <div className="g-grid g-grid-2" style={{ gap: "12px 24px" }}>
          {BUDGET_LINES.map((k) => (
            <div key={k}>
              <div className="g-row g-between g-small"><span>{BUDGET_LABEL[k]}</span><b className="g-num">{((alloc[k] / total) * 100).toFixed(0)}%</b></div>
              <input type="range" min={0} max={50} value={Math.round((alloc[k] / total) * 100)} aria-label={BUDGET_LABEL[k]} onChange={(ev) => setAlloc({ ...alloc, [k]: Number(ev.target.value) / 100 })} />
            </div>
          ))}
        </div>
        <div className="g-row g-wrap" style={{ marginTop: 10 }}><Button variant="primary" onClick={() => setConfirm("budget")}>Apply allocation</Button><Button size="sm" variant="ghost" onClick={() => setAlloc({ ...DEFAULT_ALLOCATIONS })}>Reset to default</Button></div>
      </Card>
      {info.level === "federal" && (
        <div className="g-grid g-split-eq g-grid-2">
          <Card title="Fuel subsidy" icon={<Banknote size={16} />}>
            <Field label={`Subsidy: ${Math.round(sub * 100)}% of import-parity cost`}>{(id) => <input id={id} type="range" min={0} max={100} value={Math.round(sub * 100)} onChange={(ev) => setSub(Number(ev.target.value) / 100)} />}</Field>
            <div className="g-small g-col" style={{ gap: 3, marginTop: 6 }}>
              <div>Import-parity pump price ≈ <b>₦{Math.round(importParityFuelPrice(e))}</b>/litre → with this subsidy ≈ <b>₦{Math.round(importParityFuelPrice(e) * (1 - sub))}</b></div>
              <div>Annual cost ≈ <b>₦{Math.round(subsidyCostAnnualBn({ ...e, fuelSubsidy: sub })).toLocaleString()}bn</b> ({((subsidyCostAnnualBn({ ...e, fuelSubsidy: sub }) / e.revenueAnnualBn) * 100).toFixed(0)}% of revenue)</div>
              <div className="g-tiny g-muted">Cutting it saves money but raises transport costs and inflation, and protests are likely. Keeping it drains revenue and raises borrowing.</div>
            </div>
            <div style={{ marginTop: 8 }}><Button size="sm" onClick={() => setConfirm("fuel")}>Set subsidy</Button></div>
          </Card>
          <Card title="Borrowing stance" icon={<Banknote size={16} />}>
            <Field label={`Planned deficit: ${Math.round(def * 100)}% of revenue`}>{(id) => <input id={id} type="range" min={0} max={50} value={Math.round(def * 100)} onChange={(ev) => setDef(Number(ev.target.value) / 100)} />}</Field>
            <div className="g-small g-muted" style={{ marginTop: 6 }}>Deficit spending can boost growth if spent efficiently (efficiency now {(efficiency(state) * 100).toFixed(0)}%) but raises debt (₦{Math.round(e.debtBn).toLocaleString()}bn, debt service {e.debtServiceShare.toFixed(0)}% of revenue), interest and inflation pressure.</div>
            <div style={{ marginTop: 8 }}><Button size="sm" onClick={() => setConfirm("deficit")}>Set stance</Button></div>
          </Card>
        </div>
      )}
      {confirm === "budget" && <ConfirmDialog title="Apply this budget?" confirmLabel="Apply" onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); dispatch({ t: "allocations", alloc }); }} body="Allocations take effect immediately; indicators move gradually. Starving a service lets it decay." />}
      {confirm === "fuel" && <ConfirmDialog title="Change the fuel subsidy?" tone="danger" confirmLabel="Change" onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); dispatch({ t: "fuelSubsidy", level: sub }); }} body="Pump prices adjust over several months. Expect a political reaction if prices rise." />}
      {confirm === "deficit" && <ConfirmDialog title="Change borrowing stance?" confirmLabel="Change" onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); dispatch({ t: "deficit", v: def }); }} body="This changes how much the government plans to overspend each year." />}
    </div>
  );
}

function Projects() {
  const state = useS();
  const { dispatch } = useGame();
  const info = execInfo(state)!;
  const [pick, setPick] = useState<{ def: PolicyDef; funding: Funding } | null>(null);
  const defs = POLICIES.filter((p) => p.level === info.level);
  const mine = [...state.government.projects].reverse();
  return (
    <div className="g-col">
      <Card title="Active and past projects" icon={<Hammer size={16} />}>
        {mine.length === 0 ? <EmptyState title="No projects yet" body="Announcing a road is not building one: projects take months or years, can be delayed, and need upkeep." /> : mine.map((p) => (
          <div key={p.id} className="g-list-row" style={{ alignItems: "flex-start" }}>
            <div className="g-grow">
              <div className="g-row g-between"><b className="g-small">{p.label}</b><Badge tone={p.status === "complete" ? "green" : p.status === "cancelled" ? "red" : "blue"}>{p.status}</Badge></div>
              <Bar value={p.progress} label={`${p.label} progress`} />
              <div className="g-tiny g-muted" style={{ marginTop: 4 }}>{Math.round(p.progress * 100)}% · spent ≈ {nairaM(p.spent)} of {nairaM(p.costTotal)} · {p.delays} delay month{p.delays === 1 ? "" : "s"} · {FUNDING_LABEL[p.funding]} · {p.institution}</div>
              {p.status === "active" && <div style={{ marginTop: 4 }}><Button size="sm" variant="ghost" onClick={() => dispatch({ t: "cancelProject", projectId: p.id })}>Cancel</Button></div>}
            </div>
          </div>
        ))}
      </Card>
      <Card title={`Available at ${info.level} level`}>
        <div className="g-grid g-grid-2">
          {defs.map((d) => {
            const running = state.government.projects.some((p) => p.defId === d.id && p.status === "active");
            return (
              <div key={d.id} className="g-card-flat g-col" style={{ gap: 6 }}>
                <b className="g-small">{d.label}</b>
                <div className="g-tiny g-muted">{d.description}</div>
                <div className="g-small">≈ <b>{nairaM(d.costM * priceLevel(state))}</b> · {d.months} months · {d.institution}</div>
                <div className="g-tiny">Benefits: {d.benefits.join("; ")}.</div>
                <div className="g-tiny g-muted">Drawbacks: {d.drawbacks.join("; ")}.</div>
                <div className="g-tiny g-muted">Delay risk ≈ {Math.round(d.delayRisk * 100)}%/month{d.minSupport ? ` · needs legislative support ≥ ${d.minSupport}` : ""}</div>
                <div className="g-row g-wrap">{d.funding.map((f) => <Button key={f} size="sm" disabled={running} onClick={() => setPick({ def: d, funding: f })}>{f === "budget" ? "Budget" : f === "borrowing" ? "Borrow" : f === "partnership" ? "PPP" : "Donor"}</Button>)}</div>
              </div>
            );
          })}
        </div>
      </Card>
      {pick && <ConfirmDialog title={`Launch: ${pick.def.label}`} confirmLabel="Launch" onCancel={() => setPick(null)} onConfirm={() => { const x = pick; setPick(null); dispatch({ t: "startProject", defId: x.def.id, funding: x.funding }); }}
        body={<div className="g-col"><div><b>Cost:</b> {nairaM(pick.def.costM * priceLevel(state))} over {pick.def.months} months · <b>Funding:</b> {FUNDING_LABEL[pick.funding]}</div><div><b>Responsible institution:</b> {pick.def.institution}</div><div><b>Uncertainty:</b> about {Math.round(pick.def.delayRisk * 100)}% chance of a delay each month; delays add cost. Benefits arrive gradually while building.</div><div><b>Upkeep:</b> ≈ {pick.def.maintenancePct}% of cost per year afterwards; unfunded upkeep erodes the benefit.</div>{pick.funding === "borrowing" && <div style={{ color: "#9f1239" }}>Borrowing adds to public debt and future interest.</div>}</div>} />}
    </div>
  );
}

function People() {
  const state = useS();
  const { dispatch } = useGame();
  const info = execInfo(state)!;
  const posts = POSTS[info.level];
  const ap = state.government.appointees;
  return (
    <div className="g-col">
      <Card title="Your team" icon={<Users size={16} />}>
        <div className="g-small g-muted" style={{ marginBottom: 8 }}>Team competence drives how efficiently money turns into results (now {(efficiency(state) * 100).toFixed(0)}%). Loyal appointees strengthen your hand in the legislature. Lawful patronage and merit often pull in different directions — neither is cost-free.</div>
        {posts.map((post) => {
          const cur = ap.find((a) => a.post === post);
          const nominees = nomineesFor(state, post);
          return (
            <div key={post} className="g-card-flat g-col" style={{ gap: 6, marginBottom: 8 }}>
              <div className="g-row g-between g-wrap"><b className="g-small">{post}</b>{cur ? <Badge tone="green">{state.chars[cur.id]?.name ?? "Appointed"} · competence {cur.competence}</Badge> : <Badge tone="amber">Vacant</Badge>}</div>
              {nominees.length === 0 ? <div className="g-tiny g-muted">No suitable nominees available right now.</div> : (
                <div className="g-grid g-grid-2">
                  {nominees.map((n) => (
                    <div key={n.id} className="g-row g-between g-small" style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 8 }}>
                      <div><b>{n.name}</b><div className="g-tiny g-muted">competence {n.competence} · loyalty {n.loyalty} · integrity {n.integrity}</div></div>
                      <Button size="sm" onClick={() => dispatch({ t: "appoint", post, charId: n.id })}>Appoint</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function Legislature() {
  const state = useS();
  const { dispatch } = useGame();
  const g = state.government;
  const cap = state.player.politics.capital;
  return (
    <div className="g-col">
      <Card title="Working with the legislature" icon={<Landmark size={16} />}>
        <Meter label="Legislative support" value={g.legislativeSupport} tone="blue" />
        <p className="g-small g-muted" style={{ marginTop: 8 }}>Support reflects how many legislators share your party or personally back you. Low support delays projects and blocks large reforms; events can swing it in either direction. Spend political capital to rebuild it.</p>
        <div className="g-row g-wrap" style={{ marginTop: 8 }}><Button variant="primary" disabled={cap < 5} onClick={() => dispatch({ t: "negotiate" })}>Negotiate with committee chairs (5 capital)</Button><span className="g-tiny g-muted">Capital: {Math.round(cap)}</span></div>
      </Card>
      <Card title="Reference: the ruleset"><div className="g-small g-muted">Offices and powers are defined in {ruleOf(state).title}. Legislative scrutiny of the executive is simplified in this release.</div></Card>
    </div>
  );
}

function Questionable() {
  const state = useS();
  const { dispatch } = useGame();
  const info = execInfo(state)!;
  const b = jurisdictionBudget(state, info);
  const [amt, setAmt] = useState("50");
  const [confirm, setConfirm] = useState<null | "divert" | "inflate" | "ally">(null);
  const [proj, setProj] = useState("");
  const active = state.government.projects.filter((p) => p.status === "active" && p.corruptionLeak === 0);
  return (
    <div className="g-col">
      <Callout tone="bad"><AlertTriangle size={14} style={{ verticalAlign: -2 }} /> <b>These options are unlawful or ethically fraught.</b> They can bring short-term gains but each creates evidence with witnesses. Whether it surfaces depends on media attention, oversight capacity, institutional independence and your political cover — never on a guarantee. A clean record never triggers corruption investigations; a powerful one is not immune.</Callout>
      <Card title="Divert public funds (criminal)">
        <p className="g-small g-muted">Moves a small share of the treasury into a separately tracked illicit account. Services suffer and clerks who handle the paperwork become witnesses. Cap: 20% of the treasury ({nairaM(b.treasuryM * 0.2)}).</p>
        <div className="g-row g-wrap"><Field label="Amount (₦ million)">{(id) => <input id={id} className="g-input" style={{ maxWidth: 160 }} inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9]/g, ""))} />}</Field><Button variant="danger" onClick={() => setConfirm("divert")}>Divert</Button></div>
      </Card>
      <Card title="Pad a contract (criminal)">
        <p className="g-small g-muted">Inflate an active project's cost and take a share. The project delivers less than it should.</p>
        <div className="g-row g-wrap"><select className="g-select" style={{ maxWidth: 320 }} aria-label="Project" value={proj} onChange={(e) => setProj(e.target.value)}><option value="">Choose a project…</option>{active.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select><Button variant="danger" disabled={!proj} onClick={() => setConfirm("inflate")}>Pad it</Button></div>
      </Card>
      <Card title="Award a contract to an associate (conflict of interest)">
        <p className="g-small g-muted">Not criminal in itself, but an ethics panel could find a conflict of interest. Builds loyalty and legislative support.</p>
        <Button variant="danger" onClick={() => setConfirm("ally")}>Award it</Button>
      </Card>
      {confirm === "divert" && <ConfirmDialog title="Divert public funds?" tone="danger" confirmLabel="Divert" onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); dispatch({ t: "divertFunds", amountM: Number(amt) }); }} body="You will gain illicit funds now. If exposed: media scandal, audits, party discipline, charges, asset recovery, possible imprisonment, and a ten-year bar from elective office after a dishonesty conviction." />}
      {confirm === "inflate" && <ConfirmDialog title="Pad this contract?" tone="danger" confirmLabel="Pad it" onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); dispatch({ t: "inflateProject", projectId: proj }); }} body="The project's real benefit shrinks and the paper trail grows." />}
      {confirm === "ally" && <ConfirmDialog title="Award the contract?" tone="danger" confirmLabel="Award" onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); dispatch({ t: "contractForAlly" }); }} body="An ethics inquiry could follow, with sanctions and loss of public trust." />}
    </div>
  );
}
void Building2; void naira;
