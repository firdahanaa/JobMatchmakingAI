# Pathfolio 🚀
### Connecting People Who Need Experience With Opportunities That Need People

Pathfolio adalah platform matchmaking proyek freelance dan volunteer cerdas yang mempertemukan talenta muda (mahasiswa & fresh graduates yang membutuhkan pengalaman nyata dan portofolio) dengan UMKM & startup yang membutuhkan bantuan talenta fleksibel dan terjangkau. 

Platform ini dilengkapi mesin pencocokan (*matchmaking engine*) berbasis aturan transparan (4 komponen), analisis *skill gap* konstruktif, manajemen pelamar komparatif bagi vendor, serta sistem rating & ulasan performa kerja dua arah.

---

## 🌟 Fitur Utama

### 1. Mesin Matchmaking Berbasis AI (Pure Functional & Transparent)
- **4 Komponen Penilaian Berbobot**:
  - **Skill Match (50%)**: Membandingkan skill kandidat dengan skill proyek (skill *required* berbobot 1.0, non-required 0.5).
  - **Level Fit (20%)**: Menilai kecukupan tingkat keahlian (*Beginner*, *Intermediate*, *Advanced*).
  - **Availability (15%)**: Mencocokkan ketersediaan jam per minggu dan mode kerja (*Remote*, *Onsite*, *Hybrid*).
  - **Reputasi / Rating (15%)**: Proporsional dari rata-rata ulasan riil (skor netral cold-start 60% bagi talenta baru).
- **Analisis Skill Gap & Edukasi Konstruktif**:
  - Menghitung persentase kesiapan (*readiness %*).
  - Menampilkan daftar skill yang cocok (*matched skills*), skill yang belum dimiliki (*missing skills*), serta skill yang perlu dinaikkan levelnya (*under-level skills*).
  - Menyajikan saran konstruktif yang menyemangati (bukan pesan penolakan).
- **Rekomendasi teks TF-IDF + Cosine Similarity**:
  - Teks talent berasal dari headline, bio, dan nama skill; teks proyek berasal dari judul, deskripsi, dan nama skill proyek. Data dibaca dari Supabase melalui query rekomendasi yang sudah ada.
  - Token dinormalisasi dengan NFKC, huruf kecil, lalu tokenisasi huruf/angka Unicode. `TF = frekuensi token / jumlah token`; `IDF = ln((N + 1) / (df + 1)) + 1`; vektor TF-IDF dibandingkan dengan cosine similarity dan skor dibatasi ke 0–1.
  - Skor cosine ditampilkan terpisah sebagai persentase. Urutan rekomendasi memakai `0.80 × skor composite lama + 0.20 × (cosine × 100)`. Komponen composite tetap berbobot skill 50%, level fit 20%, availability 15%, dan rating 15%; skor snapshot lamaran juga tetap memakai rumus lama.
  - IDF dihitung pada satu korpus bersama yang berisi dokumen query dan seluruh kandidat untuk daftar rekomendasi tersebut, sehingga nilai kandidat bisa dibandingkan secara konsisten.

### 2. Sisi Talenta (Talent Experience)
- **Profil Lengkap & Portofolio**:
  - Headline, bio, pendidikan, lokasi, ketersediaan jam/minggu, preferensi mode kerja, dan multi-URL portofolio terverifikasi.
  - Indikator kelengkapan profil (*progress bar* interaktif).
  - Master list skill dengan penetapan tingkat keahlian (*Beginner / Intermediate / Advanced*).
- **Dashboard Talenta (`/talent/dashboard`)**:
  - Rekomendasi Top 5 Proyek berdasarkan skor gabungan composite dan similarity teks.
  - **Skill Progress Bar**: Visualisasi kemahiran tiap keahlian (Beginner 33%, Intermediate 66%, Advanced 100%).
  - **Skill Gap Teratas**: Agregasi 3 skill yang paling sering kurang dari seluruh proyek terbuka yang relevan beserta saran belajar terarah.
  - Ringkasan metrik: Jumlah lamaran, proyek selesai, dan skor rata-rata rating dengan visualisasi bintang.
- **Eksplorasi Proyek & Detail Kecocokan (`/talent/projects`)**:
  - Filter berdasarkan kesulitan (*difficulty*), tipe (*freelance/volunteer*), mode kerja (*remote/onsite/hybrid*), dan pencarian kata kunci.
  - Pengurutan default berdasarkan Match Score tertinggi, terbaru, atau deadline terdekat.
  - Modal lamaran instan dengan pesan singkat dan snapshot skor server.
- **Riwayat & Pelacakan Lamaran (`/talent/applications`)**:
  - Pemantauan status lamaran (*Pending*, *Accepted*, *Rejected*, *Completed*, *Withdrawn*).
  - Fitur penarikan (*withdraw*) lamaran yang masih berstatus pending.

