export function mountTheme(){
﻿// Approved presentation layer; business actions remain in the application.
const body=document.body,strip=document.querySelector('.theme-lab'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let savedTheme;try{savedTheme=localStorage.getItem('fh-appearance-style');}catch{}
let theme=['minimal','current'].includes(savedTheme)?savedTheme:'minimal',guides=false,lastView='',lastMain=null,lastModal=null,scheduled=false;
const activeMotion=new Map();
function stopMotion(){for(const animation of activeMotion.values())animation.cancel();activeMotion.clear();}
function animate(el,kind='page'){
 if(!el||theme!=='minimal'||reduced.matches)return;
 activeMotion.get(el)?.cancel();
 const frames=kind==='modal'?[{opacity:0,transform:'translateY(12px) scale(.985)'},{opacity:1,transform:'none'}]:[{opacity:.15,transform:kind==='reveal'?'translateY(6px)':'translateY(12px)'},{opacity:1,transform:'none'}];
 const animation=el.animate(frames,{duration:kind==='page'?280:kind==='modal'?240:220,easing:'cubic-bezier(.2,.7,.2,1)'});
 activeMotion.set(el,animation);animation.finished.catch(()=>{}).finally(()=>{if(activeMotion.get(el)===animation)activeMotion.delete(el);});
}
function replayState(){const replay=strip.querySelector('.theme-replay');if(!replay)return;replay.disabled=theme==='current'||reduced.matches;replay.title=reduced.matches?'Animations disabled by your reduced-motion preference':'Replay the page entrance';}
function headings(){const h=document.querySelector('.page-head h1');if(h&&(h.textContent==='Every order. One clear view.'||h.dataset.previewTitle)){h.dataset.previewTitle='Every order. One clear view.';h.textContent=theme==='minimal'?'Overview':h.dataset.previewTitle;}}
function apply(){headings();body.dataset.previewTheme=theme;body.dataset.previewGuides=guides?'on':'off';for(const b of strip.querySelectorAll('[data-theme]'))b.setAttribute('aria-pressed',String(b.dataset.theme===theme));const help=strip.querySelector('.theme-guide');help.setAttribute('aria-pressed',String(guides));help.textContent=guides?'Hide page guides':'Show page guides';help.disabled=theme==='current';for(const d of document.querySelectorAll('.preview-workflow,.preview-guidance,.preview-actions'))d.open=d.classList.contains('preview-workflow')||theme==='current'||(guides&&d.classList.contains('preview-guidance'));}
function enhance(){scheduled=false;const main=document.querySelector('main.content'),modal=document.querySelector('#modal-root .modal');if(main&&main!==lastMain){lastMain=main;headings();const track=main.querySelector('.progress-track');if(track&&!track.closest('.preview-workflow')){const wrapper=document.createElement('details');wrapper.className='preview-workflow';const summary=document.createElement('summary');summary.textContent='View all workflow stages';track.before(wrapper);wrapper.append(summary,track);wrapper.open=true;}
 for(const note of main.querySelectorAll('.note-box.blue'))if(note.textContent.length>160&&!note.closest('.preview-guidance')&&!note.querySelector('button,input,a')){const wrapper=document.createElement('details');wrapper.className='preview-guidance';const summary=document.createElement('summary');summary.textContent='Guidance';note.before(wrapper);wrapper.append(summary,note);wrapper.open=theme==='current'||guides;}
 for(const title of main.querySelectorAll('.panel-head h2'))if(title.textContent==='Quick actions'&&!title.closest('.preview-actions')){const panel=title.closest('.panel'),wrapper=document.createElement('details'),summary=document.createElement('summary');wrapper.className='preview-actions';summary.textContent='More actions';panel.before(wrapper);wrapper.append(summary,panel);wrapper.open=theme==='current';}
 const key=location.hash+'|'+[...main.querySelectorAll('.tab.active,.tabs .active')].map(e=>e.dataset.value).join('|');if(key!==lastView){lastView=key;animate(main);}}
 if(modal&&modal!==lastModal){lastModal=modal;animate(modal,'modal');}else if(!modal)lastModal=null;
}
strip.addEventListener('click',event=>{const toggle=event.target.closest('[data-theme]');if(toggle){stopMotion();theme=toggle.dataset.theme;try{localStorage.setItem('fh-appearance-style',theme);}catch{}apply();replayState();animate(document.querySelector('main.content'));}else if(event.target.closest('.theme-replay')){animate(document.querySelector('main.content'));}else if(event.target.closest('.theme-guide')){guides=!guides;apply();}});
document.querySelector('#app').addEventListener('toggle',event=>{const details=event.target;if(details.matches?.('.preview-workflow,.preview-guidance,.preview-actions')&&details.open)animate(details.lastElementChild,'reveal');},true);
new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(enhance);}}).observe(document.querySelector('#app'),{childList:true,subtree:true});
new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(enhance);}}).observe(document.querySelector('#modal-root'),{childList:true,subtree:true});
reduced.addEventListener('change',()=>{if(reduced.matches)stopMotion();replayState();});apply();replayState();enhance();

}
