# SimpAset — Pencatat Aset Fisik Pribadi

> Catat barang yang Anda beli, simpan aman di cloud, dan lihat **Total Kekayaan Bersih Berupa Barang**.
> Murni pencatatan — **tanpa prediksi AI, tanpa taksiran harga jual**.

Aplikasi web satu halaman (SPA) yang bisa dipasang sebagai aplikasi HP (PWA).
Berjalan **langsung tanpa konfigurasi** dalam Mode Demo, dan bisa dihubungkan ke **Supabase** untuk sinkronisasi cloud.

---

## 1. Isi Paket

```
simpaset/
├── index.html            # seluruh layar (Login, Dasbor, Detail Kategori, Form)
├── src/
│   ├── config.js         # ← isi SUPABASE_URL & ANON_KEY di sini
│   ├── styles.css        # design system (navy + gold, mobile-first)
│   └── app.js            # logika aplikasi, data layer, ekspor
├── vendor/               # pustaka yang sudah diunduh lokal (offline-ready)
│   ├── chart.umd.min.js          # grafik pie/donut
│   ├── jspdf.umd.min.js          # ekspor PDF
│   ├── jspdf.plugin.autotable.min.js
│   ├── xlsx.full.min.js          # ekspor Excel
│   ├── html2canvas.min.js        # ekspor PNG
│   └── supabase.js               # klien Supabase
├── schema.sql            # skema database + RLS + storage + query SUM
├── manifest.json         # metadata PWA
├── sw.js                 # service worker (offline)
└── icons/                # ikon aplikasi 192/512
```

## 2. Cara Menjalankan (Mode Demo — 30 detik)

Mode demo tidak butuh internet maupun akun. Data disimpan di `localStorage` perangkat.

```bash
# Cara paling cepat: buka langsung
open index.html          # atau double-click index.html

# Disarankan (agar service worker & PWA aktif): jalankan server statis
python3 -m http.server 8080
# lalu buka http://localhost:8080
```

Alur uji cepat:

1. Klik **Coba Mode Demo** → Dasbor muncul dengan 24 contoh aset (total **Rp 100.000.000**).
2. Klik **+** → isi nama, kategori, harga, tanggal → **Simpan ke Aset Saya**.
3. Total di kartu navy, tabel portofolio, dan grafik donat langsung berubah.
4. Klik salah satu baris kategori → layar **Detail Kategori** → coba **PDF / Excel / PNG**.
5. Klik ikon ✏️ untuk mengubah, 🗑️ untuk menghapus barang.

> Mode demo menyimpan sesi di `localStorage`. Untuk kembali ke layar login: tombol keluar (ikon pintu) → **Keluar**.

## 3. Menghubungkan ke Cloud (Supabase)

### 3.1 Buat proyek
1. Daftar di <https://supabase.com> → **New project** (pilih region terdekat, mis. Singapore).
2. Tunggu ±2 menit sampai database siap.

### 3.2 Jalankan skema
1. Buka **SQL Editor** → **New query**.
2. Tempel seluruh isi `schema.sql` → **Run**.
3. Yang dibuat: tabel `users`, `categories`, `items`; kebijakan **Row Level Security**; trigger profil + 6 kategori default; bucket storage `asset-photos`; dan query penjumlahan aset.

### 3.3 Ambil kredensial
**Project Settings → API**:
- `Project URL` → tempel ke `SUPABASE_URL`
- `anon public` key → tempel ke `SUPABASE_ANON_KEY`

Edit `src/config.js`:

```js
window.SIMPASET_CONFIG = {
  SUPABASE_URL: 'https://xxxxxxxxxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...',
  BUCKET: 'asset-photos'
};
```

Simpan → muat ulang. Begitu kedua nilai terisi, aplikasi otomatis beralih dari Mode Demo ke **mode cloud** (kartu status di dasbor berubah menjadi “Tersinkron ke cloud”).

### 3.4 Aktifkan login Google (opsional)
1. **Google Cloud Console** → **APIs & Services → Credentials → Create OAuth client ID → Web application**.
2. **Authorized redirect URI**: `https://<PROJECT-REF>.supabase.co/auth/v1/callback`
3. Salin *Client ID* & *Client Secret* → Supabase **Authentication → Providers → Google** → aktifkan → tempel → **Save**.
4. Supabase **Authentication → URL Configuration**:
   - *Site URL*: alamat aplikasi Anda (mis. `https://simpaset.vercel.app`)
   - *Redirect URLs*: tambahkan alamat yang sama.
