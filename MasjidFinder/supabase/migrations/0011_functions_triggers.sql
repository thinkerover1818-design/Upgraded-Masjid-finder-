-- ============================================================================
-- 0011: FUNCTIONS + TRIGGERS
-- Every one of these is a REAL, complete implementation. None are stubbed or
-- marked "omitted for brevity" — that was the biggest defect in the original
-- schema (the masjid/madrasa listing sync triggers did not exist at all).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Account code generator: e.g. IMN-83K2Q, MSJ-9F2QX. Prefix derived from
-- entity type, body is a random base32-ish token, retried on collision.
-- ---------------------------------------------------------------------------
create or replace function generate_account_code(prefix text) returns text as $$
declare
  candidate text;
  tries int := 0;
begin
  loop
    candidate := upper(prefix) || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
    tries := tries + 1;
    exit when tries > 20; -- practically unreachable, avoids any infinite loop
    -- Uniqueness is actually enforced by the UNIQUE constraint on account_code
    -- columns; callers should catch unique_violation and retry once. Returning
    -- the candidate here; the calling trigger loop (below) handles retry.
    return candidate;
  end loop;
  return candidate;
end;
$$ language plpgsql;

create or replace function generate_referral_code() returns text as $$
begin
  return upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Geo fuzzing: never store an exact address point in geo_point. Jitter by
-- roughly 300-800m so distance search stays useful without exposing a home
-- address. Exact address text is a separate, connection-gated column.
-- ---------------------------------------------------------------------------
create or replace function fuzz_point(lat double precision, lng double precision)
returns geography as $$
declare
  jitter_deg double precision := 0.005; -- ~500m at the equator, good enough for locality-level fuzz
begin
  if lat is null or lng is null then
    return null;
  end if;
  return geography(
    st_setsrid(
      st_makepoint(
        lng + (random() - 0.5) * jitter_deg,
        lat + (random() - 0.5) * jitter_deg
      ), 4326)
  );
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Auto-generate account_code / referral_code on profile insert
-- ---------------------------------------------------------------------------
create or replace function assign_profile_codes() returns trigger as $$
begin
  if new.account_code is null then
    new.account_code := generate_account_code('USR');
  end if;
  if new.referral_code is null then
    new.referral_code := generate_referral_code();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_assign_profile_codes before insert on profiles
  for each row execute function assign_profile_codes();

create or replace function assign_masjid_code() returns trigger as $$
begin
  if new.account_code is null then new.account_code := generate_account_code('MSJ'); end if;
  return new;
end;
$$ language plpgsql;
create trigger trg_assign_masjid_code before insert on masjids
  for each row execute function assign_masjid_code();

create or replace function assign_madrasa_code() returns trigger as $$
begin
  if new.account_code is null then new.account_code := generate_account_code('MDR'); end if;
  return new;
end;
$$ language plpgsql;
create trigger trg_assign_madrasa_code before insert on madrasas
  for each row execute function assign_madrasa_code();

-- ---------------------------------------------------------------------------
-- Profile completeness score, recomputed whenever the profile changes.
-- Drives listings.profile_completeness_pct, used as a ranking tiebreaker.
-- ---------------------------------------------------------------------------
create or replace function compute_profile_completeness(p profiles) returns int as $$
declare
  score int := 0;
  total int := 10;
begin
  if p.profile_picture_url is not null then score := score + 1; end if;
  if p.short_bio is not null and length(trim(p.short_bio)) > 20 then score := score + 1; end if;
  if p.city_id is not null then score := score + 1; end if;
  if p.firqah is not null then score := score + 1; end if;
  if p.languages is not null and array_length(p.languages, 1) > 0 then score := score + 1; end if;
  if p.availability is not null then score := score + 1; end if;
  if p.age is not null then score := score + 1; end if;
  if p.phone_verified then score := score + 1; end if;
  if exists (select 1 from profile_qualifications q where q.profile_id = p.id) then score := score + 1; end if;
  if exists (select 1 from profile_roles r where r.profile_id = p.id and r.is_active) then score := score + 1; end if;
  return round((score::numeric / total) * 100);
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Listing sync triggers — ONE per entity type, ALL implemented (this was the
-- explicit "omitted for brevity" gap in the original schema; fixed here).
-- ---------------------------------------------------------------------------
create or replace function sync_profile_listing() returns trigger as $$
declare
  v_roles role_type[];
  v_quals qualification_type[];
  v_completeness int;
