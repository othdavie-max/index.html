-- Aurum Invoice Studio — licence keys locked to devices
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create extension if not exists pgcrypto;

create table if not exists public.licences (
  key          text primary key,
  buyer_name   text,
  buyer_email  text,
  buyer_phone  text,
  max_devices  int  not null default 2,
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
set search_path = public
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
  return json_build_object('ok', true, 'email', lic.buyer_email, 'devices_used', used, 'max_devices', lic.max_devices);
end;
$$;

revoke all on function public.activate_license(text, text) from public;
grant execute on function public.activate_license(text, text) to anon, authenticated;

-- Make a new key for a buyer (run in the SQL editor, never from the app):
--   select public.new_licence('Chioma Eze', 'chioma@example.com', '08031234567');
create or replace function public.new_licence(p_name text, p_email text, p_phone text default null, p_devices int default 2)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare k text;
begin
  loop
    k := 'AUR-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 4)) || '-'
                || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 4)) || '-'
                || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 4));
    exit when not exists (select 1 from public.licences where key = k);
  end loop;
  insert into public.licences (key, buyer_name, buyer_email, buyer_phone, max_devices)
  values (k, p_name, p_email, p_phone, p_devices);
  return k;
end;
$$;
revoke all on function public.new_licence(text, text, text, int) from public, anon, authenticated;

-- Everyday admin (run in the SQL editor):
--   Block a key that was shared:      update licences set active = false where key = 'AUR-XXXX-XXXX-XXXX';
--   Free a buyer's device slots       delete from licence_devices where licence_key = 'AUR-XXXX-XXXX-XXXX';
--   (new phone, cleared browser):
--   See who uses which key:           select l.buyer_name, l.key, count(d.*) devices, max(d.last_seen) last_used
--                                     from licences l left join licence_devices d on d.licence_key = l.key
--                                     group by l.key order by last_used desc nulls last;
