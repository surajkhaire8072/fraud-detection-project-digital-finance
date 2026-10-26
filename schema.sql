-- FraudGuard demo backend schema for Supabase
-- Run this in Supabase Dashboard -> SQL Editor -> New query.
-- Educational demo only. Never store card numbers, PINs, passwords, or OTPs.

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  transaction_hour integer not null check (transaction_hour between 0 and 23),
  transactions_last_hour integer not null check (transactions_last_hour between 0 and 100),
  international boolean not null default false,
  risk_score numeric(5,4) not null check (risk_score between 0 and 1),
  review_threshold numeric(5,4) not null check (review_threshold between 0 and 1),
  flagged boolean not null,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

-- Users can only read their own records.
create policy "Users read own transactions"
on public.transactions for select
to authenticated
using (auth.uid() = user_id);

-- Users can only add records under their own account.
create policy "Users insert own transactions"
on public.transactions for insert
to authenticated
with check (auth.uid() = user_id);

-- Users can delete only their own records.
create policy "Users delete own transactions"
on public.transactions for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists transactions_user_created_at_idx
on public.transactions (user_id, created_at desc);
