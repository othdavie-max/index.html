"use client";
/** The party primaries: back the governors you want. They will run their states while you are president. */
import { useState } from "react";
import { Button } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { ENDORSEMENTS, backCandidate, currentPrimary, finishPrimary, type Cand } from "../engine/govs";
import { STATE_BY_ID } from "../../game/data/states";
import { sfx } from "./sound";
import { PickRow } from "./PickRow";
import { CategoryBar } from "./CategoryBar";

function CandCard({ c, on, onPick }: { c: Cand; on: boolean; onPick: () => void }) {
  return <PickRow portrait={c.portrait} name={c.name.replace("Gov. ", "")} sub={c.bio} stats={[{ label: "Skill", v: c.skill }, { label: "Honesty", v: c.integrity }, { label: "Loyal", v: c.loyalty }]} selected={on} onPick={onPick} cta="Back" />;
}

export function PrimaryModal() {
  const s = useS();
  const { act, toast } = useFix();
  const p = currentPrimary(s);
  const [done, setDone] = useState(!!p?.result);
  const [race, setRace] = useState<string | null>(null);
  if (!p) return null;
  const used = Object.keys(p.picks).length;
  const result = p.result;
  return (
    <div className="fx-dayone" role="dialog" aria-modal="true" aria-label="The primaries">
      <div className="fx-dayone-card">
        <div className="g-tiny" style={{ letterSpacing: ".16em", fontWeight: 800, color: "#9db3c9" }}>{p.mid ? "MIDTERM" : "BEFORE THE OATH"}</div>
        {!done ? (
          <>
            <h2>{p.mid ? "Governorship elections" : "Back your governors"}</h2>
            <p className="g-small" style={{ color: "#cfe0ee" }}>{p.mid ? "Voters in six big states choose their governors again. Sitting governors can be re-elected or thrown out. " : "Your party is choosing candidates in six big states."} The people you back become the governors who run those states while you are president. A skilled, honest governor makes your projects work better in their state; a weak or corrupt one wastes them. Backing someone also makes them owe you. <b>You have {ENDORSEMENTS} endorsements ({ENDORSEMENTS - used} left).</b> A backed candidate is far more likely to win, but not certain.</p>
            <CategoryBar label="State" value={race ?? p.races[0]?.stateId ?? ""} onChange={setRace} cats={p.races.map((r) => ({ id: r.stateId, label: (p.picks[r.stateId] ? "✓ " : "") + (STATE_BY_ID[r.stateId]?.name ?? r.stateId), icon: "📍" }))} />
            {p.races.filter((r) => r.stateId === (race ?? p.races[0]?.stateId)).map((r) => (
              <div key={r.stateId} className="fx-pr-list">
                {r.cands.map((c) => <CandCard key={c.id} c={c} on={p.picks[r.stateId] === c.id} onPick={() => { sfx("tap"); const r2 = act((x) => backCandidate(x, r.stateId, p.picks[r.stateId] === c.id ? null : c.id), { silent: true }); if (!r2.ok) toast(r2.message, true); else if (p.picks[r.stateId] !== c.id) { const i = p.races.findIndex((q) => q.stateId === r.stateId); const nxt = p.races[i + 1]; if (nxt && !p.picks[nxt.stateId]) setRace(nxt.stateId); } }} />)}
              </div>
            ))}
            <div className="g-row g-between fx-sticky"><span className="g-small" style={{ color: "#9db3c9" }}>{used === 0 ? "You can also stay neutral and let the party decide." : `${used} of ${ENDORSEMENTS} endorsements used.`}</span><Button variant="primary" onClick={() => { sfx("gavel"); act((x) => { finishPrimary(x); return { ok: true, message: "" }; }, { silent: true }); setDone(true); }}>{p.mid ? "Hold the elections" : "Hold the primaries"}</Button></div>
          </>
        ) : (
          <>
            <h2>The results</h2>
            <div className="g-col" style={{ gap: 8 }}>
              {(result ?? []).map((r) => (
                <div key={r.stateId} className="fx-race" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }} aria-hidden>{r.backed ? (r.youWon ? "✅" : "❌") : "🤷"}</span>
                  <div className="g-grow"><b>{STATE_BY_ID[r.stateId]?.name}</b>: {r.winner.replace("Gov. ", "")} won the primary.<div className="g-tiny" style={{ color: "#9db3c9" }}>{r.backed ? (r.youWon ? "Your candidate won and owes you." : `You backed ${r.backed.replace("Gov. ", "")}, who lost. The winner noticed.`) : "You stayed out of it."}</div></div>
                </div>
              ))}
            </div>
            <p className="g-small" style={{ color: "#cfe0ee" }}>The other 30 states keep their sitting governors. You can see every governor, and how their state is doing, under People.</p>
            <div className="g-row" style={{ justifyContent: "flex-end" }}><Button variant="primary" onClick={() => { sfx("tap"); act((x) => { x.flags.primarySeen = 1; return { ok: true, message: "" }; }, { silent: true }); }}>{p.mid ? "Back to the map" : "On to Day One"}</Button></div>
          </>
        )}
      </div>
    </div>
  );
}
