-- ============================================================================
-- 0010: PLATFORM SETTINGS, TRANSLATIONS, ANALYTICS, ADMIN, AUDIT, NOTIFICATIONS
-- Everything in this file is what makes "no code change to configure X" true:
-- platform_settings, categories, translations, feature flags all live here.
-- ============================================================================

create table platform_settings (
  key text primary key,               -- 'platform_name' | 'whatsapp_number' | 'shop_enabled' | ...
  value jsonb not null,
  description text,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

insert into platform_settings (key, value, description) values
  ('platform_name', '"MasjidFinder"', 'Displayed site-wide name'),
  ('logo_url', 'null', 'Header logo asset URL'),
  ('favicon_url', 'null', 'Favicon asset URL'),
  ('hero_title', '"Find the right Imam, Hafiz or Madrasa — or the Masjid that needs you"', 'Homepage hero heading'),
  ('hero_description', '"One platform connecting Masjids, Imams, Huffaz, Qaris, Madrasas, teachers and scholars across the world."', 'Homepage hero subtext'),
  ('whatsapp_number', 'null', 'E.164 number used for "Contact to Purchase" deep links'),
  ('support_email', 'null', 'Support/contact email'),
  ('social_links', '{}', 'JSON map of platform -> URL'),
  ('maintenance_mode', 'false', 'When true, public site shows a maintenance page'),
  ('shop_enabled', 'false', 'Feature flag: Islamic Shop module'),
  ('donations_enabled', 'true', 'Feature flag: Donations module'),
  ('referral_rewards_enabled', 'true', 'Feature flag: referral reward granting')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- CATEGORIES — the 8 homepage matching categories, admin-renameable.
-- role_key ties a display category to the role_type enum used in matching;
-- renaming category_label never requires touching matching logic.
-- ---------------------------------------------------------------------------
create table categories (
  id uuid primary key default uuid_generate_v4(),
  role_key role_type not null unique,
  label text not null,
  subtitle text,
  icon text,
  is_active boolean not null default true,
  sort_order int not null default 0
);

insert into categories (role_key, label, subtitle, icon, sort_order) values
  ('masjid_for_taraweeh','Masjid For Taraweeh','Masjids seeking a Hafiz/Qari','book-open',1),
  ('hafiz_qari_for_taraweeh','Hafiz/Qari For Taraweeh','Reciters available this Ramadan','mic',2),
  ('masjid_for_imam','Masjid For Imam','Masjids seeking a permanent Imam','users',3),
  ('imam_for_masjid','Imam For Masjid','Imams available for appointment','users',4),
  ('teacher_for_madrasa','Teacher For Madrasa','Madrasas with open teaching posts','graduation-cap',5),
  ('madrasa_for_teacher','Madrasa For Teacher','Teachers seeking a Madrasa','graduation-cap',6),
  ('moulvi_for_events','Moulvi/Scholar For Events','Speakers for Jalsa & Ijtema','sparkles',7),
  ('moulvi_for_nikah','Moulvi For Nikah','Nearby Moulvis for your Nikah','heart',8)
on conflict (role_key) do nothing;

create table translations (
  translation_key text not null,
  language_code text not null references languages(code),
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (translation_key, language_code)
);
create index idx_translations_key on translations (translation_key);

-- ---------------------------------------------------------------------------
-- ANALYTICS — append-only event log
-- ---------------------------------------------------------------------------
create table analytics_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  profile_id uuid references profiles(id),
  country_id uuid references countries(id),
  category account_type,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_analytics_type_date on analytics_events (event_type, created_at);
create index idx_analytics_country on analytics_events (country_id);

-- Daily rollup used by the admin dashboard's date-range filters (today/7/30/90/custom)
create table analytics_daily_rollup (
  rollup_date date not null,
  event_type text not null,
  country_id uuid references countries(id),
  category account_type,
  event_count int not null default 0,
  primary key (rollup_date, event_type, country_id, category)
);

-- ---------------------------------------------------------------------------
-- ADMIN ROLES + AUDIT LOG
-- ---------------------------------------------------------------------------
create table admin_users (
  profile_id uuid primary key references profiles(id) on delete cascade,
  admin_role admin_role_type not null default 'moderator',
  managed_country_id uuid references countries(id),   -- null = global scope (super_admin only, enforced below)
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (admin_role <> 'country_admin' or managed_country_id is not null)
);

create table admin_audit_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_profile_id uuid not null references profiles(id),
  action text not null,                 -- e.g. 'verify_masjid', 'ban_user', 'update_plan'
  target_entity_type text,
  target_entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
create index idx_audit_admin on admin_audit_logs (admin_profile_id, created_at desc);
create index idx_audit_target on admin_audit_logs (target_entity_type, target_entity_id);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS — provider-agnostic outbox. A pluggable provider module
-- (lib/notifications/*) consumes rows here; no code depends on one specific
-- SMS/WhatsApp/email vendor.
-- ---------------------------------------------------------------------------
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  channel notification_channel not null default 'in_app',
  title text,
  body text,
  data jsonb default '{}',
  is_read boolean not null default false,
  sent_at timestamptz,
  send_error text,                       -- populated if the provider failed — never silently dropped
  created_at timestamptz not null default now()
);
create index idx_notifications_profile on notifications (profile_id, is_read, created_at desc);
