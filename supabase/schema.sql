-- Baseline Educational Services — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / OR REPLACE.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- PROFILES (admin/editor roles, one row per Supabase Auth user)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

create or replace function is_admin_or_editor()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'editor')
  );
$$;

create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- LEADS  (course matcher, ai-chat, guide-download, contact, booking, etc.)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  email text,
  source text not null check (
    source in ('course-matcher','ai-chat','guide-download','contact','booking','newsletter','timeline-planner','application')
  ),
  status text not null default 'New' check (status in ('New','Contacted','In progress','Converted','Closed')),
  notes text,
  payload jsonb not null default '{}'::jsonb
);

-- ─────────────────────────────────────────────────────────────────────────
-- BOOKINGS (free consultation)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  email text not null,
  consultation_type text not null check (consultation_type in ('video-call','phone-call','in-person')),
  scheduled_date date not null,
  scheduled_time time not null,
  destination text,
  level text,
  message text,
  status text not null default 'Pending' check (status in ('Pending','Confirmed','Completed','Cancelled','No-show')),
  unique (scheduled_date, scheduled_time)
);

-- ─────────────────────────────────────────────────────────────────────────
-- APPLICATIONS (multi-step application form)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reference_id text not null unique,
  full_name text not null,
  email text not null,
  phone text not null,
  level text not null check (level in ('foundation','undergraduate','masters','phd')),
  destination_countries text[] not null default '{}',
  course_of_interest text,
  intake text,
  academic_background jsonb not null default '{}'::jsonb,
  english_test jsonb not null default '{}'::jsonb,
  documents jsonb not null default '{}'::jsonb,
  status text not null default 'Submitted' check (
    status in ('Submitted','Under Review','Documents Requested','Applied to University','Offer Received','Visa Stage','Closed')
  ),
  consent boolean not null default false
);

-- ─────────────────────────────────────────────────────────────────────────
-- CONTENT TABLES (admin-editable, publicly readable when published)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  course text,
  university text,
  country text,
  visa_approved boolean not null default false,
  consent_given boolean not null default false,
  video_url text,
  photo_url text,
  quote text,
  published boolean not null default false
);

create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  country text not null,
  logo_url text,
  overview text,
  popular_courses text[] not null default '{}',
  intakes text[] not null default '{}',
  published boolean not null default true
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  role text,
  bio text,
  photo_url text,
  sort_order int not null default 0,
  published boolean not null default true
);

create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('Costs','Visas','Admissions','English Tests','Scholarships','Working Abroad')),
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  published boolean not null default true
);

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content_html text,
  category text,
  author text,
  published_at timestamptz,
  reading_time_minutes int default 5,
  cover_url text,
  seo_title text,
  seo_description text,
  published boolean not null default false
);

create table if not exists guides (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  file_url text,
  page_count int,
  published boolean not null default true
);

create table if not exists destination_content (
  id uuid primary key default gen_random_uuid(),
  country_code text not null unique,
  hero_copy text,
  tuition_min numeric,
  tuition_max numeric,
  living_min numeric,
  living_max numeric,
  intakes text[] not null default '{}',
  post_study_work text,
  top_courses text[] not null default '{}',
  visa_notes text,
  currency text
);

-- ─────────────────────────────────────────────────────────────────────────
-- TOOLS DATA (cost calculator, timeline planner, exchange rates)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists cost_items (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  level text not null,
  course_type text not null default 'standard',
  city_tier text not null default 'standard',
  item_name text not null,
  amount numeric not null,
  currency text not null
);

create table if not exists exchange_rates (
  id uuid primary key default gen_random_uuid(),
  currency_code text not null unique,
  rate_to_ngn numeric not null,
  updated_at timestamptz not null default now()
);

create table if not exists timeline_milestones (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  level text not null,
  milestone text not null,
  offset_days_before_intake int not null,
  sort_order int not null default 0
);

-- ─────────────────────────────────────────────────────────────────────────
-- SITE SETTINGS (singleton row of editable business info)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists site_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into site_settings (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- AI CHAT (conversation log, only stored after visitor consent)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists chat_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id text not null,
  messages jsonb not null default '[]'::jsonb,
  lead_id uuid references leads(id) on delete set null,
  consent boolean not null default false
);

create table if not exists guide_downloads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  guide_slug text not null,
  lead_id uuid references leads(id) on delete set null
);

-- ─────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table leads enable row level security;
alter table bookings enable row level security;
alter table applications enable row level security;
alter table testimonials enable row level security;
alter table partners enable row level security;
alter table team_members enable row level security;
alter table faqs enable row level security;
alter table blog_posts enable row level security;
alter table guides enable row level security;
alter table destination_content enable row level security;
alter table cost_items enable row level security;
alter table exchange_rates enable row level security;
alter table timeline_milestones enable row level security;
alter table site_settings enable row level security;
alter table chat_conversations enable row level security;
alter table guide_downloads enable row level security;

