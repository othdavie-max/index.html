# Data, sources and what is simulated

## Real (sourced) data
- **Boundaries:** geoBoundaries gbOpen Nigeria ADM1 + ADM2 (GRID3 Nigeria, 2022), CC BY 4.0. Checksums are pinned in
  `scripts/build-geo.mjs`. The ADM2 file has no parent field, so parents are assigned by largest geometric overlap and
  the result is validated against the officially published LGA count for every state and the FCT (total 774) — the
  build aborts on any mismatch. LGA names are the dataset's spellings (e.g. the FCT's "Municipal Area Council").
- **Stable ids:** states use ISO 3166-2:NG codes (`NG-LA`); LGAs are `<state>-<slug>` with the source `shapeID` retained.
- **Reference facts** (`src/game/data/states.ts`): state names, capitals, geopolitical zones, House of Representatives
  seats (360), Senate seats (109), off-cycle governorship states. Constitutional/legal parameters
  (`src/game/data/rules.ts`) are simplified and cite their basis.

## Approximate
- `pop2006m`: rounded 2006 census population per state, used only as a relative weight (× 1.6 simulated growth).

## Simulated (labelled in the UI)
LGA populations and urban/rural character, voter registration share, party affinities, indicator starting values,
economic starting values, constituency delimitation, party strengths and finances, all named politicians, nomination
fees, salaries, event frequencies. Replace with licensed datasets when available; the generators are in
`engine/world.ts` and the economy's initial values in `engine/economy.ts`.

## Limits of the geometry
Simplified for display (10% weighted Visvalingam); not suitable for surveying or legal boundary determination.
