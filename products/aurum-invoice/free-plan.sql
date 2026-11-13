-- Aurum FREE PLAN: 3 documents a month, tied to a confirmed email. Applied to your live project.
-- Counting happens on the server against the free key, so clearing a browser or changing a VPN does not reset it.

alter table public.licences drop constraint if exists licences_plan_check;
alter table public.licences add constraint licences_plan_check check (plan in ('signature', 'prestige', 'free'));

-- Sign-ups waiting for the email link to be tapped
create table if not exists public.free_signups (
  token text primary key, email text not null, device text, ip_hash text,
  created_at timestamptz not null default now(), used_at timestamptz, licence_key text
);
alter table public.free_signups enable row level security;
create index if not exists free_signups_email_idx on public.free_signups (email, created_at desc);
create index if not exists free_signups_ip_idx on public.free_signups (ip_hash, created_at desc);

-- One row each time a free key sends a NEW document (re-sending the same unchanged document is free)
create table if not exists public.free_use (
  licence_key text not null, doc_id text not null, sig text not null, month text not null, used_at timestamptz not null default now(),
  primary key (licence_key, doc_id, sig)
);
alter table public.free_use enable row level security;
create index if not exists free_use_month_idx on public.free_use (licence_key, month);

create or replace function public._free_month() returns text language sql stable as $$ select to_char(now() at time zone 'Africa/Lagos', 'YYYY-MM') $$;

