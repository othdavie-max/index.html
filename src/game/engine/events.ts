/**
 * Event engine. Reads the declarative library in data/events.ts and the live game state:
 *   1. condition evaluation  → which events are *eligible* (state-driven, not random alone)
 *   2. seeded probability    → controlled randomness (weight × condition modifiers)
 *   3. effects               → real changes to economy, indicators, satisfaction, player and government
 *   4. AI response rules     → what non-player officials do about it
 *   5. player decisions      → pending choices when the player is the responsible official (or it is personal)
 * Occurrence ids are `${eventId}@${month}@${scope}` and are recorded in `state.processed`, so re-processing a month
 * can never create the same occurrence twice.
 */
import type { GameState, EventOccurrence, PendingDecision, StateId, LgaId, ActiveEffect, AttrKey } from "./types";
import { INDICATORS } from "./types";
import { EVENTS, EVENT_BY_ID } from "../data/events";
import type { Cond, Effect, EventDef, Choice } from "../data/eventTypes";
import { subRng, clamp, clamp100 } from "./rng";
import type { Rng } from "./rng";
import { pushNews, notify, careerLog } from "./news";
import { once } from "./ids";
import { addShock } from "./economy";
import { credit, debit, canAfford } from "./finance";
import { playerAge, calendarMonth } from "./calendar";
import { flagActive, setFlag, holderOf, playerSeat, priceLevel, playerOffice } from "./queries";
import { stateName, lgaName } from "./admin";
import { JOB_BY_ID, BUSINESS_BY_ID } from "../data/life";
import { startScheme } from "./corruption";
import { adjustRelation } from "./relationships";

// ---------------------------------------------------------------- condition evaluation
interface Scope { stateId?: StateId; lgaId?: LgaId }

function getPath(state: GameState, scope: Scope, path: string): number {
  const [root, key] = path.split(".");
  const p = state.player;
  switch (root) {
    case "eco": {
      const v = (state.economy as unknown as Record<string, unknown>)[key];
      return typeof v === "number" ? v : 0;
    }
    case "s": {
      const st = scope.stateId ? state.states[scope.stateId] : null;
      if (!st) return 0;
      if (key === "satisfaction") return st.satisfaction;
      if (key === "floodRisk") return st.floodRisk;
      if (key === "incidents") return st.incidents;
      return (st.indicators as unknown as Record<string, number>)[key] ?? 0;
    }
    case "l": {
      const l = scope.lgaId ? state.lgas[scope.lgaId] : null;
      return l ? (l.indicators as unknown as Record<string, number>)[key] ?? 0 : 0;
    }
    case "cal":
      return calendarMonth(state);
    case "p": {
      switch (key) {
        case "age": return playerAge(state);
        case "cash": return p.finances.cash + p.finances.savings;
        case "fame": return Math.max(p.fame.national, ...Object.values(p.fame.lgas), ...Object.values(p.fame.states), 0);
        case "student": return p.occupation.kind === "student" ? 1 : 0;
        case "business": return p.business ? 1 : 0;
        case "contractor": return p.business && BUSINESS_BY_ID[p.business.typeId]?.contractor ? 1 : 0;
        case "employedPrivate": {
          const j = p.occupation.jobId ? JOB_BY_ID[p.occupation.jobId] : null;
          return p.occupation.kind === "employed" && j && (j.sector === "private" || j.sector === "professional") ? 1 : 0;
        }
        case "hasParty": return p.politics.membership ? 1 : 0;
        case "campaigning": return p.politics.candidacies.some((c) => c.stage === "nominee") ? 1 : 0;
        case "stress": return p.attrs.stress;
        case "exposure": return p.integrity.exposure;
        default: return (p.attrs as unknown as Record<string, number>)[key] ?? 0;
      }
    }
    default:
      return 0;
  }
}

export function evalCond(state: GameState, scope: Scope, c: Cond | undefined): boolean {
  if (!c) return true;
  switch (c.k) {
    case "num": {
      const v = getPath(state, scope, c.path);
      switch (c.op) {
        case ">": return v > c.value;
        case "<": return v < c.value;
        case ">=": return v >= c.value;
        case "<=": return v <= c.value;
        case "==": return v === c.value;
        case "!=": return v !== c.value;
      }
      return false;
    }
    case "all": return c.of.every((x) => evalCond(state, scope, x));
    case "any": return c.of.some((x) => evalCond(state, scope, x));
    case "not": return !evalCond(state, scope, c.of);
    case "month": return c.in.includes(calendarMonth(state));
  }
}

