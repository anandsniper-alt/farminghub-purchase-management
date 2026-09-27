// Read-only reporting. Recorded tasks and audit events remain the source of truth.
export function taskDay(value=new Date()){
 if(!value)return '';
 if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
export function taskState(t,day=taskDay()){
 if(t.createdAt&&taskDay(t.createdAt)>day)return 'NOT_CREATED';
 if(t.completedAt&&taskDay(t.completedAt)<=day)return t.systemClosed?'SYSTEM_CLOSED':'COMPLETED';
 return !t.due?'UNSCHEDULED':t.due<day?'OVERDUE':t.due===day?'TODAY':'UPCOMING';
}
export function taskDailySummary(rows,day=taskDay()){
 const eligible=rows.filter(({t})=>taskState(t,day)!=='NOT_CREATED'&&taskState(t,day)!=='SYSTEM_CLOSED');
 const planned=eligible.filter(({t})=>t.due===day);
 const onTime=planned.filter(({t})=>t.completedAt&&taskDay(t.completedAt)<=t.due);
 const done=eligible.filter(({t})=>t.completedAt&&taskDay(t.completedAt)===day);
 const pending=eligible.filter(({t})=>['TODAY','OVERDUE'].includes(taskState(t,day)));
 return {planned:planned.length,onTime:onTime.length,completed:done.length,pending:pending.length,overdue:pending.filter(({t})=>t.due<day).length,rating:planned.length?Math.round(onTime.length/planned.length*100):null};
}
export function taskBrandSummary(order){
 const groups=new Map();for(const l of order.lines||[]){const brand=l.brandPrefix||l.brand||'Unspecified brand';let group=groups.get(brand);if(!group){group={brand,quantity:0,items:[]};groups.set(brand,group);}group.quantity+=Number(l.quantity)||0;group.items.push({code:l.code||'',name:l.name||'',quantity:l.quantity});}return [...groups.values()];
}
export function taskEfforts(events,orderIds,day){
 const ids=new Set(orderIds);return (events||[]).filter(e=>e.entityType==='order'&&ids.has(e.entityId)&&['FOLLOWUP_COMPLETED','INTERACTION'].includes(e.action)&&taskDay(e.at)===day);
}
export function taskMatches(t,status,day){
 const s=taskState(t,day);if(s==='NOT_CREATED')return false;
 if(status==='ALL')return true;
 if(status==='OPEN')return !['COMPLETED','SYSTEM_CLOSED'].includes(s);
 if(status==='PLAN')return t.due===day&&s!=='SYSTEM_CLOSED';
 if(status==='ONTIME')return t.due===day&&s==='COMPLETED'&&taskDay(t.completedAt)<=t.due;
 if(status==='DONE_TODAY')return s==='COMPLETED'&&taskDay(t.completedAt)===day;
 if(status==='PENDING')return ['TODAY','OVERDUE'].includes(s);
 return s===status;
}
