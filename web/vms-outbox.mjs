/** Per-login outbox; API responses and credentials are never cached here. */
export function createVmsOutbox(host){
 if(!host.context().sandbox&&'serviceWorker' in navigator)navigator.serviceWorker.register('/service-worker.js').catch(()=>{});
 let syncing=false,installPrompt=null;
 const prefix=()=>`fh-vms-outbox-v1:${encodeURIComponent(host.context().user?.id||'signed-out')}:`;
 const key=(id,owner=host.context().user?.id)=>`fh-vms-outbox-v1:${encodeURIComponent(owner)}:${id}`;
 const list=()=>{const rows=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k?.startsWith(prefix()))continue;try{const r=JSON.parse(localStorage.getItem(k));if(r?.owner===host.context().user?.id)rows.push(r);}catch{}}return rows.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));};
 const put=r=>localStorage.setItem(key(r.id,r.owner),JSON.stringify(r));
 const changed=()=>{if(host.context().ui.view==='vms'&&!host.context().ui.modal)host.render();};
 async function sync(){
  if(syncing||!navigator.onLine||!host.context().user||host.context().sandbox)return;
  syncing=true;const owner=host.context().user.id;
  try{for(const item of list()){
   if(item.status==='Conflict'||item.status==='Needs attention')continue;
   if(host.context().user?.id!==owner)break;
   try{await host.syncEdit(item,owner);localStorage.removeItem(key(item.id,owner));}
   catch(e){if(host.context().user?.id!==owner)break;item.status=e.status===409?'Conflict':e.status===400||e.status===403?'Needs attention':'Waiting';item.error=e.status===401?'Sign in again to sync your edits.':e.message||'Waiting for connection.';put(item);if(!e.status||e.status===401||e.status>=500)break;}
  }}finally{syncing=false;changed();}
 }
 async function enqueue(commandType,payload,base,vendorName){
  const owner=host.context().user.id;
  if(list().some(x=>x.vendorId===payload.vendorId&&x.commandType===commandType))throw new Error('This vendor already has a pending edit. Review it in Pending Sync first.');
  const item={id:crypto.randomUUID(),owner,vendorId:payload.vendorId,vendorName,commandType,payload,base,createdAt:new Date().toISOString(),status:'Waiting',error:''};
  try{put(item);}catch{throw new Error('Browser storage is unavailable or full. Keep this form open and reconnect to save.');}
  await sync();return list().find(x=>x.id===item.id)||null;
 }
 function discard(id){const item=list().find(x=>x.id===id);if(!item)return;localStorage.removeItem(key(id));changed();}
 function retry(id,base){const item=list().find(x=>x.id===id);if(!item)return;if(base){for(const k of Object.keys(base))if(JSON.stringify(item.payload[k])===JSON.stringify(item.base[k]))item.payload[k]=base[k];item.base=base;item.id=crypto.randomUUID();}item.status='Waiting';item.error='';put(item);if(item.id!==id)localStorage.removeItem(key(id));return sync();}
 window.addEventListener('online',()=>sync());
 window.addEventListener('storage',e=>{if(e.key?.startsWith(prefix())){changed();sync();}});
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;changed();});
 window.addEventListener('appinstalled',()=>{installPrompt=null;changed();});
 // Retry a temporarily unavailable server even when the browser never went offline.
 setInterval(()=>sync(),30000);
 return {list,sync,enqueue,discard,retry,isSyncing:()=>syncing,canInstall:()=>!!installPrompt,install:async()=>{if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();changed();}}};
}
