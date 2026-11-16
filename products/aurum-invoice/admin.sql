-- Aurum OWNER DASHBOARD functions (Build 2, plan/07 part I). Safe to run more than once. Run AFTER billing.sql.
--
-- These work only for a signed-in account that is listed in `admins` (see the command at the bottom of billing.sql).
-- They replace the passcode versions (admin_stats, admin_reviews, admin_review_set). The old passcode functions are LEFT IN
-- PLACE for now so nothing breaks while you switch over; remove them once you have used the new dashboard (command at the bottom).

-- ---------------------------------------------------------------- the dashboard numbers you already had, for a signed-in owner
create or replace function public.admin_stats_auth(p_days integer default 7)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare since timestamptz; d int := greatest(1, least(coalesce(p_days, 7), 3650)); r json;
begin
  if not public._is_admin() then return json_build_object('ok', false, 'reason', 'not_admin'); end if;
  since := date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos' - make_interval(days => d - 1);
  select json_build_object(
    'ok', true, 'since', since, 'days', d,
    'visitors', (select count(distinct session) from events where type = 'view' and at >= since),
    'views', (select count(*) from events where type = 'view' and at >= since),
    'buy_clicks', (select count(distinct session) from events where type = 'click_buy' and at >= since),
    'demo_clicks', (select count(distinct session) from events where type in ('click_demo','demo_start') and at >= since),
    'checkout_opens', (select count(distinct session) from events where type = 'checkout_open' and at >= since),
    'checkouts_started', (select count(*) from orders where mode = 'live' and created_at >= since),
    'sales', (select count(*) from orders where mode = 'live' and status = 'paid' and paid_at >= since),
    'revenue_naira', (select coalesce(sum(paid_kobo), 0) / 100 from orders where mode = 'live' and status = 'paid' and paid_at >= since),
    'by_plan', (select coalesce(json_agg(x), '[]') from (select plan, count(*) n, sum(paid_kobo)/100 naira from orders where mode = 'live' and status = 'paid' and paid_at >= since group by plan) x),
    'per_day', (select coalesce(json_agg(x order by day), '[]') from (
        select to_char(g, 'YYYY-MM-DD') as day,
          (select count(distinct session) from events e where e.type = 'view' and (e.at at time zone 'Africa/Lagos')::date = g::date) as visitors,
          (select count(*) from orders o where o.mode = 'live' and o.status = 'paid' and (o.paid_at at time zone 'Africa/Lagos')::date = g::date) as sales
        from generate_series((since at time zone 'Africa/Lagos')::date, (now() at time zone 'Africa/Lagos')::date, interval '1 day') g) x),
    'sources', (select coalesce(json_agg(x order by visitors desc), '[]') from (
        select coalesce(nullif(v.source, ''), 'direct') as source, count(distinct v.session) visitors,
          count(distinct b.session) buy_clicks, count(distinct p.session) purchases
        from events v
        left join events b on b.session = v.session and b.type = 'click_buy'
        left join events p on p.session = v.session and p.type = 'purchase'
        where v.type = 'view' and v.at >= since group by 1) x),
    'campaigns', (select coalesce(json_agg(x order by visitors desc), '[]') from (select campaign, count(distinct session) visitors from events where type = 'view' and at >= since and campaign is not null and campaign <> '' group by campaign limit 20) x),
    'devices', (select coalesce(json_agg(x order by visitors desc), '[]') from (select coalesce(device, 'unknown') device, count(distinct session) visitors from events where type = 'view' and at >= since group by 1) x),
    'recent_sales', (select coalesce(json_agg(x), '[]') from (select paid_at, plan, name, email, phone, paid_kobo/100 as naira, licence_key from orders where mode = 'live' and status = 'paid' order by paid_at desc limit 15) x),
    'licences_sold_total', (select count(*) from licences where active and (buyer_email is not null) and buyer_name not like 'TEST %'),
    'activations', (select count(*) from licence_devices where activated_at >= since),
    'active_businesses_7d', (select count(distinct licence_key) from licence_devices where last_seen >= now() - interval '7 days'),
    'invoices_sent', (select count(*) from invoices where created_at >= since),
    'invoices_opened', (select count(*) from invoices where created_at >= since and view_count > 0),
    'client_paid_clicks', (select count(*) from invoices where paid_claimed_at >= since)
  ) into r;
  return r;
end; $$;

