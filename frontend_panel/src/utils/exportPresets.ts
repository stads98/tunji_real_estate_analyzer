// v255_change: Export presets for deals - JSON, PDF, CSV formats with smart naming

import { DealInputs, SavedDeal } from '../types/deal';
import { formatCurrency, formatPercent } from './calculations';

/**
 * Generate smart filename for exports
 * Format: YYYY-MM-DD__City__AddressShort__Xu__RehabLevel.ext
 */
export function generateSmartFilename(deal: DealInputs | SavedDeal, extension: string): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Extract city from address (assumes format: "123 Main St, City, State 12345")
  let city = 'Unknown';
  if (deal.address) {
    const parts = deal.address.split(',');
    if (parts.length >= 2) {
      city = parts[1].trim().replace(/\s+/g, '_');
    }
  }
  
  // Short address (first part only, remove special chars)
  let addressShort = 'Property';
  if (deal.address) {
    addressShort = deal.address
      .split(',')[0]
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 20);
  }
  
  // Units
  const unitsStr = `${deal.units}u`;
  
  // Rehab level (from notes or default to 'NoRehab')
  const rehabLevel = deal.notes?._rehabLevel || (deal.isRehab ? 'medium' : 'NoRehab');
  
  return `${today}__${city}__${addressShort}__${unitsStr}__${rehabLevel}.${extension}`;
}

/**
 * Export deal as underwriting JSON (full state, minified)
 */
