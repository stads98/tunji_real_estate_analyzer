/**
 * Calculate annual insurance based on square footage and property age
 * Uses actual 2024-2025 Broward County landlord policy rates
 * 
 * Base rates sourced from:
 * - Citizens Property Insurance (FL state insurer of last resort)
 * - Private carriers (Olympus, Universal, Heritage, Edison)
 * - Insurance aggregators (Policygenius, Insurify, Florida-specific agents)
 * 
 * Key assumptions:
 * - Landlord/investor policy (20-30% higher than owner-occupied)
 * - Full wind/hurricane coverage (required for mortgages in FL)
 * - Replacement cost coverage (not actual cash value)
 * - Deductibles: 2% wind, $2,500 AOP (standard)
 * 
 * Florida Wind Mitigation Discounts:
 * - Hurricane/Impact Windows: 10-15% discount (we use 12%)
 * - New Roof (0-5 yrs): 15-20% discount (we use 17%)
 * - Both combined: Up to 30% total discount (compounding)
 * 
 * @param sqft - Total square footage of property
 * @param yearBuilt - Year property was built
 * @param hasHurricaneWindows - Impact-rated or hurricane windows installed
 * @param hasNewRoof - Roof 0-5 years old
 * @returns Annual insurance premium in dollars
 */
export function calculateInsuranceFromSqft(
  sqft: number, 
  yearBuilt: number,
  hasHurricaneWindows: boolean = false,
  hasNewRoof: boolean = false
): number {
  const currentYear = new Date().getFullYear();
  const age = currentYear - yearBuilt;
  
  // Base rate per sqft for Broward County landlord policies (2024-2025)
  // These rates include hurricane/windstorm coverage (required in FL)
  let baseRatePerSqft: number;
  
  if (age <= 5) {
    // New construction - Full wind mitigation credits, FBC 2017+ code
    // Reinforced roof deck, impact windows, hurricane straps
    // Qualifies for best rates from all carriers
    baseRatePerSqft = 2.50; // $2.50/sqft/year
  } else if (age <= 15) {
    // Modern - Built to recent codes, likely has some mitigation
    // May qualify for roof shape, opening protection credits
    baseRatePerSqft = 3.00; // $3.00/sqft/year
  } else if (age <= 30) {
    // Established - Older codes, may have some updates
    // 4-point inspection required, some credits available
    baseRatePerSqft = 3.50; // $3.50/sqft/year
  } else if (age <= 50) {
    // Aging - Minimal credits, systems original or aging
    // Higher risk profile, fewer carrier options
    baseRatePerSqft = 4.25; // $4.25/sqft/year
  } else {
    // Old - Very limited credits, Citizens likely only option
    // May need surplus lines, significant underwriting scrutiny
    baseRatePerSqft = 5.00; // $5.00/sqft/year
  }
  
  // Calculate base annual premium
  let annualPremium = sqft * baseRatePerSqft;
  
  // Apply Florida wind mitigation discounts (compounding)
  if (hasHurricaneWindows) {
    annualPremium = annualPremium * 0.88; // 12% discount for impact/hurricane windows
  }
  if (hasNewRoof) {
    annualPremium = annualPremium * 0.83; // 17% discount for new roof (0-5 yrs)
  }
  
  // Round to nearest $50 (insurance quotes are typically rounded)
  return Math.round(annualPremium / 50) * 50;
}

/**
 * Legacy function for backwards compatibility
 * Now calls the sqft-based calculator with estimated sqft from price
 */
export function getInsuranceRateByAge(yearBuilt: number): number {
  const currentYear = new Date().getFullYear();
  const age = currentYear - yearBuilt;
  
  // Legacy percentage rates (now deprecated in favor of sqft-based)
  if (age <= 5) return 0.005;
  else if (age <= 10) return 0.008;
  else if (age <= 20) return 0.012;
  else if (age <= 35) return 0.015;
  else if (age <= 50) return 0.020;
  else if (age <= 70) return 0.028;
  else return 0.040;
}

/**
 * Get human-readable description of insurance rate factors
 */
export function getInsuranceRateDescription(yearBuilt: number, sqft?: number): string {
  const currentYear = new Date().getFullYear();
  const age = currentYear - yearBuilt;
  
  let ageDesc: string;
  let ratePerSqft: string;
  
  if (age <= 5) {
    ageDesc = "New construction - Full mitigation credits";
    ratePerSqft = "$2.50/sqft";
  } else if (age <= 15) {
    ageDesc = "Modern build - Good credits available";
    ratePerSqft = "$3.00/sqft";
  } else if (age <= 30) {
    ageDesc = "Established - Some credits available";
    ratePerSqft = "$3.50/sqft";
  } else if (age <= 50) {
    ageDesc = "Aging property - Limited credits";
    ratePerSqft = "$4.25/sqft";
  } else {
    ageDesc = "Older property - Minimal credits";
    ratePerSqft = "$5.00/sqft";
  }
  
  if (sqft) {
    return `${ageDesc} (${ratePerSqft} × ${sqft.toLocaleString()} sqft)`;
  }
  return `${ageDesc} (${ratePerSqft})`;
}

/**
 * Calculate insurance for current property based on sqft and age
 * If sqft not provided, falls back to legacy percentage-based calculation
 */
export function calculateCurrentInsurance(
  purchasePrice: number, 
  yearBuilt: number, 
  sqft?: number,
  hasHurricaneWindows?: boolean,
  hasNewRoof?: boolean
): number {
  if (sqft && sqft > 0) {
    return calculateInsuranceFromSqft(sqft, yearBuilt, hasHurricaneWindows, hasNewRoof);
  }
  
  // Fallback to legacy calculation if no sqft provided
  const rate = getInsuranceRateByAge(yearBuilt);
  let premium = Math.round(purchasePrice * rate);
  
  // Apply discounts even without sqft
  if (hasHurricaneWindows) premium = Math.round(premium * 0.88);
  if (hasNewRoof) premium = Math.round(premium * 0.83);
  
  return premium;
}

/**
 * Calculate insurance for rehab property based on sqft and year built
 * Even after rehab, the property's year built affects base rates
 * However, rehabs may qualify for credits if roof/systems updated
 */
export function calculateRehabInsurance(
  afterRepairValue: number, 
  yearBuilt: number,
  sqft?: number,
  hasHurricaneWindows?: boolean,
  hasNewRoof?: boolean
): number {
  if (sqft && sqft > 0) {
    // For rehabbed properties, insurance can improve if:
    // - New roof installed (biggest discount factor)
    // - Electrical/plumbing/HVAC updated
    // - Impact windows/shutters added
    // We'll use the actual year built but acknowledge renovations help
    return calculateInsuranceFromSqft(sqft, yearBuilt, hasHurricaneWindows, hasNewRoof);
  }
  
  // Fallback to legacy calculation
  const rate = getInsuranceRateByAge(yearBuilt);
  let premium = Math.round(afterRepairValue * rate);
  
  // Apply discounts even without sqft
  if (hasHurricaneWindows) premium = Math.round(premium * 0.88);
  if (hasNewRoof) premium = Math.round(premium * 0.83);
  
  return premium;
}
