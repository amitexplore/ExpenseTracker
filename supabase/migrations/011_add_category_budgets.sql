-- Feature: Budget limits per category
alter table public.expense_categories
  add column if not exists monthly_budget numeric(14,2) null;

comment on column public.expense_categories.monthly_budget is
  'Optional monthly spending limit for this category. null = no limit set.';
