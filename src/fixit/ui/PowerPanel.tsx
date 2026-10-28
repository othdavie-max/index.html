"use client";
/** The seat of power: danger meters, the anti-corruption law ladder and the strongman toolkit. */
import { useState } from "react";
import { PC_COST } from "../engine/meta";
import { useFix, useS } from "./store";
import { Badge, Bar, Button, Callout, ConfirmDialog } from "../../game/ui/kit";
import { LAWS, TOOLS, amendConstitution, applyTool, democracyLabel, deterrence, emergencyOn, enactLawNow, monthsLeft, nextLaw, shutdownOn, toolBlock, LAW_EFFECTS } from "../engine/power";
import { billChance } from "../engine/politics";
import { monthLabel, nb } from "../engine/util";
import { VoteModal } from "./Politics";
import { sfx } from "./sound";
import { AskAdvisers } from "./AdvisorStrip";

export function Meters({ compact }: { compact?: boolean }) {
  const s = useS();
  const P = s.rule;
  const rows: { icon: string; label: string; v: number; bad: boolean; hint: string }[] = [
    { icon: "🕊️", label: "Democracy", v: P.democracy, bad: false, hint: democracyLabel(s) },
    { icon: "✊", label: "Street anger", v: P.streetAnger, bad: true, hint: P.streetAnger >= 70 ? "Revolutionary" : P.streetAnger >= 45 ? "Simmering" : "Calm" },
    { icon: "🪖", label: "Coup risk", v: P.coupRisk, bad: true, hint: P.coupRisk >= 50 ? "The barracks are restless" : P.coupRisk >= 25 ? "Whispers" : "Loyal" },
    { icon: "🌍", label: "World pressure", v: P.intlPressure, bad: true, hint: P.intlPressure >= 60 ? "Sanctions looming" : P.intlPressure >= 30 ? "Concerned" : "Friendly" },
    { icon: "🎩", label: "Elite loyalty", v: P.eliteLoyalty, bad: false, hint: P.eliteLoyalty >= 55 ? "Backing you" : "Wavering" },
  ];
  if (compact) {
    return (
      <div className="fx-mini" role="group" aria-label="Danger meters">
        {rows.map((r) => {
          const danger = r.bad ? r.v >= 60 : r.v < 30;
          const warn = r.bad ? r.v >= 40 : r.v < 45;
          return <div key={r.label} className="fx-mini-i" data-tone={danger ? "bad" : warn ? "warn" : "ok"} title={`${r.label}: ${Math.round(r.v)} · ${r.hint}`}><span aria-hidden>{r.icon}</span><b>{Math.round(r.v)}</b><span className="fx-mini-bar"><span style={{ width: `${r.v}%` }} /></span><i>{r.label}</i></div>;
        })}
      </div>
    );
  }
  return (
    <div className="g-col" style={{ gap: 8 }}>
      {rows.map((r) => {
        const danger = r.bad ? r.v >= 60 : r.v < 30;
        const warn = r.bad ? r.v >= 40 : r.v < 45;
        return (
          <div key={r.label}>
            <div className="g-row g-between g-small"><span>{r.icon} {r.label}</span><b>{Math.round(r.v)} · {r.hint}</b></div>
            <Bar value={r.v / 100} tone={danger ? "red" : warn ? "amber" : undefined} label={`${r.label} ${Math.round(r.v)} out of 100`} />
          </div>
        );
      })}
    </div>
  );
}

function Ladder() {
  const s = useS();
  const { act } = useFix();
  const [vote, setVote] = useState<string | null>(null);
  const nl = nextLaw(s);
  return (
    <div className="g-col" style={{ gap: 8 }}>
      {LAWS.slice(1).map((l) => {
        const done = s.rule.lawLevel >= l.level;
        const isNext = nl?.level === l.level;
        const eff = LAW_EFFECTS[l.level] ?? {};
        return (
          <div key={l.level} className="fx-rung" data-state={done ? "done" : isNext ? "next" : "locked"}>
            <div className="fx-rung-ic" aria-hidden>{l.icon}</div>
            <div className="g-grow">
              <div className="g-row g-wrap" style={{ gap: 6 }}><b>{l.name}</b>{done && <Badge tone="green">In force</Badge>}{isNext && <Badge tone="amber">Next</Badge>}</div>
              <div className="g-tiny g-muted">{l.blurb}</div>
              {isNext && <AskAdvisers k={`law:${l.level}`} />}
              {isNext && <div className="g-tiny" style={{ marginTop: 4 }}>Chance the Assembly passes it: <b>{Math.round(billChance(s, `law:${l.level}`) * 100)}%</b>. {Object.keys(eff).length ? `Over time: corruption ${eff.corruption ?? 0}, trust +${eff.trust ?? 0}.` : ""}</div>}
            </div>
            {isNext && <div className="g-col" style={{ gap: 4 }}><Button size="sm" variant="primary" onClick={() => setVote(`law:${l.level}`)}>Send to Assembly</Button><Button size="sm" onClick={() => { const r = act((x) => applyTool(x, "decree")); sfx(r.ok ? "gavel" : "bad"); }}>Decree it ⚡{PC_COST.tool}</Button></div>}
          </div>
        );
      })}
      <div className="g-tiny g-muted">A harsher law frightens lawmakers and officials. But courts must be able to enforce it, and the death penalty can kill the innocent and draw the world&apos;s anger.</div>
      {vote && <VoteModal bill={vote} exec={(x) => enactLawNow(x)} onClose={() => setVote(null)} />}
    </div>
  );
}

