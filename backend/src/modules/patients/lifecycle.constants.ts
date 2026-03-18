export const LIFECYCLE_STAGE_LABELS: Record<number, string> = {
  1: 'Referral Intake',
  2: 'Intake Validation',
  3: 'Primary Clinical Review',
  4: 'Diagnostics And Authorization',
  5: 'Specialist Referral Coordination',
  6: 'Treatment Plan Activation',
  7: 'Active Care Delivery',
  8: 'Monitoring And Follow Up',
  9: 'Discharge Planning',
  10: 'Longitudinal Care Closure',
};

export const LIFECYCLE_TRANSITIONS: Record<number, number[]> = {
  1: [2],
  2: [1, 3],
  3: [2, 4],
  4: [3, 5],
  5: [4, 6],
  6: [5, 7],
  7: [6, 8],
  8: [7, 9],
  9: [8, 10],
  10: [9],
};
