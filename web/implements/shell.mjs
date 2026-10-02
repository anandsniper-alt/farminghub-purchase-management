import {createNavigation} from '../navigation.mjs';

export const implementsSections=[['models','Model BOMs','box'],['items','Item Master','orders'],['plan','Monthly planner','clock'],['mrp','Material planner','grid'],['stock','Stock & suppliers','users'],['prices','Purchase prices','money'],['costing','Price calculation','money'],['sales','Sales price lists','file'],['orders','Purchase orders','orders'],['settings','Implements settings','settings']];
export function renderModuleShell({section,user,icon,esc,flagsButton}){
 const navigation=createNavigation({icon,esc,logo:'/assets/farming-hub-logo.png',context:()=>({user,ui:{view:'implements',orderId:section}}),implementsSections});
 const initials=String(user.name||'').split(' ').slice(0,2).map(v=>v[0]).join('');
 return {sidebar:navigation.sidebar(),header:`<header class="topbar"><div class="flex"><button type="button" class="icon-button mobile-toggle" data-action="shell-mobile" aria-label="Open navigation" aria-expanded="false">${icon('menu')}</button>${navigation.breadcrumb(implementsSections.find(([id])=>id===section)?.[1]||'Rotavator purchasing')}</div><div class="top-tools"><span class="saved">${icon('check')} Saved online</span>${flagsButton}<div class="account"><span class="avatar">${esc(initials)}</span><div><span class="small strong">${esc(user.name)}</span><small>${esc(user.role)}</small></div><button type="button" class="small ghost" data-action="shell-logout">Sign out</button></div></div></header>`};
}
export function moduleDestination(to){return to==='bom-management'?'/bom/':to.startsWith('implements/')?'#/'+to.slice('implements/'.length):'/#/'+to;}
