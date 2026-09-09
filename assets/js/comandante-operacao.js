/* OPERACAO DO COMANDANTE — contas fixas, escalas, ausencias, acessos e advertencias */
(function(){
'use strict';
if(!/comandante\.html$/i.test(location.pathname)) return;
const sb=window.ALDEIA_SUPABASE;
if(!sb) return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const brl=v=>'R$ '+Number(v||0).toFixed(2).replace('.',',');
const dateBR=v=>v?new Date(v+'T12:00:00').toLocaleDateString('pt-BR'): '—';
const view=()=>document.getElementById('view');
const actor=async()=>{try{return (await sb.auth.getUser()).data?.user?.id||null}catch(e){return null}};
const audit=async(action,entity,id,details)=>{try{await sb.from('audit_logs').insert({actor_id:await actor(),action,entity,entity_id:id||null,details:details||{}})}catch(e){}};

const CATS=['Luz','Charuto','Vela','Fumo','Mantimentos','Bebidas','Cigarros','Itens de limpeza','Água','Gás','Manutenção','Outro'];

async function fixedAccounts(){
 const r=await sb.from('house_fixed_accounts').select('*').eq('active',true).order('due_day',{ascending:true});
 if(r.error){alert(r.error.message);return}
 const rows=r.data||[], total=rows.reduce((s,x)=>s+Number(x.expected_amount||0),0);
 view().innerHTML='<div class="command-dashboard-head"><div><span class="eyebrow">CASA</span><h2>🏠 Contas fixas e mantimentos do Terreiro</h2><p class="lead">Tudo que a casa precisa manter: luz, velas, charutos, fumo, mantimentos, bebidas, cigarros, limpeza e outros itens cadastrados.</p></div><div class="row-actions"><button class="btn gold" onclick="novaContaFixa()">➕ Cadastrar conta/item</button><button class="btn secondary" onclick="window.compras&&window.compras()">🛒 Orçamentos</button></div></div>'+
 '<div class="command-grid">'+['📌 '+rows.length+' itens cadastrados','💰 '+brl(total)+' previstos','⏳ '+rows.filter(x=>x.status==='pendente').length+' pendentes','📦 '+rows.filter(x=>x.status==='comprado').length+' comprados'].map(x=>'<article class="command-card"><h3>'+x+'</h3></article>').join('')+'</div>'+
 '<div class="command-card"><h3>📋 Controle mensal da casa</h3><p class="mini muted">Status: pendente, pago, comprado ou em falta. O Comandante pode editar, apagar e prestar conta nas reuniões.</p><div class="command-table-wrap"><table class="command-table"><thead><tr><th>Conta / item</th><th>Categoria</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Última compra/pagamento</th><th>Ações</th></tr></thead><tbody>'+
 (rows.length?rows.map(x=>'<tr><td><b>'+esc(x.name)+'</b><br><span class="mini">'+esc(x.notes||'')+'</span></td><td>'+esc(x.category)+'</td><td>'+brl(x.expected_amount)+'</td><td>Dia '+(x.due_day||'—')+'</td><td><span class="pill">'+esc(x.status)+'</span></td><td>'+dateBR(x.last_paid_at)+'</td><td><button class="btn secondary small" onclick="editarContaFixa(\''+x.id+'\')">✏️ Editar</button> <button class="btn outline small" onclick="statusContaFixa(\''+x.id+'\')">🔄 Status</button> <button class="btn danger small" onclick="apagarContaFixa(\''+x.id+'\')">🗑️</button></td></tr>').join(''):'<tr><td colspan="7">Nenhuma conta/item cadastrado.</td></tr>')+
 '</tbody></table></div></div><div class="notice-box">🧾 <b>Prestação de contas:</b> estas contas entram no controle do Terreiro e podem ser apresentadas nas reuniões junto com entradas, saídas, orçamentos e saldo das caixinhas.</div>';
}
function contaForm(x){
 view().innerHTML='<div class="command-dashboard-head"><div><span class="eyebrow">CONTAS FIXAS</span><h2>🏠 '+(x.id?'Editar':'Cadastrar')+' conta/item</h2></div><button class="btn secondary" onclick="contasFixas()">← Voltar</button></div><form id="fixedForm" class="command-form"><label>Nome da conta/item<input name="name" required value="'+esc(x.name||'')+'" placeholder="Ex.: Conta de luz"></label><label>Categoria<select name="category">'+CATS.map(c=>'<option '+(x.category===c?'selected':'')+'>'+esc(c)+'</option>').join('')+'</select></label><label>Valor previsto<input name="expected_amount" type="number" min="0" step="0.01" value="'+Number(x.expected_amount||0)+'"></label><label>Dia do vencimento/compra<input name="due_day" type="number" min="1" max="31" value="'+(x.due_day||'')+'"></label><label>Status<select name="status"><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="comprado">Comprado</option><option value="em_falta">Em falta</option></select></label><label>Última compra/pagamento<input name="last_paid_at" type="date" value="'+esc(x.last_paid_at||'')+'"></label><label class="full">Observações<textarea name="notes" rows="4">'+esc(x.notes||'')+'</textarea></label><div class="full"><button class="btn gold">💾 Salvar</button> <button type="button" class="btn secondary" onclick="contasFixas()">Cancelar</button></div></form>';
 document.querySelector('#fixedForm [name=status]').value=x.status||'pendente';
 document.getElementById('fixedForm').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const p={name:d.name.trim(),category:d.category,expected_amount:Number(d.expected_amount||0),due_day:d.due_day?Number(d.due_day):null,status:d.status,last_paid_at:d.last_paid_at||null,notes:d.notes||null,updated_at:new Date().toISOString()};const q=x.id?await sb.from('house_fixed_accounts').update(p).eq('id',x.id):await sb.from('house_fixed_accounts').insert({...p,created_by:await actor()});if(q.error){alert(q.error.message);return}await audit(x.id?'update_fixed_account':'create_fixed_account','house_fixed_accounts',x.id||null,p);contasFixas()};
}
async function statusContaFixa(id){const s=prompt('Digite o status: pendente, pago, comprado ou em_falta');if(!s||!['pendente','pago','comprado','em_falta'].includes(s))return;const q=await sb.from('house_fixed_accounts').update({status:s,updated_at:new Date().toISOString(),last_paid_at:(s==='pago'||s==='comprado')?new Date().toISOString().slice(0,10):null}).eq('id',id);if(q.error)alert(q.error.message);else contasFixas()}
async function apagarContaFixa(id){if(!confirm('Apagar esta conta/item?'))return;const q=await sb.from('house_fixed_accounts').delete().eq('id',id);if(q.error)alert(q.error.message);else contasFixas()}
window.contasFixas=fixedAccounts;window.novaContaFixa=()=>contaForm({});window.editarContaFixa=async id=>{const r=await sb.from('house_fixed_accounts').select('*').eq('id',id).single();if(r.data)contaForm(r.data)};window.statusContaFixa=statusContaFixa;window.apagarContaFixa=apagarContaFixa;

async function escalasOperacao(){
 const [sr,cr,ar,lr]=await Promise.all([sb.from('scales').select('id,scale_date,weekday,start_time,end_time,status,notes,team_id').order('scale_date',{ascending:false}).limit(100),sb.from('children').select('id,full_name,active').order('full_name'),sb.from('scale_assignments').select('id,scale_id,child_id,function_name,present,notes'),sb.from('scale_team_locks').select('*').eq('active',true)]);
 if(sr.error){alert(sr.error.message);return}
 const scales=sr.data||[], children=cr.data||[], assigns=ar.data||[], locks=lr.data||[];
 view().innerHTML='<div class="command-dashboard-head"><div><span class="eyebrow">ESCALAS</span><h2>📅 Controle, remanejamento e sorteio</h2><p class="lead">O Comandante pode retirar um filho com justificativa, remanejar para outra escala e fixar equipes produtivas.</p></div><div class="row-actions"><button class="btn gold" onclick="alinharNovaEscala()">🎲 Alinhar nova escala</button><button class="btn secondary" onclick="remanejarFilho()">🔁 Remanejar filho</button><button class="btn secondary" onclick="fixarEquipe()">📌 Fixar equipe</button></div></div>'+
 '<div class="command-card"><h3>📋 Check-list das escalas</h3><p class="mini muted">As escalas realizadas ficam marcadas para o ADM confirmar o que foi cumprido.</p><div class="command-table-wrap"><table class="command-table"><thead><tr><th>Data</th><th>Horário</th><th>Equipe/filhos</th><th>Status</th><th>Confirmação</th></tr></thead><tbody>'+
 scales.map(s=>{const as=assigns.filter(a=>a.scale_id===s.id),names=as.map(a=>children.find(c=>c.id===a.child_id)?.full_name).filter(Boolean).join(', ');return '<tr><td><b>'+dateBR(s.scale_date)+'</b></td><td>'+(s.start_time||'').slice(0,5)+(s.end_time?' — '+s.end_time.slice(0,5):'')+'</td><td>'+esc(names||'Sem filhos')+'</td><td>'+esc(s.status)+'</td><td><label><input type="checkbox" '+(s.status==='realizada'?'checked':'')+' onchange="confirmarEscala(\''+s.id+'\',this.checked)"> realizada</label></td></tr>'}).join('')+
 '</tbody></table></div></div>'+
 '<div class="command-card"><h3>📌 Equipes fixadas</h3><div class="command-table-wrap"><table class="command-table"><thead><tr><th>Equipe</th><th>Até</th><th>Regra</th></tr></thead><tbody>'+locks.map(l=>'<tr><td>'+esc(l.team_id)+'</td><td>'+dateBR(l.fixed_until)+'</td><td>🔒 '+(l.fixed_until?'Até a data informada':'Até segunda ordem')+'</td></tr>').join('')+'</tbody></table></div></div>'+
 '<div class="command-card"><h3>🚨 Remover filho de uma escala</h3><p class="mini muted">Registre a justificativa. A ausência justificada não deve ser tratada como advertência.</p><button class="btn gold" onclick="registrarAusencia()">➖ Registrar ausência/justificativa</button></div>';
}
window.escalasOperacao=escalasOperacao;
window.confirmarEscala=async(id,checked)=>{const q=await sb.from('scales').update({status:checked?'realizada':'planejada'}).eq('id',id);if(q.error)alert(q.error.message);else escalasOperacao()};

async function registrarAusencia(){
 const [cr,sr]=await Promise.all([sb.from('children').select('id,full_name,active').eq('active',true).order('full_name'),sb.from('scales').select('id,scale_date,start_time,end_time').gte('scale_date',new Date().toISOString().slice(0,10)).order('scale_date')]);
 const cs=cr.data||[], ss=sr.data||[];
 view().innerHTML='<h2>🚨 Registrar ausência/justificativa</h2><form id="absf" class="command-form"><label>Filho<select name="child_id" required>'+cs.map(c=>'<option value="'+c.id+'">'+esc(c.full_name)+'</option>').join('')+'</select></label><label>Escala<select name="scale_id" required>'+ss.map(s=>'<option value="'+s.id+'">'+dateBR(s.scale_date)+' • '+esc((s.start_time||'').slice(0,5))+'</option>').join('')+'</select></label><label>Justificativa aceita pela ADM<textarea name="reason" required rows="4" placeholder="Ex.: doença, motivo familiar, emergência..."></textarea></label><div><label><input type="checkbox" name="accepted" checked> Justificativa considerada válida pela ADM</label></div><div><button class="btn gold">💾 Registrar</button> <button type="button" class="btn secondary" onclick="escalasOperacao()">Cancelar</button></div></form>';
 document.getElementById('absf').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target)),q=await sb.from('scale_assignments').update({present:false,notes:'Ausência: '+d.reason+(d.accepted?' • Justificada pela ADM':' • Não validada pela ADM')}).eq('scale_id',d.scale_id).eq('child_id',d.child_id);if(q.error){alert(q.error.message);return}await audit('record_scale_absence','scale_assignments',null,d);escalasOperacao()};
}
window.registrarAusencia=registrarAusencia;

