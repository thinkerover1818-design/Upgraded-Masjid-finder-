-- ============================================================================
-- 0008: CONNECTIONS + CHAT
-- Duplicate/reverse-request handling: a single CHECK + a normalized ordering
-- function prevent both (A->B and B->A) and (A->B twice) from ever existing
-- as separate rows — see fn_request_connection() in 0011.
-- ============================================================================

create table connections (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  status connection_status not null default 'pending',
  phone_revealed_by_requester boolean not null default false,
  phone_revealed_by_recipient boolean not null default false,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> recipient_id)
);
-- Canonical uniqueness regardless of direction: normalize the pair with
-- least(...)/greatest(...) so A->B and B->A collide on the same index.
create unique index uq_connections_pair on connections (
  least(requester_id, recipient_id), greatest(requester_id, recipient_id)
);
create index idx_connections_requester on connections (requester_id, status);
create index idx_connections_recipient on connections (recipient_id, status);

create table conversations (
  id uuid primary key default uuid_generate_v4(),
  connection_id uuid references connections(id) on delete cascade,
  is_group boolean not null default false,             -- reserved: group chat is additive later
  title text,                                            -- used only when is_group = true
  created_at timestamptz not null default now()
);

create table conversation_participants (
  conversation_id uuid references conversations(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  last_read_at timestamptz,
  is_deleted_for_user boolean not null default false,    -- "delete conversation" is per-user, not global
  created_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  message_type text not null default 'text' check (message_type in ('text','voice','file','video')),
  content text,
  attachment_url text,
  created_at timestamptz not null default now(),
  check (message_type <> 'text' or (content is not null and length(trim(content)) > 0))
);
create index idx_messages_conversation on messages (conversation_id, created_at);

create table message_receipts (
  message_id uuid references messages(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  read_at timestamptz,
  primary key (message_id, profile_id)
);

create table presence (
  profile_id uuid primary key references profiles(id) on delete cascade,
  is_online boolean not null default false,
  last_seen_at timestamptz not null default now()
);

create table blocks (
  blocker_id uuid references profiles(id) on delete cascade,
  blocked_id uuid references profiles(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index idx_blocks_blocked on blocks (blocked_id);

create table reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid references profiles(id),
  reported_entity_type listing_entity_type not null,
  reported_entity_id uuid not null,
  reason report_reason not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewed','actioned','dismissed')),
  reviewed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_reports_status on reports (status) where status = 'open';
create index idx_reports_entity on reports (reported_entity_type, reported_entity_id);
