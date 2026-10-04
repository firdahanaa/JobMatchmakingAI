-- ====================================================================
-- SEED DATA DEMO REALISTIS: 10 Talenta, 3 Vendor, 12 Proyek, Lamaran, & Review
-- ====================================================================
-- PETUNJUK MENJALANKAN:
-- 1. Buka dashboard Supabase -> SQL Editor -> New Query.
-- 2. Tempel seluruh isi skrip ini, lalu klik Run (Ctrl+Enter).
-- 3. Seluruh akun menggunakan password: Password123!
-- ====================================================================

do $$
declare
  -- Passwords bcrypt default untuk Password123!
  -- atau pgcrypto crypt('Password123!', gen_salt('bf'))
  v_enc_pass text := crypt('Password123!', gen_salt('bf'));

  -- Fixed UUIDs untuk 10 Talent
  t1_id uuid := '11111111-1111-4000-8000-000000000001';
  t2_id uuid := '11111111-1111-4000-8000-000000000002';
  t3_id uuid := '11111111-1111-4000-8000-000000000003';
  t4_id uuid := '11111111-1111-4000-8000-000000000004';
  t5_id uuid := '11111111-1111-4000-8000-000000000005';
  t6_id uuid := '11111111-1111-4000-8000-000000000006';
  t7_id uuid := '11111111-1111-4000-8000-000000000007';
  t8_id uuid := '11111111-1111-4000-8000-000000000008';
  t9_id uuid := '11111111-1111-4000-8000-000000000009';
  t10_id uuid := '11111111-1111-4000-8000-000000000010';

  -- Fixed UUIDs untuk 3 Vendor
  v1_id uuid := '22222222-2222-4000-8000-000000000001';
  v2_id uuid := '22222222-2222-4000-8000-000000000002';
  v3_id uuid := '22222222-2222-4000-8000-000000000003';

  -- Fixed UUIDs untuk 12 Projects
  p1_id uuid := '33333333-3333-4000-8000-000000000001';
  p2_id uuid := '33333333-3333-4000-8000-000000000002';
  p3_id uuid := '33333333-3333-4000-8000-000000000003';
  p4_id uuid := '33333333-3333-4000-8000-000000000004';
  p5_id uuid := '33333333-3333-4000-8000-000000000005';
  p6_id uuid := '33333333-3333-4000-8000-000000000006';
  p7_id uuid := '33333333-3333-4000-8000-000000000007';
  p8_id uuid := '33333333-3333-4000-8000-000000000008';
  p9_id uuid := '33333333-3333-4000-8000-000000000009';
  p10_id uuid := '33333333-3333-4000-8000-000000000010';
  p11_id uuid := '33333333-3333-4000-8000-000000000011';
  p12_id uuid := '33333333-3333-4000-8000-000000000012';

  -- Fixed UUIDs untuk Applications
  app1_id uuid := '44444444-4444-4000-8000-000000000001';
  app2_id uuid := '44444444-4444-4000-8000-000000000002';
  app3_id uuid := '44444444-4444-4000-8000-000000000003';
  app4_id uuid := '44444444-4444-4000-8000-000000000004';
  app5_id uuid := '44444444-4444-4000-8000-000000000005';
  app6_id uuid := '44444444-4444-4000-8000-000000000006';
  app7_id uuid := '44444444-4444-4000-8000-000000000007';
  app8_id uuid := '44444444-4444-4000-8000-000000000008';
