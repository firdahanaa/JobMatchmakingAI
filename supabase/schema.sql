-- =====================================================
-- AI Job & Project Matchmaking Platform — Supabase schema (MVP)
-- Jalankan di Supabase: SQL Editor -> New query -> Run
-- =====================================================

-- ---------- ENUM ----------
create type user_role as enum ('talent', 'vendor');
create type skill_level as enum ('beginner', 'intermediate', 'advanced');
create type project_difficulty as enum ('beginner', 'intermediate', 'advanced');
create type project_type as enum ('freelance', 'volunteer');
create type work_mode as enum ('remote', 'onsite', 'hybrid');
create type project_status as enum ('draft', 'open', 'in_progress', 'completed', 'closed');
create type application_status as enum ('pending', 'accepted', 'rejected', 'completed', 'withdrawn');

-- ---------- PROFILES (1:1 dengan auth.users) ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table talent_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  headline text,
  bio text,
  education text,
  location text,
  hours_per_week int check (hours_per_week between 0 and 80),
  preferred_mode work_mode,
  is_available boolean not null default true,
  portfolio_urls text[] not null default '{}',
  education_history jsonb not null default '[]'::jsonb
    check (jsonb_typeof(education_history) = 'array'),
  work_experience jsonb not null default '[]'::jsonb
    check (jsonb_typeof(work_experience) = 'array'),
  updated_at timestamptz not null default now()
);

create table candidate_cvs (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references talent_profiles(user_id) on delete cascade,
  object_path text not null unique,
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  content_type text not null check (content_type = 'application/pdf'),
  file_size_bytes integer not null check (file_size_bytes between 1 and 10485760),
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processing', 'completed', 'needs_ocr', 'failed')),
  processing_error text,
  uploaded_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (id, candidate_id)
);

create table candidate_cv_extractions (
  cv_id uuid primary key,
  candidate_id uuid not null,
  extracted_text text not null check (char_length(extracted_text) <= 1000000),
  structured_data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(structured_data) = 'object'),
  created_at timestamptz not null default now(),
  constraint candidate_cv_extractions_owner_fkey
    foreign key (cv_id, candidate_id)
    references candidate_cvs (id, candidate_id)
    on delete cascade
);

alter table talent_profiles
  add column current_cv_id uuid,
  add constraint talent_profiles_current_cv_owner_fkey
    foreign key (current_cv_id, user_id)
    references candidate_cvs (id, candidate_id)
    on delete set null (current_cv_id);

create table vendor_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  organization_name text not null,
  description text,
  website text,
  location text,
  updated_at timestamptz not null default now()
);

-- ---------- SKILLS (master list terstandar) ----------
create table skills (
  id serial primary key,
  name text not null unique,
  category text not null
);

create table talent_skills (
  talent_id uuid not null references talent_profiles(user_id) on delete cascade,
  skill_id int not null references skills(id) on delete cascade,
  level skill_level not null default 'beginner',
  primary key (talent_id, skill_id)
);

-- ---------- PROJECTS ----------
create table projects (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendor_profiles(user_id) on delete cascade,
  title text not null,
  description text not null,
  difficulty project_difficulty not null default 'beginner',
  type project_type not null default 'freelance',
  mode work_mode not null default 'remote',
  duration_weeks int check (duration_weeks > 0),
  hours_per_week int check (hours_per_week between 1 and 80),
  reward_amount numeric(12,2) default 0,
  reward_note text,
  deadline date,
  status project_status not null default 'open',
  created_at timestamptz not null default now()
);

create table project_skills (
  project_id uuid not null references projects(id) on delete cascade,
  skill_id int not null references skills(id) on delete cascade,
  min_level skill_level not null default 'beginner',
  is_required boolean not null default true,
  primary key (project_id, skill_id)
);

-- ---------- APPLICATIONS ----------
create table applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  talent_id uuid not null references talent_profiles(user_id) on delete cascade,
  message text,
  match_score numeric(5,2),          -- snapshot skor saat apply
  candidate_cv_id uuid,
  status application_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint applications_candidate_cv_owner_fkey
    foreign key (candidate_cv_id, talent_id)
    references candidate_cvs (id, candidate_id)
    on delete set null (candidate_cv_id),
  unique (project_id, talent_id)
);

