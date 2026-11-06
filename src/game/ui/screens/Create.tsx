"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Dices, Map as MapIcon, Minus, Plus, Check } from "lucide-react";
import { useGame } from "../store";
import { Button, Card, Callout, Field, Modal, Portrait, PORTRAIT_OPTIONS, Badge, naira, Spinner, ErrorState } from "../kit";
import { STATES } from "../../data/states";
import { ADMIN_LGAS, LGAS_BY_STATE, LGA_BY_ID, stateName } from "../../engine/admin";
import { BACKGROUNDS, BACKGROUND_BY_ID, COURSES, JOBS } from "../../data/life";
import { ATTR_KEYS, BONUS_POINTS, MAX_BONUS_PER_ATTR, validateConfig, type NewGameConfig, type CoreAttr } from "../../engine/newgame";
import { jobRequirements } from "../../engine/education";
import { loadGeo, type GeoData } from "../geoData";
import { GeoMap } from "../GeoMap";
import type { GameState } from "../../engine/types";

const ATTR_INFO: Record<CoreAttr, { label: string; help: string }> = {
  intelligence: { label: "Intelligence", help: "Admissions, exams, jobs and debates" },
  communication: { label: "Communication", help: "Debates, rallies, public statements" },
  leadership: { label: "Leadership", help: "Organising, party posts, grassroots work" },
  negotiation: { label: "Negotiation", help: "Coalitions, mediation, legislature" },
  financialMgmt: { label: "Financial management", help: "Business, campaign budgets" },
  integrity: { label: "Integrity", help: "Reputation and resistance to temptation" },
  ambition: { label: "Ambition", help: "Drive; also makes rivals wary" },
  charisma: { label: "Charisma", help: "Rallies, personal appeal to voters" },
};

const STEPS = ["Identity", "Birthplace", "Family", "Strengths", "Review"] as const;

function MapPicker({ stateId, lgaId, onPick, onClose }: { stateId: string; lgaId: string; onPick: (s: string, l: string | null) => void; onClose: () => void }) {
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [s, setS] = useState<string | null>(stateId || null);
  const [l, setL] = useState<string | null>(lgaId || null);
  useEffect(() => { loadGeo().then(setGeo).catch((e) => setErr(e.message)); }, []);
  return (
    <Modal title="Choose your birthplace on the map" onClose={onClose} wide footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!s || !l} onClick={() => { onPick(s!, l); onClose(); }}>Use {l ? LGA_BY_ID[l].name : "this place"}</Button></>}>
      {err ? <ErrorState message={err} /> : !geo ? <Spinner label="Loading map…" /> : (
        <>
          <div className="g-small g-muted">Click a state, then a local government area. Use the buttons to zoom.{s ? ` Selected: ${stateName(s)}${l ? ` › ${LGA_BY_ID[l].name}` : ""}` : ""}</div>
          <GeoMap geo={geo} selectedState={s} selectedLga={l} onSelectState={(id) => { setS(id); setL(null); }} onSelectLga={setL} fillState={(id) => (id === s ? "#cfe9dc" : "#9bb7d3")} fillLga={(id) => (id === l ? "#00c875" : "#bfe3d0")} height="min(56vh, 460px)" />
        </>
      )}
    </Modal>
  );
}

