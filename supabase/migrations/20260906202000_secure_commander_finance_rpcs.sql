-- Aldeia Tupinambá — secure commander/finance RPCs
-- Purpose: harden privileged RPC endpoints and allow the Comandante Geral
-- (dirigente) to use the same administrative finance/scale operations.
-- Applied to the existing Supabase project before being versioned here.

create or replace function public.commander_dashboard_summary(p_month date default current_date)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  m date := date_trunc('month', coalesce(p_month,current_date))::date;
  result jsonb;
begin
  if not (public.has_financeiro() or public.has_role('dirigente'::app_role)) then
    raise exception 'Acesso restrito ao Comandante Geral/Financeiro';
  end if;

  select jsonb_build_object(
    'month',m,
    'active_children',(select count(*) from public.children where active=true),
    'inactive_children',(select count(*) from public.children where active=false),
    'active_adms',(select count(*) from public.profiles where active=true and role in ('adm','dirigente','financeiro')),
    'pending_dues_count',(select count(*) from public.child_dues cd join public.dues d on d.id=cd.due_id join public.children c on c.id=cd.child_id where c.active=true and cd.status<>'pago' and d.active=true and d.reference_month>=m and d.reference_month<(m+interval '1 month')::date),
    'pending_dues_amount',(select coalesce(sum(d.amount),0) from public.child_dues cd join public.dues d on d.id=cd.due_id join public.children c on c.id=cd.child_id where c.active=true and cd.status<>'pago' and d.active=true and d.reference_month>=m and d.reference_month<(m+interval '1 month')::date),
    'paid_dues_count',(select count(*) from public.child_dues cd join public.dues d on d.id=cd.due_id join public.children c on c.id=cd.child_id where c.active=true and cd.status='pago' and d.active=true and d.reference_month>=m and d.reference_month<(m+interval '1 month')::date),
    'upcoming_scales',(select count(*) from public.scales s where s.scale_date>=current_date and s.scale_date<(current_date+interval '31 days')::date and s.status<>'cancelada'),
    'next_scale',(select jsonb_build_object('date',s.scale_date,'time',s.start_time,'notes',s.notes) from public.scales s where s.scale_date>=current_date and s.status<>'cancelada' order by s.scale_date limit 1),
    'published_scales',(select count(*) from public.scales s where s.published_at is not null and s.scale_date>=current_date),
    'admin_notices_pending',(select count(*) from public.admin_notices n where n.published=true and n.mandatory=true and not exists(select 1 from public.admin_notice_acknowledgements a where a.notice_id=n.id and a.profile_id=auth.uid())),
    'budget_waiting',(select count(*) from public.finance_budget_items where status='orcamento'),
    'compliance_pending',(select count(*) from public.child_compliance where status='pendente')
  ) into result;
  return result;
end;
$function$;

create or replace function public.generate_monthly_finance_report(p_month date default current_date, p_actor uuid default auth.uid())
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  m date := date_trunc('month',coalesce(p_month,current_date))::date;
  r_id uuid;
  active_count int;
  due_count int;
  paid_count int;
  pending_count int;
  expected numeric;
  received numeric;
  pending numeric;
  v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'Autenticação obrigatória'; end if;
  if not (public.has_financeiro() or public.has_role('dirigente'::app_role)) then
    raise exception 'Acesso restrito ao Comandante Geral/Financeiro';
  end if;
  if p_actor is not null and p_actor <> v_actor then
    raise exception 'Ator inválido';
  end if;

  select count(*) into active_count from public.children where active=true;
  select count(d.id),coalesce(sum(d.amount),0) into due_count,expected
  from public.child_dues cd join public.dues d on d.id=cd.due_id join public.children c on c.id=cd.child_id
  where c.active=true and d.active=true and d.reference_month>=m and d.reference_month<(m+interval '1 month')::date;
  select count(d.id),coalesce(sum(d.amount),0) into paid_count,received
  from public.child_dues cd join public.dues d on d.id=cd.due_id join public.children c on c.id=cd.child_id
  where c.active=true and d.active=true and cd.status='pago' and d.reference_month>=m and d.reference_month<(m+interval '1 month')::date;
  pending_count:=greatest(due_count-paid_count,0);
  pending:=greatest(expected-received,0);

  insert into public.reports(report_date,period_start,period_end,title,summary,generated_by)
  values(current_date,m,(m+interval '1 month-1 day')::date,'Relatório Financeiro — '||to_char(m,'MM/YYYY'),
    format('Filhos ativos: %s | Cobranças: %s | Pagos: %s | Pendentes: %s | Previsto: R$ %s | Recebido: R$ %s | Pendente: R$ %s',
      active_count,due_count,paid_count,pending_count,to_char(expected,'FM999999990D00'),to_char(received,'FM999999990D00'),to_char(pending,'FM999999990D00')),v_actor)
  returning id into r_id;

  insert into public.report_items(report_id,section,source_type,content)
  values(r_id,'resumo','financeiro',jsonb_build_object('active_children',active_count,'due_count',due_count,'paid_count',paid_count,'pending_count',pending_count,'expected',expected,'received',received,'pending',pending));

  insert into public.report_items(report_id,section,child_id,source_type,content)
  select r_id,'situação por filho',c.id,'child_due',
    jsonb_build_object('name',c.full_name,'status',case when count(d.id)=0 then 'sem_cobranca' when count(*) filter(where cd.status='pago')=count(d.id) then 'pago' else 'pendente' end,
      'total',count(d.id),'paid',count(d.id) filter(where cd.status='pago'),'amount',coalesce(sum(d.amount),0),'paid_amount',coalesce(sum(d.amount) filter(where cd.status='pago'),0))
  from public.children c
  left join public.child_dues cd on cd.child_id=c.id
  left join public.dues d on d.id=cd.due_id and d.active=true and d.reference_month>=m and d.reference_month<(m+interval '1 month')::date
  where c.active=true group by c.id,c.full_name order by c.full_name;

  insert into public.audit_logs(actor_id,action,entity,entity_id,details)
  values(v_actor,'generate_monthly_finance_report','reports',r_id,jsonb_build_object('month',m));
  return r_id;
