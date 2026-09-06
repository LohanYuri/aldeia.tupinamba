-- Portal analytics and donation/payment integration foundation
create table if not exists public.portal_visits(
 id uuid primary key default gen_random_uuid(), visited_at timestamptz not null default now(),
 session_id text, page text, referrer text, device_type text, created_at timestamptz not null default now()
);
alter table public.portal_visits enable row level security;
create policy portal_visits_public_insert on public.portal_visits for insert to anon,authenticated with check (true);
create policy portal_visits_admin_select on public.portal_visits for select to authenticated using(public.has_financeiro() or public.has_role('dirigente'::app_role));
create index if not exists portal_visits_visited_at_idx on public.portal_visits(visited_at);

create table if not exists public.donation_campaigns(
 id uuid primary key default gen_random_uuid(), name text not null, description text,
 goal_amount numeric(12,2) not null default 0, active boolean not null default true,
 public_visible boolean not null default true, created_at timestamptz not null default now()
);
alter table public.donation_campaigns enable row level security;
create policy donation_campaigns_public_select on public.donation_campaigns for select to anon,authenticated using(public_visible=true and active=true);
create policy donation_campaigns_admin_all on public.donation_campaigns for all to authenticated using(public.has_financeiro() or public.has_role('dirigente'::app_role)) with check(public.has_financeiro() or public.has_role('dirigente'::app_role));

alter table public.donations add column if not exists campaign_id uuid references public.donation_campaigns(id);
alter table public.donations add column if not exists whatsapp_phone text;
alter table public.donations add column if not exists pix_txid text;
alter table public.donations add column if not exists proof_path text;
alter table public.donations add column if not exists auto_identified boolean not null default false;
create unique index if not exists donations_pix_txid_uq on public.donations(pix_txid) where pix_txid is not null;

create table if not exists public.payment_integrations(
 id uuid primary key default gen_random_uuid(), provider text not null check(provider in ('whatsapp_cloud','nubank_pix')),
 status text not null default 'not_configured' check(status in ('not_configured','configured','error','disabled')),
 last_event_at timestamptz, last_error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.payment_integrations enable row level security;
create policy payment_integrations_admin on public.payment_integrations for all to authenticated using(public.has_financeiro() or public.has_role('dirigente'::app_role)) with check(public.has_financeiro() or public.has_role('dirigente'::app_role));
insert into public.payment_integrations(provider,status) values ('whatsapp_cloud','not_configured'),('nubank_pix','not_configured') on conflict do nothing;