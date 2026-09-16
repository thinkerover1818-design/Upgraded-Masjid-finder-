-- 0020: shop categories and stock-safe orders.
create table shop_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into shop_categories (name, slug, description, sort_order) values
  ('Books & Qurans', 'books', 'Quran, tafsir and Islamic learning materials.', 1),
  ('Prayer Essentials', 'prayer', 'Prayer mats, caps, tasbih and everyday essentials.', 2),
  ('Islamic Gifts', 'gifts', 'Thoughtful gifts for family, teachers and community.', 3),
  ('Modest Wear', 'modest-wear', 'Modest clothing and accessories.', 4)
on conflict (slug) do nothing;

insert into subscription_plans (name, description, price, currency, duration_days, enquiry_limit, boost_duration_days, scope, benefits, sort_order)
values
  ('Community Boost', 'Improve your listing visibility within your country for 30 days.', 0, 'USD', 30, 20, 30, 'country', '{"boost_score": 10, "featured": false}', 10),
  ('Featured Reach', 'Featured placement and boosted visibility for 30 days.', 0, 'USD', 30, 50, 30, 'global', '{"boost_score": 20, "featured": true}', 11)
on conflict do nothing;

create table shop_orders (
  id uuid primary key default uuid_generate_v4(),
  buyer_profile_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','confirmed','fulfilled','cancelled')),
  total numeric(10,2) not null check (total >= 0),
  currency text not null check (char_length(currency) = 3),
  shipping_name text not null,
  shipping_contact text not null,
  shipping_address text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_shop_orders_buyer on shop_orders (buyer_profile_id, created_at desc);

create table shop_order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references shop_orders(id) on delete cascade,
  product_id uuid not null references shop_products(id),
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  product_name text not null
);

alter table shop_categories enable row level security;
create policy "shop_categories_public_read" on shop_categories for select using (is_active);
create policy "shop_categories_admin_write" on shop_categories for all using (is_admin());

alter table shop_orders enable row level security;
create policy "shop_orders_buyer_read" on shop_orders for select using (buyer_profile_id = auth.uid());
create policy "shop_orders_admin_all" on shop_orders for all using (is_admin());

alter table shop_order_items enable row level security;
create policy "shop_order_items_buyer_read" on shop_order_items for select using (
  exists (select 1 from shop_orders o where o.id = order_id and o.buyer_profile_id = auth.uid())
);
create policy "shop_order_items_admin_all" on shop_order_items for all using (is_admin());

create or replace function fn_create_shop_order(
  p_items jsonb,
  p_shipping_name text,
  p_shipping_contact text,
  p_shipping_address text
) returns uuid as $$
declare
  v_order_id uuid;
  v_total numeric(10,2) := 0;
  v_currency text;
  v_item jsonb;
  v_product shop_products%rowtype;
  v_quantity int;
begin
  if auth.uid() is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A signed-in buyer and at least one product are required';
  end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := greatest(1, (v_item->>'quantity')::int);
    select * into v_product from shop_products where id = (v_item->>'productId')::uuid and is_active for update;
    if not found or v_product.stock < v_quantity then raise exception 'A product is unavailable or out of stock'; end if;
    if v_currency is null then v_currency := v_product.currency; elsif v_currency <> v_product.currency then raise exception 'Products must use one currency per order'; end if;
    v_total := v_total + (v_product.price * v_quantity);
  end loop;
  insert into shop_orders (buyer_profile_id, total, currency, shipping_name, shipping_contact, shipping_address)
    values (auth.uid(), v_total, v_currency, trim(p_shipping_name), trim(p_shipping_contact), trim(p_shipping_address)) returning id into v_order_id;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := greatest(1, (v_item->>'quantity')::int);
    select * into v_product from shop_products where id = (v_item->>'productId')::uuid for update;
    insert into shop_order_items (order_id, product_id, quantity, unit_price, product_name)
      values (v_order_id, v_product.id, v_quantity, v_product.price, v_product.name);
    update shop_products set stock = stock - v_quantity, updated_at = now() where id = v_product.id;
  end loop;
  return v_order_id;
end;
$$ language plpgsql security definer set search_path = public;