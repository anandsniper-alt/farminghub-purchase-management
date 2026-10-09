import {scopeAllowed,RuleError} from '../domain.mjs';
import {validMonth,number} from './domain.mjs';
export const PLANNING_SCOPE='IMPLEMENTS_PLANNING';
export const canApprovePlan=actor=>['ADMIN','MANAGER'].includes(actor?.role)&&scopeAllowed(actor,'IMPLEMENTS_DOMESTIC');
export const canAccessPlanning=actor=>scopeAllowed(actor,PLANNING_SCOPE)||canApprovePlan(actor);
export const canSubmitPlan=actor=>canAccessPlanning(actor)&&['ADMIN','MANAGER','EXECUTIVE','PLAN_OPERATOR'].includes(actor.role);
export const planningActor=actor=>({id:actor.id,name:actor.name,role:actor.role});
export function planningModel(m){return Object.fromEntries(['id','series','configuration','frame','size','blades','speed','bladeOrientation','gearboxOrientation','salesConfirmed'].map(k=>[k,m[k]??null]));}
export function monthPlan(state,month){validMonth(month);return structuredClone(month===state.activeMonth?state.plan:state.monthlyPlans?.[month]||{});}
export function validatePlan(value,state){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>500)throw new RuleError('Enter quantities for up to 500 models.');
 const models=new Set(state.models.map(m=>m.id)),out={};
 for(const [id,qty] of Object.entries(value)){if(!models.has(id))throw new RuleError('Unknown model '+id);const n=number(qty,'Machines for '+id,{integer:true,max:100000});if(n>0)out[id]=n;}
 return out;
}
export function assertPlanningOnly(before,after){
 for(const key of new Set([...Object.keys(before),...Object.keys(after)]))if(!['revision','audit','plan','monthlyPlans'].includes(key)&&JSON.stringify(before[key])!==JSON.stringify(after[key]))throw new RuleError('Plan approval cannot edit BOMs, prices, stock or purchase records.');
}
