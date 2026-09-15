-- ============================================================================
-- 0013: PUBLIC-SAFE VIEWS + SEARCH/MATCHING RPC
-- Views below are created by the migration role and never select
-- phone_e164, phone_country_id, or exact address — this is the enforced
-- contract that keeps private data out of the public API regardless of
-- future RLS changes on the base tables.
-- ============================================================================

create view public_profile_cards as
select
  p.id, p.account_code, p.full_name, p.profile_picture_url,
  p.country_id, c.name as country_name, c.iso2 as country_iso2,
  p.state_id, st.name as state_name,
  p.city_id, ci.name as city_name,
  p.firqah, p.short_bio, p.languages, p.availability, p.verification_status,
  p.preferred_language, p.contact_preference,
  (select array_agg(role) from profile_roles where profile_id = p.id and is_active) as roles,
  (select array_agg(qualification) from profile_qualifications where profile_id = p.id) as qualifications,
  exists (
    select 1 from recitation_files r where r.profile_id = p.id and r.moderation_status = 'verified'
  ) as has_recitation,
  p.profile_completeness_pct,
  p.created_at
from profiles p
join countries c on c.id = p.country_id
left join states st on st.id = p.state_id
left join cities ci on ci.id = p.city_id
where p.is_active and not p.is_banned and not p.is_suspended and p.deleted_at is null;

create view public_masjid_cards as
select
  m.id, m.account_code, m.masjid_name, m.logo_url,
  m.country_id, c.name as country_name, c.iso2 as country_iso2,
  m.state_id, st.name as state_name, m.city_id, ci.name as city_name,
  m.firqah, m.description, m.facilities, m.accommodation_available, m.salary_info,
  m.purpose, m.verification_status, m.contact_preference, m.created_at
from masjids m
join countries c on c.id = m.country_id
left join states st on st.id = m.state_id
left join cities ci on ci.id = m.city_id
where m.is_active and m.deleted_at is null;

create view public_madrasa_cards as
select
  md.id, md.account_code, md.madrasa_name, md.logo_url,
  md.country_id, c.name as country_name, c.iso2 as country_iso2,
  md.state_id, st.name as state_name, md.city_id, ci.name as city_name,
  md.required_teacher_type, md.required_teacher_type_custom, md.salary_info,
  md.job_description, md.required_qualification, md.languages,
  md.verification_status, md.contact_preference, md.created_at
from madrasas md
join countries c on c.id = md.country_id
left join states st on st.id = md.state_id
left join cities ci on ci.id = md.city_id
where md.is_active and md.deleted_at is null;

-- ---------------------------------------------------------------------------
-- CORE MATCHING/SEARCH RPC
-- One generic function reused by every category on the homepage, per the
-- architecture doc's "never hard-code per category" principle. Callable
-- directly by the frontend (anon/authenticated) since it only reads from
-- `listings`, which is already stripped of private fields.
--
-- p_scope: 'my_country' | 'other_countries' | 'all_countries' | 'global' | 'nearby'
--   - my_country: filter to p_my_country_id
--   - other_countries / all_countries / global: no country filter
--   - nearby: requires p_lat/p_lng, filters by ST_DWithin(p_radius_km)
-- ---------------------------------------------------------------------------
create or replace function search_listings(
  p_roles role_type[] default null,            -- match against roles OR purpose (whichever the entity uses)
  p_entity_types listing_entity_type[] default null,
  p_scope text default 'my_country',
  p_my_country_id uuid default null,
  p_country_id uuid default null,               -- used when scope = specific single other-country browse
  p_state_id uuid default null,
  p_city_id uuid default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km numeric default 50,
  p_firqah firqah_type default null,
  p_language text default null,
  p_qualification qualification_type default null,
  p_verified_only boolean default false,
  p_text_query text default null,
  p_limit int default 20,
  p_offset int default 0
) returns table (
  id uuid, entity_type listing_entity_type, entity_id uuid, account_code text,
  display_name text, image_url text, roles role_type[], purpose role_type[],
  country_id uuid, state_id uuid, city_id uuid, firqah firqah_type,
  is_verified boolean, is_featured boolean, boost_score int,
  distance_km double precision, rank_score numeric
) as $$
begin
  return query
  select
    l.id, l.entity_type, l.entity_id, l.account_code, l.display_name, l.image_url,
    l.roles, l.purpose, l.country_id, l.state_id, l.city_id, l.firqah,
    l.is_verified, l.is_featured, l.boost_score,
    case when p_lat is not null and p_lng is not null and l.geo_point is not null
      then st_distance(l.geo_point, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) / 1000.0
      else null end as distance_km,
    -- Composite relevance score used only for ORDER BY, never exposed as a
    -- self-manipulable field: rank_override > featured > boost > verified >
    -- text relevance > profile completeness.
    (
      coalesce((100000 - l.rank_override) * 1000, 0)
      + (case when l.is_featured and (l.featured_until is null or l.featured_until > now()) then 100000 else 0 end)
      + (case when l.boosted_until is null or l.boosted_until > now() then l.boost_score else 0 end) * 100
      + (case when l.is_verified then 500 else 0 end)
      + coalesce(ts_rank(l.search_vector, plainto_tsquery('simple', coalesce(p_text_query, ''))) * 100, 0)
      + coalesce(l.profile_completeness_pct, 0)
    )::numeric as rank_score
  from listings l
  where l.is_active
    and (p_entity_types is null or l.entity_type = any(p_entity_types))
    and (p_roles is null or l.roles && p_roles or l.purpose && p_roles)
    and (
      p_scope = 'other_countries' and p_my_country_id is not null and l.country_id <> p_my_country_id
      or p_scope in ('all_countries', 'global')
      or p_scope = 'my_country' and p_my_country_id is not null and l.country_id = p_my_country_id
      or p_scope = 'nearby'
      or p_scope = 'country' and p_country_id is not null and l.country_id = p_country_id
    )
    and (p_state_id is null or l.state_id = p_state_id)
    and (p_city_id is null or l.city_id = p_city_id)
    and (
      p_scope <> 'nearby' or p_lat is null or p_lng is null
      or st_dwithin(l.geo_point, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_km * 1000)
    )
    and (p_firqah is null or l.firqah = p_firqah)
    and (p_language is null or p_language = any(l.languages))
    and (p_qualification is null or p_qualification = any(l.qualifications))
    and (not p_verified_only or l.is_verified)
    and (p_text_query is null or l.search_vector @@ plainto_tsquery('simple', p_text_query))
  order by rank_score desc, distance_km asc nulls last, l.updated_at desc
  limit p_limit offset p_offset;
end;
$$ language plpgsql stable security definer;

comment on function search_listings is
  'Single generic matching/search entry point for every homepage category and the global search page. Ranking never trusts client input for boost_score/is_featured/rank_override — those come only from listings, written exclusively by triggers/admin RPCs.';
