// v253_change: Centralized auto-calculations helper
import { DealInputs } from '../types/deal';
import { calculateCurrentInsurance, calculateRehabInsurance } from './insuranceCalculator';

/**
 * Applies auto-calculations to deal inputs based on what changed
 * This centralizes all auto-calc logic to prevent scattered updates
 * 
 * @param prev - Previous deal inputs state
 * @param patch - Partial update to apply
 * @returns Updated deal inputs with all auto-calculations applied
 */
export function withAutoCalcs(
  prev: DealInputs,
  patch: Partial<DealInputs>
): DealInputs {
  const updated = { ...prev, ...patch };
  
  // Auto-detect hurricane windows and new roof from rehab notes for insurance discounts
  const autoDetectInsuranceDiscounts = (inputs: DealInputs) => {
    const notes = inputs.notes;
    if (!notes) return { hasHurricaneWindows: false, hasNewRoof: false };
    
    // Auto-detect hurricane/impact windows from rehab data
    const hasHurricaneWindows = 
      notes.exterior?.windowsType === 'Impact-Rated' || 
      notes.exterior?.windowsType === 'Hurricane' ||
      inputs.hasHurricaneWindows === true; // Manual override takes precedence
    
    // Auto-detect new roof (0-5 years old) from rehab data  
    const hasNewRoof = 
      notes.roof?.condition === 'New (0-5 yrs)' ||
      inputs.hasNewRoof === true; // Manual override takes precedence
    
    return { hasHurricaneWindows, hasNewRoof };
  };
  
  const insuranceDiscounts = autoDetectInsuranceDiscounts(updated);
  
  // Auto-calculate property taxes and insurance when purchase price changes
  // Also auto-populate ARV at 30% higher than purchase price
  if ('purchasePrice' in patch && typeof patch.purchasePrice === 'number') {
    updated.propertyTaxes = Math.round(patch.purchasePrice * 0.020); // 2.0% for Broward investment
    updated.propertyInsurance = calculateCurrentInsurance(
      patch.purchasePrice,
      updated.yearBuilt,
      updated.totalSqft,
      insuranceDiscounts.hasHurricaneWindows,
      insuranceDiscounts.hasNewRoof
    );
    
    // Auto-populate ARV at 30% higher than purchase price (conservative)
    if (!updated.afterRepairValue || updated.afterRepairValue === 0) {
      const defaultARV = Math.round(patch.purchasePrice * 1.30);
      updated.afterRepairValue = defaultARV;
      updated.rehabPropertyTaxes = Math.round(defaultARV * 0.020);
      updated.rehabPropertyInsurance = calculateRehabInsurance(
        defaultARV,
        updated.yearBuilt,
        updated.totalSqft,
        insuranceDiscounts.hasHurricaneWindows,
        insuranceDiscounts.hasNewRoof
      );
    }
  }
  
  // Auto-calculate insurance when year built changes
  if ('yearBuilt' in patch && typeof patch.yearBuilt === 'number') {
    updated.propertyInsurance = calculateCurrentInsurance(
      updated.purchasePrice,
      patch.yearBuilt,
      updated.totalSqft,
      insuranceDiscounts.hasHurricaneWindows,
      insuranceDiscounts.hasNewRoof
    );
    updated.rehabPropertyInsurance = calculateRehabInsurance(
      updated.afterRepairValue,
      patch.yearBuilt,
      updated.totalSqft,
      insuranceDiscounts.hasHurricaneWindows,
      insuranceDiscounts.hasNewRoof
    );
  }
  
  // Auto-calculate insurance when total sqft changes
  if ('totalSqft' in patch && typeof patch.totalSqft === 'number') {
    updated.propertyInsurance = calculateCurrentInsurance(
      updated.purchasePrice,
      updated.yearBuilt,
      patch.totalSqft,
      insuranceDiscounts.hasHurricaneWindows,
      insuranceDiscounts.hasNewRoof
    );
    updated.rehabPropertyInsurance = calculateRehabInsurance(
      updated.afterRepairValue,
      updated.yearBuilt,
      patch.totalSqft,
      insuranceDiscounts.hasHurricaneWindows,
      insuranceDiscounts.hasNewRoof
    );
  }
  
  // Auto-calculate rehab taxes/insurance when ARV changes
  if ('afterRepairValue' in patch && typeof patch.afterRepairValue === 'number') {
    updated.rehabPropertyTaxes = Math.round(patch.afterRepairValue * 0.020);
    updated.rehabPropertyInsurance = calculateRehabInsurance(
      patch.afterRepairValue,
      updated.yearBuilt,
      updated.totalSqft,
      insuranceDiscounts.hasHurricaneWindows,
      insuranceDiscounts.hasNewRoof
    );
  }
  
  // Re-calculate insurance when hurricane windows or new roof flags change
  if ('hasHurricaneWindows' in patch || 'hasNewRoof' in patch || 'notes' in patch) {
    const newDiscounts = autoDetectInsuranceDiscounts(updated);
    updated.propertyInsurance = calculateCurrentInsurance(
      updated.purchasePrice,
      updated.yearBuilt,
      updated.totalSqft,
      newDiscounts.hasHurricaneWindows,
      newDiscounts.hasNewRoof
    );
    updated.rehabPropertyInsurance = calculateRehabInsurance(
      updated.afterRepairValue,
      updated.yearBuilt,
      updated.totalSqft,
      newDiscounts.hasHurricaneWindows,
      newDiscounts.hasNewRoof
    );
  }
  
  // Auto-update acquisition costs when purchase price changes
  // Only auto-update if it's currently at the default 5% OR undefined
  if ('purchasePrice' in patch && typeof patch.purchasePrice === 'number') {
    const oldDefaultAmount = Math.round(prev.purchasePrice * 0.05);
    const isAtDefault = updated.acquisitionCostsAmount === undefined || 
                        updated.acquisitionCostsAmount === oldDefaultAmount;
    
    if (isAtDefault) {
      updated.acquisitionCostsAmount = Math.round(patch.purchasePrice * 0.05);
    }
    
    // Same logic for bridge settlement charges (6%)
    const oldBridgeDefault = Math.round(prev.purchasePrice * 0.06);
    const isBridgeAtDefault = updated.bridgeSettlementCharges === undefined || 
                              updated.bridgeSettlementCharges === oldBridgeDefault;
    
    if (isBridgeAtDefault) {
      updated.bridgeSettlementCharges = Math.round(patch.purchasePrice * 0.06);
    }
  }
  
  if ('afterRepairValue' in patch && updated.dscrAcquisitionCosts === undefined) {
    updated.dscrAcquisitionCosts = Math.round(updated.afterRepairValue * 0.05);
  }
  
  return updated;
}
