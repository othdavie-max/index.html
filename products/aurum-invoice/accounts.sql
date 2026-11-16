-- Aurum ACCOUNTS (Build 1). Design: plan/07-accounts-and-billing.md, parts A to D and H.
-- Safe to run more than once. Run AFTER licences.sql, licences-extras.sql, free-plan.sql and reviews.sql.
--
-- What this does:
--   * an account (a Supabase sign-in) owns exactly one workspace (a row in `licences`); the key stays hidden
--   * adds the plan limits table and a function that tells the app what a workspace may do ("ent")
--   * adds sign-in functions: account_enter, link_licence, account_swap_device, and friends
--   * free documents a month go from 3 to 5
--   * existing keys, devices, documents and links are not touched
--
-- Nothing changes for people using the app today until the new app is deployed and the switch below is turned on:
--   update app_config set value = 'on' where key = 'accounts_required';
-- (Do that only at subscription launch day: a free key that has not been joined to an account then has to join one to send.)

-- ---------------------------------------------------------------- columns
alter table public.licences add column if not exists user_id uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'licences_user_id_fkey') then
    alter table public.licences add constraint licences_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;
  end if;
end $$;
create unique index if not exists licences_user_id_idx on public.licences (user_id);
-- the paid-plan columns are used by Build 2; they are added now so that the plan logic below is complete
alter table public.licences add column if not exists paid_tier text;
alter table public.licences add column if not exists paid_until timestamptz;
alter table public.licences add column if not exists paid_period text;
alter table public.licences add column if not exists paid_method text;
alter table public.licences add column if not exists ended_at timestamptz;
alter table public.licences add column if not exists name_changed_at timestamptz;
alter table public.licences drop constraint if exists licences_paid_tier_check;
alter table public.licences add constraint licences_paid_tier_check check (paid_tier is null or paid_tier in ('starter', 'pro'));
alter table public.licences drop constraint if exists licences_paid_period_check;
alter table public.licences add constraint licences_paid_period_check check (paid_period is null or paid_period in ('month', 'year'));
alter table public.licences drop constraint if exists licences_paid_method_check;
alter table public.licences add constraint licences_paid_method_check check (paid_method is null or paid_method in ('card', 'transfer'));
alter table public.licence_devices add column if not exists label text;

-- ---------------------------------------------------------------- small tables
create table if not exists public.device_changes (licence_key text not null, changed_at timestamptz not null default now());
alter table public.device_changes enable row level security;
create index if not exists device_changes_idx on public.device_changes (licence_key, changed_at desc);
create table if not exists public.delete_requests (id bigint generated always as identity primary key, user_id uuid, licence_key text, created_at timestamptz not null default now(), done_at timestamptz);
alter table public.delete_requests enable row level security;

-- ---------------------------------------------------------------- plan limits (file 07, part B)
create table if not exists public.plan_rules (
  level text primary key,
  tier text not null,                -- what the app gates on: free | starter | pro
  label text not null,               -- shown to people
  docs_per_month int,                -- null = unlimited
  devices int not null,
  businesses int not null,
  designs text[] not null,
  openings text[] not null,
  branding text not null,            -- line | mark | none
  catalogue_items int,               -- null = unlimited
  link_days int,                     -- null = links never close
  pro_pack boolean not null default false,
  own_domain boolean not null default false
);
alter table public.plan_rules enable row level security;
insert into public.plan_rules (level, tier, label, docs_per_month, devices, businesses, designs, openings, branding, catalogue_items, link_days, pro_pack, own_domain) values
  ('free',      'free',    'Free',      5,    1, 1, '{royal}',                  '{envelope,none}',               'line', 10,  60,   false, false),
  ('starter',   'starter', 'Starter',   50,   2, 1, '{royal,atelier,noir}',     '{envelope,gift,card,none}',     'mark', 100, 365,  false, false),
  ('pro',       'pro',     'Pro',       null, 5, 2, '{royal,atelier,noir}',     '{envelope,gift,card,none}',     'none', 500, null, true,  false),
  ('signature', 'starter', 'Signature', null, 2, 1, '{royal,atelier,noir}',     '{envelope,gift,card,none}',     'mark', 100, null, false, false),
  ('prestige',  'pro',     'Prestige',  null, 5, 2, '{royal,atelier,noir}',     '{envelope,gift,card,none}',     'none', 500, null, true,  true)
