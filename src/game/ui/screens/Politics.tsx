"use client";
import { useEffect, useMemo, useState } from "react";
import { Users, Flag, Scale, Network, ShieldAlert, BadgeCheck } from "lucide-react";
import { useGame, useS } from "../store";
import { Badge, Button, Callout, Card, ConfirmDialog, EmptyState, Field, Meter, Tabs, naira, Modal, Bar } from "../kit";
import { ISSUE_LABEL, type PartyDef } from "../../data/parties";
import { OFFICE_ORDER, EDUCATION_LABEL } from "../../data/rules";
import { ruleOf } from "../../engine/world";
import { partyDefOf, partyColor, partyAbbr, holderOf } from "../../engine/queries";
import { checkPlayerEligibility } from "../../engine/eligibility";
import { PARTY_POSTS, partyOfficeChance, foundingRequirements } from "../../engine/politics";
import { stateAffinity } from "../../engine/world";
import { formatMonth, formatMonthShort, playerAge } from "../../engine/calendar";
import { stateName } from "../../engine/admin";
import { priceLevel } from "../../engine/queries";
import { networkStrength } from "../../engine/relationships";
import { appointmentChance } from "../../engine/governance";

type Sub = "parties" | "network" | "roles" | "offices" | "ethics";

export function PoliticsScreen() {
  const state = useS();
  const { subTab } = useGame();
  const [tab, setTab] = useState<Sub>("parties");
  useEffect(() => { if (subTab && ["parties", "network", "roles", "offices", "ethics"].includes(subTab)) setTab(subTab as Sub); }, [subTab]);
  const m = state.player.politics.membership;
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <div className="g-row g-between g-wrap"><div className="g-page-title">Politics</div>{m && <Badge tone="navy"><span style={{ width: 8, height: 8, borderRadius: 9, background: partyColor(state, m.partyId), display: "inline-block" }} /> {partyDefOf(state, m.partyId)?.name}</Badge>}</div>
      <Tabs<Sub> value={tab} onChange={setTab} tabs={[{ id: "parties", label: "Parties" }, { id: "network", label: "Network" }, { id: "roles", label: "Party roles & appointments" }, { id: "offices", label: "Offices & rules" }, { id: "ethics", label: "Ethics & law" }]} />
      {tab === "parties" && <Parties />}
      {tab === "network" && <NetworkTab />}
      {tab === "roles" && <Roles />}
      {tab === "offices" && <Offices />}
      {tab === "ethics" && <Ethics />}
    </div>
  );
}

function ideologyTags(d: PartyDef): string[] {
  const t: string[] = [];
  t.push(d.ideology.economic > 0.3 ? "Market-friendly" : d.ideology.economic < -0.3 ? "State-led / welfarist" : "Mixed economy");
  t.push(d.ideology.social > 0.3 ? "Socially liberal" : d.ideology.social < -0.3 ? "Socially conservative" : "Socially moderate");
  t.push(d.ideology.federalism > 0.5 ? "Strong devolution" : d.ideology.federalism < -0.05 ? "Centralist" : "Balanced federalism");
  return t;
}

