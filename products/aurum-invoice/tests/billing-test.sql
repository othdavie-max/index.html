-- Aurum billing test (Build 2). SAFE: everything is undone at the end (the script ends with an error on purpose, which rolls the
-- whole transaction back). Results are printed inside that error message ("AURUM_BILLING_RESULTS ...").
-- Run it AFTER accounts.sql and billing.sql are installed (or run all three together in ONE query). Made-up people only.

create or replace function pg_temp.t_add(r jsonb, n text, ok boolean, got text) returns jsonb language sql as $$
  select r || jsonb_build_array(jsonb_build_object('t', n, 'ok', coalesce(ok, false), 'got', left(coalesce(got, 'null'), 200)))
$$;

do $test$
declare
  res jsonb := '[]'::jsonb;
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid(); ud uuid := gen_random_uuid(); ue uuid := gen_random_uuid();
  kA text; kB text; kC text; kD text; kE text; kSig text; kPre text; kFreeOld text;
  r json; n int; ref1 text; ref2 text; ref3 text; pu timestamptz; pu2 timestamptz; fails int; bonus int; s text;
  pl jsonb := '{"v":2,"free":false,"brandless":false,"profile":{"business":{"name":"Shop One","phone":"0803"},"design":{"template":"royal"}},"doc":{"number":"INV-1","reveal":"envelope","client":{"name":"Ada"},"status":"unpaid"}}'::jsonb;
