-- Aldeia Tupinambá — Supabase database foundation
-- Execute this migration in Supabase SQL Editor after confirming the project.
-- IMPORTANT: never put a service_role key in the website.

create extension if not exists pgcrypto;

create type public.app_role as enum ('filho','adm','dirigente');
create type public.acceptance_kind as enum ('regras','imagem','cotas','participacao','procedimentos','hierarquia');
create type public.scale_status as enum ('planejada','realizada','cancelada');
create type public.dues_kind as enum ('mensalidade','cosme_damiao','cacique','outra');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'filho',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rule_versions (
  id uuid primary key default gen_random_uuid(),
  version text unique not null,
  title text not null,
  body text not null,
  published_at timestamptz not null default now(),
  active boolean not null default true
);

create table public.acceptances (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete restrict,
  kind public.acceptance_kind not null,
  rule_version_id uuid references public.rule_versions(id) on delete restrict,
  accepted boolean not null,
  accepted_at timestamptz not null default now(),
  ip_hash text,
  user_agent text
);

create index acceptances_child_idx on public.acceptances(child_id, accepted_at desc);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  active boolean not null default true
);

create table public.scales (
  id uuid primary key default gen_random_uuid(),
  scale_date date not null,
  weekday text not null,
  team_id uuid references public.teams(id) on delete set null,
  start_time time,
  end_time time,
  status public.scale_status not null default 'planejada',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.scale_assignments (
  id uuid primary key default gen_random_uuid(),
  scale_id uuid not null references public.scales(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete restrict,
  function_name text,
  present boolean,
  notes text,
  unique(scale_id, child_id)
);

create table public.cleaning_evaluations (
  id uuid primary key default gen_random_uuid(),
  scale_id uuid references public.scales(id) on delete set null,
  child_id uuid not null references public.children(id) on delete restrict,
  evaluated_by uuid references public.profiles(id) on delete set null,
  score smallint check (score between 0 and 10),
  completed boolean,
  notes text,
  created_at timestamptz not null default now()
);

create table public.friday_evaluations (
  id uuid primary key default gen_random_uuid(),
  gira_date date not null,
  child_id uuid not null references public.children(id) on delete restrict,
  evaluated_by uuid references public.profiles(id) on delete set null,
  attendance smallint check (attendance between 0 and 10),
  participation smallint check (participation between 0 and 10),
  conduct smallint check (conduct between 0 and 10),
  cleaning smallint check (cleaning between 0 and 10),
  overall smallint check (overall between 0 and 10),
  notes text,
  created_at timestamptz not null default now(),
  unique(gira_date, child_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  start_time time,
  description text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.event_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  task_name text not null,
  assigned_child_id uuid references public.children(id) on delete set null,
  notes text
);

create table public.dues (
  id uuid primary key default gen_random_uuid(),
  kind public.dues_kind not null,
  title text not null,
  amount numeric(12,2) not null check (amount >= 0),
  due_day smallint check (due_day between 1 and 31),
  reference_month date,
  description text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.child_dues (
  id uuid primary key default gen_random_uuid(),
  due_id uuid not null references public.dues(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete restrict,
  status text not null default 'pendente' check (status in ('pendente','pago','dispensado')),
  paid_at timestamptz,
  payment_note text,
  unique(due_id, child_id)
);

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'filhos' check (audience in ('filhos','adm','todos')),
  published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null default current_date,
  period_start date,
  period_end date,
  title text not null,
  summary text,
  generated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.report_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  section text not null,
  child_id uuid references public.children(id) on delete set null,
  source_type text,
  source_id uuid,
  content jsonb not null default '{}'::jsonb
);

-- Public portal configuration. Keep only non-sensitive public data here.
create table public.public_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.public_settings(key,value) values
('whatsapp','556799342405'),
('pix_key','04118932113'),
('private_hours','Segunda a quinta-feira, das 08:00 às 21:00, somente com horário marcado.'),
('friday_hours','Toda sexta-feira, a partir das 19:30, trabalho aberto ao público.')
on conflict (key) do update set value=excluded.value, updated_at=now();

-- Helper used by RLS policies.
create or replace function public.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and active = true
      and (role = required_role or role = 'dirigente')
  );
$$;

-- RLS: default deny, then grant only the minimum required access.
alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.rule_versions enable row level security;
alter table public.acceptances enable row level security;
alter table public.teams enable row level security;
alter table public.scales enable row level security;
alter table public.scale_assignments enable row level security;
alter table public.cleaning_evaluations enable row level security;
alter table public.friday_evaluations enable row level security;
alter table public.events enable row level security;
alter table public.event_tasks enable row level security;
alter table public.dues enable row level security;
alter table public.child_dues enable row level security;
alter table public.notices enable row level security;
alter table public.reports enable row level security;
alter table public.report_items enable row level security;
alter table public.public_settings enable row level security;

-- ADM/Dirigente full access to internal tables.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','children','acceptances','teams','scales','scale_assignments',
    'cleaning_evaluations','friday_evaluations','events','event_tasks',
    'dues','child_dues','notices','reports','report_items','rule_versions'
  ] loop
    execute format('create policy "adm_full_%s" on public.%I for all using (public.has_role(''adm'')) with check (public.has_role(''adm''));', t, t);
  end loop;
end $$;

-- Dirigentes are treated as ADM by has_role('adm').
-- A child can read only their own profile/records and submit their own acceptance.
create policy "child_own_profile" on public.profiles
for select using (id = auth.uid());

create policy "child_own_record" on public.children
for select using (profile_id = auth.uid());

create policy "child_read_active_rules" on public.rule_versions
for select using (active = true);

create policy "child_create_own_acceptance" on public.acceptances
for insert with check (
  exists (select 1 from public.children c where c.id = child_id and c.profile_id = auth.uid())
);

create policy "child_read_own_acceptance" on public.acceptances
for select using (
  exists (select 1 from public.children c where c.id = child_id and c.profile_id = auth.uid())
);

create policy "child_read_scales" on public.scales
for select using (auth.uid() is not null);

create policy "child_read_scale_assignments" on public.scale_assignments
for select using (
  exists (
    select 1 from public.children c
    where c.id = child_id and c.profile_id = auth.uid()
  )
);

create policy "child_read_own_dues" on public.child_dues
for select using (
  exists (
    select 1 from public.children c
    where c.id = child_id and c.profile_id = auth.uid()
  )
);

create policy "child_read_dues" on public.dues
for select using (auth.uid() is not null and active = true);

create policy "child_read_notices" on public.notices
for select using (auth.uid() is not null and published = true and audience in ('filhos','todos'));

-- Public settings are readable without login, but never writable from the browser.
create policy "public_settings_read" on public.public_settings
for select using (true);

-- Never expose internal evaluations/reports to children.
-- No INSERT/UPDATE/DELETE policies are created for children on those tables.

-- Updated timestamp helper.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger children_updated_at before update on public.children
for each row execute function public.set_updated_at();

-- Seed the current rules as a versioned document. Edit the text in ADM before publishing
-- if the house wants a different legal/administrative wording.
insert into public.rule_versions(version,title,body)
values (
  '2026-09-06-v1',
  'Regras e compromissos da Aldeia Tupinambá',
  'Regras da casa, compromissos dos filhos, escalas, cotas, participação, hierarquia, procedimentos de chegada e proibição de gravações conforme a versão aprovada pela administração.'
)
on conflict (version) do nothing;
