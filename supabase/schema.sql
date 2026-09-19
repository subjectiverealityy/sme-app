-- Ledgerly Supabase schema
-- Run in Supabase SQL editor

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Businesses
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'Other',
  phone text,
  location text,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  description text not null,
  amount numeric(14,2) not null check (amount >= 0),
  category text not null default 'Other',
  transaction_date date not null default current_date,
  payment_status text not null default 'paid' check (payment_status in ('paid','pending','credit')),
  payment_method text,
  customer_or_vendor text,
  notes text,
  source text not null default 'manual' check (source in ('manual','ocr')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_txn_business_date on public.transactions(business_id, transaction_date desc);

-- Categories (system + custom)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income','expense')),
  created_at timestamptz default now(),
  unique(business_id, name, type)
);

-- Scanned records
create table if not exists public.scanned_records (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  image_url text,
  status text not null default 'processing' check (status in ('processing','completed','needs_review','failed')),
  extracted_data jsonb,
  created_at timestamptz default now(),
  processed_at timestamptz
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.transactions enable row level security;
alter table public.categories enable row level security;
alter table public.scanned_records enable row level security;

-- Helper: business ids owned by current user
-- Policies

-- profiles: user can read/update own
drop policy if exists "profiles_owner" on public.profiles;
create policy "profiles_owner" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- businesses: owner only
drop policy if exists "businesses_owner" on public.businesses;
create policy "businesses_owner" on public.businesses
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- transactions: only if business owned by user
drop policy if exists "txn_owner_select" on public.transactions;
create policy "txn_owner_select" on public.transactions for select using (
  exists (select 1 from public.businesses b where b.id = transactions.business_id and b.owner_id = auth.uid())
);
drop policy if exists "txn_owner_insert" on public.transactions;
create policy "txn_owner_insert" on public.transactions for insert with check (
  exists (select 1 from public.businesses b where b.id = transactions.business_id and b.owner_id = auth.uid())
);
drop policy if exists "txn_owner_update" on public.transactions;
create policy "txn_owner_update" on public.transactions for update using (
  exists (select 1 from public.businesses b where b.id = transactions.business_id and b.owner_id = auth.uid())
);
drop policy if exists "txn_owner_delete" on public.transactions;
create policy "txn_owner_delete" on public.transactions for delete using (
  exists (select 1 from public.businesses b where b.id = transactions.business_id and b.owner_id = auth.uid())
);

-- categories
drop policy if exists "cat_select" on public.categories;
create policy "cat_select" on public.categories for select using (
  business_id is null or exists (select 1 from public.businesses b where b.id = categories.business_id and b.owner_id = auth.uid())
);
drop policy if exists "cat_mod" on public.categories;
create policy "cat_mod" on public.categories for all using (
  business_id is not null and exists (select 1 from public.businesses b where b.id = categories.business_id and b.owner_id = auth.uid())
) with check (
  business_id is not null and exists (select 1 from public.businesses b where b.id = categories.business_id and b.owner_id = auth.uid())
);

-- scanned_records
drop policy if exists "scan_owner_select" on public.scanned_records;
create policy "scan_owner_select" on public.scanned_records for select using (
  exists (select 1 from public.businesses b where b.id = scanned_records.business_id and b.owner_id = auth.uid())
);
drop policy if exists "scan_owner_insert" on public.scanned_records;
create policy "scan_owner_insert" on public.scanned_records for insert with check (
  exists (select 1 from public.businesses b where b.id = scanned_records.business_id and b.owner_id = auth.uid())
);
drop policy if exists "scan_owner_update" on public.scanned_records;
create policy "scan_owner_update" on public.scanned_records for update using (
  exists (select 1 from public.businesses b where b.id = scanned_records.business_id and b.owner_id = auth.uid())
);

-- Storage bucket for scans (create via dashboard or SQL)
-- insert into storage.buckets (id, name, public) values ('scans','scans', false)
-- on conflict do nothing;
-- create policy "scans_owner" on storage.objects for all using (bucket_id='scans' and auth.uid()::text = (storage.foldername(name))[1]) with check (bucket_id='scans' and auth.uid()::text = (storage.foldername(name))[1]);

-- Seed default categories (system, business_id null)
insert into public.categories (business_id, name, type) values
  (null, 'Sales', 'income'), (null, 'Services', 'income'), (null, 'Other', 'income'),
  (null, 'Inventory / Stock', 'expense'), (null, 'Transportation', 'expense'),
  (null, 'Salaries', 'expense'), (null, 'Rent', 'expense'), (null, 'Utilities', 'expense'),
  (null, 'Marketing', 'expense'), (null, 'Equipment', 'expense'), (null, 'Food', 'expense'),
  (null, 'Packaging', 'expense'), (null, 'Internet / Data', 'expense'), (null, 'Taxes', 'expense'),
  (null, 'Other', 'expense')
on conflict do nothing;
