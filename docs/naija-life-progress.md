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
`npm run test:game` runs 26 node:test cases (seeded determinism, distributions, support replies, loans, ledger continuity over whole lives, rent schedule, eligibility, hospital costs, dating, social, vehicles, investments, crime and trials, wills and heirs, save migration, cross-system chaos).

## Partial / not done
- Balance was measured with simple bots (below), not by human playtesting.
- Some `no-unused-vars` lint warnings remain (no lint errors).

## Balance snapshot (150 unseeded bot lives per strategy, real base-year naira, after all additions)
| strategy | median age at death | median worth @40 | @60 | kidnapped |
|---|---|---|---|---|
| idle | 59 | about -0.1M | 2.5M | 16% |
| hustler | 60 | 43M | 179M | 12% |
| graduate | 58 | 39M | 92M | 16% |
| crook | 61 | 16M | 31M (8.5 prison years avg) | 15% |
| politician | 61 | 81M | 119M (11 of 150 became president) | 15% |

The bots use jobs, expansion, building and political actions only; they do not use mortgages, trades, businesses, betting or the dating app, so those systems are not covered by this balance check. Runs are unseeded, so figures move a few percent between runs.