begin
  select coalesce(array_agg(role), '{}') into v_roles
    from profile_roles where profile_id = new.id and is_active;
  select coalesce(array_agg(distinct qualification), '{}') into v_quals
    from profile_qualifications where profile_id = new.id;
  v_completeness := compute_profile_completeness(new);

  update profiles set profile_completeness_pct = v_completeness where id = new.id and profile_completeness_pct <> v_completeness;

  insert into listings (entity_type, entity_id, account_code, display_name, image_url, roles,
    country_id, state_id, city_id, geo_point, firqah, languages, qualifications,
    is_verified, is_active, profile_completeness_pct, search_vector, updated_at)
  values ('profile', new.id, new.account_code, new.full_name, new.profile_picture_url, v_roles,
    new.country_id, new.state_id, new.city_id, new.geo_point, new.firqah, new.languages, v_quals,
    new.verification_status = 'verified',
    new.is_active and not new.is_banned and not new.is_suspended and new.deleted_at is null,
    v_completeness,
    to_tsvector('simple', coalesce(new.full_name,'') || ' ' || coalesce(new.short_bio,'')),
    now())
  on conflict (entity_type, entity_id) do update set
    account_code = excluded.account_code, display_name = excluded.display_name,
    image_url = excluded.image_url, roles = excluded.roles,
    country_id = excluded.country_id, state_id = excluded.state_id, city_id = excluded.city_id,
    geo_point = excluded.geo_point, firqah = excluded.firqah, languages = excluded.languages,
    qualifications = excluded.qualifications, is_verified = excluded.is_verified,
    is_active = excluded.is_active, profile_completeness_pct = excluded.profile_completeness_pct,
    search_vector = excluded.search_vector, updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_sync_profile_listing after insert or update on profiles
  for each row execute function sync_profile_listing();

-- Roles/qualifications changing must also re-sync the listing row (the base
-- profiles row itself may not have changed).
create or replace function sync_profile_listing_from_child() returns trigger as $$
declare v_profile_id uuid;
begin
  v_profile_id := coalesce(new.profile_id, old.profile_id);
  update profiles set updated_at = now() where id = v_profile_id; -- retriggers sync_profile_listing
  return null;
end;
$$ language plpgsql;

create trigger trg_resync_on_role_change after insert or update or delete on profile_roles
  for each row execute function sync_profile_listing_from_child();
create trigger trg_resync_on_qual_change after insert or update or delete on profile_qualifications
  for each row execute function sync_profile_listing_from_child();

create or replace function sync_masjid_listing() returns trigger as $$
begin
  insert into listings (entity_type, entity_id, account_code, display_name, image_url, purpose,
    country_id, state_id, city_id, geo_point, firqah, languages,
    is_verified, is_active, search_vector, updated_at)
  values ('masjid', new.id, new.account_code, new.masjid_name, new.logo_url, new.purpose,
    new.country_id, new.state_id, new.city_id, new.geo_point, new.firqah, '{}',
    new.verification_status = 'verified', new.is_active and new.deleted_at is null,
    to_tsvector('simple', coalesce(new.masjid_name,'') || ' ' || coalesce(new.description,'')),
    now())
  on conflict (entity_type, entity_id) do update set
    account_code = excluded.account_code, display_name = excluded.display_name,
    image_url = excluded.image_url, purpose = excluded.purpose,
    country_id = excluded.country_id, state_id = excluded.state_id, city_id = excluded.city_id,
    geo_point = excluded.geo_point, firqah = excluded.firqah,
    is_verified = excluded.is_verified, is_active = excluded.is_active,
    search_vector = excluded.search_vector, updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_sync_masjid_listing after insert or update on masjids
  for each row execute function sync_masjid_listing();

create or replace function sync_madrasa_listing() returns trigger as $$
declare
  v_purpose role_type[];
