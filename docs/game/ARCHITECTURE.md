# Architecture

```
src/game/
  data/        content & rules (no logic): states, versioned ruleset, parties, names, life, events, policies, generated/admin.json
  engine/      the simulation — pure TypeScript, no React, no browser APIs
  persistence/ save format (validate/migrate) + IndexedDB/localStorage/memory backends
  ui/          React screens and the store (UI ↔ engine bridge) — no game rules here
  tests/       vitest unit, integration and regression tests
public/game/geo.json     SVG boundary geometry (fetched by the map; cached offline)
public/game-sw.js        offline service worker
scripts/build-geo.mjs    reproducible, checksum-verified geo pipeline
```

## Layering rules

1. **Data** holds content. New parties, events, policies, rulesets or scenarios are data changes.
2. **Engine** never imports from `ui/` or `persistence/`. It exposes: `createNewGame`, `advanceMonth` (`turn.ts`),
   `perform(state, action)` (`actions.ts`) and read-only views (`insights.ts`, `queries.ts`).
3. **UI** reads state and dispatches `GameAction`s; it never computes game outcomes. Derived numbers shown on screen
   come from engine functions (e.g. `playerPrimaryBreakdown`, `pollContest`, `partyOfficeChance`).
4. **Persistence** stores one JSON document (`GameState`) in an envelope with `format` and `simVersion`.

## Modules (engine)

| Module | Responsibility |
|---|---|
| `rng.ts` | seeded mulberry32; `subRng(seed, …keys)` gives per-system, per-month streams so order never matters |
| `calendar.ts`, `turn.ts` | monthly clock; fixed processing order; `processedThrough` + `once()` guards |
| `world.ts`, `geometry.ts` | geography state, party affinities, constituencies (recursive bisection), seats, AI politicians |
| `economy.ts` | macro model (documented formulas, unit-tested bounds and shock behaviour) |
| `finance.ts` | the only way personal money moves; every entry has a category and label |
| `life.ts`, `education.ts` | living costs, income, business, study, NYSC, commitments, stress, health |
| `politics.ts`, `eligibility.ts` | parties, posts, defection, founding, seat succession; data-driven eligibility |
| `elections.ts`, `electionModel.ts`, `campaign.ts` | lifecycle and scheduling; the voting model; the player's primary/campaign |
| `ai.ts` | rule-based behaviour (defections, ageing out, party finances) |
| `events.ts` | declarative event engine: conditions → seeded probability → real effects → AI responses / player decisions |
| `corruption.ts` | evidence, institutions, investigation hazards, verdicts, penalties |
| `governance.ts` | indicator dynamics, budgets, projects, appointments, legislative support, federal levers |
| `news.ts`, `insights.ts` | news from state changes; upcoming deadlines and suggestions |

## Determinism and idempotency

- All randomness derives from `meta.seed`. Turn processing uses `subRng(seed, system, month)`, so replaying a month
  gives identical results regardless of call order. Tests assert that identical seeds + actions give identical
  worlds, that a loaded save continues identically, and that re-running a month is a no-op.
- Event occurrences have stable ids (`defId@month@scope`) recorded in `state.processed`; news is keyed by
  `source + headline`; each monthly system is wrapped in `once(state, name)`.

## Election model (summary)

Per-LGA voter bloc → utility per candidate = party identification + personal appeal + home ties + name recognition +
campaign (diminishing returns on spend vs the lawful limit, plus organisation) + momentum + incumbency/performance
+ issue fit + scandal + seeded national/state/local shocks → softmax shares; turnout from base turnout, enthusiasm,
engagement, insecurity, rain and election-day events. Presidential and governorship spread rules are read from the ruleset.
`result.factors` stores vote-weighted contributions per candidate for the explanation screen.

## Corruption model (summary)

`CorruptionScheme` (evidence 0–100, witnesses, category) → monthly hazards for each stage built from evidence,
witnesses, media vigilance, oversight capacity, institutional independence and political cover (capped at 0.65). With
no schemes there is no hazard, so a clean record is never investigated; `cover()` never reaches 1, so no one is immune.
Criminal, campaign-finance and conflict-of-interest matters carry different penalties. The game contains no
operational guidance for evading real agencies.

## Future multiplayer (not implemented — by design)

The engine already isolates what multiplayer would need:

- **Server-authoritative state:** run `perform` and `advanceMonth` on a server; clients send `GameAction`s and receive
  state patches or snapshots. Because actions are plain serialisable objects validated inside the engine, the server
  can reject illegal ones.
- **Authentication & identity:** `Player` is a single object today; make it `players: Record<PlayerId, Player>` and
  add a session layer. IDs for characters, seats, contests and events are already stable strings.
- **Synchronisation:** asynchronous multi-player play fits the monthly clock (each human submits actions, the server
  advances when all have committed or a deadline passes). Real-time play would need an event log (the processed-key
  design and per-system RNG streams make deterministic replay feasible).
- **Anti-cheat:** never trust the client's state; the client is a thin view. Keep RNG and hidden information (rival
  finances, evidence files) server-side; send only what a player may see.
- **Simultaneous actions:** resolve in a defined order inside `turn.ts` (the pipeline order is already fixed).
- Persistence is behind `StorageBackend`; a server DB can implement the same interface.

No networking code is included in the first release.
