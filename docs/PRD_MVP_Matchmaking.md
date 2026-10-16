# PRD MVP — AI Job & Project Matchmaking Platform

> Tagline: Connecting people who need experience with opportunities that need people.

## 1. Ringkasan

Platform web yang mempertemukan **Talent** (mahasiswa, fresh graduate, career switcher, freelancer pemula) dengan **Vendor** (UMKM, startup kecil, event organizer, komunitas) melalui proyek freelance/volunteer. Sistem menghitung **match score** dan **skill gap** secara transparan.

**Core problem:** Job seeker butuh pengalaman untuk dapat kerja, tetapi kerja butuh pengalaman. Di sisi lain, proyek kecil dari vendor sulit mendapat exposure ke kandidat yang tepat.

## 2. Tujuan MVP

Satu alur end-to-end yang berjalan:

> Talent buat profil → Vendor posting project → Sistem menampilkan **match score + skill gap** → Talent apply → Vendor lihat pelamar terurut skor → Project selesai → Vendor beri rating

## 3. User & Role

| Role | Kebutuhan utama |
|---|---|
| **Talent** | Menemukan proyek sesuai skill/level, tahu skill apa yang kurang, membangun pengalaman dan portofolio |
| **Vendor** | Memposting proyek, mendapat kandidat yang relevan tanpa screening lama |

## 4. Scope

### In scope (MVP)
1. Auth (register/login) dengan pilihan role talent / vendor
2. Profil talent: bio, pendidikan, skill + level, availability, link portofolio
3. Profil vendor: nama organisasi, deskripsi
4. Vendor CRUD project: judul, deskripsi, skill yang dibutuhkan (+ level minimum), difficulty, durasi, tipe (freelance/volunteer), mode (remote/onsite/hybrid), reward, deadline
5. Talent: daftar project + filter + **match score** + **skill gap** per project
6. Talent apply ke project (dengan pesan singkat)
7. Vendor: daftar pelamar per project, **terurut match score**, lihat profil pelamar, ubah status (accepted/rejected/completed)
8. Rating & review dari vendor ke talent setelah project selesai
9. Dashboard talent ("Recommended for You", skill progress) dan dashboard vendor (project saya, pelamar)

### Out of scope (versi berikutnya)
Learning path otomatis, portfolio builder, CV builder (ATS), messaging, payment, collaborative filtering, ekstraksi skill dari CV via LLM, notifikasi email.

## 5. Tech Stack

- **Framework:** Next.js (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security)
- **Deploy:** Vercel
- **Validasi form:** Zod + React Hook Form
- **Matching:** fungsi TypeScript murni di `lib/matching/` (rule-based), dengan unit test

## 6. Logika Matching (rule-based v1)

Semua skor 0–100.

```
match_score =
    0.50 * skill_score
  + 0.20 * level_fit_score
  + 0.15 * availability_score
  + 0.15 * rating_score
```

- **skill_score** = (jumlah skill required yang dimiliki talent / total skill required) × 100. Skill `is_required = false` dihitung setengah bobot.
- **level_fit_score**: bandingkan level talent per skill dengan level minimum project. Level >= minimum = 100; kurang 1 tingkat = 50; kurang >= 2 tingkat = 0. Rata-ratakan seluruh skill required.
- **availability_score**: cocokkan jam/minggu talent dengan kebutuhan project, dan mode kerja (remote/onsite). Cocok = 100, sebagian = 50, tidak = 0.
- **rating_score**: rata-rata rating talent / 5 × 100. Talent tanpa review diberi nilai netral 60 agar tidak dirugikan (cold-start).

**Skill gap** = skill required project − skill dimiliki talent (termasuk skill yang dimiliki tetapi levelnya di bawah minimum, ditandai "perlu ditingkatkan").

**Catatan UX penting:**
- Skor adalah indikator kecocokan, **bukan keputusan otomatis**. Vendor tetap memutuskan.
- Tampilkan penjelasan skor ("Kamu memenuhi 3 dari 4 skill. Kurang: Power BI").
- Bahasa skill gap bersifat membangun, bukan "kamu belum cocok".

