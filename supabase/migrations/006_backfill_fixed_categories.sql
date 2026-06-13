-- Step 1: Remove duplicate categories (keep the one with the lowest sort_order / earliest id)
delete from public.expense_categories
where id not in (
  select distinct on (user_id, name) id
  from public.expense_categories
  order by user_id, name, sort_order asc, created_at asc
);

-- Step 2: Add unique constraint now that duplicates are gone
alter table public.expense_categories
  add constraint uq_expense_categories_user_name unique (user_id, name);

-- Step 3: Insert every default category for every user (idempotent via ON CONFLICT)
do $$
declare
  r record;
begin
  for r in select id from public.profiles loop
    insert into public.expense_categories (user_id, name, type, color, icon, is_system, sort_order)
    values (r.id, 'Salary',            'income',   '#22c55e', 'briefcase',       true, 1)
    on conflict (user_id, name) do nothing;

    insert into public.expense_categories (user_id, name, type, color, icon, is_system, sort_order)
    values (r.id, 'Home Loan / EMI',   'fixed',    '#f97316', 'home',            true, 2)
    on conflict (user_id, name) do nothing;

    insert into public.expense_categories (user_id, name, type, color, icon, is_system, sort_order)
    values (r.id, 'Credit Card',       'fixed',    '#ef4444', 'credit-card',     true, 3)
    on conflict (user_id, name) do nothing;

    insert into public.expense_categories (user_id, name, type, color, icon, is_system, sort_order)
    values (r.id, 'RD / Investment',   'savings',  '#3b82f6', 'piggy-bank',      true, 4)
    on conflict (user_id, name) do nothing;

    insert into public.expense_categories (user_id, name, type, color, icon, is_system, sort_order)
    values (r.id, 'School Fees',       'fixed',    '#a855f7', 'graduation-cap',  true, 5)
    on conflict (user_id, name) do nothing;

    insert into public.expense_categories (user_id, name, type, color, icon, is_system, sort_order)
    values (r.id, 'Groceries',         'variable', '#84cc16', 'shopping-cart',   true, 6)
    on conflict (user_id, name) do nothing;

    insert into public.expense_categories (user_id, name, type, color, icon, is_system, sort_order)
    values (r.id, 'Amazon',            'variable', '#f59e0b', 'package',         true, 7)
    on conflict (user_id, name) do nothing;

    insert into public.expense_categories (user_id, name, type, color, icon, is_system, sort_order)
    values (r.id, 'Blinkit',           'variable', '#fde047', 'zap',             true, 8)
    on conflict (user_id, name) do nothing;

    insert into public.expense_categories (user_id, name, type, color, icon, is_system, sort_order)
    values (r.id, 'Zepto',             'variable', '#818cf8', 'shopping-bag',    true, 9)
    on conflict (user_id, name) do nothing;

    insert into public.expense_categories (user_id, name, type, color, icon, is_system, sort_order)
    values (r.id, 'Misc',              'variable', '#94a3b8', 'more-horizontal', true, 10)
    on conflict (user_id, name) do nothing;

    insert into public.expense_categories (user_id, name, type, color, icon, is_system, sort_order)
    values (r.id, 'Bonus',             'income',   '#f59e0b', 'gift',            true, 0)
    on conflict (user_id, name) do nothing;
  end loop;
end $$;

-- Step 4: Update handle_new_user to seed all categories on signup
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
  perform public.seed_default_categories(new.id);
  insert into public.expense_categories (user_id, name, type, color, icon, is_system, sort_order)
  values (new.id, 'Bonus', 'income', '#f59e0b', 'gift', true, 0)
  on conflict (user_id, name) do nothing;
  return new;
end;
$$;