-- ---------- REVIEWS ----------
create table reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references applications(id) on delete cascade,
  vendor_id uuid not null references vendor_profiles(user_id) on delete cascade,
  talent_id uuid not null references talent_profiles(user_id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  quality int check (quality between 1 and 5),
  timeliness int check (timeliness between 1 and 5),
  communication int check (communication between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- ---------- INDEX ----------
create index on projects (status, created_at desc);
create index on projects (vendor_id);
create index on project_skills (skill_id);
create index on talent_skills (skill_id);
create index on applications (project_id);
create index on applications (talent_id);
create index applications_candidate_cv_idx on applications (candidate_cv_id)
  where candidate_cv_id is not null;
create index candidate_cvs_candidate_uploaded_idx
  on candidate_cvs (candidate_id, uploaded_at desc);
create index on reviews (talent_id);

create or replace function save_candidate_profile(
  p_full_name text,
  p_headline text,
  p_bio text,
  p_education text,
  p_education_history jsonb,
  p_work_experience jsonb,
  p_location text,
  p_hours_per_week integer,
  p_preferred_mode work_mode,
  p_is_available boolean,
  p_portfolio_urls text[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;
  if length(btrim(p_full_name)) not between 2 and 100
    or jsonb_typeof(p_education_history) <> 'array'
    or jsonb_array_length(p_education_history) > 10
    or jsonb_typeof(p_work_experience) <> 'array'
    or jsonb_array_length(p_work_experience) > 20 then
    raise exception 'Invalid candidate profile data.';
  end if;
  if not exists (
    select 1 from profiles
    where id = auth.uid() and role = 'talent'
  ) then
    raise exception 'Talent profile access required.';
  end if;

  update profiles
  set full_name = btrim(p_full_name)
  where id = auth.uid();

  insert into talent_profiles (
    user_id,
    headline,
    bio,
    education,
    education_history,
    work_experience,
    location,
    hours_per_week,
    preferred_mode,
    is_available,
    portfolio_urls,
    updated_at
  )
  values (
    auth.uid(),
    btrim(p_headline),
    nullif(btrim(p_bio), ''),
    btrim(p_education),
    p_education_history,
    p_work_experience,
    btrim(p_location),
    p_hours_per_week,
    p_preferred_mode,
    p_is_available,
    p_portfolio_urls,
    now()
  )
  on conflict (user_id) do update set
    headline = excluded.headline,
    bio = excluded.bio,
    education = excluded.education,
    education_history = excluded.education_history,
    work_experience = excluded.work_experience,
    location = excluded.location,
    hours_per_week = excluded.hours_per_week,
    preferred_mode = excluded.preferred_mode,
    is_available = excluded.is_available,
    portfolio_urls = excluded.portfolio_urls,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function save_candidate_profile(
  text, text, text, text, jsonb, jsonb, text, integer, work_mode, boolean, text[]
) from public;
grant execute on function save_candidate_profile(
  text, text, text, text, jsonb, jsonb, text, integer, work_mode, boolean, text[]
) to authenticated;

create or replace function register_candidate_cv(
  p_object_path text,
  p_original_filename text,
  p_file_size_bytes integer
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  cv_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from profiles
    where id = auth.uid() and role = 'talent'
  ) then
    raise exception 'Talent profile access required.';
  end if;
  if p_object_path !~ (
    '^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$'
  ) or p_original_filename is null
    or char_length(p_original_filename) not between 1 and 255
    or position('/' in p_original_filename) > 0
    or position(chr(92) in p_original_filename) > 0
    or p_file_size_bytes not between 1 and 10485760 then
    raise exception 'Invalid CV upload metadata.';
  end if;

  insert into candidate_cvs (
    candidate_id,
    object_path,
    original_filename,
    content_type,
    file_size_bytes
  )
  values (
    auth.uid(),
    p_object_path,
    p_original_filename,
    'application/pdf',
    p_file_size_bytes
  )
  returning id into cv_id;

  update talent_profiles
  set current_cv_id = cv_id,
      updated_at = now()
  where user_id = auth.uid();

  if not found then
    raise exception 'Talent profile not found.';
  end if;
  return cv_id;
end;
$$;

revoke all on function register_candidate_cv(text, text, integer) from public;
grant execute on function register_candidate_cv(text, text, integer) to authenticated;

-- ---------- VIEW: rating rata-rata talent ----------
create view talent_ratings as
select talent_id,
       round(avg(rating)::numeric, 2) as avg_rating,
       count(*) as review_count
from reviews
group by talent_id;

-- ---------- TRIGGER: buat profile otomatis saat user daftar ----------
-- Role dikirim lewat metadata saat signUp: options.data = { role: 'talent', full_name: '...' }
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_role user_role;
begin
  new_role := coalesce(new.raw_user_meta_data->>'role', 'talent')::user_role;

  insert into profiles (id, role, full_name)
  values (new.id, new_role, coalesce(new.raw_user_meta_data->>'full_name', ''));

  if new_role = 'talent' then
    insert into talent_profiles (user_id) values (new.id);
  else
    insert into vendor_profiles (user_id, organization_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Organisasi baru'));
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
alter table profiles        enable row level security;
alter table talent_profiles enable row level security;
alter table vendor_profiles enable row level security;
alter table skills          enable row level security;
alter table talent_skills   enable row level security;
alter table projects        enable row level security;
alter table project_skills  enable row level security;
alter table applications    enable row level security;
alter table reviews         enable row level security;
alter table candidate_cvs  enable row level security;
alter table candidate_cv_extractions enable row level security;

-- profiles
create policy "profiles: baca milik sendiri" on profiles
  for select using (auth.uid() = id);
create policy "profiles: vendor lihat pelamar" on profiles
  for select using (
    exists (
      select 1 from applications a
      join projects p on p.id = a.project_id
      where a.talent_id = profiles.id and p.vendor_id = auth.uid()
    )
  );
create policy "profiles: baca profil vendor" on profiles
  for select using (role = 'vendor' and auth.role() = 'authenticated');
create policy "profiles: buat milik sendiri" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles: ubah milik sendiri" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Mencegah eskalasi hak akses / perubahan role setelah akun dibuat
create or replace function prevent_profile_role_change()
returns trigger language plpgsql as $$
begin
  if old.role is not null and new.role <> old.role then
    raise exception 'Perubahan role profil tidak diizinkan demi keamanan.';
  end if;
  return new;
end;
$$;

create trigger tr_prevent_profile_role_change
  before update on profiles
  for each row execute function prevent_profile_role_change();

-- skills: semua user login boleh baca
create policy "skills: baca semua" on skills
  for select using (auth.role() = 'authenticated');

-- talent_profiles: pemilik full akses; vendor hanya lihat talent yang melamar ke project miliknya
create policy "talent_profiles: pemilik" on talent_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "talent_profiles: vendor lihat pelamar" on talent_profiles
  for select using (
    exists (
      select 1 from applications a
      join projects p on p.id = a.project_id
      where a.talent_id = talent_profiles.user_id and p.vendor_id = auth.uid()
    )
  );

-- talent_skills
create policy "talent_skills: pemilik" on talent_skills
  for all using (auth.uid() = talent_id) with check (auth.uid() = talent_id);
create policy "talent_skills: vendor lihat pelamar" on talent_skills
  for select using (
    exists (
      select 1 from applications a
      join projects p on p.id = a.project_id
      where a.talent_id = talent_skills.talent_id and p.vendor_id = auth.uid()
    )
  );

-- CV files are private, versioned, and visible to vendors only for their applicants.
create policy "candidate_cvs: owner reads" on candidate_cvs
  for select to authenticated using (auth.uid() = candidate_id);
create policy "candidate_cvs: applicant vendor reads" on candidate_cvs
  for select to authenticated using (
    exists (
      select 1
      from applications a
      join projects p on p.id = a.project_id
      where a.candidate_cv_id = candidate_cvs.id
        and p.vendor_id = auth.uid()
    )
  );
create policy "candidate_cvs: owner registers pending CV" on candidate_cvs
  for insert to authenticated with check (
    auth.uid() = candidate_id
    and object_path like auth.uid()::text || '/%'
    and content_type = 'application/pdf'
    and processing_status = 'pending'
    and processing_error is null
    and processed_at is null
  );
create policy "candidate_cvs: owner updates processing state" on candidate_cvs
  for update to authenticated
  using (auth.uid() = candidate_id)
  with check (auth.uid() = candidate_id);

create or replace function prevent_candidate_cv_rewrite()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if row(
    new.candidate_id,
    new.object_path,
    new.original_filename,
    new.content_type,
    new.file_size_bytes,
    new.uploaded_at
  ) is distinct from row(
    old.candidate_id,
    old.object_path,
    old.original_filename,
    old.content_type,
    old.file_size_bytes,
    old.uploaded_at
  ) then
    raise exception 'Uploaded CV versions are immutable.';
  end if;
  return new;
end;
$$;

create trigger candidate_cvs_prevent_rewrite
  before update on candidate_cvs
  for each row execute function prevent_candidate_cv_rewrite();

create or replace function prevent_application_cv_snapshot_rewrite()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.candidate_cv_id is distinct from old.candidate_cv_id
    and (
      new.candidate_cv_id is not null
      or exists (
        select 1 from candidate_cvs
        where id = old.candidate_cv_id
      )
    ) then
    raise exception 'Application CV snapshots are immutable.';
  end if;
  return new;
end;
$$;

create trigger applications_prevent_cv_snapshot_rewrite
  before update on applications
  for each row execute function prevent_application_cv_snapshot_rewrite();

create policy "candidate_cv_extractions: owner reads" on candidate_cv_extractions
  for select to authenticated using (auth.uid() = candidate_id);
create policy "candidate_cv_extractions: owner writes" on candidate_cv_extractions
  for insert to authenticated with check (auth.uid() = candidate_id);
create policy "candidate_cv_extractions: owner updates" on candidate_cv_extractions
  for update to authenticated
  using (auth.uid() = candidate_id)
  with check (auth.uid() = candidate_id);

-- vendor_profiles: semua user login boleh baca (talent perlu lihat siapa pemilik project); pemilik full akses
create policy "vendor_profiles: baca semua" on vendor_profiles
  for select using (auth.role() = 'authenticated');
create policy "vendor_profiles: pemilik" on vendor_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- projects: yang open bisa dibaca semua user login; vendor kelola miliknya (wajib bertipe vendor)
create policy "projects: baca open atau milik sendiri" on projects
  for select using (status <> 'draft' or vendor_id = auth.uid());
create policy "projects: vendor buat" on projects
  for insert with check (
    auth.uid() = vendor_id
    and exists (select 1 from profiles pr where pr.id = auth.uid() and pr.role = 'vendor')
  );
create policy "projects: vendor ubah" on projects
  for update using (
    auth.uid() = vendor_id
    and exists (select 1 from profiles pr where pr.id = auth.uid() and pr.role = 'vendor')
  );
create policy "projects: vendor hapus" on projects
  for delete using (
    auth.uid() = vendor_id
    and exists (select 1 from profiles pr where pr.id = auth.uid() and pr.role = 'vendor')
  );

-- project_skills
create policy "project_skills: baca" on project_skills
  for select using (
    exists (select 1 from projects p where p.id = project_id
            and (p.status <> 'draft' or p.vendor_id = auth.uid()))
  );
create policy "project_skills: vendor kelola" on project_skills
  for all using (
    exists (select 1 from projects p where p.id = project_id and p.vendor_id = auth.uid())
  ) with check (
    exists (select 1 from projects p where p.id = project_id and p.vendor_id = auth.uid())
  );

-- applications
create policy "applications: talent lihat milik sendiri" on applications
  for select using (auth.uid() = talent_id);
create policy "applications: vendor lihat pelamar project-nya" on applications
  for select using (
    exists (select 1 from projects p where p.id = project_id and p.vendor_id = auth.uid())
  );
-- Talent apply: wajib pending, proyek harus open dan bukan milik sendiri, serta akun berstatus talent
create policy "applications: talent apply" on applications
  for insert to authenticated with check (
    auth.uid() = talent_id
    and status = 'pending'
    and exists (
      select 1 from projects p
      where p.id = project_id and p.status = 'open' and p.vendor_id <> auth.uid()
    )
    and exists (
      select 1 from profiles pr
      where pr.id = auth.uid() and pr.role = 'talent'
    )
    and (
      candidate_cv_id is null
      or exists (
        select 1 from talent_profiles tp
        where tp.user_id = auth.uid() and tp.current_cv_id = candidate_cv_id
      )
    )
  );
-- Talent hanya boleh withdraw saat status masih pending (tidak boleh mengubah score atau status lain)
create policy "applications: talent ubah (withdraw)" on applications
  for update to authenticated using (
    auth.uid() = talent_id and status in ('pending', 'withdrawn')
  ) with check (
    auth.uid() = talent_id
    and status in ('withdrawn', 'pending')
    and exists (
      select 1 from profiles pr
      where pr.id = auth.uid() and pr.role = 'talent'
    )
  );
-- Vendor hanya boleh ubah status ke accepted, rejected, atau completed untuk proyek miliknya
create policy "applications: vendor ubah status" on applications
  for update using (
    exists (select 1 from projects p where p.id = project_id and p.vendor_id = auth.uid())
    and status in ('pending', 'accepted')
  ) with check (
    exists (select 1 from projects p where p.id = project_id and p.vendor_id = auth.uid())
    and status in ('accepted', 'rejected', 'completed')
  );

-- reviews: vendor menulis untuk project miliknya; talent & vendor terkait membaca
create policy "reviews: vendor tulis" on reviews
  for insert with check (
    auth.uid() = vendor_id
    and exists (
      select 1 from applications a
      join projects p on p.id = a.project_id
      where a.id = application_id
        and p.vendor_id = auth.uid()
        and a.status = 'completed'
        and a.talent_id = reviews.talent_id
    )
  );
create policy "reviews: talent & vendor baca" on reviews
  for select using (auth.uid() = talent_id or auth.uid() = vendor_id);
-- Vendor berhak membaca review dari talenta yang melamar ke project miliknya
create policy "reviews: vendor lihat review pelamar" on reviews
  for select using (
    exists (
      select 1 from applications a
      join projects p on p.id = a.project_id
      where a.talent_id = reviews.talent_id and p.vendor_id = auth.uid()
    )
  );

-- Storage is private. Candidates upload only new objects to their own folder;
-- no update/delete policies are granted so a submitted version stays immutable.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('talent-cvs', 'talent-cvs', false, 10485760, array['application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf'];

create policy "candidate CV upload: own folder only" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'talent-cvs'
    and storage.foldername(name) = array[auth.uid()::text]
    and storage.extension(name) = 'pdf'
  );
create policy "candidate CV read: owner or applicant vendor" on storage.objects
  for select to authenticated using (
    bucket_id = 'talent-cvs'
    and (
      storage.foldername(name) = array[auth.uid()::text]
      or exists (
        select 1
        from candidate_cvs cv
        join applications a on a.candidate_cv_id = cv.id
        join projects p on p.id = a.project_id
        where cv.object_path = storage.objects.name
          and p.vendor_id = auth.uid()
      )
    )
  );

-- =====================================================
-- SEED: master list skill (tambah sesuai kebutuhan)
-- =====================================================
insert into skills (name, category) values
  -- Data
  ('Python', 'Data'), ('SQL', 'Data'), ('Pandas', 'Data'), ('Excel', 'Data'),
  ('Power BI', 'Data'), ('Data Visualization', 'Data'), ('Data Entry', 'Data'),
  ('Data Cleaning', 'Data'), ('Machine Learning', 'Data'),
  -- Development
  ('HTML/CSS', 'Development'), ('JavaScript', 'Development'), ('TypeScript', 'Development'),
  ('React', 'Development'), ('Next.js', 'Development'), ('Node.js', 'Development'),
  ('PHP/Laravel', 'Development'), ('Flutter', 'Development'), ('WordPress', 'Development'),
  -- Design
  ('UI/UX Design', 'Design'), ('Figma', 'Design'), ('Graphic Design', 'Design'),
  ('Canva', 'Design'), ('Adobe Illustrator', 'Design'), ('Adobe Photoshop', 'Design'),
  ('Video Editing', 'Design'), ('Motion Graphics', 'Design'),
  -- Marketing & Content
  ('Social Media Management', 'Marketing'), ('Content Writing', 'Marketing'),
  ('Copywriting', 'Marketing'), ('Content Creation', 'Marketing'), ('SEO', 'Marketing'),
  ('Digital Marketing', 'Marketing'), ('Photography', 'Marketing'),
  -- Business & Operations
  ('Project Management', 'Business'), ('Event Organizing', 'Business'),
  ('Administration', 'Business'), ('Bookkeeping', 'Business'), ('Public Speaking', 'Business'),
  ('Translation', 'Business')
on conflict (name) do nothing;