## 7. Halaman & Rute

| Rute | Role | Isi |
|---|---|---|
| `/` | publik | Landing page |
| `/login`, `/register` | publik | Auth |
| `/onboarding` | talent/vendor | Lengkapi profil sesuai role |
| `/talent/dashboard` | talent | Recommended projects, skill progress, riwayat aplikasi |
| `/talent/projects` | talent | Daftar project + filter (skill, difficulty, tipe, mode) |
| `/talent/projects/[id]` | talent | Detail, match score, skill gap, tombol Apply |
| `/talent/profile` | talent | Edit profil & skill |
| `/vendor/dashboard` | vendor | Project saya + jumlah pelamar |
| `/vendor/projects/new`, `/vendor/projects/[id]/edit` | vendor | Form project |
| `/vendor/projects/[id]/applicants` | vendor | Pelamar terurut match score + perbandingan |
| `/vendor/projects/[id]/review/[applicationId]` | vendor | Form rating setelah selesai |

## 8. Data Model

Lihat file `schema.sql` (Supabase). Tabel: `profiles`, `talent_profiles`, `vendor_profiles`, `skills`, `talent_skills`, `projects`, `project_skills`, `applications`, `reviews`.

## 9. Struktur Folder yang Disarankan

```
src/
  app/                  # routes (App Router)
  components/           # UI components (shadcn/ui di components/ui)
  lib/
    supabase/           # client & server helpers
    matching/           # score.ts, skillGap.ts, *.test.ts
    validators/         # skema Zod
  types/                # tipe dari database
supabase/
  schema.sql
```

## 10. Aturan untuk Agent (Antigravity)

- Kerjakan **satu fitur kecil per sesi**; jangan membangun seluruh platform sekaligus.
- Selalu pakai TypeScript strict dan validasi input dengan Zod.
- Akses data hanya lewat Supabase dengan RLS aktif; jangan pernah memakai service role key di sisi client.
- Logika matching harus **fungsi murni** yang bisa dites, terpisah dari UI dan database.
- Jangan menambah fitur di luar bagian "In scope".
- Setelah tiap fitur: jalankan aplikasi, tes manual alurnya, dan jelaskan apa yang berubah.
- Semua teks UI dalam Bahasa Indonesia.

## 11. Urutan Pengerjaan (prompt per tahap)

1. **Setup:** inisialisasi Next.js + Tailwind + shadcn/ui, koneksi Supabase, jalankan `schema.sql`.
2. **Auth & onboarding:** register/login, pilih role, redirect sesuai role.
3. **Profil talent:** form profil + pilih skill dari master list + level.
4. **Project vendor:** CRUD project + pilih required skills.
5. **Daftar & detail project (talent)** + fungsi `calculateMatch()` dan `calculateSkillGap()` dengan unit test.
6. **Apply** + halaman pelamar vendor terurut skor.
7. **Status, selesai, rating & review.**
8. **Dashboard** talent & vendor (kartu rekomendasi 92% / 88% seperti mockup, progress skill).
9. Polishing: empty state, loading, error handling, responsif.

## 12. Kriteria Selesai MVP 

- Talent baru bisa daftar, mengisi profil, melihat project dengan match score dan skill gap yang benar.
- Vendor bisa posting project dan melihat pelamar terurut skor.
- Rating tersimpan dan memengaruhi `rating_score` talent.
- Talent tidak bisa mengakses data privat talent lain, dan vendor hanya bisa mengelola project miliknya (diverifikasi lewat RLS). 

## 13. Risiko & Catatan

- **Cold-start:** belum ada data, jadi gunakan content-based (rule-based) dulu; siapkan data seed project dan talent dummy untuk demo.
- **Kualitas skill:** master list skill harus terstandar agar matching akurat; batasi input skill bebas.
- **Bias algoritma:** dokumentasikan bobot dan tampilkan penjelasan skor.
- **Privasi data:** tampilkan data kontak talent ke vendor hanya setelah talent apply.

