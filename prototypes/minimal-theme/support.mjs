// Local, read-only guidance. Never invoke application actions or infer approval rights.
const launcher=document.querySelector('.support-launcher'),tour=document.querySelector('.support-tour'),card=tour.querySelector('.support-card'),ring=tour.querySelector('.support-ring'),motion=matchMedia('(prefers-reduced-motion: reduce)');
const title=tour.querySelector('#support-title'),copy=tour.querySelector('#support-copy'),count=tour.querySelector('.support-count'),next=tour.querySelector('[data-support=next]'),back=tour.querySelector('[data-support=back]');
const step=(selector,title,text)=>({selector,title,text});
const mascot=tour.querySelector('.support-mascot'),poses=window.FH_GUIDE_POSES;
const dock=document.querySelector('.support-dock'),take=tour.querySelector('[data-support=take]');
// Decode the embedded poses once so repeat guide steps reuse the browser cache.
for(const pose of Object.values(poses)){const img=new Image();img.src=pose.src;img.decode().catch(()=>{});}
const common=[step('.page-head','Start with this page','The heading tells you where you are. I will point out the controls available in your current view.'),step('main .toolbar','Narrow your view','Use the available filters to find the records you need. Filtering changes what you see, not the saved records.'),step('main .tabs','Explore the sections','These tabs group related information. Close this guide to switch sections, then choose Guide me for help in that view.'),step('main .table-wrap','Review the records','Read the column headings and scroll sideways on a narrow screen to see all columns. Open a record using its available link or action.')];
const routes={
 orders:[step('.page-head','Let’s find your purchase order','I’m your Farming Hub guide. We’ll find a supplier, sort the pipeline and locate an order. Nothing is saved or submitted during this tour.'),step('#view-search','1. Find an order','Search by PO number, serial, supplier or item. Clear the search to see the full list again.'),step('#order-supplier','2. Choose a supplier','Select a supplier to view their purchase orders. All suppliers removes this filter.'),step('#status-filter','3. Focus on a stage','Choose a workflow stage to narrow the list further. Supplier, stage and search filters work together.'),step('#order-sort','4. Set the order','Sort by supplier, permanent S.No. or PO number. S.No. stays with its order; deleting a PO never renumbers the others.'),step('main .table-wrap, main .board','5. Review a purchase order','Open a purchase order from the list to see its current stage, documents and available actions. On mobile, scroll the table sideways for more columns.'),step('[data-action=new-order]','6. Create when you’re ready','Create purchase order opens the entry form. Required fields and validations still apply. Finish this guide before using the form.')],
 order:[step('.page-head','Your purchase order, step by step','Start by checking the PO number and supplier. This guide explains the controls currently visible; it does not complete the order for you.'),step('.current-stage-card','1. Check the current stage','This card shows where the order stands and the available next action. Follow the actual readiness messages; approvals depend on your access and configured controls.'),step('.preview-workflow>summary','2. See the full workflow','Expand View all workflow stages to see the sequence. Looking at a stage does not mark it complete.'),step('.detail-summary','3. Check the order details','Review the displayed quantities, dates and commercial values against the order before proceeding.'),step('main .tabs','4. Review the supporting sections','Use the tabs to inspect the order’s related information. Close the guide to change tabs and reopen it for help.'),step('.preview-actions>summary','5. Find additional actions','Expand More actions for the actions available to you. Read each form and confirmation before saving; the guide never grants extra permissions.')],
 overview:[step('.page-head','A quick tour of your workspace','I’m your Farming Hub guide. Let’s look at the key information on this page, one step at a time.'),step('.kpi-grid','1. Scan the totals','These cards summarize the visible purchase activity. They are a starting point for review, not a substitute for the order details.'),step('.pipeline-bars','2. Check the pipeline','See how many orders sit in each displayed group. Open Order pipeline to inspect individual orders.'),step('.flag-row','3. Follow up on flags','Review the flagged item and open its order to see the dates or missing work behind the alert.'),step('[data-action=new-order]','4. Start a purchase order','Use Create purchase order when you are ready to enter a new order. The form checks the required information before saving.')],
 settings:[step('.page-head','Understand your access settings','Only controls available in your current role are included. This tour does not change users or approval permissions.'),step('[data-action=create-user]','Create a user','Use this action to enter a new user’s details. Review the role and scope carefully before saving.'),step('[data-action=approval-controls]','Maintain approval controls','Review each approval stage and its allowed roles. Changes need a reason and explicit confirmation; use the actual form to review their impact.'),step('main .table-wrap','Review existing records','Review the displayed users or settings. Use an available Edit or role action when a change is needed; the tour leaves every value as it is.')],
 payments:[step('.page-head','Review payments with care','Use this page to review payment records and balances. Recording a payment here does not send money through a bank.'),step('.kpi-grid','1. Check the totals','Review the displayed payment and balance summaries, then inspect the supporting entries.'),step('main .table-wrap','2. Read the entries','Check the purchase order, dates, currency and amounts before taking any action.'),step('[data-action=payment]','3. Record with evidence','Use Record payment only when the details are ready. Follow the actual form, required evidence and authorization checks.')]
};
let steps=[],index=0,target=null,animation=null,returnFocus=null,frame=0,focusAfterClose=null;
function visible(el){return !!el&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';}
function resolve(selector){return [...document.querySelectorAll(selector)].find(visible);}
const getTarget=s=>s.target?.isConnected&&visible(s.target)?s.target:s.selector?resolve(s.selector):null;
const direct=(target,title,text)=>({target,title,text});
const label=el=>(el.labels?.[0]?.textContent||el.getAttribute('aria-label')||el.name||'this field').replace(/\s+/g,' ').replace(/\*\s*$/,'').trim().slice(0,100);
function formSteps(modal){
 const fields=[...modal.querySelectorAll('input,select,textarea')].filter(e=>visible(e)&&!e.disabled&&e.type!=='hidden'),invalid=fields.filter(e=>e.willValidate&&!e.validity.valid),error=resolve('#modal-error.visible'),items=[];
 if(error)items.push(direct(error,'Resolve this message first',error.textContent.trim().slice(0,500)+' Read the message, then correct the related field. No values are changed by this guide.'));
 for(const field of invalid.slice(0,8))items.push(direct(field,'Next: '+label(field),field.type==='checkbox'?'Review the statement beside this checkbox. Check it only if you agree before submitting.':field.type==='file'?'Choose the required evidence for this form. Each attachment can be up to 50 MB; follow the displayed file-type rules.':(field.validationMessage||'Complete this required field.')+' Select Take me there to return to the field.'));
 if(!items.length)items.push(direct(modal.querySelector('.modal-head'),'Review '+(modal.querySelector('h2')?.textContent||'this form'),'The visible fields have no browser validation errors. Review the details and evidence; server-side rules still apply when you submit.'));
 const action=modal.querySelector('.modal-foot [type=submit]')||modal.querySelector('.modal-foot button');
 if(action)items.push(direct(action,action.type==='submit'?'Then: '+action.textContent.trim():'Return to the page',invalid.length?'Finish the highlighted fields, then review the form and choose the action yourself. Submitting may change the record; this guide never submits for you.':'Use this action when you are ready. Read any confirmation and required evidence before submitting. The guide does not perform the action.'));
 return items;
}
function pageSteps(){
 const view=location.hash.split('/')[1],base=(routes[view]||common).filter(s=>getTarget(s));
 if(view!=='order')return base;
 const action=resolve('main .head-actions .button.primary'),stage=resolve('.current-stage-card');
 if(action)return [direct(action,'Next: '+action.textContent.trim(),'This is the next action currently offered for this order and role. Select Take me there to return to it, review the required details and evidence, then choose the action yourself. The guide does not approve or update the order.'),...base.filter(s=>s.selector!=='.page-head')];
 if(stage)return [direct(stage,'Review the current stage','No primary next-action button is available in this view. Check the current stage and relevant tab; the next action may need another authorized user or additional evidence. Follow your current configured controls.'),...base.filter(s=>!['.page-head','.current-stage-card'].includes(s.selector))];
 return base;
}
function placeDock(){(tour.open?tour:document.body).append(dock);launcher.hidden=false;launcher.setAttribute('aria-expanded',String(tour.open));}
function position(){
 if(!tour.open||!target?.isConnected)return;
 const r=target.getBoundingClientRect(),c=card.getBoundingClientRect();
 // Dock opposite the target on desktop; mobile keeps a compact bottom sheet.
 card.classList.toggle('support-left',innerWidth>720&&r.right>innerWidth-420&&r.bottom>innerHeight-c.height-36);
 const top=Math.max(4,r.top),left=Math.max(4,r.left),right=Math.min(innerWidth-4,r.right),bottom=Math.min(innerHeight-4,r.bottom);
 ring.hidden=right<=left||bottom<=top;
 Object.assign(ring.style,{left:left-3+'px',top:top-3+'px',width:Math.max(0,right-left)+6+'px',height:Math.max(0,bottom-top)+6+'px'});
}
function show(){
 target=getTarget(steps[index]);if(!target){close();return;}
 const pose=index===0?'welcome':index===steps.length-1?'ready':'pointing';
 mascot.src=poses[pose].src;mascot.alt=poses[pose].alt;mascot.dataset.pose=pose;
 title.textContent=steps[index].title;copy.textContent=steps[index].text;count.textContent=`Step ${index+1} of ${steps.length}`;back.disabled=index===0;next.textContent=index===steps.length-1?'Finish':'Next';
 target.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
 if(innerWidth<=720){const r=target.getBoundingClientRect(),ceiling=card.getBoundingClientRect().top-18;if(r.bottom>ceiling)window.scrollBy({top:r.bottom-ceiling,behavior:'instant'});}
 position();animation?.cancel();if(!motion.matches)animation=card.animate([{opacity:.4,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:220,easing:'ease-out'});
 next.focus({preventScroll:true});
}
function close(){if(tour.open)tour.close();}
function availability(){launcher.hidden=false;if(tour.open&&(!target?.isConnected||!visible(target)))close();}
launcher.addEventListener('click',()=>{
 if(tour.open){close();return;}
 const modal=document.querySelector('#modal-root .modal');steps=modal?formSteps(modal):pageSteps();
 if(!steps.length){const login=resolve('.login-card,.boot');if(login)steps=[direct(login,'Start here','Use your assigned sign-in details to open the workspace. Ask your administrator for access if needed. Never share your password in a help request.')];}
 if(!steps.length)return;returnFocus=launcher;index=0;tour.showModal();placeDock();show();
});
tour.addEventListener('click',event=>{const action=event.target.closest('[data-support]')?.dataset.support;if(action==='close')close();else if(action==='take'){focusAfterClose=target;close();}else if(action==='next'){if(index===steps.length-1)close();else{index++;show();}}else if(action==='back'&&index>0){index--;show();}});
// Keep the application's global Escape handler from closing an unrelated app modal.
tour.addEventListener('keydown',event=>{
 if(event.key==='Escape')event.stopPropagation();
 if(event.key==='Tab'){
  const buttons=[...tour.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }
});
tour.addEventListener('close',()=>{animation?.cancel();ring.hidden=true;target=null;placeDock();const focus=focusAfterClose?.isConnected?focusAfterClose:returnFocus;focusAfterClose=null;if(focus?.isConnected){focus.scrollIntoView({block:'nearest',behavior:'instant'});if(!focus.matches('input,select,textarea,button,a,[tabindex]'))focus.setAttribute('tabindex','-1');focus.focus({preventScroll:true});}});
tour.addEventListener('toggle',()=>launcher.setAttribute('aria-expanded',String(tour.open)));
function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;position();});}
addEventListener('resize',schedule);addEventListener('scroll',schedule,true);addEventListener('hashchange',close);
new MutationObserver(()=>{availability();if(tour.open&&!target?.isConnected)close();}).observe(document.querySelector('#app'),{childList:true,subtree:true});
new MutationObserver(availability).observe(document.querySelector('#modal-root'),{childList:true,subtree:true});
// Extend the existing form focus loop to include the always-visible help launcher.
document.addEventListener('keydown',event=>{if(tour.open||event.key!=='Tab')return;const modal=document.querySelector('#modal-root .modal');if(!modal)return;const controls=[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')].filter(visible),first=controls[0],last=controls.at(-1);if(document.activeElement===launcher){event.preventDefault();event.stopImmediatePropagation();(event.shiftKey?last:first)?.focus();}else if((event.shiftKey&&document.activeElement===first)||(!event.shiftKey&&document.activeElement===last)){event.preventDefault();event.stopImmediatePropagation();launcher.focus();}},true);
motion.addEventListener('change',()=>{if(motion.matches)animation?.cancel();});placeDock();availability();
