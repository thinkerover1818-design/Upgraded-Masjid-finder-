-- 0016: Google profile completion
-- Keep profile creation atomic and authenticated without exposing service-role
-- credentials to the browser.
create or replace function complete_google_profile(
  p_account_type account_type,
  p_profile jsonb,
  p_roles role_type[] default '{}',
  p_qualification qualification_type default null,
  p_qualification_custom text default null,
  p_masjid jsonb default null,
  p_madrasa jsonb default null
) returns table (profile_id uuid, created boolean)
language plpgsql security definer set search_path = public
as $$
declare v_user_id uuid := auth.uid(); v_profile_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication is required'; end if;
  if p_account_type not in ('imam', 'masjid', 'madrasa') then raise exception 'Unsupported account type'; end if;
  select id into v_profile_id from profiles where id = v_user_id;
  if v_profile_id is not null then return query select v_profile_id, false; return; end if;
  if nullif(trim(p_profile->>'full_name'), '') is null or nullif(p_profile->>'country_id', '') is null then raise exception 'Name and country are required'; end if;

  insert into profiles (id, full_name, age, profile_picture_url, country_id, state_id, city_id, address_general, firqah, preferred_language)
  values (v_user_id, trim(p_profile->>'full_name'), nullif(p_profile->>'age', '')::int, nullif(trim(p_profile->>'profile_picture_url'), ''),
    (p_profile->>'country_id')::uuid, nullif(p_profile->>'state_id', '')::uuid, nullif(p_profile->>'city_id', '')::uuid,
    nullif(trim(p_profile->>'address'), ''), nullif(p_profile->>'firqah', '')::firqah_type, 'en')
  on conflict (id) do nothing returning id into v_profile_id;
  if v_profile_id is null then select id into v_profile_id from profiles where id = v_user_id; return query select v_profile_id, false; return; end if;
  insert into profile_account_types (profile_id, account_type) values (v_user_id, p_account_type);

  if p_account_type = 'imam' then
    if nullif(trim(p_profile->>'address'), '') is null or nullif(p_profile->>'age', '') is null or nullif(p_profile->>'firqah', '') is null or p_qualification is null or coalesce(array_length(p_roles, 1), 0) = 0 then raise exception 'Imam profile is incomplete'; end if;
    insert into profile_qualifications (profile_id, qualification, custom_text) values (v_user_id, p_qualification, nullif(trim(p_qualification_custom), ''));
    insert into profile_roles (profile_id, role) select v_user_id, unnest(p_roles);
  elsif p_account_type = 'masjid' then
    if p_masjid is null or nullif(trim(p_masjid->>'masjid_name'), '') is null or nullif(trim(p_masjid->>'address'), '') is null or nullif(trim(p_masjid->>'representative_name'), '') is null or nullif(p_masjid->>'firqah', '') is null or nullif(p_masjid->>'purpose', '') is null then raise exception 'Masjid profile is incomplete'; end if;
    insert into masjids (owner_profile_id, masjid_name, country_id, state_id, city_id, address, representative_name, firqah, purpose)
    values (v_user_id, trim(p_masjid->>'masjid_name'), (p_profile->>'country_id')::uuid, nullif(p_profile->>'state_id', '')::uuid, nullif(p_profile->>'city_id', '')::uuid, trim(p_masjid->>'address'), trim(p_masjid->>'representative_name'), (p_masjid->>'firqah')::firqah_type,
      case when p_masjid->>'purpose' = 'both' then array['masjid_for_imam', 'masjid_for_taraweeh']::role_type[] else array[(p_masjid->>'purpose')::role_type] end);
  else
    if p_madrasa is null or nullif(trim(p_madrasa->>'madrasa_name'), '') is null or nullif(trim(p_madrasa->>'holder_name'), '') is null or nullif(trim(p_madrasa->>'address'), '') is null or nullif(p_madrasa->>'required_teacher_type', '') is null then raise exception 'Madrasa profile is incomplete'; end if;
    insert into madrasas (owner_profile_id, madrasa_name, country_id, state_id, city_id, address, holder_name, required_teacher_type, required_teacher_type_custom, salary_info)
    values (v_user_id, trim(p_madrasa->>'madrasa_name'), (p_profile->>'country_id')::uuid, nullif(p_profile->>'state_id', '')::uuid, nullif(p_profile->>'city_id', '')::uuid, trim(p_madrasa->>'address'), trim(p_madrasa->>'holder_name'), (p_madrasa->>'required_teacher_type')::teacher_requirement_type, nullif(trim(p_madrasa->>'required_teacher_type_custom'), ''), nullif(trim(p_madrasa->>'salary'), ''));
  end if;
  return query select v_user_id, true;
end;
$$;

revoke all on function complete_google_profile(account_type, jsonb, role_type[], qualification_type, text, jsonb, jsonb) from public;
grant execute on function complete_google_profile(account_type, jsonb, role_type[], qualification_type, text, jsonb, jsonb) to authenticated;