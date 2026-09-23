# Baseline Educational Services — Website

A production-ready marketing site + lead-generation platform + admin CMS for **Baseline Educational Services**, a Nigerian study-abroad consultancy based in Abuja. Built with Next.js (App Router), TypeScript, Tailwind CSS, Supabase, Resend and the Anthropic API.

> **Read this before launch.** This README ends with a full checklist of placeholder content that must be replaced with real, verified data before the site goes live. Nothing here should be trusted as a real statistic, price, partnership, or testimonial until you've replaced it.

---

## 1. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript, React 19 |
| Styling | Tailwind CSS v4, CSS custom properties for design tokens |
| Animation | Framer Motion, GSAP + ScrollTrigger, Lenis (smooth scroll) |
| 3D globe | [cobe](https://github.com/shuding/cobe) (lazy-loaded, falls back to a static grid) |
| World map | react-simple-maps (fetches topology client-side, falls back to a card list) |
| Backend | Supabase (Postgres, Auth, Storage, Row Level Security) |
| Email | Resend |
| AI assistant | Anthropic API (`@anthropic-ai/sdk`), streamed via a Next.js route handler |
| Forms | React Hook Form + Zod |
| Rich text (admin) | Tiptap |
| Icons | Lucide |
| Deployment target | Vercel |

## 2. How content is stored

Almost every piece of editable content (services, destinations, partners, team, FAQs, testimonials, blog posts, guides, cost data, exchange rates, timeline milestones, site settings) lives in **two places that are meant to stay in sync**:

1. **`src/data/*.ts`** — the source of truth for local development and the fallback the site uses when Supabase isn't configured. This is also what `supabase/seed.sql` was written to match.
2. **Supabase tables** (see `supabase/schema.sql`) — what the live site reads from once configured, and what the `/admin` dashboard edits.

`src/lib/content.ts` and each page's data-fetching code check for Supabase first and fall back to the local files automatically, so **the site runs and looks complete even with zero environment variables set** — useful for previews, but it means the admin dashboard's changes won't show on the public site until Supabase is actually configured and seeded.

The Course Matcher's scoring rules (`src/data/matcher-rules.ts`) are intentionally **not** database-backed — the original brief specifies these as a config file, and rule-based scoring logic belongs in code, not a CMS table.

## 3. Local setup

```bash
npm install
cp .env.example .env.local   # fill in what you have — see below
npm run dev                  # http://localhost:3000
```

The site works out of the box with **no environment variables set** — forms will submit successfully, but emails/database writes will silently no-op with a console log (`[email:skip] ...`) instead of erroring, and content pages fall back to the bundled `src/data/*.ts` content. This is intentional so you can develop and preview the whole site before wiring up real services.

### Environment variables

See `.env.example` for the full list with comments. Summary:

| Variable | Required for |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Correct canonical URLs, sitemap, JSON-LD |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Any database reads/writes, admin login |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side inserts from API routes (leads, bookings, applications, admin writes) — **never expose this to the browser** |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `TEAM_NOTIFICATION_EMAIL` | Transactional emails (booking confirmations, application receipts, lead notifications) |
| `ANTHROPIC_API_KEY` | The AI chat assistant — without it, the widget shows a friendly "not configured" message instead of erroring |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | The floating WhatsApp button and every "chat on WhatsApp" CTA site-wide |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID` | Analytics — both are no-ops when unset |

## 4. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run **`supabase/schema.sql`** — creates every table, RLS policy, and the two Storage buckets (`application-documents` private, `public-assets` public).
3. Then run **`supabase/seed.sql`** — populates FAQs, partners, team, testimonials, guides, destination content, and exchange rates with the same placeholder data as `src/data/*.ts`, so the admin dashboard has something to edit from day one.
4. Copy your project URL and anon/service-role keys into `.env.local`.
5. **Create your first admin user**: sign up a user via Supabase Auth (dashboard → Authentication → Add User, or have them register through `/admin/login` if you build a signup flow — none exists by default, admin users are created manually), then run:
   ```sql
   insert into profiles (id, role, full_name)
   values ('<the user''s auth.users id>', 'admin', 'Your Name');
   ```
   Without a `profiles` row, a logged-in user is treated as an `editor` by default (see `src/lib/supabase/get-admin-user.ts`) — both roles currently have the same permissions under RLS (`is_admin_or_editor()`); only a handful of policies (deleting leads, managing other users' profiles) are admin-only.
6. Re-run `supabase/schema.sql` any time you need to reset RLS policies — every statement is idempotent (`drop policy if exists` / `create policy`).

**Not verified against a live Supabase project.** This environment has no Supabase credentials, so the schema, RLS policies, and every Supabase-dependent code path (admin CRUD, leads/bookings/applications persistence, file uploads, auth) are implemented per the design above and pass TypeScript's structural checks, but have not been smoke-tested against a real database. Budget time to do that before launch — start with: sign in to `/admin`, create a test lead via the public site, confirm it shows up in `/admin/leads`, and do one full `/apply` submission with real file uploads.

## 5. Email (Resend)

1. Verify a sending domain at [resend.com](https://resend.com).
2. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (must be on the verified domain).
3. `TEAM_NOTIFICATION_EMAIL` is where lead/booking/application notifications go — defaults to the address in `src/data/site-settings.ts`.

Also unverified live (no API key in this environment) — the send calls and email templates (`src/lib/email.ts`) are implemented and the no-key fallback path was tested, but a real send was not.

## 6. AI assistant (Anthropic)

Set `ANTHROPIC_API_KEY`. The chat route (`src/app/api/chat/route.ts`) streams responses from `claude-sonnet-5` with a system prompt that:
- Never promises a specific admission/scholarship/visa outcome
- Never gives legal/immigration advice as authoritative
- Never invents Baseline-specific facts (partner names, fees, stats) — its knowledge base (`src/lib/chat-knowledge.ts`) is compiled directly from the site's own published content
- Prompts for name/WhatsApp after a few exchanges or signs of real intent, saving a lead (`source: ai-chat`) with the full transcript
- Always surfaces a "Talk to a human on WhatsApp" button

Rate-limited to 20 messages / 10 minutes per IP, 1000-character input cap, 20-turn history cap. **The streaming integration was not tested against a live model** — no `ANTHROPIC_API_KEY` was available in this environment. The UI, error states, and the "not configured" fallback were verified; a real conversation was not.

## 7. Deployment (Vercel)

1. Push this repo to GitHub/GitLab/Bitbucket and import it into Vercel.
2. Add all the environment variables from `.env.example` in the Vercel project settings.
3. Deploy. Vercel will use `npm run build` automatically.
4. **Point the existing domain**: in Vercel → Project → Settings → Domains, add `baselineeducationalservices.com` (and `www`), then update the domain's DNS records (at your registrar) to Vercel's provided A/CNAME records. Until DNS is switched, the current live site keeps working — this is a safe, reversible cutover.

## 8. What's real vs. scaffolded

Everything in this repo is real, working code — there are no fake buttons or dead-end flows. What's worth knowing:

- **Fully built and tested locally** (dev server + production build, Playwright-verified): every public page, the Course Matcher/Cost Calculator/Timeline Planner tools, the interactive world map (with a tested fallback), the booking flow, the 6-step application wizard with file uploads, guide-download gating, the blog/success-stories/guides content, and the AI chat widget's UI/UX.
- **Implemented but unverified against live third-party services** (no credentials in this build environment): Supabase persistence + RLS + Auth + Storage, Resend email delivery, and the Anthropic streaming chat responses. Each has a graceful "not configured" fallback so the rest of the site keeps working regardless — but budget real QA time against live services before launch.
- **Lighthouse/performance audits were not run** — no headless Lighthouse tooling was available in this environment. The build follows the brief's performance guardrails (lazy-loaded globe/map, `next/image`-ready structure, animate only transform/opacity, `prefers-reduced-motion` respected throughout, small-screen fallbacks for heavy widgets) but hasn't been scored.

## 9. Placeholder checklist — replace before launch

Everything below is clearly marked `PLACEHOLDER` or `[bracketed]` in the code/data so it's easy to find (search the repo for `PLACEHOLDER`).

- [ ] **Logo** — currently a text wordmark in `src/components/ui/logo.tsx`. Swap in the real logo (one component, used everywhere).
- [ ] **Photos** — team headshots, office photos, university logos are all placeholder initials/blocks (`src/data/team.ts`, `src/data/partners.ts`, About/Contact pages' "map embed placeholder" blocks).
- [ ] **Partner university list** — `src/data/partners.ts` / `partners` table uses deliberately fake names like `[Partner University — UK #1]` so nothing implies a real, unconfirmed partnership. Replace with Baseline's actual, confirmed partner list.
- [ ] **Testimonials** — `src/data/testimonials.ts` / `testimonials` table. Every row has `consent_given: false` and placeholder names/quotes. Only publish real testimonials with documented consent.
- [ ] **Cost calculator data** — `src/data/cost-data.ts` / `cost_items` table. Estimates only; verify against current university/country sources.
- [ ] **Exchange rates** — `src/data/exchange-rates.ts` / `exchange_rates` table. These move daily; verify or automate before launch.
- [ ] **Homepage stats** — `showStats` in `src/data/site-settings.ts` (and the Site Settings admin page) is **off by default**. Only turn it on once you have real, verified numbers — never ship placeholder stats live.
- [ ] **Social links** — `src/data/site-settings.ts` socials are placeholder URLs.
- [ ] **WhatsApp number** — confirm `NEXT_PUBLIC_WHATSAPP_NUMBER` / `whatsappNumber` is the correct primary line.
- [ ] **Guide PDFs** — `src/data/guides.ts` / `guides` table point to `/guides/PLACEHOLDER-*.pdf`, which don't exist yet. Upload real PDFs (to Supabase Storage's `public-assets` bucket or `/public/guides`) and update `file_url`.
- [ ] **Legal pages** — Privacy Policy, Terms, and the Cookie Notice are original drafts referencing the Nigeria Data Protection Act 2023, but are explicitly flagged in-page for legal review (especially fee/refund terms, which are placeholder pending confirmed pricing).
- [ ] **Blog author name** — posts are attributed to "Baseline Editorial Team"; adjust if you want named authorship.
- [ ] **Map embeds** — About and Contact pages have a labelled placeholder block instead of a real Google Maps iframe (avoided adding a real embed without a confirmed API key/policy).
- [ ] **Favicon / OG image** — currently the default Next.js favicon; replace `src/app/favicon.ico` and consider adding a proper Open Graph image.

## 10. Project structure

```
src/
  app/                    # Next.js App Router pages & API routes
    admin/                # Protected admin dashboard (auth-gated)
    api/                  # Route handlers: leads, bookings, applications, chat, contact, guides
    (public pages)/       # about, services, destinations, tools, blog, etc.
  components/
    admin/                # Admin shell + generic CRUD editor
    apply/, booking/      # Multi-step application wizard, booking flow
    chat/                 # AI chat widget
    destinations/         # Interactive world map
    home/                 # Homepage sections
    tools/                # Course Matcher, Cost Calculator, Timeline Planner
    ui/                   # Reusable design-system components
  data/                   # Local content + seed data (source of truth, see §2)
  lib/                    # Supabase clients, validation schemas, email, analytics, etc.
  types/                  # Shared TypeScript types
supabase/
  schema.sql              # Tables, RLS policies, storage buckets
  seed.sql                # Placeholder content matching src/data/*.ts
legacy/
  open-day-landing.html   # The original single-page site this repo replaced
```

## 11. Compliance notes baked into the product

- No page, tool, or AI response claims a guaranteed admission, scholarship, or visa outcome.
- The Cost Calculator and Course Matcher both carry visible "estimates only" disclaimers.
- The AI assistant's system prompt explicitly forbids inventing Baseline-specific facts.
- Cookie consent banner + Privacy Policy reference the Nigeria Data Protection Act 2023.
- All admin-only routes/tables are protected by Supabase RLS, not just UI-level checks.
