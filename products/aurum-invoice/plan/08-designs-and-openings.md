# 08. Designs and openings spec

Written by Fable on 15 Nov 2026. This is a spec only. Nothing here has been built or tested.
It covers section 7 of `00-master-plan.md` and is the file for **Build 3**. Plan limits come from `07-accounts-and-billing.md`.

**Builder rules.** I read the app's code for the three designs and three openings before writing this, so the class names, function names and helpers below are the real ones. I could not run anything. The CSS and timings here are a careful starting point: build them as written, then look at the result on a phone and in the PDF. You may adjust spacing and timing values to fix a visible defect. You may not change the look, the names, the ids, the wording, or the order of events. If something here does not match the code you find, stop and ask.

---

## 0. One correction to the master plan

The master plan said every opening must respect the phone-safety levels (`data-fx`). Reading the code shows those levels deliberately **leave the client's page alone**: every `data-fx` rule is written `:not(.cv):not(.cv *)`. They protect the app's own screens on the owner's phone. An opening plays on the **client's** phone, inside `.cv`.

So:
- **Do not touch the `data-fx` rules, the script on line 5 that sets the level, or the `html.lite` rules.** This is unchanged.
- New openings get **no** `data-fx` rules. They are kept safe by the budget in part C2 instead.
- The pickers and previews inside the app are app screens. They follow the existing levels without any new work.

---

## A. Brand sheet

No change to the brand. This is a record of what the app and sales page already use, so that every new screen (the account, plan and payment screens from file 07, the pickers below) matches.

| Thing | Value |
|---|---|
| Black | `#0A0908` (stage), `#141210` (raised) |
| Ivory | `#F7F4EE` (page), `#FFFDF9` (document paper), `#F4EEE0` (cream text on black) |
| Gold | `#B8935A` (solid), `#E2C88C` (highlight), `#9C7637` (gold on ivory) |
| Gold foil | `linear-gradient(100deg, #8A6A35 0%, #E9D39E 28%, #B8935A 46%, #F5E7BE 64%, #A07D42 82%, #E2C88E 100%)` |
| Wine (default wax) | `#5A1A24` |
| Display type | Playfair Display |
| Accent type (italics, monograms) | Cormorant Garamond |
| Body type | Manrope |
| Signature type | Mrs Saint Delafield |

Rules:
1. **No new fonts.** These four are already loaded and cached for offline use.
2. Gold is used like foil: thin lines, one word, one button. Never a large gold area in the app's own screens.
3. The client's page is always dark. The app follows the owner's light or dark choice.
4. Wording is calm and plain. No exclamation marks, no emoji, no countdown pressure.
5. Plan names are written `Free`, `Starter`, `Pro`, `Business`. On a dark screen the current plan's name is in the gold foil; nothing else about a plan is gold.
6. The headline on the sales page stays: "Your business is premium. Your invoice should be too."

**Sales page, one new section (Build 3).** Placed after the existing design section, or after the features if there is none:
- Heading: `Five designs. Six ways to open.`
- Line: `Choose the look that fits your brand, and how your client opens it.`
- Under it, two rows that can be swiped on a phone: the five designs by name, then the six openings by name. Use **real screenshots** of the finished designs and openings, made the same way as the pictures already in `landing/`. No mock-ups. Names only; the plan each belongs to is shown on the Pricing page, not here.

---

## B. Designs

### B1. How a design works today
- A design is a class on the document: `.inv.t-royal`, `.inv.t-atelier`, `.inv.t-noir`. The id is stored as `design.template`.
- It works by setting variables (`--paper`, `--p-ink`, `--p-muted`, `--p-rule`, `--p-rule-soft`) and restyling the parts: `.inv-head`, `.brand`, `.logo-box`, `.biz-name`, `.tagline`, `.doc-title`, `.doc-type`, `.doc-no`, `.inv-meta`, `.party`, `.dates`, `.items`, `.sum`, `.words`, `.totals`, `.grand`, `.bank`, `.notes`, `.sign-block`, `.stamp`, `.pill`, `.inv-foot`.
- The picker lists appear **twice** in the code, both as `[["royal", "Royal"], ["atelier", "Atelier"], ["noir", "Noir"]]` (one with `data-template`, one with `data-cz-tpl`). The picker thumbnails are drawn in CSS as `.tpl[data-template="..."] i`.
- `invoiceHTML` has a few branches on `G.template` (monogram and line colour, and others near them).

