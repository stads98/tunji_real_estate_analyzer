/**
 * Broward County Rehab Cost Estimator (2025)
 * Based on real contractor quotes, BuildZoom, RSMeans data
 * Sources: Fort Lauderdale, Hollywood, Pompano, Plantation project averages
 */

// Base rate: Broward County median is ~$35/sqft for moderate work
const BASE_RATE_PER_SQFT = 35;

// Condition factors applied to base rate
const CONDITION_FACTOR: Record<string, number> = {
  light: 0.50,   // $17.50/sqft - Paint, flooring, minor cosmetic
  'lite+': 0.70, // $24.50/sqft - Light + appliances, fixtures, doors
  medium: 1.00,  // $35/sqft - Full kitchen/bath remodels, roof/HVAC
  heavy: 1.40,   // $49/sqft - Major systems, windows, moderate layout
  fullgut: 1.80, // $63/sqft - Down to studs, full permits, all new
};

// Multi-unit multipliers (shared walls but duplicate kitchens/baths)
// Cost per sqft increases slightly due to duplicate systems
const UNIT_TYPE_MULTIPLIER: Record<string, number> = {
  single: 1.00,  // Baseline
  duplex: 1.05,  // +5% for duplicate kitchens/baths
  triplex: 1.10, // +10% for 3 sets of systems
  quad: 1.15,    // +15% for 4 sets of systems
};

// Helper to derive unit type from unit count
export function getUnitTypeFromCount(units: number): 'single' | 'duplex' | 'triplex' | 'quad' {
  if (units === 1) return 'single';
  if (units === 2) return 'duplex';
  if (units === 3) return 'triplex';
  return 'quad'; // 4 or more
}

export function calculateRehabEstimate(
  sqft: number,
  unitType: 'single' | 'duplex' | 'triplex' | 'quad',
  condition: 'light' | 'lite+' | 'medium' | 'heavy' | 'fullgut'
): number {
  // Formula: SQFT × BaseRate × ConditionFactor × UnitMultiplier
  const conditionFactor = CONDITION_FACTOR[condition];
  const unitMultiplier = UNIT_TYPE_MULTIPLIER[unitType];
  
  const totalCost = sqft * BASE_RATE_PER_SQFT * conditionFactor * unitMultiplier;
  
  // Round to nearest $500
  return Math.round(totalCost / 500) * 500;
}

/**
 * Calculate total capital needed including financing costs
 * Hard costs + Entry points + Interest + Exit points
 */
export function calculateTotalCapitalNeeded(
  hardCosts: number,
  entryPointsPercent: number,
  loanRatePercent: number,
  rehabMonths: number,
  exitPointsPercent: number
): {
  hardCosts: number;
  entryPoints: number;
  interest: number;
  exitPoints: number;
  total: number;
} {
  // 100% LTV hard money financing
  const loanAmount = hardCosts;
  
  // Entry points (paid upfront when getting loan)
  const entryPoints = loanAmount * (entryPointsPercent / 100);
  
  // Interest during rehab period (simple interest calculation)
  const monthlyRate = loanRatePercent / 100 / 12;
  const interest = loanAmount * monthlyRate * rehabMonths;
  
  // Exit points (paid when refinancing or selling)
  const exitPoints = loanAmount * (exitPointsPercent / 100);
  
  // Total capital needed
  const total = hardCosts + entryPoints + interest + exitPoints;
  
  return {
    hardCosts: Math.round(hardCosts),
    entryPoints: Math.round(entryPoints),
    interest: Math.round(interest),
    exitPoints: Math.round(exitPoints),
    total: Math.round(total),
  };
}

export function getConditionLabel(condition: string): string {
  const labels: Record<string, string> = {
    light: 'Light',
    'lite+': 'Lite+',
    medium: 'Medium',
    heavy: 'Heavy',
    fullgut: 'Full Gut',
  };
  return labels[condition] || condition;
}

export function getUnitTypeLabel(unitType: string): string {
  const labels: Record<string, string> = {
    single: 'Single',
    duplex: 'Duplex',
    triplex: 'Triplex',
    quad: 'Quad',
  };
  return labels[unitType] || unitType;
}
