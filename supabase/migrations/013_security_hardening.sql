-- ============================================================
-- Migration 013 — Security hardening
--
-- 1. Adds caller-identity check to recompute_monthly_snapshot
-- 2. Revokes EXECUTE on the function from 'anon' role
-- 3. Adds non-negative / positive CHECK constraints to financial columns
-- 4. Drops the overly-broad service_role ALL policy on monthly_snapshots
-- ============================================================

-- ── 1. Secure recompute_monthly_snapshot ──────────────────────────────────────
-- auth.uid() is set when called via PostgREST (authenticated user session).
-- It is NULL when called from a DB trigger (no HTTP request context) — allowed.
create or replace function public.recompute_monthly_snapshot(p_user_id uuid, p_year int, p_month int)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_starting   numeric(14,2);
  v_salary     numeric(14,2);
  v_deposits   numeric(14,2);
  v_fixed      numeric(14,2);
  v_variable   numeric(14,2);
  v_end        numeric(14,2);
  v_acct_start numeric(14,2);
begin
  -- Security guard: authenticated callers may only recompute their own data
  if auth.uid() is not null and auth.uid() != p_user_id then
    raise exception 'Forbidden: you can only recompute your own snapshots'
      using errcode = '42501';
  end if;

  select monthly_salary, coalesce(account_balance_start, 0)
  into v_salary, v_acct_start
  from public.profiles where id = p_user_id;
  v_salary := coalesce(v_salary, 0);

  select end_balance into v_starting
  from public.monthly_snapshots
  where user_id = p_user_id
    and (year < p_year or (year = p_year and month < p_month))
  order by year desc, month desc
  limit 1;
  v_starting := coalesce(v_starting, v_acct_start);

  select coalesce(sum(t.amount), 0) into v_deposits
  from public.transactions t
  left join public.expense_categories c on c.id = t.category_id
  where t.user_id = p_user_id
    and t.is_income = true
    and (c.id is null or c.name != 'Salary')
    and extract(year  from t.date)::int = p_year
    and extract(month from t.date)::int = p_month;

  select coalesce(sum(
    case
      when frequency = 'monthly'  then amount
      when frequency = 'yearly'   then amount / 12.0
      when frequency = 'one_time' then
        case when extract(year  from active_from)::int = p_year
              and extract(month from active_from)::int = p_month
             then amount else 0 end
      else 0
    end
  ), 0) into v_fixed
  from public.fixed_expenses
  where user_id = p_user_id
    and date_trunc('month', active_from) <= make_date(p_year, p_month, 1)
    and (active_to is null
         or date_trunc('month', active_to) >= make_date(p_year, p_month, 1));

  select coalesce(sum(t.amount), 0) into v_variable
  from public.transactions t
  where t.user_id  = p_user_id
    and t.is_income = false
    and extract(year  from t.date)::int = p_year
    and extract(month from t.date)::int = p_month;

  v_end := v_starting + v_salary + v_deposits - v_fixed - v_variable;

  insert into public.monthly_snapshots
    (user_id, year, month, starting_balance, salary,
     total_deposits, total_fixed_expenses, total_variable_expenses,
     end_balance, computed_at)
  values
    (p_user_id, p_year, p_month, v_starting, v_salary,
     v_deposits, v_fixed, v_variable, v_end, now())
  on conflict (user_id, year, month) do update set
    starting_balance        = excluded.starting_balance,
    salary                  = excluded.salary,
    total_deposits          = excluded.total_deposits,
    total_fixed_expenses    = excluded.total_fixed_expenses,
    total_variable_expenses = excluded.total_variable_expenses,
    end_balance             = excluded.end_balance,
    computed_at             = excluded.computed_at;
end;
$$;

-- ── 2. Restrict EXECUTE permissions ──────────────────────────────────────────
revoke execute on function public.recompute_monthly_snapshot(uuid, int, int) from anon;
grant  execute on function public.recompute_monthly_snapshot(uuid, int, int) to authenticated;

-- ── 3. Financial column CHECK constraints ────────────────────────────────────
-- Wrapped in DO blocks so re-running the migration is safe.
do $$ begin
  alter table public.profiles add constraint profiles_salary_nonneg check (monthly_salary >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles add constraint profiles_savings_nonneg check (current_savings >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles add constraint profiles_balance_nonneg check (account_balance_start >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles add constraint profiles_target_nonneg check (target_amount >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.transactions add constraint transactions_amount_positive check (amount > 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.fixed_expenses add constraint fixed_expenses_amount_positive check (amount > 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.savings_goals add constraint savings_goals_target_positive check (target_amount > 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.savings_goals add constraint savings_goals_current_nonneg check (current_amount >= 0);
exception when duplicate_object then null; end $$;

-- ── 4. Remove overly-broad service_role ALL policy on monthly_snapshots ───────
-- SECURITY DEFINER functions bypass RLS, so the trigger path does not need
-- a catch-all service_role policy.
drop policy if exists "Service role can manage monthly snapshots" on public.monthly_snapshots;
