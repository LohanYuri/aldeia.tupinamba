(() => {
  if (!location.pathname.endsWith('/comandante.html') && !location.pathname.endsWith('comandante.html')) return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  async function check(){
    const issues=[];
    if(!navigator.onLine) issues.push({code:'internet',text:'Sem conexão com a internet. O modo local continua disponível.'});
    if(!window.ALDEIA_SUPABASE) issues.push({code:'supabase',text:'Conexão com a base de dados não foi carregada.'});
    if(!('serviceWorker' in navigator)) issues.push({code:'offline',text:'Este navegador não oferece o modo protegido/offline.'});
    else {try{const regs=await navigator.serviceWorker.getRegistrations();if(!regs.length)issues.push({code:'offline',text:'O módulo de proteção local ainda não foi registrado.'})}catch(e){issues.push({code:'offline',text:'Não foi possível verificar o módulo local.'})}}
    if(window.ALDEIA_SUPABASE){
      for(const table of ['profiles','admin_notices','events']){
        try{const r=await window.ALDEIA_SUPABASE.from(table).select('*',{head:true,count:'exact'});if(r.error)issues.push({code:'db',text:'Falha ao consultar '+table+'.'})}catch(e){issues.push({code:'db',text:'Não foi possível consultar '+table+'.'})}
      }
    }
    return issues;
  }
  function mount(){
    const view=document.getElementById('view'); if(!view||document.getElementById('portalHealth'))return;
    const el=document.createElement('section');el.id='portalHealth';el.className='command-card accountability-critical';el.style.marginBottom='14px';
    el.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap"><div><span class="eyebrow">PROTEÇÃO DO PORTAL</span><h3 style="font-size:20px;margin:4px 0">🛡️ Saúde e recuperação automática</h3><p id="healthText" class="muted" style="margin:0">Verificando o sistema…</p></div><button id="healthFix" class="btn gold" type="button">🔧 Vamos corrigir?</button></div><div id="healthIssues" style="margin-top:10px"></div>';
    view.prepend(el);
    const run=async()=>{
      const btn=document.getElementById('healthFix'),txt=document.getElementById('healthText'),box=document.getElementById('healthIssues');
      btn.disabled=true;btn.textContent='⏳ Verificando…';
      const issues=await check();
      if(!issues.length){txt.textContent='Tudo certo. Nenhum problema reparável foi encontrado agora.';box.innerHTML='';btn.style.display='none'}
      else{txt.textContent='Atenção: o portal encontrou '+issues.length+' ponto(s) que precisam de verificação.';box.innerHTML=issues.map(i=>'<div class="notice-box warn"><b>Atenção</b><br>'+esc(i.text)+'</div>').join('');btn.style.display='inline-flex'}
      btn.disabled=false;if(btn.style.display!=='none')btn.textContent='🔧 Vamos corrigir?';
    };
    document.getElementById('healthFix').onclick=async()=>{
      const btn=document.getElementById('healthFix'),txt=document.getElementById('healthText');
      btn.disabled=true;btn.textContent='⏳ Corrigindo…';txt.textContent='O sistema está limpando o cache antigo, atualizando o módulo local e testando novamente.';
      const r=await window.ALDEIA_SELF_HEAL?.();
      if(r?.ok){txt.textContent='✅ Correção automática concluída. Recarregando a versão mais recente…';setTimeout(()=>location.reload(),700)}
      else{txt.textContent='⚠️ A correção automática não conseguiu concluir. O problema foi preservado para análise do Comandante.';btn.disabled=false;btn.textContent='🔧 Tentar novamente'}
    };
    run();
  }
  const observer=new MutationObserver(mount);observer.observe(document.documentElement,{childList:true,subtree:true});mount();
})();