alter table public.extra_spendings
  add column if not exists is_settled boolean not null default false;