## Change Log: Revisi Pembayaran & Penyelesaian

Pembaruan arsitektur dan alur kerja end-to-end (9 Bagian):

### 1. Alur Status & Transisi Workflow (Bagian 1)
- **Application Status**: Diperluas menjadi 7 status:
  - `pending`: Menunggu Review
  - `accepted`: Diterima (Talent mulai pengerjaan)
  - `rejected`: Ditolak
  - `withdrawn`: Dibatalkan oleh talent
  - `submitted`: Hasil Terkirim (Talent menyerahkan dokumentasi/tautan hasil pengerjaan)
  - `approved`: Hasil Disetujui (Vendor menyetujui hasil pengerjaan)
  - `completed`: Selesai (Proyek selesai seluruhnya)
- **Payment Status**: Enum baru dengan 4 status:
  - `none`: Tidak ada pembayaran (untuk proyek gratis / volunteer / tanpa fee)
  - `not_requested`: Belum ada pengajuan pembayaran (saat accepted untuk proyek berbayar)
  - `awaiting_payment`: Menunggu pembayaran (setelah vendor menyetujui hasil pengerjaan)
  - `paid`: Pembayaran selesai (dikonfirmasi melalui webhook gateway pembayaran)
- **Fungsi Murni Transisi**: `canTransition(from, to, actor, context)` di `src/lib/workflow/transitions.ts` menjamin kepatuhan seluruh aturan bisnis di sisi server dan klien.
- **Aturan Transisi Kunci**:
  - Talent: `pending` -> `withdrawn`, `accepted` -> `submitted`.
  - Vendor: `pending` -> `accepted` | `rejected`, `submitted` -> `approved` | `accepted` (minta revisi).
  - Jika proyek tidak memiliki fee: vendor menyetujui hasil (`submitted` -> `approved`) lalu sistem menyelesaikan proyek (`completed`).
  - Jika proyek memiliki fee: approval membuat catatan pembayaran dan charge gateway, lalu status pembayaran menjadi `awaiting_payment`. Transisi ke `completed` hanya sah melalui webhook terverifikasi setelah status pembayaran `paid`.
- **Status Implementasi**: Aksi server untuk accept, submit hasil, approval/revisi, dan webhook settlement menggunakan fungsi transisi. Penyelesaian pembayaran disimpan atomik melalui RPC pada migrasi `20261010_payment_webhook.sql`.

### 2. Lampiran Lamaran (Bagian 2 - Skema & Akses Unduhan)
- Migrasi menambahkan path CV/portofolio per lamaran dan bucket privat PDF maksimal 5 MB. Policy mengikat path file ke pemilik lamaran serta memberi vendor pemilik proyek akses baca.
- Server Action membuat signed URL unduhan selama 5 menit setelah memverifikasi talent/vendor pemilik. UI unggah lampiran saat apply masih perlu dikerjakan.

### 3. Pengiriman Hasil Pengerjaan & Revisi (Bagian 3 - Mendatang)
- Formulir penyerahan tautan hasil pengerjaan & catatan dari talent ke vendor.
- Fitur penolakan hasil dengan catatan revisi dari vendor agar talent dapat memperbaiki hasil.

### 4. Pembayaran via Payment Gateway & Webhook (Bagian 4 - Implementasi Dasar)
- Provider Midtrans/Mock, payment record, validasi nominal, verifikasi webhook, dan penyelesaian status atomik telah tersedia. Penggunaan Midtrans memerlukan konfigurasi kredensial dan pengujian integrasi di lingkungan gateway.

### 5. Rating & Review Wajib (Bagian 5 - Mendatang)
- Vendor wajib mengisi rating sebelum proyek ditutup dan sertifikat diterbitkan.