-- Called only by the free-signup Edge Function (service role)
create or replace function public.create_free_signup(p_email text, p_device text, p_ip_hash text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare em text := lower(trim(coalesce(p_email, ''))); dom text; t text;
begin
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(em) > 120 then return json_build_object('ok', false, 'reason', 'email'); end if;
  dom := split_part(em, '@', 2);
  if dom = any (array['mailinator.com','guerrillamail.com','guerrillamail.net','sharklasers.com','10minutemail.com','tempmail.com','temp-mail.org','yopmail.com','trashmail.com','getnada.com','dispostable.com','maildrop.cc','fakeinbox.com','throwawaymail.com','mailnesia.com','mintemail.com','tempr.email','emailondeck.com']) then
    return json_build_object('ok', false, 'reason', 'disposable');
  end if;
  if p_device is null or length(p_device) < 8 then return json_build_object('ok', false, 'reason', 'device'); end if;
  if (select count(*) from public.free_signups where email = em and created_at > now() - interval '1 day') >= 3 then return json_build_object('ok', false, 'reason', 'email_limit'); end if;
  -- soft limit per network: many phones share one address on mobile data, so this is generous
  if p_ip_hash is not null and (select count(*) from public.free_signups where ip_hash = p_ip_hash and created_at > now() - interval '1 day') >= 8 then return json_build_object('ok', false, 'reason', 'ip_limit'); end if;
  if (select count(*) from public.free_signups where device = p_device and created_at > now() - interval '1 day') >= 3 then return json_build_object('ok', false, 'reason', 'device_limit'); end if;
  t := encode(gen_random_bytes(24), 'hex');
  insert into public.free_signups (token, email, device, ip_hash) values (t, em, p_device, p_ip_hash);
  return json_build_object('ok', true, 'token', t, 'email', em);
end; $$;
revoke all on function public.create_free_signup(text, text, text) from public, anon, authenticated;
grant execute on function public.create_free_signup(text, text, text) to service_role;

-- The email link opens the app, which calls this to get the free key
create or replace function public.claim_free(p_token text, p_device text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare s public.free_signups; k text;
begin
  if p_token is null or length(p_token) <> 48 or p_device is null or length(p_device) < 8 then return json_build_object('ok', false, 'reason', 'invalid'); end if;
  select * into s from public.free_signups where token = p_token and created_at > now() - interval '48 hours';
  if not found then return json_build_object('ok', false, 'reason', 'expired'); end if;
  select key into k from public.licences where lower(buyer_email) = s.email and plan = 'free' order by created_at limit 1;  -- one free key per email
  if k is null then
    if exists (select 1 from public.free_signups where device = p_device and licence_key is not null and email <> s.email) then return json_build_object('ok', false, 'reason', 'device_used'); end if;  -- one free key per device
    k := public.new_licence(null, s.email, null, 2, 'free', null);
  end if;
  update public.free_signups set used_at = coalesce(used_at, now()), licence_key = k, device = p_device where token = p_token;
  return json_build_object('ok', true, 'key', k);
end; $$;
revoke all on function public.claim_free(text, text) from public;
grant execute on function public.claim_free(text, text) to anon, authenticated;

create or replace function public.free_status(p_key text, p_device text)
returns json language plpgsql security definer set search_path = public as $$
declare k text := upper(trim(coalesce(p_key, ''))); pl text; n int;
begin
  if not public._licence_ok(k, p_device) then return json_build_object('ok', false, 'reason', 'licence'); end if;
  select plan into pl from public.licences where key = k;
  if pl <> 'free' then return json_build_object('ok', true, 'plan', pl); end if;
  select count(*) into n from public.free_use where licence_key = k and month = public._free_month();
  return json_build_object('ok', true, 'plan', 'free', 'used', n, 'limit', 3, 'left', greatest(0, 3 - n));
end; $$;
revoke all on function public.free_status(text, text) from public;
grant execute on function public.free_status(text, text) to anon, authenticated;

-- Called before a free key sends a document (link, PDF, image or WhatsApp). Paid keys pass straight through.
create or replace function public.free_use(p_key text, p_device text, p_doc_id text, p_sig text)
returns json language plpgsql security definer set search_path = public as $$
declare k text := upper(trim(coalesce(p_key, ''))); pl text; n int; sg text := left(coalesce(p_sig, ''), 80);
begin
  if not public._licence_ok(k, p_device) then return json_build_object('ok', false, 'reason', 'licence'); end if;
  select plan into pl from public.licences where key = k;
  if pl <> 'free' then return json_build_object('ok', true, 'plan', pl); end if;
  if p_doc_id is null or length(p_doc_id) < 3 or length(p_doc_id) > 80 then return json_build_object('ok', false, 'reason', 'doc'); end if;
  perform pg_advisory_xact_lock(hashtext(k));
  select count(*) into n from public.free_use where licence_key = k and month = public._free_month();
  if exists (select 1 from public.free_use where licence_key = k and doc_id = p_doc_id and sig = sg) then
    return json_build_object('ok', true, 'plan', 'free', 'used', n, 'limit', 3, 'left', greatest(0, 3 - n));
  end if;
  if n >= 3 then return json_build_object('ok', false, 'reason', 'free_limit', 'used', n, 'limit', 3, 'left', 0); end if;
  insert into public.free_use (licence_key, doc_id, sig, month) values (k, p_doc_id, sg, public._free_month());
  return json_build_object('ok', true, 'plan', 'free', 'used', n + 1, 'limit', 3, 'left', 2 - n);
end; $$;
revoke all on function public.free_use(text, text, text, text) from public;
grant execute on function public.free_use(text, text, text, text) to anon, authenticated;

-- Private links: a free key can only publish a document it has already counted this month
create or replace function public.publish_invoice(p_key text, p_device text, p_doc_id text, p_payload jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_id text; v_name text; v_locked text; v_locked2 text; v_plan text; v_payby date; v_status text;
begin
  if not public._licence_ok(p_key, p_device) then return json_build_object('ok', false, 'reason', 'licence'); end if;
  if (select plan from public.licences where key = upper(trim(p_key))) = 'free'
     and not exists (select 1 from public.free_use where licence_key = upper(trim(p_key)) and doc_id = p_doc_id and month = public._free_month()) then
    return json_build_object('ok', false, 'reason', 'free_limit');
  end if;
  if octet_length(p_payload::text) > 1500000 then return json_build_object('ok', false, 'reason', 'too_large'); end if;
  -- One licence = one business. Prestige licences may use two.
  v_name := lower(regexp_replace(trim(coalesce(p_payload->'profile'->'business'->>'name', '')), '\s+', ' ', 'g'));
  select business_name, business_name_2, plan into v_locked, v_locked2, v_plan from public.licences where key = upper(trim(p_key));
  if v_locked is null then
    update public.licences set business_name = v_name where key = upper(trim(p_key));
  elsif v_locked <> v_name then
    if v_plan = 'prestige' and v_locked2 is null then
      update public.licences set business_name_2 = v_name where key = upper(trim(p_key));
    elsif v_plan = 'prestige' and v_locked2 = v_name then
      null;
    else
      return json_build_object('ok', false, 'reason', 'business_mismatch');
    end if;
  end if;
  begin v_payby := nullif(p_payload->'doc'->>'payBy', '')::date; exception when others then v_payby := null; end;
  v_status := case when p_payload->'doc'->>'status' in ('paid', 'part', 'unpaid') then p_payload->'doc'->>'status' else 'unpaid' end;
  select id into v_id from public.invoices where licence_key = upper(trim(p_key)) and doc_id = p_doc_id;
  if v_id is null then
    loop
      v_id := lower(substr(encode(gen_random_bytes(9), 'hex'), 1, 12));
      exit when not exists (select 1 from public.invoices where id = v_id);
    end loop;
    insert into public.invoices (id, licence_key, doc_id, payload, pay_by, pay_status) values (v_id, upper(trim(p_key)), p_doc_id, p_payload, v_payby, v_status);
  else
    update public.invoices set payload = p_payload, updated_at = now(), pay_by = v_payby, pay_status = v_status where id = v_id;
  end if;
  return json_build_object('ok', true, 'id', v_id);
end; $$;

-- Free keys do not get a referral code
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
    select count(*) into used from public.licence_devices where licence_key = lic.key;
    if used >= lic.max_devices then return json_build_object('ok', false, 'reason', 'device_limit'); end if;
    insert into public.licence_devices (licence_key, device_id) values (lic.key, p_device);
  end if;
  select count(*) into used from public.licence_devices where licence_key = lic.key;
  if lic.ref_code is null and lic.plan <> 'free' then
    update public.licences set ref_code = 'REF-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6)) where key = lic.key returning ref_code into lic.ref_code;
  end if;
  return json_build_object('ok', true, 'email', lic.buyer_email, 'plan', lic.plan, 'devices_used', used, 'max_devices', lic.max_devices, 'ref_code', lic.ref_code);
end; $$;
