"use client";
import { useEffect, useMemo, useState } from "react";
import { GraduationCap, Briefcase, Store, Clock, Users, Wallet, Heart, HandHeart } from "lucide-react";
import { useGame, useS } from "../store";
import { Button, Card, Meter, Tabs, Badge, Callout, Field, ConfirmDialog, EmptyState, LineChart, naira, Bar } from "../kit";
import { COURSES, JOBS, JOB_BY_ID, INSTITUTION_COST, BUSINESS_TYPES, COURSE_BY_ID, type InstType } from "../../data/life";
import { EDUCATION_LABEL, EDUCATION_RANK } from "../../data/rules";
import { admissionChance, jobChance, jobRequirements, programmeCost } from "../../engine/education";
import { timeBudget, monthlyLivingCost } from "../../engine/life";
import { priceLevel } from "../../engine/queries";
import { formatMonthShort, playerAge } from "../../engine/calendar";
import { LGAS_BY_STATE, LGA_BY_ID, stateName } from "../../engine/admin";
import { STATES } from "../../data/states";
import { SOCIAL, type SocialId } from "../../engine/actions";
import { netWorth } from "../../engine/finance";
import { STUDENT_COMMITMENT_TIME } from "../../data/life";
import type { Commitments } from "../../engine/types";

type SubTab = "overview" | "education" | "work" | "business" | "time" | "family" | "money";

export function LifeScreen() {
  const { subTab, dispatch } = useGame();
  const [tab, setTab] = useState<SubTab>("overview");
  useEffect(() => { if (subTab && ["overview", "education", "work", "business", "time", "family", "money"].includes(subTab)) setTab(subTab as SubTab); }, [subTab]);
  void dispatch;
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <div className="g-page-title">My Life</div>
      <Tabs<SubTab> value={tab} onChange={setTab} tabs={[
        { id: "overview", label: "Overview" }, { id: "education", label: "Education" }, { id: "work", label: "Work" }, { id: "business", label: "Business" },
        { id: "time", label: "Time & community" }, { id: "family", label: "Family & friends" }, { id: "money", label: "Money" },
      ]} />
      {tab === "overview" && <Overview go={setTab} />}
      {tab === "education" && <Education />}
      {tab === "work" && <Work />}
      {tab === "business" && <Business />}
      {tab === "time" && <TimeTab />}
      {tab === "family" && <Family />}
      {tab === "money" && <Money />}
    </div>
  );
}

function Overview({ go }: { go: (t: SubTab) => void }) {
  const state = useS();
  const p = state.player;
  const bg = state.player.family;
  return (
    <div className="g-grid g-grid-2">
      <Card title="Where you stand" icon={<Heart size={16} />}>
        <div className="g-col g-small">
          <div><b>Occupation:</b> {p.occupation.title}</div>
          <div><b>Education:</b> {EDUCATION_LABEL[p.education.level]}{p.education.certificates.length > 1 ? ` · ${p.education.certificates.slice(1).join(", ")}` : ""}</div>
          <div><b>NYSC:</b> {{ na: "Not applicable yet", pending: "Due", serving: "Serving", done: "Completed", exempt: "Exempt" }[p.education.nysc]}</div>
          <div><b>Family:</b> father — {bg.fatherJob}; mother — {bg.motherJob}</div>
          <div className="g-row g-wrap" style={{ gap: 6 }}>{bg.notes.map((n) => <Badge key={n}>{n}</Badge>)}</div>
        </div>
        <div className="g-row g-wrap" style={{ marginTop: 12 }}>
          <Button size="sm" onClick={() => go("education")}><GraduationCap size={14} /> Education</Button>
          <Button size="sm" onClick={() => go("work")}><Briefcase size={14} /> Find work</Button>
          <Button size="sm" onClick={() => go("business")}><Store size={14} /> Business</Button>
        </div>
      </Card>
      <Card title="Skills" icon={<GraduationCap size={16} />}>
        <div className="g-col">
          <Meter label="Intelligence" value={p.attrs.intelligence} tone="blue" />
          <Meter label="Communication" value={p.attrs.communication} tone="blue" />
          <Meter label="Leadership" value={p.attrs.leadership} tone="blue" />
          <Meter label="Negotiation" value={p.attrs.negotiation} tone="blue" />
          <Meter label="Financial management" value={p.attrs.financialMgmt} tone="blue" />
          <Meter label="Integrity" value={p.attrs.integrity} tone="auto" />
        </div>
      </Card>
    </div>
  );
}