### 6. Sertifikat Digital Talenta (Bagian 6 - Mendatang)
- Penerbitan sertifikat digital otomatis pasca-penyelesaian proyek.

### 7. Help Desk & Layanan Pengaduan (Bagian 7 - Mendatang)
- Sistem tiket pengaduan / sengketa antara talent dan vendor.

### 8. Visibilitas & Breakdown Match Score (Bagian 8 - Mendatang)
- Transparansi rincian bobot kecocokan untuk talent dan vendor.

### 9. Integrasi Menyeluruh & Testing (Bagian 9 - Mendatang)
- Unit test transisi dan validator tersedia; pengujian integrasi end-to-end masih perlu dijalankan.

---

## Change Log: Chat (Bagian 1 — Migrasi Database & Fondasi Komunikasi Talent-Vendor)

Fitur percakapan real-time menghubungkan talent dan vendor (pemilik project) secara langsung setelah talent mengajukan lamaran. Tujuannya memfasilitasi diskusi teknis, klarifikasi revisi pengerjaan, pertukaran kontak, hingga penjadwalan meeting virtual dari dalam aplikasi.

### 1. Skema Database (`supabase/migrations/003_chat.sql`)
- **Enum `message_kind`**: `'text'`, `'system'`, `'contact'`, `'meeting'`.
- **Tabel `conversations`**:
  - `id` (UUID PK default `gen_random_uuid()`).
  - `application_id` (UUID UNIQUE REFERENCES `applications(id)` ON DELETE CASCADE).
  - `talent_id` (UUID REFERENCES `talent_profiles(user_id)` ON DELETE CASCADE).
  - `vendor_id` (UUID REFERENCES `vendor_profiles(user_id)` ON DELETE CASCADE).
  - `created_at` (TIMESTAMPTZ DEFAULT now()).
  - `last_message_at` (TIMESTAMPTZ DEFAULT now()).
  - `last_message_preview` (TEXT max 80 karakter).
  - Denormalisasi `talent_id` dan `vendor_id` untuk efisiensi kueri dan evaluasi Row-Level Security.
- **Tabel `messages`**:
  - `id` (UUID PK default `gen_random_uuid()`).
  - `conversation_id` (UUID REFERENCES `conversations(id)` ON DELETE CASCADE).
  - `sender_id` (UUID REFERENCES `profiles(id)` ON DELETE SET NULL, NULL untuk pesan sistem).
  - `kind` (`message_kind` default `'text'`).
  - `body` (TEXT NOT NULL CHECK 1-2000 karakter).
  - `metadata` (JSONB NOT NULL DEFAULT `{}` untuk payload pertukaran kontak atau meeting).
  - `created_at` (TIMESTAMPTZ DEFAULT now()).
  - Index pada `(conversation_id, created_at desc)`.
- **Tabel `conversation_reads`**:
  - `conversation_id` (UUID REFERENCES `conversations(id)` ON DELETE CASCADE).
  - `user_id` (UUID REFERENCES `profiles(id)` ON DELETE CASCADE).
  - `last_read_at` (TIMESTAMPTZ DEFAULT now()).
  - Primary key komposit `(conversation_id, user_id)`.

### 2. Triggers & Prosedur Otomatis
- **Trigger `trg_create_application_conversation`**:
  - Dijalankan otomatis setelah `INSERT` pada tabel `applications` (SECURITY DEFINER).
  - Mengambil `vendor_id` dari proyek terkait dan membuat entitas percakapan satu pintu.
  - Dilengkapi migrasi backfill untuk lamaran yang sudah ada dalam database.
- **Trigger `trg_update_conversation_last_message`**:
  - Dijalankan setelah `INSERT` pada tabel `messages`.
  - Memperbarui `conversations.last_message_at` dan memotong 80 karakter pertama isi pesan ke `last_message_preview`.

