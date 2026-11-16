-- Aurum BILLING (Build 2). Design: plan/07-accounts-and-billing.md, parts E to J and H.
-- Safe to run more than once. Run AFTER accounts.sql.
--
-- What this adds:
--   * prices, orders, payments, subscriptions, a nightly job, a mail queue and the Business request form
--   * apply_payment: the one place where a confirmed payment turns into plan time (once per reference)
--   * publish_invoice and view_invoice now follow the plan rules (designs, openings, branding, businesses, closing old links)
--
-- Two switches in app_config, both OFF, keep today's behaviour for everyone until you turn them on:
--   subs_mode        off | test | live    who may pay for a plan ('test' = only accounts listed in `admins`)
--   plans_enforced   off | on             on = the plan rules apply to every key (launch day).
--                                          Accounts made with the new sign-in are always under the rules.

insert into public.app_config (key, value) values ('subs_mode', 'off'), ('plans_enforced', 'off') on conflict (key) do nothing;

-- ---------------------------------------------------------------- columns and tables
alter table public.invoices add column if not exists branding text;
alter table public.invoices add column if not exists closed_at timestamptz;

create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security;

create table if not exists public.prices (
  tier text not null check (tier in ('starter', 'pro')),
  period text not null check (period in ('month', 'year')),
  amount_kobo bigint not null,
  plan_code_test text,
  plan_code_live text,
  primary key (tier, period)
);
alter table public.prices enable row level security;
insert into public.prices (tier, period, amount_kobo) values
  ('starter', 'month', 300000), ('starter', 'year', 3000000), ('pro', 'month', 600000), ('pro', 'year', 6000000)
on conflict (tier, period) do update set amount_kobo = excluded.amount_kobo;

create table if not exists public.sub_orders (
  reference text primary key,
  licence_key text not null,
  user_id uuid not null,
  tier text not null, period text not null, method text not null,
  amount_kobo bigint not null,
  mode text not null check (mode in ('test', 'live')),
  status text not null default 'pending',          -- pending | paid | underpaid
  paid_kobo bigint, channel text,
  created_at timestamptz not null default now(), paid_at timestamptz
);
alter table public.sub_orders enable row level security;
create index if not exists sub_orders_key_idx on public.sub_orders (licence_key, created_at desc);

create table if not exists public.payments (
  id bigint generated always as identity primary key,
  reference text unique not null,
  licence_key text not null,
  source text not null,                            -- order | renewal | admin
  tier text, period text, amount_kobo bigint, channel text, mode text,
  paid_at timestamptz not null default now(),
  period_start timestamptz, period_end timestamptz,
  bonus_days int not null default 0,
  prev_paid_until timestamptz, prev_tier text, prev_period text, prev_method text,
  refunded_at timestamptz
);
alter table public.payments enable row level security;
create index if not exists payments_key_idx on public.payments (licence_key, paid_at desc);

create table if not exists public.subscriptions (
  licence_key text primary key,
  customer_code text, subscription_code text, email_token text, plan_code text,
  tier text, period text,
  status text not null default 'active',           -- active | not_renewing | attention | off
  next_payment timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create index if not exists subscriptions_customer_idx on public.subscriptions (customer_code);

create table if not exists public.business_requests (
  id bigint generated always as identity primary key,
  name text, business text, whatsapp text, team_size text, note text, session text,
  created_at timestamptz not null default now()
);
alter table public.business_requests enable row level security;

create table if not exists public.billing_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  kind text not null, reference text, detail jsonb
);
alter table public.billing_log enable row level security;
create index if not exists billing_log_at_idx on public.billing_log (at desc);

create table if not exists public.mail_queue (
  id bigint generated always as identity primary key,
  to_email text not null, subject text not null, body text not null,
  kind text not null, ref text not null,
  created_at timestamptz not null default now(), sent_at timestamptz, tries int not null default 0, last_error text,
  unique (kind, ref)
);
alter table public.mail_queue enable row level security;

-- ---------------------------------------------------------------- small helpers (private)
create or replace function public._subs_mode() returns text language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.app_config where key = 'subs_mode'), 'off');
$$;
create or replace function public._plans_enforced(p_key text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.app_config where key = 'plans_enforced'), 'off') = 'on'
      or exists (select 1 from public.licences where key = upper(trim(coalesce(p_key, ''))) and user_id is not null);
$$;
create or replace function public._is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from public.admins where user_id = auth.uid());
$$;
create or replace function public._log(p_kind text, p_ref text, p_detail jsonb default null) returns void language sql security definer set search_path = public as $$
  insert into public.billing_log (kind, reference, detail) values (p_kind, left(p_ref, 80), p_detail);
$$;
create or replace function public._add_period(p_from timestamptz, p_period text) returns timestamptz language sql immutable as $$
  select ((p_from at time zone 'Africa/Lagos') + case when p_period = 'year' then interval '1 year' else interval '1 month' end) at time zone 'Africa/Lagos';