// ---------------------------------------------------------------- effects
function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

export function applyEffect(state: GameState, e: Effect, scope: Scope, occId: string, idx: number): void {
  const m = state.clock.monthIndex;
  switch (e.t) {
    case "econ":
      addShock(state.economy, { id: `${occId}#${idx}`, key: e.key, amount: e.amount, months: e.months, source: occId, mode: e.mode });
      break;
    case "ind": {
      if (e.over && e.over > 0) {
        pushActive(state, { target: e.target === "all" ? "national" : scope.lgaId ? "state" : "state", targetId: e.target === "all" ? undefined : scope.lgaId ?? scope.stateId, stat: `ind:${e.stat}`, perMonth: e.delta / e.over, remaining: e.over, label: occId }, occId, idx);
      } else applyIndicator(state, e.stat, e.delta, e.target === "all" ? null : scope);
      break;
    }
    case "sat": {
      if (e.over && e.over > 0) {
        pushActive(state, { target: e.target === "all" ? "national" : "state", targetId: e.target === "all" ? undefined : scope.stateId, stat: "sat", perMonth: e.delta / e.over, remaining: e.over, label: occId }, occId, idx);
      } else applySat(state, e.delta, e.target === "all" ? null : scope);
      break;
    }
    case "player": {
      const a = state.player.attrs;
      if (e.stat === "fame") {
        state.player.fame.national = clamp100(state.player.fame.national + e.delta * 0.3);
        const l = state.player.residenceLgaId, s = state.player.residenceStateId;
        state.player.fame.lgas[l] = clamp100((state.player.fame.lgas[l] ?? 0) + e.delta);
        state.player.fame.states[s] = clamp100((state.player.fame.states[s] ?? 0) + e.delta * 0.5);
      } else if (e.stat === "capital") state.player.politics.capital = clamp100(state.player.politics.capital + e.delta);
      else if (e.stat === "trust") state.player.integrity.publicTrust = clamp100(state.player.integrity.publicTrust + e.delta);
      else {
        const k = e.stat as AttrKey;
        a[k] = clamp100((a[k] ?? 0) + e.delta);
      }
      break;
    }
    case "cash": {
      const amt = Math.round(e.amount * priceLevel(state));
      if (amt >= 0) credit(state, "other", amt, e.label);
      else debit(state, "other", -amt, e.label, { mandatory: true });
      break;
    }
    case "govcost":
      chargeGovernment(state, scope, e.amountM * priceLevel(state), e.label);
      break;
    case "flag":
      setFlag(state, `${occId.split("@")[0]}:${e.name}`, e.months);
      setFlag(state, e.name, e.months);
      break;
    case "incidents":
      if (scope.stateId) state.states[scope.stateId].incidents = clamp100(state.states[scope.stateId].incidents + e.delta);
      break;
    case "momentum": {
      for (const p of Object.values(state.parties)) {
        if (!p.exists) continue;
        const ruling = p.inPower;
        if ((e.who === "ruling" && ruling) || (e.who === "opposition" && !ruling)) p.momentum = clamp(p.momentum + e.delta, -1, 1);
      }
      break;
    }
    case "edu_delay": {
      const en = state.player.education.enrolled;
      if (en && (state.player.education.institutionType === "federal" || state.player.education.institutionType === "state")) {
        en.monthsRemaining += e.months;
        en.delayed += e.months;
        notify(state, `A strike will delay your graduation by about ${e.months} months.`, "warn");
      }
      break;
    }
    case "layoff": {
      const o = state.player.occupation;
      if (o.kind === "employed") {
        careerLog(state, `Retrenched from ${o.title}.`);
        state.player.occupation = { kind: "unemployed", jobId: null, title: "Unemployed", baseSalary: 0, since: m, grade: 0, timePct: 0 };
        notify(state, "You were retrenched. You are now looking for work.", "bad");
      }
      break;
    }
    case "relation":
      // party_leader / local_chair / governor relationships are adjusted via the chars holding those posts
      adjustWho(state, e.who, e.delta);
      break;
    case "approval":
      state.government.approval = clamp100(state.government.approval + e.delta);
      break;
    case "support":
      state.government.legislativeSupport = clamp100(state.government.legislativeSupport + e.delta);
      break;
  }
}

