"use client";
import { Megaphone, Mic, Swords, Vote } from "lucide-react";
import { useFix, useS } from "./store";
import { Bar, Button, Card } from "../../game/ui/kit";
import { DEBATE_ANSWERS, DEBATE_QUESTIONS, RIVAL_PARTY, YOUR_PARTY, ZONE_NAME, answerDebate, attackAd, campaignOpen, mobilise, monthsToElection, projectVote, rally } from "../engine/rival";
import { MapView } from "./MapView";
import { RallyTap, TimedDebate } from "./Minigames";
import { useState } from "react";

export function voteColor(share: number): string {
  // your party green, rival red; deeper with a bigger margin
  const m = Math.min(1, Math.abs(share - 50) / 20);
  return share >= 50 ? `rgb(${Math.round(210 - 190 * m)},${Math.round(240 - 70 * m)},${Math.round(220 - 110 * m)})` : `rgb(${Math.round(250 - 30 * m)},${Math.round(215 - 150 * m)},${Math.round(215 - 150 * m)})`;
}

export function RivalCard() {
  const s = useS();
  const quote = s.flags.rivalQuote as string | undefined;
  return (
    <Card title="The opposition" icon={<Swords size={16} />}>
      <div className="g-row g-between g-wrap"><div><b>{s.rival.name}</b><div className="g-tiny g-muted">{RIVAL_PARTY.name} ({RIVAL_PARTY.abbr}) · strongest in the {ZONE_NAME[s.rival.zone]}</div></div><span className="g-small">Popularity <b>{Math.round(s.rival.popularity)}%</b></span></div>
      <div style={{ marginTop: 6 }}><Bar value={s.rival.popularity / 100} tone="red" label="Rival popularity" /></div>
      {quote ? <blockquote className="g-small" style={{ margin: "10px 0 0", paddingLeft: 10, borderLeft: "3px solid #fda4af", color: "#334155" }}>{quote}</blockquote> : <div className="g-small g-muted" style={{ marginTop: 8 }}>Watching and waiting. Every price rise and scandal is ammunition.</div>}
      <div className="g-tiny g-muted" style={{ marginTop: 6 }}>Their popularity rises when yours falls. Loyalist ministers keep your party united and weaken them.</div>
    </Card>
  );
}

