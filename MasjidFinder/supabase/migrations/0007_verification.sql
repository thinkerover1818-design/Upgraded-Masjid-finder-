-- ============================================================================
-- 0007: VERIFICATION WORKFLOW
-- unverified -> pending -> verified | rejected, with full history retained
-- (a new request row is inserted each time — never overwritten — so admin
-- can see verification history as required by the spec).
-- Public badge copy is enforced in the UI layer (components/VerifiedBadge)
-- to read "Platform Verified" and never imply religious-authority endorsement.
-- ============================================================================

create table verification_requests (
  id uuid primary key default uuid_generate_v4(),
  entity_type listing_entity_type not null,
  entity_id uuid not null,
  submitted_by uuid not null references profiles(id),
  submitted_documents jsonb not null default '[]',      -- [{storage_path, doc_type}]
  status verification_status not null default 'pending',
  reviewed_by uuid references profiles(id),
  admin_notes text,                                       -- internal only, never exposed publicly
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_verification_entity on verification_requests (entity_type, entity_id, created_at desc);
create index idx_verification_status on verification_requests (status) where status = 'pending';
