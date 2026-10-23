# Naija Life: expansion progress

Status of the "complete life simulation" expansion. Only items marked **Done** are implemented and exercised; **Partial** and **Not done** are called out honestly.

## Done (backend and UI)
- Seedable RNG (`setSeed`), configurable family-background distribution (`DEFAULT_FAMILY_CONFIG`), 8 archetypes x 8 household structures; wealth and generosity are independent variables.
- Persistent NPCs (parents, siblings, relatives, friends) with traits, closeness, trust, memories; parent support requests with 8 reply types; allowance cut-off; graduation packages (including assets recorded as gifts).
- Ledger: every cash change goes through `transact` (id, amount, reason, category, age, month, before/after). Yearly summaries, monthly recurring bills (rent, living costs, subscriptions, loans, fuel, upkeep). Integrity checks (`auditBalance`, `ledgerBalances`).
- Loans: informal (family/friends, recorded liabilities with due dates, repay/delay/explain/default), digital lenders and bank with terms preview before acceptance, late fees, credit score, receivables ("owed to you").
- Eligibility gating (age, phone/laptop, job, school) for random events; adult-only systems blocked for minors.
- Healthcare: conditions, facilities (government, teaching, private, clinic, pharmacy), insurance, emergencies, surgery, follow-ups, income loss while bedridden.
- Dating (Spark): profile, deck, swipe, chat, dates, official, propose, marry, breakup, cheating, pregnancy, adult (non-explicit) intimacy with protection choices.
- Social media and creator careers; businesses (monthly P&L, staff, managers, sale); vehicles (cash or financed, taxi/ride-hail); markets with unit prices; sports betting with compulsion; crime and legal pipeline (arrest, bail, trial, record); skills, gym, growth activities, military enlistment; wills and heirs (debts paid first).
- UI: new Phone, Health and Law tabs; Money tab gains assets/liabilities, housing, garage, subscriptions, ledger; Family tab gains background, people, ask-for-money, borrow/lend/gift, will editor; Work tab gains businesses and skills.
- Save/load: `migrate()` fills missing fields for older saves.

- Vocational training: 5 trades (1-2 years) from the JAMB admission screen or the Work tab; fees apply, a certificate raises the matching skill and pay, no degree or NYSC.
- Mortgages: 10-20 year bank mortgage with deposit, fee, monthly instalments, one at a time; selling pays the bank first; 4 missed payments means repossession.

- Military promotion board: soldiers are no longer auto-promoted; a board sits every 2 years in rank (5 for the top rank) with merit, godfather, bribe (risk of exposure and demotion or dismissal) or wait options.
- Relatives' money events: weddings, hospital bills, school fees, business capital (loan or profit share) and family levies, driven by persistent uncles, aunts, cousins and siblings; cousins join the family over the years.

- Dating message history: every match keeps a persistent thread (your lines, their replies, and notes for dates, milestones and breakups), shown as chat bubbles in Spark and saved with the game.

## Tests
`npm run test:game` runs 34 node:test cases (seeded determinism, distributions, support replies, loans, ledger continuity over whole lives, rent schedule, eligibility, hospital costs, dating, social, vehicles, investments, crime and trials, wills and heirs, save migration, cross-system chaos).

## Added in the latest pass
- English and Pidgin: chosen on the start screen (and switchable from the Menu). All game text, events and UI exist in both voices through `T(en, pcm)`; static tables use lazy getters.
- Prison now closes every outside action (phone, travel, shopping, work, dating, betting, crime, property, investing). Inside you can work, study, appeal, try to escape, see visitors, ask family for help, see a doctor or make a will; loans, rent, investments and businesses keep running while you are inside.
- Parent replies need an answer (loan, conditions, "why?", chores, "later" with a follow-up).
- National headlines with lasting effects (fuel, strikes, naira crash, insecurity, oil boom, floods, grid collapse); alerts and history sheet; monthly summary and upcoming payments in the ledger.
- Navy, Air Force and Police join the Army in the promotion-board system; postgraduate study; boarding school; children's events; property market with cash, mortgage, parent co-signer and a developer payment plan.
- Save slots (3), seed and family-mix controls on the start screen.
- Love life: meet people without a phone, date, make it official, move in, propose, wedding choices, marry, protection options (condom, pill, none), try for a baby, emergency pill, antenatal care choices, birth outcomes (twins, complications, loss), naming ceremony, child support, adoption, fertility treatment, divorce.
- Browser smoke test (`npm run test:e2e`) plays a life in both languages through the real UI.

- Light blue app design with compact header, stats card, timeline and four-tab bottom bar; first-time tutorial (12 steps, replayable from the menu).
- Dead relatives no longer ask for money.

