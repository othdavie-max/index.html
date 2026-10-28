# Nigeria: The Road to Presidency

A single-player, offline-capable Nigerian political life simulation. Start as an ordinary citizen anywhere in
Nigeria's 36 states or the FCT, build a life, join a (fictional) party, win primaries and elections, govern, and try
to reach the presidency — or choose another life. It lives inside this repository's Next.js app at **`/game`**, fully
separate from the existing website (the site chrome is bypassed on that route).

> **Fiction and simulation.** All parties, politicians and events are fictional or fictionalised. Starting economic
> values, indicators, populations (beyond rounded 2006-census weights), party strengths and constituency
> delimitations are *simulated game values*, not official statistics. Events marked "inspired by" model documented
> real-world patterns but are not historical records.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000/game
npm test             # 110 unit/integration tests (vitest) — engine, geography, elections, saves, offline
npm run typecheck && npm run lint
npm run build && npm start     # production build (registers the offline service worker)
```

No account, API key, database, backend or network service is required to play. Saves are stored in the browser's
IndexedDB. After the first visit a service worker (`public/game-sw.js`, production builds) caches the game and map
data, so it keeps working offline.

To regenerate the map data from the source release: `npm run build:geo` (downloads, verifies SHA-256 checksums,
validates 774 LGAs / 37 units against officially published counts, and writes `public/game/geo.json` and
`src/game/data/generated/admin.json`).

## How to play (30-second version)

1. **Create a character** — name, age (18–45), birthplace on a real map (state → LGA), family background, strengths.
2. **Home** shows who you are, your money, what to do next and upcoming deadlines. Time moves only when you press
   **Advance one month** (or **Next event**, which skips ahead until something needs you).
3. **My Life** — education (admission odds, fees, NYSC), jobs, a business, how you spend your time (volunteering,
   organising, party work…), family and a fully itemised ledger of where money came from and went.
4. **Politics** — compare fictional parties, join/leave/defect (with consequences), contest party posts, seek
   appointments, learn each office's eligibility rules, and see your ethics and legal record.
5. **Elections** — races open to you with live eligibility checklists, primaries, campaign budgets, lawful funding
   (donation and spending limits), polls, constituency voter groups, and result screens that explain *why* you won or lost.
6. **Government** (unlocked by office) — budgets, projects with real delivery time and risk, appointments, the
   legislature, the fuel subsidy and borrowing (President), and an explicit, warning-laden "questionable options" tab.
7. **Nigeria Map** — all 37 units and 774 LGAs with ten data layers, zoom/pan/pinch/keyboard, search, and state/LGA panels.
8. **Economy**, **News** (filterable by topic/state/party/importance) and **Settings** (saves, preferences, about & licences).

## What is implemented

| Area | Status |
|---|---|
| Real boundaries: 36 states + FCT, 774 LGAs, stable ids, validated parents | ✅ built from geoBoundaries (CC BY 4.0), tested |
| Interactive map: select state/LGA, zoom, pan, pinch, keyboard, search, layers, highlights | ✅ |
| Character creation, 7 family backgrounds (+customisation), attributes, older starts | ✅ |
| Monthly clock, ordered turn pipeline, idempotent processing, seeded RNG | ✅ tested |
| Personal finance ledger (separate from public money), debts, savings, assets | ✅ reconciled by test |
| Education, NYSC, 19 jobs, 7 business types, time budget & commitments | ✅ |
| 7 fictional parties, factions, join/leave/defect, party posts, appointments, found a party | ✅ |
| Versioned data-driven ruleset: eligibility by office, term limits, fees, spending/donation limits | ✅ |
| Election engine: primaries, nominations, campaign, debates, turnout, election-day events, runoffs, presidential & governorship spread rules, explanations | ✅ tested |
| ~2,300 AI-held seats with named politicians; aspirants, defections, retirements, deaths, succession | ✅ |
| Corruption model: schemes → rumour → story → audit/investigation → charges → verdict; cover but no immunity; lawful vs unlawful finance; conflict of interest | ✅ tested |
| Macro economy (oil, FX, fuel, inflation, growth, jobs, revenue, debt, satisfaction), 6 indicators per state/LGA | ✅ tested |
| Government: budgets, 22 projects with delays/maintenance, appointments, legislative support, federal levers | ✅ |
| 48 offline events (national / state / LGA / personal) with decisions, AI responses, provenance labels | ✅ |
| News generated only from simulated changes (traceable `source`) | ✅ tested |
| Saves (IndexedDB), autosave, 3 manual slots, validation, migration, corrupt-save handling | ✅ tested |
| Offline play + service-worker caching | ✅ verified with Playwright |
| Responsive UI (desktop sidebar / mobile bottom nav), accessible controls | ✅ |

## Known limitations and remaining work

- **Ward councillor contests** are not simulated (the LGA chairmanship is the lowest elected office).
- **Constituency delimitation** (federal, state, senatorial) is a simulated grouping of real LGAs; seat *counts*
  follow the constitution (360 reps, 109 senators, 24–40 assembly seats per state) but boundaries are not INEC's.
- **Election petitions / tribunals**, impeachment, and the legislature's detailed scrutiny are not modelled yet.
- **Presidential gameplay** has the full election rules, federal budget, fuel-subsidy and borrowing levers, projects,
  cabinet appointments and national events, but diplomacy, defence operations and a detailed civil-service layer are
  future work.
- **Population and indicators** are simulated; replace with verified datasets (NBS, DHS, etc.) when licensed data is
  added. Rounded 2006 census figures are used only as relative weights (see `src/game/data/states.ts`).
- **Ruleset values** (nomination fees, spending/donation limits, LGA terms) are simplified; check primary sources
  (1999 Constitution as amended, Electoral Act 2022) before relying on them.
- **Event library** is a curated offline set; an online "curated real-world import" is designed for but not built.
- **Balance** is a first pass: expect to tune difficulty, AI aggressiveness and event frequency from playtesting.
- Wider accessibility audit (screen-reader pass on every screen), localisation, sound and portrait art are future polish.
