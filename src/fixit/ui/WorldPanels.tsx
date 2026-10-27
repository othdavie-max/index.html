"use client";
/** Foreign relations, your party, and the first family. */
import { useS } from "./store";
import { Badge, Bar, Callout, Card, EmptyState, Portrait } from "../../game/ui/kit";
import { PARTNERS, relWord } from "../engine/foreign";
import { FACTIONS } from "../engine/party";
import { monthLabel } from "../engine/util";
import { AIDE_KINDS } from "../engine/dayone";

export function ForeignPanel() {
  const s = useS();
  const F = s.foreign;
  return (
    <div className="g-col" style={{ gap: 12 }}>
      <Callout tone="info">Everyone abroad wants something. Relations move with what you do at home: executions, rigged elections and clinging to power cost you friends; honest books and a stable country win them.</Callout>
      {PARTNERS.map((p) => {
        const v = F.rel[p.id];
        return (
          <Card key={p.id}>
            <div className="g-row g-between g-wrap"><b>{p.icon} {p.name}</b><Badge tone={v >= 55 ? "green" : v < 35 ? "red" : "amber"}>{relWord(v)} · {Math.round(v)}</Badge></div>
            <Bar value={v / 100} tone={v < 35 ? "red" : v < 50 ? "amber" : undefined} label={`${p.name} relationship ${Math.round(v)}`} />
            <div className="g-small g-muted" style={{ marginTop: 4 }}>{p.blurb}</div>
            {p.id === "imf" && F.imf && <div className="g-small" style={{ marginTop: 4 }}><b>Programme:</b> {F.imf.suspended ? "SUSPENDED" : `running since ${monthLabel(F.imf.since)} · ${F.imf.tranches} tranches paid`}. Conditions: a floating naira (defence at most light) and the fuel subsidy gone after a year. {!F.imf.suspended && F.imf.breach > 0 ? <b style={{ color: "#b91c1c" }}>Warning: you are breaching them ({F.imf.breach}/3).</b> : null}</div>}
            {p.id === "china" && F.china && <div className="g-small" style={{ marginTop: 4 }}><b>Rail-for-oil deal</b> since {monthLabel(F.china.since)}: a railway and port are rising, and part of oil revenue is pledged for years.</div>}
            {p.id === "usa" && F.usaAid && <div className="g-small" style={{ marginTop: 4 }}><b>Security assistance</b> since {monthLabel(F.usaAid.since)}: {F.usaAid.suspended ? "SUSPENDED over human rights." : "active. It ends if you execute people, rig an election or abandon democracy."}</div>}
          </Card>
        );
      })}
      <Card title="Diplomatic log">
        {F.log.length === 0 ? <EmptyState title="Nothing yet" body="Offers arrive when the time is right: an IMF rescue when reserves are thin, a Chinese rail deal, American security help." /> : <div className="g-col" style={{ gap: 6 }}>{[...F.log].reverse().map((l, i) => <div key={i} className="g-small"><span className="g-tiny g-muted">{monthLabel(l.month)}</span> {l.text}</div>)}</div>}
      </Card>
    </div>
  );
}

export function PartyPanel() {
  const s = useS();
  const P = s.party, vp = s.staff.vp;
  return (
    <div className="g-col" style={{ gap: 12 }}>
      <Card title="Your party: four factions">
        <div className="g-col" style={{ gap: 10 }}>
          {FACTIONS.map((f) => (
            <div key={f.id}><div className="g-row g-between g-small"><b>{f.label}</b><span className="g-muted">{Math.round(P[f.id])}/100 · {P[f.id] >= 60 ? "behind you" : P[f.id] >= 40 ? "watching" : "restless"}</span></div><Bar value={P[f.id] / 100} tone={P[f.id] < 35 ? "red" : P[f.id] < 50 ? "amber" : undefined} label={`${f.label} ${Math.round(P[f.id])}`} /><div className="g-tiny g-muted">Wants {f.wants}.</div></div>
          ))}
        </div>
        <div className="g-tiny g-muted" style={{ marginTop: 8 }}>Heavyweight ministers and friendly governors please the regional blocs; a clean image pleases the youth; loyalists and happy backers please the old guard. A restless faction brings demands, and a split party hurts you at the primary.</div>
      </Card>
      <Card title="Your vice president">
        {vp ? (
          <div className="g-col" style={{ gap: 8 }}>
            <div className="g-row" style={{ gap: 12 }}><Portrait p={vp.portrait} size={48} name={vp.name} /><div className="g-grow"><b>{vp.name}</b><div className="g-tiny g-muted">{AIDE_KINDS[vp.kind].icon} {AIDE_KINDS[vp.kind].tag}</div></div></div>
            <div><div className="g-row g-between g-small"><span>Ambition</span><b>{Math.round(P.vpAmbition)}</b></div><Bar value={P.vpAmbition / 100} tone={P.vpAmbition >= 70 ? "red" : P.vpAmbition >= 50 ? "amber" : undefined} label={`VP ambition ${Math.round(P.vpAmbition)}`} /></div>
            <div><div className="g-row g-between g-small"><span>Loyalty to you</span><b>{Math.round(vp.loyalty)}</b></div><Bar value={vp.loyalty / 100} tone={vp.loyalty < 40 ? "red" : undefined} label={`VP loyalty ${Math.round(vp.loyalty)}`} /></div>
            <div className="g-tiny g-muted">Ambition grows every month, faster in later terms and if you sideline him or fall ill. When it is high and his loyalty is low, he will leave and join your rivals.</div>
          </div>
        ) : <div className="g-small g-muted">You have no vice president. {P.vpStage === 2 ? "He resigned and now works against you." : ""}</div>}
      </Card>
    </div>
  );
}

export function FirstFamilyCard() {
  const s = useS();
  const H = s.home;
  return (
    <Card title="Your family and your health" icon={<span aria-hidden>🏠</span>}>
      <div className="g-row" style={{ gap: 12 }}>
        <Portrait p={H.spouse.portrait} size={48} name={H.spouse.name} />
        <div className="g-grow"><b>{H.spouse.name}</b><div className="g-tiny g-muted">Spouse · {H.kids} children</div>
          <div className="g-row g-between g-small" style={{ marginTop: 4 }}><span>Your health</span><b>{Math.round(H.health)}</b></div><Bar value={H.health / 100} tone={H.health < 50 ? "red" : H.health < 70 ? "amber" : undefined} label={`Your health ${Math.round(H.health)}`} />
        </div>
      </div>
      {H.illness && <div className="g-small" style={{ marginTop: 6, color: "#9f1239" }}>{H.illness.acting ? "You are being treated abroad; the VP is acting president." : H.illness.hidden ? "You are seriously ill and hiding it. It will leak." : "You are recovering from a serious illness."}</div>}
      {H.abroad > 0 && <div className="g-small" style={{ marginTop: 4 }}>About ₦{Math.round(H.abroad).toLocaleString()}m held abroad. If it leaks, so does your reputation.</div>}
    </Card>
  );
}
