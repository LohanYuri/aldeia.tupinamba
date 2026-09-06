-- Exceptions on child dues and house donations
alter table public.child_dues add column if not exists exempted boolean not null default false;
alter table public.child_dues add column if not exists exemption_reason text;
alter table public.child_dues add column if not exists confirmed_by uuid references public.profiles(id);
alter table public.child_dues add column if not exists confirmed_at timestamptz;
create table if not exists public.donations(
 id uuid primary key default gen_random_uuid(), donor_name text not null,
 amount numeric(12,2) not null check(amount>0), donation_date date not null default current_date,
 payment_method text, reference text,
 status text not null default 'recebida' check(status in ('recebida','pendente','cancelada')),
 notes text, created_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
alter table public.donations enable row level security;
drop policy if exists donations_admin on public.donations;
create policy donations_admin on public.donations for all to authenticated
using(public.has_financeiro() or public.has_role('dirigente'::app_role))
with check(public.has_financeiro() or public.has_role('dirigente'::app_role));
