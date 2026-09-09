import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json",...cors}});
const hash=async(v:string)=>{const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,"0")).join("")};
const randomPin=()=>String(Math.floor(1000+Math.random()*9000));
const slug=(s:string)=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"").slice(0,24)||"acesso";
async function commander(sb:any,req:Request){
 const auth=req.headers.get("Authorization")||""; if(!auth.startsWith("Bearer ")) return null;
 const token=auth.slice(7); const {data:{user}}=await sb.auth.getUser(token); if(!user)return null;
 const {data:p}=await sb.from("profiles").select("id,role,active").eq("id",user.id).maybeSingle();
 return p?.role==="financeiro"&&p.active?user:null;
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const url=Deno.env.get("SUPABASE_URL")!,key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,sb=createClient(url,key);
  const body=await req.json(); const action=body.action;
  if(action==="request_reset"){
   const username=String(body.username||"").trim(), role=String(body.expected_role||"filho");
   if(!username||!["filho","adm","dirigente"].includes(role))return json({error:"Informe o usuário e o tipo de acesso."},400);
   const {data:p}=await sb.from("profiles").select("id,full_name,username,role,active").eq("username",username).maybeSingle();
   const {data:pending}=await sb.from("access_reset_requests").select("id").eq("requested_username",username).eq("status","pending").limit(1);
   if(!pending?.length) await sb.from("access_reset_requests").insert({requested_username:username,expected_role:role,target_profile_id:p?.role===role?p.id:null});
   return json({ok:true,message:"Solicitação enviada ao Comandante. Aguarde a autorização para receber um novo acesso."});
  }
  const actor=await commander(sb,req);
  if(action==="list_reset_requests"){
   if(!actor)return json({error:"Acesso exclusivo do Comandante Geral."},403);
   const {data,error}=await sb.from("access_reset_requests").select("id,requested_username,expected_role,target_profile_id,requested_at,status,profiles:target_profile_id(full_name,username,role)").eq("status","pending").order("requested_at",{ascending:false});
   if(error)return json({error:error.message},500); return json({ok:true,requests:data||[]});
  }
  if(action==="accept_reset"){
   if(!actor)return json({error:"Acesso exclusivo do Comandante Geral."},403);
   const {data:r,error:re}=await sb.from("access_reset_requests").select("*").eq("id",body.request_id).eq("status","pending").maybeSingle();
   if(re||!r)return json({error:"Essa solicitação já foi resolvida ou não existe."},404);
   let targetId=r.target_profile_id||body.target_profile_id||null;
   if(!targetId)return json({error:"Selecione o filho/ADM que solicitou a redefinição."},400);
   const {data:p}=await sb.from("profiles").select("id,full_name,role,active,username").eq("id",targetId).maybeSingle();
   if(!p||p.role!==r.expected_role)return json({error:"O acesso escolhido não corresponde ao tipo solicitado."},400);
   const base=slug(p.full_name||r.requested_username.replace(/@/g,""))+"@";
   let username=base; let n=2;
   while(true){const {data:exists}=await sb.from("profiles").select("id").eq("username",username).maybeSingle();if(!exists||exists.id===p.id)break;username=base.replace(/@$/,"")+"-"+n+"@";n++;}
   const pin=randomPin();
   const {error:up}=await sb.from("profiles").update({username,access_pin_hash:await hash(pin),active:true,updated_at:new Date().toISOString()}).eq("id",p.id);
   if(up)return json({error:"Não foi possível gerar o novo acesso: "+up.message},400);
   await sb.from("access_reset_requests").update({status:"accepted",resolved_at:new Date().toISOString(),resolved_by:actor.id,resolved_username:username}).eq("id",r.id);
   await sb.from("audit_logs").insert({actor_id:actor.id,action:"accept_access_reset",entity:"profiles",entity_id:p.id,details:{old_username:p.username,new_username:username,request_id:r.id,role:p.role}});
   return json({ok:true,full_name:p.full_name,username,access_pin:pin});
  }
  if(action==="cancel_reset"){
   if(!actor)return json({error:"Acesso exclusivo do Comandante Geral."},403);
   const {error}=await sb.from("access_reset_requests").update({status:"cancelled",resolved_at:new Date().toISOString(),resolved_by:actor.id}).eq("id",body.request_id).eq("status","pending");
   if(error)return json({error:error.message},400); return json({ok:true});
  }
  if(action==="login"){
   const {username,pin,expected_role}=body;
   if(!username||!/^[0-9]{4}$/.test(String(pin))||!["filho","adm","dirigente"].includes(expected_role))return json({error:"Informe usuário, código de 4 dígitos e tipo de acesso."},400);
   const {data:p,error}=await sb.from("profiles").select("id,full_name,username,role,active,access_pin_hash").eq("username",String(username).trim()).maybeSingle();
   if(error||!p||!p.active||p.role!==expected_role)return json({error:"Usuário ou código de acesso incorretos."},401);
   if((await hash(String(pin)))!==p.access_pin_hash)return json({error:"Usuário ou código de acesso incorretos."},401);
   const {data:u,error:ue}=await sb.auth.admin.getUserById(p.id);if(ue||!u.user||!u.user.email)return json({error:"Acesso não configurado corretamente. Procure o Comandante."},500);
   const {data:link,error:le}=await sb.auth.admin.generateLink({type:"magiclink",email:u.user.email});if(le||!link?.properties?.hashed_token)return json({error:"Não foi possível abrir a sessão. Tente novamente."},500);
   return json({ok:true,token_hash:link.properties.hashed_token,profile:p});
  }
  return json({error:"Ação inválida."},400);
 }catch(e){return json({error:e instanceof Error?e.message:"Erro interno."},500)}
});