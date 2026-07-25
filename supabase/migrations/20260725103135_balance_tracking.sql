create table public.account_balances (
  id uuid primary key default gen_random_uuid(),
  account_name text not null unique check (account_name in ('월급통장', '비상금통장', '여행통장')),
  amount integer not null default 0 check (amount >= 0),
  sort_order smallint not null unique check (sort_order between 1 and 3),
  updated_at timestamptz not null default now()
);

create table public.balance_settlements (
  id uuid primary key default gen_random_uuid(),
  year_month text not null unique check (year_month ~ '^\\d{4}-\\d{2}$'),
  shortage_amount integer not null check (shortage_amount >= 0),
  confirmed_at timestamptz not null default now()
);

create table public.balance_settlement_allocations (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.balance_settlements(id) on delete cascade,
  account_name text not null check (account_name in ('월급통장', '비상금통장', '여행통장')),
  amount integer not null check (amount > 0),
  unique (settlement_id, account_name)
);

insert into public.account_balances (account_name, amount, sort_order) values
  ('월급통장', 0, 1),
  ('비상금통장', 0, 2),
  ('여행통장', 0, 3)
on conflict (account_name) do nothing;

alter table public.account_balances enable row level security;
alter table public.balance_settlements enable row level security;
alter table public.balance_settlement_allocations enable row level security;

create policy "anon all account balances" on public.account_balances for all to anon, authenticated using (true) with check (true);
create policy "anon all balance settlements" on public.balance_settlements for all to anon, authenticated using (true) with check (true);
create policy "anon all balance settlement allocations" on public.balance_settlement_allocations for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.account_balances, public.balance_settlements, public.balance_settlement_allocations to anon, authenticated;

create or replace function public.confirm_balance_usage(p_year_month text, p_shortage_amount integer)
returns void
language plpgsql
security invoker
as $$
declare
  previous_settlement_id uuid;
  balance_row record;
  allocation_amount integer;
  remaining_amount integer := greatest(coalesce(p_shortage_amount, 0), 0);
  new_settlement_id uuid;
begin
  if p_year_month !~ '^\\d{4}-\\d{2}$' then
    raise exception 'Invalid year month';
  end if;

  select id into previous_settlement_id
  from public.balance_settlements
  where year_month = p_year_month;

  if previous_settlement_id is not null then
    for balance_row in
      select account_name, amount
      from public.balance_settlement_allocations
      where settlement_id = previous_settlement_id
    loop
      update public.account_balances
      set amount = amount + balance_row.amount, updated_at = now()
      where account_name = balance_row.account_name;
    end loop;
    delete from public.balance_settlements where id = previous_settlement_id;
  end if;

  insert into public.balance_settlements (year_month, shortage_amount)
  values (p_year_month, remaining_amount)
  returning id into new_settlement_id;

  for balance_row in
    select account_name, amount
    from public.account_balances
    order by sort_order
    for update
  loop
    exit when remaining_amount = 0;
    allocation_amount := least(balance_row.amount, remaining_amount);
    if allocation_amount > 0 then
      update public.account_balances
      set amount = amount - allocation_amount, updated_at = now()
      where account_name = balance_row.account_name;
      insert into public.balance_settlement_allocations (settlement_id, account_name, amount)
      values (new_settlement_id, balance_row.account_name, allocation_amount);
      remaining_amount := remaining_amount - allocation_amount;
    end if;
  end loop;
end;
$$;

revoke execute on function public.confirm_balance_usage(text, integer) from public;
grant execute on function public.confirm_balance_usage(text, integer) to anon, authenticated;
