begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$
declare
  v_ext_schema text;
  v_test_hash text;
begin
  select n.nspname
  into v_ext_schema
  from pg_catalog.pg_extension e
  join pg_catalog.pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pgcrypto';

  if v_ext_schema is null then
    raise exception 'Extension pgcrypto is not installed.';
  end if;

  v_test_hash := pg_catalog.encode(
    pg_catalog.sha256(pg_catalog.convert_to('phase1-sha256-self-test', 'UTF8')),
    'hex'
  );

  if v_test_hash is null or pg_catalog.char_length(v_test_hash) <> 64 then
    raise exception 'SHA-256 verification failed.';
  end if;
end $$;

-- =====================================================================
-- 0. MIGRATION BASELINE SNAPSHOT & SAFE UTILITY FUNCTIONS
-- =====================================================================
create table if not exists public.phase1_migration_baseline (
  entity_type text not null check (entity_type in ('vendor_profile', 'project')),
  entity_id uuid not null,
  recorded_at timestamptz not null default now(),
  primary key (entity_type, entity_id)
);

alter table public.phase1_migration_baseline enable row level security;

insert into public.phase1_migration_baseline (entity_type, entity_id)
select 'vendor_profile', vp.user_id from public.vendor_profiles vp
on conflict do nothing;

insert into public.phase1_migration_baseline (entity_type, entity_id)
select 'project', p.id from public.projects p
on conflict do nothing;

-- ============================================================================
-- FUNCTION 1: public.try_cast_uuid
-- ============================================================================
create or replace function public.try_cast_uuid(p_input text)
returns uuid
language plpgsql
immutable
security invoker
set search_path = ''
as $$
begin
  if p_input is null
     or p_input !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  return p_input::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

revoke all on function public.try_cast_uuid(text) from public;
grant execute on function public.try_cast_uuid(text) to authenticated, service_role;

-- ============================================================================
-- FUNCTION 2: public.normalize_company_name
-- ============================================================================
create or replace function public.normalize_company_name(
  p_raw_name text,
  p_fallback_name text,
  p_fallback_uuid uuid
)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select pg_catalog.left(
    case
      when pg_catalog.char_length(pg_catalog.btrim(coalesce(p_raw_name, ''))) >= 2
        then pg_catalog.btrim(p_raw_name)
      when pg_catalog.char_length(pg_catalog.btrim(coalesce(p_fallback_name, ''))) >= 2
        then pg_catalog.btrim(p_fallback_name)
      else 'Organisasi ' || pg_catalog.substr(coalesce(p_fallback_uuid::text, 'baru'), 1, 8)
    end,
    150
  );
$$;

revoke all on function public.normalize_company_name(text, text, uuid) from public;
grant execute on function public.normalize_company_name(text, text, uuid) to authenticated, service_role;

-- =====================================================================
-- 1. PROFILES: PLATFORM ROLE & ROLE ESCALATION PROTECTION
-- =====================================================================
alter table public.profiles
  add column if not exists platform_role text not null default 'user'
    check (platform_role in ('user', 'platform_admin'));

