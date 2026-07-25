-- Existing shared fixed costs become the July input-month baseline, which is
-- applied to the August billing month.
alter table public.fixed_costs
  add column if not exists year_month text not null default '2026-07'
  check (year_month ~ '^\d{4}-\d{2}$');

create index if not exists fixed_costs_year_month_sort_order_idx
  on public.fixed_costs (year_month, sort_order);
