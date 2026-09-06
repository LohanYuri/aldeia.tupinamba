-- Aldeia Tupinambá — automatic accountability engine
-- Detects current financial, attendance and function pendencies and progresses
-- the existing disciplinary workflow without ever removing a child automatically.

create or replace function public.recalculate_child_accountability(p_child_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid:=auth.uid();
  v_financial int:=0; v_absences int:=0; v_functions int:=0; v_open int:=0;
  v_warnings int:=0; v_points int:=0; v_meeting boolean:=false;
  v_child text;
begin
  if v_actor is null then raise exception 'Autenticação obrigatória'; end if;
  if not (public.has_financeiro() or public.has_role('dirigente'::app_role)) then
    raise exception 'Acesso restrito ao Comandante Geral/Financeiro';
  end if;

  select full_name into v_child from public.children where id=p_child_id;
  if v_child is null then raise exception 'Filho não encontrado'; end if;

  select count(*) into v_financial from public.child_dues cd join public.dues d on d.id=cd.due_id where cd.child_id=p_child_id and cd.status<>'pago' and d.active=true;
  select count(*) into v_absences from public.scale_assignments sa join public.scales s on s.id=sa.scale_id where sa.child_id=p_child_id and sa.present=false and s.scale_date<=current_date and s.status<>'cancelada';
  select count(*) into v_functions from public.scale_assignments sa join public.scales s on s.id=sa.scale_id where sa.child_id=p_child_id and coalesce(sa.notes,'') ilike '%função não cumprida%' and s.scale_date<=current_date and s.status<>'cancelada';
  select count(*) into v_open from public.child_compliance where child_id=p_child_id and status='pendente';
  select count(*) into v_warnings from public.disciplinary_actions where child_id=p_child_id and action_type='advertencia';
  select coalesce(sum(points),0) into v_points from public.child_compliance where child_id=p_child_id and status<>'cancelado';

  insert into public.child_compliance(child_id,category,description,status,points,warning_eligible,justified,created_by)
  select p_child_id,'financeiro','Pendência financeira detectada automaticamente','pendente',1,true,false,v_actor
  where v_financial>0 and not exists(select 1 from public.child_compliance where child_id=p_child_id and category='financeiro' and description='Pendência financeira detectada automaticamente' and status='pendente');

  insert into public.child_compliance(child_id,category,description,status,points,warning_eligible,justified,created_by)
  select p_child_id,'presenca','Falta sem justificativa detectada na escala','pendente',1,true,false,v_actor
  where v_absences>0 and not exists(select 1 from public.child_compliance where child_id=p_child_id and category='presenca' and description='Falta sem justificativa detectada na escala' and status='pendente');

  insert into public.child_compliance(child_id,category,description,status,points,warning_eligible,justified,created_by)
  select p_child_id,'funcao','Função não cumprida detectada na escala','pendente',1,true,false,v_actor
  where v_functions>0 and not exists(select 1 from public.child_compliance where child_id=p_child_id and category='funcao' and description='Função não cumprida detectada na escala' and status='pendente');

  select count(*) into v_open from public.child_compliance where child_id=p_child_id and status='pendente';
  select coalesce(sum(points),0) into v_points from public.child_compliance where child_id=p_child_id and status<>'cancelado';
  select count(*) into v_warnings from public.disciplinary_actions where child_id=p_child_id and action_type='advertencia';

  insert into public.disciplinary_actions(child_id,action_type,warning_number,points,notes,decided_by)
  select p_child_id,'advertencia',least(v_warnings+1,3),v_points,'Advertência gerada pelo acompanhamento automático. A autoridade deve registrar eventual decisão posterior.',v_actor
  where v_open>0 and v_points>=3 and v_warnings<3
    and not exists(select 1 from public.disciplinary_actions where child_id=p_child_id and action_type='advertencia' and created_at>=date_trunc('month',current_date));

  select count(*) into v_warnings from public.disciplinary_actions where child_id=p_child_id and action_type='advertencia';
  select exists(select 1 from public.disciplinary_actions where child_id=p_child_id and action_type='conversa_autoridade') into v_meeting;

  if v_warnings>=3 and not v_meeting then
    insert into public.disciplinary_actions(child_id,action_type,warning_number,points,notes,decided_by)
    values(p_child_id,'conversa_autoridade',null,v_points,'3 advertências atingidas. Conversa particular com Pai/Mãe de Santo necessária. Nenhuma saída é automática.',v_actor);
  end if;

  return jsonb_build_object('child_id',p_child_id,'child_name',v_child,'financial_pending',v_financial,'unexcused_absences',v_absences,'function_failures',v_functions,'open_compliance',v_open,'warnings',v_warnings,'points',v_points,'authority_meeting_required',v_warnings>=3);
end;
$function$;

revoke execute on function public.recalculate_child_accountability(uuid) from public, anon;
grant execute on function public.recalculate_child_accountability(uuid) to authenticated;
