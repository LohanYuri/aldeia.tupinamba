(() => {
  if(!location.pathname.endsWith('/comandante.html') && !location.pathname.endsWith('comandante.html')) return;

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  async function check(){
    const issues=[];
    if(!navigator.onLine) issues.push({code:'internet',text:'Sem conexão com a internet. O portal continuará funcionando com a proteção local e os rascunhos salvos neste dispositivo.'});
    if(!window.ALDEIA_SUPABASE) issues.push({code:'connection',text:'A conexão segura com os serviços da Aldeia ainda não respondeu. O restante do Comando continua disponível.'});

    if('serviceWorker' in navigator){
      try{
        const regs=await navigator.serviceWorker.getRegistrations();
        if(!regs.length) issues.push({code:'offline',text:'A proteção local do portal ainda não está ativa. Ela pode ser instalada automaticamente.'});
      }catch(_){
        issues.push({code:'offline',text:'A proteção local do portal precisa de uma nova tentativa de atualização.'});
      }
    }

    if(window.ALDEIA_SUPABASE && navigator.onLine){
      try{
        let ok=false;
        for(let i=0;i<2;i++){
          const r=await window.ALDEIA_SUPABASE.from('profiles').select('id',{head:true,count:'exact'});
          if(!r.error){ok=true;break}
          await sleep(250);
        }
        if(!ok) issues.push({code:'connection',text:'A conexão com os dados da Aldeia não respondeu agora. O sistema pode tentar recuperar a conexão automaticamente.'});
      }catch(_){
        issues.push({code:'connection',text:'A conexão com os dados da Aldeia precisa de uma nova tentativa.'});
      }
    }
    return issues;
  }

  function ensurePanel(){
    if(document.getElementById('portalHealth')) return document.getElementById('portalHealth');
    const workspace=document.querySelector('.command-workspace');
    const main=document.querySelector('main.command');
    if(!workspace || !main) return null;

    const el=document.createElement('section');
    el.id='portalHealth';
    el.className='command-card accountability-critical';
    el.style.margin='14px 0';
    el.innerHTML=
      '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">'+
        '<div><span class="eyebrow">PROTEÇÃO DO PORTAL</span>'+
        '<h3 style="font-size:20px;margin:4px 0">🛡️ Saúde e recuperação automática</h3>'+
        '<p id="healthText" class="muted" style="margin:0">Verificando o sistema…</p></div>'+
        '<button id="healthFix" class="btn gold" type="button">🔧 Vamos corrigir?</button>'+
      '</div>'+
      '<div id="healthIssues" style="margin-top:10px"></div>';

    /* IMPORTANTE: fica FORA de #view.
       Assim dashboard, membros, financeiro, escalas etc. nunca são apagados
       quando o Comandante troca de módulo. */
    main.insertBefore(el,workspace);
    return el;
  }

  async function runCheck(){
    const el=ensurePanel();
    if(!el) return setTimeout(runCheck,300);

    const btn=el.querySelector('#healthFix');
    const txt=el.querySelector('#healthText');
    const box=el.querySelector('#healthIssues');
    if(!btn||!txt||!box) return;

    btn.disabled=true;
    btn.textContent='⏳ Verificando…';
    const issues=await check();

    if(!issues.length){
      txt.textContent='Tudo certo. Nenhum problema reparável foi encontrado agora.';
      box.innerHTML='';
      btn.style.display='none';
    }else{
      txt.textContent='Atenção: o portal encontrou um ponto que pode precisar de recuperação.';
      box.innerHTML=issues.map(i=>'<div class="notice-box warn"><b>Atenção</b><br>'+esc(i.text)+'</div>').join('');
      btn.style.display='inline-flex';
      btn.disabled=false;
      btn.textContent='🔧 Vamos corrigir?';
    }
  }

  async function recover(){
    const el=ensurePanel();
    if(!el) return;
    const btn=el.querySelector('#healthFix');
    const txt=el.querySelector('#healthText');
    const box=el.querySelector('#healthIssues');
    if(!btn||!txt||!box) return;

    btn.disabled=true;
    btn.textContent='⏳ Recuperando…';
    txt.textContent='O sistema está tentando recuperar somente o que apresentou problema. Não feche esta página.';
    box.innerHTML='<div class="notice-box"><b>🔄 Recuperação em andamento</b><br>Atualizando a proteção local, limpando versões antigas e testando a conexão novamente.</div>';

    for(let attempt=1;attempt<=2;attempt++){
      try{
        const r=await window.ALDEIA_SELF_HEAL?.();
        if(r?.ok){
          txt.textContent='✅ Recuperação concluída.';
          box.innerHTML='<div class="notice-box success"><b>Pronto.</b><br>O sistema corrigiu automaticamente o que estava ao alcance dele. O Comando Geral foi preservado.</div>';
          btn.style.display='none';
          setTimeout(()=>location.reload(),900);
          return;
        }
      }catch(_){}
      await sleep(500);
    }

    txt.textContent='⚠️ Atenção: a recuperação automática não conseguiu concluir desta vez.';
    box.innerHTML='<div class="notice-box warn"><b>O problema permanece identificado.</b><br>O restante do Comando continua preservado. O sistema tentará novamente quando a proteção for atualizada.</div>';
    btn.disabled=false;
    btn.textContent='🔧 Tentar novamente';
  }

  function start(){
    const boot=()=>setTimeout(runCheck,700);
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
    else boot();

    setInterval(()=>{
      if(document.visibilityState!=='hidden') runCheck();
    },60000);
  }

  document.addEventListener('click',e=>{
    if(e.target?.id==='healthFix') recover();
  });

  start();
})();