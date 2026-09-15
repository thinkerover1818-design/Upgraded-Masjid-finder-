-- ============================================================================
-- 0002: GLOBAL LOCATION MASTER SYSTEM
-- Fixes the #1 gap in the original schema: country/state/city were free-text
-- columns on every table. That made it impossible to add/rename/disable a
-- country without a code change, allowed duplicate spellings, and had no
-- structured currency/calling-code/timezone data. This replaces free text
-- with a proper country -> state -> city hierarchy, referenced everywhere
-- by stable IDs. All data here is admin-editable at runtime; no app code
-- needs to change to add, rename, or disable a country, state, or city.
-- ============================================================================

create table countries (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  iso2 char(2) not null unique,           -- e.g. 'IN', 'SA', 'US'
  iso3 char(3) not null unique,           -- e.g. 'IND', 'SAU', 'USA'
  numeric_code char(3),                   -- ISO 3166-1 numeric
  calling_code text not null,             -- e.g. '+91', '+966' (can have multiple; primary here)
  currency_code char(3) not null,         -- ISO 4217, e.g. 'INR'
  currency_name text not null,
  currency_symbol text not null,
  default_timezone text not null,         -- IANA tz, e.g. 'Asia/Kolkata'
  flag_emoji text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_countries_active on countries (is_active, sort_order);
create index idx_countries_name_trgm on countries using gin (name gin_trgm_ops);

create table states (
  id uuid primary key default uuid_generate_v4(),
  country_id uuid not null references countries(id) on delete cascade,
  name text not null,
  code text,                              -- state/province code where applicable (e.g. 'MH', 'CA')
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (country_id, name)
);
create index idx_states_country on states (country_id, is_active);
create index idx_states_name_trgm on states using gin (name gin_trgm_ops);

create table cities (
  id uuid primary key default uuid_generate_v4(),
  state_id uuid references states(id) on delete cascade,   -- nullable: some countries have no state layer
  country_id uuid not null references countries(id) on delete cascade,
  name text not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (country_id, state_id, name)
);
create index idx_cities_state on cities (state_id, is_active);
create index idx_cities_country on cities (country_id, is_active);
create index idx_cities_name_trgm on cities using gin (name gin_trgm_ops);

-- updated_at maintenance (generic function reused by every table with the column)
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_countries_updated_at before update on countries
  for each row execute function set_updated_at();

-- Row Level Security: location tables are public-readable (needed for every
-- signup/profile form's dropdowns) but writable only by admins.
alter table countries enable row level security;
alter table states enable row level security;
alter table cities enable row level security;

create policy "countries_public_read" on countries for select using (true);
create policy "states_public_read" on states for select using (true);
create policy "cities_public_read" on cities for select using (true);

-- Insert/update/delete are intentionally granted ONLY via the service role
-- (admin API routes use lib/supabase/admin.ts), so no policy is created for
-- authenticated/anon write access - default-deny applies automatically once
-- RLS is enabled and no permissive write policy exists.