function Parties() {
  const state = useS();
  const { dispatch } = useGame();
  const p = state.player;
  const m = p.politics.membership;
  const [open, setOpen] = useState<string | null>(null);
  const [faction, setFaction] = useState<string>("");
  const [confirm, setConfirm] = useState<null | { kind: "join" | "defect" | "leave"; id?: string }>(null);
  const [found, setFound] = useState(false);
  const ids = Object.values(state.parties).filter((x) => x.exists).map((x) => x.id);
  const local = stateAffinity(state, p.residenceStateId);
  const age = playerAge(state);
  return (
    <div className="g-col">
      {!m && age >= 18 && <Callout tone="info">Politics begins with a party card. Compare platforms and local strength below. Parties are <b>fictional</b>, inspired by the range of positions and organisation styles in Nigerian politics.</Callout>}
      {m && <Callout tone="good">You belong to <b>{partyDefOf(state, m.partyId)?.name}</b> (standing {Math.round(m.standing)}/100{m.factionId ? `, ${partyDefOf(state, m.partyId)?.factions.find((f) => f.id === m.factionId)?.name}` : ""}). Changing parties damages trust and relationships, but can open doors.</Callout>}
      <div className="g-grid g-grid-2">
        {ids.map((id) => {
          const d = partyDefOf(state, id)!;
          const ps = state.parties[id];
          const mine = m?.partyId === id;
          const lean = local[id] ?? 0;
          return (
            <Card key={id} className="g-col">
              <div className="g-row g-between"><div className="g-row"><div className="g-avatar" style={{ width: 44, height: 44, background: d.color, color: d.textColor, fontSize: 14 }}>{d.abbr}</div><div><b>{d.name}</b><div className="g-tiny g-muted g-serif">“{d.motto}”</div></div></div>{mine && <Badge tone="green"><BadgeCheck size={12} /> Member</Badge>}</div>
              <div className="g-small g-muted">{d.blurb}</div>
              <div className="g-row g-wrap" style={{ gap: 6 }}>{ideologyTags(d).map((t) => <Badge key={t}>{t}</Badge>)}</div>
              <div className="g-small"><b>Priorities:</b> {Object.entries(d.priorities).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, 3).map(([k]) => ISSUE_LABEL[k as keyof typeof ISSUE_LABEL]).join(", ")}</div>
              <div className="g-grid g-grid-2" style={{ gap: "8px 16px" }}>
                <Meter label="Organisation" value={ps.orgStrength} tone="blue" /><Meter label="Reputation" value={ps.reputation} tone="auto" />
                <Meter label={`Voter lean in ${stateName(p.residenceStateId)}`} value={lean * 100} max={50} suffix="%" tone="blue" hint="Share of local voter lean (simulated)" />
                <div className="g-small"><div className="g-tiny g-muted">Treasury (sim.)</div><b>{naira(ps.fundsM * 1e6, true)}</b>{ps.inPower && <> <Badge tone="blue">In power</Badge></>}</div>
              </div>
              {open === id && (
                <div className="g-small g-col" style={{ gap: 6 }}>
                  <div><b>Leadership:</b> {d.leadership}. Primaries: {d.primaryStyle === "direct" ? "direct, members vote" : d.primaryStyle === "delegates" ? "delegates' congress" : "consensus-leaning"}.</div>
                  <div><b>Factions:</b></div>
                  {d.factions.map((f) => <div key={f.id} className="g-tiny"><b>{f.name}</b> — {f.blurb} <span className="g-muted">(influence {ps.factionPower[f.id] ?? 0})</span></div>)}
                </div>
              )}
              <div className="g-row g-wrap" style={{ marginTop: "auto" }}>
                <Button size="sm" variant="ghost" onClick={() => setOpen(open === id ? null : id)}>{open === id ? "Less" : "Details"}</Button>
                {!mine && !m && <Button size="sm" variant="primary" disabled={age < 18} onClick={() => { setFaction(d.factions[0].id); setConfirm({ kind: "join", id }); }}>Join</Button>}
                {!mine && m && <Button size="sm" onClick={() => setConfirm({ kind: "defect", id })}>Defect here</Button>}
                {mine && <Button size="sm" onClick={() => setConfirm({ kind: "leave" })}>Leave party</Button>}
              </div>
            </Card>
          );
        })}
      </div>
      <Card title="Start your own party" icon={<Flag size={16} />}>
        {p.politics.foundedPartyId ? <div className="g-small">You founded <b>{partyDefOf(state, p.politics.foundedPartyId)?.name}</b>.</div> : typeof p.flags["partyFoundingStart"] === "number" && (p.flags["partyFoundingStart"] as number) >= 0 ? <div className="g-small">Registration under way — decision expected {formatMonth(state, (p.flags["partyFoundingStart"] as number) + 12)}.</div> : (
          <>
            <div className="g-small g-muted">Registering a party takes about a year and money, name recognition and political capital. A brand-new party starts tiny, but you set its platform.</div>
            <div style={{ marginTop: 10 }}><Button size="sm" onClick={() => setFound(true)}>See requirements</Button></div>
          </>
        )}
      </Card>
      {confirm?.kind === "join" && confirm.id && (
        <Modal title={`Join ${partyDefOf(state, confirm.id)?.abbr}?`} onClose={() => setConfirm(null)} footer={<><Button onClick={() => setConfirm(null)}>Cancel</Button><Button variant="primary" onClick={() => { const id = confirm.id!; setConfirm(null); dispatch({ t: "joinParty", partyId: id, factionId: faction }); }}>Join</Button></>}>
          <div className="g-small">Membership gives access to the party's primaries and officials. Pick the faction you will align with — it shapes who your early allies are.</div>
          <Field label="Faction">{(id) => <select id={id} className="g-select" value={faction} onChange={(e) => setFaction(e.target.value)}>{partyDefOf(state, confirm.id!)!.factions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>}</Field>
        </Modal>
      )}
      {confirm?.kind === "defect" && confirm.id && <ConfirmDialog title={`Defect to ${partyDefOf(state, confirm.id)?.abbr}?`} tone="danger" confirmLabel="Defect" onCancel={() => setConfirm(null)} onConfirm={() => { const id = confirm.id!; setConfirm(null); dispatch({ t: "defect", partyId: id }); }}
        body={<ul className="g-col" style={{ margin: 0, paddingLeft: 18 }}><li>Former party colleagues turn cold (−15 on each tie).</li><li>You lose some support in your old party's strongholds.</li><li>Public trust and reputation take a small hit — worse if you hold office.</li><li>Any current candidacy is withdrawn; your standing in the new party starts low.</li></ul>} />}
      {confirm?.kind === "leave" && <ConfirmDialog title="Leave your party?" tone="danger" confirmLabel="Leave" onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); dispatch({ t: "leaveParty" }); }} body="You lose party posts and any current candidacy. Constitutionally, you cannot contest elections without a sponsoring party." />}
      {found && <FoundParty onClose={() => setFound(false)} />}
    </div>
  );
}

