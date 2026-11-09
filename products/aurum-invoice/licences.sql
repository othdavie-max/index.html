-- Aurum Invoice Studio — licence keys locked to devices
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

-- pgcrypto lives in the "extensions" schema on Supabase, so the functions that
-- make random keys include it in their search_path.
create extension if not exists pgcrypto;

create table if not exists public.licences (
  key          text primary key,
  buyer_name   text,
  buyer_email  text,
  buyer_phone  text,
  max_devices  int  not null default 2,
  plan         text not null default 'signature' check (plan in ('signature', 'prestige')),
  business_name text,           -- locked to the first business that sends with this key
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.licence_devices (
  licence_key  text not null references public.licences(key) on delete cascade,
  device_id    text not null,
  activated_at timestamptz not null default now(),
  last_seen    timestamptz not null default now(),
  primary key (licence_key, device_id)
);

-- For databases created with an earlier version of this file:
alter table public.licences add column if not exists plan text not null default 'signature';
alter table public.licences add column if not exists business_name text;
alter table public.licences add column if not exists ref_code text;
alter table public.licences add column if not exists referred_by text;
create unique index if not exists licences_ref_code_idx on public.licences (ref_code);

-- Lock both tables. With RLS on and no policies, the public app key can't read or
-- change them directly; it can only call the function below.
alter table public.licences        enable row level security;
alter table public.licence_devices enable row level security;

-- The only thing the app can call. It checks the key, and registers this device
-- if the key still has a free device slot.
create or replace function public.activate_license(p_key text, p_device text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  lic  public.licences;
  used int;
begin
  if p_key is null or p_device is null or length(p_device) < 8 then
    return json_build_object('ok', false, 'reason', 'invalid');
  end if;

  select * into lic from public.licences where key = upper(trim(p_key));
  if not found then
    return json_build_object('ok', false, 'reason', 'invalid');
  end if;
  if not lic.active then
    return json_build_object('ok', false, 'reason', 'revoked');
  end if;

  if exists (select 1 from public.licence_devices where licence_key = lic.key and device_id = p_device) then
    update public.licence_devices set last_seen = now() where licence_key = lic.key and device_id = p_device;
  else
    select count(*) into used from public.licence_devices where licence_key = lic.key;
    if used >= lic.max_devices then
      return json_build_object('ok', false, 'reason', 'device_limit');
    end if;
    insert into public.licence_devices (licence_key, device_id) values (lic.key, p_device);
  end if;

  select count(*) into used from public.licence_devices where licence_key = lic.key;
  if lic.ref_code is null then
    update public.licences set ref_code = 'REF-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6)) where key = lic.key returning ref_code into lic.ref_code;
  end if;
  return json_build_object('ok', true, 'email', lic.buyer_email, 'plan', lic.plan, 'devices_used', used, 'max_devices', lic.max_devices, 'ref_code', lic.ref_code);
end;
$$;

revoke all on function public.activate_license(text, text) from public;
grant execute on function public.activate_license(text, text) to anon, authenticated;

-- Make a new key for a buyer (run in the SQL editor, never from the app):
--   select public.new_licence('Chioma Eze', 'chioma@example.com', '08031234567');
--   Prestige buyer:  select public.new_licence('Chioma Eze', 'chioma@example.com', '08031234567', 3, 'prestige');
drop function if exists public.new_licence(text, text, text, int);
drop function if exists public.new_licence(text, text, text, int, text);
create or replace function public.new_licence(p_name text, p_email text, p_phone text default null, p_devices int default 2, p_plan text default 'signature', p_referred_by text default null)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare k text;
begin
  loop
    k := 'AUR-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 4)) || '-'
                || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 4)) || '-'
                || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 4));
    exit when not exists (select 1 from public.licences where key = k);
  end loop;
  insert into public.licences (key, buyer_name, buyer_email, buyer_phone, max_devices, plan, referred_by)
  values (k, p_name, p_email, p_phone, p_devices, p_plan, upper(nullif(trim(p_referred_by), '')));
  return k;
