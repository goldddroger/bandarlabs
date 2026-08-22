begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.stocks (
  ticker text primary key check (ticker = upper(ticker)),
  name text not null,
  listing_date date,
  listed_shares bigint,
  listing_board text,
  sector text,
  subsector text,
  industry text,
  subindustry text,
  subindustry_code text,
  indexes text[] not null default '{}',
  source_updated_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_screener_metrics (
  ticker text primary key references public.stocks(ticker) on delete cascade,
  per numeric,
  pbv numeric,
  roe numeric,
  roa numeric,
  der numeric,
  market_cap numeric,
  total_revenue numeric,
  price_change_4w numeric,
  price_change_13w numeric,
  price_change_26w numeric,
  price_change_52w numeric,
  npm numeric,
  mtd numeric,
  ytd numeric,
  source_updated_at date,
  updated_at timestamptz not null default now()
);

create table if not exists public.shareholder_ownership (
  id bigint generated always as identity primary key,
  ticker text not null references public.stocks(ticker) on delete cascade,
  disclosure_threshold smallint not null check (disclosure_threshold in (1, 5)),
  issuer_name text not null,
  investor_name text not null,
  account_holder text,
  classification text,
  local_foreign text,
  nationality text,
  domicile text,
  scripless_shares bigint not null default 0,
  scrip_shares bigint not null default 0,
  shares bigint not null default 0,
  share_change bigint,
  percentage numeric,
  report_date date not null,
  created_at timestamptz not null default now(),
  unique nulls not distinct (ticker, disclosure_threshold, investor_name, account_holder, report_date)
);

create table if not exists public.accumulation_scores (
  id bigint generated always as identity primary key,
  ticker text not null references public.stocks(ticker) on delete cascade,
  period text not null,
  score integer not null,
  broker_score integer,
  volume_score integer,
  price_score integer,
  score_date date not null,
  unique (ticker, period, score_date)
);

create table if not exists public.broker_activities (
  id bigint generated always as identity primary key,
  ticker text not null references public.stocks(ticker) on delete cascade,
  broker_code text not null,
  net_buy numeric,
  average_price numeric,
  buy_days integer,
  sell_days integer,
  consistency integer,
  period text not null,
  activity_date date,
  unique (ticker, broker_code, period, activity_date)
);

create table if not exists public.corporate_action_events (
  id text primary key,
  ticker text references public.stocks(ticker) on delete cascade,
  action_type text not null,
  event_date date not null,
  state text not null check (state in ('Mendatang', 'Selesai')),
  topic text not null,
  announcement_price numeric,
  document_label text,
  document_number text,
  published_at timestamptz,
  description text,
  impact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_timeline (
  id bigint generated always as identity primary key,
  ticker text not null references public.stocks(ticker) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  event_date date not null,
  created_at timestamptz not null default now(),
  unique (ticker, event_type, title, event_date)
);

create table if not exists public.conglomerate_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (owner_id, name)
);

create table if not exists public.conglomerate_group_members (
  group_id uuid not null references public.conglomerate_groups(id) on delete cascade,
  ticker text not null references public.stocks(ticker) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, ticker)
);

create table if not exists public.radar_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null references public.stocks(ticker) on delete cascade,
  status text not null check (status in ('accumulation', 'watchlist', 'hold')),
  trend text check (trend in ('uptrend', 'sideways', 'downtrend')),
  entry_price numeric not null check (entry_price >= 0),
  entry_price_source text,
  started_at date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, ticker)
);

