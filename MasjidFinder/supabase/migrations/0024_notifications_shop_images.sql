-- 0024: connection notifications and product image storage.

create index if not exists idx_notifications_profile_created on notifications (profile_id, created_at desc);

create or replace function notify_connection_change()
returns trigger as $$
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from new.status or old.recipient_id is distinct from new.recipient_id) then
    insert into notifications (profile_id, type, channel, title, body, data)
    values (new.recipient_id, 'connection_request', 'in_app', 'New friend request', 'Someone wants to connect with you.', jsonb_build_object('actor_id', new.requester_id, 'connection_id', new.id));
  elsif new.status = 'accepted' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into notifications (profile_id, type, channel, title, body, data)
    values (new.requester_id, 'connection_accepted', 'in_app', 'Friend request accepted', 'Your connection request was accepted.', jsonb_build_object('actor_id', new.recipient_id, 'connection_id', new.id));
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_connection_notifications on connections;
create trigger trg_connection_notifications
after insert or update of status, recipient_id on connections
for each row execute function notify_connection_change();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-product-images', 'shop-product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "shop_product_images_public_read" on storage.objects for select using (bucket_id = 'shop-product-images');