end;
$$;
revoke all on function public.new_licence(text, text, text, int, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------
-- Private invoice links
-- ---------------------------------------------------------------
create table if not exists public.invoices (
  id               text primary key,
  licence_key      text not null references public.licences(key) on delete cascade,
  doc_id           text not null,
  payload          jsonb not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  first_viewed_at  timestamptz,
  last_viewed_at   timestamptz,
  view_count       int not null default 0,
  paid_claimed_at  timestamptz,
  paid_method      text,
  paid_ref         text,
  unique (licence_key, doc_id)
);
alter table public.invoices add column if not exists paid_method text;
alter table public.invoices add column if not exists paid_ref text;
alter table public.invoices enable row level security;

-- Internal check used by the functions below: is this key active and this device registered?
create or replace function public._licence_ok(p_key text, p_device text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.licences l join public.licence_devices d on d.licence_key = l.key
    where l.key = upper(trim(p_key)) and l.active and d.device_id = p_device
  );
$$;
revoke all on function public._licence_ok(text, text) from public, anon, authenticated;

-- Business saves (or updates) an invoice and gets its private link id.
create or replace function public.publish_invoice(p_key text, p_device text, p_doc_id text, p_payload jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_id text; v_name text; v_locked text;
begin
  if not public._licence_ok(p_key, p_device) then return json_build_object('ok', false, 'reason', 'licence'); end if;
  if octet_length(p_payload::text) > 1500000 then return json_build_object('ok', false, 'reason', 'too_large'); end if;
  -- One licence = one business. The first business name used is locked in.
  v_name := lower(regexp_replace(trim(coalesce(p_payload->'profile'->'business'->>'name', '')), '\s+', ' ', 'g'));
  select business_name into v_locked from public.licences where key = upper(trim(p_key));
  if v_locked is null then
    update public.licences set business_name = v_name where key = upper(trim(p_key));
  elsif v_locked <> v_name then
    return json_build_object('ok', false, 'reason', 'business_mismatch');
  end if;
  select id into v_id from public.invoices where licence_key = upper(trim(p_key)) and doc_id = p_doc_id;
  if v_id is null then
    loop
      v_id := lower(substr(encode(gen_random_bytes(9), 'hex'), 1, 12));
      exit when not exists (select 1 from public.invoices where id = v_id);
    end loop;
    insert into public.invoices (id, licence_key, doc_id, payload) values (v_id, upper(trim(p_key)), p_doc_id, p_payload);
  else
    update public.invoices set payload = p_payload, updated_at = now() where id = v_id;
  end if;
  return json_build_object('ok', true, 'id', v_id);
end;
$$;

-- Client opens the link. Records the view.
create or replace function public.view_invoice(p_id text)
returns json language plpgsql security definer set search_path = public as $$
declare inv public.invoices; lic_active boolean;
begin
  select * into inv from public.invoices where id = p_id;
  if not found then return json_build_object('ok', false, 'reason', 'missing'); end if;
  select active into lic_active from public.licences where key = inv.licence_key;
  if not coalesce(lic_active, false) then return json_build_object('ok', false, 'reason', 'unavailable'); end if;
  update public.invoices set view_count = view_count + 1, last_viewed_at = now(), first_viewed_at = coalesce(first_viewed_at, now()) where id = p_id;
  return json_build_object('ok', true, 'payload', inv.payload, 'created_at', inv.created_at);
end;
$$;

-- Client taps "I've paid" / "Accept".
drop function if exists public.claim_paid(text);
create or replace function public.claim_paid(p_id text, p_method text default 'transfer', p_ref text default '')
returns json language plpgsql security definer set search_path = public as $$
begin
  update public.invoices set paid_claimed_at = now(), paid_method = left(p_method, 20), paid_ref = left(p_ref, 80) where id = p_id;
  return json_build_object('ok', found);
end;
$$;

-- Business sees which invoices were opened.
create or replace function public.invoice_activity(p_key text, p_device text)
returns setof json language plpgsql security definer set search_path = public as $$
begin
  if not public._licence_ok(p_key, p_device) then return; end if;
  return query select json_build_object('doc_id', doc_id, 'id', id, 'view_count', view_count, 'first_viewed_at', first_viewed_at, 'last_viewed_at', last_viewed_at, 'paid_claimed_at', paid_claimed_at, 'paid_method', paid_method)
    from public.invoices where licence_key = upper(trim(p_key)) order by updated_at desc limit 200;
end;
$$;

revoke all on function public.publish_invoice(text, text, text, jsonb), public.view_invoice(text), public.claim_paid(text, text, text), public.invoice_activity(text, text) from public;
grant execute on function public.publish_invoice(text, text, text, jsonb), public.view_invoice(text), public.claim_paid(text, text, text), public.invoice_activity(text, text) to anon, authenticated;

-- ---------------------------------------------------------------
-- Cloud backup: each licence keeps one workspace (documents, clients,
-- items, settings), shared by that buyer's devices and staff.
-- ---------------------------------------------------------------
create table if not exists public.workspaces (
  licence_key text primary key references public.licences(key) on delete cascade,
  data        jsonb not null,
  version     bigint not null default 1,
  updated_at  timestamptz not null default now(),
  updated_by  text
);
alter table public.workspaces enable row level security;

create or replace function public.save_workspace(p_key text, p_device text, p_data jsonb, p_version bigint)
returns json language plpgsql security definer set search_path = public as $$
declare k text := upper(trim(p_key)); v bigint;
begin
  if not public._licence_ok(p_key, p_device) then return json_build_object('ok', false, 'reason', 'licence'); end if;
  if octet_length(p_data::text) > 8000000 then return json_build_object('ok', false, 'reason', 'too_large'); end if;
  select version into v from public.workspaces where licence_key = k for update;
  if not found then
    insert into public.workspaces (licence_key, data, version, updated_by) values (k, p_data, 1, p_device);
    return json_build_object('ok', true, 'version', 1);
  end if;
  if p_version is distinct from v then return json_build_object('ok', false, 'reason', 'conflict', 'version', v); end if;
  update public.workspaces set data = p_data, version = v + 1, updated_at = now(), updated_by = p_device where licence_key = k;
  return json_build_object('ok', true, 'version', v + 1);
end;
$$;

create or replace function public.load_workspace(p_key text, p_device text)
returns json language plpgsql security definer set search_path = public as $$
declare w public.workspaces;
begin
  if not public._licence_ok(p_key, p_device) then return json_build_object('ok', false, 'reason', 'licence'); end if;
  select * into w from public.workspaces where licence_key = upper(trim(p_key));
  if not found then return json_build_object('ok', true, 'data', null, 'version', 0); end if;
  return json_build_object('ok', true, 'data', w.data, 'version', w.version, 'updated_at', w.updated_at);
end;
$$;
revoke all on function public.save_workspace(text, text, jsonb, bigint), public.load_workspace(text, text) from public;
grant execute on function public.save_workspace(text, text, jsonb, bigint), public.load_workspace(text, text) to anon, authenticated;

-- Everyday admin (run in the SQL editor):
--   Block a key that was shared:      update licences set active = false where key = 'AUR-XXXX-XXXX-XXXX';
--   Upgrade to Prestige:              update licences set plan = 'prestige', max_devices = 3 where key = 'AUR-XXXX-XXXX-XXXX';
--   Let a buyer rename their business: update licences set business_name = null where key = 'AUR-XXXX-XXXX-XXXX';
--   Referrals per buyer:              select l.buyer_name, l.ref_code, count(r.*) referred from licences l left join licences r on r.referred_by = l.ref_code group by l.key order by referred desc;
--   New buyer who used a code:        select public.new_licence('Ada Obi', 'ada@example.com', '0802...', 2, 'signature', 'REF-1A2B3C');
--   Free a buyer's device slots       delete from licence_devices where licence_key = 'AUR-XXXX-XXXX-XXXX';
--   (new phone, cleared browser):
--   See who uses which key:           select l.buyer_name, l.key, count(d.*) devices, max(d.last_seen) last_used
--                                     from licences l left join licence_devices d on d.licence_key = l.key
--                                     group by l.key order by last_used desc nulls last;

-- ---------------------------------------------------------------
-- Online checkout (Paystack): buyers pay on the sales page and get their key at once.
-- The Edge Function in functions/paystack/index.ts confirms each payment with Paystack
-- and then calls fulfil_order. Prices are decided here, never in the browser.
-- ---------------------------------------------------------------
create table if not exists public.app_config (key text primary key, value text not null);
alter table public.app_config enable row level security;
-- paystack_mode: 'off' (buttons fall back to WhatsApp), 'test' (pretend money), 'live' (real money)
insert into public.app_config (key, value) values ('paystack_mode', 'off'), ('promo_ends', '2026-11-30T23:59:59+01:00') on conflict (key) do nothing;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  plan text not null check (plan in ('signature','prestige')),
  name text not null,
  email text not null,
  phone text,
  referred_by text,
  amount_kobo bigint not null,
  mode text not null check (mode in ('test','live')),
  status text not null default 'pending' check (status in ('pending','paid','underpaid')),
  paid_kobo bigint,
  channel text,
  licence_key text references public.licences(key),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.orders enable row level security;
create index if not exists orders_created_idx on public.orders (created_at desc);

-- Prices in kobo. Black Friday prices apply until promo_ends, then the normal prices.
create or replace function public.price_kobo(p_plan text) returns bigint
language plpgsql stable security definer set search_path = public as $$
declare promo boolean;
begin
  promo := now() < (select value::timestamptz from public.app_config where key = 'promo_ends');
  if p_plan = 'signature' then return (case when promo then 10000 else 15000 end) * 100; end if;
  if p_plan = 'prestige' then return (case when promo then 35000 else 50000 end) * 100; end if;
  return null;
end; $$;
revoke all on function public.price_kobo(text) from public, anon, authenticated;

create or replace function public.payments_mode() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.app_config where key = 'paystack_mode'), 'off');
$$;
revoke all on function public.payments_mode() from public;
grant execute on function public.payments_mode() to anon, authenticated;