begin
  insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
    (ua, 'authenticated', 'authenticated', 'a@test.aurum.invalid', now(), now(), now(), '{}', '{}'),
    (ub, 'authenticated', 'authenticated', 'b@test.aurum.invalid', now(), now(), now(), '{}', '{}'),
    (uc, 'authenticated', 'authenticated', 'c@test.aurum.invalid', now(), now(), now(), '{}', '{}'),
    (ud, 'authenticated', 'authenticated', 'd@test.aurum.invalid', now(), now(), now(), '{}', '{}'),
    (ue, 'authenticated', 'authenticated', 'e@test.aurum.invalid', now(), now(), now(), '{}', '{}');
  insert into public.admins (user_id) values (ua);                       -- A is an owner; the rest are ordinary people
  kSig := public.new_licence('Legacy Sig', null, null, 2, 'signature', null);
  kPre := public.new_licence('Legacy Pre', null, null, 5, 'prestige', null);
  kFreeOld := public.new_licence(null, 'old@test.aurum.invalid', null, 2, 'free', null);
  -- workspaces for A, B, C, D, E through the real sign-in function
  perform set_config('request.jwt.claims', json_build_object('sub', ua::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.account_enter('device-aaaa0001', 'A'); reset role; kA := r->>'key';
  perform set_config('request.jwt.claims', json_build_object('sub', ub::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.account_enter('device-bbbb0001', 'B'); reset role; kB := r->>'key';
  perform set_config('request.jwt.claims', json_build_object('sub', uc::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.account_enter('device-cccc0001', 'C'); reset role; kC := r->>'key';
  perform set_config('request.jwt.claims', json_build_object('sub', ud::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.account_enter('device-dddd0001', 'D'); reset role; kD := r->>'key';
  perform set_config('request.jwt.claims', json_build_object('sub', ue::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.account_enter('device-eeee0001', 'E'); reset role; kE := r->>'key';

  -- 1. prices and the switch
  set local role anon; r := public.plan_prices(); reset role;
  res := pg_temp.t_add(res, '01 prices are public: Starter 3,000 / 30,000 and Pro 6,000 / 60,000', r->>'mode' = 'off' and json_array_length(r->'prices') = 4 and (select count(*) from json_array_elements(r->'prices') e where (e->>'tier' = 'starter' and e->>'period' = 'month' and (e->>'amount_kobo')::bigint = 300000) or (e->>'tier' = 'starter' and e->>'period' = 'year' and (e->>'amount_kobo')::bigint = 3000000) or (e->>'tier' = 'pro' and e->>'period' = 'month' and (e->>'amount_kobo')::bigint = 600000) or (e->>'tier' = 'pro' and e->>'period' = 'year' and (e->>'amount_kobo')::bigint = 6000000)) = 4, r::text);
  perform set_config('request.jwt.claims', json_build_object('sub', ua::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.create_sub_order('pro', 'month', 'card'); reset role;
  res := pg_temp.t_add(res, '02 with the switch off nobody can pay (even an owner)', r->>'reason' = 'off', r::text);
  update public.app_config set value = 'test' where key = 'subs_mode';
  perform set_config('request.jwt.claims', json_build_object('sub', ub::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.create_sub_order('pro', 'month', 'card'); reset role;
  res := pg_temp.t_add(res, '03 test mode: an ordinary account cannot pay', r->>'reason' = 'admin_only', r::text);
  perform set_config('request.jwt.claims', json_build_object('sub', ua::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.create_sub_order('pro', 'year', 'transfer'); reset role;
  ref1 := r->>'reference';
  res := pg_temp.t_add(res, '04 test mode: an owner can; reference looks right; amount from the table', (r->>'ok')::boolean and ref1 ~ '^AUS-[A-Z0-9]{20}$' and (r->>'amount_kobo')::bigint = 6000000, r::text);

  -- 2. applying a payment
  r := public.apply_payment(ref1, 5999999, 'bank_transfer');
  res := pg_temp.t_add(res, '05 paying less than the price grants nothing', r->>'reason' = 'underpaid' and (select status from public.sub_orders where reference = ref1) = 'underpaid', r::text);
  select paid_tier into s from public.licences where key = kA;
  res := pg_temp.t_add(res, '06 and the plan did not change', s is null, coalesce(s, 'null'));
  r := public.apply_payment(ref1, 6000000, 'bank_transfer');
  select paid_until into pu from public.licences where key = kA;
  res := pg_temp.t_add(res, '07 the full price grants Pro for a year', (r->>'ok')::boolean and (select paid_tier from public.licences where key = kA) = 'pro' and pu between now() + interval '364 days' and now() + interval '367 days' and (select paid_method from public.licences where key = kA) = 'transfer', r::text);
  r := public.apply_payment(ref1, 6000000, 'bank_transfer');
  select paid_until into pu2 from public.licences where key = kA;
  select count(*) into n from public.payments where reference = ref1;
  res := pg_temp.t_add(res, '08 the same payment again changes nothing (once per reference)', (r->>'already')::boolean and pu2 = pu and n = 1, r::text);
  r := public._ent(kA)::json;
  res := pg_temp.t_add(res, '09 the plan details now say Pro, active, transfer, does not renew', r->>'tier' = 'pro' and r->>'status' = 'active' and r->>'method' = 'transfer' and not (r->>'renews')::boolean and r->>'docs_limit' is null and r->>'branding' = 'none', r::text);
  perform set_config('request.jwt.claims', json_build_object('sub', ua::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.create_sub_order('starter', 'month', 'card'); reset role;
  res := pg_temp.t_add(res, '10 someone on Pro cannot buy Starter mid-period', r->>'reason' = 'downgrade', r::text);
  set local role authenticated; r := public.create_sub_order('pro', 'month', 'transfer'); reset role; ref2 := r->>'reference';
  r := public.apply_payment(ref2, 600000, 'bank_transfer');
  select paid_until into pu2 from public.licences where key = kA;
  res := pg_temp.t_add(res, '11 buying Pro again adds a month after the date already paid for', (r->>'ok')::boolean and abs(extract(epoch from (pu2 - public._add_period(pu, 'month')))) < 5, pu::text || ' -> ' || pu2::text);

  -- 3. Starter, then upgrade (the half-days rule)
  update public.app_config set value = 'live' where key = 'subs_mode';
  perform set_config('request.jwt.claims', json_build_object('sub', ub::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.create_sub_order('starter', 'month', 'card'); reset role; ref1 := r->>'reference';
  r := public.apply_payment(ref1, 300000, 'card');
  select paid_until into pu from public.licences where key = kB;
  res := pg_temp.t_add(res, '12 live mode: an ordinary account pays for Starter, one month', (r->>'ok')::boolean and (select paid_tier from public.licences where key = kB) = 'starter' and pu between now() + interval '27 days' and now() + interval '32 days' and (select docs_per_month from public.plan_rules where level = public._level(kB)) = 50, r::text);
  set local role authenticated; r := public.plan_quote('pro', 'month'); reset role;
  bonus := (r->>'bonus_days')::int;
  res := pg_temp.t_add(res, '13 the quote for Pro shows half the unused Starter days (rounded up) as a bonus', (r->>'ok')::boolean and bonus = ceil(extract(epoch from (pu - now())) / 86400.0 / 2.0)::int and bonus between 13 and 17, r::text);
  set local role authenticated; r := public.create_sub_order('pro', 'month', 'card'); reset role; ref2 := r->>'reference';
  r := public.apply_payment(ref2, 600000, 'card');
  select paid_until into pu2 from public.licences where key = kB;
  res := pg_temp.t_add(res, '14 upgrading: new Pro month starts now, plus the bonus days', (r->>'ok')::boolean and (select paid_tier from public.licences where key = kB) = 'pro' and abs(extract(epoch from (pu2 - (public._add_period(now(), 'month') + make_interval(days => bonus))))) < 60, pu2::text || ' bonus ' || bonus);

  -- 4. test money can never reach an ordinary account
  update public.app_config set value = 'test' where key = 'subs_mode';
  insert into public.sub_orders (reference, licence_key, user_id, tier, period, method, amount_kobo, mode) values ('AUS-TESTBLOCK0000000001', kC, uc, 'pro', 'month', 'card', 600000, 'test');
  r := public.apply_payment('AUS-TESTBLOCK0000000001', 600000, 'card');
  res := pg_temp.t_add(res, '15 a test-money order for an ordinary account is refused', r->>'reason' = 'test_blocked' and (select paid_tier from public.licences where key = kC) is null, r::text);
  insert into public.sub_orders (reference, licence_key, user_id, tier, period, method, amount_kobo, mode) values ('AUS-LIVENOUSER00000001', kC, uc, 'pro', 'month', 'card', 600000, 'live');
  r := public.apply_payment('AUS-NOSUCHORDER000000001', 600000, 'card');
  res := pg_temp.t_add(res, '16 an unknown reference grants nothing', r->>'reason' = 'unknown', r::text);
  update public.app_config set value = 'live' where key = 'subs_mode';

  -- 5. card renewals
  perform public.save_subscription(kC, 'CUS_test1', 'SUB_test1', 'tok1', 'PLN_test', 'pro', 'month');
  r := public.licence_for_customer('CUS_test1');
  res := pg_temp.t_add(res, '17 a saved card subscription is found by Paystack customer code', r->>'licence_key' = kC and r->>'tier' = 'pro', r::text);
  r := public.apply_payment('RENEW_REF_1', 100, 'card', 'renewal', kC, 'pro', 'month', 'live');
  res := pg_temp.t_add(res, '18 a renewal below the price grants nothing', r->>'reason' = 'underpaid', r::text);
  r := public.apply_payment('RENEW_REF_1', 600000, 'card', 'renewal', kC, 'pro', 'month', 'live');
  res := pg_temp.t_add(res, '19 a renewal at the price adds a month', (r->>'ok')::boolean and (select paid_tier from public.licences where key = kC) = 'pro' and (select paid_until from public.licences where key = kC) between now() + interval '27 days' and now() + interval '32 days', r::text);
  r := public.apply_payment('RENEW_REF_1', 600000, 'card', 'renewal', kC, 'pro', 'month', 'live');
  select count(*) into n from public.payments where reference = 'RENEW_REF_1';
  res := pg_temp.t_add(res, '20 the same renewal again is ignored', (r->>'already')::boolean and n = 1, r::text);
  r := public.mark_subscription('SUB_test1', 'attention');
  res := pg_temp.t_add(res, '21 a failed renewal marks the subscription', (r->>'ok')::boolean and (select status from public.subscriptions where licence_key = kC) = 'attention', r::text);
  r := public._ent(kC)::json;
  res := pg_temp.t_add(res, '22 and the plan details say it does not renew by itself any more', not (r->>'renews')::boolean and r->>'sub_status' = 'attention', r::text);

  -- 6. refunds
  r := public.apply_refund('RENEW_REF_1');
  res := pg_temp.t_add(res, '23 refunding the only payment ends the plan at once (no grace days)', (r->>'ok')::boolean and (select paid_tier from public.licences where key = kC) is null and public._level(kC) = 'free' and (select ended_at from public.licences where key = kC) is not null, r::text);
  r := public.apply_refund('RENEW_REF_1');
  res := pg_temp.t_add(res, '24 refunding twice changes nothing', (r->>'already')::boolean, r::text);
  select paid_until into pu from public.licences where key = kB;
  r := public.apply_refund(ref2);
  res := pg_temp.t_add(res, '25 refunding an upgrade puts the earlier Starter plan back', (r->>'ok')::boolean and (select paid_tier from public.licences where key = kB) = 'starter', r::text);

  -- 7. who may buy what
  perform set_config('request.jwt.claims', json_build_object('sub', ud::text, 'role', 'authenticated')::text, true);
  update public.licences set user_id = null where key = kD;   -- D joins a bought key instead
  update public.licences set user_id = ud where key = kSig;
  set local role authenticated; r := public.plan_quote('starter', 'month'); reset role;
  res := pg_temp.t_add(res, '26 a Signature owner does not need Starter', r->>'reason' = 'not_needed', r::text);
  set local role authenticated; r := public.plan_quote('pro', 'year'); reset role;
  res := pg_temp.t_add(res, '27 but can buy Pro', (r->>'ok')::boolean, r::text);
  update public.licences set user_id = null where key = kSig; update public.licences set user_id = ud where key = kD;
  update public.licences set user_id = ue where key = kPre; update public.licences set user_id = null where key = kE;
  perform set_config('request.jwt.claims', json_build_object('sub', ue::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.plan_quote('pro', 'month'); reset role;
  res := pg_temp.t_add(res, '28 a Prestige owner has nothing to buy', r->>'reason' = 'not_needed', r::text);
  update public.licences set user_id = null where key = kPre; update public.licences set user_id = ue where key = kE;

  -- 8. sending (publish_invoice) follows the plan rules
  set local role anon;
  r := public.free_use(kD, 'device-dddd0001', 'doc-d-1', 's1');
  r := public.publish_invoice(kD, 'device-dddd0001', 'doc-d-1', jsonb_set(pl, '{profile,design,template}', '"atelier"'));
  res := pg_temp.t_add(res, '29 a free account cannot send in a design its plan does not include', r->>'reason' = 'design_locked', r::text);
  r := public.publish_invoice(kD, 'device-dddd0001', 'doc-d-1', jsonb_set(pl, '{doc,reveal}', '"gift"'));
  res := pg_temp.t_add(res, '30 nor with an opening it does not include', r->>'reason' = 'opening_locked', r::text);
  r := public.publish_invoice(kD, 'device-dddd0001', 'doc-d-1', pl);
  res := pg_temp.t_add(res, '31 Royal with the envelope is fine', (r->>'ok')::boolean, r::text);
  reset role;
  res := pg_temp.t_add(res, '32 the server stamps the Made-with-Aurum line for Free', (select (payload->>'free')::boolean and not (payload->>'brandless')::boolean and branding = 'line' from public.invoices where licence_key = kD and doc_id = 'doc-d-1'), (select branding from public.invoices where licence_key = kD and doc_id = 'doc-d-1'));
  set local role anon;
  r := public.publish_invoice(kD, 'device-dddd0001', 'doc-never-counted', pl);
  res := pg_temp.t_add(res, '33 a document that was never counted cannot be sent', r->>'reason' = 'free_limit', r::text);
  r := public.publish_invoice(kD, 'device-dddd0001', 'doc-d-1', jsonb_set(pl, '{profile,business,name}', '"Another Shop"'));
  res := pg_temp.t_add(res, '34 a second business name is refused on Free', r->>'reason' = 'business_mismatch', r::text);
  reset role;
  -- Pro account: everything it includes, and two businesses, branding gone
  set local role anon;
  r := public.publish_invoice(kA, 'device-aaaa0001', 'doc-a-1', jsonb_set(jsonb_set(pl, '{profile,design,template}', '"noir"'), '{doc,reveal}', '"gift"'));
  res := pg_temp.t_add(res, '35 a Pro account can send in Noir with the gift box', (r->>'ok')::boolean, r::text);
  r := public.publish_invoice(kA, 'device-aaaa0001', 'doc-a-2', jsonb_set(pl, '{profile,business,name}', '"Shop Two"'));
  res := pg_temp.t_add(res, '36 and use a second business', (r->>'ok')::boolean, r::text);
  r := public.publish_invoice(kA, 'device-aaaa0001', 'doc-a-3', jsonb_set(pl, '{profile,business,name}', '"Shop Three"'));
  res := pg_temp.t_add(res, '37 but not a third', r->>'reason' = 'business_mismatch', r::text);
  reset role;
  res := pg_temp.t_add(res, '38 Pro documents carry no Aurum name', (select (payload->>'brandless')::boolean and not (payload->>'free')::boolean and branding = 'none' from public.invoices where licence_key = kA and doc_id = 'doc-a-1'), '');
  -- old free key: unchanged until the plan rules are switched on for everyone
  set local role anon;
  r := public.activate_license(kFreeOld, 'device-oldfree01'); r := public.free_use(kFreeOld, 'device-oldfree01', 'doc-o-1', 's');
  r := public.publish_invoice(kFreeOld, 'device-oldfree01', 'doc-o-1', jsonb_set(pl, '{profile,design,template}', '"atelier"'));
  res := pg_temp.t_add(res, '39 an old free key still sends in any design (rules not switched on yet)', (r->>'ok')::boolean, r::text);
  reset role;
  update public.app_config set value = 'on' where key = 'plans_enforced';
  set local role anon;
  r := public.publish_invoice(kFreeOld, 'device-oldfree01', 'doc-o-1', jsonb_set(pl, '{profile,design,template}', '"atelier"'));
  res := pg_temp.t_add(res, '40 once switched on, the same old key is held to the plan', r->>'reason' = 'design_locked', r::text);
  r := public.publish_invoice(kFreeOld, 'device-oldfree01', 'doc-o-1', pl);
  res := pg_temp.t_add(res, '41 re-sending a document counted in an earlier month works (it is not counted again)', (r->>'ok')::boolean, r::text);
  reset role;
  update public.app_config set value = 'off' where key = 'plans_enforced';
  set local role anon;
  r := public.activate_license(kSig, 'device-sigdev001'); r := public.publish_invoice(kSig, 'device-sigdev001', 'doc-s-1', jsonb_set(jsonb_set(pl, '{profile,design,template}', '"noir"'), '{doc,reveal}', '"card"'));
  res := pg_temp.t_add(res, '42 a bought Signature key sends exactly as before', (r->>'ok')::boolean, r::text);
  reset role;
  res := pg_temp.t_add(res, '43 Signature documents carry the small Aurum mark (neither line nor removed)', (select not (payload->>'free')::boolean and not (payload->>'brandless')::boolean and branding = 'mark' from public.invoices where licence_key = kSig and doc_id = 'doc-s-1'), '');

  -- 9. closing old links
  update public.invoices set updated_at = now() - interval '70 days' where licence_key = kD and doc_id = 'doc-d-1';
  update public.invoices set updated_at = now() - interval '70 days' where licence_key = kA and doc_id = 'doc-a-1';
  update public.invoices set updated_at = now() - interval '70 days' where licence_key = kFreeOld and doc_id = 'doc-o-1';
  r := public.nightly();
  res := pg_temp.t_add(res, '44 a Free account link older than 60 days closes', (select closed_at is not null from public.invoices where licence_key = kD and doc_id = 'doc-d-1'), r::text);
  res := pg_temp.t_add(res, '45 a Pro account link of the same age stays open', (select closed_at is null from public.invoices where licence_key = kA and doc_id = 'doc-a-1'), '');
  res := pg_temp.t_add(res, '46 an old free key link stays open while the rules are off', (select closed_at is null from public.invoices where licence_key = kFreeOld and doc_id = 'doc-o-1'), '');
  res := pg_temp.t_add(res, '47 a closed link keeps only the business name and number', (select payload->>'stub' = 'true' and payload->'profile'->'business'->>'name' = 'Shop One' and payload->'doc' is null from public.invoices where licence_key = kD and doc_id = 'doc-d-1'), (select payload::text from public.invoices where licence_key = kD and doc_id = 'doc-d-1'));
  set local role anon; r := public.view_invoice((select id from public.invoices where licence_key = kD and doc_id = 'doc-d-1')); reset role;
  res := pg_temp.t_add(res, '48 the client page is told the link has closed, with the stub', r->>'reason' = 'closed' and r->'stub'->'profile'->'business'->>'name' = 'Shop One', r::text);
  set local role anon; r := public.activate_license(kD, 'device-dddd0001'); r := public.free_use(kD, 'device-dddd0001', 'doc-d-1', 's1'); r := public.publish_invoice(kD, 'device-dddd0001', 'doc-d-1', pl); reset role;
  res := pg_temp.t_add(res, '49 sending the document again opens the link again', (r->>'ok')::boolean and (select closed_at is null and payload->'doc' is not null from public.invoices where licence_key = kD and doc_id = 'doc-d-1'), r::text);

  -- 10. nightly emails
  update public.licences set paid_tier = 'starter', paid_until = now() + interval '3 days' + interval '2 hours', paid_method = 'transfer', paid_period = 'month' where key = kE;
  perform public.nightly(); perform public.nightly();
  select count(*) into n from public.mail_queue where to_email = 'e@test.aurum.invalid';
  res := pg_temp.t_add(res, '50 a transfer payer gets one "plan ending" email, even if the job runs twice', n = 1 and (select subject from public.mail_queue where to_email = 'e@test.aurum.invalid') like 'Your Aurum Starter plan ends on%', n::text);
  update public.licences set paid_until = now() - interval '8 days', ended_at = null where key = kE; perform public.nightly();
  res := pg_temp.t_add(res, '51 a plan past its grace days is marked ended, and its owner emailed', (select ended_at is not null from public.licences where key = kE) and exists (select 1 from public.mail_queue where to_email = 'e@test.aurum.invalid' and kind = 'plan_ended'), '');

  -- 11. Business form, payments list, alerts, permissions
  set local role anon;
  r := public.request_business('sess-12345678', 'Tolu', 'Tolu Ltd', '0803 123 4567', '2 to 5', 'hi', 'robot');
  select count(*) into n from public.business_requests;
  res := pg_temp.t_add(res, '52 a robot that fills the hidden field is pretended to succeed but nothing is saved', (r->>'ok')::boolean and n = 0, r::text);
  r := public.request_business('sess-12345678', 'Tolu', 'Tolu Ltd', '0803 123 4567', '2 to 5', 'hi', '');
  res := pg_temp.t_add(res, '53 a real Business request is saved', (r->>'ok')::boolean, r::text);
  r := public.request_business('sess-12345678', 'Tolu', 'Tolu Ltd', '0803 123 4567', '6 to 20'); r := public.request_business('sess-12345678', 'Tolu', 'Tolu Ltd', '0803 123 4567', '6 to 20'); r := public.request_business('sess-12345678', 'Tolu', 'Tolu Ltd', '0803 123 4567', '6 to 20');
  res := pg_temp.t_add(res, '54 but not more than 3 a day from one visitor', r->>'reason' = 'limit', r::text);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ub::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.my_payments(); reset role;
  res := pg_temp.t_add(res, '55 the Payments list shows this account''s payments', (r->>'ok')::boolean and json_array_length(r->'payments') = 2 and (select count(*) from json_array_elements(r->'payments') e where (e->>'refunded')::boolean) = 1, r::text);
  set local role authenticated; r := public.my_billing(); reset role;
  res := pg_temp.t_add(res, '56 my_billing returns the plan details, the mode and the prices', (r->>'ok')::boolean and r->>'mode' = 'live' and json_array_length(r->'prices') = 4 and not (r->>'admin')::boolean, left(r::text, 150));
  set local role anon;
  begin perform public.apply_payment('AUS-X', 1); res := pg_temp.t_add(res, '57 the app cannot call apply_payment', false, 'was allowed');
  exception when others then res := pg_temp.t_add(res, '57 the app cannot call apply_payment', true, sqlerrm); end;
  begin perform public.create_sub_order('pro', 'month', 'card'); res := pg_temp.t_add(res, '58 a signed-out visitor cannot start an order', false, 'was allowed');
  exception when others then res := pg_temp.t_add(res, '58 a signed-out visitor cannot start an order', true, sqlerrm); end;
  reset role;
  update public.licences set paid_tier = 'pro', paid_until = now() + interval '20 days' where key = kD;
  select (public.save_push(kD, 'device-dddd0001', 'https://push.example/x', 'a', 'b')->>'ok')::boolean into s;
  res := pg_temp.t_add(res, '59 phone alerts open up for Pro', s::boolean, coalesce(s, 'null'));
  update public.licences set paid_tier = null, paid_until = null where key = kD;
  r := public.save_push(kD, 'device-dddd0001', 'https://push.example/x', 'a', 'b');
  res := pg_temp.t_add(res, '60 and stay closed on Free', r->>'reason' = 'plan', r::text);

  -- 12. nothing real was touched
  select count(*) into n from public.licences where plan in ('signature', 'prestige') and user_id is null and key not in (kSig, kPre);
  res := pg_temp.t_add(res, '61 the real bought keys were not touched', n >= 200, n::text);
  select count(*) into fails from jsonb_array_elements(res) e where not (e->>'ok')::boolean;
  raise exception 'AURUM_BILLING_RESULTS failed=% of % :: %', fails, jsonb_array_length(res), res::text;
end
$test$;