async function remanejarFilho(){
 const [cr,sr,ar]=await Promise.all([sb.from('children').select('id,full_name,active').eq('active',true).order('full_name'),sb.from('scales').select('id,scale_date,start_time').gte('scale_date',new Date().toISOString().slice(0,10)).order('scale_date'),sb.from('scale_assignments').select('scale_id,child_id')]);
 const cs=cr.data||[],ss=sr.data||[],as=ar.data||[];
 view().innerHTML='<h2>🔁 Remanejar filho</h2><p class="lead">Escolha o filho e a nova escala. A escala original é preservada como histórico.</p><form id="remf" class="command-form"><label>Filho<select name="child_id">'+cs.map(c=>'<option value="'+c.id+'">'+esc(c.full_name)+'</option>').join('')+'</select></label><label>Escala atual<select name="old_scale_id">'+ss.map(s=>'<option value="'+s.id+'">'+dateBR(s.scale_date)+' • '+(s.start_time||'').slice(0,5)+'</option>').join('')+'</select></label><label>Nova escala<select name="new_scale_id">'+ss.map(s=>'<option value="'+s.id+'">'+dateBR(s.scale_date)+' • '+(s.start_time||'').slice(0,5)+'</option>').join('')+'</select></label><label>Motivo<textarea name="reason" rows="3"></textarea></label><div><button class="btn gold">🔁 Remanejar</button> <button type="button" class="btn secondary" onclick="escalasOperacao()">Cancelar</button></div></form>';
 document.getElementById('remf').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));if(d.old_scale_id===d.new_scale_id){alert('A nova escala precisa ser diferente da escala atual.');return}const old=await sb.from('scale_assignments').update({present:false,notes:'Remanejado pelo Comandante: '+(d.reason||'')}).eq('scale_id',d.old_scale_id).eq('child_id',d.child_id);if(old.error){alert(old.error.message);return}const exists=as.some(a=>a.scale_id===d.new_scale_id&&a.child_id===d.child_id);const n=exists?{data:null,error:null}:await sb.from('scale_assignments').insert({scale_id:d.new_scale_id,child_id:d.child_id,present:null,notes:'Remanejado da escala '+d.old_scale_id}).select().single();if(n.error){alert(n.error.message);return}await audit('remanejar_filho','scale_assignments',n.data?.id||null,d);escalasOperacao()};
}
window.remanejarFilho=remanejarFilho;