create or replace function public.create_order(p_plan text, p_name text, p_email text, p_phone text default null, p_ref text default null)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare m text; amt bigint; r text; nm text := trim(coalesce(p_name, '')); em text := lower(trim(coalesce(p_email, ''))); ph text := left(trim(coalesce(p_phone, '')), 20);
begin
  m := public.payments_mode();
  if m not in ('test', 'live') then return json_build_object('ok', false, 'reason', 'off'); end if;
  if p_plan not in ('signature', 'prestige') then return json_build_object('ok', false, 'reason', 'plan'); end if;
  if length(nm) < 2 or length(nm) > 80 then return json_build_object('ok', false, 'reason', 'name'); end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(em) > 120 then return json_build_object('ok', false, 'reason', 'email'); end if;
  amt := public.price_kobo(p_plan);
  r := 'AUR-' || upper(encode(gen_random_bytes(10), 'hex'));
  insert into public.orders (reference, plan, name, email, phone, referred_by, amount_kobo, mode) values (r, p_plan, nm, em, nullif(ph, ''), upper(nullif(trim(coalesce(p_ref, '')), '')), amt, m);
  return json_build_object('ok', true, 'reference', r, 'amount_kobo', amt, 'mode', m, 'email', em);
end; $$;
revoke all on function public.create_order(text, text, text, text, text) from public;
grant execute on function public.create_order(text, text, text, text, text) to anon, authenticated;

