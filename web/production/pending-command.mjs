// Keep the same receipt identity after an uncertain response, even if balances refresh.
export function pendingProductionCommand(send,versions,saved,newId=()=>crypto.randomUUID()){
 let pending=null;
 return async payload=>{
  const identity=JSON.stringify(payload);
  if(pending&&pending.identity!==identity)throw Error('The previous save could not be confirmed. Keep the original entries and retry that save before posting another action.');
  pending??={identity,input:{...payload,...versions(),requestId:newId()}};
  try{const response=await send(pending.input);pending=null;saved(response);return response;}
  catch(error){if(error.status>=400&&error.status<500)pending=null;throw error;}
 };
}
