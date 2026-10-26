"use client";
import { ArrowRight, MapPin, Wallet, Sparkles, CalendarClock, ScrollText, Newspaper, Briefcase, Landmark, GraduationCap } from "lucide-react";
import { useGame, useS } from "../store";
import { Button, Card, Meter, Portrait, Badge, naira, EmptyState } from "../kit";
import { TimeControls } from "../Shell";
import { LGA_BY_ID, stateName } from "../../engine/admin";
import { playerAge, formatMonth, formatMonthShort } from "../../engine/calendar";
import { upcoming, suggestions, happiness, politicalStatus, educationLabel } from "../../engine/insights";
import { netWorth } from "../../engine/finance";
import { partyColor } from "../../engine/queries";
import { timeBudget } from "../../engine/life";

export function HomeScreen() {
  const state = useS();
  const { go } = useGame();
  const p = state.player;
  const sug = suggestions(state);
  const up = upcoming(state, 6);
  const f = p.finances;
  const last = f.monthly[f.monthly.length - 1];
  const hap = happiness(state);
  const tb = timeBudget(state);
  const recent = [...p.career].reverse().slice(0, 5);
  const heads = [...state.news].filter((n) => n.importance >= 2 || n.personal).reverse().slice(0, 4);
  const lga = LGA_BY_ID[p.residenceLgaId];
  const party = p.politics.membership?.partyId ?? null;

  return (
    <div className="g-col" style={{ gap: 16 }}>
      <div className="g-grid g-split">
        <div className="g-col" style={{ gap: 16 }}>
          <Card>
            <div className="g-row g-wrap" style={{ gap: 16, alignItems: "flex-start" }}>
              <Portrait p={p.portrait} size={84} name={p.name} />
              <div className="g-grow" style={{ minWidth: 200 }}>
                <div className="g-row g-between g-wrap">
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.15 }}>{p.name}</div>
                    <div className="g-small g-muted">Age {playerAge(state)}</div>
                  </div>
                  {party && <Badge tone="navy"><span style={{ width: 8, height: 8, borderRadius: 99, background: partyColor(state, party), display: "inline-block" }} /> {politicalStatus(state)}</Badge>}
                </div>
                <div className="g-col g-small" style={{ gap: 6, marginTop: 10 }}>
                  <div className="g-row"><MapPin size={15} className="g-muted" /> {lga?.name}, {stateName(p.residenceStateId)}</div>
                  <div className="g-row"><Briefcase size={15} className="g-muted" /> {p.occupation.title}</div>
                  <div className="g-row"><GraduationCap size={15} className="g-muted" /> {educationLabel(state)}</div>
                  {!party && <div className="g-row"><Landmark size={15} className="g-muted" /> {politicalStatus(state)}</div>}
                </div>
              </div>
            </div>
            <div className="g-grid g-grid-2" style={{ marginTop: 16, gap: "12px 22px" }}>
              <Meter label="Health" value={p.attrs.health} tone="auto" />
              <Meter label="Happiness" value={hap} tone="auto" hint="Falls with stress and money worries" />
              <Meter label="Intelligence" value={p.attrs.intelligence} tone="blue" />
              <Meter label="Reputation" value={p.attrs.reputation} tone="auto" />
              <Meter label="Leadership" value={p.attrs.leadership} tone="blue" />
              <Meter label="Integrity" value={p.attrs.integrity} tone="auto" />
            </div>
            <details style={{ marginTop: 10 }}>
              <summary className="g-small g-muted" style={{ cursor: "pointer" }}>All attributes</summary>
              <div className="g-grid g-grid-2" style={{ marginTop: 10, gap: "12px 22px" }}>
                <Meter label="Communication" value={p.attrs.communication} tone="blue" />
                <Meter label="Negotiation" value={p.attrs.negotiation} tone="blue" />
                <Meter label="Financial management" value={p.attrs.financialMgmt} tone="blue" />
                <Meter label="Charisma" value={p.attrs.charisma} tone="blue" />
                <Meter label="Ambition" value={p.attrs.ambition} tone="amber" />
                <Meter label="Stress" value={p.attrs.stress} tone="inverse" />
                <Meter label="Political experience" value={p.attrs.politicalExperience} tone="blue" />
                <Meter label="Political capital" value={p.politics.capital} tone="blue" hint="Spent on negotiations and favours" />
                <Meter label="Public trust" value={p.integrity.publicTrust} tone="auto" />
                <Meter label="Time committed" value={Math.min(tb.used, 100)} tone={tb.used > 100 ? "red" : "blue"} suffix="%" hint={tb.items.map((i) => `${i.label} ${i.pct}%`).join(", ")} />
              </div>
            </details>
          </Card>

          <Card title="Money" icon={<Wallet size={16} />} action={<Button size="sm" onClick={() => go("life", "money")}>Finances <ArrowRight size={14} /></Button>}>
            <div className="g-grid g-grid-3" style={{ gap: 10 }}>
              <div><div className="g-tiny g-muted">Cash</div><div className="g-num" style={{ fontSize: 22, fontWeight: 800 }}>{naira(f.cash)}</div></div>
              <div><div className="g-tiny g-muted">Savings</div><div className="g-num" style={{ fontSize: 22, fontWeight: 800 }}>{naira(f.savings)}</div></div>
              <div><div className="g-tiny g-muted">Net worth</div><div className="g-num" style={{ fontSize: 22, fontWeight: 800 }}>{naira(netWorth(f), true)}</div></div>
            </div>
            {last ? <div className="g-small g-muted" style={{ marginTop: 8 }}>Last month: <b style={{ color: "#047857" }}>+{naira(last.income)}</b> in, <b style={{ color: "#be123c" }}>−{naira(last.expense)}</b> out. Every item is itemised in your finances.</div> : <div className="g-small g-muted" style={{ marginTop: 8 }}>Advance the calendar to see where your money goes.</div>}
          </Card>
        </div>

        <div className="g-col" style={{ gap: 16 }}>
          <Card tone="dark">
            <div className="g-row g-between g-wrap">
              <div>
                <div className="g-tiny" style={{ color: "#9db3c9" }}>It is</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{formatMonth(state, state.clock.monthIndex)}</div>
              </div>
              <TimeControls />
            </div>
            <div className="g-tiny" style={{ color: "#9db3c9", marginTop: 8 }}>Time only moves when you say so. Inspect the country, plan, then advance.</div>
          </Card>

          <Card title="What to do next" icon={<Sparkles size={16} />}>
            {sug.length === 0 ? <EmptyState title="You're on track" body="Nothing urgent. Keep building your reputation, skills and network." /> : sug.slice(0, 3).map((s) => (
              <div key={s.id} className="g-list-row" style={{ alignItems: "flex-start" }}>
                <div className="g-grow"><b className="g-small">{s.title}</b><div className="g-small g-muted">{s.body}</div></div>
                <Button size="sm" variant={s.id === "decision" ? "primary" : "default"} onClick={() => go(s.tab, s.sub)}>{s.cta}</Button>
              </div>
            ))}
          </Card>

          <Card title="Upcoming" icon={<CalendarClock size={16} />}>
            {up.length === 0 ? <div className="g-small g-muted">No deadlines on the horizon.</div> : up.map((u, i) => (
              <div key={i} className="g-list-row">
                <Badge tone={u.kind === "election" ? "green" : u.kind === "legal" ? "red" : u.kind === "party" ? "blue" : undefined}>{formatMonthShort(state, u.month)}</Badge>
                <div className="g-grow g-small">{u.label}</div>
                {u.tab && <Button size="sm" variant="ghost" onClick={() => go(u.tab!)}><ArrowRight size={15} /></Button>}
              </div>
            ))}
          </Card>
        </div>
      </div>

      <div className="g-grid g-grid-2">
        <Card title="Recent life events" icon={<ScrollText size={16} />}>
          {recent.length === 0 ? <div className="g-small g-muted">Your story is just beginning.</div> : recent.map((r, i) => (
            <div key={i} className="g-list-row"><Badge>{formatMonthShort(state, r.m)}</Badge><div className="g-small">{r.text}</div></div>
          ))}
        </Card>
        <Card title="Headlines" icon={<Newspaper size={16} />} action={<Button size="sm" onClick={() => go("news")}>All news</Button>}>
          {heads.length === 0 ? <div className="g-small g-muted">Quiet news month.</div> : heads.map((n) => (
            <div key={n.id} className="g-list-row"><div className="g-grow"><div className="g-small" style={{ fontWeight: 600 }}>{n.headline}</div><div className="g-tiny g-muted">{formatMonthShort(state, n.month)}{n.stateId ? ` · ${stateName(n.stateId)}` : ""}</div></div></div>
          ))}
        </Card>
      </div>
    </div>
  );
}
