/**
 * Line Item Generator
 * Converts property condition assessment into detailed scope of work line items
 */

import { DealNotes } from '../types/deal';
import { LineItem } from '../components/LineItemEditor';

export function generateLineItems(
  notes: DealNotes,
  sqft: number,
  units: number
): LineItem[] {
  const items: LineItem[] = [];
  let idCounter = 0;

  // Multi-unit multiplier for shared/distributed costs
  const unitMultiplier = units > 1 ? 1 + (units - 1) * 0.7 : 1; // Each additional unit adds 70% of base cost
  
  // Size multiplier for sqft-based adjustments
  const sizeMultiplier = sqft < 1200 ? 0.85 : sqft > 2500 ? 1.15 : 1;

  const createItem = (
    category: LineItem['category'],
    description: string,
    cost: number
  ): LineItem => ({
    id: `auto-${idCounter++}`,
    category,
    description,
    estimatedCost: Math.round(cost),
    isManuallyEdited: false,
  });

  // STRUCTURAL ITEMS

  // Roof - Scales with sqft and units
  // Only add roof costs if NOT explicitly marked as New or Good
  const roofIsGood = notes.roof.condition === 'New (0-5 yrs)' || notes.roof.condition === 'Good (6-15 yrs)';
  
  if (!roofIsGood) {
    if (notes.roof.condition === 'Needs Replacement') {
      const roofCost = (sqft / 100) * 1800 * (units > 1 ? 1 : 1); // Roof scales with sqft, not units for multi-family
      items.push(createItem('structural', `Roof Replacement (${sqft} sqft)`, roofCost));
    } else if (notes.roof.condition === 'Poor (20+ yrs)') {
      const repairCost = 5000 * sizeMultiplier;
      items.push(createItem('structural', 'Roof Repairs & Patching', repairCost));
    } else if (notes.roof.leaks) {
      const leakCost = 3000 * sizeMultiplier;
      items.push(createItem('structural', 'Roof Leak Repairs', leakCost));
    }
  }

  // Foundation - Scales with size and units
  if (notes.foundation.condition === 'Major Issues' || notes.foundation.condition === 'Needs Repair') {
    const baseCost = notes.foundation.condition === 'Major Issues' ? 25000 : 12000;
    const foundationCost = baseCost * sizeMultiplier;
    items.push(createItem('structural', `Foundation Repairs (${notes.foundation.condition})`, foundationCost));
  } else if (notes.foundation.condition === 'Minor Cracks') {
    const crackCost = 3000 * sizeMultiplier;
    items.push(createItem('structural', 'Foundation Crack Sealing', crackCost));
  }

  // Additional Structural Issues - Scale with size and units
  if (notes.additionalIssues.structuralIssues) {
    const structuralCost = 15000 * sizeMultiplier * unitMultiplier;
    const desc = notes.additionalIssues.structuralIssuesDetails 
      ? `Structural Repairs - ${notes.additionalIssues.structuralIssuesDetails.substring(0, 40)}${notes.additionalIssues.structuralIssuesDetails.length > 40 ? '...' : ''}`
      : 'Structural Repairs (Beams/Joists)';
    items.push(createItem('structural', desc, structuralCost));
  }

  if (notes.additionalIssues.termites) {
    const termiteCost = 8000 * sizeMultiplier * unitMultiplier;
    const desc = notes.additionalIssues.termitesDetails 
      ? `Termite Treatment - ${notes.additionalIssues.termitesDetails.substring(0, 40)}${notes.additionalIssues.termitesDetails.length > 40 ? '...' : ''}`
      : 'Termite Treatment & Damage Repair';
    items.push(createItem('structural', desc, termiteCost));
  }

  if (notes.additionalIssues.waterDamage) {
    const waterCost = 6000 * sizeMultiplier * unitMultiplier;
    const desc = notes.additionalIssues.waterDamageDetails 
      ? `Water Damage - ${notes.additionalIssues.waterDamageDetails.substring(0, 40)}${notes.additionalIssues.waterDamageDetails.length > 40 ? '...' : ''}`
      : 'Water Damage Remediation';
    items.push(createItem('structural', desc, waterCost));
  }

  if (notes.additionalIssues.mold) {
    const moldCost = 8000 * sizeMultiplier * unitMultiplier;
    const desc = notes.additionalIssues.moldDetails 
      ? `Mold Remediation - ${notes.additionalIssues.moldDetails.substring(0, 40)}${notes.additionalIssues.moldDetails.length > 40 ? '...' : ''}`
      : 'Mold Remediation & Prevention';
    items.push(createItem('structural', desc, moldCost));
  }

  if (notes.additionalIssues.fireDamage) {
    const fireCost = 30000 * sizeMultiplier * unitMultiplier;
    items.push(createItem('structural', 'Fire Damage Restoration', fireCost));
  }

  // SYSTEMS ITEMS

  // HVAC - Enhanced with system type
  // Only add HVAC costs if NOT explicitly marked as New or Good
  const hvacIsGood = notes.hvac.condition === 'New (0-5 yrs)' || notes.hvac.condition === 'Good (6-10 yrs)';
  
  if (!hvacIsGood) {
    const hvacUnits = parseInt(notes.hvac.numberOfUnits) || units || 1;
    if (notes.hvac.condition === 'Not Working' || notes.hvac.condition === 'Old (15+ yrs)') {
      // Adjust cost based on system type
      let costPerUnit = 6000; // Default Central AC
      if (notes.hvac.systemType === 'Mini-Split') costPerUnit = 7000;
      if (notes.hvac.systemType === 'Heat Pump') costPerUnit = 7500;
      if (notes.hvac.systemType === 'Package Unit') costPerUnit = 8000;
      if (notes.hvac.systemType === 'Window Units') costPerUnit = 2000;
      
      const hvacCost = hvacUnits * costPerUnit;
      const systemDesc = notes.hvac.systemType ? ` - ${notes.hvac.systemType}` : '';
      items.push(createItem('systems', `HVAC Replacement (${hvacUnits} unit${hvacUnits > 1 ? 's' : ''})${systemDesc}`, hvacCost));
    } else if (notes.hvac.condition === 'Fair (11-15 yrs)') {
      items.push(createItem('systems', 'HVAC Service & Repair', 1500));
    }
  }

  // Plumbing - Enhanced with pipe age and material
  // Only add plumbing costs if NOT explicitly marked as Excellent or Good
  const plumbingIsGood = notes.plumbing.condition === 'Excellent' || notes.plumbing.condition === 'Good';
  
  if (!plumbingIsGood) {
    if (notes.plumbing.condition === 'Needs Replacement') {
      items.push(createItem('systems', 'Complete Plumbing Replacement', 15000));
    } else if (notes.plumbing.pipeMaterial === 'Galvanized') {
      // Galvanized pipes MUST be replaced
      const galvCost = notes.plumbing.pipeAge === 'Original' ? 14000 : 12000;
      items.push(createItem('systems', 'Galvanized Pipe Replacement (Required)', galvCost));
    } else if (notes.plumbing.pipeAge === '20+ yrs' && notes.plumbing.pipeMaterial === 'Unknown') {
      // Unknown old pipes are risky
      items.push(createItem('systems', 'Plumbing Inspection & Potential Replacement', 8000));
    } else if (notes.plumbing.condition === 'Has Issues' || notes.plumbing.leaks) {
      items.push(createItem('systems', 'Plumbing Repairs & Leak Fixes', 4000));
    }
  }

  // Water Heater
  if (notes.plumbing.waterHeater === 'Needs Replacement' || notes.plumbing.waterHeater === 'Old') {
    const waterHeaterCost = notes.plumbing.waterHeater === 'Needs Replacement' ? 1500 : 1200;
    items.push(createItem('systems', `Water Heater Replacement${units > 1 ? ` (${units} units)` : ''}`, waterHeaterCost * units));
  }

  // Electrical - Enhanced with panel amperage
  // Only add electrical costs if NOT explicitly marked as Updated
  const electricalIsGood = notes.electrical.condition === 'Updated';
  
  if (!electricalIsGood) {
    if (notes.electrical.condition === 'Unsafe' || notes.electrical.wiringType === 'Knob & Tube') {
      items.push(createItem('systems', 'Complete Electrical Rewiring', 18000));
    } else if (notes.electrical.wiringType === 'Aluminum') {
      items.push(createItem('systems', 'Aluminum Wiring Replacement', 15000));
    } else if (notes.electrical.condition === 'Needs Work') {
      const panelCost = notes.electrical.panelAmperage === '100A' ? 6000 : 5000; // 100A needs full upgrade
      const panelDesc = notes.electrical.panelAmperage === '100A' ? ' (100A → 200A Upgrade)' : '';
      items.push(createItem('systems', `Electrical Panel Upgrade & Repairs${panelDesc}`, panelCost));
    } else if (notes.electrical.panelAmperage === '100A' && notes.electrical.condition === 'Adequate') {
      // Even if adequate, 100A should be flagged for modern use
      items.push(createItem('systems', 'Panel Upgrade Recommended (100A → 200A)', 4500));
    }
  }

  if (notes.additionalIssues.codeViolations) {
    const codeCost = 6000 * unitMultiplier;
    const desc = notes.additionalIssues.codeViolationsDetails 
      ? `Code Violations - ${notes.additionalIssues.codeViolationsDetails.substring(0, 40)}${notes.additionalIssues.codeViolationsDetails.length > 40 ? '...' : ''}`
      : 'Code Violation Corrections';
    items.push(createItem('systems', desc, codeCost));
  }

  // INTERIOR ITEMS - Scale per unit for multi-family

  // Kitchen - Per unit for multi-family
  // Only add kitchen costs if NOT explicitly marked as Updated
  const kitchenIsGood = notes.kitchen.condition === 'Updated' || notes.kitchen.condition === 'Excellent';
  
  if (!kitchenIsGood) {
    if (notes.kitchen.condition === 'Needs Full Rehab') {
      const kitchenCost = 22000 * units;
      items.push(createItem('interior', `Kitchen Full Remodel${units > 1 ? ` (${units} units)` : ''}`, kitchenCost));
    } else if (notes.kitchen.condition === 'Dated') {
      const kitchenCost = 8000 * units;
      items.push(createItem('interior', `Kitchen Cosmetic Updates${units > 1 ? ` (${units} units)` : ''}`, kitchenCost));
    }
  }

  // Kitchen Components (if not full remodel) - Per unit for multi-family
  if (!kitchenIsGood && notes.kitchen.condition !== 'Needs Full Rehab') {
    if (notes.kitchen.cabinets === 'Needs Replacement') {
      const cabinetCost = 6000 * units;
      items.push(createItem('interior', `Kitchen Cabinet Replacement${units > 1 ? ` (${units} units)` : ''}`, cabinetCost));
    } else if (notes.kitchen.cabinets === 'Worn') {
      const refinishCost = 2000 * units;
      items.push(createItem('interior', `Kitchen Cabinet Refinishing${units > 1 ? ` (${units} units)` : ''}`, refinishCost));
    }

    if (notes.kitchen.countertops === 'Needs Replacement') {
      const counterCost = 3500 * units;
      items.push(createItem('interior', `Kitchen Countertop Installation${units > 1 ? ` (${units} units)` : ''}`, counterCost));
    } else if (notes.kitchen.countertops === 'Laminate Worn') {
      const refreshCost = 1500 * units;
      items.push(createItem('interior', `Kitchen Countertop Refresh${units > 1 ? ` (${units} units)` : ''}`, refreshCost));
    }

    if (notes.kitchen.appliances === 'Missing/Broken' || notes.kitchen.appliances === 'Old') {
      const baseCost = notes.kitchen.appliances === 'Missing/Broken' ? 4000 : 2500;
      const applianceCost = baseCost * units;
      items.push(createItem('interior', `Kitchen Appliances${units > 1 ? ` (${units} units)` : ''} - Range, Fridge, Dishwasher, Microwave`, applianceCost));
    }

    if (notes.kitchen.flooring === 'Needs Replacement') {
      const flooringCost = 2000 * units;
      items.push(createItem('interior', `Kitchen Flooring Installation${units > 1 ? ` (${units} units)` : ''}`, flooringCost));
    }
  }

  // Bathrooms
  notes.bathrooms.forEach((bath, idx) => {
    const bathLabel = bath.location || `Bathroom ${idx + 1}`;
    
    if (bath.condition === 'Poor') {
      items.push(createItem('interior', `${bathLabel} - Full Remodel`, 10000));
    } else if (bath.condition === 'Dated') {
      items.push(createItem('interior', `${bathLabel} - Cosmetic Update`, 4000));
    } else {
      // Individual fixture replacements
      if (bath.vanity === 'Needs Replacement') {
        items.push(createItem('interior', `${bathLabel} - Vanity Replacement`, 1200));
      }
      if (bath.toilet === 'Needs Replacement') {
        items.push(createItem('interior', `${bathLabel} - Toilet Replacement`, 400));
      }
      if (bath.tubShower === 'Cracked/Damaged') {
        items.push(createItem('interior', `${bathLabel} - Tub/Shower Replacement`, 2500));
      } else if (bath.tubShower === 'Worn/Stained') {
        items.push(createItem('interior', `${bathLabel} - Tub Refinishing`, 600));
      }
      if (bath.tile === 'Cracked/Missing') {
        items.push(createItem('interior', `${bathLabel} - Tile Replacement`, 1800));
      }
    }
  });

  // Bedrooms
  notes.bedrooms.forEach((bedroom, idx) => {
    const bedroomLabel = bedroom.location || `Bedroom ${idx + 1}`;
    
    if (bedroom.flooring === 'Needs Replacement') {
      const flooringCost = 1500; // Average per bedroom
      items.push(createItem('interior', `${bedroomLabel} - Flooring Replacement`, flooringCost));
    } else if (bedroom.flooring === 'Carpet Worn') {
      items.push(createItem('interior', `${bedroomLabel} - Carpet Replacement`, 800));
    }

    if (bedroom.condition === 'Needs Work') {
      items.push(createItem('interior', `${bedroomLabel} - Repairs & Updates`, 1200));
    } else if (bedroom.condition === 'Needs Paint') {
      items.push(createItem('interior', `${bedroomLabel} - Paint`, 500));
    }

    if (bedroom.closets === 'None' || bedroom.closets?.includes('Small')) {
      // Don't add cost for small closets, but note if completely missing
      if (bedroom.closets === 'None') {
        items.push(createItem('interior', `${bedroomLabel} - Add Closet`, 1500));
      }
    }
  });

  // Interior General - Scale with sqft and units
  if (notes.interior.flooring === 'Needs Replacement') {
    const flooringCost = sqft * 4 * (units > 1 ? unitMultiplier * 0.8 : 1); // Less scaling for shared areas
    items.push(createItem('interior', `Flooring Replacement - Common Areas (${sqft} sqft)${units > 1 ? ` (${units} units)` : ''}`, flooringCost));
  } else if (notes.interior.flooring === 'Mixed') {
    const repairCost = 2000 * unitMultiplier;
    items.push(createItem('interior', 'Flooring Repairs & Patching', repairCost));
  }

  if (notes.interior.walls === 'Needs Repair') {
    const drywallCost = 3000 * unitMultiplier;
    items.push(createItem('interior', 'Drywall Repair & Patching', drywallCost));
  } else if (notes.interior.walls === 'Needs Paint') {
    const paintCost = sqft * 2 * (units > 1 ? unitMultiplier * 0.9 : 1);
    items.push(createItem('interior', `Interior Paint - Full${units > 1 ? ` ${units} Units` : ' House'} (${sqft} sqft)`, paintCost));
  }

  if (notes.interior.ceilings === 'Needs Repair') {
    const ceilingCost = 2500 * unitMultiplier;
    items.push(createItem('interior', 'Ceiling Repairs', ceilingCost));
  } else if (notes.interior.ceilings === 'Stains/Cracks') {
    const patchCost = 1200 * unitMultiplier;
    items.push(createItem('interior', 'Ceiling Patch & Paint', patchCost));
  }

  if (notes.interior.lighting === 'Outdated' || notes.interior.lighting === 'Needs Replacement') {
    const lightingCost = 1500 * unitMultiplier;
    items.push(createItem('interior', 'Lighting Fixture Updates', lightingCost));
  }

  // EXTERIOR ITEMS - Most exterior items don't scale directly with units (shared building envelope)

  // Siding
  if (notes.exterior.siding === 'Needs Replacement') {
    const sidingCost = sqft * 8; // $8/sqft for siding (shared exterior)
    items.push(createItem('exterior', `Siding Replacement (${sqft} sqft)`, sidingCost));
  } else if (notes.exterior.siding === 'Needs Repair') {
    const repairCost = 3000 * sizeMultiplier;
    items.push(createItem('exterior', 'Siding Repairs', repairCost));
  } else if (notes.exterior.siding === 'Needs Paint') {
    const exteriorPaintCost = sqft * 3; // $3/sqft for exterior paint
    items.push(createItem('exterior', `Exterior Paint (${sqft} sqft)`, exteriorPaintCost));
  }

  // Windows - Enhanced with type and condition details
  if (notes.exterior.windows === 'Broken/Missing' || notes.exterior.windows === 'Old Single Pane') {
    let baseCost = 12000;
    
    // Adjust based on window type in Florida
    if (notes.exterior.windowsType === 'Impact-Rated' || notes.exterior.windowsType === 'Hurricane') {
      baseCost = 18000; // Impact windows are expensive but required in FL
    } else if (notes.exterior.windowsType === 'Single Pane') {
      baseCost = 10000; // Upgrading from single pane
    }
    
    // Adjust based on condition detail
    if (notes.exterior.windowsCondition === 'All Need Replacement') {
      baseCost *= 1.2; // +20% for full replacement
    } else if (notes.exterior.windowsCondition === 'Many Broken') {
      baseCost *= 1.1; // +10% for many broken
    } else if (notes.exterior.windowsCondition === 'Some Broken') {
      baseCost *= 0.4; // Only 40% for partial replacement
    }
    
    const windowCost = baseCost * (units > 1 ? unitMultiplier * 0.85 : 1);
    const typeDesc = notes.exterior.windowsType ? ` - ${notes.exterior.windowsType}` : '';
    items.push(createItem('exterior', `Window Replacement${typeDesc}${units > 1 ? ` (${units} units)` : ''}`, windowCost));
  } else if (notes.exterior.windowsCondition === 'Some Broken' || notes.exterior.windowsCondition === 'Many Broken') {
    // Handle broken windows even if main condition is "Good"
    const partialCost = notes.exterior.windowsCondition === 'Many Broken' ? 6000 : 2500;
    const impactAdj = notes.exterior.windowsType === 'Impact-Rated' || notes.exterior.windowsType === 'Hurricane' ? 1.5 : 1.0;
    items.push(createItem('exterior', `Window Repairs (${notes.exterior.windowsCondition})`, Math.round(partialCost * impactAdj)));
  }

  // Doors - Scale with units
  if (notes.exterior.doors === 'Needs Replacement') {
    const doorCost = 2000 * (units > 1 ? units : 1);
    items.push(createItem('exterior', `Exterior Door Replacement${units > 1 ? ` (${units} units)` : ''}`, doorCost));
  } else if (notes.exterior.doors === 'Worn') {
    const refinishCost = 600 * (units > 1 ? units : 1);
    items.push(createItem('exterior', `Door Refinishing${units > 1 ? ` (${units} units)` : ''}`, refinishCost));
  }

  // Gutters
  if (notes.exterior.gutters === 'Missing') {
    items.push(createItem('exterior', 'Gutter Installation', 1500));
  } else if (notes.exterior.gutters === 'Needs Repair') {
    items.push(createItem('exterior', 'Gutter Repairs', 500));
  }

  // Landscaping
  if (notes.exterior.landscaping === 'Overgrown') {
    items.push(createItem('exterior', 'Landscaping Cleanup & Maintenance', 2000));
  } else if (notes.exterior.landscaping === 'Minimal') {
    items.push(createItem('exterior', 'Landscape Installation', 3500));
  }

  // Driveway
  if (notes.exterior.driveway === 'Needs Replacement') {
    items.push(createItem('exterior', 'Driveway Replacement', 6000));
  } else if (notes.exterior.driveway === 'Cracked') {
    items.push(createItem('exterior', 'Driveway Repairs & Sealing', 1500));
  }

  // Fencing
  if (notes.exterior.fencing === 'Needs Repair') {
    items.push(createItem('exterior', 'Fence Repairs', 2000));
  }

  // Pool
  if (notes.pool.hasPool) {
    if (notes.pool.condition === 'Not Working' || notes.pool.condition === 'Needs Repair') {
      const poolCost = notes.pool.condition === 'Not Working' ? 8000 : 4000;
      items.push(createItem('exterior', `Pool ${notes.pool.condition === 'Not Working' ? 'Restoration' : 'Repairs'}`, poolCost));
    }

    if (notes.pool.equipment === 'Needs Replacement' || notes.pool.equipment === 'Old') {
      const equipmentCost = notes.pool.equipment === 'Needs Replacement' ? 3500 : 2000;
      items.push(createItem('exterior', 'Pool Equipment Replacement (Pump, Filter, Heater)', equipmentCost));
    }
  }

  // Soft Costs & Contingency (always add these)
  const hardCostTotal = items.reduce((sum, item) => sum + item.estimatedCost, 0);
  
  if (hardCostTotal > 0) {
    items.push(createItem('systems', 'Permits & Inspections', Math.round(hardCostTotal * 0.05)));
    items.push(createItem('systems', 'Contingency Reserve (10%)', Math.round(hardCostTotal * 0.10)));
  }

  return items;
}