-- ============================================================================
-- FUNCTION 3: public.prevent_profile_role_change (Trigger Function)
-- ============================================================================
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_jwt_role text := coalesce(
    pg_catalog.current_setting('request.jwt.claim.role', true),
    (nullif(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    ''
  );
begin
  if old.role is not null and new.role <> old.role then
    raise exception 'Perubahan role profil tidak diizinkan demi keamanan.';
  end if;

  if old.platform_role is not null
     and new.platform_role <> old.platform_role
     and v_jwt_role <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Perubahan platform_role tidak diizinkan.';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_profile_role_change() from public, anon, authenticated;

drop trigger if exists tr_prevent_profile_role_change on public.profiles;
create trigger tr_prevent_profile_role_change
  before update on public.profiles
  for each row execute function public.prevent_profile_role_change();

-- =====================================================================
-- 2. PROTECT HISTORICAL PROJECTS & REVIEWS FROM VENDOR CASCADE DELETION
-- =====================================================================
alter table public.projects
  drop constraint if exists projects_vendor_id_fkey;
alter table public.projects
  add constraint projects_vendor_id_fkey
    foreign key (vendor_id)
    references public.vendor_profiles(user_id)
    on delete restrict;

alter table public.reviews
  drop constraint if exists reviews_vendor_id_fkey;
alter table public.reviews
  add constraint reviews_vendor_id_fkey
    foreign key (vendor_id)
    references public.vendor_profiles(user_id)
    on delete restrict;

-- =====================================================================
-- 3. COMPANIES, COMPANY_MEMBERS, & COMPANY_INVITATIONS
-- =====================================================================
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  legacy_vendor_user_id uuid not null unique
    references public.vendor_profiles(user_id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 150),
  description text,
  website text,
  location text,
  status text not null default 'active'
    check (status in ('active', 'deactivated', 'archived')),
  deactivated_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- FUNCTION 4: public.prevent_company_hard_delete (Trigger Function)
-- ============================================================================
create or replace function public.prevent_company_hard_delete()
returns trigger
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  raise exception 'Companies cannot be hard-deleted. Use deactivation instead to preserve recruitment history.';
end;
$$;

revoke all on function public.prevent_company_hard_delete() from public, anon, authenticated;

drop trigger if exists tr_prevent_company_hard_delete on public.companies;
create trigger tr_prevent_company_hard_delete
  before delete on public.companies
  for each row execute function public.prevent_company_hard_delete();

-- ============================================================================
-- FUNCTION 5: public.prevent_company_legacy_vendor_relink (Trigger Function)
-- ============================================================================
create or replace function public.prevent_company_legacy_vendor_relink()
returns trigger
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if old.legacy_vendor_user_id is not null
     and new.legacy_vendor_user_id is distinct from old.legacy_vendor_user_id then
    raise exception 'Company legacy_vendor_user_id association is immutable.';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_company_legacy_vendor_relink() from public, anon, authenticated;

drop trigger if exists tr_prevent_company_legacy_vendor_relink on public.companies;
create trigger tr_prevent_company_legacy_vendor_relink
  before update of legacy_vendor_user_id on public.companies
  for each row execute function public.prevent_company_legacy_vendor_relink();

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('company_owner', 'hr_admin', 'hr_recruiter')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  invited_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

-- ============================================================================
-- FUNCTION 6: public.enforce_company_active_owner_invariant (Constraint Trigger)
-- ============================================================================
create or replace function public.enforce_company_active_owner_invariant()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_company_status text;
  v_active_owner_count integer;
begin
  if tg_table_name = 'companies' then
    v_company_id := coalesce(new.id, old.id);
  else
    v_company_id := coalesce(new.company_id, old.company_id);
  end if;

  -- Lock parent company row exclusively to serialize concurrent owner mutations
  select c.status
  into v_company_status
  from public.companies c
  where c.id = v_company_id
  for update;

  if found and v_company_status = 'active' then
    select count(*)
    into v_active_owner_count
    from public.company_members cm
    where cm.company_id = v_company_id
      and cm.role = 'company_owner'
      and cm.status = 'active';

    if v_active_owner_count < 1 then
      raise exception 'Each active company must retain at least one active company_owner (company_id: %).',
        v_company_id;
    end if;
  end if;

  -- If company_id was moved across companies on UPDATE, lock & validate old company_id too
  if tg_table_name = 'company_members'
     and tg_op = 'UPDATE'
     and old.company_id is distinct from new.company_id then
    select c.status
    into v_company_status
    from public.companies c
    where c.id = old.company_id
    for update;

    if found and v_company_status = 'active' then
      select count(*)
      into v_active_owner_count
      from public.company_members cm
      where cm.company_id = old.company_id
        and cm.role = 'company_owner'
        and cm.status = 'active';

      if v_active_owner_count < 1 then
        raise exception 'Each active company must retain at least one active company_owner (company_id: %).',
          old.company_id;
      end if;
    end if;
  end if;

  return null;
end;
$$;

revoke all on function public.enforce_company_active_owner_invariant() from public, anon, authenticated;

drop trigger if exists tr_company_members_active_owner_invariant on public.company_members;
create constraint trigger tr_company_members_active_owner_invariant
  after insert or update or delete on public.company_members
  deferrable initially deferred
  for each row execute function public.enforce_company_active_owner_invariant();

drop trigger if exists tr_companies_active_owner_invariant on public.companies;
create constraint trigger tr_companies_active_owner_invariant
  after insert or update of status on public.companies
  deferrable initially deferred
  for each row execute function public.enforce_company_active_owner_invariant();

create table if not exists public.company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  email text not null check (char_length(btrim(email)) between 3 and 320),
  role text not null check (role in ('hr_admin', 'hr_recruiter')),
  token_hash text not null unique check (char_length(token_hash) = 64),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid not null references public.profiles(id) on delete restrict,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint company_invitations_acceptance_consistency check (
    (status = 'accepted' and accepted_at is not null and accepted_by is not null)
    or (status <> 'accepted' and accepted_at is null and accepted_by is null)
  )
);

create index if not exists company_members_user_active_idx
  on public.company_members (user_id, company_id)
  where status = 'active';

create index if not exists company_members_company_role_idx
  on public.company_members (company_id, role)
  where status = 'active';

create index if not exists company_invitations_company_status_idx
  on public.company_invitations (company_id, status);

create unique index if not exists company_invitations_pending_email_idx
  on public.company_invitations (company_id, lower(btrim(email)))
  where status = 'pending';

-- =====================================================================
-- 4. VENDOR_PROFILES <-> COMPANIES SYNC (DECOUPLED FROM MEMBERSHIP MUTATION)
-- =====================================================================
alter table public.projects
  add column if not exists company_id uuid references public.companies(id) on delete restrict;

create index if not exists projects_company_id_idx on public.projects (company_id);

-- ============================================================================
-- FUNCTION 7: public.sync_vendor_profile_to_company (Trigger Function)
-- ============================================================================
create or replace function public.sync_vendor_profile_to_company()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_clean_name text;
begin
  v_clean_name := public.normalize_company_name(new.organization_name, null, new.user_id);

  insert into public.companies (
    legacy_vendor_user_id,
    name,
    description,
    website,
    location,
    created_by,
    updated_at
  )
  values (
    new.user_id,
    v_clean_name,
    new.description,
    new.website,
    new.location,
    new.user_id,
    pg_catalog.now()
  )
  on conflict (legacy_vendor_user_id) do update set
    name = excluded.name,
    description = excluded.description,
    website = excluded.website,
    location = excluded.location,
    updated_at = pg_catalog.now()
  returning id into v_company_id;

  -- Strictly on initial INSERT only, and ON CONFLICT DO NOTHING so existing
  -- disabled memberships or HR-managed roles are NEVER overwritten or reactivated
  if tg_op = 'INSERT' then
    insert into public.company_members (
      company_id,
      user_id,
      role,
      status
    )
    values (
      v_company_id,
      new.user_id,
      'company_owner',
      'active'
    )
    on conflict (company_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_vendor_profile_to_company() from public, anon, authenticated;

drop trigger if exists tr_sync_vendor_profile_to_company on public.vendor_profiles;
create trigger tr_sync_vendor_profile_to_company
  after insert or update on public.vendor_profiles
  for each row execute function public.sync_vendor_profile_to_company();

-- Backfill Step A: Ensure any profile with role = 'vendor' has a vendor_profiles row
insert into public.vendor_profiles (user_id, organization_name)
select
  p.id,
  public.normalize_company_name(p.full_name, null, p.id)
from public.profiles p
where p.role = 'vendor'
  and not exists (
    select 1 from public.vendor_profiles vp where vp.user_id = p.id
  )
on conflict (user_id) do nothing;

-- Backfill Step B: Ensure every vendor_profiles row has a companies row
insert into public.companies (
  legacy_vendor_user_id,
  name,
  description,
  website,
  location,
  created_by,
  created_at,
  updated_at
)
select
  vp.user_id,
  public.normalize_company_name(vp.organization_name, pr.full_name, vp.user_id),
  vp.description,
  vp.website,
  vp.location,
  vp.user_id,
  coalesce(pr.created_at, now()),
  coalesce(vp.updated_at, now())
from public.vendor_profiles vp
left join public.profiles pr on pr.id = vp.user_id
on conflict (legacy_vendor_user_id) do update set
  name = excluded.name,
  description = coalesce(public.companies.description, excluded.description),
  website = coalesce(public.companies.website, excluded.website),
  location = coalesce(public.companies.location, excluded.location);

-- Backfill Step C: Seed initial company_owner membership ONLY if no membership row exists
insert into public.company_members (
  company_id,
  user_id,
  role,
  status
)
select
  c.id,
  c.legacy_vendor_user_id,
  'company_owner',
  'active'
from public.companies c
on conflict (company_id, user_id) do nothing;

-- Backfill Step D: Populate projects.company_id from companies.legacy_vendor_user_id
update public.projects p
set company_id = c.id
from public.companies c
where p.company_id is null
  and p.vendor_id = c.legacy_vendor_user_id;

-- ============================================================================
-- FUNCTION 8: public.sync_project_company_id (Trigger Function)
-- ============================================================================
create or replace function public.sync_project_company_id()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_company_from_vendor uuid;
  v_vendor_from_company uuid;
begin
  if new.vendor_id is not null then
    select c.id
    into v_company_from_vendor
    from public.companies c
    where c.legacy_vendor_user_id = new.vendor_id
    limit 1;
  end if;

  if new.company_id is not null then
    select c.legacy_vendor_user_id
    into v_vendor_from_company
    from public.companies c
    where c.id = new.company_id
    limit 1;

    if v_vendor_from_company is null then
      raise exception 'Company workspace % does not exist.', new.company_id;
    end if;
  end if;

  -- Case 1: Only vendor_id provided (legacy insert path)
  if new.company_id is null and new.vendor_id is not null then
    if v_company_from_vendor is null then
      raise exception 'Cannot resolve company workspace for vendor_id %.', new.vendor_id;
    end if;
    new.company_id := v_company_from_vendor;
    return new;
  end if;

  -- Case 2: Only company_id provided (HR Admin / new company path)
  if new.company_id is not null and new.vendor_id is null then
    new.vendor_id := v_vendor_from_company;
    return new;
  end if;

  -- Case 3: Both provided -> Must match 1:1
  if new.company_id is not null and new.vendor_id is not null then
    if v_company_from_vendor is distinct from new.company_id
       or v_vendor_from_company is distinct from new.vendor_id then
      raise exception 'Inconsistent project ownership: vendor_id % and company_id % do not match.',
        new.vendor_id, new.company_id;
    end if;
    return new;
  end if;

  raise exception 'Project must specify a valid company_id or vendor_id.';
end;
$$;

revoke all on function public.sync_project_company_id() from public, anon, authenticated;

drop trigger if exists tr_sync_project_company_id on public.projects;
create trigger tr_sync_project_company_id
  before insert or update of vendor_id, company_id on public.projects
  for each row execute function public.sync_project_company_id();

alter table public.projects
  alter column company_id set not null;

-- =====================================================================
-- 5. SECURITY DEFINER RBAC HELPERS & ATOMIC WORKFLOW FUNCTIONS
-- =====================================================================

-- ============================================================================
-- FUNCTION 9: public.is_platform_admin
-- ============================================================================
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.platform_role = 'platform_admin'
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated, service_role;

-- ============================================================================
-- FUNCTION 10: public.has_company_role
-- ============================================================================
create or replace function public.has_company_role(
  p_company_id uuid,
  p_allowed_roles text[] default array['company_owner', 'hr_admin', 'hr_recruiter']
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members cm
    join public.companies c on c.id = cm.company_id
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
      and c.status = 'active'
      and cm.role = any(p_allowed_roles)
  );
$$;

revoke all on function public.has_company_role(uuid, text[]) from public;
grant execute on function public.has_company_role(uuid, text[]) to authenticated, service_role;

-- ============================================================================
-- FUNCTION 11: public.is_any_company_member_including_disabled
-- ============================================================================
create or replace function public.is_any_company_member_including_disabled(
  p_company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
  );
$$;

revoke all on function public.is_any_company_member_including_disabled(uuid) from public;
grant execute on function public.is_any_company_member_including_disabled(uuid) to authenticated, service_role;

-- ============================================================================
-- FUNCTION 12: public.can_access_project_company
-- ============================================================================
create or replace function public.can_access_project_company(
  p_project_id uuid,
  p_allowed_roles text[] default array['company_owner', 'hr_admin', 'hr_recruiter']
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and public.has_company_role(p.company_id, p_allowed_roles)
  );
$$;

revoke all on function public.can_access_project_company(uuid, text[]) from public;
grant execute on function public.can_access_project_company(uuid, text[]) to authenticated, service_role;

-- ============================================================================
-- FUNCTION 13: public.can_access_application_performance_docs
-- ============================================================================
create or replace function public.can_access_application_performance_docs(
  p_company_id uuid,
  p_application_id uuid,
  p_allowed_roles text[] default array['company_owner', 'hr_admin', 'hr_recruiter']
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_company_id is not null
    and p_application_id is not null
    and public.has_company_role(p_company_id, p_allowed_roles)
    and exists (
      select 1
      from public.applications a
      join public.projects p on p.id = a.project_id
      where a.id = p_application_id
        and p.company_id = p_company_id
    );
$$;

revoke all on function public.can_access_application_performance_docs(uuid, uuid, text[]) from public;
grant execute on function public.can_access_application_performance_docs(uuid, uuid, text[]) to authenticated, service_role;

-- ============================================================================
-- FUNCTION 14: public.can_access_performance_doc_object
-- ============================================================================
create or replace function public.can_access_performance_doc_object(
  p_object_name text,
  p_allowed_roles text[] default array['company_owner', 'hr_admin', 'hr_recruiter']
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_segments text[];
  v_company_id uuid;
  v_application_id uuid;
  v_file_uuid uuid;
begin
  if p_object_name is null then
    return false;
  end if;

  -- Strict regex: <company_uuid>/<application_uuid>/<file_uuid>.pdf
  if p_object_name !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$' then
    return false;
  end if;

  v_segments := pg_catalog.string_to_array(p_object_name, '/');
  if pg_catalog.array_length(v_segments, 1) <> 3 then
    return false;
  end if;

  v_company_id := public.try_cast_uuid(v_segments[1]);
  v_application_id := public.try_cast_uuid(v_segments[2]);
  v_file_uuid := public.try_cast_uuid(pg_catalog.regexp_replace(v_segments[3], '\.pdf$', '', 'i'));

  if v_company_id is null or v_application_id is null or v_file_uuid is null then
    return false;
  end if;

  return public.can_access_application_performance_docs(
    v_company_id,
    v_application_id,
    p_allowed_roles
  );
end;
$$;

revoke all on function public.can_access_performance_doc_object(text, text[]) from public;
grant execute on function public.can_access_performance_doc_object(text, text[]) to authenticated, service_role;

-- ============================================================================
-- FUNCTION 15: public.create_company_workspace
-- ============================================================================
create or replace function public.create_company_workspace(
  p_name text,
  p_description text default null,
  p_website text default null,
  p_location text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_clean_name text;
  v_company_id uuid;
  v_profile_role public.user_role;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  v_clean_name := pg_catalog.btrim(coalesce(p_name, ''));
  if pg_catalog.char_length(v_clean_name) not between 2 and 150 then
    raise exception 'Nama perusahaan harus antara 2 hingga 150 karakter.';
  end if;

  select p.role into v_profile_role
  from public.profiles p
  where p.id = v_user_id;

  if not found or v_profile_role <> 'vendor' then
    raise exception 'Hanya akun dengan profil dasar Vendor/Perusahaan yang dapat membuat workspace perusahaan baru.';
  end if;

  insert into public.vendor_profiles (
    user_id,
    organization_name,
    description,
    website,
    location,
    updated_at
  )
  values (
    v_user_id,
    v_clean_name,
    nullif(pg_catalog.btrim(coalesce(p_description, '')), ''),
    nullif(pg_catalog.btrim(coalesce(p_website, '')), ''),
    nullif(pg_catalog.btrim(coalesce(p_location, '')), ''),
    pg_catalog.now()
  )
  on conflict (user_id) do update set
    organization_name = excluded.organization_name,
    description = excluded.description,
    website = excluded.website,
    location = excluded.location,
    updated_at = pg_catalog.now();

  select c.id into v_company_id
  from public.companies c
  where c.legacy_vendor_user_id = v_user_id
  limit 1;

  if v_company_id is null then
    raise exception 'Gagal menginisialisasi workspace perusahaan.';
  end if;

  insert into public.company_members (
    company_id,
    user_id,
    role,
    status
  )
  values (
    v_company_id,
    v_user_id,
    'company_owner',
    'active'
  )
  on conflict (company_id, user_id) do nothing;

  return v_company_id;
end;
$$;

revoke all on function public.create_company_workspace(text, text, text, text) from public;
grant execute on function public.create_company_workspace(text, text, text, text) to authenticated, service_role;

-- ============================================================================
-- FUNCTION 16: public.restore_company_member
-- ============================================================================
create or replace function public.restore_company_member(
  p_company_id uuid,
  p_member_user_id uuid,
  p_restored_role text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not (
    public.has_company_role(p_company_id, array['company_owner'])
    or public.is_platform_admin()
  ) then
    raise exception 'Only an active Company Owner or Platform Admin can restore a disabled company member.';
  end if;

  if p_restored_role is not null
     and p_restored_role not in ('company_owner', 'hr_admin', 'hr_recruiter') then
    raise exception 'Invalid company member role: %.', p_restored_role;
  end if;

  update public.company_members
  set status = 'active',
      role = coalesce(p_restored_role, role),
      updated_at = pg_catalog.now()
  where company_id = p_company_id
    and user_id = p_member_user_id;

  if not found then
    raise exception 'Company member not found.';
  end if;
end;
$$;

revoke all on function public.restore_company_member(uuid, uuid, text) from public;
grant execute on function public.restore_company_member(uuid, uuid, text) to authenticated, service_role;

-- ============================================================================
-- FUNCTION 17: public.deactivate_company_workspace
-- ============================================================================
create or replace function public.deactivate_company_workspace(
  p_company_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not (
    public.has_company_role(p_company_id, array['company_owner'])
    or public.is_platform_admin()
  ) then
    raise exception 'Only the Company Owner or Platform Admin can deactivate a company workspace.';
  end if;

  update public.companies
  set status = 'deactivated',
      deactivated_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where id = p_company_id
    and status = 'active';

  if not found then
    raise exception 'Active company workspace not found.';
  end if;

  update public.projects
  set status = 'closed'
  where company_id = p_company_id
    and status in ('draft', 'open');

  update public.company_invitations
  set status = 'revoked'
  where company_id = p_company_id
    and status = 'pending';
end;
$$;

revoke all on function public.deactivate_company_workspace(uuid) from public;
grant execute on function public.deactivate_company_workspace(uuid) to authenticated, service_role;

-- ============================================================================
-- FUNCTION 18: public.expire_stale_company_invitations
-- ============================================================================
create or replace function public.expire_stale_company_invitations(
  p_company_id uuid
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_expired_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not (
    public.has_company_role(p_company_id, array['company_owner', 'hr_admin'])
    or public.is_platform_admin()
  ) then
    raise exception 'Access denied: only authorized company HR admins/owners can expire stale invitations.';
  end if;

  with updated_rows as (
    update public.company_invitations
    set status = 'expired'
    where company_id = p_company_id
      and status = 'pending'
      and expires_at <= pg_catalog.now()
    returning 1
  )
  select count(*) into v_expired_count from updated_rows;

  return v_expired_count;
end;
$$;

revoke all on function public.expire_stale_company_invitations(uuid) from public;
grant execute on function public.expire_stale_company_invitations(uuid) to authenticated, service_role;

-- ============================================================================
-- FUNCTION 19: public.accept_company_invitation
-- ============================================================================
create or replace function public.accept_company_invitation(
  p_raw_token text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_email_confirmed_at timestamptz;
  v_token_hash text;
  v_inv public.company_invitations%rowtype;
  v_company_status text;
begin
  if v_user_id is null then
    return pg_catalog.jsonb_build_object(
      'success', false,
      'company_id', null,
      'error_code', 'UNAUTHENTICATED',
      'error', 'Authentication required.'
    );
  end if;

  if p_raw_token is null or pg_catalog.char_length(pg_catalog.btrim(p_raw_token)) < 32 then
    return pg_catalog.jsonb_build_object(
      'success', false,
      'company_id', null,
      'error_code', 'INVALID_TOKEN',
      'error', 'Token undangan tidak valid.'
    );
  end if;

  select u.email, u.email_confirmed_at
  into v_user_email, v_email_confirmed_at
  from auth.users u
  where u.id = v_user_id;

  if v_user_email is null then
    return pg_catalog.jsonb_build_object(
      'success', false,
      'company_id', null,
      'error_code', 'USER_NOT_FOUND',
      'error', 'Akun pengguna tidak ditemukan.'
    );
  end if;

  if v_email_confirmed_at is null then
    return pg_catalog.jsonb_build_object(
      'success', false,
      'company_id', null,
      'error_code', 'EMAIL_NOT_CONFIRMED',
      'error', 'Email akun harus dikonfirmasi terlebih dahulu sebelum menerima undangan perusahaan.'
    );
  end if;

  v_token_hash := pg_catalog.encode(
    pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.btrim(p_raw_token), 'UTF8')),
    'hex'
  );

  select *
  into v_inv
  from public.company_invitations ci
  where ci.token_hash = v_token_hash
  for update;

  if not found then
    return pg_catalog.jsonb_build_object(
      'success', false,
      'company_id', null,
      'error_code', 'INVITATION_NOT_FOUND',
      'error', 'Undangan tidak ditemukan atau token tidak valid.'
    );
  end if;

  if v_inv.status <> 'pending' then
    return pg_catalog.jsonb_build_object(
      'success', false,
      'company_id', null,
      'error_code', 'INVITATION_NOT_PENDING',
      'error', pg_catalog.format('Undangan ini sudah digunakan atau tidak lagi berlaku (status: %s).', v_inv.status)
    );
  end if;

  if v_inv.expires_at <= pg_catalog.now() then
    update public.company_invitations
    set status = 'expired'
    where id = v_inv.id;

    return pg_catalog.jsonb_build_object(
      'success', false,
      'company_id', null,
      'error_code', 'INVITATION_EXPIRED',
      'error', 'Undangan telah kedaluwarsa.'
    );
  end if;

  if pg_catalog.lower(pg_catalog.btrim(v_user_email)) <> pg_catalog.lower(pg_catalog.btrim(v_inv.email)) then
    return pg_catalog.jsonb_build_object(
      'success', false,
      'company_id', null,
      'error_code', 'EMAIL_MISMATCH',
      'error', 'Alamat email akun yang login tidak sesuai dengan email tujuan undangan.'
    );
  end if;

  select c.status into v_company_status
  from public.companies c
  where c.id = v_inv.company_id;

  if v_company_status is distinct from 'active' then
    return pg_catalog.jsonb_build_object(
      'success', false,
      'company_id', null,
      'error_code', 'COMPANY_INACTIVE',
      'error', 'Workspace perusahaan tidak aktif.'
    );
  end if;

  update public.company_invitations
  set status = 'accepted',
      accepted_by = v_user_id,
      accepted_at = pg_catalog.now()
  where id = v_inv.id;

  insert into public.company_members (
    company_id,
    user_id,
    role,
    status,
    invited_by,
    joined_at,
    updated_at
  )
  values (
    v_inv.company_id,
    v_user_id,
    v_inv.role,
    'active',
    v_inv.invited_by,
    pg_catalog.now(),
    pg_catalog.now()
  )
  on conflict (company_id, user_id) do update set
    role = case
      when public.company_members.role = 'company_owner' then 'company_owner'
      else excluded.role
    end,
    status = 'active',
    invited_by = excluded.invited_by,
    updated_at = pg_catalog.now();

  return pg_catalog.jsonb_build_object(
    'success', true,
    'company_id', v_inv.company_id,
    'error_code', null,
    'error', null
  );
end;
$$;

revoke all on function public.accept_company_invitation(text) from public;
grant execute on function public.accept_company_invitation(text) to authenticated, service_role;

-- ============================================================================
-- FUNCTION 20: public.hr_update_application_status
-- ============================================================================
create or replace function public.hr_update_application_status(
  p_application_id uuid,
  p_new_status public.application_status
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_project_id uuid;
  v_talent_id uuid;
  v_current_status public.application_status;
begin
  if v_actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_new_status not in ('accepted', 'rejected', 'completed') then
    raise exception 'Invalid HR application status target: %.', p_new_status;
  end if;

  select a.project_id, a.talent_id, a.status
  into v_project_id, v_talent_id, v_current_status
  from public.applications a
  where a.id = p_application_id
  for update;

  if not found then
    raise exception 'Lamaran tidak ditemukan.';
  end if;

  if v_talent_id = v_actor_id then
    raise exception 'Anggota HR tidak dapat mengevaluasi lamaran miliknya sendiri.';
  end if;

  if not public.can_access_project_company(
    v_project_id,
    array['company_owner', 'hr_admin', 'hr_recruiter']
  ) then
    raise exception 'Akses ditolak: Anda bukan anggota HR aktif dari perusahaan pemilik proyek ini.';
  end if;

  if v_current_status not in ('pending', 'accepted') then
    raise exception 'Status lamaran % tidak dapat diubah oleh HR.', v_current_status;
  end if;

  update public.applications
  set status = p_new_status
  where id = p_application_id;

  if p_new_status = 'accepted' then
    update public.projects
    set status = 'in_progress'
    where id = v_project_id
      and status = 'open';
  end if;
end;
$$;

revoke all on function public.hr_update_application_status(uuid, public.application_status) from public;
grant execute on function public.hr_update_application_status(uuid, public.application_status) to authenticated, service_role;

-- ============================================================================
-- FUNCTION 21: public.prevent_application_cv_snapshot_rewrite (Trigger Function)
-- ============================================================================
create or replace function public.prevent_application_cv_snapshot_rewrite()
returns trigger
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_jwt_role text := coalesce(
    pg_catalog.current_setting('request.jwt.claim.role', true),
    (nullif(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    ''
  );
  v_is_service_op boolean := (
    v_jwt_role = 'service_role'
    or current_user in ('postgres', 'supabase_admin')
  );
  v_is_talent_owner boolean := false;
  v_is_authorized_hr boolean := false;
begin
  -- 1. Core identity columns on applications are unconditionally immutable
  if new.id is distinct from old.id
     or new.project_id is distinct from old.project_id
     or new.talent_id is distinct from old.talent_id then
    raise exception 'Application identity fields (id, project_id, talent_id) are immutable.';
  end if;

  -- 2. Service-role / internal FK cascade operations (e.g. ON DELETE SET NULL when CV row deleted)
  if v_actor_id is null and v_is_service_op then
    if new.candidate_cv_id is distinct from old.candidate_cv_id then
      if new.candidate_cv_id is null and not exists (
        select 1 from public.candidate_cvs cv where cv.id = old.candidate_cv_id
      ) then
        return new;
      end if;
      raise exception 'Application CV snapshots are immutable.';
    end if;
    return new;
  end if;

  if v_actor_id is null then
    raise exception 'Authentication required to update applications.';
  end if;

  -- 3. Identify explicit actor roles
  select exists (
    select 1
    from public.profiles p
    where p.id = v_actor_id
      and p.role = 'talent'
  ) and (v_actor_id = old.talent_id)
  into v_is_talent_owner;

  if v_actor_id <> old.talent_id then
    v_is_authorized_hr := public.can_access_project_company(
      old.project_id,
      array['company_owner', 'hr_admin', 'hr_recruiter']
    );
  end if;

  -- 4. Platform Admin without explicit HR membership on the project's company is strictly denied
  if public.is_platform_admin() and not v_is_talent_owner and not v_is_authorized_hr then
    raise exception 'Platform Admin is not permitted to modify application records.';
  end if;

  -- 5. Branch A: Talent Owner updating their own application
  if v_is_talent_owner then
    if old.status = 'pending' and new.status = 'withdrawn' then
      if new.candidate_cv_id is distinct from old.candidate_cv_id
         or new.match_score is distinct from old.match_score
         or new.message is distinct from old.message
         or new.created_at is distinct from old.created_at then
        raise exception 'Talent cannot modify application score, message, or CV snapshot while withdrawing.';
      end if;
      return new;
    end if;

    if old.status = 'withdrawn' and new.status = 'pending' then
      if not (
        (
          new.candidate_cv_id is null
          and exists (
            select 1
            from public.talent_profiles tp
            where tp.user_id = new.talent_id
              and tp.current_cv_id is null
          )
        )
        or exists (
          select 1
          from public.talent_profiles tp
          join public.candidate_cvs cv
            on cv.id = tp.current_cv_id
           and cv.candidate_id = tp.user_id
          where tp.user_id = new.talent_id
            and tp.current_cv_id = new.candidate_cv_id
        )
      ) then
        raise exception 'Application CV snapshot on re-apply must match the Talent current valid CV.';
      end if;
      return new;
    end if;

    raise exception 'Invalid application status transition (% -> %) by Talent.', old.status, new.status;
  end if;

  -- 6. Branch B: Active Authorized HR Member of the Company owning the Project
  if v_is_authorized_hr then
    if new.candidate_cv_id is distinct from old.candidate_cv_id then
      raise exception 'Application CV snapshots are immutable.';
    end if;

    if new.message is distinct from old.message
       or new.match_score is distinct from old.match_score
       or new.created_at is distinct from old.created_at then
      raise exception 'HR members are only permitted to update the application status column.';
    end if;

    if old.status not in ('pending', 'accepted')
       or new.status not in ('accepted', 'rejected', 'completed') then
      raise exception 'Invalid application status transition (% -> %) by HR.', old.status, new.status;
    end if;

    return new;
  end if;

  -- 7. Any other authenticated user is strictly rejected
  raise exception 'Unauthorized application update.';
end;
$$;

revoke all on function public.prevent_application_cv_snapshot_rewrite() from public, anon, authenticated;

drop trigger if exists applications_prevent_cv_snapshot_rewrite on public.applications;
create trigger applications_prevent_cv_snapshot_rewrite
  before update on public.applications
  for each row execute function public.prevent_application_cv_snapshot_rewrite();

-- ============================================================================
-- 7. SCHEMA, TABLE & COLUMN-LEVEL PRIVILEGE HARDENING
-- ============================================================================
revoke create on schema public from public, anon, authenticated;
revoke create on schema extensions from public, anon, authenticated;

revoke all on table public.phase1_migration_baseline from public, anon, authenticated;

revoke update on table public.profiles from authenticated;
grant update (full_name, avatar_url)
  on table public.profiles to authenticated;

revoke update on table public.companies from authenticated;
grant update (name, description, website, location, updated_at)
  on table public.companies to authenticated;

revoke update on table public.applications from authenticated;
grant update (status, message, match_score, candidate_cv_id, created_at)
  on table public.applications to authenticated;

-- ============================================================================
-- 8. COMPLETE RLS & STORAGE POLICIES
-- ============================================================================
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_invitations enable row level security;

-- companies
drop policy if exists "companies: select authorized or active with open projects" on public.companies;
create policy "companies: select authorized or active with open projects"
  on public.companies for select to authenticated
  using (
    public.has_company_role(id, array['company_owner', 'hr_admin', 'hr_recruiter'])
    or public.is_platform_admin()
    or (
      status = 'active'
      and exists (
        select 1 from public.projects p
        where p.company_id = companies.id
          and p.status <> 'draft'
      )
    )
  );

drop policy if exists "companies: owner updates" on public.companies;
create policy "companies: owner updates"
  on public.companies for update to authenticated
  using (public.has_company_role(id, array['company_owner']))
  with check (public.has_company_role(id, array['company_owner']));

-- company_members
drop policy if exists "company_members: select self, team, or platform admin" on public.company_members;
create policy "company_members: select self, team, or platform admin"
  on public.company_members for select to authenticated
  using (
    auth.uid() = user_id
    or public.has_company_role(company_id, array['company_owner', 'hr_admin', 'hr_recruiter'])
    or public.is_platform_admin()
  );

drop policy if exists "company_members: owner inserts" on public.company_members;
create policy "company_members: owner inserts"
  on public.company_members for insert to authenticated
  with check (public.has_company_role(company_id, array['company_owner']));

drop policy if exists "company_members: owner updates" on public.company_members;
create policy "company_members: owner updates"
  on public.company_members for update to authenticated
  using (public.has_company_role(company_id, array['company_owner']))
  with check (public.has_company_role(company_id, array['company_owner']));

-- company_invitations
drop policy if exists "company_invitations: select owner, hr_admin, or platform admin" on public.company_invitations;
create policy "company_invitations: select owner, hr_admin, or platform admin"
  on public.company_invitations for select to authenticated
  using (
    public.has_company_role(company_id, array['company_owner', 'hr_admin'])
    or public.is_platform_admin()
  );

drop policy if exists "company_invitations: owner inserts" on public.company_invitations;
create policy "company_invitations: owner inserts"
  on public.company_invitations for insert to authenticated
  with check (
    public.has_company_role(company_id, array['company_owner'])
    and invited_by = auth.uid()
    and status = 'pending'
  );

drop policy if exists "company_invitations: owner updates" on public.company_invitations;
create policy "company_invitations: owner updates"
  on public.company_invitations for update to authenticated
  using (public.has_company_role(company_id, array['company_owner']))
  with check (public.has_company_role(company_id, array['company_owner']));

-- profiles, talent_profiles, talent_skills, reviews
drop policy if exists "profiles: vendor lihat pelamar" on public.profiles;
create policy "profiles: vendor lihat pelamar"
  on public.profiles for select to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.applications a
      where a.talent_id = profiles.id
        and public.can_access_project_company(a.project_id, array['company_owner', 'hr_admin', 'hr_recruiter'])
    )
  );

drop policy if exists "talent_profiles: vendor lihat pelamar" on public.talent_profiles;
create policy "talent_profiles: vendor lihat pelamar"
  on public.talent_profiles for select to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.applications a
      where a.talent_id = talent_profiles.user_id
        and public.can_access_project_company(a.project_id, array['company_owner', 'hr_admin', 'hr_recruiter'])
    )
  );

drop policy if exists "talent_skills: vendor lihat pelamar" on public.talent_skills;
create policy "talent_skills: vendor lihat pelamar"
  on public.talent_skills for select to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.applications a
      where a.talent_id = talent_skills.talent_id
        and public.can_access_project_company(a.project_id, array['company_owner', 'hr_admin', 'hr_recruiter'])
    )
  );

drop policy if exists "reviews: vendor lihat review pelamar" on public.reviews;
create policy "reviews: vendor lihat review pelamar"
  on public.reviews for select to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.applications a
      where a.talent_id = reviews.talent_id
        and public.can_access_project_company(a.project_id, array['company_owner', 'hr_admin', 'hr_recruiter'])
    )
  );

drop policy if exists "reviews: vendor tulis" on public.reviews;
create policy "reviews: vendor tulis"
  on public.reviews for insert to authenticated
  with check (
    exists (
      select 1
      from public.applications a
      join public.projects p on p.id = a.project_id
      where a.id = application_id
        and a.status = 'completed'
        and a.talent_id = reviews.talent_id
        and p.vendor_id = reviews.vendor_id
        and public.has_company_role(p.company_id, array['company_owner', 'hr_admin', 'hr_recruiter'])
    )
  );

-- projects & project_skills
drop policy if exists "projects: baca open atau milik sendiri" on public.projects;
create policy "projects: baca open atau milik sendiri"
  on public.projects for select to authenticated
  using (
    status <> 'draft'
    or public.has_company_role(company_id, array['company_owner', 'hr_admin', 'hr_recruiter'])
    or public.is_platform_admin()
  );

drop policy if exists "projects: vendor buat" on public.projects;
create policy "projects: vendor buat"
  on public.projects for insert to authenticated
  with check (
    public.has_company_role(company_id, array['company_owner', 'hr_admin'])
  );

drop policy if exists "projects: vendor ubah" on public.projects;
create policy "projects: vendor ubah"
  on public.projects for update to authenticated
  using (
    public.has_company_role(company_id, array['company_owner', 'hr_admin'])
  )
  with check (
    public.has_company_role(company_id, array['company_owner', 'hr_admin'])
  );

drop policy if exists "projects: vendor hapus" on public.projects;
create policy "projects: vendor hapus"
  on public.projects for delete to authenticated
  using (
    public.has_company_role(company_id, array['company_owner', 'hr_admin'])
  );

drop policy if exists "project_skills: baca" on public.project_skills;
create policy "project_skills: baca"
  on public.project_skills for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (
          p.status <> 'draft'
          or public.has_company_role(p.company_id, array['company_owner', 'hr_admin', 'hr_recruiter'])
          or public.is_platform_admin()
        )
    )
  );

