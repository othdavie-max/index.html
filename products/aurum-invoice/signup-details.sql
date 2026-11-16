-- Aurum SIGN-UP DETAILS (Build 2). Run AFTER accounts.sql and admin.sql. Safe to run more than once.
--
-- The create-account form now asks for a name and a phone number as well as the email and password. The app sends the two as
-- sign-up details; account_enter saves them on the account's workspace (licences.buyer_name and buyer_phone) the first time it
-- runs. A Google sign-in carries the person's name but no phone number. Nothing is overwritten once it is set.
-- admin_find (owner dashboard) can now search by name or phone number too, and shows them.

create or replace function public.account_enter(p_device text, p_label text default null)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); em text; lic public.licences; other public.licences; reg json; k text; nm text; ph text;
begin
  if uid is null then return json_build_object('ok', false, 'reason', 'auth'); end if;
  if p_device is null or length(p_device) < 8 then return json_build_object('ok', false, 'reason', 'device'); end if;
  select lower(email),
         nullif(left(trim(coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', '')), 80), ''),
         nullif(left(regexp_replace(coalesce(raw_user_meta_data->>'phone', ''), '[^0-9+]', '', 'g'), 20), '')
    into em, nm, ph from auth.users where id = uid;
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
  -- the details typed on the create-account form (only fills what is still empty)
  if (nm is not null and coalesce(lic.buyer_name, '') = '') or (ph is not null and coalesce(lic.buyer_phone, '') = '') then
    update public.licences set buyer_name = coalesce(nullif(buyer_name, ''), nm), buyer_phone = coalesce(nullif(buyer_phone, ''), ph) where key = lic.key;
  end if;
  reg := public._register_device(lic.key, p_device, p_label);
  if not (reg->>'ok')::boolean then return reg; end if;
  return json_build_object('ok', true, 'key', lic.key, 'email', em, 'plan', lic.plan, 'ref_code', lic.ref_code, 'ent', public._ent(lic.key));
end; $$;

create or replace function public.admin_find(p_q text) returns json language plpgsql security definer set search_path = public as $$
declare q text := lower(trim(coalesce(p_q, ''))); qd text := regexp_replace(lower(trim(coalesce(p_q, ''))), '[^0-9]', '', 'g');
begin
  if not public._is_admin() then return json_build_object('ok', false, 'reason', 'not_admin'); end if;
  if length(q) < 3 then return json_build_object('ok', false, 'reason', 'short'); end if;
  return json_build_object('ok', true, 'items', coalesce((select json_agg(x) from (
    select l.key, l.plan, public._level(l.key) as level, coalesce(u.email, l.buyer_email) as email, l.buyer_name as name, l.buyer_phone as phone,
           u.id is not null as has_account, l.business_name, l.business_name_2,
           l.paid_tier, l.paid_until, l.paid_method, l.active,
           (select coalesce(json_agg(json_build_object('device_id', d.device_id, 'label', coalesce(d.label, 'A phone'), 'last_seen', d.last_seen) order by d.last_seen desc), '[]'::json) from public.licence_devices d where d.licence_key = l.key) as devices
    from public.licences l left join auth.users u on u.id = l.user_id
    where upper(l.key) = upper(q) or lower(coalesce(u.email, '')) like '%' || q || '%' or lower(coalesce(l.buyer_email, '')) like '%' || q || '%'
       or lower(coalesce(l.buyer_name, '')) like '%' || q || '%'
       or (length(qd) >= 6 and regexp_replace(coalesce(l.buyer_phone, ''), '[^0-9]', '', 'g') like '%' || qd || '%')
    order by l.created_at desc limit 10) x), '[]'::json));
end; $$;

revoke all on function public.account_enter(text, text) from public, anon;
grant execute on function public.account_enter(text, text) to authenticated;
revoke all on function public.admin_find(text) from public, anon;
grant execute on function public.admin_find(text) to authenticated;