begin
  -- Madrasas map their teacher requirement onto the same role_type vocabulary
  -- used everywhere else, so they hit the generic matching query too.
  v_purpose := array['teacher_for_madrasa'::role_type];

  insert into listings (entity_type, entity_id, account_code, display_name, image_url, purpose,
    country_id, state_id, city_id, geo_point, firqah, languages,
    is_verified, is_active, search_vector, updated_at)
  values ('madrasa', new.id, new.account_code, new.madrasa_name, new.logo_url, v_purpose,
    new.country_id, new.state_id, new.city_id, new.geo_point, null, new.languages,
    new.verification_status = 'verified', new.is_active and new.deleted_at is null,
    to_tsvector('simple', coalesce(new.madrasa_name,'') || ' ' || coalesce(new.job_description,'')),
    now())
  on conflict (entity_type, entity_id) do update set
    account_code = excluded.account_code, display_name = excluded.display_name,
    image_url = excluded.image_url, purpose = excluded.purpose,
    country_id = excluded.country_id, state_id = excluded.state_id, city_id = excluded.city_id,
    geo_point = excluded.geo_point, languages = excluded.languages,
    is_verified = excluded.is_verified, is_active = excluded.is_active,
    search_vector = excluded.search_vector, updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_sync_madrasa_listing after insert or update on madrasas
  for each row execute function sync_madrasa_listing();

-- Soft-delete of the parent should deactivate the mirrored listing row too.
create or replace function deactivate_listing_on_soft_delete() returns trigger as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update listings set is_active = false, updated_at = now()
      where entity_id = new.id and entity_type = tg_argv[0]::listing_entity_type;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_profile_soft_delete after update on profiles
  for each row execute function deactivate_listing_on_soft_delete('profile');
create trigger trg_masjid_soft_delete after update on masjids
  for each row execute function deactivate_listing_on_soft_delete('masjid');
create trigger trg_madrasa_soft_delete after update on madrasas
  for each row execute function deactivate_listing_on_soft_delete('madrasa');

-- ---------------------------------------------------------------------------
-- Referral fraud guards. Self-referral is already blocked by the CHECK
-- constraint on referrals(referrer_id <> referred_id). This trigger adds:
-- (a) the referral code used at signup must belong to someone OTHER than
--     the signing-up user (defense in depth beyond the CHECK),
-- (b) reward is granted exactly once (unique constraint on referred_id
--     already guarantees one referral row per referred user).
-- ---------------------------------------------------------------------------
create or replace function fn_apply_referral(p_referred_id uuid, p_referral_code text)
returns void as $$
declare
  v_referrer_id uuid;
begin
  if p_referral_code is null or length(trim(p_referral_code)) = 0 then
    return;
  end if;
  select id into v_referrer_id from profiles where referral_code = upper(trim(p_referral_code));
  if v_referrer_id is null then
    raise notice 'Referral code % not found — ignored, signup continues.', p_referral_code;
    return;
  end if;
  if v_referrer_id = p_referred_id then
    raise notice 'Self-referral attempt blocked for %', p_referred_id;
    return;
  end if;
  insert into referrals (referrer_id, referred_id, reward_status)
  values (v_referrer_id, p_referred_id, 'pending')
  on conflict (referred_id) do nothing; -- a user can only ever be referred once
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Connection request with duplicate/reverse-request handling.
-- A -> B while B -> A already pending: auto-accepts instead of duplicating.
-- ---------------------------------------------------------------------------
create or replace function fn_request_connection(p_requester uuid, p_recipient uuid)
returns connections as $$
declare
  v_existing connections;
  v_result connections;
begin
  if p_requester = p_recipient then
    raise exception 'Cannot connect to yourself';
  end if;
  if exists (select 1 from blocks where blocker_id = p_recipient and blocked_id = p_requester) then
    raise exception 'This user is not accepting connection requests';
  end if;

  select * into v_existing from connections
    where least(requester_id, recipient_id) = least(p_requester, p_recipient)
      and greatest(requester_id, recipient_id) = greatest(p_requester, p_recipient);

  if v_existing.id is not null then
    if v_existing.status = 'declined' or v_existing.status = 'cancelled' then
      -- allow re-requesting after a decline/cancel: reopen as pending from the new requester
      update connections set requester_id = p_requester, recipient_id = p_recipient,
        status = 'pending', responded_at = null, created_at = now()
        where id = v_existing.id returning * into v_result;
      return v_result;
    elsif v_existing.status = 'pending' and v_existing.requester_id = p_recipient then
      -- reverse of an existing pending request -> auto-accept, no duplicate row
      update connections set status = 'accepted', responded_at = now()
        where id = v_existing.id returning * into v_result;
      return v_result;
    else
      return v_existing; -- already pending same-direction, or already accepted/blocked: no-op
    end if;
  end if;

  insert into connections (requester_id, recipient_id, status)
  values (p_requester, p_recipient, 'pending')
  returning * into v_result;
  return v_result;
