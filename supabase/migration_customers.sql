-- Credyt migration: customer follow-ups
-- Run once in Supabase SQL editor (safe to re-run).
-- Adds optional customer phone (for WhatsApp links) and promise/due date
-- to transactions. No new tables; customers are derived from transactions.

alter table public.transactions
  add column if not exists customer_phone text;

alter table public.transactions
  add column if not exists due_date date;
