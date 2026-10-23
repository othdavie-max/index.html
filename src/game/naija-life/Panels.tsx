"use client";

import { ADVISOR_TIERS, advisorBlock, advisorFee } from "./markets";
import { useState } from "react";
import { Avatar } from "./Avatar";
import type { Action } from "./engine";
import { BET_KINDS, betBlock, betProfit } from "./betting";
import { profileOf } from "./bizProfiles";
import { BIZ_KINDS, BIZ_BY_ID, actBlock, actCost, hireCost, leverIdx, startBlock, startCostFor, upgradeCost, valuation, workerPay } from "./business";
import { CRIMES, crimeBlock } from "./crime";
import { HOME_TIERS, HOUSE_KINDS, LUXURIES, STATE_BY_ID } from "./data";
import { mortgageBalance, mortgageQuote } from "./mortgage";
import { SUPPORT_KINDS, defaultAmount, supportKindsFor, type SupportKind } from "./family";
import { FACILITIES, facilitiesFor, treatmentCost } from "./health";
import { GROWTH_ACTIVITIES, SKILLS, TRADES, tradeBlock, enlistBlock, gymBlock, growthBlock, learnBlock, learnCost, skillLevel, skillTier, skillTopPct, type LearnMode } from "./life";
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
import { UNI_BY_ID } from "./universities";
import { beneficiaries, currentShares, totalPct } from "./will";
import type { Business, Candidate, Npc, PartnerRel, Platform, Player, StateInfo } from "./types";
import { ActionSheet, BackPill, Badge, Bar, Btn, Card, H, Hub, HubList, ListGroup, ListRow, Sheet, SubTabs, cx } from "./ui";
import { riskLabel, transportOptions } from "./travel";
import { interactBlock, interactionsFor, makeFriendBlock } from "./people";
import { PRISON_OPS, appealCost, prisonBlockOp } from "./prison";
import { T, naira } from "./util";

type Run = (a: Action) => void;
const I = (p: Player, n: number) => Math.round(n * Math.pow(p.index, 0.92));

const lookStr = (n: Npc): string => [n.look.skin, n.look.hair, n.look.hairColor, n.look.beard, n.look.wear, n.look.outfit, n.look.outfitColor].join("|");
void lookStr;

