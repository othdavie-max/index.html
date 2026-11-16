-- Aurum Build 5: scheduled reminders (plan/10 part A).
-- Pro and Prestige owners choose reminder days (counted from the pay-by date: -3 = three days before, 0 = on the day, 3 = three days after).
-- Every morning the server sends the owner ONE phone alert listing the reminders to send, and (if switched on and safe) emails the client.
-- Safe to run more than once.

alter table public.invoices add column if not exists remind_days int[];
alter table public.invoices add column if not exists remind_email boolean not null default false;
alter table public.mail_queue add column if not exists from_name text;
alter table public.mail_queue add column if not exists reply_to text;
alter table public.mail_queue add column if not exists licence_ref text;

create table if not exists public.reminder_log (
  id bigserial primary key,
  invoice_id text not null,
  day date not null,
  channel text not null,                 -- 'push' now, 'email' now, 'whatsapp' later
  created_at timestamptz not null default now(),
  unique (invoice_id, day, channel)
);
alter table public.reminder_log enable row level security;
revoke all on public.reminder_log from anon, authenticated;

-- the schedule travels with the invoice when it is published
create or replace function public.publish_invoice(p_key text, p_device text, p_doc_id text, p_payload jsonb)
 returns json language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare k text := upper(trim(coalesce(p_key, ''))); v_id text; v_name text; v_locked text; v_locked2 text; v_payby date; v_status text;
        r public.plan_rules; enf boolean; v_tmpl text; v_reveal text; pl jsonb := p_payload; v_days int[]; v_email boolean := false;
begin
  if not public._licence_ok(p_key, p_device) then return json_build_object('ok', false, 'reason', 'licence'); end if;
  select * into r from public.plan_rules where level = public._level(k);
  enf := public._plans_enforced(k);
  if r.docs_per_month is not null and not exists (select 1 from public.free_use where licence_key = k and doc_id = p_doc_id) then
    return json_build_object('ok', false, 'reason', 'free_limit');
  end if;
  if octet_length(p_payload::text) > 1500000 then return json_build_object('ok', false, 'reason', 'too_large'); end if;
  if enf then
    v_tmpl := coalesce(nullif(p_payload->'profile'->'design'->>'template', ''), 'royal');
    v_reveal := coalesce(nullif(p_payload->'doc'->>'reveal', ''), nullif(p_payload->'profile'->'design'->>'reveal', ''), 'envelope');
    if not (v_tmpl = any (r.designs)) then return json_build_object('ok', false, 'reason', 'design_locked'); end if;
    if not (v_reveal = any (r.openings)) then return json_build_object('ok', false, 'reason', 'opening_locked'); end if;
  end if;
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
  pl := jsonb_set(pl, '{brandless}', to_jsonb(r.branding = 'none'), true);
  pl := jsonb_set(pl, '{free}', to_jsonb(r.branding = 'line'), true);
  begin v_payby := nullif(p_payload->'doc'->>'payBy', '')::date; exception when others then v_payby := null; end;
  v_status := case when p_payload->'doc'->>'status' in ('paid', 'part', 'unpaid') then p_payload->'doc'->>'status' else 'unpaid' end;
  -- reminders: only on plans that include them, at most 7 days, each between 30 days before and 60 days after
  if coalesce(r.pro_pack, false) and jsonb_typeof(p_payload->'doc'->'reminders'->'days') = 'array' then
    select array_agg(d order by d) into v_days from (select distinct (x)::int as d from jsonb_array_elements_text(p_payload->'doc'->'reminders'->'days') x where x ~ '^-?[0-9]{1,2}$' limit 7) q where d between -30 and 60;
    begin v_email := coalesce((p_payload->'doc'->'reminders'->>'email')::boolean, false); exception when others then v_email := false; end;
  end if;
  select id into v_id from public.invoices where licence_key = k and doc_id = p_doc_id;
  if v_id is null then
    loop
      v_id := lower(substr(encode(gen_random_bytes(9), 'hex'), 1, 12));
      exit when not exists (select 1 from public.invoices where id = v_id);
    end loop;
    insert into public.invoices (id, licence_key, doc_id, payload, pay_by, pay_status, branding, remind_days, remind_email) values (v_id, k, p_doc_id, pl, v_payby, v_status, r.branding, v_days, coalesce(v_email, false));
  else
    update public.invoices set payload = pl, updated_at = now(), pay_by = v_payby, pay_status = v_status, branding = r.branding, closed_at = null, remind_days = v_days, remind_email = coalesce(v_email, false) where id = v_id;
  end if;
  return json_build_object('ok', true, 'id', v_id);