on conflict (level) do update set tier = excluded.tier, label = excluded.label, docs_per_month = excluded.docs_per_month, devices = excluded.devices,
  businesses = excluded.businesses, designs = excluded.designs, openings = excluded.openings, branding = excluded.branding,
  catalogue_items = excluded.catalogue_items, link_days = excluded.link_days, pro_pack = excluded.pro_pack, own_domain = excluded.own_domain;
-- The designs and openings lists hold only what exists today. Build 3 adds the new ids to 'pro' and 'prestige'.

insert into public.app_config (key, value) values ('accounts_required', 'off') on conflict (key) do nothing;

-- ---------------------------------------------------------------- helpers (never callable from the app)
create or replace function public._accounts_required() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.app_config where key = 'accounts_required'), 'off') = 'on';
$$;
create or replace function public._is_throwaway(p_domain text) returns boolean language sql immutable as $$
  select lower(coalesce(p_domain, '')) = any (array['mailinator.com','guerrillamail.com','guerrillamail.net','sharklasers.com','10minutemail.com','tempmail.com','temp-mail.org','yopmail.com','trashmail.com','getnada.com','dispostable.com','maildrop.cc','fakeinbox.com','throwawaymail.com','mailnesia.com','mintemail.com','tempr.email','emailondeck.com']);
$$;
-- The level of a workspace (file 07, H3): prestige, else a paid tier still in its 7 days of grace, else signature, else free.
create or replace function public._level(p_key text) returns text language sql stable security definer set search_path = public as $$
  select case
    when l.plan = 'prestige' then 'prestige'
    when l.paid_tier is not null and l.paid_until is not null and l.paid_until + interval '7 days' > now() then l.paid_tier
    when l.plan = 'signature' then 'signature'
    else 'free' end
  from public.licences l where l.key = upper(trim(coalesce(p_key, '')));
$$;
-- What a workspace may do right now (file 07, B3). The app shows and hides things from this and nothing else.
create or replace function public._ent(p_key text) returns json language plpgsql stable security definer set search_path = public as $$
declare k text := upper(trim(coalesce(p_key, ''))); l public.licences; lv text; r public.plan_rules; used int := 0; st text := 'none'; dm int;
begin
  select * into l from public.licences where key = k;
  if not found then return null; end if;
  lv := public._level(k);
  select * into r from public.plan_rules where level = lv;
  if r.docs_per_month is not null then
    select count(*) into used from public.free_use where licence_key = k and month = public._free_month();
  end if;
  if l.paid_tier is not null and l.paid_until is not null then
    st := case when now() < l.paid_until then 'active' when now() < l.paid_until + interval '7 days' then 'grace' else 'ended' end;
  end if;
  dm := case when lv in ('signature', 'prestige') then l.max_devices else r.devices end;
  return json_build_object(
    'tier', r.tier, 'label', r.label, 'level', lv,
    'legacy', case when l.plan in ('signature', 'prestige') then l.plan else null end,
    'docs_limit', r.docs_per_month,
    'docs_used', case when r.docs_per_month is null then null else used end,
    'docs_left', case when r.docs_per_month is null then null else greatest(0, r.docs_per_month - used) end,
    'resets_on', to_char((date_trunc('month', now() at time zone 'Africa/Lagos') + interval '1 month')::date, 'YYYY-MM-DD'),
    'designs', to_json(r.designs), 'openings', to_json(r.openings), 'branding', r.branding,
    'devices_max', dm, 'devices_used', (select count(*) from public.licence_devices where licence_key = k),
    'businesses_max', r.businesses, 'catalogue_max', r.catalogue_items, 'link_days', r.link_days,
    'pro_pack', r.pro_pack, 'own_domain', r.own_domain,
    'status', st, 'paid_until', l.paid_until, 'period', l.paid_period, 'method', l.paid_method, 'renews', false,
    'account', l.user_id is not null, 'checked_at', now());
end; $$;
revoke all on function public._accounts_required(), public._is_throwaway(text), public._level(text), public._ent(text) from public, anon, authenticated;

