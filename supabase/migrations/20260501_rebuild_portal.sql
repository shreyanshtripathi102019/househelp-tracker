-- Rebuild migration: drops the v1 schema and rebuilds for the
-- owner + PIN-based staff model with multi-household assignments.

-- Drop old objects (safe if they don't exist)
drop policy if exists "members can view households" on public.households;
drop policy if exists "authenticated users can create households" on public.households;
drop policy if exists "managers can update households" on public.households;
drop policy if exists "members can view membership rows" on public.household_members;
drop policy if exists "owners can create their first membership row" on public.household_members;
drop policy if exists "managers can update membership rows" on public.household_members;
drop policy if exists "managers can delete membership rows" on public.household_members;
drop policy if exists "members can view workers in scope" on public.workers;
drop policy if exists "managers can insert workers" on public.workers;
drop policy if exists "managers can update workers" on public.workers;
drop policy if exists "managers can delete workers" on public.workers;
drop policy if exists "members can view attendance in scope" on public.attendance_records;
drop policy if exists "managers can insert attendance" on public.attendance_records;
drop policy if exists "managers can update attendance" on public.attendance_records;
drop policy if exists "managers can delete attendance" on public.attendance_records;

drop trigger if exists attendance_records_set_updated_at on public.attendance_records;
drop function if exists public.has_household_access(uuid) cascade;
drop function if exists public.can_manage_household(uuid) cascade;
drop function if exists public.set_updated_at() cascade;

drop table if exists public.attendance_records cascade;
drop table if exists public.household_members cascade;
drop table if exists public.workers cascade;
drop table if exists public.households cascade;

-- Fresh start
create extension if not exists pgcrypto;

-- Owner-led household
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- A real human who works as househelp. Lives outside any one household.
-- auth_user_id points to a synthetic Supabase auth user (email is
-- "<staff_code>@staff.arit.local", password is the PIN). This lets staff
-- log in with the same Supabase session machinery as owners do.
create table public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null references auth.users(id) on delete cascade,
  staff_code text not null unique,
  full_name text not null,
  phone text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- The "gig": one row per (person, household, role).
-- This is what attendance and leaves attach to.
create table public.staff_assignments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  staff_profile_id uuid not null references public.staff_profiles(id) on delete cascade,
  role text not null check (role in ('cook', 'cleaner', 'nanny', 'driver', 'other')),
  monthly_salary numeric(10, 2),
  start_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (household_id, staff_profile_id)
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.staff_assignments(id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('present', 'absent', 'leave', 'half_day')),
  note text,
  marked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, attendance_date)
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.staff_assignments(id) on delete cascade,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  reason text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

-- Helpers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger attendance_records_set_updated_at
before update on public.attendance_records
for each row execute function public.set_updated_at();

create or replace function public.is_household_owner(target_household uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.households h
    where h.id = target_household and h.owner_user_id = auth.uid()
  );
$$;

create or replace function public.has_assignment(target_assignment uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.staff_assignments sa
    join public.staff_profiles sp on sp.id = sa.staff_profile_id
    where sa.id = target_assignment
      and sp.auth_user_id = auth.uid()
  );
$$;

-- RLS
alter table public.households enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.staff_assignments enable row level security;
alter table public.attendance_records enable row level security;
alter table public.leave_requests enable row level security;

-- households
create policy "owner reads own household"
on public.households for select to authenticated
using (owner_user_id = auth.uid());

create policy "staff reads assigned household"
on public.households for select to authenticated
using (
  exists (
    select 1
    from public.staff_assignments sa
    join public.staff_profiles sp on sp.id = sa.staff_profile_id
    where sa.household_id = households.id
      and sp.auth_user_id = auth.uid()
      and sa.is_active
  )
);

create policy "user creates own household"
on public.households for insert to authenticated
with check (owner_user_id = auth.uid());

create policy "owner updates own household"
on public.households for update to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

-- staff_profiles
create policy "staff reads own profile"
on public.staff_profiles for select to authenticated
using (auth_user_id = auth.uid());

create policy "owner reads staff in own household"
on public.staff_profiles for select to authenticated
using (
  exists (
    select 1
    from public.staff_assignments sa
    join public.households h on h.id = sa.household_id
    where sa.staff_profile_id = staff_profiles.id
      and h.owner_user_id = auth.uid()
  )
);

