-- Clear automatically copied fixed-cost months. July remains the baseline
-- and later months are created only when the user chooses "copy previous month".
delete from public.fixed_costs
where year_month <> '2026-07';
