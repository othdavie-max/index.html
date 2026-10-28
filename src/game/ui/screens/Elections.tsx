"use client";
import { useEffect, useMemo, useState } from "react";
import { Vote, Trophy, Wallet, BarChart3, Megaphone, AlertTriangle } from "lucide-react";
import { useGame, useS } from "../store";
import { Badge, Bar, Button, Callout, Card, ConfirmDialog, EmptyState, Field, Meter, ResultsBar, Tabs, naira, Modal } from "../kit";
import { ACTIVITIES, activeCandidacy, availableRaces, localFame, playerPrimaryBreakdown, runningMateOptions, type RaceInfo } from "../../engine/campaign";
import { pollContest } from "../../engine/elections";
import { nationalPoll } from "../../engine/insights";
import { TERMS, TERM_LABEL } from "../../engine/electionModel";
import { ruleOf } from "../../engine/world";
import { formatMonth, formatMonthShort } from "../../engine/calendar";
import { partyAbbr, partyColor, partyDefOf, holderOf, priceLevel } from "../../engine/queries";
import { ISSUE_LABEL, ISSUES } from "../../data/parties";
import { LGA_BY_ID, stateName } from "../../engine/admin";
import { STATES } from "../../data/states";
import type { Contest, GameState } from "../../engine/types";

type Sub = "races" | "campaign" | "funding" | "constituency" | "results" | "polls";

export function ElectionsScreen() {
  const state = useS();
  const { subTab } = useGame();
  const [tab, setTab] = useState<Sub>("races");
  useEffect(() => { if (subTab) { const t = subTab === "primary" ? "campaign" : subTab; if (["races", "campaign", "funding", "constituency", "results", "polls"].includes(t)) setTab(t as Sub); } }, [subTab]);
  const cand = activeCandidacy(state);
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <div className="g-row g-between g-wrap"><div className="g-page-title">Elections</div>{cand && <Badge tone="green"><Vote size={12} /> {cand.stage === "nominee" ? "Candidate" : "Aspirant"}: {state.seats[cand.seatId].label}</Badge>}</div>
      <Tabs<Sub> value={tab} onChange={setTab} tabs={[{ id: "races", label: "Races" }, { id: "campaign", label: cand?.stage === "aspirant" ? "Primary" : "My campaign" }, { id: "funding", label: "Funding" }, { id: "constituency", label: "Constituency" }, { id: "results", label: "Results" }, { id: "polls", label: "Polls" }]} />
      {tab === "races" && <Races />}
      {tab === "campaign" && <CampaignTab />}
      {tab === "funding" && <Funding />}
      {tab === "constituency" && <Constituency />}
      {tab === "results" && <Results />}
      {tab === "polls" && <Polls />}
    </div>
  );
}

function raceHolder(state: GameState, r: RaceInfo) {
  if (r.seat.holderId === "player") return "You";
  const h = holderOf(state, r.seat.id);
  return h ? `${h.name} (${partyAbbr(state, r.seat.partyId)})` : "vacant";
}

