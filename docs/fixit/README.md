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

## Cabinet, rival and election
- **Cabinet** (`engine/cabinet.ts`): six portfolios (Finance, Central Bank, Agriculture, Power, Works, Security). Ministers have skill (scales their area's levers), honesty (low honesty adds corruption, cuts procurement quality and risks a minister-fraud event) and a faction: technocrat (skill, investor confidence), party loyalist (+0.7 vote points each, weakens the rival), regional heavyweight (+3 in their zone). Vacancies drag their area down. Moods fall when their area worsens; very unhappy ministers resign. Free reshuffles in the first three months.
- **Rival** (`engine/rival.ts`): a named opposition leader whose popularity mirrors your approval and who attacks bad news in quotes generated from the numbers.
- **Campaign**: opens six months before election day (term 1). Two activities a month: rallies by zone (diminishing returns), door-to-door drive, risky attack ads, plus a three-question debate.
- **Election**: counted per state; win needs >50% nationally and ≥25% in 24 of 37 states, otherwise a run-off. Results are seeded and shown on an animated election-night map.
- **Street voices and ticker** (`engine/voices.ts`): fictional citizens quote this month's real numbers; a breaking-news ticker shows the latest headlines.

## Scenarios, Assembly, society and stories
- **Setup** (`engine/setup.ts`): name, portrait and three difficulties (cash, crisis frequency, voter mood). There are no fixed scenarios: each new game rolls 3–4 national issues from a pool of 14 (naira, debt, food, fuel, power, banditry, insurgency, farmer-herder clashes, youth, strikes, oil theft, floods, a disputed election, a looted treasury), plus at most one piece of good news (oil windfall, bumper harvest, investor interest, a honeymoon), with clashing issues excluded and small random variation in the starting numbers. Seeded, so replaying a world repeats its mix.
- **National Assembly** (`engine/politics.ts`): controversial policies, fuel-subsidy changes and the annual budget need a vote. Chance comes from Assembly support (loyalists, governors, popularity, rival, scandals) minus the bill's difficulty; lobby first (constituency projects, favours, public pressure). The gate is applied in the UI/command layer; engine actions remain directly callable.
- **Budget**: five heads with levels from deep cut to big raise; running costs and levers via a `budget` modifier; due each January.
- **Speeches**: honest / hopeful / tough / blame, judged against the moment (e.g. blame works only early; hopeful only if things are improving); three-month cooldown.
- **Society** (`engine/society.ts`): seven groups with their own approval (traders, farmers, youth, workers, business, military, faith leaders). Decisions nudge them; very angry groups raise protest odds or cost investment/security. Reputation traits (Reformer, Populist, Strongman, Clean, Builder, Borrower) come from choices and carry effects. Six zone governors (party, relationship) affect project speed, votes and Assembly support, make funding requests and may defect.
- **Story arcs** (`engine/stories.ts`): outbreak, oil crash, coup rumour, refugees, lithium discovery and a summit; multi-stage, branch on choice and outcome, once per game.
- **Hall of Presidents** (local) and a **share card** (canvas PNG, Web Share when available).

## Power, corruption and endings (Civilization-style)

- **World screen** (`ui/World.tsx`): the map fills the screen. HUD with resources and five danger meters (democracy, street anger, coup risk, world pressure, elite loyalty), a notification stack, an advisor, a toolbar that opens drawers (Presidency, Policies, Projects, Economy, Assembly, Power, Cabinet, News) and a big NEXT TURN button that turns red when decisions are waiting. Lenses recolour the map (mood, politics, food, power, jobs, security, unrest). Sounds are WebAudio blips (`ui/sound.ts`), muted state saved in the browser.
- **Lawmakers** (`engine/power.ts`): 30 named senators and reps (12 + 18), each with party, loyalty, greed, stolen money and proof held. They steal; corruption cases arrive as events (prosecute, blackmail, protect or take a cut). Dossier actions: investigate, buy loyalty, arrest (a political arrest without proof hurts democracy), leak, blackmail, protect, demand a cut.
- **Law ladder**: weak laws, asset recovery, mandatory prison, life, death penalty. Each rung is a bill through the Assembly (or decree). Deterrence depends on the law and on how strong the courts are. The death penalty frightens officials but can execute the innocent and raises world pressure.
- **Strongman toolkit**: buy INEC, postpone the election, state of emergency, silence the press, internet shutdown, arrest the rival, pay or purge the military, buy governors, decree, scrap term limits (amendment vote). Each lowers democracy and raises an abuse meter that feeds anger, coup risk and sanctions.
- **Danger events** (`engine/powerEvents.ts`): mass protests, coup attempts, sanctions, elite revolts, leaked audio, kidnapped senators, ghost workers and other only-in-Nigeria moments. Coups and uprisings can end the game.
- **Elections**: INEC control adds a rigging bonus; the honest vote is tracked, and a stolen election triggers protests. After losing you may annul the result, if you control INEC or hold emergency powers; the army decides. The story stops after four terms.
- **Endings** (`engine/endings.ts`): 11 endings by how you ruled and how it ended, shown on the legacy screen and saved in the Hall of Presidents. Fallen presidents with loot choose: flee or face the music.
- Tests: `src/fixit/tests/power.test.ts`.