### B2. What every new design must obey
1. CSS only. No images, no new fonts.
2. Use only CSS the PDF and image export already draws correctly in the three existing designs: solid colours, linear and radial gradients, borders, rounded corners, pseudo-elements. **Not allowed:** `color-mix()`, `mask`, `clip-path`, `mix-blend-mode`, `backdrop-filter`, `filter`.
3. It must work with any deep brand colour, like Royal does, and with all six document types, the watermark, the stamps, the item photos, the QR code and the "Made with Aurum Invoice Studio" line.
4. It changes look only. No part of the document is added, removed or moved to another place in the HTML.
5. A document made in a new design, opened by an old cached copy of the app, falls back to the plain base look. That is acceptable; do not add code for it.

### B3. Three new brand variables
Where the app sets `--brand-rule` and `--brand-rule-soft` on the document, also set, with the existing `rgba()` and `shade()` helpers:
- `--brand-wash`: the brand colour at 7% opacity
- `--brand-tint`: the brand colour at 16% opacity
- `--brand-deep`: `shade(brand, -.35)`

### B4. Design four: **Silk** (id `silk`)
**Character:** soft, modern and light. White paper with a pale wash of the brand colour, clean sans-serif name, rounded total. Made for beauty, fashion and lifestyle brands.

| Part | Look |
|---|---|
| Paper | White `#FFFFFF`. Rules in the brand colour (as Atelier). |
| Header | Pale brand wash across the full width. A single hairline in the brand colour under it, inset to the margins. |
| Business name | Manrope, weight 800, tight letter-spacing, in the brand colour. |
| Document word ("Invoice") | Cormorant Garamond italic, large, in the brand colour. No gold foil. |
| Logo | Rounded corners (14px). |
| Table header | Labels in the brand colour, over a 2px line in the brand tint. |
| Total | A solid brand-colour block with 14px rounded corners, white text. |
| Bank box | Pale brand wash, 14px rounded corners, no corner brackets. |
| Status pill | Pale brand wash behind it. |
| Footer | Pale brand wash across the full width. Thank-you line in the brand colour. |

```css
/* --- Template: SILK (white, soft brand wash, rounded) --- */
.t-silk { --paper: #FFFFFF; --p-rule: var(--brand-rule); --p-rule-soft: var(--brand-rule-soft); }
.t-silk .inv-head { background: var(--brand-wash); align-items: center; padding-top: 60px; padding-bottom: 44px; }
.t-silk .inv-head::after { content: ""; position: absolute; left: 56px; right: 56px; bottom: 0; height: 1px; background: var(--brand-rule); }
.t-silk .biz-name { font-family: var(--f-body); font-weight: 800; font-size: 28px; letter-spacing: -.02em; color: var(--brand); }
.t-silk .tagline, .t-silk .doc-no { color: var(--p-muted); }
.t-silk .doc-type { font-family: var(--f-accent); font-weight: 600; font-size: 66px; }
.inv.t-silk .foil, .inv.t-silk.static .foil { background: none; -webkit-text-fill-color: var(--brand); color: var(--brand); animation: none; }
.t-silk .logo-box img { border-radius: 14px; }
.t-silk .items th { color: var(--brand); border-bottom: 2px solid var(--brand-tint); }
.t-silk .grand { background: var(--brand); color: #FFFFFF; border-radius: 14px; padding: 18px 20px; }
.t-silk .bank { background: var(--brand-wash); border-radius: 14px; }
.t-silk .bank::before, .t-silk .bank::after { display: none; }
.t-silk .pill { background: var(--brand-wash); }
.t-silk .inv-foot { background: var(--brand-wash); margin-top: auto; }
.t-silk .inv-foot .ty { color: var(--brand); }
```
Thumbnail:
```css
.tpl[data-template="silk"] i { background:
  linear-gradient(var(--tb, #1A1817), var(--tb, #1A1817)) 86% 80% / 36% 9% no-repeat,
  linear-gradient(rgba(255,255,255,.9) 0 30%, transparent 30%),
  linear-gradient(var(--tb, #1A1817) 0 30%, #fff 30%); }
```
**In the code's branches on the design, Silk follows Atelier** (brand-coloured monogram and lines, white paper).