### 3. Sisi Vendor (Vendor Experience)
- **Manajemen Proyek Lengkap (`/vendor/dashboard`)**:
  - Posting proyek baru (`/vendor/projects/new`) & edit proyek (`/vendor/projects/[id]/edit`).
  - Penentuan kebutuhan skill dari master catalog, tingkat minimum, dan status wajib (*required*).
  - Pengubah status cepat (*Open*, *Closed*, *Completed*).
  - Dialog konfirmasi aman sebelum menghapus proyek.
  - Highlight pelamar teratas (*nama + match score*) langsung pada kartu proyek.
- **Evaluasi & Komparasi Pelamar (`/vendor/projects/[id]/applicants`)**:
  - Daftar pelamar terurut secara real-time berdasarkan skor gabungan composite dan similarity teks.
  - Fitur **Bandingkan Pelamar**: Memilih 2–3 kandidat untuk ditampilkan berdampingan dalam tabel komparasi detail (skill, level fit, ketersediaan, rating, dan pengalaman).
  - Modal detail pelamar dengan riwayat ulasan masa lalu dan info kontak terlindungi (hanya tampil setelah diterima).
- **Rating & Review Pasca Selesai**:
  - Tombol "Beri Penilaian" saat lamaran ditandai *Completed*.
  - Evaluasi multi-kriteria: Rating keseluruhan (1–5 bintang, wajib), kualitas, ketepatan waktu, komunikasi, dan catatan evaluasi.
  - Otomatis memperbarui view `talent_ratings` dan matching score talenta.

---

## 🛠️ Tech Stack

