begin;

create table if not exists public.fca_episodes (
  id bigint generated always as identity primary key,
  ticker text not null references public.stocks(ticker) on delete cascade,
  company_name text not null,
  entered_at date not null,
  exited_at date,
  criteria smallint[] not null check (cardinality(criteria) > 0),
  source_date date not null,
  created_at timestamptz not null default now(),
  unique (ticker, entered_at)
);

create table if not exists public.fca_status_changes (
  id bigint generated always as identity primary key,
  ticker text not null references public.stocks(ticker) on delete cascade,
  change_type text not null check (change_type in ('entered', 'exited', 'criteria_changed')),
  event_date date not null,
  previous_criteria smallint[],
  current_criteria smallint[],
  detected_at timestamptz not null default now(),
  unique nulls not distinct (ticker, change_type, event_date, previous_criteria, current_criteria)
);

create table if not exists public.fca_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_date date not null,
  source_file text not null,
  row_count integer not null check (row_count > 0),
  created_at timestamptz not null default now()
);

create index if not exists fca_episodes_status_idx on public.fca_episodes(exited_at, entered_at desc);
create index if not exists fca_episodes_ticker_idx on public.fca_episodes(ticker, entered_at desc);
create index if not exists fca_status_changes_detected_idx on public.fca_status_changes(detected_at desc);

alter table public.fca_episodes enable row level security;
alter table public.fca_status_changes enable row level security;
alter table public.fca_import_runs enable row level security;

create policy "FCA episodes are readable" on public.fca_episodes for select using (true);
create policy "FCA changes are readable" on public.fca_status_changes for select using (true);

create or replace function public.replace_fca_episodes(p_source_date date, p_rows jsonb, p_source_file text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row_count integer;
  v_previous_count integer;
begin
  if p_source_date is null or nullif(btrim(p_source_file), '') is null then
    raise exception 'Tanggal dan nama file sumber wajib diisi.';
  end if;
  if coalesce(jsonb_typeof(p_rows), 'null') <> 'array' then
    raise exception 'Payload FCA harus berupa array.';
  end if;
  v_row_count := jsonb_array_length(p_rows);
  if v_row_count < 1 or v_row_count > 5000 then
    raise exception 'Jumlah baris FCA harus antara 1 dan 5000.';
  end if;

  create temp table fca_previous_active on commit drop as
    select ticker, criteria from public.fca_episodes where exited_at is null;
  select count(*) into v_previous_count from public.fca_episodes;

  insert into public.stocks (ticker, name, updated_at)
  select upper(btrim(item.ticker)), max(btrim(item.company_name)), now()
  from jsonb_to_recordset(p_rows) as item(ticker text, company_name text)
  group by upper(btrim(item.ticker))
  on conflict (ticker) do update set name = excluded.name, updated_at = now();

  delete from public.fca_episodes;
  insert into public.fca_episodes (ticker, company_name, entered_at, exited_at, criteria, source_date)
  select upper(btrim(item.ticker)), btrim(item.company_name), item.entered_at, item.exited_at, item.criteria, p_source_date
  from jsonb_to_recordset(p_rows) as item(
    ticker text, company_name text, entered_at date, exited_at date, criteria smallint[], source_date date
  )
  where nullif(btrim(item.ticker), '') is not null
    and nullif(btrim(item.company_name), '') is not null
    and item.entered_at is not null
    and cardinality(item.criteria) > 0;

  if v_previous_count > 0 then
    insert into public.fca_status_changes (ticker, change_type, event_date, previous_criteria, current_criteria)
    select current_row.ticker, 'entered', current_row.entered_at, null, current_row.criteria
    from public.fca_episodes current_row
    left join fca_previous_active previous_row on previous_row.ticker = current_row.ticker
    where current_row.exited_at is null and previous_row.ticker is null
    on conflict do nothing;

    insert into public.fca_status_changes (ticker, change_type, event_date, previous_criteria, current_criteria)
    select previous_row.ticker, 'exited', max(current_row.exited_at), previous_row.criteria, null
    from fca_previous_active previous_row
    join public.fca_episodes current_row on current_row.ticker = previous_row.ticker
    where not exists (select 1 from public.fca_episodes active_row where active_row.ticker = previous_row.ticker and active_row.exited_at is null)
    group by previous_row.ticker, previous_row.criteria
    on conflict do nothing;

    insert into public.fca_status_changes (ticker, change_type, event_date, previous_criteria, current_criteria)
    select current_row.ticker, 'criteria_changed', p_source_date, previous_row.criteria, current_row.criteria
    from public.fca_episodes current_row
    join fca_previous_active previous_row on previous_row.ticker = current_row.ticker
    where current_row.exited_at is null and previous_row.criteria is distinct from current_row.criteria
    on conflict do nothing;
  end if;

  insert into public.fca_import_runs (source_date, source_file, row_count)
  values (p_source_date, left(btrim(p_source_file), 255), v_row_count);

  return jsonb_build_object('importedCount', v_row_count, 'sourceDate', p_source_date);
end;
$$;

revoke all on function public.replace_fca_episodes(date, jsonb, text) from public, anon, authenticated;
grant execute on function public.replace_fca_episodes(date, jsonb, text) to service_role;

commit;
