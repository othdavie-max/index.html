"use client";
/** The Civilization-style main screen: a living map, a HUD of resources and danger meters, a notification stack,
 *  a toolbar that opens drawers, an advisor, and one big NEXT TURN button. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Crown, FastForward, HelpCircle, Landmark, Menu as MenuIcon, Newspaper, ShieldAlert, TrendingUp, Users, Volume2, VolumeX, X, Scale } from "lucide-react";
import { useFix, useS, type Tab } from "./store";
import { Button, Modal } from "../../game/ui/kit";
import { STATES } from "../../game/data/states";
import { LAYERS, stateLayerValue, stressColor, type Layer } from "../engine/views";
import { monthLabel, nb } from "../engine/util";
import { TERM_MONTHS } from "../engine/types";
import { budgetDue } from "../engine/politics";
import { monthsLeft } from "../engine/power";
import { MapView, SymbolIcon, EVENT_SYMBOL } from "./MapView";
import { StatePanel } from "./screens/MapScreen";
import { Presidency } from "./screens/Presidency";
import { Policies } from "./screens/Policies";
import { Projects } from "./screens/Projects";
import { Nation } from "./screens/Nation";
import { News } from "./screens/News";
import { CabinetCard } from "./Cabinet";
import { BudgetCard, GovernorsCard, GroupsCard, SpeechButton } from "./Politics";
import { AssemblyPanel } from "./AssemblyPanel";
import { Meters, PowerPanel } from "./PowerPanel";
import { EventCard } from "./Decisions";
import { HowTo, MenuModal } from "./Menu";
import { Legacy } from "./Legacy";
import { ElectionNight } from "./ElectionNight";
import { MonthSummaryModal, Ticker } from "./Shell";
import { DayOne } from "./DayOne";
import { StaffCard } from "./StaffCard";
import { MovesPanel } from "./MovesPanel";
import { StreetPanel } from "./StreetPanel";
import { BriefingPanel } from "./AdvisorStrip";
import { RecordCard } from "./RecordCard";
import { RECORD_BY_ID } from "../engine/history";
import { EnemiesPanel, FuelPanel, InvestorsPanel, TimelinePanel } from "./LivingPanels";
import { FirstFamilyCard, ForeignPanel, PartyPanel } from "./WorldPanels";
import { activeEnemies } from "../engine/ripples";
import { briefing, topIssue } from "../engine/advice";
import { pegged } from "../engine/bigmoves";
import { landmarks } from "../engine/views";
import { Portrait } from "../../game/ui/kit";
import { isMuted, setMuted, sfx } from "./sound";
import type { FixState } from "../engine/types";

type Lens = "mood" | "politics" | Layer;
const LENSES: { id: Lens; label: string }[] = [
  { id: "mood", label: "Mood" }, { id: "politics", label: "Politics" },
  ...LAYERS.filter((l) => ["food", "security", "jobs", "power", "unrest"].includes(l.id)).map((l) => ({ id: l.id as Lens, label: l.label })),
];
const face = (stress: number) => (stress < 22 ? "😀" : stress < 36 ? "🙂" : stress < 50 ? "😐" : stress < 64 ? "😟" : "😠");

function lensFill(s: FixState, lens: Lens): (id: string) => string {
  if (lens === "politics") {
    return (id) => {
      const zone = STATES.find((x) => x.id === id)?.zone;
      const g = s.governors.find((x) => x.zone === zone);
      if (!g) return "#cbd5e1";
      const k = Math.max(0.25, Math.min(1, g.relation / 100));
      const mix = (a: number, b: number) => Math.round(255 - (255 - a) * k + 0 * b);
      return g.party === "NPP" ? `rgb(${mix(40, 0)},${mix(170, 0)},${mix(110, 0)})` : `rgb(${mix(200, 0)},${mix(60, 0)},${mix(70, 0)})`;
    };
  }
  const layer: Layer = lens === "mood" ? "overview" : lens;
  return (id) => stressColor(stateLayerValue(s, id, layer));
}

function Drawer({ title, onClose, children, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  return (
    <div className="fx-drawer-wrap" role="dialog" aria-label={typeof title === "string" ? title : "Panel"}>
      <button className="fx-drawer-scrim" aria-label="Close panel" onClick={onClose} />
      <aside className={`fx-drawer ${wide ? "fx-drawer-wide" : ""}`}>
        <header className="fx-drawer-head"><b>{title}</b><button className="g-btn g-btn-ghost" onClick={onClose} aria-label="Close" style={{ padding: 6 }}><X size={20} /></button></header>
        <div className="fx-drawer-body">{children}</div>
      </aside>
    </div>
  );
}

function advisor(s: FixState, open: number): { text: string; label: string; go: Tab | "events" } | null {
  const P = s.rule;
  if (open > 0) return { text: `${open} ${open === 1 ? "matter needs" : "matters need"} your decision before the month ends.`, label: "Decide", go: "events" };
  if (P.coupRisk >= 45) return { text: "Mr/Madam President, the barracks are restless. Pay or purge the generals, or ease the pressure.", label: "Open Power", go: "power" };
  if (P.streetAnger >= 65) return { text: "The streets are close to boiling over. Ease prices or expect crowds.", label: "Open Power", go: "power" };
  if (budgetDue(s) && s.month > 0) return { text: `The ${s.month >= 12 ? "annual " : ""}budget is due. Lawmakers are waiting.`, label: "Policies", go: "policies" };
  const rich = s.lawmakers.some((l) => l.evidence >= 40 && l.stolen > 10 && (l.status === "active" || l.status === "exposed"));
  if (rich) return { text: "You hold proof against a lawmaker. Arrest, leak, or use it.", label: "Assembly", go: "assembly" };
  if (!s.projects.some((p) => p.status === "active")) return { text: "No projects are under way. Lasting change needs them.", label: "Projects", go: "projects" };
  return null;
}

export function World() {
  const s = useS();
  const { tab, setTab, advance, select, setSelect, summary, version } = useFix();
  const [lens, setLens] = useState<Lens>("mood");
  const [how, setHow] = useState(false);
  const [menu, setMenu] = useState(false);
  const [queue, setQueue] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [muted, setM] = useState(isMuted());
  const [banner, setBanner] = useState<string | null>(null);
  const lastMonth = useRef(s.month);
  const lastOpen = useRef(-1);
  const [shake, setShake] = useState(false);
  const seenAch = useRef(s.achievements.length);
  const [cards, setCards] = useState<string[]>([]);

  const decisions = s.events.filter((e) => e.status === "open" && e.kind !== "opportunity");
  const opps = s.events.filter((e) => e.status === "open" && e.kind === "opportunity");
  const all = [...decisions, ...opps];
  const blocked = !!s.ended;
  const left = monthsLeft(s);
  const pct = Math.min(100, ((TERM_MONTHS + s.rule.termExtra - left) / (TERM_MONTHS + s.rule.termExtra)) * 100);

  useEffect(() => {
    if (s.month !== lastMonth.current) { lastMonth.current = s.month; setBanner(monthLabel(s.month)); sfx("turn"); const t = setTimeout(() => setBanner(null), 1300); return () => clearTimeout(t); }
  }, [s.month, version]);
  useEffect(() => {
    if (lastOpen.current >= 0 && decisions.length > lastOpen.current) {
      const big = decisions.some((e) => e.scale >= 4 || e.kind === "power");
      sfx(big ? "bad" : "alert");
      if (big && !s.settings.reducedMotion) { setTimeout(() => setShake(true), 0); setTimeout(() => setShake(false), 650); }
    }
    lastOpen.current = decisions.length;
  }, [decisions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (s.achievements.length > seenAch.current) {
      const fresh = s.achievements.slice(seenAch.current).filter((a) => a.id.startsWith("rec:")).map((a) => a.id.slice(4));
      seenAch.current = s.achievements.length;
      if (fresh.length) setTimeout(() => setCards((c) => [...c, ...fresh]), 600);
    } else seenAch.current = s.achievements.length;
  }, [s.achievements.length, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const fill = useMemo(() => lensFill(s, lens), [s, lens, s.month, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const faces = useMemo(() => (id: string) => face(stateLayerValue(s, id, "overview")), [s, s.month, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const tip = advisor(s, decisions.length);
  const cos = s.staff.cos;
  const say = !tip && cos ? briefing(s).find((b) => b.by.id === cos.id) : null;
  const sayGo = topIssue(s)?.go as Tab | undefined;
  const drawer = tab !== "world" && tab !== "map" ? tab : null;
  const close = () => setTab("world");
  const cur = pick ? s.events.find((e) => e.id === pick && e.status === "open") : null;

  const nextTurn = () => {
    if (blocked) return;
    if (decisions.length > 0 && !queue) { sfx("alert"); setQueue(true); return; }
    sfx("tap"); advance(1);
  };

  // seven buttons; everything else is a tab inside them
  const GROUPS: { id: string; label: string; icon: ReactNode; tabs: { id: Tab; label: string }[]; badge?: number; wide?: boolean }[] = [
    { id: "govern", label: "Govern", icon: <Landmark size={22} />, wide: true, tabs: [{ id: "presidency", label: "Presidency" }, { id: "policies", label: "Policies" }, { id: "projects", label: "Projects" }, { id: "moves", label: "Big Moves" }, { id: "foreign", label: "Foreign" }] },
    { id: "economy", label: "Economy", icon: <TrendingUp size={22} />, wide: true, badge: s.oil.scarcity >= 65 || s.oil.uptime < 35 ? 1 : 0, tabs: [{ id: "nation", label: "Economy" }, { id: "oil", label: "Fuel & refineries" }, { id: "deals", label: "Investors" }, { id: "street", label: "Street" }] },
    { id: "assembly", label: "Assembly", icon: <Scale size={22} />, tabs: [{ id: "assembly", label: "Assembly" }] },
    { id: "power", label: "Power", icon: <Crown size={22} />, badge: s.rule.coupRisk >= 45 || s.rule.streetAnger >= 65 ? 1 : 0, tabs: [{ id: "power", label: "Seat of power" }, { id: "timeline", label: "What I caused" }] },
    { id: "people", label: "People", icon: <Users size={22} />, badge: activeEnemies(s).some((e) => e.power >= 50) || s.backers.some((b) => b.mood < 30) ? 1 : 0, tabs: [{ id: "cabinet", label: "Cabinet & backers" }, { id: "party", label: "Party" }, { id: "advisers", label: "Advisers" }, { id: "enemies", label: "Enemies" }] },
    { id: "news", label: "News", icon: <Newspaper size={22} />, tabs: [{ id: "news", label: "News" }] },
  ];
  const group = GROUPS.find((g) => g.tabs.some((x) => x.id === drawer));
  const title: Record<string, string> = { govern: "Government", economy: "Nation & economy", assembly: "National Assembly", power: "Seat of power", people: "People around you", news: "News" };

  return (
    <div className={`fx-world ${shake ? "fx-shake" : ""}`} data-lens={lens}>
      <header className="fx-hud" aria-label="Status">
        <div className="fx-hud-date"><b>{monthLabel(s.month)}</b><span>Term {s.term} · {left} months to election</span><span className="fx-term" role="progressbar" aria-label="Progress through the term" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${pct}%` }} /></span></div>
        <div className="fx-hud-res">
          <Res icon="💰" label="Cash" v={nb(s.fin.treasury)} bad={s.fin.treasury < 30} onClick={() => setTab("nation")} />
          <Res icon="💵" label={pegged(s) ? "Official / black" : "Naira"} v={pegged(s) ? `₦${Math.round(s.eco.fx).toLocaleString()} / ${Math.round(Number(s.flags.blackFx ?? s.eco.fx)).toLocaleString()}` : `₦${Math.round(s.eco.fx).toLocaleString()}`} bad={pegged(s)} onClick={() => setTab("nation")} />
          <Res icon="📈" label="Inflation" v={`${s.eco.inflation.toFixed(0)}%`} bad={s.eco.inflation > 25} onClick={() => setTab("nation")} />
          <Res icon="👷" label="Jobless" v={`${s.jobs.unemployment.toFixed(0)}%`} bad={s.jobs.unemployment > 30} onClick={() => setTab("nation")} />
          <Res icon={face(100 - s.gov.happiness)} label="Mood" v={`${Math.round(s.gov.happiness)}`} bad={s.gov.happiness < 35} onClick={() => setTab("presidency")} />
          <Res icon="🗳️" label="Approval" v={`${Math.round(s.gov.approval)}%`} bad={s.gov.approval < 35} onClick={() => setTab("presidency")} />
        </div>
        <button className="fx-hud-danger" onClick={() => setTab("power")} aria-label="Open the seat of power: danger meters"><Meters compact /></button>
        <div className="fx-hud-tools">
          <button className="fx-icon-btn" onClick={() => { const m = !muted; setMuted(m); setM(m); if (!m) sfx("tap"); }} aria-label={muted ? "Turn sound on" : "Turn sound off"}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
          <button className="fx-icon-btn" onClick={() => setHow(true)} aria-label="How to play"><HelpCircle size={18} /></button>
          <button className="fx-icon-btn" onClick={() => setMenu(true)} aria-label="Menu and saves"><MenuIcon size={18} /></button>
        </div>
      </header>

      <div className="fx-stage">
        <MapView s={s} layer={lens === "mood" || lens === "politics" ? "overview" : lens} fill={fill} faces={faces} marks={landmarks(s)} selectedState={select.state} selectedLga={select.lga} onSelectState={(id) => { setSelect({ state: id, lga: null }); if (id) sfx("tap"); }} onSelectLga={(id) => setSelect({ state: select.state, lga: id })} height="100%" labels />
        <div className="fx-lens" role="group" aria-label="Map lens">{LENSES.map((l) => <button key={l.id} className="fx-chip" aria-pressed={lens === l.id} onClick={() => setLens(l.id)}>{l.label}</button>)}</div>
        <div className="fx-notes" aria-label="Notifications">
          {all.slice(0, 5).map((e) => (
            <button key={e.id} className="fx-note" data-kind={e.kind} onClick={() => { sfx("tap"); setPick(e.id); }} aria-label={`${EVENT_SYMBOL[e.kind].label}: ${e.title}`}>
              <SymbolIcon k={e.kind} size={26} /><span><b>{e.title}</b><i>{EVENT_SYMBOL[e.kind].label}</i></span>
            </button>
          ))}
          {all.length > 5 && <button className="fx-note fx-note-more" onClick={() => setQueue(true)}>+{all.length - 5} more</button>}
        </div>
        {banner && <div className="fx-turn-banner" aria-hidden><span>{banner}</span></div>}
        {say && !blocked && cos && (
          <div className="fx-advisor" role="status">
            <Portrait p={cos.portrait} size={42} name={cos.name} />
            <div><b>{cos.name}</b><p>{say.text.length > 190 ? `${say.text.slice(0, 187)}…` : say.text}</p><Button size="sm" variant="primary" onClick={() => { sfx("tap"); setTab(sayGo ?? "advisers"); }}>{sayGo ? "Take me there" : "All advisers"}</Button></div>
          </div>
        )}
        {tip && !blocked && (
          <div className="fx-advisor" role="status">
            <div className="fx-advisor-face" aria-hidden>🧑🏾‍💼</div>
            <div><b>Chief of Staff</b><p>{tip.text}</p><Button size="sm" variant="primary" onClick={() => { sfx("tap"); if (tip.go === "events") setQueue(true); else setTab(tip.go); }}>{tip.label}</Button></div>
          </div>
        )}
        <div className="fx-turn">
          <button className="fx-skip" disabled={blocked} onClick={() => { sfx("tap"); advance(3); }} aria-label="Skip up to three months; stops early if something needs a decision" title="Skip up to 3 months"><FastForward size={18} /> +3</button>
          <button className="fx-next" disabled={blocked} onClick={nextTurn} aria-label={decisions.length ? `${decisions.length} decisions waiting` : "Next turn: move on one month"}>
            {decisions.length > 0 ? <><ShieldAlert size={22} /> <span>{decisions.length} to decide</span></> : <><span>NEXT TURN</span> <small>{monthLabel(s.month + 1)}</small></>}
          </button>
        </div>
      </div>

      <Ticker />
      <nav className="fx-toolbar" aria-label="Government">
        <button className="fx-tool" onClick={() => { sfx("tap"); setQueue(true); }}><ShieldAlert size={22} /><span>Desk</span>{decisions.length > 0 && <i className="fx-dot-red" aria-label="decisions waiting" />}</button>
        {GROUPS.map((b) => <button key={b.id} className="fx-tool" aria-pressed={group?.id === b.id} onClick={() => { sfx("tap"); setTab(group?.id === b.id ? "world" : b.tabs[0].id); }}>{b.icon}<span>{b.label}</span>{!!b.badge && <i className="fx-dot-red" aria-label="needs attention" />}</button>)}
      </nav>

      {select.state && <Drawer title="Location" onClose={() => setSelect({ state: null, lga: null })}><StatePanel s={s} id={select.state} lga={select.lga} /></Drawer>}
      {drawer && group && (
        <Drawer title={title[group.id]} onClose={close} wide={!!group.wide}>
          {group.tabs.length > 1 && <div className="fx-subtabs" role="group" aria-label="Sections">{group.tabs.map((x) => <button key={x.id} className="fx-subtab" aria-pressed={drawer === x.id} onClick={() => { sfx("tap"); setTab(x.id); }}>{x.label}</button>)}</div>}
          {drawer === "presidency" && <Presidency />}
          {drawer === "policies" && <Policies />}
          {drawer === "projects" && <Projects />}
          {drawer === "moves" && <MovesPanel />}
          {drawer === "foreign" && <ForeignPanel />}
          {drawer === "party" && <PartyPanel />}
          {drawer === "nation" && <Nation />}
          {drawer === "oil" && <FuelPanel />}
          {drawer === "deals" && <InvestorsPanel />}
          {drawer === "street" && <StreetPanel />}
          {drawer === "assembly" && <div className="g-col" style={{ gap: 14 }}><AssemblyPanel /><BudgetCard /><SpeechButton /><GovernorsCard /></div>}
          {drawer === "power" && <PowerPanel />}
          {drawer === "timeline" && <TimelinePanel />}
          {drawer === "cabinet" && <div className="g-col" style={{ gap: 14 }}><StaffCard /><FirstFamilyCard /><CabinetCard /><GroupsCard /></div>}
          {drawer === "advisers" && <BriefingPanel />}
          {drawer === "enemies" && <EnemiesPanel />}
          {drawer === "news" && <News />}
        </Drawer>
      )}

      {cur && <Modal title={<><SymbolIcon k={cur.kind} size={22} /> {cur.title}</>} wide onClose={() => setPick(null)}><EventCard e={cur} /></Modal>}
      {queue && (
        <Modal title={`On your desk (${all.length})`} onClose={() => setQueue(false)} footer={<><Button onClick={() => setQueue(false)}>Back to the map</Button><Button variant="light" onClick={() => { setQueue(false); sfx("tap"); advance(1); }}>End turn anyway</Button></>}>
          <div className="g-col" style={{ gap: 6 }}>
            {all.length === 0 && <div className="g-small g-muted">Nothing left. You can end the turn.</div>}
            {all.map((e) => <button key={e.id} className="g-list-row" style={{ background: "none", border: 0, textAlign: "left", width: "100%" }} onClick={() => { setQueue(false); setPick(e.id); }}><SymbolIcon k={e.kind} size={24} /><span className="g-grow g-small"><b>{e.title}</b><div className="g-tiny g-muted">{EVENT_SYMBOL[e.kind].label}{e.kind === "opportunity" ? " · optional" : ""}</div></span><Button size="sm" variant="primary">Open</Button></button>)}
            <div className="g-tiny g-muted">Anything you leave open may expire or get worse. Some matters make their own decision.</div>
          </div>
        </Modal>
      )}
      {cards.length > 0 && RECORD_BY_ID[cards[0]] && <RecordCard r={RECORD_BY_ID[cards[0]]} label={pegged(s) ? "Official rate only: the black market tells a different story." : undefined} onClose={() => setCards((c) => c.slice(1))} />}
      {!s.staff.picked && <DayOne />}
      {menu && <MenuModal onClose={() => setMenu(false)} />}
      {how && <HowTo onClose={() => setHow(false)} />}
      {!summary ? null : <MonthSummaryModal />}
      {s.ended && (s.election && s.election.month === s.month && !s.flags[`electionSeen:${s.month}`] ? <ElectionNight /> : <Legacy />)}
    </div>
  );
}
void Users;

function Res({ icon, label, v, bad, onClick }: { icon: string; label: string; v: string; bad?: boolean; onClick: () => void }) {
  return <button className="fx-res" data-bad={bad ? "1" : undefined} onClick={onClick} aria-label={`${label}: ${v}`}><span aria-hidden>{icon}</span><b>{v}</b><i>{label}</i></button>;
}