-- A list of the devices on a workspace, for the "choose a device to sign out" screen.
create or replace function public._device_list(p_key text) returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('device_id', device_id, 'label', coalesce(label, 'A phone'), 'last_seen', last_seen) order by last_seen desc), '[]'::json)
  from public.licence_devices where licence_key = upper(trim(coalesce(p_key, '')));
$$;
-- Put a device on a workspace, or say it is full. A device already on the workspace is always accepted.
create or replace function public._register_device(p_key text, p_device text, p_label text) returns json language plpgsql security definer set search_path = public as $$
declare k text := upper(trim(p_key)); used int; mx int; lab text := nullif(left(trim(coalesce(p_label, '')), 60), '');
begin
  if exists (select 1 from public.licence_devices where licence_key = k and device_id = p_device) then
    update public.licence_devices set last_seen = now(), label = coalesce(lab, label) where licence_key = k and device_id = p_device;
    return json_build_object('ok', true);
  end if;
  select count(*) into used from public.licence_devices where licence_key = k;
  mx := (public._ent(k)->>'devices_max')::int;
  if used >= coalesce(mx, 1) then
    return json_build_object('ok', false, 'reason', 'device_limit', 'devices', public._device_list(k), 'ent', public._ent(k));
  end if;
  insert into public.licence_devices (licence_key, device_id, label) values (k, p_device, lab);
  return json_build_object('ok', true);
