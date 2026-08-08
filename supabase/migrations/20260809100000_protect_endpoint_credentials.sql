-- Endpoint credentials: make the column unreadable through the client API.
--
-- `endpoints.auth_config` holds bearer tokens, API keys and basic-auth
-- passwords for customers' own production APIs. RLS is row-scoped, so every
-- policy that let a member see an endpoint also let them read its secrets --
-- including VIEWER, the role the UI presents as read-only. Column privileges
-- are the only mechanism that separates "can see the endpoint" from "can read
-- the credential".
--
-- The application encrypts the value before it is ever written (AES-256-GCM,
-- key held outside the database in ENDPOINT_SECRET_KEY), so this grant is the
-- second of two layers, not the only one.
--
-- Existing plaintext rows are intentionally left alone: the key lives in the
-- app, not in Postgres, so they cannot be encrypted from SQL. They are read
-- back as legacy plaintext and re-sealed the next time the endpoint is saved.

revoke select on public.endpoints from authenticated;

grant select (
  id,
  workspace_id,
  name,
  url,
  method,
  environment,
  tags,
  description,
  health,
  auth_type,
  headers,
  timeout_ms,
  last_checked_at,
  response_time,
  baseline_version,
  breaking_count,
  warning_count,
  diff_mode,
  response_schema,
  created_at,
  updated_at
) on public.endpoints to authenticated;

-- INSERT/UPDATE on auth_config stay granted: members must be able to *set* a
-- credential, they just must not be able to read one back. Write-only is the
-- correct shape for a secret field.

comment on column public.endpoints.auth_config is
  'AES-256-GCM sealed credential envelope written by the app. Not selectable by the authenticated role; service role only.';
