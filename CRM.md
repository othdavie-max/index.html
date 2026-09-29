# Lead-to-Meeting Engine (Phase 1) — `/crm`

Private CRM for Parvez Dubai Properties, built as an isolated module inside this repo. It shares only the Next.js/Supabase/Tailwind setup with the BES site; tables are prefixed `crm_` and access is controlled by `crm_users.role` (`owner`, `telemarketer`, `member`), not the BES `profiles` table.

## Setup
1. Run `supabase/crm_schema.sql` in the Supabase SQL editor (idempotent).
2. Create users in Supabase Auth, then add each to the CRM:
   `insert into crm_users (id, name, email, role) values ('<auth user uuid>', 'Parvez', 'you@example.com', 'owner');`
3. Sign in at `/crm/login`.

## Build progress (spec section 9)
- [x] 1. Project setup, auth, roles (`/crm/login`, route gating in `src/proxy.ts`, role checks in `src/lib/crm/auth.ts`). Vercel deploy not done.
- [x] 2. Schema + RLS (`supabase/crm_schema.sql`), verified by `supabase/tests/crm_rls_test.sql`
- [x] 3. Lead entry, CSV import with duplicate detection, lead detail + timeline
- [x] 4. Pipeline board (`/crm/leads/board`, drag-and-drop plus a stage dropdown for touch) and list filters (search, stage, source, owner, country, project, date range)
- [x] 5. Today screen (`/crm/today`): new leads with wait timer, meetings today, overdue, due today, no-next-step; average first response, compliance, red flags. Business day uses `CRM_TIMEZONE` (default `Asia/Dubai`).
- [x] 6. Telemarketer cockpit (`/crm/cockpit`): queue, script panel, one-tap outcomes, callback picker, meeting booking against the owner's open slots, performance (calls, connect rate, interest rate, meetings; per call list for the owner). Owner sets the script and availability at `/crm/settings`.
- [ ] 7-10 not started

## Verifying
`psql -v ON_ERROR_STOP=1 -f supabase/tests/crm_rls_test.sql <empty database>` stubs Supabase auth and asserts the role rules (assigned-leads-only, no deal values/lists/costs for the telemarketer, mandatory next step).

## Decisions to confirm
- `Won` (like `Lost` and `Nurture`) needs no next follow-up date; the spec names only Lost and Nurture.
- Manual/imported leads get `next_follow_up_at = now` so they appear on the Today screen (step 5).
- Only the owner can import call lists (list names are confidential).
- Dragging a lead out of Lost/Nurture into an open stage sets its follow-up to now if it had none, so it is never left without a next step.
- Meetings today shows nothing until step 7 creates meetings.
- Cockpit defaults: no answer -> follow up in 24h; interested + WhatsApp OK -> Qualified, follow up in 24h, consent recorded as verbal on call; wrong number / not interested -> Lost. Say if you want different defaults.
- Connect rate = calls not "no answer"/"wrong number"; interest rate = (interested, callback or meeting) / connected.
- Per-call-list performance is owner-only, since list names are confidential.
- Re-run `supabase/crm_schema.sql` to add step 6 (settings table, meeting slot uniqueness, `crm_booked_slots`).
