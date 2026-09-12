(() => {
const local = new Map();
Object.defineProperty(window,'localStorage',{value:{getItem:k=>local.get(String(k))??null,setItem:(k,v)=>local.set(String(k),String(v)),removeItem:k=>local.delete(String(k)),clear:()=>local.clear()}});
const files=new Map();
const db={createObjectStore:()=>{},transaction:()=>{const tx={};tx.objectStore=()=>({put:(blob,id)=>{files.set(id,blob);setTimeout(()=>tx.oncomplete?.(),0)},get:id=>{const r={};setTimeout(()=>{r.result=files.get(id);r.onsuccess?.()},0);return r;}});return tx;}};
Object.defineProperty(window,'indexedDB',{value:{open:()=>{const r={result:db};setTimeout(()=>{r.onupgradeneeded?.();r.onsuccess?.()},0);return r;}}});
if(!crypto.randomUUID)crypto.randomUUID=()=>{const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;return [...b].map((v,i)=>([4,6,8,10].includes(i)?'-':'')+v.toString(16).padStart(2,'0')).join('');};
})();
