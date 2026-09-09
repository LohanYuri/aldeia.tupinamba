(() => {
  if (!location.pathname.endsWith('/comandante.html') && !location.pathname.endsWith('comandante.html')) return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  async function check(){
    const issues=[];
    if(!navigator.onLine) issues.push({code:'internet',text:'Sem conexão com a internet. O portal continuará usando o modo local.'});
    if(!window.ALDEIA_SUPABASE) issues.push({code:'connection',text:'A conexão segura com os serviços da Aldeia ainda não respondeu.'});
    if('serviceWorker' in navigator){
      try{
        const regs=await navigator.serviceWorker.getRegistrations();
        if(!regs.length) issues.push({code:'offline',text:'O módulo de proteção local ainda não está ativo.'});
      }catch(_){ issues.push({code:'offline',text:'O módulo de proteção local precisa ser atualizado.'}); }
    }
    if(window.ALDEIA_SUPABASE && navigator.onLine){
      try{
        let ok=false;
        for(let i=0;i<2;i++){
          const r=await window.ALDEIA_SUPABASE.from('profiles').select('id',{head:true,count:'exact'});
          if(!r.error){ok=true;break;}
          await sleep(250);
        }
        if(!ok) issues.push({code:'connection',text:'A conexão com os dados da Aldeia não respondeu agora. Vamos tentar recuperar automaticamente.'});
      }catch(_){ issues.push({code:'connection',text:'A conexão com os dados da Aldeia precisa de uma nova tentativa.'}); }
    }
    return issues;
  }

  function mount(){
    const view=document.getElementById('view');
    if(!view||document.getElementById('portalHealth'))return;
    const el=document.createElement('section');
    el.id='portalHealth';
    el.className='command-card accountability-critical';
    el.style.marginBottom='14px';
    el.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap"><div><span class="eyebrow">PROTEÇÃO DO PORTAL</span><h3 style="font-size:20px;margin:4px 0">🛡️ Saúde e recuperação automática</h3><p id="healthText" class="muted" style="margin:0">Verificando o sistema…</p></div><button id="healthFix" class="btn gold" type="button">🔧 Vamos corrigir?</button></div><div id="healthIssues" style="margin-top:10px"></div>';
    view.prepend(el);

    const run=async()=>{
      const btn=document.getElementById('healthFix'),txt=document.getElementById('healthText'),box=document.getElementById('healthIssues');
      btn.disabled=true;btn.textContent='⏳ Verificando…';
      const issues=await check();
      if(!issues.length){
        txt.textContent='Tudo certo. Nenhum problema reparável foi encontrado agora.';
        box.innerHTML='';btn.style.display='none';
      }else{
        txt.textContent='Atenção: o portal encontrou um ponto que pode precisar de recuperação.';
        box.innerHTML=issues.map(i=>'<div class="notice-box warn"><b>Atenção</b><br>'+esc(i.text)+'</div>').join('');
        btn.style.display='inline-flex';
      }
      btn.disabled=false;
      if(btn.style.display!=='none')btn.textContent='🔧 Vamos corrigir?';
    };

    document.getElementById('healthFix').onclick=async()=>{
      const btn=document.getElementById('healthFix'),txt=document.getElementById('healthText'),box=document.getElementById('healthIssues');
      btn.disabled=true;btn.textContent='⏳ Recuperando…';
      txt.textContent='O sistema está tentando recuperar o portal automaticamente. Não feche esta página.';
      box.innerHTML='<div class="notice-box"><b>🔄 Recuperação em andamento</b><br>Atualizando a proteção local, limpando versões antigas e testando a conexão novamente.</div>';

      for(let attempt=1;attempt<=2;attempt++){
        const r=await window.ALDEIA_SELF_HEAL?.();
        if(r?.ok){
          txt.textContent='✅ Recuperação concluída. O portal foi atualizado e será recarregado.';
          box.innerHTML='<div class="notice-box success"><b>Pronto.</b><br>O sistema corrigiu o que era possível automaticamente.</div>';
          setTimeout(()=>location.reload(),900);
          return;
        }
        await sleep(500);
      }
      txt.textContent='⚠️ O sistema não conseguiu concluir a recuperação automática desta vez.';
      box.innerHTML='<div class="notice-box warn"><b>Atenção do Comandante</b><br>O problema foi identificado e não será apagado. Tente novamente ou aguarde a próxima atualização automática.</div>';
      btn.disabled=false;btn.textContent='🔧 Tentar novamente';
    };
    run();
  }
  const observer=new MutationObserver(mount);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  mount();
})();