create policy "owner reads staff they created"
on public.staff_profiles for select to authenticated
using (created_by = auth.uid());

create policy "owner updates staff they created"
on public.staff_profiles for update to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- staff_assignments
create policy "owner reads own assignments"
on public.staff_assignments for select to authenticated
using (public.is_household_owner(household_id));

create policy "staff reads own assignments"
on public.staff_assignments for select to authenticated
using (
  exists (
    select 1 from public.staff_profiles sp
    where sp.id = staff_assignments.staff_profile_id
      and sp.auth_user_id = auth.uid()
  )
);

create policy "owner inserts assignments"
on public.staff_assignments for insert to authenticated
with check (public.is_household_owner(household_id));

create policy "owner updates assignments"
on public.staff_assignments for update to authenticated
using (public.is_household_owner(household_id))
with check (public.is_household_owner(household_id));

create policy "owner deletes assignments"
on public.staff_assignments for delete to authenticated
using (public.is_household_owner(household_id));

-- attendance_records
create policy "owner reads attendance in own household"
on public.attendance_records for select to authenticated
using (
  exists (
    select 1 from public.staff_assignments sa
    where sa.id = attendance_records.assignment_id
      and public.is_household_owner(sa.household_id)
  )
);

create policy "staff reads own attendance"
on public.attendance_records for select to authenticated
using (public.has_assignment(assignment_id));

create policy "owner inserts attendance"
on public.attendance_records for insert to authenticated
with check (
  exists (
    select 1 from public.staff_assignments sa
    where sa.id = attendance_records.assignment_id
      and public.is_household_owner(sa.household_id)
  )
);

create policy "staff inserts own attendance"
on public.attendance_records for insert to authenticated
with check (public.has_assignment(assignment_id));

create policy "owner updates attendance"
on public.attendance_records for update to authenticated
using (
  exists (
    select 1 from public.staff_assignments sa
    where sa.id = attendance_records.assignment_id
      and public.is_household_owner(sa.household_id)
  )
)
with check (
  exists (
    select 1 from public.staff_assignments sa
    where sa.id = attendance_records.assignment_id
      and public.is_household_owner(sa.household_id)
  )
);

create policy "staff updates own attendance"
on public.attendance_records for update to authenticated
using (public.has_assignment(assignment_id))
with check (public.has_assignment(assignment_id));

create policy "owner deletes attendance"
on public.attendance_records for delete to authenticated
using (
  exists (
    select 1 from public.staff_assignments sa
    where sa.id = attendance_records.assignment_id
      and public.is_household_owner(sa.household_id)
  )
);

-- leave_requests
create policy "staff reads own leaves"
on public.leave_requests for select to authenticated
using (public.has_assignment(assignment_id));

create policy "owner reads household leaves"
on public.leave_requests for select to authenticated
using (
  exists (
    select 1 from public.staff_assignments sa
    where sa.id = leave_requests.assignment_id
      and public.is_household_owner(sa.household_id)
  )
);

create policy "staff creates own leave"
on public.leave_requests for insert to authenticated
with check (public.has_assignment(assignment_id) and status = 'pending');

create policy "staff cancels own pending leave"
on public.leave_requests for update to authenticated
using (public.has_assignment(assignment_id) and status = 'pending')
with check (public.has_assignment(assignment_id) and status in ('pending', 'cancelled'));

create policy "owner decides on leave"
on public.leave_requests for update to authenticated
using (
  exists (
    select 1 from public.staff_assignments sa
    where sa.id = leave_requests.assignment_id
      and public.is_household_owner(sa.household_id)
  )
)
with check (
  exists (
    select 1 from public.staff_assignments sa
    where sa.id = leave_requests.assignment_id
      and public.is_household_owner(sa.household_id)
  )
);

-- indexes
create index households_owner_idx on public.households(owner_user_id);
create index staff_profiles_auth_idx on public.staff_profiles(auth_user_id);
create index staff_profiles_code_idx on public.staff_profiles(staff_code);
create index assignments_household_idx on public.staff_assignments(household_id);
create index assignments_staff_idx on public.staff_assignments(staff_profile_id);
create index attendance_assignment_date_idx on public.attendance_records(assignment_id, attendance_date desc);
create index leaves_assignment_idx on public.leave_requests(assignment_id);
create index leaves_status_idx on public.leave_requests(status);
