"use client";

import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import {
  ALL_TRIBES, HOUSE_KINDS, INVESTMENTS, JOBS, LUXURIES, OFFICES, RELIGIONS, STATES, STATE_BY_ID, TRAVEL_STATES, payMult,
  type JobDef,
} from "./data";
import {
  act, ageUp, ackKidnap, applyBlock, buildCost, choose, describePending, expandCost, kidnapAction, migrate, newGame, startHeir, startNewFamily,
  type Action, type NewLifeOptions, worth,
} from "./engine";
import { eduAtLeast, eligibleJobs, jobDef } from "./helpers";
import { Avatar } from "./Avatar";
import { AdmissionCard, CampusCard, DegreeCard } from "./Campus";
import { KidnapModal } from "./KidnapModal";
import { BEARDS, GLASSES, HAIRS, HAIR_COLORS, OUTFITS, OUTFIT_COLORS, SKINS, WEARS, randomLook, strToLook, type Look } from "./look";
import { luxuryBlock, luxuryCost } from "./lifestyle";
import { GOV_ACTIONS, POWER_MOVES, canContest, canJoinPolitics, canPlotCoup, currentZone, officeTitle, playerZone, powerMoveBlock, powerMoveCost } from "./politics";
import { PortfolioCard, TravelSheet, RelationshipsCard, HeadlinesCard, PostgradCard, PropertyMarketCard, PrisonCard, MortgageCard, TradeCard, MarketNewsCard, BusinessCard, GarageCard, HealthTab, HousingCard, LawTab, LedgerCard, NetWorthCard, PeopleCard, PhoneTab, SkillsCard, SubsCard, WillCard } from "./Panels";
import { meritOf } from "./military";
import { Tutorial, hasSeenTutorial } from "./Tutorial";
import { BottomBar, ExploreChips, ExploreHub, GameHeader, LifeFeed, StatsCard, EXPLORE_TABS, type Tab } from "./Shell";
import { shareCard } from "./share";
import type { Game, Gender, LineageEntry, Player } from "./types";
import { Badge, Bar, Btn, Card, H, Meter, Sheet, cx } from "./ui";
import { FAMILY_PRESETS } from "./family";
import { notificationsFor } from "./notices";
import { T, chance, naira, setDeflator, setLang } from "./util";
import type { Lang } from "./util";

