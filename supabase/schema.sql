-- Marcas (perfis de identidade visual por usuário)
create table if not exists public.marcas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  nome text not null default 'Minha Marca',
  config jsonb not null default '{}'::jsonb,
  ativo boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.marcas enable row level security;

create policy "users see own marcas" on public.marcas
  for all using (auth.uid() = user_id);

-- Carrosseis por usuário
create table if not exists public.carrosseis (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  marca_id uuid references public.marcas(id) on delete set null,
  tema text not null default '',
  slides jsonb not null default '[]'::jsonb,
  criado_em bigint not null default extract(epoch from now())::bigint,
  updated_at timestamptz default now()
);

alter table public.carrosseis enable row level security;

create policy "users see own carrosseis" on public.carrosseis
  for all using (auth.uid() = user_id);

-- Trigger para updated_at automático
create or replace function public.set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger marcas_updated_at before update on public.marcas
  for each row execute function public.set_updated_at();

create trigger carrosseis_updated_at before update on public.carrosseis
  for each row execute function public.set_updated_at();