### B5. Design five: **Heritage** (id `heritage`)
**Character:** warm ivory paper framed by a narrow woven band in the brand colour with a gold thread running through it, inspired by hand-woven cloth. Classic serif type and gold foil, like Royal, but lighter on the page. The band is narrow on purpose: it should read as a fine trim, not as a pattern.

| Part | Look |
|---|---|
| Paper | Ivory `#FFFDF9`. |
| Top band | 26px tall, full width: vertical stripes of the brand colour, a deeper shade, a gold thread and ivory, with very fine horizontal lines over it to suggest weaving. |
| Bottom band | The same band, 12px tall. |
| Header | On the ivory, below the band. Business name in Playfair, document word in gold foil (the defaults). Two fine gold lines under the header, inset to the margins. |
| Table header | Labels in the brand colour, over a 2px line in the brand colour. |
| Total | No block. The brand colour, between a 2px line above and below. |
| Footer | A fine rule above it; it sits clear of the bottom band. |

```css
/* --- Template: HERITAGE (woven band, gold thread) --- */
.t-heritage {
  --weave: repeating-linear-gradient(0deg, rgba(0,0,0,.14) 0 1px, transparent 1px 3px),
           repeating-linear-gradient(90deg,
             var(--brand) 0 14px, var(--brand-deep) 14px 18px, var(--gold-solid) 18px 20px, var(--brand-deep) 20px 24px,
             var(--brand) 24px 46px, #FFFDF9 46px 48px, var(--brand) 48px 52px, #FFFDF9 52px 54px);
}
.t-heritage::before, .t-heritage::after { content: ""; position: absolute; left: 0; right: 0; background: var(--weave); z-index: 1; pointer-events: none; }
.t-heritage::before { top: 0; height: 26px; }
.t-heritage::after { bottom: 0; height: 12px; }
.t-heritage .inv-head { margin: 0 56px; padding-left: 0; padding-right: 0; padding-top: 76px; padding-bottom: 34px; }
.t-heritage .inv-head::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 4px; border-top: 1px solid var(--gold-solid); border-bottom: 1px solid var(--gold-solid); }
.t-heritage .tagline, .t-heritage .doc-no { color: var(--p-muted); }
.t-heritage .items th { color: var(--brand); border-bottom: 2px solid var(--brand); }
.t-heritage .grand { color: var(--brand); padding: 14px 0; border-top: 2px solid var(--brand); border-bottom: 2px solid var(--brand); }
.t-heritage .inv-foot { margin-top: auto; border-top: 1px solid var(--p-rule); padding-bottom: 28px; }
.t-heritage .inv-foot .ty { color: var(--brand); }
```
Thumbnail:
```css
.tpl[data-template="heritage"] i { background:
  repeating-linear-gradient(90deg, var(--tb, #1A1817) 0 6px, #C9A86A 6px 7px, var(--tb, #1A1817) 7px 12px, #FFFDF9 12px 13px) top / 100% 9% no-repeat,
  repeating-linear-gradient(90deg, var(--tb, #1A1817) 0 6px, #C9A86A 6px 7px, var(--tb, #1A1817) 7px 12px, #FFFDF9 12px 13px) bottom / 100% 4% no-repeat,
  #FFFDF9; }
```
**In the code's branches on the design, Heritage follows Royal** (the default branch: gold monogram and lines).
Check: the existing "Made with Aurum Invoice Studio" line sits 10px from the bottom and would land on the bottom band. In Heritage, lift it to 18px from the bottom.

### B6. The picker
- Both lists become: Royal, Atelier, Noir, Silk, Heritage, in that order.
- A design that is not in `ent.designs` shows a small lock in the corner of its thumbnail and can still be **previewed**: tapping it shows the document in that design with the sheet `{Silk} is part of {Pro}.` and the price line, buttons `See plans` · `Not now`. Choosing `Not now` returns to the design that was selected before. It is never saved to a document unless the plan allows it.
- Atelier and Noir name Starter in that sheet. Silk and Heritage name Pro.

---

## C. Openings

