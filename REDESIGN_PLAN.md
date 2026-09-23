# Redesign Plan — Baseline Educational Services

Scope check against the current repo (Next.js App Router + Tailwind v4 + framer-motion):

- **Colours already match your brief.** `--color-ink-900` = `#0B2545` (navy), `--color-gold-500` = `#E31C5F` (crimson). These are legacy token *names* from an earlier palette but already hold your navy/crimson values (see `globals.css` comment). I'll keep the token names (renaming ~40 files' `text-gold-500`/`bg-ink-900` classes is pure risk for zero visual change) and just document the mapping.
- **Fonts are 3, not 2.** Merriweather (display) + Inter (body) are already the main pair, but Montserrat Light is still loaded and used for the hero H1 via a `.font-hero` class. Dropping Montserrat is a real, scoped fix.
- **Found the invisible-button bug** you flagged: on `/destinations/[country]`, the "Ask About … on WhatsApp" button uses the `outline-light` variant (white text/border) but sits on `PageHero`'s light `bg-offwhite` background — white-on-white. Confirmed, will fix.
- **Floating-element stack confirmed**: `WhatsAppButton` (bottom-right, all breakpoints) + `ChatWidget` bubble (bottom-right, stacked above it) + `MobileBottomBar` (sticky, mobile only) + `ConsentBanner` (bottom, `bottom-20` on mobile — sits just above the bottom bar today, not covering it, but there's no equivalent desktop-specific placement and three floating things stack on mobile above the bar).
- **Success Stories section ships placeholder cards today** (`[Student Name]`, `S1`, `[Partner University]`) with `consentGiven: false` on every entry — currently rendered unconditionally on the homepage and `/success-stories`. Needs the hide-until-real-data gating your brief requires.
- **Homepage section order today**: Hero → TrustStrip → DestinationShowcase → Services → HowItWorks → ToolsTeaser → SuccessStories (navy) → StatsStrip (navy, currently off via `showStats: false`) → TeamPreview → BlogPreview → FaqPreview → FinalCta. That's two navy sections already (Success Stories + Stats) — I'll consolidate to one navy "moment" as instructed, and move it to Tools per your brief.
- **`SmoothScrollProvider`** (Lenis + GSAP ScrollTrigger) and **`CursorFollower`** (custom dot cursor) and **`LoadingScreen`** (1.3s splash intro blocking first paint) are global, currently-shipped extras that work against "calm, minimal" and the LCP < 2.5s target. Proposing removal of all three — details below.

Nothing about routes, data fetching, Supabase schema, forms, or business logic changes. This is styling/markup/animation/structure only, file by file.

---

## 1. Global foundation (commit 1)

**Tokens / CSS** (`src/app/globals.css`, `tailwind.config` doesn't exist — v4 uses `@theme inline` in CSS, already the pattern here)
- Add a documented alias block so the palette maps are explicit in code, not just a comment (keep `ink-*`/`gold-*` as the actual Tailwind utilities used everywhere; this is just clarity, not a rename).
- Add `--radius-card: 12px`, pill buttons already use `rounded-full` — keep.
- Add two shadow tokens (`--shadow-soft`, `--shadow-hover`) to replace the ad-hoc `shadow-[0_1px_2px_rgba(...)]` / `shadow-[0_20px_40px_...]` strings scattered across `Card`, service cards, tool cards.
- Type scale: add `clamp()`-based utility classes (`text-h1`, `text-h2`, `text-h3`, `text-body`) in `globals.css` so `SectionHeading`/`PageHero`/`Hero` all pull from one scale instead of each hardcoding its own `clamp()`.
- Remove Montserrat: drop the `Montserrat` import and `.font-hero` class; hero H1 moves to `font-display` (serif), matching "H1 serif" in your brief.

**Remove** (`src/app/layout.tsx`, `src/components/layout/`)
- `CursorFollower` — desktop-only gimmick, no functional value, adds a `mousemove` listener + spring on every page; cut for the fintech-calm direction.
- `LoadingScreen` — a full-screen splash that blocks paint for up to 1.3s on first visit; directly works against the LCP target. Cut.
- `SmoothScrollProvider` (Lenis + GSAP ScrollTrigger) — fights native scroll, adds two libraries' worth of JS, and complicates the new hide-on-scroll-down header. Switch to native scroll; keep `gsap` only where `globe-canvas.tsx` already imports it (unrelated to scroll).
- Keep `PageTransition` (cheap, purely cosmetic fade/slide) — low risk, matches "quiet" motion.

**New shared components** (`src/components/ui/`)
- `Section.tsx` — thin wrapper enforcing the alternating `bg-white`/`bg-offwhite` rhythm + consistent vertical padding, replacing repeated `<section className="bg-offwhite py-20 sm:py-28">` in every section file.
- `Chip.tsx` — small pill component (used for hero trust chips, quick-start destination pills, FAQ/blog category pills).
- `StatCounter.tsx` — wraps existing `Counter` with label + icon layout, used by the new trust-strip stat band and reused on tool preview cards.
- `StickyCTA.tsx` — new **unified** floating-action component replacing the current `WhatsAppButton` + `ChatWidget` launcher button:
  - Mobile: renders nothing itself (the existing `MobileBottomBar` stays as the only persistent mobile CTA); the AI chat becomes a small "Ask a question" entry inside that bar's overflow, or a teaser that only appears after 20s / 50% scroll (kept from existing `ChatWidget` teaser logic, just gated harder).
  - Desktop: single circular FAB, bottom-right, that expands into "WhatsApp" + "Chat" on hover/tap (replacing two separate floating buttons with one).
- Existing `Button`, `Card`, `SectionHeading`, `PageHero`, `Reveal`/`RevealGroup`/`RevealItem`, `Counter` are solid and stay, with class-level tweaks (shadow tokens, focus rings) rather than rewrites.

**Header** (`src/components/layout/header.tsx`)
- Restructure `primaryNav`/`nav.ts` from 10 flat items into: `Destinations ▾` (mega-menu with `<Flag>` next to each of the 6 countries + "Anywhere else" row), `Services ▾`, `Free Tools ▾` (rename "Tools"), `Success Stories`, `Resources ▾` (Blog + FAQ, new grouping), `About ▾` (About, Partners, Contact — new grouping). Right side: search icon + "Book a Free Consultation" pill (unchanged).
- Scroll behaviour: transparent-over-hero → solid white + shadow + reduced height past 80px (logic partly exists via `scrolled` state at 24px; adjust threshold and add hide-on-scroll-down/show-on-scroll-up via scroll-delta tracking).
- Mobile menu: convert the current inline accordion dropdown into a full-screen sheet (`fixed inset-0`) with 48px+ tap targets, accordion submenus per group, WhatsApp + Book buttons pinned to the bottom of the sheet.
- Add `aria-expanded` to all dropdown/accordion triggers (currently only on the hamburger).

**Nav data** (`src/data/nav.ts`)
- Regroup into `resourcesNav` (Blog, FAQ) and `aboutNav` (About, Partners, Contact); `destinationsNav` already has all 6 + Other, just needs flag codes threaded through for the mega-menu.

**Cookie banner** (`src/components/layout/consent-banner.tsx`)
- Desktop: reposition bottom-left, compact bar (not centered modal-like card).
- Mobile: sits directly above `MobileBottomBar` with matching width, never overlapping it (currently `bottom-20` already clears the bar visually, but I'll make the offset reference the bar's actual height via a CSS var instead of a magic number, so it can't drift).
- Give Accept/Decline equal visual weight (currently Accept is `Button` primary, Decline is `secondary` — already roughly equal; will confirm equal padding/size, matching NDPA equal-prominence requirement explicitly).

**Accessibility pass (global)**
- Audit focus-visible rings (one exists globally via `:focus-visible` in `globals.css`, but confirm all custom buttons/links don't suppress it).
- Add `aria-expanded`/`aria-controls` to FAQ accordion, header dropdowns, mobile sheet.
- Fix the destinations WhatsApp-button contrast bug (swap `outline-light` → `secondary` variant on light `PageHero` backgrounds; audit every other `outline-light` usage for the same light-background mistake).

**Performance**
- Audit `next/image` usage across homepage (destination cards, trust strip, blog thumbnails) for correct `sizes`, add `loading="lazy"` below the fold (Next defaults to lazy already outside `priority`, will double check hero/first-viewport images use `priority` correctly and nothing below the fold is marked `priority`).
- Remove Lenis/GSAP-scroll and the splash screen (above) as the two biggest LCP/TBT wins available without touching business logic.

---

## 2. Homepage (commit 2, section by section)

- **Hero** (`hero.tsx`): stronger bottom-up gradient; H1 → serif (`font-display`), 2-line clamp; swap the `Play` icon on the WhatsApp button for the actual WhatsApp glyph (already have the SVG in `WhatsAppButton`/`MobileBottomBar` — extract to a shared `WhatsAppIcon` component); replace the uppercase "Admissions · Scholarships · Visa Guidance" line with 3 `Chip`s ("Free consultation", "Real counsellors in Abuja", "Any country"); add the quick-start destination pill selector (new small client component, `hero-quickstart.tsx`) linking to each `/destinations/[slug]` or `/tools/course-matcher` for "Not sure"; headline word stagger + Ken Burns handled with CSS `@keyframes` + `prefers-reduced-motion` guard (no new library).
- **Trust strip** (`trust-strip.tsx`): replace the placeholder-logo marquee ("UK-1, IE-1…") with the `StatCounter` band using `siteSettings.stats` (kept hidden/zeroed exactly as now — I will not invent numbers, just swap the *presentation* so that when real numbers are added the section is a stat band, not fake logos). Marquee code is kept dormant/documented for the day real partner logos exist (grayscale → colour on hover, pause on hover — small CSS addition).
- **Destinations showcase** (`destination-showcase.tsx`): confirm no baked-in text on the photos (spec says fix this — will check the actual `/public/destinations/*.png` assets; if any has text baked in I'll flag it in `CONTENT_TODO.md` since these are photo assets, not something I can re-shoot, but will make sure no *new* HTML text duplicates on top of them, which is already the case). Add mobile snap-scroll carousel (currently a plain grid). Add 2 quick facts per card pulled from `destination.tuitionRangeNgnPerYear`/`postStudyWork` (data already exists, just not surfaced on the card). Merge the lone "Anywhere else" card into a full-width banner below the grid with the "Students also ask about" chips row inside it (currently a separate `<OtherDestinationsChips>` below the grid — will combine into one banner component).
- **Services** (`services-section.tsx`): keep the existing `Icon3D` line-adjacent set (already real icons, not emoji — this was fixed in the prior 3D-icons job), restructure the 5-card row into a bento grid (Admission Services + Visa Assistance as larger tiles), whole-card click already implemented via `<Link>` wrapping.
- **How it works** (`how-it-works.tsx`): replace the click-to-reveal stepper (5 of 6 steps hidden by default) with an always-visible horizontal timeline (desktop) / vertical timeline (mobile) using an SVG line with `stroke-dashoffset` driven by `framer-motion`'s `useScroll`/`useTransform` (no GSAP needed). Add "Step 1 is free →" CTA linking to `/book`.
- **Tools teaser** (`tools-teaser.tsx`): move to the navy "moment" section (`bg-ink-950`, replacing Success Stories' current navy background — see below), add live mini-previews (progress ring for match %, `Counter` count-up for cost, small dot-milestone row for timeline) using existing `Counter`/small new SVG components, no new libraries.
- **Success stories** (`success-stories-section.tsx` + `/success-stories` page + `stories-grid.tsx`): gate on real data — `testimonials.filter(t => t.consentGiven)`. If fewer than 3 pass, render a single "Your story could be next" CTA card instead of the section (or hide entirely on the homepage, single CTA on the dedicated page). Background moves to a light section (`bg-white`/`bg-offwhite`) since navy is now Tools' section. When real stories exist: photo, name, course, university, `<Flag>`, "Visa Approved" badge, one-line quote, draggable mobile carousel (`framer-motion` drag, already a dependency).
- **Stats strip** (`stats-strip.tsx`): stays gated by `showStats` exactly as now (off, zeroed placeholders) — no change to the truthfulness gating, only reusing it inside the new `StatCounter` component from §1 for the trust-strip band instead of a second near-duplicate section. May remove the standalone `StatsStrip` render from `page.tsx` if its content is now folded into the trust strip, to avoid two "impact" sections.
- **Blog & guides** (`blog-preview.tsx`): tighten thumbnails to consistent 16:9, category pill, 2-line clamp title, read time; hover zoom + underline animation.
- **FAQ** (`faq-preview.tsx`, `accordion.tsx`): animate height with a measured-height/grid-rows technique instead of any current abrupt toggle, rotate chevron, enforce single-open. Confirm/add `FAQPage` JSON-LD (check `faq/page.tsx` for existing schema; add if missing).
- **Final CTA** (`final-cta.tsx`): add a subtle animated gradient glow behind the buttons (CSS radial-gradient + slow keyframe), add a third low-pressure line: "Or call {siteSettings.phones[0]}" (data already exists).
- **Footer** (`footer.tsx`): increase link vertical spacing for 48px tap targets, add office hours line (`siteSettings.hours` already exists, just not rendered in the footer) under the address, add a visible `<label>` to the newsletter input (check `newsletter-form.tsx` — currently likely placeholder-only).

`page.tsx` section order becomes: Hero → TrustStrip(stats) → DestinationShowcase → Services → HowItWorks → **ToolsTeaser (navy)** → SuccessStories (conditional, light) → TeamPreview → BlogPreview → FaqPreview → FinalCta. (`StatsStrip` folded into TrustStrip per above, so it's likely removed from this list — will confirm once I'm in the code whether to keep both.)

---

## 3. `/book` (commit 3)

`booking-tool.tsx` gets the biggest structural change on the site:
- Convert to an explicit 3-step flow with a progress indicator: **① Type → ② Date & time → ③ Details**, driven by local step state (no new routing).
- Desktop: sticky summary card on the right showing the running selection ("Video call · Thu 24 Sept · 10:30 WAT").
- Date row: horizontal snap-scroll strip with prev/next arrow buttons; Sundays shown greyed-out/disabled rather than absent (check current date-generation logic first — if Sundays are already filtered out of the array, I'll change that to "included but disabled" instead).
- Time slots: pill grid, pink selected state (already close to this pattern based on the toggle styling elsewhere — will confirm current implementation).
- Details form: confirm input sizes, add inline validation messaging (react-hook-form + zod already wired per `validations.ts`), phone field gets a `+234` default and a "This is also my WhatsApp" checkbox (may need a small schema tweak in `validations.ts` — non-breaking additive field).
- Success state: replace/enhance with a lightweight confetti-lite check animation (CSS/framer-motion, no canvas-confetti dependency), booking summary, "Add to calendar" (confirm `.ics` generation already exists elsewhere in the codebase, e.g. timeline planner — reuse that utility if present), "Chat on WhatsApp" button.
- Remove `MobileBottomBar`/`WhatsAppButton`/`ChatWidget` from this specific route (via a route check in `SiteChrome`, similar to the existing `/admin` exclusion) so nothing distracts from finishing the booking.

---

## 4. `/destinations/[country]` (commit 4)

- Add a hero image per destination (the homepage already has `/destinations/{code}.png|webp` assets — reuse the same image as a `PageHero` background instead of the current plain text-on-offwhite header).
- Fix the invisible WhatsApp button (contrast bug above).
- Turn the 4 fact chips into bigger stat cards with icons (data/layout mostly exists already at `facts` array — mainly a visual upsize + icon treatment, already has icons via `lucide-react`, may swap to `Icon3D` for consistency with the rest of the site's icon system, matching your Job 3 pattern).
- Disclaimer text becomes small muted text with an info icon (already present, will check icon choice).
- Add a sticky in-page sub-nav (Overview · Costs · Courses · Visa · FAQ) on desktop — new small component, scroll-spy via `IntersectionObserver`.
- Add a "Compare with another country" link into the Cost Calculator, pre-filled via a query param the calculator already partially supports (booking tool has a similar `useSearchParams` prefill pattern from the destinations/other work — will mirror that for `cost-calculator-tool.tsx`).

---

## 5. `/tools/*` (commit 5)

`course-matcher`, `cost-calculator`, `timeline-planner`: restructure each into one-question-per-screen with a progress bar, 48px+ tap targets, back button, and a results screen ending in "Book a consultation to discuss your results" (already links to `/book` in at least the cost calculator; will confirm and standardise across all three) plus a "Share to WhatsApp" action (the `buildWhatsAppLink` helper already exists and is used this way in the cost calculator — extend the same pattern to course matcher and timeline planner results if not already there).

---

## 6. Motion tokens (applied throughout, not a separate commit)

Implemented as small shared constants (`src/lib/motion.ts`) so every component pulls the same numbers instead of hardcoding transitions: `fade-up` (opacity/y, 500ms, `[0.22,1,0.36,1]` ease, 60–80ms stagger, once), `hover-lift` (−4px, 200ms), `press` (scale 0.97), `count-up` (existing `Counter`, 1.2s), `draw-line` (scroll-linked SVG stroke), `ken-burns` (20s, hero only). All gated by the existing global `prefers-reduced-motion` CSS block plus per-component checks where JS-driven (matches current pattern already used in `Hero`/`HowItWorks`).

---

## 7. What I will NOT touch

- Supabase schema, API routes, `lib/validations.ts` business rules (only additive fields like the WhatsApp checkbox), admin dashboard, SEO metadata content (structure/JSON-LD stays, only visual presentation of pages changes), the Job-1/Job-2/Job-3 content already shipped (About copy, six-countries messaging, 3D icons, flags).
- No invented statistics, testimonials, partner logos, or founder info. Every gap gets a `[X]` placeholder and a line in `CONTENT_TODO.md`.

---

## Order of work & verification

1. Global (tokens, header, footer, floating CTA consolidation, cookie banner, remove cursor/loader/Lenis) → build + Lighthouse + widths check → commit.
2. Homepage, section by section → same verification → commit.
3. `/book` → commit.
4. `/destinations/[country]` (+ Cost Calculator prefill) → commit.
5. `/tools/*` → commit.
6. Remaining inner pages needing only incidental polish (services, partners, about, contact, blog/FAQ list pages) as a final pass → commit.
7. Final: full Lighthouse pass (target Performance ≥ 90 mobile / Accessibility ≥ 95), widths check at 360/390/768/1280/1440, `CONTENT_TODO.md` finalized, summary of changed files.

Each commit gets pushed to `claude/dazzling-meitner-e36i96` individually so you can review incrementally rather than one giant diff at the end.

**Waiting for your OK before writing any code**, per your process — flag anything above you want changed (e.g. if you'd rather keep the custom cursor/splash screen, or want the stat band and trust-strip kept as two separate sections).
