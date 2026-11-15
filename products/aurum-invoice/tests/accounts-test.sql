-- Aurum accounts test (Build 1). SAFE: everything below is undone at the end (the script ends with an error on purpose,
-- which rolls the whole transaction back). It prints its results inside that error message ("AURUM_TEST_RESULTS ...").
-- Run it together with accounts.sql:  accounts.sql first, then this file, in ONE query.
-- It uses made-up people at test.aurum.invalid and made-up devices. It never touches real keys.

create or replace function pg_temp.t_add(r jsonb, n text, ok boolean, got text) returns jsonb language sql as $$
  select r || jsonb_build_array(jsonb_build_object('t', n, 'ok', coalesce(ok, false), 'got', left(coalesce(got, 'null'), 160)))
$$;

do $test$
declare
  res jsonb := '[]'::jsonb;
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid(); ud uuid := gen_random_uuid();
  ue uuid := gen_random_uuid(); uf uuid := gen_random_uuid(); ug uuid := gen_random_uuid(); uh uuid := gen_random_uuid();
  ui uuid := gen_random_uuid(); uj uuid := gen_random_uuid();
  kSig text; kPre text; kFree text; kFree2 text; kFreeUn text; kSig2 text; kSigF text; kA text; kE text; kF text; kJ text;
  r json; n int; fails int;
