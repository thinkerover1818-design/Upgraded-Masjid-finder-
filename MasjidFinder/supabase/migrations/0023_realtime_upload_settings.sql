-- Keep messages in the realtime publication on hosted Supabase projects.
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
alter table public.messages replica identity full;
update public.platform_settings set value = 'true'::jsonb where key = 'shop_enabled';