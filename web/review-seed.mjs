/** Private standalone builds concatenate the seed before this adapter.
 * The hosted login dependency graph must never contain commercial seed data.
 */
export function createReviewSeed(...args){
 if(typeof createCleanSeed==='function')return createCleanSeed(...args);
 throw new Error('Review data is available only in the private standalone review build.');
}
