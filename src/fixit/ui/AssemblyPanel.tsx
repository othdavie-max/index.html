"use client";
/** The National Assembly as a hemicycle: tap a seat to open a lawmaker's dossier and deal with them. */
import { useState } from "react";
import { PC_COST } from "../engine/meta";
import { useFix, useS } from "./store";
import { Badge, Bar, Button, Callout, Portrait } from "../../game/ui/kit";
import { STATE_BY_ID } from "../../game/data/states";
import { LM_ACTIONS, STATUS_LABEL, lawmakerAction, lmActionBlock, relationLabel, sitting } from "../engine/power";
import { nb } from "../engine/util";
import { sfx } from "./sound";
import type { Lawmaker } from "../engine/types";

const loyaltyColor = (v: number) => (v >= 70 ? "#16a34a" : v >= 55 ? "#84cc16" : v >= 40 ? "#facc15" : v >= 25 ? "#fb923c" : "#dc2626");
const STATUS_GLYPH: Record<string, string> = { exposed: "!", controlled: "★", protected: "◆" };

function seatsFor(list: Lawmaker[], radius: number, cx: number, cy: number) {
  return list.map((lm, i) => {
    const a = Math.PI - (Math.PI * (i + 0.5)) / list.length;
    return { lm, x: cx + radius * Math.cos(a), y: cy - radius * Math.sin(a) };
  });
}

export function Hemicycle({ selected, onPick }: { selected: string | null; onPick: (id: string) => void }) {
  const s = useS();
  const alive = sitting(s);
  const sen = seatsFor(alive.filter((l) => l.chamber === "senate"), 86, 150, 150);
  const rep = seatsFor(alive.filter((l) => l.chamber === "reps"), 132, 150, 150);
  return (
    <svg viewBox="0 0 300 172" role="group" aria-label="Seats of the National Assembly. Choose a lawmaker." style={{ width: "100%", maxHeight: 280 }}>
      {[...sen, ...rep].map(({ lm, x, y }) => (
        <g key={lm.id} transform={`translate(${x},${y})`} tabIndex={0} role="button" aria-label={`${lm.name}, ${lm.party}, ${relationLabel(lm)}, ${STATUS_LABEL[lm.status]}`} style={{ cursor: "pointer", outline: "none" }}
          onClick={() => { sfx("tap"); onPick(lm.id); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(lm.id); } }}>
          <circle r={selected === lm.id ? 11 : 9} fill={loyaltyColor(lm.loyalty)} stroke={lm.party === "NPP" ? "#047857" : "#b91c1c"} strokeWidth={selected === lm.id ? 3.4 : 2.4} />
          {STATUS_GLYPH[lm.status] && <text textAnchor="middle" y={3.8} fontSize={10} fontWeight={800} fill="#0b1f36">{STATUS_GLYPH[lm.status]}</text>}
          <title>{`${lm.name} (${lm.party}) · ${relationLabel(lm)}`}</title>
        </g>
      ))}
      <text x={150} y={150} textAnchor="middle" fontSize={11} fontWeight={800} fill="#0b1f36">NATIONAL ASSEMBLY</text>
      <text x={150} y={163} textAnchor="middle" fontSize={8.5} fill="#475569">{alive.length} seats · your support {Math.round(s.assembly.support)}%</text>
    </svg>
  );
}

