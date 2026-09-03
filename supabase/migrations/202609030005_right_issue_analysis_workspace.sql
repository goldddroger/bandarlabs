begin;

create table if not exists public.right_issue_analyses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  ticker text not null references public.stocks(ticker) on delete cascade,
  issuer_name text not null default '',
  score integer not null default 0 check (score between 0 and 100),
  verdict text not null default 'mixed' check (verdict in ('positive', 'mixed', 'caution')),
  stage text not null default 'proposal' check (stage in ('proposal', 'final_or_advanced')),
  market_price numeric(20, 2),
  analysis_snapshot jsonb not null default '{}'::jsonb,
  financial_inputs jsonb not null default '{}'::jsonb,
  financial_projection jsonb not null default '{}'::jsonb,
  personal_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, ticker)
);

create table if not exists public.right_issue_analysis_versions (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.right_issue_analyses(id) on delete cascade,
  version_no integer not null check (version_no > 0),
  stage text not null,
  document_date date,
  documents jsonb not null default '[]'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  changes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (analysis_id, version_no)
);

create index if not exists right_issue_analyses_owner_updated_idx
  on public.right_issue_analyses(owner_id, updated_at desc);
create index if not exists right_issue_analysis_versions_analysis_idx
  on public.right_issue_analysis_versions(analysis_id, version_no desc);

drop trigger if exists right_issue_analyses_set_updated_at on public.right_issue_analyses;
create trigger right_issue_analyses_set_updated_at
  before update on public.right_issue_analyses
  for each row execute function public.set_updated_at();

alter table public.right_issue_analyses enable row level security;
alter table public.right_issue_analysis_versions enable row level security;

commit;