const SAVE_KEY = "naija-life-save-v1";
const SLOTS_KEY = "naija-life-slots-v1";
const LANG_KEY = "naija-life-lang";
const SLOT_COUNT = 3;
function parseGame(raw: unknown): Game | null {
  try {
    const g = raw as Game;
    return g && g.p && g.dynasty ? migrate(g) : null;
  } catch {
    return null;
  }
}
/** Three save slots. An older single save becomes slot 1. */
function loadSlots(): (Game | null)[] {
  const slots: (Game | null)[] = Array.from({ length: SLOT_COUNT }, () => null);
  try {
    const raw = localStorage.getItem(SLOTS_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as unknown[];
      arr.slice(0, SLOT_COUNT).forEach((x, i) => { slots[i] = x ? parseGame(x) : null; });
    } else {
      const old = localStorage.getItem(SAVE_KEY);
      if (old) slots[0] = parseGame(JSON.parse(old));
    }
  } catch {
    /* unreadable save: start fresh */
  }
  return slots;
}
function writeSlots(slots: (Game | null)[]) {
  try {
    localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
  } catch {
    /* storage unavailable: play without saving */
  }
}
function loadLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === "en" ? "en" : "pcm";
  } catch {
    return "pcm";
  }
}
function hashSeed(s: string): number {
  const t = s.trim();
  if (/^\d+$/.test(t)) return Number(t) >>> 0;
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export default function NaijaLife() {
  const [game, setGame] = useState<Game | null>(null);
  const [slots, setSlots] = useState<(Game | null)[]>(() => Array.from({ length: SLOT_COUNT }, () => null));
  const [slot, setSlot] = useState(0);
  const [lang, setLangState] = useState<Lang>("pcm");
  const [bell, setBell] = useState(false);
  const [tour, setTour] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("life");
  const [result, setResult] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(false);
  const [cardImg, setCardImg] = useState<{ url: string; text: string } | null>(null);

  useEffect(() => {
    // The whole game is a little more compact than the browser default.
    const root = document.documentElement;
    const before = root.style.fontSize;
    root.style.fontSize = "15px";
    return () => { root.style.fontSize = before; };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlots(loadSlots());
    setLangState(loadLang());
    setReady(true);
  }, []);

  useEffect(() => {
    const onImg = (e: Event) => setCardImg((e as CustomEvent<{ url: string; text: string }>).detail);
    window.addEventListener("naija-share-image", onImg);
    return () => window.removeEventListener("naija-share-image", onImg);
  }, []);

  useEffect(() => {
    if (!ready || !game) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlots((s) => {
      const next = [...s];
      next[slot] = game;
      writeSlots(next);
      return next;
    });
  }, [game, ready, slot]);
  const chooseLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
    setGame((g) => (g ? { ...g, p: { ...g.p, lang: l } } : g));
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const run = (a: Action) => {
    if (!game) return;
    const r = act(game, a);
    setGame(r.g);
    if (r.msg) setToast(r.msg);
  };

  if (!ready) return <div className="min-h-screen bg-[#f3f8ff]" />;

  if (!game) {
    setLang(lang);
    return (
      <Shell>
        <StartScreen
          slots={slots}
          lang={lang}
          onLang={chooseLang}
          onContinue={(i) => { setSlot(i); setLangState(slots[i]?.p.lang ?? lang); setGame(slots[i]); setTab("life"); }}
          onDelete={(i) => setSlots((s) => { const next = [...s]; next[i] = null; writeSlots(next); return next; })}
          onStart={(o, i) => {
            setSlot(i);
            setGame(newGame(o));
            setTab("life");
            if (!hasSeenTutorial()) setTour(true);
          }}
        />
      </Shell>
    );
  }

  const p = game.p;
  setDeflator(p.index);
  setLang(p.lang);
  const view = result === null ? describePending(game) : null;
  const evHead = game.queue[0];
  const evLook = evHead && evHead.kind === "event" && typeof evHead.data.look === "string" ? strToLook(evHead.data.look) : null;
  const kidnap = result === null && game.queue[0]?.kind === "kidnap" ? game.queue[0] : null;
  const busy = game.queue.length > 0 || result !== null;

  return (
    <Shell>
      <GameHeader p={p} onMenu={() => setMenu(true)} onWallet={() => setTab("money")} alerts={notificationsFor(p).filter((n) => n.level !== "green").length} />
      <StatsCard p={p} />
      <main className="flex-1 space-y-3 px-4 pb-64 pt-3">
        {EXPLORE_TABS.includes(tab) && <ExploreChips tab={tab} setTab={setTab} />}
        {tab === "explore" && <ExploreHub setTab={setTab} />}
        {p.prison > 0 && (tab === "phone" || tab === "map" || tab === "power") && <PrisonCard p={p} run={run} full />}
        {tab === "life" && <><PrisonCard p={p} run={run} /><AdmissionCard p={p} run={run} /><CampusCard p={p} run={run} /><HeadlinesCard p={p} /><LifeFeed g={game} run={run} /></>}
        {tab === "phone" && p.prison <= 0 && <PhoneTab p={p} run={run} />}
        {tab === "health" && <HealthTab p={p} run={run} />}
        {tab === "law" && <LawTab p={p} run={run} />}
        {tab === "work" && p.prison > 0 && <PrisonCard p={p} run={run} full />}
        {tab === "work" && p.prison <= 0 && <WorkTab p={p} run={run} />}
        {tab === "money" && <MoneyTab p={p} run={run} />}
        {tab === "family" && <FamilyTab p={p} run={run} />}
        {tab === "map" && p.prison <= 0 && <MapTab p={p} run={run} />}
        {tab === "power" && p.prison <= 0 && <PowerTab p={p} run={run} />}
        {tab === "legacy" && <LegacyTab g={game} />}
      </main>

      {toast && (
        <div className="fixed inset-x-0 bottom-44 z-40 mx-auto w-[92%] max-w-md rounded-2xl bg-slate-800 px-4 py-2.5 text-center text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}

      <BottomBar tab={tab} setTab={setTab} p={p} busy={busy} onGrow={() => { setGame(ageUp(game)); setTab("life"); }} />

      {result !== null && (
        <Sheet>
          <p className="text-base leading-relaxed text-slate-900">{result}</p>
          <Btn className="mt-4 w-full" onClick={() => setResult(null)}>{T("Continue", "Continue")}</Btn>
        </Sheet>
      )}

      {view && p.alive && (
        <Sheet title={view.title}>
          {evLook && (
            <div className="mb-3 flex justify-center">
              <Avatar look={evLook} gender={p.gender === "male" ? "female" : "male"} age={26} mood={75} size={110} />
            </div>
          )}
          <p className="text-[15px] leading-relaxed text-slate-800">{view.text}</p>
          <div className="mt-4 space-y-2">
            {view.choices.map((c, i) => (
              <button
                key={i}
                type="button"
                disabled={Boolean(c.disabled)}
                onClick={() => {
                  const r = choose(game, i);
                  setGame(r.g);
                  setResult(r.text);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="block text-sm font-semibold text-slate-900">{c.label}</span>
                {(c.sub || c.disabled) && <span className={cx("block text-xs", c.disabled ? "text-red-600" : "text-blue-600")}>{c.disabled || c.sub}</span>}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {kidnap && kidnap.kind === "kidnap" && p.alive && (
        <KidnapModal
          p={p}
          k={kidnap.k}
          onAction={(a) => setGame(kidnapAction(game, a))}
          onDone={() => setGame(ackKidnap(game))}
        />
      )}
      {kidnap && kidnap.kind === "kidnap" && !p.alive && kidnap.k.stage === "over" && (
        <KidnapModal p={p} k={kidnap.k} onAction={() => {}} onDone={() => setGame(ackKidnap(game))} />
      )}

      {!p.alive && !busy && (
        <DeathScreen
          g={game}
          onHeir={(i) => { setGame(startHeir(game, i)); setTab("life"); }}
          onNew={(o) => { setGame(startNewFamily(game, { ...o, lang: game.p.lang })); setTab("life"); }}
        />
      )}

      {cardImg && (
        <Sheet title={T("Your card", "Your card")} onClose={() => setCardImg(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardImg.url} alt={T("Share card", "Share card")} className="w-full rounded-xl" />
          <p className="mt-3 text-xs text-slate-500">{T("Press and hold the image to save it, or take a screenshot, then post it.", "Press and hold the image to save am, or take screenshot, then post am.")}</p>
          <Btn tone="ghost" className="mt-3 w-full" onClick={() => { try { void navigator.clipboard.writeText(cardImg.text); } catch { /* clipboard blocked */ } }}>{T("Copy caption", "Copy caption")}</Btn>
        </Sheet>
      )}

      {confirmEnd && (
        <Sheet title={T("Surrender to life?", "Surrender for life?")} onClose={() => setConfirmEnd(false)}>
          <p className="text-[13px] leading-relaxed text-slate-600">{T("This ends this character's life in the game, and you carry on as your child or start a new family. It cannot be undone.", "This go end this character life for the game, and you go continue as your pikin or start new family. You no fit undo am.")}</p>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-500">{T("If you are ever struggling in real life, please talk to someone you trust.", "If real life ever dey hard for you, abeg talk to person wey you trust.")}</p>
          <div className="mt-4 space-y-2">
            <Btn tone="ghost" className="w-full" onClick={() => setConfirmEnd(false)}>{T("No, keep playing", "No, make I continue")}</Btn>
            <Btn tone="red" className="w-full" onClick={() => { setConfirmEnd(false); run({ t: "surrender" }); }}>{T("Yes, surrender to life", "Yes, surrender")}</Btn>
          </div>
        </Sheet>
      )}

      {tour && <Tutorial setTab={setTab} onClose={() => setTour(false)} />}

      {bell && (
        <Sheet title={T("Alerts and history", "Alerts and history")} onClose={() => setBell(false)}>
          <H>{T("Needs your attention", "Wetin need your attention")}</H>
          {notificationsFor(p).length === 0 && <p className="text-sm text-slate-500">{T("Nothing urgent.", "Nothing serious.")}</p>}
          <ul className="space-y-1.5">
            {notificationsFor(p).map((n, i) => <li key={i} className={cx("rounded-xl px-3 py-2 text-sm", n.level === "red" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-600")}>{n.text}</li>)}
          </ul>
          <H>{T("Recent years", "Wetin don happen")}</H>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {[...p.log].reverse().slice(0, 12).map((e, i) => (
              <div key={i} className="rounded-xl bg-slate-50 p-2.5">
                <div className="text-[11px] font-semibold text-blue-600">{T("Age", "Age")} {e.age}</div>
                {e.lines.slice(0, 4).map((l, j) => <p key={j} className="text-xs text-slate-700">{l}</p>)}
              </div>
            ))}
          </div>
        </Sheet>
      )}

      {menu && (
        <Sheet title={T("Menu", "Menu")} onClose={() => setMenu(false)}>
          <p className="text-sm text-slate-600">{T(`Saved automatically in slot ${slot + 1} on this device.`, `Game dey save by itself for slot ${slot + 1} for this device.`)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["en", "pcm"] as Lang[]).map((l) => <Btn key={l} tone={p.lang === l ? "gold" : "ghost"} onClick={() => chooseLang(l)}>{l === "en" ? "English" : "Pidgin"}</Btn>)}
          </div>
          <div className="mt-4 space-y-2">
            <Btn tone="ghost" className="w-full" onClick={() => { setMenu(false); setTour(true); }}>{T("How to play (tutorial)", "How to play (tutorial)")}</Btn>
            <Btn tone="ghost" className="w-full" onClick={() => { setMenu(false); setBell(true); }}>{T("Alerts and history", "Alerts and history")}</Btn>
            <Btn tone="ghost" className="w-full" onClick={() => setMenu(false)}>{T("Back to the game", "Go back to game")}</Btn>
            <Btn tone="ghost" className="w-full" onClick={() => { setGame(null); setMenu(false); }}>{T("Switch life (save slots)", "Change life (save slots)")}</Btn>
            <Btn tone="ghost" className="w-full" onClick={() => { setMenu(false); setConfirmEnd(true); }}>{T("Surrender to life", "Surrender for life")}</Btn>
            <Btn tone="red" className="w-full" onClick={() => { setSlots((s) => { const next = [...s]; next[slot] = null; writeSlots(next); return next; }); setGame(null); setMenu(false); }}>{T("Abandon this life and start over", "Abandon this life make we start again")}</Btn>
          </div>
        </Sheet>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#e9f0fb] text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', 'Nunito', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col bg-gradient-to-b from-[#f3f8ff] via-white to-[#f7faff] shadow-2xl shadow-blue-900/10">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Start screen
// ---------------------------------------------------------------------------
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cx("rounded-full border px-3 py-1.5 text-xs font-semibold transition", active ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100")}>
      {children}
    </button>
  );
}

function Swatch({ color, active, onClick, label }: { color: string; active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={cx("h-8 w-8 rounded-full border-2 transition", active ? "border-blue-500 scale-110" : "border-slate-200")} style={{ background: color }} />
  );
}

type NewOpts = { name: string; gender: Gender; stateId: string | null; tribe: string | null; religion: string | null; look: Look; lang: Lang; seed?: number | null; familyConfig?: NewLifeOptions["familyConfig"]; forceArchetype?: NewLifeOptions["forceArchetype"] };

function StartScreen({ onStart, slots, onContinue, onDelete, lang, onLang }: { onStart: (o: NewOpts, slot: number) => void; slots: (Game | null)[]; onContinue: (i: number) => void; onDelete: (i: number) => void; lang: Lang; onLang: (l: Lang) => void }) {
  const [seedText, setSeedText] = useState("");
  const [preset, setPreset] = useState("real");
  const [target, setTarget] = useState(() => { const e = slots.findIndex((s) => !s); return e >= 0 ? e : 0; });
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [stateId, setStateId] = useState("");
  const [tribe, setTribe] = useState("");
  const [religion, setReligion] = useState("");
  const [look, setLook] = useState<Look>(() => randomLook("male", { region: "South West" }));
  const field = "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500";
  const set = (patch: Partial<Look>) => setLook((l) => ({ ...l, ...patch }));
  const regionNow = () => (stateId ? STATE_BY_ID[stateId]?.region : undefined);
  const reroll = (g: Gender = gender) => setLook(randomLook(g, { region: regionNow(), religion: religion || undefined }));
  return (
    <div className="flex-1 px-5 pb-10 pt-10">
      <div className="h-1.5 w-full overflow-hidden rounded-full">
        <div className="flex h-full"><div className="flex-1 bg-[#1f9d55]" /><div className="flex-1 bg-white" /><div className="flex-1 bg-[#1f9d55]" /></div>
      </div>
      <h1 className="mt-5 font-serif text-4xl font-black leading-[1.05] text-slate-900">Naija<br /><span className="text-blue-600">Life</span></h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{T("Live a whole Nigerian life: from akara by the roadside to Aso Rock. Hustle, travel between states, build houses, survive NEPA, dodge kidnappers, and leave a legacy your children inherit.", "Live full Naija life: from akara for roadside reach Aso Rock. Hustle, travel between states, build house, survive NEPA, run from kidnappers, and leave legacy wey your pikin go inherit.")}</p>

      <div className="mt-5 grid grid-cols-2 gap-2" role="group" aria-label={T("Language", "Language")}>
        {(["en", "pcm"] as Lang[]).map((l) => (
          <button key={l} type="button" onClick={() => onLang(l)} className={cx("rounded-xl border px-3 py-2.5 text-sm font-semibold", lang === l ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 bg-slate-50 text-slate-600")}>{l === "en" ? "English" : "Pidgin"}</button>
        ))}
      </div>

      {slots.some(Boolean) && (
        <Card className="mt-6 space-y-2">
          <H>{T("Your lives", "Your lives")}</H>
          {slots.map((s, i) => s && (
            <div key={i} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3">
              <div className="min-w-0 text-sm"><div className="truncate font-semibold">{s.p.name} {s.p.surname}</div><div className="text-[11px] text-slate-500">{T("Slot", "Slot")} {i + 1} · {T("Age", "Age")} {s.p.age} · {s.p.alive ? naira(worth(s.p)) : T("Died", "Don die")}</div></div>
              <div className="flex shrink-0 gap-1.5"><Btn small tone="gold" onClick={() => onContinue(i)}>{T("Continue", "Continue")}</Btn><Btn small tone="ghost" onClick={() => onDelete(i)}>✕</Btn></div>
            </div>
          ))}
        </Card>
      )}

      <Card className="mt-6 space-y-4">
        <H>{T("Your look", "Your look")}</H>
        <div className="sticky top-0 z-10 -mx-4 flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-3">
          <Avatar look={look} gender={gender} age={22} mood={72} size={112} />
          <div className="space-y-2">
            <p className="text-xs text-slate-500">{T("Your parents, partner and children will look like family.", "Your parents, partner and pikin go resemble you.")}</p>
            <Btn small tone="ghost" onClick={() => reroll()}>{T("Randomise look", "Random look")}</Btn>
          </div>
        </div>
        <div>
          <span className="text-xs text-slate-600">{T("Skin tone", "Skin colour")}</span>
          <div className="mt-1.5 flex flex-wrap gap-2">{SKINS.map((c, i) => <Swatch key={c} color={c} label={T(`Skin tone ${i + 1}`, `Skin colour ${i + 1}`)} active={look.skin === i} onClick={() => set({ skin: i })} />)}</div>
        </div>
        <div>
          <span className="text-xs text-slate-600">{T("Hairstyle", "Hairstyle")}</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{HAIRS.map((h) => <Chip key={h.id} active={look.hair === h.id} onClick={() => set({ hair: h.id })}>{h.label}</Chip>)}</div>
        </div>
        <div>
          <span className="text-xs text-slate-600">{T("Hair colour", "Hair colour")}</span>
          <div className="mt-1.5 flex flex-wrap gap-2">{HAIR_COLORS.map((c, i) => <Swatch key={c} color={c} label={T(`Hair colour ${i + 1}`, `Hair colour ${i + 1}`)} active={look.hairColor === i} onClick={() => set({ hairColor: i })} />)}</div>
        </div>
        {gender === "male" && (
          <div>
            <span className="text-xs text-slate-600">{T("Beard", "Beard")}</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">{BEARDS.map((b) => <Chip key={b.id} active={look.beard === b.id} onClick={() => set({ beard: b.id })}>{b.label}</Chip>)}</div>
          </div>
        )}
        <div>
          <span className="text-xs text-slate-600">{T("Cap or headwear", "Cap or head wear")}</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{WEARS.map((w) => <Chip key={w.id} active={look.wear === w.id} onClick={() => set({ wear: w.id })}>{w.label}</Chip>)}</div>
        </div>
        <div>
          <span className="text-xs text-slate-600">{T("Glasses and earrings", "Glasses and earrings")}</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {GLASSES.map((x) => <Chip key={x.id} active={(look.glasses ?? "none") === x.id} onClick={() => set({ glasses: x.id })}>{x.label}</Chip>)}
            <Chip active={Boolean(look.hoops)} onClick={() => set({ hoops: !look.hoops })}>{T("Gold hoops", "Gold hoops")}</Chip>
          </div>
        </div>
        <div>
          <span className="text-xs text-slate-600">{T("Outfit", "Outfit")}</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{OUTFITS.map((o) => <Chip key={o.id} active={look.outfit === o.id} onClick={() => set({ outfit: o.id })}>{o.label}</Chip>)}</div>
          <div className="mt-2 flex flex-wrap gap-2">{OUTFIT_COLORS.map((c, i) => <Swatch key={c} color={c} label={T(`Outfit colour ${i + 1}`, `Outfit colour ${i + 1}`)} active={look.outfitColor === i} onClick={() => set({ outfitColor: i })} />)}</div>
        </div>
      </Card>

      <Card className="mt-4 space-y-4">
        <H>{T("New life", "New life")}</H>
        <label className="block text-xs text-slate-600">{T("Name (optional)", "Name (optional)")}
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={T("e.g. Amina Bello", "e.g. Amina Bello")} className={field} maxLength={32} />
        </label>
        <div>
          <span className="text-xs text-slate-600">{T("Gender", "Gender")}</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(["male", "female"] as Gender[]).map((g) => (
              <button key={g} type="button" onClick={() => { setGender(g); reroll(g); }} className={cx("rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize", gender === g ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 bg-slate-50 text-slate-600")}>{g === "male" ? T("male", "male") : T("female", "female")}</button>
            ))}
          </div>
        </div>
        <label className="block text-xs text-slate-600">{T("Born in", "Where you born")}
          <select value={stateId} onChange={(e) => setStateId(e.target.value)} className={field}>
            <option value="">{T("Random (like real life)", "Random (as e be for real life)")}</option>
            {TRAVEL_STATES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="block text-xs text-slate-600">{T("Tribe", "Tribe")}
          <select value={tribe} onChange={(e) => setTribe(e.target.value)} className={field}>
            <option value="">{T("Based on state", "Based on state")}</option>
            {ALL_TRIBES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="block text-xs text-slate-600">{T("Religion", "Religion")}
          <select value={religion} onChange={(e) => setReligion(e.target.value)} className={field}>
            <option value="">{T("Random", "Random")}</option>
            {RELIGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-600">{T("Advanced: family background and seed", "Advanced: family background and seed")}</summary>
          <label className="mt-3 block text-xs text-slate-600">{T("Family background", "Family background")}
            <select value={preset} onChange={(e) => setPreset(e.target.value)} className={field}>
              {FAMILY_PRESETS.map((x) => <option key={x.id} value={x.id}>{T(x.en, x.pcm)}</option>)}
            </select>
          </label>
          <label className="mt-3 block text-xs text-slate-600">{T("Seed (same seed, same life, as long as you make the same choices)", "Seed (same seed go give you same life if you do same choices)")}
            <input value={seedText} onChange={(e) => setSeedText(e.target.value)} placeholder={T("optional", "optional")} className={field} maxLength={24} />
          </label>
        </details>
        <label className="block text-xs text-slate-600">{T("Save in", "Save for")}
          <select value={target} onChange={(e) => setTarget(Number(e.target.value))} className={field}>
            {slots.map((s, i) => <option key={i} value={i}>{T("Slot", "Slot")} {i + 1}{s ? ` · ${s.p.name} (${T("will be replaced", "go replace am")})` : ` · ${T("empty", "empty")}`}</option>)}
          </select>
        </label>
        <Btn className="w-full py-3 text-base" onClick={() => {
          const pr = FAMILY_PRESETS.find((x) => x.id === preset);
          onStart({ name, gender, stateId: stateId || null, tribe: tribe || null, religion: religion || null, look, lang, seed: seedText.trim() ? hashSeed(seedText) : null, familyConfig: pr?.cfg, forceArchetype: pr?.force }, target);
        }}>{T("Be born", "Born me")} 🇳🇬</Btn>
      </Card>
      <p className="mt-6 text-center text-[11px] text-slate-400">{T("A fictional game. All people, events and results are made up for fun.", "Na story game. All the people, events and results na just for fun.")}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Work tab
// ---------------------------------------------------------------------------
function lockReason(p: Player, j: JobDef): string | null {
  if (p.age < j.minAge) return T(`Age ${j.minAge}+`, `Age ${j.minAge}+`);
  if (!eduAtLeast(p, j.edu)) return j.edu === "tertiary" ? T("Needs a degree", "You need degree") : T(`Needs ${j.edu} school`, `You need ${j.edu} school`);
  if (j.courses && (!p.course || !j.courses.includes(p.course))) return T(`Needs ${j.courses.slice(0, 2).join(" / ")} degree`, `You need ${j.courses.slice(0, 2).join(" / ")} degree`);
  const st = STATE_BY_ID[p.state];
  if (st.opp < j.minOpp) return T(`Needs a bigger market (opportunity ${j.minOpp}+)`, `E need bigger market (opportunity ${j.minOpp}+)`);
  return null;
}

function WorkTab({ p, run }: { p: Player; run: (a: Action) => void }) {
  const st = STATE_BY_ID[p.state];
  const cur = jobDef(p);
  const eligible = eligibleJobs(p);
  const estPay = (j: JobDef) => naira(j.ladder[0].pay * payMult(j, st) * Math.pow(p.index, 0.92));
  const group = (title: string, jobs: JobDef[], sub?: string) =>
    jobs.length > 0 && (
      <Card>
        <H sub={sub}>{title}</H>
        <div className="space-y-2">
          {jobs.map((j) => {
            const block = applyBlock(p, j.id);
            return (
              <div key={j.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{j.title}</div>
                    <div className="text-[11px] text-slate-500">{j.blurb}</div>
                  </div>
                  <Badge tone={j.group === "crime" ? "red" : "green"}>~{estPay(j)}{T("/yr", "/yr")}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Btn small disabled={Boolean(block)} onClick={() => run({ t: "apply", job: j.id })}>
                    {j.selfEmployed ? T(`Start (${naira(j.startCost * Math.pow(p.index, 0.9))})`, `Start (${naira(j.startCost * Math.pow(p.index, 0.9))})`) : T("Apply", "Apply")}
                  </Btn>
                  {!j.selfEmployed && j.group === "formal" && (
                    <Btn small tone="ghost" disabled={Boolean(block) || p.money < 300_000 * p.index} onClick={() => run({ t: "apply", job: j.id, bribe: true })}>
                      {T(`Apply + 'settle' (${naira(300_000 * p.index)})`, `Apply + 'settle' (${naira(300_000 * p.index)})`)}
                    </Btn>
                  )}
                  {block && <span className="text-[11px] text-red-600">{block}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  const locked = JOBS.filter((j) => j.id !== "kidnapper" && !eligible.includes(j));
  const cost = expandCost(p);
  return (
    <>
      <Card>
        <H>{T("Education", "Education")}</H>
        <p className="text-sm text-slate-800">
          {p.school
            ? T(`Currently in ${p.school.stage === "tertiary" ? "tertiary school" : `${p.school.stage} school`} (${p.school.yearsLeft} year${p.school.yearsLeft === 1 ? "" : "s"} left).`, `You dey ${p.school.stage === "tertiary" ? "tertiary school" : `${p.school.stage} school` } now (${p.school.yearsLeft} year${p.school.yearsLeft === 1 ? "" : "s"} remain).`)
            : p.edu === "none" ? T("No schooling yet.", "You never go school yet.") : T(`Highest level: ${p.edu}${p.course ? ` (${p.course})` : ""}.`, `Highest level: ${p.edu}${p.course ? ` (${p.course})` : ""}.`)}
        </p>
        <DegreeCard p={p} run={run} />
      </Card>

      <Card>
        <H>{T("Your work", "Your work")}</H>
        {p.job && cur ? (
          <div>
            <div className="text-lg font-bold">{cur.ladder[Math.min(p.job.rank, cur.ladder.length - 1)].title}</div>
            <div className="text-xs text-slate-500">{["soldier", "navy", "airforce", "police"].includes(cur.id) ? T(`Service record ${meritOf(p)}/100 · the promotion board decides your next rank. `, `Service record ${meritOf(p)}/100 · promotion board go decide your next rank. `) : ""}{cur.title} · {T(`${p.job.years} yr in this role · Rank ${p.job.rank + 1}/${cur.ladder.length}`, `${p.job.years} yr for this role · Rank ${p.job.rank + 1}/${cur.ladder.length}`)}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {cost !== null && (
                <Btn small tone="gold" disabled={p.money < cost} onClick={() => run({ t: "expand" })}>
                  {T(`Expand business (${naira(cost)})`, `Expand business (${naira(cost)})`)}
                </Btn>
              )}
              <Btn small tone="ghost" onClick={() => run({ t: "quit" })}>{T("Quit", "Quit")}</Btn>
            </div>
            {cur.selfEmployed && cost !== null && <p className="mt-2 text-[11px] text-slate-500">{T(`Next: ${cur.ladder[p.job.rank + 1].title}. Invest in your business to grow it. Moving to another state leaves it behind.`, `Next: ${cur.ladder[p.job.rank + 1].title}. Put money inside your business make am grow. If you move go another state, you go leave am.`)}</p>}
          </div>
        ) : (
          <p className="text-sm text-slate-600">{p.politics && p.politics.office >= 0 ? T(`You hold office as ${officeTitle(p)}.`, `You dey hold office as ${officeTitle(p)}.`) : T("You are not working. Pick something below or hustle.", "You no dey work. Pick one thing below or go hustle.")}</p>
        )}
      </Card>

      {p.age >= 14 && (
        <>
          {group(T("Start a hustle", "Start hustle"), eligible.filter((j) => j.selfEmployed), T("Self-employed. You can grow these into empires.", "Work for yourself. You fit grow am reach empire."))}
          {group(T("Jobs", "Jobs"), eligible.filter((j) => !j.selfEmployed && (j.group === "petty" || j.group === "formal")), T("Salaried work. Promotions come with time and connections.", "Salary work. Promotion dey come with time and connections."))}
          {group(T("Creative careers", "Creative work"), eligible.filter((j) => j.group === "creative"), T("Slow start, huge upside.", "Start slow, but the gain big."))}
          {group(T("Risky paths", "Risky road"), eligible.filter((j) => j.group === "crime"), T("Fast money. Heavy consequences.", "Fast money. Heavy wahala."))}
          <TradeCard p={p} run={run} />
          <PostgradCard p={p} run={run} />
          <BusinessCard p={p} run={run} />
          <SkillsCard p={p} run={run} />
          {locked.length > 0 && (
            <details className="rounded-2xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-600">{T(`Locked careers (${locked.length})`, `Locked work (${locked.length})`)}</summary>
              <ul className="mt-2 space-y-1 text-xs text-slate-500">
                {locked.map((j) => <li key={j.id}>{j.title}: {lockReason(p, j)}</li>)}
              </ul>
            </details>
          )}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Money tab
// ---------------------------------------------------------------------------
function MoneyTab({ p, run }: { p: Player; run: (a: Action) => void }) {
  const st = STATE_BY_ID[p.state];
  const net = worth(p);
  return (
    <>
      <Card>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><div className="text-[11px] text-slate-500">{T("Cash", "Cash")}</div><div className="text-base font-bold text-blue-600">{naira(p.money)}</div></div>
          <div><div className="text-[11px] text-slate-500">{T("Net worth", "Net worth")}</div><div className="text-base font-bold">{naira(net)}</div></div>
          <div><div className="text-[11px] text-slate-500">{T("Debt", "Debt")}</div><div className={cx("text-base font-bold", p.debt > 0 && "text-red-600")}>{naira(p.debt)}</div></div>
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-400">{T("Prices rise every year. Cash loses value. Houses and dollars hold up better.", "Prices dey rise every year. Cash dey lose value. House and dollar dey hold better.")}</p>
      </Card>

      <NetWorthCard p={p} />
      <HousingCard p={p} run={run} />
      <GarageCard p={p} run={run} />
      <SubsCard p={p} />
      <LedgerCard p={p} />

      <Card>
        <H sub={T(`Build in ${st.name}. Land is ${st.cost >= 1.4 ? "very expensive" : st.cost >= 0.9 ? "pricey" : "cheap"} here. Travel to build elsewhere.`, `Build for ${st.name}. Land ${st.cost >= 1.4 ? "cost too much" : st.cost >= 0.9 ? "cost small" : "cheap"} here. Travel go build for another place.`)}>{T("Build a house", "Build house")}</H>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(HOUSE_KINDS) as (keyof typeof HOUSE_KINDS)[]).map((k) => {
            const c = buildCost(p, k);
            return (
              <button key={k} type="button" disabled={p.money < c || st.abroad} onClick={() => run({ t: "build", kind: k })} className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-center text-xs disabled:opacity-40">
                <span className="block font-semibold">{HOUSE_KINDS[k].label}</span>
                <span className="block text-blue-600">{naira(c)}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <MortgageCard p={p} run={run} />
      <PropertyMarketCard p={p} run={run} />

      <PortfolioCard p={p} run={run} />

      <MarketNewsCard p={p} run={run} />

      <Card>
        <H sub={T("Returns are not guaranteed.", "Profit no certain.")}>{T("Invest", "Invest")}</H>
        <div className="space-y-2">
          {INVESTMENTS.map((o) => {
            const min = o.min * p.index;
            const amt = (frac: number) => Math.max(Math.round(p.money * frac), 0);
            return (
              <div key={o.kind} className="rounded-xl bg-slate-50 p-3">
                <div className="flex justify-between text-sm"><span className="font-semibold">{o.label}</span><span className="text-[11px] text-slate-500">{T("min", "min")} {naira(min)}</span></div>
                <p className="text-[11px] text-slate-500">{o.desc}</p>
                <div className="mt-2 flex gap-1.5">
                  {[0.1, 0.5, 1].map((f) => (
                    <Btn key={f} small tone="ghost" disabled={amt(f) < min} onClick={() => run({ t: "invest", kind: o.kind, amount: amt(f) })}>
                      {f === 1 ? T("All cash", "All cash") : `${f * 100}% (${naira(amt(f))})`}
                    </Btn>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {p.holdings.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <H>{T("Your portfolio", "Your investments")}</H>
            {p.holdings.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <div><div className="font-semibold">{h.label}</div><div className="text-[11px] text-slate-500">{T("Put in", "Wetin you put")} {naira(h.invested)}</div></div>
                <div className="text-right"><div className={h.value >= h.invested ? "text-emerald-600" : "text-red-600"}>{naira(h.value)}</div><button type="button" className="text-[11px] underline text-slate-500" onClick={() => run({ t: "divest", id: h.id })}>{T("Cash out", "Cash out")}</button></div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <H sub={T("What big people spend on. Prestige counts toward your legacy.", "Wetin big people dey spend money on. Prestige dey add to your legacy.")}>{T("Spend your money", "Spend your money")}</H>
        <div className="space-y-2">
          {LUXURIES.map((l) => {
            const block = luxuryBlock(p, l.id);
            const owned = l.once && p.flags[`own_${l.id}`];
            return (
              <div key={l.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{l.label} {l.good && <Badge tone="green">{T("good deed", "good deed")}</Badge>}</div>
                    <div className="text-[11px] text-slate-500">{l.desc}</div>
                  </div>
                  <Badge tone="gold">+{l.prestige} {T("prestige", "prestige")}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Btn small tone={owned ? "ghost" : "gold"} disabled={Boolean(block)} onClick={() => run({ t: "luxury", id: l.id })}>
                    {owned ? T("Owned", "You get am") : T(`Buy (${naira(luxuryCost(p, l.cost))})`, `Buy (${naira(luxuryCost(p, l.cost))})`)}
                  </Btn>
                  {block && !owned && <span className="text-[11px] text-red-600">{block}</span>}
                  {l.upkeep && <span className="text-[11px] text-slate-400">{T("upkeep", "upkeep")} {naira(luxuryCost(p, l.upkeep))}{T("/yr", "/yr")}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Family tab
// ---------------------------------------------------------------------------
function Person({ look, gender, age, label, sub, dim }: { look: Look; gender: Gender; age: number; label: string; sub?: string; dim?: boolean }) {
  return (
    <div className="flex w-[84px] flex-col items-center text-center">
      <Avatar look={look} gender={gender} age={age} size={72} dim={dim} />
      <div className="mt-1 w-full truncate text-xs font-semibold">{label}</div>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </div>
  );
}

function FamilyTab({ p, run }: { p: Player; run: (a: Action) => void }) {
  const fam = STATE_BY_ID[p.family.state];
  const gifts = [100_000, 500_000, 2_000_000, 10_000_000];
  const luckWord = p.luck >= 65 ? T("Born under a lucky star", "Luck dey your side") : p.luck <= 35 ? T("Life no easy for you", "Life no easy for you") : T("Fortune is neutral", "Luck dey middle");
  return (
    <>
      <Card>
        <H>{T("Your people", "Your people")}</H>
        <div className="flex flex-wrap gap-3">
          {p.family.dad && <Person look={p.family.dad} gender="male" age={p.age + 29} label={T("Papa", "Papa")} sub={p.family.parentsAlive ? T("alive", "dey alive") : T("late", "late")} dim={!p.family.parentsAlive} />}
          {p.family.mom && <Person look={p.family.mom} gender="female" age={p.age + 26} label={T("Mama", "Mama")} sub={p.family.parentsAlive ? T("alive", "dey alive") : T("late", "late")} dim={!p.family.parentsAlive} />}
          {p.spouse?.look && <Person look={p.spouse.look} gender={p.gender === "male" ? "female" : "male"} age={p.age} label={p.spouse.name} sub={T(`spouse · ${Math.round(p.spouse.happy)}% happy`, `spouse · ${Math.round(p.spouse.happy)}% happy`)} />}
          {p.kids.map((k, i) => k.look && <Person key={i} look={k.look} gender={k.gender} age={k.age} label={k.name} sub={T(`age ${k.age}`, `age ${k.age}`)} />)}
        </div>
        <p className="mt-3 text-sm text-slate-800">
          {T("Family lives in", "Your family dey live for")} <b>{fam.name}</b>. {fam.opp <= 3 ? T("Opportunities there are limited. They would love to move somewhere better.", "Opportunity there small. Dem go like move go better place.") : fam.opp >= 7 ? T("They are in a strong market.", "Dem dey strong market.") : T("Life there is steady.", "Life there dey okay.")}
        </p>
        <p className="mt-1 text-sm text-slate-600">{T("Family happiness", "Family happiness")} {Math.round(p.family.happy)}% · {luckWord}</p>
        {p.houses.length > 0 && <p className="mt-2 text-xs text-blue-600">{T("Tip: Use a house as \"Family\" in the Money tab to bring them to your state.", "Tip: Set one house as \"Family\" for Money tab to bring dem come your state.")}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {gifts.map((a) => (
            <Btn key={a} small tone="ghost" disabled={p.money < a * p.index} onClick={() => run({ t: "send", amount: a * p.index })}>
              {T("Send", "Send")} {naira(a * p.index)}
            </Btn>
          ))}
        </div>
      </Card>
      <RelationshipsCard p={p} run={run} />
      <PeopleCard p={p} run={run} />
      {p.age >= 18 && <WillCard p={p} run={run} />}
      {!p.spouse && p.flags.dating && <Card><H>{T("Dating", "Dating")}</H><p className="text-sm">{T(`Dating ${String(p.flags.dating)}. A proposal may be coming.`, `You dey date ${String(p.flags.dating)}. Proposal fit dey come.`)}</p></Card>}
      {!p.spouse && !p.flags.dating && <Card><H>{T("Spouse", "Spouse")}</H><p className="text-sm text-slate-500">{T("Single. Use \"Look for love\" in the Life tab.", "You single. Use \"Look for love\" for Life tab.")}</p></Card>}
      <Card>
        <H>{T("Achievements", "Achievements")}</H>
        {p.achievements.length === 0 ? <p className="text-sm text-slate-500">{T("None yet.", "Nothing yet.")}</p> : <div className="flex flex-wrap gap-1.5">{p.achievements.map((a) => <Badge key={a} tone="gold">🏆 {a}</Badge>)}</div>}
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Map tab
// ---------------------------------------------------------------------------
function MapTab({ p, run }: { p: Player; run: (a: Action) => void }) {
  const [dest, setDest] = useState<string | null>(null);
  const st = STATE_BY_ID[p.state];
  const regions = Array.from(new Set(TRAVEL_STATES.map((s) => s.region)));
  return (
    <>
      <Card>
        <H>{T("You are in", "Where you dey")}</H>
        <div className="text-lg font-bold">{st.name} <span className="text-sm font-normal text-slate-500">· {st.capital}</span></div>
        <div className="mt-2 space-y-1.5">
          <Meter label={T("Jobs", "Jobs")} value={st.opp} />
          <Meter label={T("Cost", "Cost")} value={st.cost * 5} max={10} invert />
          <Meter label={T("Insecurity", "Insecurity")} value={st.risk} invert />
        </div>
        <p className="mt-2 text-[11px] text-slate-500">{T("Opportunity affects pay and what jobs exist. Insecurity raises kidnap and robbery risk, especially when you travel.", "Opportunity dey affect pay and which jobs dey. Insecurity dey increase kidnap and robbery risk, especially when you dey travel.")}</p>
      </Card>

      <Card>
        <H sub={T("Flights, IELTS and visa fees add up, and visas can be refused. A degree improves your odds.", "Flight, IELTS and visa fees dey add up, and dem fit refuse visa. Degree dey help your chance.")}>Japa 🛫</H>
        <Btn tone="gold" disabled={p.age < 18 || p.money < 8_000_000 * p.index || Boolean(st.abroad) || p.prison > 0} onClick={() => run({ t: "japa" })}>
          {T(`Start Japa process (${naira(8_000_000 * p.index)})`, `Start Japa process (${naira(8_000_000 * p.index)})`)}
        </Btn>
      </Card>

      {regions.map((r) => (
        <Card key={r}>
          <H>{r}</H>
          <div className="space-y-2">
            {TRAVEL_STATES.filter((s) => s.region === r).map((s) => {
              const here = s.id === p.state;
              const mine = p.houses.some((h) => h.state === s.id);
              return (
                <div key={s.id} className={cx("rounded-xl p-3", here ? "bg-blue-50" : "bg-slate-50")}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">
                      {s.name} {s.id === p.family.state && <Badge>{T("family", "family")}</Badge>} {mine && <Badge tone="gold">{T("your house", "your house")}</Badge>} {s.id === p.birthState && <Badge tone="green">{T("home", "home")}</Badge>}
                    </div>
                    <Btn small tone={here ? "ghost" : "green"} disabled={here || p.age < 16 || p.prison > 0} onClick={() => setDest(s.id)}>
                      {here ? T("Here", "Here") : T("Go", "Go")}
                    </Btn>
                  </div>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    <Meter compact label={T("Jobs", "Jobs")} value={s.opp} />
                    <Meter compact label={T("Cost of living", "Cost of living")} value={s.cost * 5} max={10} invert />
                    <Meter compact label={T("Insecurity", "Insecurity")} value={s.risk} invert />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
      {dest && STATE_BY_ID[dest] && <TravelSheet p={p} to={STATE_BY_ID[dest]} run={run} onClose={() => setDest(null)} />}
      {STATES.find((s) => s.abroad) && p.state === "abroad" && <p className="text-center text-xs text-slate-500">{T("You are abroad. Travel back to any Nigerian state from the lists above.", "You dey abroad. You fit travel back go any Naija state from the lists above.")}</p>}
    </>
  );
}

// ---------------------------------------------------------------------------
// Power tab
// ---------------------------------------------------------------------------
function RoutesCard() {
  const routes: [string, string][] = [
    [T("The Ballot Box", "The Ballot Box"), T("Councillor, LG chairman, Rep, Senator, Governor, then President. Slow, expensive and the most common road.", "Councillor, LG chairman, Rep, Senator, Governor, then President. Slow, e cost well and na the most common road.")],
    [T("The Kingmaker", "The Kingmaker"), T("As a governor or big financier, build the party machine, bankroll loyalists in other states, capture the electoral umpire and the courts, win the party ticket, then run.", "As governor or big financier, build the party machine, fund your loyalists for other states, control the electoral umpire and the courts, win the party ticket, then contest.")],
    [T("The General", "The General"), T("Rise in the army to Captain or above and plot a coup. If it fails you may go to prison, but a prisoner of conscience can come out a hero, get anointed by the elders and return as a civilian president.", "Rise for army reach Captain or above and plot coup. If e fail you fit enter prison, but prisoner of conscience fit come out as hero, elders go anoint you and you go return as civilian president.")],
    [T("The Understudy", "The Understudy"), T("Be offered the Vice President slot. If the president dies or falls ill, you step in.", "Dem give you Vice President slot. If president die or sick, you go take over.")],
    [T("The Exile", "The Exile"), T("Speak out against a regime, flee abroad, and come back as a hero when democracy returns.", "Talk against the regime, run go abroad, then come back as hero when democracy return.")],
  ];
  return (
    <Card>
      <H sub={T("Different people got to the top different ways.", "Different people reach the top by different ways.")}>{T("Roads to the Villa", "Roads to the Villa")}</H>
      <div className="space-y-2">
        {routes.map(([t, d]) => (
          <div key={t} className="rounded-xl bg-slate-50 p-3">
            <div className="text-sm font-semibold text-blue-600">{t}</div>
            <div className="text-[11px] leading-snug text-slate-500">{d}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PowerTab({ p, run }: { p: Player; run: (a: Action) => void }) {
  const pol = p.politics;
  const coupBlock = canPlotCoup(p);
  const showCoup = p.job?.id === "soldier" || Boolean(pol?.militaryRuler);
  const coupCard = showCoup && (
    <Card>
      <H sub={T("High risk. Success makes you head of state. Failure means prison, or worse.", "Risk plenty. If you win, you be head of state. If you fail, na prison, or worse.")}>{T("Plot a coup", "Plot coup")}</H>
      <Btn tone="red" disabled={Boolean(coupBlock)} onClick={() => run({ t: "coup" })}>{T("Seize power", "Take power")}</Btn>
      {coupBlock && <p className="mt-1 text-xs text-slate-500">{coupBlock}</p>}
    </Card>
  );
  if (!pol) {
    const block = canJoinPolitics(p);
    return (
      <>
        <Card>
          <H>{T("Politics", "Politics")}</H>
          <p className="text-sm text-slate-700">{T("From councillor to President. It costs money, connections and (sometimes) your conscience. Once you hold power you can build the country, or loot it.", "From councillor reach President. E need money, connections and (sometimes) your conscience. Once you get power, you fit build the country, or loot am.")}</p>
          <Btn className="mt-3" tone="gold" disabled={Boolean(block)} onClick={() => run({ t: "joinPolitics" })}>{T(`Join a political party (${naira(2_000_000 * p.index)})`, `Join political party (${naira(2_000_000 * p.index)})`)}</Btn>
          {block && <p className="mt-2 text-xs text-red-600">{block}</p>}
        </Card>
        {coupCard}
        <RoutesCard />
      </>
    );
  }
  const holding = pol.office >= 0 ? OFFICES[pol.office] : null;
  const next = pol.highest + 1 < OFFICES.length ? OFFICES[pol.highest + 1] : null;
  const block = canContest(p);
  const n = p.nation;
  const ruler = p.loot > 0 && p.goodDeeds <= 3 ? T("Looter", "Looter") : p.goodDeeds >= 6 && p.loot === 0 ? T("Reformer", "Reformer") : p.goodDeeds > 0 && p.loot > 0 ? T("Mixed record", "Mixed record") : T("Unknown", "Unknown");
  const zone = currentZone(p);
  const mine = playerZone(p);
  return (
    <>
      <Card>
        <H>{officeTitle(p) ?? T("Out of office", "No dey office")}</H>
        {holding && !pol.militaryRuler && <p className="text-sm text-slate-700">{T(`Term ${pol.terms}, ${pol.yearsLeft} year${pol.yearsLeft === 1 ? "" : "s"} left · ${naira(holding.salary * Math.pow(p.index, 0.9))} yearly pay`, `Term ${pol.terms}, ${pol.yearsLeft} year${pol.yearsLeft === 1 ? "" : "s"} remain · ${naira(holding.salary * Math.pow(p.index, 0.9))} yearly pay`)}</p>}
        {pol.militaryRuler && <p className="text-sm text-slate-700">{T("You rule by decree. Watch out for counter-coups.", "You dey rule by decree. Watch out for counter-coup.")}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {pol.anointed && <Badge tone="gold">{T("Anointed", "Anointed")}</Badge>}
          {pol.hero && <Badge tone="green">{T("People's hero", "People hero")}</Badge>}
          {pol.vp && <Badge tone="gold">{T("Vice President", "Vice President")}</Badge>}
          {pol.godfather && <Badge tone="red">{T("Owes a godfather", "Godfather dey follow you")}</Badge>}
          {pol.defected && <Badge>{T("Defected", "Defected")}</Badge>}
          {pol.kingmaker > 0 && <Badge tone="gold">{T("Kingmaker", "Kingmaker")} ×{pol.kingmaker}</Badge>}
        </div>
        <p className="mt-2 text-xs text-slate-500">{T("Zoning: this cycle the presidency is zoned to the", "Zoning: this time presidency dey zone to")} <b className="text-slate-800">{zone}</b>. {T(`You are from the ${mine}`, `You come from ${mine}`)}{zone === mine ? T(". Advantage!", ". Na advantage!") : T(". Disadvantage.", ". Na disadvantage.")}</p>
        {next && !pol.militaryRuler && (
          <div className="mt-3">
            <Btn tone="gold" disabled={Boolean(block)} onClick={() => run({ t: "contest" })}>{T(`Run for ${next.title}`, `Contest for ${next.title}`)}</Btn>
            {block && <p className="mt-1 text-xs text-slate-500">{block}</p>}
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">{T("Reputation as a ruler", "Your name as ruler")}: <b className="text-slate-700">{ruler}</b> · {T("Stolen", "Stolen")}: {naira(p.loot)} · {T("Good deeds", "Good deeds")}: {p.goodDeeds}</p>
      </Card>

      <Card>
        <H sub={T("These decide who wins the ticket, the vote and the court case.", "These ones dey decide who go win ticket, vote and court case.")}>{T("Power bases", "Power bases")}</H>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <Bar label={T("Party machine", "Party machine")} value={pol.machine} tone="gold" />
          <Bar label={T("Electoral umpire (INEC)", "Electoral umpire (INEC)")} value={pol.umpire} tone="gold" />
          <Bar label={T("Courts", "Courts")} value={pol.courts} tone="gold" />
          <Bar label={T("Security chiefs", "Security chiefs")} value={pol.military} tone="gold" />
        </div>
        <div className="mt-3 space-y-2">
          {POWER_MOVES.map((m) => {
            const b = powerMoveBlock(p, m.id);
            return (
              <button key={m.id} type="button" disabled={Boolean(b)} onClick={() => run({ t: "power", id: m.id })} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left disabled:opacity-40">
                <span className="flex justify-between text-sm font-semibold"><span>{m.label}</span><span className="text-blue-600">{naira(powerMoveCost(p, m.id))}</span></span>
                <span className="block text-[11px] text-slate-500">{b ?? m.desc}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {coupCard}

      {holding && (
        <>
          <Card>
            <H>{T("The state of the nation", "How the country be")}</H>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Bar label={T("Economy", "Economy")} value={n.economy} />
              <Bar label={T("Security", "Security")} value={n.security} />
              <Bar label={T("Welfare", "Welfare")} value={n.welfare} />
              <Bar label={T("Approval", "Approval")} value={n.approval} tone="gold" />
              <Bar label={T("EFCC / coup heat", "EFCC / coup heat")} value={n.heat} invert />
            </div>
          </Card>
          {(["good", "corrupt", "neutral"] as const).map((side) => (
            <Card key={side}>
              <H sub={T(`${p.actionsLeft} action${p.actionsLeft === 1 ? "" : "s"} left this year`, `${p.actionsLeft} action remain this year`)}>
                {side === "good" ? T("Rule well", "Rule well") : side === "corrupt" ? T("Be corrupt", "Chop public money") : T("Politics as usual", "Normal politics")}
              </H>
              <div className="space-y-2">
                {GOV_ACTIONS.filter((a) => a.side === side && pol.office >= a.minOffice).map((a) => {
                  const dis = a.disabled?.(p) || (p.actionsLeft <= 0 ? T("No actions left", "No action remain") : false);
                  return (
                    <button key={a.id} type="button" disabled={Boolean(dis)} onClick={() => run({ t: "gov", id: a.id })} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left disabled:opacity-40">
                      <span className="block text-sm font-semibold">{a.label}</span>
                      <span className="block text-[11px] text-slate-500">{dis || a.desc}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
        </>
      )}
      <RoutesCard />
    </>
  );
}

// ---------------------------------------------------------------------------
// Legacy
// ---------------------------------------------------------------------------
function lineageCard(d: { surname: string; lineage: LineageEntry[] }, current: Player) {
  const gens = d.lineage.length + (current.alive ? 1 : 0);
  const richest = Math.max(current.peakWorth, ...d.lineage.map((l) => l.peakWorth), 0);
  const prestige = d.lineage.reduce((s, l) => s + l.prestige, 0) + (current.alive ? current.prestige : 0);
  const best = [...d.lineage].sort((a, b) => b.peakWorth - a.peakWorth)[0];
  return {
    kicker: T("Naija Life · Family Legacy", "Naija Life · Family Legacy"),
    title: T(`The ${d.surname} Dynasty`, `The ${d.surname} Dynasty`),
    stats: [
      { label: T("Generations", "Generations"), value: String(gens) },
      { label: T("Richest peak fortune", "Biggest fortune"), value: naira(richest) },
      { label: T("Prestige earned", "Prestige wey you earn"), value: String(prestige) },
    ],
    lines: best ? [T(`Greatest: ${best.name}, ${best.epitaph} (${best.highestOffice}).`, `Greatest: ${best.name}, ${best.epitaph} (${best.highestOffice}).`)] : [T(`Current head: ${current.name} ${current.surname}.`, `Current head: ${current.name} ${current.surname}.`)],
  };
}

function LegacyTab({ g }: { g: Game }) {
  const [msg, setMsg] = useState("");
  const share = async () => {
    const card = lineageCard(g.dynasty, g.p);
    const r = await shareCard(card, T(`${card.title} on Naija Life: ${card.stats.map((s) => `${s.label} ${s.value}`).join(" · ")}`, `${card.title} for Naija Life: ${card.stats.map((s) => `${s.label} ${s.value}`).join(" · ")}`));
    setMsg(r === "shared" ? T("Shared!", "Shared!") : T("Card ready. Save it or screenshot it!", "Card don ready. Save am or take screenshot!"));
  };
  const p = g.p;
  return (
    <>
      <Card>
        <H>{T(`The ${g.dynasty.surname} dynasty`, `The ${g.dynasty.surname} dynasty`)}</H>
        <p className="text-sm text-slate-700">{T(`Generation ${p.generation}. When you die you continue as one of your children, with 70% of everything you built. The family name keeps growing.`, `Generation ${p.generation}. When you die, you go continue as one of your pikin, with 70% of everything you build. The family name go keep growing.`)}</p>
        <Btn tone="gold" small className="mt-3" onClick={share}><Share2 size={14} className="mr-1 inline" /> {T("Share legacy card", "Share legacy card")}</Btn>
        {msg && <p className="mt-2 text-xs text-emerald-600">{msg}</p>}
      </Card>
      <Card>
        <H>{T("Current life", "Current life")}</H>
        <p className="text-sm">{p.name} {p.surname} · {T("Prestige", "Prestige")} {p.prestige} · {T("Peak worth", "Highest worth")} {naira(p.peakWorth)}</p>
        <p className="mt-1 text-xs text-slate-500">{T("Good deeds", "Good deeds")} {p.goodDeeds} · {T("Stolen", "Stolen")} {naira(p.loot)} · {T("Kidnapped", "Dem kidnap you")} {p.kidnaps}×</p>
      </Card>
      {g.dynasty.lineage.length > 0 && (
        <Card>
          <H>{T("Ancestors", "Ancestors")}</H>
          <div className="space-y-2">
            {[...g.dynasty.lineage].reverse().map((l, i) => (
              <div key={i} className="rounded-xl bg-slate-50 p-3">
                <div className="flex justify-between"><span className="font-semibold">{l.name}</span><Badge tone="gold">{T("Gen", "Gen")} {l.generation}</Badge></div>
                <div className="text-xs text-blue-600">{l.epitaph}</div>
                <div className="text-[11px] text-slate-500">{T(`Lived ${l.ageAtDeath} yrs`, `Live ${l.ageAtDeath} yrs`)} · {l.highestOffice} · {T("peak", "peak")} {naira(l.peakWorth)} · {l.cause}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Death screen
// ---------------------------------------------------------------------------
function DeathScreen({ g, onHeir, onNew }: { g: Game; onHeir: (i: number) => void; onNew: (o: { name: string; gender: Gender; stateId: string | null; tribe: string | null; religion: string | null }) => void }) {
  const p = g.p;
  const entry = g.dynasty.lineage[g.dynasty.lineage.length - 1];
  const [msg, setMsg] = useState("");
  const share = async () => {
    const r = await shareCard(
      {
        kicker: T(`Naija Life · Generation ${p.generation}`, `Naija Life · Generation ${p.generation}`),
        title: `${p.name} ${p.surname}`,
        stats: [
          { label: T("Lived", "Years wey you live"), value: T(`${p.age} years`, `${p.age} years`) },
          { label: T("Peak fortune", "Biggest fortune"), value: naira(p.peakWorth) },
          { label: T("Known as", "Dem know am as"), value: entry?.epitaph ?? T("A Survivor", "A Survivor") },
        ],
        lines: [T(`Died: ${p.cause}.`, `E die: ${p.cause}.`), entry ? T(`Highest role: ${entry.highestOffice}.`, `Highest position: ${entry.highestOffice}.`) : ""],
      },
      T(`${p.name} ${p.surname} lived ${p.age} years in Naija Life. ${entry?.epitaph ?? ""}`, `${p.name} ${p.surname} live ${p.age} years for Naija Life. ${entry?.epitaph ?? ""}`),
    );
    setMsg(r === "shared" ? T("Shared!", "Shared!") : T("Card ready. Save it or screenshot it!", "Card don ready. Save am or take screenshot!"));
  };
  return (
    <Sheet title={T("Your life has ended", "Your life don end")}>
      <div className="mb-2 flex justify-center"><Avatar look={p.look} gender={p.gender} age={p.age} size={96} dim /></div>
      <p className="font-serif text-2xl font-bold">{p.name} {p.surname}</p>
      <p className="text-sm text-slate-600">{T(`Died at ${p.age}`, `E die at ${p.age}`)} · {p.cause}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Card className="p-3"><div className="text-[11px] text-slate-500">{T("Net worth at death", "Worth wen e die")}</div><div className="font-bold text-blue-600">{naira(entry?.worth ?? 0)}</div></Card>
        <Card className="p-3"><div className="text-[11px] text-slate-500">{T("Remembered as", "Dem go remember am as")}</div><div className="font-bold">{entry?.epitaph}</div></Card>
      </div>
      <div className="mt-4 space-y-2">
        {p.kids.length > 0 ? (
          <>
            <p className="text-sm text-slate-700">{T("Who carries the family name?", "Who go carry the family name?")}</p>
            {p.kids.map((k, i) => (
              <Btn key={i} className="w-full" onClick={() => onHeir(i)}>{T(`Continue as ${k.name} ${p.surname} (age ${k.age})`, `Continue as ${k.name} ${p.surname} (age ${k.age})`)}</Btn>
            ))}
          </>
        ) : (
          <>
            <p className="text-sm text-slate-700">{T("You had no children. The bloodline ends here.", "You no get pikin. The family line end here.")}</p>
            <Btn className="w-full" onClick={() => onNew({ name: "", gender: chance(0.5) ? "male" : "female", stateId: null, tribe: null, religion: null })}>{T("Start a brand-new family", "Start new family")}</Btn>
          </>
        )}
        <Btn tone="gold" className="w-full" onClick={share}>{T("Share this life", "Share this life")}</Btn>
        {msg && <p className="text-center text-xs text-emerald-600">{msg}</p>}
      </div>
    </Sheet>
  );
}
