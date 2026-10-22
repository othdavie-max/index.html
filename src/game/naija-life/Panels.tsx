"use client";

import { ADVISOR_TIERS, advisorBlock, advisorFee } from "./markets";
import { useState } from "react";
import { Avatar } from "./Avatar";
import type { Action } from "./engine";
import { BET_KINDS, betBlock, betProfit } from "./betting";
import { BIZ_KINDS, BIZ_BY_ID, PRICE_LABEL, STOCK_LABEL, hireCost, startBlock, startCostFor, upgradeCost, valuation, workerPay } from "./business";
import { CRIMES, crimeBlock } from "./crime";
import { HOME_TIERS, HOUSE_KINDS, STATE_BY_ID } from "./data";
import { mortgageBalance, mortgageQuote } from "./mortgage";
import { SUPPORT_KINDS, defaultAmount, supportKindsFor, capacityOf, type SupportKind } from "./family";
import { FACILITIES, TEMPLATES, facilitiesFor, treatmentCost } from "./health";
import { GROWTH_ACTIVITIES, SKILLS, TRADES, tradeBlock, enlistBlock, gymBlock, growthBlock, learnBlock, skillLevel } from "./life";
import { activeOwed, activeOwedToMe, lenderOffers, loanBlock, previewLoan, receivables, totalDebt } from "./loans";
import { summaries } from "./ledger";
import { monthlySummary, upcomingPayments } from "./notices";
import { POSTGRAD, postgradBlock } from "./education";
import { developBlock, developCost, developOptions, listingBlock, planQuote } from "./property";
import { TIER_LABEL, locationOf, marketMid } from "./locations";
import { STAGE_LABEL, activePartners, adoptBlock, dateCost, datingAllowed, divorceBlock, fertilityBlock, intimacyBlock, relHint } from "./relationships";
import { CONTENT, PLATFORMS, postBlock, socialBlock, totalFollowers } from "./social";
import { VEHICLE_MODELS, licenseBlock, licenseCost, modelOf, needsLicense, priceOf, repairCost, isInsured } from "./vehicles";
import { VehicleArt } from "./VehicleArt";
import { beneficiaries, currentShares, totalPct } from "./will";
import type { Business, Candidate, Npc, PartnerRel, Platform, Player, StateInfo } from "./types";
import { Badge, Bar, Btn, Card, H, Sheet, cx } from "./ui";
import { riskLabel, transportOptions } from "./travel";
import { PRISON_OPS, appealCost, prisonBlockOp } from "./prison";
import { T, naira } from "./util";

type Run = (a: Action) => void;
const I = (p: Player, n: number) => Math.round(n * Math.pow(p.index, 0.92));

const lookStr = (n: Npc): string => [n.look.skin, n.look.hair, n.look.hairColor, n.look.beard, n.look.wear, n.look.outfit, n.look.outfitColor].join("|");
void lookStr;

function Face({ n, p, size = 56 }: { n: Npc; p: Player; size?: number }) {
  return <Avatar look={n.look} gender={n.gender} age={Math.max(0, p.age + n.ageDelta)} size={size} dim={!n.alive} />;
}

// ---------------------------------------------------------------------------
// Phone: Wallet, Spark, Social, Betting
// ---------------------------------------------------------------------------
type PhoneApp = "home" | "wallet" | "spark" | "social" | "bet";

export function PhoneTab({ p, run }: { p: Player; run: Run }) {
  const [app, setApp] = useState<PhoneApp>("home");
  const has = p.possessions.phone || p.possessions.smartphone;
  if (!has) {
    return (
      <Card>
        <H sub={T("Loans, dating, social media and betting all need a phone.", "Loan, dating, social media and betting all need phone.")}>{T("No phone yet", "You never get phone")}</H>
        <p className="text-sm text-slate-600">{p.age < 11 ? T("You are too young for your own phone. Maybe a parent will buy you one.", "You still small to get your own phone. Maybe your parent go buy one for you.") : T("Buy one, or ask your parents in the Family tab.", "Buy one, or ask your parents for Family tab.")}</p>
        {p.age >= 11 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn small tone="ghost" disabled={p.money < I(p, 25_000)} onClick={() => run({ t: "buy", item: "phone" })}>{T("Basic phone", "Basic phone")} ({naira(I(p, 25_000))})</Btn>
            <Btn small tone="gold" disabled={p.money < I(p, 180_000)} onClick={() => run({ t: "buy", item: "smartphone" })}>{T("Smartphone", "Smartphone")} ({naira(I(p, 180_000))})</Btn>
          </div>
        )}
      </Card>
    );
  }
  const apps: { id: PhoneApp; label: string; sub: string }[] = [
    { id: "wallet", label: T("Wallet", "Wallet"), sub: T("Loans and balance", "Loan and balance") },
    { id: "spark", label: "Spark", sub: T("Dating app", "Dating app") },
    { id: "social", label: "Gram / TokTik", sub: T("Social media", "Social media") },
    { id: "bet", label: "Naija9ja Bet", sub: T("Sports betting", "Sports betting") },
  ];
  if (app === "home") {
    return (
      <Card>
        <H sub={p.possessions.smartphone ? T("Smartphone", "Smartphone") : T("Basic phone: upgrade for social apps", "Basic phone: upgrade for social apps")}>{T("Your phone", "Your phone")}</H>
        <div className="grid grid-cols-2 gap-2">
          {apps.map((a) => (
            <button key={a.id} type="button" onClick={() => setApp(a.id)} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:bg-slate-100">
              <span className="block text-sm font-semibold">{a.label}</span>
              <span className="block text-[11px] text-slate-500">{a.sub}</span>
            </button>
          ))}
        </div>
        {!p.possessions.smartphone && <Btn small tone="gold" className="mt-3" disabled={p.money < I(p, 180_000)} onClick={() => run({ t: "buy", item: "smartphone" })}>{T("Upgrade to smartphone", "Upgrade to smartphone")} ({naira(I(p, 180_000))})</Btn>}
      </Card>
    );
  }
  return (
    <>
      <button type="button" className="text-xs text-blue-600" onClick={() => setApp("home")}>{T("← Back to phone", "← Go back to phone")}</button>
      {app === "wallet" && <Wallet p={p} run={run} />}
      {app === "spark" && <Spark p={p} run={run} />}
      {app === "social" && <Social p={p} run={run} />}
      {app === "bet" && <Betting p={p} run={run} />}
    </>
  );
}

