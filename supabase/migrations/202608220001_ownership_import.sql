begin;

create table if not exists public.ownership_import_runs (
  id uuid primary key default gen_random_uuid(),
  disclosure_threshold smallint not null check (disclosure_threshold in (1, 5)),
  report_date date not null,
  source_file text not null,
  row_count integer not null check (row_count > 0),
  created_at timestamptz not null default now()
);

create index if not exists ownership_import_runs_date_idx
  on public.ownership_import_runs(report_date desc, disclosure_threshold);

alter table public.ownership_import_runs enable row level security;

update public.shareholder_ownership
set local_foreign = 'A'
where upper(coalesce(local_foreign, '')) in ('F', 'FOREIGN', 'ASING');

create or replace function public.replace_shareholder_ownership(
  p_threshold smallint,
  p_report_date date,
  p_rows jsonb,
  p_source_file text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row_count integer;
begin
  if p_threshold not in (1, 5) then
    raise exception 'Threshold harus 1 atau 5.';
  end if;

  if p_report_date is null then
    raise exception 'Tanggal laporan wajib diisi.';
  end if;

  if coalesce(jsonb_typeof(p_rows), 'null') <> 'array' then
    raise exception 'Payload ownership harus berupa array.';
  end if;

  v_row_count := jsonb_array_length(p_rows);
  if v_row_count < 1 or v_row_count > 15000 then
    raise exception 'Jumlah baris harus antara 1 dan 15000.';
  end if;

  if nullif(btrim(p_source_file), '') is null then
    raise exception 'Nama file sumber wajib diisi.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_rows) as item(
      ticker text,
      issuer_name text,
      investor_name text,
      shares bigint,
      percentage numeric,
      report_date date
    )
    where nullif(btrim(item.ticker), '') is null
      or nullif(btrim(item.issuer_name), '') is null
      or nullif(btrim(item.investor_name), '') is null
      or item.shares <= 0
      or item.percentage <= 0
      or item.report_date is distinct from p_report_date
  ) then
    raise exception 'Ada baris ownership yang tidak valid atau tanggalnya tidak sesuai.';
  end if;

  insert into public.stocks (ticker, name, updated_at)
  select upper(btrim(item.ticker)), max(btrim(item.issuer_name)), now()
  from jsonb_to_recordset(p_rows) as item(ticker text, issuer_name text)
  group by upper(btrim(item.ticker))
  on conflict (ticker) do update
    set name = excluded.name,
        updated_at = now();

  delete from public.shareholder_ownership
  where disclosure_threshold = p_threshold
    and report_date = p_report_date;

  insert into public.shareholder_ownership (
    ticker,
    disclosure_threshold,
    issuer_name,
    investor_name,
    account_holder,
    classification,
    local_foreign,
    nationality,
    domicile,
    scripless_shares,
    scrip_shares,
    shares,
    share_change,
    percentage,
    report_date
  )
  select
    upper(btrim(item.ticker)),
    p_threshold,
    btrim(item.issuer_name),
    btrim(item.investor_name),
    nullif(btrim(item.account_holder), ''),
    nullif(btrim(item.classification), ''),
    case
      when upper(coalesce(item.local_foreign, '')) in ('A', 'F', 'FOREIGN', 'ASING') then 'A'
      when upper(coalesce(item.local_foreign, '')) in ('L', 'LOCAL', 'LOKAL') then 'L'
      else nullif(btrim(item.local_foreign), '')
    end,
    nullif(btrim(item.nationality), ''),
    nullif(btrim(item.domicile), ''),
    coalesce(item.scripless_shares, 0),
    coalesce(item.scrip_shares, 0),
    item.shares,
    item.share_change,
    item.percentage,
    p_report_date
  from jsonb_to_recordset(p_rows) as item(
    ticker text,
    issuer_name text,
    investor_name text,
    account_holder text,
    classification text,
    local_foreign text,
    nationality text,
    domicile text,
    scripless_shares bigint,
    scrip_shares bigint,
    shares bigint,
    share_change bigint,
    percentage numeric,
    report_date date
  );

  insert into public.ownership_import_runs (
    disclosure_threshold,
    report_date,
    source_file,
    row_count
  ) values (
    p_threshold,
    p_report_date,
    left(btrim(p_source_file), 255),
    v_row_count
  );

  return jsonb_build_object(
    'importedCount', v_row_count,
    'threshold', p_threshold,
    'reportDate', p_report_date
  );
end;
$$;

revoke all on function public.replace_shareholder_ownership(smallint, date, jsonb, text) from public;
revoke all on function public.replace_shareholder_ownership(smallint, date, jsonb, text) from anon;
revoke all on function public.replace_shareholder_ownership(smallint, date, jsonb, text) from authenticated;
grant execute on function public.replace_shareholder_ownership(smallint, date, jsonb, text) to service_role;

commit;