### 3. Fungsi RPC `get_unread_counts()`
- Mengembalikan tabel `(conversation_id uuid, unread_count bigint)` untuk `auth.uid()`.
- Menghitung pesan yang masuk (`sender_id <> auth.uid()` atau NULL) dengan `created_at > last_read_at` milik pengguna.

### 4. Row Level Security (RLS)
- **`conversations`**:
  - `SELECT`: Hanya jika `auth.uid() = talent_id` atau `auth.uid() = vendor_id`.
  - `INSERT/UPDATE/DELETE`: Dilarang dari sisi klien (dikelola server/trigger).
- **`messages`**:
  - `SELECT`: Hanya partisipan percakapan (`talent_id` atau `vendor_id`).
  - `INSERT`: Wajib `sender_id = auth.uid()`, merupakan partisipan percakapan, `kind IN ('text', 'contact', 'meeting')` (pesan `system` ditolak dari klien), dan status lamaran masih aktif (`pending`, `accepted`, `submitted`, `approved`).
  - `UPDATE/DELETE`: Dilarang dari sisi klien.
- **`conversation_reads`**:
  - `SELECT/INSERT/UPDATE`: Hanya baris milik `auth.uid()`.

### 5. Supabase Realtime
- Tabel `messages` didaftarkan ke publikasi `supabase_realtime` (`ALTER PUBLICATION supabase_realtime ADD TABLE messages;`).

---

## Change Log: Chat (Bagian 2 — Logika Inti & Validasi Teruji)
- **`src/lib/chat/permissions.ts`**:
  - `canSendMessage(status)`: `true` untuk `pending`, `accepted`, `submitted`, `approved`; `false` untuk status read-only (`rejected`, `withdrawn`, `completed`).
  - `getChatNotice(status)`: Banner deskriptif Bahasa Indonesia untuk mode hanya-baca.
- **`src/lib/chat/contact.ts`**:
  - `normalizeWhatsAppNumber(input)`: Menerima format `08xx`, `+628xx`, `628xx`, spasi/strip; mengembalikan format `628...` (10-15 digit).
  - `buildWhatsAppLink(number, prefillText?)`: Membuat tautan aman `https://wa.me/<nomor>?text=...`.
- **`src/lib/chat/meeting.ts`**:
  - Skema Zod `meetingProposalSchema`: Memvalidasi judul, waktu mulai (harus di masa depan), durasi (15-240 menit), platform (`google_meet`, `zoom`, `offline`, `other`), lokasi (wajib jika offline), tautan, catatan.
  - `buildIcs(meeting, organizerName)`: Menghasilkan string kalender RFC 5545 `.ics` valid dengan `DTSTART`, `DTEND`, `SUMMARY`, `LOCATION`.
- **`src/lib/chat/messages.ts`**:
  - `sanitizeMessageBody(text)`: Trim, batas 2000 karakter, tolak pesan kosong.
  - `linkify(text)`: Memecah teks menjadi segmen tautan aman HTTP/HTTPS (`rel="noopener noreferrer nofollow"`, `target="_blank"`), menolak skema bahaya seperti `javascript:` atau `data:`.
  - `formatSystemMessage(event, ctx)`: Templating pesan sistem tanpa membocorkan data sensitif untuk 9 event siklus hidup proyek.

---

## Change Log: Chat (Bagian 3 — Server Actions & Integrasi Alur)
- **`src/app/(chat)/actions.ts`**:
  - `sendTextMessage(conversationId, body)`: Sanitasi teks, validasi partisipan dan permission status lamaran, pembatasan laju 20 pesan/menit.
  - `shareWhatsApp(conversationId, number, note?)`: Normalisasi nomor WA, simpan pesan kind `contact`.
  - `proposeMeeting(conversationId, payload)`: Validasi Zod usulan meeting, simpan pesan kind `meeting` dengan status `proposed`.
  - `respondToMeeting(messageId, 'confirmed' | 'declined')`: Memastikan hanya pihak lawan (bukan pengusul) yang dapat merespons, memicu pesan sistem konfirmasi/penolakan.
  - `markConversationRead(conversationId)`: Upsert penanda waktu baca di `conversation_reads`.
