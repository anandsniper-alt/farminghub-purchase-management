import profile from './company-profile.json' with {type:'json'};
export const COMPANY=Object.freeze({...profile,address:Object.freeze(profile.address)});
export const companyLines=()=>[COMPANY.name];
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function companyHtml(){
 return '<section class="fh-company-details" aria-label="Company details"><strong>'+esc(COMPANY.name)+'</strong></section>';
}
