-- 0019: enable Supabase Realtime for the existing message table.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end;
$$;