-- Keep active public profiles discoverable while allowing a missing location.
create or replace view public_profile_cards as
select
  p.id, p.account_code, p.full_name, p.profile_picture_url,
  p.country_id, c.name as country_name, c.iso2 as country_iso2,
  p.state_id, st.name as state_name,
  p.city_id, ci.name as city_name,
  p.firqah, p.short_bio, p.languages, p.availability, p.verification_status,
  p.preferred_language, p.contact_preference,
  (select array_agg(role) from profile_roles where profile_id = p.id and is_active) as roles,
  (select array_agg(qualification) from profile_qualifications where profile_id = p.id) as qualifications,
  exists (select 1 from recitation_files r where r.profile_id = p.id and r.moderation_status = 'verified') as has_recitation,
  p.profile_completeness_pct, p.created_at
from profiles p
left join countries c on c.id = p.country_id
left join states st on st.id = p.state_id
left join cities ci on ci.id = p.city_id
where p.is_active and not p.is_banned and not p.is_suspended and p.deleted_at is null;