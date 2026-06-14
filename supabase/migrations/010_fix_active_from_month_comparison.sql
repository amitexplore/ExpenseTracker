-- ============================================================
-- Migration 010 — Fix fixed expense active_from date comparison
--
-- Previously: active_from <= first_day_of_month
-- This excluded expenses that start mid-month (e.g. active_from = June 14
-- would not appear in June since June 14 > June 1).
--
-- Fix: truncate both sides to the month level so any expense that STARTS
-- in month M is included for month M and all subsequent months.
-- ============================================================

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

  -- Fixed expenses: compare at MONTH level so mid-month active_from is included
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
    -- Expense starts in or before this month
    and date_trunc('month', active_from) <= make_date(p_year, p_month, 1)
    -- Expense has not ended before this month
    and (active_to is null
         or date_trunc('month', active_to) >= make_date(p_year, p_month, 1));

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

-- Backfill current month for all users with the corrected logic
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
