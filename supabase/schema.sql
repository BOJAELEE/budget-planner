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

create table if not exists incomes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount integer not null check (amount >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
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
alter table incomes enable row level security;
alter table monthly_card_actuals enable row level security;

create policy "anon all fixed_costs" on fixed_costs for all using (true) with check (true);
create policy "anon all incomes" on incomes for all using (true) with check (true);
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
