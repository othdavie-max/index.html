-- Aurum extras: owner dashboard stats and Prestige phone alerts.
-- Run AFTER licences.sql. Replace the two placeholders before running:
--   <ADMIN PASSCODE>   the passcode you type into admin.html
--   <NOTIFY SECRET>    a long random string; also set as the NOTIFY_SECRET secret of the 'notify' function
-- Safe to run again.

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------
-- Visit tracking and owner dashboard
-- ---------------------------------------------------------------
create table if not exists public.events (
  id bigserial primary key, at timestamptz not null default now(), session text not null, type text not null,
  page text, source text, campaign text, referrer text, device text, meta jsonb
);
alter table public.events enable row level security;
create index if not exists events_at_idx on public.events (at desc);
create index if not exists events_session_idx on public.events (session, at desc);

insert into public.app_config (key, value) values ('admin_hash', encode(extensions.digest('<ADMIN PASSCODE>', 'sha256'), 'hex')) on conflict (key) do update set value = excluded.value;

create or replace function public.track(p_session text, p_type text, p_page text default null, p_source text default null, p_campaign text default null, p_referrer text default null, p_device text default null, p_meta jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_session is null or length(p_session) < 8 or length(p_session) > 64 then return; end if;
  if p_type not in ('view','click_buy','click_demo','click_install','checkout_open','checkout_start','purchase','demo_start','key_activated','faq_open','whatsapp_click') then return; end if;
  if (select count(*) from public.events where session = p_session and at > now() - interval '1 hour') > 150 then return; end if;
  insert into public.events (session, type, page, source, campaign, referrer, device, meta)
  values (p_session, p_type, left(p_page, 40), left(lower(p_source), 40), left(p_campaign, 60), left(p_referrer, 120), left(p_device, 20), case when p_meta is null or octet_length(p_meta::text) > 1000 then null else p_meta end);
end; $$;
revoke all on function public.track(text, text, text, text, text, text, text, jsonb) from public;
grant execute on function public.track(text, text, text, text, text, text, text, jsonb) to anon, authenticated;
-- public.admin_stats(passcode, days) is defined in the same way and powers admin.html.
-- (See admin.html for the fields it returns.)

-- ---------------------------------------------------------------
-- Prestige phone alerts (Web Push)
-- Needs the 'notify' Edge Function (functions/notify/index.ts) and these secrets:
--   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, NOTIFY_SECRET
-- ---------------------------------------------------------------
insert into public.app_config (key, value) values ('notify_secret', '<NOTIFY SECRET>'), ('notify_url', 'https://<your-project>.supabase.co/functions/v1/notify') on conflict (key) do update set value = excluded.value;

create table if not exists public.push_subs (
  id bigserial primary key,
  licence_key text not null references public.licences(key) on delete cascade,
  device_id text not null, endpoint text not null, p256dh text not null, auth text not null,
  created_at timestamptz not null default now(), unique (licence_key, device_id)
);
alter table public.push_subs enable row level security;

create or replace function public.save_push(p_key text, p_device text, p_endpoint text, p_p256dh text, p_auth text)
returns json language plpgsql security definer set search_path = public as $$
declare lic public.licences;
begin
  if not public._licence_ok(p_key, p_device) then return json_build_object('ok', false, 'reason', 'licence'); end if;
  select * into lic from public.licences where key = upper(trim(p_key));
  if lic.plan <> 'prestige' then return json_build_object('ok', false, 'reason', 'plan'); end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1000 or length(coalesce(p_p256dh,'')) > 200 or length(coalesce(p_auth,'')) > 100 then return json_build_object('ok', false, 'reason', 'invalid'); end if;
  insert into public.push_subs (licence_key, device_id, endpoint, p256dh, auth) values (lic.key, p_device, p_endpoint, p_p256dh, p_auth)
  on conflict (licence_key, device_id) do update set endpoint = excluded.endpoint, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
  return json_build_object('ok', true);
end; $$;

create or replace function public.remove_push(p_key text, p_device text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public._licence_ok(p_key, p_device) then return json_build_object('ok', false, 'reason', 'licence'); end if;
  delete from public.push_subs where licence_key = upper(trim(p_key)) and device_id = p_device;
  return json_build_object('ok', true);
end; $$;

create or replace function public.has_push(p_key text, p_device text)
returns boolean language sql stable security definer set search_path = public as $$
  select public._licence_ok(p_key, p_device) and exists (select 1 from public.push_subs where licence_key = upper(trim(p_key)) and device_id = p_device);
$$;
revoke all on function public.save_push(text, text, text, text, text), public.remove_push(text, text), public.has_push(text, text) from public;
grant execute on function public.save_push(text, text, text, text, text), public.remove_push(text, text), public.has_push(text, text) to anon, authenticated;

-- Sends an alert to every device of a Prestige licence. Never blocks or breaks the caller.
create or replace function public._notify(p_key text, p_title text, p_body text, p_url text, p_tag text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare sec text; u text;
begin
  if not exists (select 1 from public.push_subs where licence_key = p_key) then return; end if;
  select value into sec from public.app_config where key = 'notify_secret';
  select value into u from public.app_config where key = 'notify_url';
  perform net.http_post(url := u, headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', sec), body := jsonb_build_object('licence_key', p_key, 'title', p_title, 'body', p_body, 'url', p_url, 'tag', p_tag));
exception when others then null;
end; $$;
revoke all on function public._notify(text, text, text, text, text) from public, anon, authenticated;

-- view_invoice and claim_paid call _notify (an alert when a client opens an invoice, at most every 15 minutes
-- per invoice, and when a client says they have paid or accepted a quotation).
create or replace function public.view_invoice(p_id text)
returns json language plpgsql security definer set search_path = public as $$
declare inv public.invoices; lic_active boolean; prev timestamptz; who text; what text;
begin
  select * into inv from public.invoices where id = p_id;
  if not found then return json_build_object('ok', false, 'reason', 'missing'); end if;
  select active into lic_active from public.licences where key = inv.licence_key;
  if not coalesce(lic_active, false) then return json_build_object('ok', false, 'reason', 'unavailable'); end if;
  prev := inv.last_viewed_at;
  update public.invoices set view_count = view_count + 1, last_viewed_at = now(), first_viewed_at = coalesce(first_viewed_at, now()) where id = p_id;
  if prev is null or prev < now() - interval '15 minutes' then
    who := coalesce(nullif(inv.payload->'doc'->'client'->>'name', ''), 'Your client');
    what := coalesce(inv.payload->'doc'->>'number', 'your document');
    perform public._notify(inv.licence_key, case when prev is null then 'Just opened' else 'Opened again' end, who || ' opened ' || what, '/app/', 'open-' || inv.id);
  end if;
  return json_build_object('ok', true, 'payload', inv.payload, 'created_at', inv.created_at);
end; $$;

create or replace function public.claim_paid(p_id text, p_method text default 'transfer', p_ref text default '')
returns json language plpgsql security definer set search_path = public as $$
declare inv public.invoices; who text; what text;
begin
  update public.invoices set paid_claimed_at = now(), paid_method = left(p_method, 20), paid_ref = left(p_ref, 80) where id = p_id returning * into inv;
  if not found then return json_build_object('ok', false); end if;
  who := coalesce(nullif(inv.payload->'doc'->'client'->>'name', ''), 'Your client');
  what := coalesce(inv.payload->'doc'->>'number', 'your invoice');
  perform public._notify(inv.licence_key, case when p_method = 'accept' then 'Quotation accepted' else 'Client says they have paid' end, who || (case when p_method = 'accept' then ' accepted ' else ' says they paid ' end) || what, '/app/', 'paid-' || inv.id);
  return json_build_object('ok', true);
end; $$;
revoke all on function public.view_invoice(text), public.claim_paid(text, text, text) from public;
grant execute on function public.view_invoice(text), public.claim_paid(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------
-- Two businesses on a Prestige licence, and daily overdue alerts
-- ---------------------------------------------------------------
alter table public.licences add column if not exists business_name_2 text;
alter table public.invoices add column if not exists pay_by date;
alter table public.invoices add column if not exists pay_status text not null default 'unpaid';
alter table public.invoices add column if not exists overdue_notified date;

-- publish_invoice: Signature locks one business name; Prestige locks up to two.
create or replace function public.publish_invoice(p_key text, p_device text, p_doc_id text, p_payload jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_id text; v_name text; v_locked text; v_locked2 text; v_plan text; v_payby date; v_status text;
begin
  if not public._licence_ok(p_key, p_device) then return json_build_object('ok', false, 'reason', 'licence'); end if;
  if octet_length(p_payload::text) > 1500000 then return json_build_object('ok', false, 'reason', 'too_large'); end if;
  v_name := lower(regexp_replace(trim(coalesce(p_payload->'profile'->'business'->>'name', '')), '\s+', ' ', 'g'));
  select business_name, business_name_2, plan into v_locked, v_locked2, v_plan from public.licences where key = upper(trim(p_key));
  if v_locked is null then
    update public.licences set business_name = v_name where key = upper(trim(p_key));
  elsif v_locked <> v_name then
    if v_plan = 'prestige' and v_locked2 is null then update public.licences set business_name_2 = v_name where key = upper(trim(p_key));
    elsif v_plan = 'prestige' and v_locked2 = v_name then null;
    else return json_build_object('ok', false, 'reason', 'business_mismatch'); end if;
  end if;
  begin v_payby := nullif(p_payload->'doc'->>'payBy', '')::date; exception when others then v_payby := null; end;
  v_status := case when p_payload->'doc'->>'status' in ('paid', 'part', 'unpaid') then p_payload->'doc'->>'status' else 'unpaid' end;
  select id into v_id from public.invoices where licence_key = upper(trim(p_key)) and doc_id = p_doc_id;
  if v_id is null then
    loop v_id := lower(substr(encode(gen_random_bytes(9), 'hex'), 1, 12)); exit when not exists (select 1 from public.invoices where id = v_id); end loop;
    insert into public.invoices (id, licence_key, doc_id, payload, pay_by, pay_status) values (v_id, upper(trim(p_key)), p_doc_id, p_payload, v_payby, v_status);
  else
    update public.invoices set payload = p_payload, updated_at = now(), pay_by = v_payby, pay_status = v_status where id = v_id;
  end if;
  return json_build_object('ok', true, 'id', v_id);
end; $$;

-- The app tells the server when an invoice is marked paid or its pay-by date changes.
create or replace function public.set_invoice_state(p_key text, p_device text, p_doc_id text, p_status text, p_pay_by text)
returns json language plpgsql security definer set search_path = public as $$
declare d date;
begin
  if not public._licence_ok(p_key, p_device) then return json_build_object('ok', false, 'reason', 'licence'); end if;
  begin d := nullif(p_pay_by, '')::date; exception when others then d := null; end;
  update public.invoices set pay_status = case when p_status in ('paid', 'part', 'unpaid') then p_status else 'unpaid' end, pay_by = d where licence_key = upper(trim(p_key)) and doc_id = p_doc_id;
  return json_build_object('ok', true);
end; $$;
revoke all on function public.publish_invoice(text, text, text, jsonb), public.set_invoice_state(text, text, text, text, text) from public;
grant execute on function public.publish_invoice(text, text, text, jsonb), public.set_invoice_state(text, text, text, text, text) to anon, authenticated;

-- One alert per Prestige business listing its overdue invoices, at most every 3 days. Runs daily at 8am Lagos time.
create or replace function public.send_overdue_alerts()
returns integer language plpgsql security definer set search_path = public, extensions as $$
declare r record; today date := (now() at time zone 'Africa/Lagos')::date; n int := 0; names text;
begin
  for r in
    select i.licence_key, count(*) as c, string_agg(coalesce(nullif(i.payload->'doc'->'client'->>'name', ''), 'A client') || ' (' || coalesce(i.payload->'doc'->>'number', '') || ')', ', ' order by i.pay_by) as who
    from public.invoices i join public.licences l on l.key = i.licence_key
    where l.active and l.plan = 'prestige' and i.pay_status in ('unpaid', 'part') and i.pay_by is not null and i.pay_by < today
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
revoke all on function public.send_overdue_alerts() from public, anon, authenticated;
create extension if not exists pg_cron;
select cron.schedule('aurum-overdue-alerts', '0 7 * * *', 'select public.send_overdue_alerts()');