async function fixarEquipe(){
 const [tr,cr]=await Promise.all([sb.from('teams').select('id,name,description,active').eq('active',true).order('name'),sb.from('scale_configs').select('id,title,month_start').order('month_start',{ascending:false}).limit(10)]);
 const teams=tr.data||[],configs=cr.data||[];
 view().innerHTML='<h2>📌 Fixar equipe produtiva</h2><p class="lead">Quando ativada, a equipe fica fixa até segunda ordem ou até a data escolhida. O escalador deve respeitar essa decisão.</p><form id="lockf" class="command-form"><label>Equipe<select name="team_id">'+teams.map(t=>'<option value="'+t.id+'">'+esc(t.name)+'</option>').join('')+'</select></label><label>Configuração da escala<select name="config_id">'+configs.map(c=>'<option value="'+c.id+'">'+esc(c.title)+' • '+dateBR(c.month_start)+'</option>').join('')+'</select></label><label><input type="checkbox" name="indefinite" checked> 🔒 Fixar até segunda ordem</label><label>Fixar até<input name="fixed_until" type="date"></label><div><button class="btn gold">📌 Ativar fixação</button> <button type="button" class="btn secondary" onclick="escalasOperacao()">Cancelar</button></div></form>';
 document.getElementById('lockf').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target)),ind=document.querySelector('[name=indefinite]').checked;if(!ind&&!d.fixed_until){alert('Informe a data final ou marque até segunda ordem.');return}const q=await sb.from('scale_team_locks').upsert({config_id:d.config_id,team_id:d.team_id,active:true,fixed_until:ind?null:d.fixed_until,fixed_by:await actor(),updated_at:new Date().toISOString()},{onConflict:'config_id'});if(q.error)alert(q.error.message);else {await audit('fixar_equipe','scale_team_locks',null,d);escalasOperacao()}};
}
window.fixarEquipe=fixarEquipe;

