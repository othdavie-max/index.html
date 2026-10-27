"use client";
/** Day One: you have just been sworn in. Pick your Chief of Staff and your ministers, and see who is pleased and who is not. */
import { useState } from "react";
import { PC_COST } from "../engine/meta";
import { useFix, useS } from "./store";
import { Badge, Bar, Button, Callout, Portrait } from "../../game/ui/kit";
import { AIDE_KINDS, cosCandidates, finishDayOne, pickChiefOfStaff, pickVice, vpCandidates } from "../engine/dayone";
import { FACTION_LABEL, PORTFOLIOS, appoint } from "../engine/cabinet";
import { backerLabel, cosMood, hireMood } from "../engine/backers";
import { BACKER_GIFTS, giftBlock, giveGift } from "../engine/officials";
import { warnMinister } from "../engine/cabinet";
import type { Minister } from "../engine/types";
import { sfx } from "./sound";

const FACE = (v: number) => (v >= 75 ? "😍" : v >= 55 ? "🙂" : v >= 35 ? "😐" : v >= 20 ? "😠" : "🤬");

export function BackerRow({ gifts }: { gifts?: boolean }) {
  const s = useS();
  const { act } = useFix();
  return (
    <div className="g-col" style={{ gap: 8 }}>
      {s.backers.map((b) => (
        <div key={b.id} className="g-row" style={{ gap: 10 }}>
          <span style={{ fontSize: 26 }} aria-hidden>{FACE(b.mood)}</span>
          <div className="g-grow">
            <div className="g-row g-between g-small"><b>{b.name}</b><span className="g-muted">{b.title}</span></div>
            <Bar value={b.mood / 100} tone={b.mood < 30 ? "red" : b.mood < 50 ? "amber" : undefined} label={`${b.name}: ${backerLabel(b)}`} />
            <div className="g-tiny g-muted">{backerLabel(b)}{b.owed > 10 ? ` · spent about ₦${Math.round(b.owed)}bn on your campaign` : ""}</div>
            {gifts && <div className="g-row g-wrap" style={{ gap: 4, marginTop: 4 }}>{BACKER_GIFTS.map((g) => { const block = giftBlock(s, b, g.id); return <Button key={g.id} size="sm" disabled={!!block} title={block ?? g.explain} onClick={() => act((x) => giveGift(x, b.id, g.id))}>{g.label} ⚡{PC_COST.gift}</Button>; })}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Hint({ d }: { d: number }) {
  if (d >= 5) return <span className="g-tiny" style={{ color: "#047857" }}>🙂 Your backers will cheer</span>;
  if (d > 0) return <span className="g-tiny g-muted">Backers: pleased</span>;
  if (d <= -5) return <span className="g-tiny" style={{ color: "#b91c1c" }}>😠 Your backers will be furious</span>;
  if (d < 0) return <span className="g-tiny" style={{ color: "#92400e" }}>Backers: annoyed</span>;
  return <span className="g-tiny g-muted">Backers: neutral</span>;
}

function Candidate({ m, current, onPick }: { m: Minister; current: boolean; onPick: () => void }) {
  const crony = m.faction === "crony";
  const d = hireMood(m.faction, true);
  return (
    <button className="fx-cand" data-on={current ? "1" : undefined} onClick={onPick} aria-pressed={current}>
      <div className="g-row g-wrap" style={{ gap: 6 }}><b className="g-small">{m.name}</b><Badge tone={m.faction === "technocrat" ? "blue" : crony ? "red" : m.faction === "heavyweight" ? "amber" : "navy"}>{FACTION_LABEL[m.faction].label}</Badge></div>
      {m.bio && <div className="g-tiny g-muted">{m.bio}</div>}
      <div className="g-row g-between g-tiny"><span>Skill {crony ? <b title="You can only tell with time">?</b> : <b>{m.skill}</b>}</span><span>Honesty {crony ? <b title="You will find out">?</b> : <b>{m.integrity}</b>}</span></div>
      <Hint d={d} />
    </button>
  );
}

function AideCard({ a, on, onPick }: { a: ReturnType<typeof cosCandidates>[number]; on: boolean; onPick: () => void }) {
  return (
    <button className="fx-cand" data-on={on ? "1" : undefined} onClick={onPick}>
      <div className="g-row" style={{ gap: 10 }}><Portrait p={a.portrait} size={46} name={a.name} /><div><b>{a.name}</b><div className="g-tiny g-muted">{AIDE_KINDS[a.kind].icon} {AIDE_KINDS[a.kind].tag}</div></div></div>
      <div className="g-tiny g-muted">{a.bio}</div>
      <div className="g-small">{AIDE_KINDS[a.kind].perk}</div>
      <div className="g-row g-between g-tiny"><span>Skill <b>{a.revealed ? a.skill : "?"}</b></span><span>Honesty <b>{a.revealed ? a.integrity : "?"}</b></span><span>Loyalty <b>{a.revealed ? a.loyalty : "?"}</b></span></div>
      <Hint d={cosMood(a.kind)} />
    </button>
  );
}

export function DayOne() {
  const s = useS();
  const { act } = useFix();
  const [step, setStep] = useState(0);
  const [charge, setCharge] = useState(false);
  const cands = cosCandidates(s);
  return (
    <div className="fx-dayone" role="dialog" aria-modal="true" aria-label="Day One">
      <div className="fx-dayone-card">
        <div className="g-tiny" style={{ letterSpacing: ".16em", fontWeight: 800, color: "#9db3c9" }}>DAY ONE · {step + 1} OF 4</div>
        {step === 0 && (
          <>
            <h2>Who runs your villa?</h2>
            <p className="g-small" style={{ color: "#cfe0ee" }}>Everybody who helped you win is in the waiting room, and each one wants the job. The Chief of Staff decides who sees you, what reaches your desk, and who gets the contracts.</p>
            <div className="fx-cand-grid">
              {cands.map((a) => <AideCard key={a.id} a={a} on={s.staff.cos?.id === a.id} onPick={() => { sfx("tap"); act((x) => pickChiefOfStaff(x, a.id), { silent: true }); }} />)}
            </div>
            <p className="g-tiny" style={{ color: "#9db3c9" }}>Advisers tell you what they think of every big decision. A clever, honest one warns you with real numbers. A flatterer says "Great idea, Sir" to everything.</p>
            <div className="g-row" style={{ justifyContent: "flex-end" }}><Button variant="primary" disabled={!s.staff.cos} onClick={() => setStep(1)}>Next: your Vice President</Button></div>
          </>
        )}
        {step === 1 && (
          <>
            <h2>Who is your Vice President?</h2>
            <p className="g-small" style={{ color: "#cfe0ee" }}>The VP balances the ticket, gets a second opinion on everything, and stands one heartbeat from your chair. Choose someone you can live with, and who will not want your job.</p>
            <div className="fx-cand-grid">
              {vpCandidates(s).map((a) => <AideCard key={a.id} a={a} on={s.staff.vp?.id === a.id} onPick={() => { sfx("tap"); act((x) => pickVice(x, a.id), { silent: true }); }} />)}
            </div>
            <div className="g-row g-between"><Button onClick={() => setStep(0)}>Back</Button><Button variant="primary" disabled={!s.staff.vp} onClick={() => setStep(2)}>Next: your ministers</Button></div>
          </>
        )}
        {step === 2 && (
          <>
            <h2>Pick your ministers</h2>
            <p className="g-small" style={{ color: "#cfe0ee" }}>Qualified strangers run the economy well. Your own people are loyal and your backers love them, but nobody knows how honest they are. <b>Choose carefully: the people who funded you are watching.</b></p>
            <div className="fx-backers"><BackerRow /></div>
            <label className="fx-charge"><input type="checkbox" checked={charge} onChange={(e) => setCharge(e.target.checked)} /> <span><b>Charge every appointee:</b> "You are not here to eat. You are here to work. Steal and you answer for it." <i>They steal less, but your own people will be offended, and you must act if one steals.</i></span></label>
            <div className="g-col" style={{ gap: 12 }}>
              {PORTFOLIOS.map((p) => {
                const cur = s.cabinet.members[p.id];
                const all = [cur, ...s.cabinet.pool.filter((m) => m.portfolio === p.id)].filter(Boolean) as Minister[];
                return (
                  <div key={p.id}>
                    <div className="g-row g-between"><b>{p.title}</b><span className="g-tiny" style={{ color: "#9db3c9" }}>{p.area}</span></div>
                    <div className="fx-cand-grid fx-cand-4">{all.map((m) => <Candidate key={m.id} m={m} current={cur?.id === m.id} onPick={() => { if (cur?.id !== m.id) { sfx("tap"); act((x) => appoint(x, p.id, m.id), { silent: true }); } }} />)}</div>
                  </div>
                );
              })}
            </div>
            <div className="g-row g-between"><Button onClick={() => setStep(1)}>Back</Button><Button variant="primary" onClick={() => setStep(3)}>Next: see the reaction</Button></div>
          </>
        )}
        {step === 3 && (
          <>
            <h2>The reaction</h2>
            <p className="g-small" style={{ color: "#cfe0ee" }}>Your backers have seen your list. Remember: you can change ministers later, but sacking someone costs you.</p>
            <div className="fx-backers"><BackerRow /></div>
            {s.backers.some((b) => b.mood < 56) ? <Callout tone="warn"><b>Expect an ultimatum in your first month.</b> Some of the people who bankrolled you are not happy. You can appease them, give their people deputy posts as a way around it, promise them later, or hold the line and pay for it.</Callout> : <Callout tone="info">Your backers are content, for now. They will come asking for contracts.</Callout>}
            <div className="g-row g-between"><Button onClick={() => setStep(2)}>Back</Button><Button variant="primary" onClick={() => { sfx("fanfare"); act((x) => { if (charge) for (const p of PORTFOLIOS) warnMinister(x, p.id); finishDayOne(x); return { ok: true, message: "You have taken office." }; }, { silent: true }); }}>Take office, Mr/Madam President</Button></div>
          </>
        )}
      </div>
    </div>
  );
}
