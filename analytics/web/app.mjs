import {createLaeSalesAnalyticsUI,LAE_ANALYTICS_SECTIONS} from './lae-sales-analytics.mjs';
const app=document.getElementById('app'),ui={view:'lae-sales-analytics',orderId:'stock'};let user=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=()=>'';
const head=(eyebrow,title,description)=>'<div class="page-head"><div><p class="eyebrow">'+esc(eyebrow)+'</p><h1>'+esc(title)+'</h1><p>'+esc(description)+'</p></div></div>';
function unavailable(message){user=null;app.innerHTML='<main class="analytics-signin"><img src="./logo.png" alt="Farming Hub"><h1>LAE Sales Analytics</h1><p>'+esc(message)+'</p><a class="button" href="/#/home">Open Farming Hub sign-in</a><button class="button ghost" data-retry>Try again</button></main>';}
async function api(path){const response=await fetch('./api'+path,{credentials:'same-origin',cache:'no-store'});const data=await response.json();if(!response.ok){if(response.status===401||response.status===403)unavailable(data.error);throw Error(data.error||'Analytics could not be loaded.');}return data;}
const module=createLaeSalesAnalyticsUI({context:()=>({ui,user,sandbox:false}),esc,icon,head,render,api});
function render(){if(!user)return;app.innerHTML='<aside class="sidebar module-sidebar"><a class="brand brand-logo-block" href="/#/home" aria-label="Farming Hub home"><div class="brand-logo-shell"><img class="brand-logo" src="./logo.png" alt="Farming Hub"></div></a><a class="nav-link" href="/#/home">← Home</a><div class="nav-label">LAE Sales Analytics</div><nav aria-label="Analytics navigation">'+LAE_ANALYTICS_SECTIONS.map(([id,title])=>'<a class="nav-link '+(ui.orderId===id?'active':'')+'" href="#/lae-sales-analytics/'+id+'">'+esc(title)+'</a>').join('')+'</nav></aside><div class="workspace module-shell"><header class="topbar"><a href="/#/home">Farming Hub</a><div class="account"><span>'+esc(user.name)+'</span><small>'+esc(user.role)+'</small></div></header><main class="content">'+module.page()+'<div class="footer-note">LAE Sales Analytics · MASTER source balances</div></main></div>';module.afterRender();}
function route(){const id=location.hash.split('/')[2];ui.orderId=LAE_ANALYTICS_SECTIONS.some(([key])=>key===id)?id:'overview';render();}
async function boot(){try{const response=await fetch('./api/session',{cache:'no-store',credentials:'same-origin'}),session=await response.json();if(!response.ok)throw Error(session.error);user=session.user;route();}catch(e){unavailable(e.message||'Sign-in could not be checked.');}}
document.addEventListener('click',event=>{if(event.target.closest('[data-retry]')){boot();return;}const el=event.target.closest('[data-action]');if(el)module.action(el.dataset.action,el.dataset);});
document.addEventListener('change',event=>module.change(event.target));window.addEventListener('hashchange',route);
// Recheck on return to the tab; never display a previous account's cached report.
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){user=null;app.innerHTML='<div class="boot">Checking sign-in…</div>';boot();}});
boot();