end; $$;
revoke all on function public._device_list(text), public._register_device(text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- the key-and-device functions (the app calls these as before)
-- activate_license: as before, plus the plan details, and a key that belongs to an account only accepts new devices through sign-in.
create or replace function public.activate_license(p_key text, p_device text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare lic public.licences; used int;
begin
  if p_key is null or p_device is null or length(p_device) < 8 then return json_build_object('ok', false, 'reason', 'invalid'); end if;
  select * into lic from public.licences where key = upper(trim(p_key));
  if not found then return json_build_object('ok', false, 'reason', 'invalid'); end if;
  if not lic.active then return json_build_object('ok', false, 'reason', 'revoked'); end if;
  if exists (select 1 from public.licence_devices where licence_key = lic.key and device_id = p_device) then
    update public.licence_devices set last_seen = now() where licence_key = lic.key and device_id = p_device;
  else
    if lic.user_id is not null then return json_build_object('ok', false, 'reason', 'use_account'); end if;
    select count(*) into used from public.licence_devices where licence_key = lic.key;
    if used >= lic.max_devices then return json_build_object('ok', false, 'reason', 'device_limit'); end if;
    insert into public.licence_devices (licence_key, device_id) values (lic.key, p_device);
  end if;
  select count(*) into used from public.licence_devices where licence_key = lic.key;
  if lic.ref_code is null and lic.plan <> 'free' then
    update public.licences set ref_code = 'REF-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6)) where key = lic.key returning ref_code into lic.ref_code;
  end if;
  return json_build_object('ok', true, 'email', lic.buyer_email, 'plan', lic.plan, 'devices_used', used, 'max_devices', lic.max_devices, 'ref_code', lic.ref_code,
    'account', lic.user_id is not null, 'ent', public._ent(lic.key));
end; $$;

create or replace function public.my_plan(p_key text, p_device text) returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public._licence_ok(p_key, p_device) then return json_build_object('ok', false, 'reason', 'licence'); end if;
  return json_build_object('ok', true, 'ent', public._ent(p_key));
end; $$;

-- free_status: the old shape (the cached app still uses it), now with the level's limit.
create or replace function public.free_status(p_key text, p_device text)
returns json language plpgsql security definer set search_path = public as $$
declare k text := upper(trim(coalesce(p_key, ''))); lic public.licences; e json; lim int;
begin
  if not public._licence_ok(k, p_device) then return json_build_object('ok', false, 'reason', 'licence'); end if;
  select * into lic from public.licences where key = k;
  e := public._ent(k); lim := (e->>'docs_limit')::int;
  if lim is null then return json_build_object('ok', true, 'plan', lic.plan, 'ent', e); end if;
  return json_build_object('ok', true, 'plan', lic.plan, 'used', (e->>'docs_used')::int, 'limit', lim, 'left', (e->>'docs_left')::int, 'ent', e);
end; $$;

-- free_use: counts a new document before it is sent. The limit now comes from the plan table (free = 5).
create or replace function public.free_use(p_key text, p_device text, p_doc_id text, p_sig text)
returns json language plpgsql security definer set search_path = public as $$
declare k text := upper(trim(coalesce(p_key, ''))); lic public.licences; lim int; n int; sg text := left(coalesce(p_sig, ''), 80);
begin
  if not public._licence_ok(k, p_device) then return json_build_object('ok', false, 'reason', 'licence'); end if;
  select * into lic from public.licences where key = k;
  select docs_per_month into lim from public.plan_rules where level = public._level(k);
  if lim is null then return json_build_object('ok', true, 'plan', lic.plan, 'ent', public._ent(k)); end if;
  if p_doc_id is null or length(p_doc_id) < 3 or length(p_doc_id) > 80 then return json_build_object('ok', false, 'reason', 'doc'); end if;
  if lic.user_id is null and lic.plan = 'free' and public._accounts_required() then return json_build_object('ok', false, 'reason', 'account_needed'); end if;
  perform pg_advisory_xact_lock(hashtext(k));
  select count(*) into n from public.free_use where licence_key = k and month = public._free_month();
  if exists (select 1 from public.free_use where licence_key = k and doc_id = p_doc_id and sig = sg) then
    return json_build_object('ok', true, 'plan', lic.plan, 'used', n, 'limit', lim, 'left', greatest(0, lim - n));
  end if;
  if n >= lim then return json_build_object('ok', false, 'reason', 'free_limit', 'used', n, 'limit', lim, 'left', 0); end if;
  insert into public.free_use (licence_key, doc_id, sig, month) values (k, p_doc_id, sg, public._free_month());
  return json_build_object('ok', true, 'plan', lic.plan, 'used', n + 1, 'limit', lim, 'left', lim - n - 1);
end; $$;

revoke all on function public.activate_license(text, text), public.my_plan(text, text), public.free_status(text, text), public.free_use(text, text, text, text) from public;
grant execute on function public.activate_license(text, text), public.my_plan(text, text), public.free_status(text, text), public.free_use(text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- the signed-in functions (file 07, H4)
-- account_enter: after sign-in on a phone that holds no key. Finds or creates the workspace, registers the phone.
create or replace function public.account_enter(p_device text, p_label text default null)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); em text; lic public.licences; other public.licences; reg json; k text;
begin
  if uid is null then return json_build_object('ok', false, 'reason', 'auth'); end if;
  if p_device is null or length(p_device) < 8 then return json_build_object('ok', false, 'reason', 'device'); end if;
  select lower(email) into em from auth.users where id = uid;
  select * into lic from public.licences where user_id = uid;
  if not found then
    if public._is_throwaway(split_part(em, '@', 2)) then return json_build_object('ok', false, 'reason', 'disposable'); end if;
    select l.* into other from public.licences l join public.licence_devices d on d.licence_key = l.key
      where d.device_id = p_device and l.user_id is not null and l.user_id <> uid and l.plan = 'free' limit 1;
    if found then
      return json_build_object('ok', false, 'reason', 'device_has_account', 'masked', left(other.buyer_email, 1) || '***' || substr(other.buyer_email, position('@' in other.buyer_email)));
    end if;
    k := public.new_licence(null, em, null, 1, 'free', null);
    update public.licences set user_id = uid where key = k;
    select * into lic from public.licences where key = k;
  end if;
  if not lic.active then return json_build_object('ok', false, 'reason', 'revoked'); end if;
  reg := public._register_device(lic.key, p_device, p_label);
  if not (reg->>'ok')::boolean then return reg; end if;
  return json_build_object('ok', true, 'key', lic.key, 'email', em, 'plan', lic.plan, 'ref_code', lic.ref_code, 'ent', public._ent(lic.key));
end; $$;

-- link_licence: joins a key (a bought licence or an old free key) to the signed-in account. Once.
create or replace function public.link_licence(p_key text, p_device text, p_label text default null)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); em text; k text := upper(trim(coalesce(p_key, ''))); lic public.licences; mine public.licences; reg json; matched boolean;
begin
  if uid is null then return json_build_object('ok', false, 'reason', 'auth'); end if;
  if p_device is null or length(p_device) < 8 then return json_build_object('ok', false, 'reason', 'device'); end if;
  select lower(email) into em from auth.users where id = uid;
  select * into lic from public.licences where key = k;
  if not found then return json_build_object('ok', false, 'reason', 'invalid'); end if;
  if not lic.active then return json_build_object('ok', false, 'reason', 'revoked'); end if;
  if lic.user_id is not null and lic.user_id <> uid then return json_build_object('ok', false, 'reason', 'taken'); end if;
  if lic.user_id is null then
    matched := exists (select 1 from public.licence_devices where licence_key = k and device_id = p_device)
            or (lic.buyer_email is not null and lower(lic.buyer_email) = em);
    if not matched then return json_build_object('ok', false, 'reason', 'no_match'); end if;
    select * into mine from public.licences where user_id = uid;
    if found then
      if exists (select 1 from public.invoices where licence_key = mine.key) or exists (select 1 from public.free_use where licence_key = mine.key) then
        return json_build_object('ok', false, 'reason', 'account_has_documents');
      end if;
      delete from public.licences where key = mine.key;  -- an empty workspace: the key takes its place
    end if;
    update public.licences set user_id = uid where key = k;
  end if;
  reg := public._register_device(k, p_device, p_label);
  if not (reg->>'ok')::boolean then return reg; end if;
  select * into lic from public.licences where key = k;
  return json_build_object('ok', true, 'key', k, 'email', em, 'plan', lic.plan, 'ref_code', lic.ref_code, 'ent', public._ent(k));
end; $$;

-- account_swap_device: the workspace is full, so remove one device and put this one in. At most 3 times in 30 days.
create or replace function public.account_swap_device(p_device text, p_label text, p_remove text)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); lic public.licences; n int; reg json;
begin
  if uid is null then return json_build_object('ok', false, 'reason', 'auth'); end if;
  select * into lic from public.licences where user_id = uid;
  if not found then return json_build_object('ok', false, 'reason', 'no_workspace'); end if;
  if p_device is null or length(p_device) < 8 or p_remove is null or p_remove = p_device then return json_build_object('ok', false, 'reason', 'device'); end if;
  if not exists (select 1 from public.licence_devices where licence_key = lic.key and device_id = p_remove) then return json_build_object('ok', false, 'reason', 'unknown_device'); end if;
  select count(*) into n from public.device_changes where licence_key = lic.key and changed_at > now() - interval '30 days';
  if n >= 3 then return json_build_object('ok', false, 'reason', 'too_many_changes'); end if;
  delete from public.licence_devices where licence_key = lic.key and device_id = p_remove;
  insert into public.device_changes (licence_key) values (lic.key);
  reg := public._register_device(lic.key, p_device, p_label);
  if not (reg->>'ok')::boolean then return reg; end if;
  return json_build_object('ok', true, 'key', lic.key, 'email', (select lower(email) from auth.users where id = uid), 'plan', lic.plan, 'ref_code', lic.ref_code, 'ent', public._ent(lic.key));