function Wallet({ p, run }: { p: Player; run: Run }) {
  const offers = lenderOffers(p);
  const [sel, setSel] = useState<string | null>(null);
  const [frac, setFrac] = useState(0.5);
  const [term, setTerm] = useState<number | null>(null);
  const offer = offers.find((o) => o.id === sel);
  const amount = offer ? Math.max(1_000, Math.round((offer.limit * frac) / 1_000) * 1_000) : 0;
  const t = offer ? Math.min(Math.max(term ?? offer.minTerm, offer.minTerm), offer.maxTerm) : 0;
  const prev = offer ? previewLoan(p, offer, amount, t) : null;
  const block = offer ? loanBlock(p, offer, amount) : null;
  const mine = activeOwed(p);
  return (
    <>
      <Card>
        <H sub={T(`Credit score ${Math.round(p.credit)} · Total debt ${naira(totalDebt(p))}`, `Credit score ${Math.round(p.credit)} · Total debt ${naira(totalDebt(p))}`)}>{T("Wallet", "Wallet")}</H>
        <div className="text-2xl font-bold text-blue-600">{naira(p.money)}</div>
        <div className="mt-2"><Bar label={T("Credit score", "Credit score")} value={p.credit} /></div>
      </Card>
      <Card>
        <H sub={T("Read the terms before you accept. Late payment hurts your credit.", "Read the terms before you accept. Late payment go spoil your credit.")}>{T("Loan offers", "Loan offers")}</H>
        <div className="space-y-2">
          {offers.map((o) => (
            <div key={o.id} className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{o.name}</div>
                  <div className="text-[11px] text-slate-500">{o.blurb}</div>
                </div>
                <Badge tone={o.eligible ? "red" : "green"}>{o.eligible ?? T(`up to ${naira(o.limit)}`, `reach ${naira(o.limit)}`)}</Badge>
              </div>
              {!o.eligible && <Btn small tone="ghost" className="mt-2" onClick={() => { setSel(o.id); setTerm(o.minTerm); }}>{sel === o.id ? T("Selected", "Selected") : T("See terms", "See terms")}</Btn>}
            </div>
          ))}
        </div>
      </Card>
      {offer && prev && (
        <Card className="border-blue-500">
          <H>{offer.name} {T("terms", "terms")}</H>
          <div className="flex gap-1.5">
            {[0.25, 0.5, 1].map((f) => <Btn key={f} small tone={frac === f ? "gold" : "ghost"} onClick={() => setFrac(f)}>{f * 100}%</Btn>)}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            {T("Term (months)", "Term (months)")}:
            {Array.from({ length: offer.maxTerm - offer.minTerm + 1 }, (_, i) => offer.minTerm + i).filter((m) => offer.maxTerm - offer.minTerm < 8 || m % 3 === 0 || m === offer.minTerm).map((m) => (
              <Btn key={m} small tone={t === m ? "gold" : "ghost"} onClick={() => setTerm(m)}>{m}</Btn>
            ))}
          </div>
          <dl className="mt-3 space-y-1 text-sm">
            <Row k={T("You borrow", "You borrow")} v={naira(prev.principal)} />
            <Row k={T("Fee taken upfront", "Fee wey dem collect first")} v={naira(prev.fee)} />
            <Row k={T("You receive", "You go collect")} v={naira(prev.net)} />
            <Row k={T("Monthly repayment", "Monthly repayment")} v={naira(prev.monthly)} />
            <Row k={T("Total you repay", "Total wey you go pay")} v={naira(prev.total)} />
            <Row k={T("Interest cost", "Interest cost")} v={naira(prev.interest)} bad />
            <Row k={T("First payment", "First payment")} v={prev.firstDue} />
            <Row k={T("Late fee", "Late fee")} v={T(`${(offer.lateFeePct * 100).toFixed(0)}% of the instalment`, `${(offer.lateFeePct * 100).toFixed(0)}% of the instalment`)} />
          </dl>
          <Btn className="mt-3 w-full" tone="gold" disabled={Boolean(block)} onClick={() => { run({ t: "loanTake", offer: offer.id, amount, term: t }); setSel(null); }}>
            {block ?? T("Accept and take the loan", "Accept and take loan")}
          </Btn>
        </Card>
      )}
      {mine.length > 0 && (
        <Card>
          <H>{T("What you owe", "Wetin you owe")}</H>
          <div className="space-y-2">
            {mine.map((l) => (
              <div key={l.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex justify-between"><span className="font-semibold">{l.lenderName}</span><span className="text-red-600">{naira(l.balance)}</span></div>
                <div className="text-[11px] text-slate-500">
                  {l.informal ? T(`Due month ${l.dueIndex ? ((l.dueIndex - 1) % 12) + 1 : "?"} of age ${l.dueIndex ? Math.floor((l.dueIndex - 1) / 12) : "?"}`, `Due month ${l.dueIndex ? ((l.dueIndex - 1) % 12) + 1 : "?"} of age ${l.dueIndex ? Math.floor((l.dueIndex - 1) / 12) : "?"}`) : T(`${naira(l.monthly)}/month`, `${naira(l.monthly)}/month`)}
                  {l.missed > 0 ? T(` · ${l.missed} missed`, ` · ${l.missed} you no pay`) : ""}
                </div>
                <div className="mt-2 flex gap-1.5">
                  <Btn small tone="ghost" disabled={p.money < Math.min(l.balance, l.monthly || l.balance)} onClick={() => run({ t: "loanRepay", id: l.id, amount: l.informal ? l.balance : l.monthly })}>{l.informal ? T("Pay in full", "Pay am finish") : T("Pay instalment", "Pay instalment")}</Btn>
                  {!l.informal && <Btn small tone="ghost" disabled={p.money < l.balance} onClick={() => run({ t: "loanRepay", id: l.id, amount: l.balance })}>{T("Settle", "Clear am")} ({naira(l.balance)})</Btn>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function Row({ k, v, bad }: { k: string; v: string; bad?: boolean }) {
  return <div className="flex justify-between"><dt className="text-slate-500">{k}</dt><dd className={cx("font-semibold", bad && "text-red-600")}>{v}</dd></div>;
}

function Spark({ p, run }: { p: Player; run: Run }) {
  const d = p.rel;
  const blocked = datingAllowed(p);
  const partners = activePartners(p);
  const [bio, setBio] = useState("");
  if (blocked) return <Card><H>Spark</H><p className="text-sm text-slate-600">{blocked}</p></Card>;
  return (
    <>
      {!d.profile ? (
        <Card>
          <H sub={T("Make a profile to see who is around.", "Make profile to see who dey around.")}>{T("Create your Spark profile", "Create your Spark profile")}</H>
          <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder={T("Short bio", "Short bio")} maxLength={80} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
          <Btn className="mt-3" onClick={() => run({ t: "dating", op: "profile", bio: bio || T("Just here for good vibes.", "I just dey here for good vibes."), interests: ["music", "food", "travel"] })}>{T("Create profile", "Create profile")}</Btn>
        </Card>
      ) : (
        <Card>
          <H sub={T(`${d.swipesLeft} swipes · ${d.chatsLeft} chats left this year`, `${d.swipesLeft} swipes · ${d.chatsLeft} chats remain this year`)}>{T("Discover", "Discover")}</H>
          {d.deck.length === 0 ? (
            <Btn small onClick={() => run({ t: "dating", op: "swipe" })}>{T("Refresh deck", "Refresh deck")}</Btn>
          ) : (
            <CandidateCard p={p} c={d.deck[0]} run={run} />
          )}
        </Card>
      )}
      {partners.length > 0 && (
        <Card>
          <H>{T("Matches and partners", "Matches and partners")}</H>
          <div className="space-y-2">{partners.map(({ rel, npc }) => <PartnerRow key={npc.id} p={p} rel={rel} npc={npc} run={run} />)}</div>
        </Card>
      )}
    </>
  );
}

function Thread({ rel }: { rel: PartnerRel }) {
  const msgs = (rel.messages ?? []).slice(-10);
  if (msgs.length === 0) return <p className="text-[11px] text-slate-400">{T("No messages yet. Say hello.", "No message yet. Greet am.")}</p>;
  return (
    <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-xl bg-slate-100 p-2">
      {msgs.map((m, i) =>
        m.from === "note" ? (
          <p key={i} className="text-center text-[10px] italic text-slate-400">{m.text} · {T("age", "age")} {m.age}</p>
        ) : (
          <div key={i} className={cx("flex", m.from === "me" ? "justify-end" : "justify-start")}>
            <span className={cx("max-w-[80%] rounded-2xl px-3 py-1.5 text-xs", m.from === "me" ? "bg-[#1f9d55] text-slate-900" : "bg-slate-100 text-slate-800")}>{m.text}</span>
          </div>
        ),
      )}
    </div>
  );
}

function PartnerRow({ p, rel, npc, run }: { p: Player; rel: PartnerRel; npc: Npc; run: Run }) {
  const [open, setOpen] = useState(false);
  const b = intimacyBlock(p, npc.id);
  const committed = ["exclusive", "engaged", "married"].includes(rel.stage);
  const canKids = p.gender !== npc.gender;
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-3">
        <Face n={npc} p={p} />
        <div className="flex-1">
          <div className="text-sm font-semibold">{npc.name}</div>
          <div className="text-[11px] text-slate-500">{STAGE_LABEL[rel.stage]}{rel.livingTogether ? T(" · living together", " · una dey live together") : ""} · {npc.occupation}</div>
          <div className="mt-1 grid grid-cols-3 gap-1.5"><Bar label={T("Love", "Love")} value={rel.affection} tone="gold" /><Bar label={T("Trust", "Trust")} value={rel.trust} tone="blue" /><Bar label={T("Satisf.", "Satisf.")} value={rel.satisfaction} /></div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-blue-600">{relHint(p, rel)}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Btn small tone="ghost" onClick={() => setOpen(!open)}>{open ? T("Close", "Close") : T("Actions", "Actions")}</Btn>
        {rel.stage !== "chatting" && <Btn small tone="ghost" onClick={() => run({ t: "dating", op: "spend", npc: npc.id })}>{T("Spend time", "Spend time")}</Btn>}
      </div>
      {open && (
        <div className="mt-2 space-y-2 border-t border-slate-200 pt-2">
          <Thread rel={rel} />
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="w-full text-slate-500">{T("Chat", "Chat")}</span>
            {(["flirty", "funny", "genuine", "boring"] as const).map((tn) => <Btn key={tn} small tone="ghost" onClick={() => run({ t: "dating", op: "chat", npc: npc.id, tone: tn })}>{tn === "flirty" ? T("flirty", "flirty") : tn === "funny" ? T("funny", "funny") : tn === "genuine" ? T("genuine", "genuine") : T("boring", "boring")}</Btn>)}
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="w-full text-slate-500">{T("Date", "Date")}</span>
            {(["cheap", "nice", "luxury"] as const).map((pl) => <Btn key={pl} small tone="ghost" disabled={p.money < dateCost(p, pl)} onClick={() => run({ t: "dating", op: "date", npc: npc.id, plan: pl })}>{pl === "cheap" ? T("cheap", "cheap") : pl === "nice" ? T("nice", "nice") : T("luxury", "luxury")} ({naira(dateCost(p, pl))})</Btn>)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="w-full text-xs text-slate-500">{T("Relationship", "Relationship")}</span>
            {rel.stage === "dating" && <Btn small tone="gold" onClick={() => run({ t: "dating", op: "official", npc: npc.id })}>{T("Make it official", "Make am official")}</Btn>}
            {(rel.stage === "exclusive" || rel.stage === "engaged") && !rel.livingTogether && <Btn small tone="ghost" onClick={() => run({ t: "dating", op: "movein", npc: npc.id })}>{T("Move in together", "Move in together")}</Btn>}
            {rel.stage === "exclusive" && <Btn small tone="gold" onClick={() => run({ t: "dating", op: "propose", npc: npc.id })}>{T("Propose", "Propose")}</Btn>}
            {rel.stage === "engaged" && <Btn small tone="gold" onClick={() => run({ t: "dating", op: "marry", npc: npc.id })}>{T("Marry", "Marry")}</Btn>}
            <Btn small tone="red" onClick={() => run({ t: "dating", op: "breakup", npc: npc.id })}>{T("Break up", "Break up")}</Btn>
          </div>
          {p.age >= 18 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="w-full text-xs text-slate-500">{T("Intimacy (kept private, with the consequences shown)", "Intimacy (private matter, but consequences dey show)")}</span>
              <Btn small tone="ghost" disabled={Boolean(b)} onClick={() => run({ t: "dating", op: "night", npc: npc.id, prot: "condom" })}>{T("With a condom", "With condom")}</Btn>
              <Btn small tone="ghost" disabled={Boolean(b)} onClick={() => run({ t: "dating", op: "night", npc: npc.id, prot: "pill" })}>{T("On the pill", "On the pill")}</Btn>
              <Btn small tone="ghost" disabled={Boolean(b)} onClick={() => run({ t: "dating", op: "night", npc: npc.id, prot: "none" })}>{T("No protection", "No protection")}</Btn>
              {canKids && <Btn small tone="gold" disabled={Boolean(b) || !committed} title={!committed ? T("Needs a committed relationship", "Need serious relationship") : ""} onClick={() => run({ t: "dating", op: "night", npc: npc.id, prot: "try" })}>{T("Try for a baby", "Try for baby")}</Btn>}
              {b && <span className="w-full text-[11px] text-slate-400">{b}</span>}
              {p.flags.lastNightAge === p.age && <Btn small tone="ghost" onClick={() => run({ t: "dating", op: "planb" })}>{T("Emergency pill", "Emergency pill")}</Btn>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Relationships and family planning, available without a phone. */
export function RelationshipsCard({ p, run }: { p: Player; run: Run }) {
  if (p.age < 18) return null;
  const partners = activePartners(p);
  const fertile = fertilityBlock(p);
  const adopt = adoptBlock(p);
  return (
    <Card>
      <H sub={T("Meet people, date, marry and start a family. No phone needed.", "Meet people, date, marry and start family. You no need phone.")}>{T("Love and family life", "Love and family life")}</H>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Btn small tone="gold" disabled={p.prison > 0} onClick={() => run({ t: "dating", op: "meet" })}>{T("Go out and meet someone", "Go out meet person")} ({p.rel.outingsLeft ?? 4})</Btn>
        <Btn small tone="ghost" disabled={Boolean(adopt)} title={adopt ?? ""} onClick={() => run({ t: "adopt" })}>{T("Adopt a child", "Adopt pikin")}</Btn>
        <Btn small tone="ghost" disabled={Boolean(fertile)} title={fertile ?? ""} onClick={() => run({ t: "fertility" })}>{T("Fertility treatment", "Fertility treatment")}</Btn>
        {p.spouse && <Btn small tone="red" disabled={Boolean(divorceBlock(p))} onClick={() => run({ t: "dating", op: "divorce" })}>{T("Divorce", "Divorce")}</Btn>}
      </div>
      {p.flags.pregnantBy && p.flags.keepPregnancy ? <p className="mb-2 text-xs text-blue-600">{T("A baby is on the way.", "Baby dey come.")}</p> : null}
      {partners.length === 0 ? <p className="text-sm text-slate-500">{T("You are single. Go out, or use the Spark app on your phone.", "You dey single. Go out, or use Spark for your phone.")}</p> : (
        <div className="space-y-2">{partners.map(({ rel, npc }) => <PartnerRow key={npc.id} p={p} rel={rel} npc={npc} run={run} />)}</div>
      )}
    </Card>
  );
}

function CandidateCard({ p, c, run }: { p: Player; c: Candidate; run: Run }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar look={c.look} gender={c.gender} age={p.age + c.ageDelta} size={96} />
      <div className="flex-1">
        <div className="text-base font-bold">{c.name}, {p.age + c.ageDelta}</div>
        <div className="text-xs text-slate-500">{c.occupation} · {STATE_BY_ID[c.stateId]?.name ?? ""}</div>
        <div className="mt-1 flex flex-wrap gap-1">{c.interests.map((i) => <Badge key={i}>{i}</Badge>)}</div>
        <div className="mt-2 flex gap-2">
          <Btn small tone="ghost" onClick={() => run({ t: "dating", op: "swipe", npc: c.id, like: false })}>{T("Pass", "Pass")}</Btn>
          <Btn small tone="gold" onClick={() => run({ t: "dating", op: "swipe", npc: c.id, like: true })}>{T("Like", "Like")}</Btn>
        </div>
      </div>
    </div>
  );
}

function Social({ p, run }: { p: Player; run: Run }) {
  const s = p.social;
  const block = socialBlock(p);
  const [plat, setPlat] = useState<Platform>("gram");
  return (
    <>
      <Card>
        <H sub={s ? T(`${s.handle} · ${totalFollowers(p).toLocaleString()} followers`, `${s.handle} · ${totalFollowers(p).toLocaleString()} followers`) : T("Build a following.", "Build your followers.")}>{T("Social media", "Social media")}</H>
        {block && <p className="text-sm text-slate-500">{block}</p>}
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((pl) => {
            const acc = s?.accounts[pl.id];
            return acc ? (
              <Badge key={pl.id} tone="green">{pl.label}: {acc.followers.toLocaleString()}</Badge>
            ) : (
              <Btn key={pl.id} small tone="ghost" disabled={Boolean(block) || p.age < pl.minAge} onClick={() => run({ t: "social", op: "account", platform: pl.id })}>{T("Open", "Open")} {pl.label}</Btn>
            );
          })}
        </div>
        {s && (
          <div className="mt-3 grid grid-cols-3 gap-2"><Bar label={T("Brand", "Brand")} value={s.brand} tone="gold" /><Bar label={T("Skill", "Skill")} value={s.skill} tone="blue" /><Bar label={T("Controversy", "Wahala")} value={s.controversy} invert /></div>
        )}
      </Card>
      {s && Object.keys(s.accounts).length > 0 && (
        <Card>
          <H sub={T(`${s.postsLeft} posts left this year`, `${s.postsLeft} posts remain this year`)}>{T("Create content", "Create content")}</H>
          <div className="mb-2 flex gap-1.5">
            {(Object.keys(s.accounts) as Platform[]).map((k) => <Btn key={k} small tone={plat === k ? "gold" : "ghost"} onClick={() => setPlat(k)}>{PLATFORMS.find((x) => x.id === k)?.label}</Btn>)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CONTENT.map((c) => {
              const b = postBlock(p, plat, c.id);
              return (
                <button key={c.id} type="button" disabled={Boolean(b)} onClick={() => run({ t: "social", op: "post", platform: plat, content: c.id })} className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-left text-xs disabled:opacity-40">
                  <span className="block font-semibold">{c.label}</span>
                  <span className="block text-slate-500">{b ?? naira(I(p, c.cost))}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <Btn small tone="ghost" onClick={() => run({ t: "social", op: "collab", platform: plat })}>{T("Collab with a creator", "Collab with creator")}</Btn>
            <Btn small tone="ghost" onClick={() => run({ t: "social", op: "gear" })}>{T("Upgrade gear", "Upgrade gear")}</Btn>
          </div>
          {s.sponsors.length > 0 && <p className="mt-3 text-xs text-slate-500">{T("Sponsors", "Sponsors")}: {s.sponsors.map((x) => `${x.brand} (${naira(x.monthly)}/${T("mo", "mo")}, ${x.monthsLeft}m)`).join(", ")}</p>}
        </Card>
      )}
    </>
  );
}

function Betting({ p, run }: { p: Player; run: Run }) {
  const [stake, setStake] = useState(5_000);
  const stakes = [2_000, 5_000, 20_000, 100_000].map((n) => I(p, n));
  return (
    <Card>
      <H sub={T(`${p.bets.slotsLeft} slots left this year · Net ${betProfit(p) >= 0 ? "+" : ""}${naira(betProfit(p))} lifetime`, `${p.bets.slotsLeft} slots remain this year · Net ${betProfit(p) >= 0 ? "+" : ""}${naira(betProfit(p))} for life`)}>Naija9ja Bet</H>
      <p className="mb-2 text-xs text-slate-500">{T("The house always wins in the long run. Adults only.", "Betting house dey always win for long run. Na for adults only.")}</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {stakes.map((s) => <Btn key={s} small tone={stake === s ? "gold" : "ghost"} onClick={() => setStake(s)}>{naira(s)}</Btn>)}
      </div>
      <div className="space-y-2">
        {BET_KINDS.map((k) => {
          const b = betBlock(p, stake);
          return (
            <div key={k.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <div><div className="text-sm font-semibold">{k.label}</div><div className="text-[11px] text-slate-500">{k.blurb}</div></div>
              <Btn small disabled={Boolean(b)} onClick={() => run({ t: "bet", kind: k.id, stake })}>{b ?? T("Bet", "Bet")}</Btn>
            </div>
          );
        })}
      </div>
      {p.bets.compulsion > 50 && <p className="mt-2 text-xs text-red-600">{T("You are betting compulsively.", "You no fit stop to bet.")}</p>}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Money extras: ledger, summaries, debts, housing, cars, subscriptions
// ---------------------------------------------------------------------------
export function LedgerCard({ p }: { p: Player }) {
  const [view, setView] = useState<"summary" | "months" | "upcoming" | "history">("summary");
  const [cat, setCat] = useState("all");
  const years = summaries(p);
  const cats = Array.from(new Set(p.ledger.map((t) => t.category)));
  const list = [...p.ledger].reverse().filter((t) => cat === "all" || t.category === cat).slice(0, 60);
  return (
    <Card>
      <H sub={T("Every naira in and out is recorded.", "Every naira wey enter or comot dey recorded.")}>{T("Ledger", "Ledger")}</H>
      <div className="mb-2 flex gap-1.5">
        <Btn small tone={view === "summary" ? "gold" : "ghost"} onClick={() => setView("summary")}>{T("Yearly", "Yearly")}</Btn>
        <Btn small tone={view === "months" ? "gold" : "ghost"} onClick={() => setView("months")}>{T("Monthly", "Monthly")}</Btn>
        <Btn small tone={view === "upcoming" ? "gold" : "ghost"} onClick={() => setView("upcoming")}>{T("Upcoming", "Wetin dey come")}</Btn>
        <Btn small tone={view === "history" ? "gold" : "ghost"} onClick={() => setView("history")}>{T("Transactions", "Transactions")}</Btn>
      </div>
      {view === "months" ? (
        <div className="space-y-2">
          {monthlySummary(p).length === 0 && <p className="text-sm text-slate-500">{T("Nothing recorded yet.", "Nothing dey yet.")}</p>}
          {monthlySummary(p).map((m) => (
            <div key={m.key} className="rounded-xl bg-slate-50 p-3 text-sm">
              <div className="flex justify-between"><span className="font-semibold">{T("Age", "Age")} {m.age} · {T("month", "month")} {m.month}</span><span className={m.income - m.expense >= 0 ? "text-emerald-600" : "text-red-600"}>{naira(m.income - m.expense)}</span></div>
              <div className="text-[11px] text-slate-500">{T("In", "In")} {naira(m.income)} · {T("Out", "Out")} {naira(m.expense)}</div>
              <div className="mt-1 text-[11px] text-slate-500">{m.cats.filter((c) => c.amount < 0).sort((a, b) => a.amount - b.amount).slice(0, 3).map((c) => `${c.category} ${naira(-c.amount)}`).join(" · ")}</div>
            </div>
          ))}
        </div>
      ) : view === "upcoming" ? (
        <ul className="space-y-1.5">
          {upcomingPayments(p).length === 0 && <p className="text-sm text-slate-500">{T("No scheduled payments.", "No payment dey wait for you.")}</p>}
          {upcomingPayments(p).map((u, i) => (
            <li key={i} className="flex justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span>{u.label}<span className="block text-[10px] text-slate-400">{u.inMonths <= 0 ? T("this month", "this month") : T(`in ${u.inMonths} month${u.inMonths === 1 ? "" : "s"}`, `for ${u.inMonths} month${u.inMonths === 1 ? "" : "s"}`)}</span></span><span className="text-red-600">{naira(u.amount)}</span></li>
          ))}
        </ul>
      ) : view === "summary" ? (
        <div className="space-y-2">
          {years.length === 0 && <p className="text-sm text-slate-500">{T("Nothing recorded yet.", "Nothing dey yet.")}</p>}
          {years.slice(0, 8).map((y) => (
            <div key={y.age} className="rounded-xl bg-slate-50 p-3 text-sm">
              <div className="flex justify-between"><span className="font-semibold">{T("Age", "Age")} {y.age}</span><span className={y.net >= 0 ? "text-emerald-600" : "text-red-600"}>{y.net >= 0 ? "+" : ""}{naira(y.net)}</span></div>
              <div className="text-[11px] text-slate-500">{T("In", "In")} {naira(y.income)} · {T("Out", "Out")} {naira(y.expense)}</div>
              {y.top.length > 0 && <div className="mt-1 text-[11px] text-slate-500">{T("Biggest costs", "Biggest costs")}: {y.top.map((t) => `${t.category} ${naira(t.amount)}`).join(", ")}</div>}
            </div>
          ))}
        </div>
      ) : (
        <>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="mb-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs">
            <option value="all">{T("All categories", "All categories")}</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ul className="space-y-1">
            {list.map((t) => (
              <li key={t.id} className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
                <span className="min-w-0 flex-1"><span className="block truncate text-slate-800">{t.reason}</span><span className="text-[10px] text-slate-400">{T("age", "age")} {t.age} · {T("month", "month")} {t.month} · {t.category} · {T("bal", "bal")} {naira(t.after)}</span></span>
                <span className={cx("shrink-0 font-semibold", t.amount >= 0 ? "text-emerald-600" : "text-red-600")}>{t.amount >= 0 ? "+" : ""}{naira(t.amount)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

export function NetWorthCard({ p }: { p: Player }) {
  const holdings = p.holdings.reduce((s, h) => s + h.value, 0);
  const houses = p.houses.reduce((s, h) => s + h.value, 0);
  const cars = p.vehicles.reduce((s, v) => s + v.value, 0);
  const biz = p.businesses.filter((b) => b.status === "open").reduce((s, b) => s + valuation(p, b), 0);
  const owed = receivables(p);
  const debt = totalDebt(p);
  return (
    <Card>
      <H sub={T("Cash is not the same as wealth.", "Cash no be the same as wealth.")}>{T("Assets and liabilities", "Assets and debts")}</H>
      <dl className="space-y-1 text-sm">
        <Row k={T("Cash", "Cash")} v={naira(p.money)} />
        <Row k={T("Investments", "Investments")} v={naira(holdings)} />
        <Row k={T("Property", "Property")} v={naira(houses)} />
        <Row k={T("Vehicles", "Vehicles")} v={naira(cars)} />
        <Row k={T("Businesses", "Businesses")} v={naira(biz)} />
        <Row k={T("Owed to you", "Wetin people owe you")} v={naira(owed)} />
        <Row k={T("Debts", "Debts")} v={`-${naira(debt)}`} bad={debt > 0} />
      </dl>
    </Card>
  );
}

export function HousingCard({ p, run }: { p: Player; run: Run }) {
  const h = p.housing;
  const st = STATE_BY_ID[p.state];
  return (
    <Card>
      <H sub={h.type === "family" ? T("You live with family.", "You dey live with family.") : h.type === "owned" ? T("You own your home", "You get your own house") : T(`Rent ${naira(h.annualRent)}/yr`, `Rent ${naira(h.annualRent)}/yr`)}>{T("Where you live", "Where you dey stay")}</H>
      {h.arrears > 0 && <p className="mb-2 text-xs text-red-600">{T(`Rent arrears: ${naira(h.arrears)}. You could be evicted.`, `Rent arrears: ${naira(h.arrears)}. Dem fit throw you out.`)}</p>}
      {p.age >= 18 && !st.abroad && (
        <div className="space-y-1.5">
          {HOME_TIERS.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <div><div className="text-sm font-semibold">{t.label}</div><div className="text-[11px] text-slate-500">{t.blurb}</div></div>
              <Btn small tone="ghost" onClick={() => run({ t: "rent", tier: t.id })}>{naira(I(p, t.rent) * st.cost)}/yr</Btn>
            </div>
          ))}
          {h.type !== "family" && <Btn small tone="ghost" onClick={() => run({ t: "moveHome" })}>{T("Move back with family", "Go back live with family")}</Btn>}
        </div>
      )}
    </Card>
  );
}

const CAT_LABEL: Record<string, () => string> = {
  taxi: () => T("Work vehicles", "Work vehicles"),
  car: () => T("Everyday cars", "Everyday cars"),
  suv: () => T("SUVs and trucks", "SUV and trucks"),
  luxury: () => T("Luxury", "Luxury"),
  supercar: () => T("Supercars", "Supercars"),
  hypercar: () => T("Hypercars", "Hypercars"),
  helicopter: () => T("Helicopters", "Helicopters"),
  jet: () => T("Private jets", "Private jets"),
  boat: () => T("Boats", "Boats"),
  yacht: () => T("Yachts", "Yachts"),
};

export function GarageCard({ p, run }: { p: Player; run: Run }) {
  const [show, setShow] = useState(false);
  const [cat, setCat] = useState("car");
  const lic = licenseBlock(p);
  return (
    <Card>
      <H sub={T("Cars, boats and aircraft cost money to run every month. Rent them out to earn.", "Cars, boats and aircraft dey chop money every month. Rent them out make dem bring money.")}>{T("Garage and fleet", "Garage and fleet")}</H>
      <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 p-3">
        <div className="text-[12px]"><div className="font-bold text-[#0b2a6b]">{T("Driver's licence", "Driver's licence")}</div><div className="text-slate-500">{p.possessions.license ? T("You can drive.", "You fit drive.") : T("Needed to buy and drive a car. Failing costs another fee.", "You need am to buy and drive car. If you fail, you go pay again.")}</div></div>
        {p.possessions.license ? <Badge tone="green">{T("Licensed", "Licensed")}</Badge> : (
          <div className="flex shrink-0 flex-col gap-1">
            <Btn small tone="gold" disabled={Boolean(lic)} title={lic ?? ""} onClick={() => run({ t: "license" })}>{T("Take the test", "Do the test")} ({naira(licenseCost(p))})</Btn>
            <Btn small tone="ghost" disabled={Boolean(lic)} onClick={() => run({ t: "license", settle: true })}>{T("Settle the examiner", "Settle examiner")}</Btn>
          </div>
        )}
      </div>
      {p.vehicles.map((v) => {
        const m = modelOf(v.modelId);
        return (
          <div key={v.id} className="mb-2 rounded-xl bg-slate-50 p-3">
            <div className="flex gap-3">
              <VehicleArt art={m?.art ?? "sedan"} color={m?.color ?? "#64748b"} size={84} />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between text-[13px]"><span className="truncate font-bold text-[#0b2a6b]">{v.name}</span><span className="shrink-0 text-blue-600">{naira(v.value)}</span></div>
                <div className="text-[11px] text-slate-500">{T("Condition", "Condition")} {v.condition}% · {v.role === "personal" ? T("personal", "personal") : v.role === "rental" ? T("for hire", "for hire") : v.role} · {isInsured(p, v) ? T("insured", "insured") : T("uninsured", "no insurance")}{v.loanId ? T(" · on finance", " · dem still dey owe") : ""}</div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Btn small tone="ghost" onClick={() => run({ t: "car", op: "repair", id: v.id })}>{T("Repair", "Repair")} ({naira(repairCost(p, v))})</Btn>
              <Btn small tone="ghost" onClick={() => run({ t: "car", op: "insure", id: v.id })}>{T("Insure", "Insure")}</Btn>
              {v.role === "personal" ? (
                <>
                  {m?.rentYield ? <Btn small tone="ghost" onClick={() => run({ t: "car", op: "rental", id: v.id })}>{m.cat === "jet" || m.cat === "helicopter" ? T("Charter it out", "Put am for charter") : m.cat === "boat" || m.cat === "yacht" ? T("Hire it out", "Hire am out") : T("Rent it out", "Rent am out")}</Btn> : null}
                  {m && ["taxi", "car"].includes(m.cat) && <Btn small tone="ghost" onClick={() => run({ t: "car", op: "taxi", id: v.id })}>{T("Run as taxi", "Use as taxi")}</Btn>}
                </>
              ) : <Btn small tone="ghost" onClick={() => run({ t: "car", op: "personal", id: v.id })}>{T("Personal use", "Personal use")}</Btn>}
              <Btn small tone="red" onClick={() => run({ t: "car", op: "sell", id: v.id })}>{T("Sell", "Sell")}</Btn>
            </div>
          </div>
        );
      })}
      <Btn small tone="ghost" onClick={() => setShow(!show)}>{show ? T("Hide showroom", "Hide showroom") : T("Browse the showroom", "See the showroom")}</Btn>
      {show && (
        <div className="mt-3">
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
            {Object.keys(CAT_LABEL).map((c) => <button key={c} type="button" onClick={() => setCat(c)} className={cx("shrink-0 rounded-full px-3 py-1 text-[11.5px] font-bold", cat === c ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600")}>{CAT_LABEL[c]()}</button>)}
          </div>
          {p.age < 18 && <p className="mb-2 text-xs text-slate-500">{T("You must be 18 to buy a vehicle.", "You must reach 18 to buy vehicle.")}</p>}
          <div className="space-y-2">
            {VEHICLE_MODELS.filter((m) => m.cat === cat).map((m) => {
              const price = priceOf(p, m);
              const noLic = needsLicense(m) && !p.possessions.license;
              return (
                <div key={m.id} className="rounded-xl bg-slate-50 p-2.5">
                  <div className="flex gap-3">
                    <VehicleArt art={m.art} color={m.color} size={92} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-[#0b2a6b]">{m.name}</div>
                      <div className="text-[11px] text-slate-500">{m.kind === "new" ? T("Brand new", "Brand new") : T("Tokunbo / used", "Tokunbo / used")}{m.revenue ? T(" · earns income", " · e dey bring money") : ""}{m.rentYield ? T(" · can be rented out", " · you fit rent am out") : ""}</div>
                      <div className="mt-0.5 text-[13px] font-extrabold text-blue-600">{naira(price)}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <Btn small tone="gold" disabled={p.age < 18 || p.money < price || noLic} onClick={() => run({ t: "car", op: "buy", id: m.id })}>{noLic ? T("Needs licence", "Need licence") : T("Buy", "Buy")}</Btn>
                    <Btn small tone="ghost" disabled={p.age < 18 || p.money < price * 0.3 || noLic} onClick={() => run({ t: "car", op: "buyLoan", id: m.id })}>{T("30% down", "30% deposit")}</Btn>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

export function SubsCard({ p }: { p: Player }) {
  if (p.subs.length === 0) return null;
  return (
    <Card>
      <H>{T("Recurring payments", "Recurring payments")}</H>
      <ul className="space-y-1 text-sm">
        {p.subs.map((s) => <li key={s.id} className="flex justify-between"><span>{s.label}</span><span className="text-red-600">{naira(s.monthly)}/{T("mo", "mo")}</span></li>)}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Family extras: parents' backgrounds, asking for help
// ---------------------------------------------------------------------------
export function PeopleCard({ p, run }: { p: Player; run: Run }) {
  const [sel, setSel] = useState<string | null>(null);
  const [kind, setKind] = useState<SupportKind | null>(null);
  const [amt, setAmt] = useState(0);
  const people = Object.values(p.npcs).filter((n) => n.alive && ["dad", "mom", "guardian", "sibling", "grandparent", "uncle", "aunt", "cousin", "friend"].includes(n.role));
  const npc = sel ? p.npcs[sel] : null;
  const kinds = supportKindsFor(p);
  return (
    <>
      <Card>
        <H sub={`${p.fam.label} · ${p.fam.structure.replace("-", " ")}`}>{T("Background", "Background")}</H>
        <div className="flex flex-wrap gap-1.5">{p.fam.tags.map((t) => <Badge key={t} tone="gold">{t}</Badge>)}</div>
        <p className="mt-2 text-xs text-slate-500">{T("Wealth and generosity are different things. Rich parents can be strict, and poor parents can be very giving.", "Money and generosity no be the same thing. Rich parents fit be strict, poor parents fit dey give well.")}</p>
      </Card>
      <Card>
        <H sub={T("Tap someone to ask for help, borrow, lend or give.", "Tap person to ask for help, borrow, lend or give.")}>{T("People", "People")}</H>
        <div className="grid grid-cols-2 gap-2">
          {people.map((n) => (
            <button key={n.id} type="button" onClick={() => { setSel(n.id); setKind(null); }} className={cx("flex items-center gap-2 rounded-xl border p-2 text-left", sel === n.id ? "border-blue-500" : "border-slate-200 bg-slate-50")}>
              <Face n={n} p={p} size={44} />
              <span className="min-w-0 text-xs"><span className="block truncate font-semibold">{n.name.split(" ")[0]}</span><span className="block text-[10px] capitalize text-slate-500">{n.role} · {T("close", "close")} {Math.round(n.closeness)}</span></span>
            </button>
          ))}
        </div>
      </Card>
      {npc && (
        <Card className="border-blue-500">
          <div className="flex items-center gap-3"><Face n={npc} p={p} size={64} /><div><div className="text-base font-bold">{npc.name}</div><div className="text-xs text-slate-500">{npc.occupation} · {T("age", "age")} {p.age + npc.ageDelta}</div></div></div>
          <div className="mt-3 grid grid-cols-3 gap-2"><Bar label={T("Close", "Close")} value={npc.closeness} tone="gold" /><Bar label={T("Trust", "Trust")} value={npc.trust} tone="blue" /><Bar label={T("Generous", "Generous")} value={npc.generosity} /></div>
          <p className="mt-2 text-[11px] text-slate-500">{npc.traits.join(" · ")}{capacityOf(p, npc) <= 0 ? T(" · struggling financially", " · money dey tight for am") : ""}</p>
          {npc.memories.length > 0 && <p className="mt-1 text-[11px] text-slate-400">{T("Remembers", "E remember")}: {npc.memories[npc.memories.length - 1].text}</p>}
          <H>{T("Ask for money", "Ask for money")}</H>
          <div className="flex flex-wrap gap-1.5">
            {kinds.map((k) => <Btn key={k} small tone={kind === k ? "gold" : "ghost"} onClick={() => { setKind(k); setAmt(defaultAmount(p, k)); }}>{SUPPORT_KINDS[k].label}</Btn>)}
          </div>
          {kind && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-1.5">
                {[0.5, 1, 2].map((f) => <Btn key={f} small tone="ghost" onClick={() => setAmt(Math.round((defaultAmount(p, kind) * f) / 500) * 500)}>{naira(Math.round((defaultAmount(p, kind) * f) / 500) * 500)}</Btn>)}
              </div>
              <Btn className="mt-2 w-full" tone="gold" onClick={() => run({ t: "ask", npc: npc.id, kind, amount: amt })}>{T(`Ask ${npc.name.split(" ")[0]} for ${naira(amt)}`, `Ask ${npc.name.split(" ")[0]} for ${naira(amt)}`)}</Btn>
            </div>
          )}
          <H>{T("Between you", "Between una")}</H>
          <div className="flex flex-wrap gap-1.5">
            {p.age >= 16 && <Btn small tone="ghost" onClick={() => run({ t: "borrow", npc: npc.id, amount: Math.round(defaultAmount(p, "loan")) })}>{T("Borrow", "Borrow")} {naira(defaultAmount(p, "loan"))}</Btn>}
            <Btn small tone="ghost" disabled={p.money < I(p, 50_000)} onClick={() => run({ t: "give", npc: npc.id, amount: I(p, 50_000), mode: "gift" })}>{T("Gift", "Gift")} {naira(I(p, 50_000))}</Btn>
            <Btn small tone="ghost" disabled={p.money < I(p, 200_000)} onClick={() => run({ t: "give", npc: npc.id, amount: I(p, 200_000), mode: "loan" })}>{T("Lend", "Lend")} {naira(I(p, 200_000))}</Btn>
          </div>
        </Card>
      )}
      {activeOwedToMe(p).length > 0 && (
        <Card>
          <H>{T("People who owe you", "People wey owe you")}</H>
          <ul className="space-y-1 text-sm">{activeOwedToMe(p).map((l) => <li key={l.id} className="flex justify-between"><span>{l.lenderName}</span><span>{naira(l.balance)}</span></li>)}</ul>
        </Card>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
export function HealthTab({ p, run }: { p: Player; run: Run }) {
  const plans = [
    { id: "none" as const, label: T("No cover", "No cover"), cost: T("free", "free") },
    { id: "basic" as const, label: T("Basic HMO", "Basic HMO"), cost: naira(I(p, 60_000)) + T("/yr", "/yr") },
    { id: "premium" as const, label: T("Premium HMO", "Premium HMO"), cost: naira(I(p, 400_000)) + T("/yr", "/yr") },
  ];
  return (
    <>
      <Card>
        <H>{T("Condition", "Condition")}</H>
        <div className="space-y-2"><Bar label={T("Health", "Health")} value={p.stats.health} /><Bar label={T("Fitness", "Fitness")} value={p.stats.fitness} tone="blue" /><Bar label={T("Stress", "Stress")} value={p.stats.stress} invert /></div>
        <div className="mt-3 flex gap-2">
          <Btn small tone="ghost" onClick={() => run({ t: "checkup" })}>{T("Check-up", "Check-up")} ({naira(I(p, 35_000))})</Btn>
          <Btn small tone="ghost" disabled={Boolean(gymBlock(p)) && !p.subs.some((s) => s.id === "gym")} onClick={() => run({ t: "gym" })}>{p.subs.some((s) => s.id === "gym") ? T("Cancel gym membership", "Cancel gym") : T("Join gym", "Join gym")}</Btn>
        </div>
      </Card>
      <Card>
        <H sub={T("Cover reduces your share at private hospitals and clinics.", "Cover dey reduce wetin you go pay for private hospital and clinic.")}>{T("Insurance", "Insurance")}</H>
        <div className="flex flex-wrap gap-1.5">
          {plans.map((pl) => <Btn key={pl.id} small tone={p.insurance.plan === pl.id ? "gold" : "ghost"} onClick={() => run({ t: "insure", plan: pl.id })}>{pl.label} · {pl.cost}</Btn>)}
        </div>
      </Card>
      <Card>
        <H>{T("Current conditions", "Current conditions")}</H>
        {p.conditions.length === 0 && <p className="text-sm text-slate-500">{T("You are not sick.", "You no dey sick.")}</p>}
        <div className="space-y-2">
          {p.conditions.map((c) => (
            <div key={c.id} className="rounded-xl bg-slate-50 p-3">
              <div className="flex justify-between text-sm"><span className="font-semibold">{c.name}</span><Badge tone={c.severity >= 4 ? "red" : "gold"}>{T("severity", "severity")} {c.severity}</Badge></div>
              <div className="text-[11px] text-slate-500">{c.treated ? T("Treated", "Don treat") : T("Untreated", "No treat yet")}{c.monthsLeft >= 0 ? T(` · ${c.monthsLeft} month(s) to recover`, ` · ${c.monthsLeft} month(s) to recover`) : T(" · chronic", " · chronic")}{c.needsSurgery ? T(" · needs surgery", " · need surgery") : ""}{TEMPLATES[c.template]?.meds ? T(` · meds ${naira(c.medMonthly)}/mo`, ` · drugs ${naira(c.medMonthly)}/mo`) : ""}</div>
              {!c.treated && (
                <div className="mt-2 space-y-1">
                  {facilitiesFor(p, c).map((f) => {
                    const { total, mine } = treatmentCost(p, c, f);
                    return (
                      <div key={f.id} className="flex items-center justify-between rounded-lg bg-slate-100 px-2 py-1.5 text-xs">
                        <span>{f.label}<span className="block text-[10px] text-slate-400">{T("quality", "quality")} {f.quality}{mine < total ? T(` · covered ${Math.round((1 - mine / total) * 100)}%`, ` · insurance cover ${Math.round((1 - mine / total) * 100)}%`) : ""}</span></span>
                        <Btn small tone="ghost" onClick={() => run({ t: "treat", cond: c.id, facility: f.id })}>{naira(mine)}</Btn>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
      <details className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
        <summary className="cursor-pointer text-sm font-semibold text-slate-600">{T("Where you can get care", "Where you fit get treatment")}</summary>
        <ul className="mt-2 space-y-1">{FACILITIES.map((f) => <li key={f.id}>{f.label}: {T("quality", "quality")} {f.quality}</li>)}</ul>
      </details>
    </>
  );
}

// ---------------------------------------------------------------------------
// Work extras: skills, growth, businesses, military
// ---------------------------------------------------------------------------
export function SkillsCard({ p, run }: { p: Player; run: Run }) {
  if (p.age < 10) return null;
  return (
    <>
      <Card>
        <H sub={T(`${p.actionsLeft} actions left this year`, `${p.actionsLeft} actions remain this year`)}>{T("Learn a skill", "Learn skill")}</H>
        <div className="space-y-2">
          {SKILLS.map((s) => {
            const b = learnBlock(p, s);
            return (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <div><div className="text-sm font-semibold">{s.label} {skillLevel(p, s.id) > 0 && <Badge tone="green">{T("level", "level")} {skillLevel(p, s.id)}</Badge>}</div><div className="text-[11px] text-slate-500">{s.blurb}</div></div>
                <Btn small tone="ghost" disabled={Boolean(b)} onClick={() => run({ t: "learn", id: s.id })}>{b ?? naira(I(p, s.cost))}</Btn>
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <H>{T("Self-improvement", "Self-improvement")}</H>
        <div className="grid grid-cols-2 gap-2">
          {GROWTH_ACTIVITIES.filter((a) => p.age >= a.minAge).map((a) => {
            const b = growthBlock(p, a);
            return (
              <button key={a.id} type="button" disabled={Boolean(b)} onClick={() => run({ t: "growth", id: a.id })} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left text-xs disabled:opacity-40">
                <span className="block font-semibold">{a.label}</span><span className="block text-slate-500">{b ?? a.desc}</span>
              </button>
            );
          })}
        </div>
        {p.age >= 18 && (() => { const b = enlistBlock(p); return (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="w-full text-[11px] text-slate-500">{b ?? T("Join the armed forces", "Join the armed forces")}</span>
            {(["army", "navy", "airforce"] as const).map((br) => <Btn key={br} small tone="ghost" disabled={Boolean(b)} onClick={() => run({ t: "enlist", branch: br })}>{br === "army" ? T("Army", "Army") : br === "navy" ? T("Navy", "Navy") : T("Air Force", "Air Force")}</Btn>)}
          </div>
        ); })()}
      </Card>
    </>
  );
}

export function BusinessCard({ p, run }: { p: Player; run: Run }) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  if (p.age < 18) return null;
  const open = p.businesses.filter((b) => b.status === "open");
  const cur = open.find((b) => b.id === openId) ?? null;
  const kindsSorted = [...BIZ_KINDS].sort((x, y) => x.startCost - y.startCost);
  return (
    <Card>
      <H sub={T("Set prices, advertising and stock, hire and fire real people, and watch the monthly report. Run it well and it grows. Run it badly and it collapses.", "Set price, advert and stock, hire and fire real people, and watch the monthly report. Run am well, e go grow. Run am bad, e go collapse.")}>{T("Businesses", "Businesses")}</H>
      {open.map((b) => (
        <button key={b.id} type="button" onClick={() => setOpenId(b.id)} className="mb-2 w-full rounded-xl bg-slate-50 p-3 text-left">
          <div className="flex justify-between text-sm"><span className="font-semibold">{b.name}</span><span className="text-blue-600">{naira(valuation(p, b))}</span></div>
          <div className="text-[11px] text-slate-500">{BIZ_BY_ID[b.kind]?.label} · {T("level", "level")} {b.level} · {(b.crew?.length ?? b.staff)} {T("staff", "staff")} · {STATE_BY_ID[b.stateId]?.name}</div>
          <div className="mt-1 flex items-center justify-between text-[11px]"><span>{T("last month", "last month")} <span className={b.lastMonthProfit >= 0 ? "text-emerald-600" : "text-red-600"}>{naira(b.lastMonthProfit)}</span></span><span className="text-slate-500">{T("fame", "fame")} {Math.round(b.fame ?? 0)} · {T("quality", "quality")} {Math.round(b.quality)}</span></div>
          {b.lossStreak >= 3 && <div className="mt-1 text-[11px] font-semibold text-red-600">{T(`Losing money ${b.lossStreak} months in a row`, `E don dey lose money ${b.lossStreak} months now`)}</div>}
        </button>
      ))}
      <Btn small tone="ghost" onClick={() => setShow(!show)}>{show ? T("Hide", "Hide") : T("Start a business", "Start business")}</Btn>
      {show && (
        <div className="mt-2 space-y-1.5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={T("Business name (optional)", "Business name (optional)")} maxLength={30} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
          {kindsSorted.map((k) => {
            const bl = startBlock(p, k.id);
            return (
              <div key={k.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <div className="min-w-0 text-sm"><div className="font-semibold">{k.label}</div><div className="text-[11px] text-slate-500">{k.blurb}</div></div>
                <Btn small tone="ghost" disabled={Boolean(bl)} onClick={() => run({ t: "biz", op: "start", id: k.id, name })}>{bl ?? naira(startCostFor(p, k))}</Btn>
              </div>
            );
          })}
        </div>
      )}
      {cur && <BusinessSheet p={p} b={cur} run={run} onClose={() => setOpenId(null)} />}
    </Card>
  );
}

function BusinessSheet({ p, b, run, onClose }: { p: Player; b: Business; run: Run; onClose: () => void }) {
  const k = BIZ_BY_ID[b.kind];
  const crew = b.crew ?? [];
  const r = b.report;
  const pick = (op: "price" | "ads" | "stock", v: number) => run({ t: "biz", op, id: b.id, v });
  const Seg = ({ label, value, opts, op }: { label: string; value: number; opts: string[]; op: "price" | "ads" | "stock" }) => (
    <div className="mb-2">
      <div className="mb-1 text-xs text-slate-600">{label}</div>
      <div className="grid grid-cols-4 gap-1">{opts.map((o, i) => <button key={o} type="button" onClick={() => pick(op, i)} className={cx("rounded-lg border px-1 py-1.5 text-[11px] font-semibold", value === i ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 bg-slate-50 text-slate-600")} style={{ gridColumn: opts.length === 3 ? "span 1" : undefined }}>{o}</button>)}</div>
    </div>
  );
  const maxRev = Math.max(1, ...(b.hist ?? []).map((h) => Math.abs(h.net)));
  return (
    <Sheet title={b.name} onClose={onClose}>
      <p className="mb-2 text-xs text-slate-500">{k?.label} · {STATE_BY_ID[b.stateId]?.name} · {T("level", "level")} {b.level}/5 · {T("worth", "worth")} {naira(valuation(p, b))}</p>
      <div className="mb-3 grid grid-cols-2 gap-2"><Bar label={T("Quality", "Quality")} value={b.quality} tone="blue" /><Bar label={T("Fame", "Fame")} value={b.fame ?? 0} tone="blue" /></div>
      {r ? (
        <div className="mb-3 rounded-xl bg-slate-50 p-3 text-xs">
          <div className="mb-1 font-semibold text-slate-700">{T("Last month", "Last month")}</div>
          <dl className="space-y-0.5">
            <Row k={T("Sales", "Sales")} v={naira(r.rev)} />
            <Row k={T("Stock", "Stock")} v={naira(-r.stock)} />
            <Row k={T("Wages", "Wages")} v={naira(-r.wages)} />
            <Row k={T("Advertising", "Advertising")} v={naira(-r.ads)} />
            <Row k={T("Other costs", "Other costs")} v={naira(-r.other)} />
            <Row k={T("Profit", "Profit")} v={naira(r.net)} bad={r.net < 0} />
          </dl>
          {r.notes.map((n, i) => <p key={i} className="mt-1 text-slate-600">• {T(n.en, n.pcm)}</p>)}
          {r.tip && <p className="mt-2 rounded-lg bg-blue-50 px-2 py-1.5 font-semibold text-blue-700">{T(r.tip.en, r.tip.pcm)}</p>}
        </div>
      ) : <p className="mb-3 text-xs text-slate-500">{T("The first report arrives at the end of the month.", "First report go land when month end.")}</p>}
      {(b.hist?.length ?? 0) > 0 && (
        <div className="mb-3">
          <div className="mb-1 text-xs text-slate-600">{T("Profit by year", "Profit by year")}</div>
          <div className="flex h-12 items-end gap-1">{b.hist!.map((h, i) => <div key={i} title={naira(h.net)} className={cx("flex-1 rounded-t", h.net >= 0 ? "bg-emerald-400" : "bg-red-400")} style={{ height: `${Math.max(6, (Math.abs(h.net) / maxRev) * 100)}%` }} />)}</div>
        </div>
      )}
      <Seg label={T("Prices", "Prices")} value={b.price ?? 1} opts={PRICE_LABEL.map((f) => f())} op="price" />
      <Seg label={T("Advertising", "Advertising")} value={b.ads ?? 0} opts={[T("None", "None"), T("Small", "Small"), T("Medium", "Medium"), T("Heavy", "Heavy")]} op="ads" />
      <Seg label={T("Stock quality", "Stock quality")} value={b.stock ?? 1} opts={STOCK_LABEL.map((f) => f())} op="stock" />
      <div className="mb-1 mt-3 flex items-center justify-between">
        <div className="text-sm font-semibold">{T("Your team", "Your team")} ({crew.length}/{b.level * 4 + 2})</div>
        <Btn small tone="gold" onClick={() => run({ t: "biz", op: "recruit", id: b.id })}>{T("Recruit", "Recruit")} · {naira(hireCost(p, b) * 0.4)}</Btn>
      </div>
      {b.cands && (
        <div className="mb-2 space-y-1.5 rounded-xl border border-blue-100 bg-blue-50/50 p-2">
          <div className="text-[11px] font-semibold text-blue-700">{T("Interview: pick one", "Interview: pick one")}</div>
          {b.cands.map((w, i) => (
            <div key={w.id} className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-xs">
              <div><div className="font-semibold">{w.name}</div><div className="text-slate-500">{T("skill", "skill")} {w.skill} · {naira(Math.round(workerPay(p, b, w)))}/{T("mo", "mo")}</div></div>
              <Btn small tone="gold" onClick={() => run({ t: "biz", op: "pick", id: b.id, idx: i })}>{T("Hire", "Hire")}</Btn>
            </div>
          ))}
        </div>
      )}
      {crew.length === 0 && <p className="mb-2 text-xs text-slate-500">{T("You run it alone. Staff lift sales but cost wages.", "You dey run am alone. Staff dey lift sales but dem dey cost salary.")}</p>}
      <div className="space-y-1.5">
        {crew.map((w) => (
          <div key={w.id} className="rounded-xl bg-slate-50 px-3 py-2 text-xs">
            <div className="flex items-center justify-between"><span className="font-semibold">{w.name}</span><span className="text-slate-500">{naira(workerPay(p, b, w))}/{T("mo", "mo")}</span></div>
            <div className="mt-1 grid grid-cols-2 gap-2"><Bar label={T("Skill", "Skill")} value={w.skill} tone="blue" /><Bar label={T("Loyalty", "Loyalty")} value={w.loyalty} tone={w.loyalty < 35 ? "red" : "blue"} /></div>
            <div className="mt-1.5 flex gap-1.5">
              <Btn small tone="ghost" onClick={() => run({ t: "biz", op: "raise", id: b.id, worker: w.id })}>{T("Raise pay", "Raise pay")}</Btn>
              <Btn small tone="ghost" onClick={() => run({ t: "biz", op: "train", id: b.id, worker: w.id })}>{T("Train", "Train")}</Btn>
              <Btn small tone="red" onClick={() => run({ t: "biz", op: "dismiss", id: b.id, worker: w.id })}>{T("Fire", "Fire")}</Btn>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Btn small tone="ghost" disabled={b.level >= 5} onClick={() => run({ t: "biz", op: "upgrade", id: b.id })}>{T("Expand", "Expand")} ({naira(upgradeCost(p, b))})</Btn>
        <Btn small tone="ghost" onClick={() => run({ t: "biz", op: "manager", id: b.id })}>{b.manager ? T("Sack manager", "Sack manager") : T("Hire a manager", "Hire manager")}</Btn>
        <Btn small tone="gold" onClick={() => { run({ t: "biz", op: "sell", id: b.id }); onClose(); }}>{T("Sell", "Sell")}</Btn>
        <Btn small tone="red" onClick={() => { run({ t: "biz", op: "close", id: b.id }); onClose(); }}>{T("Close down", "Close down")}</Btn>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{b.manager ? T("A manager runs it for you, for a 15% cut. You can own it without working in it.", "Manager dey run am for you, 15% share. You fit own am without working inside.") : T("You run it yourself. A full-time job elsewhere takes your attention off the business.", "You dey run am yourself. Full-time job for another place go reduce your attention.")}</p>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Law and crime
// ---------------------------------------------------------------------------
export function LawTab({ p, run }: { p: Player; run: Run }) {
  const open = p.crime.cases.filter((c) => c.stage !== "closed");
  return (
    <>
      <Card>
        <H sub={T("Crime pays quickly and costs heavily. Cases are decided in court, not by luck alone.", "Crime dey pay fast but e dey cost well. Court dey decide cases, no be luck alone.")}>{T("Legal status", "Legal status")}</H>
        {p.prison > 0 && <Badge tone="red">{T(`In prison · ${p.prison} yr left`, `You dey prison · ${p.prison} yr remain`)}</Badge>}
        <div className="mt-2 grid grid-cols-2 gap-2"><Bar label={T("Police heat", "Police heat")} value={p.crime.heat} invert /><Bar label={T("Criminal skill", "Criminal skill")} value={p.crime.skill} tone="blue" /></div>
        {open.map((c) => <p key={c.id} className="mt-2 text-sm text-red-600">{T("Open case", "Open case")}: {c.charge} ({c.stage})</p>)}
      </Card>
      {p.age >= 14 && (
        <Card>
          <H sub={T("You may be caught. Consequences include arrest, a record, fines, prison and revenge.", "Dem fit catch you. E fit bring arrest, record, fine, prison and revenge.")}>{T("Risky choices", "Risky choices")}</H>
          <div className="space-y-2">
            {CRIMES.map((c) => {
              const b = crimeBlock(p, c);
              return (
                <div key={c.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <div><div className="text-sm font-semibold">{c.label}</div><div className="text-[11px] text-slate-500">{c.blurb}</div></div>
                  <Btn small tone="red" disabled={Boolean(b)} onClick={() => run({ t: "crime", id: c.id })}>{b ?? T("Do it", "Do am")}</Btn>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      <Card>
        <H>{T("Criminal record", "Criminal record")}</H>
        {p.crime.record.length === 0 ? <p className="text-sm text-slate-500">{T("Clean record.", "Your record clean.")}</p> : (
          <ul className="space-y-1 text-sm">{p.crime.record.map((r, i) => <li key={i}>{T("Age", "Age")} {r.age}: {r.charge} — {r.outcome}</li>)}</ul>
        )}
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Will
// ---------------------------------------------------------------------------
export function WillCard({ p, run }: { p: Player; run: Run }) {
  const shares = currentShares(p);
  const people = beneficiaries(p);
  const pct = (id: string) => shares.find((s) => s.id === id)?.pct ?? 0;
  return (
    <Card>
      <H sub={T(`Total allocated: ${totalPct(shares)}%. Without a will, the law splits your estate by default and families fight.`, `Total allocated: ${totalPct(shares)}%. If you no write will, law go share your property by default and family go fight.`)}>{T("Your will", "Your will")}</H>
      <div className="space-y-2">
        {people.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <span className="min-w-0 truncate">{b.label}</span>
            <span className="flex shrink-0 items-center gap-1.5">
              <Btn small tone="ghost" onClick={() => run({ t: "will", id: b.id, pct: Math.max(0, pct(b.id) - 10) })}>−</Btn>
              <span className="w-10 text-center font-semibold">{pct(b.id)}%</span>
              <Btn small tone="ghost" onClick={() => run({ t: "will", id: b.id, pct: Math.min(100, pct(b.id) + 10) })}>+</Btn>
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Vocational training and mortgages
// ---------------------------------------------------------------------------
export function TradeCard({ p, run }: { p: Player; run: Run }) {
  const b = tradeBlock(p);
  if (p.age < 15) return null;
  if (p.flags.trade) return <Card><H>{T("Vocational training", "Vocational training")}</H><p className="text-sm text-slate-600">{T(`Certified in ${String(p.flags.trade)}.`, `You get certificate for ${String(p.flags.trade)}.`)}</p></Card>;
  if (p.school?.type === "vocational") return <Card><H>{T("Vocational training", "Vocational training")}</H><p className="text-sm text-slate-600">{T(`In training: ${p.school.yearsLeft} year${p.school.yearsLeft === 1 ? "" : "s"} left.`, `You dey train: ${p.school.yearsLeft} year${p.school.yearsLeft === 1 ? "" : "s"} remain.`)}</p></Card>;
  return (
    <Card>
      <H sub={T("A trade certificate lifts your pay in related work, without a degree.", "Trade certificate fit raise your pay for that work, even without degree.")}>{T("Vocational training", "Vocational training")}</H>
      {b && <p className="mb-2 text-xs text-slate-500">{b}</p>}
      <div className="space-y-2">
        {TRADES.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
            <div><div className="text-sm font-semibold">{t.label}</div><div className="text-[11px] text-slate-500">{t.years} {T("yr", "yr")} · {t.blurb}</div></div>
            <Btn small tone="ghost" disabled={Boolean(b)} onClick={() => run({ t: "trade", id: t.id })}>{T("Enrol", "Register")}</Btn>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function MortgageCard({ p, run }: { p: Player; run: Run }) {
  const [kind, setKind] = useState<keyof typeof HOUSE_KINDS>("bungalow");
  const [years, setYears] = useState(15);
  if (p.age < 18) return null;
  const q = mortgageQuote(p, kind, years);
  const owned = p.houses.filter((h) => h.loanId && mortgageBalance(p, h) > 0);
  return (
    <Card>
      <H sub={T("Buy now, repay monthly. Miss payments and the bank takes the house.", "Buy now, pay small small every month. If you miss payment, bank go take the house.")}>{T("Mortgage", "Mortgage")}</H>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(HOUSE_KINDS) as (keyof typeof HOUSE_KINDS)[]).filter((k) => k !== "land").map((k) => <Btn key={k} small tone={kind === k ? "gold" : "ghost"} onClick={() => setKind(k)}>{HOUSE_KINDS[k].label}</Btn>)}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs">{T("Term", "Term")}: {[10, 15, 20].map((y) => <Btn key={y} small tone={years === y ? "gold" : "ghost"} onClick={() => setYears(y)}>{y} {T("yrs", "yrs")}</Btn>)}</div>
      <dl className="mt-3 space-y-1 text-sm">
        <Row k={T("Price", "Price")} v={naira(q.price)} />
        <Row k={T("Deposit now", "Deposit now")} v={naira(q.down)} />
        <Row k={T("Bank fee", "Bank fee")} v={naira(q.fee)} />
        <Row k={T("Monthly repayment", "Monthly repayment")} v={naira(q.monthly)} />
        <Row k={T("Interest rate", "Interest rate")} v={T(`${(q.apr * 100).toFixed(0)}% a year`, `${(q.apr * 100).toFixed(0)}% every year`)} />
        <Row k={T("Total interest", "Total interest")} v={naira(q.interest)} bad />
      </dl>
      <Btn className="mt-3 w-full" tone="gold" disabled={Boolean(q.block)} onClick={() => run({ t: "mortgage", kind, years })}>{q.block ?? T("Accept the mortgage", "Accept the mortgage")}</Btn>
      {owned.map((h) => <p key={h.id} className="mt-2 text-xs text-slate-500">{HOUSE_KINDS[h.kind].label} {T("in", "for")} {STATE_BY_ID[h.state].name}: {naira(mortgageBalance(p, h))} {T("still owed", "still remain")}</p>)}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Prison
// ---------------------------------------------------------------------------
export function PrisonCard({ p, run, full }: { p: Player; run: Run; full?: boolean }) {
  if (p.prison <= 0) return null;
  return (
    <Card className="border-red-300">
      <H sub={T(`${p.prison} year${p.prison === 1 ? "" : "s"} left. Phones, work, travel, shopping, dating and betting are not possible from inside.`, `${p.prison} year${p.prison === 1 ? "" : "s"} remain. Phone, work, travel, shopping, dating and betting no dey work from inside.`)}>{T("In prison", "You dey prison")}</H>
      {full && <p className="mb-2 text-sm text-slate-600">{T("This section is closed while you are locked up. You can still study, work on the prison detail, appeal, ask family for help, see a doctor or make a will.", "This section closed as you dey prison. You fit still read, work prison detail, appeal, ask family for help, see doctor or write will.")}</p>}
      <div className="grid grid-cols-2 gap-2">
        {PRISON_OPS.map((o) => {
          const b = prisonBlockOp(p, o.id);
          return (
            <button key={o.id} type="button" disabled={Boolean(b)} onClick={() => run({ t: "prison", op: o.id })} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left text-xs disabled:opacity-40">
              <span className="block font-semibold">{T(o.en, o.pcm)}</span>
              <span className="block text-slate-500">{b ?? (o.id === "appeal" ? `${naira(appealCost(p))} · ` : "") + T(o.subEn, o.subPcm)}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Property market, postgraduate study, headlines
// ---------------------------------------------------------------------------
const REGIONS: { id: string; label: () => string; match: (state: string) => boolean }[] = [
  { id: "all", label: () => T("All", "All"), match: () => true },
  { id: "abuja", label: () => "Abuja", match: (s) => s === "abuja" },
  { id: "lagos", label: () => "Lagos", match: (s) => s === "lagos" },
  { id: "rivers", label: () => "Port Harcourt", match: (s) => s === "rivers" },
  { id: "north", label: () => T("North (cheap)", "North (cheap)"), match: (s) => ["borno", "niger", "kano", "kaduna", "plateau", "kwara"].includes(s) },
  { id: "other", label: () => T("Other cities", "Other cities"), match: (s) => !["abuja", "lagos", "rivers", "borno", "niger", "kano", "kaduna", "plateau", "kwara"].includes(s) },
];

const growthWord = (g: number) => (g >= 0.04 ? T("fast", "fast") : g >= 0.025 ? T("good", "good") : T("steady", "steady"));
const riskWord = (r: number) => (r >= 0.06 ? T("high risk", "high risk") : r >= 0.03 ? T("some risk", "small risk") : T("low risk", "low risk"));

export function PropertyMarketCard({ p, run }: { p: Player; run: Run }) {
  const [years, setYears] = useState(15);
  const [region, setRegion] = useState("all");
  const [sortBy, setSortBy] = useState<"price" | "yield">("price");
  if (p.age < 18) return null;
  const f = REGIONS.find((r) => r.id === region) ?? REGIONS[0];
  const list = (p.listings ?? []).filter((l) => f.match(l.stateId)).sort((a, b) => (sortBy === "price" ? a.price - b.price : (locationOf(b.loc)?.yield ?? 0) - (locationOf(a.loc)?.yield ?? 0)));
  return (
    <Card>
      <H sub={T("Houses and plots for sale across Nigeria. Prices follow the neighbourhood: Banana Island costs billions, Maiduguri costs a few million but is riskier.", "Houses and plots wey dey for sale for Naija. Price dey follow area: Banana Island cost billions, Maiduguri cost small but e risky.")}>{T("Property market", "Property market")}</H>
      <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
        {REGIONS.map((r) => <button key={r.id} type="button" onClick={() => setRegion(r.id)} className={cx("shrink-0 rounded-full px-3 py-1 text-[11.5px] font-bold", region === r.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600")}>{r.label()}</button>)}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11.5px] text-slate-500">
        {T("Sort", "Sort")}:
        <Btn small tone={sortBy === "price" ? "gold" : "ghost"} onClick={() => setSortBy("price")}>{T("Price", "Price")}</Btn>
        <Btn small tone={sortBy === "yield" ? "gold" : "ghost"} onClick={() => setSortBy("yield")}>{T("Rent yield", "Rent yield")}</Btn>
        <span className="ml-1">{T("Mortgage", "Mortgage")}:</span>
        {[10, 15, 20].map((y) => <Btn key={y} small tone={years === y ? "gold" : "ghost"} onClick={() => setYears(y)}>{y}y</Btn>)}
      </div>
      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-slate-500">{T("Nothing listed in this area right now.", "Nothing dey for this area now.")}</p>}
        {list.map((l) => {
          const loc = locationOf(l.loc);
          const mort = l.kind === "land" ? null : mortgageQuote(p, l.kind, years, { price: l.price });
          const cos = l.kind === "land" ? null : mortgageQuote(p, l.kind, years, { price: l.price, cosign: true });
          const plan = planQuote(p, l);
          return (
            <div key={l.id} className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[13.5px] font-extrabold text-[#0b2a6b]">{HOUSE_KINDS[l.kind].label}</div>
                  <div className="text-[12px] font-semibold text-slate-600">{loc?.name ?? STATE_BY_ID[l.stateId].name}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[14px] font-extrabold text-blue-600">{naira(l.price)}</div>
                  {loc && <div className="text-[10.5px] text-slate-500">{TIER_LABEL[loc.tier]()}</div>}
                </div>
              </div>
              {loc && <p className="mt-1 text-[11.5px] leading-snug text-slate-500">{loc.blurb()}</p>}
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10.5px]">
                <Badge tone={l.condition === "good" ? "green" : l.condition === "fair" ? "gray" : "red"}>{l.condition === "good" ? T("Good condition", "Good condition") : l.condition === "fair" ? T("Fair", "Fair") : T("Run-down", "Run-down")}</Badge>
                {loc && l.kind !== "land" && <Badge tone="gold">{T("Rent", "Rent")} ~{naira(l.value * loc.yield)}/{T("yr", "yr")} ({(loc.yield * 100).toFixed(1)}%)</Badge>}
                {loc && <Badge>{T("Growth", "Growth")}: {growthWord(loc.growth)}</Badge>}
                {loc && <Badge tone={loc.risk >= 0.06 ? "red" : "gray"}>{riskWord(loc.risk)}</Badge>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Btn small tone="gold" disabled={Boolean(listingBlock(p, l, "cash"))} onClick={() => run({ t: "property", id: l.id, mode: "cash" })}>{T("Pay cash", "Pay cash")}</Btn>
                {mort && <Btn small tone="ghost" disabled={Boolean(mort.block)} title={mort.block ?? ""} onClick={() => run({ t: "property", id: l.id, mode: "mortgage", years })}>{T("Mortgage", "Mortgage")} · {naira(mort.monthly)}/{T("mo", "mo")}</Btn>}
                {cos && <Btn small tone="ghost" disabled={Boolean(cos.block)} title={cos.block ?? ""} onClick={() => run({ t: "property", id: l.id, mode: "cosign", years })}>{T("Parent co-signs", "Parent co-sign")}</Btn>}
                <Btn small tone="ghost" disabled={Boolean(plan.block)} title={plan.block ?? ""} onClick={() => run({ t: "property", id: l.id, mode: "plan" })}>{T("Payment plan", "Payment plan")} · {naira(plan.monthly)}/{T("mo", "mo")}</Btn>
              </div>
              {(mort?.block || cos?.block) && <p className="mt-1 text-[10px] text-slate-400">{mort?.block}{mort?.block && cos?.block ? " · " : ""}{cos?.block}</p>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** Everything you own in property: where it is, what it earns, and what you can do with it. */
export function PortfolioCard({ p, run }: { p: Player; run: Run }) {
  if (p.houses.length === 0) return null;
  const total = p.houses.reduce((s, h) => s + h.value, 0);
  const rent = p.houses.filter((h) => h.use === "rent" && !h.project).reduce((s, h) => s + h.value * (locationOf(h.loc)?.yield ?? 0.05), 0);
  return (
    <Card>
      <H sub={T(`Worth ${naira(total)} · rent about ${naira(rent)} a year`, `Worth ${naira(total)} · rent like ${naira(rent)} per year`)}>{T("Your properties", "Your properties")}</H>
      <div className="space-y-2">
        {p.houses.map((h) => {
          const loc = locationOf(h.loc);
          const opts = developOptions(h);
          return (
            <div key={h.id} className="rounded-xl bg-slate-50 p-3">
              <div className="flex justify-between text-sm">
                <span className="min-w-0 truncate font-bold text-[#0b2a6b]">{HOUSE_KINDS[h.kind].label} · {loc?.name ?? STATE_BY_ID[h.state].name}</span>
                <span className="shrink-0 text-blue-600">{naira(h.value)}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                {h.project ? T(`Being built: ${HOUSE_KINDS[h.project.kind].label.toLowerCase()}, ready at age ${h.project.readyAge}`, `Dem dey build ${HOUSE_KINDS[h.project.kind].label.toLowerCase()}, e go ready for age ${h.project.readyAge}`) : h.use === "owner" ? T("You live here", "You dey live here") : h.use === "family" ? T("Family lives here", "Family dey live here") : h.use === "rent" ? T("Rented out", "Dem rent am") : T("Empty", "Empty")}
                {loc && !h.project && h.kind !== "land" ? ` · ${T("yield", "yield")} ${(loc.yield * 100).toFixed(1)}%` : ""}
                {h.loanId ? ` · ${T("mortgaged", "mortgage dey")}` : ""}
              </div>
              {!h.project && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {h.kind !== "land" && (["owner", "family", "rent", "empty"] as const).map((u) => (
                    <Btn key={u} small tone={h.use === u ? "gold" : "ghost"} onClick={() => run({ t: "use", id: h.id, use: u })}>{u === "owner" ? T("Live", "Live") : u === "family" ? T("Family", "Family") : u === "rent" ? T("Rent out", "Rent out") : T("Empty", "Empty")}</Btn>
                  ))}
                  <Btn small tone="red" onClick={() => run({ t: "sell", id: h.id })}>{T("Sell", "Sell")}</Btn>
                </div>
              )}
              {opts.length > 0 && (
                <div className="mt-2 border-t border-slate-200 pt-2">
                  <div className="mb-1 text-[11px] font-semibold text-slate-500">{T("Develop this plot (build and profit)", "Develop this plot (build make profit)")}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {opts.map((k) => {
                      const c = developCost(p, h, k);
                      const mid = loc ? marketMid(loc, k) : null;
                      return <Btn key={k} small tone="ghost" disabled={Boolean(developBlock(p, h, k))} title={mid ? `${T("Worth about", "Worth like")} ${naira((mid ?? 0) * Math.pow(p.index, 0.95))}` : ""} onClick={() => run({ t: "develop", id: h.id, kind: k })}>{HOUSE_KINDS[k].label} · {naira(c)}</Btn>;
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function PostgradCard({ p, run }: { p: Player; run: Run }) {
  if (p.edu !== "tertiary" || p.age < 21) return null;
  if (p.flags.postgrad === "PhD") return <Card><H>{T("Postgraduate study", "Postgraduate study")}</H><p className="text-sm text-slate-600">{T("You hold a PhD.", "You don get PhD.")}</p></Card>;
  return (
    <Card>
      <H sub={T("A higher degree raises your pay and your standing.", "Higher degree go raise your pay and respect.")}>{T("Postgraduate study", "Postgraduate study")}</H>
      {p.flags.postgrad && <p className="mb-2 text-xs text-slate-500">{T("Current: Master's degree", "Current: Master's degree")}</p>}
      <div className="space-y-2">
        {POSTGRAD.map((d) => {
          const b = postgradBlock(p, d.id);
          return (
            <div key={d.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <div className="text-sm"><div className="font-semibold">{T(d.en, d.pcm)}</div><div className="text-[11px] text-slate-500">{d.years} {T("yr", "yr")}</div></div>
              <Btn small tone="ghost" disabled={Boolean(b)} onClick={() => run({ t: "postgrad", id: d.id })}>{b ?? T("Enrol", "Register")}</Btn>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function HeadlinesCard({ p }: { p: Player }) {
  const news = (p.world?.news ?? []).slice(-3).reverse();
  if (news.length === 0) return null;
  return (
    <Card>
      <H>{T("In the news", "Gist for ground")}</H>
      <ul className="space-y-1.5">{news.map((n, i) => <li key={i} className="text-xs text-slate-700"><span className="text-blue-600">{T("Age", "Age")} {n.age}:</span> {p.lang === "en" ? n.en : n.pcm}</li>)}</ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Travel: choose how to go
// ---------------------------------------------------------------------------
export function TravelSheet({ p, to, run, onClose }: { p: Player; to: StateInfo; run: Run; onClose: () => void }) {
  const opts = transportOptions(p, to);
  return (
    <Sheet title={T(`Travel to ${to.name}`, `Travel go ${to.name}`)} onClose={onClose}>
      <p className="mb-3 text-[12px] text-slate-500">{T("How you travel decides what it costs and how risky it is. Roads are where kidnappers wait.", "How you travel go decide the cost and the risk. Na road kidnappers dey wait.")}</p>
      <div className="space-y-2">
        {opts.map((o) => (
          <button key={o.id} type="button" disabled={Boolean(o.block) || p.money < o.cost} onClick={() => { onClose(); run({ t: "travel", to: to.id, mode: o.id }); }} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:bg-blue-50 disabled:opacity-45">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[14px] font-bold text-[#0b2a6b]">{o.label}</span>
              <span className="text-[13px] font-extrabold text-blue-600">{naira(o.cost)}</span>
            </div>
            <div className="text-[11.5px] text-slate-500">{o.block ?? o.blurb}</div>
            {!o.block && <div className={cx("mt-1 text-[11px] font-semibold", o.risk < 0.012 ? "text-emerald-600" : o.risk < 0.03 ? "text-amber-600" : "text-red-600")}>{riskLabel(o.risk)} · {(o.risk * 100).toFixed(1)}% {T("chance of being kidnapped", "chance of kidnap")}</div>}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Market news and the financial adviser
// ---------------------------------------------------------------------------
export function MarketNewsCard({ p, run }: { p: Player; run: Run }) {
  if (p.age < 18) return null;
  const m = p.market;
  const feed = [...(m.feed ?? [])].reverse().slice(0, 6);
  const reg = m.regime ?? "normal";
  const idx: [string, number | undefined][] = [
    [T("Stocks", "Stocks"), m.ngx], [T("Penny", "Penny"), m.penny], [T("Crypto", "Crypto"), m.crypto], [T("Bonds", "Bonds"), m.bond], [T("Property funds", "Property funds"), m.reit],
  ];
  return (
    <Card>
      <H sub={T("Read the news before you invest. A good adviser sees some of it coming.", "Read the news before you invest. Good adviser fit see some of am before e come.")}>{T("Market news", "Market news")}</H>
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        <Badge tone={reg === "bull" ? "green" : reg === "bear" ? "red" : "gold"}>{reg === "bull" ? T("Bull market", "Bull market") : reg === "bear" ? T("Bear market", "Bear market") : T("Steady market", "Steady market")}</Badge>
        {idx.map(([k, v]) => <span key={k} className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{k} {Math.round(v ?? 100)}</span>)}
      </div>
      {feed.length === 0 ? <p className="text-xs text-slate-500">{T("Nothing in the headlines yet.", "Nothing for headlines yet.")}</p> : (
        <ul className="space-y-1.5">
          {feed.map((f, i) => (
            <li key={i} className={`rounded-xl px-3 py-2 text-xs ${f.kind === "tip" ? "bg-blue-50 text-blue-900" : "bg-slate-50 text-slate-700"}`}>
              <span className={f.tone === "up" ? "text-emerald-600" : f.tone === "down" ? "text-red-600" : "text-slate-500"}>{f.tone === "up" ? "▲ " : f.tone === "down" ? "▼ " : "• "}</span>{T(f.en, f.pcm)}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <div className="text-sm font-semibold">{T("Financial adviser", "Financial adviser")}</div>
        {p.advisor ? (
          <div className="mt-1 flex items-center justify-between text-xs">
            <span>{p.advisor.name} · {T(ADVISOR_TIERS[p.advisor.tier - 1].en, ADVISOR_TIERS[p.advisor.tier - 1].pcm)} · {naira(advisorFee(p, p.advisor.tier))}/{T("mo", "mo")}</span>
            <Btn small tone="ghost" onClick={() => run({ t: "advisor", op: "fire" })}>{T("Let go", "Sack am")}</Btn>
          </div>
        ) : (
          <div className="mt-1 space-y-1.5">
            {ADVISOR_TIERS.map((t) => {
              const b = advisorBlock(p, t.tier);
              return (
                <div key={t.tier} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
                  <div><div className="font-semibold">{T(t.en, t.pcm)}</div><div className="text-slate-500">{naira(advisorFee(p, t.tier))}/{T("month", "month")}{b ? ` · ${b}` : ""}</div></div>
                  <Btn small tone="gold" disabled={Boolean(b)} onClick={() => run({ t: "advisor", op: "hire", tier: t.tier })}>{T("Hire", "Hire")}</Btn>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
