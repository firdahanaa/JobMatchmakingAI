import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';

// Coba muat file environment (.env.local atau .env) jika berjalan di Node.js
if (typeof process.loadEnvFile === 'function') {
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envLocalPath)) {
    try {
      process.loadEnvFile(envLocalPath);
    } catch {}
  } else if (fs.existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
    } catch {}
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('\n❌ ERROR: NEXT_PUBLIC_SUPABASE_URL tidak ditemukan di environment.');
  console.error('Pastikan file .env.local telah diisi dengan benar.\n');
  process.exit(1);
}

if (!supabaseServiceRoleKey || supabaseServiceRoleKey === 'your-service-role-key-here') {
  console.error('\n❌ ERROR: SUPABASE_SERVICE_ROLE_KEY tidak ditemukan atau masih default!');
  console.error('--------------------------------------------------------------------------------');
  console.error('Skrip ini menggunakan Supabase Admin API untuk membuat akun demo langsung.');
  console.error('Dapatkan Service Role Key dari:');
  console.error('  Supabase Dashboard -> Project Settings -> API -> Project API keys -> service_role');
  console.error('Lalu masukkan ke file .env.local:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=eyJh...');
  console.error('--------------------------------------------------------------------------------');
  console.error('💡 ALTERNATIF TANPA SERVICE ROLE KEY:');
  console.error('Anda dapat langsung menjalankan file SQL di Supabase SQL Editor:');
  console.error('  supabase/seed_demo.sql');
  console.error('--------------------------------------------------------------------------------\n');
  process.exit(1);
}

// Inisialisasi Supabase Admin Client (Hanya untuk skrip lokal, BUKAN untuk kode aplikasi)
const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEFAULT_PASSWORD = 'Password123!';

interface SeedVendor {
  email: string;
  name: string;
  description: string;
  location: string;
  website: string;
}

interface SeedTalent {
  email: string;
  name: string;
  headline: string;
  bio: string;
  education: string;
  location: string;
  hoursPerWeek: number;
  preferredMode: 'remote' | 'onsite' | 'hybrid';
  portfolioUrls: string[];
  skills: { name: string; level: 'beginner' | 'intermediate' | 'advanced'; years: number }[];
}

const vendorsData: SeedVendor[] = [
  {
    email: 'vendor.kopi@example.com',
    name: 'Kopi Nusantara Roastery',
    description: 'UMKM produsen biji kopi single origin dan kedai kopi artisanal dengan 5 cabang di Jabodetabek.',
    location: 'Jakarta Selatan',
    website: 'https://kopinusantara.co.id',
  },
  {
    email: 'vendor.edukarya@example.com',
    name: 'Edukarya Tech Studio',
    description: 'Startup edutech berbasis di Bandung yang mengembangkan platform bimbingan belajar dan modul latihan interaktif untuk siswa.',
    location: 'Bandung',
    website: 'https://edukarya.id',
  },
  {
    email: 'vendor.kreativa@example.com',
    name: 'Kreativa Media Lab',
    description: 'Agensi kreatif dan digital marketing yang membantu puluhan brand F&B dan fashion lokal bertumbuh lewat strategi konten digital.',
    location: 'Yogyakarta',
    website: 'https://kreativamedia.com',
  },
];

