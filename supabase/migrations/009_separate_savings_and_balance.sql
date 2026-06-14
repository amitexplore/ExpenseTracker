-- ============================================================
-- Migration 009 — Decouple Account Balance from Total Savings
-- 
-- current_savings  = Total Savings pot (user-controlled, goal tracking)
-- account_balance_start = starting point of the Account Balance chain
-- Snapshots now track Account Balance only; Total Savings is untouched.
-- ============================================================

-- Add account_balance_start to profiles
alter table public.profiles
  add column if not exists account_balance_start numeric(14,2) not null default 0;

-- Rewrite recompute_monthly_snapshot:
-- starting balance now seeds from account_balance_start (not current_savings)
create or replace function public.recompute_monthly_snapshot(p_user_id uuid, p_year int, p_month int)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_starting  numeric(14,2);
  v_salary    numeric(14,2);
  v_deposits  numeric(14,2);
  v_fixed     numeric(14,2);
  v_variable  numeric(14,2);
  v_end       numeric(14,2);
  v_acct_start numeric(14,2);
begin
  select monthly_salary, coalesce(account_balance_start, 0)
  into v_salary, v_acct_start
  from public.profiles where id = p_user_id;
  v_salary := coalesce(v_salary, 0);

  -- Chain: most-recent snapshot before this month
  select end_balance into v_starting
  from public.monthly_snapshots
  where user_id = p_user_id
    and (year < p_year or (year = p_year and month < p_month))
  order by year desc, month desc
  limit 1;
  -- Fallback: use account_balance_start (NOT current_savings — that's the savings pot)
  v_starting := coalesce(v_starting, v_acct_start);

  -- Income deposits — exclude Salary-category rows
  select coalesce(sum(t.amount), 0) into v_deposits
  from public.transactions t
  left join public.expense_categories c on c.id = t.category_id
  where t.user_id = p_user_id
    and t.is_income = true
    and (c.id is null or c.name != 'Salary')
    and extract(year  from t.date)::int = p_year
    and extract(month from t.date)::int = p_month;

  -- Fixed expenses
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
  where user_id   = p_user_id
    and active_from <= make_date(p_year, p_month, 1)
    and (active_to is null or active_to >= make_date(p_year, p_month, 1));

  -- Variable expenses (all non-income transactions)
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

-- Update profile trigger to also fire on account_balance_start changes
create or replace function public.trg_recompute_on_profile_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    if old.monthly_salary         is distinct from new.monthly_salary
    or old.account_balance_start  is distinct from new.account_balance_start then
      perform public.recompute_monthly_snapshot(
        new.id,
        extract(year  from current_date)::int,
        extract(month from current_date)::int
      );
    end if;
  exception when others then null;
  end;
  return new;
end;
$$;

-- Re-backfill current month with new logic for all existing users
do $$
declare r record;
begin
  for r in select id from public.profiles loop
    begin
      perform public.recompute_monthly_snapshot(
        r.id,
        extract(year  from current_date)::int,
        extract(month from current_date)::int
      );
    exception when others then null;
    end;
  end loop;
end $$;
