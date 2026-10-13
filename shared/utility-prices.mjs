import {scopeAllowed} from './domain.mjs';

export const UTILITY_PRICE_SCOPE='UTILITY_DOMESTIC';
const COMMERCIAL_ROLES=['ADMIN','MANAGER','EXECUTIVE','PRODUCT_MANAGER','VIEWER'];
export function canAccessUtilityPrices(user){return COMMERCIAL_ROLES.includes(user?.role)&&scopeAllowed(user,UTILITY_PRICE_SCOPE);}
export function canWriteUtilityRemarks(user){return canAccessUtilityPrices(user)&&user.role!=='VIEWER';}
