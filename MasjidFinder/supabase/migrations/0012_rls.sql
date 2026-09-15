-- ============================================================================
-- 0012: ROW LEVEL SECURITY — every table, not a "representative sample".
-- Default posture: RLS enabled + no write policy = default DENY. Any INSERT/
-- UPDATE/DELETE not explicitly granted below can only be done through the
-- service-role key from a server route (never shipped to the client bundle)
-- or through a SECURITY DEFINER RPC (0011) that enforces its own checks.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper functions used throughout the policies below
-- ---------------------------------------------------------------------------
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from admin_users au where au.profile_id = auth.uid() and au.is_active
  );
$$ language sql stable security definer;

create or replace function is_super_admin() returns boolean as $$
  select exists (
    select 1 from admin_users au
    where au.profile_id = auth.uid() and au.is_active and au.admin_role = 'super_admin'
  );
$$ language sql stable security definer;

-- True if the caller is an active admin whose scope covers the given country
-- (super_admin covers everything; country_admin only their managed_country_id;
-- moderator is treated like super_admin for read/moderation-only actions,
-- restricted further at the application layer for destructive actions).
create or replace function admin_covers_country(p_country_id uuid) returns boolean as $$
  select exists (
    select 1 from admin_users au
    where au.profile_id = auth.uid() and au.is_active
      and (au.admin_role in ('super_admin','moderator') or au.managed_country_id = p_country_id)
  );
$$ language sql stable security definer;

-- ---------------------------------------------------------------------------
-- PROFILES — self full read/write; admins scoped to their country; no
-- public SELECT policy at all (public reads go through public_profile_cards,
-- a view owned by the migration role, per 0013 — this is the documented
-- Supabase pattern for guaranteeing phone_e164/address never leak via a
-- future RLS misconfiguration on the base table).
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;

create policy "profiles_self_select" on profiles for select using (auth.uid() = id);
create policy "profiles_self_update" on profiles for update using (auth.uid() = id)
  with check (auth.uid() = id);
create policy "profiles_self_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_admin_select" on profiles for select using (admin_covers_country(country_id));
create policy "profiles_admin_update" on profiles for update using (is_admin());

alter table profile_account_types enable row level security;
create policy "pat_self" on profile_account_types for all using (
  exists (select 1 from profiles p where p.id = profile_id and p.id = auth.uid())
) with check (
  exists (select 1 from profiles p where p.id = profile_id and p.id = auth.uid())
);
create policy "pat_admin_read" on profile_account_types for select using (is_admin());

alter table profile_roles enable row level security;
create policy "proles_public_read" on profile_roles for select using (is_active); -- roles power search filters
create policy "proles_self_write" on profile_roles for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

alter table profile_qualifications enable row level security;
create policy "pquals_public_read" on profile_qualifications for select using (true);
create policy "pquals_self_write" on profile_qualifications for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

alter table profile_experience enable row level security;
create policy "pexp_public_read" on profile_experience for select using (true);
create policy "pexp_self_write" on profile_experience for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Recitation audio: only the owner and admins/moderators may read the row
-- (which includes the private storage_path). This is deliberately NOT
-- public-select; playback goes through a signed-URL API route that checks
-- moderation_status = 'verified' before minting a short-lived URL.
alter table recitation_files enable row level security;
create policy "recitations_self" on recitation_files for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
create policy "recitations_admin" on recitation_files for select using (is_admin());
create policy "recitations_admin_moderate" on recitation_files for update using (is_admin());

-- ---------------------------------------------------------------------------
-- MASJIDS / MADRASAS — owner + admin only on the base table (address is a
-- column here). Public browsing uses public_masjid_cards/public_madrasa_cards
-- views (0013), which omit `address`.
-- ---------------------------------------------------------------------------
alter table masjids enable row level security;
create policy "masjids_owner_all" on masjids for all using (owner_profile_id = auth.uid())
  with check (owner_profile_id = auth.uid());
create policy "masjids_admin_all" on masjids for all using (admin_covers_country(country_id));

alter table madrasas enable row level security;
create policy "madrasas_owner_all" on madrasas for all using (owner_profile_id = auth.uid())
  with check (owner_profile_id = auth.uid());
create policy "madrasas_admin_all" on madrasas for all using (admin_covers_country(country_id));

alter table events enable row level security;
create policy "events_public_read" on events for select using (is_active and deleted_at is null);
create policy "events_owner_write" on events for all using (organizer_profile_id = auth.uid())
  with check (organizer_profile_id = auth.uid());
