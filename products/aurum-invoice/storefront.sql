-- Aurum Build 6 (zip 7a): the storefront, without online payment (plan/10 part B).
-- A Pro or Prestige business shows chosen saved items on auruminvoice.com.ng/s/<handle>. A customer's order becomes a private invoice.
-- Every price is worked out here, on the server. Nothing the browser says about a price is trusted. Safe to run more than once.

create table if not exists public.stores (
  handle text primary key,
  licence_key text not null unique,
  open boolean not null default false,
  about text not null default '',
  whatsapp text not null default '',
  delivery jsonb not null default '[]',
  pickup boolean not null default true,
  lapse_hours int not null default 48,
  profile jsonb not null default '{}',
  full_profile jsonb not null default '{}',
  blank_doc jsonb not null default '{}',
  items jsonb not null default '[]',
  counter int not null default 0,
  handle_changed_at timestamptz,
  updated_at timestamptz not null default now()
);
create table if not exists public.store_orders (
  id text primary key,
  handle text not null,
  licence_key text not null,
  number text not null,
  invoice_id text not null,
  customer jsonb not null,
  total numeric not null,
  state text not null default 'awaiting',
  created_at timestamptz not null default now()
);
create index if not exists store_orders_key on public.store_orders (licence_key, created_at desc);
create table if not exists public.store_reports (id bigserial primary key, handle text, note text, created_at timestamptz not null default now());
alter table public.stores enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_reports enable row level security;

-- the owner saves the store (and the items shown in it)
create or replace function public.store_save(p_key text, p_device text, p_store jsonb) returns json language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare k text := upper(trim(coalesce(p_key, ''))); r public.plan_rules; h text := lower(trim(coalesce(p_store->>'handle', ''))); cur public.stores; it jsonb; d jsonb; n int := 0; clean_items jsonb := '[]'::jsonb; clean_del jsonb := '[]'::jsonb;
  reserved text[] := array['aurum','admin','support','official','paystack','flutterwave','zenith','gtbank','gtb','access','uba','firstbank','opay','palmpay','kuda','moniepoint','store','shop','help','api','app','www','login','signin','free','pricing','guides','reviews','about'];
