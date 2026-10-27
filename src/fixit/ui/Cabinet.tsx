"use client";
import { useState } from "react";
import { PC_COST } from "../engine/meta";
import { Users } from "lucide-react";
import { useFix, useS } from "./store";
import { Badge, Bar, Button, Card, Initials, Modal } from "../../game/ui/kit";
import { FACTION_LABEL, PORTFOLIOS, PORTFOLIO_BY_ID, appoint, cabinetScore, sack, vacancies, ministerEffects, warnMinister } from "../engine/cabinet";
import type { Minister, Portfolio } from "../engine/types";
import { ZONE_NAME } from "../engine/rival";
import { chips } from "../engine/forecast";
import { Chips } from "./parts";

const FACTION_COLOR: Record<string, string> = { technocrat: "#1d4ed8", loyalist: "#0b1f36", heavyweight: "#b45309", crony: "#9f1239" };

function MinisterRow({ m, action, inOffice }: { m: Minister; action?: React.ReactNode; inOffice?: boolean }) {
  const s = useS();
  const veiled = !!m.hidden && (!inOffice || s.month - m.since < 6);
  return (
    <div className="g-row" style={{ alignItems: "flex-start", gap: 10 }}>
      <Initials name={m.name.split(" ").slice(1).join(" ")} size={40} color={FACTION_COLOR[m.faction]} />
      <div className="g-grow">
        <div className="g-row g-wrap" style={{ gap: 6 }}><b className="g-small">{m.name}</b><Badge tone={m.faction === "technocrat" ? "blue" : m.faction === "heavyweight" ? "amber" : m.faction === "crony" ? "red" : "navy"}>{FACTION_LABEL[m.faction].label}</Badge>{m.warned !== undefined && <Badge tone="amber">Warned</Badge>}<span className="g-tiny g-muted">{m.trait} · from the {ZONE_NAME[m.zone]}</span></div>
        <div className="g-grid g-grid-2 g-grid-keep2" style={{ gap: 6, marginTop: 4 }}>
          <div><div className="g-tiny g-muted">Skill {veiled ? "?" : m.skill}</div><Bar value={veiled ? 0 : m.skill / 100} tone="blue" label={veiled ? "Skill unknown" : `Skill ${m.skill}`} /></div>
          <div><div className="g-tiny g-muted">Honesty {veiled ? "?" : m.integrity}</div><Bar value={veiled ? 0 : m.integrity / 100} tone={!veiled && m.integrity < 45 ? "red" : undefined} label={veiled ? "Honesty unknown" : `Honesty ${m.integrity}`} /></div>
        </div>
      </div>
      {action}
    </div>
  );
}

export function CabinetCard() {
  const s = useS();
  const [open, setOpen] = useState<Portfolio | "all" | null>(null);
  const vac = vacancies(s);
  return (
    <Card title={`Your cabinet · average skill ${cabinetScore(s)}`} icon={<Users size={16} />} action={<Button size="sm" variant={s.month <= 2 || vac.length ? "primary" : "default"} onClick={() => setOpen("all")}>{s.month <= 2 ? "Choose your team" : "Reshuffle"}</Button>}>
      {s.month <= 2 && <div className="g-small" style={{ marginBottom: 8, color: "#046c43" }}><b>Free reshuffle until {s.month <= 2 ? "your third month" : ""}.</b> You inherited party loyalists. Swap in skilled technocrats, or keep loyalists to hold the party together.</div>}
      {vac.length > 0 && <div className="g-small" style={{ marginBottom: 8, color: "#9f1239" }}><b>Vacant:</b> {vac.map((v) => v.title).join(", ")}. Vacant posts drag down their area.</div>}
      <div className="g-col" style={{ gap: 0 }}>
        {PORTFOLIOS.map((p) => {
          const m = s.cabinet.members[p.id];
          return (
            <button key={p.id} className="g-list-row" style={{ background: "none", border: 0, width: "100%", textAlign: "left" }} onClick={() => setOpen(p.id)}>
              {m ? <Initials name={m.name.split(" ").slice(1).join(" ")} size={34} color={FACTION_COLOR[m.faction]} /> : <span style={{ width: 34, height: 34, borderRadius: 99, border: "2px dashed #fda4af", display: "inline-block" }} />}
              <span className="g-grow"><span className="g-tiny g-muted" style={{ display: "block" }}>{p.title}</span><b className="g-small">{m ? m.name : "Vacant"}</b></span>
              {m && <span className="g-tiny g-muted" style={{ textAlign: "right" }}>skill {m.skill}<br />{m.mood < 30 ? <span style={{ color: "#be123c", fontWeight: 700 }}>unhappy</span> : `mood ${Math.round(m.mood)}`}</span>}
            </button>
          );
        })}
      </div>
      {open && <CabinetModal start={open} onClose={() => setOpen(null)} />}
    </Card>
  );
}