drop policy if exists "project_skills: vendor kelola" on public.project_skills;
create policy "project_skills: vendor kelola"
  on public.project_skills for all to authenticated
  using (
    public.can_access_project_company(project_id, array['company_owner', 'hr_admin'])
  )
  with check (
    public.can_access_project_company(project_id, array['company_owner', 'hr_admin'])
  );

-- applications
drop policy if exists "applications: vendor lihat pelamar project-nya" on public.applications;
create policy "applications: vendor lihat pelamar project-nya"
  on public.applications for select to authenticated
  using (
    public.can_access_project_company(project_id, array['company_owner', 'hr_admin', 'hr_recruiter'])
    or public.is_platform_admin()
  );

drop policy if exists "applications: talent apply" on public.applications;
create policy "applications: talent apply"
  on public.applications for insert to authenticated
  with check (
    auth.uid() = talent_id
    and status = 'pending'
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.status = 'open'
        and p.vendor_id <> auth.uid()
        and not public.is_any_company_member_including_disabled(p.company_id)
    )
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'talent'
    )
    and (
      (
        candidate_cv_id is null
        and exists (
          select 1 from public.talent_profiles tp
          where tp.user_id = auth.uid() and tp.current_cv_id is null
        )
      )
      or exists (
        select 1
        from public.talent_profiles tp
        join public.candidate_cvs cv
          on cv.id = tp.current_cv_id
         and cv.candidate_id = tp.user_id
        where tp.user_id = auth.uid()
          and tp.current_cv_id = candidate_cv_id
      )
    )
  );

