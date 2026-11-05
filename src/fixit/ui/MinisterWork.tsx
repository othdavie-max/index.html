"use client";
/** What your ministers actually did on their own, newest first. */
import { Card } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { workLog } from "../engine/ministerwork";
import { PORTFOLIO_BY_ID } from "../engine/cabinet";
import { monthLabel } from "../engine/util";

const ICON: Record<string, string> = { finance: "💰", cbn: "🏦", agriculture: "🌾", power: "💡", works: "🛣️", security: "🛡️" };
export function MinisterWorkCard() {
  const s = useS(); const { setSelect, setTab } = useFix();
  const log = workLog(s).slice().reverse();
  return (
    <Card title="What my ministers did" icon={<span aria-hidden>📋</span>}>
      {log.length === 0 ? <div className="g-small g-muted">Nothing yet. Good ministers start taking initiatives from the third month: fixing roads, plugging tax leaks, breaking up gangs. Weak ones blunder instead, and dishonest ones pocket money.</div> : (
        <div className="g-col" style={{ gap: 8 }}>
          {log.map((e, i) => (
            <div key={i} className="fx-mwork" data-tone={e.tone}>
              <span className="fx-mwork-ic" aria-hidden>{ICON[e.portfolio]}</span>
              <div className="g-grow"><div className="g-small">{e.text}</div>
                <div className="g-tiny g-muted">{PORTFOLIO_BY_ID[e.portfolio].title} · {monthLabel(e.month)}{e.gain ? ` · ✅ ${e.gain}` : ""}{e.tone === "bad" ? " · ⚠️ blunder" : e.tone === "dirty" ? " · 💸 money went missing" : ""}</div></div>
              {e.stateId && <button className="g-btn g-btn-sm" onClick={() => { setSelect({ state: e.stateId!, lga: null }); setTab("world"); }}>📍 Map</button>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