function Races() {
  const state = useS();
  const { dispatch, go } = useGame();
  const rule = ruleOf(state);
  const p = state.player;
  const [other, setOther] = useState("");
  const [confirm, setConfirm] = useState<RaceInfo | null>(null);
  const races = availableRaces(state, other ? { stateId: other } : {});
  const cand = activeCandidacy(state);
  return (
    <div className="g-col">
      {!p.politics.membership && <Callout tone="warn">Candidates must be sponsored by a political party. <Button size="sm" onClick={() => go("politics", "parties")}>Join a party</Button></Callout>}
      {p.politics.appointment && <Callout tone="warn">You hold an appointment ({p.politics.appointment.label}). You must resign before contesting. <Button size="sm" onClick={() => dispatch({ t: "resignAppointment" })}>Resign appointment</Button></Callout>}
      <div className="g-row g-wrap"><Field label="Browse races in another state">{(id) => <select id={id} className="g-select" style={{ maxWidth: 260 }} value={other} onChange={(e) => setOther(e.target.value)}><option value="">My home area and national</option>{STATES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}</Field></div>
      <div className="g-grid g-grid-2">
        {races.map((r) => {
          const bad = r.eligibility.checks.filter((c) => !c.ok);
          const mine = cand?.seatId === r.seat.id;
          return (
            <Card key={r.seat.id} title={r.seat.label} icon={<Vote size={16} />} action={<Badge tone={r.open ? "green" : undefined}>{r.open ? "Window open" : r.windowOpensIn > 0 ? `Opens in ${r.windowOpensIn} mo` : "In progress"}</Badge>}>
              <div className="g-small g-col" style={{ gap: 4 }}>
                <div><b>Election:</b> {formatMonth(state, r.electionMonth)} · <b>Holder:</b> {raceHolder(state, r)}</div>
                <div><b>Nomination form:</b> {naira(r.fee)} · <b>Lawful spending limit:</b> {naira(r.limit, true)}</div>
                <div className="g-section-title" style={{ marginTop: 6 }}>Eligibility</div>
                {r.eligibility.checks.filter((c) => !["single", "custody"].includes(c.id) || !c.ok).map((c) => <div key={c.id} className="g-tiny" style={{ color: c.ok ? "#047857" : "#be123c" }}>{c.ok ? "✓" : "✗"} {c.text}</div>)}
              </div>
              <div className="g-row g-wrap" style={{ marginTop: 10 }}>
                {mine ? <Badge tone="green">You are running</Badge> : <Button size="sm" variant="primary" disabled={!r.open || bad.length > 0} onClick={() => setConfirm(r)}>Declare candidacy</Button>}
                {!r.open && r.windowOpensIn > 0 && <span className="g-tiny g-muted">Aspirants' window opens {formatMonthShort(state, r.seat.nextElection - rule.timeline.aspirantWindowOpens)}</span>}
              </div>
            </Card>
          );
        })}
      </div>
      {races.length === 0 && <EmptyState title="No races to show" />}
      <p className="g-help">Ward councillor contests are not simulated yet; the LGA chairmanship is the grassroots elected office. Constituency boundaries are a simulated delimitation.</p>
      {confirm && (
        <ConfirmDialog title={`Declare for ${confirm.seat.label}?`} confirmLabel={`Pay ${naira(confirm.fee, true)} and declare`} onCancel={() => setConfirm(null)} onConfirm={() => { const s = confirm.seat.id; setConfirm(null); dispatch({ t: "declare", seatId: s }); }}
          body={<div className="g-col"><div>The nomination form costs <b>{naira(confirm.fee)}</b> and is not refunded.</div><div>You will have to <b>win your party's primary</b> in about {Math.max(0, confirm.electionMonth - rule.timeline.primaryMonth - state.clock.monthIndex)} months against aspirants who may be better known and better funded. Winning the primary is not winning the election.</div><div>The general election is uncertain: money helps with diminishing returns, but recognition, organisation, party strength, local conditions and opponents all matter.</div></div>} />
      )}
    </div>
  );
}

function CampaignTab() {
  const state = useS();
  const { dispatch, go } = useGame();
  const cand = activeCandidacy(state);
  const [amt, setAmt] = useState("200000");
  const [risky, setRisky] = useState<null | "delegates">(null);
  if (!cand) return <EmptyState icon={<Megaphone size={30} />} title="You are not running" body="Declare candidacy for a race when its aspirants' window opens." action={<Button onClick={() => go("elections", "races")}>See races</Button>} />;
  const c = state.contests[cand.contestId];
  if (!c) return <EmptyState title="That race is over." />;
  const seat = state.seats[c.seatId];
  const rule = ruleOf(state);
  const limit = rule.offices[cand.office].campaignLimit;
  const camp = cand.campaign;
  const bd = playerPrimaryBreakdown(state, c);
  const polls = pollContest(state, c);
  const monthsTo = c.electionMonth - state.clock.monthIndex;
  const mateOpts = cand.office === "president" || cand.office === "governor" ? runningMateOptions(state) : [];
  const monthly = Object.values(camp.activities).reduce((a, b) => a + b, 0);
  return (
    <div className="g-col">
      <Card title={c.label}>
        <div className="g-row g-wrap" style={{ gap: 8 }}>
          <Badge tone="green">{cand.stage === "aspirant" ? "Seeking the party ticket" : "Party nominee"}</Badge>
          <Badge>Phase: {c.phase}</Badge>
          <Badge tone="blue">Election {formatMonth(state, c.electionMonth)} ({monthsTo <= 0 ? "this month" : `${monthsTo} mo`})</Badge>
          <Badge>Local recognition {Math.round(localFame(state, cand.office, seat))}</Badge>
        </div>
      </Card>
      {cand.stage === "aspirant" && (
        <div className="g-grid g-split-eq g-grid-2">
          <Card title="Your primary strength" icon={<BarChart3 size={16} />}>
            <p className="g-small g-muted" style={{ marginBottom: 6 }}>Party delegates weigh recognition, standing, relationships, money and organisation. A random element remains — rivals can win.</p>
            <table className="g-table"><tbody>{bd.items.map((i) => <tr key={i.label}><td>{i.label}</td><td className="g-num" style={{ textAlign: "right" }}>+{i.value.toFixed(1)}</td></tr>)}<tr><td><b>Total</b></td><td className="g-num" style={{ textAlign: "right" }}><b>{bd.total.toFixed(1)}</b></td></tr></tbody></table>
            <div className="g-tiny g-muted" style={{ marginTop: 6 }}>Aspirants this race for {partyAbbr(state, state.player.politics.membership?.partyId ?? null)}: {(c.aspirants[state.player.politics.membership?.partyId ?? ""] ?? []).length}</div>
          </Card>
          <Card title="Win over delegates" icon={<Megaphone size={16} />}>
            <p className="g-small g-muted" style={{ marginBottom: 8 }}>Lawful mobilisation: transport, welfare and meetings for delegates and supporters.</p>
            <Field label="Amount (₦)">{(id) => <input id={id} className="g-input" inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9]/g, ""))} />}</Field>
            <div className="g-row" style={{ marginTop: 8 }}><Button size="sm" variant="primary" onClick={() => dispatch({ t: "primarySpend", amount: Number(amt) })}>Mobilise delegates</Button><span className="g-tiny g-muted">Spent so far {naira(cand.primarySpend)}</span></div>
            <details style={{ marginTop: 12 }}>
              <summary className="g-small" style={{ cursor: "pointer", color: "#9f1239" }}><AlertTriangle size={13} style={{ verticalAlign: -2 }} /> Questionable options</summary>
              <div className="g-col" style={{ marginTop: 8 }}>
                <Callout tone="bad">Paying delegates directly is an electoral offence. It would raise your score — and create a traceable campaign-finance scheme that audits or journalists could uncover.</Callout>
                <div><Button size="sm" variant="danger" onClick={() => setRisky("delegates")}>Pay delegates ₦{Number(amt).toLocaleString()}</Button></div>
              </div>
            </details>
          </Card>
        </div>
      )}
      {cand.stage === "nominee" && (
        <>
          <div className="g-grid g-split-eq g-grid-2">
            <Card title="Campaign plan" icon={<Megaphone size={16} />}>
              <p className="g-small g-muted" style={{ marginBottom: 8 }}>Monthly budgets, paid from your campaign fund during the campaign period ({rule.timeline.campaignStarts} months before election day). Returns diminish as total spending approaches the limit.</p>
              <div className="g-col">
                {ACTIVITIES.map((a) => (
                  <div key={a.id}>
                    <div className="g-row g-between"><b className="g-small">{a.label}</b><span className="g-num g-small">{naira(camp.activities[a.id], true)}/mo</span></div>
                    <div className="g-tiny g-muted">{a.blurb}</div>
                    <input type="range" min={0} max={Math.round(limit / 4)} step={Math.max(1000, Math.round(limit / 400))} value={camp.activities[a.id]} aria-label={`${a.label} monthly budget`} onChange={(e) => dispatch({ t: "campaignBudget", activity: a.id, amount: Number(e.target.value) }, { silent: true })} />
                  </div>
                ))}
              </div>
              <div className="g-row g-between g-small" style={{ marginTop: 10 }}><span>Total per month: <b>{naira(monthly)}</b></span><span>Fund: <b style={{ color: state.player.finances.campaignFund < monthly ? "#be123c" : undefined }}>{naira(state.player.finances.campaignFund)}</b></span></div>
              {state.player.finances.campaignFund < monthly && <Callout tone="warn">Your fund can't cover this budget — spending will be scaled down. Raise money on the Funding tab.</Callout>}
            </Card>
            <Card title="Where you stand" icon={<BarChart3 size={16} />}>
              <div className="g-col">
                <Meter label="Organisation (volunteers & agents)" value={camp.organisation} tone="blue" />
                <Meter label="Momentum" value={(camp.momentum + 1) * 50} tone="auto" />
                <Meter label="Lawful spending used" value={Math.min(100, (camp.spentTotal / limit) * 100)} tone={camp.spentTotal > limit ? "red" : "amber"} suffix="%" />
                {camp.debatePerformance !== null && <div className="g-small">Debate performance: <b>{Math.round(camp.debatePerformance * 100)}/100</b></div>}
              </div>
              <div className="g-section-title" style={{ margin: "12px 0 6px" }}>Internal poll (simulated)</div>
              {polls.length ? (
                <>
                  <ResultsBar items={polls.map((x) => ({ label: x.name, value: x.share, color: partyColor(state, x.partyId) }))} />
                  {polls.map((x) => <div key={x.key} className="g-list-row g-small"><span style={{ width: 10, height: 10, borderRadius: 3, background: partyColor(state, x.partyId) }} /><span className="g-grow">{x.isPlayer ? <b>You</b> : x.name} <span className="g-muted">({partyAbbr(state, x.partyId)})</span></span><b className="g-num">{(x.share * 100).toFixed(1)}%</b></div>)}
                  <div className="g-tiny g-muted">Polls are estimates from the same model that decides the election, with different random noise. Real results can differ.</div>
                </>
              ) : <div className="g-small g-muted">No poll yet.</div>}
              <div className="g-row g-wrap" style={{ marginTop: 10 }}>
                <Button size="sm" onClick={() => dispatch({ t: "prepareDebate" })} disabled={cand.debatePrepared}>{cand.debatePrepared ? "Debate prepared ✓" : "Prepare for the debate"}</Button>
                <Button size="sm" onClick={() => dispatch({ t: "fundraise" })}>Hold a fundraiser</Button>
              </div>
            </Card>
          </div>
          {(cand.office === "president" || cand.office === "governor") && (
            <Card title="Running mate">
              <div className="g-small g-muted" style={{ marginBottom: 6 }}>{cand.office === "president" ? "A running mate from another state broadens your appeal there and in neighbouring states." : "Your deputy governor candidate."}</div>
              <div className="g-row g-wrap">{cand.runningMateId ? <Badge tone="green">{state.chars[cand.runningMateId]?.name} ({stateName(state.chars[cand.runningMateId]?.stateId)})</Badge> : <Badge tone="amber">None chosen</Badge>}
                <select className="g-select" style={{ maxWidth: 320 }} aria-label="Choose running mate" value={cand.runningMateId ?? ""} onChange={(e) => e.target.value && dispatch({ t: "runningMate", charId: e.target.value })}><option value="">Choose…</option>{mateOpts.map((o) => <option key={o.id} value={o.id}>{o.name} — {o.state}</option>)}</select></div>
            </Card>
          )}
        </>
      )}
      <Card title="The field">
        <div className="g-col">
          {[...Object.entries(c.nominees)].map(([pid, n]) => <div key={pid} className="g-list-row"><span style={{ width: 10, height: 10, borderRadius: 3, background: partyColor(state, pid) }} /><div className="g-grow g-small"><b>{n.isPlayer ? "You" : n.name}</b> <span className="g-muted">({partyAbbr(state, pid)}){n.incumbent ? " · incumbent" : ""}</span></div>{c.primaryNotes[pid] && <span className="g-tiny g-muted" style={{ maxWidth: 240 }}>{c.primaryNotes[pid]}</span>}</div>)}
          {Object.keys(c.nominees).length === 0 && <div className="g-small g-muted">Nominees are chosen at the primaries.</div>}
        </div>
      </Card>
      {cand.primaryResult && <Callout tone={cand.primaryResult.won ? "good" : "bad"}>{cand.primaryResult.text}</Callout>}
      <div><Button variant="ghost" size="sm" onClick={() => dispatch({ t: "withdrawCandidacy" })}>Withdraw from the race</Button></div>
      {risky === "delegates" && <ConfirmDialog title="Pay delegates?" tone="danger" confirmLabel="Pay anyway" onCancel={() => setRisky(null)} onConfirm={() => { setRisky(null); dispatch({ t: "buyDelegates", amount: Number(amt) }); }} body="This is unlawful. It boosts your primary score but opens a campaign-finance scheme with witnesses. If it surfaces you face fines and possible disqualification, and your public trust will suffer." />}
    </div>
  );
}

