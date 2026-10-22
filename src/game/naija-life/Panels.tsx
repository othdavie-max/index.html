"use client";

import { useState } from "react";
import { Avatar } from "./Avatar";
import type { Action } from "./engine";
import { BET_KINDS, betBlock, betProfit } from "./betting";
import { BIZ_KINDS, BIZ_BY_ID, hireCost, startBlock, startCostFor, upgradeCost, valuation } from "./business";
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
import { listingBlock, planQuote } from "./property";
import { STAGE_LABEL, activePartners, dateCost, datingAllowed, intimacyBlock } from "./relationships";
import { CONTENT, PLATFORMS, postBlock, socialBlock, totalFollowers } from "./social";
import { VEHICLE_MODELS, priceOf, repairCost, isInsured } from "./vehicles";
import { beneficiaries, currentShares, totalPct } from "./will";
import type { Candidate, Npc, PartnerRel, Platform, Player } from "./types";
import { Badge, Bar, Btn, Card, H, cx } from "./ui";
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
        <H sub="Loans, dating, social media and betting all need a phone.">No phone yet</H>
        <p className="text-sm text-white/70">{p.age < 11 ? "You are too young for your own phone. Maybe a parent will buy you one." : "Buy one, or ask your parents in the Family tab."}</p>
        {p.age >= 11 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn small tone="ghost" disabled={p.money < I(p, 25_000)} onClick={() => run({ t: "buy", item: "phone" })}>Basic phone ({naira(I(p, 25_000))})</Btn>
            <Btn small tone="gold" disabled={p.money < I(p, 180_000)} onClick={() => run({ t: "buy", item: "smartphone" })}>Smartphone ({naira(I(p, 180_000))})</Btn>
          </div>
        )}
      </Card>
    );
  }
  const apps: { id: PhoneApp; label: string; sub: string }[] = [
    { id: "wallet", label: "Wallet", sub: "Loans and balance" },
    { id: "spark", label: "Spark", sub: "Dating app" },
    { id: "social", label: "Gram / TokTik", sub: "Social media" },
    { id: "bet", label: "Naija9ja Bet", sub: "Sports betting" },
  ];
  if (app === "home") {
    return (
      <Card>
        <H sub={p.possessions.smartphone ? "Smartphone" : "Basic phone: upgrade for social apps"}>Your phone</H>
        <div className="grid grid-cols-2 gap-2">
          {apps.map((a) => (
            <button key={a.id} type="button" onClick={() => setApp(a.id)} className="rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10">
              <span className="block text-sm font-semibold">{a.label}</span>
              <span className="block text-[11px] text-white/50">{a.sub}</span>
            </button>
          ))}
        </div>
        {!p.possessions.smartphone && <Btn small tone="gold" className="mt-3" disabled={p.money < I(p, 180_000)} onClick={() => run({ t: "buy", item: "smartphone" })}>Upgrade to smartphone ({naira(I(p, 180_000))})</Btn>}
      </Card>
    );
  }
  return (
    <>
      <button type="button" className="text-xs text-[#f5b82e]" onClick={() => setApp("home")}>← Back to phone</button>
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
        <H sub={`Credit score ${Math.round(p.credit)} · Total debt ${naira(totalDebt(p))}`}>Wallet</H>
        <div className="text-2xl font-bold text-[#f5b82e]">{naira(p.money)}</div>
        <div className="mt-2"><Bar label="Credit score" value={p.credit} /></div>
      </Card>
      <Card>
        <H sub="Read the terms before you accept. Late payment hurts your credit.">Loan offers</H>
        <div className="space-y-2">
          {offers.map((o) => (
            <div key={o.id} className="rounded-xl bg-white/5 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{o.name}</div>
                  <div className="text-[11px] text-white/50">{o.blurb}</div>
                </div>
                <Badge tone={o.eligible ? "red" : "green"}>{o.eligible ?? `up to ${naira(o.limit)}`}</Badge>
              </div>
              {!o.eligible && <Btn small tone="ghost" className="mt-2" onClick={() => { setSel(o.id); setTerm(o.minTerm); }}>{sel === o.id ? "Selected" : "See terms"}</Btn>}
            </div>
          ))}
        </div>
      </Card>
      {offer && prev && (
        <Card className="border-[#f5b82e]/40">
          <H>{offer.name} terms</H>
          <div className="flex gap-1.5">
            {[0.25, 0.5, 1].map((f) => <Btn key={f} small tone={frac === f ? "gold" : "ghost"} onClick={() => setFrac(f)}>{f * 100}%</Btn>)}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            Term (months):
            {Array.from({ length: offer.maxTerm - offer.minTerm + 1 }, (_, i) => offer.minTerm + i).filter((m) => offer.maxTerm - offer.minTerm < 8 || m % 3 === 0 || m === offer.minTerm).map((m) => (
              <Btn key={m} small tone={t === m ? "gold" : "ghost"} onClick={() => setTerm(m)}>{m}</Btn>
            ))}
          </div>
          <dl className="mt-3 space-y-1 text-sm">
            <Row k="You borrow" v={naira(prev.principal)} />
            <Row k="Fee taken upfront" v={naira(prev.fee)} />
            <Row k="You receive" v={naira(prev.net)} />
            <Row k="Monthly repayment" v={naira(prev.monthly)} />
            <Row k="Total you repay" v={naira(prev.total)} />
            <Row k="Interest cost" v={naira(prev.interest)} bad />
            <Row k="First payment" v={prev.firstDue} />
            <Row k="Late fee" v={`${(offer.lateFeePct * 100).toFixed(0)}% of the instalment`} />
          </dl>
          <Btn className="mt-3 w-full" tone="gold" disabled={Boolean(block)} onClick={() => { run({ t: "loanTake", offer: offer.id, amount, term: t }); setSel(null); }}>
            {block ?? "Accept and take the loan"}
          </Btn>
        </Card>
      )}
      {mine.length > 0 && (
        <Card>
          <H>What you owe</H>
          <div className="space-y-2">
            {mine.map((l) => (
              <div key={l.id} className="rounded-xl bg-white/5 p-3 text-sm">
                <div className="flex justify-between"><span className="font-semibold">{l.lenderName}</span><span className="text-red-300">{naira(l.balance)}</span></div>
                <div className="text-[11px] text-white/50">
                  {l.informal ? `Due month ${l.dueIndex ? ((l.dueIndex - 1) % 12) + 1 : "?"} of age ${l.dueIndex ? Math.floor((l.dueIndex - 1) / 12) : "?"}` : `${naira(l.monthly)}/month`}
                  {l.missed > 0 ? ` · ${l.missed} missed` : ""}
                </div>
                <div className="mt-2 flex gap-1.5">
                  <Btn small tone="ghost" disabled={p.money < Math.min(l.balance, l.monthly || l.balance)} onClick={() => run({ t: "loanRepay", id: l.id, amount: l.informal ? l.balance : l.monthly })}>{l.informal ? "Pay in full" : "Pay instalment"}</Btn>
                  {!l.informal && <Btn small tone="ghost" disabled={p.money < l.balance} onClick={() => run({ t: "loanRepay", id: l.id, amount: l.balance })}>Settle ({naira(l.balance)})</Btn>}
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
  return <div className="flex justify-between"><dt className="text-white/60">{k}</dt><dd className={cx("font-semibold", bad && "text-red-300")}>{v}</dd></div>;
}

function Spark({ p, run }: { p: Player; run: Run }) {
  const d = p.rel;
  const blocked = datingAllowed(p);
  const partners = activePartners(p);
  const [bio, setBio] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  if (blocked) return <Card><H>Spark</H><p className="text-sm text-white/70">{blocked}</p></Card>;
  const choosePlan = (id: string, plan: "cheap" | "nice" | "luxury") => run({ t: "dating", op: "date", npc: id, plan });
  return (
    <>
      {!d.profile ? (
        <Card>
          <H sub="Make a profile to see who is around.">Create your Spark profile</H>
          <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short bio" maxLength={80} className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm" />
          <Btn className="mt-3" onClick={() => run({ t: "dating", op: "profile", bio: bio || "Just here for good vibes.", interests: ["music", "food", "travel"] })}>Create profile</Btn>
        </Card>
      ) : (
        <Card>
          <H sub={`${d.swipesLeft} swipes · ${d.chatsLeft} chats left this year`}>Discover</H>
          {d.deck.length === 0 ? (
            <Btn small onClick={() => run({ t: "dating", op: "swipe" })}>Refresh deck</Btn>
          ) : (
            <CandidateCard p={p} c={d.deck[0]} run={run} />
          )}
        </Card>
      )}
      {partners.length > 0 && (
        <Card>
          <H>Matches and partners</H>
          <div className="space-y-2">
            {partners.map(({ rel, npc }) => (
              <div key={npc.id} className="rounded-xl bg-white/5 p-3">
                <div className="flex items-center gap-3">
                  <Face n={npc} p={p} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{npc.name}</div>
                    <div className="text-[11px] text-white/50">{STAGE_LABEL[rel.stage]} · {npc.occupation}</div>
                    <div className="mt-1 grid grid-cols-3 gap-1.5"><Bar label="Love" value={rel.affection} tone="gold" /><Bar label="Trust" value={rel.trust} tone="blue" /><Bar label="Satisf." value={rel.satisfaction} /></div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Btn small tone="ghost" onClick={() => setOpen(open === npc.id ? null : npc.id)}>{open === npc.id ? "Close" : "Actions"}</Btn>
                  <Btn small tone="ghost" onClick={() => run({ t: "dating", op: "spend", npc: npc.id })}>Spend time</Btn>
                </div>
                {open === npc.id && (
                  <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
                    <Thread rel={rel} />
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <span className="w-full text-white/50">Chat</span>
                      {(["flirty", "funny", "genuine", "boring"] as const).map((tn) => <Btn key={tn} small tone="ghost" onClick={() => run({ t: "dating", op: "chat", npc: npc.id, tone: tn })}>{tn}</Btn>)}
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <span className="w-full text-white/50">Date</span>
                      {(["cheap", "nice", "luxury"] as const).map((pl) => <Btn key={pl} small tone="ghost" disabled={p.money < dateCost(p, pl)} onClick={() => choosePlan(npc.id, pl)}>{pl} ({naira(dateCost(p, pl))})</Btn>)}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {rel.stage === "dating" && <Btn small tone="gold" onClick={() => run({ t: "dating", op: "official", npc: npc.id })}>Make it official</Btn>}
                      {rel.stage === "exclusive" && <Btn small tone="gold" onClick={() => run({ t: "dating", op: "propose", npc: npc.id })}>Propose</Btn>}
                      {rel.stage === "engaged" && <Btn small tone="gold" onClick={() => run({ t: "dating", op: "marry", npc: npc.id })}>Marry</Btn>}
                      {p.age >= 18 && (() => { const b = intimacyBlock(p, npc.id); return (
                        <>
                          <Btn small tone="ghost" disabled={Boolean(b)} onClick={() => run({ t: "dating", op: "night", npc: npc.id, prot: "condom" })}>Spend the night (protected)</Btn>
                          <Btn small tone="ghost" disabled={Boolean(b)} onClick={() => run({ t: "dating", op: "night", npc: npc.id, prot: "none" })}>(unprotected)</Btn>
                          {b && <span className="w-full text-[11px] text-white/40">{b}</span>}
                        </>
                      ); })()}
                      <Btn small tone="red" onClick={() => run({ t: "dating", op: "breakup", npc: npc.id })}>Break up</Btn>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function Thread({ rel }: { rel: PartnerRel }) {
  const msgs = (rel.messages ?? []).slice(-10);
  if (msgs.length === 0) return <p className="text-[11px] text-white/40">No messages yet. Say hello.</p>;
  return (
    <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-xl bg-black/20 p-2">
      {msgs.map((m, i) =>
        m.from === "note" ? (
          <p key={i} className="text-center text-[10px] italic text-white/40">{m.text} · age {m.age}</p>
        ) : (
          <div key={i} className={cx("flex", m.from === "me" ? "justify-end" : "justify-start")}>
            <span className={cx("max-w-[80%] rounded-2xl px-3 py-1.5 text-xs", m.from === "me" ? "bg-[#1f9d55] text-white" : "bg-white/10 text-white/90")}>{m.text}</span>
          </div>
        ),
      )}
    </div>
  );
}

function CandidateCard({ p, c, run }: { p: Player; c: Candidate; run: Run }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar look={c.look} gender={c.gender} age={p.age + c.ageDelta} size={96} />
      <div className="flex-1">
        <div className="text-base font-bold">{c.name}, {p.age + c.ageDelta}</div>
        <div className="text-xs text-white/60">{c.occupation} · {STATE_BY_ID[c.stateId]?.name ?? ""}</div>
        <div className="mt-1 flex flex-wrap gap-1">{c.interests.map((i) => <Badge key={i}>{i}</Badge>)}</div>
        <div className="mt-2 flex gap-2">
          <Btn small tone="ghost" onClick={() => run({ t: "dating", op: "swipe", npc: c.id, like: false })}>Pass</Btn>
          <Btn small tone="gold" onClick={() => run({ t: "dating", op: "swipe", npc: c.id, like: true })}>Like</Btn>
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
        <H sub={s ? `${s.handle} · ${totalFollowers(p).toLocaleString()} followers` : "Build a following."}>Social media</H>
        {block && <p className="text-sm text-white/60">{block}</p>}
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((pl) => {
            const acc = s?.accounts[pl.id];
            return acc ? (
              <Badge key={pl.id} tone="green">{pl.label}: {acc.followers.toLocaleString()}</Badge>
            ) : (
              <Btn key={pl.id} small tone="ghost" disabled={Boolean(block) || p.age < pl.minAge} onClick={() => run({ t: "social", op: "account", platform: pl.id })}>Open {pl.label}</Btn>
            );
          })}
        </div>
        {s && (
          <div className="mt-3 grid grid-cols-3 gap-2"><Bar label="Brand" value={s.brand} tone="gold" /><Bar label="Skill" value={s.skill} tone="blue" /><Bar label="Controversy" value={s.controversy} invert /></div>
        )}
      </Card>
      {s && Object.keys(s.accounts).length > 0 && (
        <Card>
          <H sub={`${s.postsLeft} posts left this year`}>Create content</H>
          <div className="mb-2 flex gap-1.5">
            {(Object.keys(s.accounts) as Platform[]).map((k) => <Btn key={k} small tone={plat === k ? "gold" : "ghost"} onClick={() => setPlat(k)}>{PLATFORMS.find((x) => x.id === k)?.label}</Btn>)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CONTENT.map((c) => {
              const b = postBlock(p, plat, c.id);
              return (
                <button key={c.id} type="button" disabled={Boolean(b)} onClick={() => run({ t: "social", op: "post", platform: plat, content: c.id })} className="rounded-xl border border-white/10 bg-white/5 p-2 text-left text-xs disabled:opacity-40">
                  <span className="block font-semibold">{c.label}</span>
                  <span className="block text-white/50">{b ?? naira(I(p, c.cost))}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <Btn small tone="ghost" onClick={() => run({ t: "social", op: "collab", platform: plat })}>Collab with a creator</Btn>
            <Btn small tone="ghost" onClick={() => run({ t: "social", op: "gear" })}>Upgrade gear</Btn>
          </div>
          {s.sponsors.length > 0 && <p className="mt-3 text-xs text-white/60">Sponsors: {s.sponsors.map((x) => `${x.brand} (${naira(x.monthly)}/mo, ${x.monthsLeft}m)`).join(", ")}</p>}
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
      <H sub={`${p.bets.slotsLeft} slots left this year · Net ${betProfit(p) >= 0 ? "+" : ""}${naira(betProfit(p))} lifetime`}>Naija9ja Bet</H>
      <p className="mb-2 text-xs text-white/50">The house always wins in the long run. Adults only.</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {stakes.map((s) => <Btn key={s} small tone={stake === s ? "gold" : "ghost"} onClick={() => setStake(s)}>{naira(s)}</Btn>)}
      </div>
      <div className="space-y-2">
        {BET_KINDS.map((k) => {
          const b = betBlock(p, stake);
          return (
            <div key={k.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
              <div><div className="text-sm font-semibold">{k.label}</div><div className="text-[11px] text-white/50">{k.blurb}</div></div>
              <Btn small disabled={Boolean(b)} onClick={() => run({ t: "bet", kind: k.id, stake })}>{b ?? "Bet"}</Btn>
            </div>
          );
        })}
      </div>
      {p.bets.compulsion > 50 && <p className="mt-2 text-xs text-red-300">You are betting compulsively.</p>}
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
      <H sub="Every naira in and out is recorded.">Ledger</H>
      <div className="mb-2 flex gap-1.5">
        <Btn small tone={view === "summary" ? "gold" : "ghost"} onClick={() => setView("summary")}>{T("Yearly", "Yearly")}</Btn>
        <Btn small tone={view === "months" ? "gold" : "ghost"} onClick={() => setView("months")}>{T("Monthly", "Monthly")}</Btn>
        <Btn small tone={view === "upcoming" ? "gold" : "ghost"} onClick={() => setView("upcoming")}>{T("Upcoming", "Wetin dey come")}</Btn>
        <Btn small tone={view === "history" ? "gold" : "ghost"} onClick={() => setView("history")}>{T("Transactions", "Transactions")}</Btn>
      </div>
      {view === "months" ? (
        <div className="space-y-2">
          {monthlySummary(p).length === 0 && <p className="text-sm text-white/60">{T("Nothing recorded yet.", "Nothing dey yet.")}</p>}
          {monthlySummary(p).map((m) => (
            <div key={m.key} className="rounded-xl bg-white/5 p-3 text-sm">
              <div className="flex justify-between"><span className="font-semibold">{T("Age", "Age")} {m.age} · {T("month", "month")} {m.month}</span><span className={m.income - m.expense >= 0 ? "text-emerald-300" : "text-red-300"}>{naira(m.income - m.expense)}</span></div>
              <div className="text-[11px] text-white/50">{T("In", "In")} {naira(m.income)} · {T("Out", "Out")} {naira(m.expense)}</div>
              <div className="mt-1 text-[11px] text-white/60">{m.cats.filter((c) => c.amount < 0).sort((a, b) => a.amount - b.amount).slice(0, 3).map((c) => `${c.category} ${naira(-c.amount)}`).join(" · ")}</div>
            </div>
          ))}
        </div>
      ) : view === "upcoming" ? (
        <ul className="space-y-1.5">
          {upcomingPayments(p).length === 0 && <p className="text-sm text-white/60">{T("No scheduled payments.", "No payment dey wait for you.")}</p>}
          {upcomingPayments(p).map((u, i) => (
            <li key={i} className="flex justify-between rounded-xl bg-white/5 px-3 py-2 text-sm"><span>{u.label}<span className="block text-[10px] text-white/40">{u.inMonths <= 0 ? T("this month", "this month") : T(`in ${u.inMonths} month${u.inMonths === 1 ? "" : "s"}`, `for ${u.inMonths} month${u.inMonths === 1 ? "" : "s"}`)}</span></span><span className="text-red-300">{naira(u.amount)}</span></li>
          ))}
        </ul>
      ) : view === "summary" ? (
        <div className="space-y-2">
          {years.length === 0 && <p className="text-sm text-white/60">Nothing recorded yet.</p>}
          {years.slice(0, 8).map((y) => (
            <div key={y.age} className="rounded-xl bg-white/5 p-3 text-sm">
              <div className="flex justify-between"><span className="font-semibold">Age {y.age}</span><span className={y.net >= 0 ? "text-emerald-300" : "text-red-300"}>{y.net >= 0 ? "+" : ""}{naira(y.net)}</span></div>
              <div className="text-[11px] text-white/50">In {naira(y.income)} · Out {naira(y.expense)}</div>
              {y.top.length > 0 && <div className="mt-1 text-[11px] text-white/60">Biggest costs: {y.top.map((t) => `${t.category} ${naira(t.amount)}`).join(", ")}</div>}
            </div>
          ))}
        </div>
      ) : (
        <>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="mb-2 rounded-lg border border-white/15 bg-[#0b1d13] px-2 py-1 text-xs">
            <option value="all">All categories</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ul className="space-y-1">
            {list.map((t) => (
              <li key={t.id} className="flex justify-between gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs">
                <span className="min-w-0 flex-1"><span className="block truncate text-white/90">{t.reason}</span><span className="text-[10px] text-white/40">age {t.age} · month {t.month} · {t.category} · bal {naira(t.after)}</span></span>
                <span className={cx("shrink-0 font-semibold", t.amount >= 0 ? "text-emerald-300" : "text-red-300")}>{t.amount >= 0 ? "+" : ""}{naira(t.amount)}</span>
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
      <H sub="Cash is not the same as wealth.">Assets and liabilities</H>
      <dl className="space-y-1 text-sm">
        <Row k="Cash" v={naira(p.money)} />
        <Row k="Investments" v={naira(holdings)} />
        <Row k="Property" v={naira(houses)} />
        <Row k="Vehicles" v={naira(cars)} />
        <Row k="Businesses" v={naira(biz)} />
        <Row k="Owed to you" v={naira(owed)} />
        <Row k="Debts" v={`-${naira(debt)}`} bad={debt > 0} />
      </dl>
    </Card>
  );
}

export function HousingCard({ p, run }: { p: Player; run: Run }) {
  const h = p.housing;
  const st = STATE_BY_ID[p.state];
  return (
    <Card>
      <H sub={h.type === "family" ? "You live with family." : `${h.type === "owned" ? "You own your home" : `Rent ${naira(h.annualRent)}/yr`}`}>Where you live</H>
      {h.arrears > 0 && <p className="mb-2 text-xs text-red-300">Rent arrears: {naira(h.arrears)}. You could be evicted.</p>}
      {p.age >= 18 && !st.abroad && (
        <div className="space-y-1.5">
          {HOME_TIERS.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
              <div><div className="text-sm font-semibold">{t.label}</div><div className="text-[11px] text-white/50">{t.blurb}</div></div>
              <Btn small tone="ghost" onClick={() => run({ t: "rent", tier: t.id })}>{naira(I(p, t.rent) * st.cost)}/yr</Btn>
            </div>
          ))}
          {h.type !== "family" && <Btn small tone="ghost" onClick={() => run({ t: "moveHome" })}>Move back with family</Btn>}
        </div>
      )}
    </Card>
  );
}

export function GarageCard({ p, run }: { p: Player; run: Run }) {
  const [show, setShow] = useState(false);
  return (
    <Card>
      <H sub="Cars cost fuel, repairs and insurance every month.">Garage</H>
      {p.vehicles.map((v) => (
        <div key={v.id} className="mb-2 rounded-xl bg-white/5 p-3">
          <div className="flex justify-between text-sm"><span className="font-semibold">{v.name}</span><span className="text-[#f5b82e]">{naira(v.value)}</span></div>
          <div className="text-[11px] text-white/50">Condition {v.condition}% · {v.role} · {isInsured(p, v) ? "insured" : "uninsured"}{v.loanId ? " · on finance" : ""}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Btn small tone="ghost" onClick={() => run({ t: "car", op: "repair", id: v.id })}>Repair ({naira(repairCost(p, v))})</Btn>
            <Btn small tone="ghost" onClick={() => run({ t: "car", op: "insure", id: v.id })}>Insure</Btn>
            {v.role === "personal" ? (
              <>
                <Btn small tone="ghost" onClick={() => run({ t: "car", op: "taxi", id: v.id })}>Run as taxi</Btn>
                <Btn small tone="ghost" onClick={() => run({ t: "car", op: "ridehail", id: v.id })}>Ride-hail</Btn>
              </>
            ) : <Btn small tone="ghost" onClick={() => run({ t: "car", op: "personal", id: v.id })}>Personal use</Btn>}
            <Btn small tone="red" onClick={() => run({ t: "car", op: "sell", id: v.id })}>Sell</Btn>
          </div>
        </div>
      ))}
      <Btn small tone="ghost" onClick={() => setShow(!show)}>{show ? "Hide dealership" : "Browse dealership"}</Btn>
      {show && (
        <div className="mt-2 space-y-1.5">
          {p.age < 18 && <p className="text-xs text-white/50">You must be 18 to buy a vehicle.</p>}
          {VEHICLE_MODELS.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
              <div className="text-sm"><div className="font-semibold">{m.name}</div><div className="text-[11px] text-white/50">{m.kind}{m.revenue ? " · earns income" : ""}</div></div>
              <div className="flex flex-col gap-1">
                <Btn small tone="ghost" disabled={p.age < 18 || p.money < priceOf(p, m)} onClick={() => run({ t: "car", op: "buy", id: m.id })}>{naira(priceOf(p, m))}</Btn>
                <Btn small tone="ghost" disabled={p.age < 18 || p.money < priceOf(p, m) * 0.3} onClick={() => run({ t: "car", op: "buyLoan", id: m.id })}>30% down</Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function SubsCard({ p }: { p: Player }) {
  if (p.subs.length === 0) return null;
  return (
    <Card>
      <H>Recurring payments</H>
      <ul className="space-y-1 text-sm">
        {p.subs.map((s) => <li key={s.id} className="flex justify-between"><span>{s.label}</span><span className="text-red-300">{naira(s.monthly)}/mo</span></li>)}
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
        <H sub={`${p.fam.label} · ${p.fam.structure.replace("-", " ")}`}>Background</H>
        <div className="flex flex-wrap gap-1.5">{p.fam.tags.map((t) => <Badge key={t} tone="gold">{t}</Badge>)}</div>
        <p className="mt-2 text-xs text-white/50">Wealth and generosity are different things. Rich parents can be strict, and poor parents can be very giving.</p>
      </Card>
      <Card>
        <H sub="Tap someone to ask for help, borrow, lend or give.">People</H>
        <div className="grid grid-cols-2 gap-2">
          {people.map((n) => (
            <button key={n.id} type="button" onClick={() => { setSel(n.id); setKind(null); }} className={cx("flex items-center gap-2 rounded-xl border p-2 text-left", sel === n.id ? "border-[#f5b82e]" : "border-white/10 bg-white/5")}>
              <Face n={n} p={p} size={44} />
              <span className="min-w-0 text-xs"><span className="block truncate font-semibold">{n.name.split(" ")[0]}</span><span className="block text-[10px] capitalize text-white/50">{n.role} · close {Math.round(n.closeness)}</span></span>
            </button>
          ))}
        </div>
      </Card>
      {npc && (
        <Card className="border-[#f5b82e]/40">
          <div className="flex items-center gap-3"><Face n={npc} p={p} size={64} /><div><div className="text-base font-bold">{npc.name}</div><div className="text-xs text-white/60">{npc.occupation} · age {p.age + npc.ageDelta}</div></div></div>
          <div className="mt-3 grid grid-cols-3 gap-2"><Bar label="Close" value={npc.closeness} tone="gold" /><Bar label="Trust" value={npc.trust} tone="blue" /><Bar label="Generous" value={npc.generosity} /></div>
          <p className="mt-2 text-[11px] text-white/50">{npc.traits.join(" · ")}{capacityOf(p, npc) <= 0 ? " · struggling financially" : ""}</p>
          {npc.memories.length > 0 && <p className="mt-1 text-[11px] text-white/40">Remembers: {npc.memories[npc.memories.length - 1].text}</p>}
          <H>Ask for money</H>
          <div className="flex flex-wrap gap-1.5">
            {kinds.map((k) => <Btn key={k} small tone={kind === k ? "gold" : "ghost"} onClick={() => { setKind(k); setAmt(defaultAmount(p, k)); }}>{SUPPORT_KINDS[k].label}</Btn>)}
          </div>
          {kind && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-1.5">
                {[0.5, 1, 2].map((f) => <Btn key={f} small tone="ghost" onClick={() => setAmt(Math.round((defaultAmount(p, kind) * f) / 500) * 500)}>{naira(Math.round((defaultAmount(p, kind) * f) / 500) * 500)}</Btn>)}
              </div>
              <Btn className="mt-2 w-full" tone="gold" onClick={() => run({ t: "ask", npc: npc.id, kind, amount: amt })}>Ask {npc.name.split(" ")[0]} for {naira(amt)}</Btn>
            </div>
          )}
          <H>Between you</H>
          <div className="flex flex-wrap gap-1.5">
            {p.age >= 16 && <Btn small tone="ghost" onClick={() => run({ t: "borrow", npc: npc.id, amount: Math.round(defaultAmount(p, "loan")) })}>Borrow {naira(defaultAmount(p, "loan"))}</Btn>}
            <Btn small tone="ghost" disabled={p.money < I(p, 50_000)} onClick={() => run({ t: "give", npc: npc.id, amount: I(p, 50_000), mode: "gift" })}>Gift {naira(I(p, 50_000))}</Btn>
            <Btn small tone="ghost" disabled={p.money < I(p, 200_000)} onClick={() => run({ t: "give", npc: npc.id, amount: I(p, 200_000), mode: "loan" })}>Lend {naira(I(p, 200_000))}</Btn>
          </div>
        </Card>
      )}
      {activeOwedToMe(p).length > 0 && (
        <Card>
          <H>People who owe you</H>
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
    { id: "none" as const, label: "No cover", cost: "free" },
    { id: "basic" as const, label: "Basic HMO", cost: naira(I(p, 60_000)) + "/yr" },
    { id: "premium" as const, label: "Premium HMO", cost: naira(I(p, 400_000)) + "/yr" },
  ];
  return (
    <>
      <Card>
        <H>Condition</H>
        <div className="space-y-2"><Bar label="Health" value={p.stats.health} /><Bar label="Fitness" value={p.stats.fitness} tone="blue" /><Bar label="Stress" value={p.stats.stress} invert /></div>
        <div className="mt-3 flex gap-2">
          <Btn small tone="ghost" onClick={() => run({ t: "checkup" })}>Check-up ({naira(I(p, 35_000))})</Btn>
          <Btn small tone="ghost" disabled={Boolean(gymBlock(p)) && !p.subs.some((s) => s.id === "gym")} onClick={() => run({ t: "gym" })}>{p.subs.some((s) => s.id === "gym") ? "Cancel gym membership" : "Join gym"}</Btn>
        </div>
      </Card>
      <Card>
        <H sub="Cover reduces your share at private hospitals and clinics.">Insurance</H>
        <div className="flex flex-wrap gap-1.5">
          {plans.map((pl) => <Btn key={pl.id} small tone={p.insurance.plan === pl.id ? "gold" : "ghost"} onClick={() => run({ t: "insure", plan: pl.id })}>{pl.label} · {pl.cost}</Btn>)}
        </div>
      </Card>
      <Card>
        <H>Current conditions</H>
        {p.conditions.length === 0 && <p className="text-sm text-white/60">You are not sick.</p>}
        <div className="space-y-2">
          {p.conditions.map((c) => (
            <div key={c.id} className="rounded-xl bg-white/5 p-3">
              <div className="flex justify-between text-sm"><span className="font-semibold">{c.name}</span><Badge tone={c.severity >= 4 ? "red" : "gold"}>severity {c.severity}</Badge></div>
              <div className="text-[11px] text-white/50">{c.treated ? "Treated" : "Untreated"}{c.monthsLeft >= 0 ? ` · ${c.monthsLeft} month(s) to recover` : " · chronic"}{c.needsSurgery ? " · needs surgery" : ""}{TEMPLATES[c.template]?.meds ? ` · meds ${naira(c.medMonthly)}/mo` : ""}</div>
              {!c.treated && (
                <div className="mt-2 space-y-1">
                  {facilitiesFor(p, c).map((f) => {
                    const { total, mine } = treatmentCost(p, c, f);
                    return (
                      <div key={f.id} className="flex items-center justify-between rounded-lg bg-black/20 px-2 py-1.5 text-xs">
                        <span>{f.label}<span className="block text-[10px] text-white/40">quality {f.quality}{mine < total ? ` · covered ${Math.round((1 - mine / total) * 100)}%` : ""}</span></span>
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
      <details className="rounded-2xl border border-white/10 bg-[#0e2218] p-4 text-xs text-white/60">
        <summary className="cursor-pointer text-sm font-semibold text-white/70">Where you can get care</summary>
        <ul className="mt-2 space-y-1">{FACILITIES.map((f) => <li key={f.id}>{f.label}: quality {f.quality}</li>)}</ul>
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
        <H sub={`${p.actionsLeft} actions left this year`}>Learn a skill</H>
        <div className="space-y-2">
          {SKILLS.map((s) => {
            const b = learnBlock(p, s);
            return (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                <div><div className="text-sm font-semibold">{s.label} {skillLevel(p, s.id) > 0 && <Badge tone="green">level {skillLevel(p, s.id)}</Badge>}</div><div className="text-[11px] text-white/50">{s.blurb}</div></div>
                <Btn small tone="ghost" disabled={Boolean(b)} onClick={() => run({ t: "learn", id: s.id })}>{b ?? naira(I(p, s.cost))}</Btn>
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <H>Self-improvement</H>
        <div className="grid grid-cols-2 gap-2">
          {GROWTH_ACTIVITIES.filter((a) => p.age >= a.minAge).map((a) => {
            const b = growthBlock(p, a);
            return (
              <button key={a.id} type="button" disabled={Boolean(b)} onClick={() => run({ t: "growth", id: a.id })} className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-left text-xs disabled:opacity-40">
                <span className="block font-semibold">{a.label}</span><span className="block text-white/50">{b ?? a.desc}</span>
              </button>
            );
          })}
        </div>
        {p.age >= 18 && (() => { const b = enlistBlock(p); return (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="w-full text-[11px] text-white/50">{b ?? "Join the armed forces"}</span>
            {(["army", "navy", "airforce"] as const).map((br) => <Btn key={br} small tone="ghost" disabled={Boolean(b)} onClick={() => run({ t: "enlist", branch: br })}>{br === "army" ? "Army" : br === "navy" ? "Navy" : "Air Force"}</Btn>)}
          </div>
        ); })()}
      </Card>
    </>
  );
}

export function BusinessCard({ p, run }: { p: Player; run: Run }) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  if (p.age < 18) return null;
  return (
    <Card>
      <H sub="Run it well and it grows. Run it badly and it eats your savings.">Businesses</H>
      {p.businesses.filter((b) => b.status === "open").map((b) => (
        <div key={b.id} className="mb-2 rounded-xl bg-white/5 p-3">
          <div className="flex justify-between text-sm"><span className="font-semibold">{b.name}</span><span className="text-[#f5b82e]">{naira(valuation(p, b))}</span></div>
          <div className="text-[11px] text-white/50">{BIZ_BY_ID[b.kind]?.label} · level {b.level} · {b.staff} staff · {STATE_BY_ID[b.stateId]?.name} · last month <span className={b.lastMonthProfit >= 0 ? "text-emerald-300" : "text-red-300"}>{naira(b.lastMonthProfit)}</span></div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Btn small tone="ghost" onClick={() => run({ t: "biz", op: "upgrade", id: b.id })}>Upgrade ({naira(upgradeCost(p, b))})</Btn>
            <Btn small tone="ghost" onClick={() => run({ t: "biz", op: "hire", id: b.id })}>Hire ({naira(hireCost(p, b))}/mo)</Btn>
            <Btn small tone="ghost" disabled={b.staff <= 0} onClick={() => run({ t: "biz", op: "fire", id: b.id })}>Lay off</Btn>
            <Btn small tone="ghost" onClick={() => run({ t: "biz", op: "manager", id: b.id })}>{b.manager ? "Fire manager" : "Hire manager"}</Btn>
            <Btn small tone="gold" onClick={() => run({ t: "biz", op: "sell", id: b.id })}>Sell</Btn>
            <Btn small tone="red" onClick={() => run({ t: "biz", op: "close", id: b.id })}>Close</Btn>
          </div>
        </div>
      ))}
      <Btn small tone="ghost" onClick={() => setShow(!show)}>{show ? "Hide" : "Start a business"}</Btn>
      {show && (
        <div className="mt-2 space-y-1.5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Business name (optional)" maxLength={30} className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm" />
          {BIZ_KINDS.map((k) => {
            const b = startBlock(p, k.id);
            return (
              <div key={k.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                <div className="text-sm"><div className="font-semibold">{k.label}</div><div className="text-[11px] text-white/50">{k.blurb}</div></div>
                <Btn small tone="ghost" disabled={Boolean(b)} onClick={() => run({ t: "biz", op: "start", id: k.id, name })}>{b ?? naira(startCostFor(p, k))}</Btn>
              </div>
            );
          })}
        </div>
      )}
    </Card>
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
        <H sub="Crime pays quickly and costs heavily. Cases are decided in court, not by luck alone.">Legal status</H>
        {p.prison > 0 && <Badge tone="red">In prison · {p.prison} yr left</Badge>}
        <div className="mt-2 grid grid-cols-2 gap-2"><Bar label="Police heat" value={p.crime.heat} invert /><Bar label="Criminal skill" value={p.crime.skill} tone="blue" /></div>
        {open.map((c) => <p key={c.id} className="mt-2 text-sm text-red-300">Open case: {c.charge} ({c.stage})</p>)}
      </Card>
      {p.age >= 14 && (
        <Card>
          <H sub="You may be caught. Consequences include arrest, a record, fines, prison and revenge.">Risky choices</H>
          <div className="space-y-2">
            {CRIMES.map((c) => {
              const b = crimeBlock(p, c);
              return (
                <div key={c.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                  <div><div className="text-sm font-semibold">{c.label}</div><div className="text-[11px] text-white/50">{c.blurb}</div></div>
                  <Btn small tone="red" disabled={Boolean(b)} onClick={() => run({ t: "crime", id: c.id })}>{b ?? "Do it"}</Btn>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      <Card>
        <H>Criminal record</H>
        {p.crime.record.length === 0 ? <p className="text-sm text-white/60">Clean record.</p> : (
          <ul className="space-y-1 text-sm">{p.crime.record.map((r, i) => <li key={i}>Age {r.age}: {r.charge} — {r.outcome}</li>)}</ul>
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
      <H sub={`Total allocated: ${totalPct(shares)}%. Without a will, the law splits your estate by default and families fight.`}>Your will</H>
      <div className="space-y-2">
        {people.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">
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
  if (p.flags.trade) return <Card><H>Vocational training</H><p className="text-sm text-white/70">Certified in {String(p.flags.trade)}.</p></Card>;
  if (p.school?.type === "vocational") return <Card><H>Vocational training</H><p className="text-sm text-white/70">In training: {p.school.yearsLeft} year{p.school.yearsLeft === 1 ? "" : "s"} left.</p></Card>;
  return (
    <Card>
      <H sub="A trade certificate lifts your pay in related work, without a degree.">Vocational training</H>
      {b && <p className="mb-2 text-xs text-white/50">{b}</p>}
      <div className="space-y-2">
        {TRADES.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
            <div><div className="text-sm font-semibold">{t.label}</div><div className="text-[11px] text-white/50">{t.years} yr · {t.blurb}</div></div>
            <Btn small tone="ghost" disabled={Boolean(b)} onClick={() => run({ t: "trade", id: t.id })}>Enrol</Btn>
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
      <H sub="Buy now, repay monthly. Miss payments and the bank takes the house.">Mortgage</H>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(HOUSE_KINDS) as (keyof typeof HOUSE_KINDS)[]).filter((k) => k !== "land").map((k) => <Btn key={k} small tone={kind === k ? "gold" : "ghost"} onClick={() => setKind(k)}>{HOUSE_KINDS[k].label}</Btn>)}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs">Term: {[10, 15, 20].map((y) => <Btn key={y} small tone={years === y ? "gold" : "ghost"} onClick={() => setYears(y)}>{y} yrs</Btn>)}</div>
      <dl className="mt-3 space-y-1 text-sm">
        <Row k="Price" v={naira(q.price)} />
        <Row k="Deposit now" v={naira(q.down)} />
        <Row k="Bank fee" v={naira(q.fee)} />
        <Row k="Monthly repayment" v={naira(q.monthly)} />
        <Row k="Interest rate" v={`${(q.apr * 100).toFixed(0)}% a year`} />
        <Row k="Total interest" v={naira(q.interest)} bad />
      </dl>
      <Btn className="mt-3 w-full" tone="gold" disabled={Boolean(q.block)} onClick={() => run({ t: "mortgage", kind, years })}>{q.block ?? "Accept the mortgage"}</Btn>
      {owned.map((h) => <p key={h.id} className="mt-2 text-xs text-white/60">{HOUSE_KINDS[h.kind].label} in {STATE_BY_ID[h.state].name}: {naira(mortgageBalance(p, h))} still owed</p>)}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Prison
// ---------------------------------------------------------------------------
export function PrisonCard({ p, run, full }: { p: Player; run: Run; full?: boolean }) {
  if (p.prison <= 0) return null;
  return (
    <Card className="border-red-400/40">
      <H sub={T(`${p.prison} year${p.prison === 1 ? "" : "s"} left. Phones, work, travel, shopping, dating and betting are not possible from inside.`, `${p.prison} year${p.prison === 1 ? "" : "s"} remain. Phone, work, travel, shopping, dating and betting no dey work from inside.`)}>{T("In prison", "You dey prison")}</H>
      {full && <p className="mb-2 text-sm text-white/70">{T("This section is closed while you are locked up. You can still study, work on the prison detail, appeal, ask family for help, see a doctor or make a will.", "This section closed as you dey prison. You fit still read, work prison detail, appeal, ask family for help, see doctor or write will.")}</p>}
      <div className="grid grid-cols-2 gap-2">
        {PRISON_OPS.map((o) => {
          const b = prisonBlockOp(p, o.id);
          return (
            <button key={o.id} type="button" disabled={Boolean(b)} onClick={() => run({ t: "prison", op: o.id })} className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-left text-xs disabled:opacity-40">
              <span className="block font-semibold">{T(o.en, o.pcm)}</span>
              <span className="block text-white/50">{b ?? (o.id === "appeal" ? `${naira(appealCost(p))} · ` : "") + T(o.subEn, o.subPcm)}</span>
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
export function PropertyMarketCard({ p, run }: { p: Player; run: Run }) {
  const [years, setYears] = useState(15);
  if (p.age < 18) return null;
  const list = p.listings ?? [];
  return (
    <Card>
      <H sub={T("Existing houses for sale this year. Prices change with condition. Banks need good credit; a parent can co-sign.", "Houses wey dey for sale this year. Price depend on condition. Bank need good credit; parent fit co-sign.")}>{T("Property market", "Property market")}</H>
      <div className="mb-2 flex items-center gap-1.5 text-xs">{T("Mortgage term", "Mortgage term")}: {[10, 15, 20].map((y) => <Btn key={y} small tone={years === y ? "gold" : "ghost"} onClick={() => setYears(y)}>{y}</Btn>)}</div>
      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-white/60">{T("No listings right now.", "No house dey for sale now.")}</p>}
        {list.map((l) => {
          const mort = l.kind === "land" ? null : mortgageQuote(p, l.kind, years, { price: l.price });
          const cos = l.kind === "land" ? null : mortgageQuote(p, l.kind, years, { price: l.price, cosign: true });
          const plan = planQuote(p, l);
          return (
            <div key={l.id} className="rounded-xl bg-white/5 p-3">
              <div className="flex justify-between text-sm"><span className="font-semibold">{HOUSE_KINDS[l.kind].label} · {STATE_BY_ID[l.stateId].name}</span><span className="text-[#f5b82e]">{naira(l.price)}</span></div>
              <div className="text-[11px] text-white/50">{l.condition === "good" ? T("Good condition", "Good condition") : l.condition === "fair" ? T("Fair, a little worn", "Fair, small wear") : T("Run-down, cheap but worth less", "Run-down, cheap but e worth less")} · {T("worth", "worth")} {naira(l.value)}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Btn small tone="ghost" disabled={Boolean(listingBlock(p, l, "cash"))} onClick={() => run({ t: "property", id: l.id, mode: "cash" })}>{T("Pay cash", "Pay cash")}</Btn>
                {mort && <Btn small tone="ghost" disabled={Boolean(mort.block)} title={mort.block ?? ""} onClick={() => run({ t: "property", id: l.id, mode: "mortgage", years })}>{T("Mortgage", "Mortgage")} · {naira(mort.monthly)}/{T("mo", "mo")}</Btn>}
                {cos && <Btn small tone="ghost" disabled={Boolean(cos.block)} title={cos.block ?? ""} onClick={() => run({ t: "property", id: l.id, mode: "cosign", years })}>{T("Parent co-signs", "Parent co-sign")} · {naira(cos.monthly)}/{T("mo", "mo")}</Btn>}
                <Btn small tone="ghost" disabled={Boolean(plan.block)} title={plan.block ?? ""} onClick={() => run({ t: "property", id: l.id, mode: "plan" })}>{T("Rent-to-own plan", "Rent-to-own plan")} · {naira(plan.monthly)}/{T("mo", "mo")}</Btn>
              </div>
              {(mort?.block || cos?.block) && <p className="mt-1 text-[10px] text-white/40">{mort?.block}{mort?.block && cos?.block ? " · " : ""}{cos?.block}</p>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function PostgradCard({ p, run }: { p: Player; run: Run }) {
  if (p.edu !== "tertiary" || p.age < 21) return null;
  if (p.flags.postgrad === "PhD") return <Card><H>{T("Postgraduate study", "Postgraduate study")}</H><p className="text-sm text-white/70">{T("You hold a PhD.", "You don get PhD.")}</p></Card>;
  return (
    <Card>
      <H sub={T("A higher degree raises your pay and your standing.", "Higher degree go raise your pay and respect.")}>{T("Postgraduate study", "Postgraduate study")}</H>
      {p.flags.postgrad && <p className="mb-2 text-xs text-white/60">{T("Current: Master's degree", "Current: Master's degree")}</p>}
      <div className="space-y-2">
        {POSTGRAD.map((d) => {
          const b = postgradBlock(p, d.id);
          return (
            <div key={d.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
              <div className="text-sm"><div className="font-semibold">{T(d.en, d.pcm)}</div><div className="text-[11px] text-white/50">{d.years} {T("yr", "yr")}</div></div>
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
      <ul className="space-y-1.5">{news.map((n, i) => <li key={i} className="text-xs text-white/75"><span className="text-[#f5b82e]">{T("Age", "Age")} {n.age}:</span> {p.lang === "en" ? n.en : n.pcm}</li>)}</ul>
    </Card>
  );
}