function CabinetModal({ start, onClose }: { start: Portfolio | "all"; onClose: () => void }) {
  const s = useS();
  const { act } = useFix();
  const [p, setP] = useState<Portfolio>(start === "all" ? (vacancies(s)[0]?.id ?? "finance") : start);
  const cur = s.cabinet.members[p];
  const cands = s.cabinet.pool.filter((m) => m.portfolio === p);
  const free = s.month <= 2;
  return (
    <Modal title="Cabinet" wide onClose={onClose} footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
      <div className="g-row g-wrap g-chip-row" style={{ gap: 6 }} role="group" aria-label="Portfolio">
        {PORTFOLIOS.map((x) => <button key={x.id} className="g-chip" aria-pressed={p === x.id} onClick={() => setP(x.id)}>{x.title}{!s.cabinet.members[x.id] ? " (vacant)" : ""}</button>)}
      </div>
      <div className="g-small g-muted">{PORTFOLIO_BY_ID[p].area}. {free ? "Changes are free during your first three months." : "Each reshuffle costs a little trust; sacking a loyalist strengthens the opposition, sacking a heavyweight angers their zone."}</div>
      <div className="g-section-title">In office</div>
      {cur ? <>
        <MinisterRow m={cur} inOffice action={<div className="g-col" style={{ gap: 4 }}><Button size="sm" variant="ghost" disabled={cur.warned !== undefined} title="Tell him: you are here to work, not to eat" onClick={() => act((x) => warnMinister(x, p))}>{cur.warned !== undefined ? "Warned" : `Warn ⚡${PC_COST.warn}`}</Button><Button size="sm" variant="ghost" onClick={() => act((x) => sack(x, p))}>Sack</Button></div>} />
        {cur.warned === undefined && <div className="g-tiny g-muted">"Warn" tells him: <i>you are here to work, not to eat; steal and you answer for it.</i> He steals less, but if he steals anyway and you do nothing, every minister learns your warnings mean nothing. Your own people will resent it.</div>}
        <Chips chips={chips(ministerEffects(cur, p))} label="Effect" />
      </> : <div className="g-small" style={{ color: "#9f1239" }}>Vacant. Their area suffers until you appoint someone.</div>}
      <div className="g-section-title" style={{ marginTop: 6 }}>Available</div>
      <div className="g-col" style={{ gap: 12 }}>
        {cands.map((m) => (
          <div key={m.id} className="g-card-flat g-col" style={{ gap: 6 }}>
            <MinisterRow m={m} action={<Button size="sm" variant="primary" onClick={() => act((x) => appoint(x, p, m.id))}>Appoint</Button>} />
            <Chips chips={chips(ministerEffects(m, p))} label="Would" />
            <div className="g-tiny g-muted">{FACTION_LABEL[m.faction].blurb}{m.integrity < 45 ? " Low honesty: expect leaks and a risk of scandal." : ""}</div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
