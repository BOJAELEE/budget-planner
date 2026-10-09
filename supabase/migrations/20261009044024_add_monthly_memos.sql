create table public.monthly_memos (
  year_month text primary key check (year_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  content text not null default '' check (char_length(content) <= 10000)
);

alter table public.monthly_memos enable row level security;
-- Preserve the existing shared, login-free application access model.
create policy "shared monthly memos" on public.monthly_memos
  for all to anon, authenticated using (true) with check (true);
revoke all on public.monthly_memos from anon, authenticated;
grant select, insert, update, delete on public.monthly_memos to anon, authenticated;
