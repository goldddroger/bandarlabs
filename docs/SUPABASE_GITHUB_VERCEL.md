# Migrasi BandarLab ke Supabase, GitHub, dan Vercel

## Data yang disiapkan

- `supabase/migrations/202608200001_bandarlab_schema.sql`: tabel, index, trigger, dan Row Level Security.
- `supabase/seed.sql`: seed lengkap untuk terminal atau `psql`.
- `supabase/seed-parts/*.sql`: seed yang dipecah menjadi file kecil untuk Supabase SQL Editor.
- Halaman `/settings`: pembuat SQL untuk data pribadi yang sekarang tersimpan di browser.
- Harga pasar tidak dijadikan seed karena berubah setiap saat. Aplikasi tetap mengambil harga melalui endpoint Yahoo Finance/Google Finance.

## 1. Buat project Supabase

1. Buat project baru di Supabase.
2. Buka **SQL Editor** dan jalankan isi file migration.
3. Jalankan semua file dalam `supabase/seed-parts` berdasarkan nomor, mulai `001-seed.sql` sampai file terakhir.

Jangan menempel `supabase/seed.sql` secara utuh ke SQL Editor karena ukurannya melewati batas editor. Untuk membuat ulang semua bagian seed:

```powershell
npm run supabase:seed:generate
```

Alternatif melalui terminal dengan koneksi direct database:

```powershell
npm run supabase:seed:generate
psql "$env:SUPABASE_DIRECT_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql
```

Untuk migration terkelola Supabase CLI:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

## 2. Pindahkan data browser

1. Buat user di **Supabase Dashboard > Authentication > Users**.
2. Salin nilai **User UID**.
3. Buka BandarLab `/settings`, masukkan UID, lalu pilih **Unduh SQL Data Pribadi**.
4. Jalankan file SQL hasil unduhan melalui Supabase SQL Editor.

File tersebut memindahkan radar, rekomendasi eksternal, portfolio, trade, equity history, best-entry alert, catatan corporate action, dan grup konglomerasi kustom. SQL memakai upsert sehingga aman dijalankan ulang untuk memperbarui data yang sama.

## 3. Push ke GitHub

File `.env`, database SQLite, `.next`, dan `node_modules` sudah diabaikan oleh Git. Dari root project:

```powershell
git init
git add .
git commit -m "Prepare BandarLab for Supabase and Vercel"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

Jangan commit `.env.local`, password database, atau `SUPABASE_SERVICE_ROLE_KEY`.

## 4. Deploy ke Vercel

1. Import repository GitHub di Vercel.
2. Framework preset: **Next.js**.
3. Tambahkan environment variables dari `.env.example`.
4. Untuk browser, cukup `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. `SUPABASE_SERVICE_ROLE_KEY` hanya boleh digunakan oleh route/server action yang memang memerlukannya.
6. Deploy dan cek route `/dashboard`, `/accumulation`, `/portfolio`, `/stocks/BBCA`, dan `/settings`.

## Catatan runtime

Database dan data sudah siap dipindahkan. UI saat ini masih membaca sebagian data pribadi dari `localStorage`; integrasi login Supabase dan penggantian store ke query Supabase perlu dilakukan setelah URL/key project tersedia. Jangan menghapus data browser sebelum hasil SQL berhasil diverifikasi di tabel Supabase.
