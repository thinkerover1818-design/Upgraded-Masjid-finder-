-- ============================================================================
-- 0009: SUBSCRIPTIONS, REFERRALS, DONATIONS, SHOP (feature-flagged)
-- Multi-currency by construction: subscription_plans.currency and
-- donations.currency are ISO-4217 codes drawn from countries.currency_code,
-- never hard-coded to USD/INR in the schema or app.
-- ============================================================================

create table subscription_plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  price numeric(10,2) not null default 0 check (price >= 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  duration_days int not null check (duration_days > 0),
  enquiry_limit int check (enquiry_limit is null or enquiry_limit >= 0),
  boost_duration_days int check (boost_duration_days is null or boost_duration_days >= 0),
  scope subscription_scope not null default 'country',
  benefits jsonb not null default '{}',  -- {verified_badge, featured, country_rank, global_rank}
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_plans_updated_at before update on subscription_plans
  for each row execute function set_updated_at();

create table user_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  plan_id uuid not null references subscription_plans(id),
  enquiries_remaining int check (enquiries_remaining is null or enquiries_remaining >= 0),
  status purchase_status not null default 'pending',
  starts_at timestamptz,
  ends_at timestamptz,
  activated_by uuid references profiles(id),           -- admin who activated it
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index idx_user_subs_profile on user_subscriptions (profile_id, status);
create index idx_user_subs_expiry on user_subscriptions (ends_at) where status = 'active';
create trigger trg_user_subs_updated_at before update on user_subscriptions
  for each row execute function set_updated_at();

create table purchase_enquiries (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id),
  plan_id uuid not null references subscription_plans(id),
  status purchase_status not null default 'pending',
  contact_method text check (contact_method in ('whatsapp','email')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_enquiries_status on purchase_enquiries (status);
create index idx_enquiries_profile on purchase_enquiries (profile_id);
create trigger trg_enquiries_updated_at before update on purchase_enquiries
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- REFERRALS — self-referral and duplicate-reward proof
-- ---------------------------------------------------------------------------
create table referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_id uuid not null references profiles(id),
  referred_id uuid not null references profiles(id) unique,   -- a person can only ever BE referred once
  reward_status text not null default 'pending' check (reward_status in ('pending','granted','revoked')),
  reward_type text,                                              -- e.g. 'free_verification', 'boost_7d'
  granted_at timestamptz,
  created_at timestamptz not null default now(),
  check (referrer_id <> referred_id)                             -- blocks self-referral at the DB level
);
create index idx_referrals_referrer on referrals (referrer_id);

create table referral_reward_rules (
  id uuid primary key default uuid_generate_v4(),
  reward_type text not null unique,
  description text,
  benefit jsonb not null default '{}',
  is_active boolean not null default true
);

-- ---------------------------------------------------------------------------
-- DONATIONS
-- ---------------------------------------------------------------------------
create table donations (
  id uuid primary key default uuid_generate_v4(),
  donor_profile_id uuid references profiles(id),        -- nullable: guests can donate
  donor_name text,
  donor_contact text,
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  country_id uuid references countries(id),
  reference_id text unique not null default ('DON-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))),
  status donation_status not null default 'pending',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_donations_status on donations (status);
create trigger trg_donations_updated_at before update on donations
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- SHOP (schema-ready, hidden behind platform_settings.shop_enabled = false)
-- ---------------------------------------------------------------------------
create table shop_sellers (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  seller_country_id uuid references countries(id),
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table shop_products (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references shop_sellers(id) on delete cascade,
  name text not null,
  description text,
  images text[] default '{}',
  price numeric(10,2) check (price >= 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  stock int not null default 0 check (stock >= 0),
  category text,
  country_availability_ids uuid[] default '{}',          -- specific countries, empty = follows is_global
  is_global boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_shop_products_updated_at before update on shop_products
  for each row execute function set_updated_at();

create table shop_enquiries (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references shop_products(id),
  buyer_profile_id uuid not null references profiles(id),
  message text,
  status text not null default 'open' check (status in ('open','responded','closed')),
  created_at timestamptz not null default now()
);