function Funding() {
  const state = useS();
  const { dispatch } = useGame();
  const cand = activeCandidacy(state);
  const f = state.player.finances;
  const rule = ruleOf(state);
  const [amt, setAmt] = useState("500000");
  const [big, setBig] = useState("60000000");
  const [warn, setWarn] = useState(false);
  const entries = f.ledger.filter((l) => l.account === "campaign").slice(-14).reverse();
  const limit = cand ? rule.offices[cand.office].campaignLimit : 0;
  return (
    <div className="g-col">
      <div className="g-grid g-grid-3">
        <Card><div className="g-tiny g-muted">Campaign fund</div><div className="g-num" style={{ fontSize: 22, fontWeight: 800 }}>{naira(f.campaignFund)}</div><div className="g-tiny g-muted">Separate from personal money</div></Card>
        <Card><div className="g-tiny g-muted">Personal funds</div><div className="g-num" style={{ fontSize: 22, fontWeight: 800 }}>{naira(f.cash + f.savings)}</div></Card>
        <Card><div className="g-tiny g-muted">Lawful donation limit (each donor)</div><div className="g-num" style={{ fontSize: 22, fontWeight: 800 }}>{naira(rule.finance.individualDonationLimit, true)}</div><div className="g-tiny g-muted">Simulated ruleset value</div></Card>
      </div>
      {cand && (
        <Card title="Lawful spending limit">
          <Meter label={`Spent ${naira(cand.campaign.spentTotal, true)} of ${naira(limit, true)}`} value={Math.min(100, (cand.campaign.spentTotal / limit) * 100)} tone={cand.campaign.spentTotal > limit ? "red" : "amber"} suffix="%" />
          <div className="g-tiny g-muted">Going over the limit is a campaign-finance violation with fines and possible disqualification.</div>
        </Card>
      )}
      <div className="g-grid g-split-eq g-grid-2">
        <Card title="Put money in" icon={<Wallet size={16} />}>
          <Field label="Transfer from personal funds (₦)">{(id) => <input id={id} className="g-input" inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9]/g, ""))} />}</Field>
          <div className="g-row g-wrap" style={{ marginTop: 8 }}><Button size="sm" variant="primary" onClick={() => dispatch({ t: "fundCampaign", amount: Number(amt) })}>Transfer</Button><Button size="sm" disabled={!cand} onClick={() => dispatch({ t: "fundraise" })}>Hold a fundraiser</Button></div>
          <p className="g-help" style={{ marginTop: 8 }}>Fundraisers produce lawful donations within the per-donor limit; results depend on your network, recognition, party standing and the economy. Unspent funds are only half-returned if you lose.</p>
        </Card>
        <Card title="Campaign account activity">
          {entries.length === 0 ? <div className="g-small g-muted">No campaign transactions yet.</div> : entries.map((e, i) => <div key={i} className="g-list-row g-small"><span className="g-muted" style={{ width: 70 }}>{formatMonthShort(state, e.m)}</span><span className="g-grow">{e.label}</span><b className="g-num" style={{ color: e.amount >= 0 ? "#047857" : "#be123c" }}>{e.amount >= 0 ? "+" : "−"}{naira(Math.abs(e.amount), true)}</b></div>)}
        </Card>
      </div>
      <details>
        <summary className="g-small" style={{ cursor: "pointer", color: "#9f1239" }}><AlertTriangle size={13} style={{ verticalAlign: -2 }} /> Questionable funding</summary>
        <Card className="g-col">
          <Callout tone="bad">A wealthy donor offers a very large sum above the lawful limit and asks that it not be declared. Accepting is a campaign-finance violation. Evidence of who gave what exists whether or not you declare it.</Callout>
          <Field label="Undeclared donation (₦)">{(id) => <input id={id} className="g-input" inputMode="numeric" value={big} onChange={(e) => setBig(e.target.value.replace(/[^0-9]/g, ""))} />}</Field>
          <div><Button variant="danger" size="sm" disabled={!cand} onClick={() => setWarn(true)}>Accept the donation</Button></div>
        </Card>
      </details>
      {warn && <ConfirmDialog title="Accept an undeclared donation?" tone="danger" confirmLabel="Accept" onCancel={() => setWarn(false)} onConfirm={() => { setWarn(false); dispatch({ t: "unreportedDonation", amount: Number(big) }); }} body="You gain campaign money now, and open a traceable scheme. If detected: electoral-commission penalties, a possible disqualification, public-trust losses and damage to your campaign." />}
    </div>
  );
}

