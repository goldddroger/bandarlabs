begin;

create table if not exists public.stock_ca_research_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  ticker text not null references public.stocks(ticker) on delete cascade,
  action_type text not null,
  title text not null,
  research_note text not null default '',
  event_date date,
  reminder_date date not null,
  status text not null check (status in ('Rencana', 'Sedang diriset', 'Selesai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stock_ca_research_owner_ticker_idx
  on public.stock_ca_research_notes(owner_id, ticker, reminder_date);

drop trigger if exists stock_ca_research_notes_set_updated_at on public.stock_ca_research_notes;
create trigger stock_ca_research_notes_set_updated_at
  before update on public.stock_ca_research_notes
  for each row execute function public.set_updated_at();

alter table public.stock_ca_research_notes enable row level security;

commit;