create or replace function public.order_status(p_reference text)
returns json language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where reference = p_reference;
  if not found then return json_build_object('ok', false, 'reason', 'unknown'); end if;
  if o.status = 'paid' then return json_build_object('ok', true, 'status', 'paid', 'key', o.licence_key, 'plan', o.plan, 'test', o.mode = 'test', 'name', o.name, 'phone', o.phone); end if;
  return json_build_object('ok', true, 'status', o.status);
end; $$;
revoke all on function public.order_status(text) from public;
grant execute on function public.order_status(text) to anon, authenticated;

-- Only the Edge Function (service role) can use these two.
create or replace function public.order_for_verify(p_reference text)
returns json language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where reference = p_reference;
  if not found then return json_build_object('ok', false, 'reason', 'unknown'); end if;
  return json_build_object('ok', true, 'mode', o.mode, 'status', o.status, 'amount_kobo', o.amount_kobo, 'email', o.email, 'plan', o.plan);
end; $$;
revoke all on function public.order_for_verify(text) from public, anon, authenticated;
grant execute on function public.order_for_verify(text) to service_role;

-- Issues the licence for a confirmed payment. Safe to call twice: the same key comes back.
-- Test-mode orders get a key that is switched off.
create or replace function public.fulfil_order(p_reference text, p_paid_kobo bigint, p_channel text default null)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare o public.orders; k text;
begin
  select * into o from public.orders where reference = p_reference for update;
  if not found then return json_build_object('ok', false, 'reason', 'unknown'); end if;
  if o.status = 'paid' then return json_build_object('ok', true, 'key', o.licence_key, 'plan', o.plan, 'test', o.mode = 'test'); end if;
  if p_paid_kobo is null or p_paid_kobo < o.amount_kobo then
    update public.orders set status = 'underpaid', paid_kobo = p_paid_kobo where reference = p_reference;
    return json_build_object('ok', false, 'reason', 'underpaid');
  end if;
  k := public.new_licence(o.name, o.email, o.phone, case o.plan when 'prestige' then 3 else 2 end, o.plan, o.referred_by);
  if o.mode = 'test' then update public.licences set active = false, buyer_name = 'TEST ' || o.name where key = k; end if;
  update public.orders set status = 'paid', paid_at = now(), paid_kobo = p_paid_kobo, channel = p_channel, licence_key = k where reference = p_reference;
  return json_build_object('ok', true, 'key', k, 'plan', o.plan, 'test', o.mode = 'test');
end; $$;
revoke all on function public.fulfil_order(text, bigint, text) from public, anon, authenticated;
grant execute on function public.fulfil_order(text, bigint, text) to service_role;

--   Switch checkout:  update app_config set value = 'live' where key = 'paystack_mode';   ('off' | 'test' | 'live')
--   Recent sales:     select created_at, plan, name, email, phone, amount_kobo/100 as naira, status, licence_key from orders order by created_at desc limit 50;
--   Total sold:       select plan, count(*), sum(paid_kobo)/100 as naira from orders where status = 'paid' and mode = 'live' group by plan;
