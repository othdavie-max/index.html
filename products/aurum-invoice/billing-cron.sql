-- Aurum nightly job (Build 2). Run this AFTER billing.sql and AFTER the mail sender is set up (billing-mail function, mail service secrets).
-- It runs every morning at 8 am Lagos time: ends plans past their grace days, closes old links where the rules apply, queues the
-- "plan ending" emails, and then asks the billing-mail function to send what is waiting.
--
-- First put the address of the function and a shared secret in app_config (replace the two values), and set the same secret as
-- BILLING_MAIL_SECRET in Supabase > Edge Functions > Secrets:
--   insert into app_config (key, value) values
--     ('billing_mail_url', 'https://ymmxhjfcfaawrebxoxbu.supabase.co/functions/v1/billing-mail'),
--     ('billing_mail_secret', 'PUT A LONG RANDOM TEXT HERE')
--   on conflict (key) do update set value = excluded.value;

create or replace function public.send_mail_queue() returns void language plpgsql security definer set search_path = public, extensions as $$
declare u text; sec text;
begin
  select value into u from public.app_config where key = 'billing_mail_url';
  select value into sec from public.app_config where key = 'billing_mail_secret';
  if u is null or sec is null then return; end if;
  perform net.http_post(url := u, headers := jsonb_build_object('Content-Type', 'application/json', 'x-mail-secret', sec), body := '{}'::jsonb);
exception when others then null;
end; $$;
revoke all on function public.send_mail_queue() from public, anon, authenticated;

select cron.schedule('aurum-nightly', '0 7 * * *', 'select public.nightly(); select public.send_mail_queue()');
