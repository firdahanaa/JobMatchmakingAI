begin;

alter table public.talent_profiles
  add column education_history jsonb not null default '[]'::jsonb
    check (jsonb_typeof(education_history) = 'array'),
  add column work_experience jsonb not null default '[]'::jsonb
    check (jsonb_typeof(work_experience) = 'array');

create table public.candidate_cvs (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.talent_profiles(user_id) on delete cascade,
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

create index candidate_cvs_candidate_uploaded_idx
  on public.candidate_cvs (candidate_id, uploaded_at desc);

create table public.candidate_cv_extractions (
  cv_id uuid primary key,
  candidate_id uuid not null,
  extracted_text text not null check (char_length(extracted_text) <= 1000000),
  structured_data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(structured_data) = 'object'),
  created_at timestamptz not null default now(),
  constraint candidate_cv_extractions_owner_fkey
    foreign key (cv_id, candidate_id)
    references public.candidate_cvs (id, candidate_id)
    on delete cascade
);

alter table public.talent_profiles
  add column current_cv_id uuid,
  add constraint talent_profiles_current_cv_owner_fkey
    foreign key (current_cv_id, user_id)
    references public.candidate_cvs (id, candidate_id)
    on delete set null (current_cv_id);

alter table public.applications
  add column candidate_cv_id uuid,
  add constraint applications_candidate_cv_owner_fkey
    foreign key (candidate_cv_id, talent_id)
    references public.candidate_cvs (id, candidate_id)
    on delete set null (candidate_cv_id);

create index applications_candidate_cv_idx
  on public.applications (candidate_cv_id)
  where candidate_cv_id is not null;

create or replace function public.save_candidate_profile(
  p_full_name text,
  p_headline text,
  p_bio text,
  p_education text,
  p_education_history jsonb,
  p_work_experience jsonb,
  p_location text,
  p_hours_per_week integer,
  p_preferred_mode public.work_mode,
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
    select 1 from public.profiles
    where id = auth.uid() and role = 'talent'
  ) then
    raise exception 'Talent profile access required.';
  end if;

  update public.profiles
  set full_name = btrim(p_full_name)
  where id = auth.uid();

  insert into public.talent_profiles (
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

revoke all on function public.save_candidate_profile(
  text, text, text, text, jsonb, jsonb, text, integer, public.work_mode, boolean, text[]
) from public;
grant execute on function public.save_candidate_profile(
  text, text, text, text, jsonb, jsonb, text, integer, public.work_mode, boolean, text[]
) to authenticated;

create or replace function public.register_candidate_cv(
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
    select 1 from public.profiles
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

  insert into public.candidate_cvs (
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

  update public.talent_profiles
  set current_cv_id = cv_id,
      updated_at = now()
  where user_id = auth.uid();

  if not found then
    raise exception 'Talent profile not found.';
  end if;
  return cv_id;
end;
$$;

revoke all on function public.register_candidate_cv(text, text, integer) from public;
grant execute on function public.register_candidate_cv(text, text, integer) to authenticated;

alter table public.candidate_cvs enable row level security;
alter table public.candidate_cv_extractions enable row level security;

create policy "candidate_cvs: owner reads"
  on public.candidate_cvs for select to authenticated
  using (auth.uid() = candidate_id);

create policy "candidate_cvs: applicant vendor reads"
  on public.candidate_cvs for select to authenticated
  using (
    exists (
      select 1
      from public.applications a
      join public.projects p on p.id = a.project_id
      where a.candidate_cv_id = candidate_cvs.id
        and p.vendor_id = auth.uid()
    )
  );

create policy "candidate_cvs: owner registers pending CV"
  on public.candidate_cvs for insert to authenticated
  with check (
    auth.uid() = candidate_id
    and object_path like auth.uid()::text || '/%'
    and content_type = 'application/pdf'
    and processing_status = 'pending'
    and processing_error is null
    and processed_at is null
  );

create policy "candidate_cvs: owner updates processing state"
  on public.candidate_cvs for update to authenticated
  using (auth.uid() = candidate_id)
  with check (auth.uid() = candidate_id);

create or replace function public.prevent_candidate_cv_rewrite()
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
  before update on public.candidate_cvs
  for each row execute function public.prevent_candidate_cv_rewrite();

create or replace function public.prevent_application_cv_snapshot_rewrite()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.candidate_cv_id is distinct from old.candidate_cv_id
    and (
      new.candidate_cv_id is not null
      or exists (
        select 1 from public.candidate_cvs
        where id = old.candidate_cv_id
      )
    ) then
    raise exception 'Application CV snapshots are immutable.';
  end if;
  return new;
end;
$$;

create trigger applications_prevent_cv_snapshot_rewrite
  before update on public.applications
  for each row execute function public.prevent_application_cv_snapshot_rewrite();

create policy "candidate_cv_extractions: owner reads"
  on public.candidate_cv_extractions for select to authenticated
  using (auth.uid() = candidate_id);

create policy "candidate_cv_extractions: owner writes"
  on public.candidate_cv_extractions for insert to authenticated
  with check (auth.uid() = candidate_id);

create policy "candidate_cv_extractions: owner updates"
  on public.candidate_cv_extractions for update to authenticated
  using (auth.uid() = candidate_id)
  with check (auth.uid() = candidate_id);

drop policy "applications: talent apply" on public.applications;
create policy "applications: talent apply"
  on public.applications for insert to authenticated
  with check (
    auth.uid() = talent_id
    and status = 'pending'
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.status = 'open' and p.vendor_id <> auth.uid()
    )
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'talent'
    )
    and (
      candidate_cv_id is null
      or exists (
        select 1 from public.talent_profiles tp
        where tp.user_id = auth.uid() and tp.current_cv_id = candidate_cv_id
      )
    )
  );

drop policy "applications: talent ubah (withdraw)" on public.applications;
create policy "applications: talent ubah (withdraw)"
  on public.applications for update to authenticated
  using (auth.uid() = talent_id and status in ('pending', 'withdrawn'))
  with check (
    auth.uid() = talent_id
    and status in ('withdrawn', 'pending')
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'talent'
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('talent-cvs', 'talent-cvs', false, 10485760, array['application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf'];

create policy "candidate CV upload: own folder only"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'talent-cvs'
    and storage.foldername(name) = array[auth.uid()::text]
    and storage.extension(name) = 'pdf'
  );

create policy "candidate CV read: owner or applicant vendor"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'talent-cvs'
    and (
      storage.foldername(name) = array[auth.uid()::text]
      or exists (
        select 1
        from public.candidate_cvs cv
        join public.applications a on a.candidate_cv_id = cv.id
        join public.projects p on p.id = a.project_id
        where cv.object_path = storage.objects.name
          and p.vendor_id = auth.uid()
      )
    )
  );

commit;
