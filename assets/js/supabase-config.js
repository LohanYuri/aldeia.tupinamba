window.ALDEIA_SUPABASE_URL="https://omlcissqryhckiwmtudi.supabase.co";
window.ALDEIA_SUPABASE_KEY="sb_publishable_YWICYWihdeKwRsdCH8RCZQ_lHyRsZky";
window.ALDEIA_SUPABASE=window.supabase.createClient(window.ALDEIA_SUPABASE_URL,window.ALDEIA_SUPABASE_KEY);

/* Painel de produtividade do Comandante: funciona apenas na central administrativa. */
(function(){
  if(!/comandante\.html$/i.test(location.pathname)) return;
  const sb=window.ALDEIA_SUPABASE;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const brl=v=>'R$ '+Number(v||0).toFixed(2).replace('.',',');
  const month=()=>new Date().toISOString().slice(0,10);
  let box=null;

  function ensure(){
    if(box || !document.body) return;
    const hero=document.querySelector('.command-hero');
    if(!hero) return;
    box=document.createElement('div');
    box.id='liveCommanderPanel';
    box.style.cssText='margin-top:16px;background:#ffffff14;border:1px solid #ffffff38;border-radius:16px;padding:14px;backdrop-filter:blur(6px)';
    box.innerHTML='<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><b>⚡ Painel de situação rápida</b><span id="cpUpdated" style="font-size:12px;opacity:.8">Atualizando…</span></div><div id="cpStats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:10px"></div><div id="cpNext" style="margin-top:10px;font-size:13px"></div>';
    hero.appendChild(box);
  }

  async function refresh(){
    ensure();
    if(!box) return;
    const {data,error}=await sb.rpc('commander_dashboard_summary',{p_month:month()});
    if(error){ const s=document.getElementById('cpStats'); if(s)s.innerHTML='<span style="opacity:.8">Painel indisponível no momento.</span>'; return; }
    const s=data||{}, stats=document.getElementById('cpStats'), next=document.getElementById('cpNext'), up=document.getElementById('cpUpdated');
    stats.innerHTML=[
      ['👥 Filhos ativos',s.active_children??0],
      ['💰 Pendentes',(s.pending_dues_count??0)+' • '+brl(s.pending_dues_amount)],
      ['📅 Próximas escalas',s.upcoming_scales??0],
      ['🚨 Ciências pendentes',s.admin_notices_pending??0],
      ['🛒 Orçamentos',s.budget_waiting??0],
      ['⚖️ Ocorrências',s.compliance_pending??0]
    ].map(x=>'<div style="background:#00000018;border-radius:10px;padding:9px"><div style="font-size:11px;opacity:.82">'+esc(x[0])+'</div><b style="font-size:16px">'+esc(x[1])+'</b></div>').join('');
    next.innerHTML=s.next_scale
      ? '⏭️ <b>Próxima escala:</b> '+esc(s.next_scale.date)+' • '+esc(s.next_scale.time?s.next_scale.time.slice(0,5):'sem horário')+' '+(s.next_scale.notes?'• '+esc(s.next_scale.notes):'')
      : '⏭️ Nenhuma escala futura cadastrada.';
    up.textContent='Atualizado '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  }

  function boot(){
    ensure();
    refresh();
    setInterval(refresh,30000);
    try{
      sb.channel('commander-live')
        .on('postgres_changes',{event:'*',schema:'public',table:'children'},refresh)
        .on('postgres_changes',{event:'*',schema:'public',table:'child_dues'},refresh)
        .on('postgres_changes',{event:'*',schema:'public',table:'scales'},refresh)
        .on('postgres_changes',{event:'*',schema:'public',table:'admin_notices'},refresh)
        .on('postgres_changes',{event:'*',schema:'public',table:'finance_budget_items'},refresh)
        .on('postgres_changes',{event:'*',schema:'public',table:'child_compliance'},refresh)
        .subscribe();
    }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();