begin
  if not public._licence_ok(p_key, p_device) then return json_build_object('ok', false, 'reason', 'licence'); end if;
  select * into r from public.plan_rules where level = public._level(k);
  if not coalesce(r.pro_pack, false) then return json_build_object('ok', false, 'reason', 'plan'); end if;
  if octet_length(p_store::text) > 1200000 then return json_build_object('ok', false, 'reason', 'too_large'); end if;
  if h !~ '^[a-z0-9]([a-z0-9-]{1,28})[a-z0-9]$' then return json_build_object('ok', false, 'reason', 'handle_format'); end if;
  if h = any (reserved) or h ~ '(aurum|paystack|official)' then return json_build_object('ok', false, 'reason', 'handle_reserved'); end if;
  if exists (select 1 from public.stores where handle = h and licence_key <> k) then return json_build_object('ok', false, 'reason', 'handle_taken'); end if;
  select * into cur from public.stores where licence_key = k;
  if cur.handle is not null and cur.handle <> h and cur.handle_changed_at is not null and cur.handle_changed_at > now() - interval '60 days' then return json_build_object('ok', false, 'reason', 'handle_cooldown'); end if;
  for it in select * from jsonb_array_elements(coalesce(p_store->'items', '[]'::jsonb)) loop
    exit when n >= 60;
    continue when coalesce(trim(it->>'name'), '') = '' or coalesce(it->>'id', '') = '' or not (case when (it->>'price') ~ '^[0-9]+(\.[0-9]{1,2})?$' then (it->>'price')::numeric > 0 else false end);
    clean_items := clean_items || jsonb_build_array(jsonb_build_object('id', left(it->>'id', 60), 'name', left(trim(it->>'name'), 120), 'price', (it->>'price')::numeric, 'unit', left(coalesce(it->>'unit', ''), 20), 'note', left(coalesce(it->>'note', ''), 200), 'category', left(coalesce(it->>'category', ''), 40), 'storeNote', left(coalesce(it->>'storeNote', ''), 120)));
    n := n + 1;
  end loop;
  n := 0;
  for d in select * from jsonb_array_elements(coalesce(p_store->'delivery', '[]'::jsonb)) loop
    exit when n >= 5;
    continue when coalesce(trim(d->>'name'), '') = '' or not coalesce((d->>'fee') ~ '^[0-9]+(\.[0-9]{1,2})?$', false);
    clean_del := clean_del || jsonb_build_array(jsonb_build_object('name', left(trim(d->>'name'), 40), 'fee', (d->>'fee')::numeric));
    n := n + 1;
  end loop;
  insert into public.stores (handle, licence_key, open, about, whatsapp, delivery, pickup, lapse_hours, profile, full_profile, blank_doc, items, handle_changed_at)
  values (h, k, coalesce((p_store->>'open')::boolean, false), left(coalesce(p_store->>'about', ''), 120), left(regexp_replace(coalesce(p_store->>'whatsapp', ''), '[^0-9+]', '', 'g'), 20), clean_del, coalesce((p_store->>'pickup')::boolean, true),
    case when (p_store->>'lapse_hours') in ('24', '48', '72') then (p_store->>'lapse_hours')::int else 48 end, coalesce(p_store->'profile', '{}'), coalesce(p_store->'full_profile', '{}'), coalesce(p_store->'blank_doc', '{}'), clean_items, case when cur.handle is null then null else now() end)
  on conflict (licence_key) do update set handle = excluded.handle, open = excluded.open, about = excluded.about, whatsapp = excluded.whatsapp, delivery = excluded.delivery, pickup = excluded.pickup, lapse_hours = excluded.lapse_hours,
    profile = excluded.profile, full_profile = excluded.full_profile, blank_doc = excluded.blank_doc, items = excluded.items, updated_at = now(),
    handle_changed_at = case when public.stores.handle <> excluded.handle then now() else public.stores.handle_changed_at end;
  return json_build_object('ok', true, 'handle', h, 'items', jsonb_array_length(clean_items));
end; $$;

-- what a visitor sees (never the bank details)
create or replace function public.store_view(p_handle text) returns json language plpgsql stable security definer set search_path to 'public' as $$
declare s public.stores; ok boolean;
begin
  select * into s from public.stores where handle = lower(trim(coalesce(p_handle, '')));
  if not found then return json_build_object('ok', false, 'reason', 'missing'); end if;
  select (l.active and exists (select 1 from public.plan_rules pr where pr.level = public._level(l.key) and pr.pro_pack)) into ok from public.licences l where l.key = s.licence_key;
  if not s.open or not coalesce(ok, false) then return json_build_object('ok', false, 'reason', 'break', 'whatsapp', s.whatsapp, 'name', s.profile->>'name'); end if;
  return json_build_object('ok', true, 'name', s.profile->>'name', 'tagline', s.profile->>'tagline', 'logo', s.profile->>'logo', 'colour', s.profile->>'colour', 'about', s.about, 'whatsapp', s.whatsapp,
    'delivery', s.delivery, 'pickup', s.pickup, 'items', s.items);
end; $$;

-- a customer places an order: it becomes a private invoice
create or replace function public.store_order(p_handle text, p_name text, p_phone text, p_email text, p_delivery text, p_address text, p_note text, p_lines jsonb, p_trap text default '')
returns json language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare s public.stores; ok boolean; today date := (now() at time zone 'Africa/Lagos')::date; digits text; ln jsonb; item jsonb; q int; sub numeric := 0; fee numeric := 0; items_out jsonb := '[]'::jsonb;
        v_id text; doc jsonb; pl jsonb; num text; oid text; r public.plan_rules; due date; opt jsonb; found_opt boolean := false; cnt int;