$$;
-- The plan-details object, now also saying whether the plan renews by itself.
create or replace function public._ent(p_key text) returns json language plpgsql stable security definer set search_path = public as $$
declare k text := upper(trim(coalesce(p_key, ''))); l public.licences; lv text; r public.plan_rules; used int := 0; st text := 'none'; dm int; sub public.subscriptions;
begin
  select * into l from public.licences where key = k;
  if not found then return null; end if;
  lv := public._level(k);
  select * into r from public.plan_rules where level = lv;
  select * into sub from public.subscriptions where licence_key = k;
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
    'status', st, 'paid_until', l.paid_until, 'period', l.paid_period, 'method', l.paid_method,
    'paid_tier', l.paid_tier,
    'renews', coalesce(sub.status = 'active', false), 'sub_status', sub.status,
    'account', l.user_id is not null, 'enforced', public._plans_enforced(k), 'checked_at', now());
end; $$;
revoke all on function public._subs_mode(), public._plans_enforced(text), public._is_admin(), public._log(text, text, jsonb), public._add_period(timestamptz, text), public._ent(text) from public, anon, authenticated;

-- Can this account buy this plan right now, and what would it get? Used by the quote and by the order.
create or replace function public._order_check(p_user uuid, p_tier text, p_period text) returns json language plpgsql stable security definer set search_path = public as $$
declare lic public.licences; pr public.prices; mode text := public._subs_mode(); bonus int := 0; lv text;
begin
  if p_tier not in ('starter', 'pro') or p_period not in ('month', 'year') then return json_build_object('ok', false, 'reason', 'plan'); end if;
  select * into lic from public.licences where user_id = p_user;
  if not found then return json_build_object('ok', false, 'reason', 'no_workspace'); end if;
  if mode = 'off' then return json_build_object('ok', false, 'reason', 'off'); end if;
  if mode = 'test' and not exists (select 1 from public.admins where user_id = p_user) then return json_build_object('ok', false, 'reason', 'admin_only'); end if;
  lv := public._level(lic.key);
  if lic.plan = 'prestige' then return json_build_object('ok', false, 'reason', 'not_needed'); end if;
  if lic.plan = 'signature' and p_tier = 'starter' then return json_build_object('ok', false, 'reason', 'not_needed'); end if;
  if lv = 'pro' and p_tier = 'starter' then return json_build_object('ok', false, 'reason', 'downgrade', 'until', lic.paid_until); end if;
  select * into pr from public.prices where tier = p_tier and period = p_period;
  if not found then return json_build_object('ok', false, 'reason', 'plan'); end if;
  if lic.paid_tier = 'starter' and p_tier = 'pro' and lic.paid_until is not null and lic.paid_until > now() then
    bonus := ceil(extract(epoch from (lic.paid_until - now())) / 86400.0 / 2.0)::int;
  end if;
  return json_build_object('ok', true, 'key', lic.key, 'amount_kobo', pr.amount_kobo, 'bonus_days', bonus, 'mode', mode,
    'paid_until', lic.paid_until, 'paid_tier', lic.paid_tier);
end; $$;
revoke all on function public._order_check(uuid, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- public and signed-in functions the app calls
create or replace function public.plan_prices() returns json language sql stable security definer set search_path = public as $$
  select json_build_object('mode', public._subs_mode(), 'prices', (select coalesce(json_agg(json_build_object('tier', tier, 'period', period, 'amount_kobo', amount_kobo) order by tier, period), '[]'::json) from public.prices));
$$;
revoke all on function public.plan_prices() from public;
grant execute on function public.plan_prices() to anon, authenticated;

-- my_billing: what the plan screen needs (signed in).
create or replace function public.my_billing() returns json language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); lic public.licences; sub public.subscriptions;
begin
  if uid is null then return json_build_object('ok', false, 'reason', 'auth'); end if;
  select * into lic from public.licences where user_id = uid;
  if not found then return json_build_object('ok', false, 'reason', 'no_workspace'); end if;
  select * into sub from public.subscriptions where licence_key = lic.key;
  return json_build_object('ok', true, 'ent', public._ent(lic.key), 'mode', public._subs_mode(), 'admin', public._is_admin(),
    'sub', case when sub.licence_key is null then null else json_build_object('status', sub.status, 'tier', sub.tier, 'period', sub.period, 'next_payment', sub.next_payment) end,
    'prices', (select coalesce(json_agg(json_build_object('tier', tier, 'period', period, 'amount_kobo', amount_kobo) order by tier, period), '[]'::json) from public.prices));
end; $$;

create or replace function public.plan_quote(p_tier text, p_period text) returns json language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); c json;
begin
  if uid is null then return json_build_object('ok', false, 'reason', 'auth'); end if;
  c := public._order_check(uid, p_tier, p_period);
  return c;
end; $$;

