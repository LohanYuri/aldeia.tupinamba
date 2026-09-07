import { withSupabase } from "npm:@supabase/server@^1";
type Body={action:"list"|"create"|"update"|"delete";id?:string;email?:string;password?:string;full_name?:string;username?:string;role?:"filho"|"adm"|"dirigente"|"financeiro";active?:boolean;child_id?:string|null};
export default {fetch:withSupabase({auth:"user"},async(req,ctx)=>{
 const callerId=ctx.userClaims?.sub;if(!callerId)return Response.json({error:"Não autenticado."},{status:401});
 const {data:caller}=await ctx.supabaseAdmin.from("profiles").select("role,active").eq("id",callerId).maybeSingle();
 if(caller?.role!=="financeiro"||!caller.active)return Response.json({error:"Acesso exclusivo do Comandante Financeiro."},{status:403});
 const body=(await req.json()) as Body;
 if(body.action==="list"){
  const [{data:profiles,error:pe},{data:auth,error:ae}]=await Promise.all([ctx.supabaseAdmin.from("profiles").select("id,full_name,username,role,active,created_at,updated_at").order("full_name"),ctx.supabaseAdmin.auth.admin.listUsers({page:1,perPage:1000})]);
  if(pe||ae)return Response.json({error:pe?.message||ae?.message},{status:500});
  return Response.json({users:(profiles||[]).map(p=>({...p,email:auth.users.find(u=>u.id===p.id)?.email||null,last_sign_in_at:auth.users.find(u=>u.id===p.id)?.last_sign_in_at||null}))});
 }
 if(body.action==="create"){
  if(body.role==="financeiro")return Response.json({error:"O nível Comandante Geral é exclusivo do acesso atual do Comandante."},{status:403});
  if(!body.email||!body.password||!body.full_name||!body.role)return Response.json({error:"Nome, e-mail, senha e perfil são obrigatórios."},{status:400});
  const {data:created,error:createError}=await ctx.supabaseAdmin.auth.admin.createUser({email:body.email.trim().toLowerCase(),password:body.password,email_confirm:true,user_metadata:{full_name:body.full_name}});
  if(createError||!created.user)return Response.json({error:createError?.message||"Falha ao criar usuário."},{status:400});
  const {error:profileError}=await ctx.supabaseAdmin.from("profiles").upsert({id:created.user.id,full_name:body.full_name.trim(),username:body.username?.trim()||null,role:body.role,active:body.active!==false});
  if(profileError){await ctx.supabaseAdmin.auth.admin.deleteUser(created.user.id);return Response.json({error:profileError.message},{status:400});}
  if(body.child_id){const {error:childError}=await ctx.supabaseAdmin.from("children").update({profile_id:created.user.id,updated_at:new Date().toISOString()}).eq("id",body.child_id);if(childError){await ctx.supabaseAdmin.from("profiles").delete().eq("id",created.user.id);await ctx.supabaseAdmin.auth.admin.deleteUser(created.user.id);return Response.json({error:childError.message},{status:400});}}
  await ctx.supabaseAdmin.from("audit_logs").insert({actor_id:callerId,action:"create_user",entity:"profiles",entity_id:created.user.id,details:{email:body.email,username:body.username,role:body.role,full_name:body.full_name,child_id:body.child_id||null}});
  return Response.json({ok:true,id:created.user.id});
 }
 if(!body.id)return Response.json({error:"ID do usuário obrigatório."},{status:400});
 if(body.action==="update"){
  if(body.role==="financeiro"&&body.id!==callerId)return Response.json({error:"Não é permitido criar outro Comandante Geral."},{status:403});
  if(body.id===callerId&&body.role&&body.role!=="financeiro")return Response.json({error:"O Comandante Geral não pode reduzir o próprio nível de acesso."},{status:400});
  const profilePatch:Record<string,unknown>={};if(body.full_name!==undefined)profilePatch.full_name=body.full_name.trim();if(body.username!==undefined)profilePatch.username=body.username?.trim()||null;if(body.role!==undefined)profilePatch.role=body.role;if(body.active!==undefined)profilePatch.active=body.active;
  const authPatch:Record<string,unknown>={};if(body.email!==undefined&&body.email)authPatch.email=body.email.trim().toLowerCase();if(body.password)authPatch.password=body.password;
  if(Object.keys(authPatch).length){const {error}=await ctx.supabaseAdmin.auth.admin.updateUserById(body.id,authPatch);if(error)return Response.json({error:error.message},{status:400});}
  if(Object.keys(profilePatch).length){const {error}=await ctx.supabaseAdmin.from("profiles").update(profilePatch).eq("id",body.id);if(error)return Response.json({error:error.message},{status:400});}
  if(body.child_id!==undefined){await ctx.supabaseAdmin.from("children").update({profile_id:null,updated_at:new Date().toISOString()}).eq("profile_id",body.id);if(body.child_id){const {error:childError}=await ctx.supabaseAdmin.from("children").update({profile_id:body.id,updated_at:new Date().toISOString()}).eq("id",body.child_id);if(childError)return Response.json({error:childError.message},{status:400});}}
  await ctx.supabaseAdmin.from("audit_logs").insert({actor_id:callerId,action:"update_user",entity:"profiles",entity_id:body.id,details:{...profilePatch,email_changed:Boolean(authPatch.email),password_changed:Boolean(authPatch.password)}});
  return Response.json({ok:true});
 }
 if(body.action==="delete"){
  if(body.id===callerId)return Response.json({error:"Não é permitido excluir o próprio acesso."},{status:400});
  const {data:target}=await ctx.supabaseAdmin.from("profiles").select("role").eq("id",body.id).maybeSingle();
  if(target?.role==="financeiro")return Response.json({error:"O acesso do Comandante Geral não pode ser excluído por esta operação."},{status:403});
  const {error}=await ctx.supabaseAdmin.auth.admin.deleteUser(body.id);if(error)return Response.json({error:error.message},{status:400});
  await ctx.supabaseAdmin.from("audit_logs").insert({actor_id:callerId,action:"delete_user",entity:"profiles",entity_id:body.id,details:{}});
  return Response.json({ok:true});
 }
 return Response.json({error:"Ação inválida."},{status:400});
})};