-- ---------------------------------------------------------------- plans, money and what needs your attention
create or replace function public.admin_billing_auth() returns json language plpgsql security definer set search_path = public as $$
declare today timestamptz := date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos';
        month_start timestamptz := date_trunc('month', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos';
begin
  if not public._is_admin() then return json_build_object('ok', false, 'reason', 'not_admin'); end if;
  return json_build_object('ok', true,
    'mode', public._subs_mode(), 'plans_enforced', coalesce((select value from public.app_config where key = 'plans_enforced'), 'off'), 'accounts_required', coalesce((select value from public.app_config where key = 'accounts_required'), 'off'),
    'accounts', json_build_object('today', (select count(*) from auth.users where created_at >= today), 'week', (select count(*) from auth.users where created_at >= now() - interval '7 days'), 'total', (select count(*) from auth.users)),
    'levels', (select coalesce(json_object_agg(lv, n), '{}'::json) from (select public._level(key) as lv, count(*) as n from public.licences where active group by 1) x),
    'payments_month', json_build_object(
        'count', (select count(*) from public.payments where mode = 'live' and source in ('order', 'renewal') and refunded_at is null and paid_at >= month_start),
        'kobo', (select coalesce(sum(amount_kobo), 0) from public.payments where mode = 'live' and source in ('order', 'renewal') and refunded_at is null and paid_at >= month_start),
        'refunds', (select count(*) from public.payments where mode = 'live' and refunded_at >= month_start)),
    'failed_renewals', (select coalesce(json_agg(x), '[]'::json) from (select u.email, s.tier, s.period, s.updated_at from public.subscriptions s join public.licences l on l.key = s.licence_key left join auth.users u on u.id = l.user_id where s.status = 'attention' order by s.updated_at desc limit 50) x),
    'ending_soon', (select coalesce(json_agg(x), '[]'::json) from (select u.email, l.paid_tier as tier, l.paid_until, l.paid_method as method from public.licences l left join auth.users u on u.id = l.user_id where l.paid_tier is not null and l.paid_until between now() and now() + interval '7 days' order by l.paid_until limit 50) x),
    'business_requests', (select coalesce(json_agg(x), '[]'::json) from (select id, created_at, name, business, whatsapp, team_size, note from public.business_requests order by created_at desc limit 30) x),
    'delete_requests', (select coalesce(json_agg(x), '[]'::json) from (select d.id, d.created_at, u.email, d.licence_key from public.delete_requests d left join auth.users u on u.id = d.user_id where d.done_at is null order by d.created_at limit 30) x),
    'last_webhook', (select max(at) from public.billing_log where kind like 'webhook:%'),
    'last_nightly', (select max(at) from public.billing_log where kind = 'nightly'),
    'mail_waiting', (select count(*) from public.mail_queue where sent_at is null and tries < 5),
    'mail_failed', (select count(*) from public.mail_queue where sent_at is null and tries >= 5),
    'problems', (select coalesce(json_agg(x), '[]'::json) from (select at, kind, reference, detail from public.billing_log where kind in ('webhook_error', 'webhook_bad_signature', 'init_failed', 'apply_unknown', 'underpaid', 'test_blocked', 'verify_mismatch', 'mode_mismatch', 'billing_error', 'stop_renewal_failed', 'setup_plans_failed', 'old_subscription_disable_failed') order by at desc limit 10) x),
    'db_bytes', pg_database_size(current_database()));
end; $$;

-- ---------------------------------------------------------------- reviews (the same three actions as before, for a signed-in owner)
create or replace function public.admin_reviews_auth() returns json language plpgsql security definer set search_path = public as $$
begin
  if not public._is_admin() then return json_build_object('ok', false, 'reason', 'not_admin'); end if;
  return json_build_object('ok', true, 'items', coalesce((select json_agg(r) from (select id, created_at, name, business, rating, body, status, verified from public.reviews order by (status = 'pending') desc, created_at desc limit 200) r), '[]'::json));
end; $$;
create or replace function public.admin_review_set_auth(p_id bigint, p_status text default null, p_verified boolean default null) returns json language plpgsql security definer set search_path = public as $$
begin
  if not public._is_admin() then return json_build_object('ok', false, 'reason', 'not_admin'); end if;
  if p_status is not null and p_status not in ('pending', 'approved', 'hidden') then return json_build_object('ok', false, 'reason', 'status'); end if;
  update public.reviews set status = coalesce(p_status, status), verified = coalesce(p_verified, verified) where id = p_id;
  return json_build_object('ok', true);
end; $$;

-- ---------------------------------------------------------------- tools for one account
create or replace function public.admin_find(p_q text) returns json language plpgsql security definer set search_path = public as $$
declare q text := lower(trim(coalesce(p_q, '')));
begin
  if not public._is_admin() then return json_build_object('ok', false, 'reason', 'not_admin'); end if;
  if length(q) < 3 then return json_build_object('ok', false, 'reason', 'short'); end if;
  return json_build_object('ok', true, 'items', coalesce((select json_agg(x) from (
    select l.key, l.plan, public._level(l.key) as level, coalesce(u.email, l.buyer_email) as email, u.id is not null as has_account, l.business_name, l.business_name_2,
           l.paid_tier, l.paid_until, l.paid_method, l.active,
           (select coalesce(json_agg(json_build_object('device_id', d.device_id, 'label', coalesce(d.label, 'A phone'), 'last_seen', d.last_seen) order by d.last_seen desc), '[]'::json) from public.licence_devices d where d.licence_key = l.key) as devices
    from public.licences l left join auth.users u on u.id = l.user_id
    where upper(l.key) = upper(q) or lower(coalesce(u.email, '')) like '%' || q || '%' or lower(coalesce(l.buyer_email, '')) like '%' || q || '%'
    order by l.created_at desc limit 10) x), '[]'::json));
end; $$;

-- add time by hand, for someone who paid you directly (it counts as paid by transfer: it does not renew by itself)
create or replace function public.admin_add_time(p_key text, p_tier text, p_period text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare k text := upper(trim(coalesce(p_key, ''))); ref text; r json;
begin
  if not public._is_admin() then return json_build_object('ok', false, 'reason', 'not_admin'); end if;
  if p_tier not in ('starter', 'pro') or p_period not in ('month', 'year') then return json_build_object('ok', false, 'reason', 'plan'); end if;
  if not exists (select 1 from public.licences where key = k) then return json_build_object('ok', false, 'reason', 'unknown'); end if;
  ref := 'ADM-' || upper(encode(gen_random_bytes(8), 'hex'));
  r := public.apply_payment(ref, public.price_for(p_tier, p_period), 'admin', 'renewal', k, p_tier, p_period, 'live');
  if (r->>'ok')::boolean then
    update public.payments set source = 'admin', channel = 'admin' where reference = ref;
    update public.licences set paid_method = 'transfer' where key = k;
    perform public._log('admin_add_time', ref, jsonb_build_object('key', k, 'tier', p_tier, 'period', p_period, 'by', auth.uid()));
  end if;
  return r;
end; $$;
create or replace function public.admin_free_device(p_key text, p_device text) returns json language plpgsql security definer set search_path = public as $$
begin
  if not public._is_admin() then return json_build_object('ok', false, 'reason', 'not_admin'); end if;
  delete from public.licence_devices where licence_key = upper(trim(coalesce(p_key, ''))) and device_id = p_device;
  perform public._log('admin_free_device', upper(trim(coalesce(p_key, ''))), jsonb_build_object('device', left(p_device, 12), 'by', auth.uid()));
  return json_build_object('ok', true);
end; $$;
create or replace function public.admin_unlock_business(p_key text) returns json language plpgsql security definer set search_path = public as $$
begin
  if not public._is_admin() then return json_build_object('ok', false, 'reason', 'not_admin'); end if;
  update public.licences set business_name = null, business_name_2 = null, name_changed_at = null where key = upper(trim(coalesce(p_key, '')));
  perform public._log('admin_unlock_business', upper(trim(coalesce(p_key, ''))), jsonb_build_object('by', auth.uid()));
  return json_build_object('ok', true);
end; $$;
create or replace function public.admin_delete_done(p_id bigint) returns json language plpgsql security definer set search_path = public as $$
begin
  if not public._is_admin() then return json_build_object('ok', false, 'reason', 'not_admin'); end if;
  update public.delete_requests set done_at = now() where id = p_id;
  return json_build_object('ok', true);
end; $$;

revoke all on function public.admin_stats_auth(integer), public.admin_billing_auth(), public.admin_reviews_auth(), public.admin_review_set_auth(bigint, text, boolean),
  public.admin_find(text), public.admin_add_time(text, text, text), public.admin_free_device(text, text), public.admin_unlock_business(text), public.admin_delete_done(bigint) from public, anon;
grant execute on function public.admin_stats_auth(integer), public.admin_billing_auth(), public.admin_reviews_auth(), public.admin_review_set_auth(bigint, text, boolean),
  public.admin_find(text), public.admin_add_time(text, text, text), public.admin_free_device(text, text), public.admin_unlock_business(text), public.admin_delete_done(bigint) to authenticated;

-- ---------------------------------------------------------------- commands for you (run by hand)
-- Make yourself an owner (after you have created your account in the app):
--   insert into admins select id from auth.users where lower(email) = lower('YOUR EMAIL HERE') on conflict do nothing;
-- Once you have used the new dashboard and are happy, remove the old passcode functions and the stored passcode hash:
--   drop function public.admin_stats(text, integer); drop function public.admin_reviews(text); drop function public.admin_review_set(text, bigint, text, boolean);
--   delete from app_config where key = 'admin_hash';
