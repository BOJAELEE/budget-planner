create table if not exists income_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
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

alter table income_templates enable row level security;
alter table monthly_incomes enable row level security;
create policy "anon all income templates" on income_templates for all using (true) with check (true);
create policy "anon all monthly incomes" on monthly_incomes for all using (true) with check (true);
grant all privileges on income_templates, monthly_incomes to anon, authenticated;

insert into income_templates (name, default_amount, active) values
  ('월급', 5400000, true),
  ('아동수당', 105000, true)
on conflict (name) do update
set default_amount = excluded.default_amount, active = excluded.active;

insert into monthly_incomes (year_month, income_type, name, amount, active)
select
  to_char(created_at at time zone 'Asia/Seoul', 'YYYY-MM'),
  '기타수입',
  name,
  amount,
  active
from incomes
where name in ('비상금 통장에서 뺌', '여행 통장에서 뺌');
