begin;

alter table public.right_issue_post_trackers
  add column if not exists proceeds_plan jsonb not null default '{}'::jsonb,
  add column if not exists proceeds_actual jsonb not null default '{}'::jsonb,
  add column if not exists proceeds_changed boolean not null default false,
  add column if not exists proceeds_change_reason text not null default '',
  add column if not exists ownership_before text not null default '',
  add column if not exists ownership_after text not null default '',
  add column if not exists controller_before text not null default '',
  add column if not exists controller_after text not null default '',
  add column if not exists control_changed boolean not null default false,
  add column if not exists standby_buyer_name text not null default '',
  add column if not exists standby_buyer_commitment numeric(24, 0),
  add column if not exists warrant_shares numeric(24, 0),
  add column if not exists warrant_exercise_price numeric(20, 2),
  add column if not exists warrant_start_date date,
  add column if not exists warrant_end_date date;

create index if not exists right_issue_post_trackers_proceeds_changed_idx
  on public.right_issue_post_trackers(owner_id, proceeds_changed)
  where proceeds_changed = true;

commit;