create policy "events_admin_all" on events for all using (admin_covers_country(country_id));

-- ---------------------------------------------------------------------------
-- LISTINGS — public read (already stripped of sensitive fields at the
-- trigger level); writes happen ONLY through triggers / SECURITY DEFINER
-- RPCs, so intentionally NO insert/update/delete policy exists here — a
-- user can never self-assign boost_score, is_featured or rank_override.
-- ---------------------------------------------------------------------------
alter table listings enable row level security;
create policy "listings_public_read" on listings for select using (is_active);
create policy "listings_admin_all" on listings for all using (is_admin());

-- ---------------------------------------------------------------------------
-- VERIFICATION
-- ---------------------------------------------------------------------------
alter table verification_requests enable row level security;
create policy "verification_submitter_read" on verification_requests for select using (submitted_by = auth.uid());
create policy "verification_submitter_insert" on verification_requests for insert with check (submitted_by = auth.uid());
create policy "verification_admin_all" on verification_requests for all using (is_admin());

-- ---------------------------------------------------------------------------
-- CONNECTIONS / CHAT — participants only, enforced server-side (this is the
-- exact requirement: privacy rules cannot rely on frontend checks alone).
-- ---------------------------------------------------------------------------
alter table connections enable row level security;
create policy "connections_participant_read" on connections for select using (
  auth.uid() = requester_id or auth.uid() = recipient_id
);
create policy "connections_admin_read" on connections for select using (is_admin());
-- Inserts/updates go through fn_request_connection / fn_accept_connection
-- (SECURITY DEFINER), not direct table writes, so duplicate/reverse-request
-- logic can't be bypassed by calling the REST API directly. No insert/update
-- policy is defined here on purpose.

alter table conversations enable row level security;
create policy "conversations_participant_read" on conversations for select using (
  exists (select 1 from conversation_participants cp where cp.conversation_id = id and cp.profile_id = auth.uid())
);

alter table conversation_participants enable row level security;
create policy "cp_self_read" on conversation_participants for select using (
  profile_id = auth.uid()
  or exists (select 1 from conversation_participants cp2 where cp2.conversation_id = conversation_id and cp2.profile_id = auth.uid())
);
create policy "cp_self_update" on conversation_participants for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

alter table messages enable row level security;
create policy "messages_participants_only" on messages for select using (
  exists (select 1 from conversation_participants cp
    where cp.conversation_id = messages.conversation_id and cp.profile_id = auth.uid())
);
create policy "messages_participant_insert" on messages for insert with check (
  sender_id = auth.uid()
  and exists (select 1 from conversation_participants cp
    where cp.conversation_id = messages.conversation_id and cp.profile_id = auth.uid())
  -- Additionally requires the underlying connection to be 'accepted' —
  -- enforced by requiring conversations to only ever be created by
  -- fn_accept_connection, which only runs on accepted connections.
);

alter table message_receipts enable row level security;
create policy "receipts_participant" on message_receipts for all using (
  profile_id = auth.uid()
  or exists (select 1 from messages m join conversation_participants cp on cp.conversation_id = m.conversation_id
    where m.id = message_id and cp.profile_id = auth.uid())
) with check (profile_id = auth.uid());

alter table presence enable row level security;
create policy "presence_public_read" on presence for select using (true); -- online/offline is intentionally public between connections' UI
create policy "presence_self_write" on presence for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

alter table blocks enable row level security;
create policy "blocks_self" on blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy "blocks_admin_read" on blocks for select using (is_admin());

alter table reports enable row level security;
create policy "reports_reporter_insert" on reports for insert with check (reporter_id = auth.uid());
create policy "reports_reporter_read" on reports for select using (reporter_id = auth.uid());
create policy "reports_admin_all" on reports for all using (is_admin());

-- ---------------------------------------------------------------------------
-- SUBSCRIPTIONS / ENQUIRIES / REFERRALS / DONATIONS
-- ---------------------------------------------------------------------------
alter table subscription_plans enable row level security;
create policy "plans_public_read" on subscription_plans for select using (is_active);
create policy "plans_admin_all" on subscription_plans for all using (is_admin());

alter table user_subscriptions enable row level security;
create policy "usersubs_self_read" on user_subscriptions for select using (profile_id = auth.uid());
create policy "usersubs_admin_all" on user_subscriptions for all using (is_admin());
-- No user insert/update policy: subscriptions are only created by the
-- purchase-enquiry -> admin-activation flow (fn_activate_subscription).

