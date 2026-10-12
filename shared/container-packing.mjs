/** Rectangular package planning only. Never writes order allocations or shipping status. */
export const PACKING_PRESETS=[
 {id:'20GP',name:'20 ft standard',length:5900,width:2352,height:2395,doorWidth:2340,doorHeight:2292,payload:28130,source:'20-standard'},
 {id:'40GP',name:'40 ft standard',length:12032,width:2352,height:2395,doorWidth:2340,doorHeight:2292,payload:28750,source:'40-standard'},
 {id:'40HC',name:'40 ft high cube',length:12032,width:2350,height:2700,doorWidth:2340,doorHeight:2597,payload:28600,source:'40-standard-high-cube'}
];
export const PACKING_LIMITS={rows:200,packages:5000};
const packingNum=v=>v!==''&&v!=null&&Number.isFinite(Number(v))?Number(v):null;
export function packingContainer(raw){
 const c={id:String(raw.id||'CUSTOM'),name:String(raw.name||'Custom container')};
 for(const k of ['length','width','height','doorWidth','doorHeight','payload']){const n=packingNum(raw[k]);if(n===null||n<=0||n>(k==='payload'?100000:20000))throw Error('Enter valid container '+k+' (mm for dimensions, kg for payload).');c[k]=n;}
 if(c.doorWidth>c.width||c.doorHeight>c.height)throw Error('Door opening cannot exceed the inside width or height.');
 c.clearance=packingNum(raw.clearance)??0;if(c.clearance<0||c.clearance>500)throw Error('Wall clearance must be between 0 and 500 mm.');
 if(c.length<=2*c.clearance||c.width<=2*c.clearance||c.height<=c.clearance)throw Error('Clearance leaves no usable container space.');
 return c;
}
export function packingOrientations(row){
 const {length:l,width:w,height:h}=row,options=row.rotation==='FREE'?[[l,w,h],[w,l,h],[l,h,w],[h,l,w],[w,h,l],[h,w,l]]:row.rotation==='FIXED'?[[l,w,h]]:[[l,w,h],[w,l,h]];
 return [...new Map(options.map(d=>[d.join(','),d])).values()];
}
export function packingRows(raw){
 if(!Array.isArray(raw)||raw.length>PACKING_LIMITS.rows)throw Error('Use at most '+PACKING_LIMITS.rows+' package lines per calculation.');
 const seen=new Set();let totalQuantity=0;
 return raw.map((r,index)=>{
  const id=String(r.id||'');if(!id||seen.has(id))throw Error('Package line identities must be unique.');seen.add(id);
  const row={...r,id,index,pending:[],rotation:r.rotation||'UPRIGHT'};
  row.quantity=packingNum(r.quantity);row.unitsPerPackage=packingNum(r.unitsPerPackage);
  if(!Number.isSafeInteger(row.quantity)||row.quantity<=0)throw Error('Enter a positive whole planned quantity for '+(r.code||id)+'.');
  totalQuantity+=row.quantity;if(!Number.isSafeInteger(totalQuantity))throw Error('Combined planned quantity exceeds the safe whole-count range.');
  if(!Number.isSafeInteger(row.unitsPerPackage)||row.unitsPerPackage<=0){row.pending.push('Units per package needed');row.packages=null;}else row.packages=Math.ceil(row.quantity/row.unitsPerPackage);
  for(const key of ['length','width','height']){row[key]=packingNum(r[key]);if(row[key]===null||row[key]<=0||row[key]>20000)row.pending.push(key+' needed (outer mm)');}
  row.weight=packingNum(r.weight);if(row.weight!==null&&(row.weight<=0||row.weight>100000))throw Error('Gross package weight must be positive, or leave it blank if unknown.');
  row.maxLayers=packingNum(r.maxLayers);if(!Number.isSafeInteger(row.maxLayers)||row.maxLayers<1||row.maxLayers>100)row.pending.push('Maximum stack layers needed (1 = no stacking)');
  row.topLoad=packingNum(r.topLoad);if(row.topLoad!==null&&(row.topLoad<0||row.topLoad>100000))throw Error('Load supported above a package must be zero or positive.');
  if(!['UPRIGHT','FIXED','FREE'].includes(row.rotation))throw Error('Unsupported rotation rule.');
  return row;
 });
}
function packingAttempt(container,rows,sortKey,split){
 const gap=container.clearance,c={...container,length:container.length-gap*2,width:container.width-gap*2,height:container.height-gap};
 const free=[{x:gap,z:gap,l:c.length,w:c.width}],boxes=[],counts=new Map();let weight=0,volume=0,units=0;
 const valid=rows.filter(r=>!r.pending.length).slice();
 const score=r=>sortKey==='volume'?r.length*r.width*r.height:sortKey==='area'?r.length*r.width:sortKey==='weight'?(r.weight??0):r.packages;
 valid.sort((a,b)=>score(b)-score(a)||a.index-b.index);
 for(const row of valid){
  let remaining=row.packages,placed=0;const choices=packingOrientations(row).filter(([l,w,h])=>l<=c.length&&w<=Math.min(c.width,container.doorWidth)&&h<=Math.min(c.height,container.doorHeight));
  while(remaining>0&&boxes.length<PACKING_LIMITS.packages){
   let best=null;
   for(let fi=0;fi<free.length;fi++)for(const [l,w,h] of choices){const space=free[fi];if(l>space.l||w>space.w)continue;
    // Full support: vertical columns contain the same SKU and orientation only.
    let layers=Math.min(remaining,row.maxLayers,Math.floor(c.height/h),PACKING_LIMITS.packages-boxes.length);
    if(row.weight!=null){layers=Math.min(layers,Math.floor((container.payload-weight+1e-7)/row.weight));if(row.topLoad!=null)layers=Math.min(layers,Math.floor(row.topLoad/row.weight)+1);}
    else if(row.maxLayers>1)layers=1; // Unknown weight cannot establish stack loading.
    if(layers<1)continue;
    const waste=space.l*space.w-l*w,rank=[-layers,waste,space.x,space.z];
    if(!best||rank.some((v,i)=>v!==best.rank[i]&&rank.slice(0,i).every((x,j)=>x===best.rank[j])&&v<best.rank[i]))best={fi,l,w,h,layers,rank};
   }
   if(!best)break;
   const {fi,l,w,h,layers}=best,space=free.splice(fi,1)[0];
   for(let y=0;y<layers;y++){const qty=Math.min(row.unitsPerPackage,row.quantity-placed*row.unitsPerPackage);boxes.push({id:row.id+':'+placed,rowId:row.id,index:row.index,x:space.x,y:y*h,z:space.z,length:l,width:w,height:h,quantity:qty,weight:row.weight,layer:y+1});placed++;weight+=row.weight??0;volume+=l*w*h;units+=qty;}
   remaining-=layers;
   // Disjoint guillotine floor partitions keep collision checks exact and bounded.
   const pieces=split?[{x:space.x+l,z:space.z,l:space.l-l,w:space.w},{x:space.x,z:space.z+w,l,w:space.w-w}]:[{x:space.x+l,z:space.z,l:space.l-l,w},{x:space.x,z:space.z+w,l:space.l,w:space.w-w}];
   free.push(...pieces.filter(s=>s.l>0&&s.w>0));
  }
  counts.set(row.id,{placed,reason:remaining?(!choices.length?'Package does not fit the container or door in an allowed orientation':boxes.length>=PACKING_LIMITS.packages?'Calculation limit reached; split into another container':row.weight!=null&&weight+row.weight>container.payload?'Payload limit reached':'No supported space under these stacking rules'):''});
 }
 boxes.sort((a,b)=>a.x-b.x||a.y-b.y||a.z-b.z||a.index-b.index);boxes.forEach((b,i)=>b.sequence=i+1);
 return {boxes,counts,weight,volume,units,strategy:sortKey+' / '+(split?'length':'width')};
}
export function solvePacking(rawContainer,rawRows){
 const container=packingContainer(rawContainer),rows=packingRows(rawRows);let best=null;
 for(const sort of ['volume','area','weight','count'])for(const split of [false,true]){const attempt=packingAttempt(container,rows,sort,split);if(!best||attempt.volume>best.volume||attempt.volume===best.volume&&attempt.units>best.units)best=attempt;}
 const resultRows=rows.map(r=>{const count=best.counts.get(r.id)||{placed:0,reason:r.pending.join('; ')},loadedUnits=Math.min(r.quantity,count.placed*(r.unitsPerPackage||0));return {...r,placed:count.placed,loadedUnits,remainingUnits:r.quantity-loadedUnits,reason:count.reason};});
 const unknownWeight=best.boxes.filter(b=>b.weight===null).length;
 const totalVolume=container.length*container.width*container.height;
 const balance=unknownWeight||best.weight===0?null:best.boxes.reduce((a,b)=>({x:a.x+(b.x+b.length/2)*b.weight,y:a.y+(b.y+b.height/2)*b.weight,z:a.z+(b.z+b.width/2)*b.weight}),{x:0,y:0,z:0});
 return {version:1,container,rows:resultRows,boxes:best.boxes,strategy:best.strategy,attempts:8,loadedUnits:best.units,remainingUnits:rows.reduce((n,r)=>n+r.quantity,0)-best.units,volumeM3:best.volume/1e9,volumePercent:best.volume/totalVolume*100,knownWeight:best.weight,unknownWeight,payloadPercent:unknownWeight?null:best.weight/container.payload*100,centreOfMass:balance?Object.fromEntries(Object.entries(balance).map(([k,v])=>[k,v/best.weight])):null};
}

