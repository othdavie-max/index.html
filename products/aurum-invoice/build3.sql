-- Aurum BUILD 3: Pro and Prestige include the two new designs and the three new openings (plan/08, part D).
-- Applied to the live database on 16 Nov 2026. Safe to run more than once.
update public.plan_rules
   set designs = array['royal','atelier','noir','silk','heritage'],
       openings = array['envelope','gift','card','scroll','doors','dome','none']
 where level in ('pro', 'prestige');
