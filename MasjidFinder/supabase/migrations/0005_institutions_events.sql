-- ============================================================================
-- 0005: INSTITUTIONS — Masjid, Madrasa, Event Organizer postings
-- ============================================================================

create table masjids (
  id uuid primary key default uuid_generate_v4(),
  account_code text unique not null,
  owner_profile_id uuid not null references profiles(id) on delete cascade,
  masjid_name text not null,
  logo_url text,

  country_id uuid not null references countries(id),
  state_id uuid references states(id),
  city_id uuid references cities(id),
  address text,                                       -- exact address: connection-gated, never public
  geo_point geography(Point, 4326),                    -- fuzzed point for public search

  representative_name text,
  firqah firqah_type,
  description text,
  facilities text[] default '{}',
  accommodation_available boolean not null default false,
  salary_info text,
  purpose role_type[] not null default '{}' check (
    purpose <@ array['masjid_for_taraweeh','masjid_for_imam']::role_type[]
  ),
  contact_preference contact_preference_type not null default 'in_app',

  verification_status verification_status not null default 'unverified',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_masjids_country on masjids (country_id) where deleted_at is null;
create index idx_masjids_owner on masjids (owner_profile_id);
create index idx_masjids_geo on masjids using gist (geo_point);
create trigger trg_masjids_updated_at before update on masjids
  for each row execute function set_updated_at();

create table madrasas (
  id uuid primary key default uuid_generate_v4(),
  account_code text unique not null,
  owner_profile_id uuid not null references profiles(id) on delete cascade,
  madrasa_name text not null,
  logo_url text,

  country_id uuid not null references countries(id),
  state_id uuid references states(id),
  city_id uuid references cities(id),
  address text,
  geo_point geography(Point, 4326),

  holder_name text,
  required_teacher_type teacher_requirement_type,
  required_teacher_type_custom text check (
    (required_teacher_type = 'other' and required_teacher_type_custom is not null)
    or required_teacher_type <> 'other' or required_teacher_type is null
  ),
  salary_info text,
  job_description text,
  required_qualification text,
  languages text[] default '{}',
  contact_preference contact_preference_type not null default 'in_app',

  verification_status verification_status not null default 'unverified',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_madrasas_country on madrasas (country_id) where deleted_at is null;
create index idx_madrasas_owner on madrasas (owner_profile_id);
create index idx_madrasas_geo on madrasas using gist (geo_point);
create trigger trg_madrasas_updated_at before update on madrasas
  for each row execute function set_updated_at();

create table events (
  id uuid primary key default uuid_generate_v4(),
  organizer_profile_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  event_type event_type not null default 'other',

  country_id uuid not null references countries(id),
  state_id uuid references states(id),
  city_id uuid references cities(id),
  geo_point geography(Point, 4326),

  event_date date not null check (event_date >= current_date - interval '1 day'),
  speaker_requirements text,
  status text not null default 'open' check (status in ('open','filled','cancelled','completed')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_events_country on events (country_id) where deleted_at is null;
create index idx_events_date on events (event_date);
create index idx_events_organizer on events (organizer_profile_id);
create trigger trg_events_updated_at before update on events
  for each row execute function set_updated_at();
