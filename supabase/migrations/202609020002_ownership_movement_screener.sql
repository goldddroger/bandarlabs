begin;

create index if not exists shareholder_ownership_threshold_date_idx
  on public.shareholder_ownership(disclosure_threshold, report_date desc, ticker);

create or replace function public.ownership_available_dates(p_threshold smallint)
returns table(snapshot_date date)
language sql
stable
security definer
set search_path = public
as $$
  select distinct ownership.report_date as snapshot_date
  from public.shareholder_ownership ownership
  where ownership.disclosure_threshold = p_threshold
  order by snapshot_date desc
  limit 24;
$$;

create or replace function public.ownership_movement_screener(
  p_threshold smallint,
  p_current_date date,
  p_previous_date date,
  p_search text default '',
  p_scope text default 'all',
  p_movement text default 'all',
  p_sort text default 'change_desc',
  p_page integer default 1,
  p_page_size integer default 25
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with current_snapshot as (
    select *
    from public.shareholder_ownership
    where disclosure_threshold = p_threshold and report_date = p_current_date
  ),
  previous_snapshot as (
    select *
    from public.shareholder_ownership
    where disclosure_threshold = p_threshold and report_date = p_previous_date
  ),
  compared as (
    select
      coalesce(current_row.id, -previous_row.id) as id,
      concat_ws('|', coalesce(current_row.ticker, previous_row.ticker), upper(coalesce(current_row.investor_name, previous_row.investor_name)), upper(coalesce(current_row.account_holder, previous_row.account_holder, ''))) as row_key,
      coalesce(current_row.ticker, previous_row.ticker) as ticker,
      p_threshold as disclosure_threshold,
      coalesce(current_row.issuer_name, previous_row.issuer_name) as issuer_name,
      coalesce(current_row.investor_name, previous_row.investor_name) as investor_name,
      coalesce(current_row.account_holder, previous_row.account_holder) as account_holder,
      coalesce(current_row.classification, previous_row.classification) as classification,
      coalesce(current_row.local_foreign, previous_row.local_foreign) as local_foreign,
      coalesce(current_row.nationality, previous_row.nationality) as nationality,
      coalesce(current_row.domicile, previous_row.domicile) as domicile,
      coalesce(current_row.shares, 0) as shares,
      coalesce(current_row.percentage, 0) as percentage,
      p_current_date as report_date,
      previous_row.shares as previous_shares,
      previous_row.percentage as previous_percentage,
      case when previous_row.id is null then null else coalesce(current_row.shares, 0) - previous_row.shares end as share_change,
      case when previous_row.id is null then null else coalesce(current_row.percentage, 0) - previous_row.percentage end as percentage_change,
      case
        when current_row.id is null then 'exited'
        when previous_row.id is null then 'new'
        when current_row.shares = previous_row.shares then 'stable'
        when current_row.shares > previous_row.shares then 'increased'
        else 'decreased'
      end as movement
    from current_snapshot current_row
    full outer join previous_snapshot previous_row
      on current_row.ticker = previous_row.ticker
     and upper(btrim(current_row.investor_name)) = upper(btrim(previous_row.investor_name))
     and upper(coalesce(btrim(current_row.account_holder), '')) = upper(coalesce(btrim(previous_row.account_holder), ''))
  ),
  scoped as (
    select *
    from compared
    where (
      p_scope = 'all'
      or (p_scope = 'A' and coalesce(local_foreign, '') in ('A', 'F'))
      or (p_scope = 'L' and local_foreign = 'L')
    )
    and (
      coalesce(btrim(p_search), '') = ''
      or lower(concat_ws(' ', investor_name, account_holder, ticker, issuer_name)) like '%' || lower(btrim(p_search)) || '%'
    )
  ),
  counts as (
    select
      count(*) filter (where movement = 'new') as new_count,
      count(*) filter (where movement = 'increased') as increased_count,
      count(*) filter (where movement = 'stable') as stable_count,
      count(*) filter (where movement = 'decreased') as decreased_count,
      count(*) filter (where movement = 'exited') as exited_count
    from scoped
  ),
  movement_filtered as (
    select * from scoped where p_movement = 'all' or movement = p_movement
  ),
  ordered as (
    select
      movement_filtered.*,
      row_number() over (
        order by
          case when p_sort = 'change_asc' then share_change end asc nulls last,
          case when p_sort = 'percentage' then percentage end desc nulls last,
          case when p_sort = 'investor' then investor_name end asc nulls last,
          case when p_sort = 'ticker' then ticker end asc nulls last,
          case when p_sort not in ('change_asc', 'percentage', 'investor', 'ticker') then share_change end desc nulls last,
          ticker,
          investor_name
      ) as row_order
    from movement_filtered
  ),
  paged as (
    select *
    from ordered
    where row_order > (greatest(p_page, 1) - 1) * greatest(p_page_size, 1)
      and row_order <= greatest(p_page, 1) * greatest(p_page_size, 1)
    order by row_order
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(paged) - 'row_order' order by row_order) from paged), '[]'::jsonb),
    'total', (select count(*) from movement_filtered),
    'snapshotRows', (select count(*) from current_snapshot),
    'counts', jsonb_build_object(
      'new', counts.new_count,
      'increased', counts.increased_count,
      'stable', counts.stable_count,
      'decreased', counts.decreased_count,
      'exited', counts.exited_count
    )
  )
  from counts;
$$;

revoke all on function public.ownership_available_dates(smallint) from public, anon, authenticated;
revoke all on function public.ownership_movement_screener(smallint, date, date, text, text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.ownership_available_dates(smallint) to service_role;
grant execute on function public.ownership_movement_screener(smallint, date, date, text, text, text, text, integer, integer) to service_role;

commit;
