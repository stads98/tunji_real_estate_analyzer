/**
 * Smart Defaults & Auto-Population Logic
 * Intelligently fills in missing data based on property characteristics
 */

import { DealNotes } from '../types/deal';

export interface SmartDefaultsResult {
  updatedNotes: DealNotes;
  appliedDefaults: string[];
}

/**
 * Apply smart defaults based on property characteristics
 */
export function applySmartDefaults(
  notes: DealNotes,
  yearBuilt?: number,
  zipCode?: string
): SmartDefaultsResult {
  const updatedNotes = { ...notes };
  const appliedDefaults: string[] = [];

  const currentYear = new Date().getFullYear();
  const propertyAge = yearBuilt ? currentYear - yearBuilt : undefined;

  // AUTO-CALCULATE ROOF AGE FROM ROOF YEAR
  if (notes.roof.roofYear && !notes.roof.age) {
    const roofAge = currentYear - notes.roof.roofYear;
    updatedNotes.roof.age = `${roofAge} years`;
    appliedDefaults.push(`Roof age calculated: ${roofAge} years from install year ${notes.roof.roofYear}`);
  }

  // AUTO-SET ROOF CONDITION FROM ROOF YEAR
  if (notes.roof.roofYear && !notes.roof.condition) {
    const roofAge = currentYear - notes.roof.roofYear;
    if (roofAge <= 5) {
      updatedNotes.roof.condition = 'New (0-5 yrs)';
      appliedDefaults.push('Roof condition set to "New" based on roof year');
    } else if (roofAge <= 15) {
      updatedNotes.roof.condition = 'Good (6-15 yrs)';
      appliedDefaults.push('Roof condition set to "Good" based on roof year');
    } else if (roofAge <= 20) {
      updatedNotes.roof.condition = 'Fair (16-20 yrs)';
      appliedDefaults.push('Roof condition set to "Fair" based on roof year');
    } else {
      updatedNotes.roof.condition = 'Poor (20+ yrs)';
      appliedDefaults.push('Roof condition set to "Poor" based on roof year');
    }
  }

  // FLOOD ZONE DETECTION (Broward County high-risk areas)
  if (zipCode && !notes.floodZone) {
    const floodRiskZips = [
      '33004', '33009', // Dania Beach, Hallandale coastal areas
      '33019', '33020', // Hollywood coastal
      '33062', '33308', // Pompano Beach coastal
      '33316', '33315', // Fort Lauderdale low-lying areas
    ];
    
    if (floodRiskZips.includes(zipCode)) {
      updatedNotes.floodZone = true;
      appliedDefaults.push(`Property flagged as potential flood zone (ZIP: ${zipCode})`);
    }
  }

  // SMART DEFAULTS BASED ON PROPERTY AGE
  if (propertyAge !== undefined) {
    // Plumbing Material - Guess based on era
    if (!notes.plumbing.pipeMaterial || notes.plumbing.pipeMaterial === '') {
      if (propertyAge <= 15) {
        updatedNotes.plumbing.pipeMaterial = 'PEX';
        appliedDefaults.push('Plumbing material assumed PEX (modern construction)');
      } else if (propertyAge <= 30) {
        updatedNotes.plumbing.pipeMaterial = 'Copper';
        appliedDefaults.push('Plumbing material assumed Copper (1990s-2000s standard)');
      } else if (propertyAge <= 50) {
        updatedNotes.plumbing.pipeMaterial = 'Mixed';
        appliedDefaults.push('Plumbing material assumed Mixed (older property, likely updated)');
      } else {
        updatedNotes.plumbing.pipeMaterial = 'Galvanized';
        appliedDefaults.push('⚠️ Plumbing material assumed Galvanized (pre-1970s - likely needs replacement)');
      }
    }

    // Pipe Age - Set based on property age if unknown
    if (!notes.plumbing.pipeAge || notes.plumbing.pipeAge === '') {
      if (propertyAge <= 15) {
        updatedNotes.plumbing.pipeAge = 'Recently Updated';
      } else if (propertyAge <= 25) {
        updatedNotes.plumbing.pipeAge = '10-20 yrs';
      } else if (propertyAge <= 40) {
        updatedNotes.plumbing.pipeAge = '20+ yrs';
      } else {
        updatedNotes.plumbing.pipeAge = 'Original';
        appliedDefaults.push('⚠️ Plumbing age assumed original to house (inspection recommended)');
      }
    }

    // Electrical Panel - Guess based on era
    if (!notes.electrical.panelAmperage || notes.electrical.panelAmperage === '') {
      if (propertyAge <= 20) {
        updatedNotes.electrical.panelAmperage = '200A';
        appliedDefaults.push('Panel amperage assumed 200A (modern construction)');
      } else if (propertyAge <= 40) {
        updatedNotes.electrical.panelAmperage = '150A';
        appliedDefaults.push('Panel amperage assumed 150A (1980s-2000s standard)');
      } else {
        updatedNotes.electrical.panelAmperage = '100A';
        appliedDefaults.push('⚠️ Panel amperage assumed 100A (old property - upgrade likely needed)');
      }
    }

    // Window Type - Florida considerations
    if (!notes.exterior.windowsType || notes.exterior.windowsType === '') {
      if (propertyAge <= 10) {
        updatedNotes.exterior.windowsType = 'Impact-Rated';
        appliedDefaults.push('Windows assumed Impact-Rated (post-Hurricane Andrew building codes)');
      } else if (propertyAge <= 25) {
        updatedNotes.exterior.windowsType = 'Double Pane';
        appliedDefaults.push('Windows assumed Double Pane (standard for era)');
      } else {
        updatedNotes.exterior.windowsType = 'Single Pane';
        appliedDefaults.push('⚠️ Windows assumed Single Pane (old property - replacement recommended)');
      }
    }

    // HVAC System Type - Common in Florida
    if (!notes.hvac.systemType || notes.hvac.systemType === '') {
      if (propertyAge <= 15) {
        updatedNotes.hvac.systemType = 'Central AC';
        appliedDefaults.push('HVAC assumed Central AC (standard for modern FL homes)');
      } else {
        updatedNotes.hvac.systemType = 'Central AC';
        appliedDefaults.push('HVAC assumed Central AC (standard for FL)');
      }
    }

    // HVAC Age/Condition - Estimate if not provided
    if ((!notes.hvac.condition || notes.hvac.condition === '') && !notes.hvac.age) {
      if (propertyAge <= 10) {
        updatedNotes.hvac.condition = 'Good (6-10 yrs)';
        appliedDefaults.push('HVAC condition assumed Good (newer property)');
      } else if (propertyAge <= 20) {
        updatedNotes.hvac.condition = 'Fair (11-15 yrs)';
        appliedDefaults.push('HVAC condition assumed Fair (may need service soon)');
      } else {
        updatedNotes.hvac.condition = 'Old (15+ yrs)';
        appliedDefaults.push('⚠️ HVAC assumed old (replacement likely needed)');
      }
    }
  }

  return {
    updatedNotes,
    appliedDefaults
  };
}

