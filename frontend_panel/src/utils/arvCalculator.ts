/**
 * Enhanced ARV Calculator for South Florida Real Estate
 * Considers all relevant factors specific to Miami-Dade, Broward, and Palm Beach counties
 */

export interface PropertyData {
  soldPrice: number;
  sqft: number;
  beds: number;
  baths: number;
  yearBuilt: number;
  propertyType?: string;
  lotSize?: number;
  hasPool?: boolean;
  parkingSpaces?: number;
  daysOnMarket?: number;
  soldDate?: string;
}

export interface ARVAdjustment {
  adjustedPrice: number;
  similarityScore: number;
  adjustments: {
    sqft: number;
    beds: number;
    baths: number;
    age: number;
    lotSize: number;
    pool: number;
    parking: number;
    propertyType: number;
    marketTiming: number;
  };
}

/**
 * Calculate ARV adjustment for a comparable property against subject property
 * Optimized for South Florida market conditions
 */
export function calculateARVAdjustment(
  comp: PropertyData,
  subject: PropertyData
): ARVAdjustment {
  let adjustedPrice = comp.soldPrice;
  let similarityScore = 100; // Start at 100%
  
  const adjustments = {
    sqft: 0,
    beds: 0,
    baths: 0,
    age: 0,
    lotSize: 0,
    pool: 0,
    parking: 0,
    propertyType: 0,
    marketTiming: 0
  };

  // 1. SQUARE FOOTAGE ADJUSTMENT (Primary Factor - 35% weight)
  if (comp.sqft > 0 && subject.sqft > 0) {
    const sqftDiff = subject.sqft - comp.sqft;
    const pricePerSqft = comp.soldPrice / comp.sqft;
    adjustments.sqft = sqftDiff * pricePerSqft;
    adjustedPrice += adjustments.sqft;
    
    // Penalize similarity for large sqft differences
    const sqftDiffPercent = Math.abs(sqftDiff) / subject.sqft;
    similarityScore -= sqftDiffPercent * 35; // Up to 35 point penalty
  }

  // 2. BEDROOM ADJUSTMENT (10% weight per bedroom)
  if (comp.beds > 0 && subject.beds > 0) {
    const bedDiff = subject.beds - comp.beds;
    // In South Florida, each bedroom worth approximately 10-12% of property value
    adjustments.beds = bedDiff * (comp.soldPrice * 0.11);
    adjustedPrice += adjustments.beds;
    
    const bedDiffAbs = Math.abs(bedDiff);
    similarityScore -= bedDiffAbs * 12; // 12 points per bedroom difference
  }

  // 3. BATHROOM ADJUSTMENT (6% weight per bathroom)
  if (comp.baths > 0 && subject.baths > 0) {
    const bathDiff = subject.baths - comp.baths;
    // Each bathroom worth approximately 6-8% in South Florida
    adjustments.baths = bathDiff * (comp.soldPrice * 0.07);
    adjustedPrice += adjustments.baths;
    
    const bathDiffAbs = Math.abs(bathDiff);
    similarityScore -= bathDiffAbs * 6; // 6 points per bathroom difference
  }

  // 4. AGE/YEAR BUILT ADJUSTMENT (0.8% per year)
  // Very important in South Florida due to hurricane codes and updates
  if (comp.yearBuilt > 0 && subject.yearBuilt > 0) {
    const ageDiff = comp.yearBuilt - subject.yearBuilt;
    // Properties built after 2001 have significant hurricane code upgrades
    const currentYear = new Date().getFullYear();
    const compAge = currentYear - comp.yearBuilt;
    const subjectAge = currentYear - subject.yearBuilt;
    
    // Base adjustment: 0.8% per year
    adjustments.age = -ageDiff * (comp.soldPrice * 0.008);
    
    // Bonus for post-2001 construction (Hurricane Andrew standards)
    if (subject.yearBuilt > 2001 && comp.yearBuilt <= 2001) {
      adjustments.age += comp.soldPrice * 0.05; // 5% bonus for modern codes
    } else if (subject.yearBuilt <= 2001 && comp.yearBuilt > 2001) {
      adjustments.age -= comp.soldPrice * 0.05; // 5% penalty for older construction
    }
    
    adjustedPrice += adjustments.age;
    
    // Similarity penalty for age differences
    const ageDiffAbs = Math.abs(ageDiff);
    if (ageDiffAbs > 10) {
      similarityScore -= Math.min(ageDiffAbs / 2, 20); // Max 20 point penalty
    }
  }

  // 5. LOT SIZE ADJUSTMENT
  // Important in South Florida where land is valuable
  if (comp.lotSize && subject.lotSize && comp.lotSize > 0 && subject.lotSize > 0) {
    const lotDiff = subject.lotSize - comp.lotSize;
    // Land worth approximately $15-25/sqft in South Florida
    const landValuePerSqft = 20;
    adjustments.lotSize = lotDiff * landValuePerSqft;
    adjustedPrice += adjustments.lotSize;
    
    // Similarity adjustment
    const lotDiffPercent = Math.abs(lotDiff) / subject.lotSize;
    if (lotDiffPercent > 0.2) { // More than 20% difference
      similarityScore -= Math.min(lotDiffPercent * 10, 8); // Max 8 point penalty
    }
  }

  // 6. POOL ADJUSTMENT
  // Pools are highly valuable in South Florida climate
  if (subject.hasPool !== undefined && comp.hasPool !== undefined) {
    if (subject.hasPool && !comp.hasPool) {
      // Subject has pool, comp doesn't - add pool value
      adjustments.pool = comp.soldPrice * 0.05; // Pool adds 5% value
      adjustedPrice += adjustments.pool;
    } else if (!subject.hasPool && comp.hasPool) {
      // Comp has pool, subject doesn't - subtract pool value
      adjustments.pool = -(comp.soldPrice * 0.05);
      adjustedPrice += adjustments.pool;
    }
    
    // Penalty for pool mismatch
    if (subject.hasPool !== comp.hasPool) {
      similarityScore -= 8; // 8 point penalty for pool mismatch
    }
  }

  // 7. PARKING/GARAGE ADJUSTMENT
  // Important in South Florida for hurricane protection and security
  if (subject.parkingSpaces !== undefined && comp.parkingSpaces !== undefined) {
    const parkingDiff = (subject.parkingSpaces || 0) - (comp.parkingSpaces || 0);
    if (parkingDiff !== 0) {
      // Each parking space worth approximately $10,000-15,000
      adjustments.parking = parkingDiff * 12500;
      adjustedPrice += adjustments.parking;
      
      const parkingDiffAbs = Math.abs(parkingDiff);
      similarityScore -= parkingDiffAbs * 4; // 4 points per parking space difference
    }
  }

  // 8. PROPERTY TYPE MATCH
  if (comp.propertyType && subject.propertyType) {
    const compType = comp.propertyType.toLowerCase();
    const subjectType = subject.propertyType.toLowerCase();
    
    if (compType.includes('multi') && subjectType.includes('multi')) {
      similarityScore += 12; // Bonus for both being multifamily
    } else if (compType === subjectType) {
      similarityScore += 8; // Bonus for exact match
    } else {
      similarityScore -= 15; // Penalty for type mismatch
      // Different property types need significant adjustment
      if (compType.includes('condo') !== subjectType.includes('condo')) {
        adjustments.propertyType = comp.soldPrice * 0.1; // 10% adjustment for condo vs house
        if (subjectType.includes('condo')) {
          adjustedPrice -= adjustments.propertyType; // Condos typically worth less
        } else {
          adjustedPrice += adjustments.propertyType;
        }
      }
    }
  }

  // 9. MARKET TIMING ADJUSTMENT
  // Account for recent sales being more relevant
  if (comp.soldDate) {
    try {
      const soldDate = new Date(comp.soldDate);
      const now = new Date();
      const monthsAgo = (now.getTime() - soldDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      
      if (monthsAgo > 3) {
        // Older sales are less similar
        similarityScore -= Math.min(monthsAgo / 2, 10); // Max 10 point penalty
        
        // Apply appreciation adjustment (3% annual in South Florida)
        const annualAppreciation = 0.03;
        const monthlyAppreciation = annualAppreciation / 12;
        adjustments.marketTiming = comp.soldPrice * (monthlyAppreciation * monthsAgo);
        adjustedPrice += adjustments.marketTiming;
      }
    } catch (e) {
      // Invalid date, skip this adjustment
    }
  }

  // 10. DAYS ON MARKET PENALTY
  // Properties that sold quickly are better comps
  if (comp.daysOnMarket !== undefined) {
    if (comp.daysOnMarket > 90) {
      // Long time on market suggests overpricing or issues
      similarityScore -= Math.min((comp.daysOnMarket - 90) / 10, 8); // Max 8 point penalty
    } else if (comp.daysOnMarket < 30) {
      // Quick sale suggests strong market demand
      similarityScore += 3; // Small bonus
    }
  }

  // Ensure similarity score stays between 0 and 100
  similarityScore = Math.max(0, Math.min(100, similarityScore));

  return {
    adjustedPrice: Math.round(adjustedPrice),
    similarityScore: Math.round(similarityScore),
    adjustments
  };
}

/**
 * Calculate weighted ARV from multiple comps
 */
export function calculateWeightedARV(
  comps: PropertyData[],
  subject: PropertyData
): { arv: number; adjustments: ARVAdjustment[] } {
  if (comps.length === 0) {
    return { arv: 0, adjustments: [] };
  }

  const adjustments = comps.map(comp => calculateARVAdjustment(comp, subject));

  // Calculate weighted average based on similarity scores
  let totalWeightedPrice = 0;
  let totalWeight = 0;

  adjustments.forEach(adj => {
    const weight = adj.similarityScore / 100;
    totalWeightedPrice += adj.adjustedPrice * weight;
    totalWeight += weight;
  });

  const arv = totalWeight > 0
    ? Math.round(totalWeightedPrice / totalWeight)
    : Math.round(adjustments.reduce((sum, adj) => sum + adj.adjustedPrice, 0) / adjustments.length);

  return { arv, adjustments };
}
