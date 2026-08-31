begin;

-- BandarLab uses one application-admin session instead of Supabase Auth.
alter table public.radar_entries
  drop constraint if exists radar_entries_owner_id_fkey;
alter table public.external_recommendations
  drop constraint if exists external_recommendations_owner_id_fkey;

create table if not exists public.accumulation_workspaces (
  owner_id uuid primary key,
  initialized_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accumulation_workspaces enable row level security;

create or replace function public.replace_admin_accumulation(
  p_entries jsonb,
  p_recommendations jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_owner constant uuid := '00000000-0000-4000-8000-000000000001';
  entry_count integer := 0;
  recommendation_count integer := 0;
begin
  if jsonb_typeof(coalesce(p_entries, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_recommendations, '[]'::jsonb)) <> 'array' then
    raise exception 'Accumulation payload must contain arrays';
  end if;

  delete from public.external_recommendations where owner_id = admin_owner;
  delete from public.radar_entries where owner_id = admin_owner;

  insert into public.radar_entries (
    owner_id, ticker, status, trend, entry_price, entry_price_source, started_at
  )
  select
    admin_owner, upper(row.ticker), row.status, row.trend,
    row.entry_price, row.entry_price_source, row.started_at
  from jsonb_to_recordset(coalesce(p_entries, '[]'::jsonb)) as row(
    ticker text,
    status text,
    trend text,
    entry_price numeric,
    entry_price_source text,
    started_at date
  );
  get diagnostics entry_count = row_count;

  insert into public.external_recommendations (
    id, owner_id, ticker, source, status, trend, monitored_at,
    entry_price, entry_price_source, note
  )
  select
    row.id, admin_owner, upper(row.ticker), row.source, row.status, row.trend,
    row.monitored_at, row.entry_price, row.entry_price_source, coalesce(row.note, '')
  from jsonb_to_recordset(coalesce(p_recommendations, '[]'::jsonb)) as row(
    id text,
    ticker text,
    source text,
    status text,
    trend text,
    monitored_at date,
    entry_price numeric,
    entry_price_source text,
    note text
  );
  get diagnostics recommendation_count = row_count;

  insert into public.accumulation_workspaces (owner_id)
  values (admin_owner)
  on conflict (owner_id) do update set updated_at = now();

  return jsonb_build_object(
    'entries', entry_count,
    'recommendations', recommendation_count
  );
end;
$$;

revoke all on function public.replace_admin_accumulation(jsonb, jsonb) from public;
revoke all on function public.replace_admin_accumulation(jsonb, jsonb) from anon;
revoke all on function public.replace_admin_accumulation(jsonb, jsonb) from authenticated;
grant execute on function public.replace_admin_accumulation(jsonb, jsonb) to service_role;

commit;
