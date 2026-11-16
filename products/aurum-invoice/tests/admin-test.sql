-- Aurum owner-dashboard test. SAFE: undone at the end (ends with a deliberate error that rolls everything back).
-- Run together with billing.sql and admin.sql in ONE query:  billing.sql, admin.sql, then this file. Made-up people only.
create or replace function pg_temp.t_add(r jsonb, n text, ok boolean, got text) returns jsonb language sql as $$
  select r || jsonb_build_array(jsonb_build_object('t', n, 'ok', coalesce(ok, false), 'got', left(coalesce(got, 'null'), 200)))
$$;
do $test$
declare
  res jsonb := '[]'::jsonb; ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); kA text; kB text; r json; n int; fails int; pu timestamptz;
begin
  insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
    (ua, 'authenticated', 'authenticated', 'owner@test.aurum.invalid', now(), now(), now(), '{}', '{}'),
    (ub, 'authenticated', 'authenticated', 'cust@test.aurum.invalid', now(), now(), now(), '{}', '{}');
  insert into public.admins (user_id) values (ua);
  perform set_config('request.jwt.claims', json_build_object('sub', ua::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.account_enter('device-owner001', 'Owner phone'); reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ub::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.account_enter('device-cust0001', 'Customer phone'); reset role; kB := r->>'key';
  update public.licences set business_name = 'cust shop', business_name_2 = 'cust shop 2' where key = kB;

  -- an ordinary account gets nothing
  set local role authenticated;
  r := public.admin_stats_auth(7);   res := pg_temp.t_add(res, '01 a customer cannot read the dashboard numbers', r->>'reason' = 'not_admin', r::text);
  r := public.admin_billing_auth();  res := pg_temp.t_add(res, '02 nor the billing overview', r->>'reason' = 'not_admin', r::text);
  r := public.admin_reviews_auth();  res := pg_temp.t_add(res, '03 nor the reviews', r->>'reason' = 'not_admin', r::text);
  r := public.admin_find('cust');    res := pg_temp.t_add(res, '04 nor find other accounts', r->>'reason' = 'not_admin', r::text);
  r := public.admin_add_time(kB, 'pro', 'year'); res := pg_temp.t_add(res, '05 nor give themselves time', r->>'reason' = 'not_admin', r::text);
  r := public.admin_unlock_business(kB); res := pg_temp.t_add(res, '06 nor unlock a business name', r->>'reason' = 'not_admin', r::text);
  reset role;
  select paid_tier into pu from public.licences where key = kB;
  res := pg_temp.t_add(res, '07 and the customer''s plan is still unchanged', pu is null, coalesce(pu::text, 'null'));
  set local role anon;
  begin perform public.admin_billing_auth(); res := pg_temp.t_add(res, '08 a signed-out visitor cannot call it at all', false, 'was allowed');
  exception when others then res := pg_temp.t_add(res, '08 a signed-out visitor cannot call it at all', true, sqlerrm); end;
  reset role;

  -- the owner
  perform set_config('request.jwt.claims', json_build_object('sub', ua::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.admin_stats_auth(7);   res := pg_temp.t_add(res, '09 the owner reads the dashboard numbers', (r->>'ok')::boolean and r->'per_day' is not null and r->'by_plan' is not null, left(r::text, 120));
  r := public.admin_billing_auth();
  res := pg_temp.t_add(res, '10 the billing overview has every part', (r->>'ok')::boolean and r->'accounts' is not null and r->'levels' is not null and r->'payments_month' is not null and r->'failed_renewals' is not null and r->'ending_soon' is not null and r->'business_requests' is not null and r->'delete_requests' is not null and r->>'db_bytes' is not null and r->>'mode' = 'off', left(r::text, 160));
  res := pg_temp.t_add(res, '11 it counts the new accounts', (r->'accounts'->>'total')::int >= 2 and (r->'accounts'->>'today')::int >= 2, (r->'accounts')::text);
  r := public.admin_find('cust@test');
  res := pg_temp.t_add(res, '12 find an account by part of its email', (r->>'ok')::boolean and json_array_length(r->'items') = 1 and r->'items'->0->>'key' = kB and json_array_length(r->'items'->0->'devices') = 1, left(r::text, 200));
  r := public.admin_find(kB);
  res := pg_temp.t_add(res, '13 or by its key', json_array_length(r->'items') = 1, left(r::text, 100));
  r := public.admin_find('x'); res := pg_temp.t_add(res, '14 a one-letter search is refused', r->>'reason' = 'short', r::text);
  r := public.admin_add_time(kB, 'pro', 'year');
  select paid_until into pu from public.licences where key = kB;
  res := pg_temp.t_add(res, '15 add a year of Pro by hand', (r->>'ok')::boolean and (select paid_tier from public.licences where key = kB) = 'pro' and pu between now() + interval '364 days' and now() + interval '367 days' and (select paid_method from public.licences where key = kB) = 'transfer', r::text);
  select count(*) into n from public.payments where licence_key = kB and source = 'admin';
  res := pg_temp.t_add(res, '16 it is recorded as an owner payment', n = 1, n::text);
  r := public.admin_billing_auth();
  res := pg_temp.t_add(res, '17 owner-added time is not counted as money received', (r->'payments_month'->>'kobo')::bigint = 0, (r->'payments_month')::text);
  select count(*) into n from public.billing_log where kind = 'admin_add_time';
  res := pg_temp.t_add(res, '18 and written to the log', n = 1, n::text);
  r := public.admin_add_time(kB, 'gold', 'year'); res := pg_temp.t_add(res, '19 a made-up plan is refused', r->>'reason' = 'plan', r::text);
  r := public.admin_add_time('AUR-NOPE-NOPE-NOPE', 'pro', 'year'); res := pg_temp.t_add(res, '20 an unknown key is refused', r->>'reason' = 'unknown', r::text);
  r := public.admin_free_device(kB, 'device-cust0001');
  select count(*) into n from public.licence_devices where licence_key = kB;
  res := pg_temp.t_add(res, '21 free a device', (r->>'ok')::boolean and n = 0, n::text);
  r := public.admin_unlock_business(kB);
  res := pg_temp.t_add(res, '22 unlock the business names', (r->>'ok')::boolean and (select business_name from public.licences where key = kB) is null and (select business_name_2 from public.licences where key = kB) is null, r::text);
  reset role;
  insert into public.delete_requests (user_id, licence_key) values (ub, kB);
  perform public.request_business('sess-12345678', 'Tolu', 'Tolu Ltd', '0803 123 4567', '2 to 5', 'hi', '');
  set local role authenticated;
  r := public.admin_billing_auth();
  res := pg_temp.t_add(res, '23 a delete request and a Business request show up', json_array_length(r->'delete_requests') = 1 and json_array_length(r->'business_requests') >= 1, left((r->'delete_requests')::text, 140));
  r := public.admin_delete_done((r->'delete_requests'->0->>'id')::bigint);
  res := pg_temp.t_add(res, '24 mark a delete request done', (r->>'ok')::boolean and (select count(*) from public.delete_requests where done_at is null) = 0, r::text);
  r := public.admin_reviews_auth(); res := pg_temp.t_add(res, '25 reviews list for the owner', (r->>'ok')::boolean, left(r::text, 80));
  r := public.admin_review_set_auth(-1, 'bogus'); res := pg_temp.t_add(res, '26 a made-up review status is refused', r->>'reason' = 'status', r::text);
  reset role;
  select count(*) into n from public.licences where plan in ('signature', 'prestige') and user_id is null;
  res := pg_temp.t_add(res, '27 the real bought keys were not touched', n >= 200, n::text);
  select count(*) into fails from jsonb_array_elements(res) e where not (e->>'ok')::boolean;
  raise exception 'AURUM_ADMIN_RESULTS failed=% of % :: %', fails, jsonb_array_length(res), res::text;
end
$test$;