begin
  if coalesce(p_trap, '') <> '' then return json_build_object('ok', false, 'reason', 'busy'); end if;
  select * into s from public.stores where handle = lower(trim(coalesce(p_handle, ''))) for update;
  if not found then return json_build_object('ok', false, 'reason', 'missing'); end if;
  select (l.active and exists (select 1 from public.plan_rules pr where pr.level = public._level(l.key) and pr.pro_pack)) into ok from public.licences l where l.key = s.licence_key;
  if not s.open or not coalesce(ok, false) then return json_build_object('ok', false, 'reason', 'break'); end if;
  digits := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if length(trim(coalesce(p_name, ''))) < 2 or length(p_name) > 80 then return json_build_object('ok', false, 'reason', 'name'); end if;
  if length(digits) < 8 or length(digits) > 15 then return json_build_object('ok', false, 'reason', 'phone'); end if;
  if coalesce(p_email, '') <> '' and p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return json_build_object('ok', false, 'reason', 'email'); end if;
  select count(*) into cnt from public.store_orders where handle = s.handle and created_at > now() - interval '1 hour' and customer->>'phone' = digits;
  if cnt >= 5 then return json_build_object('ok', false, 'reason', 'slow_down'); end if;
  select count(*) into cnt from public.store_orders where handle = s.handle and created_at > now() - interval '1 day';
  if cnt >= 100 then return json_build_object('ok', false, 'reason', 'busy'); end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 or jsonb_array_length(p_lines) > 40 then return json_build_object('ok', false, 'reason', 'empty'); end if;
  for ln in select * from jsonb_array_elements(p_lines) loop
    select x into item from jsonb_array_elements(s.items) x where x->>'id' = ln->>'id' limit 1;
    if item is null then return json_build_object('ok', false, 'reason', 'item_gone'); end if;
    begin q := (ln->>'qty')::int; exception when others then q := 0; end;
    if q < 1 or q > 99 then return json_build_object('ok', false, 'reason', 'qty'); end if;
    sub := sub + (item->>'price')::numeric * q;
    items_out := items_out || jsonb_build_array(jsonb_build_object('id', 'si-' || (item->>'id'), 'desc', item->>'name', 'qty', q::text, 'price', (item->>'price')::text, 'note', coalesce(item->>'note', ''), 'unit', coalesce(item->>'unit', '')));
  end loop;
  if lower(coalesce(p_delivery, '')) = 'pickup' then
    if not s.pickup then return json_build_object('ok', false, 'reason', 'delivery'); end if;
  else
    for opt in select * from jsonb_array_elements(s.delivery) loop
      if opt->>'name' = p_delivery then fee := (opt->>'fee')::numeric; found_opt := true; end if;
    end loop;
    if not found_opt then return json_build_object('ok', false, 'reason', 'delivery'); end if;
    if length(trim(coalesce(p_address, ''))) < 5 then return json_build_object('ok', false, 'reason', 'address'); end if;
  end if;
  update public.stores set counter = counter + 1 where handle = s.handle returning counter into cnt;
  num := 'WEB-' || lpad(cnt::text, 4, '0');
  select * into r from public.plan_rules where level = public._level(s.licence_key);
  due := ((now() + make_interval(hours => s.lapse_hours)) at time zone 'Africa/Lagos')::date;
  v_id := lower(substr(encode(gen_random_bytes(9), 'hex'), 1, 12));
  while exists (select 1 from public.invoices where id = v_id) loop v_id := lower(substr(encode(gen_random_bytes(9), 'hex'), 1, 12)); end loop;
  oid := 'so-' || v_id;
  doc := coalesce(s.blank_doc, '{}'::jsonb) || jsonb_build_object('id', 'store-' || v_id, 'type', 'invoice', 'number', num, 'issueDate', today::text, 'dueDate', due::text, 'payBy', due::text, 'status', 'unpaid', 'amountPaid', '',
    'client', jsonb_build_object('name', left(trim(p_name), 80), 'company', '', 'address', left(coalesce(p_address, ''), 200), 'phone', digits, 'email', left(coalesce(p_email, ''), 120)),
    'items', items_out, 'delivery', case when fee > 0 then fee::text else '' end, 'notes', left(coalesce(p_note, ''), 300), 'link', '', 'shareId', '', 'fromStore', true);
  pl := jsonb_build_object('v', 2, 'demo', false, 'brandless', r.branding = 'none', 'free', r.branding = 'line', 'profile', s.full_profile, 'doc', doc);
  insert into public.invoices (id, licence_key, doc_id, payload, pay_by, pay_status, branding) values (v_id, s.licence_key, 'store-' || v_id, pl, due, 'unpaid', r.branding);
  insert into public.store_orders (id, handle, licence_key, number, invoice_id, customer, total) values (oid, s.handle, s.licence_key, num, v_id,
    jsonb_build_object('name', left(trim(p_name), 80), 'phone', digits, 'email', left(coalesce(p_email, ''), 120), 'delivery', p_delivery, 'address', left(coalesce(p_address, ''), 200), 'note', left(coalesce(p_note, ''), 300)), sub + fee);
  perform public._notify(s.licence_key, 'New order', left(trim(p_name), 40) || ' · ₦' || to_char(sub + fee, 'FM999,999,999') || ' · ' || num, '/app/', 'order-' || v_id);
  return json_build_object('ok', true, 'id', v_id, 'number', num);
