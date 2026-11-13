# MANAJEMEN UANG IBRA

Aplikasi keuangan pribadi berbasis frontend standalone. Semua data disimpan di **LocalStorage** perangkat — tanpa server, tanpa akun, tanpa database eksternal.

## Akses online (GitHub Pages)

Aplikasi sudah terpasang di GitHub Pages dan bisa langsung dibuka dari Mac maupun HP:

**https://ibrahim-debug08.github.io/manajemen-uang-ibra/**

Karena berjalan di HTTPS, mode PWA aktif penuh: buka URL di Safari/Chrome HP lalu pilih **Add to Home Screen**. Setelah dibuka sekali, aplikasi tetap bisa dipakai offline lewat service worker. Data tetap hanya tersimpan di browser masing-masing perangkat.

## Cara membuka secara lokal

Cara paling sederhana: buka `index.html` langsung di browser Mac atau HP.

- **PIN awal:** `2611`
- PIN bisa diubah lewat menu **Pengaturan** setelah masuk.
- PIN bawaan juga dapat diubah di bagian paling atas file `assets/app.js` pada `APP_CONFIG.defaultPIN`.
- Tombol **Kunci aplikasi** tersedia di pojok kanan atas dan di sidebar.

> Catatan privasi: PIN ini adalah kunci lokal untuk mencegah akses iseng, bukan enkripsi kriptografis. Siapa pun yang memegang file/perangkat dan membuka DevTools dapat mengakses LocalStorage. Karena repo bersifat publik, PIN awal `2611` terlihat di source — sebaiknya ganti lewat **Pengaturan** dan jangan commit file backup berisi data asli.

## Install ke Home Screen HP

PWA memerlukan konteks aman (HTTPS atau localhost), jadi jalankan server lokal sederhana:

```bash
cd "MANAJEMEN UANG IBRA"
python3 -m http.server 8080
```

Lalu buka `http://localhost:8080` (Mac) atau `http://IP-MAC:8080` (HP di Wi-Fi yang sama). Di Safari/Chrome pilih **Add to Home Screen**. File `manifest.json` dan service worker sudah disertakan agar tampilan berjalan offline setelah dibuka sekali.

Aplikasi juga tetap bisa dipakai langsung via `file://`, tanpa server. Mode PWA/install saja yang membutuhkan HTTP.

## Pindah data Mac ↔ HP

1. Buka **Riwayat & Backup**.
2. Tekan **Backup lengkap** untuk mengunduh file `.json`.
3. Kirim file ke perangkat lain via AirDrop, WhatsApp, atau Files.
4. Buka aplikasi di perangkat tujuan → **Pulihkan data** → pilih file JSON.

Gunakan **Laporan CSV** untuk membuka riwayat di Numbers/Excel. Backup JSON mencakup transaksi, langganan, dan limit budget. PIN tidak ikut ke dalam backup.

## Fitur

- PIN lock 4 digit + tombol kunci aplikasi
- Jatah Aman Hari Ini (safe-to-spend) dengan cadangan tagihan langganan
- Budget mingguan & bulanan dengan progress bar dan alert over-budget
- Streak hemat tanpa over-budget
- Pencatatan pemasukan/pengeluaran, quick-add, pencarian, edit, hapus
- Radar langganan dengan countdown dan tombol Bayar & Catat
- Grafik donut kategori + tren 7 hari
- Backup/restore JSON, export CSV
- Light/dark mode, responsif, PWA ready

## Struktur file

```
index.html
manifest.json
sw.js
assets/
  app.css        (Tailwind hasil compile + komponen kustom)
  app.js         (konfigurasi, logika, dan seluruh UI aplikasi)
  icon.svg / icon-192.png / icon-512.png
  fonts/         (Plus Jakarta Sans + JetBrains Mono)
  vendor/        (Chart.js + Lucide, disimpan lokal)
```

Semua library utama dibundel lokal agar aplikasi tetap berjalan tanpa internet.
