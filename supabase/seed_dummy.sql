-- ====================================================================
-- SEED DATA DUMMY: 8 Proyek Contoh untuk Vendor dengan Variasi Lengkap
-- ====================================================================
-- PETUNJUK MENJALANKAN DI SUPABASE:
-- 1. Buka dashboard Supabase -> SQL Editor -> New Query.
-- 2. Pastikan minimal sudah ada 1 akun dengan role 'vendor' yang terdaftar di sistem.
--    Skrip ini akan secara otomatis mendeteksi vendor pertama dari tabel `vendor_profiles`.
--    Jika Anda ingin mengarahkan ke vendor tertentu, ganti nilai `v_vendor_id` di bawah.
-- 3. Klik "Run" (atau Ctrl+Enter).
-- ====================================================================

do $$
declare
  v_vendor_id uuid;
  p1_id uuid := gen_random_uuid();
  p2_id uuid := gen_random_uuid();
  p3_id uuid := gen_random_uuid();
  p4_id uuid := gen_random_uuid();
  p5_id uuid := gen_random_uuid();
  p6_id uuid := gen_random_uuid();
  p7_id uuid := gen_random_uuid();
  p8_id uuid := gen_random_uuid();
begin
  -- 1. Cari ID vendor yang terdaftar
  select user_id into v_vendor_id from public.vendor_profiles limit 1;

  if v_vendor_id is null then
    raise notice 'PERINGATAN: Belum ada akun vendor yang terdaftar di tabel vendor_profiles.';
    raise notice 'Silakan daftar (register) minimal satu akun dengan role "vendor" terlebih dahulu, lalu jalankan kembali skrip ini.';
    return;
  end if;

  raise notice 'Membuat 8 dummy projects untuk vendor ID: %', v_vendor_id;

  -- ----------------------------------------------------
  -- 1. Desain Poster & Brosur Promosi Produk Kopi UMKM
  -- ----------------------------------------------------
  insert into public.projects (
    id, vendor_id, title, description, difficulty, type, mode,
    duration_weeks, hours_per_week, reward_amount, reward_note, deadline, status
  ) values (
    p1_id, v_vendor_id,
    'Desain Poster & Brosur Promosi Produk Kopi UMKM',
    'Kami membutuhkan talenta muda di bidang desain grafis untuk merancang materi promosi peluncuran varian biji kopi nusantara baru, meliputi 3 poster promosi sosial media dan 1 lembar brosur lipat tiga untuk pameran UKM.',
    'beginner', 'freelance', 'remote',
    2, 10, 500000, 'Uang saku Rp 500.000 + Voucher Kopi + Portofolio Resmi',
    current_date + interval '14 days', 'open'
  );

  insert into public.project_skills (project_id, skill_id, min_level, is_required)
  values
    (p1_id, (select id from public.skills where name = 'Graphic Design'), 'beginner', true),
    (p1_id, (select id from public.skills where name = 'Canva'), 'beginner', true),
    (p1_id, (select id from public.skills where name = 'Adobe Photoshop'), 'beginner', false);

  -- ----------------------------------------------------
  -- 2. Pembuatan Konten Reels & Manajemen Instagram Brand Fashion
  -- ----------------------------------------------------
  insert into public.projects (
    id, vendor_id, title, description, difficulty, type, mode,
    duration_weeks, hours_per_week, reward_amount, reward_note, deadline, status
  ) values (
    p2_id, v_vendor_id,
    'Pembuatan Konten Reels & Manajemen Instagram Brand Fashion',
    'Mencari kreator konten aktif untuk memproduksi 8 video pendek Reels dan menyusun feed terjadwal selama 1 bulan. Fokus pada tren gaya busana muda ramah lingkungan (sustainable fashion).',
    'intermediate', 'freelance', 'remote',
    4, 15, 1500000, 'Honor bulanan Rp 1.500.000 + Produk Fashion + Bonus views',
    current_date + interval '21 days', 'open'
  );

  insert into public.project_skills (project_id, skill_id, min_level, is_required)
  values
    (p2_id, (select id from public.skills where name = 'Social Media Management'), 'intermediate', true),
    (p2_id, (select id from public.skills where name = 'Content Creation'), 'intermediate', true),
    (p2_id, (select id from public.skills where name = 'Video Editing'), 'beginner', false),
    (p2_id, (select id from public.skills where name = 'Copywriting'), 'beginner', false);

  -- ----------------------------------------------------
  -- 3. Redesign UI/UX Landing Page Platform Donasi Berkelanjutan
  -- ----------------------------------------------------
  insert into public.projects (
    id, vendor_id, title, description, difficulty, type, mode,
    duration_weeks, hours_per_week, reward_amount, reward_note, deadline, status
  ) values (
    p3_id, v_vendor_id,
    'Redesign UI/UX Landing Page Platform Donasi Berkelanjutan',
    'Inisiatif sukarela untuk meremajakan tampilan website galang dana yayasan sosial. Kami memerlukan desainer antarmuka pengguna untuk membuat wireframe dan prototipe interaktif di Figma yang ramah bagi donatur dari semua generasi.',
    'intermediate', 'volunteer', 'remote',
    3, 12, 0, 'Sertifikat Pengabdian Masyarakat + Rekomendasi Kerja LinkedIn',
    current_date + interval '10 days', 'open'
  );

  insert into public.project_skills (project_id, skill_id, min_level, is_required)
  values
    (p3_id, (select id from public.skills where name = 'UI/UX Design'), 'intermediate', true),
    (p3_id, (select id from public.skills where name = 'Figma'), 'intermediate', true),
    (p3_id, (select id from public.skills where name = 'HTML/CSS'), 'beginner', false);

  -- ----------------------------------------------------
  -- 4. Pembangunan Dashboard Visualisasi & Laporan Penjualan Retail
  -- ----------------------------------------------------
  insert into public.projects (
    id, vendor_id, title, description, difficulty, type, mode,
    duration_weeks, hours_per_week, reward_amount, reward_note, deadline, status
  ) values (
    p4_id, v_vendor_id,
    'Pembangunan Dashboard Visualisasi & Laporan Penjualan Retail',
    'Kami memiliki data transaksi harian dari 5 cabang toko ritel dan ingin membangun dashboard analitik interaktif menggunakan SQL dan Power BI untuk memantau performa produk paling laris dan tren jam belanja ramai.',
    'intermediate', 'freelance', 'hybrid',
    4, 20, 2500000, 'Honor Rp 2.500.000 + Biaya transport pertemuan mingguan',
    current_date + interval '30 days', 'open'
  );

  insert into public.project_skills (project_id, skill_id, min_level, is_required)
  values
    (p4_id, (select id from public.skills where name = 'SQL'), 'intermediate', true),
    (p4_id, (select id from public.skills where name = 'Power BI'), 'intermediate', true),
    (p4_id, (select id from public.skills where name = 'Data Visualization'), 'beginner', true),
    (p4_id, (select id from public.skills where name = 'Excel'), 'intermediate', false);

  -- ----------------------------------------------------
  -- 5. Pembersihan dan Entri Data Katalog Produk Toko Online
  -- ----------------------------------------------------
  insert into public.projects (
    id, vendor_id, title, description, difficulty, type, mode,
    duration_weeks, hours_per_week, reward_amount, reward_note, deadline, status
  ) values (
    p5_id, v_vendor_id,
    'Pembersihan dan Entri Data Katalog Produk Toko Online',
    'Tugas praktis memasukkan dan merapikan 350 baris data SKU produk peralatan rumah tangga ke dalam template spreadsheet Excel. Sangat cocok bagi mahasiswa baru yang ingin mengasah ketelitian input data digital.',
    'beginner', 'volunteer', 'remote',
    1, 8, 0, 'Sertifikat Pengalaman Relawan Data + Surat Keterangan Proyek',
    current_date + interval '7 days', 'open'
  );

  insert into public.project_skills (project_id, skill_id, min_level, is_required)
  values
    (p5_id, (select id from public.skills where name = 'Data Entry'), 'beginner', true),
    (p5_id, (select id from public.skills where name = 'Data Cleaning'), 'beginner', true),
    (p5_id, (select id from public.skills where name = 'Excel'), 'beginner', true);

  -- ----------------------------------------------------
  -- 6. Frontend Development Web Profil Perusahaan Startup Logistik
  -- ----------------------------------------------------
  insert into public.projects (
    id, vendor_id, title, description, difficulty, type, mode,
    duration_weeks, hours_per_week, reward_amount, reward_note, deadline, status
  ) values (
    p6_id, v_vendor_id,
    'Frontend Development Web Profil Perusahaan Startup Logistik',
    'Mengonversi desain Figma yang sudah siap menjadi halaman web responsif menggunakan Next.js dan React. Termasuk integrasi formulir kontak penawaran harga pengiriman dan animasi transisi halus.',
    'intermediate', 'freelance', 'remote',
    6, 20, 3500000, 'Honor Rp 3.500.000 + Peluang rekrutmen magang berbayar',
    current_date + interval '25 days', 'open'
  );

  insert into public.project_skills (project_id, skill_id, min_level, is_required)
  values
    (p6_id, (select id from public.skills where name = 'React'), 'intermediate', true),
    (p6_id, (select id from public.skills where name = 'Next.js'), 'beginner', true),
    (p6_id, (select id from public.skills where name = 'HTML/CSS'), 'intermediate', true),
    (p6_id, (select id from public.skills where name = 'TypeScript'), 'beginner', false);

  -- ----------------------------------------------------
  -- 7. Penulisan Artikel SEO & Copywriting Katalog Wisata Edukasi
  -- ----------------------------------------------------
  insert into public.projects (
    id, vendor_id, title, description, difficulty, type, mode,
    duration_weeks, hours_per_week, reward_amount, reward_note, deadline, status
  ) values (
    p7_id, v_vendor_id,
    'Penulisan Artikel SEO & Copywriting Katalog Wisata Edukasi',
    'Menulis 5 artikel informatif berorientasi SEO tentang destinasi wisata edukasi anak dan sejarah lokal Jawa Barat. Gaya bahasa mengalir, informatif, dan orisinal tanpa plagiasi.',
    'beginner', 'freelance', 'remote',
    3, 10, 800000, 'Honor Rp 800.000 + Byline nama penulis pada portal website',
    current_date + interval '18 days', 'open'
  );

  insert into public.project_skills (project_id, skill_id, min_level, is_required)
  values
    (p7_id, (select id from public.skills where name = 'Copywriting'), 'beginner', true),
    (p7_id, (select id from public.skills where name = 'Content Writing'), 'beginner', true),
    (p7_id, (select id from public.skills where name = 'SEO'), 'beginner', false);

  -- ----------------------------------------------------
  -- 8. Model Prediksi Permintaan Barang (Demand Forecasting) Gudang
  -- ----------------------------------------------------
  insert into public.projects (
    id, vendor_id, title, description, difficulty, type, mode,
    duration_weeks, hours_per_week, reward_amount, reward_note, deadline, status
  ) values (
    p8_id, v_vendor_id,
    'Model Prediksi Permintaan Barang (Demand Forecasting) Gudang',
    'Proyek lanjutan untuk mengolah time-series dataset logistik dan membangun model regresi/machine learning sederhana dengan Python untuk mengestimasi lonjakan stok barang saat musim liburan.',
    'advanced', 'freelance', 'remote',
    8, 25, 5000000, 'Kompensasi Rp 5.000.000 + Akses Cloud Computing GPU',
    current_date + interval '40 days', 'open'
  );

  insert into public.project_skills (project_id, skill_id, min_level, is_required)
  values
    (p8_id, (select id from public.skills where name = 'Python'), 'advanced', true),
    (p8_id, (select id from public.skills where name = 'Pandas'), 'advanced', true),
    (p8_id, (select id from public.skills where name = 'Machine Learning'), 'intermediate', true),
    (p8_id, (select id from public.skills where name = 'SQL'), 'intermediate', false);

  raise notice 'Berhasil menyisipkan 8 dummy projects beserta skill requirements.';
end $$;
