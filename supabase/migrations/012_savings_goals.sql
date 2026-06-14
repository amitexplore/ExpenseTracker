-- Feature: Multiple savings goals
create table if not exists public.savings_goals (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  name           text        not null,
  target_amount  numeric(14,2) not null default 0,
  target_date    date        null,
  current_amount numeric(14,2) not null default 0,
  color          text        not null default '#10b981',
  sort_order     int         not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.savings_goals enable row level security;

create policy "Users manage own savings goals"
  on public.savings_goals for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists savings_goals_user_idx on public.savings_goals(user_id, sort_order);