async function alinharNovaEscala(){
 const [cr,tr,rr]=await Promise.all([sb.from('children').select('id,full_name,active').eq('active',true).order('full_name'),sb.from('teams').select('id,name').eq('active',true),sb.from('scale_configs').select('*').order('month_start',{ascending:false}).limit(1)]);
 const cs=cr.data||[],teams=tr.data||[],cfg=rr.data?.[0];
 if(!cs.length||!cfg){alert('Não há filhos ativos ou configuração de escala disponível.');return}
 const base=new Date();base.setDate(base.getDate()+((8-base.getDay())%7||7));const iso=base.toISOString().slice(0,10),team=teams[Math.floor(Math.random()*teams.length)];
 const q=await sb.from('scales').insert({scale_date:iso,weekday:base.toLocaleDateString('pt-BR',{weekday:'long'}),team_id:team?.id||null,start_time:cfg.regular_time||'19:00',status:'planejada',notes:'Escala alinhada pelo Comandante; sorteio automático.' ,created_by:await actor()}).select().single();
 if(q.error){alert(q.error.message);return}
 const shuffled=[...cs].sort(()=>Math.random()-.5).slice(0,Math.min(Number(cfg.members_per_team||6),cs.length));
 const ins=await sb.from('scale_assignments').insert(shuffled.map(c=>({scale_id:q.data.id,child_id:c.id,present:null})));
 if(ins.error){alert(ins.error.message);return}
 await audit('alinhar_nova_escala','scales',q.data.id,{scale_date:iso,team:team?.name,children:shuffled.map(c=>c.full_name)});
 alert('Nova escala criada para '+dateBR(iso)+' às '+String(cfg.regular_time||'19:00').slice(0,5)+'. Equipe sorteada pelo sistema.');
 escalasOperacao();
}
window.alinharNovaEscala=alinharNovaEscala;