create table if not exists public.external_recommendations (
  id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null references public.stocks(ticker) on delete cascade,
  source text not null,
  status text not null check (status in ('accumulation', 'watchlist', 'hold')),
  trend text not null check (trend in ('Uptrend', 'Sideways', 'Downtrend')),
  monitored_at date not null,
  entry_price numeric not null check (entry_price >= 0),
  entry_price_source text,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create table if not exists public.portfolio_holdings (
  id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null references public.stocks(ticker) on delete cascade,
  lots numeric not null check (lots > 0),
  average_price numeric not null check (average_price > 0),
  purchased_at date not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create table if not exists public.portfolio_trades (
  id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null references public.stocks(ticker) on delete cascade,
  lots numeric not null check (lots > 0),
  buy_price numeric not null check (buy_price > 0),
  sell_price numeric not null check (sell_price > 0),
  buy_fee_percent numeric not null default 0.15 check (buy_fee_percent >= 0),
  sell_fee_percent numeric not null default 0.25 check (sell_fee_percent >= 0),
  sold_at date not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create table if not exists public.portfolio_equity_history (
  owner_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  equity numeric not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, snapshot_date)
);

create table if not exists public.best_entry_alerts (
  owner_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null references public.stocks(ticker) on delete cascade,
  entry_price numeric not null check (entry_price > 0),
  last_fired_value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, ticker)
);

create table if not exists public.corporate_action_notes (
  id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references public.corporate_action_events(id) on delete cascade,
  key_message text not null default '',
  decision text not null default '',
  follow_up text not null default '',
  status text not null check (status in ('Belum dibaca', 'Perlu dipantau', 'Selesai', 'Berdampak besar')),
  updated_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create index if not exists shareholder_ownership_ticker_date_idx on public.shareholder_ownership(ticker, report_date desc);
create index if not exists shareholder_ownership_investor_idx on public.shareholder_ownership using gin (to_tsvector('simple', investor_name));
create index if not exists accumulation_scores_ticker_date_idx on public.accumulation_scores(ticker, score_date desc);
create index if not exists corporate_action_events_ticker_date_idx on public.corporate_action_events(ticker, event_date desc);
create index if not exists stock_timeline_ticker_date_idx on public.stock_timeline(ticker, event_date desc);
create index if not exists radar_entries_owner_status_idx on public.radar_entries(owner_id, status);
create index if not exists portfolio_trades_owner_date_idx on public.portfolio_trades(owner_id, sold_at desc);

drop trigger if exists stocks_set_updated_at on public.stocks;
create trigger stocks_set_updated_at before update on public.stocks for each row execute function public.set_updated_at();
drop trigger if exists stock_screener_metrics_set_updated_at on public.stock_screener_metrics;
create trigger stock_screener_metrics_set_updated_at before update on public.stock_screener_metrics for each row execute function public.set_updated_at();
drop trigger if exists corporate_action_events_set_updated_at on public.corporate_action_events;
create trigger corporate_action_events_set_updated_at before update on public.corporate_action_events for each row execute function public.set_updated_at();
drop trigger if exists conglomerate_groups_set_updated_at on public.conglomerate_groups;
create trigger conglomerate_groups_set_updated_at before update on public.conglomerate_groups for each row execute function public.set_updated_at();
drop trigger if exists radar_entries_set_updated_at on public.radar_entries;
create trigger radar_entries_set_updated_at before update on public.radar_entries for each row execute function public.set_updated_at();
drop trigger if exists external_recommendations_set_updated_at on public.external_recommendations;
create trigger external_recommendations_set_updated_at before update on public.external_recommendations for each row execute function public.set_updated_at();
drop trigger if exists portfolio_holdings_set_updated_at on public.portfolio_holdings;
create trigger portfolio_holdings_set_updated_at before update on public.portfolio_holdings for each row execute function public.set_updated_at();
drop trigger if exists portfolio_trades_set_updated_at on public.portfolio_trades;
create trigger portfolio_trades_set_updated_at before update on public.portfolio_trades for each row execute function public.set_updated_at();
drop trigger if exists best_entry_alerts_set_updated_at on public.best_entry_alerts;
create trigger best_entry_alerts_set_updated_at before update on public.best_entry_alerts for each row execute function public.set_updated_at();
drop trigger if exists corporate_action_notes_set_updated_at on public.corporate_action_notes;
create trigger corporate_action_notes_set_updated_at before update on public.corporate_action_notes for each row execute function public.set_updated_at();

alter table public.stocks enable row level security;
alter table public.stock_screener_metrics enable row level security;
alter table public.shareholder_ownership enable row level security;
alter table public.accumulation_scores enable row level security;
alter table public.broker_activities enable row level security;
alter table public.corporate_action_events enable row level security;
alter table public.stock_timeline enable row level security;
alter table public.conglomerate_groups enable row level security;
alter table public.conglomerate_group_members enable row level security;
alter table public.radar_entries enable row level security;
alter table public.external_recommendations enable row level security;
alter table public.portfolio_holdings enable row level security;
alter table public.portfolio_trades enable row level security;
alter table public.portfolio_equity_history enable row level security;
alter table public.best_entry_alerts enable row level security;
alter table public.corporate_action_notes enable row level security;

create policy "reference stocks are readable" on public.stocks for select using (true);
create policy "reference screener is readable" on public.stock_screener_metrics for select using (true);
create policy "reference ownership is readable" on public.shareholder_ownership for select using (true);
create policy "reference accumulation is readable" on public.accumulation_scores for select using (true);
create policy "reference broker activity is readable" on public.broker_activities for select using (true);
create policy "reference corporate actions are readable" on public.corporate_action_events for select using (true);
create policy "reference timeline is readable" on public.stock_timeline for select using (true);

create policy "groups are readable by owner or system" on public.conglomerate_groups for select using (is_system or owner_id = auth.uid());
create policy "users create own groups" on public.conglomerate_groups for insert with check (owner_id = auth.uid() and not is_system);
create policy "users update own groups" on public.conglomerate_groups for update using (owner_id = auth.uid()) with check (owner_id = auth.uid() and not is_system);
create policy "users delete own groups" on public.conglomerate_groups for delete using (owner_id = auth.uid() and not is_system);
create policy "group members follow group visibility" on public.conglomerate_group_members for select using (exists (select 1 from public.conglomerate_groups groups where groups.id = group_id and (groups.is_system or groups.owner_id = auth.uid())));
create policy "users create own group members" on public.conglomerate_group_members for insert with check (exists (select 1 from public.conglomerate_groups groups where groups.id = group_id and groups.owner_id = auth.uid() and not groups.is_system));
create policy "users delete own group members" on public.conglomerate_group_members for delete using (exists (select 1 from public.conglomerate_groups groups where groups.id = group_id and groups.owner_id = auth.uid() and not groups.is_system));

create policy "users manage own radar" on public.radar_entries for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "users manage own recommendations" on public.external_recommendations for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "users manage own holdings" on public.portfolio_holdings for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "users manage own trades" on public.portfolio_trades for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "users manage own equity history" on public.portfolio_equity_history for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "users manage own best entries" on public.best_entry_alerts for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "users manage own corporate notes" on public.corporate_action_notes for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

commit;
