/**
 * Intelligent Rehab Cost Estimator
 * Analyzes comprehensive property condition assessment to suggest rehab costs
 * and appropriate rehab condition levels (light, lite+, medium, heavy, fullgut)
 */

import { DealNotes } from '../types/deal';
import { calculateRehabEstimate } from './rehabEstimator';

export interface RehabEstimateResult {
  estimatedCost: number;
  suggestedCondition: 'light' | 'lite+' | 'medium' | 'heavy' | 'fullgut';
  conditionScore: number; // 0-100 scale (0=excellent, 100=needs full gut)
  majorIssues: string[];
  breakdown: {
    structural: number;
    systems: number;
    interior: number;
    exterior: number;
  };
}

/**
 * Analyzes comprehensive property assessment and generates intelligent cost estimate
 */
export function analyzePropertyCondition(
  notes: DealNotes,
  sqft: number,
  units: number
): RehabEstimateResult {
  let conditionScore = 0;
  const majorIssues: string[] = [];
  const breakdown = {
    structural: 0,
    systems: 0,
    interior: 0,
    exterior: 0
  };

  // 1. OVERALL CONDITION (Weight: 25 points)
  // Philosophy: Only spend money on Fair or worse - Good means leave it alone
  const overallMapping: Record<string, number> = {
    'Excellent': 0,
    'Good': 0,  // Good = working condition, no money needed
    'Fair': 12,
    'Poor': 20,
    'Uninhabitable': 25
  };
  if (notes.overallCondition) {
    const score = overallMapping[notes.overallCondition] || 0;
    conditionScore += score;
    if (score >= 20) majorIssues.push('Overall condition: ' + notes.overallCondition);
  }

  // 2. STRUCTURAL & MAJOR SYSTEMS (Weight: 35 points)
  
  // Roof (10 points)
  // Good roof = no money spent. Only fix Fair or worse
  const roofMapping: Record<string, number> = {
    'New (0-5 yrs)': 0,
    'Good (6-15 yrs)': 0,  // Good roof stays, no cost
    'Fair (16-20 yrs)': 5,
    'Poor (20+ yrs)': 8,
    'Needs Replacement': 10
  };
  if (notes.roof.condition) {
    const score = roofMapping[notes.roof.condition] || 0;
    conditionScore += score;
    breakdown.structural += score * 3; // Convert to $ weight
    if (score >= 8) majorIssues.push('Roof: ' + notes.roof.condition);
  }
  if (notes.roof.leaks) {
    conditionScore += 3;
    breakdown.structural += 9;
    majorIssues.push('Roof leaks present');
  }

  // Foundation (8 points)
  // Good foundation = no cost. Only fix cracks or issues
  const foundationMapping: Record<string, number> = {
    'Good': 0,  // Good foundation stays
    'Minor Cracks': 3,
    'Major Issues': 8  // Combined Major Issues/Needs Repair
  };
  if (notes.foundation.condition) {
    const score = foundationMapping[notes.foundation.condition] || 0;
    conditionScore += score;
    breakdown.structural += score * 4;
    if (score >= 6) majorIssues.push('Foundation: ' + notes.foundation.condition);
  }

  // HVAC (7 points)
  // Good HVAC = working, no replacement needed
  const hvacMapping: Record<string, number> = {
    'New (0-5 yrs)': 0,
    'Good (6-10 yrs)': 0,  // Good = works fine, no cost
    'Fair (11-15 yrs)': 3,
    'Old (15+ yrs)': 5,
    'Not Working': 7
  };
  if (notes.hvac.condition) {
    const score = hvacMapping[notes.hvac.condition] || 0;
    conditionScore += score * (notes.hvac.numberOfUnits ? parseInt(notes.hvac.numberOfUnits) : 1);
    breakdown.systems += score * 5;
    if (score >= 5) majorIssues.push('HVAC: ' + notes.hvac.condition);
  }

  // Plumbing (5 points)
  // Good plumbing = no leaks, works fine, no cost
  const plumbingMapping: Record<string, number> = {
    'Good': 0,  // Good = working, no cost
    'Has Issues': 3,
    'Needs Replacement': 5
  };
  if (notes.plumbing.condition) {
    const score = plumbingMapping[notes.plumbing.condition] || 0;
    conditionScore += score;
    breakdown.systems += score * 3;
    if (score >= 3) majorIssues.push('Plumbing: ' + notes.plumbing.condition);
  }
  if (notes.plumbing.leaks) {
    conditionScore += 2;
    breakdown.systems += 6;
    majorIssues.push('Plumbing leaks present');
  }
  if (notes.plumbing.pipeMaterial === 'Galvanized') {
    conditionScore += 3;
    breakdown.systems += 9;
    majorIssues.push('Galvanized pipes (needs replacement)');
  }

  // Water Heater
  const waterHeaterMapping: Record<string, number> = {
    'New': 0,
    'Good': 0,
    'Old': 1,
    'Needs Replacement': 2
  };
  if (notes.plumbing.waterHeater) {
    const score = waterHeaterMapping[notes.plumbing.waterHeater] || 0;
    conditionScore += score;
    breakdown.systems += score * 1;
    if (score >= 2) majorIssues.push('Water heater needs replacement');
  }

  // Electrical (5 points)
  // Updated or Adequate = no cost, works fine
  const electricalMapping: Record<string, number> = {
    'Updated': 0,
    'Adequate': 0,  // Adequate = good enough, no cost
    'Needs Work': 3,
    'Unsafe': 5
  };
  if (notes.electrical.condition) {
    const score = electricalMapping[notes.electrical.condition] || 0;
    conditionScore += score;
    breakdown.systems += score * 3;
    if (score >= 3) majorIssues.push('Electrical: ' + notes.electrical.condition);
  }
  if (notes.electrical.wiringType === 'Knob & Tube' || notes.electrical.wiringType === 'Aluminum') {
    conditionScore += 3;
    breakdown.systems += 9;
    majorIssues.push('Outdated wiring (' + notes.electrical.wiringType + ')');
  }

  // 3. EXTERIOR (Weight: 15 points)
  // Good siding = no cost. Only paint/repair if needed
  const exteriorSidingMapping: Record<string, number> = {
    'Good': 0,  // Good = leave it alone
    'Needs Paint': 2,
    'Needs Repair': 3
  };
  if (notes.exterior.siding) {
    const score = exteriorSidingMapping[notes.exterior.siding] || 0;
    conditionScore += score;
    breakdown.exterior += score * 2;
  }

  const windowsMapping: Record<string, number> = {
    'New': 0,
    'Good': 0,  // Good windows work fine, no replacement
    'Old Single Pane': 4,
    'Broken/Missing': 5
  };
  if (notes.exterior.windows) {
    const score = windowsMapping[notes.exterior.windows] || 0;
    conditionScore += score;
    breakdown.exterior += score * 2;
    if (score >= 4) majorIssues.push('Windows: ' + notes.exterior.windows);
  }

  const doorsMapping: Record<string, number> = {
    'Good': 0,
    'Needs Replacement': 3
  };
  if (notes.exterior.doors) {
    const score = doorsMapping[notes.exterior.doors] || 0;
    conditionScore += score;
    breakdown.exterior += score * 1;
  }

  const guttersMapping: Record<string, number> = {
    'Good': 0,
    'Needs Repair': 1,
    'Missing': 2
  };
  if (notes.exterior.gutters) {
    conditionScore += guttersMapping[notes.exterior.gutters] || 0;
  }

  // Landscaping/Yard
  // Minimal is fine for rentals, only fix if overgrown
  const landscapingMapping: Record<string, number> = {
    'Well Maintained': 0,
    'Overgrown': 1,
    'Minimal': 0  // Minimal is acceptable for rentals
  };
  if (notes.exterior.landscaping) {
    const score = landscapingMapping[notes.exterior.landscaping] || 0;
    conditionScore += score;
    breakdown.exterior += score * 0.5;
  }

  // Driveway/Parking
  const drivewayMapping: Record<string, number> = {
    'Excellent': 0,
    'Good': 0,
    'Cracked': 1,
    'Needs Replacement': 2
  };
  if (notes.exterior.driveway) {
    const score = drivewayMapping[notes.exterior.driveway] || 0;
    conditionScore += score;
    breakdown.exterior += score * 1;
  }

  // Fence (from deal.ts: 'Good' | 'Needs Repair' | 'None')
  const fenceMapping: Record<string, number> = {
    'Good': 0,
    'Needs Repair': 1,
    'None': 0
  };
  if (notes.exterior.fencing) {
    const score = fenceMapping[notes.exterior.fencing] || 0;
    conditionScore += score;
    breakdown.exterior += score * 0.5;
  }

  // 4. INTERIOR - KITCHEN & BATHROOMS (Weight: 15 points)
  // Good/Updated kitchens = working condition, no cost
  const kitchenMapping: Record<string, number> = {
    'Good': 0,     // Good = functional, no cost
    'Dated': 4,    // Dated = cosmetic refresh needed
    'Needs Full Rehab': 8
  };
  if (notes.kitchen.condition) {
    const score = kitchenMapping[notes.kitchen.condition] || 0;
    conditionScore += score;
    breakdown.interior += score * 2;
    if (score >= 4) majorIssues.push('Kitchen: ' + notes.kitchen.condition);
  }

  // Kitchen detailed components - ONLY apply if kitchen is Dated or worse
  // Philosophy: If kitchen is Good/Excellent, you're not touching it, so individual components don't matter
  const kitchenNeedsWork = notes.kitchen.condition === 'Dated' || notes.kitchen.condition === 'Needs Full Rehab';
  
  if (kitchenNeedsWork) {
    const kitchenCabinetsMapping: Record<string, number> = {
      'Excellent': 0,
      'Good': 0,
      'Worn': 1,
      'Needs Replacement': 2
    };
    if (notes.kitchen.cabinets) {
      const score = kitchenCabinetsMapping[notes.kitchen.cabinets] || 0;
      conditionScore += score;
      breakdown.interior += score * 1;
    }

    const kitchenCountertopsMapping: Record<string, number> = {
      'Granite/Quartz': 0,
      'Laminate Good': 0,
      'Laminate Worn': 1,
      'Needs Replacement': 2
    };
    if (notes.kitchen.countertops) {
      const score = kitchenCountertopsMapping[notes.kitchen.countertops] || 0;
      conditionScore += score;
      breakdown.interior += score * 1;
    }

    const kitchenAppliancesMapping: Record<string, number> = {
      'All Good': 0,
      'Old': 1,
      'Missing/Broken': 2
    };
    if (notes.kitchen.appliances) {
      const score = kitchenAppliancesMapping[notes.kitchen.appliances] || 0;
      conditionScore += score;
      breakdown.interior += score * 1;
    }

    const kitchenFlooringMapping: Record<string, number> = {
      'Tile': 0,
      'Wood': 0,
      'Vinyl': 1,
      'Needs Replacement': 2
    };
    if (notes.kitchen.flooring) {
      const score = kitchenFlooringMapping[notes.kitchen.flooring] || 0;
      conditionScore += score;
      breakdown.interior += score * 0.5;
    }
  }

  // Bathrooms (average condition with detailed analysis)
  // Good bathrooms = working fixtures, no remodel needed
  // Philosophy: Only check fixture details if bathroom is Dated or Poor
  if (notes.bathrooms.length > 0) {
    const bathroomMapping: Record<string, number> = {
      'Good': 0,  // Good = functional, no cost
      'Dated': 3,
      'Poor': 5
    };
    
    let totalBathScore = 0;
    notes.bathrooms.forEach(bath => {
      if (bath.condition) {
        totalBathScore += bathroomMapping[bath.condition] || 0;
      }
      
      // Only check fixture details if bathroom is Dated or Poor
      // If bathroom is Good/Excellent, you're not touching fixtures
      const bathroomNeedsWork = bath.condition === 'Dated' || bath.condition === 'Poor';
      
      if (bathroomNeedsWork) {
        // Add points for specific fixtures if they're in poor condition
        if (bath.vanity && (bath.vanity.includes('Needs') || bath.vanity.includes('Broken'))) {
          totalBathScore += 0.5;
        }
        if (bath.toilet && (bath.toilet.includes('Needs') || bath.toilet.includes('Broken'))) {
          totalBathScore += 0.3;
        }
        if (bath.tubShower && (bath.tubShower.includes('Needs') || bath.tubShower.includes('Broken'))) {
          totalBathScore += 0.7;
        }
        if (bath.tile && (bath.tile.includes('Needs') || bath.tile.includes('Broken'))) {
          totalBathScore += 0.5;
        }
      }
    });
    const avgBathScore = totalBathScore / notes.bathrooms.length;
    conditionScore += avgBathScore;
    breakdown.interior += avgBathScore * 2;
    
    // If multiple bathrooms in poor condition, flag it
    const poorBathCount = notes.bathrooms.filter(b => b.condition === 'Poor').length;
    if (poorBathCount >= 2) {
      majorIssues.push(`${poorBathCount} bathrooms need full remodel`);
    }
  }

  // 5. INTERIOR - GENERAL (Weight: 5 points)
  const flooringMapping: Record<string, number> = {
    'Good': 0,
    'Mixed': 2,
    'Needs Replacement': 4
  };
  if (notes.interior.flooring) {
    const score = flooringMapping[notes.interior.flooring] || 0;
    conditionScore += score;
    breakdown.interior += score * 1;
  }

  const wallsMapping: Record<string, number> = {
    'Good': 0,
    'Needs Paint': 1,
    'Needs Repair': 2
  };
  if (notes.interior.walls) {
    conditionScore += wallsMapping[notes.interior.walls] || 0;
  }

  // Bedrooms (average condition - each bedroom adds to overall cost)
  if (notes.bedrooms && notes.bedrooms.length > 0) {
    const bedroomFlooringMapping: Record<string, number> = {
      'Tile': 0,
      'Wood': 0,
      'Carpet Good': 0,
      'Carpet Worn': 1,
      'Needs Replacement': 2
    };
    const bedroomConditionMapping: Record<string, number> = {
      'Excellent': 0,
      'Good': 0,
      'Needs Paint': 1,
      'Needs Work': 2
    };
    
    let totalBedroomScore = 0;
    notes.bedrooms.forEach(bedroom => {
      if (bedroom.flooring) {
        totalBedroomScore += bedroomFlooringMapping[bedroom.flooring] || 0;
      }
      if (bedroom.condition) {
        totalBedroomScore += bedroomConditionMapping[bedroom.condition] || 0;
      }
      // Closets in poor condition add cost
      if (bedroom.closets && (bedroom.closets.includes('Needs') || bedroom.closets.includes('Poor'))) {
        totalBedroomScore += 0.5;
      }
    });
    
    // Average bedroom score contributes to overall (max 3 points)
    const avgBedroomScore = Math.min(totalBedroomScore / notes.bedrooms.length, 3);
    conditionScore += avgBedroomScore;
    breakdown.interior += avgBedroomScore * 1;
  }

  // Ceilings
  const ceilingsMapping: Record<string, number> = {
    'Excellent': 0,
    'Good': 0,
    'Stains/Cracks': 1,
    'Needs Repair': 2
  };
  if (notes.interior.ceilings) {
    const score = ceilingsMapping[notes.interior.ceilings] || 0;
    conditionScore += score;
    breakdown.interior += score * 1;
  }

  // Lighting
  const lightingMapping: Record<string, number> = {
    'Updated': 0,
    'Adequate': 0,
    'Outdated': 1,
    'Needs Replacement': 1
  };
  if (notes.interior.lighting) {
    conditionScore += lightingMapping[notes.interior.lighting] || 0;
  }

  // 6. ADDITIONAL ISSUES (Weight: 10 points each, can stack)
  if (notes.additionalIssues.mold) {
    conditionScore += 5;
    breakdown.structural += 15;
    majorIssues.push('Mold/mildew present');
  }
  if (notes.additionalIssues.termites) {
    conditionScore += 6;
    breakdown.structural += 18;
    majorIssues.push('Termite/pest damage');
  }
  if (notes.additionalIssues.waterDamage) {
    conditionScore += 5;
    breakdown.structural += 15;
    majorIssues.push('Water damage');
  }
  if (notes.additionalIssues.fireDamage) {
    conditionScore += 10;
    breakdown.structural += 30;
    majorIssues.push('Fire damage');
  }
  if (notes.additionalIssues.structuralIssues) {
    conditionScore += 8;
    breakdown.structural += 24;
    majorIssues.push('Structural issues');
  }
  if (notes.additionalIssues['code violations']) {
    conditionScore += 4;
    breakdown.systems += 12;
    majorIssues.push('Code violations');
  }
  // If "other" field has content, flag it for review (likely important issues mentioned)
  if (notes.additionalIssues.other && notes.additionalIssues.other.trim().length > 0) {
    conditionScore += 2;
    breakdown.structural += 6;
    majorIssues.push('Additional issues noted (see details)');
  }

  // 7. POOL (if present, add 2-5 points)
  if (notes.pool.hasPool) {
    const poolMapping: Record<string, number> = {
      'Excellent': 0,
      'Good': 1,
      'Needs Repair': 3,
      'Not Working': 5
    };
    if (notes.pool.condition) {
      const score = poolMapping[notes.pool.condition] || 0;
      conditionScore += score;
      breakdown.exterior += score * 2;
      if (score >= 3) majorIssues.push('Pool: ' + notes.pool.condition);
    }

    // Pool equipment
    const poolEquipmentMapping: Record<string, number> = {
      'New': 0,
      'Good': 0,
      'Old': 1,
      'Needs Replacement': 2
    };
    if (notes.pool.equipment) {
      const score = poolEquipmentMapping[notes.pool.equipment] || 0;
      conditionScore += score;
      breakdown.exterior += score * 1;
      if (score >= 2) majorIssues.push('Pool equipment needs replacement');
    }
  }

  // Cap condition score at 100
  conditionScore = Math.min(conditionScore, 100);

  // Determine suggested rehab condition level based on score
  let suggestedCondition: 'light' | 'lite+' | 'medium' | 'heavy' | 'fullgut';
  if (conditionScore <= 15) {
    suggestedCondition = 'light'; // Cosmetic only
  } else if (conditionScore <= 30) {
    suggestedCondition = 'lite+'; // Light + some systems
  } else if (conditionScore <= 50) {
    suggestedCondition = 'medium'; // Moderate rehab
  } else if (conditionScore <= 70) {
    suggestedCondition = 'heavy'; // Major rehab
  } else {
    suggestedCondition = 'fullgut'; // Full gut renovation
  }

  // Calculate estimated cost using existing calculator
  const unitType = units === 1 ? 'single' : units === 2 ? 'duplex' : units === 3 ? 'triplex' : 'quad';
  const estimatedCost = calculateRehabEstimate(sqft, unitType, suggestedCondition);

  return {
    estimatedCost,
    suggestedCondition,
    conditionScore,
    majorIssues,
    breakdown
  };
}

