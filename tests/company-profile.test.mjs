import test from 'node:test';
import assert from 'node:assert/strict';
import {COMPANY,companyLines,companyHtml} from '../shared/company-profile.mjs';
test('shared print identity contains only the name verified in the current application',()=>{
 assert.equal(COMPANY.name,'FARMING HUB PRIVATE LIMITED');assert.deepEqual(companyLines(),[COMPANY.name]);
 assert.deepEqual(COMPANY.address,[]);for(const field of ['iec','gst','phone','person','email'])assert.equal(COMPANY[field],'');
 assert.match(companyHtml(),/FARMING HUB PRIVATE LIMITED/);assert.doesNotMatch(companyHtml(),/IEC|GSTIN|Company address|Contact details/);
 assert.ok(Object.isFrozen(COMPANY));assert.ok(Object.isFrozen(COMPANY.address));
});
