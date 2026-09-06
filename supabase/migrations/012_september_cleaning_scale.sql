create table if not exists public.scale_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  sort_order smallint not null default 0,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.scale_notices enable row level security;
revoke all on table public.scale_notices from anon;
grant select, insert, update, delete on table public.scale_notices to authenticated;

drop policy if exists "ADM can read scale notices" on public.scale_notices;
create policy "ADM can read scale notices" on public.scale_notices
for select to authenticated using ((select public.has_role('adm'::public.app_role)) or (select public.has_role('dirigente'::public.app_role)));

drop policy if exists "ADM can insert scale notices" on public.scale_notices;
create policy "ADM can insert scale notices" on public.scale_notices
for insert to authenticated with check ((select public.has_role('adm'::public.app_role)) or (select public.has_role('dirigente'::public.app_role)));

drop policy if exists "ADM can update scale notices" on public.scale_notices;
create policy "ADM can update scale notices" on public.scale_notices
for update to authenticated
using ((select public.has_role('adm'::public.app_role)) or (select public.has_role('dirigente'::public.app_role)))
with check ((select public.has_role('adm'::public.app_role)) or (select public.has_role('dirigente'::public.app_role)));

drop policy if exists "ADM can delete scale notices" on public.scale_notices;
create policy "ADM can delete scale notices" on public.scale_notices
for delete to authenticated using ((select public.has_role('adm'::public.app_role)) or (select public.has_role('dirigente'::public.app_role)));

insert into public.children (full_name, active)
select v.name, true
from (values
 ('Cris'),('Gabriel'),('Luana Escobar'),('Stheffany'),('Marlon'),('Luanny'),('Yuri'),
 ('Luana Talia'),('Silvana'),('Rainara'),('Karine'),('Joyce'),('Jadir'),('João Pedro'),
 ('Willian'),('Mariluce'),('Nadja'),('Gilberto')
) as v(name)
where not exists (select 1 from public.children c where lower(c.full_name)=lower(v.name));

insert into public.teams (name, description, active)
values ('Escala de limpeza — Setembro 2026',
'Escala oficial de limpeza da Aldeia Tupinambá. Responsáveis fixos: Cris, Gabriel e Luana Escobar.',
true)
on conflict (name) do update set description=excluded.description, active=true;

do $$
declare
  v_team_id uuid;
  v_scale_id uuid;
  v_child_id uuid;
  v_names text[];
  v_name text;