function adjustWho(state: GameState, who: "party_leader" | "local_chair" | "governor", delta: number) {
  if (delta === 0) return;
  let cid: string | null = null;
  if (who === "party_leader") cid = state.player.politics.membership ? state.parties[state.player.politics.membership.partyId]?.chairId ?? null : null;
  if (who === "local_chair") cid = holderOf(state, `lgc:${state.player.residenceLgaId}`)?.id ?? null;
  if (who === "governor") cid = holderOf(state, state.states[state.player.residenceStateId]?.governorSeatId)?.id ?? null;
  if (cid) adjustRelation(state, cid, delta, who === "governor" ? "associate" : who === "party_leader" ? "party" : "associate");
}

function pushActive(state: GameState, a: Omit<ActiveEffect, "id" | "eventId" | "occurrenceId">, occId: string, idx: number) {
  const id = `${occId}#fx${idx}`;
  if (state.activeEffects.some((x) => x.id === id)) return;
  state.activeEffects.push({ ...a, id, eventId: occId.split("@")[0], occurrenceId: occId });
}

export function applyIndicator(state: GameState, stat: (typeof INDICATORS)[number], delta: number, scope: Scope | null) {
  if (scope?.lgaId) {
    const l = state.lgas[scope.lgaId];
    l.indicators[stat] = clamp(l.indicators[stat] + delta, 3, 97);
    return;
  }
  if (scope?.stateId) {
    const s = state.states[scope.stateId];
    s.indicators[stat] = clamp(s.indicators[stat] + delta, 3, 97);
    for (const id of s.lgaIds) state.lgas[id].indicators[stat] = clamp(state.lgas[id].indicators[stat] + delta, 3, 97);
    return;
  }
  for (const s of Object.values(state.states)) {
    s.indicators[stat] = clamp(s.indicators[stat] + delta, 3, 97);
  }
  for (const l of Object.values(state.lgas)) l.indicators[stat] = clamp(l.indicators[stat] + delta, 3, 97);
}
function applySat(state: GameState, delta: number, scope: Scope | null) {
  if (scope?.stateId) {
    const s = state.states[scope.stateId];
    s.satisfaction = clamp(s.satisfaction + delta, 3, 97);
  } else if (scope?.lgaId) {
    const s = state.states[state.lgas[scope.lgaId] ? stateOfLga(scope.lgaId) : ""];
    if (s) s.satisfaction = clamp(s.satisfaction + delta * 0.5, 3, 97);
  } else {
    state.economy.satisfaction = clamp(state.economy.satisfaction + delta, 3, 97);
    for (const s of Object.values(state.states)) s.satisfaction = clamp(s.satisfaction + delta * 0.7, 3, 97);
  }
}
function stateOfLga(lgaId: string): string {
  return lgaId.split("-").slice(0, 2).join("-");
}

/** Government spending charged to the jurisdiction's treasury (NEVER personal funds). */
export function chargeGovernment(state: GameState, scope: Scope, amountM: number, label: string) {
  const seat = playerSeat(state);
  const office = playerOffice(state);
  void seat;
  if (office === "president" || (!scope.stateId && !scope.lgaId)) {
    state.economy.treasuryBn -= amountM / 1000;
    state.government.actions.push({ m: state.clock.monthIndex, text: `${label}: ₦${Math.round(amountM).toLocaleString()}m from the federal treasury` });
    return;
  }
  const sid = scope.stateId ?? (scope.lgaId ? stateOfLga(scope.lgaId) : null);
  if (!sid) return;
  const st = state.states[sid];
  st.treasuryM -= amountM;
  if (st.treasuryM < -st.revenueMonthlyM * 6) {
    st.debtM += amountM * 0.5; // overdrawn treasuries borrow
    st.treasuryM += amountM * 0.5;
  }
  const isPlayerJurisdiction = (office === "governor" && playerSeat(state)?.stateId === sid) || (office === "lg_chair" && scope.lgaId && playerSeat(state)?.lgaIds[0] === scope.lgaId);
  if (isPlayerJurisdiction) state.government.actions.push({ m: state.clock.monthIndex, text: `${label}: ₦${Math.round(amountM).toLocaleString()}m from the treasury` });
}

