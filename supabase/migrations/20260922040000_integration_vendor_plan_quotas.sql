/*
 * Re-price for integration platforms.
 *
 * Every tier's monthly check quota now covers hourly monitoring of that tier's
 * own endpoint limit (endpoints x 720). Before this, Pro allowed 100 endpoints
 * but only 25,000 checks — enough for 34 endpoints hourly — so the headline
 * limit was unreachable at the frequency the product is sold on.
 *
 * Adds `scale` (300 endpoints / 250,000 checks) for companies monitoring the
 * third-party APIs they depend on but do not control.
 *
 * This function is the ENFORCEMENT point. src/lib/plans.ts only renders; if the
 * two disagree, the database wins and the UI lies. Keep them in step.
 */
create or replace function public.plan_check_quota(plan_name text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(plan_name, 'free'))
    when 'starter' then 20000
    when 'pro' then 80000
    when 'scale' then 250000
    when 'team' then null
    else 250
  end;
$$;
