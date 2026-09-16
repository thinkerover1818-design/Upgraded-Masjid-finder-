-- 0017: designate the platform owner through the existing admin_users system
-- The email is checked server-side against auth.users; no client-side admin
-- flag or RLS bypass is introduced.
create or replace function grant_designated_admin() returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_confirmed_at timestamptz;
begin
  select lower(email), email_confirmed_at into v_email, v_confirmed_at
  from auth.users where id = new.id;
  if v_email = 'masjidfinderofficial@gmail.com' and v_confirmed_at is not null then
    insert into admin_users (profile_id, admin_role, is_active)
    values (new.id, 'super_admin', true)
    on conflict (profile_id) do update
      set admin_role = 'super_admin', is_active = true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_grant_designated_admin on profiles;
create trigger trg_grant_designated_admin
after insert or update on profiles
for each row execute function grant_designated_admin();

insert into admin_users (profile_id, admin_role, is_active)
select p.id, 'super_admin', true
from profiles p
join auth.users u on u.id = p.id
where lower(u.email) = 'masjidfinderofficial@gmail.com'
  and u.email_confirmed_at is not null
on conflict (profile_id) do update
  set admin_role = 'super_admin', is_active = true;