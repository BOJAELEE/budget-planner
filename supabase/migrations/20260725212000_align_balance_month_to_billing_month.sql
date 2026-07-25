-- A balance entered for July is now applied to the August billing month.
-- Move existing records back one month to preserve their previous billing-month result.
create temporary table shifted_monthly_account_balances on commit drop as
select
  id,
  to_char((year_month || '-01')::date - interval '1 month', 'YYYY-MM') as year_month,
  account_name,
  opening_amount,
  is_manual,
  updated_at
from public.monthly_account_balances;

delete from public.monthly_account_balances;

insert into public.monthly_account_balances (
  id, year_month, account_name, opening_amount, is_manual, updated_at
)
select id, year_month, account_name, opening_amount, is_manual, updated_at
from shifted_monthly_account_balances;
