"use client";
/** Grand plans: mega-projects that never run out, the sovereign fund, the naira's journey, and the world's shocks. */
import { Button, Card } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { ERA_NAME, FUND_STYLES, MEGAS, NAIRA_STEPS, blocShare, cancelMega, fundStyle, megaBlock, megaCost, megaLevel, megas, setFundStyle, startMega } from "../engine/late";
import { depositFund, withdrawFund, lendingOpen } from "../engine/lending";
import { W } from "../engine/world";
import { monthLabel, nb } from "../engine/util";
import { sfx } from "./sound";

const roman = ["", "", "II", "III", "IV", "V", "VI", "VII", "VIII"];
export function GrandPanel() {
  const s = useS();
  const { act, tx } = useFix();
  const st = megas(s); const w = W(s); const share = blocShare(s); const style = fundStyle(s);
  const next = Number(s.flags.eraNext ?? 0);
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <Card title="Mega-projects" icon={<span aria-hidden>🏗️</span>}>
        <div className="g-small g-muted" style={{ marginBottom: 8 }}>Huge, slow and costly. Every one can be built again at a bigger scale, so there is always another summit. Three at a time.</div>
        {st.run.length > 0 && <div className="g-col" style={{ gap: 6, marginBottom: 10 }}>{st.run.map((r) => { const m = MEGAS.find((x) => x.id === r.id)!; const total = m.cost * Math.pow(1.7, r.level - 1) * (0.6 + 0.4 * s.eco.priceLevel / 100); const pct = Math.min(100, Math.round(r.spent / total * 100)); return (
          <div key={r.id} className="fx-mega-run"><span style={{ fontSize: 22 }} aria-hidden>{m.icon}</span><div className="g-grow"><b className="g-small">{m.name}{r.level > 1 ? ` ${roman[r.level] ?? r.level}` : ""}</b><div className="fx-bar"><i style={{ width: `${pct}%` }} /></div><div className="g-tiny g-muted">{pct}% · started {monthLabel(r.start)}{r.paused ? " · PAUSED: out of cash" : ""}</div></div><Button size="sm" onClick={() => { sfx("tap"); act((g) => cancelMega(g, r.id)); }}>Cancel</Button></div>); })}</div>}
        <div className="fx-powers">
          {MEGAS.map((m) => { const b = megaBlock(s, m); const lvl = megaLevel(s, m.id); return (
            <div key={m.id} className="fx-power" data-blocked={b ? "1" : undefined}>
              <div className="g-row" style={{ gap: 8 }}><span style={{ fontSize: 24 }} aria-hidden>{m.icon}</span><b>{m.name}{lvl > 1 ? ` ${roman[lvl] ?? lvl}` : ""}</b></div>
              <div className="g-tiny g-muted">{tx(m.blurb)}</div>
              <div className="g-tiny">{nb(megaCost(s, m))} over {Math.round(m.months / 12 * 10) / 10} years{lvl > 1 ? ` · level ${lvl}, a bigger prize for a bigger bill` : ""}</div>
              {b ? <div className="g-tiny" style={{ color: "#92400e" }}>{b}</div> : <Button size="sm" onClick={() => { sfx("tap"); act((g) => startMega(g, m.id)); }}>Start ⚡4</Button>}
            </div>); })}
        </div>
      </Card>
      <Card title="Sovereign wealth fund" icon={<span aria-hidden>💰</span>}>
        <div style={{ fontSize: 26, fontWeight: 900 }}>{nb(s.lend.fund)}</div>
        <div className="g-small g-muted">Invested style: <b>{style.label}</b>. {style.blurb}</div>
        <div className="g-row g-wrap" style={{ gap: 6, marginTop: 8 }}>{FUND_STYLES.map((f) => <Button key={f.id} size="sm" variant={f.id === style.id ? "primary" : "default"} onClick={() => { sfx("tap"); act((g) => setFundStyle(g, f.id)); }}>{f.label}</Button>)}</div>
        <div className="g-row g-wrap" style={{ gap: 6, marginTop: 8 }}>
          {lendingOpen(s) ? <><Button size="sm" onClick={() => { sfx("tap"); act((g) => depositFund(g, 100)); }}>Move in ₦100bn</Button><Button size="sm" onClick={() => { sfx("tap"); act((g) => withdrawFund(g, 100)); }}>Take out ₦100bn</Button></> : <span className="g-tiny g-muted">🔒 The fund opens when national debt falls below 10% of the economy.</span>}
        </div>
        <div className="g-tiny g-muted" style={{ marginTop: 6 }}>Bold styles can lose money in a bad year. A big fund is the best defence in a global crisis.</div>
      </Card>
      <Card title="The naira abroad" icon={<span aria-hidden>₦</span>}>
        <div className="g-small g-muted">Persuade countries to join the African Prosperity Zone, then to trade in naira. Do that for enough of the world and the naira becomes a currency other countries save in. Visit them under Power → World league.</div>
        <div className="fx-bar" style={{ marginTop: 8 }}><i style={{ width: `${Math.min(100, Math.round(share / 34 * 100))}%` }} /></div>
        <div className="g-tiny g-muted">{share}% of world trade weight uses naira · {w.bloc.length} in the Prosperity Zone · {w.naira.length} using naira</div>
        <div className="g-col" style={{ gap: 4, marginTop: 6 }}>{NAIRA_STEPS.map((x, i) => <div key={x.label} className="g-small" style={{ opacity: Number(s.flags.nairaStep ?? 0) > i ? 1 : 0.55 }}>{Number(s.flags.nairaStep ?? 0) > i ? "✅" : "⬜"} <b>{x.label}</b> at {x.at}%</div>)}</div>
      </Card>
      <Card title="Shocks that shake the world" icon={<span aria-hidden>🌪️</span>}>
        {w.eraLog.length === 0 ? <div className="g-small g-muted">None yet. Every three to five years something hits every country at once, and the league table is reshuffled by who copes best.</div> : <div className="g-col" style={{ gap: 4 }}>{[...w.eraLog].reverse().map((e, i) => <div key={i} className="g-small"><b>{ERA_NAME[Object.keys(ERA_NAME).find((k) => ERA_NAME[k] === e.text) ?? ""] ?? e.text}</b> <span className="g-muted">· {monthLabel(e.month)}</span></div>)}</div>}
        {next > 0 && <div className="g-tiny g-muted" style={{ marginTop: 6 }}>Next shock: sometime after {monthLabel(next)}. Savings and spare cash help.</div>}
      </Card>
    </div>
  );
}
