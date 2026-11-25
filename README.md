# Sistem Analisis Sentimen Media Sosial

Dashboard web yang menarik data crawl harian daripada folder Google Drive **"Agri Data Platform"**. Ia memaparkan sentimen orang ramai tentang komoditi pertanian (ayam, telur, cili, sayur dan lain-lain) serta risiko dan harga setiap komoditi.

Manual ini menerangkan cara menggunakan sistem, apa yang berlaku di belakang tabir, dan cara menyelesaikan masalah biasa.

---

## Kandungan

1. [Mula guna (5 minit)](#1-mula-guna-5-minit)
2. [Log masuk](#2-log-masuk)
3. [Panduan dashboard](#3-panduan-dashboard)
4. [Dari mana data datang](#4-dari-mana-data-datang)
5. [Menarik data (Sync)](#5-menarik-data-sync)
6. [Sync automatik setiap hari](#6-sync-automatik-setiap-hari)
7. [Import fail manual](#7-import-fail-manual)
8. [Cara sentimen dikira](#8-cara-sentimen-dikira) · [8a. Kategori siaran](#8a-kategori-siaran)
9. [Tempat data disimpan](#9-tempat-data-disimpan)
10. [Tetapan `.env.local`](#10-tetapan-envlocal)
11. [Keselamatan](#11-keselamatan)
12. [Masalah biasa](#12-masalah-biasa)
13. [Had sistem](#13-had-sistem)
14. [Untuk pembangun](#14-untuk-pembangun)

---

## 1. Mula guna (5 minit)

Perlu ada **Node.js 20 ke atas**. Semak dengan `node -v`.

```powershell
cd C:\Users\fahmi\sentimen_sms
npm install          # sekali sahaja
npm run build        # bina aplikasi
npm start            # jalankan server
```

Buka **http://localhost:3000** dan log masuk. Kata laluan ada dalam `.env.local` di bawah `DASHBOARD_PASSWORD`.

Ada dua cara menjalankan server:

| Arahan | Bila guna |
|---|---|
| `npm run dev` | Semasa mengubah kod. Perubahan terus nampak dan tidak perlu build. |
| `npm run build` kemudian `npm start` | Untuk guna harian. Lebih laju. **Mesti build semula** selepas ubah kod atau `.env.local`. |

> Jika data masih kosong, tekan butang **"Sync Google Drive"** di bahagian atas.

---

## 2. Log masuk

- Semua halaman dilindungi kata laluan tunggal (`DASHBOARD_PASSWORD` dalam `.env.local`).
- Sesi tahan **7 hari**. Untuk log keluar, tekan ikon keluar di sebelah "Admin User".
- Selepas **5 cubaan salah**, log masuk disekat selama 10 minit.
- **Untuk tukar kata laluan:** ubah `DASHBOARD_PASSWORD` dalam `.env.local` (minimum 8 aksara), kemudian restart server. Semua orang akan dilog keluar.

---

## 3. Panduan dashboard

```
┌──────────────────────────────────────────────────────────────────┐
│ Bar atas: Tajuk | Carian | Sync Google Drive | Import | Admin    │
├──────────────────────────────────────────────────────────────────┤
│ Penapis: [Julat tarikh] [Platform]            Data terkini: ...  │
├──────────────────────────────────────────────────────────────────┤
│ Penapis kategori: Topik | Bahasa | Sumber | Kumpulan | Negeri    │
│                                                  [Set semula]    │
├────────────┬────────────┬────────────┬───────────────────────────┤
│ Jumlah     │ Skor       │ Kadar      │ Alert Krisis              │  Zon 1
│ Sebutan    │ Sentimen   │ Penglibatan│                           │
├────────────┴────────────┴──────┬─────┴───────────────────────────┤
│ Trend Sentimen Mengikut Masa   │ Pecahan Sentimen (donut)        │  Zon 2
├────────────────────────────────┴─────────────────────────────────┤
│ Pecahan Mengikut Kategori (carta bar, 5 tab)                     │  Kategori
├──────────────────────────────────────────────────────────────────┤
│ Risiko Komoditi (jadual)                                         │  Panel risiko
├──────────────────────────────────────────────────────────────────┤
│ Topik Hangat & Kata Kunci (graf rangkaian / senarai tag)         │  Zon 3
├──────────────────────────────────────────────────────────────────┤
│ Suapan Langsung (senarai siaran)                                 │
└──────────────────────────────────────────────────────────────────┘
```

### Bar atas

| Elemen | Fungsi |
|---|---|
| **Carian** | Cari perkataan dalam teks siaran atau tag, cth. `durian` atau `#cili-padi`. Semua kad, carta dan jadual dikemas kini. |
| **Sync Google Drive** | Tarik folder baharu daripada Google Drive. Notifikasi di bawah kanan menunjukkan bilangan rekod baharu. |
| **Import Data Harian** | Muat naik fail CSV/JSON sendiri. Lihat [bahagian 7](#7-import-fail-manual). |
| **Admin User** dan ikon keluar | Log keluar. |

### Penapis

- **Julat tarikh:** Hari Ini, 7 Hari Lepas (lalai), 30 Hari Lepas, atau Semua Rekod.
  - "Hari ini" bermaksud **tarikh crawl terkini**. Kalau folder hari ini belum dimuat naik ke Drive, dashboard menggunakan hari terakhir yang ada data.
- **Platform:** Semua, X, TikTok, Facebook, Threads, Instagram, atau Web / Berita.
- Label "Data terkini" di sebelah kanan menunjukkan tarikh yang dijadikan "hari ini".

### Penapis kategori

Baris kedua mengandungi 5 penapis kategori. Pilihan yang aktif diserlahkan dengan warna biru, dan bilangan penapis aktif dipaparkan sebagai lencana. Tekan **Set semula** untuk buang semua tapisan kategori. Semua kad, carta dan suapan mengikut penapis ini. Panel Risiko Komoditi tidak terkesan. Penerangan setiap kategori ada dalam [bahagian 8a](#8a-kategori-siaran).

### Pecahan Mengikut Kategori

Carta bar mendatar yang menunjukkan bilangan siaran **Positif / Neutral / Negatif** untuk setiap nilai dalam satu kategori. Pilih kategori melalui tab di atas carta: Topik, Bahasa, Jenis Sumber, Kumpulan Komoditi atau Negeri.

- **Klik bar** untuk menapis seluruh dashboard dengan nilai itu. Klik bar yang sama sekali lagi untuk buang tapisan.
- Halakan tetikus pada bar untuk melihat bilangan dan peratus setiap sentimen.
- Carta untuk kategori yang sedang ditapis masih memaparkan semua pilihan, supaya kau boleh membandingkannya. Contohnya, dengan tapisan Negeri = Johor, tab Negeri masih menunjukkan semua negeri, manakala tab lain hanya mengira siaran Johor.
- **Liputan** menunjukkan berapa peratus siaran yang ada nilai diketahui. Negeri biasanya sekitar 25%. Tandakan "Papar tidak diketahui" untuk melihat bakinya.
- Tab **Negeri** juga menyenaraikan **daerah / bandar paling kerap disebut**. Nombor merah menunjukkan bilangan siaran negatif.

### Zon 1: Kad KPI

| Kad | Maksud |
|---|---|
| **Jumlah Sebutan** | Bilangan siaran dalam julat tarikh. Lencana % membandingkan dengan tempoh sama sebelumnya, cth. 7 hari ini berbanding 7 hari sebelumnya. |
| **Skor Sentimen** | Peratus siaran positif. ↑ atau ↓ menunjukkan naik atau turun berbanding tempoh sebelumnya. |
| **Kadar Penglibatan** | Jumlah **suka + komen** semua siaran (`142.3K` = 142,300), dengan % perubahan berbanding tempoh lepas. Di bawahnya ada pecahan suka / komen dan jumlah setiap platform (Facebook, Instagram, Threads, ...). Halakan tetikus pada nama platform untuk melihat purata interaksi setiap siaran. |
| **Alert Krisis** | **Normal** (biru) atau **Amaran Lonjakan** (merah berkelip). Lihat syarat di bawah. |

**Alert Krisis menjadi merah jika:**
1. sentimen negatif melebihi **30%**, ATAU
2. ada komoditi dengan band **Merah** dalam data risiko.

Komoditi band **Kuning** disenaraikan sebagai "Dipantau", tetapi tidak mencetuskan amaran merah.

### Zon 2: Carta

- **Trend Sentimen Mengikut Masa:** bilangan siaran Positif (hijau), Neutral (kelabu) dan Negatif (merah) setiap hari. Halakan tetikus pada carta untuk melihat angka.
- **Pecahan Sentimen Keseluruhan:** peratus setiap jenis sentimen dalam julat tarikh.

### Panel Risiko Komoditi

Data ini datang terus daripada analisis pasukan Agri Data (fail `db-curated`).

| Lajur | Maksud |
|---|---|
| **Komoditi** | Nama komoditi. **Klik** untuk menapis Suapan Langsung kepada komoditi itu. `n=6` ialah saiz sampel. Tanda **Awal** bermaksud sampel kecil dan angka masih awal. |
| **Band** | Tahap risiko: 🟢 Hijau (rendah), 🟡 Kuning (perlu dipantau), 🔴 Merah (tinggi), ⚪ Tiada data. |
| **Risiko (sebelum → semasa)** | Skor risiko semalam dan hari ini. Anak panah merah ↑ = risiko naik, hijau ↓ = risiko turun. |
| **Ramalan** | Anggaran skor risiko akan datang. |
| **Indeks Sentimen** | 0–100. Lebih tinggi lebih positif. |
| **Harga** | Harga semasa dan sumbernya, cth. "Kelapa biji (ManaMurah)". |
| **Nota Analis** | Penjelasan analis. Klik untuk baca penuh. |

Jadual menunjukkan **penilaian sah terkini setiap komoditi** dalam julat tarikh, disusun dari risiko tertinggi.

Kadang-kadang folder harian baru separuh siap, atau sesuatu komoditi hanya ada 1 siaran. Dalam keadaan itu, analis menanda `band = tiada data` / "data tidak mencukupi". Panel tidak memaparkan baris kosong itu, tetapi memaparkan **penilaian sah terakhir**. Tarikhnya ditunjuk di bawah nama komoditi bersama nota kelabu, cth. *"2026-11-25: data tidak mencukupi (n=1)"*. Untuk julat "Hari Ini", sistem mencari penilaian sah sehingga 7 hari ke belakang. Penapis platform dan carian tidak terpakai pada panel ini kerana datanya ringkasan setiap komoditi, bukan siaran.

### Zon 3: Topik dan suapan

- **Topik Hangat & Kata Kunci** mempunyai dua paparan. Tukar dengan butang di penjuru kanan kad.
  - **Rangkaian** (lalai): graf hubungan antara entiti yang **disebut dalam siaran yang sama**.
    - **Bulatan** ialah entiti. Ada 5 jenis, dibezakan oleh warna bingkai:
      - Komoditi (hitam)
      - Topik (biru, garis putus-putus)
      - Negeri (oren)
      - Daerah / bandar (kuning)
      - Sumber seperti manamurah dan berita (ungu)
    - **Saiz bulatan** = bilangan siaran.
    - **Warna isi** = sentimen bersih: merah = lebih negatif, kelabu = neutral, hijau = lebih positif.
    - **Garisan** = dua entiti disebut bersama. Lebih tebal bermaksud lebih kerap. Warna garisan mengikut sentimen siaran yang menghubungkannya.
    - **Halakan tetikus** pada bulatan untuk melihat bilangan siaran, peratus positif/negatif dan 3 entiti yang paling kerap disebut bersamanya. Entiti lain akan dimalapkan.
    - **Klik** bulatan untuk menapis seluruh dashboard. Klik sekali lagi untuk buang tapisan:
      - komoditi → tapisan tag
      - topik → penapis Topik
      - negeri → penapis Negeri
      - daerah / sumber → kotak carian
    - Graf memaparkan sehingga 20 komoditi, 6 topik, 12 negeri, 14 daerah dan 6 sumber teratas, dengan 220 hubungan terkuat. Ia mengikut semua penapis.
  - **Senarai tag:** tag yang paling kerap disebut. Kebanyakannya nama komoditi, cth. `#telur`, `#durian`.
    - Saiz tag mengikut kekerapan.
    - Warna mengikut sentimen dominan: hijau = kebanyakan positif, merah = kebanyakan negatif, kelabu = neutral.
    - **Klik tag** untuk menapis suapan. Klik sekali lagi untuk buang tapisan.
- **Suapan Langsung:** senarai siaran, yang terbaru di atas. Di bawah setiap komen ada label kecil: topik (biru), lokasi 📍 (kuning) dan nama laman untuk sumber bukan media sosial.
  - Tarikh Crawl, Platform, Komen (petikan teks), Sentimen, dan Keyakinan.
  - Tekan "Papar lagi" untuk melihat 10 siaran seterusnya.
  - Tag yang sedang menapis dipaparkan di penjuru atas. Klik ✕ untuk buang tapisan.

---

## 4. Dari mana data datang

Folder Google Drive: **Agri Data Platform** (`1wXNm0nG7dUOvNWkepN9ev3BcgwFZEn8M`)

```
Agri Data Platform/
├── 2026-10-07/
│   ├── db-raw-2026-10-07.csv        ✗ tidak diimport (data mentah belum ditapis)
│   ├── db-cleansed-2026-10-07.csv   ✓ siaran relevan  → Suapan, KPI, carta
│   ├── db-curated-2026-10-07.csv    ✓ risiko komoditi → Panel Risiko, Alert
│   └── db-curated-2026-10-07.json     (salinan JSON, dilangkau kerana CSV sudah ada)
├── 2026-10-08/
├── ...
├── 2026-11-24/
└── Historical/                       (tidak diimport secara lalai)
```

Sistem hanya membaca folder yang namanya ialah tarikh `YYYY-MM-DD`. Google Sheet dalam folder diabaikan, dan hanya fail `.csv`, `.json` dan `.jsonl` dibaca.

### Pemetaan medan: `db-cleansed` → siaran

| Lajur dalam fail | Dalam dashboard |
|---|---|
| `summary_text` | Komen (teks siaran) |
| `crawl_date` | Tarikh Crawl |
| `platform` | Platform. `facebook`, `instagram`, `threads`, `tiktok` dan `x` dikekalkan. Laman lain (manamurah, jelaskini, news dan lain-lain) menjadi **Web**. |
| `commodity` | Tag, cth. `Cili Padi` menjadi `#cili-padi` |
| `likes`, `comments` | Kadar Penglibatan (disimpan berasingan; ♥ / 💬 dipaparkan di bawah platform dalam Suapan Langsung). Fail crawl tiada lajur `shares`, jadi bilangan kongsi tidak dikira. Laman web/berita biasanya 0. |
| `id` | Kunci unik supaya tiada rekod berganda |
| `relevant = false` | Baris dilangkau |
| *(tiada lajur sentimen)* | Dikira oleh sistem. Lihat [bahagian 8](#8-cara-sentimen-dikira). |

### Pemetaan medan: `db-curated` → risiko komoditi

Lajur `date`, `commodity`, `risk_before`, `risk_current`, `risk_forward`, `band`, `sentiment_index`, `sample_n`, `price_label`, `price_value`, `price_unit`, `preliminary` dan `analyst_note` dipaparkan terus seperti dalam fail. Kunci unik ialah tarikh + komoditi.

---

## 5. Menarik data (Sync)

Tekan **"Sync Google Drive"** di bar atas. Sistem akan:

1. Senaraikan semua folder tarikh dalam Drive, yang terbaru dahulu.
2. Untuk setiap folder, ambil fail `db-cleansed` dan `db-curated`.
3. **Langkau fail yang sudah pernah ditarik dan tidak berubah.** Jadi menekan Sync berkali-kali tidak menghasilkan rekod berganda.
4. Simpan rekod baharu dan kemas kini rekod sedia ada.
5. Paparkan notifikasi, cth. *"317 rekod baharu disegerakkan (2 fail, 49 folder diimbas)"*.

Sync pertama untuk semua folder mengambil kira-kira 2 minit. Selepas itu hanya folder baharu ditarik, jadi ia lebih cepat.

---

## 6. Sync automatik setiap hari

Folder harian dimuat naik ke Drive sekitar jam 6 petang. Ada dua cara untuk sync setiap hari secara automatik.

### Cara A: PC Windows sendiri (Task Scheduler)

Skrip `scripts/sync-harian.ps1` memanggil sync menggunakan `CRON_SECRET` dalam `.env.local`.

Daftar tugas harian pukul 7 malam. Jalankan arahan ini sekali sahaja dalam PowerShell:

```powershell
Register-ScheduledTask -TaskName "Sentimen Sync Harian" `
  -Trigger (New-ScheduledTaskTrigger -Daily -At 7pm) `
  -Action (New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"C:\Users\fahmi\sentimen_sms\scripts\sync-harian.ps1`"")
```

- **Server mesti sedang berjalan** (`npm start`) dan PC mesti hidup pada masa itu.
- Hasil setiap sync dicatat dalam `.data/sync-harian.log`.
- Untuk uji sekarang: `powershell -File scripts\sync-harian.ps1`
- Untuk buang tugas: `Unregister-ScheduledTask -TaskName "Sentimen Sync Harian"`

### Cara B: Hosting di Vercel

`vercel.json` sudah menjadualkan sync setiap hari pukul 09:00 waktu Malaysia (01:00 UTC). Untuk cara ini, **Supabase diperlukan**, kerana Vercel tidak boleh menyimpan fail tempatan. Lihat [bahagian 9](#9-tempat-data-disimpan).

---

## 7. Import fail manual

Gunakan cara ini untuk fail yang tiada dalam Drive, contohnya crawl lain.

1. Tekan **"Import Data Harian"**.
2. Pilih **tarikh crawl**. Tarikh ini digunakan hanya untuk baris yang tiada tarikh sendiri.
3. Seret dan lepas fail `.csv`, `.json` atau `.jsonl` (maksimum 20MB setiap fail), atau klik untuk pilih.
4. Tekan **Import**.

Fail mesti ada sekurang-kurangnya **teks** (`content`, `text`, `comment`, `summary_text` dan seumpamanya), **platform** dan **tarikh** (dalam fail atau daripada tarikh yang dipilih). Lajur `sentiment` adalah pilihan. Kalau tiada, sentimen dikira oleh sistem.

---

## 8. Cara sentimen dikira

Fail `db-cleansed` **tidak mempunyai label sentimen** untuk setiap siaran. Sistem mengelaskannya dalam dua peringkat.

### Peringkat 1: Model AI (utama)

Setiap siaran dihantar ke **model AI Gemini** (`gemini/gemini-2.5-flash`) melalui **gateway LiteLLM** organisasi (`LLM_BASE_URL`). Siaran dihantar dalam kelompok 25, dan model diarahkan untuk menilai dari **sudut pengguna dan pasaran tempatan**:

| Sentimen | Maksud |
|---|---|
| **Positif** | harga turun/murah, promosi/diskaun, bekalan mencukupi, kualiti baik, berita baik untuk pengguna atau petani tempatan |
| **Negatif** | harga naik/mahal, kekurangan bekalan, rosak, banjir/cuaca/penyakit menjejaskan hasil, aduan, kerugian petani |
| **Neutral** | fakta tanpa arah jelas (senarai harga, penerangan gambar produk, pengumuman biasa) |

- Arahan penuh kepada model ada dalam `lib/ai-sentiment.ts` (`SYSTEM_PROMPT`).
- **Keyakinan AI** dalam Suapan Langsung ialah keyakinan yang dilaporkan oleh model (0–100%).
- Sentimen hanya dikelas **sekali** untuk setiap siaran. Sync semula tidak memanggil AI lagi kecuali teks siaran berubah.
- **Bila AI berjalan:**
  - Selepas setiap **Sync Google Drive**, selama 2 minit. Sync harian automatik mendapat 4 minit.
  - Apabila kau menekan butang ungu **"Kelaskan N menunggu"** di sebelah lencana "Sentimen AI" di bawah bar atas.
  - Melalui skrip `node scripts/kelas-ai.mjs`, untuk mengelas banyak siaran sekali gus.
- **Kelajuan:** kira-kira 1,000 siaran setiap 1.5 minit. Data harian (~200 siaran) siap dalam beberapa saat.

### Peringkat 2: Kata kunci (sandaran)

Jika AI belum dikonfigurasi, gateway tidak dapat dicapai, atau siaran masih menunggu giliran, sistem menggunakan **pengelas kata kunci** (`lib/sentiment-lexicon.ts`). Contohnya, *promosi, murah, harga turun* dikira positif, dan *harga naik, mahal, banjir, rosak* dikira negatif.

Dalam Suapan Langsung, siaran yang masih guna kata kunci ditanda **`· KK`** dengan warna kelabu. Siaran ini akan dikelas AI pada giliran seterusnya.

### Ketepatan

Aku uji pada sampel 25 siaran:
- Model AI dan pengelas kata kunci hanya bersetuju pada separuh siaran. AI jauh lebih tepat untuk penerangan gambar dan ayat seperti "kos barang dapur naik ~20%".
- Tetapan `LLM_REASONING_EFFORT=low` bersetuju 23/25 dengan reasoning penuh, tetapi kira-kira 2× lebih pantas.
- Kes yang samar, seperti tembikai dilelong murah (baik untuk pengguna, buruk untuk petani), mungkin dikelas berbeza.

Jika fail import mempunyai lajur `sentiment` sendiri, label itu digunakan dan AI tidak dipanggil.

### Tukar model

Ubah `LLM_MODEL` dalam `.env.local`, cth. `gemini/gemini-3.5-flash`, kemudian restart server. Untuk melihat model yang dibenarkan oleh kunci kau: `node scripts/llm-models.mjs`. Untuk menguji kualiti pada 25 siaran: `node scripts/test-ai.mjs <model> <none|low|medium>`.

Untuk mengelas semula **semua** siaran selepas menukar model atau prompt:
1. Hentikan server.
2. Padam `.data/store.json`.
3. Mulakan server dan tekan Sync. Data akan ditarik semula daripada Drive dan dikelas semula.

Sandaran sebelum AI diaktifkan disimpan sebagai `.data/store.sebelum-ai.json`.

> **Privasi:** teks ringkasan siaran dihantar ke model Gemini melalui gateway organisasi. Jangan masukkan data peribadi sensitif ke dalam fail crawl.

---
## 8a. Kategori siaran

Setiap siaran dikategorikan secara automatik semasa Sync atau Import, dan hasilnya disimpan bersama rekod. Semua peraturan ada dalam `lib/categorize.ts` dan `lib/categories.ts`, jadi ia boleh diubah suai.

| Kategori | Cara dikira | Ketepatan | Pilihan |
|---|---|---|---|
| **Topik / Punca Isu** | Kata kunci dalam teks. Satu siaran boleh ada beberapa topik. | Sederhana | Harga, Bekalan, Promosi, Kualiti, Cuaca/Bencana, Dasar Kerajaan, Lain-lain |
| **Bahasa** | Lajur `lang` dalam fail | Tinggi | BM, Inggeris, Indonesia/Jawa/Sunda, Cina, Tamil, Lain-lain |
| **Jenis Sumber** | Platform + nama laman dalam URL | Tinggi | Media sosial; Berita / Laman web; Peruncit / Laman harga (cth. manamurah, Lotus's, Jaya Grocer, Mydin) |
| **Kumpulan Komoditi** | Lajur `commodity` | Tinggi | Sayur, Buah, Protein (ayam, telur), Rempah (cili, bawang) |
| **Negeri** (+ daerah) | Nama negeri, daerah dan bandar utama yang **disebut dalam teks** | Rendah–sederhana, kira-kira 25% liputan | 13 negeri, 3 Wilayah Persekutuan, Luar negara, Tidak disebut |

**Perkara penting:**
- **Negeri ialah lokasi yang disebut dalam teks** (tempat kedai, pasar atau isu), **bukan tempat tinggal penulis**. Data crawl tidak mengandungi lokasi pengguna.
- Nama tempat yang juga perkataan biasa BM tidak dikira, iaitu Nilai, Papar, Jeli, Baling dan Kapit. "Perak" hanya dikira jika ditulis dengan huruf besar.
- "Kulai" dalam *cili merah Kulai* / *Kulai hibrid* ialah nama varieti cili, jadi ia tidak dikira sebagai lokasi.
- **Luar negara** termasuk Indonesia, Singapura, Thailand, Vietnam dan Filipina. China dan India **tidak** dikira, kerana dalam data ini ia kebanyakannya nama produk (*kobis bulat China*, *bawang India*).
- **Umur pengguna tidak dikategorikan.** Data tidak mengandungi umur, dan meneka umur atau demografi individu daripada teks tidak tepat serta berisiko di bawah PDPA.
- Selepas mengubah peraturan kategori, tekan Sync dengan `{"force": true}` supaya rekod lama dikira semula. Lihat [API](#api-semua-perlukan-log-masuk-kecuali-yang-dinyatakan).

---

## 9. Tempat data disimpan

Sistem memilih tempat simpanan secara automatik:

| Keadaan | Tempat simpanan | Lencana di dashboard |
|---|---|---|
| Kunci Supabase **kosong** (sekarang) | Fail `.data/store.json` dalam folder projek | "Storan tempatan (.data)" |
| Kunci Supabase **diisi** | Pangkalan data Supabase | "Supabase" / "Supabase realtime aktif" |

- **Storan tempatan** sesuai untuk satu PC. Untuk sandaran, salin folder `.data/`. Untuk mula semula dari kosong, padam `.data/store.json` dan tekan Sync.
- **Untuk beralih ke Supabase:**
  1. Buat projek di supabase.com.
  2. Jalankan `supabase/schema.sql` dalam SQL Editor.
  3. Isi 3 kunci Supabase dalam `.env.local`.
  4. Build dan restart server.
  5. Tekan Sync. Data lama dalam `.data` tidak dipindahkan secara automatik, tetapi Sync akan menariknya semula daripada Drive.
- Dengan Supabase, Suapan Langsung dikemas kini secara **realtime** apabila rekod baharu masuk.

---

## 10. Tetapan `.env.local`

Fail ini mengandungi rahsia. **Jangan kongsi atau masukkan ke git.** Ia sudah dikecualikan dalam `.gitignore`. Rujuk `.env.example` untuk templat.

| Pemboleh ubah | Wajib? | Fungsi |
|---|---|---|
| `DASHBOARD_PASSWORD` | ✅ | Kata laluan log masuk (min 8 aksara) |
| `AUTH_SECRET` | ✅ | Kunci rawak untuk menandatangani sesi (min 16 aksara) |
| `GOOGLE_DRIVE_FOLDER_ID` | ✅ | ID folder Drive sumber |
| `CRON_SECRET` | Untuk sync automatik | Token rahsia untuk skrip harian / Vercel Cron |
| `LLM_BASE_URL` | Untuk sentimen AI | URL gateway AI serasi OpenAI, cth. `http://100.101.21.4:4000/v1` (LiteLLM) |
| `LLM_API_KEY` | Untuk sentimen AI | Virtual key gateway. **Rahsia.** |
| `LLM_MODEL` | Pilihan | Model, lalai `gemini/gemini-2.5-flash` |
| `LLM_REASONING_EFFORT` | Pilihan | `none` / `low` (lalai) / `medium` / `high` |
| `GOOGLE_API_KEY` | Pilihan | Cara rasmi membaca Drive. Tanpa kunci ini, sistem membaca halaman folder awam. |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Pilihan | Untuk folder Drive peribadi (JSON service account) |
| `NEXT_PUBLIC_SUPABASE_URL` | Pilihan | URL projek Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pilihan | Kunci awam Supabase (untuk realtime) |
| `SUPABASE_SERVICE_ROLE_KEY` | Pilihan | Kunci server Supabase. **Sangat rahsia.** |

Selepas mengubah `.env.local`, **restart server**. Untuk `npm start`, jalankan `npm run build` dahulu.

---

## 11. Keselamatan

- Semua halaman dan API perlukan log masuk, kecuali halaman `/login` dan sync harian, yang menggunakan `CRON_SECRET`.
- Cookie sesi adalah HttpOnly, jadi JavaScript dalam pelayar tidak boleh membacanya.
- Permintaan yang menukar data daripada laman web lain ditolak (perlindungan CSRF).
- Server boleh diakses daripada rangkaian lain. Semasa `npm start`, ia memaparkan alamat seperti `http://100.113.64.48:3000`. Guna kata laluan yang kuat. Untuk hadkan akses kepada PC ini sahaja, jalankan `npx next start -H 127.0.0.1`.

---

## 12. Masalah biasa

| Masalah | Punca dan penyelesaian |
|---|---|
| `Could not find a production build in the '.next' directory` | Build belum siap atau terganggu. Jalankan `npm run build`, tunggu sehingga selesai, kemudian `npm start`. |
| `Another next build process is already running` | Ada build lain sedang berjalan. Tunggu sehingga selesai, atau tutup terminal lama. |
| Terus dibawa ke halaman log masuk | Sesi tamat (7 hari) atau kata laluan telah ditukar. Log masuk semula. |
| "DASHBOARD_PASSWORD ... belum ditetapkan" | Isi `DASHBOARD_PASSWORD` dan `AUTH_SECRET` dalam `.env.local`, kemudian restart. |
| "Terlalu banyak cubaan" | 5 kata laluan salah. Tunggu 10 minit, atau restart server. |
| Buka `/api/sync-drive` dalam pelayar keluar ralat `CRON_SECRET` / 401 | Ini normal. URL itu untuk penjadual. Guna butang **Sync Google Drive**. |
| Dashboard kosong | Tekan **Sync Google Drive**. Kalau masih kosong, semak julat tarikh (cuba "Semua Rekod"). |
| Sync gagal: "Folder Drive tidak boleh dibaca secara awam" | Folder Drive bukan lagi "Anyone with the link". Kongsi semula, atau isi `GOOGLE_API_KEY`. |
| Sync gagal: "Format senarai Drive awam tidak dikenali" | Google mengubah halaman Drive. Isi `GOOGLE_API_KEY` (cara rasmi). |
| Notifikasi "Tekan sekali lagi untuk fail yang tinggal" | Terlalu banyak fail untuk satu kali sync (had 100). Tekan Sync sekali lagi. |
| Data hari ini tiada | Folder hari ini belum dimuat naik ke Drive, biasanya sekitar 6 petang. "Data terkini" akan menunjukkan hari sebelumnya. |
| Amaran `woff2 was preloaded but not used` dalam Console | Amaran kosmetik sahaja dan tidak menjejaskan fungsi. |
| Banyak siaran bertanda `· KK` / butang "Kelaskan N menunggu" tidak hilang | AI belum sempat mengelas semua siaran. Tekan butang ungu itu, atau jalankan `node scripts/kelas-ai.mjs`. |
| "Gateway AI 401" | `LLM_API_KEY` salah atau sudah tamat. |
| "Pengelasan AI gagal: ... CONNECT_TIMEOUT" | Gateway tidak dapat dicapai. Semak Tailscale sedang bersambung (`tailscale status`). |

---

## 13. Had sistem

- **Sentimen AI** perlukan gateway LiteLLM (`100.101.21.4`) boleh dicapai melalui Tailscale. Jika tidak, sistem kekal dengan kata kunci sehingga gateway kembali. Lihat [bahagian 8](#8-cara-sentimen-dikira).
- **Prestasi:** semua rekod dimuatkan ke pelayar setiap kali halaman dibuka. Ia laju untuk puluhan ribu rekod, tetapi akan menjadi perlahan selepas beberapa bulan data. Kalau perlahan, pengiraan perlu dipindahkan ke server.
- **Siaran berganda merentas hari:** siaran yang sama yang dicrawl semula pada hari lain dikira sekali untuk setiap hari.
- **Membaca Drive tanpa API key** bergantung pada halaman folder awam Google, yang tidak rasmi. `GOOGLE_API_KEY` lebih stabil.
- **Storan tempatan** hanya untuk satu PC. Untuk berbilang pengguna atau hosting, guna Supabase.
- Folder **Historical** tidak diimport secara lalai.

---

## 14. Untuk pembangun

### Teknologi
Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Recharts · lucide-react · Supabase (pilihan) · googleapis · LiteLLM / Gemini (sentimen)

### Struktur folder

```
app/
  page.tsx                  Halaman dashboard utama
  login/page.tsx            Halaman log masuk
  api/
    records/route.ts        GET  — semua siaran + risiko komoditi untuk dashboard
    sync-drive/route.ts     POST — butang Sync | GET — sync harian (Bearer CRON_SECRET)
    ingest/route.ts         POST — import fail CSV/JSON manual
    auth/login, logout      Log masuk / keluar
components/                 Navbar, FilterBar, CategoryFilters, KpiCards, SentimentTrendChart,
                            SentimentDonutChart, CategoryBreakdown, CommodityRiskTable, TrendingKeywords,
                            KeywordNetwork (graf rangkaian, d3-force),
                            LiveFeedTable, ImportDataModal, Toast, Card
hooks/useSentimentData.ts   Muat data, Supabase Realtime, kira KPI/carta ikut penapis
lib/
  analytics.ts              Pengiraan KPI, trend, pecahan, kata kunci, ringkasan risiko
  normalize.ts              Baca CSV/JSON dan petakan medan (siaran & risiko)
  ai-sentiment.ts           Pengelas sentimen AI (gateway LiteLLM, serasi OpenAI), prompt & kelompok
  classify-runner.ts        Kelaskan rekod yang menunggu AI dalam had masa
  sentiment-lexicon.ts      Pengelas sentimen kata kunci (sandaran)
  categorize.ts             Pengelas kategori: topik, jenis sumber, lokasi (negeri/daerah)
  categories.ts             Definisi 5 kategori untuk penapis & carta, kumpulan komoditi
  network.ts                Bina rangkaian kookurens entiti (komoditi, topik, negeri, daerah, sumber)
  commodity.ts              Seragamkan nama komoditi, warna band
  drive-source.ts           Baca Google Drive (API rasmi atau folder awam)
  store.ts                  Simpanan: Supabase atau .data/store.json
  auth.ts                   Token sesi (HMAC), semakan kata laluan
proxy.ts                    Lindungi semua laluan (log masuk + CSRF)
scripts/sync-harian.ps1     Skrip sync harian untuk Task Scheduler
scripts/kelas-ai.mjs        Kelaskan semua siaran yang menunggu AI
scripts/llm-models.mjs      Senaraikan model AI yang dibenarkan
scripts/test-ai.mjs         Uji kualiti AI pada 25 siaran sampel
supabase/schema.sql         Jadual: sentiment_records, commodity_risk, drive_sync_log
vercel.json                 Jadual cron Vercel
```

### Aliran data

```
Google Drive ──(Sync)──► normalize.ts ──► store.ts ──► /api/records ──► useSentimentData ──► komponen
   folder YYYY-MM-DD       petakan medan     .data atau                     tapis ikut tarikh,
   db-cleansed / curated   + kira sentimen   Supabase                       platform, carian, tag
```

### API (semua perlukan log masuk kecuali yang dinyatakan)

| Kaedah | Laluan | Fungsi |
|---|---|---|
| `GET` | `/api/records` | `{ storage, records[], risks[] }` |
| `POST` | `/api/sync-drive` | Badan pilihan: `{ "force": true }` untuk tarik semula semua fail, `{ "includeHistorical": true }`, `{ "maxFiles": 100 }` |
| `GET` | `/api/sync-drive` | Untuk penjadual. Header `Authorization: Bearer <CRON_SECRET>` (tanpa sesi) |
| `POST` | `/api/classify` | Kelaskan sehingga `limit` siaran yang menunggu AI. Pulangkan `{ classified, remaining }`. Panggil berulang sehingga `remaining` = 0. |
| `POST` | `/api/ingest` | `multipart/form-data` (`files`, `crawl_date`), JSON, atau CSV |
| `POST` | `/api/auth/login` | `{ "password": "..." }` (awam) |
| `POST` | `/api/auth/logout` | Log keluar |

### Arahan

```powershell
npm run dev        # pembangunan
npm run build      # bina
npm start          # jalankan hasil build
npm run lint       # semak gaya kod
npx tsc --noEmit   # semak jenis TypeScript
```
