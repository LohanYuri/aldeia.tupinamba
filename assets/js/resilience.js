/* Compatibilidade global imediata: evita que chamadas inline parem o portal. */
window.dateBR=window.dateBR||function(value){
  if(value===null||value===undefined||value==='')return '—';
  const raw=String(value), m=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m)return `${m[3]}/${m[2]}/${m[1]}`;
  const d=new Date(value);
  return Number.isNaN(d.getTime())?raw:d.toLocaleDateString('pt-BR');
};
window.brDate=window.brDate||window.dateBR;

(() => {
  const VERSION='2026.09.11-final-r6';
  window.ALDEIA_PORTAL_VERSION=VERSION;

  const formatDateBR=(value)=>{
    if(value===null||value===undefined||value==='')return '—';
    const raw=String(value);
    const dateOnly=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(dateOnly)return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return raw;
    return d.toLocaleDateString('pt-BR');
  };
  window.dateBR=window.dateBR||formatDateBR;
  window.brDate=window.brDate||formatDateBR;

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
  function CACHE_NAME(){return 'aldeia-portal-shell-v4'}

  function loadMarketQuote(){
    if(!location.pathname.split('/').pop().match(/^comandante\.html$/))return;
    if(document.querySelector('script[data-aldeia-market-quote]'))return;
    const s=document.createElement('script');
    s.src='/assets/js/market-quote.js?v=20260911-r6';
    s.async=true;
    s.dataset.aldeiaMarketQuote='1';
    s.onerror=()=>{window.__aldeiaLastError={message:'Módulo de cotação de mercado não carregou',at:new Date().toISOString()}};
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadMarketQuote);
  else loadMarketQuote();
})();