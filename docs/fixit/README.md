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

## Fun update: people, backers, advisers, records, big moves

- **Day One** (`engine/dayone.ts`, `ui/DayOne.tsx`): pick a Chief of Staff (childhood friend, technocrat, party chairman's son, general or cleric) and a Vice President (regional power-broker, technocrat, opposition defector, loyalist or cleric), then your ministers. Each post also has a "your own person" candidate (friend, in-law, donor) whose skill and honesty are hidden. The chosen people come back as events: the friend's mansion, the technocrat who threatens to quit, the general's night dinners, the party chairman's contract list.
- **Backers** (`engine/backers.ts`): three campaign financiers (Godfather, Northern Kingmaker, Lagos Financier) with a mood. Hiring your own people or loyalists pleases them; hiring technocrats or sacking loyalists angers them. Happy backers add Assembly votes. Angry ones sabotage: street anger, insecurity in their zone, a weaker Assembly, and sabotage events (reconcile, expose or arrest). They also demand contracts, and your own people in the cabinet loot, with the choice to confront or look away.
- **Advisers** (`engine/advice.ts`, `ui/AdvisorStrip.tsx`): rule-based, deterministic and offline. Computes real facts for a law, tool or move (Assembly support, courts, reserves burn, coup risk) and each adviser comments in their own voice. Skilled and honest advisers cite the numbers and are usually right; flatterers say "go"; generals favour force; clerics oppose the death penalty. Advisers also give a monthly briefing (different people notice different problems) and recommend an option on every event.
- **Records** (`engine/history.ts`): cards for "first time since 2016/2014/2007" moments (naira, petrol, inflation, power, reserves, jobs) and bad records too. Full-screen celebration with confetti.
- **Big moves** (`engine/bigmoves.ts`): fix the naira by decree (the central bank burns reserves, a black market opens, then it collapses), sell the jets, cut lawmakers' pay, ban foreign medical trips, close the borders, print money, school meals, National Jollof Day, rice import ban. Plus new events: Christmas fuel scarcity, "japa", cash scarcity, highway kidnappings, exam leaks, checkpoint extortion, the Super Eagles final.
- **Street** (`engine/street.ts`): a market board (rice, garri, bread, danfo fare, petrol, the dollar versus day one) and a "Naija X" feed generated from the state.
- Tests: `src/fixit/tests/fun.test.ts`.

## Living world update: fuel, investors, ripples, enemies, desk

- **Fuel and refineries** (`engine/sim.ts`, `ui/LivingPanels.tsx`): refinery output is capacity times uptime. Uptime decays unless the country is maintained, and theft and corruption hurt it. Local fuel lowers the pump price by up to 24% and reduces a visible queue meter that affects the mood. The Fuel panel shows capacity, uptime, local output, imports, savings per litre and queues.
- **Investor deals** (`engine/investors.ts`): when investor confidence is above about 40, named offers arrive (private refinery, solar park, garment hub, data centre, gas plant, fertiliser plant, light rail). You choose fair terms or a tax holiday. Deals build with a progress bar, stall in insecurity or dictatorship, and when they open they apply real effects, add jobs and pay taxes. A ribbon-cutting card follows.
- **Ripples** (`engine/ripples.ts`): executions, jailings, wrongful arrests, press crackdowns, jailing the opposition leader, stolen elections, army purges, protest crackdowns and sackings schedule chains of timed reactions (senators fly abroad, cases drop with a visible counter, the home state erupts, rights groups condemn, a son swears revenge). The "What I caused" timeline records the trail.
- **Enemies**: the people you wrong get a face, a grudge and a plan (paid protests, leaks, backing your rival, bandits, coup plotting) and act every season. Buy them off, make peace or crush them; crushing can fail and make a martyr. A strong enemy also sends an "enemy is making a move" event.
- **Desk** (`engine/desk.ts`): a pacer keeps 1 to 2 cards on the desk when it would otherwise be empty. Cards remember promises (a promised road comes back kept or broken). When things go well, success cards appear (gridlock, "where are the jobs", poaching, inequality, an overvalued naira).
- **Expectations and term crises**: a rising-expectations drag on the mood grows each year. Term 2 brings an oil crash, term 3 a plot by your VP, term 4 a succession fight.
- **National dreams** (`data/catalogue.ts`): World Cup, Lagos–Calabar railway, 24-hour power, Silicon Lagos, peace in the north-east, and a Nigerian astronaut. They unlock after four other projects and give dream achievements.
- **Simpler layout**: the bottom bar is now seven buttons (Desk, Govern, Economy, Assembly, Power, People, News) with tabs inside each.
- Tests: `src/fixit/tests/living.test.ts`.

## Accountability update: mortal officials, backers with consequences, overstaying

- **Officials are mortal** (`engine/officials.ts`): ministers and governors can be prosecuted with the law as it stands (reprimand, seize the loot, prison, life, death). Jailed and executed officials leave the cabinet or governor's mansion and never come back (listed under "Gone for good"). Governors are replaced by a new person. Jailed lawmakers, ministers and governors are released after their sentence (30 months; 14 for political arrests) and return as enemies. Life and death sentences are final.
- **Warn your appointees**: tell a minister "you are here to work, not to eat". Warned ministers steal less (the multiplier depends on the law level), but your own people are offended. If a warned minister steals and you do not prosecute, your warnings become worthless for two years and trust falls. Punishing one frightens the others (more honest, lower morale).
- **Your own people are veiled**: skill and honesty are shown as "?" for six months after you hire them.
- **Backers**: in the first month after Day One, an ultimatum arrives if your cabinet leaves them unhappy. Options: appease them (cost, corruption), give their nominees deputy posts (a way around it, but those deputies steal quietly and your ministers resent them), promise jobs in eight months (checked later), or hold the line, which has immediate effects: the Assembly turns against you, the budget is blocked for eight months, and a chain starts (the party chairman, senators staying away, a dossier, an enforcer who joins your opponents). You can also give a backer gifts at any time: a board seat, an ambassadorship, an oil-lifting licence, public praise.
- **Overstaying**: scrapping term limits now needs two thirds of the Assembly firmly on your side plus lobbying, and sets off a chain (opposition walk-out, a Supreme Court challenge, ECOWAS alarm, governors splitting, generals "neutral"). At the end of your last legal term you can refuse to leave: no vote, only consequences (ECOWAS suspension, a ruling against you, governors refusing to recognise you, officers meeting, a general strike). Each repeat is worse. Obeying the court ends the story.
- Tests: `src/fixit/tests/accountability.test.ts`.

## "Interesting and interactive" update

- **Mini-games** (`ui/Minigames.tsx`): haggle with the union, audit the padded budget, coup night (10-second decision), rally tapping, timed debate. They replace the dice roll via a forced outcome (`respond(..., force)`), or scale a rally or debate answer.
- **Families** (`engine/families.ts`): five named families whose mood follows your decisions, yearly letters, and milestones (a shop opens or closes, a nurse leaves for Canada). Shown on the Street tab.
- **Living map** (`engine/views.ts`, `ui/MapView.tsx`): landmarks for finished projects and investor deals, fire for unrest, flood icons in the rains, and a short state story when you tap a state.
- **Foreign relations** (`engine/foreign.ts`): IMF programme with tranches and conditions (a floating naira, no subsidy after a year), Chinese rail-for-oil, American security help that needs clean hands, ECOWAS summits.
- **Party** (`engine/party.ts`): four factions, demands, a primary, and a vice president whose ambition can lead to defection.
- **Family and health** (`engine/home.ts`): spouse cards, a child scandal, a secret illness (hide it, disclose it, hand power to the VP), money abroad that can leak.
- **Sectors** (`engine/sectors.ts`): three programmes each for agriculture, oil and gas, technology and manufacturing, with monthly costs and corruption leakage.
- **Replay**: five president types with perks and weaknesses, challenge starts (after a coup, deep recession), a date-seeded daily challenge with a copyable result, and an endings gallery.
- **Feel**: a coach for the first turns, "what changed" chips, TV-style breaking-news banner with a street reaction, generative music that turns tense when the danger meters rise, crowd sounds and vibration, and a 12-month review of your biggest decisions and what is now permanent.
- Tests: `src/fixit/tests/world2.test.ts`.

## Debt, lending, military and new states

- **Debt** (`engine/debt.ts`, `ui/DebtMilitary.tsx`): Economy → Debt shows debt as a share of the economy, local versus foreign, interest, the credit rating, a chart, an estimate of years to debt-free and borrow/repay controls (including repaying foreign debt). A debt chip is in the top bar. Debt-free is 5% of the economy or less; there are record cards for low debt and debt traps, and an annual debt review in the news. Inflation erodes naira debt on its own (about 50% to about 20% over four idle years); dollar debt must be repaid.
- **Lending** (`engine/lending.ts`): opens below 10% of the economy. A savings fund earns about 4% a year. Neighbours ask for three-year loans at 4–9%, with an optional harder deal (higher rate plus a vote at the AU). Loans earn monthly interest, may default (forgive, restructure or seize collateral), and repay at the end.
- **Military** (`engine/military.ts`): strength 0–100 with four programmes (recruit, buy abroad, local arms industry, veterans' welfare) costing money every month. Neighbours (fictional) arm in response, strength above 55 adds coup risk unless veterans are looked after, and border clashes and peacekeeping calls test it.
- **New states** (`engine/newstates.ts`): event-only. Regions petition; creating one costs about ₦14bn a month, pleases the region and invites the next petition. The map is unchanged.
- Tests: `src/fixit/tests/debtmil.test.ts`.

## Loot ledger

- `engine/ledger.ts`: every amount stolen by lawmakers, ministers and governors is counted; every prosecution (any law level, for lawmakers, ministers and governors) recovers a share (60%, 40% or 30% depending on how harsh the law is) into a waiting pool. A "recovered loot" card lets you send it to schools, clinics, roads, local debt, the savings fund (or treasury) or cash; each does something real. If ignored it is swept into the treasury after four months. A "+₦X recovered" pop-up shows on the map, the Debt screen has a stolen/recovered ledger, and the year review reports it.
- Fixed: jailing or executing ministers and governors used to recover no money at all.
- Tests: `src/fixit/tests/ledger.test.ts`.

## Focus and depth update (designer pass)

- **Systems unlock** (`engine/meta.ts`, `UNLOCKS`): the game opens with the map, desk, policies and projects. Big Moves, Investors, Assembly, Seat of Power, Foreign, Party, Enemies, Military and Lending open on a schedule (or sooner when trouble starts). Locked tabs show 🔒 and when they open; opening one shows a toast. Quick games open them twice as fast. Old saves keep everything open.
- **Political capital** (`PC_COST`, `payPc`, `pcIncome`): ⚡ 0–100. Power tools, lawmaker actions, warnings, lobbying, gifts, enemy deals, big moves and speeches cost it; it refills monthly (more with approval, trust, Assembly support, and the "capital" perk) and from finished projects, big wins and kept agendas. A move you cannot afford is refused, and nothing is charged for a move that is blocked for another reason.
- **Yearly agenda** (`AGENDA`): pick up to two of four seeded cards each year (Feed the Nation, War on Corruption, Power for All, Defend the Naira, and others). Each gives a 12-month boost and a measurable goal; the year-end review pays +12 ⚡ and approval for a kept agenda and costs trust for a missed one.
- **Why-chain** (`whyChain`): tap any HUD number to see what drives it, the modifiers in play and your recent big moves.
- **Pacing director** (`directorMonthly`): tension rises after crises and decays; it sets an event-rate multiplier (0.4–2): breathing room after a storm, a harder turn after a calm spell and when you are doing well, and a slow ramp over the years. Shown as the country's mood in the capital screen.
- **Inner circle** (`cast`): eight recurring faces (Chief of Staff, VP, rival, godfather, Mama Nkechi, the general, a journalist, a governor) with portraits, a feelings meter, emotion and a line that reacts to the state of play.
- **Variety** (`engine/variety.ts`): ten crises have three openers each (never the same one twice in a row); repeats within a year say so, and the third repeat is escalated one level. Recent repeats of the same crisis are damped.
- **Meta-progression** (`persistence.ts`): finished games earn legacy points (more for strong results, a new ending and each dynasty generation); spend them on seven perks, equip two. President types and challenge starts unlock as games are finished (with an unlock-all link). **Dynasty**: after any ending, pass the baton and your successor inherits the exchange rate, inflation, corruption, democracy, law level and debt you left.
- **Naija Pidgin** (`engine/pidgin.ts`): toggle EN/PCM in the top bar or on the title screen; a rule-based pass for street voices, the X feed, adviser lines, the inner circle and breaking news.
- **Quick term**: one four-year term, two months a turn, no re-election or overstay, ending in a verdict. About 20 minutes.
- **Merged tabs**: Sectors now sits under Policies, Lending under Debt, "What I caused" under "Nigeria today" (the Street tab).
- Tests: `src/fixit/tests/meta.test.ts`.
