begin;

alter table public.radar_entries
  add column if not exists watchlist_category text not null default 'personal',
  add column if not exists thesis_tags text[] not null default '{}',
  add column if not exists lifecycle text not null default 'waiting',
  add column if not exists breakout_price numeric,
  add column if not exists support_low numeric,
  add column if not exists support_high numeric,
  add column if not exists ema_timeframe text,
  add column if not exists catalyst_date date,
  add column if not exists review_date date,
  add column if not exists plan_source text,
  add column if not exists plan_note text;

alter table public.radar_entries drop constraint if exists radar_entries_watchlist_category_check;
alter table public.radar_entries add constraint radar_entries_watchlist_category_check
  check (watchlist_category in ('personal', 'daily', 'swing'));
alter table public.radar_entries drop constraint if exists radar_entries_lifecycle_check;
alter table public.radar_entries add constraint radar_entries_lifecycle_check
  check (lifecycle in ('waiting', 'triggered', 'invalid', 'completed'));
alter table public.radar_entries drop constraint if exists radar_entries_ema_timeframe_check;
alter table public.radar_entries add constraint radar_entries_ema_timeframe_check
  check (ema_timeframe is null or ema_timeframe in ('daily', 'weekly'));
alter table public.radar_entries drop constraint if exists radar_entries_plan_prices_check;
alter table public.radar_entries add constraint radar_entries_plan_prices_check
  check (
    (breakout_price is null or breakout_price >= 0)
    and (support_low is null or support_low >= 0)
    and (support_high is null or support_high >= 0)
  );

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
    owner_id, ticker, status, trend, entry_price, entry_price_source, started_at,
    watchlist_category, thesis_tags, lifecycle, breakout_price, support_low,
    support_high, ema_timeframe, catalyst_date, review_date, plan_source, plan_note
  )
  select
    admin_owner, upper(row.ticker), row.status, row.trend, row.entry_price,
    row.entry_price_source, row.started_at, coalesce(row.watchlist_category, 'personal'),
    coalesce(row.thesis_tags, '{}'), coalesce(row.lifecycle, 'waiting'),
    row.breakout_price, row.support_low, row.support_high, row.ema_timeframe,
    row.catalyst_date, row.review_date, row.plan_source, row.plan_note
  from jsonb_to_recordset(coalesce(p_entries, '[]'::jsonb)) as row(
    ticker text, status text, trend text, entry_price numeric,
    entry_price_source text, started_at date, watchlist_category text,
    thesis_tags text[], lifecycle text, breakout_price numeric, support_low numeric,
    support_high numeric, ema_timeframe text, catalyst_date date, review_date date,
    plan_source text, plan_note text
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
    id text, ticker text, source text, status text, trend text,
    monitored_at date, entry_price numeric, entry_price_source text, note text
  );
  get diagnostics recommendation_count = row_count;

  insert into public.accumulation_workspaces (owner_id)
  values (admin_owner)
  on conflict (owner_id) do update set updated_at = now();

  return jsonb_build_object('entries', entry_count, 'recommendations', recommendation_count);
end;
$$;

revoke all on function public.replace_admin_accumulation(jsonb, jsonb) from public;
revoke all on function public.replace_admin_accumulation(jsonb, jsonb) from anon;
revoke all on function public.replace_admin_accumulation(jsonb, jsonb) from authenticated;
grant execute on function public.replace_admin_accumulation(jsonb, jsonb) to service_role;

commit;
