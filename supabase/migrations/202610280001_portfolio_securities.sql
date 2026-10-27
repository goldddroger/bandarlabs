begin;

alter table public.portfolio_holdings
  add column if not exists security text not null default '';

comment on column public.portfolio_holdings.security is
  'Nama sekuritas tempat posisi saham disimpan; kosong untuk posisi lama yang belum diklasifikasikan.';

commit;
