"use client";
/** The world league: where Nigeria stands against everyone else, and who is next. */
import { useState } from "react";
import { Card } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { VisitModal } from "./Visit";
import { TIERS, W, africaRank, league, nextTarget, type Row } from "../engine/world";

const DIMS = [{ k: "econ", l: "Economy" }, { k: "mil", l: "Military" }, { k: "tech", l: "Tech" }, { k: "inf", l: "Influence" }] as const;
const gdpText = (g: number) => (g >= 1000 ? `$${(g / 1000).toFixed(1)}tn` : `$${Math.round(g)}bn`);

export function LeaguePanel() {
  const s = useS();
  const [pick, setPick] = useState<string | null>(null);
  const onPick = setPick;
  const { tx } = useFix();
  const rows = league(s);
  const me = rows.find((r) => r.me)!;
  const w = W(s);
  const tgt = nextTarget(s);
  const Cell = ({ r, k }: { r: Row; k: "econ" | "mil" | "tech" | "inf" }) => <span className="fx-lg-cell" data-me={r.me ? "1" : undefined}><i style={{ width: `${Math.round(r[k])}%` }} /><b>{Math.round(r[k])}</b></span>;
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <Card title="Where Nigeria stands" icon={<span aria-hidden>🌍</span>}>
        <div className="fx-lg-head">
          <div><div className="g-tiny g-muted">World rank</div><div className="fx-lg-big">#{me.rank}</div></div>
          <div><div className="g-tiny g-muted">In Africa</div><div className="fx-lg-big">#{africaRank(s)}</div></div>
          <div><div className="g-tiny g-muted">Standing</div><div className="fx-lg-tier">{TIERS[w.tier]}</div></div>
          <div><div className="g-tiny g-muted">Power score</div><div className="fx-lg-big">{me.score.toFixed(1)}</div></div>
        </div>
        <div className="g-tiny g-muted" style={{ marginTop: 6 }}>The score mixes economy (35%), military (20%), technology (20%) and influence (25%). Every number is simulated and simplified.</div>
      </Card>
      {tgt ? (
        <Card title={`Next to pass: ${tgt.row.flag} ${tgt.row.name}`} icon={<span aria-hidden>🎯</span>}>
          <div className="g-small">They are {(tgt.row.score - me.score).toFixed(1)} points ahead. {tx(tgt.row.c?.blurb ?? "")} <b>{tgt.row.trendText}.</b></div>
          <div className="fx-lg-gaps">{tgt.gaps.map((g) => <div key={g.dim} data-bad={g.gap > 0 ? "1" : undefined}><span className="g-tiny g-muted">{DIMS.find((d) => d.k === g.dim)!.l}</span><b>{g.gap > 0 ? `−${g.gap}` : `+${-g.gap}`}</b></div>)}</div>
          <div className="g-small" style={{ marginTop: 6 }}>Biggest gap: <b>{DIMS.find((d) => d.k === tgt.gaps[0].dim)!.l}</b>. {tgt.hint}</div>
        </Card>
      ) : <Card title="You are number one" icon={<span aria-hidden>🏆</span>}><div className="g-small">Nobody is ahead of you. Now everybody is trying to catch you.</div></Card>}
      {w.invites.length > 0 && <Card title="Invitations" icon={<span aria-hidden>✉️</span>}><div className="g-col" style={{ gap: 6 }}>{w.invites.map((id) => { const c = w.c.find((x) => x.id === id)!; return <button key={id} className="fx-link" style={{ padding: 0, textAlign: "left", fontSize: 14 }} onClick={() => setPick(id)}>{c.flag} {c.name} wants to meet you. Open the invitation.</button>; })}</div></Card>}
      <Card title="The league" icon={<span aria-hidden>📊</span>}>
        <div className="fx-lg">
          <div className="fx-lg-row fx-lg-top"><span /><span>Country</span>{DIMS.map((d) => <span key={d.k} className="g-tiny">{d.l}</span>)}<span className="g-tiny">Score</span></div>
          {rows.map((r) => (
            <button key={r.id} className="fx-lg-row" data-me={r.me ? "1" : undefined} disabled={r.me || !onPick} onClick={() => onPick?.(r.id)} title={r.me ? "That's you" : "Visit"}>
              <span className="g-num g-muted">{r.rank}</span>
              <span className="fx-lg-name"><b>{r.flag} {r.name}</b><span className="g-tiny g-muted">{r.me ? `GDP ${gdpText(r.gdp)}` : `${gdpText(r.gdp)} · ${r.trendText}`}</span></span>
              {DIMS.map((d) => <Cell key={d.k} r={r} k={d.k} />)}
              <b className="g-num">{r.score.toFixed(1)}</b>
            </button>
          ))}
        </div>
      </Card>
      {pick && <VisitModal id={pick} onClose={() => setPick(null)} />}
    </div>
  );
}
