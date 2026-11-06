"use client";
/** The private empire (the dark side as a game) and your public look. */
import { Button, Card, Portrait } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { ASSETS, FEE, buryEvidence, buyAsset, empire, lavishParty, moveOffshore, netWorth, richList, richRank } from "../engine/empire";
import { changeLook, imageOf } from "../engine/looks";
import { sfx } from "./sound";
import { FacePicker } from "./FacePicker";

const GROUP_NAME: Record<string, string> = { traders: "Traders", farmers: "Farmers", youth: "Youth", workers: "Workers", business: "Business", military: "Army", faith: "Faith" };
export function EmpireCard() {
  const s = useS(); const { act } = useFix();
  const e = empire(s); const nw = netWorth(s); const list = richList(s); const rank = richRank(s);
  const started = s.me.wealth > 0 || e.hidden > 0 || e.assets.length > 0;
  const heat = Math.round(s.me.evidence);
  return (
    <div className="g-col" style={{ gap: 12 }}>
      <Card title="Your private empire" icon={<span aria-hidden>💎</span>}>
        {!started && <div className="g-small g-muted" style={{ marginBottom: 8 }}>You have not taken a naira. Everything on this page is empty. If you ever do, the money lands here, and so do the risks. Opportunities will find you.</div>}
        <div className="fx-emp-stats">
          <div><span>💵 Cash at home</span><b>₦{Math.round(s.me.wealth)}m</b><i>can be frozen</i></div>
          <div><span>🏝️ Hidden offshore</span><b>₦{Math.round(e.hidden)}m</b><i>safe, {Math.round(FEE(s) * 100)}% fee to move</i></div>
          <div><span>💎 Net worth</span><b>₦{nw}m</b><i>Africa's rich list: #{rank}</i></div>
          <div data-hot={heat >= 60 ? "1" : undefined}><span>🔦 Heat</span><b>{heat}/100</b><i>{heat >= 70 ? "accounts may be frozen" : heat >= 40 ? "journalists are curious" : "quiet"}</i></div>
        </div>
        <div className="g-row g-wrap" style={{ gap: 6, marginTop: 10 }}>
          <Button size="sm" disabled={s.me.wealth < 10} onClick={() => { sfx("tap"); act((g) => moveOffshore(g, Math.round(g.me.wealth / 2))); }}>🏝️ Move half abroad</Button>
          <Button size="sm" disabled={s.me.wealth < 10} onClick={() => { sfx("tap"); act((g) => moveOffshore(g, g.me.wealth)); }}>🏝️ Move all abroad</Button>
          <Button size="sm" disabled={s.me.wealth < 150} onClick={() => { sfx("tap"); act((g) => buryEvidence(g)); }}>🗂️ Bury evidence · ₦150m</Button>
          <Button size="sm" disabled={s.me.wealth < 120} onClick={() => { sfx("tap"); act((g) => lavishParty(g)); }}>🎉 Party for the elite · ₦120m</Button>
        </div>
      </Card>
      <Card title="Spend it" icon={<span aria-hidden>🛍️</span>}>
        <div className="g-col" style={{ gap: 8 }}>
          {ASSETS.map((a) => { const owned = e.assets.includes(a.id); const funds = a.offshore ? e.hidden : s.me.wealth; return (
            <div key={a.id} className="fx-asset" data-owned={owned ? "1" : undefined}>
              <span className="fx-asset-ic" aria-hidden>{a.icon}</span>
              <div className="g-grow"><b className="g-small">{a.name}</b><div className="g-tiny g-muted">{a.blurb}</div><div className="g-tiny" style={{ color: "#0f7a52" }}>{a.perk}{a.heat > 0 ? ` · ⚠️ draws attention` : ""}</div></div>
              {owned ? <span className="g-tiny" style={{ fontWeight: 800, color: "#0f7a52" }}>✓ Yours</span> : <Button size="sm" variant="primary" disabled={funds < a.cost} onClick={() => { sfx("gavel"); act((g) => buyAsset(g, a.id)); }}>₦{a.cost}m{a.offshore ? " abroad" : ""}</Button>}
            </div>); })}
        </div>
      </Card>
      <Card title="Africa's rich list" icon={<span aria-hidden>🏆</span>}>
        <ol className="fx-rich">{list.slice(0, 8).map((r, i) => <li key={r.name} data-me={(r as { me?: boolean }).me ? "1" : undefined}><span>{i + 1}</span><b>{r.name}</b><em>₦{r.worth.toLocaleString()}m</em></li>)}</ol>
        {rank > 8 && <div className="g-tiny g-muted">You are #{rank}.</div>}
      </Card>
    </div>
  );
}

export function LooksCard() {
  const s = useS(); const { act } = useFix();
  const p = s.meta.portrait; const im = imageOf(p);
  const chips = Object.entries(im.tilt).filter(([, v]) => Math.abs(v as number) >= 0.2).sort((a, b) => (b[1] as number) - (a[1] as number));
  return (
    <Card title="Your look" icon={<span aria-hidden>🪞</span>}>
      <div className="g-row" style={{ gap: 12, alignItems: "flex-start" }}>
        <Portrait p={p} size={72} name={s.meta.president} />
        <div className="g-grow">
          <div className="g-small">What you wear speaks to groups. It nudges their mood a little, for good.</div>
          <div className="fx-chips" style={{ marginTop: 6 }}>{chips.map(([g, v]) => <span key={g} className="fx-chip" data-good={(v as number) > 0 ? "1" : undefined} data-bad={(v as number) < 0 ? "1" : undefined}>{GROUP_NAME[g]} {(v as number) > 0 ? "▲" : "▼"}</span>)}{im.investor > 0 && <span className="fx-chip" data-good="1">Investors ▲</span>}</div>
        </div>
      </div>
      <div style={{ marginTop: 10 }}><FacePicker p={p} onChange={(n) => { sfx("tap"); act((g) => changeLook(g, n)); }} /><div className="g-tiny g-muted" style={{ marginTop: 6 }}>Change your style often and people stop trusting that you have one.</div></div>
    </Card>
  );
}
