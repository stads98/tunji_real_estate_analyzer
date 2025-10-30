/**
 * Confidence Score Calculator
 * Calculates estimate confidence (0-100%) based on data completeness and quality
 */

import { DealNotes } from '../types/deal';

export interface ConfidenceResult {
  score: number; // 0-100
  level: 'Low' | 'Medium' | 'High' | 'Very High';
  color: string;
  missingFields: string[];
  assumptions: string[];
}

export function calculateConfidence(
  notes: DealNotes,
  yearBuilt?: number,
  sqft?: number
): ConfidenceResult {
  let points = 0;
  const maxPoints = 100;
  const missingFields: string[] = [];
  const assumptions: string[] = [];

  // CRITICAL FIELDS (40 points total)
  
  // Overall condition (10 points)
  if (notes.overallCondition && notes.overallCondition !== '') {
    points += 10;
  } else {
    missingFields.push('Overall Condition');
    assumptions.push('Assuming "Fair" overall condition');
  }

  // Roof (10 points)
  if (notes.roof.condition && notes.roof.condition !== '') {
    points += 8;
    if (notes.roof.roofYear) {
      points += 2; // Bonus for specific year
    } else if (!notes.roof.age) {
      assumptions.push('Roof age estimated from property age');
    }
  } else {
    missingFields.push('Roof Condition');
    assumptions.push('Assuming roof matches property age');
  }

  // HVAC (10 points)
  if (notes.hvac.condition && notes.hvac.condition !== '') {
    points += 7;
    if (notes.hvac.systemType) {
      points += 2; // Bonus for system type
    } else {
      assumptions.push('Assuming standard Central AC');
    }
    if (notes.hvac.numberOfUnits) {
      points += 1;
    }
  } else {
    missingFields.push('HVAC Condition');
    assumptions.push('Assuming HVAC matches property age');
  }

  // Plumbing (5 points)
  if (notes.plumbing.condition && notes.plumbing.condition !== '') {
    points += 3;
    if (notes.plumbing.pipeMaterial && notes.plumbing.pipeMaterial !== '') {
      points += 2;
    } else {
      assumptions.push('Pipe material unknown - assuming standard for era');
    }
  } else {
    missingFields.push('Plumbing Condition');
    assumptions.push('Assuming plumbing is functional');
  }

  // Electrical (5 points)
  if (notes.electrical.condition && notes.electrical.condition !== '') {
    points += 3;
    if (notes.electrical.panelAmperage) {
      points += 2;
    } else {
      assumptions.push('Electrical panel size unknown');
    }
  } else {
    missingFields.push('Electrical Condition');
    assumptions.push('Assuming electrical is adequate');
  }

  // IMPORTANT FIELDS (30 points total)

  // Foundation (8 points)
  if (notes.foundation.condition && notes.foundation.condition !== '') {
    points += 8;
  } else {
    missingFields.push('Foundation');
    assumptions.push('Assuming foundation is structurally sound');
  }

  // Kitchen (7 points)
  if (notes.kitchen.condition && notes.kitchen.condition !== '') {
    points += 5;
    if (notes.kitchen.cabinets && notes.kitchen.cabinets !== '') points += 1;
    if (notes.kitchen.appliances && notes.kitchen.appliances !== '') points += 1;
  } else {
    missingFields.push('Kitchen Condition');
    assumptions.push('Kitchen rehab costs estimated at medium level');
  }

  // Bathrooms (7 points)
  if (notes.bathrooms && notes.bathrooms.length > 0) {
    const filledBathrooms = notes.bathrooms.filter(b => b.condition && b.condition !== '');
    points += Math.min(7, filledBathrooms.length * 3);
    if (filledBathrooms.length === 0) {
      assumptions.push('Bathroom conditions not specified');
    }
  } else {
    missingFields.push('Bathroom Details');
    assumptions.push('Bathroom count and condition estimated');
  }

  // Exterior/Windows (8 points)
  if (notes.exterior.windows && notes.exterior.windows !== '') {
    points += 4;
    if (notes.exterior.windowsType) {
      points += 2;
    } else {
      assumptions.push('Window type not specified');
    }
    if (notes.exterior.windowsCondition) {
      points += 2;
    }
  } else {
    missingFields.push('Window Condition');
    assumptions.push('Window costs estimated at replacement level');
  }

  // NICE-TO-HAVE FIELDS (30 points total)

  // Interior general (10 points)
  let interiorPoints = 0;
  if (notes.interior.flooring && notes.interior.flooring !== '') interiorPoints += 3;
  if (notes.interior.walls && notes.interior.walls !== '') interiorPoints += 3;
  if (notes.interior.ceilings && notes.interior.ceilings !== '') interiorPoints += 2;
  if (notes.interior.lighting && notes.interior.lighting !== '') interiorPoints += 2;
  points += interiorPoints;
  if (interiorPoints < 5) {
    assumptions.push('Interior finishes assumed at average condition');
  }

  // Exterior details (10 points)
  let exteriorPoints = 0;
  if (notes.exterior.siding && notes.exterior.siding !== '') exteriorPoints += 3;
  if (notes.exterior.doors && notes.exterior.doors !== '') exteriorPoints += 2;
  if (notes.exterior.driveway && notes.exterior.driveway !== '') exteriorPoints += 2;
  if (notes.exterior.landscaping && notes.exterior.landscaping !== '') exteriorPoints += 2;
  if (notes.exterior.gutters && notes.exterior.gutters !== '') exteriorPoints += 1;
  points += exteriorPoints;

  // Additional issues checked (10 points - important for accuracy)
  let issuesPoints = 0;
  if (notes.additionalIssues) {
    // Even if all are "false", we know they were checked
    if (notes.additionalIssues.mold !== undefined) issuesPoints += 2;
    if (notes.additionalIssues.termites !== undefined) issuesPoints += 2;
    if (notes.additionalIssues.waterDamage !== undefined) issuesPoints += 2;
    if (notes.additionalIssues.structuralIssues !== undefined) issuesPoints += 2;
    if (notes.additionalIssues.codeViolations !== undefined) issuesPoints += 2;
  }
  points += issuesPoints;
  if (issuesPoints < 5) {
    assumptions.push('Major issues (mold, termites, etc.) not verified');
  }

  // BONUS POINTS (can exceed 100)
  
  // Detailed notes provided
  let notesBonus = 0;
  if (notes.roof.notes && notes.roof.notes.length > 20) notesBonus += 1;
  if (notes.hvac.notes && notes.hvac.notes.length > 20) notesBonus += 1;
  if (notes.plumbing.notes && notes.plumbing.notes.length > 20) notesBonus += 1;
  if (notes.electrical.notes && notes.electrical.notes.length > 20) notesBonus += 1;
  if (notes.generalNotes && notes.generalNotes.length > 50) notesBonus += 2;
  points += notesBonus;

  // Cap at 100
  const finalScore = Math.min(100, points);

  // Determine confidence level
  let level: 'Low' | 'Medium' | 'High' | 'Very High';
  let color: string;

  if (finalScore >= 85) {
    level = 'Very High';
    color = 'text-green-700 bg-green-50 border-green-200';
  } else if (finalScore >= 65) {
    level = 'High';
    color = 'text-blue-700 bg-blue-50 border-blue-200';
  } else if (finalScore >= 40) {
    level = 'Medium';
    color = 'text-amber-700 bg-amber-50 border-amber-200';
  } else {
    level = 'Low';
    color = 'text-red-700 bg-red-50 border-red-200';
  }

  // Additional contextual assumptions
  if (yearBuilt && yearBuilt < 1980) {
    assumptions.push(`Pre-1980 property may have dated systems`);
  }
  if (yearBuilt && yearBuilt > 2010) {
    assumptions.push(`Recent construction - lower baseline rehab needs`);
  }
  if (notes.floodZone) {
    assumptions.push(`Property in flood zone - higher insurance costs`);
  }

  return {
    score: finalScore,
    level,
    color,
    missingFields: missingFields.slice(0, 5), // Top 5 most important
    assumptions: assumptions.slice(0, 6) // Top 6 assumptions
  };
}