function FoundParty({ onClose }: { onClose: () => void }) {
  const state = useS();
  const { dispatch } = useGame();
  const req = foundingRequirements(state);
  const p = state.player;
  const [cfg, setCfg] = useState({ name: "", abbr: "", color: "#7c3aed", economic: 0, social: 0, federalism: 0, motto: "" });
  const checks = [
    { ok: playerAge(state) >= 21, t: "Age 21 or over" },
    { ok: p.fame.national >= req.minFame, t: `National name recognition ≥ ${req.minFame} (yours: ${Math.round(p.fame.national)})` },
    { ok: p.politics.capital >= req.minCapital, t: `Political capital ≥ ${req.minCapital} (yours: ${Math.round(p.politics.capital)})` },
    { ok: p.finances.cash + p.finances.savings >= req.fee, t: `Funds ≈ ${naira(req.fee)} for registration and state offices` },
  ];
  return (
    <Modal title="Found a political party" wide onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!checks.every((c) => c.ok)} onClick={() => { dispatch({ t: "foundParty", cfg }); onClose(); }}>Begin registration</Button></>}>
      <ul style={{ margin: 0, paddingLeft: 18 }} className="g-small">{checks.map((c) => <li key={c.t} style={{ color: c.ok ? "#047857" : "#be123c" }}>{c.ok ? "✓" : "✗"} {c.t}</li>)}</ul>
      <div className="g-tiny g-muted">{req.note} Real registration requires offices in at least {req.minStateOffices} states; here it is abstracted into money, recognition and capital, plus a 12-month process.</div>
      <div className="g-grid g-grid-2">
        <Field label="Party name">{(id) => <input id={id} className="g-input" value={cfg.name} onChange={(e) => setCfg({ ...cfg, name: e.target.value })} />}</Field>
        <Field label="Abbreviation (max 5)">{(id) => <input id={id} className="g-input" value={cfg.abbr} maxLength={5} onChange={(e) => setCfg({ ...cfg, abbr: e.target.value.toUpperCase() })} />}</Field>
        <Field label="Motto">{(id) => <input id={id} className="g-input" value={cfg.motto} onChange={(e) => setCfg({ ...cfg, motto: e.target.value })} />}</Field>
        <Field label="Colour">{(id) => <input id={id} type="color" value={cfg.color} onChange={(e) => setCfg({ ...cfg, color: e.target.value })} style={{ width: 70, height: 44 }} />}</Field>
        <Field label={`Economy: ${cfg.economic < -0.2 ? "state-led" : cfg.economic > 0.2 ? "market-led" : "mixed"}`}>{(id) => <input id={id} type="range" min={-1} max={1} step={0.1} value={cfg.economic} onChange={(e) => setCfg({ ...cfg, economic: Number(e.target.value) })} />}</Field>
        <Field label={`Social outlook: ${cfg.social < -0.2 ? "traditional" : cfg.social > 0.2 ? "liberal" : "moderate"}`}>{(id) => <input id={id} type="range" min={-1} max={1} step={0.1} value={cfg.social} onChange={(e) => setCfg({ ...cfg, social: Number(e.target.value) })} />}</Field>
        <Field label={`Federalism: ${cfg.federalism < -0.2 ? "centralist" : cfg.federalism > 0.2 ? "devolutionist" : "balanced"}`}>{(id) => <input id={id} type="range" min={-1} max={1} step={0.1} value={cfg.federalism} onChange={(e) => setCfg({ ...cfg, federalism: Number(e.target.value) })} />}</Field>
      </div>
    </Modal>
  );
}

