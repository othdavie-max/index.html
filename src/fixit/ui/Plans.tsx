"use client";
/** Plans: every big problem as a short ladder of solutions, with the payoff at the top. */
import { useState } from "react";
import { Button, Card } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { LADDERS, jobsCreated, ladderProgress, rungState } from "../engine/ladders";
import { POLICY_BY_ID, PROJECT_BY_ID } from "../data/catalogue";
import { enactPolicy, priceMult, type Result } from "../engine/actions";
import { billFor } from "../engine/politics";
import { VoteModal } from "./Politics";
import { StartProjectModal } from "./Decisions";
import { nb } from "../engine/util";
import type { FixState } from "../engine/types";
import { sfx } from "./sound";

const ICON = { done: "✅", building: "🔨", open: "⬜", locked: "🔒" } as const;

export function PlansPanel() {
  const s = useS();
  const { act } = useFix();
  const [proj, setProj] = useState<string | null>(null);
  const [vote, setVote] = useState<{ bill: string; exec: (x: FixState) => Result } | null>(null);
  const startPolicy = (id: string) => { sfx("tap"); const bill = billFor({ type: "policy", id }); if (bill) setVote({ bill, exec: (x) => enactPolicy(x, id) }); else act((x) => enactPolicy(x, id)); };
  const jobs = jobsCreated(s);
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <div className="g-small g-muted">Every big problem has a ladder: a few steps, with a big payoff at the top. Start a step and it is the same project or policy you would find under Projects and Policies, just in the order that works.</div>
      {LADDERS.map((l) => {
        const pr = ladderProgress(s, l);
        return (
          <Card key={l.id} title={`${l.icon} ${l.title}`}>
            <div className="g-col" style={{ gap: 8 }}>
              <div className="g-small g-muted">{l.blurb}</div>
              <div className="fx-ladder-bar" role="progressbar" aria-valuenow={Math.round(pr * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${l.title} progress`}><span style={{ width: `${pr * 100}%` }} /></div>
              {l.id === "jobs" && <div className="fx-jobs">👷 <b>{jobs.toLocaleString()}</b> jobs created so far</div>}
              <div className="fx-miles">
                {l.milestones.map((m) => <span key={m.id} data-on={s.flags[`lad:${m.id}`] !== undefined ? "1" : undefined}>{s.flags[`lad:${m.id}`] !== undefined ? "🏆" : "○"} {m.label}</span>)}
              </div>
              <div className="g-col" style={{ gap: 4 }}>
                {l.rungs.map((r) => {
                  const st = rungState(s, r);
                  const d = r.kind === "project" ? PROJECT_BY_ID[r.ref] : null, pol = r.kind === "policy" ? POLICY_BY_ID[r.ref] : null;
                  if (!d && !pol) return null;
                  const cost = d ? d.cost * (s.eco.priceLevel / 100) : pol!.setup * priceMult(s);
                  return (
                    <div key={r.ref} className="fx-rung" data-state={st.state}>
                      <span aria-hidden>{ICON[st.state]}</span>
                      <span className="g-grow"><b className="g-small">{d?.name ?? pol!.name}</b> <span className="g-tiny g-muted">{r.why}{r.kind === "policy" ? " · policy" : ""}</span>
                        {st.note && <span className="g-tiny" style={{ display: "block", color: "#92400e" }}>{st.note}</span>}</span>
                      {st.state === "open" && <><span className="g-tiny g-muted">{nb(cost)}</span><Button size="sm" variant="primary" disabled={cost > s.fin.treasury} onClick={() => (r.kind === "project" ? (sfx("tap"), setProj(r.ref)) : startPolicy(r.ref))}>{r.kind === "project" ? "Plan it" : billFor({ type: "policy", id: r.ref }) ? "To Assembly" : "Start"}</Button></>}
                      {st.state === "building" && <span className="g-tiny" style={{ color: "#0f766e", fontWeight: 700 }}>Under way</span>}
                      {st.state === "done" && <span className="g-tiny" style={{ color: "#047857", fontWeight: 700 }}>Done</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        );
      })}
      {proj && <StartProjectModal defId={proj} onClose={() => setProj(null)} />}
      {vote && <VoteModal bill={vote.bill} exec={vote.exec} onClose={() => setVote(null)} />}
    </div>
  );
}
