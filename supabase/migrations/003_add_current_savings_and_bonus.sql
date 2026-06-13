-- Add current savings to profiles
alter table public.profiles
  add column if not exists current_savings numeric(14,2) not null default 0;

-- Add Bonus as a default income category
-- (safe to run multiple times due to ON CONFLICT)
insert into public.expense_categories (id, user_id, name, type, color, icon, is_system, sort_order)
select
  gen_random_uuid(),
  p.id,
  'Bonus',
  'income',
  '#f59e0b',
  'gift',
  true,
  0
from public.profiles p
where not exists (
  select 1 from public.expense_categories ec
  where ec.user_id = p.id and ec.name = 'Bonus'
);

-- Update recompute_monthly_snapshot to include current_savings in starting balance for first month
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
  v_current_savings numeric(14,2);
begin
  -- Get current_savings from profile (starting capital)
  select monthly_salary, current_savings
  into v_salary, v_current_savings
  from public.profiles where id = p_user_id;

  v_salary := coalesce(v_salary, 0);
  v_current_savings := coalesce(v_current_savings, 0);

  -- Determine previous month
  if p_month = 1 then
    v_prev_year := p_year - 1;
    v_prev_month := 12;
  else
    v_prev_year := p_year;
    v_prev_month := p_month - 1;
  end if;

  -- Starting balance = end balance of previous month (or current_savings if no previous month)
  select coalesce(end_balance, null) into v_starting
  from public.monthly_snapshots
  where user_id = p_user_id and year = v_prev_year and month = v_prev_month;

  -- If no previous month exists, use current_savings as starting balance
  v_starting := coalesce(v_starting, v_current_savings);

  -- Extra deposits (non-salary income transactions including bonuses)
  select coalesce(sum(amount), 0) into v_deposits
  from public.transactions t
  where t.user_id = p_user_id
    and t.is_income = true
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