function NetworkTab() {
  const state = useS();
  const { dispatch } = useGame();
  const p = state.player;
  const [filter, setFilter] = useState<"all" | "party" | "gov">("all");
  const rels = Object.values(p.relationships).filter((r) => state.chars[r.id] && r.kind !== "family").sort((a, b) => b.affinity - a.affinity);
  const rows = rels.filter((r) => (filter === "all" ? true : filter === "party" ? state.chars[r.id].partyId === p.politics.membership?.partyId : !!state.chars[r.id].seatId));
  // people near you worth meeting
  const nearby = useMemo(() => {
    const st = state.states[p.residenceStateId];
    const ids = [...(st.governorSeatId ? [st.governorSeatId] : []), ...st.senateSeatIds, ...st.repsSeatIds.filter((s) => state.seats[s].lgaIds.includes(p.residenceLgaId)), ...st.assemblySeatIds.filter((s) => state.seats[s].lgaIds.includes(p.residenceLgaId)), `lgc:${p.residenceLgaId}`];
    return ids.map((s) => ({ s: state.seats[s], c: holderOf(state, s) })).filter((x) => x.c && !p.relationships[x.c.id]);
  }, [state, p.residenceStateId, p.residenceLgaId, p.relationships]);
  return (
    <div className="g-grid g-split-eq g-grid-2">
      <Card title="Your network" icon={<Network size={16} />} action={<div className="g-row">{(["all", "party", "gov"] as const).map((f) => <button key={f} className="g-chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === "all" ? "All" : f === "party" ? "My party" : "Office-holders"}</button>)}</div>}>
        <div className="g-small g-muted" style={{ marginBottom: 6 }}>Network strength: <b>{networkStrength(state).toFixed(1)}</b> — sum of positive ties weighted by each contact's office.</div>
        {rows.length === 0 ? <EmptyState title="No political contacts yet" body="Join a party, pay courtesy visits and build relationships with local office-holders." /> : rows.map((r) => {
          const c = state.chars[r.id];
          return (
            <div key={r.id} className="g-list-row">
              <div className="g-grow"><b className="g-small">{c.name}</b> {c.partyId && <Badge>{partyAbbr(state, c.partyId)}</Badge>}<div className="g-tiny g-muted">{c.seatId ? state.seats[c.seatId].label : c.role ?? "Politician"} · {r.kind}</div></div>
              <div style={{ width: 90 }}><Bar value={(r.affinity + 100) / 200} tone={r.affinity < 0 ? "red" : undefined} label="Relationship" /></div>
              <b className="g-num g-small" style={{ width: 34, textAlign: "right" }}>{Math.round(r.affinity)}</b>
              <Button size="sm" onClick={() => dispatch({ t: "social", id: "courtesy_visit", targetId: r.id })}>Visit</Button>
            </div>
          );
        })}
      </Card>
      <Card title="People worth meeting" icon={<Users size={16} />}>
        {nearby.length === 0 ? <div className="g-small g-muted">You already know the key local figures.</div> : nearby.map(({ s, c }) => (
          <div key={c!.id} className="g-list-row"><div className="g-grow"><b className="g-small">{c!.name}</b> <Badge>{partyAbbr(state, c!.partyId)}</Badge><div className="g-tiny g-muted">{s.label}</div></div><Button size="sm" onClick={() => dispatch({ t: "social", id: "courtesy_visit", targetId: c!.id })}>Introduce yourself</Button></div>
        ))}
        <p className="g-help" style={{ marginTop: 8 }}>A courtesy visit costs a small gift and can be done once a month. Strong relationships help in primaries, appointments and coalition-building. Relationships fade if neglected.</p>
      </Card>
    </div>
  );
}

function Roles() {
  const state = useS();
  const { dispatch } = useGame();
  const p = state.player;
  const m = p.politics.membership;
  const [c, setC] = useState<{ level: keyof typeof PARTY_POSTS; top: boolean } | null>(null);
  if (!m) return <EmptyState title="Join a party first" body="Party posts and political appointments are open to party members." />;
  const levels: { level: keyof typeof PARTY_POSTS; label: string }[] = [{ level: "ward", label: "Ward" }, { level: "lga", label: "LGA" }, { level: "state", label: "State" }, { level: "national", label: "National" }];
  return (
    <div className="g-col">
      <Card title="Party offices" icon={<Flag size={16} />}>
        <div className="g-small g-muted" style={{ marginBottom: 8 }}>Party office is separate from public office. Holding one raises your weight in primaries. Terms last four years.{m.office ? <> You currently hold <b>{m.office.post}</b> (since {formatMonthShort(state, m.office.since)}).</> : null}</div>
        <div className="g-grid g-grid-2">
          {levels.flatMap((l) => [false, true].map((top) => {
            const ch = partyOfficeChance(state, l.level, top);
            return (
              <div key={`${l.level}${top}`} className="g-card-flat g-col" style={{ gap: 4 }}>
                <b className="g-small">{PARTY_POSTS[l.level][top ? 1 : 0]}</b>
                <div className="g-tiny g-muted">Odds ≈ {Math.round(ch.p * 100)}% · {ch.why.join(" · ")}</div>
                <Button size="sm" onClick={() => setC({ level: l.level, top })}>Contest</Button>
              </div>
            );
          }))}
        </div>
      </Card>
      <Card title="Political appointments" icon={<BadgeCheck size={16} />}>
        <div className="g-small g-muted" style={{ marginBottom: 8 }}>Governing-party executives appoint loyal advisers and commissioners. Appointments pay a salary and build experience, but you must resign before contesting an election.</div>
        {p.politics.appointment ? (
          <div className="g-row g-between g-wrap"><div><b>{p.politics.appointment.label}</b><div className="g-tiny g-muted">Since {formatMonthShort(state, p.politics.appointment.since)}</div></div><Button size="sm" onClick={() => dispatch({ t: "resignAppointment" })}>Resign</Button></div>
        ) : (
          <div className="g-grid g-grid-3">
            {(["local", "state", "federal"] as const).map((lv) => { const ch = appointmentChance(state, lv); return (
              <div key={lv} className="g-card-flat g-col" style={{ gap: 4 }}><b className="g-small" style={{ textTransform: "capitalize" }}>{lv} level</b><div className="g-tiny g-muted">{ch.note}</div><Button size="sm" disabled={ch.p <= 0} onClick={() => dispatch({ t: "appointment", level: lv })}>Seek appointment{ch.p > 0 ? ` (${Math.round(ch.p * 100)}%)` : ""}</Button></div>
            ); })}
          </div>
        )}
      </Card>
      {c && <ConfirmDialog title={`Contest ${PARTY_POSTS[c.level][c.top ? 1 : 0]}`} confirmLabel="Run" onCancel={() => setC(null)} onConfirm={() => { const x = c; setC(null); dispatch({ t: "partyOffice", level: x.level, top: x.top }); }}
        body={<div className="g-col"><div>Odds ≈ <b>{Math.round(partyOfficeChance(state, c.level, c.top).p * 100)}%</b>. Mobilisation and dues are charged whether or not you win.</div><div>A loss costs a little party standing.</div></div>} />}
    </div>
  );
}

function Offices() {
  const state = useS();
  const rule = ruleOf(state);
  return (
    <div className="g-col">
      <Callout tone="info">Eligibility comes from a versioned, data-driven ruleset (<b>{rule.title}</b>, v{rule.version}). It simplifies the 1999 Constitution (as amended) and the Electoral Act 2022; items marked simulated are design assumptions. Always check the primary sources.</Callout>
      <div className="g-grid g-grid-2">
        {OFFICE_ORDER.filter((o) => o !== "councillor").map((o) => {
          const r = rule.offices[o];
          const el = checkPlayerEligibility(state, o, state.seats["pres"].nextElection);
          return (
            <Card key={o} title={r.label} icon={<Scale size={16} />}>
              <div className="g-small g-col" style={{ gap: 4 }}>
                <div>Minimum age <b>{r.minAge}</b> · term <b>{r.termMonths / 12} years</b> · {r.termLimit ? `limit ${r.termLimit} terms` : "no term limit"}</div>
                <div>Education: {EDUCATION_LABEL[r.minEducation]} · {r.citizenshipByBirth ? "citizen by birth" : "citizen"} · party-sponsored</div>
                <div>Nomination form ≈ {naira(r.nominationFee * priceLevel(state), true)} · lawful campaign limit {naira(r.campaignLimit, true)}</div>
                <div className="g-tiny g-muted">{r.legalBasis}{r.simulated ? ` ${r.simulated}` : ""}</div>
              </div>
              <div className="g-section-title" style={{ margin: "10px 0 4px" }}>You today (election-day {formatMonthShort(state, state.seats["pres"].nextElection)})</div>
              {el.checks.filter((c) => !["single", "custody"].includes(c.id)).map((c) => <div key={c.id} className="g-tiny" style={{ color: c.ok ? "#047857" : "#be123c" }}>{c.ok ? "✓" : "✗"} {c.text}</div>)}
            </Card>
          );
        })}
      </div>
      <Card title="How elections are decided">
        <ul className="g-small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li><b>President:</b> the leading candidate must also win at least {Math.round(rule.presidential.minUnitShare * 100)}% in at least {rule.presidential.requiredStates} of 36 states. Otherwise a runoff between the leader and the runner-up who won the most states is held.</li>
          <li><b>Governor:</b> the leader must win at least {Math.round(rule.governorship.minUnitShare * 100)}% in two-thirds of the state's LGAs; otherwise a runoff.</li>
          <li><b>Senate, House of Reps, State Assembly, LGA Chairman:</b> the candidate with the most votes in the constituency wins.</li>
          <li>Campaigns last about {rule.timeline.campaignStarts} months. Primaries are held about {rule.timeline.primaryMonth} months before election day.</li>
        </ul>
        <div className="g-tiny g-muted" style={{ marginTop: 8 }}>{rule.notes.join(" ")}</div>
      </Card>
    </div>
  );
}

function Ethics() {
  const state = useS();
  const { dispatch } = useGame();
  const ig = state.player.integrity;
  const a = state.player.attrs;
  const live = ig.schemes.filter((s) => s.stage !== "closed");
  const [settle, setSettle] = useState<string | null>(null);
  return (
    <div className="g-col">
      <Callout tone="info">Conduct is tracked in separate variables — none of them substitutes for another. Clean conduct means no corruption investigations; wrongdoing leaves evidence whose chance of surfacing depends on witnesses, media attention, oversight capacity and institutional independence. Political cover helps, but never guarantees impunity.</Callout>
      <div className="g-grid g-grid-2">
        <Card title="Your record" icon={<ShieldAlert size={16} />}>
          <div className="g-col">
            <Meter label="Personal integrity" value={a.integrity} tone="auto" hint="Your own conduct — changes only through your decisions" />
            <Meter label="Public trust" value={ig.publicTrust} tone="auto" hint="How much citizens believe you; falls with scandals, recovers slowly" />
            <Meter label="Reputation" value={a.reputation} tone="auto" />
            <Meter label="Political influence" value={ig.influence} tone="blue" hint="Power to move things; offers some cover from scrutiny" />
            <Meter label="Evidence exposure" value={ig.exposure} tone="inverse" hint="Strongest evidence against you across live schemes" />
            <Meter label="Legal risk" value={ig.legalRisk} tone="inverse" />
          </div>
          {state.player.finances.illicit > 0 && <div style={{ marginTop: 10 }}><Callout tone="bad">Undeclared funds on record: <b>{naira(state.player.finances.illicit)}</b> — held separately and subject to recovery.</Callout></div>}
        </Card>
        <Card title="Open matters">
          {live.length === 0 && ig.cases.filter((c) => !c.outcome).length === 0 ? <EmptyState title="Nothing outstanding" body="No live evidence files or cases." icon={<BadgeCheck size={28} />} /> : (
            <div className="g-col">
              {live.map((s) => (
                <div key={s.id} className="g-card-flat g-col" style={{ gap: 4 }}>
                  <div className="g-row g-between"><b className="g-small">{s.label}</b><Badge tone={s.stage === "hidden" ? undefined : "red"}>{s.stage}</Badge></div>
                  <div className="g-tiny g-muted">{s.category === "criminal" ? "Criminal corruption" : s.category === "campaign_finance" ? "Campaign-finance violation" : "Conflict of interest"} · evidence {Math.round(s.evidence)}/100 · {s.witnesses} witnesses</div>
                  {s.category === "criminal" && state.player.finances.illicit > 0 && <div><Button size="sm" onClick={() => setSettle(s.id)}>Return the proceeds</Button></div>}
                </div>
              ))}
              {ig.cases.filter((c) => !c.outcome).map((c) => <div key={c.id} className="g-card-flat"><b className="g-small">{c.title}</b><div className="g-tiny g-muted">Stage: {c.stage} · next step {formatMonthShort(state, c.nextStepMonth)}</div></div>)}
              {ig.cases.some((c) => !c.outcome) && <div className="g-row"><Button size="sm" variant="primary" onClick={() => dispatch({ t: "hireLawyers" })}>Retain defence counsel</Button><span className="g-tiny g-muted">Defence strength {Number(state.player.flags["defence_strength"] ?? 0)}/40</span></div>}
            </div>
          )}
        </Card>
      </div>
      {(ig.convictions.length > 0 || ig.violations.length > 0) && <Card title="On the record">{[...ig.convictions.map((c) => ({ m: c.m, t: `Convicted: ${c.text}` })), ...ig.violations.map((v) => ({ m: v.m, t: `Violation: ${v.text}` }))].sort((a, b) => b.m - a.m).map((x, i) => <div key={i} className="g-list-row g-small"><Badge>{formatMonthShort(state, x.m)}</Badge>{x.t}</div>)}</Card>}
      {settle && <ConfirmDialog title="Return the proceeds?" confirmLabel="Return funds" onCancel={() => setSettle(null)} onConfirm={() => { const id = settle; setSettle(null); dispatch({ t: "settle", schemeId: id }); }} body="Handing back the money weakens the case and restores some integrity, but it is a public admission and trust will dip." />}
    </div>
  );
}
void Users;
