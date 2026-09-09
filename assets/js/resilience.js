(() => {
  const VERSION='2026.09.09-final';
  window.ALDEIA_PORTAL_VERSION=VERSION;
  const draftKey='aldeia_portal_drafts_v1';
  const saveDraft=(form)=>{
    if(!form?.querySelector)return;
    const data={}; form.querySelectorAll('input,textarea,select').forEach(el=>{if(el.name)data[el.name]=el.type==='checkbox'?el.checked:el.value});
    try{localStorage.setItem(draftKey+':'+(form.id||'form'),JSON.stringify({saved_at:new Date().toISOString(),data}))}catch(_){}
  };
  const restoreDraft=(form)=>{
    try{const raw=localStorage.getItem(draftKey+':'+(form.id||'form'));if(!raw)return;const d=JSON.parse(raw);Object.entries(d.data||{}).forEach(([k,v])=>{const el=form.elements[k];if(el){if(el.type==='checkbox')el.checked=!!v;else if(!el.value)el.value=v}})}catch(_){}
  };
  window.ALDEIA_DRAFTS={save:saveDraft,restore:restoreDraft,clear:(id)=>localStorage.removeItem(draftKey+':'+id)};
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('form[id]').forEach(form=>{
      restoreDraft(form);
      form.addEventListener('input',()=>saveDraft(form),{passive:true});
      form.addEventListener('change',()=>saveDraft(form),{passive:true});
      form.addEventListener('submit',()=>setTimeout(()=>ALDEIA_DRAFTS.clear(form.id),500));
    });
  });
  window.addEventListener('error',e=>{window.__aldeiaLastError={message:e.message,source:e.filename,line:e.lineno,col:e.colno,at:new Date().toISOString()};});
  window.addEventListener('unhandledrejection',e=>{window.__aldeiaLastError={message:String(e.reason?.message||e.reason||'Promise rejeitada'),at:new Date().toISOString()};});
  async function registerSW(){
    if(!('serviceWorker' in navigator))return {ok:false,reason:'Navegador sem Service Worker'};
    try{
      const reg=await navigator.serviceWorker.register('/sw.js',{scope:'/'});
      if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});
      reg.update().catch(()=>{});
      return {ok:true,registration:reg};
    }catch(e){return {ok:false,reason:e.message}};
  }
  window.ALDEIA_SW=registerSW();
  window.ALDEIA_SELF_HEAL=async()=>{
    const steps=[];
    try{
      if('serviceWorker' in navigator){
        const regs=await navigator.serviceWorker.getRegistrations();
        for(const r of regs)await r.update().catch(()=>{});
        steps.push('serviço local atualizado');
      }
      const keys=await caches.keys();
      for(const k of keys)if(k.startsWith('aldeia-portal-')&&k!==CACHE_NAME())await caches.delete(k);
      steps.push('cache antigo limpo');
      await registerSW();
      steps.push('versão oficial recarregada');
      return {ok:true,steps};
    }catch(e){return {ok:false,steps,error:e.message}};
  };
  function CACHE_NAME(){return 'aldeia-portal-shell-v1'}
})();