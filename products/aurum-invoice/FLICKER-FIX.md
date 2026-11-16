# Infinix Note 30 flicker: what is known (read before touching it)

## The problem
On the owner's Infinix Note 30 (Mali GPU, Chrome), the app flickers: the Home screen and the Send step flash while scrolling or after an action. It started on the sales page and the app. Other phones are fine. Past "it's fixed" messages were wrong several times: always wait for the owner's phone test before saying it is fixed. Do not claim a fix without it.

## What the owner tested on the phone (address `?fx=N`, remembered by the browser)
| Level | What it removes | Result on the phone |
|---|---|---|
| 0 | nothing (all effects on) | flickers |
| 2, 3 | web fonts, then gradients too | flicker |
| 4 | square corners + no clipping + no transforms + no opacity | does NOT flicker |
| 5 | **square corners only** (border-radius 0) | **does NOT flicker (the only narrow level confirmed stable)** |
| 6 | no clipping (overflow visible) only | flickers |
| 7 | no transforms/opacity only | flickers |
| 8 | rounded corners kept, every rounded piece forced onto its own layer (`transform: translateZ(0)` on about 85 selectors), shadows off | first no flicker, **then flickered at the Send button**, and later "the last file I deployed flickers too" |
| 9 | corners cut to 6px | result never reported |

## What this means
- The cause is rounded corners (border-radius) on this GPU. Fonts, gradients, clipping alone and transforms alone are not the cause.
- Level 8 tries to keep the rounded look, but it is not proven. The owner saw flicker with it at the Send button.
- Level 5 (square corners) is the safe fallback that is known to work.

## What was changed so far (commit history)
- `html.lite` is always on: no grain, no endless animations, no gold dust, no heavy filters.
- Editor typing: `renderSoon()` and a hidden-preview shortcut (performance only, not the flicker).
- Level 8 became the automatic default on Mali GPUs (detected from the WebGL renderer name).
- Removed the large rounded `overflow:hidden` box on `.send-hero` (commit 2695d0a). This was the last change; the owner has NOT yet confirmed it on the phone.

## What to do next (do not guess)
1. Ask the owner to open the live app on the Infinix and use `?fx=8` (and `?fx=9`), then test Home, scrolling, and the Send step. Ask for the exact spot that flickers.
2. If level 8 still flickers anywhere, make level 5 (square corners, `border-radius: 0 !important` outside the client view `.cv`) the automatic default for Mali phones. It is ugly but proven. Do this first, then try to bring rounded corners back one area at a time (start with a small radius such as 6px, level 9) with the owner testing each step.
3. Keep the client view (`.cv`, the opening animation and the invoice the client sees) exempt from these rules.
4. Never add `backdrop-filter`, big blurs, `mix-blend-mode`, `will-change`, or endless animations.
5. The code lives in `scratchpad/v3-a.html` (head script, Mali detection, `data-fx`), and `scratchpad/v3-d.html` (the safe-level CSS). If the scratchpad is gone, edit `products/aurum-invoice/index.html` directly (search for `data-fx`).
