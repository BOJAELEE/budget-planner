create table if not exists fixed_costs (
  id uuid primary key default gen_random_uuid(),
  payment_method text not null,
  category text not null,
  name text not null,
  amount integer not null check (amount >= 0),
  variability text not null default '고정',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists income_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_amount integer not null check (default_amount >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists monthly_incomes (
  id uuid primary key default gen_random_uuid(),
  year_month text not null check (year_month ~ '^\d{4}-\d{2}$'),
  income_type text not null check (income_type in ('고정수입', '변동수입', '기타수입')),
  template_id uuid references income_templates(id) on delete set null,
  name text not null,
  amount integer not null check (amount >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (year_month, template_id)
);

create table if not exists monthly_card_actuals (
  id uuid primary key default gen_random_uuid(),
  year_month text not null,
  payment_method text not null,
  actual_amount integer not null check (actual_amount >= 0),
  unique (year_month, payment_method)
);

-- 개인용: 익명 키로 접근하되 RLS로 전체 허용(단일 사용자 전제).
alter table fixed_costs enable row level security;
alter table income_templates enable row level security;
alter table monthly_incomes enable row level security;
alter table monthly_card_actuals enable row level security;

create policy "anon all fixed_costs" on fixed_costs for all using (true) with check (true);
create policy "anon all income templates" on income_templates for all using (true) with check (true);
create policy "anon all monthly incomes" on monthly_incomes for all using (true) with check (true);
create policy "anon all actuals" on monthly_card_actuals for all using (true) with check (true);

-- 추가지출(고정비 외 결제를 항목 단위로 기록). created_at 자동.
create table if not exists extra_spendings (
  id uuid primary key default gen_random_uuid(),
  year_month text not null,
  card text not null,
  name text not null,
  amount integer not null check (amount >= 0),
  spent_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- 기존 데이터는 입력 시각을 한국 시간의 실제 사용일로 간주하여 청구월을 다시 계산한다.
alter table extra_spendings add column if not exists spent_on date;
alter table extra_spendings alter column spent_on set default current_date;
update extra_spendings
set spent_on = (created_at at time zone 'Asia/Seoul')::date
where spent_on is null;
update extra_spendings
set year_month = to_char(
  spent_on + make_interval(months => case
    when extract(day from spent_on) <= case card
      when '신한카드' then 16
      when '현대카드' then 19
      when '삼성카드' then 19
      else 19
    end then 1
    else 2
  end),
  'YYYY-MM'
);
alter table extra_spendings alter column spent_on set not null;
alter table extra_spendings enable row level security;
create policy "anon all extra_spendings" on extra_spendings for all using (true) with check (true);

-- 개인용 anon 접근 권한 부여(신규 테이블 포함).
grant usage on schema public to anon, authenticated;
grant all privileges on all tables in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;

-- 잔고 및 월별 부족금액 확정 이력
create table if not exists account_balances (
  id uuid primary key default gen_random_uuid(),
  account_name text not null unique check (account_name in ('월급통장', '비상금통장', '여행통장')),
  amount integer not null default 0 check (amount >= 0),
  sort_order smallint not null unique check (sort_order between 1 and 3),
  updated_at timestamptz not null default now()
);
create table if not exists balance_settlements (
  id uuid primary key default gen_random_uuid(),
  year_month text not null unique check (year_month ~ '^\\d{4}-\\d{2}$'),
  shortage_amount integer not null check (shortage_amount >= 0),
  confirmed_at timestamptz not null default now()
);
create table if not exists balance_settlement_allocations (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references balance_settlements(id) on delete cascade,
  account_name text not null check (account_name in ('월급통장', '비상금통장', '여행통장')),
  amount integer not null check (amount > 0),
  unique (settlement_id, account_name)
);
alter table account_balances enable row level security;
alter table balance_settlements enable row level security;
alter table balance_settlement_allocations enable row level security;
create policy "anon all account balances" on account_balances for all using (true) with check (true);
create policy "anon all balance settlements" on balance_settlements for all using (true) with check (true);
create policy "anon all balance settlement allocations" on balance_settlement_allocations for all using (true) with check (true);

create or replace function confirm_balance_usage(p_year_month text, p_shortage_amount integer)
returns void language plpgsql security invoker set search_path = public as $$
declare
  previous_settlement_id uuid;
  balance_row record;
  allocation_amount integer;
  remaining_amount integer := greatest(coalesce(p_shortage_amount, 0), 0);
  new_settlement_id uuid;
begin
  if p_year_month !~ '^\\d{4}-\\d{2}$' then raise exception 'Invalid year month'; end if;
  select id into previous_settlement_id from balance_settlements where year_month = p_year_month;
  if previous_settlement_id is not null then
    for balance_row in select account_name, amount from balance_settlement_allocations where settlement_id = previous_settlement_id loop
      update account_balances set amount = amount + balance_row.amount, updated_at = now() where account_name = balance_row.account_name;
    end loop;
    delete from balance_settlements where id = previous_settlement_id;
  end if;
  insert into balance_settlements (year_month, shortage_amount) values (p_year_month, remaining_amount) returning id into new_settlement_id;
  for balance_row in select account_name, amount from account_balances order by sort_order for update loop
    exit when remaining_amount = 0;
    allocation_amount := least(balance_row.amount, remaining_amount);
    if allocation_amount > 0 then
      update account_balances set amount = amount - allocation_amount, updated_at = now() where account_name = balance_row.account_name;
      insert into balance_settlement_allocations (settlement_id, account_name, amount) values (new_settlement_id, balance_row.account_name, allocation_amount);
      remaining_amount := remaining_amount - allocation_amount;
    end if;
  end loop;
end;
$$;
revoke execute on function confirm_balance_usage(text, integer) from public;
grant execute on function confirm_balance_usage(text, integer) to anon, authenticated;

create table if not exists monthly_account_balances (
  id uuid primary key default gen_random_uuid(),
  year_month text not null check (year_month ~ '^\\d{4}-\\d{2}$'),
  account_name text not null check (account_name in ('월급통장', '비상금통장', '여행통장')),
  opening_amount integer not null check (opening_amount >= 0),
  is_manual boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (year_month, account_name)
);
alter table monthly_account_balances enable row level security;
create policy "anon all monthly account balances" on monthly_account_balances for all using (true) with check (true);
