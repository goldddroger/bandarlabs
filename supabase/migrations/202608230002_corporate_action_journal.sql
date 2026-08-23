begin;

-- BandarLab authenticates its single admin through the application session.
-- Notes therefore use the same stable internal owner UUID as portfolio data.
alter table public.corporate_action_notes
  drop constraint if exists corporate_action_notes_owner_id_fkey;

create index if not exists corporate_action_notes_admin_event_idx
  on public.corporate_action_notes(owner_id, event_id, updated_at desc);

commit;
