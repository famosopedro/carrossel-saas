-- Chaves de API do próprio usuário (BYOK) p/ geração de imagem. Criptografadas
-- em repouso (AES-256-GCM, ver lib/crypto.ts). Rodar no Supabase SQL Editor.

create table if not exists public.user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null check (provider in ('gemini', 'openai')),
  encrypted_key text not null,
  is_valid boolean default null,
  last_tested_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider)
);

alter table public.user_api_keys enable row level security;

drop policy if exists "user vê só as próprias keys" on public.user_api_keys;
create policy "user vê só as próprias keys"
  on public.user_api_keys for select
  using (auth.uid() = user_id);

drop policy if exists "user insere só as próprias keys" on public.user_api_keys;
create policy "user insere só as próprias keys"
  on public.user_api_keys for insert
  with check (auth.uid() = user_id);

drop policy if exists "user atualiza só as próprias keys" on public.user_api_keys;
create policy "user atualiza só as próprias keys"
  on public.user_api_keys for update
  using (auth.uid() = user_id);

drop policy if exists "user deleta só as próprias keys" on public.user_api_keys;
create policy "user deleta só as próprias keys"
  on public.user_api_keys for delete
  using (auth.uid() = user_id);