drop policy if exists "applications: talent ubah (withdraw)" on public.applications;
create policy "applications: talent ubah (withdraw)"
  on public.applications for update to authenticated
  using (
    auth.uid() = talent_id
    and status in ('pending', 'withdrawn')
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'talent'
    )
  )
  with check (
    auth.uid() = talent_id
    and status in ('withdrawn', 'pending')
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'talent'
    )
  );

drop policy if exists "applications: vendor ubah status" on public.applications;
create policy "applications: vendor ubah status"
  on public.applications for update to authenticated
  using (
    talent_id <> auth.uid()
    and status in ('pending', 'accepted')
    and public.can_access_project_company(project_id, array['company_owner', 'hr_admin', 'hr_recruiter'])
  )
  with check (
    talent_id <> auth.uid()
    and status in ('accepted', 'rejected', 'completed')
    and public.can_access_project_company(project_id, array['company_owner', 'hr_admin', 'hr_recruiter'])
  );

-- candidate_cvs, candidate_cv_extractions & storage.objects
drop policy if exists "candidate_cvs: applicant vendor reads" on public.candidate_cvs;
create policy "candidate_cvs: applicant vendor reads"
  on public.candidate_cvs for select to authenticated
  using (
    exists (
      select 1
      from public.applications a
      where a.candidate_cv_id = candidate_cvs.id
        and a.talent_id = candidate_cvs.candidate_id
        and public.can_access_project_company(a.project_id, array['company_owner', 'hr_admin', 'hr_recruiter'])
    )
  );