function Dossier({ lm }: { lm: Lawmaker }) {
  const s = useS();
  const { act, toast } = useFix();
  const st = STATE_BY_ID[lm.stateId];
  const known = lm.evidence >= 40;
  return (
    <div className="g-card-flat g-col" style={{ gap: 10 }}>
      <div className="g-row" style={{ gap: 12, alignItems: "flex-start" }}>
        <Portrait p={lm.portrait} size={56} name={lm.name} />
        <div className="g-grow">
          <div style={{ fontWeight: 800 }}>{lm.name}</div>
          <div className="g-small g-muted">{lm.chamber === "senate" ? "Senator" : "House of Reps"} for {st?.name ?? lm.stateId} · {lm.trait}</div>
          <div className="g-row g-wrap" style={{ gap: 6, marginTop: 4 }}>
            <Badge tone={lm.party === "NPP" ? "green" : "red"}>{lm.party}</Badge>
            <Badge tone={lm.loyalty >= 55 ? "green" : lm.loyalty < 38 ? "red" : "amber"}>{relationLabel(lm)}</Badge>
            {lm.status !== "active" && <Badge tone="navy">{STATUS_LABEL[lm.status]}</Badge>}
          </div>
        </div>
      </div>
      <div className="g-col" style={{ gap: 6 }}>
        <div><div className="g-row g-between g-tiny"><span>Loyalty to you</span><b>{Math.round(lm.loyalty)}</b></div><Bar value={lm.loyalty / 100} tone={lm.loyalty < 38 ? "red" : lm.loyalty < 55 ? "amber" : undefined} label={`Loyalty ${Math.round(lm.loyalty)}`} /></div>
        <div><div className="g-row g-between g-tiny"><span>Proof you hold</span><b>{Math.round(lm.evidence)}/100</b></div><Bar value={lm.evidence / 100} tone="blue" label={`Proof ${Math.round(lm.evidence)}`} /></div>
        <div className="g-small">{known ? (lm.stolen > 5 ? <>Your file shows about <b>{nb(lm.stolen)}</b> missing.</> : "Your file shows nothing worth prosecuting.") : lm.evidence > 0 ? "A few leads, nothing solid yet." : "You know little about their finances. Investigate to find out."}</div>
      </div>
      <div className="g-col" style={{ gap: 6 }}>
        {LM_ACTIONS.map((a) => {
          const block = lmActionBlock(s, lm, a);
          return (
            <div key={a.id} className="g-row" style={{ gap: 8 }}>
              <div className="g-grow"><b className="g-small">{a.label}</b>{a.cost > 0 && <span className="g-tiny g-muted"> · {nb(a.cost)}</span>}<div className="g-tiny g-muted">{block ?? a.explain}</div></div>
              <Button size="sm" variant={a.id === "arrest" || a.id === "expose" ? "danger" : "default"} disabled={!!block} onClick={() => { const r = act((x) => lawmakerAction(x, lm.id, a.id)); sfx(r.ok ? (a.id === "arrest" ? "gavel" : "good") : "bad"); if (!r.ok) toast(r.message, true); }}>Do it ⚡{PC_COST.lawmaker}</Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AssemblyPanel() {
  const s = useS();
  const [pick, setPick] = useState<string | null>(null);
  const lm = pick ? s.lawmakers.find((l) => l.id === pick) : null;
  const jailed = s.lawmakers.filter((l) => l.status === "jailed").length;
  const gone = s.lawmakers.filter((l) => l.status === "executed").length;
  const mine = sitting(s).filter((l) => l.loyalty >= 55).length;
  return (
    <div className="g-col" style={{ gap: 12 }}>
      <Hemicycle selected={pick} onPick={setPick} />
      <div className="fx-legend"><span><span className="fx-dot" style={{ background: "#16a34a" }} /> Devoted</span><span><span className="fx-dot" style={{ background: "#facc15" }} /> Wavering</span><span><span className="fx-dot" style={{ background: "#dc2626" }} /> Hostile</span><span>Ring: green NPP (yours), red PRA</span><span>★ yours · ◆ protected · ! exposed</span></div>
      <div className="g-small">{mine} of {sitting(s).length} lawmakers are friendly. {jailed ? `${jailed} jailed. ` : ""}{gone ? `${gone} executed. ` : ""}Corruption among lawmakers raises when laws are weak.</div>
      {lm ? <Dossier lm={lm} /> : <Callout>Tap any seat to see who sits there. Lawmakers steal public money; the stronger your anti-corruption law, the less they dare. Their votes decide your bills.</Callout>}
    </div>
  );
}
