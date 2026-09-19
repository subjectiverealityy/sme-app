-- Credyt debtor statuses: paid, credit, interested.
-- Run once in Supabase SQL editor after the existing schema.

do $$
begin
  alter table public.transactions drop constraint if exists transactions_payment_status_check;
  alter table public.transactions add constraint transactions_payment_status_check
    check (payment_status in ('paid', 'pending', 'credit', 'interested'));
exception
  when duplicate_object then null;
end $$;

-- Existing pending records remain readable as legacy credit in the app.
update public.transactions
set payment_status = 'credit'
where payment_status = 'pending';

alter table public.transactions drop constraint if exists transactions_payment_status_check;
alter table public.transactions add constraint transactions_payment_status_check
  check (payment_status in ('paid', 'credit', 'interested'));