### C1. How an opening works today
- The list is the object `REVEALS` (`envelope`, `gift`, `card`, `none`), each with a `name` and the `tap` line shown under it. Picker icons are in `RV_ICONS`. The id is stored as `doc.reveal`.
- `revealStage(style, B, D, P)` returns `{ html, play(cv, done), after? }` for a style.
- Each opening is two functions: one returns the markup (`envelopeHTML`, `giftHTML`, `cardHTML`), one plays it (`openEnvelope`, `openGift`, `openCard`). They animate with `element.animate(...)` and `fill: "forwards"`, pause with `await wait(ms)`, vibrate with `buzz(...)`, fade the words around the stage with `$$(".intro > :not(.env-stage)", cv)`, and hand over with `finale(element, baseTransform, onDone)`, which grows the paper towards the reader, fades it and shows the document page.
- The thing the client taps is always `<button class="seal-btn" type="button" id="sealBtn">`.
- The stage is `.env-stage` inside `.intro.is-{id}`. Gold dust already drifts behind every opening.
- If the phone asks for reduced motion, there is no opening at all. Keep that.
- An unknown id falls back to the envelope. Keep that.

### C2. The budget every new opening must stay inside
1. Animate **`transform` and `opacity` only**.
2. No new `filter`, `backdrop-filter`, `mix-blend-mode`, `mask`. No animated `box-shadow`, `clip-path`, `width`, `height`, `top` or `left`. (The envelope's existing SVG filters are tested and stay as they are.)
3. At most 14 moving elements. At most 2 elements with a still `box-shadow`. No new canvas, no image files, no video, no new fonts.
4. From the tap to the document page: between 2.5 and 4.0 seconds.
5. Sizes in `min(px, vw)` with `aspect-ratio`, so it fits a 320px-wide phone.
6. Colours come from the brand colour through `shade()`. For a nearly black brand colour use `#1C1A18`, exactly as the gift box does (`lum(brand) < .012`).
7. The paper that appears uses `letterInner(B, D)`, like the envelope's letter, so every opening reveals the same paper.
8. No 3D video version. The video code paths for the envelope and gift box stay switched off and untouched.
9. Test on the Infinix Note 30 by opening a client link. If it stutters: first remove the still shadows, then shorten the longest movement by a fifth. If it still stutters, stop and ask.

Shared paper for the three new openings (same look as the envelope's `.letter`; copy its colours and type):
```html
<div class="rv-letter" id="rvLetter">${letterInner(B, D)}</div>
```

### C3. Opening four: **Royal scroll** (id `scroll`)
- **Picker name:** `Royal scroll`. **Tap line:** `Untie the scroll`.
- **Idea:** a rolled parchment on two rods with gold ends, tied with a ribbon and closed with the business's wax seal. The seal is pressed, the ribbon slips away, and the scroll unrolls downward to show the paper.

**Stage:** `.scroll`, width `min(250px, 64vw)`, `aspect-ratio: .62`.

| Element | What it is |
|---|---|
| `.sc-win` `#scWin` | The window the paper appears in. Fills the stage below the top rod. `overflow: hidden`. |
| `.rv-letter` `#rvLetter` | Inside the window. Parchment `#F6EEDC`, with a 1px gold hairline frame 8px in from its edge. Starts at `translateY(-100%)`. |
| `.sc-rod.top` `#scTop` | A rod across the top, 7% of the stage's height, 6% wider than the paper on each side. Colour: a top-to-bottom gradient from `shade(c, .25)` through `c` to `shade(c, -.5)`. A round gold knob at each end (pseudo-elements, radial gradient `#F5E7BE` to `#8A6A35`). |
| `.sc-rod.bottom` `#scBot` | The same rod. Starts directly under the top rod. |
| `.sc-ribbon.l` `#scRibL`, `.sc-ribbon.r` `#scRibR` | Two halves of a ribbon crossing the two rods at the middle, in the brand colour, 9% of the stage's width tall. |
| `.wax` `#scSeal` | The wax seal (`waxSVG(initials(B.name), wax, B.name)`), 30% of the stage's width, centred over the ribbon. `#sealBtn` sits over it. |

**Sequence** (times in milliseconds from the tap):
| At | What happens |
|---|---|
| 0 | `buzz(10)`. Seal presses: `scale(1)` → `scale(.94)` → `scale(1)`, 260. |
| 200 | Words around the stage fade out, 600. Ribbon halves slide apart and fade: left to `translateX(-70%)`, right to `translateX(70%)`, opacity to 0, 520, easing `cubic-bezier(.5,0,.75,0)`. |
| 320 | Seal falls away: to `translateY(120%) rotate(18deg)`, opacity to 0, 600. |
| 760 | `buzz(6)`. Measure the window's height `h`. The paper moves from `translateY(-100%)` to `translateY(0)`; the bottom rod moves from `translateY(0)` to `translateY(h px)`, passing `translateY(h × 1.015)` at 88% for a small settle. Both 1500, easing `cubic-bezier(.3,0,.2,1)`. |
| 2560 | Rods fade: opacity to 0, 400, the top one drifting up by 30% of its height and the bottom one down. |
| 2800 | Set the window's `overflow` to `visible`, then `finale(scWin, "", onDone)`. |

About 3.4 seconds in all.

Icon: `scroll: '<path d="M6 5h12M6 19h12M8 5v14M16 5v14M10.5 10h3M10.5 13h3"/><circle cx="5" cy="5" r="1.2"/><circle cx="19" cy="5" r="1.2"/><circle cx="5" cy="19" r="1.2"/><circle cx="19" cy="19" r="1.2"/>'`

### C4. Opening five: **Grand doors** (id `doors`)
- **Picker name:** `Grand doors`. **Tap line:** `Open the doors`.
- **Idea:** tall double doors in the brand colour with gold handles, held shut by the business's wax seal. The seal lifts, the doors swing open inward, warm light comes through, and the paper comes forward. It matches the app's own language of "My house".

**Stage:** `.doors`, width `min(300px, 76vw)`, `aspect-ratio: .82`, `perspective: 1200px`, `perspective-origin: 50% 45%`.

| Element | What it is |
|---|---|
| `.dr-frame` | The door frame: a border in `shade(c, -.6)`, 5% of the stage's width, with a 1px gold line just inside it. |
| `.dr-light` `#drLight` | Behind the doors: `radial-gradient(ellipse at 50% 45%, rgba(245,231,190,.9), rgba(204,150,60,.35) 45%, transparent 72%)`. Starts at opacity 0. |
| `.rv-letter` `#rvLetter` | Behind the doors, centred, 62% of the stage's width. Starts at `scale(.86)`, opacity 0. |
| `.dr-leaf.l` `#drL`, `.dr-leaf.r` `#drR` | The two doors, each half the opening's width and its full height. `transform-origin: left center` for the left, `right center` for the right. Colour: a gradient from `shade(c, -.15)` to `shade(c, -.5)`. Each has two raised panels drawn as 1px gold lines (`rgba(217,190,132,.5)`), one above the other, and a gold handle (a small upright pill, gold foil colours) near the edge where the doors meet. Each holds a `.shade` layer (black, opacity 0) for the darkening as it turns. |
| `.wax` `#drSeal` | The wax seal, 28% of the stage's width, centred where the doors meet. `#sealBtn` sits over it. |

**Sequence:**
| At | What happens |
|---|---|
| 0 | `buzz(12)`. Seal presses: `scale(1)` → `scale(.94)` → `scale(1)`, 260. |
| 200 | Words fade out, 600. Seal lifts and fades: to `scale(1.12)`, opacity 0, 380. |
| 520 | `buzz([6, 40, 10])`. Doors swing **inward, away from the viewer**: the left from `rotateY(0deg)` through `rotateY(3deg)` at 10% to `rotateY(84deg)`; the right the same with negative angles. 1500, easing `cubic-bezier(.55,0,.25,1)`. Their `.shade` goes to opacity .55 over the same time. |
| 820 | Light fades in: opacity 0 to 1, 1200. |
| 1020 | Paper fades in, 600, and grows from `scale(.86)` to `scale(.94)` over 1000. |
| 2300 | Doors and frame fade to opacity 0, 400. |
| 2500 | `finale(rvLetter, "scale(.94)", onDone)`. |

About 3.1 seconds in all. Check by eye that the doors open away from the viewer; if they come towards the viewer, swap the two signs.

Icon: `doors: '<rect x="4" y="3" width="16" height="18"/><path d="M12 3v18M10 11.5v2M14 11.5v2"/>'`

### C5. Opening six: **Gold serving dome** (id `dome`)
- **Picker name:** `Gold serving dome`. **Tap line:** `Lift the lid`.
- **Idea:** a polished gold dome on a tray, as a fine restaurant serves a dish, with the business's seal on its front. The dome lifts away and the paper rises from the tray. Made for food, catering, events and hospitality, and it suits anyone who wants to say "served with care".

**Stage:** `.dome`, width `min(290px, 72vw)`, `aspect-ratio: 1.05`.

| Element | What it is |
|---|---|
| `.dm-tray` `#dmTray` | An oval at the bottom: the full width, 16% of the stage's height, `border-radius: 50%`. Gold: `linear-gradient(180deg, #F5E7BE, #B8935A 45%, #8A6A35)` with a darker oval inside it (a second layer) to give a rim. |
| `.dm-glow` `#dmGlow` | Above the tray, behind the paper: a soft warm radial gradient. Starts at opacity 0. |
| `.rv-letter` `#rvLetter` | Standing on the tray, centred, 52% of the stage's width. Starts at `translateY(8%) scale(.9)`. It is hidden only because the dome is in front of it. |
| `.dm-cover` `#dmCover` | The dome: 80% of the stage's width, 62% of its height, its base on the tray. `border-radius: 50% 50% 0 0 / 100% 100% 0 0`. Polished gold: `linear-gradient(100deg, #8A6A35 0%, #E9D39E 24%, #B8935A 42%, #F5E7BE 56%, #A07D42 76%, #E2C88E 100%)`. One pale highlight streak (a pseudo-element, a white gradient at 35% opacity, a narrow curved strip on the left). A round gold knob on top (a second pseudo-element). |
| `.wax` `#dmSeal` | The wax seal, 26% of the stage's width, on the front of the dome and inside `#dmCover`, so it lifts with it. |
| `#sealBtn` | Covers the upper two-thirds of the dome. |

**Sequence:**
| At | What happens |
|---|---|
| 0 | `buzz(10)`. Dome dips: `scale(1)` → `scale(.985)` → `scale(1)`, 200. |
| 200 | Words fade out, 600. |
| 240 | `buzz(6)`. Dome lifts: from `translateY(0) rotate(0deg)` through `translateY(-8%) rotate(0deg)` at 25% to `translateY(-120%) rotate(-9deg)`; opacity stays 1 until 70%, then goes to 0. 1300, easing `cubic-bezier(.4,0,.2,1)`. |
| 500 | Glow: opacity 0 → 1 → .6, 900. |
| 600 | Paper rises: from `translateY(8%) scale(.9)` to `translateY(-6%) scale(1)`, 900, easing `ease-out`. |
| 1700 | Tray and glow drop and fade: to `translateY(30%)`, opacity 0, 500. |
| 1950 | `finale(rvLetter, "translateY(-6%)", onDone)`. |

About 2.6 seconds in all.

Icon: `dome: '<path d="M4 17a8 8 0 0 1 16 0z"/><path d="M2.5 19.5h19"/><circle cx="12" cy="7.2" r="1.2"/>'`

### C6. Wiring the three in
1. `REVEALS`: add, **before** `none`, in this order:
   `scroll: { name: "Royal scroll", tap: "Untie the scroll" }`, `doors: { name: "Grand doors", tap: "Open the doors" }`, `dome: { name: "Gold serving dome", tap: "Lift the lid" }`.
2. `RV_ICONS`: add the three icons above.
3. New functions, written like the existing ones: `scrollHTML` and `openScroll`, `doorsHTML` and `openDoors`, `domeHTML` and `openDome`.
4. `revealStage`: add a line for each, in the same form as the `card` line, with no `after`.
5. Each `sealBtn` gets an `aria-label` in the form the card uses: ``Reveal your ${document word}``.
6. Styles go under `.is-scroll`, `.is-doors`, `.is-dome` and the class names in the tables.

### C7. The envelope, with more detail
You asked for a more detailed envelope. These six additions sit on top of the existing envelope. **Nothing in its current markup, timing or sequence changes.** Each addition stands alone: if one causes a stutter on the test phone, remove that one and keep the rest.

1. **Addressed by hand.** The client's name written on the front of the envelope, on the lower pocket, in the signature typeface: `var(--f-sign)`, `clamp(20px, 6.4vw, 28px)`, colour `#EAD7A6` at 85% opacity, centred, one line, cut off with "…" if too long. It fades and drops with the pocket in step 5 of the sequence. Nothing is shown when there is no client name.
2. **"Private" mark.** At the top left of the envelope front, small gold capitals: `PRIVATE · {document number}`, 8px, letter-spacing `.24em`, colour `#C9A86A` at 70% opacity.
3. **Foil lattice lining.** The gold lining (`.env-liner`) gains a fine diamond pattern over its existing background: two `repeating-linear-gradient` layers at 45 and -45 degrees, 1px lines of `rgba(233,211,158,.22)` every 9px.
4. **Gilded letter.** The letter gains a gold top edge (1.5px, `#C9A86A`) and a 1px hairline frame of `rgba(184,147,90,.35)` set 6px inside its edge.
5. **Shadow at the lip.** A soft dark strip along the top edge of the pocket (a still gradient), which fades from opacity 0 to .5 and back to 0 while the letter slides out.
6. **A fuller break.** Nine wax crumbs instead of six when the seal cracks.

Whether this is the kind of "more detailed" you meant is decision 2 in part F.

### C8. The opening picker
- Order: Wax-seal envelope, Gift box, Invitation card, Royal scroll, Grand doors, Gold serving dome, Straight to invoice.
- An opening that is not in `ent.openings` shows a small lock. Tapping it plays a **preview** of that opening with sample paper, then shows the sheet `{Royal scroll} is part of {Pro}.` with the price line, buttons `See plans` · `Not now`. It is not saved to the document.
- Gift box and Invitation card name Starter. The three new ones name Pro.
- This replaces today's rule that a free user can only choose the envelope (`isFree() && ... !== "envelope"`).

---

## D. Which plan gets what

These lists go into the `plan_rules` table from file 07.

| Level | `designs` | `openings` |
|---|---|---|
| `free` | `royal` | `envelope`, `none` |
| `starter` | `royal`, `atelier`, `noir` | `envelope`, `gift`, `card`, `none` |
| `signature` | `royal`, `atelier`, `noir` | `envelope`, `gift`, `card`, `none` |
| `pro` | all five | all six, and `none` |
| `prestige` | all five | all six, and `none` |

Until Build 3 is released, the `pro` and `prestige` rows hold only the ids that exist. Adding the new ids to those two rows is the last step of Build 3.

The server already refuses a design or opening outside the lists when a link is published (file 07, `publish_invoice`).

---

## E. What you test (Zip 3)

On your own phone, and on the Infinix Note 30:
1. Make one invoice in each of the five designs, with your logo and a long business name. Check each as a link, a PDF and an image. The PDF must look the same as the screen.
2. In Silk and Heritage, try a receipt with the Paid stamp, a quotation, a watermark, an item photo, and the bright white and ivory papers.
3. Try Silk and Heritage with three brand colours: a dark green, a wine red and black.
4. Send yourself a link with each of the six openings. Each should play smoothly, take between about 2.5 and 4 seconds, and end on the document page.
5. The envelope shows the client's name on the front, and still opens exactly as before.
6. On a Free account: only Royal and the envelope can be chosen; the others preview and then offer the plan, calmly.
7. On a Starter account: Silk, Heritage and the three new openings preview and offer Pro.
8. With "reduce motion" switched on in the phone's settings, a link opens straight to the document.
9. In the app, the two pickers scroll smoothly on the Infinix.

---

## F. Decisions I need from you

1. **The two designs: Silk and Heritage.** Silk is soft and modern for beauty and fashion brands. Heritage has a narrow woven band inspired by hand-woven cloth. If you would rather have a formal, centred "engraved stationery" design in place of one of them, say which one to replace.
2. **The envelope's six additions** (part C7). Is that what you meant by a more detailed envelope? If you meant something else, such as a different shape, a ribbon or a different paper, tell me what.
3. **The three openings: Royal scroll, Grand doors, Gold serving dome.** If you dislike one, the spare idea is a **velvet curtain** that parts like a stage. Say which to swap.
4. **The names.** "Gold serving dome" is plain on purpose, because "cloche" is not a word most people use. Say if you prefer another name.

## G. Not in this file
- Changing the logo. The logo prompt in `marketing/2-LOGO-PROMPT.md` is yours to use or not.
- Sounds. Openings stay silent; phones vibrate lightly where they can.
- Letting a business design its own opening or upload a design.
- New fonts or a font picker.