async function visitasHoje(){
 const start=new Date(); start.setHours(0,0,0,0); const iso=start.toISOString();
 const [vr,cr,ar,nr]=await Promise.all([sb.from('portal_access_events').select('*').gte('event_at',iso).order('event_at',{ascending:false}),sb.from('children').select('id,full_name,house_role,active,profile_id').order('full_name'),sb.from('admin_notices').select('id,title,created_at').eq('published',true).order('created_at',{ascending:false}).limit(30),sb.from('admin_notice_acknowledgements').select('notice_id,profile_id,acknowledged_at')]);
 if(vr.error){alert(vr.error.message);return} const visits=vr.data||[], children=cr.data||[], notices=nr.data||[], acks=ar.data||[];
 const counts={}; visits.forEach(v=>{const k=v.child_id||v.profile_id||v.username||'desconhecido';counts[k]=(counts[k]||0)+1});
 view().innerHTML='<div class="command-dashboard-head"><div><span class="eyebrow">MONITORAMENTO</span><h2>👁️ Visitas de hoje</h2><p class="lead">Acompanhe quem entrou, quantas vezes acessou e se os recados obrigatórios foram vistos/aceitos.</p></div><button class="btn secondary" onclick="membrosOperacao()">← Voltar</button></div><div class="command-grid"><article class="command-card"><h3>👥 Filhos que acessaram</h3><p><b>'+visits.length+'</b> acessos registrados hoje</p></article><article class="command-card"><h3>🔔 Aceites pendentes</h3><p><b>'+children.filter(c=>notices.some(n=>!acks.some(a=>a.notice_id===n.id&&a.profile_id===c.profile_id))).length+'</b> perfis ainda precisam dar aceite</p></article><article class="command-card"><h3>📢 Recados publicados</h3><p><b>'+notices.length+'</b> recados disponíveis</p></article></div><div class="command-card"><h3>📋 Acesso por filho</h3><div class="command-table-wrap"><table class="command-table"><thead><tr><th>Filho / dono do acesso</th><th>Cargo</th><th>Visitas hoje</th><th>Último acesso</th><th>Recados</th><th>Situação</th></tr></thead><tbody>'+children.map(ch=>{const vs=visits.filter(v=>v.child_id===ch.id||v.profile_id===ch.profile_id);const seen=notices.filter(n=>acks.some(a=>a.notice_id===n.id&&a.profile_id===ch.profile_id)).length;const accepted=acks.filter(a=>a.profile_id===ch.profile_id).length;const pending=Math.max(0,notices.length-seen);return '<tr><td><b>'+esc(ch.full_name)+'</b></td><td>'+esc(ch.house_role||'—')+'</td><td><b>'+vs.length+'</b> vez(es)</td><td>'+dateBR(vs[0]?.event_at?.slice(0,10))+' '+(vs[0]?.event_at?new Date(vs[0].event_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'')+'</td><td>👁️ '+seen+' vistos • ✅ '+accepted+' aceitos</td><td>'+(pending?'🔴 '+pending+' pendente(s)':'🟢 Em dia')+'</td></tr>'}).join('')+'</tbody></table></div></div><div class="command-card"><h3>🔎 Registro detalhado de acessos</h3><div class="command-table-wrap"><table class="command-table"><thead><tr><th>Horário</th><th>Filho</th><th>Acesso/cargo</th><th>Resultado</th></tr></thead><tbody>'+visits.map(v=>{const ch=children.find(c=>c.id===v.child_id);return '<tr><td>'+new Date(v.event_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})+'</td><td>'+esc(ch?.full_name||v.username||'Acesso não vinculado')+'</td><td>'+esc(v.access_role||ch?.house_role||'—')+'</td><td>'+(v.success?'🟢 Entrou':'🔴 Falhou')+'</td></tr>'}).join('')+'</tbody></table></div></div>';
}
window.visitasHoje=visitasHoje;

