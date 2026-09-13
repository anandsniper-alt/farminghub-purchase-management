export function mountTheme(){
// Minimal is the product standard. App supplies the current login's saved preference.
const body=document.body,reduced=matchMedia('(prefers-reduced-motion: reduce)');
let guides=body.dataset.previewGuides==='on',lastView='',lastMain=null,lastModal=null,scheduled=false;
const activeMotion=new Map();
function stopMotion(){for(const animation of activeMotion.values())animation.cancel();activeMotion.clear();}
function animate(el,kind='page'){
 if(!el||reduced.matches)return;
 activeMotion.get(el)?.cancel();
 const frames=kind==='modal'?[{opacity:0,transform:'translateY(12px) scale(.985)'},{opacity:1,transform:'none'}]:[{opacity:.15,transform:kind==='reveal'?'translateY(6px)':'translateY(12px)'},{opacity:1,transform:'none'}];
 const animation=el.animate(frames,{duration:kind==='page'?280:kind==='modal'?240:220,easing:'cubic-bezier(.2,.7,.2,1)'});
 activeMotion.set(el,animation);animation.finished.catch(()=>{}).finally(()=>{if(activeMotion.get(el)===animation)activeMotion.delete(el);});
}
function headings(){const h=document.querySelector('.page-head h1');if(h&&(h.textContent==='Every order. One clear view.'||h.dataset.previewTitle))h.textContent='Overview';}
function applyGuides(){guides=body.dataset.previewGuides==='on';body.dataset.previewTheme='minimal';for(const d of document.querySelectorAll('.preview-guidance'))d.open=guides;}
function enhance(){scheduled=false;const main=document.querySelector('main.content'),modal=document.querySelector('#modal-root .modal');if(main&&main!==lastMain){lastMain=main;headings();const track=main.querySelector('.progress-track');if(track&&!track.closest('.preview-workflow')){const wrapper=document.createElement('details');wrapper.className='preview-workflow';const summary=document.createElement('summary');summary.textContent='View all workflow stages';track.before(wrapper);wrapper.append(summary,track);wrapper.open=true;}
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
