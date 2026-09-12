// Frontend mirror of backend/src/services/evaluationService.js — used for the
// live preview in the vendor form. Backend remains the source of truth on save.
 
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
 
export function gradeFor(rating) {
  if (rating == null) return { grade: null, status: null, tone: 'gray' };
  if (rating >= 4.5) return { grade: 'A+', status: 'Preferred Supplier', tone: 'green' };
  if (rating >= 4.0) return { grade: 'A', status: 'Approved', tone: 'green' };
  if (rating >= 3.5) return { grade: 'B', status: 'Approved with Monitoring', tone: 'blue' };
  if (rating >= 3.0) return { grade: 'C', status: 'Conditional Approval', tone: 'amber' };
  return { grade: 'D', status: 'Not Approved', tone: 'red' };
}
 
/** Compute evaluation results from criterion scores (weights normalised over rated ones). */
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
  if (weightSum === 0) return { overallRating: null, overallPercentage: null, grade: null, status: null, tone: 'gray', ratedCount: 0 };
  const overallRating = Math.round((weighted / weightSum) * 100) / 100;
  const overallPercentage = Math.round((overallRating / 5) * 100 * 10) / 10;
  const g = gradeFor(overallRating);
  const ratedCount = EVALUATION_KEYS.filter((k) => {
    const v = Number(scores[k]);
    return Number.isFinite(v) && v >= 1 && v <= 5;
  }).length;
  return { overallRating, overallPercentage, ...g, ratedCount };
}