function Toolkit() {
  const s = useS();
  const { act } = useFix();
  const [confirm, setConfirm] = useState<string | null>(null);
  const t = TOOLS.find((x) => x.id === confirm);
  return (
    <div className="g-col" style={{ gap: 8 }}>
      {TOOLS.filter((x) => x.id !== "decree").map((tool) => {
        const block = toolBlock(s, tool);
        return (
          <div key={tool.id} className="fx-rung" data-state="tool">
            <div className="fx-rung-ic" aria-hidden>{tool.icon}</div>
            <div className="g-grow">
              <b>{tool.name}</b>{tool.cost > 0 && <span className="g-tiny g-muted"> · {nb(tool.cost)}</span>}
              <div className="g-tiny g-muted">{tool.explain}</div>
              <div className="g-tiny" style={{ color: "#9f1239" }}>Risk: {tool.risk}</div>
              {block && <div className="g-tiny g-muted">⛔ {block}</div>}
              <AskAdvisers k={`tool:${tool.id}`} />
            </div>
            <Button size="sm" variant="danger" disabled={!!block} onClick={() => setConfirm(tool.id)}>Do it</Button>
          </div>
        );
      })}
      {t && <ConfirmDialog title={t.name} body={<><p className="g-small">{t.explain}</p><p className="g-small" style={{ color: "#9f1239", marginTop: 6 }}><b>Risk:</b> {t.risk}</p><p className="g-small" style={{ marginTop: 6 }}>Costs ⚡{PC_COST.tool} political capital.</p></>} confirmLabel="Use my power" tone="danger" onCancel={() => setConfirm(null)} onConfirm={() => { const r = act((x) => applyTool(x, t.id)); sfx(r.ok ? "doom" : "bad"); setConfirm(null); }} />}
    </div>
  );
}

export function PowerPanel() {
  const s = useS();
  const P = s.rule;
  const [amend, setAmend] = useState(false);
  const left = monthsLeft(s);
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <div>
        <div className="g-section-title">Your grip on power: {democracyLabel(s)}</div>
        <Meters />
        <div className="g-tiny g-muted" style={{ marginTop: 6 }}>
          {P.termExtra > 0 ? `Your term has been stretched by ${P.termExtra} months. ` : ""}Next election: {monthLabel(s.termStart + 48 + P.termExtra)} ({left} months). {P.maxTerms >= 99 ? "No term limits." : `Term limit: ${P.maxTerms}.`}{" "}
          {emergencyOn(s) ? "State of emergency in force. " : ""}{shutdownOn(s) ? "Internet shut down. " : ""}Courts {Math.round(P.judiciary)}/100 · Press freedom {Math.round(P.pressFreedom)}/100 · INEC under your control {Math.round(P.inecControl)}% · Law deterrence {Math.round(deterrence(s))}.
        </div>
      </div>
      {P.coupRisk >= 45 && <Callout tone="bad">The generals are talking. Pay them, purge them, or ease the pressure.</Callout>}
      {P.streetAnger >= 65 && <Callout tone="bad">The streets are close to boiling over. A single spark could bring millions out.</Callout>}
      <div><div className="g-section-title">Anti-corruption law ladder</div><Ladder /></div>
      <div><div className="g-section-title">Constitution</div>
        {P.maxTerms >= 99 ? <div className="g-small g-muted">Term limits have been scrapped.</div> : <div className="fx-rung" data-state="tool"><div className="fx-rung-ic" aria-hidden>📜</div><div className="g-grow"><b>Scrap presidential term limits</b><div className="g-tiny g-muted">Needs a two-thirds vote. You can run again and again, and the world will say what it thinks.</div><div className="g-tiny">Chance: <b>{Math.round(billChance(s, "amendment") * 100)}%</b></div><AskAdvisers k="amendment" /></div><Button size="sm" variant="danger" onClick={() => setAmend(true)}>Call the vote</Button></div>}
      </div>
      <div><div className="g-section-title">Strongman toolkit</div><Toolkit /></div>
      {amend && <VoteModal bill="amendment" exec={(x) => amendConstitution(x)} onClose={() => setAmend(false)} />}
    </div>
  );
}