drop policy if exists "candidate_cv_extractions: applicant vendor reads" on public.candidate_cv_extractions;
create policy "candidate_cv_extractions: applicant vendor reads"
  on public.candidate_cv_extractions for select to authenticated
  using (
    exists (
      select 1
      from public.applications a
      where a.candidate_cv_id = candidate_cv_extractions.cv_id
        and a.talent_id = candidate_cv_extractions.candidate_id
        and public.can_access_project_company(a.project_id, array['company_owner', 'hr_admin', 'hr_recruiter'])
    )
  );

drop policy if exists "candidate CV read: owner or applicant vendor" on storage.objects;
create policy "candidate CV read: owner or applicant vendor"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'talent-cvs'
    and (
      storage.foldername(name) = array[auth.uid()::text]
      or exists (
        select 1
        from public.candidate_cvs cv
        join public.applications a
          on a.candidate_cv_id = cv.id
         and a.talent_id = cv.candidate_id
        where cv.object_path = storage.objects.name
          and public.can_access_project_company(a.project_id, array['company_owner', 'hr_admin', 'hr_recruiter'])
      )
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('performance-feedback-documents', 'performance-feedback-documents', false, 10485760, array['application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf'];

drop policy if exists "performance feedback docs: company HR insert" on storage.objects;
create policy "performance feedback docs: company HR insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'performance-feedback-documents'
    and public.can_access_performance_doc_object(
      name,
      array['company_owner', 'hr_admin', 'hr_recruiter']
    )
  );

drop policy if exists "performance feedback docs: company HR select" on storage.objects;
create policy "performance feedback docs: company HR select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'performance-feedback-documents'
    and public.can_access_performance_doc_object(
      name,
      array['company_owner', 'hr_admin', 'hr_recruiter']
    )
  );

