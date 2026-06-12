-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  monthly_salary numeric(14,2) not null default 0,
  target_amount numeric(14,2) not null default 0,
  target_date date,
  currency text not null default 'INR',
  sync_interval_minutes int not null default 60 check (sync_interval_minutes >= 15),
  subscription_tier text not null default 'free' check (subscription_tier in ('free','pro','team')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- EXPENSE CATEGORIES
-- ============================================================
create table public.expense_categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type text not null check (type in ('fixed','variable','income','savings')),
  color text not null default '#94a3b8',
  icon text,
  is_system boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- FIXED EXPENSES
-- ============================================================
create table public.fixed_expenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.expense_categories(id) on delete restrict,
  name text not null,
  amount numeric(14,2) not null check (amount > 0),
  frequency text not null default 'monthly' check (frequency in ('monthly','yearly','one_time')),
  active_from date not null default current_date,
  active_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.expense_categories(id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  date date not null,
  merchant text,
  description text,
  source text not null default 'manual' check (source in ('gmail','manual','bank_sms')),
  raw_email_id text,
  is_income boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, raw_email_id)
);

-- ============================================================
-- GMAIL CONNECTIONS
-- ============================================================
create table public.gmail_connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  gmail_address text not null,
  access_token text not null,
  refresh_token text not null,
  token_expiry timestamptz not null,
  last_synced_at timestamptz,
  sync_status text not null default 'idle' check (sync_status in ('idle','syncing','error')),
  error_message text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, gmail_address)
);

-- ============================================================
-- MONTHLY SNAPSHOTS (pre-computed for dashboard performance)
-- ============================================================
create table public.monthly_snapshots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  starting_balance numeric(14,2) not null default 0,
  salary numeric(14,2) not null default 0,
  total_deposits numeric(14,2) not null default 0,
  total_fixed_expenses numeric(14,2) not null default 0,
  total_variable_expenses numeric(14,2) not null default 0,
  end_balance numeric(14,2) not null default 0,
  computed_at timestamptz not null default now(),
  unique (user_id, year, month)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_transactions_user_date on public.transactions(user_id, date desc);
create index idx_transactions_user_category on public.transactions(user_id, category_id);
create index idx_monthly_snapshots_user_year on public.monthly_snapshots(user_id, year desc, month desc);
create index idx_fixed_expenses_user on public.fixed_expenses(user_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger trg_fixed_expenses_updated_at before update on public.fixed_expenses
  for each row execute function public.handle_updated_at();
create trigger trg_transactions_updated_at before update on public.transactions
  for each row execute function public.handle_updated_at();
create trigger trg_gmail_connections_updated_at before update on public.gmail_connections
  for each row execute function public.handle_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGN UP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- INSERT DEFAULT CATEGORIES FOR NEW USER
-- ============================================================
create or replace function public.seed_default_categories(p_user_id uuid)
returns void language plpgsql as $$
begin
  insert into public.expense_categories (user_id, name, type, color, icon, is_system, sort_order) values
    (p_user_id, 'Salary',            'income',   '#22c55e', 'briefcase',      true, 1),
    (p_user_id, 'Home Loan / EMI',   'fixed',    '#f97316', 'home',           true, 2),
    (p_user_id, 'Credit Card',       'fixed',    '#ef4444', 'credit-card',    true, 3),
    (p_user_id, 'RD / Investment',   'savings',  '#3b82f6', 'piggy-bank',     true, 4),
    (p_user_id, 'School Fees',       'fixed',    '#a855f7', 'graduation-cap', true, 5),
    (p_user_id, 'Groceries',         'variable', '#84cc16', 'shopping-cart',  true, 6),
    (p_user_id, 'Amazon',            'variable', '#f59e0b', 'package',        true, 7),
    (p_user_id, 'Blinkit',           'variable', '#fde047', 'zap',            true, 8),
    (p_user_id, 'Zepto',             'variable', '#818cf8', 'shopping-bag',   true, 9),
    (p_user_id, 'Misc',              'variable', '#94a3b8', 'more-horizontal',true, 10);
end;
$$;

-- ============================================================
-- RECOMPUTE MONTHLY SNAPSHOT FUNCTION
-- ============================================================
create or replace function public.recompute_monthly_snapshot(p_user_id uuid, p_year int, p_month int)
returns void language plpgsql as $$
declare
  v_starting numeric(14,2) := 0;
  v_salary numeric(14,2);
  v_deposits numeric(14,2);
  v_fixed numeric(14,2);
  v_variable numeric(14,2);
  v_end numeric(14,2);
  v_prev_year int;
  v_prev_month int;
begin
  -- Determine previous month
  if p_month = 1 then
    v_prev_year := p_year - 1;
    v_prev_month := 12;
  else
    v_prev_year := p_year;
    v_prev_month := p_month - 1;
  end if;

  -- Starting balance = end balance of previous month
  select coalesce(end_balance, 0) into v_starting
  from public.monthly_snapshots
  where user_id = p_user_id and year = v_prev_year and month = v_prev_month;

  v_starting := coalesce(v_starting, 0);

  -- Salary from profile
  select monthly_salary into v_salary from public.profiles where id = p_user_id;
  v_salary := coalesce(v_salary, 0);

  -- Extra deposits (non-salary income transactions)
  select coalesce(sum(amount), 0) into v_deposits
  from public.transactions t
  join public.expense_categories c on c.id = t.category_id
  where t.user_id = p_user_id
    and t.is_income = true
    and c.name != 'Salary'
    and extract(year from t.date) = p_year
    and extract(month from t.date) = p_month;

  -- Fixed expenses (from fixed_expenses table)
  select coalesce(sum(
    case when frequency = 'monthly' then amount
         when frequency = 'yearly' then amount / 12
         else 0 end
  ), 0) into v_fixed
  from public.fixed_expenses
  where user_id = p_user_id
    and active_from <= make_date(p_year, p_month, 1)
    and (active_to is null or active_to >= make_date(p_year, p_month, 1));

  -- Variable expenses (from transactions)
  select coalesce(sum(t.amount), 0) into v_variable
  from public.transactions t
  join public.expense_categories c on c.id = t.category_id
  where t.user_id = p_user_id
    and t.is_income = false
    and c.type = 'variable'
    and extract(year from t.date) = p_year
    and extract(month from t.date) = p_month;

  v_end := v_starting + v_salary + v_deposits - v_fixed - v_variable;

  insert into public.monthly_snapshots
    (user_id, year, month, starting_balance, salary, total_deposits,
     total_fixed_expenses, total_variable_expenses, end_balance, computed_at)
  values
    (p_user_id, p_year, p_month, v_starting, v_salary, v_deposits,
     v_fixed, v_variable, v_end, now())
  on conflict (user_id, year, month) do update set
    starting_balance = excluded.starting_balance,
    salary = excluded.salary,
    total_deposits = excluded.total_deposits,
    total_fixed_expenses = excluded.total_fixed_expenses,
    total_variable_expenses = excluded.total_variable_expenses,
    end_balance = excluded.end_balance,
    computed_at = excluded.computed_at;
end;
$$;
