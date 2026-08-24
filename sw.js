const CACHE='bee-today-v29';
const ASSETS=['./','./index.html','./styles.css?v=29','./projection.js?v=20','./goal-stats.js?v=20','./goal-metadata.js?v=28','./accountability.js?v=25','./app.js?v=29','./version.json','./manifest.webmanifest','./icons/icon.svg'];

self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;

  // Always get navigations from the network first so HTML cannot get ahead of
  // its versioned script and stylesheet. The cached shell remains the fallback.
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).catch(()=>caches.match('./index.html')));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      return response;
    }))
  );
});