/** Stable contract for the item-master team; no free-text dimension guessing. */
export function packingPlanRows(group,state){
 return group.members.filter(({s})=>s.status!=='CANCELLED').flatMap(({o,s})=>s.lines.map(sl=>{
  const line=o.lines.find(l=>l.id===sl.lineId)||{id:sl.lineId,code:'Unresolved PO item',description:'Original PO line unavailable — review the source plan'};
  // Stable original identity is authoritative; a reused code is not packing evidence.
  const item=typeof line.itemId==='string'&&line.itemId.trim()?state.items.find(i=>i.id===line.itemId):null,p=item?.loadingPackage||{};
  return {id:JSON.stringify([o.id,s.id,line.id]),orderId:o.id,shipmentId:s.id,lineId:line.id,itemId:item?.id||line.itemId||'',code:line.code,name:line.description||line.name||item?.name||line.code,po:o.number,supplier:state.vendors?.find(v=>v.id===o.vendorId)?.name||'',quantity:sl.quantity,unitsPerPackage:p.unitsPerPackage??'',length:p.lengthMm??'',width:p.widthMm??'',height:p.heightMm??'',weight:p.grossWeightKg??'',maxLayers:p.maxLayers??1,topLoad:p.maxTopLoadKg??'',rotation:p.rotation||'UPRIGHT',dimensionSource:item?.loadingPackage?'Item master':'Not entered'};
 }).filter(Boolean));
}
export function packingPlanSignature(rows){return JSON.stringify(rows.map(r=>[r.id,r.quantity,r.itemId]));}
