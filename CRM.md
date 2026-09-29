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
- [ ] 4-10 not started

## Verifying
`psql -v ON_ERROR_STOP=1 -f supabase/tests/crm_rls_test.sql <empty database>` stubs Supabase auth and asserts the role rules (assigned-leads-only, no deal values/lists/costs for the telemarketer, mandatory next step).

## Decisions to confirm
- `Won` (like `Lost` and `Nurture`) needs no next follow-up date; the spec names only Lost and Nurture.
- Manual/imported leads get `next_follow_up_at = now` so they appear on the Today screen (step 5).
- Only the owner can import call lists (list names are confidential).
