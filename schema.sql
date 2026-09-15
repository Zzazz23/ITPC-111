-- ============================================================
-- Laboratory Asset and Service Management System
-- Lab 4 - Role-Based Asset Transaction and Approval Management
-- Run this whole file in the Supabase SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABLES
-- ------------------------------------------------------------

-- Extends Supabase auth.users with a role
create table if not exists profiles (
  id uuid references auth.users(id) primary key,
  full_name text not null,
  role text not null default 'requester' check (role in ('admin','staff','requester')),
  created_at timestamptz default now()
);

create table if not exists equipment (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  status text not null default 'Available' check (status in ('Available','Borrowed','Maintenance','Damaged')),
  created_at timestamptz default now()
);

create table if not exists borrowing_requests (
  id bigint generated always as identity primary key,
  requester_id uuid references profiles(id) not null,
  equipment_id bigint references equipment(id) not null,
  status text not null default 'Pending' check (status in ('Pending','Approved','Rejected','Released','Returned','Overdue','Closed')),
  remarks text,
  approved_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id),
  action text not null,
  module text not null,
  record_id text,
  description text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 2. HELPER FUNCTION - current logged-in user's role
-- ------------------------------------------------------------
create or replace function current_role_name()
returns text
language sql
security definer
as $$
  select role from profiles where id = auth.uid();
$$;

-- ------------------------------------------------------------
-- 3. BUSINESS-RULE TRIGGERS (database-level enforcement)
-- ------------------------------------------------------------

-- BR-A4-01 / BR-A4-09: only Available equipment may be requested
-- (Maintenance / Borrowed / Damaged equipment is rejected here)
create or replace function validate_borrowing_insert()
returns trigger as $$
declare
  equip_status text;
begin
  select status into equip_status from equipment where id = new.equipment_id;
  if equip_status is null then
    raise exception 'Equipment not found';
  end if;
  if equip_status <> 'Available' then
    raise exception 'Only available equipment may be requested';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_validate_borrowing_insert on borrowing_requests;
create trigger trg_validate_borrowing_insert
before insert on borrowing_requests
for each row execute function validate_borrowing_insert();

-- BR-A4-02, BR-A4-03, BR-A4-04, BR-A4-05, BR-A4-06, BR-A4-07, BR-A4-08
create or replace function validate_borrowing_transition()
returns trigger as $$
declare
  actor_role text := current_role_name();
begin
  -- BR-A4-03: only Administrator may approve or reject
  if new.status in ('Approved','Rejected') and old.status = 'Pending' then
    if actor_role <> 'admin' then
      raise exception 'Only Administrator may approve or reject requests';
    end if;
    -- BR-A4-02: staff/admin cannot approve their own request
    if new.status = 'Approved' and old.requester_id = auth.uid() then
      raise exception 'Cannot approve your own request';
    end if;
    new.approved_by := auth.uid();
  end if;

  -- BR-A4-04 / BR-A4-07: only an Approved request may be Released
  -- (a Rejected request can never reach this branch, so it is blocked)
  if new.status = 'Released' then
    if old.status <> 'Approved' then
      raise exception 'Only an Approved request may be released';
    end if;
    if actor_role not in ('admin','staff') then
      raise exception 'Only Staff or Administrator may release equipment';
    end if;
    -- BR-A4-05: released equipment becomes Borrowed
    update equipment set status = 'Borrowed' where id = new.equipment_id;
  end if;

  -- BR-A4-08: a Returned transaction cannot be processed twice
  if new.status = 'Returned' then
    if old.status <> 'Released' then
      raise exception 'Only a Released transaction can be returned';
    end if;
    -- BR-A4-06: returned equipment becomes Available unless marked damaged
    if new.remarks ilike '%damaged%' then
      update equipment set status = 'Damaged' where id = new.equipment_id;
    else
      update equipment set status = 'Available' where id = new.equipment_id;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_validate_borrowing_transition on borrowing_requests;
create trigger trg_validate_borrowing_transition
before update on borrowing_requests
for each row execute function validate_borrowing_transition();

-- ------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (database-level authorization)
-- ------------------------------------------------------------
alter table profiles enable row level security;
alter table equipment enable row level security;
alter table borrowing_requests enable row level security;
alter table audit_logs enable row level security;

-- PROFILES
create policy "view_own_or_admin_profile" on profiles
  for select using (auth.uid() = id or current_role_name() = 'admin');

create policy "insert_own_profile" on profiles
  for insert with check (auth.uid() = id);

create policy "admin_update_profile" on profiles
  for update using (current_role_name() = 'admin');

-- EQUIPMENT
create policy "any_authenticated_view_equipment" on equipment
  for select using (auth.role() = 'authenticated');

create policy "staff_admin_insert_equipment" on equipment
  for insert with check (current_role_name() in ('admin','staff'));

create policy "staff_admin_update_equipment" on equipment
  for update using (current_role_name() in ('admin','staff'));

create policy "admin_delete_equipment" on equipment
  for delete using (current_role_name() = 'admin');

-- BORROWING REQUESTS
create policy "view_own_or_staff_admin_requests" on borrowing_requests
  for select using (
    requester_id = auth.uid() or current_role_name() in ('admin','staff')
  );

create policy "requester_insert_own_request" on borrowing_requests
  for insert with check (requester_id = auth.uid());

create policy "staff_admin_update_request" on borrowing_requests
  for update using (current_role_name() in ('admin','staff'));

-- AUDIT LOGS (BR-A4-10)
create policy "admin_view_audit_logs" on audit_logs
  for select using (current_role_name() = 'admin');

create policy "authenticated_insert_audit_logs" on audit_logs
  for insert with check (auth.role() = 'authenticated');
