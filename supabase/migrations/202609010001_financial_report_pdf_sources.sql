begin;

alter table public.financial_reports
  add column if not exists supporting_documents jsonb not null default '[]'::jsonb;

update storage.buckets
set allowed_mime_types = array[
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf'
]
where id = 'financial-reports';

commit;
