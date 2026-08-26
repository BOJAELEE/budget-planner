-- Replaces a target month in a single transaction so a failed copy cannot leave
-- the month partially copied or empty.
create or replace function public.replace_fixed_costs_from_previous_month(p_target_year_month text)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_year_month text;
  copied_count integer;
begin
  if p_target_year_month !~ '^\d{4}-\d{2}$' then
    raise exception 'Invalid year month';
  end if;

  source_year_month := to_char(
    (p_target_year_month || '-01')::date - interval '1 month',
    'YYYY-MM'
  );

  delete from public.fixed_costs
  where year_month = p_target_year_month;

  insert into public.fixed_costs (
    year_month, payment_method, category, name, amount, variability, active, sort_order
  )
  select
    p_target_year_month, payment_method, category, name, amount, variability, active, sort_order
  from public.fixed_costs
  where year_month = source_year_month
  order by sort_order, created_at, id;

  get diagnostics copied_count = row_count;
  return copied_count;
end;
$$;

revoke all on function public.replace_fixed_costs_from_previous_month(text) from public;
grant execute on function public.replace_fixed_costs_from_previous_month(text) to anon, authenticated;
