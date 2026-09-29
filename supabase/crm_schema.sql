-- Lead-to-Meeting Engine (Parvez Dubai Properties) — Phase 1 schema.
-- Isolated from the BES site: every table is prefixed crm_ and access is gated by
-- crm_users.role, never by the BES `profiles` table. Safe to run repeatedly.
-- Run in the Supabase SQL editor (or `psql`) after schema.sql.

create extension if not exists pgcrypto;

-- ─── Roles ────────────────────────────────────────────────────────────────
create table if not exists crm_users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'telemarketer' check (role in ('owner', 'telemarketer', 'member')),
  created_at timestamptz not null default now()
);

create or replace function crm_role() returns text
  language sql stable security definer set search_path = public as
  $$ select role from crm_users where id = auth.uid() $$;

create or replace function crm_is_owner() returns boolean
  language sql stable security definer set search_path = public as
  $$ select coalesce((select role = 'owner' from crm_users where id = auth.uid()), false) $$;

create or replace function crm_is_staff() returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from crm_users where id = auth.uid()) $$;

-- ─── Reference tables ─────────────────────────────────────────────────────
create table if not exists crm_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null check (type in ('paid', 'organic', 'cold call', 'referral', 'event')),
  monthly_cost numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists crm_call_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  origin text not null check (origin in ('purchased', 'partner', 'own')),
  imported_at timestamptz not null default now(),
  total_numbers integer not null default 0
);

create table if not exists crm_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  developer text,
  location text,
  starting_price numeric(14, 2),
  payment_plan_summary text,
  approved_talking_points text,
  created_at timestamptz not null default now()
);

-- ─── Leads ────────────────────────────────────────────────────────────────
create table if not exists crm_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,                       -- E.164, e.g. +2348031234567
  phone_is_whatsapp boolean not null default false,
  email text,
  country text,
  city text,
  source_id uuid not null references crm_sources(id),   -- a lead cannot exist without a source
  call_list_id uuid references crm_call_lists(id),
  campaign text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  ad_id text,
  referring_page text,
  project_interest text,
  budget_range text,
  payment_preference text check (payment_preference in ('cash', 'payment plan', 'mortgage')),
  purchase_purpose text check (purchase_purpose in ('investment', 'golden visa', 'residence', 'capital preservation')),
  timeline text,
  stage text not null default 'New' check (stage in (
    'New', 'Contacted', 'Qualified', 'Meeting Booked', 'Meeting Held',
    'Proposal Sent', 'Negotiation', 'Won', 'Lost', 'Nurture')),
  assigned_to uuid references crm_users(id) on delete set null,
  consent_whatsapp boolean not null default false,
  consent_whatsapp_at timestamptz,
  consent_source text,
  notes text,
  created_at timestamptz not null default now(),
  first_contacted_at timestamptz,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  -- consent must carry a timestamp and a source when granted
  constraint crm_leads_consent_evidence check (
    not consent_whatsapp or (consent_whatsapp_at is not null and consent_source is not null))
);
create unique index if not exists crm_leads_phone_uniq on crm_leads (phone) where phone is not null;
create index if not exists crm_leads_assigned_idx on crm_leads (assigned_to);
create index if not exists crm_leads_stage_idx on crm_leads (stage);
create index if not exists crm_leads_followup_idx on crm_leads (next_follow_up_at);

create table if not exists crm_stage_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references crm_leads(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_by uuid references crm_users(id) on delete set null,
  changed_at timestamptz not null default now()
);
create index if not exists crm_stage_history_lead_idx on crm_stage_history (lead_id, changed_at);

-- Every stage change (including creation) is timestamped for conversion-time reporting.
create or replace function crm_track_stage() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into crm_stage_history (lead_id, from_stage, to_stage, changed_by)
      values (new.id, null, new.stage, auth.uid());
  elsif new.stage is distinct from old.stage then
    insert into crm_stage_history (lead_id, from_stage, to_stage, changed_by)
      values (new.id, old.stage, new.stage, auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists crm_leads_stage_trg on crm_leads;
create trigger crm_leads_stage_trg after insert or update of stage on crm_leads
  for each row execute function crm_track_stage();

create table if not exists crm_interactions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references crm_leads(id) on delete cascade,
  type text not null check (type in ('call', 'whatsapp', 'instagram dm', 'email', 'meeting', 'note')),
  direction text check (direction in ('inbound', 'outbound')),
  outcome text,
  summary text,
  created_by uuid references crm_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists crm_interactions_lead_idx on crm_interactions (lead_id, created_at desc);

create table if not exists crm_meetings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references crm_leads(id) on delete cascade,
  scheduled_at timestamptz not null,
  format text not null check (format in ('video', 'in person', 'phone')),
  status text not null default 'booked' check (status in ('booked', 'held', 'no-show', 'rescheduled')),
  outcome_notes text,
  created_by uuid references crm_users(id) on delete set null
);