function Constituency() {
  const state = useS();
  const p = state.player;
  const cand = activeCandidacy(state);
  const seat = cand ? state.seats[cand.seatId] : p.politics.seatId ? state.seats[p.politics.seatId] : state.states[p.residenceStateId].repsSeatIds.map((s) => state.seats[s]).find((s) => s.lgaIds.includes(p.residenceLgaId)) ?? state.seats[`lgc:${p.residenceLgaId}`];
  const lgas = seat.office === "president" ? [] : seat.office === "governor" ? state.states[seat.stateId!].lgaIds : seat.lgaIds;
  const rows = lgas.map((id) => ({ id, l: state.lgas[id] })).slice(0, 60);
  const reg = rows.reduce((t, r) => t + r.l.registered, 0);
  const aff: Record<string, number> = {};
  for (const r of rows) for (const [k, v] of Object.entries(r.l.affinity)) aff[k] = (aff[k] ?? 0) + v * r.l.registered;
  const sal: Record<string, number> = {};
  for (const r of rows) for (const i of ISSUES) sal[i] = (sal[i] ?? 0) + r.l.salience[i] * r.l.registered;
  const fame = cand ? localFame(state, cand.office, seat) : p.fame.lgas[p.residenceLgaId] ?? 0;
  return (
    <div className="g-col">
      <Card title={seat.label}>
        <div className="g-small g-col" style={{ gap: 4 }}>
          <div>{seat.office === "president" ? "Whole country" : `${rows.length} LGA${rows.length === 1 ? "" : "s"}`} · registered voters ≈ {Math.round(reg / 1000).toLocaleString()}k (simulated)</div>
          <div className="g-tiny g-muted">This is a simulated delimitation: constituencies group real LGAs by location and population. Voter groups are aggregated LGA blocs, not individuals.</div>
          <Meter label="Your name recognition here" value={fame} tone="blue" />
        </div>
      </Card>
      <div className="g-grid g-split-eq g-grid-2">
        <Card title="Party lean (voter groups combined)">
          <ResultsBar items={Object.entries(aff).map(([k, v]) => ({ label: partyAbbr(state, k), value: v, color: partyColor(state, k) }))} />
          <div className="g-legend" style={{ marginTop: 8 }}>{Object.entries(aff).sort((a, b) => b[1] - a[1]).map(([k, v]) => <span key={k}><i style={{ background: partyColor(state, k) }} />{partyAbbr(state, k)} {((v / (reg || 1)) * 100).toFixed(0)}%</span>)}</div>
        </Card>
        <Card title="What voters care about most">
          {Object.entries(sal).sort((a, b) => b[1] - a[1]).map(([i, v]) => <Meter key={i} label={ISSUE_LABEL[i as keyof typeof ISSUE_LABEL]} value={(v / (reg || 1)) * 100} tone="blue" />)}
          <div className="g-tiny g-muted" style={{ marginTop: 6 }}>Higher means more unmet need locally. Parties whose priorities match these concerns do better.</div>
        </Card>
      </div>
      {rows.length > 0 && seat.office !== "governor" && (
        <Card title="Voter groups by LGA">
          <div className="g-scroll-x"><table className="g-table"><thead><tr><th>LGA</th><th>Setting</th><th>Registered</th><th>Usual turnout</th><th>Leans</th><th>Top concern</th><th>Your recognition</th></tr></thead><tbody>
            {rows.map(({ id, l }) => { const top = Object.entries(l.affinity).sort((a, b) => b[1] - a[1])[0]; const con = ISSUES.map((i) => [i, l.salience[i]] as const).sort((a, b) => b[1] - a[1])[0]; return (
              <tr key={id}><td>{LGA_BY_ID[id].name}</td><td>{l.urban > 0.6 ? "Urban" : l.urban > 0.3 ? "Mixed" : "Rural"}</td><td className="g-num">{Math.round(l.registered / 1000)}k</td><td className="g-num">{(l.turnoutBase * 100).toFixed(0)}%</td><td><Badge>{partyAbbr(state, top[0])} {(top[1] * 100).toFixed(0)}%</Badge></td><td>{ISSUE_LABEL[con[0]]}</td><td className="g-num">{Math.round(p.fame.lgas[id] ?? 0)}</td></tr>
            ); })}
          </tbody></table></div>
        </Card>
      )}
    </div>
  );
}

