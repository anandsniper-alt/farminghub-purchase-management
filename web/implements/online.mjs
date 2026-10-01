let csrf='';
export function apiFetch(path,options={}){return fetch(path,{...options,headers:{...options.headers,'X-CSRF-Token':csrf},cache:'no-store'});}
export async function connect(){
 const response=await fetch('/api/implements/workspace',{cache:'no-store'});
 if(response.status===401){location.replace('/#/order-management/implements');throw Error('Sign in to Farming Hub, then open Implements.');}
 const data=await response.json();
 if(!response.ok){document.querySelector('#app').textContent=data.error||'Implements is unavailable. Return to Farming Hub to check your access.';throw Error(data.error);}
 csrf=data.csrf;return {...data,demo:false,online:true};
}
export async function saveOnline(previous,next,message){
 const options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:previous.revision,requestId:crypto.randomUUID(),message,state:next})};
 let response;
 for(let attempt=0;attempt<2;attempt++){
  try{response=await apiFetch('/api/implements/workspace',options);break;}
  catch(error){if(attempt)throw Error('Connection lost. Your entries are still on screen. Reconnect and reload to check whether the save completed before trying again.');}
 }
 const data=await response.json();
 if(!response.ok)throw Error(data.error||'Save failed; your entries remain on screen.');
 return data.state;
}
