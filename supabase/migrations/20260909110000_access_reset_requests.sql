create table if not exists public.access_reset_requests (
  id uuid primary key default gen_random_uuid(),
  requested_username text not null,
  expected_role app_role not null default 'filho',
  target_profile_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','accepted','cancelled')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_username text,
  new_access_pin text
);

create index if not exists access_reset_requests_status_idx
  on public.access_reset_requests(status, requested_at desc);

alter table public.access_reset_requests enable row level security;