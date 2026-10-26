# NIGERIA: CAN YOU FIX IT?

A presidential strategy/economic simulation at `/fix` (the earlier life-to-presidency game remains at `/game`). All values are simulated game numbers for a fictional, internally consistent scenario. Map boundaries are real (geoBoundaries, CC BY 4.0).

## Layout
- `src/fixit/engine` — pure TypeScript simulation, no UI imports. `sim.ts` (monthly turn: 1 scheduled progress → 2 production/supply/fiscal flows → 3 FX/prices/growth → 4 jobs/security/welfare/politics → 5 resolve events → 6 generate events → 7 news/snapshot), `events.ts`, `actions.ts` (all player commands), `challenge.ts` (dashboard problem + actions from live state), `legacy.ts` (re-election, removal, title), `views.ts`, `util.ts` (levers/modifiers).
- `src/fixit/data/catalogue.ts` — 26 policies in 13 categories, 19 projects, 13 one-off measures, regional priors.
- `src/fixit/ui` — React screens (Presidency, Nigeria Map, Policies, Projects, Nation & Economy, News), reusing the shared kit, `GeoMap` (now with an `overlay` prop) and geo data from `src/game`.
- `src/fixit/persistence.ts` — local saves (IndexedDB → localStorage → memory), namespaced `fix:*`.

## Key ideas
- Every lasting effect is an additive **lever** carried by a *modifier* (policy, measure, project, event) with a ramp, an optional end and a realised scale (the result of uncertainty). Nothing is applied twice: effects are recomputed from state each month.
- Randomness is seeded per (seed, system, month); a month already processed is refused.
- Government funds, reserves, debt and personal wealth are separate numbers.
- Fuel subsidy: pump price = import parity × (1 − 0.5 × coverage); cost depends on the naira, oil price, leakage (corruption, targeting) and consumption. `previewFuel` uses the same formulas as the simulation.
- Naira: monthly drift from dollar supply/demand gap, inflation, investor confidence, reserves defence and noise. No control sets the rate.

Run tests: `npx vitest run src/fixit`.

## Decisions shape the future
- **Delayed consequences** (`engine/echoes.ts`): many measures, policies, fuel and borrowing choices, event responses and favoured contracts schedule an *echo*. It is shown in advance ("Coming up", the yellow "Later" box on every choice) and resolved months later from the state at that time, so follow-through matters (e.g. releasing grain plants an "empty silos" risk for the next lean season that storage investment defuses; open contracting pays off after a year only if kept).
- **Campaign promises** (`engine/promises.ts`): pick three at the start; each kept promise raises re-election odds, each broken one lowers them. Midterm report card at month 24; promises appear in the legacy report.
- **Diminishing quick fixes**: repeating the same measure within 12 months is less effective each time.
- **Milestones**: achievements awarded once from real outcomes.
- **Advisers** give two (often conflicting) views on each challenge.
