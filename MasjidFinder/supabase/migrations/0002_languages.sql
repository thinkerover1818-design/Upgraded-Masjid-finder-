-- ============================================================================
-- 0002: LANGUAGES (created early — profiles.preferred_language references it)
-- Admin can add unlimited additional languages later with zero app code
-- changes; the UI resolves strings from `translations` (0010) at runtime.
-- ============================================================================

create table languages (
  code text primary key,             -- BCP-47-ish short code: en | ar | ur | hi | bn
  name text not null,
  native_name text,
  is_rtl boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0
);

insert into languages (code, name, native_name, is_rtl, sort_order) values
  ('en','English','English', false, 1),
  ('ar','Arabic','العربية', true, 2),
  ('ur','Urdu','اردو', true, 3),
  ('hi','Hindi','हिन्दी', false, 4),
  ('bn','Bangla','বাংলা', false, 5)
on conflict (code) do nothing;

alter table languages enable row level security;
create policy "languages_public_read" on languages for select using (true);
-- Writes: service role only (admin panel), enforced by default-deny (no write policy).
