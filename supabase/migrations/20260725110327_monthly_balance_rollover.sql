create table public.monthly_account_balances (
  id uuid primary key default gen_random_uuid(),
  year_month text not null check (year_month ~ '^\\d{4}-\\d{2}$'),
  account_name text not null check (account_name in ('월급통장', '비상금통장', '여행통장')),
  opening_amount integer not null check (opening_amount >= 0),
  is_manual boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (year_month, account_name)
);

with latest_settlement as (
  select id, year_month from public.balance_settlements order by confirmed_at desc limit 1
), settlement_allocations as (
  select allocation.account_name, allocation.amount
  from public.balance_settlement_allocations allocation
  join latest_settlement settlement on settlement.id = allocation.settlement_id
)
insert into public.monthly_account_balances (year_month, account_name, opening_amount, is_manual)
select
  coalesce((select year_month from latest_settlement), to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM')),
  balance.account_name,
  balance.amount + coalesce(allocation.amount, 0),
  true
from public.account_balances balance
left join settlement_allocations allocation on allocation.account_name = balance.account_name
on conflict (year_month, account_name) do nothing;

alter table public.monthly_account_balances enable row level security;
create policy "anon all monthly account balances" on public.monthly_account_balances
  for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on public.monthly_account_balances to anon, authenticated;
