# Third-party assets

This project uses the following third-party assets, stored locally under
`public/icons/3d/` and `public/flags/` (never hotlinked).

## Fluent Emoji (3D style)

- Source: [microsoft/fluentui-emoji](https://github.com/microsoft/fluentui-emoji)
- License: MIT
- Copyright (c) Microsoft Corporation.

Used for the decorative 3D icons across service, value, tool, process-step
and feature cards (`public/icons/3d/*.webp`, converted from the repo's
`assets/*/3D/*.png` source files). Full MIT license text:
https://github.com/microsoft/fluentui-emoji/blob/main/LICENSE

## circle-flags

- Source: [HatScripts/circle-flags](https://github.com/HatScripts/circle-flags)
- License: MIT
- Copyright (c) HatScripts.

Used for every round country flag on the site (`public/flags/*.svg`),
replacing emoji flags that rendered as plain two-letter codes on Windows.

## geoBoundaries — Nigeria ADM1 and ADM2 (game map)

- Source: [geoBoundaries gbOpen](https://www.geoboundaries.org/) (commit `9469f09` of
  [wmgeolab/geoBoundaries](https://github.com/wmgeolab/geoBoundaries)); underlying data **GRID3 Nigeria**,
  boundary year 2022.
- License: **Creative Commons Attribution 4.0 International (CC BY 4.0)** — https://creativecommons.org/licenses/by/4.0/
- Citation: Runfola, D. et al. (2020) *geoBoundaries: A global database of political administrative boundaries.* PLoS ONE 15(4): e0231866.
- Changes made: parent states assigned by largest geometric overlap; topology-preserving simplification; states dissolved
  from LGAs; projected to SVG paths. Output: `public/game/geo.json`, `src/game/data/generated/admin.json`
  (see `scripts/build-geo.mjs`). The game's About screen displays this attribution.

---

Per the MIT license, both projects' copyright notices are preserved here.
Neither project endorses or is affiliated with Baseline Educational Services.
