create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  nm text;
  commander_provision boolean;
begin
  commander_provision := coalesce((new.raw_user_meta_data->>'provisioned_by_commander')::boolean,false);

  if commander_provision then
    return new;
  end if;

  nm := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1));

  insert into public.profiles(id,full_name,role,active,username)
  values(new.id,nm,'filho'::app_role,true,new.raw_user_meta_data->>'username')
  on conflict (id) do update
    set full_name=excluded.full_name,
        username=excluded.username,
        active=true;

  insert into public.children(profile_id,full_name,active)
  values(new.id,nm,true)
  on conflict (profile_id) do update
    set full_name=excluded.full_name,active=true;

  return new;
end
$function$;