-- ============================================================
-- Auto-recompute monthly snapshots on data changes
-- All trigger functions are SECURITY DEFINER so they can write
-- to monthly_snapshots regardless of the calling user's RLS.
-- Errors are caught so they never block the originating write.
-- ============================================================

-- Trigger function: fires after any INSERT/UPDATE/DELETE on transactions
create or replace function public.trg_recompute_on_transaction_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    if tg_op = 'DELETE' then
      perform public.recompute_monthly_snapshot(
        old.user_id,
        extract(year  from old.date)::int,
        extract(month from old.date)::int
      );
    else
      perform public.recompute_monthly_snapshot(
        new.user_id,
        extract(year  from new.date)::int,
        extract(month from new.date)::int
      );
      -- If the date changed, also recompute the old month
      if tg_op = 'UPDATE' and old.date <> new.date then
        perform public.recompute_monthly_snapshot(
          old.user_id,
          extract(year  from old.date)::int,
          extract(month from old.date)::int
        );
      end if;
    end if;
  exception when others then
    -- Never let snapshot errors block the transaction write
    null;
  end;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_transactions_recompute_snapshot on public.transactions;
create trigger trg_transactions_recompute_snapshot
  after insert or update or delete on public.transactions
  for each row execute function public.trg_recompute_on_transaction_change();

-- Trigger function: fires after any INSERT/UPDATE/DELETE on fixed_expenses
create or replace function public.trg_recompute_on_fixed_expense_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_year    int;
  v_month   int;
begin
  begin
    v_user_id := coalesce(new.user_id, old.user_id);
    v_year    := extract(year  from current_date)::int;
    v_month   := extract(month from current_date)::int;
    perform public.recompute_monthly_snapshot(v_user_id, v_year, v_month);
  exception when others then
    null;
  end;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_fixed_expenses_recompute_snapshot on public.fixed_expenses;
create trigger trg_fixed_expenses_recompute_snapshot
  after insert or update or delete on public.fixed_expenses
  for each row execute function public.trg_recompute_on_fixed_expense_change();

-- Back-fill: recompute current month snapshot for all existing users right now
do $$
declare
  r record;
begin
  for r in select id from public.profiles loop
    begin
      perform public.recompute_monthly_snapshot(
        r.id,
        extract(year  from current_date)::int,
        extract(month from current_date)::int
      );
    exception when others then
      null;
    end;
  end loop;
end $$;
