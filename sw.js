const CACHE='aldeia-portal-shell-v1';
const CORE=['/','/index.html','/filhos.html','/adm/','/offline.html','/manifest.webmanifest','/assets/css/style.css','/assets/js/app.js','/assets/js/site-data.js','/assets/js/supabase-config.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE).catch(()=>{})).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET') return;
  e.respondWith(fetch(r).then(res=>{
    if(res.ok && new URL(r.url).origin===self.location.origin){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy));}
    return res;
  }).catch(()=>caches.match(r).then(c=>c||caches.match('/offline.html'))));
});
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting();});