- **`src/lib/chat/system-messages.ts`**:
  - `createChatSystemMessage(applicationId, event, ctx)`: Menjalankan penyisipan pesan sistem via service role Supabase Admin client tanpa ekspos kredensial ke klien.
- **Integrasi Event Siklus Hidup**:
  - Apply lamaran (`application_created`).
  - Penyerahan hasil kerja (`work_submitted`).
  - Lamaran diterima (`application_accepted`).
  - Lamaran ditolak (`application_rejected`).
  - Permintaan revisi berserta catatan (`revision_requested`).
  - Konfirmasi hasil kerja (`work_approved`).
  - Tagihan diterbitkan (`payment_awaiting`).
  - Pembayaran sukses (`payment_paid`).
  - Proyek selesai (`application_completed`).

---

## Change Log: Chat (Bagian 4 — Antarmuka Pengguna & Real-time)
- **Rute Chat**:
  - `/talent/messages` & `/talent/messages/[id]`: Antarmuka inbox talent.
  - `/vendor/messages` & `/vendor/messages/[id]`: Antarmuka inbox vendor.
- **Dua Panel Responsif (`src/components/chat/chat-inbox.tsx`)**:
  - Tampilan desktop: Panel daftar percakapan di sebelah kiri (dengan pencarian, pratinjau pesan terakhir, waktu relatif, status lamaran, dan badge belum dibaca) dan thread aktif di sebelah kanan.
  - Tampilan mobile: Transisi satu panel dengan tombol kembali dari thread ke daftar percakapan.
  - Dukungan deep link langsung ke `/[role]/messages/[id]` dan query param `?appId=...`.
- **Thread Percakapan (`src/components/chat/chat-thread.tsx`)**:
  - Header: Nama lawan bicara, peran, judul proyek, status lamaran, tautan proyek/pelamar. Khusus vendor menampilkan badge skor kecocokan real-time; sisi talent mematuhi flag `SHOW_MATCH_TO_TALENT` tanpa membocorkan skor kecocokan atau skill gap.
  - Banner pengingat keamanan permanen dan tombol "Laporkan percakapan" terintegrasi Help Desk.
  - Gelembung pesan pembeda milik sendiri dan lawan, penanda status "Dibaca", baris pesan sistem netral di tengah, pemisah tanggal ("Hari ini", "Kemarin", tanggal lengkap).
  - Kartu khusus `contact` (buka WhatsApp) dan `meeting` (konfirmasi/tolak untuk lawan bicara, gabung meeting dan unduh `.ics` kalender setelah dikonfirmasi).
  - Composer dengan dukungan keyboard shortcut (Enter kirim, Shift+Enter baris baru), batas 2000 karakter, menu aksi tambahan (+), dan auto-disable saat status lamaran read-only.
- **Real-time & Sinkronisasi**:
  - Langganan Supabase Realtime pada event `INSERT`/`UPDATE` tabel `messages` dan `conversation_reads`.
  - Fallback polling setiap 15 detik jika websocket terputus.
  - Optimistic update saat pengiriman pesan dengan tombol "Coba lagi" jika transmisi gagal.
  - Auto-scroll ke pesan terbaru dengan tombol pill melayang "Pesan baru" jika posisi scroll pengguna tidak berada di paling bawah.
  - Integrasi penanda waktu baca otomatis (`markConversationRead`) saat membuka thread.
- **Navigasi & Titik Masuk**:
  - Navbar: Menu "Pesan" dengan badge total unread counter dinamis untuk role talent dan vendor.
  - Tombol "Buka Percakapan" di kartu Lamaran Saya (`applications-list.tsx`), daftar pelamar vendor (`applicants-manager.tsx`), modal detail pelamar (`applicant-detail-modal.tsx`), dan halaman detail proyek talent pasca-melamar (`src/app/talent/projects/[id]/page.tsx`).