function Education() {
  const state = useS();
  const { dispatch } = useGame();
  const p = state.player;
  const e = p.education;
  const [inst, setInst] = useState<InstType>("federal");
  const [confirm, setConfirm] = useState<string | null>(null);
  const en = e.enrolled;
  const course = en ? COURSE_BY_ID[en.programmeId] : null;
  const options = COURSES.filter((c) => {
    if (c.requires && EDUCATION_RANK[e.level] < EDUCATION_RANK[c.requires]) return false;
    if (c.requiresField && !e.certificates.some((x) => x.includes(c.requiresField!))) return false;
    if (c.id === "law_school" && e.certificates.includes("Called to the Bar (BL)")) return false;
    if (!c.requires && EDUCATION_RANK[e.level] >= EDUCATION_RANK[c.level]) return false;
    return true;
  });
  return (
    <div className="g-col">
      {en && course ? (
        <Card title={`Studying: ${course.label}`} icon={<GraduationCap size={16} />}>
          <div className="g-small g-muted">{e.institution}</div>
          <div style={{ margin: "10px 0" }}><Bar value={1 - en.monthsRemaining / (course.years * 12)} label="Progress" /></div>
          <div className="g-row g-between g-small"><span>{en.monthsRemaining} months remaining{en.delayed ? ` (${en.delayed} lost to strikes)` : ""}</span><span>Costs ≈ {naira(en.monthlyCost * priceLevel(state))}/month</span></div>
          <p className="g-help" style={{ marginTop: 8 }}>You gain skills each month. Public universities can be hit by lecturers' strikes that delay graduation.</p>
        </Card>
      ) : (
        <Card title="Enrol in a programme" icon={<GraduationCap size={16} />}>
          <div className="g-grid g-grid-2" style={{ marginBottom: 12 }}>
            <Field label="Institution type" help="Fees and admission odds differ. Polytechnics offer National Diplomas.">
              {(id) => <select id={id} className="g-select" value={inst} onChange={(ev) => setInst(ev.target.value as InstType)}>
                {(["federal", "state", "private"] as InstType[]).map((k) => <option key={k} value={k}>{INSTITUTION_COST[k].label} — ₦{INSTITUTION_COST[k].tuitionYear.toLocaleString()}/yr</option>)}
              </select>}
            </Field>
          </div>
          {options.length === 0 ? <EmptyState title="No further programmes available" body="You have completed what is on offer for now." /> : (
            <div className="g-grid g-grid-2">
              {options.map((c) => {
                const useInst: InstType = c.level === "nd" ? "polytechnic" : inst;
                const odds = admissionChance(state, c.id, useInst);
                const cost = programmeCost(state, c.id, useInst);
                return (
                  <div key={c.id} className="g-card-flat g-col" style={{ gap: 6 }}>
                    <b className="g-small">{c.label}</b>
                    <div className="g-tiny g-muted">{c.years} year{c.years > 1 ? "s" : ""} · ≈ {naira(cost.monthly * priceLevel(state), true)}/month · admission odds ≈ {Math.round(odds * 100)}%</div>
                    <div className="g-tiny">Builds: {Object.keys(c.attrGain).map((k) => k.replace(/([A-Z])/g, " $1").toLowerCase()).join(", ")}</div>
                    <Button size="sm" variant="primary" onClick={() => setConfirm(`${c.id}|${useInst}`)}>Apply</Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
      {e.nysc === "pending" && (
        <Card title="National Youth Service (NYSC)"><p className="g-small">You are due to serve. You will be posted to a state (possibly your own), receive a modest allowance, and gain a certificate that many jobs require.</p>
          <div style={{ marginTop: 10 }}><Button variant="primary" onClick={() => dispatch({ t: "nysc" })}>Begin NYSC</Button></div></Card>
      )}
      <Card title="Certificates"><div className="g-row g-wrap">{e.certificates.map((c) => <Badge key={c} tone="navy">{c}</Badge>)}</div></Card>
      {confirm && (() => {
        const [id, ins] = confirm.split("|") as [string, InstType];
        const c = COURSE_BY_ID[id];
        const cost = programmeCost(state, id, ins);
        return <ConfirmDialog title={`Apply: ${c.label}`} confirmLabel="Apply" onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); dispatch({ t: "enroll", programmeId: id, inst: ins }); }}
          body={<div className="g-col"><div>Admission odds ≈ <b>{Math.round(admissionChance(state, id, ins) * 100)}%</b> — a failed application costs nothing but stress.</div><div>Fees and upkeep ≈ <b>{naira(cost.monthly * priceLevel(state))}/month</b> for {c.years * 12} months. You need three months' fees on hand.</div><div>Studying takes about {c.years === 1 ? 70 : 55}% of your time.</div></div>} />;
      })()}
    </div>
  );
}

function Work() {
  const state = useS();
  const { dispatch } = useGame();
  const p = state.player;
  const [confirm, setConfirm] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "can">("can");
  const list = JOBS.filter((j) => (filter === "all" ? true : jobRequirements(state, j.id).length === 0));
  const cur = p.occupation.jobId ? JOB_BY_ID[p.occupation.jobId] : null;
  return (
    <div className="g-col">
      <Card title="Current occupation" icon={<Briefcase size={16} />}>
        <div className="g-row g-between g-wrap">
          <div><b>{p.occupation.title}</b><div className="g-small g-muted">{p.occupation.kind === "unemployed" ? "Not currently earning a salary" : cur ? `${naira(p.occupation.baseSalary * state.economy.wageIndex / 100)}/month gross · time ${p.occupation.timePct}%` : `Time ${p.occupation.timePct}%`}</div></div>
          {cur && <Button size="sm" onClick={() => setConfirm("quit")}>Resign</Button>}
        </div>
      </Card>
      <Card title="Jobs" action={<div className="g-row"><button className="g-chip" aria-pressed={filter === "can"} onClick={() => setFilter("can")}>I qualify</button><button className="g-chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All</button></div>}>
        <div className="g-grid g-grid-2">
          {list.map((j) => {
            const miss = jobRequirements(state, j.id);
            return (
              <div key={j.id} className="g-card-flat g-col" style={{ gap: 6 }}>
                <div className="g-row g-between"><b className="g-small">{j.label}</b><Badge tone={j.sector === "public" ? "blue" : j.sector === "informal" ? "amber" : undefined}>{j.sector}</Badge></div>
                <div className="g-tiny g-muted">{j.blurb}</div>
                <div className="g-small">≈ <b>{naira(j.salary * priceLevel(state), true)}</b>/month · {j.timePct}% of your time{j.variance > 0.15 ? " · variable income" : ""}</div>
                {miss.length > 0 ? <div className="g-tiny" style={{ color: "#be123c" }}>{miss.join(". ")}</div> : <div className="g-tiny g-muted">Your odds ≈ {Math.round(jobChance(state, j.id) * 100)}%</div>}
                <Button size="sm" variant="primary" disabled={miss.length > 0 || p.occupation.jobId === j.id} onClick={() => setConfirm(j.id)}>Apply</Button>
              </div>
            );
          })}
        </div>
        {list.length === 0 && <EmptyState title="Nothing matches yet" body="Improve your education or switch the filter to see requirements." />}
      </Card>
      {confirm && confirm !== "quit" && <ConfirmDialog title={`Apply: ${JOB_BY_ID[confirm].label}`} confirmLabel="Apply" onCancel={() => setConfirm(null)} onConfirm={() => { const j = confirm; setConfirm(null); dispatch({ t: "applyJob", jobId: j }); }}
        body={<div>Your odds are about <b>{Math.round(jobChance(state, confirm) * 100)}%</b>. If you are hired you leave your current job.</div>} />}
      {confirm === "quit" && <ConfirmDialog title="Resign?" tone="danger" confirmLabel="Resign" onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); dispatch({ t: "quitJob" }); }} body="You will stop earning this salary immediately." />}
    </div>
  );
}

function Business() {
  const state = useS();
  const { dispatch } = useGame();
  const p = state.player;
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const b = p.business;
  return (
    <div className="g-col">
      {b ? (
        <Card title={b.name} icon={<Store size={16} />} action={<Button size="sm" onClick={() => setConfirm("close")}>Close business</Button>}>
          <div className="g-grid g-grid-3">
            <div><div className="g-tiny g-muted">Monthly revenue</div><b className="g-num">{naira(b.monthlyRevenue)}</b></div>
            <div><div className="g-tiny g-muted">Monthly costs</div><b className="g-num">{naira(b.monthlyCosts)}</b></div>
            <div><div className="g-tiny g-muted">Profit</div><b className="g-num" style={{ color: b.monthlyRevenue - b.monthlyCosts >= 0 ? "#047857" : "#be123c" }}>{naira(b.monthlyRevenue - b.monthlyCosts)}</b></div>
          </div>
          <div className="g-grid g-grid-2" style={{ marginTop: 12 }}>
            <Meter label="Management quality" value={b.quality} tone="blue" /><Meter label="Equity in business" value={Math.min(100, (b.capital / 10_000_000) * 100)} tone="blue" suffix="" />
          </div>
          <p className="g-help" style={{ marginTop: 8 }}>Revenue follows demand, electricity reliability, fuel prices and security in {stateName(b.stateId)}. Costs rise with generator fuel and interest rates. Months of losses can sink a business.</p>
        </Card>
      ) : (
        <Card title="Start a business" icon={<Store size={16} />}>
          <Field label="Business name">{(id) => <input id={id} className="g-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Okafor & Sons" />}</Field>
          <div className="g-grid g-grid-2" style={{ marginTop: 12 }}>
            {BUSINESS_TYPES.map((t) => (
              <div key={t.id} className="g-card-flat g-col" style={{ gap: 6 }}>
                <b className="g-small">{t.label}</b><div className="g-tiny g-muted">{t.blurb}</div>
                <div className="g-small">Start-up ≈ <b>{naira(t.startup * priceLevel(state), true)}</b> · {t.employees} staff</div>
                <div className="g-tiny g-muted">Sensitive to: {[t.powerSensitivity > 0.4 && "electricity", t.fuelSensitivity > 0.3 && "fuel prices", t.id === "tech" && "high variance", t.contractor && "public contracts"].filter(Boolean).join(", ") || "general demand"}</div>
                <Button size="sm" variant="primary" onClick={() => setConfirm(t.id)}>Start</Button>
              </div>
            ))}
          </div>
        </Card>
      )}
      {confirm && confirm !== "close" && <ConfirmDialog title="Start this business?" confirmLabel="Invest" onCancel={() => setConfirm(null)} onConfirm={() => { const c = confirm; setConfirm(null); dispatch({ t: "startBusiness", typeId: c, name: name || BUSINESS_TYPES.find((x) => x.id === c)!.label }); }}
        body={<div>You will put in about <b>{naira(BUSINESS_TYPES.find((x) => x.id === confirm)!.startup * priceLevel(state))}</b> of your own money. Profits are uncertain and depend on the economy; losses can mount.</div>} />}
      {confirm === "close" && <ConfirmDialog title="Close the business?" tone="danger" confirmLabel="Close it" onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); dispatch({ t: "closeBusiness" }); }} body="You recover a share of the capital. Staff lose their jobs." />}
    </div>
  );
}

const COMMIT_INFO: { key: keyof Commitments; label: string; desc: string; need?: (s: ReturnType<typeof useS>) => string | null }[] = [
  { key: "volunteering", label: "Volunteering", desc: "Local service builds name recognition, reputation and goodwill." },
  { key: "organising", label: "Community organising", desc: "Builds leadership, communication and political experience; fastest way to become known." },
  { key: "partyWork", label: "Party work", desc: "Raises your standing in your party and expands your network.", need: (s) => (s.player.politics.membership ? null : "Join a party first") },
  { key: "studentUnion", label: "Student union", desc: "Leadership practice and campus visibility.", need: (s) => (s.player.education.enrolled ? null : "Only while studying") },
  { key: "professionalBody", label: "Professional association", desc: "Contacts among lawyers, doctors, engineers and others." },
  { key: "selfStudy", label: "Self-study", desc: "Slowly raises intelligence and improves admission odds." },
  { key: "constituencyWork", label: "Constituency work", desc: "Visible service in your area while in office.", need: (s) => (s.player.politics.seatId ? null : "Only in office") },
  { key: "family", label: "Family time", desc: "Lowers stress; reduces the pull of family obligations." },
];

function TimeTab() {
  const state = useS();
  const { dispatch } = useGame();
  const tb = timeBudget(state);
  const p = state.player;
  const [target, setTarget] = useState("");
  const lga = p.residenceLgaId;
  const locals = useMemo(() => {
    const ids = [state.seats[`lgc:${lga}`]?.holderId, ...(state.states[p.residenceStateId].assemblySeatIds.map((s) => state.seats[s]).filter((s) => s.lgaIds.includes(lga)).map((s) => s.holderId))];
    return ids.filter((x): x is string => !!x && !!state.chars[x]);
  }, [state, lga, p.residenceStateId]);
  return (
    <div className="g-col">
      <Card title="Your month" icon={<Clock size={16} />}>
        <Meter label={`Time committed: ${Math.round(tb.used)}% of your month`} value={Math.min(tb.used, 100)} tone={tb.used > 100 ? "red" : tb.used > 85 ? "amber" : "green"} suffix="%" />
        <div className="g-tiny g-muted" style={{ margin: "6px 0" }}>{tb.items.map((i) => `${i.label} ${i.pct}%`).join(" · ") || "Nothing scheduled"}</div>
        {tb.used > 100 && <Callout tone="warn">You are over-committed. Stress and health will suffer until you drop something.</Callout>}
        <div className="g-grid g-grid-2" style={{ marginTop: 12 }}>
          {COMMIT_INFO.map((c) => {
            const blocked = c.need?.(state) ?? null;
            const on = p.commitments[c.key];
            return (
              <div key={c.key} className="g-card-flat">
                <div className="g-row g-between"><b className="g-small">{c.label}</b><Badge>{STUDENT_COMMITMENT_TIME[c.key]}% time</Badge></div>
                <div className="g-tiny g-muted" style={{ margin: "4px 0 8px" }}>{c.desc}</div>
                <Button size="sm" variant={on ? "navy" : "default"} disabled={!!blocked && !on} onClick={() => dispatch({ t: "commitment", key: c.key, on: !on }, { silent: true })} aria-pressed={on}>{on ? "Active — tap to stop" : blocked ?? "Start"}</Button>
              </div>
            );
          })}
        </div>
      </Card>
      <Card title="Community and networking" icon={<HandHeart size={16} />}>
        <p className="g-small g-muted" style={{ marginBottom: 8 }}>One-off actions. Each can be done once a month.</p>
        <div className="g-grid g-grid-2">
          {SOCIAL.map((s) => {
            const cost = s.cost(state);
            return (
              <div key={s.id} className="g-card-flat g-col" style={{ gap: 6 }}>
                <b className="g-small">{s.label}</b><div className="g-tiny g-muted">{s.desc}</div>
                {s.needsTarget && (
                  <select className="g-select" aria-label="Choose a person" value={target} onChange={(e) => setTarget(e.target.value)}>
                    <option value="">Choose a person…</option>
                    {locals.map((id) => <option key={id} value={id}>{state.chars[id].name}{state.chars[id].seatId ? ` — ${state.seats[state.chars[id].seatId!].label}` : ""}</option>)}
                  </select>
                )}
                <Button size="sm" onClick={() => dispatch({ t: "social", id: s.id as SocialId, targetId: target || undefined })}>{cost ? `Do it (${naira(cost, true)})` : "Do it (free)"}</Button>
              </div>
            );
          })}
        </div>
      </Card>
      <Card title="Move home">
        <RelocateBox />
      </Card>
    </div>
  );
}

function RelocateBox() {
  const state = useS();
  const { dispatch } = useGame();
  const [s, setS] = useState(state.player.residenceStateId);
  const [l, setL] = useState("");
  const [ok, setOk] = useState(false);
  const lgas = LGAS_BY_STATE[s];
  return (
    <div className="g-col">
      <p className="g-small g-muted">You live in {LGA_BY_ID[state.player.residenceLgaId].name}, {stateName(state.player.residenceStateId)}. Moving changes your cost of living and constituency — and you start with little name recognition there.</p>
      <div className="g-grid g-grid-2">
        <select className="g-select" aria-label="State" value={s} onChange={(e) => { setS(e.target.value); setL(""); }}>{STATES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <select className="g-select" aria-label="LGA" value={l} onChange={(e) => setL(e.target.value)}><option value="">Choose LGA…</option>{lgas.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      </div>
      <div><Button size="sm" disabled={!l} onClick={() => setOk(true)}>Move here</Button></div>
      {ok && <ConfirmDialog title="Move home?" confirmLabel="Move" onCancel={() => setOk(false)} onConfirm={() => { setOk(false); dispatch({ t: "relocate", lgaId: l }); }} body={`Relocating to ${LGA_BY_ID[l]?.name} costs money and unsettles you for a while. Your name recognition there starts from scratch.`} />}
    </div>
  );
}

function Family() {
  const state = useS();
  const p = state.player;
  const fam = p.family.relatives.map((r) => ({ r, c: state.chars[r.id], rel: p.relationships[r.id] })).filter((x) => x.c);
  const others = Object.values(p.relationships).filter((r) => r.kind !== "family" && state.chars[r.id]).sort((a, b) => b.affinity - a.affinity).slice(0, 12);
  const cost = monthlyLivingCost(state);
  return (
    <div className="g-grid g-grid-2">
      <Card title="Family" icon={<Users size={16} />}>
        {fam.map(({ r, c, rel }) => (
          <div key={r.id} className="g-list-row">
            <div className="g-grow"><b className="g-small">{c.name}</b><div className="g-tiny g-muted">{r.role}{c.role ? ` · ${c.role}` : ""}</div></div>
            <div style={{ width: 120 }}><Meter label="Bond" value={Math.max(0, rel?.affinity ?? 0)} tone="auto" /></div>
          </div>
        ))}
        <p className="g-help" style={{ marginTop: 8 }}>Family expects support of about {naira(p.family.obligation * priceLevel(state))}/month at today's prices. Family time lowers stress and softens obligations.</p>
      </Card>
      <Card title="Friends, mentors and contacts">
        {others.length === 0 ? <EmptyState title="No contacts yet" body="Join a party, volunteer and pay courtesy calls to build a network." /> : others.map((r) => {
          const c = state.chars[r.id];
          return <div key={r.id} className="g-list-row"><div className="g-grow"><b className="g-small">{c.name}</b><div className="g-tiny g-muted">{r.kind}{c.seatId ? ` · ${state.seats[c.seatId].label}` : c.role ? ` · ${c.role}` : ""}</div></div><Badge tone={r.affinity > 25 ? "green" : r.affinity < -10 ? "red" : undefined}>{r.affinity > 0 ? "+" : ""}{Math.round(r.affinity)}</Badge></div>;
        })}
      </Card>
      <Card title="Monthly essentials (simulated prices)">
        <table className="g-table"><tbody>
          <tr><td>Food</td><td className="g-num">{naira(cost.food)}</td></tr><tr><td>Transport (fuel-linked)</td><td className="g-num">{naira(cost.transport)}</td></tr>
          <tr><td>Electricity &amp; generator fuel</td><td className="g-num">{naira(cost.utilities)}</td></tr><tr><td>Rent</td><td className="g-num">{naira(cost.rent)}</td></tr>
        </tbody></table>
      </Card>
    </div>
  );
}

function Money() {
  const state = useS();
  const { dispatch } = useGame();
  const f = state.player.finances;
  const [amt, setAmt] = useState("100000");
  const [cat, setCat] = useState("all");
  const entries = [...f.ledger].reverse().filter((l) => cat === "all" || l.cat === cat).slice(0, 40);
  const cats = Array.from(new Set(f.ledger.map((l) => l.cat)));
  return (
    <div className="g-col">
      <div className="g-grid g-grid-4">
        <Card><div className="g-tiny g-muted">Cash</div><div className="g-num" style={{ fontSize: 22, fontWeight: 800 }}>{naira(f.cash)}</div></Card>
        <Card><div className="g-tiny g-muted">Savings</div><div className="g-num" style={{ fontSize: 22, fontWeight: 800 }}>{naira(f.savings)}</div></Card>
        <Card><div className="g-tiny g-muted">Debts</div><div className="g-num" style={{ fontSize: 22, fontWeight: 800, color: f.debts.length ? "#be123c" : undefined }}>{naira(f.debts.reduce((t, d) => t + d.principal, 0))}</div></Card>
        <Card><div className="g-tiny g-muted">Net worth</div><div className="g-num" style={{ fontSize: 22, fontWeight: 800 }}>{naira(netWorth(f), true)}</div></Card>
      </div>
      <div className="g-grid g-split-eq g-grid-2">
        <Card title="Net worth over time"><LineChart series={[{ label: "Net worth (₦)", color: "#00a862", points: f.monthly.map((m) => ({ x: m.m, y: m.wealth })) }]} format={(v) => naira(v, true)} xLabel={(x) => formatMonthShort(state, x)} /></Card>
        <Card title="Move money">
          <Field label="Amount (₦)">{(id) => <input id={id} className="g-input" inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9]/g, ""))} />}</Field>
          <div className="g-row" style={{ marginTop: 8 }}><Button size="sm" onClick={() => dispatch({ t: "deposit", amount: Number(amt) })}>Cash → savings</Button><Button size="sm" onClick={() => dispatch({ t: "withdraw", amount: Number(amt) })}>Savings → cash</Button></div>
          <p className="g-help" style={{ marginTop: 8 }}>Savings earn modest interest but lose purchasing power when inflation is high ({state.economy.inflation.toFixed(1)}% now).</p>
          {f.campaignFund > 0 && <div className="g-small" style={{ marginTop: 8 }}>Campaign fund (separate account): <b>{naira(f.campaignFund)}</b></div>}
          {f.illicit > 0 && <Callout tone="bad"><b>Undeclared funds: {naira(f.illicit)}.</b> These are tracked separately, are not part of lawful accounts, and are recoverable by courts.</Callout>}
        </Card>
      </div>
      {f.debts.length > 0 && <Card title="Debts">{f.debts.map((d) => <div key={d.id} className="g-list-row"><div className="g-grow g-small">{d.label}<div className="g-tiny g-muted">{d.rate}% · pays ≈ {naira(d.monthlyPayment)}/month</div></div><b className="g-num">{naira(d.principal)}</b></div>)}</Card>}
      {f.assets.length > 0 && <Card title="Assets">{f.assets.map((a) => <div key={a.id} className="g-list-row"><div className="g-grow g-small">{a.label}</div><b className="g-num">{naira(a.value)}</b></div>)}</Card>}
      <Card title="Where your money went" icon={<Wallet size={16} />} action={<select className="g-select" style={{ width: 150, minHeight: 34, padding: "4px 8px" }} aria-label="Filter by category" value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">All categories</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select>}>
        <div className="g-scroll-x"><table className="g-table"><thead><tr><th>When</th><th>What</th><th>Account</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead><tbody>
          {entries.map((l, i) => <tr key={i}><td className="g-muted">{formatMonthShort(state, l.m)}</td><td>{l.label}</td><td className="g-muted">{l.account}</td><td className="g-num" style={{ textAlign: "right", color: l.amount >= 0 ? "#047857" : "#be123c" }}>{l.amount >= 0 ? "+" : "−"}{naira(Math.abs(l.amount))}</td></tr>)}
        </tbody></table></div>
        {entries.length === 0 && <div className="g-small g-muted">No transactions yet.</div>}
      </Card>
    </div>
  );
}
void playerAge;
