-- ============================================================================
-- DEVELOPMENT SEED — safe to run against a local/dev Supabase project.
-- DO NOT run this against production. Nothing here is a real masjid, real
-- scholar, or real verified organization — every demo row is prefixed
-- "[DEMO]" and is_active is left true only so local UI testing works; an
-- admin should deactivate/delete these before go-live.
-- ============================================================================

-- Example admin-configurable subscription plans (currency-aware, no code change needed)
insert into subscription_plans (name, description, price, currency, duration_days, enquiry_limit, boost_duration_days, scope, benefits, sort_order) values
  ('Basic Boost (India)', 'Improve your ranking within India for 30 days.', 299, 'INR', 30, 20, 30, 'country',
    '{"boost_score": 15, "featured": false}', 1),
  ('Featured Profile (India)', 'Top placement + verified badge priority review for 30 days.', 899, 'INR', 30, 50, 30, 'country',
    '{"boost_score": 30, "featured": true}', 2),
  ('Global Reach', 'Boosted visibility across all countries for 30 days.', 15, 'USD', 30, null, 30, 'global',
    '{"boost_score": 25, "featured": true, "global_rank": true}', 3),
  ('Gulf Basic Boost', 'Improve your ranking across GCC listings for 30 days.', 39, 'SAR', 30, 30, 30, 'country',
    '{"boost_score": 15, "featured": false}', 4)
on conflict do nothing;

insert into referral_reward_rules (reward_type, description, benefit) values
  ('free_verification', 'Referrer gets one free priority verification review', '{"verification_priority": true}'),
  ('boost_7d', 'Referrer gets a 7-day profile boost', '{"boost_score": 10, "boost_days": 7}')
on conflict (reward_type) do nothing;

-- ---------------------------------------------------------------------------
-- Demo auth users + profiles for local development only.
-- Requires creating the corresponding auth.users rows first via the Supabase
-- CLI/Admin API (phone OTP has no password to seed directly in SQL). See
-- docs/DEV_SEED.md for the two-step script that does this end-to-end.
-- ---------------------------------------------------------------------------
-- Intentionally NOT inserting fake profiles/masjids/verified scholars here —
-- per the product spec ("Do not insert fake real-world religious
-- organizations or fake verified scholars"). Use docs/DEV_SEED.md's script
-- to create your own local [DEMO]-prefixed test accounts through the real
-- signup flow instead of pre-seeding rows that bypass validation.
