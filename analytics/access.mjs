// Versioned identity contract with Farming Hub. No purchasing runtime imports.
export class RuleError extends Error{constructor(message,code='VALIDATION'){super(message);this.code=code;}}
export function scopeAllowed(user,scope){return !!user&&user.active!==false&&(['ADMIN'].includes(user.role)||['MANAGER','EXECUTIVE','PRODUCT_MANAGER','VIEWER'].includes(user.role)&&user.scopes?.includes(scope));}
