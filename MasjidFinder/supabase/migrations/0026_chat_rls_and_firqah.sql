-- 0026: non-recursive chat RLS and broader firqah choices.

create or replace function is_conversation_member(p_conversation_id uuid, p_profile_id uuid)
returns boolean as $$
  select exists (
    select 1 from conversation_participants
    where conversation_id = p_conversation_id and profile_id = p_profile_id
  );
$$ language sql stable security definer set search_path = public;

drop policy if exists "conversations_participant_read" on conversations;
create policy "conversations_participant_read" on conversations for select using (is_conversation_member(id, auth.uid()));

drop policy if exists "cp_self_read" on conversation_participants;
create policy "cp_self_read" on conversation_participants for select using (profile_id = auth.uid() or is_conversation_member(conversation_id, auth.uid()));

drop policy if exists "messages_participants_only" on messages;
create policy "messages_participants_only" on messages for select using (is_conversation_member(conversation_id, auth.uid()));

drop policy if exists "messages_participant_insert" on messages;
create policy "messages_participant_insert" on messages for insert with check (sender_id = auth.uid() and is_conversation_member(conversation_id, auth.uid()));

alter type firqah_type add value if not exists 'barelvi';
alter type firqah_type add value if not exists 'deobandi';
alter type firqah_type add value if not exists 'ahl_e_hadith';
alter type firqah_type add value if not exists 'shia_ithna_ashari';
alter type firqah_type add value if not exists 'ismaili';
alter type firqah_type add value if not exists 'bohra';
alter type firqah_type add value if not exists 'ibadi';
alter type firqah_type add value if not exists 'ahmadi';
alter type firqah_type add value if not exists 'quranist';