-- Workspace por usuário: guarda perfis de marca + carrosséis num único blob jsonb.
-- Espelha exatamente o que hoje vive no localStorage, para migração 1:1 sem perda.
-- (Substitui o uso das tabelas marcas/carrosseis órfãs; elas podem ficar.)

create table if not exists public.workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.workspaces enable row level security;

drop policy if exists "own workspace" on public.workspaces;
create policy "own workspace" on public.workspaces
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists workspaces_updated_at on public.workspaces;
create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();
