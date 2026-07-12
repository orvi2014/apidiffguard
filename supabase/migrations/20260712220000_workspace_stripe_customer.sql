-- Add Stripe customer id for workspace billing (Checkout + Customer Portal).
alter table public.workspaces
  add column if not exists stripe_customer_id text;

create unique index if not exists workspaces_stripe_customer_id_key
  on public.workspaces (stripe_customer_id)
  where stripe_customer_id is not null;
