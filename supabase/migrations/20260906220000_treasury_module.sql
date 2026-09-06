-- Treasury module: categories, cashbook entries and monthly closings
create table if not exists public.treasury_categories(
 id uuid primary key default gen_random_uuid(), name text not null unique,
 kind text not null check(kind in ('entrada','saida','ambos')), active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.treasury_entries(
 id uuid primary key default gen_random_uuid(), entry_date date not null default current_date,
 kind text not null check(kind in ('entrada','saida')), category_id uuid references public.treasury_categories(id),
 description text not null, amount numeric(12,2) not null check(amount>0), payment_method text,
 reference text, notes text, created_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table if not exists public.treasury_closings(
 id uuid primary key default gen_random_uuid(), reference_month date not null unique,
 opening_balance numeric(12,2) not null default 0, total_in numeric(12,2) not null default 0,
 total_out numeric(12,2) not null default 0, closing_balance numeric(12,2) not null default 0,
 closed_at timestamptz not null default now(), closed_by uuid references public.profiles(id),
 reopened_at timestamptz, reopened_by uuid references public.profiles(id), notes text
);
insert into public.treasury_categories(name,kind) values
('Cotas / mensalidades','entrada'),('Doações','entrada'),('Eventos','entrada'),('PIX / contribuições','entrada'),
('Alimentação','saida'),('Materiais','saida'),('Decoração','saida'),('Manutenção','saida'),('Contas da casa','saida'),('Transporte','saida'),('Outras despesas','saida')
on conflict(name) do nothing;
alter table public.treasury_categories enable row level security;
alter table public.treasury_entries enable row level security;
alter table public.treasury_closings enable row level security;
drop policy if exists treasury_categories_admin on public.treasury_categories;
create policy treasury_categories_admin on public.treasury_categories for all to authenticated using(public.has_financeiro() or public.has_role('dirigente'::app_role)) with check(public.has_financeiro() or public.has_role('dirigente'::app_role));
drop policy if exists treasury_entries_admin on public.treasury_entries;
create policy treasury_entries_admin on public.treasury_entries for all to authenticated using(public.has_financeiro() or public.has_role('dirigente'::app_role)) with check(public.has_financeiro() or public.has_role('dirigente'::app_role));
drop policy if exists treasury_closings_admin on public.treasury_closings;
create policy treasury_closings_admin on public.treasury_closings for all to authenticated using(public.has_financeiro() or public.has_role('dirigente'::app_role)) with check(public.has_financeiro() or public.has_role('dirigente'::app_role));