end; $$;

-- account_devices: the Devices screen.
create or replace function public.account_devices() returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); lic public.licences;
begin
  if uid is null then return json_build_object('ok', false, 'reason', 'auth'); end if;
  select * into lic from public.licences where user_id = uid;
  if not found then return json_build_object('ok', false, 'reason', 'no_workspace'); end if;
  return json_build_object('ok', true, 'devices', public._device_list(lic.key), 'ent', public._ent(lic.key),
    'changes_left', greatest(0, 3 - (select count(*) from public.device_changes where licence_key = lic.key and changed_at > now() - interval '30 days')::int));
end; $$;

-- account_remove_device: sign another phone out of the workspace (counts as one of the 3 changes).
create or replace function public.account_remove_device(p_remove text, p_current text) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); lic public.licences; n int;
begin
  if uid is null then return json_build_object('ok', false, 'reason', 'auth'); end if;
  select * into lic from public.licences where user_id = uid;
  if not found then return json_build_object('ok', false, 'reason', 'no_workspace'); end if;
  if p_remove is null or p_remove = p_current then return json_build_object('ok', false, 'reason', 'device'); end if;
  if not exists (select 1 from public.licence_devices where licence_key = lic.key and device_id = p_remove) then return json_build_object('ok', false, 'reason', 'unknown_device'); end if;
  select count(*) into n from public.device_changes where licence_key = lic.key and changed_at > now() - interval '30 days';
  if n >= 3 then return json_build_object('ok', false, 'reason', 'too_many_changes'); end if;
  delete from public.licence_devices where licence_key = lic.key and device_id = p_remove;
  insert into public.device_changes (licence_key) values (lic.key);
  return json_build_object('ok', true, 'devices', public._device_list(lic.key));