export function Create() {
  const { startNew, setScreen, busy, error } = useGame();
  const [step, setStep] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [lgaQuery, setLgaQuery] = useState("");
  const [cfg, setCfg] = useState<NewGameConfig>({
    name: "", female: false, birthStateId: "NG-LA", birthLgaId: "", startAge: 18, backgroundId: "middle", difficulty: "standard", bonus: {}, portrait: { skin: 3, hair: 0, style: 0, accent: 0 },
    path: {}, sandbox: { startingCash: 5_000_000, noScandals: false }, familyOverrides: {},
  });
  const [customFamily, setCustomFamily] = useState(false);
  const [seedText, setSeedText] = useState("");
  const upd = (p: Partial<NewGameConfig>) => setCfg((c) => ({ ...c, ...p }));
  const bg = BACKGROUND_BY_ID[cfg.backgroundId];
  const lgas = useMemo(() => LGAS_BY_STATE[cfg.birthStateId] ?? [], [cfg.birthStateId]);
  const filtered = useMemo(() => lgas.filter((l) => l.name.toLowerCase().includes(lgaQuery.toLowerCase())), [lgas, lgaQuery]);
  const spent = Object.values(cfg.bonus ?? {}).reduce((t, v) => t + (v ?? 0), 0);
  const errors = validateConfig(cfg);
  const birthYear = 2026 - cfg.startAge;

  const randomise = (all = true) => {
    const r = (n: number) => Math.floor(Math.random() * n);
    const st = STATES[r(STATES.length)];
    const l = LGAS_BY_STATE[st.id][r(LGAS_BY_STATE[st.id].length)];
    const bonus: Partial<Record<CoreAttr, number>> = {};
    let left = BONUS_POINTS;
    while (left > 0) { const k = ATTR_KEYS[r(ATTR_KEYS.length)]; if ((bonus[k] ?? 0) < MAX_BONUS_PER_ATTR) { bonus[k] = (bonus[k] ?? 0) + 1; left--; } }
    upd({ birthStateId: st.id, birthLgaId: l.id, backgroundId: BACKGROUNDS[r(BACKGROUNDS.length)].id, bonus, female: all ? r(2) === 1 : cfg.female, portrait: { skin: r(6), hair: r(4), style: r(4), accent: r(5) } });
  };

  const stepValid = (i: number) => {
    if (i === 0) return cfg.name.trim().length >= 2;
    if (i === 1) return !!cfg.birthLgaId && LGA_BY_ID[cfg.birthLgaId]?.stateId === cfg.birthStateId;
    return true;
  };

  const jobOptions = useMemo(() => {
    // a quick requirement check against a hypothetical player holding the chosen course
    const course = COURSES.find((c) => c.id === cfg.path?.courseId);
    const years = cfg.startAge - 18;
    const fake = { player: { education: { level: course && years >= course.years ? course.level : "secondary", certificates: course && years >= course.years ? ["SSCE", course.certificate, ...(course.followOn && years > course.years ? ["Called to the Bar (BL)"] : [])] : ["SSCE"], nysc: course && years > course.years ? "done" : "na" } } } as unknown as GameState;
    return JOBS.filter((j) => jobRequirements(fake, j.id).length === 0);
  }, [cfg.path?.courseId, cfg.startAge]);

  return (
    <div className="gm" style={{ minHeight: "100dvh" }}>
      <div className="g-content" style={{ maxWidth: 1020 }}>
        <div className="g-row g-between" style={{ marginBottom: 12 }}>
          <Button variant="ghost" onClick={() => setScreen("title")}><ArrowLeft size={18} /> Back</Button>
          <div className="g-page-title">Create your character</div>
          <Button size="sm" onClick={() => randomise(true)}><Dices size={16} /> Randomise</Button>
        </div>
        <ol className="g-row g-wrap" style={{ listStyle: "none", padding: 0, margin: "0 0 14px", gap: 6 }}>
          {STEPS.map((s, i) => (
            <li key={s}>
              <button className={`g-chip ${i === step ? "g-chip-on" : ""}`} onClick={() => (i <= step || stepValid(step)) && setStep(i)} aria-current={i === step ? "step" : undefined}>
                {i < step ? <Check size={12} style={{ verticalAlign: -1 }} /> : i + 1}. {s}
              </button>
            </li>
          ))}
        </ol>

        <div className="g-grid" style={{ gridTemplateColumns: "minmax(0,1fr) 300px", alignItems: "start" }}>
          <div className="g-col" style={{ gap: 14, gridColumn: "1 / -1" }}>
            <div className="g-grid create-grid" style={{ gridTemplateColumns: "minmax(0,1fr)", gap: 14 }}>
              {step === 0 && (
                <Card title="Who are you?">
                  <div className="g-col" style={{ gap: 14 }}>
                    <Field label="Full name" error={cfg.name && cfg.name.trim().length < 2 ? "Enter at least 2 characters" : undefined}>{(id) => <input id={id} className="g-input" value={cfg.name} maxLength={40} onChange={(e) => upd({ name: e.target.value })} placeholder="e.g. Amina Okonkwo" autoComplete="off" />}</Field>
                    <div className="g-grid g-grid-2">
                      <div className="g-field"><span className="g-label">Gender</span>
                        <div className="g-row">{[["Male", false], ["Female", true]].map(([l, v]) => <Button key={String(l)} className="g-grow" variant={cfg.female === v ? "navy" : "default"} onClick={() => upd({ female: v as boolean })} aria-pressed={cfg.female === v}>{String(l)}</Button>)}</div></div>
                      <Field label={`Starting age: ${cfg.startAge} (born around ${birthYear})`} help="The game starts in January 2026. At 18 you begin just after school; older starts skip ahead.">
                        {(id) => <input id={id} type="range" min={18} max={45} value={cfg.startAge} onChange={(e) => upd({ startAge: Number(e.target.value), path: Number(e.target.value) === 18 ? {} : cfg.path })} />}
                      </Field>
                    </div>
                    <div className="g-field"><span className="g-label">Portrait</span>
                      <div className="g-row g-wrap" style={{ gap: 18 }}>
                        <Portrait p={cfg.portrait!} size={84} name={cfg.name} />
                        <div className="g-col" style={{ gap: 8 }}>
                          {(["skin", "hair", "style", "accent"] as const).map((k) => (
                            <div key={k} className="g-row" style={{ gap: 6 }}>
                              <span className="g-tiny g-muted" style={{ width: 52 }}>{k === "accent" ? "outfit" : k}</span>
                              {Array.from({ length: PORTRAIT_OPTIONS[k] }, (_, i) => (
                                <button key={i} className="g-chip" aria-label={`${k} ${i + 1}`} aria-pressed={cfg.portrait![k] === i} style={{ width: 30, height: 30, padding: 0, background: k === "skin" ? PORTRAIT_OPTIONS.skinColors[i] : k === "accent" ? PORTRAIT_OPTIONS.accents[i] : undefined, borderWidth: cfg.portrait![k] === i ? 3 : 1, borderColor: cfg.portrait![k] === i ? "#0b1f36" : undefined }} onClick={() => upd({ portrait: { ...cfg.portrait!, [k]: i } })}>{k === "hair" || k === "style" ? i + 1 : ""}</button>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {step === 1 && (
                <Card title="Where were you born?" icon={<MapIcon size={16} />} action={<Button size="sm" onClick={() => setShowMap(true)}><MapIcon size={15} /> Pick on map</Button>}>
                  <div className="g-grid g-grid-2">
                    <Field label="State or FCT">{(id) => (
                      <select id={id} className="g-select" value={cfg.birthStateId} onChange={(e) => upd({ birthStateId: e.target.value, birthLgaId: "" })}>
                        {STATES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>)}</Field>
                    <Field label={`Local government area (${lgas.length})`} help={cfg.birthStateId === "NG-FC" ? "The FCT has six Area Councils." : undefined}>{(id) => (
                      <select id={id} className="g-select" value={cfg.birthLgaId} onChange={(e) => upd({ birthLgaId: e.target.value })}>
                        <option value="">Choose an LGA…</option>
                        {filtered.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>)}</Field>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <Field label="Search LGAs in this state">{(id) => <input id={id} className="g-input" placeholder="Type to filter…" value={lgaQuery} onChange={(e) => setLgaQuery(e.target.value)} />}</Field>
                  </div>
                  <div className="g-row g-wrap" style={{ marginTop: 10 }}>
                    <Button size="sm" onClick={() => { const l = lgas[Math.floor(Math.random() * lgas.length)]; upd({ birthLgaId: l.id }); }}><Dices size={14} /> Random LGA in {stateName(cfg.birthStateId)}</Button>
                    {cfg.birthLgaId && <Badge tone="green">{LGA_BY_ID[cfg.birthLgaId]?.name}, {stateName(cfg.birthStateId)}</Badge>}
                  </div>
                  <p className="g-help" style={{ marginTop: 10 }}>Your birthplace sets your starting constituency, local politics, cost of living and the people you grow up around. Boundary data is real; local indicators are simulated.</p>
                </Card>
              )}

              {step === 2 && (
                <Card title="Family background" action={<Button size="sm" onClick={() => upd({ backgroundId: BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)].id })}><Dices size={14} /> Random</Button>}>
                  <div className="g-grid g-grid-2" role="radiogroup" aria-label="Family background">
                    {BACKGROUNDS.map((b) => (
                      <button key={b.id} role="radio" aria-checked={cfg.backgroundId === b.id} onClick={() => upd({ backgroundId: b.id })} className="g-card-flat" style={{ textAlign: "left", cursor: "pointer", borderColor: cfg.backgroundId === b.id ? "#00c875" : undefined, borderWidth: cfg.backgroundId === b.id ? 2 : 1, background: cfg.backgroundId === b.id ? "#f1fcf7" : undefined }}>
                        <div className="g-row g-between"><b>{b.label}</b>{cfg.backgroundId === b.id && <Check size={16} color="#00a862" />}</div>
                        <div className="g-small g-muted" style={{ margin: "4px 0 8px" }}>{b.blurb}</div>
                        <div className="g-row g-wrap" style={{ gap: 6 }}>
                          <Badge tone="blue">Cash {naira(b.cash + b.savings, true)}</Badge>
                          <Badge>Money {"●".repeat(b.wealthTier + 1)}</Badge>
                          <Badge tone="green">Political ties {"●".repeat(b.politicalTies + 1)}</Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <b className="g-small">Challenges you will face</b>
                    <ul className="g-small g-muted" style={{ margin: "4px 0 0 18px" }}>{bg.challenges.map((c) => <li key={c}>{c}</li>)}</ul>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label className="g-row g-small"><input type="checkbox" checked={customFamily} onChange={(e) => { setCustomFamily(e.target.checked); if (!e.target.checked) upd({ familyOverrides: {} }); }} /> Customise family wealth and political ties</label>
                    {customFamily && (
                      <div className="g-grid g-grid-2" style={{ marginTop: 8 }}>
                        <Field label={`Family wealth: ${cfg.familyOverrides?.wealthTier ?? bg.wealthTier} / 4`}>{(id) => <input id={id} type="range" min={0} max={4} value={cfg.familyOverrides?.wealthTier ?? bg.wealthTier} onChange={(e) => upd({ familyOverrides: { ...cfg.familyOverrides, wealthTier: Number(e.target.value) } })} />}</Field>
                        <Field label={`Political ties: ${cfg.familyOverrides?.politicalTies ?? bg.politicalTies} / 4`}>{(id) => <input id={id} type="range" min={0} max={4} value={cfg.familyOverrides?.politicalTies ?? bg.politicalTies} onChange={(e) => upd({ familyOverrides: { ...cfg.familyOverrides, politicalTies: Number(e.target.value) } })} />}</Field>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {step === 3 && (
                <div className="g-col">
                  <Card title={`Strengths — ${BONUS_POINTS - spent} points left`} action={<Button size="sm" variant="ghost" onClick={() => upd({ bonus: {} })}>Reset</Button>}>
                    <p className="g-small g-muted" style={{ marginBottom: 8 }}>Every strength matters somewhere: communication wins debates, negotiation builds coalitions, financial management keeps a campaign solvent. Your family background adjusts the base values.</p>
                    <div className="g-grid g-grid-2">
                      {ATTR_KEYS.map((k) => {
                        const v = cfg.bonus?.[k] ?? 0;
                        const base = 40 + (bg.attrMods[k] ?? 0);
                        return (
                          <div key={k} className="g-card-flat">
                            <div className="g-row g-between"><b className="g-small">{ATTR_INFO[k].label}</b><span className="g-num g-small"><b>{base + v}</b> <span className="g-muted">(+{v})</span></span></div>
                            <div className="g-tiny g-muted" style={{ margin: "2px 0 8px" }}>{ATTR_INFO[k].help}</div>
                            <div className="g-row">
                              <Button size="sm" aria-label={`Decrease ${ATTR_INFO[k].label}`} disabled={v <= 0} onClick={() => upd({ bonus: { ...cfg.bonus, [k]: v - 1 } })}><Minus size={14} /></Button>
                              <div className="g-bar g-grow"><span style={{ width: `${Math.min(100, base + v)}%` }} /></div>
                              <Button size="sm" aria-label={`Increase ${ATTR_INFO[k].label}`} disabled={spent >= BONUS_POINTS || v >= MAX_BONUS_PER_ATTR} onClick={() => upd({ bonus: { ...cfg.bonus, [k]: v + 1 } })}><Plus size={14} /></Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                  {cfg.startAge > 18 && (
                    <Card title={`Your life from 18 to ${cfg.startAge}`}>
                      <p className="g-small g-muted" style={{ marginBottom: 8 }}>You are starting older, so tell us what you did since leaving school.</p>
                      <div className="g-grid g-grid-2">
                        <Field label="Studies">{(id) => (
                          <select id={id} className="g-select" value={cfg.path?.courseId ?? ""} onChange={(e) => upd({ path: { ...cfg.path, courseId: e.target.value || undefined, jobId: undefined } })}>
                            <option value="">No further studies</option>
                            {COURSES.filter((c) => c.level !== "masters" && c.id !== "law_school").map((c) => <option key={c.id} value={c.id}>{c.label} ({c.years} yrs)</option>)}
                          </select>)}</Field>
                        <Field label="Current occupation">{(id) => (
                          <select id={id} className="g-select" value={cfg.path?.jobId ?? ""} onChange={(e) => upd({ path: { ...cfg.path, jobId: e.target.value || undefined } })}>
                            <option value="">None yet</option>
                            {jobOptions.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}
                          </select>)}</Field>
                      </div>
                      <p className="g-help" style={{ marginTop: 8 }}>Only occupations your education qualifies you for are listed. If you are still studying at your age, you start mid-programme.</p>
                    </Card>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="g-col">
                  <Card title="Difficulty">
                    <div className="g-grid g-grid-3" role="radiogroup" aria-label="Difficulty">
                      {([["standard", "Standard", "A realistic challenge. Resources are modest and rivals are capable."], ["challenging", "Challenging", "Tighter money, stronger rivals, less forgiving investigations."], ["sandbox", "Sandbox", "Experiment: extra cash and optional switches. Rules stay coherent."]] as const).map(([id, l, d]) => (
                        <button key={id} role="radio" aria-checked={cfg.difficulty === id} onClick={() => upd({ difficulty: id })} className="g-card-flat" style={{ textAlign: "left", cursor: "pointer", borderColor: cfg.difficulty === id ? "#00c875" : undefined, borderWidth: cfg.difficulty === id ? 2 : 1 }}>
                          <b>{l}</b><div className="g-small g-muted">{d}</div>
                        </button>
                      ))}
                    </div>
                    {cfg.difficulty === "sandbox" && (
                      <div className="g-grid g-grid-2" style={{ marginTop: 10 }}>
                        <Field label="Extra starting cash (₦)">{(id) => <input id={id} className="g-input" type="number" min={0} step={500000} value={cfg.sandbox?.startingCash ?? 0} onChange={(e) => upd({ sandbox: { ...cfg.sandbox, startingCash: Math.max(0, Number(e.target.value)) } })} />}</Field>
                        <label className="g-row g-small" style={{ alignSelf: "end" }}><input type="checkbox" checked={!!cfg.sandbox?.noScandals} onChange={(e) => upd({ sandbox: { ...cfg.sandbox, noScandals: e.target.checked } })} /> Disable investigations (sandbox only)</label>
                      </div>
                    )}
                  </Card>
                  <Card title="Your story begins">
                    <div className="g-row g-wrap" style={{ gap: 16 }}>
                      <Portrait p={cfg.portrait!} size={72} name={cfg.name} />
                      <div className="g-grow">
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{cfg.name || "Unnamed"}</div>
                        <div className="g-small g-muted">{cfg.female ? "Female" : "Male"}, {cfg.startAge} · born {cfg.birthLgaId ? `${LGA_BY_ID[cfg.birthLgaId].name}, ${stateName(cfg.birthStateId)}` : "—"}</div>
                        <div className="g-small g-muted">{bg.label} · starting cash {naira(bg.cash + bg.savings)}</div>
                      </div>
                    </div>
                    <details style={{ marginTop: 10 }}>
                      <summary className="g-small g-muted" style={{ cursor: "pointer" }}>Advanced: world seed</summary>
                      <Field label="Seed (same seed + same choices = same world)" help="Leave blank for a random world.">{(id) => <input id={id} className="g-input" value={seedText} onChange={(e) => { setSeedText(e.target.value); const n = Number(e.target.value); upd({ seed: e.target.value && Number.isFinite(n) ? Math.abs(Math.floor(n)) : undefined }); }} inputMode="numeric" />}</Field>
                    </details>
                  </Card>
                  {errors.length > 0 && <Callout tone="warn">{errors.join(" ")}</Callout>}
                  {error && <ErrorState message={error} />}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="g-row g-between" style={{ marginTop: 16 }}>
          <Button disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Previous</Button>
          {step < STEPS.length - 1 ? (
            <Button variant="primary" disabled={!stepValid(step)} onClick={() => setStep(step + 1)}>Continue <ArrowRight size={16} /></Button>
          ) : (
            <Button variant="primary" disabled={errors.length > 0 || busy} onClick={() => void startNew(cfg)}>{busy ? "Building your Nigeria…" : "Start my life"} <ArrowRight size={16} /></Button>
          )}
        </div>
      </div>
      {showMap && <MapPicker stateId={cfg.birthStateId} lgaId={cfg.birthLgaId} onClose={() => setShowMap(false)} onPick={(s, l) => upd({ birthStateId: s, birthLgaId: l ?? "" })} />}
    </div>
  );
}
void ADMIN_LGAS;
