begin;

create table if not exists public.right_issue_post_trackers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  ticker text not null references public.stocks(ticker) on delete cascade,
  issuer_name text not null default '',
  reference_date date not null,
  status text not null default 'planned' check (status in ('planned', 'ongoing', 'completed')),
  target_funds numeric(24, 2),
  actual_funds numeric(24, 2),
  offered_shares numeric(24, 0),
  subscribed_shares numeric(24, 0),
  shares_before numeric(24, 0),
  shares_after numeric(24, 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, ticker, reference_date)
);

create index if not exists right_issue_post_trackers_owner_date_idx
  on public.right_issue_post_trackers(owner_id, reference_date desc);

drop trigger if exists right_issue_post_trackers_set_updated_at on public.right_issue_post_trackers;
create trigger right_issue_post_trackers_set_updated_at
  before update on public.right_issue_post_trackers
  for each row execute function public.set_updated_at();

alter table public.right_issue_post_trackers enable row level security;

commit;
