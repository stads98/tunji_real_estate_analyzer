// v253_change: Schema migrations for deal data
import { DealInputs, SavedDeal, DEAL_SCHEMA_VERSION, UnitDetail } from '../types/deal';
import { getDefaultNotes } from './defaultNotes';

/**
 * Migrates a raw saved deal object to the current schema version
 * Handles backward compatibility with older deal formats
 */
export function migrateDeal(raw: any): SavedDeal {
  const schemaVersion = raw.schemaVersion || 1;
  
  // Start with the raw data
  let deal: any = { ...raw };
  
  // Migration from v1 to v2
  if (schemaVersion < 2) {
    // Split legacy propertyTaxesInsurance if it exists
    if (deal.propertyTaxesInsurance && !deal.propertyTaxes && !deal.propertyInsurance) {
      deal.propertyTaxes = deal.propertyTaxesInsurance * 0.6; // Rough 60/40 split
      deal.propertyInsurance = deal.propertyTaxesInsurance * 0.4;
    }
  }
  
  // Migration from v2 to v3
  if (schemaVersion < 3) {
    // Convert legacy marketRent to section8Rent using 1.10 multiplier if needed
    if (deal.unitDetails && Array.isArray(deal.unitDetails)) {
      deal.unitDetails = deal.unitDetails.map((unit: any) => {
        const migratedUnit: UnitDetail = {
          beds: unit.beds || 0,
          baths: unit.baths || 0,
          sqft: unit.sqft,
          section8Rent: unit.section8Rent || (unit.marketRent ? unit.marketRent * 1.1 : 0),
          marketRent: unit.marketRent,
          afterRehabMarketRent: unit.afterRehabMarketRent,
          strMonthlyRevenue: unit.strMonthlyRevenue || 2400, // Keep for backward compatibility
          // Migrate to new STR annual format
          strAnnualRevenue: unit.strAnnualRevenue || (unit.strMonthlyRevenue ? unit.strMonthlyRevenue * 12 : 28800),
          strAnnualExpenses: unit.strAnnualExpenses || 5000, // Default annual operating expenses
          strOccupancy: unit.strOccupancy, // Will fall back to global if undefined
        };
        return migratedUnit;
      });
    }
    
    // Ensure notes structure exists
    if (!deal.notes) {
      deal.notes = getDefaultNotes();
    }
    
    // Ensure ARV fields exist
    if (!deal.arvComps) {
      deal.arvComps = [];
    }
    if (deal.calculatedARV === undefined) {
      deal.calculatedARV = 0;
    }
  }
  
  // STR Annual Format Migration: Migrate any remaining strMonthlyRevenue to annual format
  // This handles existing v3 deals that were saved before the STR annual format change
  if (deal.unitDetails && Array.isArray(deal.unitDetails)) {
    deal.unitDetails = deal.unitDetails.map((unit: any) => {
      // If we have strMonthlyRevenue but not strAnnualRevenue, migrate it
      if (unit.strMonthlyRevenue && !unit.strAnnualRevenue) {
        return {
          ...unit,
          strAnnualRevenue: unit.strMonthlyRevenue * 12,
          strAnnualExpenses: unit.strAnnualExpenses || 5000,
          strOccupancy: unit.strOccupancy // Will fall back to global if undefined
        };
      }
      // Ensure new fields have defaults if missing
      if (unit.strAnnualRevenue !== undefined && unit.strAnnualExpenses === undefined) {
        return {
          ...unit,
          strAnnualExpenses: 5000 // Default if missing
        };
      }
      return unit;
    });
  }
  
  // v254_change: Migrate legacy photoUrl to photos array (non-breaking, forward-compatible)
  if (deal.photoUrl && (!deal.photos || deal.photos.length === 0)) {
    deal.photos = [{
      id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: deal.photoUrl,
      isPrimary: true
    }];
  }
  
  // Ensure photos array exists
  if (!deal.photos) {
    deal.photos = [];
  }
  
  // v255_change: Initialize new condition/motivation fields if missing (non-breaking)
  if (deal.notes) {
    // Ensure derived fields are initialized (will be recalculated in UI)
    if (!deal.notes._followUp) {
      deal.notes._followUp = [];
    }
    // Don't pre-populate other derived fields (_rehabLevel, _rehabCostPsqft, etc.) 
    // as they will be calculated live in the UI
  }
  
  // Ensure required fields for SavedDeal
  if (!deal.id) {
    deal.id = `deal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  if (!deal.savedAt) {
    deal.savedAt = new Date().toISOString();
  }
  
  // Set current schema version
  deal.schemaVersion = DEAL_SCHEMA_VERSION;
  
  return deal as SavedDeal;
}

/**
 * Safely parse localStorage data with SSR guard
 */
export function safeLocalStorageGet(key: string): any | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return null;
  }
}

/**
 * Safely write to localStorage with SSR guard and quota error handling
 */
export function safeLocalStorageSet(key: string, value: any): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const stringified = JSON.stringify(value);
    localStorage.setItem(key, stringified);
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage key "${key}":`, error);
    
    // Check if it's a quota exceeded error and provide helpful diagnostics
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('⚠️ localStorage quota exceeded!');
      console.error('Current storage items:', localStorage.length);
      
      // Calculate size of data being saved
      try {
        const stringified = JSON.stringify(value);
        const sizeInBytes = new Blob([stringified]).size;
        const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
        console.error(`Attempted to save: ${sizeInMB}MB`);
        
        // Calculate total localStorage usage
        let totalSize = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            const item = localStorage.getItem(key);
            if (item) {
              totalSize += new Blob([item]).size;
            }
          }
        }
        const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
        console.error(`Total localStorage usage: ${totalMB}MB`);
      } catch (e) {
        // Ignore size calculation errors
      }
      
      console.error('💡 Solution: Download your deals as JSON backup, then delete some deals to free up space.');
    }
    
    return false;
  }
}

/**
 * Load and migrate saved deals from localStorage
 */
export function loadSavedDeals(): SavedDeal[] {
  const raw = safeLocalStorageGet('savedDeals');
  
  if (!raw || !Array.isArray(raw)) {
    return [];
  }
  
  return raw.map(migrateDeal);
}

/**
 * Save deals to localStorage
 */
export function saveDealsList(deals: SavedDeal[]): boolean {
  return safeLocalStorageSet('savedDeals', deals);
}