## Not done / limits
- Saves live in this browser only (three slots). There is no account or online storage.
- The game is not deployed on the Baseline site itself; only the standalone artifact is published.
- Text stored in saved state (business names, NPC memories, tags, case charges) stays in the language that was active when it was written.
- Balance comes from scripted bots, not human play (see below).

## Balance snapshot (100 unseeded bot lives per strategy, real base-year naira, latest)
| strategy | median age at death | worth @40 | worth @60 | kidnapped |
|---|---|---|---|---|
| idle | 60 | -0.5M | -0.5M | 15% |
| hustler | 60 | 12.8M | 111M | 15% |
| graduate | 63 | 26M | 86M | 12% |
| crook | 60 | 11M | 28M (10 prison years avg) | 13% |
| politician | 61 | 86M | 131M (11 of 100 president) | 13% |
| tycoon (businesses + mortgage) | 61 | 9M | 266M | 11% |
| gambler | 59 | 29M | 83M | 13% |
| creator | 62 | 59M | 186M | 17% |

Business revenue growth, margins and creator payouts were reduced in this pass because the tycoon and creator bots became rich far too fast. Runs are unseeded so figures move between runs.

## Latest pass: money, business, university, avatars

- **Property**: ~26 Nigerian locations (Banana Island to Maiduguri) with price ranges, yield, growth and risk; build on land; development projects.
- **Investments**: bonds, penny stocks, crypto funds, property funds; market moods (bull/steady/bear) and a news feed; financial adviser (3 tiers) who warns of upcoming news and Ponzi offers.
- **Wealth view**: Overview / Assets / Liabilities / Belongings (vehicle art, property, licence, degree).
- **Business mini-game**: policies (price, advertising, stock quality), real employees (skill, loyalty, wages; recruit, raise, train, fire), monthly report with tips, yearly history, cheap kinds (akara, POS, barbing, bukka...), manager option so you can own without working in it.
- **University**: 31 universities (federal, state, private), 42 courses, JAMB cut-offs, fees by family wealth with merit aid, campus activities (study, clubs, class rep, SUG, SIWES, project, hustle, scholarship, "sorting", confraternity), ASUU strikes, GPA and class of degree; degree class and network lift pay, hiring odds and politics.
- **Social**: Instagram, TikTok, YouTube, Facebook, Twitter with platform-specific content.
- **Avatars**: new cartoon portrait style on a green tile (hairs, headwraps, caps, glasses, hoops, hoodies...).
- Balance: medians for hustler/tycoon sit well above the earlier baseline (already drifting before this pass); not retuned.

## Engagement pass
- Moments: 19 funny shareable highlights (President, escaped kidnap, First Class, billionaire, jet, japa...) with share cards, in Legacy.
- Weekly challenge: same seed and start for everyone that week; score locks in at 40; best score saved on the device. A shared leaderboard needs a server and is not built.
- Bucket list: 3 goals per life; finishing one unlocks a cosmetic (kept on the device) for every future character.
- Naija Gist: generated gossip feed plus your own moments. A real-player feed needs a server and is not built.
- New events: stranger who returns years later, Detty December, Ramadan and Sallah, aso-ebi levy, NYSC camp, first winter abroad.

## NYSC as a one-year mini-game
- `nysc.ts`: posting (serve / pay to work posting to Abuja / skip), a skippable one-month camp with three quick rounds (parade, mammy market, talent show) scored 0-9, then a PPA search across ten placement types in three prestige tiers.
- Placement and retention odds use connections, smarts, degree class (`campusHire`), camp score, Abuja/Lagos posting and family wealth: poor graduates face a steep penalty for oil, bank and tech PPAs, rich graduates get a boost. A "pull a string" payment improves a top-tier slot.
- Service year: ₦77,000/month (inflation-adjusted) for 12 months, title "Corps member (NYSC)", formal job applications blocked, side hustles allowed, two corper events (supervisor, CDS or side hustle or late allowance). CDS is a single in-year event, not a yearly cycle.
- Pass-out: discharge certificate; the PPA either retains you (job set, career continues) or you are unemployed and job hunting. Skipping NYSC entirely gives no certificate, a reputation hit and a formal-hiring penalty.

## Prison fallout
- Jailed students are expelled (school, campus record, course and open admission cleared); after release they redo JAMB and apply again, and a conviction adds 25 marks to every cut-off (`cutFor`).
- A corps member who is jailed is removed from service with no certificate; on release `nysc_remobilise` lets them apply to serve again or forget it.
- Researched online: the NYSC Act sanctions (extension, repeat, withheld certificate) are documented, but no source spelled out the rule for a jailed corper, so removal is a game design choice.
