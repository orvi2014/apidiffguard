-- Polar billing.
--
-- Polar is a merchant of record: it collects the money, handles VAT and sales
-- tax, and remits. That is the reason to reach for it over raw Stripe for a
-- product sold internationally by one person -- the tax handling is the
-- feature, not the payment rails.
--
-- Stripe support is left in place. Which provider is live is decided by which
-- environment variables are configured, so this is additive and reversible
-- rather than a migration off Stripe.

alter table public.workspaces
  add column if not exists polar_customer_id text,
  add column if not exists polar_subscription_id text;

comment on column public.workspaces.polar_customer_id is
  'Polar customer id. Set on first checkout; the customer portal needs it.';

create index if not exists workspaces_polar_customer_idx
  on public.workspaces (polar_customer_id)
  where polar_customer_id is not null;

/*
 * Webhook idempotency, provider-agnostic.
 *
 * Same reasoning as stripe_events: providers retry on any non-2xx and can
 * deliver out of order, so an event has to be claimed exactly once and stale
 * events dropped. Keyed on (provider, event_id) so a second provider cannot
 * collide with the first.
 */
create table if not exists public.billing_events (
  provider text not null,
  event_id text not null,
  type text not null,
  object_id text,
  event_created_at timestamptz not null,
  processed_at timestamptz not null default now(),
  primary key (provider, event_id)
);

create index if not exists billing_events_object_idx
  on public.billing_events (provider, object_id, event_created_at desc);

alter table public.billing_events enable row level security;
-- No policies: service role only.