export function exportUnderwritingJSON(deal: SavedDeal): void {
  const filename = generateSmartFilename(deal, 'json');
  
  // Calculate a simple hash of critical inputs for version tracking
  const criticalInputs = `${deal.purchasePrice}_${deal.units}_${deal.totalSqft}_${deal.yearBuilt}`;
  const calcHash = btoa(criticalInputs).substring(0, 8);
  
  const exportData = {
    ...deal,
    _exportMeta: {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      calcHash,
    },
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Export deal as CSV for review/spreadsheet import
 * Columns: Address, Price, Units, YearBuilt, Sqft, RehabLevel, RehabCost, Risk, DSCR, CoC, ARV, FundsGap
 */
export function exportReviewCSV(deals: SavedDeal[], calculations?: {
  [dealId: string]: {
    dscr: number;
    cashOnCash: number;
    fundsGap?: number;
  };
}): void {
  const filename = `DealReview_${new Date().toISOString().split('T')[0]}.csv`;
  
  // CSV header
  const headers = [
    'Address',
    'Price',
    'Units',
    'YearBuilt',
    'Sqft',
    'RehabLevel',
    'RehabCost',
    'Risk',
    'DSCR',
    'CoC',
    'ARV',
    'FundsGap',
  ].join(',');
  
  // CSV rows
  const rows = deals.map(deal => {
    const calc = calculations?.[deal.id || ''];
    
    return [
      `"${deal.address || 'N/A'}"`,
      deal.purchasePrice || 0,
      deal.units || 1,
      deal.yearBuilt || 0,
      deal.totalSqft || 0,
      deal.notes?._rehabLevel || (deal.isRehab ? 'medium' : 'none'),
      deal.notes?._rehabCostEstimate || deal.rehabCost || 0,
      deal.notes?._riskScore || 0,
      calc?.dscr?.toFixed(2) || 'N/A',
      calc?.cashOnCash ? `${calc.cashOnCash.toFixed(2)}%` : 'N/A',
      deal.afterRepairValue || deal.purchasePrice || 0,
      calc?.fundsGap || 0,
    ].join(',');
  });
  
  const csvContent = [headers, ...rows].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate Agent Call Sheet as plain text (can be copied or saved)
 * TODO: Actual PDF generation would require a library like jsPDF
 */
export function generateAgentCallSheet(deal: DealInputs | SavedDeal): string {
  const notes = deal.notes;
  
  let callSheet = `
═══════════════════════════════════════════════════════
  AGENT CALL SHEET
═══════════════════════════════════════════════════════

PROPERTY INFORMATION
────────────────────────────────────────────────────────
Address:        ${deal.address || 'N/A'}
Units:          ${deal.units}
Sqft:           ${deal.totalSqft?.toLocaleString()} sq ft
Year Built:     ${deal.yearBuilt}
Purchase Price: ${formatCurrency(deal.purchasePrice)}

CONDITION SUMMARY
────────────────────────────────────────────────────────
Overall Condition:    ${notes?.overallCondition || 'Not assessed'}
Rehab Level:          ${notes?._rehabLevel?.toUpperCase() || 'Not calculated'}
Estimated Rehab Cost: ${notes?._rehabCostEstimate ? formatCurrency(notes._rehabCostEstimate) : 'Not calculated'}
Cost per Sqft:        ${notes?._rehabCostPsqft ? `$${notes._rehabCostPsqft.toFixed(2)}/sqft` : 'N/A'}
Risk Score:           ${notes?._riskScore}/10

SYSTEMS & STRUCTURE
────────────────────────────────────────────────────────
Foundation:     ${notes?.foundationType || 'Unknown'}
Roof:           Age ${notes?.roofAge || '?'} yrs • ${notes?.roof?.condition || 'Unknown'}
HVAC:           ${notes?.hvacType || 'Unknown'} • Age ${notes?.hvacAge || '?'} yrs • ${notes?.hvacWorking || 'Unknown'}
Electrical:     Panel ${notes?.electricalUpdated || 'Unknown'} • ${notes?.electrical?.panelSize || 'Unknown'}
Plumbing:       ${notes?.plumbing?.pipeMaterial || 'Unknown'}
Water Heater:   Age ${notes?.waterHeaterAge || '?'} yrs

INTERIOR
────────────────────────────────────────────────────────
Kitchen:        ${notes?.kitchenConditionLevel || notes?.kitchen?.condition || 'Unknown'}
Bathrooms:      ${notes?.bathroomsConditionLevel || 'Unknown'}
Flooring:       ${notes?.flooringCondition || notes?.interior?.flooring || 'Unknown'}
Windows:        ${notes?.windowsType || notes?.exterior?.windows || 'Unknown'}
Paint Needed:   ${notes?.interiorPaintNeeded ? 'Yes' : 'No'}
Ceiling Issues: ${notes?.ceilingStains ? 'Yes (water stains)' : 'No'}

LOCATION & RISK
────────────────────────────────────────────────────────
Neighborhood:   Tier ${notes?.neighborhoodTier || '?'}
Crime Risk:     ${notes?.crimeRisk || 'Unknown'}
Insurance Zone: ${notes?.insuranceZone || 'Unknown'}
Flood Zone:     ${notes?.floodZone ? 'Yes' : 'No'}
Water Proximity:${notes?.proximityToWater ? `${notes.proximityToWater} ft` : 'Unknown'}

SELLER MOTIVATION
────────────────────────────────────────────────────────
Reason:         ${notes?.sellingReason || 'Unknown'}
Timeline:       ${notes?.timelinePressure ? 'YES - needs fast close' : 'Flexible'}
Price:          ${notes?.flexibleOnPrice ? 'Flexible' : 'Firm'}
As-Is:          ${notes?.asIsAccepted ? 'Yes' : 'No'}

FOLLOW-UP ITEMS
────────────────────────────────────────────────────────
${notes?._followUp && notes._followUp.length > 0 
  ? notes._followUp.map((item, idx) => `${idx + 1}. ${item}`).join('\n')
  : 'None - all information collected'}

REALTOR NOTES
────────────────────────────────────────────────────────
${notes?.realtorNotes || 'No notes'}

═══════════════════════════════════════════════════════
Generated: ${new Date().toLocaleString()}
═══════════════════════════════════════════════════════
`;
  
  return callSheet;
}

/**
 * Download agent call sheet as text file
 */
export function downloadAgentCallSheet(deal: DealInputs | SavedDeal): void {
  const filename = generateSmartFilename(deal, 'txt').replace('.txt', '_CallSheet.txt');
  const content = generateAgentCallSheet(deal);
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Copy agent call sheet to clipboard
 */
export function copyAgentCallSheet(deal: DealInputs | SavedDeal): Promise<void> {
  const content = generateAgentCallSheet(deal);
  return navigator.clipboard.writeText(content);
}
