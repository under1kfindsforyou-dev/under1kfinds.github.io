-- =========================================================
-- UNDER1KFINDS — Supabase setup script
-- ---------------------------------------------------------
-- Run this ONCE, in full, in your Supabase project's
-- SQL Editor (left sidebar → SQL Editor → New query → paste
-- all of this → Run).
-- =========================================================

-- 1. The products table -----------------------------------
create table if not exists products (
  id bigint generated always as identity primary key,
  name text not null,
  image text,
  price numeric not null,
  mrp numeric,
  discount numeric,
  description text,
  category text[] not null default '{}',
  rating numeric,
  reviews integer,
  affiliate_link text not null,
  featured boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Turn on Row Level Security -----------------------------
-- (this is what stops strangers from editing your products,
-- even though the anon key is public)
alter table products enable row level security;

-- 3. Anyone can READ products that are not hidden -----------
create policy "public can view visible products"
on products for select
to anon, authenticated
using (hidden = false);

-- 4. A logged-in admin can READ every product, including
--    hidden ones (needed so the dashboard can manage them)
create policy "admin can view all products"
on products for select
to authenticated
using (true);

-- 5. Only a logged-in admin can add, edit, or delete products
create policy "admin can insert products"
on products for insert
to authenticated
with check (true);

create policy "admin can update products"
on products for update
to authenticated
using (true)
with check (true);

create policy "admin can delete products"
on products for delete
to authenticated
using (true);

-- 6. Storage bucket for product images -----------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "public can view product images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'product-images');

create policy "admin can upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images');

create policy "admin can replace product images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images');

create policy "admin can delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images');

-- =========================================================
-- Done. Next steps (in the Supabase dashboard, not SQL):
--  1. Authentication → Providers → Email → turn OFF
--     "Allow new users to sign up" (so only you can log in).
--  2. Authentication → Users → Add user → create your own
--     admin email + password. This is the ONLY account that
--     will ever be able to log into /admin.
-- =========================================================