begin
  -- ------------------------------------------------------------------
  -- 1. SEED 3 VENDOR KE auth.users & profiles & vendor_profiles
  -- ------------------------------------------------------------------
  
  -- Vendor 1: Kopi Nusantara Roastery
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (v1_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vendor.kopi@example.com', v_enc_pass, now(), '{"provider":"email","providers":["email"]}', '{"role":"vendor","full_name":"Kopi Nusantara Roastery"}', now(), now())
  on conflict (id) do nothing;

  insert into public.profiles (id, role, full_name)
  values (v1_id, 'vendor', 'Kopi Nusantara Roastery')
  on conflict (id) do update set role = 'vendor', full_name = excluded.full_name;

  insert into public.vendor_profiles (user_id, organization_name, description, location, website)
  values (v1_id, 'Kopi Nusantara Roastery', 'UMKM produsen biji kopi single origin dan kedai kopi artisanal dengan 5 cabang di Jabodetabek.', 'Jakarta Selatan', 'https://kopinusantara.co.id')
  on conflict (user_id) do update set organization_name = excluded.organization_name, description = excluded.description, location = excluded.location, website = excluded.website;

  -- Vendor 2: Edukarya Tech Studio
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (v2_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vendor.edukarya@example.com', v_enc_pass, now(), '{"provider":"email","providers":["email"]}', '{"role":"vendor","full_name":"Edukarya Tech Studio"}', now(), now())
  on conflict (id) do nothing;

  insert into public.profiles (id, role, full_name)
  values (v2_id, 'vendor', 'Edukarya Tech Studio')
  on conflict (id) do update set role = 'vendor', full_name = excluded.full_name;

  insert into public.vendor_profiles (user_id, organization_name, description, location, website)
  values (v2_id, 'Edukarya Tech Studio', 'Startup edutech berbasis di Bandung yang mengembangkan platform bimbingan belajar dan modul latihan interaktif untuk siswa.', 'Bandung', 'https://edukarya.id')
  on conflict (user_id) do update set organization_name = excluded.organization_name, description = excluded.description, location = excluded.location, website = excluded.website;

  -- Vendor 3: Kreativa Media Lab
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (v3_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vendor.kreativa@example.com', v_enc_pass, now(), '{"provider":"email","providers":["email"]}', '{"role":"vendor","full_name":"Kreativa Media Lab"}', now(), now())
  on conflict (id) do nothing;

  insert into public.profiles (id, role, full_name)
  values (v3_id, 'vendor', 'Kreativa Media Lab')
  on conflict (id) do update set role = 'vendor', full_name = excluded.full_name;

  insert into public.vendor_profiles (user_id, organization_name, description, location, website)
  values (v3_id, 'Kreativa Media Lab', 'Agensi kreatif dan digital marketing yang membantu puluhan brand F&B dan fashion lokal bertumbuh lewat strategi konten digital.', 'Yogyakarta', 'https://kreativamedia.com')
  on conflict (user_id) do update set organization_name = excluded.organization_name, description = excluded.description, location = excluded.location, website = excluded.website;

  -- ------------------------------------------------------------------
  -- 2. SEED 10 TALENTA KE auth.users & profiles & talent_profiles
  -- ------------------------------------------------------------------

  -- Talent 1: Aditya Pratama (Frontend React/Next.js)
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (t1_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'aditya.talent@example.com', v_enc_pass, now(), '{"provider":"email","providers":["email"]}', '{"role":"talent","full_name":"Aditya Pratama"}', now(), now())
  on conflict (id) do nothing;

  insert into public.profiles (id, role, full_name) values (t1_id, 'talent', 'Aditya Pratama') on conflict (id) do update set full_name = excluded.full_name;
  insert into public.talent_profiles (user_id, headline, bio, education, location, hours_per_week, preferred_mode, is_available, portfolio_urls)
  values (t1_id, 'Frontend Developer | React & Next.js Enthusiast', 'Mahasiswa tingkat akhir Teknik Informatika yang fokus pada pengembangan antarmuka web modern, responsif, dan ramah pengguna.', 'S1 Ilmu Komputer Universitas Indonesia', 'Jakarta Selatan', 25, 'remote', true, array['https://github.com/adityapratama', 'https://adityadev.me'])
  on conflict (user_id) do update set headline = excluded.headline, bio = excluded.bio, education = excluded.education, location = excluded.location, hours_per_week = excluded.hours_per_week, preferred_mode = excluded.preferred_mode, portfolio_urls = excluded.portfolio_urls;

  -- Talent 2: Nadia Putri Rahmawati (UI/UX Designer)
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (t2_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nadia.talent@example.com', v_enc_pass, now(), '{"provider":"email","providers":["email"]}', '{"role":"talent","full_name":"Nadia Putri Rahmawati"}', now(), now())
  on conflict (id) do nothing;

  insert into public.profiles (id, role, full_name) values (t2_id, 'talent', 'Nadia Putri Rahmawati') on conflict (id) do update set full_name = excluded.full_name;
  insert into public.talent_profiles (user_id, headline, bio, education, location, hours_per_week, preferred_mode, is_available, portfolio_urls)
  values (t2_id, 'UI/UX & Product Designer | Design System & Prototyping', 'Penggiat desain digital dengan pengalaman membuat wireframe, user flow, hingga prototype interaktif untuk UMKM dan organisasi kampus.', 'S1 Desain Komunikasi Visual ITB', 'Bandung', 20, 'hybrid', true, array['https://dribbble.com/nadiaputri', 'https://behance.net/nadiaputri'])
  on conflict (user_id) do update set headline = excluded.headline, bio = excluded.bio, education = excluded.education, location = excluded.location, hours_per_week = excluded.hours_per_week, preferred_mode = excluded.preferred_mode, portfolio_urls = excluded.portfolio_urls;

  -- Talent 3: Budi Santoso (Data & Power BI)
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (t3_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'budi.talent@example.com', v_enc_pass, now(), '{"provider":"email","providers":["email"]}', '{"role":"talent","full_name":"Budi Santoso"}', now(), now())
  on conflict (id) do nothing;

  insert into public.profiles (id, role, full_name) values (t3_id, 'talent', 'Budi Santoso') on conflict (id) do update set full_name = excluded.full_name;
  insert into public.talent_profiles (user_id, headline, bio, education, location, hours_per_week, preferred_mode, is_available, portfolio_urls)
  values (t3_id, 'Data Analyst & Business Intelligence Specialist', 'Suka mengolah data mentah menjadi wawasan bisnis yang aplikatif dan dashboard visualisasi interaktif.', 'S1 Statistika Universitas Gadjah Mada', 'Yogyakarta', 20, 'remote', true, array['https://github.com/budisantoso-data'])
  on conflict (user_id) do update set headline = excluded.headline, bio = excluded.bio, education = excluded.education, location = excluded.location, hours_per_week = excluded.hours_per_week, preferred_mode = excluded.preferred_mode, portfolio_urls = excluded.portfolio_urls;

  -- Talent 4: Siti Aisyah Nurhaliza (Social Media & Copywriting)
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (t4_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'siti.talent@example.com', v_enc_pass, now(), '{"provider":"email","providers":["email"]}', '{"role":"talent","full_name":"Siti Aisyah Nurhaliza"}', now(), now())
  on conflict (id) do nothing;

  insert into public.profiles (id, role, full_name) values (t4_id, 'talent', 'Siti Aisyah Nurhaliza') on conflict (id) do update set full_name = excluded.full_name;
  insert into public.talent_profiles (user_id, headline, bio, education, location, hours_per_week, preferred_mode, is_available, portfolio_urls)
  values (t4_id, 'Content Creator & Social Media Strategist', 'Spesialis copywriting dan manajemen media sosial yang berfokus pada engagement, storytelling produk UMKM, dan konten reels.', 'S1 Ilmu Komunikasi Universitas Padjadjaran', 'Bandung', 15, 'remote', true, array['https://instagram.com/sitianurhaliza_works'])
  on conflict (user_id) do update set headline = excluded.headline, bio = excluded.bio, education = excluded.education, location = excluded.location, hours_per_week = excluded.hours_per_week, preferred_mode = excluded.preferred_mode, portfolio_urls = excluded.portfolio_urls;

  -- Talent 5: Rizky Fajar Nugraha (Mobile & Fullstack Flutter/React)
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (t5_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rizky.talent@example.com', v_enc_pass, now(), '{"provider":"email","providers":["email"]}', '{"role":"talent","full_name":"Rizky Fajar Nugraha"}', now(), now())
  on conflict (id) do nothing;

  insert into public.profiles (id, role, full_name) values (t5_id, 'talent', 'Rizky Fajar Nugraha') on conflict (id) do update set full_name = excluded.full_name;
  insert into public.talent_profiles (user_id, headline, bio, education, location, hours_per_week, preferred_mode, is_available, portfolio_urls)
  values (t5_id, 'Fullstack Web & Mobile Developer', 'Pengembang aplikasi berbasis web dan mobile dengan pengalaman integrasi API, database PostgreSQL, dan framework modern.', 'S1 Teknik Informatika ITS Surabaya', 'Surabaya', 30, 'remote', true, array['https://github.com/rizkyfajar', 'https://rizkydev.id'])
  on conflict (user_id) do update set headline = excluded.headline, bio = excluded.bio, education = excluded.education, location = excluded.location, hours_per_week = excluded.hours_per_week, preferred_mode = excluded.preferred_mode, portfolio_urls = excluded.portfolio_urls;

  -- Talent 6: Dewi Lestari Safitri (Graphic Design & Illustration)
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (t6_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dewi.talent@example.com', v_enc_pass, now(), '{"provider":"email","providers":["email"]}', '{"role":"talent","full_name":"Dewi Lestari Safitri"}', now(), now())
  on conflict (id) do nothing;

  insert into public.profiles (id, role, full_name) values (t6_id, 'talent', 'Dewi Lestari Safitri') on conflict (id) do update set full_name = excluded.full_name;
  insert into public.talent_profiles (user_id, headline, bio, education, location, hours_per_week, preferred_mode, is_available, portfolio_urls)
  values (t6_id, 'Graphic Designer & Illustrator', 'Kreatif memvisualisasikan identitas merk, materi promosi, poster, hingga kemasan produk retail.', 'S1 Desain Grafis Universitas Negeri Jakarta', 'Jakarta Timur', 15, 'onsite', true, array['https://behance.net/dewisafitri'])
  on conflict (user_id) do update set headline = excluded.headline, bio = excluded.bio, education = excluded.education, location = excluded.location, hours_per_week = excluded.hours_per_week, preferred_mode = excluded.preferred_mode, portfolio_urls = excluded.portfolio_urls;

  -- Talent 7: Farhan Ramadhan (Backend Laravel/Node.js)
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (t7_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'farhan.talent@example.com', v_enc_pass, now(), '{"provider":"email","providers":["email"]}', '{"role":"talent","full_name":"Farhan Ramadhan"}', now(), now())
  on conflict (id) do nothing;

  insert into public.profiles (id, role, full_name) values (t7_id, 'talent', 'Farhan Ramadhan') on conflict (id) do update set full_name = excluded.full_name;
  insert into public.talent_profiles (user_id, headline, bio, education, location, hours_per_week, preferred_mode, is_available, portfolio_urls)
  values (t7_id, 'Backend Developer | PHP Laravel & Node.js', 'Fokus pada arsitektur database relasional yang rapi, RESTful API yang aman, dan optimasi performa backend.', 'S1 Sistem Informasi Telkom University', 'Bandung', 20, 'remote', true, array['https://github.com/farhanramadhan'])
  on conflict (user_id) do update set headline = excluded.headline, bio = excluded.bio, education = excluded.education, location = excluded.location, hours_per_week = excluded.hours_per_week, preferred_mode = excluded.preferred_mode, portfolio_urls = excluded.portfolio_urls;

  -- Talent 8: Amanda Zahra Putri (SEO & Digital Marketing)
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (t8_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'amanda.talent@example.com', v_enc_pass, now(), '{"provider":"email","providers":["email"]}', '{"role":"talent","full_name":"Amanda Zahra Putri"}', now(), now())
  on conflict (id) do nothing;

  insert into public.profiles (id, role, full_name) values (t8_id, 'talent', 'Amanda Zahra Putri') on conflict (id) do update set full_name = excluded.full_name;
  insert into public.talent_profiles (user_id, headline, bio, education, location, hours_per_week, preferred_mode, is_available, portfolio_urls)
  values (t8_id, 'Digital Marketer & SEO Specialist', 'Membantu menaikkan traffic organik website dan mengelola kampanye iklan digital untuk brand lokal.', 'S1 Manajemen Bisnis Universitas Diponegoro', 'Semarang', 15, 'remote', true, array['https://medium.com/@amandazahra'])
  on conflict (user_id) do update set headline = excluded.headline, bio = excluded.bio, education = excluded.education, location = excluded.location, hours_per_week = excluded.hours_per_week, preferred_mode = excluded.preferred_mode, portfolio_urls = excluded.portfolio_urls;

  -- Talent 9: Kevin Alexander Tan (WordPress & Web Pemula)
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (t9_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kevin.talent@example.com', v_enc_pass, now(), '{"provider":"email","providers":["email"]}', '{"role":"talent","full_name":"Kevin Alexander Tan"}', now(), now())
  on conflict (id) do nothing;

  insert into public.profiles (id, role, full_name) values (t9_id, 'talent', 'Kevin Alexander Tan') on conflict (id) do update set full_name = excluded.full_name;
  insert into public.talent_profiles (user_id, headline, bio, education, location, hours_per_week, preferred_mode, is_available, portfolio_urls)
  values (t9_id, 'Junior Web Developer & WordPress Specialist', 'Membantu bisnis lokal go-digital dengan pembuatan website landing page cepat dan CMS WordPress.', 'S1 Informatika Universitas Bina Nusantara', 'Jakarta Barat', 10, 'hybrid', true, array['https://kevinportfolio.web.id'])
  on conflict (user_id) do update set headline = excluded.headline, bio = excluded.bio, education = excluded.education, location = excluded.location, hours_per_week = excluded.hours_per_week, preferred_mode = excluded.preferred_mode, portfolio_urls = excluded.portfolio_urls;

  -- Talent 10: Larasati Sekar Arum (Administration & Excel)
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (t10_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'larasati.talent@example.com', v_enc_pass, now(), '{"provider":"email","providers":["email"]}', '{"role":"talent","full_name":"Larasati Sekar Arum"}', now(), now())
  on conflict (id) do nothing;

  insert into public.profiles (id, role, full_name) values (t10_id, 'talent', 'Larasati Sekar Arum') on conflict (id) do update set full_name = excluded.full_name;
  insert into public.talent_profiles (user_id, headline, bio, education, location, hours_per_week, preferred_mode, is_available, portfolio_urls)
  values (t10_id, 'Project Administrator & Operations Coordinator', 'Terorganisir, detail-oriented, dan mahir dalam pengelolaan administrasi dokumen proyek, pembukuan dasar, dan koordinasi tim.', 'S1 Administrasi Bisnis Universitas Brawijaya', 'Malang', 20, 'remote', true, array['https://linkedin.com/in/larasatisekar'])
  on conflict (user_id) do update set headline = excluded.headline, bio = excluded.bio, education = excluded.education, location = excluded.location, hours_per_week = excluded.hours_per_week, preferred_mode = excluded.preferred_mode, portfolio_urls = excluded.portfolio_urls;

  -- ------------------------------------------------------------------
  -- 3. SEED TALENT SKILLS (Beragam Level: beginner, intermediate, advanced)
  -- ------------------------------------------------------------------
  -- Helper macro via insert
  -- Aditya (React adv, Next.js int, TypeScript int, HTML/CSS adv)
  insert into public.talent_skills (talent_id, skill_id, level)
  select t1_id, id, 'advanced'::skill_level from public.skills where name = 'React'
  union all
  select t1_id, id, 'intermediate'::skill_level from public.skills where name = 'Next.js'
  union all
  select t1_id, id, 'intermediate'::skill_level from public.skills where name = 'TypeScript'
  union all
  select t1_id, id, 'advanced'::skill_level from public.skills where name = 'HTML/CSS'
  on conflict (talent_id, skill_id) do update set level = excluded.level;

  -- Nadia (Figma adv, UI/UX Design adv, Canva adv, Graphic Design int)
  insert into public.talent_skills (talent_id, skill_id, level)
  select t2_id, id, 'advanced'::skill_level from public.skills where name = 'Figma'
  union all
  select t2_id, id, 'advanced'::skill_level from public.skills where name = 'UI/UX Design'
  union all
  select t2_id, id, 'advanced'::skill_level from public.skills where name = 'Canva'
  union all
  select t2_id, id, 'intermediate'::skill_level from public.skills where name = 'Graphic Design'
  on conflict (talent_id, skill_id) do update set level = excluded.level;

  -- Budi (SQL adv, Python int, Excel adv, Power BI adv, Data Visualization int)
  insert into public.talent_skills (talent_id, skill_id, level)
  select t3_id, id, 'advanced'::skill_level from public.skills where name = 'SQL'
  union all
  select t3_id, id, 'intermediate'::skill_level from public.skills where name = 'Python'
  union all
  select t3_id, id, 'advanced'::skill_level from public.skills where name = 'Excel'
  union all
  select t3_id, id, 'advanced'::skill_level from public.skills where name = 'Power BI'
  union all
  select t3_id, id, 'intermediate'::skill_level from public.skills where name = 'Data Visualization'
  on conflict (talent_id, skill_id) do update set level = excluded.level;

  -- Siti (Social Media adv, Copywriting adv, Content Creation adv, Canva adv)
  insert into public.talent_skills (talent_id, skill_id, level)
  select t4_id, id, 'advanced'::skill_level from public.skills where name = 'Social Media Management'
  union all
  select t4_id, id, 'advanced'::skill_level from public.skills where name = 'Copywriting'
  union all
  select t4_id, id, 'advanced'::skill_level from public.skills where name = 'Content Creation'
  union all
  select t4_id, id, 'advanced'::skill_level from public.skills where name = 'Canva'
  union all
  select t4_id, id, 'intermediate'::skill_level from public.skills where name = 'Video Editing'
  on conflict (talent_id, skill_id) do update set level = excluded.level;

  -- Rizky (React int, Node.js int, TypeScript beg, Flutter int, SQL int)
  insert into public.talent_skills (talent_id, skill_id, level)
  select t5_id, id, 'intermediate'::skill_level from public.skills where name = 'React'
  union all
  select t5_id, id, 'intermediate'::skill_level from public.skills where name = 'Node.js'
  union all
  select t5_id, id, 'beginner'::skill_level from public.skills where name = 'TypeScript'
  union all
  select t5_id, id, 'intermediate'::skill_level from public.skills where name = 'Flutter'
  union all
  select t5_id, id, 'intermediate'::skill_level from public.skills where name = 'SQL'
  on conflict (talent_id, skill_id) do update set level = excluded.level;

  -- Dewi (Photoshop adv, Illustrator adv, Graphic Design adv, Canva adv)
  insert into public.talent_skills (talent_id, skill_id, level)
  select t6_id, id, 'advanced'::skill_level from public.skills where name = 'Adobe Photoshop'
  union all
  select t6_id, id, 'advanced'::skill_level from public.skills where name = 'Adobe Illustrator'
  union all
  select t6_id, id, 'advanced'::skill_level from public.skills where name = 'Graphic Design'
  union all
  select t6_id, id, 'advanced'::skill_level from public.skills where name = 'Canva'
  on conflict (talent_id, skill_id) do update set level = excluded.level;

  -- Farhan (Laravel adv, SQL adv, Node.js int, Python beg)
  insert into public.talent_skills (talent_id, skill_id, level)
  select t7_id, id, 'advanced'::skill_level from public.skills where name = 'PHP/Laravel'
  union all
  select t7_id, id, 'advanced'::skill_level from public.skills where name = 'SQL'
  union all
  select t7_id, id, 'intermediate'::skill_level from public.skills where name = 'Node.js'
  union all
  select t7_id, id, 'beginner'::skill_level from public.skills where name = 'Python'
  on conflict (talent_id, skill_id) do update set level = excluded.level;

  -- Amanda (SEO adv, Digital Marketing adv, Content Writing int, Excel int)
  insert into public.talent_skills (talent_id, skill_id, level)
  select t8_id, id, 'advanced'::skill_level from public.skills where name = 'SEO'
  union all
  select t8_id, id, 'advanced'::skill_level from public.skills where name = 'Digital Marketing'
  union all
  select t8_id, id, 'intermediate'::skill_level from public.skills where name = 'Content Writing'
  union all
  select t8_id, id, 'intermediate'::skill_level from public.skills where name = 'Excel'
  on conflict (talent_id, skill_id) do update set level = excluded.level;

  -- Kevin (WordPress adv, HTML/CSS int, JavaScript beg, PHP/Laravel beg)
  insert into public.talent_skills (talent_id, skill_id, level)
  select t9_id, id, 'advanced'::skill_level from public.skills where name = 'WordPress'
  union all
  select t9_id, id, 'intermediate'::skill_level from public.skills where name = 'HTML/CSS'
  union all
  select t9_id, id, 'beginner'::skill_level from public.skills where name = 'JavaScript'
  union all
  select t9_id, id, 'beginner'::skill_level from public.skills where name = 'PHP/Laravel'
  on conflict (talent_id, skill_id) do update set level = excluded.level;

  -- Larasati (Administration adv, Excel adv, Bookkeeping int, Project Management int)
  insert into public.talent_skills (talent_id, skill_id, level)
  select t10_id, id, 'advanced'::skill_level from public.skills where name = 'Administration'
  union all
  select t10_id, id, 'advanced'::skill_level from public.skills where name = 'Excel'
  union all
  select t10_id, id, 'intermediate'::skill_level from public.skills where name = 'Bookkeeping'
  union all
  select t10_id, id, 'intermediate'::skill_level from public.skills where name = 'Project Management'
  on conflict (talent_id, skill_id) do update set level = excluded.level;

  -- ------------------------------------------------------------------
  -- 4. SEED 12 DIVERSE PROJECTS (4 Beginner, 4 Intermediate, 4 Advanced)
  -- ------------------------------------------------------------------
  
  -- P1: Vendor 1 - Beginner - Open - Freelance
  insert into public.projects (id, vendor_id, title, description, difficulty, type, mode, duration_weeks, hours_per_week, reward_amount, reward_note, deadline, status)
  values (p1_id, v1_id, 'Desain Poster & Konten Feed Instagram Promo Akhir Tahun', 'Membutuhkan desainer grafis pemula untuk membuat 6 template feed Instagram dan 3 poster cetak terkait paket promo kopi nusantara.', 'beginner', 'freelance', 'remote', 2, 10, 750000, 'Dibayarkan penuh saat semua file master selesai', current_date + 21, 'open')
  on conflict (id) do update set title = excluded.title, status = excluded.status;

  -- P2: Vendor 1 - Intermediate - Completed - Freelance
  insert into public.projects (id, vendor_id, title, description, difficulty, type, mode, duration_weeks, hours_per_week, reward_amount, reward_note, deadline, status)
  values (p2_id, v1_id, 'Redesain Kemasan Biji Kopi Single Origin Drip Bag', 'Pembaruan desain kemasan sachet dan kotak drip bag kopi nusantara agar lebih modern, ramah lingkungan, dan menarik konsumen milenial.', 'intermediate', 'freelance', 'remote', 3, 15, 1500000, 'Bonus produk kopi untuk hasil luar biasa', current_date - 7, 'completed')
  on conflict (id) do update set title = excluded.title, status = excluded.status;

  -- P3: Vendor 1 - Beginner - Open - Volunteer
  insert into public.projects (id, vendor_id, title, description, difficulty, type, mode, duration_weeks, hours_per_week, reward_amount, reward_note, deadline, status)
  values (p3_id, v1_id, 'Fotografi Produk Menu Kopi & Liputan Barista Workshop', 'Mencari fotografer muda yang ingin menambah portofolio fotografi F&B dalam workshop seduh manual kami di Jakarta Selatan.', 'beginner', 'volunteer', 'onsite', 1, 8, 0, 'Disediakan konsumsi, sertifikat, dan free kopi sepuasnya', current_date + 14, 'open')
  on conflict (id) do update set title = excluded.title, status = excluded.status;

  -- P4: Vendor 1 - Advanced - Open - Freelance
  insert into public.projects (id, vendor_id, title, description, difficulty, type, mode, duration_weeks, hours_per_week, reward_amount, reward_note, deadline, status)
  values (p4_id, v1_id, 'Dashboard Analitik Penjualan Multi-Outlet dengan Power BI', 'Membangun dashboard visualisasi data interaktif dari data transaksi POS untuk menganalisis performa 5 outlet cabang dan tren penjualan produk.', 'advanced', 'freelance', 'remote', 4, 20, 3000000, 'Termasuk dokumentasi data model dan tutorial serah terima', current_date + 30, 'open')
  on conflict (id) do update set title = excluded.title, status = excluded.status;

  -- P5: Vendor 2 - Intermediate - Open - Freelance
  insert into public.projects (id, vendor_id, title, description, difficulty, type, mode, duration_weeks, hours_per_week, reward_amount, reward_note, deadline, status)
  values (p5_id, v2_id, 'Pengembangan Landing Page Interaktif Kursus Coding dengan Next.js', 'Membangun landing page modern berbasis Next.js App Router dan Tailwind CSS untuk peluncuran bootcamp coding siswa SMK.', 'intermediate', 'freelance', 'remote', 3, 20, 2500000, 'Milestone 50% setelah mockup jadi, 50% setelah deployment', current_date + 25, 'open')
  on conflict (id) do update set title = excluded.title, status = excluded.status;

  -- P6: Vendor 2 - Beginner - Open - Freelance
  insert into public.projects (id, vendor_id, title, description, difficulty, type, mode, duration_weeks, hours_per_week, reward_amount, reward_note, deadline, status)
  values (p6_id, v2_id, 'Input & Verifikasi Soal Latihan Ujian ke Sistem CMS', 'Pekerjaan entri data dan kurasi 500 butir soal matematika dan IPA ke dalam dashboard bank soal Edukarya.', 'beginner', 'freelance', 'remote', 2, 10, 600000, 'Dapat dikerjakan fleksibel jam bebas', current_date + 14, 'open')
  on conflict (id) do update set title = excluded.title, status = excluded.status;

  -- P7: Vendor 2 - Advanced - In Progress - Freelance
  insert into public.projects (id, vendor_id, title, description, difficulty, type, mode, duration_weeks, hours_per_week, reward_amount, reward_note, deadline, status)
  values (p7_id, v2_id, 'Pembangunan REST API Autentikasi & Manajemen Modul Belajar', 'Arsitektur backend scalable dengan otentikasi JWT, role permission siswa/guru, dan integrasi database PostgreSQL.', 'advanced', 'freelance', 'remote', 4, 25, 4000000, 'Kontrak lanjutan maintenance tersedia setelah rampung', current_date + 35, 'in_progress')
  on conflict (id) do update set title = excluded.title, status = excluded.status;

  -- P8: Vendor 2 - Advanced - Open - Freelance
  insert into public.projects (id, vendor_id, title, description, difficulty, type, mode, duration_weeks, hours_per_week, reward_amount, reward_note, deadline, status)
  values (p8_id, v2_id, 'Aplikasi Mobile Pelacak Belajar Siswa dengan Flutter', 'Pembuatan aplikasi mobile Android/iOS untuk siswa melacak progres jam belajar dan notifikasi kuis harian.', 'advanced', 'freelance', 'hybrid', 6, 25, 4500000, 'DP 20% di awal, sisa bertahap per sprint', current_date + 45, 'open')
  on conflict (id) do update set title = excluded.title, status = excluded.status;

  -- P9: Vendor 3 - Beginner - Open - Freelance
  insert into public.projects (id, vendor_id, title, description, difficulty, type, mode, duration_weeks, hours_per_week, reward_amount, reward_note, deadline, status)
  values (p9_id, v3_id, 'Penulisan 10 Artikel Blog SEO untuk Klien Industri F&B', 'Membutuhkan content writer yang menguasai teknik penulisan artikel SEO friendly seputar kuliner dan gaya hidup sehat.', 'beginner', 'freelance', 'remote', 2, 15, 1000000, 'Fee Rp 100.000 per 800 kata lolos plagiasi', current_date + 18, 'open')
  on conflict (id) do update set title = excluded.title, status = excluded.status;

  -- P10: Vendor 3 - Intermediate - Completed - Freelance
  insert into public.projects (id, vendor_id, title, description, difficulty, type, mode, duration_weeks, hours_per_week, reward_amount, reward_note, deadline, status)
  values (p10_id, v3_id, 'Manajemen Akun Media Sosial & Konten Reels TikTok Brand Fashion', 'Mengelola kalender konten, menyusun naskah copywriting, dan memproduksi video pendek reels mingguan untuk brand fashion muda.', 'intermediate', 'freelance', 'remote', 4, 20, 2000000, 'Insentif ekstra jika target reach tercapai', current_date - 10, 'completed')
  on conflict (id) do update set title = excluded.title, status = excluded.status;

  -- P11: Vendor 3 - Intermediate - Open - Freelance
  insert into public.projects (id, vendor_id, title, description, difficulty, type, mode, duration_weeks, hours_per_week, reward_amount, reward_note, deadline, status)
  values (p11_id, v3_id, 'Desain UI/UX Mobile App Marketplace Kerajinan Lokal', 'Riset pengguna, wireframing, dan desain prototype high-fidelity Figma untuk aplikasi e-commerce kerajinan tangan lokal.', 'intermediate', 'freelance', 'remote', 4, 20, 3000000, 'Diutamakan yang memiliki portofolio e-commerce', current_date + 28, 'open')
  on conflict (id) do update set title = excluded.title, status = excluded.status;

  -- P12: Vendor 3 - Advanced - Open - Volunteer
  insert into public.projects (id, vendor_id, title, description, difficulty, type, mode, duration_weeks, hours_per_week, reward_amount, reward_note, deadline, status)
  values (p12_id, v3_id, 'Koordinator Program Kampanye Donasi Pendidikan Daerah 3T', 'Posisi volunteer bagi talenta yang ingin mengasah leadership dan project management dalam mengorganisir program bantuan literasi.', 'advanced', 'volunteer', 'remote', 6, 15, 0, 'Sertifikat resmi kemitraan dan surat rekomendasi kerja', current_date + 35, 'open')
  on conflict (id) do update set title = excluded.title, status = excluded.status;

  -- ------------------------------------------------------------------
  -- 5. SEED PROJECT SKILLS
  -- ------------------------------------------------------------------
  
  -- P1 Skills: Canva (beg req), Graphic Design (beg req), Figma (beg opt)
  delete from public.project_skills where project_id in (p1_id, p2_id, p3_id, p4_id, p5_id, p6_id, p7_id, p8_id, p9_id, p10_id, p11_id, p12_id);
  
  insert into public.project_skills (project_id, skill_id, min_level, is_required)
  select p1_id, id, 'beginner'::skill_level, true from public.skills where name = 'Canva'
  union all
  select p1_id, id, 'beginner'::skill_level, true from public.skills where name = 'Graphic Design'
  union all
  select p1_id, id, 'beginner'::skill_level, false from public.skills where name = 'Figma';

  -- P2 Skills: Graphic Design (int req), Adobe Illustrator (int req), Adobe Photoshop (beg opt)
  insert into public.project_skills (project_id, skill_id, min_level, is_required)
  select p2_id, id, 'intermediate'::skill_level, true from public.skills where name = 'Graphic Design'
  union all
  select p2_id, id, 'intermediate'::skill_level, true from public.skills where name = 'Adobe Illustrator'
  union all
  select p2_id, id, 'beginner'::skill_level, false from public.skills where name = 'Adobe Photoshop';

  -- P3 Skills: Photography (beg req), Adobe Photoshop (beg opt)
  insert into public.project_skills (project_id, skill_id, min_level, is_required)
  select p3_id, id, 'beginner'::skill_level, true from public.skills where name = 'Photography'
  union all
  select p3_id, id, 'beginner'::skill_level, false from public.skills where name = 'Adobe Photoshop';

  -- P4 Skills: SQL (adv req), Power BI (adv req), Excel (adv req), Data Visualization (int opt)
  insert into public.project_skills (project_id, skill_id, min_level, is_required)
  select p4_id, id, 'advanced'::skill_level, true from public.skills where name = 'SQL'
  union all
  select p4_id, id, 'advanced'::skill_level, true from public.skills where name = 'Power BI'
  union all
  select p4_id, id, 'advanced'::skill_level, true from public.skills where name = 'Excel'
  union all
  select p4_id, id, 'intermediate'::skill_level, false from public.skills where name = 'Data Visualization';

  -- P5 Skills: React (int req), Next.js (int req), TypeScript (int req), HTML/CSS (adv opt)
  insert into public.project_skills (project_id, skill_id, min_level, is_required)
  select p5_id, id, 'intermediate'::skill_level, true from public.skills where name = 'React'
  union all
  select p5_id, id, 'intermediate'::skill_level, true from public.skills where name = 'Next.js'
  union all
  select p5_id, id, 'intermediate'::skill_level, true from public.skills where name = 'TypeScript'
  union all
  select p5_id, id, 'advanced'::skill_level, false from public.skills where name = 'HTML/CSS';

  -- P6 Skills: Data Entry (beg req), Administration (beg req), Excel (beg opt)
  insert into public.project_skills (project_id, skill_id, min_level, is_required)
  select p6_id, id, 'beginner'::skill_level, true from public.skills where name = 'Data Entry'
  union all
  select p6_id, id, 'beginner'::skill_level, true from public.skills where name = 'Administration'
  union all
  select p6_id, id, 'beginner'::skill_level, false from public.skills where name = 'Excel';

  -- P7 Skills: Node.js (adv req), TypeScript (int req), SQL (int req)
  insert into public.project_skills (project_id, skill_id, min_level, is_required)
  select p7_id, id, 'advanced'::skill_level, true from public.skills where name = 'Node.js'
  union all
  select p7_id, id, 'intermediate'::skill_level, true from public.skills where name = 'TypeScript'
  union all
  select p7_id, id, 'intermediate'::skill_level, true from public.skills where name = 'SQL';

  -- P8 Skills: Flutter (adv req), UI/UX Design (int opt)
  insert into public.project_skills (project_id, skill_id, min_level, is_required)
  select p8_id, id, 'advanced'::skill_level, true from public.skills where name = 'Flutter'
  union all
  select p8_id, id, 'intermediate'::skill_level, false from public.skills where name = 'UI/UX Design';

  -- P9 Skills: Content Writing (beg req), SEO (beg req), Copywriting (beg opt)
  insert into public.project_skills (project_id, skill_id, min_level, is_required)
  select p9_id, id, 'beginner'::skill_level, true from public.skills where name = 'Content Writing'
  union all
  select p9_id, id, 'beginner'::skill_level, true from public.skills where name = 'SEO'
  union all
  select p9_id, id, 'beginner'::skill_level, false from public.skills where name = 'Copywriting';

  -- P10 Skills: Social Media (int req), Content Creation (int req), Copywriting (int req), Video Editing (beg opt)
  insert into public.project_skills (project_id, skill_id, min_level, is_required)
  select p10_id, id, 'intermediate'::skill_level, true from public.skills where name = 'Social Media Management'
  union all
  select p10_id, id, 'intermediate'::skill_level, true from public.skills where name = 'Content Creation'
  union all
  select p10_id, id, 'intermediate'::skill_level, true from public.skills where name = 'Copywriting'
  union all
  select p10_id, id, 'beginner'::skill_level, false from public.skills where name = 'Video Editing';

  -- P11 Skills: Figma (int req), UI/UX Design (int req)
  insert into public.project_skills (project_id, skill_id, min_level, is_required)
  select p11_id, id, 'intermediate'::skill_level, true from public.skills where name = 'Figma'
  union all
  select p11_id, id, 'intermediate'::skill_level, true from public.skills where name = 'UI/UX Design';

  -- P12 Skills: Project Management (adv req), Administration (int opt), Public Speaking (int opt)
  insert into public.project_skills (project_id, skill_id, min_level, is_required)
  select p12_id, id, 'advanced'::skill_level, true from public.skills where name = 'Project Management'
  union all
  select p12_id, id, 'intermediate'::skill_level, false from public.skills where name = 'Administration'
  union all
  select p12_id, id, 'intermediate'::skill_level, false from public.skills where name = 'Public Speaking';

  -- ------------------------------------------------------------------
  -- 6. SEED APPLICATIONS DENGAN MATCH SCORE REALISTIS
  -- ------------------------------------------------------------------
  
  -- App 1: Nadia melamar P2 (Completed) -> Match Score 95
  insert into public.applications (id, project_id, talent_id, message, match_score, status, created_at)
  values (app1_id, p2_id, t2_id, 'Halo Kopi Nusantara, saya sangat tertarik mendesain ulang kemasan kopi drip bag agar estetik dan eco-friendly.', 95.00, 'completed', now() - interval '14 days')
  on conflict (project_id, talent_id) do update set status = excluded.status, match_score = excluded.match_score;

  -- App 2: Dewi melamar P2 (Rejected) -> Match Score 88
  insert into public.applications (id, project_id, talent_id, message, match_score, status, created_at)
  values (app2_id, p2_id, t6_id, 'Saya berpengalaman dalam ilustrasi botani kopi dan siap membantu redesain.', 88.00, 'rejected', now() - interval '13 days')
  on conflict (project_id, talent_id) do update set status = excluded.status, match_score = excluded.match_score;

  -- App 3: Siti melamar P10 (Completed) -> Match Score 100
  insert into public.applications (id, project_id, talent_id, message, match_score, status, created_at)
  values (app3_id, p10_id, t4_id, 'Halo Kreativa, saya memiliki pengalaman mengelola akun fashion Gen-Z dan siap meningkatkan reach reels.', 100.00, 'completed', now() - interval '18 days')
  on conflict (project_id, talent_id) do update set status = excluded.status, match_score = excluded.match_score;

  -- App 4: Amanda melamar P10 (Accepted) -> Match Score 75
  insert into public.applications (id, project_id, talent_id, message, match_score, status, created_at)
  values (app4_id, p10_id, t8_id, 'Bisa membantu riset hashtag dan penulisan caption fashion yang engaging.', 75.00, 'accepted', now() - interval '16 days')
  on conflict (project_id, talent_id) do update set status = excluded.status, match_score = excluded.match_score;

  -- App 5: Aditya melamar P5 (Pending) -> Match Score 94
  insert into public.applications (id, project_id, talent_id, message, match_score, status, created_at)
  values (app5_id, p5_id, t1_id, 'Halo tim Edukarya, saya sangat familiar dengan Next.js App Router dan Tailwind, siap membuat landing page interaktif.', 94.00, 'pending', now() - interval '2 days')
  on conflict (project_id, talent_id) do update set status = excluded.status, match_score = excluded.match_score;

  -- App 6: Rizky melamar P5 (Pending) -> Match Score 82
  insert into public.applications (id, project_id, talent_id, message, match_score, status, created_at)
  values (app6_id, p5_id, t5_id, 'Halo, saya sudah membuat beberapa proyek React dan tertarik ikut membangun platform edukasi ini.', 82.00, 'pending', now() - interval '1 day')
  on conflict (project_id, talent_id) do update set status = excluded.status, match_score = excluded.match_score;

  -- App 7: Budi melamar P4 (Pending) -> Match Score 100
  insert into public.applications (id, project_id, talent_id, message, match_score, status, created_at)
  values (app7_id, p4_id, t3_id, 'Saya berpengalaman membuat dashboard analitik multi-cabang Power BI dari data SQL transaksi ritel.', 100.00, 'pending', now() - interval '3 days')
  on conflict (project_id, talent_id) do update set status = excluded.status, match_score = excluded.match_score;

  -- App 8: Farhan melamar P7 (Accepted) -> Match Score 96
  insert into public.applications (id, project_id, talent_id, message, match_score, status, created_at)
  values (app8_id, p7_id, t7_id, 'Saya siap mengerjakan arsitektur backend REST API dengan otentikasi JWT dan schema PostgreSQL yang rapi.', 96.00, 'accepted', now() - interval '5 days')
  on conflict (project_id, talent_id) do update set status = excluded.status, match_score = excluded.match_score;

  -- ------------------------------------------------------------------
  -- 7. SEED REVIEWS UNTUK PROYEK COMPLETED
  -- ------------------------------------------------------------------
  
  -- Review 1: Vendor 1 (Kopi Nusantara) mereview Talent 2 (Nadia) untuk P2
  insert into public.reviews (application_id, vendor_id, talent_id, rating, quality, timeliness, communication, comment, created_at)
  values (app1_id, v1_id, t2_id, 5, 5, 5, 5, 'Desain kemasan drip bag yang dibuat Nadia sangat memukau dan sesuai dengan karakter brand kami! Komunikasi sangat lancar dan pengerjaan tepat waktu sebelum tenggat.', now() - interval '5 days')
  on conflict (application_id) do update set rating = excluded.rating, comment = excluded.comment;

  -- Review 2: Vendor 3 (Kreativa) mereview Talent 4 (Siti) untuk P10
  insert into public.reviews (application_id, vendor_id, talent_id, rating, quality, timeliness, communication, comment, created_at)
  values (app3_id, v3_id, t4_id, 5, 5, 4, 5, 'Konten video reels dan copywriting yang dihasilkan sangat kreatif, engagement media sosial klien kami meningkat signifikan. Sangat direkomendasikan!', now() - interval '7 days')
  on conflict (application_id) do update set rating = excluded.rating, comment = excluded.comment;

  raise notice '====================================================';
  raise notice 'SEED DEMO BERHASIL!';
  raise notice '3 Vendor, 10 Talent, 12 Proyek, 8 Lamaran, & 2 Review telah dibuat.';
  raise notice 'Password untuk seluruh akun demo: Password123!';
  raise notice '====================================================';
end;
$$;
