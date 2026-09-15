-- ============================================================================
-- 0001: EXTENSIONS + ENUM TYPES
-- ============================================================================
create extension if not exists "uuid-ossp";
create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

create type account_type as enum (
  'imam', 'hafiz_qari', 'moulvi_scholar', 'teacher',
  'masjid', 'madrasa', 'event_organizer'
);

create type role_type as enum (
  'masjid_for_taraweeh',
  'hafiz_qari_for_taraweeh',
  'masjid_for_imam',
  'imam_for_masjid',
  'teacher_for_madrasa',
  'madrasa_for_teacher',
  'moulvi_for_events',
  'moulvi_for_nikah'
);

create type firqah_type as enum (
  'sunni_hanafi', 'sunni_shafii', 'sunni_maliki', 'sunni_hanbali',
  'salafi_ahle_hadith', 'shia', 'other', 'prefer_not_to_say'
);

create type qualification_type as enum (
  'hafiz', 'qari', 'aalim', 'mufti', 'imam', 'teacher', 'moulvi', 'other'
);

create type gender_type as enum ('male', 'female', 'prefer_not_to_say');

create type verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
create type connection_status as enum ('pending', 'accepted', 'declined', 'blocked', 'cancelled');
create type subscription_scope as enum ('country', 'global');
create type purchase_status as enum (
  'pending', 'contacted', 'payment_pending', 'paid', 'active', 'expired', 'cancelled', 'rejected'
);
create type donation_status as enum ('pending', 'contacted', 'confirmed', 'failed');
create type report_reason as enum (
  'fake_profile', 'inappropriate_content', 'harassment', 'spam', 'scam', 'other'
);
create type listing_entity_type as enum ('profile', 'masjid', 'madrasa');
create type admin_role_type as enum ('super_admin', 'country_admin', 'moderator');
create type contact_preference_type as enum ('in_app', 'phone_after_connect', 'email');
create type teacher_requirement_type as enum (
  'hifz', 'quran', 'islamic_studies', 'aalim_moulana', 'dars', 'general_subject', 'other'
);
create type event_type as enum ('jalsa', 'ijtema', 'seminar', 'islamic_lecture', 'nikah', 'other');
create type notification_channel as enum ('sms', 'whatsapp', 'email', 'push', 'in_app');
create type notification_type as enum (
  'otp', 'connection_request', 'connection_accepted', 'message', 'subscription_activated',
  'subscription_expiring', 'subscription_expired', 'enquiry_update', 'verification_update',
  'referral_reward', 'admin_announcement'
);
