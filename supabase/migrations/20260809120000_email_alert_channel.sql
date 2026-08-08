-- Email alert channel: destination verification.
--
-- An alert channel is an arbitrary address supplied by a user, and the product
-- sends mail to it on our domain's reputation. Without a confirmation step that
-- is an open relay: anyone with an account could point a channel at a stranger
-- and have us deliver to them. So an EMAIL channel is inert until the address
-- itself has confirmed.

alter table public.alert_configs
  add column if not exists verified_at timestamptz;

comment on column public.alert_configs.verified_at is
  'EMAIL channels only: when the destination address confirmed. NULL means alerts are withheld.';

create table if not exists public.alert_channel_verifications (
  alert_config_id uuid primary key
    references public.alert_configs (id) on delete cascade,
  email text not null,
  -- Stored hashed: the raw token is a bearer credential that grants
  -- confirmation, and a leaked table should not hand that over.
  token_hash text not null,
  sent_at timestamptz not null default now(),
  expires_at timestamptz not null,
  verified_at timestamptz
);

create index if not exists alert_channel_verifications_expiry_idx
  on public.alert_channel_verifications (expires_at)
  where verified_at is null;

alter table public.alert_channel_verifications enable row level security;
-- No policies on purpose: only the service role touches this table. The
-- confirmation link carries its own authorisation.
