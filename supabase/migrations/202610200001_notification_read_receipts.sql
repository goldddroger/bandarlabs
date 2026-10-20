begin;

create table if not exists public.notification_read_receipts (
  owner_id uuid not null,
  notification_id text not null check (length(notification_id) between 1 and 512),
  read_at timestamptz not null default now(),
  primary key (owner_id, notification_id)
);

alter table public.notification_read_receipts enable row level security;
revoke all on public.notification_read_receipts from anon, authenticated;
grant select, insert on public.notification_read_receipts to service_role;

commit;
