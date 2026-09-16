-- 0018: make the designated admin grant reliable after direct email signup
create or replace function ensure_designated_admin()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
begin
  select lower(email) into v_email from auth.users where id = v_user_id;
  if v_email <> 'masjidfinderofficial@gmail.com' then return false; end if;
  if not exists (select 1 from profiles where id = v_user_id) then return false; end if;

  insert into admin_users (profile_id, admin_role, is_active)
  values (v_user_id, 'super_admin', true)
  on conflict (profile_id) do update
    set admin_role = 'super_admin', is_active = true;
  return true;
end;
$$;

revoke all on function ensure_designated_admin() from public;
grant execute on function ensure_designated_admin() to authenticated;

create or replace function grant_designated_admin() returns trigger
language plpgsql security definer set search_path = public, auth
as $$
declare v_email text;
begin
  select lower(email) into v_email from auth.users where id = new.id;
  if v_email = 'masjidfinderofficial@gmail.com' then
    insert into admin_users (profile_id, admin_role, is_active)
    values (new.id, 'super_admin', true)
    on conflict (profile_id) do update set admin_role = 'super_admin', is_active = true;
  end if;
  return new;
end;
$$;

insert into admin_users (profile_id, admin_role, is_active)
select p.id, 'super_admin', true
from profiles p join auth.users u on u.id = p.id
where lower(u.email) = 'masjidfinderofficial@gmail.com'
on conflict (profile_id) do update set admin_role = 'super_admin', is_active = true;