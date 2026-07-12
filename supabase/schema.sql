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