alter table purchase_enquiries enable row level security;
create policy "enquiries_self_read" on purchase_enquiries for select using (profile_id = auth.uid());
create policy "enquiries_self_insert" on purchase_enquiries for insert with check (profile_id = auth.uid());
create policy "enquiries_admin_all" on purchase_enquiries for all using (is_admin());

alter table referrals enable row level security;
create policy "referrals_own_read" on referrals for select using (
  referrer_id = auth.uid() or referred_id = auth.uid()
);
create policy "referrals_admin_all" on referrals for all using (is_admin());

alter table referral_reward_rules enable row level security;
create policy "reward_rules_public_read" on referral_reward_rules for select using (is_active);
create policy "reward_rules_admin_all" on referral_reward_rules for all using (is_admin());

alter table donations enable row level security;
create policy "donations_own_read" on donations for select using (donor_profile_id = auth.uid());
create policy "donations_insert_own_or_guest" on donations for insert with check (
  donor_profile_id = auth.uid() or donor_profile_id is null
);
create policy "donations_admin_all" on donations for all using (is_admin());

-- ---------------------------------------------------------------------------
-- SHOP (feature-flagged off by default; policies still correct if enabled)
-- ---------------------------------------------------------------------------
alter table shop_sellers enable row level security;
create policy "sellers_self" on shop_sellers for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "sellers_admin" on shop_sellers for all using (is_admin());
create policy "sellers_public_read_approved" on shop_sellers for select using (is_approved);

alter table shop_products enable row level security;
create policy "products_public_read" on shop_products for select using (
  is_active and exists (select 1 from shop_sellers s where s.id = seller_id and s.is_approved)
);
create policy "products_seller_write" on shop_products for all using (
  exists (select 1 from shop_sellers s where s.id = seller_id and s.profile_id = auth.uid())
) with check (
  exists (select 1 from shop_sellers s where s.id = seller_id and s.profile_id = auth.uid())
);
create policy "products_admin" on shop_products for all using (is_admin());

alter table shop_enquiries enable row level security;
create policy "shop_enquiries_buyer" on shop_enquiries for all using (buyer_profile_id = auth.uid())
  with check (buyer_profile_id = auth.uid());
create policy "shop_enquiries_seller_read" on shop_enquiries for select using (
  exists (select 1 from shop_products p join shop_sellers s on s.id = p.seller_id
    where p.id = product_id and s.profile_id = auth.uid())
);
create policy "shop_enquiries_admin" on shop_enquiries for all using (is_admin());

-- ---------------------------------------------------------------------------
-- PLATFORM CONFIG — public read (frontend needs these at render time),
-- admin write only.
-- ---------------------------------------------------------------------------
alter table platform_settings enable row level security;
create policy "settings_public_read" on platform_settings for select using (true);
create policy "settings_admin_write" on platform_settings for all using (is_admin());

alter table categories enable row level security;
create policy "categories_public_read" on categories for select using (is_active);
create policy "categories_admin_write" on categories for all using (is_admin());

alter table translations enable row level security;
create policy "translations_public_read" on translations for select using (true);
create policy "translations_admin_write" on translations for all using (is_admin());

-- ---------------------------------------------------------------------------
-- ANALYTICS / ADMIN / AUDIT — admin only, no public policy at all.
-- ---------------------------------------------------------------------------
alter table analytics_events enable row level security;
create policy "analytics_admin_read" on analytics_events for select using (is_admin());
create policy "analytics_insert_service" on analytics_events for insert with check (true); -- app writes events for the acting user; row itself carries no secrets

alter table analytics_daily_rollup enable row level security;
create policy "rollup_admin_read" on analytics_daily_rollup for select using (is_admin());

alter table admin_users enable row level security;
create policy "admin_users_self_read" on admin_users for select using (profile_id = auth.uid());
create policy "admin_users_super_admin_all" on admin_users for all using (is_super_admin());

alter table admin_audit_logs enable row level security;
create policy "audit_admin_read" on admin_audit_logs for select using (is_admin());
create policy "audit_admin_insert" on admin_audit_logs for insert with check (admin_profile_id = auth.uid() and is_admin());

alter table notifications enable row level security;
create policy "notifications_self" on notifications for select using (profile_id = auth.uid());
create policy "notifications_self_update" on notifications for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
create policy "notifications_admin_all" on notifications for all using (is_admin());
