-- Planos e billing. Rodar no Supabase SQL Editor.
-- subscriptions: estado do plano do usuário (escrita só via service role / webhook).
-- usage: contador de carrosséis gerados por período (YYYY-MM).

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  plano text not null check (plano in ('essencial', 'profissional')),
  status text not null check (status in ('trial', 'active', 'canceled', 'past_due')),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  gateway_subscription_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "user vê só a própria subscription" on public.subscriptions;
create policy "user vê só a própria subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create index if not exists subscriptions_user_status_idx
  on public.subscriptions (user_id, status);

create table if not exists public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  periodo text not null, -- formato: '2026-06'
  carrosseis_gerados integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, periodo)
);

alter table public.usage enable row level security;

drop policy if exists "user vê só o próprio uso" on public.usage;
create policy "user vê só o próprio uso"
  on public.usage for select
  using (auth.uid() = user_id);
