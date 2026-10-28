"use client";
import { useMemo, useState } from "react";
import { Newspaper, Save, Settings as SettingsIcon, HelpCircle, Dices, Trash2 } from "lucide-react";
import { useGame, useS } from "../store";
import { Badge, Button, Callout, Card, ConfirmDialog, EmptyState, Field } from "../kit";
import { STATES } from "../../data/states";
import { formatMonth, formatMonthShort } from "../../engine/calendar";
import { stateName } from "../../engine/admin";
import { partyAbbr, partyColor } from "../../engine/queries";
import type { NewsTopic } from "../../engine/types";
import { SlotsModal, AboutModal } from "./Title";
import { Tutorial } from "../Tutorial";

const TOPIC_LABEL: Record<NewsTopic, string> = { national: "National politics", state: "State politics", local: "Local government", elections: "Elections", economy: "Economy", services: "Public services", security: "Security", corruption: "Corruption & investigations", party: "Party developments", personal: "Personal" };

export function NewsScreen() {
  const state = useS();
  const [topic, setTopic] = useState<NewsTopic | "all">("all");
  const [st, setSt] = useState("");
  const [party, setParty] = useState("");
  const [imp, setImp] = useState(1);
  const [mine, setMine] = useState(false);
  const items = useMemo(() => [...state.news].reverse().filter((n) => (topic === "all" || n.topic === topic) && (!st || n.stateId === st) && (!party || n.partyId === party) && n.importance >= imp && (!mine || n.personal)).slice(0, 80), [state.news, topic, st, party, imp, mine, state.clock.monthIndex]); // eslint-disable-line react-hooks/exhaustive-deps
  const parties = Object.values(state.parties).filter((p) => p.exists).map((p) => p.id);
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <div className="g-page-title">News</div>
      <div className="g-row g-wrap g-chip-row" style={{ gap: 6 }} role="group" aria-label="Topic">
        <button className="g-chip" aria-pressed={topic === "all"} onClick={() => setTopic("all")}>All</button>
        {(Object.keys(TOPIC_LABEL) as NewsTopic[]).map((t) => <button key={t} className="g-chip" aria-pressed={topic === t} onClick={() => setTopic(t)}>{TOPIC_LABEL[t]}</button>)}
      </div>
      <div className="g-grid g-grid-4">
        <Field label="State">{(id) => <select id={id} className="g-select" value={st} onChange={(e) => setSt(e.target.value)}><option value="">All states</option>{STATES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}</Field>
        <Field label="Party">{(id) => <select id={id} className="g-select" value={party} onChange={(e) => setParty(e.target.value)}><option value="">All parties</option>{parties.map((p) => <option key={p} value={p}>{partyAbbr(state, p)}</option>)}</select>}</Field>
        <Field label="Importance">{(id) => <select id={id} className="g-select" value={imp} onChange={(e) => setImp(Number(e.target.value))}><option value={1}>All stories</option><option value={2}>Notable and major</option><option value={3}>Major only</option></select>}</Field>
        <label className="g-row g-small" style={{ alignSelf: "end", minHeight: 44 }}><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Affecting me</label>
      </div>
      {items.length === 0 ? <Card><EmptyState icon={<Newspaper size={30} />} title="No stories match" body="Every headline comes from something that actually happened in the simulation. Advance time or loosen the filters." /></Card> : (
        <div className="g-grid g-grid-2">
          {items.map((n) => (
            <Card key={n.id} className="g-col" >
              <div className="g-row g-wrap" style={{ gap: 6 }}>
                <Badge tone={n.importance === 3 ? "red" : n.importance === 2 ? "amber" : undefined}>{TOPIC_LABEL[n.topic]}</Badge>
                {n.stateId && <Badge>{stateName(n.stateId)}</Badge>}
                {n.partyId && <Badge><span style={{ width: 8, height: 8, borderRadius: 9, background: partyColor(state, n.partyId), display: "inline-block" }} /> {partyAbbr(state, n.partyId)}</Badge>}
                {n.personal && <Badge tone="green">About you / your area</Badge>}
              </div>
              <div style={{ fontWeight: 700, lineHeight: 1.3 }}>{n.headline}</div>
              {n.body && <div className="g-small g-muted">{n.body}</div>}
              <div className="g-tiny g-muted">{formatMonth(state, n.month)}</div>
            </Card>
          ))}
        </div>
      )}
      <div className="g-tiny g-muted">Political parties and politicians in the news are fictional. Events marked as inspired by real developments are fictionalised.</div>
    </div>
  );
}