async function mediumFantasma(){
 const r=await sb.from('children').select('*').eq('is_test_account',true).single(); if(r.error){alert(r.error.message);return}
 const x=r.data, roles=x.test_role_options||['Ogã','Cambone','Médium','ADM','Pai de Santo','Mãe de Santo'];
 view().innerHTML='<div class="command-dashboard-head"><div><span class="eyebrow">AMBIENTE DE TESTE</span><h2>👻 Médium Fantasma</h2><p class="lead">Conta de demonstração. As configurações aqui não devem ser publicadas para um médium real até o Comandante confirmar.</p></div><button class="btn secondary" onclick="membrosOperacao()">← Voltar</button></div><div class="command-card"><h3>⚙️ Configurar perfil de teste</h3><form id="ghostf" class="command-form"><label>Nome<input name="full_name" value="'+esc(x.full_name)+'"></label><label>Cargo/Função<select name="house_role">'+roles.map(z=>'<option '+(x.house_role===z?'selected':'')+'>'+esc(z)+'</option>').join('')+'</select></label><label>Telefone<input name="phone" value="'+esc(x.phone||'')+'"></label><label>Status<select name="active"><option value="true" '+(x.active?'selected':'')+'>Ativo</option><option value="false" '+(!x.active?'selected':'')+'>Desativado</option></select></label><label class="full">Observações<textarea name="notes" rows="4">'+esc(x.notes||'')+'</textarea></label><div class="full"><button class="btn gold">💾 Salvar configuração</button></div></form></div><div class="command-grid">'+['👤 Ogã','🧹 Cambone','🕯️ Médium','🛡️ ADM','👑 Pai de Santo','👑 Mãe de Santo'].map(z=>'<article class="command-card"><h3>'+z+'</h3><p>Use o perfil fantasma para testar como esse cargo verá o portal antes de liberar o acesso real.</p></article>').join('')+'</div>';
 document.getElementById('ghostf').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const q=await sb.from('children').update({full_name:d.full_name,house_role:d.house_role,phone:d.phone,active:d.active==='true',notes:d.notes,updated_at:new Date().toISOString()}).eq('id',x.id);if(q.error){alert(q.error.message);return}await audit('configure_ghost_medium','children',x.id,{house_role:d.house_role});mediumFantasma()};
}
window.mediumFantasma=mediumFantasma;

