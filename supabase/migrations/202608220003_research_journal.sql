begin;

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  content text not null default '',
  source_name text not null default '',
  category text not null check (category in ('Pelajaran', 'Observasi', 'Thesis', 'Kesalahan', 'Mentoring')),
  ticker_symbols text[] not null default '{}',
  tags text[] not null default '{}',
  journal_date date not null default current_date,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_attachments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 8388608),
  created_at timestamptz not null default now()
);

create index if not exists journal_entries_date_idx on public.journal_entries(pinned desc, journal_date desc, updated_at desc);
create index if not exists journal_entries_search_idx on public.journal_entries using gin (to_tsvector('simple', title || ' ' || content || ' ' || source_name));
create index if not exists journal_attachments_entry_idx on public.journal_attachments(entry_id);

drop trigger if exists journal_entries_set_updated_at on public.journal_entries;
create trigger journal_entries_set_updated_at before update on public.journal_entries for each row execute function public.set_updated_at();

alter table public.journal_entries enable row level security;
alter table public.journal_attachments enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'journal-media',
  'journal-media',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