end; $$;

-- account_release_device: signing out of this phone frees its place (not counted as a change).
create or replace function public.account_release_device(p_device text) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); lic public.licences;
begin
  if uid is null then return json_build_object('ok', false, 'reason', 'auth'); end if;
  select * into lic from public.licences where user_id = uid;
  if not found then return json_build_object('ok', true); end if;
  delete from public.licence_devices where licence_key = lic.key and device_id = p_device;
  return json_build_object('ok', true);
end; $$;

-- rename_business: change the business name locked to the workspace, once every 60 days (file 07, C6).
create or replace function public.rename_business(p_key text, p_device text, p_slot int, p_name text) returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); k text := upper(trim(coalesce(p_key, ''))); lic public.licences; nm text := lower(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'));
begin
  if uid is null then return json_build_object('ok', false, 'reason', 'auth'); end if;
  select * into lic from public.licences where key = k and user_id = uid;
  if not found then return json_build_object('ok', false, 'reason', 'auth'); end if;
  if not public._licence_ok(k, p_device) then return json_build_object('ok', false, 'reason', 'licence'); end if;
  if length(nm) < 2 or length(nm) > 80 then return json_build_object('ok', false, 'reason', 'name'); end if;
  if lic.name_changed_at is not null and lic.name_changed_at > now() - interval '60 days' then
    return json_build_object('ok', false, 'reason', 'too_soon', 'next', (lic.name_changed_at + interval '60 days')::date);
  end if;
  if coalesce(p_slot, 1) = 2 then
    if coalesce((public._ent(k)->>'businesses_max')::int, 1) < 2 then return json_build_object('ok', false, 'reason', 'slot'); end if;
    update public.licences set business_name_2 = nm, name_changed_at = now() where key = k;
  else
    update public.licences set business_name = nm, name_changed_at = now() where key = k;
  end if;
  return json_build_object('ok', true);
end; $$;

-- request_delete: the owner of the account asks for it to be deleted (carried out by hand).
create or replace function public.request_delete() returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); lic public.licences;
begin
  if uid is null then return json_build_object('ok', false, 'reason', 'auth'); end if;
  select * into lic from public.licences where user_id = uid;
  if not exists (select 1 from public.delete_requests where user_id = uid and done_at is null) then
    insert into public.delete_requests (user_id, licence_key) values (uid, lic.key);
  end if;
  return json_build_object('ok', true);
end; $$;

revoke all on function public.account_enter(text, text), public.link_licence(text, text, text), public.account_swap_device(text, text, text), public.account_devices(),
  public.account_remove_device(text, text), public.account_release_device(text), public.rename_business(text, text, int, text), public.request_delete() from public, anon;
grant execute on function public.account_enter(text, text), public.link_licence(text, text, text), public.account_swap_device(text, text, text), public.account_devices(),
  public.account_remove_device(text, text), public.account_release_device(text), public.rename_business(text, text, int, text), public.request_delete() to authenticated;

-- ---------------------------------------------------------------- useful commands for you (run by hand when needed)
-- Turn on "free keys must join an account to send" (subscription launch day):
--   update app_config set value = 'on' where key = 'accounts_required';
-- See who has an account:
--   select l.key, l.plan, l.buyer_email, u.email from licences l join auth.users u on u.id = l.user_id;
-- Account deletion requests waiting:
--   select * from delete_requests where done_at is null order by created_at;
