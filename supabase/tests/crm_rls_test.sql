-- Local verification of crm_schema.sql against plain Postgres with a stubbed Supabase auth layer.
-- Usage: psql -v ON_ERROR_STOP=1 -f supabase/tests/crm_rls_test.sql <fresh database>
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
end $$;
grant usage on schema public, auth to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;

\i supabase/crm_schema.sql
grant all on all tables in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;
revoke select on crm_sources from anon, authenticated;
grant select (id, name, type, created_at) on crm_sources to authenticated;

insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'), ('00000000-0000-0000-0000-00000000000c');
insert into crm_users (id, name, email, role) values
  ('00000000-0000-0000-0000-00000000000a', 'Owner', 'o@x', 'owner'),
  ('00000000-0000-0000-0000-00000000000b', 'Tele', 't@x', 'telemarketer'),
  ('00000000-0000-0000-0000-00000000000c', 'Other', 'c@x', 'telemarketer');
insert into crm_call_lists (name, origin) values ('Secret Purchased List', 'purchased');
insert into crm_leads (full_name, phone, source_id, assigned_to)
  select 'Lead ' || n, '+23480000' || lpad(n::text, 5, '0'), (select id from crm_sources where name = 'Cold Call'),
         case when n <= 3 then '00000000-0000-0000-0000-00000000000b'::uuid else '00000000-0000-0000-0000-00000000000c'::uuid end
  from generate_series(1, 6) n;
insert into crm_deals (lead_id, project, value) select id, 'P', 1000000 from crm_leads limit 1;
insert into crm_sources (name, type, monthly_cost) values ('Costed', 'paid', 5000);
insert into crm_meetings (lead_id, scheduled_at, format)
  select id, '2026-10-05 10:00+00', 'video' from crm_leads where assigned_to = '00000000-0000-0000-0000-00000000000c' limit 1;

create or replace function pg_temp.as_user(u text) returns void language plpgsql as
$$ begin perform set_config('request.jwt.claim.sub', u, false); end $$;

-- Owner sees everything
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  assert (select count(*) from crm_leads) = 6, 'owner sees all leads';
  assert (select count(*) from crm_deals) = 1, 'owner sees deals';
  assert (select count(*) from crm_call_lists) = 1, 'owner sees call lists';
  assert (select count(*) from crm_source_costs() where monthly_cost = 5000) = 1, 'owner reads costs';
end $$;

-- Telemarketer B: only own leads, no deals, no lists, no costs
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ declare v_lead uuid; ok boolean := false; begin
  assert (select count(*) from crm_leads) = 3, 'tele sees only assigned leads';
  assert (select count(*) from crm_deals) = 0, 'tele cannot see deal values';
  assert (select count(*) from crm_call_lists) = 0, 'tele cannot see call lists';
  assert (select count(*) from crm_source_costs()) = 0, 'tele cannot read source costs';
  begin perform monthly_cost from crm_sources; exception when insufficient_privilege then ok := true; end;
  assert ok, 'tele cannot select monthly_cost column';
  select id into v_lead from crm_leads order by full_name limit 1;

  -- interaction without next step (Contacted) is rejected
  ok := false;
  begin perform crm_log_interaction(v_lead, 'call', 'outbound', 'no answer', 's', null, 'Contacted');
  exception when check_violation then ok := true; end;
  assert ok, 'interaction without next step must fail';
  assert (select count(*) from crm_interactions) = 0, 'failed call left no interaction row';

  -- with a date: ok, stamps first/last contact + history
  perform crm_log_interaction(v_lead, 'call', 'outbound', 'interested', 's', now() + interval '1 day', 'Contacted', true);
  assert (select first_contacted_at is not null and consent_whatsapp and consent_whatsapp_at is not null and stage = 'Contacted' from crm_leads where id = v_lead), 'contact stamped';
  -- Lost without a date is allowed
  perform crm_log_interaction(v_lead, 'call', 'outbound', 'not interested', 's', null, 'Lost');
  -- Nurture without a date is allowed
  perform crm_log_interaction(v_lead, 'call', 'outbound', 'later', 's', null, 'Nurture');
  assert (select count(*) from crm_stage_history where lead_id = v_lead) = 4, 'stage history: New, Contacted, Lost, Nurture';

end $$ ;
do $$ declare ok boolean := false; begin
  begin update crm_leads set call_list_id = gen_random_uuid(); exception when others then ok := true; end;
  assert ok, 'tele cannot change list/provenance';
end $$;
do $$ declare ok boolean := false; v_mine uuid; begin
  select id into v_mine from crm_leads limit 1;
  assert (select count(*) from crm_meetings) = 0, 'tele cannot see meetings of others leads';
  assert (select count(*) from crm_booked_slots('2026-10-05 00:00+00', '2026-10-06 00:00+00')) = 1, 'tele sees taken slots';
  begin insert into crm_meetings (lead_id, scheduled_at, format) values (v_mine, '2026-10-05 10:00+00', 'video');
  exception when unique_violation then ok := true; end;
  assert ok, 'double booking a slot must fail';
  insert into crm_meetings (lead_id, scheduled_at, format) values (v_mine, '2026-10-05 10:30+00', 'video');
  assert (select count(*) from crm_settings where key = 'call_script') = 1, 'tele reads script';
  update crm_settings set value = '"x"'::jsonb where key = 'call_script';
  assert (select value <> '"x"'::jsonb from crm_settings where key = 'call_script'), 'tele cannot change script';
end $$;
reset role;
select 'ALL RLS TESTS PASSED' as result;