function ContestDetail({ c, onClose }: { c: Contest; onClose: () => void }) {
  const state = useS();
  const res = c.result!;
  const names = new Map<string, { name: string; partyId: string; isPlayer: boolean }>();
  for (const n of Object.values(c.nominees)) names.set(n.key, { name: n.isPlayer ? "You" : n.name, partyId: n.partyId, isPlayer: n.isPlayer });
  const ranked = Object.keys(res.votes).sort((a, b) => res.votes[b] - res.votes[a]);
  const winner = ranked[0];
  const me = ranked.includes("player") ? "player" : null;
  const compare = me && me !== winner ? me : ranked[1];
  return (
    <Modal title={c.label} wide onClose={onClose}>
      <div className="g-small g-muted">Round {res.round} · turnout {(res.turnout * 100).toFixed(1)}% of {Math.round(res.registered / 1000).toLocaleString()}k registered · {formatMonth(state, c.electionMonth)}</div>
      <ResultsBar items={ranked.map((k) => ({ label: names.get(k)?.name ?? k, value: res.votes[k], color: partyColor(state, names.get(k)?.partyId ?? null) }))} />
      <table className="g-table"><thead><tr><th>Candidate</th><th>Party</th><th style={{ textAlign: "right" }}>Votes</th><th style={{ textAlign: "right" }}>Share</th></tr></thead><tbody>
        {ranked.map((k) => <tr key={k}><td>{names.get(k)?.name ?? k}{k === winner ? " 🏆" : ""}</td><td>{partyAbbr(state, names.get(k)?.partyId ?? null)}</td><td className="g-num" style={{ textAlign: "right" }}>{res.votes[k].toLocaleString()}</td><td className="g-num" style={{ textAlign: "right" }}>{((res.shares[k] ?? 0) * 100).toFixed(1)}%</td></tr>)}
      </tbody></table>
      {res.spread && <Callout tone={res.spread.achieved ? "good" : "warn"}><b>Constitutional spread:</b> {res.spread.required}. {res.spread.unitsMet} of {res.spread.unitsNeeded} required. {res.spread.note}</Callout>}
      {c.firstRound && <div className="g-small g-muted">This was a runoff. In round one the leading candidate did not meet the spread requirement.</div>}
      {compare && (
        <>
          <div className="g-section-title">Why {names.get(winner)?.name === "You" ? "you won" : `${names.get(winner)?.name} won`} {me && me !== winner ? "and you lost" : ""}</div>
          <p className="g-small g-muted">Vote-weighted contribution of each factor to each candidate's appeal (higher is better for that candidate).</p>
          <table className="g-table"><thead><tr><th>Factor</th><th style={{ textAlign: "right" }}>{names.get(winner)?.name}</th><th style={{ textAlign: "right" }}>{names.get(compare)?.name}</th><th style={{ textAlign: "right" }}>Gap</th></tr></thead><tbody>
            {TERMS.map((t) => { const a = res.factors[winner]?.[t] ?? 0, b = res.factors[compare]?.[t] ?? 0; return <tr key={t}><td>{TERM_LABEL[t]}</td><td className="g-num" style={{ textAlign: "right" }}>{a.toFixed(2)}</td><td className="g-num" style={{ textAlign: "right" }}>{b.toFixed(2)}</td><td className="g-num" style={{ textAlign: "right", color: Math.abs(a - b) < 0.05 ? undefined : a > b ? "#be123c" : "#047857", fontWeight: 600 }}>{(a - b).toFixed(2)}</td></tr>; })}
          </tbody></table>
        </>
      )}
      <div className="g-small"><b>Top local issues:</b> {res.notes.map((i) => ISSUE_LABEL[i as keyof typeof ISSUE_LABEL]).join(", ")}</div>
      {res.electionDayEvents.length > 0 && <div className="g-small"><b>On election day:</b><ul style={{ margin: "4px 0 0 18px" }}>{res.electionDayEvents.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}</ul></div>}
      {res.byState && res.byState.length > 1 && (
        <div><div className="g-section-title">Strongest and weakest states for the winner</div>
          <div className="g-small g-muted">{[...res.byState].sort((a, b) => (b.votes[winner] / (Object.values(b.votes).reduce((x, y) => x + y, 0) || 1)) - (a.votes[winner] / (Object.values(a.votes).reduce((x, y) => x + y, 0) || 1))).slice(0, 3).map((s) => `${stateName(s.stateId)} ${((s.votes[winner] / (Object.values(s.votes).reduce((x, y) => x + y, 0) || 1)) * 100).toFixed(0)}%`).join(", ")}</div></div>
      )}
    </Modal>
  );
}

