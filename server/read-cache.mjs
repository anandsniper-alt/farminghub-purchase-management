/** Bounded per-server read cache. The caller supplies a live SQLite generation;
 * cached data is never used for authentication or write validation.
 */
export class ReadCache{
 constructor({maxBytes=64*1024*1024,maxEntries=32,ttlMs=15000,clock=Date.now}={}){Object.assign(this,{maxBytes,maxEntries,ttlMs,clock});this.entries=new Map();this.bytes=0;this.generation=null;}
 get(key,generation,build){
  const now=this.clock();
  if(generation!==this.generation){this.entries.clear();this.bytes=0;this.generation=generation;}
  for(const [id,entry] of this.entries)if(entry.expires<=now){this.bytes-=entry.bytes;this.entries.delete(id);}
  const found=this.entries.get(key);if(found){this.entries.delete(key);if(!found.isValid||found.isValid()){this.entries.set(key,found);return found.value;}this.bytes-=found.bytes;}
  const built=build(),value=typeof built==='string'?built:built.value,isValid=typeof built==='string'?null:built.isValid,bytes=Buffer.byteLength(value);
  if(bytes<=this.maxBytes&&this.maxEntries>0){while(this.entries.size&&(this.bytes+bytes>this.maxBytes||this.entries.size>=this.maxEntries)){const id=this.entries.keys().next().value;this.bytes-=this.entries.get(id).bytes;this.entries.delete(id);}this.entries.set(key,{value,isValid,bytes,expires:now+this.ttlMs});this.bytes+=bytes;}
  return value;
 }
}
