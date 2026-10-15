import {createLaeSalesAnalyticsUI,LAE_ANALYTICS_SECTIONS} from './lae-sales-analytics.mjs';
const app=document.getElementById('app'),ui={view:'lae-sales-analytics',orderId:'review'};let user=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=()=>'';
const head=(eyebrow,title,description)=>'<div class="page-head"><div><p class="eyebrow">'+esc(eyebrow)+'</p><h1>'+esc(title)+'</h1><p>'+esc(description)+'</p></div></div>';
function unavailable(message){user=null;app.innerHTML='<main class="analytics-signin"><img src="./logo.png" alt="Farming Hub"><h1>LAE Sales Analytics</h1><p>'+esc(message)+'</p><a class="button" href="/#/home">Open Farming Hub sign-in</a><button class="button ghost" data-retry>Try again</button></main>';}
async function api(path){const response=await fetch('./api'+path,{credentials:'same-origin',cache:'no-store'});const data=await response.json();if(!response.ok){if(response.status===401||response.status===403)unavailable(data.error);throw Error(data.error||'Analytics could not be loaded.');}return data;}
const module=createLaeSalesAnalyticsUI({context:()=>({ui,user,sandbox:false}),esc,icon,head,render,api});
function render(){if(!user)return;app.innerHTML='<div class="workspace review-shell"><header class="topbar"><a class="review-home" href="/#/home"><img src="./logo.png" alt="Farming Hub">← Home</a><div class="account"><span>'+esc(user.name)+'</span><small>'+esc(user.role)+'</small></div></header><main class="content">'+module.page()+'<div class="footer-note">LAE Sales Analytics · quantities from your source data</div></main></div>';module.afterRender();}
function route(){const id=location.hash.split('/')[2];ui.orderId=id==='sales'||id==='targets'?'sales':'review';render();}
async function boot(){try{const response=await fetch('./api/session',{cache:'no-store',credentials:'same-origin'}),session=await response.json();if(!response.ok)throw Error(session.error);user=session.user;route();}catch(e){unavailable(e.message||'Sign-in could not be checked.');}}
document.addEventListener('click',event=>{if(event.target.closest('[data-retry]')){boot();return;}const el=event.target.closest('[data-action]');if(el)module.action(el.dataset.action,el.dataset);});
document.addEventListener('change',event=>module.change(event.target));window.addEventListener('hashchange',route);
// Recheck on return to the tab; never display a previous account's cached report.
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){user=null;app.innerHTML='<div class="boot">Checking sign-in…</div>';boot();}});
boot();
