-- 1. Bucket application-docs: izinkan PDF + DOCX
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'application-docs',
  'application-docs',
  false,
  5242880,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

drop policy if exists "Talent dapat mengunggah dokumen aplikasi miliknya" on storage.objects;
create policy "Talent dapat mengunggah dokumen aplikasi miliknya"
  on storage.objects for insert
  with check (
    bucket_id = 'application-docs'
    and (auth.uid())::text = (storage.foldername(name))[1]
    and cardinality(storage.foldername(name)) = 2
    and split_part(name, '/', 3) in ('cv.pdf', 'cv.docx', 'portfolio.pdf')
    and exists (
      select 1 from public.applications a
      where a.id::text = (storage.foldername(name))[2]
        and a.talent_id = auth.uid()
    )
  );

drop policy if exists "Talent dapat memperbarui dokumen aplikasi miliknya" on storage.objects;
create policy "Talent dapat memperbarui dokumen aplikasi miliknya"
  on storage.objects for update
  using (
    bucket_id = 'application-docs'
    and (auth.uid())::text = (storage.foldername(name))[1]
    and cardinality(storage.foldername(name)) = 2
    and split_part(name, '/', 3) in ('cv.pdf', 'cv.docx', 'portfolio.pdf')
    and exists (
      select 1 from public.applications a
      where a.id::text = (storage.foldername(name))[2]
        and a.talent_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'application-docs'
    and (auth.uid())::text = (storage.foldername(name))[1]
    and cardinality(storage.foldername(name)) = 2
    and split_part(name, '/', 3) in ('cv.pdf', 'cv.docx', 'portfolio.pdf')
    and exists (
      select 1 from public.applications a
      where a.id::text = (storage.foldername(name))[2]
        and a.talent_id = auth.uid()
    )
  );

drop policy if exists "Talent dapat menghapus dokumen aplikasi miliknya" on storage.objects;
create policy "Talent dapat menghapus dokumen aplikasi miliknya"
  on storage.objects for delete
  using (
    bucket_id = 'application-docs'
    and (auth.uid())::text = (storage.foldername(name))[1]
    and cardinality(storage.foldername(name)) = 2
    and split_part(name, '/', 3) in ('cv.pdf', 'cv.docx', 'portfolio.pdf')
    and exists (
      select 1 from public.applications a
      where a.id::text = (storage.foldername(name))[2]
        and a.talent_id = auth.uid()
    )
  );

drop policy if exists "Talent dan Vendor pemilik proyek dapat membaca dokumen aplikasi" on storage.objects;
create policy "Talent dan Vendor pemilik proyek dapat membaca dokumen aplikasi"
  on storage.objects for select
  using (
    bucket_id = 'application-docs'
    and cardinality(storage.foldername(name)) = 2
    and split_part(name, '/', 3) in ('cv.pdf', 'cv.docx', 'portfolio.pdf')
    and exists (
      select 1 from public.applications a
      join public.projects p on p.id = a.project_id
      where a.id::text = (storage.foldername(name))[2]
        and (a.talent_id = auth.uid() or p.vendor_id = auth.uid())
    )
  );

-- 2. Bucket talent-cvs: izinkan PDF + DOCX
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'talent-cvs',
  'talent-cvs',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

drop policy if exists "candidate CV upload: own folder only" on storage.objects;
create policy "candidate CV upload: own folder only"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'talent-cvs'
    and storage.foldername(name) = array[auth.uid()::text]
    and lower(storage.extension(name)) in ('pdf', 'docx')
  );

-- 3. Tabel candidate_cvs & RLS: izinkan PDF + DOCX
alter table public.candidate_cvs
  drop constraint if exists candidate_cvs_content_type_check;

alter table public.candidate_cvs
  add constraint candidate_cvs_content_type_check
  check (
    content_type in (
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  );

drop policy if exists "candidate_cvs: owner registers pending CV" on public.candidate_cvs;
create policy "candidate_cvs: owner registers pending CV"
  on public.candidate_cvs for insert to authenticated
  with check (
    auth.uid() = candidate_id
    and object_path like auth.uid()::text || '/%'
    and content_type in (
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    and processing_status = 'pending'
    and processing_error is null
    and processed_at is null
  );

-- 4. RPC register_candidate_cv: izinkan path .pdf dan .docx
create or replace function public.register_candidate_cv(
  p_object_path text,
  p_original_filename text,
  p_file_size_bytes integer
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $func$
declare
  cv_id uuid;
  resolved_content_type text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'talent'
  ) then
    raise exception 'Talent profile access required.';
  end if;

  if p_object_path !~ (
    '^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|docx)$'
  ) or p_original_filename is null
    or char_length(p_original_filename) not between 1 and 255
    or position('/' in p_original_filename) > 0
    or position(chr(92) in p_original_filename) > 0
    or p_file_size_bytes not between 1 and 10485760 then
    raise exception 'Invalid CV upload metadata.';
  end if;

  if lower(p_object_path) like '%.docx' then
    resolved_content_type := 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  else
    resolved_content_type := 'application/pdf';
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
    resolved_content_type,
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
$func$;