const talentsData: SeedTalent[] = [
  {
    email: 'aditya.talent@example.com',
    name: 'Aditya Pratama',
    headline: 'Frontend Developer | React & Next.js Enthusiast',
    bio: 'Mahasiswa tingkat akhir Teknik Informatika yang fokus pada pengembangan antarmuka web modern, responsif, dan ramah pengguna.',
    education: 'S1 Ilmu Komputer Universitas Indonesia',
    location: 'Jakarta Selatan',
    hoursPerWeek: 25,
    preferredMode: 'remote',
    portfolioUrls: ['https://github.com/adityapratama', 'https://adityadev.me'],
    skills: [
      { name: 'React', level: 'advanced', years: 2 },
      { name: 'Next.js', level: 'intermediate', years: 2 },
      { name: 'TypeScript', level: 'intermediate', years: 1 },
      { name: 'UI/UX Design', level: 'beginner', years: 1 },
      { name: 'Git', level: 'intermediate', years: 2 },
    ],
  },
  {
    email: 'nadia.talent@example.com',
    name: 'Nadia Putri Rahmawati',
    headline: 'UI/UX & Product Designer',
    bio: 'Desainer antarmuka dengan spesialisasi user research, wireframing, interactive prototyping, dan pembuatan design system yang terstruktur.',
    education: 'S1 Desain Komunikasi Visual Institut Teknologi Bandung',
    location: 'Bandung',
    hoursPerWeek: 20,
    preferredMode: 'remote',
    portfolioUrls: ['https://behance.net/nadiaputri', 'https://dribbble.com/nadiaputri'],
    skills: [
      { name: 'Figma', level: 'advanced', years: 3 },
      { name: 'UI/UX Design', level: 'advanced', years: 3 },
      { name: 'Graphic Design', level: 'intermediate', years: 2 },
      { name: 'Canva', level: 'advanced', years: 3 },
    ],
  },
  {
    email: 'budi.talent@example.com',
    name: 'Budi Santoso',
    headline: 'Backend Developer & API Specialist',
    bio: 'Fokus pada arsitektur server-side yang skalabel, desain basis data relasional, dan integrasi RESTful/GraphQL API.',
    education: 'S1 Teknik Informatika Institut Teknologi Sepuluh Nopember',
    location: 'Surabaya',
    hoursPerWeek: 30,
    preferredMode: 'remote',
    portfolioUrls: ['https://github.com/budisantoso-dev'],
    skills: [
      { name: 'Node.js', level: 'advanced', years: 3 },
      { name: 'Express', level: 'advanced', years: 3 },
      { name: 'PostgreSQL', level: 'intermediate', years: 2 },
      { name: 'Docker', level: 'intermediate', years: 1 },
      { name: 'Git', level: 'advanced', years: 3 },
    ],
  },
  {
    email: 'siti.talent@example.com',
    name: 'Siti Nurhaliza',
    headline: 'Junior Data Analyst & Business Intelligence',
    bio: 'Menyukai eksplorasi data, pembuatan visualisasi interaktif, dan penemuan insight bisnis dari dataset operasional maupun pemasaran.',
    education: 'S1 Statistika Universitas Gadjah Mada',
    location: 'Yogyakarta',
    hoursPerWeek: 15,
    preferredMode: 'remote',
    portfolioUrls: ['https://github.com/sitinurhaliza-data'],
    skills: [
      { name: 'Python', level: 'intermediate', years: 2 },
      { name: 'SQL', level: 'advanced', years: 2 },
      { name: 'Power BI', level: 'intermediate', years: 1 },
      { name: 'Excel', level: 'advanced', years: 3 },
    ],
  },
  {
    email: 'reza.talent@example.com',
    name: 'Reza Firmansyah',
    headline: 'Creative Graphic Designer & Brand Identity',
    bio: 'Berpengalaman membantu UMKM menciptakan identitas visual yang profesional, mulai dari logo, kemasan produk, hingga materi promosi media sosial.',
    education: 'D3 Desain Grafis Universitas Sebelas Maret',
    location: 'Surakarta',
    hoursPerWeek: 20,
    preferredMode: 'hybrid',
    portfolioUrls: ['https://behance.net/rezafirmansyah'],
    skills: [
      { name: 'Illustrator', level: 'advanced', years: 3 },
      { name: 'Photoshop', level: 'advanced', years: 3 },
      { name: 'Figma', level: 'intermediate', years: 1 },
      { name: 'Canva', level: 'advanced', years: 2 },
      { name: 'Graphic Design', level: 'advanced', years: 3 },
    ],
  },
  {
    email: 'maya.talent@example.com',
    name: 'Maya Anggraini',
    headline: 'Social Media Specialist & Content Strategist',
    bio: 'Kreator konten yang berfokus pada storytelling brand, peningkatan engagement komunitas, dan pengelolaan kampanye pemasaran digital.',
    education: 'S1 Ilmu Komunikasi Universitas Padjadjaran',
    location: 'Bandung',
    hoursPerWeek: 15,
    preferredMode: 'remote',
    portfolioUrls: ['https://instagram.com/maya.creates'],
    skills: [
      { name: 'Social Media Management', level: 'advanced', years: 2 },
      { name: 'Copywriting', level: 'advanced', years: 2 },
      { name: 'Content Writing', level: 'intermediate', years: 2 },
      { name: 'Canva', level: 'advanced', years: 2 },
    ],
  },
  {
    email: 'dimas.talent@example.com',
    name: 'Dimas Arya Wijaya',
    headline: 'Fullstack Web Developer',
    bio: 'Menjembatani kenyamanan antarmuka frontend dengan keandalan backend. Senang membangun produk MVP dari nol dengan Next.js dan Supabase.',
    education: 'S1 Sistem Informasi Universitas Bina Nusantara',
    location: 'Jakarta Barat',
    hoursPerWeek: 35,
    preferredMode: 'hybrid',
    portfolioUrls: ['https://github.com/dimasaryaw'],
    skills: [
      { name: 'React', level: 'advanced', years: 3 },
      { name: 'Node.js', level: 'intermediate', years: 2 },
      { name: 'PostgreSQL', level: 'intermediate', years: 2 },
      { name: 'TypeScript', level: 'advanced', years: 2 },
      { name: 'Next.js', level: 'advanced', years: 2 },
    ],
  },
  {
    email: 'clara.talent@example.com',
    name: 'Clara Shinta Dewi',
    headline: 'Junior Mobile App Developer (Flutter & React Native)',
    bio: 'Tertarik membangun aplikasi mobile lintas platform dengan performa tinggi dan transisi antarmuka yang mulus.',
    education: 'S1 Teknik Informatika Universitas Telkom',
    location: 'Bandung',
    hoursPerWeek: 20,
    preferredMode: 'remote',
    portfolioUrls: ['https://github.com/clarashinta'],
    skills: [
      { name: 'Flutter', level: 'intermediate', years: 1 },
      { name: 'React Native', level: 'beginner', years: 1 },
      { name: 'Mobile Development', level: 'intermediate', years: 1 },
      { name: 'Git', level: 'intermediate', years: 1 },
    ],
  },
  {
    email: 'fajar.talent@example.com',
    name: 'Fajar Nugraha',
    headline: 'Software QA & Test Automation Enthusiast',
    bio: 'Memastikan kualitas software melalui pengujian fungsional terstruktur, penulisan test case komprehensif, dan automasi skenario end-to-end.',
    education: 'S1 Teknik Elektro Universitas Diponegoro',
    location: 'Semarang',
    hoursPerWeek: 15,
    preferredMode: 'remote',
    portfolioUrls: ['https://github.com/fajarnugraha-qa'],
    skills: [
      { name: 'Manual Testing', level: 'advanced', years: 2 },
      { name: 'Automated Testing', level: 'intermediate', years: 1 },
      { name: 'Cypress', level: 'beginner', years: 1 },
      { name: 'Postman', level: 'intermediate', years: 2 },
      { name: 'SQL', level: 'beginner', years: 1 },
    ],
  },
  {
    email: 'tiara.talent@example.com',
    name: 'Tiara Larasati',
    headline: 'Digital Marketing & Growth Hacker',
    bio: 'Membantu brand mengoptimalkan saluran traffic organik melalui SEO on-page/off-page, optimasi konversi landing page, dan paid advertising.',
    education: 'S1 Manajemen Bisnis Universitas Airlangga',
    location: 'Surabaya',
    hoursPerWeek: 20,
    preferredMode: 'remote',
    portfolioUrls: ['https://linkedin.com/in/tiaralarasati'],
    skills: [
      { name: 'SEO', level: 'advanced', years: 2 },
      { name: 'SEM', level: 'intermediate', years: 1 },
      { name: 'Google Analytics', level: 'intermediate', years: 2 },
      { name: 'Copywriting', level: 'intermediate', years: 2 },
      { name: 'Social Media Management', level: 'intermediate', years: 1 },
    ],
  },
];

