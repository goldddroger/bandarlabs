begin;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username = lower(username) and char_length(username) between 3 and 40),
  display_name text not null check (char_length(display_name) between 2 and 80),
  password_hash text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  permissions text[] not null default '{}',
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_users_active_idx on public.app_users(is_active, username);

drop trigger if exists app_users_set_updated_at on public.app_users;
create trigger app_users_set_updated_at
  before update on public.app_users
  for each row execute function public.set_updated_at();

alter table public.app_users enable row level security;

commit;