export function CampaignPanel() {
  const s = useS();
  const { act } = useFix();
  const [debate, setDebate] = useState(false);
  const [rallyZone, setRallyZone] = useState<string | null>(null);
  const [timed, setTimed] = useState(false);
  if (!campaignOpen(s)) return null;
  const v = projectVote(s);
  const left = monthsToElection(s);
  const used = s.campaign.month === s.month ? s.campaign.actionsThisMonth : 0;
  const debateOpen = left <= 3;
  return (
    <section className="fx-challenge" data-tone="blue" aria-label="Election campaign">
      <div className="g-section-title">Election campaign · {left} month{left === 1 ? "" : "s"} to go</div>
      <h2 className="fx-ch-title" style={{ marginTop: 4 }}><Vote size={22} style={{ verticalAlign: "-3px" }} /> {YOUR_PARTY.abbr} {v.national}% vs {RIVAL_PARTY.abbr} {Math.round((100 - v.national) * 10) / 10}%</h2>
      <p className="g-small" style={{ marginTop: 4 }}>To win you need over 50% nationally <b>and</b> at least 25% in 24 of the 37 states. Projection today: 25%+ in <b>{v.statesOver25}</b> states. {v.won ? "On course to win, but polls can be wrong." : v.national > 50 ? "Ahead overall, but not spread widely enough; that means a risky run-off." : "Behind. Every activity counts."}</p>
      <div className="fx-two" style={{ marginTop: 10 }}>
        <div>
          <MapView s={s} layer="overview" fill={(id) => voteColor(v.states[id])} selectedState={null} selectedLga={null} onSelectState={() => undefined} onSelectLga={() => undefined} height={300} showEvents={false} showProjects={false} labels={false} />
          <div className="fx-legend" style={{ marginTop: 6 }}><span><span style={{ display: "inline-block", width: 14, height: 10, background: voteColor(62), border: "1px solid #94a3b8" }} /> Leaning {YOUR_PARTY.abbr}</span><span><span style={{ display: "inline-block", width: 14, height: 10, background: voteColor(38), border: "1px solid #94a3b8" }} /> Leaning {RIVAL_PARTY.abbr}</span><span className="g-muted">Projected share in each state</span></div>
        </div>
        <div className="g-col" style={{ gap: 10 }}>
          <div className="g-small"><b>Campaign activities this month: {used}/2</b></div>
          <div><div className="g-tiny g-muted" style={{ marginBottom: 4 }}><Megaphone size={13} /> Hold a rally (repeat visits gain less)</div>
            <div className="g-grid g-grid-3 g-grid-keep2" style={{ gap: 6 }}>{Object.entries(ZONE_NAME).map(([z, name]) => <Button key={z} size="sm" disabled={used >= 2} onClick={() => setRallyZone(z)}>{name}{s.campaign.rallies[z] ? ` (+${s.campaign.rallies[z].toFixed(1)})` : ""}</Button>)}</div>
          </div>
          <div className="g-row g-wrap" style={{ gap: 6 }}>
            <Button size="sm" disabled={used >= 2 || s.campaign.mobilise >= 3} onClick={() => act((x) => mobilise(x))}>Door-to-door drive ({s.campaign.mobilise}/3)</Button>
            <Button size="sm" disabled={used >= 2} onClick={() => act((x) => attackAd(x))}>Attack ad (risky)</Button>
          </div>
          <div className="g-row g-wrap" style={{ gap: 6 }}>
            <Button size="sm" variant="navy" disabled={!debateOpen} onClick={() => setDebate(!debate)}><Mic size={15} /> {debateOpen ? (debate ? "Hide the debate" : "Presidential debate") : `Debate opens in ${left - 3} month(s)`}</Button>
            {s.campaign.debateShift !== 0 && <span className="g-small">Debate so far: <b>{s.campaign.debateShift >= 0 ? "+" : ""}{s.campaign.debateShift.toFixed(1)} pts</b></span>}
          </div>
        </div>
      </div>
      {rallyZone && <RallyTap place={ZONE_NAME[rallyZone]} onClose={() => setRallyZone(null)} onDone={(boost) => { const z = rallyZone; setRallyZone(null); act((x) => rally(x, z, boost)); }} />}
      {timed && <TimedDebate answered={new Set(DEBATE_QUESTIONS.filter((q) => s.flags[`debate:${q.id}`]).map((q) => q.id))} onClose={() => setTimed(false)} onAnswer={(qid, aid, bonus) => act((x) => answerDebate(x, qid, aid, bonus), { silent: true })} />}
      {debate && debateOpen && !DEBATE_QUESTIONS.every((q) => s.flags[`debate:${q.id}`]) && <div><Button size="sm" variant="primary" onClick={() => setTimed(true)}>🎤 Start the live debate (timed)</Button></div>}
      {debate && debateOpen && (
        <div className="g-col" style={{ gap: 10, marginTop: 12 }}>
          {DEBATE_QUESTIONS.map((q) => {
            const done = s.flags[`debate:${q.id}`] as string | undefined;
            return (
              <div key={q.id} className="g-card-flat g-col" style={{ gap: 6 }}>
                <b className="g-small">{q.q}</b>
                {done ? <div className="g-small g-muted">You answered: {DEBATE_ANSWERS.find((a) => a.id === done)?.label}</div> : (
                  <div className="g-row g-wrap" style={{ gap: 6 }}>{DEBATE_ANSWERS.map((a) => <Button key={a.id} size="sm" title={a.blurb} onClick={() => act((x) => answerDebate(x, q.id, a.id))}>{a.label}</Button>)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
