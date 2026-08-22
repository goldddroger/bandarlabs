# BandarLab

BandarLab adalah dashboard riset saham Indonesia untuk menyatukan radar akumulasi, portfolio pribadi, corporate action, data kepemilikan, broker activity, dan catatan analisis dalam satu workspace.

## Fitur

- Dashboard pasar dan ringkasan radar saham.
- Accumulation Radar dengan status watchlist, accumulation, dan hold.
- Rekomendasi eksternal beserta harga masuk dan rekam jejak pemantauan.
- Portfolio saham, valuasi posisi, equity history, dan realized trade history.
- Detail emiten, ownership 1%/5%, stock screener, dan broker summary.
- Corporate action journal untuk RUPST, RUPSLB, public expose, dan dividen.
- Best entry alert dan pusat notifikasi.
- Group konglomerasi serta kalkulator capital gain dan dividen.
- Layout responsif untuk desktop, tablet, dan mobile.

## Teknologi

- Next.js 16 App Router
- React 19 dan TypeScript
- Tailwind CSS 4
- Supabase PostgreSQL, Auth SSR, dan Row Level Security
- Prisma dan SQLite untuk kompatibilitas data demo lokal
- Recharts dan Lucide React

## Menjalankan Lokal

Persyaratan: Node.js 20 atau lebih baru dan npm.

```bash
git clone https://github.com/goldddroger/bandarlabs.git
cd bandarlabs
npm install
```

Buat `.env.local` berdasarkan `.env.example`:

```ini
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
OWNERSHIP_IMPORT_SECRET=YOUR_LONG_RANDOM_ADMIN_SECRET
```

Jalankan development server:

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Setup Supabase

1. Buat project baru di Supabase.
2. Jalankan [`supabase/migrations/202608200001_bandarlab_schema.sql`](supabase/migrations/202608200001_bandarlab_schema.sql) melalui SQL Editor.
3. Jalankan file dalam [`supabase/seed-parts`](supabase/seed-parts) secara berurutan dari `001-seed.sql` sampai `018-seed.sql`.
4. Jalankan migration terbaru [`supabase/migrations/202608220001_ownership_import.sql`](supabase/migrations/202608220001_ownership_import.sql) untuk mengaktifkan upload Excel Ownership Tracker.
5. Jangan menempel `supabase/seed.sql` secara utuh ke SQL Editor karena ukurannya melewati batas editor.

Untuk membuat ulang seed lengkap dan seed parts:

```bash
npm run supabase:seed:generate
```

Data pribadi yang masih tersimpan di browser dapat diekspor melalui halaman `/settings`. Masukkan Supabase User UID, unduh SQL, lalu jalankan hasilnya setelah schema dan seed selesai.

Panduan lengkap tersedia di [`docs/SUPABASE_GITHUB_VERCEL.md`](docs/SUPABASE_GITHUB_VERCEL.md).

## Scripts

```bash
npm run dev                       # Development server
npm run lint                      # ESLint
npm run build                     # Production build
npm run start                     # Menjalankan production build
npm run supabase:seed:generate    # Membuat ulang Supabase seed
```

## Deploy ke Vercel

1. Import repository ini ke Vercel.
2. Gunakan framework preset Next.js.
3. Tambahkan seluruh variabel Supabase dari `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` dan `OWNERSHIP_IMPORT_SECRET` hanya boleh disimpan sebagai server-side Environment Variables.
4. Deploy lalu verifikasi `/dashboard`, `/accumulation`, `/portfolio`, `/stocks/BBCA`, dan `/settings`.

Jangan commit `.env.local`, password database, atau service-role key.

## Status Data

Master saham, screener, ownership, corporate action, timeline, dan grup konglomerasi sudah tersedia dalam seed Supabase. Harga pasar tetap diambil melalui endpoint quote karena nilainya berubah setiap saat.

Ownership Tracker menerima file `.xlsx` kepemilikan 1% bulanan dan perubahan kepemilikan 5%. Aplikasi mendeteksi format, tanggal, dan emiten, lalu mengganti snapshot pada threshold dan tanggal yang sama secara atomik.

Sebagian data pribadi masih dibaca dari `localStorage`. Schema, RLS, SSR client, dan alat ekspor SQL sudah tersedia untuk tahap pemindahan penuh ke query Supabase.

## Disclaimer

BandarLab adalah alat bantu riset dan pencatatan. Informasi yang ditampilkan bukan rekomendasi jual atau beli saham.