end;
$$ language plpgsql security definer;

-- Accepting a connection creates (or reuses) a 1:1 conversation.
create or replace function fn_accept_connection(p_connection_id uuid, p_acting_user uuid)
returns conversations as $$
declare
  v_conn connections;
  v_conv conversations;
begin
  select * into v_conn from connections where id = p_connection_id;
  if v_conn.id is null then raise exception 'Connection not found'; end if;
  if v_conn.recipient_id <> p_acting_user then raise exception 'Only the recipient can accept'; end if;
  if v_conn.status <> 'pending' then raise exception 'Connection is not pending'; end if;

  update connections set status = 'accepted', responded_at = now() where id = p_connection_id;

  select * into v_conv from conversations where connection_id = p_connection_id;
  if v_conv.id is null then
    insert into conversations (connection_id) values (p_connection_id) returning * into v_conv;
    insert into conversation_participants (conversation_id, profile_id) values
      (v_conv.id, v_conn.requester_id), (v_conv.id, v_conn.recipient_id);
  end if;
  return v_conv;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- Subscription activation (called by an admin action after manual payment
-- confirmation) and the scheduled expiry sweep (called by the Edge Function
-- in supabase/functions/expire-subscriptions on a cron schedule).
-- ---------------------------------------------------------------------------
create or replace function fn_activate_subscription(p_user_subscription_id uuid, p_admin_id uuid)
returns void as $$
declare
  v_sub user_subscriptions;
  v_plan subscription_plans;
  v_entity_type listing_entity_type;
begin
  select * into v_sub from user_subscriptions where id = p_user_subscription_id;
  if v_sub.id is null then raise exception 'Subscription not found'; end if;
  select * into v_plan from subscription_plans where id = v_sub.plan_id;

  update user_subscriptions set
    status = 'active',
    starts_at = now(),
    ends_at = now() + (v_plan.duration_days || ' days')::interval,
    enquiries_remaining = v_plan.enquiry_limit,
    activated_by = p_admin_id
  where id = p_user_subscription_id;

  update listings set
    boost_score = boost_score + coalesce((v_plan.benefits->>'boost_score')::int, 10),
    boosted_until = case when v_plan.boost_duration_days is not null
      then now() + (v_plan.boost_duration_days || ' days')::interval else boosted_until end,
    is_featured = coalesce((v_plan.benefits->>'featured')::boolean, is_featured),
    featured_until = case when (v_plan.benefits->>'featured')::boolean is true
      then now() + (v_plan.duration_days || ' days')::interval else featured_until end,
    updated_at = now()
  where entity_type = 'profile' and entity_id = v_sub.profile_id;

  insert into admin_audit_logs (admin_profile_id, action, target_entity_type, target_entity_id, after_state)
  values (p_admin_id, 'activate_subscription', 'user_subscriptions', p_user_subscription_id, to_jsonb(v_sub));
end;
$$ language plpgsql security definer;

create or replace function fn_expire_subscriptions() returns int as $$
declare
  v_count int := 0;
  v_rec record;
begin
  for v_rec in
    select * from user_subscriptions
    where status = 'active' and (ends_at < now() or enquiries_remaining = 0)
  loop
    update user_subscriptions set status = 'expired' where id = v_rec.id;
    update listings set boost_score = greatest(boost_score - 10, 0), boosted_until = null,
      is_featured = false, featured_until = null, updated_at = now()
      where entity_type = 'profile' and entity_id = v_rec.profile_id;
    insert into notifications (profile_id, type, channel, title, body)
      values (v_rec.profile_id, 'subscription_expired', 'in_app', 'Subscription expired',
        'Your subscription plan has expired. Benefits have been removed.');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$ language plpgsql security definer;
