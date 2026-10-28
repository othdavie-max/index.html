"use client";
/** The party primaries: back the governors you want. They will run their states while you are president. */
import { useState } from "react";
import { Button, Portrait } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { ENDORSEMENTS, backCandidate, currentPrimary, finishPrimary, type Cand } from "../engine/govs";
import { STATE_BY_ID } from "../../game/data/states";
import { sfx } from "./sound";

const Stat = ({ label, v }: { label: string; v: number }) => <span className="fx-stat"><i>{label}</i><span className="fx-stat-bar"><span style={{ width: `${v}%`, background: v >= 62 ? "#00c875" : v >= 42 ? "#f59e0b" : "#e11d48" }} /></span><b>{v}</b></span>;

function CandCard({ c, on, onPick }: { c: Cand; on: boolean; onPick: () => void }) {
  return (
    <button className="fx-gcand" aria-pressed={on} onClick={onPick}>
      <div className="g-row" style={{ gap: 8 }}><Portrait p={c.portrait} size={40} name={c.name} /><b className="g-small">{c.name.replace("Gov. ", "")}</b></div>
      <div className="g-tiny g-muted">{c.bio}</div>
      <Stat label="Skill" v={c.skill} /><Stat label="Honesty" v={c.integrity} /><Stat label="Loyal to you" v={c.loyalty} />
      <span className="fx-gcand-back">{on ? "★ Backed" : "Back them"}</span>
    </button>
  );
}

export function PrimaryModal() {
  const s = useS();
  const { act, toast } = useFix();
  const p = currentPrimary(s);
  const [done, setDone] = useState(!!p?.result);
  if (!p) return null;
  const used = Object.keys(p.picks).length;
  const result = p.result;
  return (
    <div className="fx-dayone" role="dialog" aria-modal="true" aria-label="The primaries">
      <div className="fx-dayone-card">
        <div className="g-tiny" style={{ letterSpacing: ".16em", fontWeight: 800, color: "#9db3c9" }}>BEFORE THE OATH</div>
        {!done ? (
          <>
            <h2>Back your governors</h2>
            <p className="g-small" style={{ color: "#cfe0ee" }}>Your party is choosing candidates in six big states. The people you back become the governors who run those states while you are president. A skilled, honest governor makes your projects work better in their state; a weak or corrupt one wastes them. Backing someone also makes them owe you. <b>You have {ENDORSEMENTS} endorsements ({ENDORSEMENTS - used} left).</b> A backed candidate is far more likely to win, but not certain.</p>
            <div className="fx-races">
              {p.races.map((r) => (
                <div key={r.stateId} className="fx-race">
                  <b>{STATE_BY_ID[r.stateId]?.name ?? r.stateId}</b>
                  <div className="fx-race-c">{r.cands.map((c) => <CandCard key={c.id} c={c} on={p.picks[r.stateId] === c.id} onPick={() => { sfx("tap"); const r2 = act((x) => backCandidate(x, r.stateId, p.picks[r.stateId] === c.id ? null : c.id), { silent: true }); if (!r2.ok) toast(r2.message, true); }} />)}</div>
                </div>
              ))}
            </div>
            <div className="g-row g-between fx-sticky"><span className="g-small" style={{ color: "#9db3c9" }}>{used === 0 ? "You can also stay neutral and let the party decide." : `${used} of ${ENDORSEMENTS} endorsements used.`}</span><Button variant="primary" onClick={() => { sfx("gavel"); act((x) => { finishPrimary(x); return { ok: true, message: "" }; }, { silent: true }); setDone(true); }}>Hold the primaries</Button></div>
          </>
        ) : (
          <>
            <h2>The results</h2>
            <div className="g-col" style={{ gap: 8 }}>
              {(result ?? []).map((r) => (
                <div key={r.stateId} className="fx-race" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }} aria-hidden>{r.backed ? (r.youWon ? "✅" : "❌") : "➖"}</span>
                  <div className="g-grow"><b>{STATE_BY_ID[r.stateId]?.name}</b>: {r.winner.replace("Gov. ", "")} won the primary.<div className="g-tiny" style={{ color: "#9db3c9" }}>{r.backed ? (r.youWon ? "Your candidate won and owes you." : `You backed ${r.backed.replace("Gov. ", "")}, who lost. The winner noticed.`) : "You stayed out of it."}</div></div>
                </div>
              ))}
            </div>
            <p className="g-small" style={{ color: "#cfe0ee" }}>The other 30 states keep their sitting governors. You can see every governor, and how their state is doing, under People.</p>
            <div className="g-row" style={{ justifyContent: "flex-end" }}><Button variant="primary" onClick={() => { sfx("tap"); act((x) => { x.flags.primarySeen = 1; return { ok: true, message: "" }; }, { silent: true }); }}>On to Day One</Button></div>
          </>
        )}
      </div>
    </div>
  );
}