5. Login email: **Authentication → Providers → Email** pastikan aktif. Untuk uji cepat, matikan *Confirm email* agar pendaftaran langsung masuk.

### 3.5 Hosting (opsional)
Folder ini statis — bisa langsung diunggah ke Netlify, Vercel, Cloudflare Pages, atau GitHub Pages. Tidak perlu build step.

## 4. Struktur Database

| Tabel | Kolom | Keterangan |
|---|---|---|
| `users` | `user_id` (PK), `name`, `email`, `created_at` | Profil pengguna, melengkapi `auth.users` |
| `categories` | `category_id` (PK), `user_id` (FK), `category_name`, `icon`, `color`, `created_at` | Kategori bisa custom per pengguna |
| `items` | `item_id` (PK), `user_id` (FK), `category_id` (FK), `item_name`, `purchase_price` numeric(16,2), `purchase_date` date, `image_url`, `notes`, `created_at`, `updated_at` | Data inti barang |

**Logika penjumlahan** (lihat bagian akhir `schema.sql`):

```sql
-- Total seluruh aset
SELECT SUM(purchase_price) FROM items WHERE user_id = auth.uid();

-- Total per kategori
SELECT c.category_name, COUNT(i.item_id), SUM(i.purchase_price)
FROM categories c
LEFT JOIN items i ON i.category_id = c.category_id AND i.user_id = auth.uid()
WHERE c.user_id = auth.uid()
GROUP BY c.category_name, c.category_id
ORDER BY 3 DESC;
```

> Catatan: `purchase_price` sengaja bertipe **numeric** (bukan float) supaya penjumlahan uang tidak mengalami galat pembulatan.

## 5. Fitur

| Fitur | Status |
|---|---|
| Login Google / Email (Supabase Auth) | ✅ terhubung — perlu kredensial |
| Mode Demo offline (localStorage) | ✅ aktif tanpa konfigurasi |
| Input barang: foto, nama, kategori, harga, tanggal beli (termasuk tanggal lampau), catatan | ✅ |
| Foto dikompres otomatis (maks 900 px, JPEG 0,72) sebelum diunggah | ✅ |
| Foto opsional — tidak menghalangi penyimpanan | ✅ |
| Dasbor: total aset, jumlah item, rata-rata, grafik donat, tabel portofolio + persentase | ✅ |
| Kategori custom | ✅ |
| Detail kategori + ubah + hapus barang | ✅ |
| Ekspor **PDF** (jsPDF + AutoTable, kop & footer) | ✅ |
| Ekspor **Excel** (SheetJS, 2 sheet: daftar + ringkasan) | ✅ |
| Ekspor **PNG** (html2canvas, kartu laporan siap kirim) | ✅ |
| Format uang `Rp` via `Intl.NumberFormat('id-ID')` | ✅ |
| PWA installable + cache offline | ✅ |

## 6. Catatan Desain

- **Warna**: navy `#0B1B2B` (kesan brankas/aman), gold `#D9B368` (nilai aset), teal `#12A594` (aksi).
- **Prinsip**: angka total adalah raja — ditampilkan paling atas, paling besar, dengan font tabular agar digit tidak “meloncat”.
- **Tanpa AI**: tidak ada taksiran harga, depresiasi prediktif, atau penilaian otomatis. Yang tersimpan hanyalah fakta yang Anda masukkan.

## 7. Batasan yang Perlu Diketahui

- Mode Demo menyimpan data **di browser** — hapus data situs = data hilang. Untuk keamanan sebenarnya, gunakan mode cloud.
- Kunci `anon` Supabase memang publik; keamanan data bergantung pada **Row Level Security** yang sudah disiapkan di `schema.sql`. Jangan pernah memakai `service_role` key di frontend.
- Bucket foto dibuat **public read** agar URL gambar langsung tampil. Bila Anda ingin foto privat, ubah policy dan gunakan *signed URL*.
- Ekspor PNG membatasi 40 baris barang pada gambar (sisanya diarahkan ke PDF/Excel) agar berkas tidak terlalu besar.
