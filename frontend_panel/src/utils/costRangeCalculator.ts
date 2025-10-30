/**
 * Cost Range Calculator
 * Generates low-high cost estimates with top cost drivers
 */

import { DealNotes } from '../types/deal';
import { LineItem } from '../components/LineItemEditor';

export interface CostDriver {
  category: string;
  lowCost: number;
  highCost: number;
  confidence: 'High' | 'Medium' | 'Low';
  description: string;
}

export interface CostRangeResult {
  lowEstimate: number;
  highEstimate: number;
  midEstimate: number;
  topDrivers: CostDriver[];
  uncertaintyFactors: string[];
}

export function calculateCostRange(
  lineItems: LineItem[],
  notes: DealNotes,
  sqft: number,
  units: number
): CostRangeResult {
  const drivers: CostDriver[] = [];
  const uncertaintyFactors: string[] = [];

  // Group line items by category and calculate ranges
  const categoryTotals: Record<string, { low: number; high: number; items: LineItem[] }> = {
    structural: { low: 0, high: 0, items: [] },
    systems: { low: 0, high: 0, items: [] },
    interior: { low: 0, high: 0, items: [] },
    exterior: { low: 0, high: 0, items: [] }
  };

  // Process each line item with variance
  lineItems.forEach(item => {
    const category = item.category;
    const baseCost = item.estimatedCost;
    
    // Apply variance based on category and confidence
    let lowVariance = 0.85; // -15% for low estimate
    let highVariance = 1.25; // +25% for high estimate

    // Structural items have wider ranges (more uncertainty)
    if (category === 'structural') {
      lowVariance = 0.80; // -20%
      highVariance = 1.40; // +40%
    }

    // Systems are more predictable
    if (category === 'systems') {
      lowVariance = 0.90; // -10%
      highVariance = 1.20; // +20%
    }

    const lowCost = Math.round(baseCost * lowVariance);
    const highCost = Math.round(baseCost * highVariance);

    categoryTotals[category].low += lowCost;
    categoryTotals[category].high += highCost;
    categoryTotals[category].items.push(item);

    // Track as potential driver if cost is significant
    if (baseCost > 3000) {
      drivers.push({
        category: item.category,
        lowCost,
        highCost,
        confidence: baseCost > 10000 ? 'Low' : baseCost > 5000 ? 'Medium' : 'High',
        description: item.description
      });
    }
  });

  // Calculate totals
  let lowTotal = 0;
  let highTotal = 0;

  Object.values(categoryTotals).forEach(cat => {
    lowTotal += cat.low;
    highTotal += cat.high;
  });

  // Add contingency based on data quality
  const hasStructuralIssues = notes.additionalIssues?.structuralIssues ||
    notes.foundation.condition === 'Major Issues' ||
    notes.foundation.condition === 'Needs Repair';

  const hasMajorIssues = notes.additionalIssues?.mold ||
    notes.additionalIssues?.termites ||
    notes.additionalIssues?.waterDamage ||
    notes.additionalIssues?.fireDamage;

  // Contingency: 10-20% for unknowns
  let contingencyLow = 0.10;
  let contingencyHigh = 0.20;

  if (hasStructuralIssues) {
    contingencyHigh = 0.30; // +30% for structural uncertainty
    uncertaintyFactors.push('Structural issues may reveal hidden damage');
  }

  if (hasMajorIssues) {
    contingencyHigh = 0.35; // +35% for major issues
    uncertaintyFactors.push('Major issues (mold/termites) often have hidden extent');
  }

  // Check for missing data
  if (!notes.overallCondition || notes.overallCondition === '') {
    uncertaintyFactors.push('Overall condition not assessed');
    contingencyHigh += 0.05;
  }

  if (!notes.roof.condition || notes.roof.condition === '') {
    uncertaintyFactors.push('Roof condition unknown');
    contingencyHigh += 0.05;
  }

  if (!notes.hvac.condition || notes.hvac.condition === '') {
    uncertaintyFactors.push('HVAC condition not verified');
    contingencyHigh += 0.05;
  }

  // Old property = higher uncertainty
  const isOldProperty = notes.roof.roofYear ? (new Date().getFullYear() - notes.roof.roofYear > 30) : false;
  if (isOldProperty) {
    uncertaintyFactors.push('Older property may have age-related issues');
    contingencyHigh += 0.05;
  }

  // Flood zone increases foundation/moisture concerns
  if (notes.floodZone) {
    uncertaintyFactors.push('Flood zone property - potential moisture issues');
    contingencyHigh += 0.05;
  }

  // Unknown plumbing material
  if (!notes.plumbing.pipeMaterial || notes.plumbing.pipeMaterial === 'Unknown') {
    uncertaintyFactors.push('Plumbing material unknown - may need replacement');
    contingencyHigh += 0.03;
  }

  // Knob & tube or aluminum wiring
  if (notes.electrical.wiringType === 'Knob & Tube' || notes.electrical.wiringType === 'Aluminum') {
    uncertaintyFactors.push('Outdated wiring type - full rewire likely needed');
  }

  // Cap contingency at reasonable levels
  contingencyLow = Math.min(0.15, contingencyLow);
  contingencyHigh = Math.min(0.45, contingencyHigh);

  // Apply contingency
  const contingencyAmountLow = Math.round(lowTotal * contingencyLow);
  const contingencyAmountHigh = Math.round(highTotal * contingencyHigh);

  lowTotal += contingencyAmountLow;
  highTotal += contingencyAmountHigh;

  // Sort drivers by high cost (biggest impact)
  drivers.sort((a, b) => b.highCost - a.highCost);

  // Create category-level drivers for summary
  const categoryDrivers: CostDriver[] = Object.entries(categoryTotals)
    .filter(([_, data]) => data.items.length > 0)
    .map(([category, data]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      lowCost: data.low,
      highCost: data.high,
      confidence: data.items.length >= 3 ? 'Medium' : 'Low',
      description: `${data.items.length} item${data.items.length > 1 ? 's' : ''} in ${category}`
    }))
    .sort((a, b) => b.highCost - a.highCost);

  // Add contingency as a driver
  if (contingencyAmountHigh > 0) {
    categoryDrivers.push({
      category: 'Contingency',
      lowCost: contingencyAmountLow,
      highCost: contingencyAmountHigh,
      confidence: 'Low',
      description: `Unknowns & hidden issues (${Math.round(contingencyLow * 100)}-${Math.round(contingencyHigh * 100)}%)`
    });
  }

  const midEstimate = Math.round((lowTotal + highTotal) / 2);

  return {
    lowEstimate: lowTotal,
    highEstimate: highTotal,
    midEstimate,
    topDrivers: categoryDrivers.slice(0, 5), // Top 5 categories
    uncertaintyFactors: uncertaintyFactors.slice(0, 5) // Top 5 factors
  };
}
