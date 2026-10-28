"use client";
import { useState } from "react";
/** Foreign relations, your party, and the first family. */
import { useFix, useS } from "./store";
import { SECTORS, leakage, programmeOn, sectorStats, toggleProgramme } from "../engine/sectors";
import { Button } from "../../game/ui/kit";
import { chips } from "../engine/forecast";
import { Chips } from "./parts";
import { nb } from "../engine/util";
import { Badge, Bar, Callout, Card, EmptyState, Portrait } from "../../game/ui/kit";
import { PARTNERS, relWord } from "../engine/foreign";
import { FACTIONS } from "../engine/party";
import { monthLabel } from "../engine/util";
import { AIDE_KINDS } from "../engine/dayone";
import { PRODUCTS, TRADE_PARTNERS, dealBlock, dealsOf, signDeal, startVisit, visitCooldown, PRODUCT_BY_ID, TP_BY_ID } from "../engine/trade";

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
      <TradeCard />
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

export function SectorsPanel() {
  const s = useS();
  const { act } = useFix();
  const lk = leakage(s);
  return (
    <div className="g-col" style={{ gap: 12 }}>
      <Callout tone="info">Four sectors you can steer. Switch on programmes that suit your plan. They cost money every month and take months to work. {lk < 0.8 ? <b>Corruption and weak capacity are leaking about {Math.round((1 - lk) * 100)}% of their benefit.</b> : "Government is capable enough that most of the benefit arrives."}</Callout>
      {SECTORS.map((sec) => (
        <Card key={sec.id} title={`${sec.icon} ${sec.name}`}>
          <div className="g-row g-wrap" style={{ gap: 14, marginBottom: 8 }}>{sectorStats(s, sec.id).map((x) => <div key={x.label}><div className="g-tiny g-muted">{x.label}</div><b style={{ color: x.good ? "#047857" : "#b45309" }}>{x.value}</b></div>)}</div>
          <div className="g-col" style={{ gap: 8 }}>
            {sec.programmes.map((p) => {
              const on = programmeOn(s, sec.id, p.id);
              return (
                <div key={p.id} className="fx-rung" data-state={on ? "done" : "tool"}>
                  <div className="g-grow"><b>{p.name}</b> <span className="g-tiny g-muted">· {nb(p.cost)} a month</span><div className="g-tiny g-muted">{p.blurb}</div><Chips chips={chips(p.effects, 4)} label="Effect" /></div>
                  <Button size="sm" variant={on ? "default" : "primary"} onClick={() => act((x) => toggleProgramme(x, sec.id, p.id))}>{on ? "Switch off" : "Switch on"}</Button>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}

function TradeCard() {
  const s = useS();
  const { act } = useFix();
  const [partner, setPartner] = useState("china");
  const deals = dealsOf(s);
  return (
    <Card title="🚢 Trade and visits">
      <div className="g-col" style={{ gap: 10 }}>
        <div className="g-small g-muted">What you can sell depends on what you have built: mills, hubs, plants, studios. Every partner wants something in return. Sign deals, or go in person.</div>
        <div className="g-row g-wrap" style={{ gap: 6 }} role="group" aria-label="Trading partner">{TRADE_PARTNERS.map((p) => <button key={p.id} className="fx-subtab" aria-pressed={partner === p.id} onClick={() => setPartner(p.id)}>{p.icon} {p.name} · {Math.round(p.warm(s))}</button>)}</div>
        <div className="g-tiny g-muted">{TP_BY_ID[partner].strings}</div>
        <div className="fx-trade">
          {PRODUCTS.map((pr) => { const block = dealBlock(s, partner, pr.id); const cap = pr.cap(s); const has = deals.find((d) => d.partner === partner && d.product === pr.id);
            return (
              <div key={pr.id} className="fx-trade-row" data-on={has ? "1" : undefined}>
                <span aria-hidden style={{ fontSize: 22 }}>{pr.icon}</span>
                <span className="g-grow"><b className="g-small">{pr.name}</b><span className="g-tiny g-muted" style={{ display: "block" }}>{cap > 0 ? `You can supply about ${Math.round(cap * 100)}% of a full deal.` : pr.blurb}</span></span>
                {has ? <span className="g-tiny" style={{ color: has.suspended ? "#be123c" : "#047857", fontWeight: 800 }}>{has.suspended ? "Suspended" : "Deal in force"}</span> : <Button size="sm" variant="primary" disabled={!!block} title={block ?? undefined} onClick={() => act((x) => signDeal(x, partner, pr.id))}>Sign ⚡6</Button>}
              </div>
            ); })}
        </div>
        <div className="g-row g-between g-wrap"><span className="g-small">{deals.filter((d) => !d.suspended).length} deal{deals.filter((d) => !d.suspended).length === 1 ? "" : "s"} running ({deals.map((d) => `${PRODUCT_BY_ID[d.product].icon}${TP_BY_ID[d.partner].icon}`).join(" ") || "none yet"})</span>
          <Button size="sm" disabled={visitCooldown(s, partner) > 0} onClick={() => act((x) => startVisit(x, partner))}>{visitCooldown(s, partner) > 0 ? `Visit again in ${visitCooldown(s, partner)} months` : `State visit to ${TP_BY_ID[partner].name} ⚡5`}</Button></div>
      </div>
    </Card>
  );
}
