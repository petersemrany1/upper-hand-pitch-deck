
-- Trading hours (admin-managed base weekly schedule)
create table public.clinic_trading_hours (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.partner_clinics(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Mon, 6=Sun
  open_time time not null default '09:00',
  close_time time not null default '17:00',
  is_closed boolean not null default false,
  consult_duration_mins int not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(clinic_id, day_of_week)
);

alter table public.clinic_trading_hours enable row level security;

create policy "admin manages trading hours" on public.clinic_trading_hours
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "clinic reads own trading hours" on public.clinic_trading_hours
  for select to authenticated
  using (public.is_clinic_user_for(clinic_id));

create policy "rep reads trading hours" on public.clinic_trading_hours
  for select to authenticated
  using (exists (select 1 from public.sales_reps where id = auth.uid()));

-- Blocked slots (clinic-managed, with recurring support)
create table public.clinic_blocked_slots (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.partner_clinics(id) on delete cascade,
  slot_date date,
  slot_start time not null,
  slot_end time not null,
  is_recurring boolean not null default false,
  recur_day_of_week int check (recur_day_of_week between 0 and 6),
  created_at timestamptz not null default now()
);

alter table public.clinic_blocked_slots enable row level security;

create policy "admin full blocked slots" on public.clinic_blocked_slots
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "clinic manages own blocked slots" on public.clinic_blocked_slots
  for all to authenticated
  using (public.is_clinic_user_for(clinic_id))
  with check (public.is_clinic_user_for(clinic_id));

create policy "rep reads blocked slots" on public.clinic_blocked_slots
  for select to authenticated
  using (exists (select 1 from public.sales_reps where id = auth.uid()));

create index idx_blocked_slots_clinic_date on public.clinic_blocked_slots(clinic_id, slot_date);
create index idx_blocked_slots_clinic_recur on public.clinic_blocked_slots(clinic_id, is_recurring, recur_day_of_week);
