"use client";
import { useState } from "react";
import { PC_COST } from "../engine/meta";
import { whipCount, winOver } from "../engine/politics";
import { Gavel, Landmark, Megaphone, Users2, Wallet } from "lucide-react";
import { useFix, useS } from "./store";
import { Badge, Bar, Button, Callout, Card, Modal } from "../../game/ui/kit";
import { GROUPS, TRAITS, dominantTrait } from "../engine/society";
import { BUDGET_HEADS, LEVEL_LABEL, LOBBY, SPEECH_TONES, billChance, billLabel, budgetDue, budgetEffects, callVote, giveSpeech, lobby, passBudget, pendingBudget, setPendingBudget, speechReady, type LobbyKind, type Tone } from "../engine/politics";
import type { BudgetHead, FixState } from "../engine/types";
import type { Result } from "../engine/actions";
import { ZONE_NAME } from "../engine/rival";
import { calYear, monthLabel, nb } from "../engine/util";
import { chips } from "../engine/forecast";
import { Chips } from "./parts";

export function GroupsCard() {
  const s = useS();
  const face = (v: number) => (v >= 65 ? "😀" : v >= 50 ? "🙂" : v >= 35 ? "😐" : v >= 22 ? "😟" : "😠");
  return (
    <Card title="How groups feel about you" icon={<Users2 size={16} />}>
      <div className="g-grid g-grid-2 g-grid-keep2" style={{ gap: 8 }}>
        {GROUPS.map((g) => {
          const v = s.groups[g.id];
          return (
            <div key={g.id} className="g-row" style={{ gap: 8 }} title={`Cares about: ${g.cares}`}>
              <span style={{ fontSize: 22 }} aria-hidden>{face(v)}</span>
              <div className="g-grow"><div className="g-row g-between g-tiny"><b style={{ color: "#0f172a" }}>{g.icon} {g.label}</b><b className="g-num">{v}</b></div><Bar value={v / 100} tone={v < 35 ? "red" : v < 50 ? "amber" : undefined} label={`${g.label} ${v} out of 100`} /></div>
            </div>
          );
        })}
      </div>
      <div className="g-tiny g-muted" style={{ marginTop: 8 }}>Every decision pleases some groups and angers others. Very angry groups cause trouble: protests, strikes, lost investment, even unrest in the barracks.</div>
    </Card>
  );
}

export function GovernorsCard() {
  const s = useS();
  return (
    <Card title="Zone governors" icon={<Landmark size={16} />}>
      <div className="g-col" style={{ gap: 6 }}>
        {s.governors.map((g) => (
          <div key={g.zone} className="g-row" style={{ gap: 8 }}>
            <div className="g-grow"><div className="g-row g-wrap" style={{ gap: 6 }}><b className="g-small">{g.name}</b><Badge tone={g.party === "NPP" ? "green" : "red"}>{g.party}</Badge><span className="g-tiny g-muted">{ZONE_NAME[g.zone]}</span></div><Bar value={g.relation / 100} tone={g.relation < 30 ? "red" : g.relation < 50 ? "amber" : undefined} label={`Relationship with ${g.name}: ${Math.round(g.relation)}`} /></div>
            <span className="g-tiny" style={{ width: 70, textAlign: "right" }}>{g.relation >= 65 ? "Ally" : g.relation >= 45 ? "Neutral" : g.relation >= 25 ? "Cool" : "Hostile"}</span>
          </div>
        ))}
      </div>
      <div className="g-tiny g-muted" style={{ marginTop: 8 }}>Friendly governors speed up projects in their zone, deliver votes and lawmakers. Neglected zones turn hostile; an angry governor may defect to the opposition.</div>
    </Card>
  );
}

export function StandingChips() {
  const s = useS();
  const t = dominantTrait(s);
  return (
    <div className="g-row g-wrap" style={{ gap: 6, marginTop: 6 }}>
      <span className="g-badge" style={{ background: "rgba(255,255,255,.12)", color: "#fff" }} title="Share of lawmakers who back you">🏛️ Assembly support {Math.round(s.assembly.support)}%</span>
      {t ? <span className="g-badge" style={{ background: "rgba(0,200,117,.2)", color: "#d1fae5" }} title={TRAITS[t].effect}>Known as: {TRAITS[t].title}</span> : <span className="g-badge" style={{ background: "rgba(255,255,255,.12)", color: "#cbd5e1" }}>No reputation yet</span>}
    </div>
  );
}

