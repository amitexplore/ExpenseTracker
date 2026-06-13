-- Fix: recompute_monthly_snapshot must run as SECURITY DEFINER
-- so it can write to monthly_snapshots (RLS only allows service_role writes).
-- We also add a missing INSERT/UPDATE policy for authenticated users so
-- direct writes from the app also work.

-- 1. Allow authenticated users to insert/update their own snapshots directly
create policy "Users can insert own monthly snapshots"
  on public.monthly_snapshots for insert with check (auth.uid() = user_id);

create policy "Users can update own monthly snapshots"
  on public.monthly_snapshots for update using (auth.uid() = user_id);

-- 2. Recreate the function as SECURITY DEFINER so it can always write snapshots
create or replace function public.recompute_monthly_snapshot(p_user_id uuid, p_year int, p_month int)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_starting  numeric(14,2) := 0;
  v_salary    numeric(14,2);
  v_deposits  numeric(14,2);
  v_fixed     numeric(14,2);
  v_variable  numeric(14,2);
  v_end       numeric(14,2);
  v_prev_year  int;
  v_prev_month int;
  v_current_savings numeric(14,2);
begin
  -- Salary + current_savings from profile
  select monthly_salary, coalesce(current_savings, 0)
  into v_salary, v_current_savings
  from public.profiles where id = p_user_id;

  v_salary := coalesce(v_salary, 0);

  -- Previous month
  if p_month = 1 then
    v_prev_year  := p_year - 1;
    v_prev_month := 12;
  else
    v_prev_year  := p_year;
    v_prev_month := p_month - 1;
  end if;

  -- Starting balance = previous month end_balance, or current_savings if none
  select end_balance into v_starting
  from public.monthly_snapshots
  where user_id = p_user_id and year = v_prev_year and month = v_prev_month;

  v_starting := coalesce(v_starting, v_current_savings);

  -- All income transactions (bonuses, etc.) — no category join needed
  select coalesce(sum(amount), 0) into v_deposits
  from public.transactions
  where user_id = p_user_id
    and is_income = true
    and extract(year  from date)::int = p_year
    and extract(month from date)::int = p_month;

  -- Fixed expenses
  select coalesce(sum(
    case when frequency = 'monthly'  then amount
         when frequency = 'yearly'   then amount / 12
         else 0 end
  ), 0) into v_fixed
  from public.fixed_expenses
  where user_id  = p_user_id
    and active_from <= make_date(p_year, p_month, 1)
    and (active_to is null or active_to >= make_date(p_year, p_month, 1));

  -- Variable expenses
  select coalesce(sum(t.amount), 0) into v_variable
  from public.transactions t
  join public.expense_categories c on c.id = t.category_id
  where t.user_id = p_user_id
    and t.is_income = false
    and c.type = 'variable'
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
    starting_balance      = excluded.starting_balance,
    salary                = excluded.salary,
    total_deposits        = excluded.total_deposits,
    total_fixed_expenses  = excluded.total_fixed_expenses,
    total_variable_expenses = excluded.total_variable_expenses,
    end_balance           = excluded.end_balance,
    computed_at           = excluded.computed_at;
end;
$$;
