alter table public.child_compliance
  add column if not exists points integer not null default 1,
  add column if not exists warning_eligible boolean not null default true,
  add column if not exists justified boolean not null default false;

create table if not exists public.disciplinary_actions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete restrict,
  compliance_id uuid references public.child_compliance(id) on delete set null,
  action_type text not null check (action_type in ('advertencia','conversa_autoridade','encaminhamento_saida','regularizacao')),
  warning_number smallint,
  points integer not null default 0 check (points >= 0),
  notes text,
  decided_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.disciplinary_actions enable row level security;

drop policy if exists "disciplinary_financeiro_all" on public.disciplinary_actions;
create policy "disciplinary_financeiro_all"
on public.disciplinary_actions
for all to authenticated
using (public.has_role('financeiro'::public.app_role))
with check (public.has_role('financeiro'::public.app_role));

drop policy if exists "compliance_financeiro_all" on public.child_compliance;
create policy "compliance_financeiro_all"
on public.child_compliance
for all to authenticated
using (public.has_role('financeiro'::public.app_role))
with check (public.has_role('financeiro'::public.app_role));

create or replace view public.child_accountability_summary
with (security_invoker = true)
as
select
  c.id as child_id, c.full_name, c.active,
  coalesce(cd.pending_financial,0)::integer as pending_financial,
  coalesce(sa.unexcused_absences,0)::integer as unexcused_absences,
  coalesce(ce.cleaning_pending,0)::integer as cleaning_pending,
  coalesce(cc.open_occurrences,0)::integer as open_occurrences,
  coalesce(da.warnings,0)::integer as warnings,
  coalesce(da.authority_meetings,0)::integer as authority_meetings,
  (coalesce(cd.pending_financial,0)+coalesce(sa.unexcused_absences,0)+coalesce(ce.cleaning_pending,0)+coalesce(cc.open_occurrences,0))::integer as points
from public.children c
left join (select child_id,count(*) filter (where status <> 'pago') pending_financial from public.child_dues group by child_id) cd on cd.child_id=c.id
left join (select child_id,count(*) filter (where present=false) unexcused_absences from public.scale_assignments group by child_id) sa on sa.child_id=c.id
left join (select child_id,count(*) filter (where coalesce(completed,false)=false) cleaning_pending from public.cleaning_evaluations group by child_id) ce on ce.child_id=c.id
left join (select child_id,count(*) filter (where status not in ('resolvida','justificada')) open_occurrences from public.child_compliance group by child_id) cc on cc.child_id=c.id
left join (select child_id,count(*) filter (where action_type='advertencia') warnings,count(*) filter (where action_type='conversa_autoridade') authority_meetings from public.disciplinary_actions group by child_id) da on da.child_id=c.id;

grant select on public.child_accountability_summary to authenticated;

create index if not exists disciplinary_actions_child_id_idx on public.disciplinary_actions(child_id);
create index if not exists disciplinary_actions_created_at_idx on public.disciplinary_actions(created_at desc);