begin
  -- people (made up)
  insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
    (ua, 'authenticated', 'authenticated', 'a@test.aurum.invalid', now(), now(), now(), '{}', '{}'),
    (ub, 'authenticated', 'authenticated', 'b@test.aurum.invalid', now(), now(), now(), '{}', '{}'),
    (uc, 'authenticated', 'authenticated', 'c@test.aurum.invalid', now(), now(), now(), '{}', '{}'),
    (ud, 'authenticated', 'authenticated', 'd@test.aurum.invalid', now(), now(), now(), '{}', '{}'),
    (ue, 'authenticated', 'authenticated', 'e@test.aurum.invalid', now(), now(), now(), '{}', '{}'),
    (uf, 'authenticated', 'authenticated', 'f@test.aurum.invalid', now(), now(), now(), '{}', '{}'),
    (ug, 'authenticated', 'authenticated', 'g@test.aurum.invalid', now(), now(), now(), '{}', '{}'),
    (uh, 'authenticated', 'authenticated', 'h@test.aurum.invalid', now(), now(), now(), '{}', '{}'),
    (ui, 'authenticated', 'authenticated', 'i@mailinator.com', now(), now(), now(), '{}', '{}'),
    (uj, 'authenticated', 'authenticated', 'j@test.aurum.invalid', now(), now(), now(), '{}', '{}');
  -- old-style keys (made up)
  kSig := public.new_licence('Legacy Sig', null, null, 2, 'signature', null);
  kPre := public.new_licence('Legacy Pre', null, null, 5, 'prestige', null);
  kFree := public.new_licence(null, 'd@test.aurum.invalid', null, 2, 'free', null);
  kFree2 := public.new_licence(null, 'g@test.aurum.invalid', null, 2, 'free', null);
  kFreeUn := public.new_licence(null, 'z@test.aurum.invalid', null, 2, 'free', null);
  kSig2 := public.new_licence('Sig Two', 'e@test.aurum.invalid', null, 2, 'signature', null);
  kSigF := public.new_licence('Sig F', 'f@test.aurum.invalid', null, 2, 'signature', null);

  -- 1. old behaviour, as the old app uses it (anon)
  set local role anon;
  r := public.activate_license(kSig, 'device-sigdev1');
  res := pg_temp.t_add(res, '01 legacy key still activates', (r->>'ok')::boolean and r->>'plan' = 'signature' and (r->>'account')::boolean = false, r::text);
  res := pg_temp.t_add(res, '02 legacy ent is Signature, unlimited, 2 devices', r->'ent'->>'label' = 'Signature' and r->'ent'->>'docs_limit' is null and (r->'ent'->>'devices_max')::int = 2, (r->'ent')::text);
  r := public.activate_license('AUR-NOPE-NOPE-NOPE', 'device-sigdev1');
  res := pg_temp.t_add(res, '03 unknown key refused', r->>'reason' = 'invalid', r::text);
  r := public.activate_license(kFree, 'device-freed01');
  res := pg_temp.t_add(res, '04 old free key still activates', (r->>'ok')::boolean and r->>'plan' = 'free' and (r->'ent'->>'docs_limit')::int = 5, (r->'ent')::text);
  r := public.activate_license(kFreeUn, 'device-zzzz0001');
  r := public.activate_license(kPre, 'device-predev01');
  res := pg_temp.t_add(res, '05 prestige ent: Pro pack, own address, 5 devices', (r->'ent'->>'pro_pack')::boolean and (r->'ent'->>'own_domain')::boolean and (r->'ent'->>'devices_max')::int = 5 and r->'ent'->>'branding' = 'none', (r->'ent')::text);
  reset role;

  -- 2. a new account (A)
  perform set_config('request.jwt.claims', json_build_object('sub', ua::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.account_enter('device-aaaa0001', 'Android phone');
  reset role;
  kA := r->>'key';
  res := pg_temp.t_add(res, '06 new account gets a free workspace', (r->>'ok')::boolean and kA is not null and r->'ent'->>'tier' = 'free' and (r->'ent'->>'docs_limit')::int = 5 and (r->'ent'->>'devices_max')::int = 1 and (r->'ent'->>'account')::boolean, (r->'ent')::text);
  set local role authenticated; r := public.account_enter('device-aaaa0001', 'Android phone'); reset role;
  res := pg_temp.t_add(res, '07 entering again on the same phone gives the same key', (r->>'ok')::boolean and r->>'key' = kA, r::text);
  set local role authenticated; r := public.account_enter('device-aaaa0002', 'iPhone'); reset role;
  res := pg_temp.t_add(res, '08 a second phone on Free is stopped and shown the list', r->>'reason' = 'device_limit' and json_array_length(r->'devices') = 1, r::text);
  set local role authenticated; r := public.account_swap_device('device-aaaa0002', 'iPhone', 'device-aaaa0001'); reset role;
  select count(*) into n from public.licence_devices where licence_key = kA;
  res := pg_temp.t_add(res, '09 swapping a device works and keeps one device', (r->>'ok')::boolean and n = 1, r::text);
  set local role authenticated; r := public.account_swap_device('device-aaaa0003', 'Tablet', 'device-aaaa0002'); r := public.account_swap_device('device-aaaa0004', 'Laptop', 'device-aaaa0003'); reset role;
  set local role authenticated; r := public.account_swap_device('device-aaaa0005', 'Phone 5', 'device-aaaa0004'); reset role;
  res := pg_temp.t_add(res, '10 the 4th change in 30 days is refused', r->>'reason' = 'too_many_changes', r::text);

  -- 3. the key and its phones
  set local role anon;
  r := public.activate_license(kA, 'device-aaaa0099');
  res := pg_temp.t_add(res, '11 a new phone cannot use an account key directly', r->>'reason' = 'use_account', r::text);
  r := public.activate_license(kA, 'device-aaaa0004');
  res := pg_temp.t_add(res, '12 the registered phone still opens it', (r->>'ok')::boolean and (r->>'account')::boolean, r::text);

  -- 4. free documents: 5 a month
  for n in 1..5 loop r := public.free_use(kA, 'device-aaaa0004', 'doc-test-' || n, 'sig' || n); end loop;
  res := pg_temp.t_add(res, '13 the 5th free document is allowed', (r->>'ok')::boolean and (r->>'left')::int = 0 and (r->>'limit')::int = 5, r::text);
  r := public.free_use(kA, 'device-aaaa0004', 'doc-test-6', 'sig6');
  res := pg_temp.t_add(res, '14 the 6th is refused', r->>'reason' = 'free_limit', r::text);
  r := public.free_use(kA, 'device-aaaa0004', 'doc-test-3', 'sig3');
  res := pg_temp.t_add(res, '15 sending an already-counted document again is free', (r->>'ok')::boolean, r::text);
  r := public.my_plan(kA, 'device-aaaa0004');
  res := pg_temp.t_add(res, '16 my_plan shows 5 used, 0 left', (r->'ent'->>'docs_used')::int = 5 and (r->'ent'->>'docs_left')::int = 0, (r->'ent')::text);
  r := public.free_status(kA, 'device-aaaa0004');
  res := pg_temp.t_add(res, '17 old free_status shape still works', r->>'plan' = 'free' and (r->>'limit')::int = 5 and (r->>'left')::int = 0, r::text);
  r := public.free_use(kSig, 'device-sigdev1', 'doc-sig-1', 'x');
  res := pg_temp.t_add(res, '18 bought keys are not counted', (r->>'ok')::boolean and r->>'plan' = 'signature', r::text);
  reset role;

  -- 5. joining an old key to an account
  perform set_config('request.jwt.claims', json_build_object('sub', ub::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.link_licence(kSig, 'device-sigdev1', 'Old phone'); reset role;
  res := pg_temp.t_add(res, '19 a bought key joins (phone already on it); plan stays Signature', (r->>'ok')::boolean and r->>'plan' = 'signature' and r->'ent'->>'label' = 'Signature' and (r->'ent'->>'docs_limit') is null, r::text);
  set local role authenticated; r := public.link_licence(kSig, 'device-sigdev1', 'Old phone'); reset role;
  res := pg_temp.t_add(res, '20 joining twice is harmless', (r->>'ok')::boolean, r::text);
  perform set_config('request.jwt.claims', json_build_object('sub', uc::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.link_licence(kSig, 'device-sigdev1', 'Other'); reset role;
  res := pg_temp.t_add(res, '21 a key joined to one account cannot be taken by another', r->>'reason' = 'taken', r::text);
  set local role authenticated; r := public.link_licence(kPre, 'device-nomatch1', 'Other'); reset role;
  res := pg_temp.t_add(res, '22 someone who is not the buyer cannot join a key', r->>'reason' = 'no_match', r::text);
  set local role anon;
  r := public.activate_license(kSig, 'device-newdev99');
  res := pg_temp.t_add(res, '23 a joined key refuses a brand-new phone (must sign in)', r->>'reason' = 'use_account', r::text);
  r := public.activate_license(kSig, 'device-sigdev1');
  res := pg_temp.t_add(res, '24 and still opens on its registered phone', (r->>'ok')::boolean, r::text);
  reset role;
  select count(*) into n from public.licence_devices where licence_key = kSig;
  res := pg_temp.t_add(res, '25 its devices were not changed by joining', n = 1, n::text);

  -- 6. an old free key joins; an email match works without a phone
  perform set_config('request.jwt.claims', json_build_object('sub', ud::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.link_licence(kFree, 'device-freed01', 'Phone'); reset role;
  res := pg_temp.t_add(res, '26 an old free key joins and now gets 5 a month', (r->>'ok')::boolean and (r->'ent'->>'docs_limit')::int = 5 and (r->'ent'->>'account')::boolean, (r->'ent')::text);
  perform set_config('request.jwt.claims', json_build_object('sub', ug::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.link_licence(kFree2, 'device-gdev0001', 'Phone'); reset role;
  select count(*) into n from public.licence_devices where licence_key = kFree2 and device_id = 'device-gdev0001';
  res := pg_temp.t_add(res, '27 the buyer email matches, so a new phone can join', (r->>'ok')::boolean and n = 1, r::text);

  -- 7. an account that already has documents
  perform set_config('request.jwt.claims', json_build_object('sub', ue::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.account_enter('device-eeee0001', 'Phone'); reset role;
  kE := r->>'key';
  insert into public.invoices (id, licence_key, doc_id, payload) values ('t-test-inv-1', kE, 'doc1', '{}'::jsonb);
  set local role authenticated; r := public.link_licence(kSig2, 'device-eeee0001', 'Phone'); reset role;
  res := pg_temp.t_add(res, '28 an account with documents is not overwritten', r->>'reason' = 'account_has_documents', r::text);
  perform set_config('request.jwt.claims', json_build_object('sub', uf::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.account_enter('device-ffff0001', 'Phone'); reset role;
  kF := r->>'key';
  set local role authenticated; r := public.link_licence(kSigF, 'device-ffff0001', 'Phone'); reset role;
  select count(*) into n from public.licences where key = kF;
  res := pg_temp.t_add(res, '29 an empty account workspace is replaced by the joined key', (r->>'ok')::boolean and n = 0 and r->>'key' = kSigF, r::text);

  -- 8. guards
  perform set_config('request.jwt.claims', json_build_object('sub', uh::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.account_enter('device-aaaa0004', 'Phone'); reset role;
  res := pg_temp.t_add(res, '30 a phone that already holds another free account is refused', r->>'reason' = 'device_has_account' and (r->>'masked') like 'a***@%', r::text);
  perform set_config('request.jwt.claims', json_build_object('sub', ui::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.account_enter('device-iiii0001', 'Phone'); reset role;
  res := pg_temp.t_add(res, '31 throwaway email addresses are refused', r->>'reason' = 'disposable', r::text);
  set local role anon;
  begin perform public.account_enter('device-hack0001', 'x'); res := pg_temp.t_add(res, '32 signed-out callers cannot use sign-in functions', false, 'was allowed');
  exception when others then res := pg_temp.t_add(res, '32 signed-out callers cannot use sign-in functions', true, sqlerrm); end;
  begin perform public._ent(kSig); res := pg_temp.t_add(res, '33 private helpers are not callable from the app', false, 'was allowed');
  exception when others then res := pg_temp.t_add(res, '33 private helpers are not callable from the app', true, sqlerrm); end;
  reset role;

  -- 9. the launch-day switch
  set local role anon;
  r := public.free_use(kFreeUn, 'device-zzzz0001', 'doc-z-1', 'z1');
  res := pg_temp.t_add(res, '34 switch off: an old free key still sends', (r->>'ok')::boolean, r::text);
  reset role;
  update public.app_config set value = 'on' where key = 'accounts_required';
  set local role anon;
  r := public.free_use(kFreeUn, 'device-zzzz0001', 'doc-z-2', 'z2');
  res := pg_temp.t_add(res, '35 switch on: an old free key must join an account', r->>'reason' = 'account_needed', r::text);
  r := public.free_use(kSig, 'device-sigdev1', 'doc-sig-2', 'x');
  res := pg_temp.t_add(res, '36 switch on: a bought key is unaffected', (r->>'ok')::boolean, r::text);
  r := public.free_use(kFree, 'device-freed01', 'doc-d-1', 'd1');
  res := pg_temp.t_add(res, '37 switch on: a joined free key is fine', (r->>'ok')::boolean, r::text);
  reset role;
  update public.app_config set value = 'off' where key = 'accounts_required';

  -- 10. renaming the business, 60-day rule
  perform set_config('request.jwt.claims', json_build_object('sub', ua::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.rename_business(kA, 'device-aaaa0004', 1, 'My  Shop'); reset role;
  select business_name into kJ from public.licences where key = kA;
  res := pg_temp.t_add(res, '38 business name can be set', (r->>'ok')::boolean and kJ = 'my shop', coalesce(kJ, 'null') || ' ' || r::text);
  set local role authenticated; r := public.rename_business(kA, 'device-aaaa0004', 1, 'Another Name'); reset role;
  res := pg_temp.t_add(res, '39 and not again within 60 days', r->>'reason' = 'too_soon', r::text);

  -- 11. plan levels (what Build 2 will switch on)
  update public.licences set paid_tier = 'pro', paid_until = now() + interval '30 days', paid_period = 'month', paid_method = 'card' where key = kA;
  r := public._ent(kA);
  res := pg_temp.t_add(res, '40 active Pro: unlimited, 5 devices, Pro pack, no Aurum name', r->>'tier' = 'pro' and r->>'status' = 'active' and r->>'docs_limit' is null and (r->>'devices_max')::int = 5 and (r->>'pro_pack')::boolean and r->>'branding' = 'none', r::text);
  update public.licences set paid_until = now() - interval '3 days' where key = kA;
  r := public._ent(kA);
  res := pg_temp.t_add(res, '41 3 days late: still Pro (grace)', r->>'tier' = 'pro' and r->>'status' = 'grace', r::text);
  update public.licences set paid_until = now() - interval '10 days' where key = kA;
  r := public._ent(kA);
  res := pg_temp.t_add(res, '42 10 days late: back to Free, documents kept', r->>'tier' = 'free' and r->>'status' = 'ended' and (r->>'docs_limit')::int = 5, r::text);
  update public.licences set paid_tier = 'starter', paid_until = now() + interval '30 days' where key = kA;
  r := public._ent(kA);
  res := pg_temp.t_add(res, '43 Starter: 50 a month, 2 devices', r->>'tier' = 'starter' and (r->>'docs_limit')::int = 50 and (r->>'devices_max')::int = 2 and (r->>'docs_used')::int = 5, r::text);
  update public.licences set paid_tier = null, paid_until = null, paid_period = null, paid_method = null where key = kA;

  -- 12. devices screen, signing out, delete request
  perform set_config('request.jwt.claims', json_build_object('sub', ua::text, 'role', 'authenticated')::text, true);
  set local role authenticated; r := public.account_devices(); reset role;
  res := pg_temp.t_add(res, '44 the devices list works', (r->>'ok')::boolean and json_array_length(r->'devices') = 1, r::text);
  set local role authenticated; r := public.account_release_device('device-aaaa0004'); reset role;
  select count(*) into n from public.licence_devices where licence_key = kA;
  res := pg_temp.t_add(res, '45 signing out frees the phone', (r->>'ok')::boolean and n = 0, r::text);
  set local role authenticated; r := public.request_delete(); r := public.request_delete(); reset role;
  select count(*) into n from public.delete_requests where user_id = ua;
  res := pg_temp.t_add(res, '46 a delete request is recorded once', (r->>'ok')::boolean and n = 1, n::text);

  -- 13. things that must NOT have changed
  select count(*) into n from public.licences where plan in ('signature', 'prestige') and user_id is null and key not in (kSig, kPre, kSig2, kSigF);
  res := pg_temp.t_add(res, '47 the real bought keys were not touched (none got an account)', n >= 200, n::text);

  select count(*) into fails from jsonb_array_elements(res) e where not (e->>'ok')::boolean;
  raise exception 'AURUM_TEST_RESULTS failed=% of % :: %', fails, jsonb_array_length(res), res::text;
end
$test$;