create or replace function public.create_sub_order(p_tier text, p_period text, p_method text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); c json; r text; em text;
begin
  if uid is null then return json_build_object('ok', false, 'reason', 'auth'); end if;
  if p_method not in ('card', 'transfer') then return json_build_object('ok', false, 'reason', 'plan'); end if;
  c := public._order_check(uid, p_tier, p_period);
  if not (c->>'ok')::boolean then perform public._log('order_refused', null, jsonb_build_object('user', uid, 'reason', c->>'reason')); return c; end if;
  select lower(email) into em from auth.users where id = uid;
  r := 'AUS-' || upper(encode(gen_random_bytes(10), 'hex'));
  insert into public.sub_orders (reference, licence_key, user_id, tier, period, method, amount_kobo, mode)
  values (r, c->>'key', uid, p_tier, p_period, p_method, (c->>'amount_kobo')::bigint, c->>'mode');
  return json_build_object('ok', true, 'reference', r, 'amount_kobo', (c->>'amount_kobo')::bigint, 'mode', c->>'mode', 'email', em, 'bonus_days', (c->>'bonus_days')::int);
end; $$;

create or replace function public.my_payments() returns json language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); lic public.licences;
begin
  if uid is null then return json_build_object('ok', false, 'reason', 'auth'); end if;
  select * into lic from public.licences where user_id = uid;
  if not found then return json_build_object('ok', false, 'reason', 'no_workspace'); end if;
  return json_build_object('ok', true, 'payments', (select coalesce(json_agg(json_build_object('paid_at', paid_at, 'tier', tier, 'period', period, 'amount_kobo', amount_kobo, 'reference', reference, 'refunded', refunded_at is not null, 'channel', channel) order by paid_at desc), '[]'::json)
    from (select * from public.payments where licence_key = lic.key order by paid_at desc limit 50) x));
end; $$;

create or replace function public.request_business(p_session text, p_name text, p_business text, p_whatsapp text, p_team text, p_note text default null, p_trap text default null) returns json language plpgsql security definer set search_path = public as $$
declare nm text := trim(coalesce(p_name, '')); bz text := trim(coalesce(p_business, '')); wa text := regexp_replace(coalesce(p_whatsapp, ''), '[^0-9+]', '', 'g');
begin
  if coalesce(p_trap, '') <> '' then return json_build_object('ok', true); end if;   -- a robot filled the hidden field: pretend it worked
  if p_session is null or length(p_session) < 8 or length(p_session) > 64 then return json_build_object('ok', false, 'reason', 'session'); end if;
  if length(nm) < 2 or length(nm) > 80 or length(bz) < 2 or length(bz) > 100 then return json_build_object('ok', false, 'reason', 'name'); end if;
  if length(regexp_replace(wa, '\D', '', 'g')) < 8 or length(wa) > 20 then return json_build_object('ok', false, 'reason', 'whatsapp'); end if;
  if p_team not in ('2 to 5', '6 to 20', 'More than 20') then return json_build_object('ok', false, 'reason', 'team'); end if;
  if (select count(*) from public.business_requests where session = p_session and created_at > now() - interval '1 day') >= 3 then return json_build_object('ok', false, 'reason', 'limit'); end if;
  insert into public.business_requests (name, business, whatsapp, team_size, note, session) values (nm, bz, wa, p_team, left(p_note, 500), p_session);
  return json_build_object('ok', true);
end; $$;

revoke all on function public.my_billing(), public.plan_quote(text, text), public.create_sub_order(text, text, text), public.my_payments() from public, anon;
grant execute on function public.my_billing(), public.plan_quote(text, text), public.create_sub_order(text, text, text), public.my_payments() to authenticated;
revoke all on function public.request_business(text, text, text, text, text, text, text) from public;
grant execute on function public.request_business(text, text, text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- the server-only functions (the two payment functions call these)
create or replace function public.licence_of_user(p_user uuid) returns text language sql stable security definer set search_path = public as $$
  select key from public.licences where user_id = p_user;
$$;
create or replace function public.is_admin_user(p_user uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = p_user);
$$;
create or replace function public.sub_order_for_verify(p_reference text) returns json language plpgsql stable security definer set search_path = public as $$
declare o public.sub_orders; em text; code text; sub public.subscriptions;
begin
  select * into o from public.sub_orders where reference = p_reference;
  if not found then return json_build_object('ok', false, 'reason', 'unknown'); end if;
  select lower(email) into em from auth.users where id = o.user_id;
  select case when o.mode = 'live' then plan_code_live else plan_code_test end into code from public.prices where tier = o.tier and period = o.period;
  select * into sub from public.subscriptions where licence_key = o.licence_key;
  return json_build_object('ok', true, 'reference', o.reference, 'user_id', o.user_id, 'licence_key', o.licence_key, 'tier', o.tier, 'period', o.period, 'method', o.method,
    'amount_kobo', o.amount_kobo, 'mode', o.mode, 'status', o.status, 'email', em, 'plan_code', code,
    'old_sub', case when sub.licence_key is null then null else json_build_object('code', sub.subscription_code, 'token', sub.email_token, 'status', sub.status) end);
end; $$;
create or replace function public.licence_for_customer(p_customer text) returns json language sql stable security definer set search_path = public as $$
  select coalesce((select json_build_object('licence_key', licence_key, 'tier', tier, 'period', period, 'subscription_code', subscription_code, 'plan_code', plan_code) from public.subscriptions where customer_code = p_customer limit 1), 'null'::json);
$$;
create or replace function public.licence_for_email(p_email text) returns text language sql stable security definer set search_path = public as $$
  select l.key from public.licences l join auth.users u on u.id = l.user_id where lower(u.email) = lower(trim(coalesce(p_email, '')));
$$;
create or replace function public.price_codes(p_mode text) returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('tier', tier, 'period', period, 'amount_kobo', amount_kobo, 'code', case when p_mode = 'live' then plan_code_live else plan_code_test end)), '[]'::json) from public.prices;
$$;
create or replace function public.set_price_code(p_mode text, p_tier text, p_period text, p_code text) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_mode = 'live' then update public.prices set plan_code_live = p_code where tier = p_tier and period = p_period;
  else update public.prices set plan_code_test = p_code where tier = p_tier and period = p_period; end if;
