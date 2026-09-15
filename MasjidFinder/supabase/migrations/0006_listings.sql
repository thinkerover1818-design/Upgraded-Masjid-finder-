-- ============================================================================
-- 0006: SEARCH-OPTIMIZED LISTINGS MIRROR
-- One row per searchable entity (profile / masjid / madrasa), kept in sync by
-- triggers in 0011. All matching/search/ranking queries hit this ONE table.
-- ============================================================================

create table listings (
  id uuid primary key default uuid_generate_v4(),
  entity_type listing_entity_type not null,
  entity_id uuid not null,
  account_code text not null,
  display_name text not null,
  image_url text,

  roles role_type[] not null default '{}',              -- profiles
  purpose role_type[] not null default '{}',             -- masjids/madrasas

  country_id uuid not null references countries(id),
  state_id uuid references states(id),
  city_id uuid references cities(id),
  geo_point geography(Point, 4326),

  firqah firqah_type,
  languages text[] default '{}',
  qualifications qualification_type[] default '{}',

  is_verified boolean not null default false,
  is_active boolean not null default true,
  profile_completeness_pct int not null default 0,

  search_vector tsvector,

  -- Ranking/boost fields — written ONLY by the subscription-activation RPC
  -- (0013) or by an admin action recorded in admin_audit_logs. Never
  -- writable directly by the owning user (enforced by RLS in 0012 granting
  -- no user update policy on this table at all).
  boost_score int not null default 0,
  boosted_until timestamptz,
  is_featured boolean not null default false,
  featured_until timestamptz,
  rank_override int,                                    -- admin manual override, highest priority when set

  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id)
);

create index idx_listings_search on listings using gin (search_vector);
create index idx_listings_geo on listings using gist (geo_point);
create index idx_listings_country on listings (country_id) where is_active;
create index idx_listings_state on listings (state_id) where is_active;
create index idx_listings_city on listings (city_id) where is_active;
create index idx_listings_roles on listings using gin (roles);
create index idx_listings_purpose on listings using gin (purpose);
create index idx_listings_firqah on listings (firqah) where is_active;
create index idx_listings_rank on listings (
  (rank_override is null), rank_override, is_featured desc, boost_score desc, is_verified desc
);
