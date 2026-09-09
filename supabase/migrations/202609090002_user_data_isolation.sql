begin;

-- Existing journal rows belonged to the original administrator. New rows are
-- isolated by the application user's UUID, just like portfolio and watchlists.
alter table public.journal_entries
  add column if not exists owner_id uuid;

update public.journal_entries
set owner_id = '00000000-0000-4000-8000-000000000001'
where owner_id is null;

alter table public.journal_entries
  alter column owner_id set not null;

create index if not exists journal_entries_owner_date_idx
  on public.journal_entries(owner_id, pinned desc, journal_date desc, updated_at desc);

create or replace function public.replace_user_accumulation(
  p_owner_id uuid,
  p_entries jsonb,
  p_recommendations jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  entry_count integer := 0;
  recommendation_count integer := 0;
begin
  if p_owner_id is null then raise exception 'Owner is required'; end if;
  if jsonb_typeof(coalesce(p_entries, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_recommendations, '[]'::jsonb)) <> 'array' then
    raise exception 'Accumulation payload must contain arrays';
  end if;

  delete from public.external_recommendations where owner_id = p_owner_id;
  delete from public.radar_entries where owner_id = p_owner_id;

  insert into public.radar_entries (
    owner_id, ticker, status, trend, entry_price, entry_price_source, started_at,
    watchlist_category, thesis_tags, lifecycle, breakout_price, support_low,
    support_high, ema_timeframe, catalyst_date, review_date, plan_source, plan_note
  )
  select
    p_owner_id, upper(row.ticker), row.status, row.trend, row.entry_price,
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
    row.id, p_owner_id, upper(row.ticker), row.source, row.status, row.trend,
    row.monitored_at, row.entry_price, row.entry_price_source, coalesce(row.note, '')
  from jsonb_to_recordset(coalesce(p_recommendations, '[]'::jsonb)) as row(
    id text, ticker text, source text, status text, trend text,
    monitored_at date, entry_price numeric, entry_price_source text, note text
  );
  get diagnostics recommendation_count = row_count;

  insert into public.accumulation_workspaces (owner_id)
  values (p_owner_id)
  on conflict (owner_id) do update set updated_at = now();

  return jsonb_build_object('entries', entry_count, 'recommendations', recommendation_count);
end;
$$;

create or replace function public.replace_user_notifications(
  p_owner_id uuid,
  p_best_entries jsonb,
  p_fca_watches jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  best_entry_count integer := 0;
  fca_watch_count integer := 0;
begin
  if p_owner_id is null then raise exception 'Owner is required'; end if;
  if jsonb_typeof(coalesce(p_best_entries, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_fca_watches, '[]'::jsonb)) <> 'array' then
    raise exception 'Notification payload must contain arrays';
  end if;

  delete from public.best_entry_alerts where owner_id = p_owner_id;
  delete from public.fca_watch_records where owner_id = p_owner_id;

  insert into public.best_entry_alerts (owner_id, ticker, entry_price, last_fired_value, updated_at)
  select p_owner_id, upper(row.ticker), row.entry_price, row.last_fired_value, coalesce(row.updated_at, now())
  from jsonb_to_recordset(coalesce(p_best_entries, '[]'::jsonb)) as row(
    ticker text, entry_price numeric, last_fired_value text, updated_at timestamptz
  );
  get diagnostics best_entry_count = row_count;

  insert into public.fca_watch_records (
    owner_id, ticker, company_name, watched_at, last_known_active,
    last_known_criteria, alert_type, alert_message, alert_created_at, alert_unread
  )
  select
    p_owner_id, upper(row.ticker), row.company_name, row.watched_at,
    row.last_known_active, coalesce(row.last_known_criteria, '{}'),
    row.alert_type, row.alert_message, row.alert_created_at,
    coalesce(row.alert_unread, false)
  from jsonb_to_recordset(coalesce(p_fca_watches, '[]'::jsonb)) as row(
    ticker text, company_name text, watched_at timestamptz,
    last_known_active boolean, last_known_criteria smallint[], alert_type text,
    alert_message text, alert_created_at timestamptz, alert_unread boolean
  );
  get diagnostics fca_watch_count = row_count;

  insert into public.notification_workspaces (owner_id)
  values (p_owner_id)
  on conflict (owner_id) do update set updated_at = now();

  return jsonb_build_object('bestEntries', best_entry_count, 'fcaWatches', fca_watch_count);
end;
$$;

create or replace function public.replace_user_financial_report(
  p_owner_id uuid,
  p_report jsonb,
  p_facts jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_id uuid;
begin
  if p_owner_id is null then raise exception 'Owner is required'; end if;
  if jsonb_typeof(coalesce(p_facts, '[]'::jsonb)) <> 'array' then
    raise exception 'Financial report facts must be an array';
  end if;

  insert into public.financial_reports (
    owner_id, ticker, entity_name, industry_family, sector, subsector, taxonomy_family,
    period_label, period_start, period_end, prior_period_start, prior_period_end,
    currency, unit_label, unit_multiplier, report_type, auditor, source_file, storage_path,
    headline, executive_summary, kpis, insights, breakdowns
  ) values (
    p_owner_id, upper(p_report->>'ticker'), p_report->>'entity_name',
    coalesce(p_report->>'industry_family', ''), coalesce(p_report->>'sector', ''),
    coalesce(p_report->>'subsector', ''), coalesce(p_report->>'taxonomy_family', 'unknown'),
    coalesce(p_report->>'period_label', ''), (p_report->>'period_start')::date,
    (p_report->>'period_end')::date, nullif(p_report->>'prior_period_start', '')::date,
    nullif(p_report->>'prior_period_end', '')::date, p_report->>'currency',
    coalesce(p_report->>'unit_label', ''), (p_report->>'unit_multiplier')::numeric,
    coalesce(p_report->>'report_type', ''), coalesce(p_report->>'auditor', ''),
    p_report->>'source_file', nullif(p_report->>'storage_path', ''),
    p_report->>'headline', p_report->>'executive_summary',
    coalesce(p_report->'kpis', '{}'::jsonb), coalesce(p_report->'insights', '[]'::jsonb),
    coalesce(p_report->'breakdowns', '[]'::jsonb)
  )
  on conflict (owner_id, ticker, period_end) do update set
    entity_name = excluded.entity_name, industry_family = excluded.industry_family,
    sector = excluded.sector, subsector = excluded.subsector,
    taxonomy_family = excluded.taxonomy_family, period_label = excluded.period_label,
    period_start = excluded.period_start, prior_period_start = excluded.prior_period_start,
    prior_period_end = excluded.prior_period_end, currency = excluded.currency,
    unit_label = excluded.unit_label, unit_multiplier = excluded.unit_multiplier,
    report_type = excluded.report_type, auditor = excluded.auditor,
    source_file = excluded.source_file, storage_path = excluded.storage_path,
    headline = excluded.headline, executive_summary = excluded.executive_summary,
    kpis = excluded.kpis, insights = excluded.insights, breakdowns = excluded.breakdowns,
    updated_at = now()
  returning id into v_report_id;

  delete from public.financial_report_facts where report_id = v_report_id;
  insert into public.financial_report_facts (
    report_id, statement, sheet_code, sheet_title, row_number,
    label, label_en, concept, current_value, prior_value
  )
  select
    v_report_id, row.statement, row.sheet_code, coalesce(row.sheet_title, ''),
    row.row_number, row.label, coalesce(row.label_en, ''), nullif(row.concept, ''),
    row.current_value, row.prior_value
  from jsonb_to_recordset(coalesce(p_facts, '[]'::jsonb)) as row(
    statement text, sheet_code text, sheet_title text, row_number integer,
    label text, label_en text, concept text, current_value numeric, prior_value numeric
  );

  return v_report_id;
end;
$$;

revoke all on function public.replace_user_accumulation(uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.replace_user_notifications(uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.replace_user_financial_report(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.replace_user_accumulation(uuid, jsonb, jsonb) to service_role;
grant execute on function public.replace_user_notifications(uuid, jsonb, jsonb) to service_role;
grant execute on function public.replace_user_financial_report(uuid, jsonb, jsonb) to service_role;

commit;
