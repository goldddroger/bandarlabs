begin;

create table if not exists public.financial_audit_watches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  ticker text not null references public.stocks(ticker) on delete cascade,
  issuer_name text not null default '',
  announcement_date date not null,
  period_end date not null,
  report_label text not null,
  auditor_name text not null default '',
  watch_start date not null,
  watch_end date not null,
  stated_due_date date,
  catalyst_summary text not null default '',
  source_file text not null default '',
  source_page integer not null default 1,
  status text not null default 'waiting' check (status in ('waiting', 'released', 'cancelled')),
  watch_reminder_id uuid references public.stock_ca_research_notes(id) on delete set null,
  deadline_reminder_id uuid references public.stock_ca_research_notes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, ticker, period_end)
);

create index if not exists financial_audit_watches_owner_status_idx
  on public.financial_audit_watches(owner_id, status, watch_start);

drop trigger if exists financial_audit_watches_set_updated_at on public.financial_audit_watches;
create trigger financial_audit_watches_set_updated_at
  before update on public.financial_audit_watches
  for each row execute function public.set_updated_at();

alter table public.financial_audit_watches enable row level security;

commit;
