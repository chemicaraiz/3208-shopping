const CACHE_NAME='3208-shopping-v23';
const APP_SHELL=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;

  const url=new URL(req.url);

  // Supabase API is network-first. Do not cache private DB responses.
  if(url.hostname.includes('supabase.co')){
    event.respondWith(fetch(req));
    return;
  }

  event.respondWith(
    fetch(req).then(res=>{
      const copy=res.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(req,copy));
      return res;
    }).catch(()=>caches.match(req).then(cached=>cached||caches.match('./index.html')))
  );
});


self.addEventListener('push',event=>{
  let data={title:'3208',body:'通知があります',url:'/#h',tag:'3208-reminder'};
  try{if(event.data)data={...data,...event.data.json()}}catch(e){}
  event.waitUntil(
    self.registration.showNotification(data.title,{
      body:data.body,
      icon:'./icon-192.png',
      badge:'./icon-192.png',
      tag:data.tag,
      data:{url:data.url||'/#h'}
    })
  );
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'/#h',self.location.origin).href;
  event.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      for(const client of list){
        if(client.url.startsWith(self.location.origin)){
          client.navigate(target);
          return client.focus();
        }
      }
      return clients.openWindow(target);
    })
  );
});