/**
 * Get human-readable explanation of condition score
 */
export function getConditionScoreDescription(score: number): string {
  if (score <= 15) {
    return 'Property is in good condition - only cosmetic updates needed (paint, flooring, fixtures)';
  } else if (score <= 30) {
    return 'Property needs light-moderate work - cosmetic updates plus some appliances, fixtures, or minor repairs';
  } else if (score <= 50) {
    return 'Property needs moderate rehab - expect kitchen/bath remodels, possibly roof or HVAC replacement';
  } else if (score <= 70) {
    return 'Property needs major rehab - multiple major systems, significant repairs, possibly structural work';
  } else {
    return 'Property needs full gut renovation - down to studs, all new systems, major permits required';
  }
}

/**
 * Format breakdown for display
 */
export function formatBreakdown(breakdown: RehabEstimateResult['breakdown']): string {
  const total = breakdown.structural + breakdown.systems + breakdown.interior + breakdown.exterior;
  if (total === 0) return 'No condition data available';

  const items: string[] = [];
  if (breakdown.structural > 0) {
    items.push(`Structural/Foundation: ${Math.round((breakdown.structural / total) * 100)}%`);
  }
  if (breakdown.systems > 0) {
    items.push(`Major Systems: ${Math.round((breakdown.systems / total) * 100)}%`);
  }
  if (breakdown.interior > 0) {
    items.push(`Interior Finishes: ${Math.round((breakdown.interior / total) * 100)}%`);
  }
  if (breakdown.exterior > 0) {
    items.push(`Exterior: ${Math.round((breakdown.exterior / total) * 100)}%`);
  }

  return items.join(', ');
}