export function SettingsScreen() {
  const state = useS();
  const { dispatch, saveSlot, toast, quitToTitle, setScreen } = useGame();
  const [modal, setModal] = useState<"slots" | "about" | "how" | "end" | null>(null);
  const s = state.settings;
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <div className="g-page-title">Settings</div>
      {state.gameOver && <Callout tone="bad"><b>{state.gameOver.text}</b> This life has ended. You can load an earlier save or start a new game.</Callout>}
      <div className="g-grid g-grid-2">
        <Card title="Saving" icon={<Save size={16} />}>
          <div className="g-small g-muted" style={{ marginBottom: 8 }}>Games are saved on this device (IndexedDB). The game autosaves each time you advance time and when you leave the page.</div>
          <div className="g-row g-wrap"><Button variant="primary" onClick={async () => { if (await saveSlot("auto")) toast("Saved."); }}>Save now</Button><Button onClick={() => setModal("slots")}>Manage save slots</Button><Button onClick={quitToTitle}>Save &amp; quit to title</Button></div>
        </Card>
        <Card title="Preferences" icon={<SettingsIcon size={16} />}>
          <div className="g-col">
            {([["autoSave", "Autosave after each month"], ["reducedMotion", "Reduce motion"], ["showTooltips", "Show helper tooltips"]] as const).map(([k, l]) => (
              <label key={k} className="g-row g-small"><input type="checkbox" checked={s[k]} onChange={(e) => dispatch({ t: "setting", key: k, value: e.target.checked }, { silent: true })} /> {l}</label>
            ))}
          </div>
        </Card>
        <Card title="This game" icon={<Dices size={16} />}>
          <div className="g-small g-col" style={{ gap: 4 }}>
            <div><b>Character:</b> {state.player.name}</div>
            <div><b>Difficulty:</b> {state.meta.difficulty}{state.meta.sandbox?.noScandals ? " (investigations off)" : ""}</div>
            <div><b>World seed:</b> <code>{state.meta.seed}</code> — the same seed and choices reproduce the same world.</div>
            <div><b>Ruleset:</b> {state.meta.rulesetId} · simulation v{state.meta.simVersion}</div>
            <div><b>Month index:</b> {state.clock.monthIndex} ({formatMonthShort(state, state.clock.monthIndex)})</div>
          </div>
        </Card>
        <Card title="Help and about" icon={<HelpCircle size={16} />}>
          <div className="g-row g-wrap"><Button onClick={() => setModal("how")}>How to play</Button><Button onClick={() => setModal("about")}>About, data &amp; licences</Button></div>
        </Card>
      </div>
      <Card title="Start over" icon={<Trash2 size={16} />}>
        <div className="g-small g-muted" style={{ marginBottom: 8 }}>Begin a brand-new life. Your existing saves are kept until you delete them.</div>
        <Button variant="danger" onClick={() => setModal("end")}>New game…</Button>
      </Card>
      {modal === "slots" && <SlotsModal mode="both" onClose={() => setModal(null)} />}
      {modal === "about" && <AboutModal onClose={() => setModal(null)} />}
      {modal === "how" && <Tutorial onClose={() => setModal(null)} />}
      {modal === "end" && <ConfirmDialog title="Start a new game?" confirmLabel="Save & start new" onCancel={() => setModal(null)} onConfirm={async () => { setModal(null); await saveSlot("auto"); setScreen("create"); }} body="Your current life is saved to the autosave slot first." />}
    </div>
  );
}