end; $function$;

-- the mail sender now also gets the display name and the Reply-To
create or replace function public.mail_take(p_limit integer default 20)
 returns json language plpgsql security definer set search_path to 'public' as $function$
declare rows json;
begin
  select coalesce(json_agg(x), '[]'::json) into rows from (select id, to_email, subject, body, from_name, reply_to from public.mail_queue where sent_at is null and tries < 5 order by id limit greatest(1, least(p_limit, 50)) for update skip locked) x;
  update public.mail_queue set tries = tries + 1 where id in (select (e->>'id')::bigint from json_array_elements(rows) e);
  return rows;
end; $function$;

-- invoices that have their own schedule are left out of the general "overdue" alert, so the owner is not told twice
create or replace function public.send_overdue_alerts()
 returns integer language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare r record; today date := (now() at time zone 'Africa/Lagos')::date; n int := 0; names text;
begin
  for r in
    select i.licence_key, count(*) as c, string_agg(coalesce(nullif(i.payload->'doc'->'client'->>'name', ''), 'A client') || ' (' || coalesce(i.payload->'doc'->>'number', '') || ')', ', ' order by i.pay_by) as who
    from public.invoices i join public.licences l on l.key = i.licence_key
    where l.active and exists (select 1 from public.plan_rules pr where pr.level = public._level(l.key) and pr.pro_pack)
      and i.pay_status in ('unpaid', 'part') and i.pay_by is not null and i.pay_by < today and i.closed_at is null
      and i.remind_days is null
      and (i.overdue_notified is null or i.overdue_notified <= today - 3)
      and exists (select 1 from public.push_subs s where s.licence_key = i.licence_key)
    group by i.licence_key
  loop
    names := r.who; if length(names) > 110 then names := left(names, 107) || '...'; end if;
    perform public._notify(r.licence_key, case when r.c = 1 then '1 invoice is overdue' else r.c || ' invoices are overdue' end, names, '/app/', 'overdue-' || today::text);
    update public.invoices set overdue_notified = today where licence_key = r.licence_key and pay_status in ('unpaid', 'part') and pay_by < today and remind_days is null;
    n := n + 1;
  end loop;
  return n;
end; $function$;

-- the morning job for reminders
create or replace function public.send_reminders() returns json language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare today date := (now() at time zone 'Africa/Lagos')::date; r record; n_push int := 0; n_mail int := 0; one text; ttl text; body text; mail_today int;
        who text; num text; v_off int; biz text; amt text; subj text; lead text; link text; phone text;