// ---------------------------------------------------------------- monthly processing
function responsibleChar(state: GameState, def: EventDef, scope: Scope) {
  if (def.responsible === "president") return holderOf(state, "pres");
  if (def.responsible === "governor" && scope.stateId) return holderOf(state, state.states[scope.stateId].governorSeatId);
  if (def.responsible === "lg_chair" && scope.lgaId) return holderOf(state, `lgc:${scope.lgaId}`);
  return null;
}

function playerIsResponsible(state: GameState, def: EventDef, scope: Scope): boolean {
  const c = responsibleChar(state, def, scope);
  return !!c && c.seatId !== null && state.seats[c.seatId]?.holderId === c.id && state.player.politics.seatId === c.seatId;
}

interface Candidate { def: EventDef; scope: Scope; scopeId: string | null; roll: number }

function weightOf(state: GameState, def: EventDef, scope: Scope): number {
  let w = def.weight;
  for (const m of def.weightMods ?? []) if (evalCond(state, scope, m.cond)) w *= m.mult;
  if (def.id === "anticorruption_sweep" || def.id === "investigative_series") return w;
  return w;
}

export function processEvents(state: GameState): void {
  if (!once(state, "events")) return;
  const m = state.clock.monthIndex;
  // 1. lingering effects
  applyActiveEffects(state);

  const rng = subRng(state.meta.seed, "events", m);
  const cands: Candidate[] = [];
  const cooldownOk = (def: EventDef, scopeId: string | null) => (state.eventCooldowns[`${def.id}:${scopeId ?? ""}`] ?? -1) <= m;

  for (const def of EVENTS) {
    if (def.scope === "national") {
      if (!cooldownOk(def, null) || !evalCond(state, {}, def.when)) continue;
      if (rng.next() < weightOf(state, def, {})) cands.push({ def, scope: {}, scopeId: null, roll: rng.next() });
    } else if (def.scope === "state") {
      for (const id of Object.keys(state.states)) {
        const sc = { stateId: id };
        if (!cooldownOk(def, id) || !evalCond(state, sc, def.when)) continue;
        if (rng.next() < weightOf(state, def, sc)) cands.push({ def, scope: sc, scopeId: id, roll: rng.next() });
      }
    } else if (def.scope === "lga") {
      for (const id of Object.keys(state.lgas)) {
        const sc = { lgaId: id, stateId: stateOfLga(id) };
        if (!cooldownOk(def, id) || !evalCond(state, sc, def.when)) continue;
        if (rng.next() < weightOf(state, def, sc)) cands.push({ def, scope: sc, scopeId: id, roll: rng.next() });
      }
    } else {
      const sc = { stateId: state.player.residenceStateId, lgaId: state.player.residenceLgaId };
      if (!cooldownOk(def, null) || !evalCond(state, sc, def.when) || !evalCond(state, sc, def.personalFor)) continue;
      if (rng.next() < weightOf(state, def, sc)) cands.push({ def, scope: sc, scopeId: null, roll: rng.next() });
    }
  }

  // 2. soft caps: most severe first, with a cap per layer
  cands.sort((a, b) => b.def.severity - a.def.severity || a.roll - b.roll);
  const caps = { national: 2, state: 4, lga: 2, personal: 2 };
  const used = { national: 0, state: 0, lga: 0, personal: 0 };
  for (const c of cands) {
    if (used[c.def.scope] >= caps[c.def.scope]) continue;
    // never stack more than 2 unresolved decisions on the player
    if (c.def.choices && state.pending.length >= 2 && (c.def.scope === "personal" || playerIsResponsible(state, c.def, c.scope))) continue;
    if (fireEvent(state, c.def, c.scope, c.scopeId, rng)) used[c.def.scope]++;
  }
}

function applyActiveEffects(state: GameState) {
  for (const a of state.activeEffects) {
    if (a.remaining <= 0) continue;
    if (a.stat.startsWith("ind:")) {
      const stat = a.stat.slice(4) as (typeof INDICATORS)[number];
      if (a.target === "national") applyIndicator(state, stat, a.perMonth, null);
      else if (a.targetId && a.targetId.split("-").length > 2) applyIndicator(state, stat, a.perMonth, { lgaId: a.targetId });
      else if (a.targetId) applyIndicator(state, stat, a.perMonth, { stateId: a.targetId });
    } else if (a.stat === "sat") {
      applySat(state, a.perMonth, a.target === "national" ? null : { stateId: a.targetId });
    }
    a.remaining -= 1;
  }
  state.activeEffects = state.activeEffects.filter((a) => a.remaining > 0);
}