function Face({ n, p, size = 56 }: { n: Npc; p: Player; size?: number }) {
  const age = Math.max(0, p.age + n.ageDelta);
  const inUniform = (n.role === "classmate" || n.role === "friend") && n.stage && n.stage !== "university" && !n.former && age >= 5 && age < 18;
  return <Avatar look={inUniform ? { ...n.look, outfit: "uniform" } : n.look} gender={n.gender} age={age} size={size} dim={!n.alive} />;
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
    { id: "social", label: "Facebook, Instagram, TikTok...", sub: T("Social media", "Social media") },
    { id: "bet", label: "Naija9ja Bet", sub: T("Sports betting", "Sports betting") },
  ];
  const appUi: Record<string, [string, string]> = { wallet: ["👛", "bg-sky-100"], spark: ["💘", "bg-rose-100"], social: ["📸", "bg-pink-100"], bet: ["⚽", "bg-emerald-100"] };
  if (app === "home") {
    return (
      <>
        <HubList onPick={(r) => setApp(r.id as PhoneApp)} groups={[{ title: p.possessions.smartphone ? T("Smartphone", "Smartphone") : T("Basic phone: upgrade for social apps", "Basic phone: upgrade for social apps"), rows: apps.map((a) => ({ id: a.id, emoji: appUi[a.id][0], tile: appUi[a.id][1], name: a.label, desc: a.sub })) }]} />
        {!p.possessions.smartphone && <Btn small tone="gold" className="mt-3" disabled={p.money < I(p, 180_000)} onClick={() => run({ t: "buy", item: "smartphone" })}>{T("Upgrade to a smartphone", "Upgrade to smartphone")} ({naira(I(p, 180_000))})</Btn>}
      </>
    );
  }
  return (
    <>
      <BackPill label={T("Phone", "Phone")} onClick={() => setApp("home")} />
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
      <ListGroup title={T("Loan offers", "Loan offers")} sub={T("Read the terms before you accept. Late payment hurts your credit.", "Read the terms before you accept. Late payment go spoil your credit.")}>
        {offers.map((o) => (
          <ListRow key={o.id} emoji="🏦" tile={o.eligible ? "bg-slate-100" : "bg-emerald-100"} name={o.name} desc={o.blurb} wrap
            note={o.eligible ?? undefined} right={o.eligible ? undefined : T(`up to ${naira(o.limit)}`, `reach ${naira(o.limit)}`)}
            disabled={Boolean(o.eligible)} onClick={o.eligible ? undefined : () => { setSel(o.id); setTerm(o.minTerm); }} />
        ))}
      </ListGroup>
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
        <ListGroup title={T("What you owe", "Wetin you owe")}>
          {mine.map((l) => (
            <div key={l.id}>
              <ListRow emoji="🧾" tile="bg-rose-100" name={l.lenderName} right={<span className="text-red-600">{naira(l.balance)}</span>} wrap
                desc={`${l.informal ? T(`Due month ${l.dueIndex ? ((l.dueIndex - 1) % 12) + 1 : "?"} of age ${l.dueIndex ? Math.floor((l.dueIndex - 1) / 12) : "?"}`, `Due month ${l.dueIndex ? ((l.dueIndex - 1) % 12) + 1 : "?"} of age ${l.dueIndex ? Math.floor((l.dueIndex - 1) / 12) : "?"}`) : T(`${naira(l.monthly)}/month`, `${naira(l.monthly)}/month`)}${l.missed > 0 ? T(` · ${l.missed} missed`, ` · ${l.missed} you no pay`) : ""}`} />
              <div className="flex gap-1.5 px-3.5 pb-3">
                <Btn small tone="ghost" disabled={p.money < Math.min(l.balance, l.monthly || l.balance)} onClick={() => run({ t: "loanRepay", id: l.id, amount: l.informal ? l.balance : l.monthly })}>{l.informal ? T("Pay in full", "Pay am finish") : T("Pay instalment", "Pay instalment")}</Btn>
                {!l.informal && <Btn small tone="ghost" disabled={p.money < l.balance} onClick={() => run({ t: "loanRepay", id: l.id, amount: l.balance })}>{T("Settle", "Clear am")} ({naira(l.balance)})</Btn>}
              </div>
            </div>
          ))}
        </ListGroup>
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
        <ListGroup title={T("Create your Spark profile", "Create your Spark profile")} sub={T("Make a profile to see who is around.", "Make profile to see who dey around.")}>
          <div className="px-3.5 py-3"><input value={bio} onChange={(e) => setBio(e.target.value)} placeholder={T("Short bio", "Short bio")} maxLength={80} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></div>
          <ListRow emoji="💘" tile="bg-rose-100" name={T("Create profile", "Create profile")} onClick={() => run({ t: "dating", op: "profile", bio: bio || T("Just here for good vibes.", "I just dey here for good vibes."), interests: ["music", "food", "travel"] })} />
        </ListGroup>
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
        <ListGroup title={T("Matches and partners", "Matches and partners")}>
          {partners.map(({ rel, npc }) => <PartnerRow key={npc.id} p={p} rel={rel} npc={npc} run={run} />)}
        </ListGroup>
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
    <div className="px-3.5 py-3">
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
    <>
      <ListGroup title={T("Love and family life", "Love and family life")} sub={T("Meet people, date, marry and start a family. No phone needed.", "Meet people, date, marry and start family. You no need phone.")}>
        <ListRow emoji="💘" tile="bg-rose-100" name={T("Go out and meet someone", "Go out meet person")} desc={`${p.rel.outingsLeft ?? 4} ${T("outings left", "outings remain")}`} disabled={p.prison > 0} onClick={() => run({ t: "dating", op: "meet" })} />
        <ListRow emoji="👶" tile="bg-amber-100" name={T("Adopt a child", "Adopt pikin")} note={adopt} disabled={Boolean(adopt)} onClick={() => run({ t: "adopt" })} />
        <ListRow emoji="🧬" tile="bg-violet-100" name={T("Fertility treatment", "Fertility treatment")} note={fertile} disabled={Boolean(fertile)} onClick={() => run({ t: "fertility" })} />
        {p.spouse && <ListRow emoji="💔" tile="bg-rose-100" name={T("Divorce", "Divorce")} note={divorceBlock(p)} disabled={Boolean(divorceBlock(p))} onClick={() => run({ t: "dating", op: "divorce" })} />}
        {p.flags.pregnantBy && p.flags.keepPregnancy ? <ListRow emoji="🍼" tile="bg-sky-100" name={T("A baby is on the way", "Baby dey come")} /> : null}
      </ListGroup>
      <ListGroup title={T("Partners", "Partners")}>
        {partners.length === 0 ? <ListRow emoji="🧍" tile="bg-slate-100" name={T("You are single", "You dey single")} desc={T("Go out, or use the Spark app on your phone.", "Go out, or use Spark for your phone.")} wrap /> : partners.map(({ rel, npc }) => <PartnerRow key={npc.id} p={p} rel={rel} npc={npc} run={run} />)}
      </ListGroup>
    </>
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

const PLAT_EMOJI: Record<string, string> = { gram: "📸", toktik: "🎵", vidtube: "▶️", facebook: "👥", twitter: "🐦" };

function Social({ p, run }: { p: Player; run: Run }) {
  const s = p.social;
  const block = socialBlock(p);
  const [plat, setPlat] = useState<Platform>("gram");
  return (
    <>
      <ListGroup title={T("Social media", "Social media")} sub={s ? T(`${s.handle} · ${totalFollowers(p).toLocaleString()} followers`, `${s.handle} · ${totalFollowers(p).toLocaleString()} followers`) : T("Build a following.", "Build your followers.")}>
        {block && <ListRow emoji="🚫" tile="bg-slate-100" name={block} wrap />}
        {PLATFORMS.map((pl) => {
          const acc = s?.accounts[pl.id];
          return acc
            ? <ListRow key={pl.id} emoji={PLAT_EMOJI[pl.id] ?? "📱"} tile="bg-emerald-100" name={pl.label} desc={`${acc.followers.toLocaleString()} ${T("followers", "followers")}`} right="✓" />
            : <ListRow key={pl.id} emoji={PLAT_EMOJI[pl.id] ?? "📱"} tile="bg-slate-100" name={`${T("Open", "Open")} ${pl.label}`} disabled={Boolean(block) || p.age < pl.minAge} onClick={() => run({ t: "social", op: "account", platform: pl.id })} />;
        })}
        {s && <div className="grid grid-cols-3 gap-3 px-3.5 py-3"><Bar label={T("Brand", "Brand")} value={s.brand} tone="gold" /><Bar label={T("Skill", "Skill")} value={s.skill} tone="blue" /><Bar label={T("Controversy", "Wahala")} value={s.controversy} invert /></div>}
      </ListGroup>
      {s && Object.keys(s.accounts).length > 0 && (
        <>
          <ListGroup title={T("Create content", "Create content")} sub={`${T(`${s.postsLeft} posts left this year`, `${s.postsLeft} posts remain this year`)} · ${PLATFORMS.find((x) => x.id === plat)?.blurb ?? ""}`}>
            <div className="flex flex-wrap gap-1.5 px-3.5 py-3">
              {(Object.keys(s.accounts) as Platform[]).map((k) => <Btn key={k} small tone={plat === k ? "gold" : "ghost"} onClick={() => setPlat(k)}>{PLATFORMS.find((x) => x.id === k)?.label}</Btn>)}
            </div>
            {CONTENT.filter((c) => PLATFORMS.find((x) => x.id === plat)?.content.includes(c.id)).map((c) => {
              const b = postBlock(p, plat, c.id);
              return <ListRow key={c.id} emoji="🎬" tile="bg-violet-100" name={c.label} right={naira(I(p, c.cost))} note={b} disabled={Boolean(b)} onClick={() => run({ t: "social", op: "post", platform: plat, content: c.id })} />;
            })}
            <ListRow emoji="🤝" tile="bg-amber-100" name={T("Collab with a creator", "Collab with creator")} onClick={() => run({ t: "social", op: "collab", platform: plat })} />
            <ListRow emoji="📷" tile="bg-sky-100" name={T("Upgrade gear", "Upgrade gear")} onClick={() => run({ t: "social", op: "gear" })} />
          </ListGroup>
          {s.sponsors.length > 0 && (
            <ListGroup title={T("Sponsors", "Sponsors")}>
              {s.sponsors.map((x) => <ListRow key={x.brand} emoji="💼" tile="bg-emerald-100" name={x.brand} desc={`${x.monthsLeft}m`} right={`${naira(x.monthly)}/${T("mo", "mo")}`} />)}
            </ListGroup>
          )}
        </>
      )}
    </>
  );
}

function Betting({ p, run }: { p: Player; run: Run }) {
  const [stake, setStake] = useState(5_000);
  const stakes = [2_000, 5_000, 20_000, 100_000].map((n) => I(p, n));
  const bb = betBlock(p, stake);
  return (
    <>
      <ListGroup title="Naija9ja Bet" sub={`${T(`${p.bets.slotsLeft} slots left this year · Net ${betProfit(p) >= 0 ? "+" : ""}${naira(betProfit(p))} lifetime`, `${p.bets.slotsLeft} slots remain this year · Net ${betProfit(p) >= 0 ? "+" : ""}${naira(betProfit(p))} for life`)}. ${T("The house always wins in the long run. Adults only.", "Betting house dey always win for long run. Na for adults only.")}`}>
        <div className="flex flex-wrap gap-1.5 px-3.5 py-3">{stakes.map((s) => <Btn key={s} small tone={stake === s ? "gold" : "ghost"} onClick={() => setStake(s)}>{naira(s)}</Btn>)}</div>
        {BET_KINDS.map((k) => <ListRow key={k.id} emoji={k.id === "single" ? "⚽" : k.id === "acca" ? "🎟️" : "🎰"} tile="bg-emerald-100" name={k.label} desc={k.blurb} wrap right={naira(stake)} note={bb} disabled={Boolean(bb)} onClick={() => run({ t: "bet", kind: k.id, stake })} />)}
      </ListGroup>
      {p.bets.compulsion > 50 && <p className="px-1 text-xs text-red-600">{T("You are betting compulsively.", "You no fit stop to bet.")}</p>}
    </>
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
  const mon = monthlySummary(p);
  const upc = upcomingPayments(p);
  const sign = (n: number) => `${n >= 0 ? "+" : ""}${naira(n)}`;
  const tone = (n: number) => (n >= 0 ? "text-emerald-600" : "text-red-600");
  return (
    <div>
      <h2 className="mb-1 px-1 text-[12px] font-extrabold uppercase tracking-wide text-slate-500">{T("Ledger", "Ledger")}</h2>
      <p className="mb-2 px-1 text-[11px] text-slate-500">{T("Every naira in and out is recorded.", "Every naira wey enter or comot dey recorded.")}</p>
      <SubTabs value={view} onChange={setView} tabs={[{ id: "summary", label: T("Yearly", "Yearly") }, { id: "months", label: T("Monthly", "Monthly") }, { id: "upcoming", label: T("Upcoming", "Wetin dey come") }, { id: "history", label: T("Transactions", "Transactions") }]} />
      {view === "months" ? (
        <ListGroup>
          {mon.length === 0 && <ListRow emoji="🗒️" name={T("Nothing recorded yet", "Nothing dey yet")} />}
          {mon.map((m) => (
            <ListRow key={m.key} emoji="📅" tile="bg-sky-100" name={`${T("Age", "Age")} ${m.age} · ${T("month", "month")} ${m.month}`}
              desc={`${T("In", "In")} ${naira(m.income)} · ${T("Out", "Out")} ${naira(m.expense)}`} right={<span className={tone(m.income - m.expense)}>{sign(m.income - m.expense)}</span>} />
          ))}
        </ListGroup>
      ) : view === "upcoming" ? (
        <ListGroup>
          {upc.length === 0 && <ListRow emoji="✅" tile="bg-emerald-100" name={T("No scheduled payments", "No payment dey wait for you")} />}
          {upc.map((u, i) => <ListRow key={i} emoji="🧾" tile="bg-amber-100" name={u.label} desc={u.inMonths <= 0 ? T("this month", "this month") : T(`in ${u.inMonths} month${u.inMonths === 1 ? "" : "s"}`, `in ${u.inMonths} month${u.inMonths === 1 ? "" : "s"}`)} right={naira(u.amount)} />)}
        </ListGroup>
      ) : view === "summary" ? (
        <ListGroup>
          {years.length === 0 && <ListRow emoji="🗒️" name={T("Nothing recorded yet", "Nothing dey yet")} />}
          {years.slice(0, 8).map((y) => (
            <ListRow key={y.age} emoji="📊" tile="bg-violet-100" name={`${T("Age", "Age")} ${y.age}`}
              desc={`${T("In", "In")} ${naira(y.income)} · ${T("Out", "Out")} ${naira(y.expense)}${y.top.length ? ` · ${y.top.map((t) => `${t.category} ${naira(t.amount)}`).join(", ")}` : ""}`} wrap
              right={<span className={tone(y.net)}>{sign(y.net)}</span>} />
          ))}
        </ListGroup>
      ) : (
        <>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="mb-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs">
            <option value="all">{T("All categories", "All categories")}</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ListGroup>
            {list.map((t) => (
              <ListRow key={t.id} emoji={t.amount >= 0 ? "⬇️" : "⬆️"} tile={t.amount >= 0 ? "bg-emerald-100" : "bg-rose-100"} name={t.reason}
                desc={`${T("age", "age")} ${t.age} · ${T("month", "month")} ${t.month} · ${t.category}`} right={<span className={tone(t.amount)}>{sign(t.amount)}</span>} />
            ))}
          </ListGroup>
        </>
      )}
    </div>
  );
}

type WealthTab = "over" | "assets" | "debts" | "stuff";
function WTab({ id, tab, setTab, children }: { id: WealthTab; tab: WealthTab; setTab: (t: WealthTab) => void; children: React.ReactNode }) {
  return <button type="button" onClick={() => setTab(id)} className={cx("flex-1 rounded-lg px-1 py-1.5 text-[11px] font-semibold", tab === id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600")}>{children}</button>;
}
function Line({ k, sub, v, bad }: { k: string; sub?: string; v: string; bad?: boolean }) {
  return <ListRow emoji={bad ? "📉" : "💠"} tile={bad ? "bg-rose-100" : "bg-sky-100"} name={k} desc={sub} right={<span className={bad ? "text-red-600" : "text-slate-700"}>{v}</span>} />;
}

export function NetWorthCard({ p }: { p: Player }) {
  const [tab, setTab] = useState<WealthTab>("over");
  const holdings = p.holdings.reduce((s, h) => s + h.value, 0);
  const houses = p.houses.reduce((s, h) => s + h.value, 0);
  const cars = p.vehicles.reduce((s, v) => s + v.value, 0);
  const open = p.businesses.filter((b) => b.status === "open");
  const biz = open.reduce((s, b) => s + valuation(p, b), 0);
  const owed = receivables(p);
  const debt = totalDebt(p);
  const assets = Math.max(0, p.money) + holdings + houses + cars + biz + owed;
  const net = assets - debt;
  const parts: [string, number, string][] = [
    [T("Cash", "Cash"), Math.max(0, p.money), "bg-emerald-400"], [T("Investments", "Investments"), holdings, "bg-blue-500"], [T("Property", "Property"), houses, "bg-amber-400"],
    [T("Vehicles", "Vehicles"), cars, "bg-violet-400"], [T("Businesses", "Businesses"), biz, "bg-pink-400"], [T("Owed to you", "Wetin people owe you"), owed, "bg-slate-400"],
  ];
  const loans = p.loans.filter((l) => l.direction === "owed" && l.status === "active");
  const pl = (h: { invested: number; value: number }) => (h.invested > 0 ? ((h.value - h.invested) / h.invested) * 100 : 0);
  const luxOwned = LUXURIES.filter((l) => l.once && p.flags[`own_${l.id}`]);
  return (
    <div>
      <h2 className="mb-1 px-1 text-[12px] font-extrabold uppercase tracking-wide text-slate-500">{T("Your wealth", "Your wealth")}</h2>
      <p className="mb-2 px-1 text-[11px] text-slate-500">{T("Cash is not the same as wealth.", "Cash no be the same as wealth.")}</p>
      <div className="mb-2 flex gap-1"><WTab id="over" tab={tab} setTab={setTab}>{T("Overview", "Overview")}</WTab><WTab id="assets" tab={tab} setTab={setTab}>{T("Assets", "Assets")}</WTab><WTab id="debts" tab={tab} setTab={setTab}>{T("Liabilities", "Debts")}</WTab><WTab id="stuff" tab={tab} setTab={setTab}>{T("Belongings", "Belongings")}</WTab></div>
      {tab === "over" && (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-3.5 shadow-[0_8px_22px_-14px_rgba(30,64,175,0.35)]">
          <div className="text-2xl font-extrabold text-[#0b2a6b]">{naira(net)}</div>
          <div className="text-[11px] text-slate-500">{T("net worth", "net worth")} · {T("assets", "assets")} {naira(assets)} · {T("debts", "debts")} {naira(debt)}</div>
          <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-slate-100">{parts.filter((x) => x[1] > 0).map(([k, v, c]) => <div key={k} className={c} style={{ width: `${(v / Math.max(1, assets)) * 100}%` }} title={k} />)}</div>
          <dl className="mt-2 space-y-1 text-sm">{parts.map(([k, v, c]) => <div key={k} className="flex justify-between"><dt className="flex items-center gap-1.5 text-slate-600"><span className={cx("h-2 w-2 rounded-full", c)} />{k}</dt><dd className="font-semibold">{naira(v)} <span className="text-[11px] font-normal text-slate-400">{assets > 0 ? Math.round((v / assets) * 100) : 0}%</span></dd></div>)}<Row k={T("Debts", "Debts")} v={`-${naira(debt)}`} bad={debt > 0} /></dl>
        </div>
      )}
      {tab === "assets" && (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_22px_-14px_rgba(30,64,175,0.35)]">
          <Line k={T("Cash", "Cash")} v={naira(p.money)} />
          {p.holdings.map((h) => <Line key={h.id} k={h.label} sub={`${T("put in", "wetin you put")} ${naira(h.invested)}`} v={`${naira(h.value)} (${pl(h) >= 0 ? "+" : ""}${pl(h).toFixed(0)}%)`} bad={pl(h) < 0} />)}
          {p.houses.map((h) => <Line key={h.id} k={`${HOUSE_KINDS[h.kind].label}${h.project ? ` (${T("building", "building")})` : ""}`} sub={`${locationOf(h.loc)?.name ?? STATE_BY_ID[h.state]?.name} · ${h.use}${h.loanId ? ` · ${T("mortgaged", "mortgage")}` : ""}`} v={naira(h.value)} />)}
          {p.vehicles.map((v) => <Line key={v.id} k={v.name} sub={`${v.role}${v.loanId ? ` · ${T("on loan", "on loan")}` : ""}`} v={naira(v.value)} />)}
          {open.map((b) => <Line key={b.id} k={b.name} sub={`${BIZ_BY_ID[b.kind]?.label} · ${T("level", "level")} ${b.level}`} v={naira(valuation(p, b))} />)}
          {owed > 0 && <Line k={T("Money owed to you", "Money wey people owe you")} v={naira(owed)} />}
          {assets <= 0 && <p className="px-3.5 py-3 text-xs text-slate-500">{T("Nothing yet.", "Nothing yet.")}</p>}
        </div>
      )}
      {tab === "debts" && (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_22px_-14px_rgba(30,64,175,0.35)]">
          {p.debt > 0 && <Line k={T("Other debts", "Other debts")} v={`-${naira(p.debt)}`} bad />}
          {loans.map((l) => <Line key={l.id} k={l.lenderName} sub={`${l.houseId ? `${T("mortgage", "mortgage")} · ` : ""}${T("monthly", "monthly")} ${naira(l.monthly)} · ${(l.apr * 100).toFixed(0)}%${l.missed ? ` · ${T("missed", "missed")} ${l.missed}` : ""}`} v={`-${naira(l.balance)}`} bad />)}
          {debt <= 0 && <p className="px-3.5 py-3 text-xs text-slate-500">{T("You owe nobody. Sleep well.", "You no owe anybody. Sleep well.")}</p>}
          <Line k={T("Total debts", "Total debts")} v={`-${naira(debt)}`} bad={debt > 0} />
        </div>
      )}
      {tab === "stuff" && (
        <div className="space-y-2 overflow-hidden rounded-2xl border border-slate-100 bg-white p-3.5 shadow-[0_8px_22px_-14px_rgba(30,64,175,0.35)]">
          {p.vehicles.length > 0 && <div className="grid grid-cols-2 gap-2">{p.vehicles.map((v) => { const m = modelOf(v.modelId); return <div key={v.id} className="rounded-xl bg-slate-50 p-2 text-center"><VehicleArt art={m?.art ?? "sedan"} color={m?.color ?? "#64748b"} size={110} /><div className="truncate text-xs font-semibold">{v.name}</div><div className="text-[11px] text-slate-500">{naira(v.value)}</div></div>; })}</div>}
          {p.houses.length > 0 && <div className="grid grid-cols-2 gap-2">{p.houses.map((h) => <div key={h.id} className="rounded-xl bg-slate-50 p-2 text-center"><div className="text-2xl">{h.kind === "land" ? "🌿" : h.kind === "plaza" ? "🏬" : h.kind === "mansion" ? "🏰" : "🏠"}</div><div className="truncate text-xs font-semibold">{HOUSE_KINDS[h.kind].label}</div><div className="truncate text-[11px] text-slate-500">{locationOf(h.loc)?.name ?? STATE_BY_ID[h.state]?.name}</div></div>)}</div>}
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {p.possessions.phone && <Badge>{p.possessions.smartphone ? T("Smartphone", "Smartphone") : T("Phone", "Phone")}</Badge>}
            {p.possessions.laptop && <Badge>{T("Laptop", "Laptop")}</Badge>}
            {p.possessions.license && <Badge tone="green">{T("Driver's licence", "Driver's licence")}</Badge>}
            {p.campus?.graduated && <Badge tone="gold">{UNI_BY_ID[p.campus.uni]?.short} {p.campus.cls}</Badge>}
            {luxOwned.map((l) => <Badge key={l.id} tone="gold">{l.label}</Badge>)}
            {p.achievements.slice(0, 6).map((x) => <Badge key={x}>{x}</Badge>)}
          </div>
          {p.vehicles.length + p.houses.length === 0 && !p.possessions.phone && luxOwned.length === 0 && <p className="text-xs text-slate-500">{T("You own very little for now.", "You no get plenty things yet.")}</p>}
        </div>
      )}
    </div>
  );
}

export function HousingCard({ p, run }: { p: Player; run: Run }) {
  const h = p.housing;
  const st = STATE_BY_ID[p.state];
  return (
    <>
      <ListGroup title={T("Where I live", "Where I dey")}>
        <ListRow emoji={h.type === "owned" ? "🏡" : h.type === "family" ? "🏠" : "🔑"} tile="bg-amber-100"
          name={h.type === "family" ? T("You live with family", "You dey live with family") : h.type === "owned" ? T("You own your home", "You get your own house") : T("Renting", "Renting")}
          desc={h.type === "family" || h.type === "owned" ? undefined : T(`${naira(h.annualRent)}/yr`, `${naira(h.annualRent)}/yr`)}
          note={h.arrears > 0 ? T(`Rent arrears: ${naira(h.arrears)}. You could be evicted.`, `Rent arrears: ${naira(h.arrears)}. Dem fit throw you out.`) : undefined} />
      </ListGroup>
      {p.age >= 18 && !st.abroad && (
        <ListGroup title={T("Rent a place", "Rent place")}>
          {HOME_TIERS.map((t) => <ListRow key={t.id} emoji="🏠" tile="bg-sky-100" name={t.label} desc={t.blurb} right={`${naira(I(p, t.rent) * st.cost)}/yr`} onClick={() => run({ t: "rent", tier: t.id })} />)}
          {h.type !== "family" && <ListRow emoji="👨‍👩‍👧" tile="bg-emerald-100" name={T("Move back with family", "Go back live with family")} onClick={() => run({ t: "moveHome" })} />}
        </ListGroup>
      )}
    </>
  );
}

const CAT_EMOJI: Record<string, string> = { taxi: "🛵", car: "🚗", suv: "🚙", luxury: "🚘", supercar: "🏎️", hypercar: "🏁", helicopter: "🚁", jet: "🛩️", boat: "🚤", yacht: "🛥️" };
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

const CAT_ONE: Record<string, () => string> = {
  taxi: () => T("Commercial", "Commercial"), car: () => T("Sedan", "Sedan"), suv: () => T("SUV", "SUV"), luxury: () => T("Luxury", "Luxury"), supercar: () => T("Supercar", "Supercar"),
  hypercar: () => T("Hypercar", "Hypercar"), helicopter: () => T("Helicopter", "Helicopter"), jet: () => T("Jet", "Jet"), boat: () => T("Boat", "Boat"), yacht: () => T("Yacht", "Yacht"),
};

export function GarageCard({ p, run }: { p: Player; run: Run }) {
  const [view, setView] = useState<"fleet" | "dealer" | null>(null);
  const [cat, setCat] = useState<string | null>(null);
  const [buy, setBuy] = useState<string | null>(null);
  const [openV, setOpenV] = useState<string | null>(null);
  const buyModel = buy ? modelOf(buy) ?? null : null;
  const openVeh = openV ? p.vehicles.find((v) => v.id === openV) ?? null : null;
  const openM = openVeh ? modelOf(openVeh.modelId) : undefined;
  const lic = licenseBlock(p);
  return (
    <>
      <p className="mb-2 px-1 text-[12px] text-slate-500">{T("Cars, boats and aircraft cost money to run every month. Rent them out to earn.", "Cars, boats and aircraft dey chop money every month. Rent them out make dem bring money.")}</p>
      <div className="mb-3 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_22px_-14px_rgba(30,64,175,0.35)]">
        <div className="flex items-center gap-3 px-3.5 py-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-[24px]">🪪</span>
          <span className="min-w-0 flex-1"><span className="block text-[15px] font-extrabold leading-tight text-[#0b2a6b]">{T("Driver's licence", "Driver's licence")}</span><span className="block text-[12px] text-slate-500">{p.possessions.license ? T("You can drive.", "You fit drive.") : T("Needed to buy and drive a car.", "You need am to buy and drive car.")}</span></span>
          {p.possessions.license && <Badge tone="green">{T("Licensed", "Licensed")}</Badge>}
        </div>
        {!p.possessions.license && (
          <div className="flex gap-2 border-t border-slate-100 px-3.5 py-2.5">
            <Btn small tone="gold" disabled={Boolean(lic)} title={lic ?? ""} onClick={() => run({ t: "license" })}>{T("Take the test", "Do the test")} ({naira(licenseCost(p))})</Btn>
            <Btn small tone="ghost" disabled={Boolean(lic)} onClick={() => run({ t: "license", settle: true })}>{T("Settle the examiner", "Settle examiner")}</Btn>
          </div>
        )}
      </div>
      {view === null ? (
        <HubList onPick={(r) => setView(r.id as "fleet" | "dealer")} groups={[{ rows: [
          { id: "fleet", emoji: "🚘", tile: "bg-rose-100", name: T("My fleet", "My fleet"), desc: p.vehicles.length ? T(`${p.vehicles.length} vehicle${p.vehicles.length === 1 ? "" : "s"} · repair, insure, rent out`, `${p.vehicles.length} vehicle · repair, insure, rent out`) : T("You own no vehicles yet", "You no get vehicle yet") },
          { id: "dealer", emoji: "🏬", tile: "bg-amber-100", name: T("Dealerships", "Dealerships"), desc: T("Cars, jets, helicopters, boats, yachts", "Cars, jets, helicopters, boats, yachts") },
        ] }]} />
      ) : <BackPill label={view === "dealer" && cat ? T("Dealerships", "Dealerships") : T("Garage", "Garage")} onClick={() => (view === "dealer" && cat ? setCat(null) : setView(null))} />}
      {view === "fleet" && (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 shadow-[0_8px_22px_-14px_rgba(30,64,175,0.35)]">
          {p.vehicles.length === 0 && <p className="p-3 text-xs text-slate-500">{T("You own no vehicles yet. Visit the dealerships.", "You no get vehicle yet. Go dealership.")}</p>}
          {p.vehicles.map((v) => {
            const m = modelOf(v.modelId);
            return (
              <div key={v.id} className="flex items-center gap-2.5 bg-white px-2.5 py-2">
                <div className="w-14 shrink-0"><VehicleArt art={m?.art ?? "sedan"} color={m?.color ?? "#64748b"} size={56} /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-extrabold text-[#0b2a6b]">{v.name} <span className="font-medium text-slate-500">({m ? CAT_ONE[m.cat]() : ""})</span></div>
                  <div className="text-[12px] text-slate-600">{naira(v.value)} · {v.condition}% · {v.role === "personal" ? T("personal", "personal") : v.role === "rental" ? T("for hire", "for hire") : v.role}</div>
                </div>
                <button type="button" aria-label={T("Options", "Options")} onClick={() => setOpenV(v.id)} className="shrink-0 px-2 text-xl font-black text-blue-700">⋯</button>
              </div>
            );
          })}
        </div>
      )}
      {view === "dealer" && cat === null && (
        <HubList onPick={(r) => setCat(r.id)} groups={[{ rows: Object.keys(CAT_LABEL).map((c) => ({ id: c, emoji: CAT_EMOJI[c] ?? "🚗", tile: "bg-sky-100", name: CAT_LABEL[c](), desc: T(`${VEHICLE_MODELS.filter((m) => m.cat === c).length} models`, `${VEHICLE_MODELS.filter((m) => m.cat === c).length} models`) })) }]} />
      )}
      {view === "dealer" && cat !== null && (
        <div>
          {p.age < 18 && <p className="mb-2 text-xs text-slate-500">{T("You must be 18 to buy a vehicle.", "You must reach 18 to buy vehicle.")}</p>}
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 shadow-[0_8px_22px_-14px_rgba(30,64,175,0.35)]">
            {VEHICLE_MODELS.filter((m) => m.cat === cat).sort((x, y) => y.price - x.price).map((m) => (
              <div key={m.id} className="flex items-center gap-2.5 bg-white px-2.5 py-2">
                <div className="w-14 shrink-0"><VehicleArt art={m.art} color={m.color} size={56} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-extrabold leading-tight text-[#0b2a6b]">{m.name} <span className="font-medium text-slate-500">({m.kind === "new" ? T("New", "New") : T("Used", "Used")} {CAT_ONE[m.cat]()})</span></div>
                  <div className="text-[12px] font-semibold text-blue-700">{naira(priceOf(p, m))}</div>
                </div>
                <button type="button" aria-label={T("Options", "Options")} onClick={() => setBuy(m.id)} className="shrink-0 px-2 text-xl font-black text-blue-700">⋯</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {buyModel && (
        <Sheet title={buyModel.name} onClose={() => setBuy(null)}>
          <div className="flex justify-center"><VehicleArt art={buyModel.art} color={buyModel.color} size={170} /></div>
          <p className="mt-1 text-center text-xs text-slate-500">{CAT_ONE[buyModel.cat]()} · {buyModel.kind === "new" ? T("Brand new", "Brand new") : T("Tokunbo / used", "Tokunbo / used")}{buyModel.revenue ? T(" · earns income", " · e dey bring money") : ""}{buyModel.rentYield ? T(" · can be rented out", " · you fit rent am out") : ""}</p>
          <div className="my-2 text-center text-xl font-extrabold text-blue-700">{naira(priceOf(p, buyModel))}</div>
          <div className="grid grid-cols-2 gap-2">
            <Btn tone="gold" disabled={p.age < 18 || p.money < priceOf(p, buyModel) || (needsLicense(buyModel) && !p.possessions.license)} onClick={() => { run({ t: "car", op: "buy", id: buyModel.id }); setBuy(null); }}>{needsLicense(buyModel) && !p.possessions.license ? T("Needs licence", "Need licence") : T("Buy", "Buy")}</Btn>
            <Btn tone="ghost" disabled={p.age < 18 || p.money < priceOf(p, buyModel) * 0.3 || (needsLicense(buyModel) && !p.possessions.license)} onClick={() => { run({ t: "car", op: "buyLoan", id: buyModel.id }); setBuy(null); }}>{T("30% down", "30% deposit")}</Btn>
          </div>
        </Sheet>
      )}
      {openVeh && (
        <Sheet title={openVeh.name} onClose={() => setOpenV(null)}>
          <div className="flex justify-center"><VehicleArt art={openM?.art ?? "sedan"} color={openM?.color ?? "#64748b"} size={150} /></div>
          <p className="mt-1 text-center text-xs text-slate-500">{naira(openVeh.value)} · {T("Condition", "Condition")} {openVeh.condition}% · {isInsured(p, openVeh) ? T("insured", "insured") : T("uninsured", "no insurance")}{openVeh.loanId ? T(" · on finance", " · dem still dey owe") : ""}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Btn small tone="ghost" onClick={() => run({ t: "car", op: "repair", id: openVeh.id })}>{T("Repair", "Repair")} ({naira(repairCost(p, openVeh))})</Btn>
            <Btn small tone="ghost" onClick={() => run({ t: "car", op: "insure", id: openVeh.id })}>{T("Insure", "Insure")}</Btn>
            {openVeh.role === "personal" ? (
              <>
                {openM?.rentYield ? <Btn small tone="ghost" onClick={() => run({ t: "car", op: "rental", id: openVeh.id })}>{openM.cat === "jet" || openM.cat === "helicopter" ? T("Charter it out", "Put am for charter") : openM.cat === "boat" || openM.cat === "yacht" ? T("Hire it out", "Hire am out") : T("Rent it out", "Rent am out")}</Btn> : null}
                {openM && ["taxi", "car"].includes(openM.cat) && <Btn small tone="ghost" onClick={() => run({ t: "car", op: "taxi", id: openVeh.id })}>{T("Run as taxi", "Use as taxi")}</Btn>}
              </>
            ) : <Btn small tone="ghost" onClick={() => run({ t: "car", op: "personal", id: openVeh.id })}>{T("Personal use", "Personal use")}</Btn>}
            <Btn small tone="red" onClick={() => { run({ t: "car", op: "sell", id: openVeh.id }); setOpenV(null); }}>{T("Sell", "Sell")}</Btn>
          </div>
        </Sheet>
      )}
    </>
  );
}

export function SubsCard({ p }: { p: Player }) {
  if (p.subs.length === 0) return null;
  return (
    <ListGroup title={T("Recurring payments", "Recurring payments")}>
      {p.subs.map((s) => <ListRow key={s.id} emoji="🔁" tile="bg-rose-100" name={s.label} right={<span className="text-red-600">{naira(s.monthly)}/{T("mo", "mo")}</span>} />)}
    </ListGroup>
  );
}

// ---------------------------------------------------------------------------
// Family extras: parents' backgrounds, asking for help
// ---------------------------------------------------------------------------
export function BackgroundCard({ p }: { p: Player }) {
  return (
    <Card>
      <H sub={`${p.fam.label} · ${p.fam.structure.replace("-", " ")}`}>{T("Background", "Background")}</H>
      <div className="flex flex-wrap gap-1.5">{p.fam.tags.map((t) => <Badge key={t} tone="gold">{t}</Badge>)}</div>
      <p className="mt-2 text-xs text-slate-500">{T("Wealth and generosity are different things. Rich parents can be strict, and poor parents can be very giving.", "Money and generosity no be the same thing. Rich parents fit strong, poor parents fit give well.")}</p>
    </Card>
  );
}

const FAMILY_ROLES = ["dad", "mom", "guardian", "sibling", "grandparent", "uncle", "aunt", "cousin"];
const roleWord = (n: Npc): string => {
  const m: Record<string, [string, string]> = { dad: ["Dad", "Papa"], mom: ["Mom", "Mama"], guardian: ["Guardian", "Guardian"], sibling: [n.gender === "male" ? "Brother" : "Sister", n.gender === "male" ? "Brother" : "Sister"], grandparent: [n.gender === "male" ? "Grandfather" : "Grandmother", n.gender === "male" ? "Grandfather" : "Grandmother"], uncle: ["Uncle", "Uncle"], aunt: ["Aunty", "Aunty"], cousin: ["Cousin", "Cousin"], friend: ["Friend", "Padi"], classmate: ["Classmate", "Classmate"] };
  const w = m[n.role];
  return w ? T(w[0], w[1]) : n.role;
};

/** Family, friends or classmates, each with things to do together. */
export function PeopleList({ p, run, group }: { p: Player; run: Run; group: "family" | "friends" | "class" }) {
  const [sel, setSel] = useState<string | null>(null);
  const alive = Object.values(p.npcs).filter((n) => n.alive);
  const list = group === "family" ? alive.filter((n) => FAMILY_ROLES.includes(n.role)) : group === "friends" ? alive.filter((n) => n.role === "friend") : alive.filter((n) => n.role === "classmate" && !n.former);
  const old = group === "class" ? alive.filter((n) => n.role === "classmate" && n.former) : [];
  const npc = sel ? p.npcs[sel] : null;
  const mkBlock = makeFriendBlock(p);
  const row = (n: Npc) => (
    <button key={n.id} type="button" onClick={() => setSel(n.id)} className="flex w-full items-center gap-3 bg-white px-3.5 py-2.5 text-left transition active:bg-slate-50">
      <Face n={n} p={p} size={46} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-extrabold leading-tight text-[#0b2a6b]">{n.name}</span>
        <span className="block truncate text-[12px] text-slate-500">{roleWord(n)} · {Math.max(0, p.age + n.ageDelta)} · {n.occupation}</span>
        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-500" style={{ width: `${Math.max(4, n.closeness)}%` }} /></span>
      </span>
      <span className="shrink-0 text-xl font-black text-blue-500">›</span>
    </button>
  );
  const box = "divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_22px_-14px_rgba(30,64,175,0.35)]";
  return (
    <>
      {group !== "family" && (
        <div className="mb-3 flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
          <div className="min-w-0 text-[12px] text-slate-600">{group === "class" && p.school ? T("Your class", "Your class") : T("Your circle", "Your circle")}: <b>{list.length}</b>{mkBlock ? <span className="block text-[11px] text-slate-400">{mkBlock}</span> : null}</div>
          <Btn small tone="gold" disabled={Boolean(mkBlock)} onClick={() => run({ t: "friend" })}>{p.age < 13 ? T("Make a friend", "Make friend") : T("Meet someone new", "Meet new person")}</Btn>
        </div>
      )}
      {group === "class" && !p.school && list.length === 0 && old.length === 0 && <p className="mb-3 rounded-2xl bg-white p-3 text-sm text-slate-500 ring-1 ring-slate-100">{T("You are not in school right now. When you start school you will meet your classmates here.", "You no dey school now. When you start school you go meet your classmates here.")}</p>}
      {list.length === 0 && group !== "class" && <p className="mb-3 rounded-2xl bg-white p-3 text-sm text-slate-500 ring-1 ring-slate-100">{group === "friends" ? T("No friends yet. Tap 'Meet someone new'.", "No friend yet. Tap 'Meet new person'.") : T("No family members to show.", "No family member to show.")}</p>}
      {list.length > 0 && (
        <section className="mb-3">
          {group === "class" && <h2 className="mb-1.5 px-1 text-[12px] font-extrabold uppercase tracking-wide text-slate-500">{list[0]?.school ?? T("Your class", "Your class")}</h2>}
          <div className={box}>{list.map(row)}</div>
        </section>
      )}
      {old.length > 0 && (
        <section className="mb-3">
          <h2 className="mb-1.5 px-1 text-[12px] font-extrabold uppercase tracking-wide text-slate-500">{T("Old classmates", "Old classmates")}</h2>
          <div className={box}>{old.map(row)}</div>
        </section>
      )}
      {npc && <PersonSheet key={npc.id} p={p} npc={npc} run={run} onClose={() => setSel(null)} />}
    </>
  );
}

function PersonSheet({ p, npc, run, onClose }: { p: Player; npc: Npc; run: Run; onClose: () => void }) {
  const [money, setMoney] = useState(false);
  const [kind, setKind] = useState<SupportKind | null>(null);
  const [amt, setAmt] = useState(0);
  const kinds = supportKindsFor(p);
  const acts = interactionsFor(p, npc);
  const age = Math.max(0, p.age + npc.ageDelta);
  const askable = p.age >= 6 && npc.role !== "classmate";
  return (
    <Sheet title={npc.name} onClose={onClose}>
      <div className="flex items-center gap-3">
        <Face n={npc} p={p} size={72} />
        <div className="min-w-0 text-xs text-slate-500">
          <div className="text-sm font-bold text-[#0b2a6b]">{roleWord(npc)} · {age}</div>
          <div>{npc.occupation}{npc.school ? ` · ${npc.school}` : ""}</div>
          <div className="mt-0.5">{npc.traits.join(" · ")}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2"><Bar label={T("Close", "Close")} value={npc.closeness} tone="gold" /><Bar label={T("Trust", "Trust")} value={npc.trust} tone="blue" /><Bar label={T("Kind", "Kind")} value={npc.generosity} tone="blue" /></div>
      {npc.memories.length > 0 && <p className="mt-2 text-[11px] text-slate-500">{T("Remembers", "E remember")}: {npc.memories[npc.memories.length - 1].text}</p>}
      <H>{T("Spend time together", "Spend time together")}</H>
      <div className="grid grid-cols-2 gap-2">
        {acts.map((i) => {
          const b = interactBlock(p, npc, i);
          return (
            <button key={i.id} type="button" disabled={Boolean(b)} onClick={() => run({ t: "interact", npc: npc.id, id: i.id })} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-left disabled:opacity-40">
              <span className="block text-[13px] font-bold text-[#0b2a6b]">{i.emoji} {T(i.en, i.pcm)}</span>
              <span className="block text-[10.5px] leading-snug text-slate-500">{b ?? (i.cost ? `${naira(I(p, i.cost))} · ` : "") + T(i.descEn, i.descPcm)}</span>
            </button>
          );
        })}
      </div>
      {askable && (
        <div className="mt-3">
          <Btn small tone="ghost" onClick={() => setMoney(!money)}>{money ? T("Hide money options", "Hide money options") : T("Money: ask, borrow, give", "Money: ask, borrow, give")}</Btn>
          {money && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-1.5">{kinds.map((k) => <Btn key={k} small tone={kind === k ? "gold" : "ghost"} onClick={() => { setKind(k); setAmt(defaultAmount(p, k)); }}>{SUPPORT_KINDS[k].label}</Btn>)}</div>
              {kind && (
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1.5">{[0.5, 1, 2].map((f) => <Btn key={f} small tone="ghost" onClick={() => setAmt(Math.round((defaultAmount(p, kind) * f) / 500) * 500)}>{naira(Math.round((defaultAmount(p, kind) * f) / 500) * 500)}</Btn>)}</div>
                  <Btn className="mt-2 w-full" tone="gold" onClick={() => run({ t: "ask", npc: npc.id, kind, amount: amt })}>{T(`Ask ${npc.name.split(" ")[0]} for ${naira(amt)}`, `Ask ${npc.name.split(" ")[0]} for ${naira(amt)}`)}</Btn>
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.age >= 16 && <Btn small tone="ghost" onClick={() => run({ t: "borrow", npc: npc.id, amount: Math.round(defaultAmount(p, "loan")) })}>{T("Borrow", "Borrow")} {naira(defaultAmount(p, "loan"))}</Btn>}
                <Btn small tone="ghost" disabled={p.money < I(p, 50_000)} onClick={() => run({ t: "give", npc: npc.id, amount: I(p, 50_000), mode: "gift" })}>{T("Gift", "Gift")} {naira(I(p, 50_000))}</Btn>
                <Btn small tone="ghost" disabled={p.money < I(p, 200_000)} onClick={() => run({ t: "give", npc: npc.id, amount: I(p, 200_000), mode: "loan" })}>{T("Lend", "Lend")} {naira(I(p, 200_000))}</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

export function OwedCard({ p }: { p: Player }) {
  if (activeOwedToMe(p).length === 0) return null;
  return (
    <Card>
      <H>{T("People who owe you", "People wey owe you")}</H>
      <ul className="space-y-1 text-sm">{activeOwedToMe(p).map((l) => <li key={l.id} className="flex justify-between"><span>{l.lenderName}</span><span>{naira(l.balance)}</span></li>)}</ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
export function HealthTab({ p, run }: { p: Player; run: Run }) {
  const [condId, setCondId] = useState<string | null>(null);
  const plans = [
    { id: "none" as const, label: T("No cover", "No cover"), cost: T("free", "free") },
    { id: "basic" as const, label: T("Basic HMO", "Basic HMO"), cost: naira(I(p, 60_000)) + T("/yr", "/yr") },
    { id: "premium" as const, label: T("Premium HMO", "Premium HMO"), cost: naira(I(p, 400_000)) + T("/yr", "/yr") },
  ];
  return (
    <Hub back={T("Health", "Health")} groups={[{ rows: [
      { id: "cond", emoji: "🩺", tile: "bg-rose-100", name: T("My health", "My health"), desc: T(`Health ${Math.round(p.stats.health)}% · check-ups and gym`, `Health ${Math.round(p.stats.health)}% · check-up and gym`), node: (<>
      <ListGroup title={T("Condition", "Condition")}>
        <div className="space-y-2.5 px-3.5 py-3"><Bar label={T("Health", "Health")} value={p.stats.health} /><Bar label={T("Fitness", "Fitness")} value={p.stats.fitness} tone="blue" /><Bar label={T("Stress", "Stress")} value={p.stats.stress} invert /></div>
        <ListRow emoji="🩻" tile="bg-rose-100" name={T("Check-up", "Check-up")} desc={naira(I(p, 35_000))} onClick={() => run({ t: "checkup" })} />
        <ListRow emoji="🏋️" tile="bg-emerald-100" name={p.subs.some((s) => s.id === "gym") ? T("Cancel gym membership", "Cancel gym") : T("Join gym", "Join gym")} disabled={Boolean(gymBlock(p)) && !p.subs.some((s) => s.id === "gym")} onClick={() => run({ t: "gym" })} />
      </ListGroup></>) },
      { id: "ins", emoji: "🛡️", tile: "bg-sky-100", name: T("Insurance", "Insurance"), desc: p.insurance.plan === "none" ? T("No cover", "No cover") : p.insurance.plan === "basic" ? T("Basic HMO", "Basic HMO") : T("Premium HMO", "Premium HMO"), node: (<>
      <ListGroup title={T("Insurance", "Insurance")} sub={T("Cover reduces your share at private hospitals and clinics.", "Cover dey reduce wetin you go pay for private hospital and clinic.")}>
        {plans.map((pl) => <ListRow key={pl.id} emoji={pl.id === "none" ? "🚫" : pl.id === "basic" ? "🛡️" : "💎"} tile={p.insurance.plan === pl.id ? "bg-emerald-100" : "bg-slate-100"} name={pl.label} desc={pl.cost} right={p.insurance.plan === pl.id ? "✓" : undefined} onClick={() => run({ t: "insure", plan: pl.id })} />)}
      </ListGroup></>) },
      { id: "sick", emoji: "🤒", tile: "bg-amber-100", name: T("Treatment", "Treatment"), desc: p.conditions.length ? T(`${p.conditions.length} condition${p.conditions.length === 1 ? "" : "s"} to treat`, `${p.conditions.length} condition to treat`) : T("You are not sick", "You no dey sick"), node: (<>
      <ListGroup title={T("Current conditions", "Current conditions")}>
        {p.conditions.length === 0 && <ListRow emoji="💪" tile="bg-emerald-100" name={T("You are not sick", "You no dey sick")} />}
        {p.conditions.map((c) => (
          <ListRow key={c.id} emoji="🤒" tile={c.severity >= 4 ? "bg-rose-100" : "bg-amber-100"} name={c.name}
            desc={`${c.treated ? T("Treated", "Don treat") : T("Untreated", "No treat yet")}${c.monthsLeft >= 0 ? T(` · ${c.monthsLeft} month(s) to recover`, ` · ${c.monthsLeft} month(s) to recover`) : T(" · chronic", " · chronic")}`}
            right={`${T("severity", "severity")} ${c.severity}`} onClick={c.treated ? undefined : () => setCondId(c.id)} />
        ))}
      </ListGroup>
      {condId && (() => {
        const c = p.conditions.find((x) => x.id === condId);
        if (!c) return null;
        return (
          <ActionSheet emoji="🏥" tile="bg-rose-100" title={c.name} sub={`${T("severity", "severity")} ${c.severity}`} onClose={() => setCondId(null)}>
            <ListGroup title={T("Where to get care", "Where to get care")}>
              {facilitiesFor(p, c).map((f) => {
                const { total, mine } = treatmentCost(p, c, f);
                return <ListRow key={f.id} emoji="🏥" tile="bg-sky-100" name={f.label} desc={`${T("quality", "quality")} ${f.quality}${mine < total ? T(` · covered ${Math.round((1 - mine / total) * 100)}%`, ` · insurance cover ${Math.round((1 - mine / total) * 100)}%`) : ""}`} right={naira(mine)} onClick={() => { run({ t: "treat", cond: c.id, facility: f.id }); setCondId(null); }} />;
              })}
            </ListGroup>
          </ActionSheet>
        );
      })()}
      <ListGroup title={T("Where you can get care", "Where you fit get treatment")}>
        {FACILITIES.map((f) => <ListRow key={f.id} emoji="🏥" tile="bg-slate-100" name={f.label} desc={`${T("quality", "quality")} ${f.quality}`} />)}
      </ListGroup>
      </>) },
    ] }]} />
  );
}

// ---------------------------------------------------------------------------
// Work extras: skills, growth, businesses, military
// ---------------------------------------------------------------------------
const SKILL_EMOJI: Record<string, string> = { coding: "💻", writing: "✍️", cooking: "🍲", tailoring: "🧵", sales: "🤝", music: "🎵", welding: "🔥", catering: "🍽️" };
const GROWTH_EMOJI: Record<string, string> = { read: "📖", run: "🏃", weights: "🏋️", rest: "😴", hobby: "🎨" };

export function SkillsCard({ p, run }: { p: Player; run: Run }) {
  const [skill, setSkill] = useState<(typeof SKILLS)[number] | null>(null);
  if (p.age < 10) return null;
  const lv = skill ? skillLevel(p, skill.id) : 0;
  const mode = (m: LearnMode) => (skill ? learnBlock(p, skill, m) : null);
  const go = (m: LearnMode) => { if (skill) run({ t: "learn", id: skill.id, mode: m }); };
  return (
    <>
      <ListGroup title={T("Learn a skill", "Learn skill")} sub={T(`${p.actionsLeft} actions left this year. Courses, practice and mentors take you from beginner to one of the best in Nigeria.`, `${p.actionsLeft} actions remain this year. Course, practice and mentor go take you from beginner reach one of the best for Nigeria.`)}>
        {SKILLS.map((s) => {
          const l = skillLevel(p, s.id);
          const t = skillTier(l);
          return <ListRow key={s.id} emoji={s.emoji ?? SKILL_EMOJI[s.id] ?? "📘"} tile={l >= 80 ? "bg-amber-100" : "bg-violet-100"} name={s.label} desc={l > 0 ? `${T(t.en, t.pcm)} · ${T("top", "top")} ${skillTopPct(l)}%` : s.blurb} right={l > 0 ? <Badge tone={l >= 80 ? "gold" : "green"}>{T("level", "level")} {Math.round(l)}</Badge> : naira(learnCost(p, s))} onClick={() => setSkill(s)} />;
        })}
      </ListGroup>
      <ListGroup title={T("Self-improvement", "Self-improvement")}>
        {GROWTH_ACTIVITIES.filter((a) => p.age >= a.minAge).map((a) => {
          const b = growthBlock(p, a);
          return <ListRow key={a.id} emoji={GROWTH_EMOJI[a.id] ?? "✨"} tile="bg-emerald-100" name={a.label} desc={a.desc} note={b} disabled={Boolean(b)} onClick={() => run({ t: "growth", id: a.id })} />;
        })}
        {p.age >= 18 && (() => { const b = enlistBlock(p); return (
          <div className="px-3.5 py-3">
            <div className="mb-2 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-[24px]">🎖️</span><span><span className="block text-[15px] font-extrabold text-[#0b2a6b]">{T("Join the armed forces", "Join the armed forces")}</span>{b && <span className="block text-[11px] text-red-600">{b}</span>}</span></div>
            <div className="flex flex-wrap gap-2">{(["army", "navy", "airforce"] as const).map((br) => <Btn key={br} small tone="ghost" disabled={Boolean(b)} onClick={() => run({ t: "enlist", branch: br })}>{br === "army" ? T("Army", "Army") : br === "navy" ? T("Navy", "Navy") : T("Air Force", "Air Force")}</Btn>)}</div>
          </div>
        ); })()}
      </ListGroup>
      {skill && (
        <ActionSheet emoji={skill.emoji ?? SKILL_EMOJI[skill.id] ?? "📘"} tile="bg-violet-100" title={skill.label} sub={lv > 0 ? `${T("Level", "Level")} ${Math.round(lv)} · ${T(skillTier(lv).en, skillTier(lv).pcm)} · ${T("top", "top")} ${skillTopPct(lv)}%` : T("Not started", "No start")} onClose={() => setSkill(null)}>
          <p className="mb-3 text-sm text-slate-600">{skill.blurb}</p>
          <div className="mb-3"><Bar label={T("Mastery", "Mastery")} value={lv} tone={lv >= 80 ? "gold" : "blue"} /></div>
          <ListGroup>
            <ListRow emoji="📘" tile="bg-violet-100" name={T("Take a course", "Take course")} desc={T("Fast progress for beginners. Stops helping at level 80.", "Fast progress for beginner. E stop to help for level 80.")} wrap right={naira(learnCost(p, skill, "course"))} note={mode("course")} disabled={Boolean(mode("course"))} onClick={() => go("course")} />
            <ListRow emoji="🛠️" tile="bg-emerald-100" name={T("Practise on your own", "Practise by yourself")} desc={T("Free. Small gains, faster if your job uses it.", "Free. Small gain, faster if your job dey use am.")} wrap note={mode("practice")} disabled={Boolean(mode("practice"))} onClick={() => go("practice")} />
            <ListRow emoji="🏅" tile="bg-amber-100" name={T("Find a mentor", "Find mentor")} desc={T("From level 55. A top person in the field teaches you. Needs a good network.", "From level 55. Top person for the field go teach you. You need better network.")} wrap right={naira(learnCost(p, skill, "mentor"))} note={mode("mentor")} disabled={Boolean(mode("mentor"))} onClick={() => go("mentor")} />
          </ListGroup>
        </ActionSheet>
      )}
    </>
  );
}

const BIZ_EMOJI: Record<string, string> = { akara: "🥘", pos: "💳", carwash: "🚗", barbing: "💈", bukka: "🍛", phoneshop: "📱", water: "💧", bakery: "🥖", provisions: "🛒", salon: "💇", fashion: "🧵", restaurant: "🍽️", techstart: "💻", farm: "🌾", logistics: "🚚", pharmacy: "💊", supermarket: "🏬", hotel: "🏨" };

const TIERS = [
  { id: "t1", min: 0, max: 1_000_000, title: () => T("Start small", "Start small"), sub: () => T("A pot, a stall or a table. Cheap to begin, easy to grow.", "Pot, stall or table. E cheap to start, e easy to grow.") },
  { id: "t2", min: 1_000_000, max: 8_000_000, title: () => T("Shops and workshops", "Shop and workshop"), sub: () => T("Rent, staff and regular customers.", "Rent, staff and regular customer.") },
  { id: "t3", min: 8_000_000, max: 40_000_000, title: () => T("Serious business", "Serious business"), sub: () => T("Real money in, real money out.", "Real money in, real money out.") },
  { id: "t4", min: 40_000_000, max: Infinity, title: () => T("Big business", "Big business"), sub: () => T("Employ dozens and move markets.", "Employ plenty people and move market.") },
];

export function BusinessCard({ p, run }: { p: Player; run: Run }) {
  const [name, setName] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pick, setPick] = useState<(typeof BIZ_KINDS)[number] | null>(null);
  if (p.age < 18) return null;
  const open = p.businesses.filter((b) => b.status === "open");
  const cur = open.find((b) => b.id === openId) ?? null;
  const kindsSorted = [...BIZ_KINDS].sort((x, y) => x.startCost - y.startCost);
  const pb = pick ? startBlock(p, pick.id) : null;
  return (
    <>
      <p className="mb-3 px-1 text-xs text-slate-500">{T("Set prices, advertising and stock, hire and fire real people, and watch the monthly report. Run it well and it grows. Run it badly and it collapses.", "Set price, advert and stock, hire and fire real people, and watch the monthly report. Run am well, e go grow. Run am bad, e go collapse.")}</p>
      {open.length > 0 && (
        <ListGroup title={T("My businesses", "My businesses")}>
          {open.map((b) => (
            <ListRow key={b.id} emoji={BIZ_BY_ID[b.kind]?.emoji ?? BIZ_EMOJI[b.kind] ?? "🏪"} tile="bg-emerald-100" name={b.name}
              desc={`${BIZ_BY_ID[b.kind]?.label} · ${T("level", "level")} ${b.level} · ${(b.crew?.length ?? b.staff)} ${T("staff", "staff")} · ${STATE_BY_ID[b.stateId]?.name}`}
              right={<span className={b.lastMonthProfit >= 0 ? "text-emerald-600" : "text-red-600"}>{naira(b.lastMonthProfit)}</span>}
              note={b.lossStreak >= 3 ? T(`Losing money ${b.lossStreak} months in a row`, `E don dey lose money ${b.lossStreak} months now`) : undefined}
              onClick={() => setOpenId(b.id)} />
          ))}
        </ListGroup>
      )}
      {TIERS.map((t) => {
        const ks = kindsSorted.filter((k) => k.startCost >= t.min && k.startCost < t.max);
        if (!ks.length) return null;
        return (
          <ListGroup key={t.id} title={t.title()} sub={t.sub()}>
            {ks.map((k) => {
              const bl = startBlock(p, k.id);
              return <ListRow key={k.id} emoji={k.emoji ?? BIZ_EMOJI[k.id] ?? "🏪"} tile="bg-amber-100" name={k.label} desc={k.blurb} right={naira(startCostFor(p, k))} note={bl} onClick={() => setPick(k)} />;
            })}
          </ListGroup>
        );
      })}
      {pick && (
        <ActionSheet emoji={pick.emoji ?? BIZ_EMOJI[pick.id] ?? "🏪"} tile="bg-amber-100" title={pick.label} sub={naira(startCostFor(p, pick))} onClose={() => setPick(null)}>
          <p className="mb-2 text-sm text-slate-600">{pick.blurb}</p>
          <div className="mb-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <p className="mb-1 font-semibold text-slate-700">{T(profileOf(pick.id).intro[0], profileOf(pick.id).intro[1])}</p>
            <p>{T("You decide:", "You go decide:")} {profileOf(pick.id).levers.map((l) => T(l.label[0], l.label[1]).toLowerCase()).join(", ")}.</p>
            <p>{T("You hire:", "You go hire:")} {profileOf(pick.id).roles.map((r) => T(r.label[0], r.label[1]).toLowerCase()).join(", ")}.</p>
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={T("Business name (optional)", "Business name (optional)")} maxLength={30} className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
          <Btn disabled={Boolean(pb)} onClick={() => { run({ t: "biz", op: "start", id: pick.id, name }); setPick(null); setName(""); }}>{pb ?? T(`Start (${naira(startCostFor(p, pick))})`, `Start (${naira(startCostFor(p, pick))})`)}</Btn>
        </ActionSheet>
      )}
      {cur && <BusinessSheet p={p} b={cur} run={run} onClose={() => setOpenId(null)} />}
    </>
  );
}

function Seg({ label, value, opts, onPick, hint }: { label: string; value: number; opts: string[]; onPick: (i: number) => void; hint?: string }) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-xs font-bold text-slate-700">{label}</div>
      {hint && <div className="mb-1 text-[11px] leading-snug text-slate-500">{hint}</div>}
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(opts.length, opts.length > 4 ? 2 : opts.length)}, minmax(0, 1fr))` }}>{opts.map((o, i) => <button key={o + i} type="button" onClick={() => onPick(i)} className={cx("rounded-lg border px-1.5 py-2 text-[11.5px] font-semibold leading-tight", value === i ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 bg-slate-50 text-slate-600")}>{o}</button>)}</div>
    </div>
  );
}

const roleLabel = (b: Business, w: { role?: string }) => { const r = profileOf(b.kind).roles.find((x) => x.id === w.role) ?? profileOf(b.kind).roles[0]; return T(r.label[0], r.label[1]); };

function BusinessSheet({ p, b, run, onClose }: { p: Player; b: Business; run: Run; onClose: () => void }) {
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const k = BIZ_BY_ID[b.kind];
  const crew = b.crew ?? [];
  const r = b.report;
  const maxRev = Math.max(1, ...(b.hist ?? []).map((h) => Math.abs(h.net)));
  const w = crew.find((x) => x.id === workerId) ?? null;
  const prof = profileOf(b.kind);
  const [roleSheet, setRoleSheet] = useState(false);
  const [actId, setActId] = useState<string | null>(null);
  const act = prof.actions.find((x) => x.id === actId) ?? null;
  const offer = b.offers?.find((x) => x.id === offerId) ?? null;
  const BUYER_EMOJI = { lowball: "🦈", fair: "🤝", keen: "🤩", instalment: "⏳" } as const;
  const BUYER_LABEL = { lowball: () => T("Lowball offer", "Lowball offer"), fair: () => T("Fair offer", "Fair offer"), keen: () => T("Keen buyer", "Keen buyer"), instalment: () => T("Pays in two parts", "Pay for two parts") } as const;
  return (
    <ActionSheet emoji={k?.emoji ?? BIZ_EMOJI[b.kind] ?? "🏪"} tile="bg-emerald-100" title={b.name} sub={`${k?.label} · ${T(prof.levels[b.level - 1][0], prof.levels[b.level - 1][1])} · ${STATE_BY_ID[b.stateId]?.name} · ${T("worth", "worth")} ${naira(valuation(p, b))}`} onClose={onClose}>
      <div className="mb-3 grid grid-cols-2 gap-3"><Bar label={T("Quality", "Quality")} value={b.quality} tone="blue" /><Bar label={T("Fame", "Fame")} value={b.fame ?? 0} tone="blue" /></div>
      {b.offers && b.offers.length > 0 && (
        <ListGroup title={T("Buyers", "Buyers")} sub={T("Haggle if you like. Some buyers walk away, and some are not as rich as they say.", "Haggle if you like. Some buyer go waka go, and some no rich as dem talk.")}>
          {b.offers.map((o) => <ListRow key={o.id} emoji={BUYER_EMOJI[o.type]} tile="bg-amber-100" name={o.buyer} desc={`${BUYER_LABEL[o.type]()} · ${T(o.note.en, o.note.pcm)}`} wrap right={naira(o.amount)} onClick={() => setOfferId(o.id)} />)}
          <ListRow emoji="🚫" tile="bg-slate-100" name={T("Turn them all down", "Reject everybody")} onClick={() => run({ t: "biz", op: "decline", id: b.id })} />
        </ListGroup>
      )}
      {r ? (
        <ListGroup title={T("Last month", "Last month")}>
          <ListRow emoji="💰" tile="bg-emerald-100" name={T("Sales", "Sales")} right={naira(r.rev)} />
          <ListRow emoji="📦" tile="bg-amber-100" name={T("Stock and wages", "Stock and wages")} right={naira(-(r.stock + r.wages))} />
          <ListRow emoji="📣" tile="bg-sky-100" name={T("Ads and other costs", "Ads and other costs")} right={naira(-(r.ads + r.other))} />
          <ListRow emoji={r.net >= 0 ? "📈" : "📉"} tile={r.net >= 0 ? "bg-emerald-100" : "bg-rose-100"} name={T("Profit", "Profit")} right={<span className={r.net < 0 ? "text-red-600" : "text-emerald-600"}>{naira(r.net)}</span>} />
          {r.notes.map((n, i) => <ListRow key={i} emoji="📰" tile="bg-slate-100" name={T(n.en, n.pcm)} wrap />)}
          {r.tip && <ListRow emoji="💡" tile="bg-blue-100" name={T(r.tip.en, r.tip.pcm)} wrap />}
        </ListGroup>
      ) : <p className="mb-3 text-xs text-slate-500">{T("The first report arrives at the end of the month.", "First report go land when month end.")}</p>}
      {(b.hist?.length ?? 0) > 0 && (
        <div className="mb-3">
          <div className="mb-1 text-xs text-slate-600">{T("Profit by year", "Profit by year")}</div>
          <div className="flex h-12 items-end gap-1">{b.hist!.map((h, i) => <div key={i} title={naira(h.net)} className={cx("flex-1 rounded-t", h.net >= 0 ? "bg-emerald-400" : "bg-red-400")} style={{ height: `${Math.max(6, (Math.abs(h.net) / maxRev) * 100)}%` }} />)}</div>
        </div>
      )}
      <ListGroup title={T("How you run it", "How you run am")} sub={T(prof.intro[0], prof.intro[1])}>
        <div className="px-3.5 pt-3">
          {prof.levers.map((l) => (
            <Seg key={l.id} label={T(l.label[0], l.label[1])} hint={T(l.blurb[0], l.blurb[1])} value={leverIdx(b, l.id, l.def)} opts={l.opts.map((x) => T(x.label[0], x.label[1]))} onPick={(i) => run({ t: "biz", op: "lever", id: b.id, key: l.id, v: i })} />
          ))}
        </div>
        <ListRow emoji="⬆️" tile="bg-violet-100" name={b.level >= 5 ? T("Top level", "Top level") : T(`Expand to ${prof.levels[b.level][0]}`, `Expand to ${prof.levels[b.level][1]}`)} desc={b.level >= 5 ? undefined : T(`More ${(prof.unit ?? ["capacity", "capacity"])[0]}, more staff, bigger sales`, `More ${(prof.unit ?? ["capacity", "capacity"])[1]}, more staff, bigger sales`)} right={b.level >= 5 ? undefined : naira(upgradeCost(p, b))} disabled={b.level >= 5} onClick={() => run({ t: "biz", op: "upgrade", id: b.id })} />
        <ListRow emoji="🧑‍💼" tile="bg-sky-100" name={b.manager ? T("Sack the manager", "Sack manager") : T("Hire a manager", "Hire manager")} desc={b.manager ? T("They take 15% of profit", "E collect 15% of profit") : T("Own it without working in it", "Own am without working inside")} onClick={() => run({ t: "biz", op: "manager", id: b.id })} />
      </ListGroup>
      <ListGroup title={T("Things you can do", "Wetin you fit do")} sub={T("Each can be done once a year.", "You fit do each one time for year.")}>
        {prof.actions.map((a) => { const bl = actBlock(p, b, a.id); return <ListRow key={a.id} emoji={a.gamble ? "🎲" : a.once ? "🔧" : "✨"} tile="bg-amber-100" name={T(a.label[0], a.label[1])} desc={T(a.blurb[0], a.blurb[1])} wrap right={naira(actCost(p, b, a))} note={bl} disabled={Boolean(bl)} onClick={() => setActId(a.id)} />; })}
      </ListGroup>
      <ListGroup title={`${T("Your team", "Your team")} (${crew.length}/${b.level * 4 + 2})`} sub={crew.length === 0 ? T("You run it alone. Staff lift sales but cost wages.", "You dey run am alone. Staff dey lift sales but dem dey cost salary.") : undefined}>
        {b.cands && b.cands.map((c, i) => <ListRow key={c.id} emoji="📝" tile="bg-blue-100" name={c.name} desc={`${T("Interview", "Interview")} · ${roleLabel(b, c)} · ${T("skill", "skill")} ${c.skill}`} right={`${naira(Math.round(workerPay(p, b, c)))}/${T("mo", "mo")}`} onClick={() => run({ t: "biz", op: "pick", id: b.id, idx: i })} />)}
        {crew.map((x) => <ListRow key={x.id} emoji={x.loyalty < 35 ? "😠" : x.skill > 70 ? "⭐" : "🧑"} tile={x.loyalty < 35 ? "bg-rose-100" : "bg-slate-100"} name={x.name} desc={`${roleLabel(b, x)} · ${T("skill", "skill")} ${x.skill} · ${T("loyalty", "loyalty")} ${Math.round(x.loyalty)}`} right={`${naira(workerPay(p, b, x))}/${T("mo", "mo")}`} onClick={() => setWorkerId(x.id)} />)}
        <ListRow emoji="➕" tile="bg-emerald-100" name={T("Recruit someone", "Recruit person")} desc={T("Pick a role, then interview three candidates", "Pick role, then interview three candidate")} right={naira(hireCost(p, b) * 0.4)} onClick={() => setRoleSheet(true)} />
      </ListGroup>
      <ListGroup title={T("The business", "The business")}>
        <ListRow emoji="🏷️" tile="bg-amber-100" name={T("Sell the business", "Sell the business")} desc={T("Find buyers. Offers vary, so haggle.", "Find buyers. Offer dey vary, so haggle.")} onClick={() => run({ t: "biz", op: "sell", id: b.id })} />
        <ListRow emoji="🔒" tile="bg-rose-100" name={T("Close it down", "Close am down")} desc={T("Sell the equipment and walk away", "Sell equipment and waka go")} onClick={() => { run({ t: "biz", op: "close", id: b.id }); onClose(); }} />
      </ListGroup>
      {roleSheet && (
        <ActionSheet emoji="➕" tile="bg-emerald-100" title={T("Who do you need?", "Who you need?")} sub={`${crew.length}/${b.level * 4 + 2}`} onClose={() => setRoleSheet(false)}>
          <ListGroup>
            {prof.roles.map((r) => {
              const have = crew.filter((x) => x.role === r.id).length;
              const full = have >= r.per * b.level + 1;
              return <ListRow key={r.id} emoji={r.need ? "⭐" : "🧑"} tile={r.need ? "bg-amber-100" : "bg-slate-100"} name={T(r.label[0], r.label[1])} desc={T(r.blurb[0], r.blurb[1])} wrap right={`${have}/${r.per * b.level + 1}`} note={full ? T("Enough for this size", "Enough for this size") : undefined} disabled={full} onClick={() => { run({ t: "biz", op: "recruit", id: b.id, role: r.id }); setRoleSheet(false); }} />;
            })}
          </ListGroup>
        </ActionSheet>
      )}
      {act && (
        <ActionSheet emoji={act.gamble ? "🎲" : "🔧"} tile="bg-amber-100" title={T(act.label[0], act.label[1])} sub={naira(actCost(p, b, act))} onClose={() => setActId(null)}>
          <p className="mb-3 text-sm text-slate-600">{T(act.blurb[0], act.blurb[1])}</p>
          {act.gamble && <p className="mb-3 text-xs text-amber-700">{T("This is a gamble: it may not pay off.", "This one na gamble: e fit no pay.")}</p>}
          <Btn tone="gold" disabled={Boolean(actBlock(p, b, act.id))} onClick={() => { run({ t: "biz", op: "act", id: b.id, key: act.id }); setActId(null); }}>{actBlock(p, b, act.id) ?? T("Do it", "Do am")}</Btn>
        </ActionSheet>
      )}
      {w && (
        <ActionSheet emoji="🧑" tile="bg-slate-100" title={w.name} sub={`${naira(workerPay(p, b, w))}/${T("mo", "mo")}`} onClose={() => setWorkerId(null)}>
          <div className="mb-3 grid grid-cols-2 gap-3"><Bar label={T("Skill", "Skill")} value={w.skill} tone="blue" /><Bar label={T("Loyalty", "Loyalty")} value={w.loyalty} tone={w.loyalty < 35 ? "red" : "blue"} /></div>
          <div className="flex flex-wrap gap-2">
            <Btn tone="ghost" onClick={() => run({ t: "biz", op: "raise", id: b.id, worker: w.id })}>{T("Raise pay", "Raise pay")}</Btn>
            <Btn tone="ghost" onClick={() => run({ t: "biz", op: "train", id: b.id, worker: w.id })}>{T("Train", "Train")}</Btn>
            <Btn tone="red" onClick={() => { run({ t: "biz", op: "dismiss", id: b.id, worker: w.id }); setWorkerId(null); }}>{T("Fire", "Fire")}</Btn>
          </div>
        </ActionSheet>
      )}
      {offer && (
        <ActionSheet emoji={BUYER_EMOJI[offer.type]} tile="bg-amber-100" title={offer.buyer} sub={`${BUYER_LABEL[offer.type]()} · ${naira(offer.amount)}`} onClose={() => setOfferId(null)}>
          <p className="mb-3 text-sm text-slate-600">{T(offer.note.en, offer.note.pcm)}</p>
          <div className="flex flex-wrap gap-2">
            <Btn tone="gold" onClick={() => { run({ t: "biz", op: "accept", id: b.id, offer: offer.id }); setOfferId(null); onClose(); }}>{T("Accept", "Accept")} · {naira(offer.type === "instalment" ? offer.amount * 0.5 : offer.amount)}{offer.type === "instalment" ? " " + T("now", "now") : ""}</Btn>
            <Btn tone="ghost" onClick={() => run({ t: "biz", op: "haggle", id: b.id, offer: offer.id })}>{T("Haggle", "Haggle")}</Btn>
          </div>
        </ActionSheet>
      )}
    </ActionSheet>
  );
}

// ---------------------------------------------------------------------------
// Law and crime
// ---------------------------------------------------------------------------
const CRIME_EMOJI: Record<string, string> = { pickpocket: "👛", shoplift: "🛍️", fraud: "💻", burglary: "🏚️", cartheft: "🚗", robbery: "🔫", contract: "☠️" };

export function LawTab({ p, run }: { p: Player; run: Run }) {
  const [crime, setCrime] = useState<(typeof CRIMES)[number] | null>(null);
  const open = p.crime.cases.filter((c) => c.stage !== "closed");
  const cb = crime ? crimeBlock(p, crime) : null;
  return (
    <Hub back={T("Law", "Law")} groups={[{ rows: [
      { id: "status", emoji: "⚖️", tile: "bg-indigo-100", name: T("Legal status", "Legal status"), desc: open.length ? T(`${open.length} open case${open.length === 1 ? "" : "s"}`, `${open.length} open case`) : T(`Police heat ${Math.round(p.crime.heat)}%`, `Police heat ${Math.round(p.crime.heat)}%`), node: (<>
      <ListGroup title={T("Legal status", "Legal status")} sub={T("Crime pays quickly and costs heavily. Cases are decided in court, not by luck alone.", "Crime dey pay fast but e dey cost well. Court dey decide cases, no be luck alone.")}>
        {p.prison > 0 && <ListRow emoji="⛓️" tile="bg-rose-100" name={T("In prison", "You dey prison")} desc={T(`${p.prison} yr left`, `${p.prison} yr remain`)} />}
        <div className="grid grid-cols-2 gap-3 px-3.5 py-3"><Bar label={T("Police heat", "Police heat")} value={p.crime.heat} invert /><Bar label={T("Criminal skill", "Criminal skill")} value={p.crime.skill} tone="blue" /></div>
        {open.map((c) => <ListRow key={c.id} emoji="📂" tile="bg-rose-100" name={`${T("Open case", "Open case")}: ${c.charge}`} desc={c.stage} />)}
      </ListGroup></>) },
      { id: "risky", emoji: "🕶️", tile: "bg-slate-200", name: T("Risky choices", "Risky choices"), desc: T("Crime pays fast and costs heavily", "Crime dey pay fast but e cost well"), hidden: p.age < 14, node: (<>
      {p.age >= 14 && (
        <ListGroup title={T("Risky choices", "Risky choices")} sub={T("You may be caught. Consequences include arrest, a record, fines, prison and revenge.", "Dem fit catch you. E fit bring arrest, record, fine, prison and revenge.")}>
          {CRIMES.map((c) => <ListRow key={c.id} emoji={CRIME_EMOJI[c.id] ?? "🕶️"} tile="bg-slate-200" name={c.label} desc={c.blurb} onClick={() => setCrime(c)} />)}
        </ListGroup>
      )}
      {crime && (
        <ActionSheet emoji={CRIME_EMOJI[crime.id] ?? "🕶️"} tile="bg-slate-200" title={crime.label} onClose={() => setCrime(null)}>
          <p className="mb-3 text-sm text-slate-600">{crime.blurb}</p>
          <Btn tone="red" disabled={Boolean(cb)} onClick={() => { run({ t: "crime", id: crime.id }); setCrime(null); }}>{cb ?? T("Do it", "Do am")}</Btn>
        </ActionSheet>
      )}</>) },
      { id: "record", emoji: "📁", tile: "bg-amber-100", name: T("Criminal record", "Criminal record"), desc: p.crime.record.length ? T(`${p.crime.record.length} entr${p.crime.record.length === 1 ? "y" : "ies"}`, `${p.crime.record.length} entry`) : T("Clean record", "Clean record"), node: (<>
      <ListGroup title={T("Criminal record", "Criminal record")}>
        {p.crime.record.length === 0 ? <ListRow emoji="✅" tile="bg-emerald-100" name={T("Clean record", "Your record clean")} /> : p.crime.record.map((r, i) => <ListRow key={i} emoji="📁" tile="bg-amber-100" name={r.charge} desc={`${T("Age", "Age")} ${r.age} · ${r.outcome}`} />)}
      </ListGroup></>) },
    ] }]} />
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
    <ListGroup title={T("Your will", "Your will")} sub={T(`Total allocated: ${totalPct(shares)}%. Without a will, the law splits your estate by default and families fight.`, `Total allocated: ${totalPct(shares)}%. If you no write will, law go share your property by default and family go fight.`)}>
      {people.map((b) => (
        <ListRow key={b.id} emoji="📜" tile="bg-amber-100" name={b.label}
          right={<span className="flex items-center gap-1.5">
            <button type="button" aria-label="-10%" className="h-8 w-8 rounded-full bg-slate-100 text-base font-black text-slate-600" onClick={() => run({ t: "will", id: b.id, pct: Math.max(0, pct(b.id) - 10) })}>−</button>
            <span className="w-10 text-center text-sm font-extrabold text-[#0b2a6b]">{pct(b.id)}%</span>
            <button type="button" aria-label="+10%" className="h-8 w-8 rounded-full bg-blue-600 text-base font-black text-white" onClick={() => run({ t: "will", id: b.id, pct: Math.min(100, pct(b.id) + 10) })}>+</button>
          </span>} />
      ))}
    </ListGroup>
  );
}

// ---------------------------------------------------------------------------
// Vocational training and mortgages
// ---------------------------------------------------------------------------
export function TradeCard({ p, run }: { p: Player; run: Run }) {
  const [pick, setPick] = useState<(typeof TRADES)[number] | null>(null);
  const b = tradeBlock(p);
  if (p.age < 15) return null;
  if (p.flags.trade) return <ListGroup title={T("Vocational training", "Vocational training")}><ListRow emoji="🛠️" tile="bg-amber-100" name={T("Certified", "Certified")} desc={T(`Certified in ${String(p.flags.trade)}.`, `You get certificate for ${String(p.flags.trade)}.`)} /></ListGroup>;
  if (p.school?.type === "vocational") return <ListGroup title={T("Vocational training", "Vocational training")}><ListRow emoji="🛠️" tile="bg-amber-100" name={T("In training", "You dey train")} desc={T(`${p.school.yearsLeft} year${p.school.yearsLeft === 1 ? "" : "s"} left.`, `${p.school.yearsLeft} year${p.school.yearsLeft === 1 ? "" : "s"} remain.`)} /></ListGroup>;
  return (
    <>
      <ListGroup title={T("Vocational training", "Vocational training")} sub={b ?? T("A trade certificate lifts your pay in related work, without a degree.", "Trade certificate fit raise your pay for that work, even without degree.")}>
        {TRADES.map((t) => <ListRow key={t.id} emoji={SKILL_EMOJI[t.id] ?? "🛠️"} tile="bg-amber-100" name={t.label} desc={`${t.years} ${T("yr", "yr")} · ${t.blurb}`} disabled={Boolean(b)} onClick={() => setPick(t)} />)}
      </ListGroup>
      {pick && (
        <ActionSheet emoji={SKILL_EMOJI[pick.id] ?? "🛠️"} tile="bg-amber-100" title={pick.label} sub={`${pick.years} ${T("yr", "yr")}`} onClose={() => setPick(null)}>
          <p className="mb-3 text-sm text-slate-600">{pick.blurb}</p>
          <Btn disabled={Boolean(b)} onClick={() => { run({ t: "trade", id: pick.id }); setPick(null); }}>{T("Enrol", "Register")}</Btn>
        </ActionSheet>
      )}
    </>
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
    <ListGroup title={T("In prison", "For prison")} sub={`${T(`${p.prison} year${p.prison === 1 ? "" : "s"} left. Phones, work, travel, shopping, dating and betting are not possible from inside.`, `${p.prison} year${p.prison === 1 ? "" : "s"} remain. Phone, work, travel, shopping, dating and betting no possible from inside.`)}${full ? ` ${T("This section is closed while you are locked up. You can still study, work on the prison detail, appeal, ask family for help, see a doctor or make a will.", "This section closed as you dey prison. You fit still read, work for prison detail, appeal, ask family for help, see doctor or make will.")}` : ""}`}>
      {PRISON_OPS.map((o) => {
        const b = prisonBlockOp(p, o.id);
        return <ListRow key={o.id} emoji={o.id === "work" ? "🔨" : o.id === "study" ? "📚" : o.id === "appeal" ? "⚖️" : "🏃"} tile="bg-rose-100" name={T(o.en, o.pcm)} desc={b ?? (o.id === "appeal" ? `${naira(appealCost(p))} · ` : "") + T(o.subEn, o.subPcm)} wrap disabled={Boolean(b)} onClick={() => run({ t: "prison", op: o.id })} />;
      })}
    </ListGroup>
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

const KIND_EMOJI: Record<string, string> = { land: "🌿", shack: "🛖", bungalow: "🏡", flats: "🏢", duplex: "🏠", apartment: "🏬", mansion: "🏰", plaza: "🏙️" };
const rowCls = "flex w-full items-center gap-3 bg-white px-3.5 py-3 text-left transition active:bg-slate-50";

export function PropertyMarketCard({ p, run }: { p: Player; run: Run }) {
  const [years, setYears] = useState(15);
  const [region, setRegion] = useState("all");
  const [sortBy, setSortBy] = useState<"price" | "yield">("price");
  const [openId, setOpenId] = useState<string | null>(null);
  if (p.age < 18) return null;
  const f = REGIONS.find((r) => r.id === region) ?? REGIONS[0];
  const all = p.listings ?? [];
  const list = all.filter((l) => f.match(l.stateId)).sort((a, b) => (sortBy === "price" ? a.price - b.price : (locationOf(b.loc)?.yield ?? 0) - (locationOf(a.loc)?.yield ?? 0)));
  const sel = all.find((l) => l.id === openId) ?? null;
  return (
    <>
      <p className="mb-2 px-1 text-[12px] text-slate-500">{T("Houses and plots for sale across Nigeria. Prices follow the neighbourhood: Banana Island costs billions, Maiduguri costs a few million but is riskier.", "Houses and plots dey for sale across Nigeria. Price dey follow area: Banana Island na billions, Maiduguri na few million but e risky pass.")}</p>
      <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {REGIONS.map((r) => <button key={r.id} type="button" onClick={() => setRegion(r.id)} className={cx("shrink-0 rounded-full px-3 py-1 text-[11.5px] font-bold", region === r.id ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200")}>{r.label()}</button>)}
      </div>
      <div className="mb-2 flex items-center gap-1.5 px-1 text-[11.5px] text-slate-500">
        {T("Sort", "Sort")}:
        <Btn small tone={sortBy === "price" ? "gold" : "ghost"} onClick={() => setSortBy("price")}>{T("Price", "Price")}</Btn>
        <Btn small tone={sortBy === "yield" ? "gold" : "ghost"} onClick={() => setSortBy("yield")}>{T("Rent yield", "Rent yield")}</Btn>
      </div>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_22px_-14px_rgba(30,64,175,0.35)]">
        {list.length === 0 && <p className="p-3 text-sm text-slate-500">{T("Nothing listed in this area right now.", "Nothing dey for this area now.")}</p>}
        {list.map((l) => {
          const loc = locationOf(l.loc);
          return (
            <button key={l.id} type="button" onClick={() => setOpenId(l.id)} className={rowCls}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-[24px]">{KIND_EMOJI[l.kind] ?? "🏠"}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-extrabold leading-tight text-[#0b2a6b]">{HOUSE_KINDS[l.kind].label} <span className="font-medium text-slate-500">({loc?.name ?? STATE_BY_ID[l.stateId].name})</span></span>
                <span className="block text-[12px] font-semibold text-blue-700">{naira(l.price)}{loc && l.kind !== "land" ? <span className="font-normal text-slate-500"> · {T("rent", "rent")} {(loc.yield * 100).toFixed(1)}%</span> : null}</span>
              </span>
              <span className="shrink-0 px-1 text-xl font-black text-blue-700">⋯</span>
            </button>
          );
        })}
      </div>
      {sel && (() => {
        const l = sel;
        const loc = locationOf(l.loc);
        const mort = l.kind === "land" ? null : mortgageQuote(p, l.kind, years, { price: l.price });
        const cos = l.kind === "land" ? null : mortgageQuote(p, l.kind, years, { price: l.price, cosign: true });
        const plan = planQuote(p, l);
        const close = () => setOpenId(null);
        return (
          <Sheet title={`${HOUSE_KINDS[l.kind].label} · ${loc?.name ?? STATE_BY_ID[l.stateId].name}`} onClose={close}>
            <div className="text-center text-2xl font-extrabold text-blue-700">{naira(l.price)}</div>
            {loc && <p className="mt-1 text-center text-xs text-slate-500">{TIER_LABEL[loc.tier]()} · {loc.blurb()}</p>}
            <div className="mt-2 flex flex-wrap justify-center gap-1.5 text-[10.5px]">
              <Badge tone={l.condition === "good" ? "green" : l.condition === "fair" ? "gray" : "red"}>{l.condition === "good" ? T("Good condition", "Good condition") : l.condition === "fair" ? T("Fair condition", "Fair condition") : T("Needs work", "Need work")}</Badge>
              {loc && l.kind !== "land" && <Badge tone="gold">{T("Rent", "Rent")} ~{naira(l.value * loc.yield)}/{T("yr", "yr")} ({(loc.yield * 100).toFixed(1)}%)</Badge>}
              {loc && <Badge>{T("Growth", "Growth")}: {growthWord(loc.growth)}</Badge>}
              {loc && <Badge tone={loc.risk >= 0.06 ? "red" : "gray"}>{riskWord(loc.risk)}</Badge>}
            </div>
            {mort && <div className="mt-3 flex items-center gap-1.5 text-[11.5px] text-slate-500">{T("Mortgage term", "Mortgage term")}: {[10, 15, 20].map((y) => <Btn key={y} small tone={years === y ? "gold" : "ghost"} onClick={() => setYears(y)}>{y}y</Btn>)}</div>}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Btn tone="gold" disabled={Boolean(listingBlock(p, l, "cash"))} onClick={() => { run({ t: "property", id: l.id, mode: "cash" }); close(); }}>{T("Pay cash", "Pay cash")}</Btn>
              {mort && <Btn tone="ghost" disabled={Boolean(mort.block)} onClick={() => { run({ t: "property", id: l.id, mode: "mortgage", years }); close(); }}>{T("Mortgage", "Mortgage")} · {naira(mort.monthly)}/{T("mo", "mo")}</Btn>}
              {cos && <Btn tone="ghost" disabled={Boolean(cos.block)} onClick={() => { run({ t: "property", id: l.id, mode: "cosign", years }); close(); }}>{T("Parent co-signs", "Parent go co-sign")}</Btn>}
              <Btn tone="ghost" disabled={Boolean(plan.block)} onClick={() => { run({ t: "property", id: l.id, mode: "plan" }); close(); }}>{T("Payment plan", "Payment plan")}</Btn>
            </div>
            {(mort?.block || cos?.block || plan.block) && <p className="mt-2 text-[11px] text-slate-500">{[mort?.block, cos?.block, plan.block].filter(Boolean).join(" · ")}</p>}
          </Sheet>
        );
      })()}
    </>
  );
}

/** Everything you own in property: where it is, what it earns, and what you can do with it. */
export function PortfolioCard({ p, run }: { p: Player; run: Run }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (p.houses.length === 0) return <p className="mb-3 rounded-2xl bg-white p-3 text-sm text-slate-500 ring-1 ring-slate-100">{T("You own no property yet. Browse the market below.", "You no get property yet. Check the market below.")}</p>;
  const total = p.houses.reduce((s, h) => s + h.value, 0);
  const rent = p.houses.filter((h) => h.use === "rent" && !h.project).reduce((s, h) => s + h.value * (locationOf(h.loc)?.yield ?? 0.05), 0);
  const h = p.houses.find((x) => x.id === openId) ?? null;
  const loc = h ? locationOf(h.loc) : undefined;
  const opts = h ? developOptions(h) : [];
  return (
    <section className="mb-4">
      <h2 className="mb-1.5 px-1 text-[12px] font-extrabold uppercase tracking-wide text-slate-500">{T("My properties", "My properties")} · {naira(total)} · {T("rent", "rent")} ~{naira(rent)}/{T("yr", "yr")}</h2>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_22px_-14px_rgba(30,64,175,0.35)]">
        {p.houses.map((x) => {
          const l = locationOf(x.loc);
          return (
            <button key={x.id} type="button" onClick={() => setOpenId(x.id)} className={rowCls}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[24px]">{KIND_EMOJI[x.kind] ?? "🏠"}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-extrabold leading-tight text-[#0b2a6b]">{HOUSE_KINDS[x.kind].label} <span className="font-medium text-slate-500">({l?.name ?? STATE_BY_ID[x.state].name})</span></span>
                <span className="block text-[12px] text-slate-500"><span className="font-semibold text-blue-700">{naira(x.value)}</span> · {x.project ? T("being built", "dem dey build") : x.use}{x.loanId ? ` · ${T("mortgage", "mortgage")}` : ""}</span>
              </span>
              <span className="shrink-0 px-1 text-xl font-black text-blue-700">⋯</span>
            </button>
          );
        })}
      </div>
      {h && (
        <Sheet title={`${HOUSE_KINDS[h.kind].label} · ${loc?.name ?? STATE_BY_ID[h.state].name}`} onClose={() => setOpenId(null)}>
          <div className="text-center text-2xl font-extrabold text-blue-700">{naira(h.value)}</div>
          <p className="mt-1 text-center text-xs text-slate-500">
            {h.project ? T(`Being built: ${HOUSE_KINDS[h.project.kind].label.toLowerCase()}, ready at age ${h.project.readyAge}`, `Dem dey build ${HOUSE_KINDS[h.project.kind].label.toLowerCase()}, e go ready for age ${h.project.readyAge}`) : T(`In use: ${h.use}`, `How you dey use am: ${h.use}`)}
            {loc && !h.project && h.kind !== "land" ? ` · ${T("yield", "yield")} ${(loc.yield * 100).toFixed(1)}%` : ""}
          </p>
          {!h.project && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {h.kind !== "land" && (["owner", "family", "rent", "empty"] as const).map((u) => (
                <Btn key={u} small tone={h.use === u ? "gold" : "ghost"} onClick={() => run({ t: "use", id: h.id, use: u })}>{u === "owner" ? T("Live", "Live") : u === "family" ? T("Family", "Family") : u === "rent" ? T("Rent out", "Rent out") : T("Empty", "Empty")}</Btn>
              ))}
              <Btn small tone="red" onClick={() => { run({ t: "sell", id: h.id }); setOpenId(null); }}>{T("Sell", "Sell")}</Btn>
            </div>
          )}
          {opts.length > 0 && (
            <div className="mt-3 border-t border-slate-100 pt-3">
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
        </Sheet>
      )}
    </section>
  );
}

export function PostgradCard({ p, run }: { p: Player; run: Run }) {
  if (p.edu !== "tertiary" || p.age < 21) return null;
  if (p.flags.postgrad === "PhD") return <ListGroup title={T("Postgraduate study", "Postgraduate study")}><ListRow emoji="🎓" tile="bg-violet-100" name="PhD" desc={T("You hold a PhD.", "You don get PhD.")} /></ListGroup>;
  return (
    <ListGroup title={T("Postgraduate study", "Postgraduate study")} sub={p.flags.postgrad ? T("Current: Master's degree", "Current: Master's degree") : T("A higher degree raises your pay and your standing.", "Higher degree go raise your pay and respect.")}>
      {POSTGRAD.map((d) => {
        const b = postgradBlock(p, d.id);
        return <ListRow key={d.id} emoji={d.id === "phd" ? "🧑‍🔬" : "🎓"} tile="bg-violet-100" name={T(d.en, d.pcm)} desc={`${d.years} ${T("yr", "yr")}`} note={b} disabled={Boolean(b)} onClick={() => run({ t: "postgrad", id: d.id })} />;
      })}
    </ListGroup>
  );
}

export function HeadlinesCard({ p }: { p: Player }) {
  const [open, setOpen] = useState(false);
  const news = (p.world?.news ?? []).slice(-3).reverse();
  if (news.length === 0) return null;
  const line = (n: (typeof news)[number]) => (p.lang === "en" ? n.en : n.pcm);
  return (
    <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-start gap-2 rounded-xl bg-white px-3 py-2 text-left shadow-sm ring-1 ring-slate-100" aria-expanded={open}>
      <span className="shrink-0 text-[11px] font-extrabold uppercase text-blue-600">{T("News", "Gist")}</span>
      {open ? (
        <ul className="min-w-0 flex-1 space-y-1">{news.map((n, i) => <li key={i} className="text-[11.5px] leading-snug text-slate-700">{line(n)}</li>)}</ul>
      ) : (
        <span className="min-w-0 flex-1 truncate text-[11.5px] text-slate-700">{line(news[0])}</span>
      )}
      <span className="shrink-0 text-xs text-slate-400">{open ? "▴" : "▾"}</span>
    </button>
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
    <>
      <ListGroup title={T("Market news", "Market news")} sub={T("Read the news before you invest. A good adviser sees some of it coming.", "Read the news before you invest. Good adviser fit see some of am before e come.")}>
        <div className="flex flex-wrap items-center gap-1.5 px-3.5 py-3 text-[11px]">
          <Badge tone={reg === "bull" ? "green" : reg === "bear" ? "red" : "gold"}>{reg === "bull" ? T("Bull market", "Bull market") : reg === "bear" ? T("Bear market", "Bear market") : T("Steady market", "Steady market")}</Badge>
          {idx.map(([k, v]) => <span key={k} className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{k} {Math.round(v ?? 100)}</span>)}
        </div>
        {feed.length === 0 && <ListRow emoji="📰" tile="bg-slate-100" name={T("Nothing in the headlines yet", "Nothing for headlines yet")} />}
        {feed.map((f, i) => <ListRow key={i} emoji={f.tone === "up" ? "📈" : f.tone === "down" ? "📉" : f.kind === "tip" ? "💡" : "📰"} tile={f.tone === "up" ? "bg-emerald-100" : f.tone === "down" ? "bg-rose-100" : "bg-sky-100"} name={T(f.en, f.pcm)} wrap />)}
      </ListGroup>
      <ListGroup title={T("Financial adviser", "Financial adviser")}>
        {p.advisor ? (
          <ListRow emoji="🧑‍💼" tile="bg-sky-100" name={p.advisor.name} desc={`${T(ADVISOR_TIERS[p.advisor.tier - 1].en, ADVISOR_TIERS[p.advisor.tier - 1].pcm)} · ${naira(advisorFee(p, p.advisor.tier))}/${T("mo", "mo")}`} right={<span className="text-blue-600 underline">{T("Let go", "Sack am")}</span>} onClick={() => run({ t: "advisor", op: "fire" })} />
        ) : ADVISOR_TIERS.map((t) => {
          const b = advisorBlock(p, t.tier);
          return <ListRow key={t.tier} emoji="🧑‍💼" tile="bg-sky-100" name={T(t.en, t.pcm)} desc={`${naira(advisorFee(p, t.tier))}/${T("month", "month")}`} note={b} right={T("Hire", "Hire")} disabled={Boolean(b)} onClick={() => run({ t: "advisor", op: "hire", tier: t.tier })} />;
        })}
      </ListGroup>
    </>
  );
}