create table if not exists crm_deals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references crm_leads(id) on delete cascade,
  project text,
  unit text,
  value numeric(14, 2),
  status text not null default 'proposal' check (status in ('proposal', 'negotiation', 'reserved', 'won', 'lost')),
  lost_reason text,
  closed_at timestamptz
);

-- ─── Log an interaction + set the next step, atomically ──────────────────
-- The only sanctioned write path for interactions. A next follow-up date is
-- mandatory unless the lead is being moved to Lost or Nurture.
create or replace function crm_log_interaction(
  p_lead_id uuid,
  p_type text,
  p_direction text,
  p_outcome text,
  p_summary text,
  p_next_follow_up_at timestamptz,   -- required unless p_new_stage is Lost/Nurture
  p_new_stage text default null,
  p_consent_whatsapp boolean default null   -- true = lead consented on this contact
) returns crm_interactions
  language plpgsql security invoker set search_path = public as $$
declare
  v_stage text;
  v_lead crm_leads;
  v_row crm_interactions;
begin
  select * into v_lead from crm_leads where id = p_lead_id;   -- RLS applies: not visible = not found
  if not found then raise exception 'Lead not found' using errcode = 'P0002'; end if;

  v_stage := coalesce(p_new_stage, v_lead.stage);
  if p_type <> 'note' and v_stage not in ('Lost', 'Nurture', 'Won') and p_next_follow_up_at is null then
    raise exception 'Set a next follow-up date, or mark the lead Lost or Nurture' using errcode = '23514';
  end if;

  insert into crm_interactions (lead_id, type, direction, outcome, summary, created_by)
    values (p_lead_id, p_type, p_direction, p_outcome, p_summary, auth.uid())
    returning * into v_row;

  update crm_leads set
    stage = v_stage,
    last_contacted_at = case when p_type <> 'note' then now() else last_contacted_at end,
    first_contacted_at = case when p_type <> 'note' then coalesce(first_contacted_at, now()) else first_contacted_at end,
    next_follow_up_at = case when v_stage in ('Lost', 'Nurture', 'Won') then p_next_follow_up_at
                             when p_type = 'note' then coalesce(p_next_follow_up_at, next_follow_up_at)
                             else p_next_follow_up_at end,
    consent_whatsapp = case when p_consent_whatsapp is true then true else consent_whatsapp end,
    consent_whatsapp_at = case when p_consent_whatsapp is true and not consent_whatsapp then now() else consent_whatsapp_at end,
    consent_source = case when p_consent_whatsapp is true and not consent_whatsapp then 'verbal on call (' || coalesce(p_type, 'call') || ')' else consent_source end
  where id = p_lead_id;

  return v_row;
end $$;

-- ─── Row-level security ───────────────────────────────────────────────────
alter table crm_users enable row level security;
alter table crm_sources enable row level security;
alter table crm_call_lists enable row level security;
alter table crm_projects enable row level security;
alter table crm_leads enable row level security;
alter table crm_stage_history enable row level security;
alter table crm_interactions enable row level security;
alter table crm_meetings enable row level security;
alter table crm_deals enable row level security;

-- users: everyone staff sees themselves; owner sees and manages all
drop policy if exists crm_users_select on crm_users;
create policy crm_users_select on crm_users for select using (id = auth.uid() or crm_is_owner());
drop policy if exists crm_users_owner_write on crm_users;
create policy crm_users_owner_write on crm_users for all using (crm_is_owner()) with check (crm_is_owner());

-- sources: staff can read names (needed on lead forms); monthly_cost is owner-only
-- (column privileges + crm_source_costs())
drop policy if exists crm_sources_select on crm_sources;
create policy crm_sources_select on crm_sources for select using (crm_is_staff());
drop policy if exists crm_sources_owner_write on crm_sources;
create policy crm_sources_owner_write on crm_sources for all using (crm_is_owner()) with check (crm_is_owner());

revoke select on crm_sources from anon, authenticated;
grant select (id, name, type, created_at) on crm_sources to authenticated;
create or replace function crm_source_costs() returns table (id uuid, name text, type text, monthly_cost numeric)
  language sql stable security definer set search_path = public as
  $$ select id, name, type, monthly_cost from crm_sources where crm_is_owner() $$;

-- call lists: owner only (purchased/partner list names are confidential)
drop policy if exists crm_call_lists_owner on crm_call_lists;
create policy crm_call_lists_owner on crm_call_lists for all using (crm_is_owner()) with check (crm_is_owner());

-- projects: staff read (approved talking points), owner write
drop policy if exists crm_projects_select on crm_projects;
create policy crm_projects_select on crm_projects for select using (crm_is_staff());
drop policy if exists crm_projects_owner_write on crm_projects;
create policy crm_projects_owner_write on crm_projects for all using (crm_is_owner()) with check (crm_is_owner());

-- leads: owner sees all; others only leads assigned to them
drop policy if exists crm_leads_select on crm_leads;
create policy crm_leads_select on crm_leads for select
  using (crm_is_owner() or (crm_is_staff() and assigned_to = auth.uid()));
