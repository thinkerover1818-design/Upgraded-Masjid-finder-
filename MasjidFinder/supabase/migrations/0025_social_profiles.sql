-- 0025: usernames, follows, and richer public profile cards.

alter table profiles add column if not exists username text;
create unique index if not exists uq_profiles_username on profiles (lower(username)) where username is not null;

create table if not exists profile_follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists idx_profile_follows_following on profile_follows (following_id);
alter table profile_follows enable row level security;
create policy "follows_public_read" on profile_follows for select using (true);
create policy "follows_self_write" on profile_follows for insert with check (follower_id = auth.uid());
create policy "follows_self_delete" on profile_follows for delete using (follower_id = auth.uid());

create or replace view public_profile_cards as
select
  p.id, p.account_code, p.full_name, p.profile_picture_url,
  p.country_id, c.name as country_name, c.iso2 as country_iso2,
  p.state_id, st.name as state_name, p.city_id, ci.name as city_name,
  p.firqah, p.short_bio, p.languages, p.availability,
  p.verification_status, p.preferred_language, p.contact_preference,
  (select array_agg(role) from profile_roles where profile_id = p.id and is_active) as roles,
  (select array_agg(qualification) from profile_qualifications where profile_id = p.id) as qualifications,
  exists (select 1 from recitation_files r where r.profile_id = p.id and r.moderation_status = 'verified') as has_recitation,
  p.profile_completeness_pct, p.created_at,
  p.username, p.age, c.flag_emoji,
  p.address_general,
  (select count(*)::int from profile_follows where following_id = p.id) as following_count,
  (select count(*)::int from profile_follows where follower_id = p.id) as followers_count,
  (select count(*)::int from referrals where referrer_id = p.id) as referral_count
from profiles p
left join countries c on c.id = p.country_id
left join states st on st.id = p.state_id
left join cities ci on ci.id = p.city_id
where p.is_active and not p.is_banned and not p.is_suspended and p.deleted_at is null;