-- Cota de uso de IA por usuário — defesa de custo REAL e global no serverless
-- (o rate-limit em memória não basta; isto persiste e conta por dia/mês).
-- Rodar no Supabase SQL Editor do projeto.

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  count integer not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own" on public.ai_usage
  for select using (auth.uid() = user_id);

-- Incremento atômico com checagem de limite. SECURITY DEFINER + auth.uid()
-- interno: o caller NÃO escolhe o user_id, então não dá pra fraudar a cota de
-- outra conta. Só incrementa se abaixo dos limites; devolve o estado atual.
create or replace function public.bump_ai_usage(p_daily_limit int, p_monthly_limit int)
returns table(allowed boolean, day_count int, month_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'utc')::date;
  d int;
  m int;
begin
  if uid is null then
    return query select false, 0, 0;
    return;
  end if;

  select coalesce(sum(count), 0) into m
    from public.ai_usage
    where user_id = uid and day >= date_trunc('month', today)::date;

  select coalesce(count, 0) into d
    from public.ai_usage
    where user_id = uid and day = today;

  if d >= p_daily_limit or m >= p_monthly_limit then
    return query select false, d, m;
    return;
  end if;

  insert into public.ai_usage(user_id, day, count)
    values (uid, today, 1)
    on conflict (user_id, day)
    do update set count = public.ai_usage.count + 1
    returning public.ai_usage.count into d;

  select coalesce(sum(count), 0) into m
    from public.ai_usage
    where user_id = uid and day >= date_trunc('month', today)::date;

  return query select true, d, m;
end;
$$;

revoke all on function public.bump_ai_usage(int, int) from public;
grant execute on function public.bump_ai_usage(int, int) to authenticated;