| Layer | Teknologi |
| :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Server Actions, Suspense) |
| **Library UI** | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Triggers, Views) |
| **Validasi Skema** | [Zod v4](https://zod.dev/), [React Hook Form](https://react-hook-form.com/) |
| **Notifikasi Toast** | [Sonner](https://sonner.emilkowal.ski/) |
| **Unit Testing** | [Vitest](https://vitest.dev/) |

---

## 📁 Struktur Folder

```text
JobMatchmakingAI/
├── docs/                        # Dokumentasi PRD & spesifikasi teknis
│   └── PRD_MVP_Matchmaking.md
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── auth/                # Callback autentikasi Supabase
│   │   ├── login/               # Halaman masuk
│   │   ├── register/            # Halaman pendaftaran (pilihan peran Talent/Vendor)
│   │   ├── onboarding/          # Formulir onboarding pasca registrasi
│   │   ├── talent/              # Rute khusus talenta
│   │   │   ├── dashboard/       # Dashboard talenta, skill progress & gap
│   │   │   ├── profile/         # Pengelolaan profil, portofolio & skill
│   │   │   ├── projects/        # Eksplorasi & detail kecocokan proyek
│   │   │   └── applications/    # Pelacakan status lamaran
│   │   ├── vendor/              # Rute khusus vendor
│   │   │   ├── dashboard/       # Dashboard statistik & daftar proyek vendor
│   │   │   └── projects/        # Pembuatan, edit & seleksi pelamar
│   │   ├── error.tsx            # Global error boundary
│   │   ├── not-found.tsx        # Halaman 404
│   │   ├── loading.tsx          # Root skeleton loader
│   │   └── layout.tsx           # Root layout & metadata Bahasa Indonesia
│   ├── components/              # Komponen modular reusable
│   │   ├── talent/              # Komponen talenta (MatchScoreBadge, FilterBar, dll.)
│   │   ├── ui/                  # Design system primitives (Button, Card, StarRating, Progress)
│   │   └── vendor/              # Komponen vendor (ApplicantsManager, ProjectForm, dll.)
│   ├── lib/
│   │   ├── matching/            # Mesin Matchmaking (fungsi murni & kalkulasi skor)
│   │   │   ├── types.ts         # Tipe data konteks & hasil match
│   │   │   ├── skillGap.ts      # Kalkulasi kesenjangan skill
│   │   │   ├── score.ts         # Algoritma pembobotan 4-komponen
│   │   │   ├── tfidf.ts         # TF-IDF, cosine similarity, dan ranking rekomendasi
│   │   │   ├── matching.test.ts # Unit test skor match & skill gap
│   │   │   └── tfidf.test.ts    # Unit test TF-IDF, cosine, dan ranking
│   │   ├── supabase/            # Client Supabase (browser, server, middleware)
│   │   ├── validators/          # Skema validasi Zod (auth, talent, project, application)
│   │   └── utils.ts             # Utility classnames (clsx, tailwind-merge)
│   └── types/                   # Definisi tipe database TypeScript
├── supabase/
│   ├── schema.sql               # Skema PostgreSQL lengkap, RLS, Enum, Triggers, Views
│   └── seed_dummy.sql           # Data dummy 8 proyek dengan variasi skill lengkap
├── package.json
└── README.md
```

---

## ⚙️ Panduan Setup & Instalasi Lokal

### 1. Prasyarat
- **Node.js**: Versi 18.18 atau lebih baru (disarankan Node.js 20+).
- **Package Manager**: `npm` (atau `pnpm` / `yarn`).
- **Proyek Supabase**: Akun aktif di [Supabase.com](https://supabase.com) (gratis).

### 2. Klon Repositori & Pasang Dependensi
```bash
git clone https://github.com/firdahanaa/JobMatchmakingAI.git
cd JobMatchmakingAI
npm install
```

### 3. Konfigurasi Environment Variables
Salin contoh berkas konfigurasi lingkungan atau buat berkas `.env.local` di akar direktori:

```bash
cp .env.example .env.local
```

Isi variabel dengan kredensial dari dashboard Supabase Anda (**Project Settings -> API**):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Eksekusi Skema Database (`schema.sql`)
1. Buka dashboard Supabase proyek Anda.
2. Masuk ke menu **SQL Editor** -> klik **New query**.
3. Buka file [`supabase/schema.sql`](file:///c:/xampp/src/JobMatchmakingAI/supabase/schema.sql), salin seluruh isinya, dan tempel ke SQL Editor.
4. Klik tombol **Run** (Ctrl + Enter) untuk membuat seluruh tabel, enum, indeks, trigger pembuatan profil otomatis, dan view `talent_ratings`.

### 5. Memasukkan Data Demo Realistis (*Seed Demo Data*)
Tersedia dataset demo lengkap berisi **10 Talenta** (profil, bio, portfolio, ragam skill), **3 Vendor** (Kopi Nusantara, Edukarya Studio, Kreativa Lab), **12 Proyek** (variasi tingkat kesulitan Beginner/Intermediate/Advanced, freelance/volunteer, remote/onsite/hybrid), **8 Lamaran**, dan **2 Review Rating** untuk menguji algoritma matchmaking dan dashboard secara nyata.

Seluruh akun demo dibuat dengan kata sandi: `Password123!`

Pilih salah satu dari 2 cara berikut:

#### Opsi A: Melalui Supabase SQL Editor (Paling Cepat & Mudah)
1. Buka dashboard Supabase -> **SQL Editor** -> klik **New query**.
2. Buka file [`supabase/seed_demo.sql`](file:///c:/xampp/src/JobMatchmakingAI/supabase/seed_demo.sql), salin seluruh isinya, dan tempel ke SQL Editor.
3. Klik tombol **Run** (Ctrl + Enter). Data demo akan langsung terisi lengkap.

#### Opsi B: Melalui Skrip Node CLI (`scripts/seed.ts`)
Skrip ini memanfaatkan Supabase Admin API untuk otomatisasi lokal:
1. Tambahkan `SUPABASE_SERVICE_ROLE_KEY` ke `.env.local` Anda (didapat dari **Project Settings -> API -> service_role secret**).
   > ⚠️ **Catatan Keamanan**: Service Role Key **HANYA** digunakan pada skrip lokal `scripts/seed.ts` dan **TIDAK PERNAH** diekspos di kode aplikasi Next.js maupun sisi browser.
2. Jalankan perintah:
   ```bash
   npm run seed
   ```

---

## 🚀 Menjalankan Server & Pengujian

### Menjalankan Server Pengembangan (Dev)
```bash
npm run dev
```
Buka peramban di [http://localhost:3000](http://localhost:3000).

### Menjalankan Seluruh Unit Test
Pengujian mencakup unit test mesin matching, validasi input formulir Zod, dan evolusi skor rating:
```bash
npm run test:run
```

Untuk menjalankan test dalam mode watch:
```bash
npm run test
```

### Menjalankan Linting
```bash
npm run lint
```

### Membangun Versi Produksi (*Build*)
```bash
npm run build
npm run start
```

---

## 🧪 Dokumentasi Rumus & Uji Match Score

Mesin pencocokan mengimplementasikan kalkulasi murni tanpa efek samping:

$$\text{Match Score} = \text{round}\left( 0.50 \times \text{SkillScore} + 0.20 \times \text{LevelFitScore} + 0.15 \times \text{AvailabilityScore} + 0.15 \times \text{RatingScore} \right)$$

1. **Cold-Start**: Talenta yang belum memiliki review mendapatkan ratingScore netral = **60** (berkontribusi 9 poin ke skor keseluruhan).
2. **Review Rating 5**: Setelah vendor memberikan ulasan bintang 5 pertama, ratingScore menjadi **100** ($5/5 \times 100$), meningkatkan skor keseluruhan sebesar +6 poin.
3. **Review Rating 1**: Jika talenta kemudian menerima ulasan bintang 1, rata-rata menjadi 3.00, sehingga ratingScore kembali ke **60** ($3/5 \times 100$).
Semua skenario ini teruji secara otomatis di `src/lib/matching/matching.test.ts`.

---

## 📄 Lisensi
Proyek ini dikembangkan untuk tujuan edukasi dan portofolio profesional di bawah lisensi MIT.