end; $$;
create or replace function public.price_for(p_tier text, p_period text) returns bigint language sql stable security definer set search_path = public as $$
  select amount_kobo from public.prices where tier = p_tier and period = p_period;
$$;

-- apply_payment: turns ONE confirmed payment into plan time. Runs once per reference (a repeat changes nothing).
--   source 'order'   : the order made by create_sub_order
--   source 'renewal' : a later automatic card charge (the licence, tier and period come from the saved subscription)
create or replace function public.apply_payment(p_reference text, p_paid_kobo bigint, p_channel text default null, p_source text default 'order',
  p_licence_key text default null, p_tier text default null, p_period text default null, p_mode text default null, p_method text default null)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare o public.sub_orders; lic public.licences; k text; tier text; per text; meth text; mode text; need bigint; uid uuid;
        start_at timestamptz; end_at timestamptz; bonus int := 0; upgrade boolean := false; pay_id bigint;
begin
  if p_source = 'order' then
    select * into o from public.sub_orders where reference = p_reference for update;
    if not found then perform public._log('apply_unknown', p_reference, null); return json_build_object('ok', false, 'reason', 'unknown'); end if;
    if o.status = 'paid' then return json_build_object('ok', true, 'already', true); end if;
    k := o.licence_key; tier := o.tier; per := o.period; meth := o.method; mode := o.mode; need := o.amount_kobo; uid := o.user_id;
  else
    k := upper(trim(coalesce(p_licence_key, ''))); tier := p_tier; per := p_period; meth := 'card'; mode := coalesce(p_mode, 'live');
    need := public.price_for(tier, per);
    select user_id into uid from public.licences where key = k;
    if k = '' or need is null then perform public._log('apply_bad_renewal', p_reference, jsonb_build_object('key', k, 'tier', tier, 'period', per)); return json_build_object('ok', false, 'reason', 'unknown'); end if;
  end if;
  if p_paid_kobo is null or p_paid_kobo < need then
    if p_source = 'order' then update public.sub_orders set status = 'underpaid', paid_kobo = p_paid_kobo where reference = p_reference; end if;
    perform public._log('underpaid', p_reference, jsonb_build_object('paid', p_paid_kobo, 'need', need));
    return json_build_object('ok', false, 'reason', 'underpaid');
  end if;
  -- a test payment can only ever reach an owner (admin) account
  if mode = 'test' and not exists (select 1 from public.admins where user_id = uid) then
    perform public._log('test_blocked', p_reference, jsonb_build_object('key', k));
    return json_build_object('ok', false, 'reason', 'test_blocked');
  end if;
  select * into lic from public.licences where key = k for update;
  if not found then return json_build_object('ok', false, 'reason', 'unknown'); end if;
  -- one reference, one grant
  insert into public.payments (reference, licence_key, source, tier, period, amount_kobo, channel, mode, prev_paid_until, prev_tier, prev_period, prev_method)
  values (p_reference, k, p_source, tier, per, p_paid_kobo, p_channel, mode, lic.paid_until, lic.paid_tier, lic.paid_period, lic.paid_method)
  on conflict (reference) do nothing returning id into pay_id;
  if pay_id is null then return json_build_object('ok', true, 'already', true); end if;
  -- when does the new period start?
  if lic.paid_tier = 'starter' and tier = 'pro' and lic.paid_until is not null and lic.paid_until > now() then
    upgrade := true; bonus := ceil(extract(epoch from (lic.paid_until - now())) / 86400.0 / 2.0)::int; start_at := now();
  else
    start_at := greatest(now(), coalesce(lic.paid_until, now()));
  end if;
  end_at := public._add_period(start_at, per) + make_interval(days => bonus);
  update public.payments set period_start = start_at, period_end = end_at, bonus_days = bonus where id = pay_id;
  update public.licences set paid_tier = tier, paid_until = end_at, paid_period = per, paid_method = meth, ended_at = null where key = k;
  if p_source = 'order' then update public.sub_orders set status = 'paid', paid_kobo = p_paid_kobo, channel = p_channel, paid_at = now() where reference = p_reference; end if;
  perform public._log('applied', p_reference, jsonb_build_object('key', k, 'tier', tier, 'period', per, 'until', end_at, 'bonus_days', bonus, 'upgrade', upgrade));
  return json_build_object('ok', true, 'tier', tier, 'period', per, 'paid_until', end_at, 'bonus_days', bonus);
end; $$;