async function getOrCreateUser(email: string, fullName: string, role: 'talent' | 'vendor'): Promise<string> {
  // Cek apakah user sudah ada
  const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) {
    throw new Error(`Gagal memuat daftar users: ${listError.message}`);
  }

  const existing = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    // Pastikan user metadata terisi
    await adminClient.auth.admin.updateUserById(existing.id, {
      user_metadata: { role, full_name: fullName },
      email_confirm: true,
      password: DEFAULT_PASSWORD,
    });
    return existing.id;
  }

  // Buat user baru lewat Supabase Admin API
  const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { role, full_name: fullName },
  });

  if (createError || !createData.user) {
    throw new Error(`Gagal membuat user ${email}: ${createError?.message}`);
  }

  return createData.user.id;
}

async function main() {
  console.log('🚀 Memulai proses seed demo realistis...');
  console.log(`🔗 Target Supabase URL: ${supabaseUrl}`);

  // 1. Ambil seluruh master skill yang ada di database
  console.log('\n📚 Memuat daftar master skills...');
  const { data: skillsData, error: skillsError } = await adminClient.from('skills').select('id, name');
  if (skillsError || !skillsData) {
    throw new Error(`Gagal membaca tabel skills: ${skillsError?.message}`);
  }

  const skillMap = new Map<string, string>();
  for (const s of skillsData) {
    skillMap.set(s.name.toLowerCase().trim(), s.id);
  }

  // Helper untuk mendapatkan skill ID atau membuat baru jika belum ada
  async function resolveSkillId(skillName: string): Promise<string> {
    const key = skillName.toLowerCase().trim();
    if (skillMap.has(key)) {
      return skillMap.get(key)!;
    }
    // Jika tidak ada di master, masukkan
    const { data: newSkill, error: insertSkillErr } = await adminClient
      .from('skills')
      .insert({ name: skillName, category: 'other' })
      .select('id')
      .single();

    if (insertSkillErr || !newSkill) {
      throw new Error(`Gagal mendaftarkan skill baru ${skillName}: ${insertSkillErr?.message}`);
    }
    skillMap.set(key, newSkill.id);
    return newSkill.id;
  }

  // 2. Buat & Simpan 3 Vendor
  console.log('\n🏢 Membuat akun dan profil 3 Vendor dummy...');
  const vendorUserIds: Record<string, string> = {};

  for (const v of vendorsData) {
    const userId = await getOrCreateUser(v.email, v.name, 'vendor');
    vendorUserIds[v.email] = userId;

    // Pastikan masuk ke public.profiles
    await adminClient.from('profiles').upsert({
      id: userId,
      role: 'vendor',
      full_name: v.name,
    });

    // Pastikan masuk ke public.vendor_profiles
    const { error: vpErr } = await adminClient.from('vendor_profiles').upsert({
      user_id: userId,
      organization_name: v.name,
      description: v.description,
      location: v.location,
      website: v.website,
    });

    if (vpErr) {
      console.warn(`Peringatan update vendor_profile ${v.name}:`, vpErr.message);
    } else {
      console.log(`  ✓ Vendor siap: ${v.name} (${v.email})`);
    }
  }

  // 3. Buat & Simpan 10 Talent
  console.log('\n🧑‍💻 Membuat akun dan profil 10 Talent dummy...');
  const talentUserIds: Record<string, string> = {};

  for (const t of talentsData) {
    const userId = await getOrCreateUser(t.email, t.name, 'talent');
    talentUserIds[t.email] = userId;

    // Pastikan masuk ke public.profiles
    await adminClient.from('profiles').upsert({
      id: userId,
      role: 'talent',
      full_name: t.name,
    });

    // Pastikan masuk ke public.talent_profiles
    const { error: tpErr } = await adminClient.from('talent_profiles').upsert({
      user_id: userId,
      headline: t.headline,
      bio: t.bio,
      education: t.education,
      location: t.location,
      hours_per_week: t.hoursPerWeek,
      preferred_mode: t.preferredMode,
      is_available: true,
      portfolio_urls: t.portfolioUrls,
    });

    if (tpErr) {
      console.warn(`Peringatan update talent_profile ${t.name}:`, tpErr.message);
    }

    // Masukkan skill talent
    // Hapus skill lama user jika ada agar bersih
    await adminClient.from('talent_skills').delete().eq('talent_id', userId);

    for (const sk of t.skills) {
      const skillId = await resolveSkillId(sk.name);
      await adminClient.from('talent_skills').insert({
        talent_id: userId,
        skill_id: skillId,
        level: sk.level,
        years_of_experience: sk.years,
      });
    }

    console.log(`  ✓ Talent siap: ${t.name} (${t.skills.length} skills)`);
  }

  // 4. Buat 12 Proyek dengan variasi Difficulty & Type
  console.log('\n📋 Membuat 12 Proyek dummy variatif...');
  const vKopiId = vendorUserIds['vendor.kopi@example.com'];
  const vEdukaryaId = vendorUserIds['vendor.edukarya@example.com'];
  const vKreativaId = vendorUserIds['vendor.kreativa@example.com'];

  const projectsData = [
    // Vendor 1: Kopi Nusantara Roastery
    {
      code: 'P01',
      vendor_id: vKopiId,
      title: 'Landing Page Pemesanan Biji Kopi B2B & Katalog Interaktif',
      description: 'Membangun landing page modern untuk memfasilitasi pemesanan biji kopi skala cafe & hotel (B2B). Membutuhkan fitur katalog produk interaktif, kalkulator estimasi pesanan, dan integrasi tombol WhatsApp.',
      difficulty: 'intermediate' as const,
      type: 'freelance' as const,
      mode: 'remote' as const,
      duration_weeks: 4,
      estimated_hours_per_week: 15,
      reward_amount: 3500000,
      reward_currency: 'IDR',
      deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'open' as const,
      skills: [
        { name: 'React', required: true, minLevel: 'intermediate' as const },
        { name: 'Next.js', required: true, minLevel: 'beginner' as const },
        { name: 'TypeScript', required: false, minLevel: 'beginner' as const },
        { name: 'UI/UX Design', required: false, minLevel: 'beginner' as const },
      ],
    },
    {
      code: 'P02',
      vendor_id: vKopiId,
      title: 'Redesign Logo & Kemasan Pouch Kopi Specialty (Edelweiss Series)',
      description: 'Mendesain ulang visual kemasan kopi single origin edisi spesial. Output berupa file print-ready Adobe Illustrator/Figma dengan panduan warna CMYK dan mockup kemasan 3 dimensi.',
      difficulty: 'beginner' as const,
      type: 'freelance' as const,
      mode: 'remote' as const,
      duration_weeks: 2,
      estimated_hours_per_week: 10,
      reward_amount: 1800000,
      reward_currency: 'IDR',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'open' as const,
      skills: [
        { name: 'Figma', required: true, minLevel: 'beginner' as const },
        { name: 'Graphic Design', required: true, minLevel: 'beginner' as const },
        { name: 'Illustrator', required: false, minLevel: 'beginner' as const },
      ],
    },
    {
      code: 'P03',
      vendor_id: vKopiId,
      title: 'Social Media Campaign & Content Creation Peluncuran Cabang Baru',
      description: 'Merancang rencana konten (editorial plan) selama 1 bulan dan membuat 12 materi visual/video reels untuk pembukaan gerai baru kami di Senopati, Jakarta Selatan.',
      difficulty: 'beginner' as const,
      type: 'freelance' as const,
      mode: 'hybrid' as const,
      duration_weeks: 3,
      estimated_hours_per_week: 12,
      reward_amount: 2200000,
      reward_currency: 'IDR',
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'open' as const,
      skills: [
        { name: 'Social Media Management', required: true, minLevel: 'intermediate' as const },
        { name: 'Copywriting', required: true, minLevel: 'beginner' as const },
        { name: 'Canva', required: false, minLevel: 'intermediate' as const },
      ],
    },
    {
      code: 'P04',
      vendor_id: vKopiId,
      title: 'Sistem Kasir & Inventory Sederhana Kedai Kopi',
      description: 'Pengembangan modul backend point of sale (POS) internal untuk pencatatan stok biji kopi, cup, sirup, dan laporan laba-rugi harian.',
      difficulty: 'intermediate' as const,
      type: 'freelance' as const,
      mode: 'remote' as const,
      duration_weeks: 6,
      estimated_hours_per_week: 20,
      reward_amount: 4000000,
      reward_currency: 'IDR',
      deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed' as const,
      skills: [
        { name: 'Node.js', required: true, minLevel: 'intermediate' as const },
        { name: 'PostgreSQL', required: true, minLevel: 'intermediate' as const },
        { name: 'Express', required: false, minLevel: 'intermediate' as const },
      ],
    },

    // Vendor 2: Edukarya Tech Studio
    {
      code: 'P05',
      vendor_id: vEdukaryaId,
      title: 'Platform Pembelajaran Interaktif Siswa SMA (Modul Kuis & Leaderboard)',
      description: 'Mengembangkan sistem web portal kuis interaktif dengan timer real-time, kalkulasi skor otomatis, dan papan peringkat (leaderboard) antar sekolah se-Indonesia.',
      difficulty: 'advanced' as const,
      type: 'freelance' as const,
      mode: 'remote' as const,
      duration_weeks: 8,
      estimated_hours_per_week: 25,
      reward_amount: 7500000,
      reward_currency: 'IDR',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'open' as const,
      skills: [
        { name: 'Next.js', required: true, minLevel: 'intermediate' as const },
        { name: 'TypeScript', required: true, minLevel: 'intermediate' as const },
        { name: 'PostgreSQL', required: true, minLevel: 'intermediate' as const },
        { name: 'React', required: true, minLevel: 'advanced' as const },
      ],
    },
    {
      code: 'P06',
      vendor_id: vEdukaryaId,
      title: 'Desain UI/UX Mobile App Tryout Online & Gamifikasi Belajar',
      description: 'Merancang wireframe hingga high-fidelity prototype aplikasi mobile untuk latihan soal SNBT dengan konsep gamifikasi (badge pencapaian, streak belajar, dan avatar).',
      difficulty: 'intermediate' as const,
      type: 'freelance' as const,
      mode: 'remote' as const,
      duration_weeks: 4,
      estimated_hours_per_week: 15,
      reward_amount: 4500000,
      reward_currency: 'IDR',
      deadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'open' as const,
      skills: [
        { name: 'Figma', required: true, minLevel: 'intermediate' as const },
        { name: 'UI/UX Design', required: true, minLevel: 'intermediate' as const },
      ],
    },
    {
      code: 'P07',
      vendor_id: vEdukaryaId,
      title: 'Dashboard Visualisasi Analitik Nilai & Kehadiran Siswa',
      description: 'Membangun dashboard analitik untuk guru dan orang tua murid agar dapat memantau grafik perkembangan pemahaman konsep dan waktu pengerjaan modul belajar.',
      difficulty: 'intermediate' as const,
      type: 'freelance' as const,
      mode: 'remote' as const,
      duration_weeks: 4,
      estimated_hours_per_week: 15,
      reward_amount: 3800000,
      reward_currency: 'IDR',
      deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'open' as const,
      skills: [
        { name: 'SQL', required: true, minLevel: 'intermediate' as const },
        { name: 'Power BI', required: true, minLevel: 'intermediate' as const },
        { name: 'Python', required: false, minLevel: 'beginner' as const },
      ],
    },
    {
      code: 'P08',
      vendor_id: vEdukaryaId,
      title: 'Penyusunan Modul Belajar Digital & Artikel Edukatif Persiapan SNBT',
      description: 'Program relawan penulisan rangkuman materi dan tips trik pengerjaan soal TPS (Tes Potensi Skolastik) untuk siswa prasejahtera di daerah 3T.',
      difficulty: 'beginner' as const,
      type: 'volunteer' as const,
      mode: 'remote' as const,
      duration_weeks: 3,
      estimated_hours_per_week: 10,
      reward_amount: null,
      reward_currency: 'IDR',
      deadline: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed' as const,
      skills: [
        { name: 'Content Writing', required: true, minLevel: 'beginner' as const },
        { name: 'Copywriting', required: false, minLevel: 'beginner' as const },
      ],
    },

    // Vendor 3: Kreativa Media Lab
    {
      code: 'P09',
      vendor_id: vKreativaId,
      title: 'Situs Portofolio Agensi Kreatif 3D & Micro-Interactions',
      description: 'Membangun ulang website agensi kami dengan tampilan ultra-modern, dynamic animations, dark mode, dan performa Lighthouse di atas 90.',
      difficulty: 'advanced' as const,
      type: 'freelance' as const,
      mode: 'hybrid' as const,
      duration_weeks: 5,
      estimated_hours_per_week: 20,
      reward_amount: 6000000,
      reward_currency: 'IDR',
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'open' as const,
      skills: [
        { name: 'React', required: true, minLevel: 'advanced' as const },
        { name: 'Next.js', required: true, minLevel: 'intermediate' as const },
        { name: 'TypeScript', required: true, minLevel: 'intermediate' as const },
        { name: 'UI/UX Design', required: false, minLevel: 'intermediate' as const },
      ],
    },
    {
      code: 'P10',
      vendor_id: vKreativaId,
      title: 'Template Banner Promosi Instagram & TikTok Story Brand Fashion',
      description: 'Membuat kumpulan 25 template desain grafis yang siap pakai di Canva dan Figma untuk klien brand pakaian lokal menjelang event promo akhir tahun.',
      difficulty: 'beginner' as const,
      type: 'freelance' as const,
      mode: 'remote' as const,
      duration_weeks: 2,
      estimated_hours_per_week: 10,
      reward_amount: 1500000,
      reward_currency: 'IDR',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'open' as const,
      skills: [
        { name: 'Canva', required: true, minLevel: 'intermediate' as const },
        { name: 'Figma', required: true, minLevel: 'beginner' as const },
        { name: 'Graphic Design', required: false, minLevel: 'beginner' as const },
      ],
    },
    {
      code: 'P11',
      vendor_id: vKreativaId,
      title: 'SEO Optimization & Content Strategy untuk Brand Kuliner Lokal',
      description: 'Melakukan riset keyword, audit on-page SEO, optimasi Google Business Profile, dan pembuatan 8 artikel pilar untuk jaringan restoran di Yogyakarta.',
      difficulty: 'intermediate' as const,
      type: 'freelance' as const,
      mode: 'remote' as const,
      duration_weeks: 4,
      estimated_hours_per_week: 15,
      reward_amount: 3000000,
      reward_currency: 'IDR',
      deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'in_progress' as const,
      skills: [
        { name: 'SEO', required: true, minLevel: 'intermediate' as const },
        { name: 'Content Writing', required: true, minLevel: 'intermediate' as const },
        { name: 'Google Analytics', required: false, minLevel: 'beginner' as const },
      ],
    },
    {
      code: 'P12',
      vendor_id: vKreativaId,
      title: 'Mentoring & Pembuatan Konten Edukasi Digital Marketing UMKM Desa',
      description: 'Kegiatan pengabdian masyarakat mendampingi 15 UMKM pengrajin batik dan gerabah di desa wisata untuk mulai memasarkan produk lewat media sosial.',
      difficulty: 'beginner' as const,
      type: 'volunteer' as const,
      mode: 'onsite' as const,
      duration_weeks: 2,
      estimated_hours_per_week: 10,
      reward_amount: null,
      reward_currency: 'IDR',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'open' as const,
      skills: [
        { name: 'Social Media Management', required: true, minLevel: 'beginner' as const },
        { name: 'Copywriting', required: false, minLevel: 'beginner' as const },
      ],
    },
  ];

  const projectMap = new Map<string, string>(); // code -> project_id

  for (const p of projectsData) {
    // Cari apakah proyek dengan judul yang sama dari vendor ini sudah ada
    const { data: existingProjects } = await adminClient
      .from('projects')
      .select('id')
      .eq('vendor_id', p.vendor_id)
      .eq('title', p.title);

    let projId: string;
    if (existingProjects && existingProjects.length > 0) {
      projId = existingProjects[0].id;
      // Update data proyek
      await adminClient.from('projects').update({
        description: p.description,
        difficulty: p.difficulty,
        type: p.type,
        mode: p.mode,
        duration_weeks: p.duration_weeks,
        estimated_hours_per_week: p.estimated_hours_per_week,
        reward_amount: p.reward_amount,
        reward_currency: p.reward_currency,
        deadline: p.deadline,
        status: p.status,
      }).eq('id', projId);
    } else {
      const { data: newProj, error: projErr } = await adminClient
        .from('projects')
        .insert({
          vendor_id: p.vendor_id,
          title: p.title,
          description: p.description,
          difficulty: p.difficulty,
          type: p.type,
          mode: p.mode,
          duration_weeks: p.duration_weeks,
          estimated_hours_per_week: p.estimated_hours_per_week,
          reward_amount: p.reward_amount,
          reward_currency: p.reward_currency,
          deadline: p.deadline,
          status: p.status,
        })
        .select('id')
        .single();

      if (projErr || !newProj) {
        throw new Error(`Gagal membuat project ${p.title}: ${projErr?.message}`);
      }
      projId = newProj.id;
    }

    projectMap.set(p.code, projId);

    // Hapus project skills lama dan masukkan yang baru
    await adminClient.from('project_skills').delete().eq('project_id', projId);

    for (const ps of p.skills) {
      const sId = await resolveSkillId(ps.name);
      await adminClient.from('project_skills').insert({
        project_id: projId,
        skill_id: sId,
        is_required: ps.required,
        minimum_level: ps.minLevel,
      });
    }

    console.log(`  ✓ Proyek [${p.code}] ${p.title.slice(0, 45)}... (${p.difficulty}, ${p.type}, ${p.mode})`);
  }

  // 5. Buat Beberapa Lamaran Realistis
  console.log('\n✉️ Membuat data Lamaran dummy dengan match score...');
  const tAditya = talentUserIds['aditya.talent@example.com'];
  const tNadia = talentUserIds['nadia.talent@example.com'];
  const tMaya = talentUserIds['maya.talent@example.com'];
  const tDimas = talentUserIds['dimas.talent@example.com'];
  const tSiti = talentUserIds['siti.talent@example.com'];

  const applicationsData = [
    {
      code: 'APP01',
      projectId: projectMap.get('P01')!,
      talentId: tAditya,
      status: 'pending' as const,
      matchScore: 88,
      message: 'Halo tim Kopi Nusantara, saya sangat tertarik dengan proyek landing page ini. Saya memiliki pengalaman membangun web dengan Next.js dan Tailwind CSS yang responsif dan cepat.',
    },
    {
      code: 'APP02',
      projectId: projectMap.get('P02')!,
      talentId: tNadia,
      status: 'accepted' as const,
      matchScore: 92,
      message: 'Halo, saya desainer grafis dengan fokus branding kemasan. Portofolio saya mencakup desain kemasan produk artisanal serupa. Sangat senang jika bisa berkolaborasi!',
    },
    {
      code: 'APP03',
      projectId: projectMap.get('P03')!,
      talentId: tMaya,
      status: 'pending' as const,
      matchScore: 86,
      message: 'Halo! Saya terbiasa mengelola social media F&B dengan engagement organik tinggi. Saya siap membantu editorial plan dan reels pembukaan gerai baru.',
    },
    {
      code: 'APP04',
      projectId: projectMap.get('P04')!,
      talentId: tDimas,
      status: 'completed' as const,
      matchScore: 94,
      message: 'Saya siap mengembangkan sistem POS kasir dan manajemen inventory kedai kopi menggunakan Node.js dan PostgreSQL yang aman dan cepat.',
    },
    {
      code: 'APP05',
      projectId: projectMap.get('P05')!,
      talentId: tAditya,
      status: 'pending' as const,
      matchScore: 76,
      message: 'Platform pembelajaran ini sangat menarik. Saya siap membantu implementasi antarmuka kuis dan leaderboard real-time.',
    },
    {
      code: 'APP06',
      projectId: projectMap.get('P06')!,
      talentId: tNadia,
      status: 'pending' as const,
      matchScore: 95,
      message: 'Konsep gamifikasi pada aplikasi tryout adalah spesialisasi desain saya. Saya siap menyusun prototype interaktif di Figma.',
    },
    {
      code: 'APP07',
      projectId: projectMap.get('P08')!,
      talentId: tSiti,
      status: 'completed' as const,
      matchScore: 85,
      message: 'Saya sangat tergerak berkontribusi sebagai relawan untuk menulis modul latihan dan pembahasan soal persiapan masuk perguruan tinggi.',
    },
    {
      code: 'APP08',
      projectId: projectMap.get('P09')!,
      talentId: tDimas,
      status: 'pending' as const,
      matchScore: 82,
      message: 'Portofolio agensi dengan dynamic interaction dan dark mode adalah hal yang sering saya bangun. Siap berdiskusi teknis lebih lanjut.',
    },
  ];

  const appMap = new Map<string, string>(); // code -> app_id

  for (const app of applicationsData) {
    const { data: existingApp } = await adminClient
      .from('applications')
      .select('id')
      .eq('project_id', app.projectId)
      .eq('talent_id', app.talentId);

    let appId: string;
    if (existingApp && existingApp.length > 0) {
      appId = existingApp[0].id;
      await adminClient.from('applications').update({
        status: app.status,
        match_score: app.matchScore,
        message: app.message,
      }).eq('id', appId);
    } else {
      const { data: newApp, error: appErr } = await adminClient
        .from('applications')
        .insert({
          project_id: app.projectId,
          talent_id: app.talentId,
          status: app.status,
          match_score: app.matchScore,
          message: app.message,
        })
        .select('id')
        .single();

      if (appErr || !newApp) {
        throw new Error(`Gagal membuat application ${app.code}: ${appErr?.message}`);
      }
      appId = newApp.id;
    }
    appMap.set(app.code, appId);
    console.log(`  ✓ Lamaran [${app.code}] siap: Status=${app.status}, Skor=${app.matchScore}`);
  }

  // 6. Buat Beberapa Review untuk Proyek yang Selesai
  console.log('\n⭐ Membuat data Review & Rating untuk proyek selesai...');
  const app4Id = appMap.get('APP04')!; // Dimas di Kasir Kopi (Vendor Kopi)
  const app7Id = appMap.get('APP08') ? appMap.get('APP07')! : appMap.get('APP07')!; // Siti di Edukarya (Vendor Edukarya)

  const reviewsData = [
    {
      applicationId: app4Id,
      reviewerId: vKopiId,
      revieweeId: tDimas,
      rating: 5,
      qualityRating: 5,
      timelinessRating: 5,
      communicationRating: 5,
      comment: 'Pekerjaan luar biasa! Dimas menyelesaikan sistem kasir kedai kami tepat waktu, arsitektur basis datanya rapi, dan mudah dioperasikan oleh barista kami di lapangan. Komunikasi sangat responsif.',
    },
    {
      applicationId: app7Id,
      reviewerId: vEdukaryaId,
      revieweeId: tSiti,
      rating: 5,
      qualityRating: 5,
      timelinessRating: 4,
      communicationRating: 5,
      comment: 'Siti sangat berdedikasi dalam menganalisis soal-soal latihan dan menyusun rangkuman materi yang mudah dipahami oleh siswa. Hasil kerjanya melampaui ekspektasi kami sebagai relawan pendidikan.',
    },
  ];

  for (const rev of reviewsData) {
    const { data: existingRev } = await adminClient
      .from('reviews')
      .select('id')
      .eq('application_id', rev.applicationId);

    if (existingRev && existingRev.length > 0) {
      await adminClient.from('reviews').update({
        rating: rev.rating,
        quality_rating: rev.qualityRating,
        timeliness_rating: rev.timelinessRating,
        communication_rating: rev.communicationRating,
        comment: rev.comment,
      }).eq('id', existingRev[0].id);
    } else {
      const { error: revErr } = await adminClient.from('reviews').insert({
        application_id: rev.applicationId,
        reviewer_id: rev.reviewerId,
        reviewee_id: rev.revieweeId,
        rating: rev.rating,
        quality_rating: rev.qualityRating,
        timeliness_rating: rev.timelinessRating,
        communication_rating: rev.communicationRating,
        comment: rev.comment,
      });

      if (revErr) {
        console.warn(`Peringatan insert review:`, revErr.message);
      }
    }
    console.log(`  ✓ Review tersimpan untuk aplikasi ${rev.applicationId} (Rating: ${rev.rating}★)`);
  }

  // Tampilkan ringkasan kredensial akun untuk demo
  console.log('\n================================================================================');
  console.log('🎉 SEED DEMO BERHASIL SELESAI!');
  console.log('================================================================================');
  console.log('Seluruh akun menggunakan Password:', DEFAULT_PASSWORD);
  console.log('--------------------------------------------------------------------------------');
  console.log('🏢 KREDENSIAL VENDOR:');
  for (const v of vendorsData) {
    console.log(`  - ${v.name.padEnd(28)} : ${v.email}`);
  }
  console.log('--------------------------------------------------------------------------------');
  console.log('🧑‍💻 KREDENSIAL TALENTA:');
  for (const t of talentsData) {
    console.log(`  - ${t.name.padEnd(24)} (${t.headline.slice(0, 30).padEnd(30)}) : ${t.email}`);
  }
  console.log('================================================================================\n');
}

main().catch((err) => {
  console.error('\n❌ Terjadi kesalahan saat menjalankan seed:', err);
  process.exit(1);
});
