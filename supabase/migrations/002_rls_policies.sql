-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- Users can only see and modify their own data
-- ============================================================

alter table public.profiles enable row level security;
alter table public.expense_categories enable row level security;
alter table public.fixed_expenses enable row level security;
alter table public.transactions enable row level security;
alter table public.gmail_connections enable row level security;
alter table public.monthly_snapshots enable row level security;

-- PROFILES
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- EXPENSE CATEGORIES
create policy "Users can view own categories"
  on public.expense_categories for select using (auth.uid() = user_id);
create policy "Users can insert own categories"
  on public.expense_categories for insert with check (auth.uid() = user_id);
create policy "Users can update own categories"
  on public.expense_categories for update using (auth.uid() = user_id);
create policy "Users can delete own categories"
  on public.expense_categories for delete using (auth.uid() = user_id);

-- FIXED EXPENSES
create policy "Users can view own fixed expenses"
  on public.fixed_expenses for select using (auth.uid() = user_id);
create policy "Users can insert own fixed expenses"
  on public.fixed_expenses for insert with check (auth.uid() = user_id);
create policy "Users can update own fixed expenses"
  on public.fixed_expenses for update using (auth.uid() = user_id);
create policy "Users can delete own fixed expenses"
  on public.fixed_expenses for delete using (auth.uid() = user_id);

-- TRANSACTIONS
create policy "Users can view own transactions"
  on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions"
  on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions"
  on public.transactions for update using (auth.uid() = user_id);
create policy "Users can delete own transactions"
  on public.transactions for delete using (auth.uid() = user_id);

-- GMAIL CONNECTIONS
create policy "Users can view own gmail connections"
  on public.gmail_connections for select using (auth.uid() = user_id);
create policy "Users can insert own gmail connections"
  on public.gmail_connections for insert with check (auth.uid() = user_id);
create policy "Users can update own gmail connections"
  on public.gmail_connections for update using (auth.uid() = user_id);
create policy "Users can delete own gmail connections"
  on public.gmail_connections for delete using (auth.uid() = user_id);

-- MONTHLY SNAPSHOTS
create policy "Users can view own monthly snapshots"
  on public.monthly_snapshots for select using (auth.uid() = user_id);
create policy "Service role can manage monthly snapshots"
  on public.monthly_snapshots for all using (auth.role() = 'service_role');