async function membrosOperacao(){
 const r=await sb.from('children').select('id,full_name,active,house_role,profile_id').order('full_name');if(r.error){alert(r.error.message);return}
 const rows=r.data||[];
 const counts=await Promise.all(rows.map(async c=>{const q=await sb.from('disciplinary_actions').select('id',{count:'exact',head:true}).eq('child_id',c.id).eq('action_type','advertencia');return [c.id,q.count||0]}));
 const cm=Object.fromEntries(counts);
 view().innerHTML='<div class="command-dashboard-head"><div><span class="eyebrow">PESSOAS E ACESSOS</span><h2>👥 Perfis dos filhos</h2><p class="lead">Cada filho pode ter acesso ativado/desativado e advertências registradas pela ADM/Comandante.</p></div></div><div class="command-card"><button class="btn gold" onclick="mediumFantasma()">👻 Abrir Médium Fantasma / Testar perfis</button></div><div class="command-grid">'+rows.map(c=>'<article class="command-card"><h3>'+esc(c.full_name)+'</h3><p>'+esc(c.house_role||'Filho da casa')+'</p><p>🔐 Acesso: <b>'+(c.active?'ATIVO':'DESATIVADO')+'</b><br>⚠️ Advertências: <b>'+cm[c.id]+'</b>/3</p><div class="row-actions"><button class="btn '+(c.active?'danger':'gold')+' small" onclick="alternarAcessoFilho(\''+c.id+'\','+(!c.active)+')">'+(c.active?'🔒 Desativar acesso':'🔓 Ativar acesso')+'</button><button class="btn secondary small" onclick="adicionarAdvertencia(\''+c.id+'\')">⚠️ Adicionar advertência</button><button class="btn outline small" onclick="gerarRelatorioFilho(\''+c.id+'\')">📄 Relatório PDF</button></div></article>').join('')+'</div>';
}
window.membrosOperacao=membrosOperacao;
window.alternarAcessoFilho=async(id,active)=>{const q=await sb.from('children').update({active,updated_at:new Date().toISOString()}).eq('id',id);if(q.error){alert(q.error.message);return}const c=await sb.from('children').select('profile_id').eq('id',id).single();if(c.data?.profile_id)await sb.from('profiles').update({active,updated_at:new Date().toISOString()}).eq('id',c.data.profile_id);await audit('toggle_child_access','children',id,{active});membrosOperacao()};
window.adicionarAdvertencia=async id=>{
 const c=await sb.from('children').select('full_name').eq('id',id).single();const reason=prompt('Motivo da advertência para '+(c.data?.full_name||'filho')+':');if(!reason)return;
 const count=await sb.from('disciplinary_actions').select('id',{count:'exact',head:true}).eq('child_id',id).eq('action_type','advertencia');const n=(count.count||0)+1;
 const q=await sb.from('disciplinary_actions').insert({child_id:id,action_type:'advertencia',warning_number:n,points:1,notes:reason,decided_by:await actor()}).select().single();if(q.error){alert(q.error.message);return}
 await audit('add_warning','disciplinary_actions',q.data.id,{child_id:id,warning_number:n,reason});
 if(n===3)alert('3 advertências registradas. O levantamento foi encaminhado automaticamente para a direção/Mãe de Santo.');
 membrosOperacao();
};