end;
$function$;

create or replace function public.generate_configured_scale(p_config_id uuid, p_actor uuid default auth.uid())
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  cfg record; d record; v_team_id uuid; sid uuid; active_child record;
  idx integer:=0; regular_count integer:=0; v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'Autenticação obrigatória'; end if;
  if not (public.has_financeiro() or public.has_role('dirigente'::app_role)) then
    raise exception 'Acesso restrito ao Comandante Geral/Financeiro';
  end if;
  if p_actor is not null and p_actor <> v_actor then
    raise exception 'Ator inválido';
  end if;

  select * into cfg from public.scale_configs where id=p_config_id;
  if not found then raise exception 'Configuração de escala não encontrada'; end if;

  insert into public.teams(name,description,active)
  values(cfg.title,'AUTO_SCALE',true)
  on conflict(name) do update set description='AUTO_SCALE',active=true returning id into v_team_id;

  select count(*) into regular_count from public.scale_config_dates where config_id=p_config_id and is_faxinao=false;

  for d in select * from public.scale_config_dates where config_id=p_config_id order by sort_order,scale_date loop
    insert into public.scales(scale_date,weekday,team_id,start_time,end_time,status,notes,created_by,scale_type)
    values(d.scale_date,
      case extract(isodow from d.scale_date) when 1 then 'Segunda-feira' when 2 then 'Terça-feira' when 3 then 'Quarta-feira' when 4 then 'Quinta-feira' when 5 then 'Sexta-feira' when 6 then 'Sábado' else 'Domingo' end,
      v_team_id,
      case when d.is_friday or d.is_faxinao then null else cfg.regular_time end,
      null,'planejada',
      case when d.is_faxinao then 'FAXINÃO — todos os filhos ativos' when d.is_friday then 'Sexta-feira — horário conforme ordens maiores' else d.label end,
      v_actor,'auto')
    on conflict(team_id,scale_date) do update set start_time=excluded.start_time,end_time=excluded.end_time,weekday=excluded.weekday,notes=excluded.notes,scale_type='auto'
    returning id into sid;

    delete from public.scale_assignments where scale_id=sid;
    if d.is_faxinao then
      insert into public.scale_assignments(scale_id,child_id,function_name)
      select sid,c.id,'FAXINÃO' from public.children c
      where c.active=true and not exists(select 1 from public.scale_substitutes ss where ss.active=true and lower(ss.name)=lower(c.full_name));
    end if;
  end loop;

  idx:=0;
  for active_child in select c.id from public.children c
  where c.active=true and not exists(select 1 from public.scale_substitutes ss where ss.active=true and lower(ss.name)=lower(c.full_name))
  order by c.full_name loop
    idx:=idx+1;
    select s.id into sid
    from public.scales s
    join public.scale_config_dates cd on cd.scale_date=s.scale_date and cd.config_id=p_config_id
    where s.team_id=v_team_id and cd.is_faxinao=false
    order by cd.sort_order,cd.scale_date
    offset ((idx-1)%greatest(regular_count,1)) limit 1;
    if sid is not null then
      insert into public.scale_assignments(scale_id,child_id,function_name)
      values(sid,active_child.id,'Equipe automática');
    end if;
  end loop;

  insert into public.audit_logs(actor_id,action,entity,details)
  values(v_actor,'generate_monthly_scale','scale_configs',jsonb_build_object('config_id',p_config_id));
end;
$function$;

revoke execute on function public.add_active_child_to_current_dues() from public, anon, authenticated;
revoke execute on function public.commander_dashboard_summary(date) from public, anon;
revoke execute on function public.generate_configured_scale(uuid, uuid) from public, anon;
revoke execute on function public.generate_monthly_finance_report(date, uuid) from public, anon;
