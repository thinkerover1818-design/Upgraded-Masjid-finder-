-- ============================================================================
-- 0014: STORAGE BUCKETS
-- Public buckets: images meant to be viewed by anyone (profile pictures,
-- masjid/madrasa logos, verification-safe public assets).
-- Private buckets: recitations (audio, gated by moderation_status) and
-- verification-documents (never public, admin + submitter only).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-pictures', 'profile-pictures', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('institution-logos', 'institution-logos', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('recitations', 'recitations', false, 15728640, array['audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav']),
  ('verification-documents', 'verification-documents', false, 10485760, array['image/jpeg','image/png','application/pdf'])
on conflict (id) do nothing;

-- Path convention enforced by policy: every object must be stored under
-- `{auth.uid()}/...` so a user can only write inside their own folder.

create policy "profile_pics_public_read" on storage.objects for select
  using (bucket_id = 'profile-pictures');
create policy "profile_pics_owner_write" on storage.objects for insert
  with check (bucket_id = 'profile-pictures' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "profile_pics_owner_update" on storage.objects for update
  using (bucket_id = 'profile-pictures' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "profile_pics_owner_delete" on storage.objects for delete
  using (bucket_id = 'profile-pictures' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "logos_public_read" on storage.objects for select
  using (bucket_id = 'institution-logos');
create policy "logos_owner_write" on storage.objects for insert
  with check (bucket_id = 'institution-logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos_owner_update" on storage.objects for update
  using (bucket_id = 'institution-logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos_owner_delete" on storage.objects for delete
  using (bucket_id = 'institution-logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Recitations: never publicly readable. Owner can read/write their own;
-- playback for OTHER users happens only through a server route that mints
-- a short-lived signed URL after checking moderation_status = 'verified'.
create policy "recitations_owner_all" on storage.objects for all
  using (bucket_id = 'recitations' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'recitations' and (storage.foldername(name))[1] = auth.uid()::text);

-- Verification documents: owner + admin only, never public.
create policy "verify_docs_owner_write" on storage.objects for insert
  with check (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "verify_docs_owner_read" on storage.objects for select
  using (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "verify_docs_admin_read" on storage.objects for select
  using (bucket_id = 'verification-documents' and is_admin());
