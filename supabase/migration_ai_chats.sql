-- Credyt migration: AI chat history
-- Run once in Supabase SQL editor (safe to re-run)

create table if not exists public.ai_chats (
  id text primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null default 'New chat',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ai_chats enable row level security;

drop policy if exists "aichat_owner_select" on public.ai_chats;
create policy "aichat_owner_select" on public.ai_chats for select using (
  exists (select 1 from public.businesses b where b.id = ai_chats.business_id and b.owner_id = auth.uid())
);
drop policy if exists "aichat_owner_insert" on public.ai_chats;
create policy "aichat_owner_insert" on public.ai_chats for insert with check (
  exists (select 1 from public.businesses b where b.id = ai_chats.business_id and b.owner_id = auth.uid())
);
drop policy if exists "aichat_owner_update" on public.ai_chats;
create policy "aichat_owner_update" on public.ai_chats for update using (
  exists (select 1 from public.businesses b where b.id = ai_chats.business_id and b.owner_id = auth.uid())
);
drop policy if exists "aichat_owner_delete" on public.ai_chats;
create policy "aichat_owner_delete" on public.ai_chats for delete using (
  exists (select 1 from public.businesses b where b.id = ai_chats.business_id and b.owner_id = auth.uid())
);
