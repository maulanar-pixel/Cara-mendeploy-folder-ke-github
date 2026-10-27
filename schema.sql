-- ============================================================
--  SimpAset — Skema Database Cloud (Supabase / PostgreSQL)
--  Jalankan seluruh file ini di Supabase → SQL Editor → Run
-- ============================================================

-- 1. TABEL USERS (profil publik, melengkapi auth.users)
create table if not exists public.users (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  name         text,
  email        text,
  created_at   timestamptz not null default now()
);
comment on table public.users is 'Data pengguna SimpAset (profil publik)';

-- 2. TABEL CATEGORIES
create table if not exists public.categories (
  category_id  uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(user_id) on delete cascade,
  category_name text not null,
  icon         text default '📦',
  color        text default '#3E7CB1',
  created_at   timestamptz not null default now()
);
create index if not exists idx_categories_user on public.categories(user_id);

-- 3. TABEL ITEMS (inti aplikasi)
create table if not exists public.items (
  item_id       uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(user_id) on delete cascade,
  category_id   uuid references public.categories(category_id) on delete set null,
  item_name     text not null,
  purchase_price numeric(16,2) not null default 0 check (purchase_price >= 0),
  purchase_date  date not null default current_date,
  image_url     text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_items_user on public.items(user_id);
create index if not exists idx_items_cat  on public.items(category_id);

-- ============================================================
--  ROW LEVEL SECURITY — setiap user hanya melihat datanya sendiri
-- ============================================================
alter table public.users       enable row level security;
alter table public.categories  enable row level security;
alter table public.items       enable row level security;

drop policy if exists "users own row" on public.users;
create policy "users own row" on public.users
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "categories own" on public.categories;
create policy "categories own" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "items own" on public.items;
create policy "items own" on public.items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
--  TRIGGER: otomatis buat profil + 6 kategori default saat signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (user_id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.email
  )
  on conflict (user_id) do nothing;

  insert into public.categories (user_id, category_name, icon, color) values
    (new.id, 'Logam Mulia & Perhiasan', '🪙', '#D9B368'),
    (new.id, 'Elektronik & Gadget',     '📱', '#3E7CB1'),
    (new.id, 'Hobi & Koleksi',          '⌚', '#12A594'),
    (new.id, 'Perlengkapan Rumah',      '🛋️', '#8C7BD8'),
    (new.id, 'Dokumen & Sertifikat',    '📜', '#C87941'),
    (new.id, 'Kendaraan',               '🚗', '#5A6B7D');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at otomatis
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists trg_items_touch on public.items;
create trigger trg_items_touch before update on public.items
  for each row execute function public.touch_updated_at();

-- ============================================================
--  STORAGE BUCKET untuk foto barang
-- ============================================================
insert into storage.buckets (id, name, public)
values ('asset-photos', 'asset-photos', true)
on conflict (id) do nothing;

drop policy if exists "foto publik dibaca" on storage.objects;
create policy "foto publik dibaca" on storage.objects
  for select using (bucket_id = 'asset-photos');

drop policy if exists "foto upload milik sendiri" on storage.objects;
create policy "foto upload milik sendiri" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'asset-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "foto hapus milik sendiri" on storage.objects;
create policy "foto hapus milik sendiri" on storage.objects
  for delete to authenticated
  using (bucket_id = 'asset-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
--  QUERY PENJUMLAHAN ASET
-- ============================================================

-- Total seluruh aset pengguna
select coalesce(sum(purchase_price), 0) as total_aset
from public.items
where user_id = auth.uid();

-- Total aset dikelompokkan per kategori (+ jumlah item + persentase)
select
  c.category_name,
  count(i.item_id)                                         as jumlah_item,
  coalesce(sum(i.purchase_price), 0)                        as total_nilai,
  round(100.0 * coalesce(sum(i.purchase_price),0)
        / nullif((select sum(purchase_price) from public.items where user_id = auth.uid()),0), 1) as persentase
from public.categories c
left join public.items i on i.category_id = c.category_id and i.user_id = auth.uid()
where c.user_id = auth.uid()
group by c.category_name, c.category_id
order by total_nilai desc;

-- Total aset per tahun pembelian
select extract(year from purchase_date) as tahun,
       count(*) as jumlah_item,
       sum(purchase_price) as total_nilai
from public.items
where user_id = auth.uid()
group by 1 order by 1 desc;
