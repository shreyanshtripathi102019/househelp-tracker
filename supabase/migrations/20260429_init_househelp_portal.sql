create extension if not exists pgcrypto;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  linked_user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null,
  category text not null check (category in ('cook', 'cleaner', 'nanny', 'driver', 'other')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'worker')),
  worker_id uuid references public.workers(id) on delete set null,
  invited_name text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (household_id, user_id)
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('present', 'absent', 'leave')),
  note text,
  marked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (worker_id, attendance_date)
);

create index household_members_user_idx on public.household_members (user_id);
create index workers_household_idx on public.workers (household_id);
create index attendance_household_date_idx on public.attendance_records (household_id, attendance_date desc);
create index attendance_worker_date_idx on public.attendance_records (worker_id, attendance_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger attendance_records_set_updated_at
before update on public.attendance_records
for each row
execute function public.set_updated_at();

create or replace function public.has_household_access(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household
      and hm.user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_household(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household
      and hm.user_id = auth.uid()
      and hm.role in ('owner', 'admin')
  );
$$;

alter table public.households enable row level security;
alter table public.workers enable row level security;
alter table public.household_members enable row level security;
alter table public.attendance_records enable row level security;

create policy "members can view households"
on public.households
for select
to authenticated
using (public.has_household_access(id));

create policy "authenticated users can create households"
on public.households
for insert
to authenticated
with check (auth.uid() is not null);

create policy "managers can update households"
on public.households
for update
to authenticated
using (public.can_manage_household(id))
with check (public.can_manage_household(id));

create policy "members can view membership rows"
on public.household_members
for select
to authenticated
using (
  public.can_manage_household(household_id)
  or user_id = auth.uid()
);

create policy "owners can create their first membership row"
on public.household_members
for insert
to authenticated
with check (
  (user_id = auth.uid() and role = 'owner')
  or public.can_manage_household(household_id)
);

create policy "managers can update membership rows"
on public.household_members
for update
to authenticated
using (public.can_manage_household(household_id))
with check (public.can_manage_household(household_id));

create policy "managers can delete membership rows"
on public.household_members
for delete
to authenticated
using (public.can_manage_household(household_id));

create policy "members can view workers in scope"
on public.workers
for select
to authenticated
using (
  public.can_manage_household(household_id)
  or exists (
    select 1
    from public.household_members hm
    where hm.household_id = workers.household_id
      and hm.user_id = auth.uid()
      and hm.worker_id = workers.id
  )
);

create policy "managers can insert workers"
on public.workers
for insert
to authenticated
with check (public.can_manage_household(household_id));

create policy "managers can update workers"
on public.workers
for update
to authenticated
using (public.can_manage_household(household_id))
with check (public.can_manage_household(household_id));

create policy "managers can delete workers"
on public.workers
for delete
to authenticated
using (public.can_manage_household(household_id));

create policy "members can view attendance in scope"
on public.attendance_records
for select
to authenticated
using (
  public.can_manage_household(household_id)
  or exists (
    select 1
    from public.household_members hm
    where hm.household_id = attendance_records.household_id
      and hm.user_id = auth.uid()
      and hm.worker_id = attendance_records.worker_id
  )
);

create policy "managers can insert attendance"
on public.attendance_records
for insert
to authenticated
with check (public.can_manage_household(household_id));

create policy "managers can update attendance"
on public.attendance_records
for update
to authenticated
using (public.can_manage_household(household_id))
with check (public.can_manage_household(household_id));

create policy "managers can delete attendance"
on public.attendance_records
for delete
to authenticated
using (public.can_manage_household(household_id));
