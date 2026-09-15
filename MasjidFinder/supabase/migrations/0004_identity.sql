-- ============================================================================
-- 0003: CORE IDENTITY
-- profiles.country/state/city are now FKs into the location master tables
-- (0002), not free text. phone_number is normalized E.164 and is never
-- selectable through any public-facing view or RLS policy — see 0011_rls.sql
-- and the public_profile_cards view in 0012_views_rpc.sql.
-- ============================================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  account_code text unique not null,
  full_name text not null,
  age int check (age between 15 and 110),
  gender gender_type,
  profile_picture_url text,

  country_id uuid not null references countries(id),
  state_id uuid references states(id),
  city_id uuid references cities(id),
  address_general text,                               -- coarse locality text only, never exact street address
  geo_point geography(Point, 4326),                    -- FUZZED point (city-level jitter applied at write time)

  firqah firqah_type,
  short_bio text,
  languages text[] default '{}',
  availability text,
  contact_preference contact_preference_type not null default 'in_app',

  -- Phone: E.164 normalized (e.g. +919876543210), country-derived, never +91-only.
  phone_e164 text unique,
  phone_country_id uuid references countries(id),
  phone_verified boolean not null default false,
  phone_hidden boolean not null default true,          -- user-controlled visibility even after connection

  referral_code text unique not null,
  referred_by uuid references profiles(id),

  verification_status verification_status not null default 'unverified',
  is_active boolean not null default true,
  is_suspended boolean not null default false,
  is_banned boolean not null default false,
  suspended_reason text,
  banned_reason text,

  preferred_language text not null default 'en' references languages(code),
  profile_completeness_pct int not null default 0,     -- maintained by trigger, see 0010

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz                                -- soft delete
);

create index idx_profiles_country on profiles (country_id) where deleted_at is null;
create index idx_profiles_state on profiles (state_id) where deleted_at is null;
create index idx_profiles_city on profiles (city_id) where deleted_at is null;
create index idx_profiles_geo on profiles using gist (geo_point);
create index idx_profiles_referral_code on profiles (referral_code);
create index idx_profiles_phone on profiles (phone_e164);
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

create table profile_account_types (
  profile_id uuid references profiles(id) on delete cascade,
  account_type account_type not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, account_type)
);

create table profile_roles (
  profile_id uuid references profiles(id) on delete cascade,
  role role_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (profile_id, role)
);
create index idx_profile_roles_active on profile_roles (role) where is_active;

create table profile_qualifications (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  qualification qualification_type not null,
  custom_text text check (
    (qualification = 'other' and custom_text is not null and length(trim(custom_text)) > 0)
    or qualification <> 'other'
  ),
  institution_name text,
  year_completed int check (year_completed between 1950 and extract(year from now())::int + 1),
  created_at timestamptz not null default now()
);
create index idx_qualifications_profile on profile_qualifications (profile_id);

create table profile_experience (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  years_experience numeric(4,1) check (years_experience >= 0),
  description text,
  created_at timestamptz not null default now()
);
create index idx_experience_profile on profile_experience (profile_id);

-- Quran recitation audio: metadata only. Actual bytes live in the private
-- Supabase Storage bucket `recitations` (see docs/storage-buckets.md).
-- duration_seconds/file_size_bytes are populated SERVER-SIDE after the
-- upload completes (an Edge Function probes the real file), never trusted
-- from client input directly — see app/api/recitations/route.ts.
create table recitation_files (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  storage_path text not null unique,
  duration_seconds int check (duration_seconds between 1 and 240),
  file_size_bytes bigint check (file_size_bytes between 1 and 15728640), -- 15MB hard ceiling
  mime_type text check (mime_type in ('audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav')),
  moderation_status verification_status not null default 'pending',     -- reuse enum: pending|verified|rejected|unverified
  moderated_by uuid references profiles(id),
  moderated_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_recitations_profile on recitation_files (profile_id);

-- A profile may hold at most one active recitation upload at a time,
-- enforced at the application layer (see lib validation) plus this guard:
create unique index uq_recitations_one_pending_per_profile
  on recitation_files (profile_id)
  where moderation_status = 'pending';