function Results() {
  const state = useS();
  const { go } = useGame();
  const p = state.player;
  const [open, setOpen] = useState<Contest | null>(null);
  const mine = [...p.politics.electionHistory].reverse();
  const recent = [...state.electionLog].filter((e) => e.office !== "lg_chair" && e.office !== "state_assembly" && (e.office === "president" || e.stateId === p.residenceStateId)).reverse().slice(0, 14);
  const nat = state.lastPresidential;
  return (
    <div className="g-col">
      <Card title="Your elections" icon={<Trophy size={16} />}>
        {mine.length === 0 ? <EmptyState title="You haven't contested an election yet" body="When you do, the full explanation of why you won or lost appears here." /> : mine.map((h, i) => {
          const c = state.contests[h.contestId];
          return (
            <div key={i} className="g-list-row">
              <Badge tone={h.won ? "green" : "red"}>{h.won ? "Won" : "Lost"}</Badge>
              <div className="g-grow g-small"><b>{h.label}</b><div className="g-tiny g-muted">{formatMonth(state, h.month)} · {(h.share * 100).toFixed(1)}% · finished {h.position} · turnout {(h.turnout * 100).toFixed(0)}%</div></div>
              <Button size="sm" disabled={!c?.result} onClick={() => c && setOpen(c)}>{c?.result ? "Why?" : "Archived"}</Button>
            </div>
          );
        })}
      </Card>
      <Card title={`Recent results: ${stateName(p.residenceStateId)} and national`}>
        {recent.length === 0 ? <div className="g-small g-muted">No results yet. The first elections will appear here.</div> : recent.map((e) => (
          <div key={e.contestId} className="g-list-row g-small">
            <Badge>{formatMonthShort(state, e.month)}</Badge>
            <div className="g-grow"><b>{e.label}</b><div className="g-tiny g-muted">{e.winnerName} ({partyAbbr(state, e.winnerPartyId)}) · turnout {(e.turnout * 100).toFixed(0)}% · margin {(e.margin * 100).toFixed(1)} pts</div></div>
            {state.contests[e.contestId]?.result && <Button size="sm" onClick={() => setOpen(state.contests[e.contestId])}>Details</Button>}
          </div>
        ))}
        {nat && <div style={{ marginTop: 10 }}><Button size="sm" onClick={() => go("map")}>See presidential result on the map</Button></div>}
      </Card>
      {open && open.result && <ContestDetail c={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Polls() {
  const state = useS();
  const poll = useMemo(() => nationalPoll(state), [state, state.clock.monthIndex]); // eslint-disable-line react-hooks/exhaustive-deps
  const pres = state.contests[`C:${state.seats.pres.nextElection}:pres`];
  const rows = pres ? pollContest(state, pres) : [];
  return (
    <div className="g-col">
      <Card title="Party support nationwide (simulated poll)">
        <ResultsBar items={poll.map((x) => ({ label: partyAbbr(state, x.partyId), value: x.share, color: partyColor(state, x.partyId) }))} />
        {poll.map((x) => <div key={x.partyId} className="g-list-row g-small"><span style={{ width: 10, height: 10, borderRadius: 3, background: partyColor(state, x.partyId) }} /><span className="g-grow">{partyDefOf(state, x.partyId)?.name}</span><b className="g-num">{(x.share * 100).toFixed(1)}%</b></div>)}
        <div className="g-tiny g-muted">Voter lean weighted by registered voters, adjusted by party momentum. Not a prediction of the election.</div>
      </Card>
      <Card title={`Next presidential election — ${formatMonth(state, state.seats.pres.nextElection)}`}>
        {rows.length === 0 ? <div className="g-small g-muted">Candidates are not yet chosen. Primaries are held about {ruleOf(state).timeline.primaryMonth} months before election day.</div> : (
          <>
            <ResultsBar items={rows.map((x) => ({ label: x.name, value: x.share, color: partyColor(state, x.partyId) }))} />
            {rows.map((x) => <div key={x.key} className="g-list-row g-small"><span style={{ width: 10, height: 10, borderRadius: 3, background: partyColor(state, x.partyId) }} /><span className="g-grow">{x.name} <span className="g-muted">({partyAbbr(state, x.partyId)})</span></span><b className="g-num">{(x.share * 100).toFixed(1)}%</b></div>)}
            <div className="g-tiny g-muted">Simulated trial run of the election model. A win also needs the constitutional spread across states.</div>
          </>
        )}
      </Card>
      <Card title="National mood (simulated)">
        <div className="g-grid g-grid-2" style={{ gap: "10px 22px" }}>
          <Meter label="Public satisfaction" value={state.economy.satisfaction} tone="auto" />
          <Meter label="Purchasing power index" value={state.economy.purchasingPower} max={150} tone="auto" />
          <Meter label="Inflation" value={state.economy.inflation} max={50} tone="inverse" suffix="%" />
          <Meter label="Unemployment" value={state.economy.unemployment} max={25} tone="inverse" suffix="%" />
        </div>
      </Card>
    </div>
  );
}
void priceLevel; void Bar;