drop policy if exists crm_leads_insert on crm_leads;
create policy crm_leads_insert on crm_leads for insert
  with check (crm_is_owner() or (crm_is_staff() and assigned_to = auth.uid()));
drop policy if exists crm_leads_update on crm_leads;
create policy crm_leads_update on crm_leads for update
  using (crm_is_owner() or (crm_is_staff() and assigned_to = auth.uid()))
  with check (crm_is_owner() or (crm_is_staff() and assigned_to = auth.uid()));
drop policy if exists crm_leads_delete on crm_leads;
create policy crm_leads_delete on crm_leads for delete using (crm_is_owner());   -- data-erasure requests

-- children follow the parent lead's visibility
drop policy if exists crm_stage_history_select on crm_stage_history;
create policy crm_stage_history_select on crm_stage_history for select
  using (exists (select 1 from crm_leads l where l.id = lead_id));
drop policy if exists crm_interactions_select on crm_interactions;
create policy crm_interactions_select on crm_interactions for select
  using (exists (select 1 from crm_leads l where l.id = lead_id));
drop policy if exists crm_interactions_insert on crm_interactions;
create policy crm_interactions_insert on crm_interactions for insert
  with check (exists (select 1 from crm_leads l where l.id = lead_id) and created_by = auth.uid());
drop policy if exists crm_meetings_select on crm_meetings;
create policy crm_meetings_select on crm_meetings for select
  using (exists (select 1 from crm_leads l where l.id = lead_id));
drop policy if exists crm_meetings_write on crm_meetings;
create policy crm_meetings_write on crm_meetings for all
  using (exists (select 1 from crm_leads l where l.id = lead_id))
  with check (exists (select 1 from crm_leads l where l.id = lead_id));

-- deals (values): owner only
drop policy if exists crm_deals_owner on crm_deals;
create policy crm_deals_owner on crm_deals for all using (crm_is_owner()) with check (crm_is_owner());

-- Non-owners must not hide a lead from the owner or grab others' leads via reassignment
-- (also covered by the WITH CHECK above); block edits to immutable provenance fields.
create or replace function crm_lock_provenance() returns trigger
  language plpgsql as $$
begin
  if not crm_is_owner() and (
      new.source_id is distinct from old.source_id or new.call_list_id is distinct from old.call_list_id
      or new.created_at is distinct from old.created_at) then
    raise exception 'Only the owner can change a lead''s source or list';
  end if;
  return new;
end $$;
drop trigger if exists crm_leads_lock_trg on crm_leads;
create trigger crm_leads_lock_trg before update on crm_leads
  for each row execute function crm_lock_provenance();

-- Seed the sources named in the spec. Costs are entered by the owner later.
insert into crm_sources (name, type) values
  ('Meta Ads', 'paid'), ('Meta Lead Ads', 'paid'), ('Cold Call', 'cold call'),
  ('Instagram', 'organic'), ('Website Calculator', 'organic'), ('Website Contact Form', 'organic'),
  ('Referral', 'referral'), ('Event', 'event')
on conflict (name) do nothing;

-- ─── Step 6: settings (call script, owner availability) and meeting slots ───
create table if not exists crm_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table crm_settings enable row level security;
drop policy if exists crm_settings_select on crm_settings;
create policy crm_settings_select on crm_settings for select using (crm_is_staff());
drop policy if exists crm_settings_owner_write on crm_settings;
create policy crm_settings_owner_write on crm_settings for all using (crm_is_owner()) with check (crm_is_owner());

insert into crm_settings (key, value) values
  ('call_script', to_jsonb('Replace this with your approved cold-call script. Do not promise returns or make Golden Visa guarantees.'::text)),
  ('availability', '{"days":[1,2,3,4,5],"start":"10:00","end":"18:00","slot_minutes":30}'::jsonb)
on conflict (key) do nothing;

alter table crm_meetings add column if not exists lead_summary text;
-- one booked meeting per slot (the owner's calendar), enforced even across users
create unique index if not exists crm_meetings_slot_uniq on crm_meetings (scheduled_at) where status = 'booked';

-- Telemarketers only see meetings of their own leads, but must know which slots are taken.
create or replace function crm_booked_slots(p_from timestamptz, p_to timestamptz) returns setof timestamptz
  language sql stable security definer set search_path = public as
  $$ select scheduled_at from crm_meetings
     where status = 'booked' and scheduled_at >= p_from and scheduled_at < p_to and crm_is_staff() $$;

-- ─── Step 7: meetings ─────────────────────────────────────────────────────
alter table crm_meetings add column if not exists google_event_id text;
alter table crm_meetings add column if not exists duration_minutes integer not null default 30;
-- Meeting management (calendar, status, outcomes) is owner-only in the app; the existing
-- crm_meetings policies still let a telemarketer create meetings for her own leads.
create index if not exists crm_meetings_scheduled_idx on crm_meetings (scheduled_at);
