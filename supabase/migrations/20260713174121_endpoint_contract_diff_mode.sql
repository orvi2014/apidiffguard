-- Endpoint contract + drift mode for schema-aware checks
alter table public.endpoints
  add column if not exists response_schema jsonb,
  add column if not exists diff_mode text not null default 'schema';

comment on column public.endpoints.response_schema is
  'Optional OpenAPI/JSON Schema for the primary success response body';
comment on column public.endpoints.diff_mode is
  'schema = ignore leaf value churn; full = include value changes';

alter table public.endpoints
  drop constraint if exists endpoints_diff_mode_check;

alter table public.endpoints
  add constraint endpoints_diff_mode_check
  check (diff_mode in ('schema', 'full'));