-- apply_refund: Paystack confirmed a refund. Take that payment's time away; no grace days.
create or replace function public.apply_refund(p_reference text) returns json language plpgsql security definer set search_path = public as $$
declare p public.payments; lic public.licences; later_exists boolean;
begin
  select * into p from public.payments where reference = p_reference for update;
  if not found then perform public._log('refund_unknown', p_reference, null); return json_build_object('ok', false, 'reason', 'unknown'); end if;
  if p.refunded_at is not null then return json_build_object('ok', true, 'already', true); end if;
  update public.payments set refunded_at = now() where id = p.id;
  select * into lic from public.licences where key = p.licence_key for update;
  -- only the newest payment can be rolled back cleanly; an older one just stops counting (the plan keeps its date)
  select exists (select 1 from public.payments where licence_key = p.licence_key and refunded_at is null and id > p.id) into later_exists;
  if not later_exists then
    if p.prev_paid_until is not null and p.prev_paid_until > now() and p.prev_tier is not null then
      update public.licences set paid_tier = p.prev_tier, paid_until = p.prev_paid_until, paid_period = p.prev_period, paid_method = p.prev_method where key = p.licence_key;
    else
      update public.licences set paid_tier = null, paid_until = null, paid_period = null, paid_method = null, ended_at = now() where key = p.licence_key;
    end if;
  end if;
  perform public._log('refunded', p_reference, jsonb_build_object('key', p.licence_key, 'rolled_back', not later_exists));
  return json_build_object('ok', true, 'rolled_back', not later_exists);
end; $$;

create or replace function public.save_subscription(p_licence_key text, p_customer_code text, p_subscription_code text, p_email_token text, p_plan_code text, p_tier text, p_period text, p_next timestamptz default null) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.subscriptions (licence_key, customer_code, subscription_code, email_token, plan_code, tier, period, status, next_payment, updated_at)
  values (upper(trim(p_licence_key)), p_customer_code, p_subscription_code, p_email_token, p_plan_code, p_tier, p_period, 'active', p_next, now())
  on conflict (licence_key) do update set customer_code = coalesce(excluded.customer_code, public.subscriptions.customer_code),
    subscription_code = coalesce(excluded.subscription_code, public.subscriptions.subscription_code),
    email_token = coalesce(excluded.email_token, public.subscriptions.email_token),
    plan_code = coalesce(excluded.plan_code, public.subscriptions.plan_code),
    tier = coalesce(excluded.tier, public.subscriptions.tier), period = coalesce(excluded.period, public.subscriptions.period),
    status = 'active', next_payment = coalesce(excluded.next_payment, public.subscriptions.next_payment), updated_at = now();
end; $$;
create or replace function public.mark_subscription(p_subscription_code text, p_status text, p_next timestamptz default null) returns json language plpgsql security definer set search_path = public as $$
declare k text; lic public.licences; em text; nm text;
begin
  update public.subscriptions set status = p_status, next_payment = coalesce(p_next, next_payment), updated_at = now() where subscription_code = p_subscription_code returning licence_key into k;
  -- a card payment that did not go through: tell the owner of the account (once a day at most)
  if k is not null and p_status = 'attention' then
    select * into lic from public.licences where key = k;
    select email into em from auth.users where id = lic.user_id;
    if em is not null and lic.paid_until is not null then
      nm := case lic.paid_tier when 'pro' then 'Pro' else 'Starter' end;
      perform public.queue_mail(em, 'We could not renew your Aurum plan',
        'Your card payment for ' || nm || ' did not go through. Your plan keeps working until ' || to_char((lic.paid_until + interval '7 days') at time zone 'Africa/Lagos', 'FMDD FMMonth YYYY') || '. To keep it, open Aurum and tap "Pay now". You can pay by card, transfer or USSD.',
        'renewal_failed', k || ':' || (now() at time zone 'Africa/Lagos')::date);
    end if;
  end if;
  return json_build_object('ok', k is not null, 'licence_key', k);
end; $$;
create or replace function public.subscription_of(p_key text) returns json language sql stable security definer set search_path = public as $$
  select coalesce((select json_build_object('code', subscription_code, 'token', email_token, 'status', status, 'tier', tier, 'period', period) from public.subscriptions where licence_key = upper(trim(coalesce(p_key, '')))), 'null'::json);
$$;
create or replace function public.log_billing(p_kind text, p_reference text, p_detail jsonb default null) returns void language sql security definer set search_path = public as $$
  insert into public.billing_log (kind, reference, detail) values (left(p_kind, 40), left(p_reference, 80), p_detail);
$$;
create or replace function public.queue_mail(p_to text, p_subject text, p_body text, p_kind text, p_ref text) returns void language sql security definer set search_path = public as $$
  insert into public.mail_queue (to_email, subject, body, kind, ref) values (p_to, p_subject, p_body, p_kind, p_ref) on conflict (kind, ref) do nothing;
