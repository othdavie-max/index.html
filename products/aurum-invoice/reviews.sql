-- Customer reviews. Run once in the Supabase SQL editor (already applied to your live project).
-- Visitors can only SEND a review (it is saved as "pending"). Nothing shows on the site until YOU approve it in the owner dashboard.
create table if not exists public.reviews (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  session text,
  name text not null,
  business text,
  rating int not null check (rating between 1 and 5),
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  verified boolean not null default false
);
alter table public.reviews enable row level security;
create index if not exists reviews_status_idx on public.reviews (status, created_at desc);

create or replace function public.submit_review(p_session text, p_name text, p_business text, p_rating int, p_body text, p_trap text default null)
returns json language plpgsql security definer set search_path = public as $$
declare nm text := trim(coalesce(p_name, '')); bz text := left(trim(coalesce(p_business, '')), 80); bd text := trim(coalesce(p_body, ''));
begin
  if coalesce(p_trap, '') <> '' then return json_build_object('ok', true); end if;  -- hidden field filled in = a bot, pretend it worked
  if p_session is null or length(p_session) < 8 or length(p_session) > 64 then return json_build_object('ok', false, 'reason', 'session'); end if;
  if length(nm) < 2 or length(nm) > 60 then return json_build_object('ok', false, 'reason', 'name'); end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then return json_build_object('ok', false, 'reason', 'rating'); end if;
  if length(bd) < 15 or length(bd) > 800 then return json_build_object('ok', false, 'reason', 'text'); end if;
  if bd ~* '(https?://|www\.|\.com|\.ng\b)' or nm ~* '(https?://|www\.)' then return json_build_object('ok', false, 'reason', 'links'); end if;
  if (select count(*) from public.reviews where session = p_session and created_at > now() - interval '1 day') >= 2 then return json_build_object('ok', false, 'reason', 'limit'); end if;
  if (select count(*) from public.reviews where status = 'pending' and created_at > now() - interval '1 hour') > 40 then return json_build_object('ok', false, 'reason', 'busy'); end if;
  insert into public.reviews (session, name, business, rating, body) values (p_session, nm, nullif(bz, ''), p_rating, bd);
  return json_build_object('ok', true);
end; $$;
revoke all on function public.submit_review(text, text, text, int, text, text) from public;
grant execute on function public.submit_review(text, text, text, int, text, text) to anon, authenticated;

create or replace function public.public_reviews(p_limit int default 20)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'count', (select count(*) from public.reviews where status = 'approved'),
    'avg', (select round(avg(rating)::numeric, 1) from public.reviews where status = 'approved'),
    'items', coalesce((select json_agg(r) from (select name, business, rating, body, verified, created_at from public.reviews where status = 'approved' order by created_at desc limit least(coalesce(p_limit, 20), 50)) r), '[]'::json));
$$;
revoke all on function public.public_reviews(int) from public;
grant execute on function public.public_reviews(int) to anon, authenticated;

-- Owner only (same passcode as the dashboard)
create or replace function public.admin_reviews(p_pass text)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_pass is null or encode(digest(p_pass, 'sha256'), 'hex') is distinct from (select value from public.app_config where key = 'admin_hash') then
    perform pg_sleep(1); return json_build_object('ok', false, 'reason', 'pass');
  end if;
  return json_build_object('ok', true, 'items', coalesce((select json_agg(r) from (select id, created_at, name, business, rating, body, status, verified from public.reviews order by (status = 'pending') desc, created_at desc limit 200) r), '[]'::json));
end; $$;
revoke all on function public.admin_reviews(text) from public;
grant execute on function public.admin_reviews(text) to anon, authenticated;

create or replace function public.admin_review_set(p_pass text, p_id bigint, p_status text default null, p_verified boolean default null)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_pass is null or encode(digest(p_pass, 'sha256'), 'hex') is distinct from (select value from public.app_config where key = 'admin_hash') then
    perform pg_sleep(1); return json_build_object('ok', false, 'reason', 'pass');
  end if;
  if p_status is not null and p_status not in ('pending', 'approved', 'hidden') then return json_build_object('ok', false, 'reason', 'status'); end if;
  update public.reviews set status = coalesce(p_status, status), verified = coalesce(p_verified, verified) where id = p_id;
  return json_build_object('ok', true);
end; $$;
revoke all on function public.admin_review_set(text, bigint, text, boolean) from public;
grant execute on function public.admin_review_set(text, bigint, text, boolean) to anon, authenticated;