-- profiles: a user can read their own row; admins can read/manage all
drop policy if exists "profiles_self_select" on profiles;
create policy "profiles_self_select" on profiles for select using (id = auth.uid() or is_admin());
drop policy if exists "profiles_admin_write" on profiles;
create policy "profiles_admin_write" on profiles for all using (is_admin()) with check (is_admin());

-- leads: public can insert only; staff can read/update
drop policy if exists "leads_public_insert" on leads;
create policy "leads_public_insert" on leads for insert with check (true);
drop policy if exists "leads_staff_all" on leads;
create policy "leads_staff_all" on leads for select using (is_admin_or_editor());
drop policy if exists "leads_staff_update" on leads;
create policy "leads_staff_update" on leads for update using (is_admin_or_editor()) with check (is_admin_or_editor());
drop policy if exists "leads_staff_delete" on leads;
create policy "leads_staff_delete" on leads for delete using (is_admin());

-- bookings: public can insert + read only to check slot availability; staff manage
drop policy if exists "bookings_public_insert" on bookings;
create policy "bookings_public_insert" on bookings for insert with check (true);
drop policy if exists "bookings_public_select_slots" on bookings;
create policy "bookings_public_select_slots" on bookings for select using (true);
drop policy if exists "bookings_staff_update" on bookings;
create policy "bookings_staff_update" on bookings for update using (is_admin_or_editor()) with check (is_admin_or_editor());
drop policy if exists "bookings_staff_delete" on bookings;
create policy "bookings_staff_delete" on bookings for delete using (is_admin());

-- applications: public can insert only; staff manage
drop policy if exists "applications_public_insert" on applications;
create policy "applications_public_insert" on applications for insert with check (true);
drop policy if exists "applications_staff_all" on applications;
create policy "applications_staff_all" on applications for select using (is_admin_or_editor());
drop policy if exists "applications_staff_update" on applications;
create policy "applications_staff_update" on applications for update using (is_admin_or_editor()) with check (is_admin_or_editor());

-- published content tables: public read of published rows, staff full access
do $$
declare
  t text;
begin
  foreach t in array array['testimonials','partners','team_members','faqs','blog_posts','guides']
  loop
    execute format('drop policy if exists "%1$s_public_select" on %1$s', t);
    execute format('create policy "%1$s_public_select" on %1$s for select using (published = true or is_admin_or_editor())', t);
    execute format('drop policy if exists "%1$s_staff_write" on %1$s', t);
    execute format('create policy "%1$s_staff_write" on %1$s for all using (is_admin_or_editor()) with check (is_admin_or_editor())', t);
  end loop;
end $$;

-- reference data tables: public read-all, staff write
do $$
declare
  t text;
begin
  foreach t in array array['destination_content','cost_items','exchange_rates','timeline_milestones']
  loop
    execute format('drop policy if exists "%1$s_public_select" on %1$s', t);
    execute format('create policy "%1$s_public_select" on %1$s for select using (true)', t);
    execute format('drop policy if exists "%1$s_staff_write" on %1$s', t);
    execute format('create policy "%1$s_staff_write" on %1$s for all using (is_admin_or_editor()) with check (is_admin_or_editor())', t);
  end loop;
end $$;

-- site_settings: public read, staff write
drop policy if exists "site_settings_public_select" on site_settings;
create policy "site_settings_public_select" on site_settings for select using (true);
drop policy if exists "site_settings_staff_write" on site_settings;
create policy "site_settings_staff_write" on site_settings for update using (is_admin_or_editor()) with check (is_admin_or_editor());

-- chat_conversations: public insert only (server route uses service role for reads)
drop policy if exists "chat_conversations_public_insert" on chat_conversations;
create policy "chat_conversations_public_insert" on chat_conversations for insert with check (true);
drop policy if exists "chat_conversations_staff_select" on chat_conversations;
create policy "chat_conversations_staff_select" on chat_conversations for select using (is_admin_or_editor());

-- guide_downloads: public insert only
drop policy if exists "guide_downloads_public_insert" on guide_downloads;
create policy "guide_downloads_public_insert" on guide_downloads for insert with check (true);
drop policy if exists "guide_downloads_staff_select" on guide_downloads;
create policy "guide_downloads_staff_select" on guide_downloads for select using (is_admin_or_editor());

-- ─────────────────────────────────────────────────────────────────────────
-- STORAGE BUCKETS (run once — Supabase Storage, not plain Postgres)
-- ─────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('public-assets', 'public-assets', true)
on conflict (id) do nothing;

drop policy if exists "application_documents_upload" on storage.objects;
create policy "application_documents_upload" on storage.objects
  for insert with check (bucket_id = 'application-documents');

drop policy if exists "application_documents_staff_read" on storage.objects;
create policy "application_documents_staff_read" on storage.objects
  for select using (bucket_id = 'application-documents' and is_admin_or_editor());

drop policy if exists "public_assets_read" on storage.objects;
create policy "public_assets_read" on storage.objects
  for select using (bucket_id = 'public-assets');

drop policy if exists "public_assets_staff_write" on storage.objects;
create policy "public_assets_staff_write" on storage.objects
  for insert with check (bucket_id = 'public-assets' and is_admin_or_editor());
