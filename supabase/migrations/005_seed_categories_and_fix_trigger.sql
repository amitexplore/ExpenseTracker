-- Fix 1: Seed default categories for all existing users who have none
-- (safe to run multiple times — only inserts where missing)
do $$
declare
  r record;
begin
  for r in select id from public.profiles loop
    if not exists (
      select 1 from public.expense_categories where user_id = r.id
    ) then
      perform public.seed_default_categories(r.id);
    end if;
  end loop;
end $$;

-- Also ensure the Bonus income category exists for all users
insert into public.expense_categories (id, user_id, name, type, color, icon, is_system, sort_order)
select gen_random_uuid(), p.id, 'Bonus', 'income', '#f59e0b', 'gift', true, 0
from public.profiles p
where not exists (
  select 1 from public.expense_categories ec
  where ec.user_id = p.id and ec.name = 'Bonus'
);

-- Fix 2: Update handle_new_user trigger to also seed categories on signup
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
  -- Seed default expense categories for the new user
  perform public.seed_default_categories(new.id);
  -- Seed Bonus income category
  insert into public.expense_categories (user_id, name, type, color, icon, is_system, sort_order)
  values (new.id, 'Bonus', 'income', '#f59e0b', 'gift', true, 0);
  return new;
end;
$$;