begin
  select count(*) into mail_today from public.mail_queue where kind = 'reminder' and created_at >= today::timestamp at time zone 'Africa/Lagos';
  create temp table _due on commit drop as
    select i.id, i.licence_key, i.payload, i.remind_email, i.first_viewed_at, i.paid_claimed_at, (today - i.pay_by) as off
    from public.invoices i join public.licences l on l.key = i.licence_key
    where l.active and exists (select 1 from public.plan_rules pr where pr.level = public._level(l.key) and pr.pro_pack)
      and i.remind_days is not null and i.pay_by is not null and i.pay_status in ('unpaid', 'part') and i.closed_at is null
      and i.paid_claimed_at is null and (today - i.pay_by) = any (i.remind_days)
      and not exists (select 1 from public.reminder_log g where g.invoice_id = i.id and g.day = today and g.channel = 'push');
  -- 1. one phone alert per owner
  for r in select licence_key, count(*) as c, string_agg(coalesce(nullif(payload->'doc'->'client'->>'name', ''), 'A client'), ', ') as names, min(id) as one_id from _due group by licence_key
  loop
    if r.c = 1 then
      select coalesce(nullif(payload->'doc'->'client'->>'name', ''), 'Your client'), coalesce(payload->'doc'->>'number', ''), _due.off into who, num, v_off from _due where id = r.one_id;
      ttl := 'Reminder to send';
      body := who || ' · ' || num || case when v_off < 0 then ' is due in ' || (-v_off) || ' day' || (case when v_off = -1 then '' else 's' end) when v_off = 0 then ' is due today' else ' is ' || v_off || ' day' || (case when v_off = 1 then '' else 's' end) || ' overdue' end || '. Tap to send on WhatsApp.';
    else
      ttl := r.c || ' reminders to send today'; body := left(r.names, 110);
    end if;
    perform public._notify(r.licence_key, ttl, body, '/app/', 'remind-' || today::text);
    insert into public.reminder_log (invoice_id, day, channel) select id, today, 'push' from _due where licence_key = r.licence_key on conflict do nothing;
    n_push := n_push + 1;
  end loop;
  -- 2. the client's email, only when every safeguard is met
  for r in select * from _due where remind_email and first_viewed_at is not null
  loop
    continue when coalesce(r.payload->'doc'->'client'->>'email', '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$';
    continue when (select count(*) from public.reminder_log g where g.invoice_id = r.id and g.channel = 'email') >= 4;
    continue when (select count(*) from public.mail_queue m where m.kind = 'reminder' and m.licence_ref = r.licence_key and m.created_at >= today::timestamp at time zone 'Africa/Lagos') >= 30;
    continue when mail_today >= 200;
    biz := coalesce(nullif(r.payload->'profile'->'business'->>'name', ''), 'Your supplier'); num := coalesce(r.payload->'doc'->>'number', '');
    who := coalesce(nullif(r.payload->'doc'->'client'->>'name', ''), 'there'); amt := coalesce(nullif(r.payload->'doc'->'reminders'->>'amount', ''), 'the balance');
    phone := nullif(r.payload->'profile'->'business'->>'phone', '');
    link := 'https://auruminvoice.com.ng/app/invoice.html?i=' || r.id;
    v_off := r.off;
    subj := case when v_off < 0 then 'Reminder: invoice ' || num || ' from ' || biz || ' is due on ' || to_char(today - v_off, 'FMDD FMMon')
                 when v_off = 0 then 'Invoice ' || num || ' from ' || biz || ' is due today'
                 else 'Invoice ' || num || ' from ' || biz || ' is overdue' end;
    lead := case when v_off < 0 then 'is due on ' || to_char(today - v_off, 'FMDD FMMonth YYYY') || '.'
                 when v_off = 0 then 'is due today.'
                 else 'was due on ' || to_char(today - v_off, 'FMDD FMMonth YYYY') || ' and is now overdue.' end;
    insert into public.mail_queue (to_email, subject, body, kind, ref, from_name, reply_to, licence_ref)
    values (r.payload->'doc'->'client'->>'email', subj,
      'Hello ' || who || E',\n\nThis is a reminder from ' || biz || ' that ' || amt || ' on invoice ' || num || ' ' || lead || E'\n\nView the invoice and pay: ' || link ||
      E'\n\nIf you have already paid, thank you. You can let ' || biz || E' know from the same link.\n\n' || biz || coalesce(E'\n' || phone, '') ||
      E'\n\nThis reminder was sent for ' || biz || ' by Aurum Invoice Studio.' || case when nullif(r.payload->'profile'->'business'->>'email', '') is not null then E'\nReply to this email to reach ' || biz || '.' else '' end,
      'reminder', r.id || ':' || today::text, biz || ' via Aurum', nullif(r.payload->'profile'->'business'->>'email', ''), r.licence_key)
    on conflict (kind, ref) do nothing;
    insert into public.reminder_log (invoice_id, day, channel) values (r.id, today, 'email') on conflict do nothing;
    mail_today := mail_today + 1; n_mail := n_mail + 1;
  end loop;
  perform public._log('reminders', null, jsonb_build_object('alerts', n_push, 'emails', n_mail));
  return json_build_object('alerts', n_push, 'emails', n_mail);
end; $$;
revoke all on function public.send_reminders() from public, anon, authenticated;


-- 07:55 Lagos: queue the reminders; the 08:00 job then sends the mail
do $$ begin
  if not exists (select 1 from cron.job where jobname = 'aurum-reminders') then
    perform cron.schedule('aurum-reminders', '55 6 * * *', 'select public.send_reminders()');
  end if;
end $$;