$$;
create or replace function public.mail_take(p_limit int default 20) returns json language plpgsql security definer set search_path = public as $$
declare rows json;
begin
  select coalesce(json_agg(x), '[]'::json) into rows from (select id, to_email, subject, body from public.mail_queue where sent_at is null and tries < 5 order by id limit greatest(1, least(p_limit, 50)) for update skip locked) x;
  update public.mail_queue set tries = tries + 1 where id in (select (e->>'id')::bigint from json_array_elements(rows) e);
  return rows;
end; $$;
create or replace function public.mail_done(p_id bigint, p_error text default null) returns void language sql security definer set search_path = public as $$
  update public.mail_queue set sent_at = case when p_error is null then now() else null end, last_error = left(p_error, 300) where id = p_id;
$$;
revoke all on function public.licence_of_user(uuid), public.is_admin_user(uuid), public.sub_order_for_verify(text), public.licence_for_customer(text), public.licence_for_email(text),
  public.price_codes(text), public.set_price_code(text, text, text, text), public.price_for(text, text),
  public.apply_payment(text, bigint, text, text, text, text, text, text, text), public.apply_refund(text),
  public.save_subscription(text, text, text, text, text, text, text, timestamptz), public.mark_subscription(text, text, timestamptz), public.subscription_of(text),
  public.log_billing(text, text, jsonb), public.queue_mail(text, text, text, text, text), public.mail_take(int), public.mail_done(bigint, text) from public, anon, authenticated;
grant execute on function public.licence_of_user(uuid), public.is_admin_user(uuid), public.sub_order_for_verify(text), public.licence_for_customer(text), public.licence_for_email(text),
  public.price_codes(text), public.set_price_code(text, text, text, text), public.price_for(text, text),
  public.apply_payment(text, bigint, text, text, text, text, text, text, text), public.apply_refund(text),
  public.save_subscription(text, text, text, text, text, text, text, timestamptz), public.mark_subscription(text, text, timestamptz), public.subscription_of(text),
  public.log_billing(text, text, jsonb), public.queue_mail(text, text, text, text, text), public.mail_take(int), public.mail_done(bigint, text) to service_role;

-- ---------------------------------------------------------------- free_use: documents made without data (plan/07, E3)
-- A phone with no connection counts a PDF or image itself and tells the server later. The server records it even when that
-- takes the month over the limit (nothing is taken back; the person simply has none left until the 1st).
drop function if exists public.free_use(text, text, text, text);
create or replace function public.free_use(p_key text, p_device text, p_doc_id text, p_sig text, p_force boolean default false)
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
  if n >= lim and not coalesce(p_force, false) then return json_build_object('ok', false, 'reason', 'free_limit', 'used', n, 'limit', lim, 'left', 0); end if;
  insert into public.free_use (licence_key, doc_id, sig, month) values (k, p_doc_id, sg, public._free_month()) on conflict do nothing;
  return json_build_object('ok', true, 'plan', lic.plan, 'used', n + 1, 'limit', lim, 'left', greatest(0, lim - n - 1));
end; $$;
revoke all on function public.free_use(text, text, text, text, boolean) from public;
grant execute on function public.free_use(text, text, text, text, boolean) to anon, authenticated;

