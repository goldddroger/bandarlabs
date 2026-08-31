begin;

alter table public.best_entry_alerts
  drop constraint if exists best_entry_alerts_owner_id_fkey;

create table if not exists public.fca_watch_records (
  owner_id uuid not null,
  ticker text not null references public.stocks(ticker) on delete cascade,
  company_name text not null,
  watched_at timestamptz not null,
  last_known_active boolean not null,
  last_known_criteria smallint[] not null default '{}',
  alert_type text check (alert_type in ('entered', 'exited', 'criteria_changed')),
  alert_message text,
  alert_created_at timestamptz,
  alert_unread boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, ticker)
);

create table if not exists public.notification_workspaces (
  owner_id uuid primary key,
  initialized_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fca_watch_records_owner_unread_idx
  on public.fca_watch_records(owner_id, alert_unread);

drop trigger if exists fca_watch_records_set_updated_at on public.fca_watch_records;
create trigger fca_watch_records_set_updated_at
  before update on public.fca_watch_records
  for each row execute function public.set_updated_at();

alter table public.fca_watch_records enable row level security;
alter table public.notification_workspaces enable row level security;

create or replace function public.replace_admin_notifications(
  p_best_entries jsonb,
  p_fca_watches jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_owner constant uuid := '00000000-0000-4000-8000-000000000001';
  best_entry_count integer := 0;
  fca_watch_count integer := 0;
begin
  if jsonb_typeof(coalesce(p_best_entries, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_fca_watches, '[]'::jsonb)) <> 'array' then
    raise exception 'Notification payload must contain arrays';
  end if;

  delete from public.best_entry_alerts where owner_id = admin_owner;
  delete from public.fca_watch_records where owner_id = admin_owner;

  insert into public.best_entry_alerts (
    owner_id, ticker, entry_price, last_fired_value, updated_at
  )
  select
    admin_owner, upper(row.ticker), row.entry_price,
    row.last_fired_value, coalesce(row.updated_at, now())
  from jsonb_to_recordset(coalesce(p_best_entries, '[]'::jsonb)) as row(
    ticker text,
    entry_price numeric,
    last_fired_value text,
    updated_at timestamptz
  );
  get diagnostics best_entry_count = row_count;

  insert into public.fca_watch_records (
    owner_id, ticker, company_name, watched_at, last_known_active,
    last_known_criteria, alert_type, alert_message, alert_created_at, alert_unread
  )
  select
    admin_owner, upper(row.ticker), row.company_name, row.watched_at,
    row.last_known_active, coalesce(row.last_known_criteria, '{}'),
    row.alert_type, row.alert_message, row.alert_created_at,
    coalesce(row.alert_unread, false)
  from jsonb_to_recordset(coalesce(p_fca_watches, '[]'::jsonb)) as row(
    ticker text,
    company_name text,
    watched_at timestamptz,
    last_known_active boolean,
    last_known_criteria smallint[],
    alert_type text,
    alert_message text,
    alert_created_at timestamptz,
    alert_unread boolean
  );
  get diagnostics fca_watch_count = row_count;

  insert into public.notification_workspaces (owner_id)
  values (admin_owner)
  on conflict (owner_id) do update set updated_at = now();

  return jsonb_build_object(
    'bestEntries', best_entry_count,
    'fcaWatches', fca_watch_count
  );
end;
$$;

revoke all on function public.replace_admin_notifications(jsonb, jsonb) from public;
revoke all on function public.replace_admin_notifications(jsonb, jsonb) from anon;
revoke all on function public.replace_admin_notifications(jsonb, jsonb) from authenticated;
grant execute on function public.replace_admin_notifications(jsonb, jsonb) to service_role;

commit;