// ---------------------------------------------------------------- votes
export function VoteModal({ bill, exec, onClose }: { bill: string; exec: (s: FixState) => Result; onClose: () => void }) {
  const s = useS();
  const { act } = useFix();
  const [done, setDone] = useState<string | null>(null);
  const p = billChance(s, bill);
  const name = billLabel(bill, calYear(s.month));
  return (
    <Modal title={<><Gavel size={18} style={{ verticalAlign: "-3px" }} /> {name} goes to the National Assembly</>} onClose={onClose} footer={done ? <Button variant="primary" onClick={onClose}>Close</Button> : <><Button onClick={onClose}>Not now</Button><Button variant="primary" onClick={() => { const r = act((x) => callVote(x, bill, () => exec(x))); setDone(r.message); }}>Call the vote</Button></>}>
      {done ? <Callout tone={done.startsWith("Passed") ? "good" : "bad"}>{done}</Callout> : (
        <div className="g-col">
          <div className="g-small">This change needs lawmakers&apos; approval. Your support in the Assembly is <b>{Math.round(s.assembly.support)}%</b>.</div>
          <div><div className="g-row g-between g-small"><span>Chance it passes</span><b>{Math.round(p * 100)}%</b></div><Bar value={p} tone={p < 0.4 ? "red" : p < 0.6 ? "amber" : undefined} label="Chance of passing" /></div>
          <WhipCount bill={bill} />
          <div className="g-section-title">Before the vote, you can lobby</div>
          {(Object.keys(LOBBY) as LobbyKind[]).map((k) => (
            <div key={k} className="g-list-row"><div className="g-grow"><b className="g-small">{LOBBY[k].label}</b><div className="g-tiny g-muted">{LOBBY[k].explain}{k === "projects" ? ` (about ${nb(40 * (0.6 + 0.4 * s.eco.priceLevel / 100))})` : ""}</div></div><Button size="sm" disabled={!!s.flags[`lobby:${bill}:${k}:${s.month}`]} onClick={() => act((x) => lobby(x, bill, k))}>{s.flags[`lobby:${bill}:${k}:${s.month}`] ? "Done" : `Try ⚡${PC_COST.lobby}`}</Button></div>
          ))}
          <div className="g-tiny g-muted">If it fails, nothing changes except a small loss of trust. Loyalist ministers, friendly governors and popularity all raise your support.</div>
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------- budget
export function BudgetCard() {
  const s = useS();
  const [open, setOpen] = useState(false);
  const due = budgetDue(s);
  const { monthly } = budgetEffects(s.budget.levels);
  return (
    <Card title={`Annual budget${s.budget.passedYear ? ` ${s.budget.passedYear}` : ""}`} icon={<Wallet size={16} />} action={<Button size="sm" variant={due ? "primary" : "default"} onClick={() => setOpen(true)}>{due ? `Set the ${calYear(s.month)} budget` : "Revise budget"}</Button>}>
      {due && <div className="g-small" style={{ color: "#92400e", marginBottom: 6 }}><b>The {calYear(s.month)} budget is due.</b> Until a new one passes, the old spending levels continue.</div>}
      <div className="g-col" style={{ gap: 4 }}>
        {BUDGET_HEADS.map((h) => <div key={h.id} className="g-row g-between g-small"><span>{h.label}</span><b>{LEVEL_LABEL[s.budget.levels[h.id] ?? 0]}</b></div>)}
      </div>
      <div className="g-tiny g-muted" style={{ marginTop: 6 }}>{monthly === 0 ? "Spending at baseline levels." : monthly > 0 ? `About ${nb(monthly)} a month above baseline.` : `Saving about ${nb(-monthly)} a month.`} Budgets must pass the Assembly.</div>
      {open && <BudgetModal onClose={() => setOpen(false)} />}
    </Card>
  );
}
function BudgetModal({ onClose }: { onClose: () => void }) {
  const s = useS();
  const [lv, setLv] = useState<Record<BudgetHead, number>>({ ...(pendingBudget(s) ?? s.budget.levels) });
  const [vote, setVote] = useState(false);
  const { effects, monthly } = budgetEffects(lv);
  if (vote) return <VoteModal bill="budget" exec={(x) => passBudget(x, lv)} onClose={onClose} />;
  return (
    <Modal title={`Budget ${calYear(s.month)}`} wide onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => { setPendingBudget(s, lv); setVote(true); }}>Send to the Assembly</Button></>}>
      <div className="g-col" style={{ gap: 12 }}>
        {BUDGET_HEADS.map((h) => (
          <div key={h.id}>
            <div className="g-row g-between g-small"><b>{h.label}</b><span className="g-badge">{LEVEL_LABEL[lv[h.id]]}{lv[h.id] ? ` · ${lv[h.id] > 0 ? "+" : "−"}${nb(Math.abs(lv[h.id] * h.cost))}/month` : ""}</span></div>
            <input type="range" min={-2} max={2} step={1} value={lv[h.id]} onChange={(e) => setLv({ ...lv, [h.id]: Number(e.target.value) })} aria-label={`${h.label} budget level`} />
            <div className="g-tiny g-muted">{h.blurb}</div>
          </div>
        ))}
        <Chips chips={chips(effects, 6)} label="Effect" />
        <Callout tone={monthly > 0 ? "warn" : "info"}>{monthly >= 0 ? `This budget spends about ${nb(monthly)} a month more than baseline.` : `This budget saves about ${nb(-monthly)} a month.`} Cuts are harder to pass and anger the groups affected; cuts to schools and clinics do lasting damage.</Callout>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- speeches
export function SpeechButton() {
  const s = useS();
  const { act } = useFix();
  const [open, setOpen] = useState(false);
  const ready = speechReady(s);
  return (
    <>
      <Button size="sm" variant={s.speech.moment && ready ? "primary" : "light"} disabled={!ready} onClick={() => setOpen(true)} title={ready ? "Speak to the nation" : `Next address possible in ${monthLabel(s.speech.last + 3)}`}><Megaphone size={15} /> {ready ? (s.speech.moment ? "Address the nation now" : "Address the nation") : `Next speech ${monthLabel(s.speech.last + 3)}`}</Button>
      {open && (
        <Modal title="Address the nation" onClose={() => setOpen(false)}>
          <div className="g-col">
            {s.speech.moment && <Callout tone="info">The country is waiting to hear from you about the {s.speech.moment === "fuel" ? "fuel price changes" : s.speech.moment === "security" ? "security situation" : "national crisis"}.</Callout>}
            <div className="g-small g-muted">Choose your tone. The same words land differently depending on the moment.</div>
            {SPEECH_TONES.map((t) => <button key={t.id} className="g-card-flat" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => { act((x) => giveSpeech(x, t.id as Tone)); setOpen(false); }}><b>{t.label} ⚡{PC_COST.speech}</b><div className="g-tiny g-muted">{t.blurb}</div></button>)}
          </div>
        </Modal>
      )}
    </>
  );
}

function WhipCount({ bill }: { bill: string }) {
  const s = useS();
  const { act } = useFix();
  const w = whipCount(s, bill);
  return (
    <div className="fx-whip">
      <div className="g-section-title">Whip count</div>
      <div className="fx-whipbar" role="img" aria-label={`${w.seats.yes} yes, ${w.seats.maybe} undecided, ${w.seats.no} no`}>
        <span style={{ flex: w.seats.yes, background: "#00c875" }}>{w.seats.yes}</span><span style={{ flex: w.seats.maybe, background: "#f59e0b" }}>{w.seats.maybe}</span><span style={{ flex: w.seats.no, background: "#e11d48" }}>{w.seats.no}</span>
      </div>
      <div className="g-tiny g-muted">Yes · Undecided · No. You need {w.need} seats. The undecided want something.</div>
      {w.maybe.slice(0, 4).map((l) => <div key={l.id} className="g-row g-between g-small" style={{ gap: 6 }}><span><b>{l.name}</b> <span className="g-tiny g-muted">wants a project in {l.stateId.replace("NG-", "")}</span></span><Button size="sm" onClick={() => act((x) => winOver(x, bill, l.id))}>Win over ⚡2</Button></div>)}
    </div>
  );
}