-- ---------------------------------------------------------------- publish_invoice and view_invoice follow the plan rules
create or replace function public.publish_invoice(p_key text, p_device text, p_doc_id text, p_payload jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare k text := upper(trim(coalesce(p_key, ''))); v_id text; v_name text; v_locked text; v_locked2 text; v_payby date; v_status text;
        r public.plan_rules; enf boolean; v_tmpl text; v_reveal text; pl jsonb := p_payload;
begin
  if not public._licence_ok(p_key, p_device) then return json_build_object('ok', false, 'reason', 'licence'); end if;
  select * into r from public.plan_rules where level = public._level(k);
  enf := public._plans_enforced(k);
  -- a key with a monthly limit can only publish a document it has already counted (counted in any month: sending an old document again is free)
  if r.docs_per_month is not null and not exists (select 1 from public.free_use where licence_key = k and doc_id = p_doc_id) then
    return json_build_object('ok', false, 'reason', 'free_limit');
  end if;
  if octet_length(p_payload::text) > 1500000 then return json_build_object('ok', false, 'reason', 'too_large'); end if;
  -- the design and the opening must be ones this plan includes
  if enf then
    v_tmpl := coalesce(nullif(p_payload->'profile'->'design'->>'template', ''), 'royal');
    v_reveal := coalesce(nullif(p_payload->'doc'->>'reveal', ''), nullif(p_payload->'profile'->'design'->>'reveal', ''), 'envelope');
    if not (v_tmpl = any (r.designs)) then return json_build_object('ok', false, 'reason', 'design_locked'); end if;
    if not (v_reveal = any (r.openings)) then return json_build_object('ok', false, 'reason', 'opening_locked'); end if;
  end if;
  -- one business per workspace; two where the plan allows it
  v_name := lower(regexp_replace(trim(coalesce(p_payload->'profile'->'business'->>'name', '')), '\s+', ' ', 'g'));
  select business_name, business_name_2 into v_locked, v_locked2 from public.licences where key = k;
  if v_locked is null then
    update public.licences set business_name = v_name where key = k;
  elsif v_locked <> v_name then
    if r.businesses >= 2 and v_locked2 is null then
      update public.licences set business_name_2 = v_name where key = k;
    elsif r.businesses >= 2 and v_locked2 = v_name then
      null;
    else
      return json_build_object('ok', false, 'reason', 'business_mismatch');
    end if;
  end if;
  -- the server decides what the client page shows about Aurum's name
  pl := jsonb_set(pl, '{brandless}', to_jsonb(r.branding = 'none'), true);
  pl := jsonb_set(pl, '{free}', to_jsonb(r.branding = 'line'), true);
  begin v_payby := nullif(p_payload->'doc'->>'payBy', '')::date; exception when others then v_payby := null; end;
  v_status := case when p_payload->'doc'->>'status' in ('paid', 'part', 'unpaid') then p_payload->'doc'->>'status' else 'unpaid' end;
  select id into v_id from public.invoices where licence_key = k and doc_id = p_doc_id;
  if v_id is null then
    loop
      v_id := lower(substr(encode(gen_random_bytes(9), 'hex'), 1, 12));
      exit when not exists (select 1 from public.invoices where id = v_id);
    end loop;
    insert into public.invoices (id, licence_key, doc_id, payload, pay_by, pay_status, branding) values (v_id, k, p_doc_id, pl, v_payby, v_status, r.branding);
  else
    update public.invoices set payload = pl, updated_at = now(), pay_by = v_payby, pay_status = v_status, branding = r.branding, closed_at = null where id = v_id;
  end if;
  return json_build_object('ok', true, 'id', v_id);
end; $$;

create or replace function public.view_invoice(p_id text)
returns json language plpgsql security definer set search_path = public as $$
declare inv public.invoices; lic_active boolean; prev timestamptz; who text; what text;
begin
  select * into inv from public.invoices where id = p_id;
  if not found then return json_build_object('ok', false, 'reason', 'missing'); end if;
  select active into lic_active from public.licences where key = inv.licence_key;
  if not coalesce(lic_active, false) then return json_build_object('ok', false, 'reason', 'unavailable'); end if;
  -- a link whose period is over: only the business name and number are kept, so the client can ask for it again
  if inv.closed_at is not null then return json_build_object('ok', false, 'reason', 'closed', 'stub', inv.payload); end if;
  prev := inv.last_viewed_at;
  update public.invoices set view_count = view_count + 1, last_viewed_at = now(), first_viewed_at = coalesce(first_viewed_at, now()) where id = p_id;
  if prev is null or prev < now() - interval '15 minutes' then
    who := coalesce(nullif(inv.payload->'doc'->'client'->>'name', ''), 'Your client');
    what := coalesce(inv.payload->'doc'->>'number', 'your document');
    perform public._notify(inv.licence_key, case when prev is null then 'Just opened' else 'Opened again' end, who || ' opened ' || what, '/app/', 'open-' || inv.id);
  end if;
  return json_build_object('ok', true, 'payload', inv.payload, 'created_at', inv.created_at, 'branding', inv.branding);
end; $$;

-- phone alerts and the overdue alert go to every plan with the Pro pack (Pro and Prestige), not only Prestige
create or replace function public.save_push(p_key text, p_device text, p_endpoint text, p_p256dh text, p_auth text)
returns json language plpgsql security definer set search_path = public as $$
declare lic public.licences;
begin
  if not public._licence_ok(p_key, p_device) then return json_build_object('ok', false, 'reason', 'licence'); end if;
  select * into lic from public.licences where key = upper(trim(p_key));
  if not coalesce((select pro_pack from public.plan_rules where level = public._level(lic.key)), false) then return json_build_object('ok', false, 'reason', 'plan'); end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1000 or length(coalesce(p_p256dh, '')) > 200 or length(coalesce(p_auth, '')) > 100 then return json_build_object('ok', false, 'reason', 'invalid'); end if;
  insert into public.push_subs (licence_key, device_id, endpoint, p256dh, auth) values (lic.key, p_device, p_endpoint, p_p256dh, p_auth)
  on conflict (licence_key, device_id) do update set endpoint = excluded.endpoint, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
  return json_build_object('ok', true);
end; $$;

create or replace function public.send_overdue_alerts()
returns integer language plpgsql security definer set search_path = public, extensions as $$
declare r record; today date := (now() at time zone 'Africa/Lagos')::date; n int := 0; names text;
begin
  for r in
    select i.licence_key, count(*) as c, string_agg(coalesce(nullif(i.payload->'doc'->'client'->>'name', ''), 'A client') || ' (' || coalesce(i.payload->'doc'->>'number', '') || ')', ', ' order by i.pay_by) as who
    from public.invoices i join public.licences l on l.key = i.licence_key
    where l.active and exists (select 1 from public.plan_rules pr where pr.level = public._level(l.key) and pr.pro_pack)
      and i.pay_status in ('unpaid', 'part') and i.pay_by is not null and i.pay_by < today and i.closed_at is null
      and (i.overdue_notified is null or i.overdue_notified <= today - 3)
      and exists (select 1 from public.push_subs s where s.licence_key = i.licence_key)
    group by i.licence_key
  loop
    names := r.who; if length(names) > 110 then names := left(names, 107) || '...'; end if;
    perform public._notify(r.licence_key, case when r.c = 1 then '1 invoice is overdue' else r.c || ' invoices are overdue' end, names, '/app/', 'overdue-' || today::text);
    update public.invoices set overdue_notified = today where licence_key = r.licence_key and pay_status in ('unpaid', 'part') and pay_by < today;
    n := n + 1;
  end loop;
  return n;
end; $$;

-- ---------------------------------------------------------------- the nightly job (file 07, H4 and J)
create or replace function public.nightly() returns json language plpgsql security definer set search_path = public as $$
declare n_ended int := 0; n_closed int := 0; n_mail int := 0; today date := (now() at time zone 'Africa/Lagos')::date; r record; nm text; until_txt text;
begin
  -- 1. a paid plan that is past its 7 days of grace has ended
  update public.licences set ended_at = paid_until + interval '7 days'
   where paid_tier is not null and paid_until is not null and paid_until + interval '7 days' < now() and ended_at is null;
  get diagnostics n_ended = row_count;
  -- 2. links older than the plan allows close (only where the plan rules apply; never for plans with no limit; a plan that ended keeps them 30 more days)
  update public.invoices i set closed_at = now(),
    payload = jsonb_build_object('v', 2, 'stub', true, 'profile', jsonb_build_object('business', jsonb_build_object('name', i.payload->'profile'->'business'->>'name', 'phone', i.payload->'profile'->'business'->>'phone')))
  from public.licences l join public.plan_rules pr on pr.level = public._level(l.key)
  where i.licence_key = l.key and i.closed_at is null and pr.link_days is not null and public._plans_enforced(l.key)
    and i.updated_at < now() - make_interval(days => pr.link_days)
    and (l.ended_at is null or l.ended_at < now() - interval '30 days');
  get diagnostics n_closed = row_count;
  -- 3. emails for people who pay by transfer: 7 days, 3 days and on the day
  for r in
    select l.key, l.paid_tier, l.paid_until, u.email,
           ((l.paid_until at time zone 'Africa/Lagos')::date - today) as days_left
    from public.licences l join auth.users u on u.id = l.user_id
    where l.paid_method = 'transfer' and l.paid_tier is not null and l.paid_until is not null
      and ((l.paid_until at time zone 'Africa/Lagos')::date - today) in (7, 3, 0)
  loop
    nm := case r.paid_tier when 'pro' then 'Pro' else 'Starter' end;
    until_txt := to_char(r.paid_until at time zone 'Africa/Lagos', 'FMDD FMMonth YYYY');
    perform public.queue_mail(r.email, 'Your Aurum ' || nm || ' plan ends on ' || to_char(r.paid_until at time zone 'Africa/Lagos', 'FMDD FMMon'),
      'Your ' || nm || ' plan ends on ' || until_txt || '. It does not renew by itself. To keep it, open Aurum and tap "Pay now". If you do nothing, your account moves to the free plan and your documents stay safe.',
      'plan_ending', r.key || ':' || (r.paid_until at time zone 'Africa/Lagos')::date || ':' || r.days_left);
    n_mail := n_mail + 1;
  end loop;
  -- 4. a plan that ended in the last day (25 hours, so a plan that ended just before yesterday's run is never missed; the unique mail key stops repeats)
  for r in
    select l.key, l.paid_tier, l.ended_at, u.email from public.licences l join auth.users u on u.id = l.user_id
    where l.ended_at is not null and l.ended_at >= now() - interval '25 hours' and l.paid_tier is not null
  loop
    nm := case r.paid_tier when 'pro' then 'Pro' else 'Starter' end;
    perform public.queue_mail(r.email, 'Your Aurum ' || nm || ' plan has ended',
      'Your ' || nm || ' plan has ended and your account is now on the free plan. Your documents are all still in the app. On the free plan, client links stay open for 60 days, so links older than that will close on ' || to_char((r.ended_at + interval '30 days') at time zone 'Africa/Lagos', 'FMDD FMMonth YYYY') || '. You can renew any time from the app.',
      'plan_ended', r.key || ':' || (r.ended_at at time zone 'Africa/Lagos')::date);
    n_mail := n_mail + 1;
  end loop;
  perform public._log('nightly', null, jsonb_build_object('ended', n_ended, 'closed', n_closed, 'mails', n_mail));
  return json_build_object('ended', n_ended, 'closed', n_closed, 'mails', n_mail);
end; $$;
revoke all on function public.nightly() from public, anon, authenticated;

-- ---------------------------------------------------------------- useful commands for you (run by hand when needed)
-- Let yourself in as an owner (after you have created your account in the app):
--   insert into admins select id from auth.users where email = 'YOUR EMAIL HERE' on conflict do nothing;
-- Try payments with test money (only accounts in `admins` can pay):   update app_config set value = 'test' where key = 'subs_mode';
-- Launch day:                                                          update app_config set value = 'live' where key = 'subs_mode';
--                                                                      update app_config set value = 'on'   where key = 'plans_enforced';
-- What the payment functions have been doing:                          select * from billing_log order by id desc limit 50;
