-- ============================================================
-- Migration 008 — Comprehensive snapshot + calculation fixes
-- ============================================================

-- FIX 1: recompute_monthly_snapshot
-- (a) Snapshot chain: find most-recent prior snapshot, not just exact prev month
-- (b) Salary double-count: exclude Salary-category income from v_deposits
-- (c) one_time expenses: apply full amount in the month of active_from
create or replace function public.recompute_monthly_snapshot(p_user_id uuid, p_year int, p_month int)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_starting  numeric(14,2);
  v_salary    numeric(14,2);
  v_deposits  numeric(14,2);
  v_fixed     numeric(14,2);
  v_variable  numeric(14,2);
  v_end       numeric(14,2);
  v_current_savings numeric(14,2);
begin
  -- Salary + current_savings from profile
  select monthly_salary, coalesce(current_savings, 0)
  into v_salary, v_current_savings
  from public.profiles where id = p_user_id;
  v_salary := coalesce(v_salary, 0);

  -- Chain fix: find the most-recent snapshot BEFORE this month (any gap is OK)
  select end_balance into v_starting
  from public.monthly_snapshots
  where user_id = p_user_id
    and (year < p_year or (year = p_year and month < p_month))
  order by year desc, month desc
  limit 1;
  v_starting := coalesce(v_starting, v_current_savings);

  -- Income deposits — exclude Salary-category rows (already counted in v_salary)
  select coalesce(sum(t.amount), 0) into v_deposits
  from public.transactions t
  left join public.expense_categories c on c.id = t.category_id
  where t.user_id = p_user_id
    and t.is_income = true
    and (c.id is null or c.name != 'Salary')
    and extract(year  from t.date)::int = p_year
    and extract(month from t.date)::int = p_month;

  -- Fixed expenses (monthly, yearly prorated, one_time in active_from month)
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

-- FIX 2: Profile trigger — recompute current month when salary or current_savings changes
create or replace function public.trg_recompute_on_profile_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    if old.monthly_salary is distinct from new.monthly_salary
    or old.current_savings is distinct from new.current_savings then
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

drop trigger if exists trg_profile_recompute_snapshot on public.profiles;
create trigger trg_profile_recompute_snapshot
  after update on public.profiles
  for each row execute function public.trg_recompute_on_profile_change();

-- FIX 3: Fixed-expense trigger — also recompute the month of active_from
create or replace function public.trg_recompute_on_fixed_expense_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_user_id  uuid;
  v_from     date;
begin
  begin
    v_user_id := coalesce(new.user_id, old.user_id);
    v_from    := coalesce(new.active_from, old.active_from);

    -- Always recompute current month
    perform public.recompute_monthly_snapshot(
      v_user_id,
      extract(year  from current_date)::int,
      extract(month from current_date)::int
    );

    -- Also recompute the month the expense becomes active (may be in the past)
    if v_from is not null
    and (extract(year  from v_from)::int != extract(year  from current_date)::int
      or extract(month from v_from)::int != extract(month from current_date)::int)
    then
      perform public.recompute_monthly_snapshot(
        v_user_id,
        extract(year  from v_from)::int,
        extract(month from v_from)::int
      );
    end if;
  exception when others then null;
  end;
  return coalesce(new, old);
end;
$$;

-- Re-run backfill with the fixed function
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
