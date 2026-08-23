begin;

-- BandarLab uses its own admin session, so portfolio ownership is scoped to one
-- internal UUID instead of auth.users.
alter table public.portfolio_holdings
  drop constraint if exists portfolio_holdings_owner_id_fkey;
alter table public.portfolio_trades
  drop constraint if exists portfolio_trades_owner_id_fkey;
alter table public.portfolio_equity_history
  drop constraint if exists portfolio_equity_history_owner_id_fkey;

create or replace function public.replace_admin_portfolio(
  p_holdings jsonb,
  p_trades jsonb,
  p_equity_history jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_owner constant uuid := '00000000-0000-4000-8000-000000000001';
  holding_count integer := 0;
  trade_count integer := 0;
  history_count integer := 0;
begin
  if jsonb_typeof(coalesce(p_holdings, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_trades, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_equity_history, '[]'::jsonb)) <> 'array' then
    raise exception 'Portfolio payload must contain arrays';
  end if;

  delete from public.portfolio_equity_history where owner_id = admin_owner;
  delete from public.portfolio_trades where owner_id = admin_owner;
  delete from public.portfolio_holdings where owner_id = admin_owner;

  insert into public.portfolio_holdings (
    id, owner_id, ticker, lots, average_price, purchased_at, note
  )
  select
    row.id,
    admin_owner,
    upper(row.ticker),
    row.lots,
    row.average_price,
    row.purchased_at,
    coalesce(row.note, '')
  from jsonb_to_recordset(coalesce(p_holdings, '[]'::jsonb)) as row(
    id text,
    ticker text,
    lots numeric,
    average_price numeric,
    purchased_at date,
    note text
  );
  get diagnostics holding_count = row_count;

  insert into public.portfolio_trades (
    id, owner_id, ticker, lots, buy_price, sell_price,
    buy_fee_percent, sell_fee_percent, sold_at, note
  )
  select
    row.id,
    admin_owner,
    upper(row.ticker),
    row.lots,
    row.buy_price,
    row.sell_price,
    row.buy_fee_percent,
    row.sell_fee_percent,
    row.sold_at,
    coalesce(row.note, '')
  from jsonb_to_recordset(coalesce(p_trades, '[]'::jsonb)) as row(
    id text,
    ticker text,
    lots numeric,
    buy_price numeric,
    sell_price numeric,
    buy_fee_percent numeric,
    sell_fee_percent numeric,
    sold_at date,
    note text
  );
  get diagnostics trade_count = row_count;

  insert into public.portfolio_equity_history (owner_id, snapshot_date, equity)
  select admin_owner, row.snapshot_date, row.equity
  from jsonb_to_recordset(coalesce(p_equity_history, '[]'::jsonb)) as row(
    snapshot_date date,
    equity numeric
  );
  get diagnostics history_count = row_count;

  return jsonb_build_object(
    'holdings', holding_count,
    'trades', trade_count,
    'equityHistory', history_count
  );
end;
$$;

revoke all on function public.replace_admin_portfolio(jsonb, jsonb, jsonb) from public;
revoke all on function public.replace_admin_portfolio(jsonb, jsonb, jsonb) from anon;
revoke all on function public.replace_admin_portfolio(jsonb, jsonb, jsonb) from authenticated;
grant execute on function public.replace_admin_portfolio(jsonb, jsonb, jsonb) to service_role;

commit;
