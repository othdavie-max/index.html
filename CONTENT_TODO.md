# Content TODO

Everything below is a placeholder, hidden, or estimate on the live site. None
of it was invented — each item is either clearly marked `[X]`/`PLACEHOLDER`
in the UI, or the section is coded to render nothing until real data is
supplied. Fill these in (or send them over and they'll be added) whenever
they're ready; nothing here blocks the site from working today.

## Hide-until-filled sections (currently invisible on the live site)

These render **nothing** right now — not a placeholder, just absent — because
the data files that feed them are empty or flagged off. Add real data to
switch them on.

- **Success Stories** (homepage + `/success-stories`) — `src/data/testimonials.ts`.
  All 6 entries are illustrative placeholders with `consentGiven: false`, so
  the site never shows them. Needs 3+ real, consented student stories
  (name, course, university, country, a real quote, `consentGiven: true`)
  before the grid appears; the Visa Approvals Wall needs `visaApproved: true`
  entries on top of that.
- **Team section** (`/about` "Meet the team", homepage) — `src/data/team.ts`
  + `siteSettings.showTeam` in `src/data/site-settings.ts` (currently `false`).
  Needs real counsellor names, roles, short bios and photos.
- **Stats / Trust band** (homepage, under the hero) — `siteSettings.stats`
  and `siteSettings.showStats` (currently `false`) in `src/data/site-settings.ts`.
  Needs real, verifiable figures: students placed, partner universities,
  years of experience. (`countries` is already set to `6`, matching the
  popular-destinations count — leave as is unless that changes.)
- **Partner university logos** (homepage trust strip) — currently replaced
  by the stats band per this redesign; once real partner logos exist, they
  can go back in as a marquee (`src/components/ui/marquee.tsx` is kept for
  this, just not currently used).
- **Founder details** (`/about`) — `src/data/about-content.ts` →
  `founderInfo` (`foundedYear`, `founderName`, `founderTitle`,
  `founderPhoto`). All empty; the About page only renders the founder line
  and photo once these are filled in.
- **Credentials / accreditations** (`/about`) — `src/data/about-content.ts` →
  `credentials` (currently an empty array, so the whole section is hidden).
  Add real accreditation bodies, membership names, or certifications.
- **Office photo** (`/about` "Visit Us in Abuja") — drop a real photo at
  `public/images/office.jpg`; the page checks for that file and only shows
  it if present.

## Real placeholder data currently shown (clearly marked, not hidden)

- **Partner universities** (`/partners`) — `src/data/partners.ts`. All 8
  entries use bracketed placeholder names like `[Partner University, UK #1]`
  so nobody mistakes them for confirmed partners. Replace with Baseline's
  actual partner list (name, logo, overview, popular courses, intakes).
- **Tuition, living cost, and visa figures** on every `/destinations/*`
  page and in the Cost Calculator (`src/data/destinations.ts`) are
  estimates, labelled as such on every page they appear. Worth a periodic
  review against current university/government figures.

## Contact & business details to confirm

All in `src/data/site-settings.ts`:

- `mapUrl` — confirm the exact Google Maps place link/coordinates for the
  Kubwa office.
- `whatsappNumber` — confirm this is the primary WhatsApp line the team
  wants leads routed to.
- `socials.facebook` / `socials.twitter` / `socials.instagram` — confirm
  these are the real, current handles.

## Legal pages

- `/terms` — section 4 (Fees) is a placeholder pending confirmed pricing;
  the whole page has a note to have it reviewed by a Nigerian lawyer before
  launch.
- `/privacy-policy` — has the same "have this reviewed by a Nigerian
  data-protection lawyer" note.

## From this redesign specifically

- The 6 destination card photos (`public/destinations/*.webp`) were
  generated to replace originals that had "STUDY · WORK · BUILD YOUR
  FUTURE" text baked into the image files. If Baseline has real campus/city
  photography it prefers instead, swap those files in (same filenames,
  `<code>.webp`, ~1400px wide).