function fireEvent(state: GameState, def: EventDef, scope: Scope, scopeId: string | null, rng: Rng): boolean {
  const m = state.clock.monthIndex;
  const occId = `${def.id}@${m}@${scopeId ?? "player"}`;
  if (state.processed[`ev:${occId}`]) return false; // never create the same occurrence twice
  state.processed[`ev:${occId}`] = true;
  state.eventCooldowns[`${def.id}:${scopeId ?? ""}`] = m + def.cooldown;

  const vars: Record<string, string> = {
    state: scope.stateId ? stateName(scope.stateId) : "Nigeria",
    lga: scope.lgaId ? lgaName(scope.lgaId) : "",
  };
  const occ: EventOccurrence = {
    id: occId, defId: def.id, month: m, scopeId, title: fill(def.title, vars), text: fill(def.text, vars), severity: def.severity, resolved: !def.choices,
  };
  state.eventLog.push(occ);
  if (state.eventLog.length > 1500) state.eventLog.splice(0, state.eventLog.length - 1500);

  const isPlayerTurn = def.choices && (def.scope === "personal" || playerIsResponsible(state, def, scope));

  // immediate effects (the baseline consequences always apply)
  def.immediate.forEach((e, i) => applyEffect(state, e, scope, occId, i));
  (def.longTerm ?? []).forEach((e, i) => applyEffect(state, e, scope, occId, 100 + i));

  // news (from this very occurrence)
  const headline = def.headline ? fill(def.headline, vars) : "";
  if (headline) {
    pushNews(state, {
      headline, body: occ.text, topic: def.topic === "personal" ? "personal" : def.topic === "corruption" ? "corruption" : def.topic === "local" ? "local" : def.topic,
      importance: def.severity >= 4 ? 3 : def.severity >= 3 ? 2 : 1, stateId: scope.stateId ?? null, source: occId,
      personal: scope.stateId === state.player.residenceStateId && (def.scope === "state" || def.scope === "lga") ? true : false,
    });
  }

  if (def.scope === "personal") {
    if (!def.choices) {
      notify(state, `${occ.title}: ${occ.text}`, def.severity >= 3 ? "bad" : "info");
      careerLog(state, occ.title);
      if (def.id === "party_invite") setFlag(state, "party_invite", 6);
    }
  }

  if (isPlayerTurn && def.choices) {
    const pd: PendingDecision = {
      occurrenceId: occId, defId: def.id, title: occ.title, text: occ.text, scopeId,
      choices: def.choices.map((c) => ({ id: c.id, label: c.label, desc: c.desc, costText: costText(c), disabledReason: choiceDisabledReason(state, c, scope), risk: riskText(c) })),
      deadline: m + 1, defaultChoiceId: def.defaultChoice ?? def.choices[0].id,
    };
    state.pending.push(pd);
    notify(state, `Decision needed: ${occ.title}`, "warn");
  } else if (def.choices && def.scope !== "personal") {
    // AI official responds (or doesn't) according to the rule and their competence
    runAiResponse(state, def, scope, occId, rng);
  } else if (def.choices && def.scope === "personal") {
    // personal choice event but not player's turn cannot happen
  }
  if (def.scope !== "personal" && !def.choices) runAiResponse(state, def, scope, occId, rng);
  return true;
}

function runAiResponse(state: GameState, def: EventDef, scope: Scope, occId: string, rng: Rng) {
  for (const [i, r] of (def.aiResponse ?? []).entries()) {
    const who = responsibleChar(state, { ...def, responsible: r.by }, scope);
    if (!who) continue;
    if (state.player.politics.seatId && who.seatId === state.player.politics.seatId) continue; // the player decides for themselves
    if (!evalCond(state, scope, r.if)) continue;
    const p = clamp(r.p * (0.55 + who.attrs.competence / 100 * 0.9), 0.05, 0.95);
    if (!rng.chance(p)) continue;
    r.effects.forEach((e, j) => applyEffect(state, e, scope, `${occId}:ai${i}`, j));
    who.record.push({ m: state.clock.monthIndex, text: fill(r.text, { name: who.name }) });
    pushNews(state, {
      headline: fill(r.text, { name: who.name }), topic: def.scope === "lga" ? "local" : r.by === "president" ? "national" : "state",
      importance: 1, stateId: scope.stateId ?? null, source: `${occId}:ai${i}`, personal: false,
    });
  }
}

