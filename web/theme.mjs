export function mountTheme(){
// Minimal is the product standard. App supplies the current login's saved preference.
const body=document.body,reduced=matchMedia('(prefers-reduced-motion: reduce)');
let guides=body.dataset.previewGuides==='on',lastView='',lastMain=null,lastModal=null,scheduled=false;
const activeMotion=new Map(),motion=window.gsap;
// HIG R009-R013, R100-R118: shared web semantics and recoverable dialogs.
let dialogOpen=false,dialogDirty=false,dialogSnapshot='',returnFocus=null,allowDiscard=false;
const formSnapshot=()=>JSON.stringify([...document.querySelectorAll('#dialog-form input,#dialog-form select,#dialog-form textarea')].map(el=>[el.name,el.value,el.checked,...(el.files?[...el.files].map(f=>[f.name,f.size,f.lastModified]):[])]));
const hasDialogChanges=()=>dialogOpen&&(dialogDirty||formSnapshot()!==dialogSnapshot);
const visible=el=>el.getClientRects().length&&!el.closest('[inert]');
const focusables=box=>[...box.querySelectorAll('button:not(:disabled),input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),a[href],summary,[tabindex="0"]')].filter(visible);
function labelRegions(root){
 for(const [i,field] of [...root.querySelectorAll('.field')].entries()){
  const control=field.querySelector('input,select,textarea'),caption=field.querySelector('label,span');
  if(!control)continue;
  if(!control.id)control.id='fh-field-'+(root.matches('.modal')?'dialog':'page')+'-'+i;
  if(caption?.tagName==='LABEL')caption.htmlFor=control.id;
  else if(caption&&!control.getAttribute('aria-label')){caption.id=control.id+'-label';control.setAttribute('aria-labelledby',caption.id);}
  const hint=field.querySelector('small');if(hint){hint.id=control.id+'-hint';control.setAttribute('aria-describedby',hint.id);}
 }
 for(const region of root.querySelectorAll('.table-wrap,.po-sheet-scroll')){
  region.tabIndex=0;region.setAttribute('role','region');
  if(!region.hasAttribute('aria-label'))region.setAttribute('aria-label',(region.closest('.panel')?.querySelector('h2')?.textContent||'Data table')+' — scroll for more columns');
 }
 for(const th of root.querySelectorAll('thead th'))if(!th.hasAttribute('scope'))th.scope='col';
}
function askToDiscard(){
 const modal=document.querySelector('#modal-root .modal');if(!modal)return;
 let notice=modal.querySelector('.unsaved-notice');
 if(!notice){notice=document.createElement('div');notice.className='unsaved-notice';notice.setAttribute('role','alert');notice.innerHTML='<strong>Discard unsaved changes?</strong><p>Your entries have not been saved.</p><div><button type="button" class="button primary" data-hig-keep>Keep editing</button><button type="button" class="button danger" data-hig-discard>Discard changes</button></div>';modal.querySelector('.modal-head').after(notice);}
 notice.querySelector('[data-hig-keep]').focus();
}
document.addEventListener('focusin',e=>{if(!dialogOpen&&!e.target.closest('#modal-root'))returnFocus=e.target;});
for(const event of ['input','change'])document.addEventListener(event,e=>{if(e.target.closest('#dialog-form')&&e.target.name)dialogDirty=true;},true);
document.addEventListener('click',e=>{
 const target=e.target.closest('button,a');if(!target)return;
 if(target.matches('[data-hig-keep]')){const modal=target.closest('.modal');target.closest('.unsaved-notice').remove();(modal.querySelector('input:not([type=hidden]),select,textarea')||modal.querySelector('[data-action=close]')).focus();return;}
 if(target.matches('[data-hig-discard]')){dialogDirty=false;allowDiscard=true;document.querySelector('#modal-root [data-action=close]').click();allowDiscard=false;return;}
 if(target.closest('#modal-root')&&target.dataset.action==='close'&&hasDialogChanges()&&!allowDiscard){e.preventDefault();e.stopImmediatePropagation();askToDiscard();}
},true);
document.addEventListener('keydown',e=>{
 const modal=document.querySelector('#modal-root .modal');if(!modal||document.querySelector('#support-tour[open],#domestic-inline-picture'))return;
 if(e.key==='Escape'&&hasDialogChanges()){e.preventDefault();e.stopImmediatePropagation();askToDiscard();return;}
 if(e.key==='Tab'){const controls=focusables(modal),first=controls[0],last=controls.at(-1);if(!first)return;
  if(e.shiftKey&&(document.activeElement===first||!controls.includes(document.activeElement))){e.preventDefault();e.stopImmediatePropagation();last.focus();}
  else if(!e.shiftKey&&(document.activeElement===last||!controls.includes(document.activeElement))){e.preventDefault();e.stopImmediatePropagation();first.focus();}
 }
},true);
window.addEventListener('beforeunload',e=>{if(hasDialogChanges()){e.preventDefault();e.returnValue='';}});
function access(main,modal){
 if(main){main.id='main-content';main.tabIndex=-1;labelRegions(main);if(!document.querySelector('.skip-link')){const skip=document.createElement('a');skip.className='skip-link';skip.href='#main-content';skip.textContent='Skip to content';skip.addEventListener('click',e=>{e.preventDefault();document.querySelector('main.content')?.focus();});document.body.prepend(skip);}}
 if(modal){labelRegions(modal);if(!dialogOpen){dialogOpen=true;dialogDirty=false;dialogSnapshot=formSnapshot();document.querySelector('#app').inert=true;document.body.classList.add('dialog-open');const title=modal.querySelector('h2');title.tabIndex=-1;title.focus({preventScroll:true});}}
 else if(dialogOpen){dialogOpen=false;dialogDirty=false;document.querySelector('#app').inert=false;document.body.classList.remove('dialog-open');(returnFocus?.isConnected?returnFocus:document.querySelector('main.content'))?.focus({preventScroll:true});}
 const error=document.querySelector('#modal-error.visible');if(error&&error.textContent&&error.dataset.announced!==error.textContent){error.dataset.announced=error.textContent;error.tabIndex=-1;error.focus();error.scrollIntoView({block:'nearest'});}
}
function stopMotion(){for(const context of activeMotion.values())context.revert();activeMotion.clear();}
function animate(el,kind='page'){
 // GSAP is locally bundled. A missing asset must never block the application.
 if(!el||reduced.matches||!motion)return;
 activeMotion.get(el)?.revert();
 const context=motion.context(()=>motion.fromTo(el,
  {opacity:kind==='modal'?0:.15,y:kind==='reveal'?6:12,scale:kind==='modal'?.985:1},
  {opacity:1,y:0,scale:1,duration:kind==='page'?.28:kind==='modal'?.24:.22,ease:'power2.out',
   onComplete:()=>{if(activeMotion.get(el)===context){activeMotion.delete(el);context.revert();}}}
 ));
 activeMotion.set(el,context);
}
function headings(){const h=document.querySelector('.page-head h1');if(h&&(h.textContent==='Every order. One clear view.'||h.dataset.previewTitle))h.textContent='Overview';}
function applyGuides(){guides=body.dataset.previewGuides==='on';body.dataset.previewTheme='minimal';for(const d of document.querySelectorAll('.preview-guidance'))d.open=guides;}
function enhance(){scheduled=false;for(const [el,context] of activeMotion)if(!el.isConnected){context.revert();activeMotion.delete(el);}const main=document.querySelector('main.content'),modal=document.querySelector('#modal-root .modal');access(main!==lastMain?main:null,modal);if(main&&main!==lastMain){lastMain=main;headings();const track=main.querySelector('.progress-track');if(track&&!track.closest('.preview-workflow')){const wrapper=document.createElement('details');wrapper.className='preview-workflow';const summary=document.createElement('summary');summary.textContent='View all workflow stages';track.before(wrapper);wrapper.append(summary,track);wrapper.open=true;}
 for(const note of main.querySelectorAll('.note-box.blue'))if(note.textContent.length>160&&!note.closest('.preview-guidance')&&!note.querySelector('button,input,a')){const wrapper=document.createElement('details');wrapper.className='preview-guidance';const summary=document.createElement('summary');summary.textContent='Guidance';note.before(wrapper);wrapper.append(summary,note);wrapper.open=guides;}
 for(const title of main.querySelectorAll('.panel-head h2'))if(title.textContent==='Quick actions'&&!title.closest('.preview-actions')){const panel=title.closest('.panel'),wrapper=document.createElement('details'),summary=document.createElement('summary');wrapper.className='preview-actions';summary.textContent='More actions';panel.before(wrapper);wrapper.append(summary,panel);wrapper.open=false;}
 const key=location.hash+'|'+[...main.querySelectorAll('.tab.active,.tabs .active')].map(e=>e.dataset.value).join('|');if(key!==lastView){lastView=key;animate(main);}}
 if(modal&&modal!==lastModal){lastModal=modal;animate(modal,'modal');}else if(!modal)lastModal=null;
}
window.addEventListener('fh-personal-preferences',applyGuides);
document.querySelector('#app').addEventListener('toggle',event=>{const details=event.target;if(details.matches?.('.preview-workflow,.preview-guidance,.preview-actions')&&details.open)animate(details.lastElementChild,'reveal');},true);
new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(enhance);}}).observe(document.querySelector('#app'),{childList:true,subtree:true});
new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(enhance);}}).observe(document.querySelector('#modal-root'),{childList:true,subtree:true});
reduced.addEventListener('change',()=>{if(reduced.matches)stopMotion();});applyGuides();enhance();
}
