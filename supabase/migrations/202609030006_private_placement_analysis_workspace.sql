begin;

create table if not exists public.private_placement_analyses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  ticker text not null references public.stocks(ticker) on delete cascade,
  issuer_name text not null default '',
  score integer not null default 0 check (score between 0 and 100),
  verdict text not null default 'mixed' check (verdict in ('positive', 'mixed', 'caution')),
  stage text not null default 'proposal' check (stage in ('proposal', 'approved', 'revision', 'completed')),
  market_price numeric(20, 2),
  analysis_snapshot jsonb not null default '{}'::jsonb,
  financial_inputs jsonb not null default '{}'::jsonb,
  financial_projection jsonb not null default '{}'::jsonb,
  personal_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, ticker)
);

create table if not exists public.private_placement_analysis_versions (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.private_placement_analyses(id) on delete cascade,
  version_no integer not null check (version_no > 0),
  stage text not null,
  document_date date,
  documents jsonb not null default '[]'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  changes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (analysis_id, version_no)
);

create index if not exists private_placement_analyses_owner_updated_idx on public.private_placement_analyses(owner_id, updated_at desc);
create index if not exists private_placement_versions_analysis_idx on public.private_placement_analysis_versions(analysis_id, version_no desc);
drop trigger if exists private_placement_analyses_set_updated_at on public.private_placement_analyses;
create trigger private_placement_analyses_set_updated_at before update on public.private_placement_analyses for each row execute function public.set_updated_at();
alter table public.private_placement_analyses enable row level security;
alter table public.private_placement_analysis_versions enable row level security;

commit;