function riskText(c: Choice): string | undefined {
  if (c.scheme) return "Unlawful. It leaves evidence that can later trigger media scrutiny, audits or prosecution.";
  if (c.check) return `Uncertain: the outcome depends on your ${c.check.attr.replace(/([A-Z])/g, " $1").toLowerCase()} and chance.`;
  return undefined;
}
function costText(c: Choice): string | undefined {
  const parts: string[] = [];
  if (c.cost?.cash) parts.push(`₦${c.cost.cash.toLocaleString()}`);
  if (c.cost?.capital) parts.push(`${c.cost.capital} political capital`);
  return parts.length ? parts.join(" + ") : undefined;
}
function choiceDisabledReason(state: GameState, c: Choice, scope: Scope): string | undefined {
  if (c.cost?.cash && !canAfford(state, Math.round(c.cost.cash * priceLevel(state)))) return "You can't afford this";
  if (c.cost?.capital && state.player.politics.capital < c.cost.capital) return "Not enough political capital";
  if (c.requires && !evalCond(state, scope, c.requires)) return "Requirements not met";
  return undefined;
}

/** Resolve a pending decision. Returns a result message. */
export function resolveDecision(state: GameState, occurrenceId: string, choiceId: string): string {
  const idx = state.pending.findIndex((p) => p.occurrenceId === occurrenceId);
  if (idx < 0) return "That decision is no longer pending.";
  const pd = state.pending[idx];
  const def = EVENT_BY_ID[pd.defId];
  const choice = def.choices?.find((c) => c.id === choiceId);
  if (!choice) return "Unknown choice.";
  const occ = state.eventLog.find((o) => o.id === occurrenceId);
  const scope: Scope = def.scope === "state" ? { stateId: pd.scopeId ?? undefined } : def.scope === "lga" ? { lgaId: pd.scopeId ?? undefined, stateId: pd.scopeId ? stateOfLga(pd.scopeId) : undefined } : { stateId: state.player.residenceStateId, lgaId: state.player.residenceLgaId };
  const why = choiceDisabledReason(state, choice, scope);
  if (why) return why;
  if (choice.cost?.cash) debit(state, "other", Math.round(choice.cost.cash * priceLevel(state)), `${def.title}: ${choice.label}`, { mandatory: true });
  if (choice.cost?.capital) state.player.politics.capital = clamp100(state.player.politics.capital - choice.cost.capital);
  let text = choice.resultText ?? `You chose: ${choice.label}.`;
  (choice.effects ?? []).forEach((e, i) => applyEffect(state, e, scope, `${occurrenceId}:c`, i));
  if (choice.check) {
    const rng = subRng(state.meta.seed, "decision", occurrenceId, choiceId);
    const attr = state.player.attrs[choice.check.attr] ?? 50;
    const p = clamp(attr / 100 + 0.25 - choice.check.difficulty, 0.05, 0.95);
    const ok = rng.chance(p);
    (ok ? choice.check.success : choice.check.fail).forEach((e, i) => applyEffect(state, e, scope, `${occurrenceId}:chk`, i));
    text = ok ? choice.check.successText : choice.check.failText;
  }
  if (choice.scheme) {
    startScheme(state, { ...choice.scheme, label: `${def.title}: ${choice.label}`, officeId: playerSeat(state)?.id ?? null });
    text = `${text} You pocketed a gain — but not without a trail.`;
  }
  if (occ) {
    occ.resolved = true;
    occ.choiceId = choiceId;
  }
  state.pending.splice(idx, 1);
  careerLog(state, `${def.title}: ${choice.label}`);
  return text;
}

/** Pending decisions whose deadline passed take their default (called when time advances). */
export function expirePending(state: GameState): void {
  for (const pd of [...state.pending]) {
    if (pd.deadline < state.clock.monthIndex) {
      const def = EVENT_BY_ID[pd.defId];
      const choice = def.choices?.find((c) => c.id === pd.defaultChoiceId);
      if (choice && !choiceDisabledReason(state, choice, {})) resolveDecision(state, pd.occurrenceId, choice.id);
      else {
        // fall back to the first free choice
        const free = def.choices?.find((c) => !choiceDisabledReason(state, c, {}));
        if (free) resolveDecision(state, pd.occurrenceId, free.id);
        else state.pending = state.pending.filter((p) => p.occurrenceId !== pd.occurrenceId);
      }
    }
  }
}

export { flagActive };
void clamp100;