begin
  select id into v_team_id from public.teams where name='Escala de limpeza — Setembro 2026';

  insert into public.scales(scale_date,weekday,team_id,start_time,end_time,status,notes)
  values
  ('2026-09-04','Quinta-feira',v_team_id,'19:00',null,'planejada','Responsáveis fixos: Cris, Gabriel e Luana Escobar. Médiums: Stheffany, Marlon, Luanny e Yuri.'),
  ('2026-09-11','Quinta-feira',v_team_id,'19:00',null,'planejada','Responsáveis fixos: Cris, Gabriel e Luana Escobar. Médiums: Luana Talia, Silvana e Rainara.'),
  ('2026-09-18','Quinta-feira',v_team_id,'19:00',null,'planejada','Responsáveis fixos: Cris, Gabriel e Luana Escobar. Médiums: Karine, Joyce, Jadir e João Pedro.'),
  ('2026-09-20','Domingo',v_team_id,'08:00',null,'planejada','Todos os filhos da casa — FAXINÃO GERAL.'),
  ('2026-09-25','Sexta-feira',v_team_id,'19:00',null,'planejada','Todos os filhos da casa — DIA DE FESTA.')
  on conflict do nothing;

  v_names := array['Cris','Gabriel','Luana Escobar','Stheffany','Marlon','Luanny','Yuri'];
  select s.id into v_scale_id from public.scales s where s.scale_date='2026-09-04' and s.team_id=v_team_id;
  foreach v_name in array v_names loop
    select c.id into v_child_id from public.children c where lower(c.full_name)=lower(v_name) limit 1;
    if v_child_id is not null and not exists(select 1 from public.scale_assignments sa where sa.scale_id=v_scale_id and sa.child_id=v_child_id) then
      insert into public.scale_assignments(scale_id,child_id,function_name,notes)
      values(v_scale_id,v_child_id,case when v_name in ('Cris','Gabriel','Luana Escobar') then 'Responsável pela vistoria e acompanhamento' else 'Limpeza da semana' end,null);
    end if;
  end loop;

  v_names := array['Cris','Gabriel','Luana Escobar','Luana Talia','Silvana','Rainara'];
  select s.id into v_scale_id from public.scales s where s.scale_date='2026-09-11' and s.team_id=v_team_id;
  foreach v_name in array v_names loop
    select c.id into v_child_id from public.children c where lower(c.full_name)=lower(v_name) limit 1;
    if v_child_id is not null and not exists(select 1 from public.scale_assignments sa where sa.scale_id=v_scale_id and sa.child_id=v_child_id) then
      insert into public.scale_assignments(scale_id,child_id,function_name,notes)
      values(v_scale_id,v_child_id,case when v_name in ('Cris','Gabriel','Luana Escobar') then 'Responsável pela vistoria e acompanhamento' else 'Limpeza da semana' end,null);
    end if;
  end loop;

  v_names := array['Cris','Gabriel','Luana Escobar','Karine','Joyce','Jadir','João Pedro'];
  select s.id into v_scale_id from public.scales s where s.scale_date='2026-09-18' and s.team_id=v_team_id;
  foreach v_name in array v_names loop
    select c.id into v_child_id from public.children c where lower(c.full_name)=lower(v_name) limit 1;
    if v_child_id is not null and not exists(select 1 from public.scale_assignments sa where sa.scale_id=v_scale_id and sa.child_id=v_child_id) then
      insert into public.scale_assignments(scale_id,child_id,function_name,notes)
      values(v_scale_id,v_child_id,case when v_name in ('Cris','Gabriel','Luana Escobar') then 'Responsável pela vistoria e acompanhamento' else 'Limpeza da semana' end,null);
    end if;
  end loop;

  select s.id into v_scale_id from public.scales s where s.scale_date='2026-09-20' and s.team_id=v_team_id;
  for v_child_id in select c.id from public.children c where c.active=true loop
    if not exists(select 1 from public.scale_assignments sa where sa.scale_id=v_scale_id and sa.child_id=v_child_id) then
      insert into public.scale_assignments(scale_id,child_id,function_name,notes)
      values(v_scale_id,v_child_id,'Faxinão geral','Todos os filhos da casa');
    end if;
  end loop;

  select s.id into v_scale_id from public.scales s where s.scale_date='2026-09-25' and s.team_id=v_team_id;
  for v_child_id in select c.id from public.children c where c.active=true loop
    if not exists(select 1 from public.scale_assignments sa where sa.scale_id=v_scale_id and sa.child_id=v_child_id) then
      insert into public.scale_assignments(scale_id,child_id,function_name,notes)
      values(v_scale_id,v_child_id,'Dia de festa','Todos os filhos da casa');
    end if;
  end loop;
end $$;

insert into public.scale_notices(title,body,sort_order,active)
select v.title,v.body,v.sort_order,true
from (values
 ('⭐ INFORMAÇÕES MUITO IMPORTANTES!','Incluam a cachoeira na limpeza.',1),
 ('🧹 DETALHES IMPORTANTES','Tirem as poeiras das imagens. Tirem as teias de aranha de todos os cantos.',2),
 ('🛖 A CHOUPANA','A choupana deve ser limpa também.',3),
 ('⚠️ VISTORIA E LIBERAÇÃO','Todos serão vistoriados depois que terminarem a limpeza. Só serão liberados depois da vistoria.',4),
 ('📢 COMUNICADOS IMPORTANTES','Se houver alguma mudança, os responsáveis serão comunicados com antecedência. Olhem o grupo de WhatsApp; qualquer comunicado deverá ser feito nele.',5),
 ('📋 ACOMPANHAMENTO ADMINISTRATIVO','A administração realizará o acompanhamento da participação dos filhos durante o mês.',6),
 ('🌿 RESPONSABILIDADE DA SEMANA','Os escalados da semana deverão trazer ervas para os cantos e banhos.',7)
) as v(title,body,sort_order)
where not exists (select 1 from public.scale_notices n where n.title=v.title);
