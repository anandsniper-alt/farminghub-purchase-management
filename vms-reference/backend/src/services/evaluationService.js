// ---------------------------------------------------------------------------
// Weighted vendor evaluation
// Each criterion is rated 1-5. The weighted score is a 5-point number.
// Grade / status / percentage are derived from it. No manual calculation.
// ---------------------------------------------------------------------------
 
/** Field key -> weight (must sum to 1.0). */
export const EVALUATION_CRITERIA = [
  { key: 'evalProductQuality', label: 'Product Quality Strength', weight: 0.20 },
  { key: 'evalQualityControl', label: 'Quality Control Systems', weight: 0.15 },
  { key: 'evalReliability', label: 'Reliability', weight: 0.12 },
  { key: 'evalFinancialStrength', label: 'Financial Strength', weight: 0.10 },
  { key: 'evalProductionVolume', label: 'Annual Production Volume (Average)', weight: 0.08 },
  { key: 'evalCredibility', label: 'Credibility', weight: 0.08 },
  { key: 'evalPricingSupport', label: 'Pricing Support', weight: 0.08 },
  { key: 'evalCommunication', label: 'Communication', weight: 0.06 },
  { key: 'evalWillingness', label: 'Willingness to Cooperate', weight: 0.05 },
  { key: 'evalCreditSupport', label: 'Credit Support', weight: 0.04 },
  { key: 'evalMarketExposure', label: 'Market Exposure', weight: 0.04 },
];
 
export const EVALUATION_KEYS = EVALUATION_CRITERIA.map((c) => c.key);
 
/** Map a 5-point rating to a grade + approval status. */
export function gradeFor(rating) {
  if (rating == null) return { grade: null, status: null };
  if (rating >= 4.5) return { grade: 'A+', status: 'Preferred Supplier' };
  if (rating >= 4.0) return { grade: 'A', status: 'Approved' };
  if (rating >= 3.5) return { grade: 'B', status: 'Approved with Monitoring' };
  if (rating >= 3.0) return { grade: 'C', status: 'Conditional Approval' };
  return { grade: 'D', status: 'Not Approved' };
}
 
/**
 * Compute the evaluation results from a set of criterion scores.
 * Only the criteria that have a valid 1-5 value are counted; their weights are
 * re-normalised so partial evaluations still yield a sensible score.
 * Returns nulls when nothing has been rated yet.
 */
export function computeEvaluation(scores = {}) {
  let weighted = 0;
  let weightSum = 0;
  for (const { key, weight } of EVALUATION_CRITERIA) {
    const v = Number(scores[key]);
    if (Number.isFinite(v) && v >= 1 && v <= 5) {
      weighted += v * weight;
      weightSum += weight;
    }
  }
  if (weightSum === 0) {
    return { overallRating: null, overallPercentage: null, supplierGrade: null, supplierStatus: null };
  }
  const overallRating = Math.round((weighted / weightSum) * 100) / 100; // 2 dp, 5-point scale
  const overallPercentage = Math.round((overallRating / 5) * 100 * 10) / 10; // 1 dp
  const { grade, status } = gradeFor(overallRating);
  return { overallRating, overallPercentage, supplierGrade: grade, supplierStatus: status };
}
