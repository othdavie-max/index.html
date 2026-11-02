"use client";
/** Faith and region: the ticket, who sits at the top table, and how tense the country feels. */
import { Card } from "../../game/ui/kit";
import { useS } from "./store";
import { FAITH_NAME, ZONE_IDS, ZONE_INFO, myFaith, myZone, representation, tension, ticket, type Faith } from "../engine/identity";

const Meter = ({ label, v, hint }: { label: string; v: number; hint: string }) => (
  <div className="fx-unity-m"><div className="g-row g-between"><b className="g-small">{label}</b><span className="g-tiny" style={{ color: v > 60 ? "#b91c1c" : v > 40 ? "#b45309" : "#047857" }}>{v > 60 ? "Dangerous" : v > 40 ? "Uneasy" : "Calm"} · {Math.round(v)}</span></div><div className="fx-bar"><i style={{ width: `${v}%`, background: v > 60 ? "#e11d48" : v > 40 ? "#f59e0b" : "#00c875" }} /></div><div className="g-tiny g-muted">{hint}</div></div>
);
export function UnityCard() {
  const s = useS();
  const t = tension(s), tk = ticket(s), rep = representation(s);
  return (
    <Card title="One Nigeria" icon={<span aria-hidden>🤝</span>}>
      <div className="g-small">You: <b>{ZONE_INFO[myZone(s)].name}</b> · {FAITH_NAME[myFaith(s)]}{s.staff?.vp?.zone ? <> · Vice President: <b>{ZONE_INFO[s.staff.vp.zone as keyof typeof ZONE_INFO]?.name}</b> · {FAITH_NAME[s.staff.vp.faith as Faith]}</> : null}</div>
      {tk && <div className="g-small" style={{ marginTop: 4, color: tk.sameFaith || !tk.balancedRegion ? "#b45309" : "#047857" }}>{tk.sameFaith || !tk.balancedRegion ? "⚠️" : "✅"} {tk.text}.</div>}
      <div className="g-col" style={{ gap: 10, marginTop: 10 }}>
        <Meter label="Religious tension" v={t.rel} hint="Rises with insecurity, joblessness and a same-faith ticket. Peace councils and fair policing lower it." />
        <Meter label="Ethnic and regional tension" v={t.eth} hint="Rises when a zone has nobody at the top table, with an unbalanced ticket, and with hardship." />
      </div>
      <div className="g-section-title" style={{ marginTop: 12 }}>Who sits at the top table (federal character)</div>
      <div className="fx-unity-zones">
        {ZONE_IDS.map((z) => <div key={z} className="fx-unity-z" data-out={rep[z].length ? undefined : "1"}><b>{rep[z].length ? "✅" : "❌"} {ZONE_INFO[z].name}</b><i>{rep[z].length ? rep[z].slice(0, 2).join(", ") + (rep[z].length > 2 ? ` +${rep[z].length - 2}` : "") : "Nobody. They notice."}</i></div>)}
      </div>
      <div className="g-tiny g-muted" style={{ marginTop: 6 }}>Counts you, your vice president, your chief of staff and your six key ministers. Reshuffle under My team to bring a left-out zone in.</div>
    </Card>
  );
}