function reportText(child,actions){
 return 'FILHO AUSENTE EM TODAS AS OBRIGAÇÕES E/OU QUAISQUER ATIVIDADES DA CASA\n\n'+
 'Filho: '+child.full_name+'\nData: '+new Date().toLocaleDateString('pt-BR')+'\nAdvertências registradas: '+actions.length+'\n\n'+
 'Este documento é um levantamento para a direção da casa. O objetivo é redirecionar o filho com respeito, compaixão e leveza, considerando justificativas e o contexto de cada situação.\n\n'+
 'ORIENTAÇÃO À DIREÇÃO\nO filho está sendo redirecionado para a Mãe de Santo/dirigente para conversa, orientação e avaliação. Caso a situação continue, a direção poderá avaliar os próximos passos conforme as regras e a realidade da casa, inclusive eventual convite para deixar a casa. Nenhuma decisão de desligamento é tomada automaticamente pelo sistema.\n\n'+
 'REGISTRO DE ADVERTÊNCIAS\n'+actions.map((a,i)=>(i+1)+'. '+new Date(a.created_at).toLocaleDateString('pt-BR')+' — '+(a.notes||'Sem observação')).join('\n');
}
async function gerarRelatorioFilho(id){
 const [c,a]=await Promise.all([sb.from('children').select('full_name,house_role').eq('id',id).single(),sb.from('disciplinary_actions').select('*').eq('child_id',id).eq('action_type','advertencia').order('created_at')]);if(c.error){alert(c.error.message);return}
 const txt=reportText(c.data,a.data||[]);
 const copy='RELATÓRIO PARA DEMONSTRAÇÃO AOS ADMs\n\n'+txt;
 const w=window.open('','_blank','noopener');if(!w){alert('Permita pop-ups para gerar o relatório.');return}
 w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Relatório — '+esc(c.data.full_name)+'</title><style>body{font-family:Arial,sans-serif;padding:40px;line-height:1.5}h1{font-size:28px}button{padding:10px 16px;margin-right:8px}</style></head><body><h1>FILHO AUSENTE EM TODAS AS OBRIGAÇÕES E/OU QUAISQUER ATIVIDADES DA CASA</h1><pre style="white-space:pre-wrap;font:16px Arial">'+esc(txt)+'</pre><button onclick="navigator.clipboard.writeText('+JSON.stringify(copy)+').then(()=>alert(\'Texto copiado.\'))">📋 Copiar demonstração</button> <button onclick="window.print()">📄 Baixar/Salvar em PDF</button></body></html>');w.document.close();
}
window.gerarRelatorioFilho=gerarRelatorioFilho;

async function notificacoesComandante(){
 const r=await sb.from('admin_notices').select('*').order('created_at',{ascending:false}).limit(30);if(r.error){alert(r.error.message);return}
 const rows=r.data||[];
 view().innerHTML='<div class="command-dashboard-head"><div><span class="eyebrow">COMANDANTE</span><h2>🔔 Notificações</h2><p class="lead">Avisos importantes para acompanhar nas reuniões e na rotina da casa.</p></div></div><div class="command-card">'+(rows.length?rows.map(x=>'<article style="padding:14px;border-bottom:1px solid #ddd"><h3>'+esc(x.title)+'</h3><p>'+esc(x.body)+'</p><span class="mini">'+dateBR(x.event_date||x.created_at?.slice(0,10))+'</span></article>').join(''):'<p>Nenhuma notificação.</p>')+'</div>';
}
window.notificacoesComandante=notificacoesComandante;

function decorate(){
 const v=view();if(!v)return;
 const txt=v.innerText||'';
 if(/Escalas publicadas|Escalas mensais|Escalas/.test(txt) && !v.dataset.opdecor){v.dataset.opdecor='1';const b=document.createElement('div');b.className='command-card';b.innerHTML='<h3>⚙️ Operação do Comandante</h3><div class="row-actions"><button class="btn gold" onclick="escalasOperacao()">📋 Painel completo de escalas</button><button class="btn secondary" onclick="notificacoesComandante()">🔔 Notificações</button></div>';v.prepend(b)}
 if(/Membros|Filhos/.test(txt) && !v.dataset.memdecor){v.dataset.memdecor='1';const b=document.createElement('div');b.className='command-card';b.innerHTML='<h3>👥 Administração dos filhos</h3><div class="row-actions"><button class="btn gold" onclick="membrosOperacao()">Abrir perfis, acessos e advertências</button></div>';v.prepend(b)}
 if(/Financeiro|Orçamento|Orçamentos/.test(txt) && !v.dataset.finfix){v.dataset.finfix='1';const b=document.createElement('div');b.className='command-card';b.innerHTML='<h3>🏠 Contas fixas da casa</h3><p class="mini">Luz, charuto, vela, fumo, mantimentos, bebidas, cigarros, limpeza e novos itens.</p><button class="btn gold" onclick="contasFixas()">Abrir contas fixas</button>';v.prepend(b)}
}
let last='';
setInterval(()=>{const v=view();if(v&&v.innerText!==last){last=v.innerText;decorate()}},700);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate,{once:true});else decorate();
})();