end; $$;

-- the owner's list of orders and what they do with them
create or replace function public.store_orders_list(p_key text, p_device text) returns json language plpgsql stable security definer set search_path to 'public' as $$
declare k text := upper(trim(coalesce(p_key, '')));
begin
  if not public._licence_ok(p_key, p_device) then return json_build_object('ok', false, 'reason', 'licence'); end if;
  return json_build_object('ok', true, 'orders', coalesce((select json_agg(x order by x.created_at desc) from (
    select o.id, o.number, o.invoice_id, o.customer, o.total, o.state, o.created_at, i.pay_status, (i.paid_claimed_at is not null) as client_says_paid
    from public.store_orders o left join public.invoices i on i.id = o.invoice_id where o.licence_key = k and o.created_at > now() - interval '120 days' order by o.created_at desc limit 100) x), '[]'::json));
end; $$;

create or replace function public.store_order_set(p_key text, p_device text, p_order text, p_state text) returns json language plpgsql security definer set search_path to 'public' as $$
declare k text := upper(trim(coalesce(p_key, ''))); o public.store_orders;
begin
  if not public._licence_ok(p_key, p_device) then return json_build_object('ok', false, 'reason', 'licence'); end if;
  if p_state not in ('paid', 'completed', 'cancelled') then return json_build_object('ok', false, 'reason', 'state'); end if;
  select * into o from public.store_orders where id = p_order and licence_key = k;
  if not found then return json_build_object('ok', false, 'reason', 'missing'); end if;
  update public.store_orders set state = p_state where id = o.id;
  if p_state = 'paid' then
    update public.invoices set pay_status = 'paid', updated_at = now(), payload = jsonb_set(payload, '{doc,status}', '"paid"') where id = o.invoice_id;
  elsif p_state = 'cancelled' then
    update public.invoices set pay_status = 'unpaid', updated_at = now(), payload = jsonb_set(payload, '{doc,dueDate}', to_jsonb(((now() at time zone 'Africa/Lagos')::date - 1)::text)) where id = o.invoice_id;
  end if;
  return json_build_object('ok', true);
end; $$;

create or replace function public.store_report(p_handle text, p_note text) returns json language plpgsql security definer set search_path to 'public' as $$
begin
  if (select count(*) from public.store_reports where handle = lower(coalesce(p_handle, '')) and created_at > now() - interval '1 day') >= 20 then return json_build_object('ok', true); end if;
  insert into public.store_reports (handle, note) values (left(lower(coalesce(p_handle, '')), 40), left(coalesce(p_note, ''), 400));
  return json_build_object('ok', true);
end; $$;