-- =====================================================================
-- 9. POST-BACKFILL INTEGRITY ASSERTIONS
-- =====================================================================
do $$
declare
  v_vendor_count integer;
  v_company_count integer;
  v_null_company_projects integer;
  v_mismatched_projects integer;
  v_ownerless_companies integer;
begin
  select count(*) into v_vendor_count from public.vendor_profiles;
  select count(*) into v_company_count from public.companies;
  if v_company_count < v_vendor_count then
    raise exception 'Migration verification failed: % vendor_profiles vs % companies.', v_vendor_count, v_company_count;
  end if;

  select count(*) into v_null_company_projects
  from public.projects where company_id is null;
  if v_null_company_projects > 0 then
    raise exception 'Migration verification failed: % projects have NULL company_id.', v_null_company_projects;
  end if;

  select count(*) into v_mismatched_projects
  from public.projects p
  join public.companies c on c.id = p.company_id
  where p.vendor_id <> c.legacy_vendor_user_id;
  if v_mismatched_projects > 0 then
    raise exception 'Migration verification failed: % projects have mismatched vendor_id and company_id.', v_mismatched_projects;
  end if;

  select count(*) into v_ownerless_companies
  from public.companies c
  where c.status = 'active'
    and not exists (
      select 1 from public.company_members cm
      where cm.company_id = c.id and cm.role = 'company_owner' and cm.status = 'active'
    );
  if v_ownerless_companies > 0 then
    raise exception 'Migration verification failed: % active companies lack an active company_owner.', v_ownerless_companies;
  end if;
end $$;

commit;