/**
 * Calculate comprehensive hidden assumptions for display
 */
export function getHiddenAssumptions(
  notes: DealNotes,
  yearBuilt?: number,
  sqft?: number
): string[] {
  const assumptions: string[] = [];
  const currentYear = new Date().getFullYear();

  // Roof assumptions
  if (!notes.roof.condition || notes.roof.condition === '') {
    assumptions.push('🏠 Roof condition not assessed - assuming average for property age');
  }
  if (notes.roof.roofYear) {
    const roofAge = currentYear - notes.roof.roofYear;
    if (roofAge > 20) {
      assumptions.push(`⚠️ Roof is ${roofAge} years old - typical FL roof lifespan is 15-20 years`);
    }
  }

  // Flood zone
  if (notes.floodZone) {
    assumptions.push('🌊 Property in flood zone - higher insurance costs and foundation concerns');
  }

  // Plumbing red flags (ONLY show if plumbing condition is NOT updated/good)
  const plumbingIsGood = notes.plumbing.condition === 'Excellent' || notes.plumbing.condition === 'Good';
  if (notes.plumbing.pipeMaterial === 'Galvanized' && !plumbingIsGood) {
    assumptions.push('🚨 Galvanized pipes are outdated and MUST be replaced - health and safety concern');
  }
  if (notes.plumbing.pipeAge === 'Original' && yearBuilt && currentYear - yearBuilt > 40 && !plumbingIsGood) {
    assumptions.push('⚠️ Original plumbing from 1980s or earlier - high risk of failure');
  }

  // Electrical red flags (ONLY show if electrical condition is NOT updated)
  const electricalIsUpdated = notes.electrical.condition === 'Updated';
  if (notes.electrical.wiringType === 'Knob & Tube' && !electricalIsUpdated) {
    assumptions.push('🚨 Knob & Tube wiring is dangerous - immediate full rewire required');
  }
  if (notes.electrical.wiringType === 'Aluminum' && !electricalIsUpdated) {
    assumptions.push('⚠️ Aluminum wiring is a fire hazard - replacement recommended');
  }
  if (notes.electrical.panelAmperage === '100A' && !electricalIsUpdated) {
    assumptions.push('⚡ 100A panel is below modern standards - 200A upgrade recommended for resale');
  }

  // Windows (Florida-specific)
  if (notes.exterior.windowsType === 'Single Pane' || notes.exterior.windows === 'Old Single Pane') {
    assumptions.push('🪟 Single pane windows not hurricane-rated - insurance may require upgrade');
  }
  if (!notes.exterior.windowsType || notes.exterior.windowsType === 'Unknown') {
    assumptions.push('❓ Window type unknown - assuming standard for property age');
  }

  // HVAC (ONLY show if condition is actually old/broken, NOT if new/good)
  const hvacIsGood = notes.hvac.condition === 'New (0-5 yrs)' || notes.hvac.condition === 'Good (6-10 yrs)';
  if ((notes.hvac.condition === 'Old (15+ yrs)' || notes.hvac.condition === 'Not Working') && !hvacIsGood) {
    assumptions.push('❄️ HVAC replacement needed - essential for FL rentals');
  }

  // Size-based assumptions
  if (sqft && sqft < 1000) {
    assumptions.push('📐 Small property - using base costs with minimal scaling');
  } else if (sqft && sqft > 3000) {
    assumptions.push('📐 Large property - costs scaled proportionally');
  }

  return assumptions;
}
