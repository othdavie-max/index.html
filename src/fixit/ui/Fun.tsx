"use client";
/** The satirical front page, the crisis-room countdown, titles and story progress. */
import { useEffect, useRef, useState } from "react";
import { Card } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { CAMPAIGNS, CRISIS_SECONDS, TITLES, earnedTitles, frontPage } from "../engine/fun";
import { topicOf } from "../engine/social";
import { respond } from "../engine/actions";
import type { GameEvent } from "../engine/types";
import { monthLabel } from "../engine/util";
import { sfx } from "./sound";

export function FrontPageCard() {
  const s = useS();
  const { tx } = useFix();
  const fp = frontPage(s, topicOf);
  return (
    <div className="fx-paper" aria-label="This month's front page">
      <div className="fx-paper-mast"><span>{fp.paper}</span><i>{fp.date} · ₦200 · Lagos & Abuja</i></div>
      <h2 className="fx-paper-head">{fp.headline}</h2>
      <div className="fx-paper-sub">{tx(fp.sub)}</div>
      <div className="fx-paper-cols">
        <div>{fp.stories.length ? fp.stories.map((x, i) => <p key={i}>▪ {tx(x)}</p>) : <p>▪ Nothing else happened. Editors are worried.</p>}</div>
        <div className="fx-paper-box"><b>MARKET WATCH</b>{fp.prices.map((p) => <div key={p.label}><span>{p.label}</span><b>{p.v}</b></div>)}</div>
      </div>
      <div className="fx-paper-quote">{tx(fp.quote)}</div>
    </div>
  );
}

/** a countdown for crisis-room events: when it runs out, the hesitant option is chosen for you */
export function CrisisTimer({ e }: { e: GameEvent }) {
  const { act, state } = useFix();
  const [left, setLeft] = useState(CRISIS_SECONDS);
  const fired = useRef(false);
  const off = !!state?.flags.noTimer;
  useEffect(() => {
    if (off || e.status !== "open") return;
    const t = setInterval(() => setLeft((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [off, e.status]);
  useEffect(() => {
    if (off || e.status !== "open" || left > 0 || fired.current) return;
    fired.current = true; sfx("bad");
    act((g) => respond(g, e.id, "freeze"));
  }, [left, off, e.status, e.id, act]);
  useEffect(() => { if (!off && left <= 5 && left > 0) sfx("tap"); }, [left, off]);
  if (off || e.status !== "open") return null;
  return (
    <div className="fx-crisis" data-hot={left <= 5 ? "1" : undefined} role="timer" aria-live="polite">
      <b>{Math.max(0, left)}s</b><div className="fx-crisis-bar"><i style={{ width: `${(Math.max(0, left) / CRISIS_SECONDS) * 100}%` }} /></div>
      <span>Decide now, or the hesitant option is chosen for you.</span>
    </div>
  );
}

export function TitlesCard() {
  const s = useS();
  const got = earnedTitles(s);
  const active = s.flags.campActive as string | undefined;
  return (
    <Card title="What Nigerians call you" icon={<span aria-hidden>🏷️</span>}>
      <div className="fx-titles">
        {TITLES.map((t) => { const g = got.find((x) => x.id === t.id); return (
          <div key={t.id} className="fx-title" data-got={g ? "1" : undefined} title={t.how}>
            <span aria-hidden>{g ? t.icon : "❔"}</span><div><b>{g ? t.name : "???"}</b><i>{g ? `Since ${monthLabel(g.month)}` : t.how}</i></div>
          </div>); })}
      </div>
      <div className="g-section-title" style={{ marginTop: 12 }}>Stories</div>
      <div className="g-col" style={{ gap: 6 }}>
        {CAMPAIGNS.map((c) => { const st = Number(s.flags[`camp:${c.id}`] ?? 0); const won = s.flags[`title:${c.titleWin}`] !== undefined; return (
          <div key={c.id} className="g-row g-small" style={{ gap: 8 }}><span aria-hidden>{c.icon}</span><b className="g-grow">{c.name}</b><span className="g-tiny g-muted">{st === 0 ? "Not started" : st >= 4 ? (won ? "✅ Won" : "Ended") : `${active === c.id ? "Under way" : "Paused"} · chapter ${st}/3`}</span></div>); })}
      </div>
      <div className="g-tiny g-muted" style={{ marginTop: 6 }}>Stories start by themselves and unfold over months. Your choices decide how they end.</div>
    </Card>
  );
}
