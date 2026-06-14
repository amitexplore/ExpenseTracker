-- ============================================================================
-- 014 — Performance Indexes
-- ============================================================================
-- Enable pg_trgm for fast ILIKE / full-text merchant + description searches
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── expense_categories ───────────────────────────────────────────────────────
-- Queried by user_id + sort_order on every dashboard + settings load
CREATE INDEX IF NOT EXISTS idx_expense_categories_user_sort
  ON public.expense_categories(user_id, sort_order);

-- ── transactions — trigram (ILIKE search) ────────────────────────────────────
-- Transactions search uses merchant.ilike and description.ilike.
-- Without a GIN trigram index every search does a full table scan.
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_trgm
  ON public.transactions USING gin(merchant gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_transactions_description_trgm
  ON public.transactions USING gin(description gin_trgm_ops);

-- ── monthly_snapshots — narrow by year ───────────────────────────────────────
-- Dashboard queries snapshots for a single year; existing index covers
-- (user_id, year DESC, month DESC) which handles ORDER BY well, but adding a
-- covering index that includes commonly-read columns avoids heap fetches.
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_covering
  ON public.monthly_snapshots(user_id, year, month)
  INCLUDE (starting_balance, total_income, total_expenses, end_balance);

-- ── savings_goals ─────────────────────────────────────────────────────────────
-- Queried on dashboard load and SavingsGoalsList; sort_order used for ordering.
-- Existing idx covers (user_id, sort_order); ensure created_at secondary sort
-- is also fast for the ORDER BY created_at fallback.
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_created
  ON public.savings_goals(user_id, created_at DESC);

-- ── fixed_expenses — partial index for active records ────────────────────────
-- Most queries only care about active (active_to IS NULL) expenses.
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_user_active
  ON public.fixed_expenses(user_id, active_from)
  WHERE active_to IS NULL;

-- ── transactions — composite covering index for dashboard year queries ────────
-- Dashboard fetches all transactions for a year: user_id + date range.
-- Include amount, is_income, category_id to allow index-only scans.
CREATE INDEX IF NOT EXISTS idx_transactions_user_year_covering
  ON public.transactions(user_id, date DESC)
  INCLUDE (amount, is_income, category_id, merchant, description);
