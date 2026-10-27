"use client";
/** What ordinary Nigerians see: the market board and the social feed. */
import { Heart } from "lucide-react";
import { useS } from "./store";
import { Card } from "../../game/ui/kit";
import { feed, marketBoard } from "../engine/street";
import { faceOf } from "../engine/families";
import { monthLabel } from "../engine/util";
import { Portrait } from "../../game/ui/kit";
import { Initials } from "../../game/ui/kit";

export function StreetPanel() {
  const s = useS();
  const rows = marketBoard(s);
  const posts = feed(s);
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <Card title="Families you follow" icon={<span aria-hidden>🏠</span>}>
        <div className="g-col" style={{ gap: 10 }}>
          {s.families.map((f) => (
            <div key={f.id} className="g-row" style={{ gap: 10, alignItems: "flex-start" }}>
              <Portrait p={f.portrait} size={42} name={f.name} />
              <div className="g-grow"><div className="g-row g-between"><b className="g-small">{f.name} <span className="g-muted">· {f.place}</span></b><span style={{ fontSize: 20 }} aria-label={f.status}>{faceOf(f)}</span></div><div className="g-tiny g-muted">{f.role}</div><div className="g-small">{f.log[f.log.length - 1]?.text} <span className="g-tiny g-muted">({monthLabel(f.log[f.log.length - 1]?.month ?? 0)})</span></div></div>
            </div>
          ))}
        </div>
        <div className="g-tiny g-muted" style={{ marginTop: 8 }}>Their lives follow your decisions. Once a year one of them writes to you.</div>
      </Card>
      <Card title="Market board" icon={<span aria-hidden>🛒</span>}>
        <div className="fx-market">
          {rows.map((r) => {
            const pct = (r.now / r.start - 1) * 100;
            const good = r.goodWhenDown ? pct < -1 : pct > 1;
            const bad = r.goodWhenDown ? pct > 1 : pct < -1;
            return (
              <div key={r.id} className="fx-price" data-tone={good ? "good" : bad ? "bad" : "ok"}>
                <span aria-hidden style={{ fontSize: 22 }}>{r.icon}</span>
                <div className="g-grow"><div className="g-small"><b>{r.label}</b>{r.unit && <span className="g-muted"> · {r.unit}</span>}</div><div className="g-tiny g-muted">Day one: ₦{r.start.toLocaleString()}</div></div>
                <div style={{ textAlign: "right" }}><b className="g-num">₦{r.now.toLocaleString()}</b><div className="g-tiny" style={{ color: good ? "#047857" : bad ? "#b91c1c" : "#64748b" }}>{pct > 0.5 ? "▲" : pct < -0.5 ? "▼" : "•"} {Math.abs(pct).toFixed(0)}%</div></div>
              </div>
            );
          })}
        </div>
        <div className="g-tiny g-muted" style={{ marginTop: 6 }}>Simulated prices for a fictional market. Compare with day one to feel your decisions.</div>
      </Card>
      <Card title="Naija X" icon={<span aria-hidden>🐦</span>}>
        <div className="g-col" style={{ gap: 0 }}>
          {posts.map((p, i) => (
            <div key={i} className="fx-post">
              <Initials name={p.name} size={36} color={p.tone === "bad" ? "#9f1239" : p.tone === "good" ? "#047857" : "#0b1f36"} />
              <div className="g-grow"><div className="g-small"><b>{p.name}</b>{p.verified && <span title="Verified"> ✅</span>} <span className="g-muted">{p.handle}</span></div><div className="g-small">{p.text}</div><div className="g-tiny g-muted"><Heart size={11} style={{ verticalAlign: "-1px" }} /> {p.likes.toLocaleString()}</div></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
