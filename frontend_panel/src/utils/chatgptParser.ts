/**
 * ChatGPT Response Parser
 * Extracts condition values from ChatGPT analysis and maps them to form fields
 */

import { DealNotes } from '../types/deal';

interface ParsedData {
  updates: Partial<DealNotes>;
  unknownFields: string[];
  fullText: string;
}

/**
 * Extract and format specific sections from ChatGPT response
 */
function extractAndFormatSections(text: string): string {
  const sections: string[] = [];
  
  // Extract section A (QUICK SUMMARY)
  const sectionAMatch = text.match(/\(A\)\s*QUICK SUMMARY[\s\S]*?(?=\(B\)|---|\n\n\(|$)/i);
  if (sectionAMatch) {
    let sectionA = sectionAMatch[0];
    // Clean up the section - remove the (A) prefix and format header
    sectionA = sectionA.replace(/\(A\)\s*QUICK SUMMARY[^\n]*/i, '**QUICK SUMMARY**');
    // Normalize bullets (•●) to hyphens, but keep existing hyphens as-is
    sectionA = sectionA.replace(/^\s*[•●]\s*/gm, '- ');
    // Remove extra blank lines but keep single line breaks
    sectionA = sectionA.replace(/\n\n+/g, '\n');
    sections.push(sectionA.trim());
  }
  
  // Extract section C (COST DRIVERS & AUTO-ASSUMPTIONS)
  const sectionCMatch = text.match(/\(C\)\s*COST DRIVERS[\s\S]*?(?=\(D\)|---|\n\n\(|$)/i);
  if (sectionCMatch) {
    let sectionC = sectionCMatch[0];
    sectionC = sectionC.replace(/\(C\)\s*COST DRIVERS[^\n]*/i, '**COST DRIVERS & AUTO-ASSUMPTIONS**');
    // Normalize bullets (•●) to hyphens, but keep existing hyphens as-is
    sectionC = sectionC.replace(/^\s*[•●]\s*/gm, '- ');
    // Remove extra blank lines but keep single line breaks
    sectionC = sectionC.replace(/\n\n+/g, '\n');
    sections.push(sectionC.trim());
  }
  
  // Extract section D (REALTOR FOLLOW-UP QUESTIONS)
  const sectionDMatch = text.match(/\(D\)\s*REALTOR FOLLOW-UP[\s\S]*?(?=\(E\)|---|\n\n\(|$)/i);
  if (sectionDMatch) {
    let sectionD = sectionDMatch[0];
    sectionD = sectionD.replace(/\(D\)\s*REALTOR FOLLOW-UP[^\n]*/i, '**REALTOR FOLLOW-UP QUESTIONS**');
    // Only normalize bullets (•●) to hyphens - KEEP numbered lists (1. 2. 3.) as-is
    sectionD = sectionD.replace(/^\s*[•●]\s*/gm, '- ');
    // Remove extra blank lines but keep single line breaks
    sectionD = sectionD.replace(/\n\n+/g, '\n');
    sections.push(sectionD.trim());
  }
  
  // Join sections with double line break for readability
  return sections.join('\n\n');
}

/**
 * Parse ChatGPT response and extract condition values
 */
export function parseChatGPTResponse(text: string): ParsedData {
  const updates: Partial<DealNotes> = {};
  const unknownFields: string[] = [];

  // Extract values using flexible regex patterns
  const extractValue = (pattern: RegExp): string | null => {
    const match = text.match(pattern);
    return match ? match[1].trim() : null;
  };

  // Helper to check if value is "Unknown" or contains additional notes
  const isUnknown = (value: string | null): boolean => {
    if (!value) return true;
    const lower = value.toLowerCase();
    // Check if the value explicitly says unknown
    return lower === 'unknown' || lower.includes('(unknown)') || lower.startsWith('unknown');
  };
  
  // Helper to clean value - remove parenthetical notes
  const cleanValue = (value: string): string => {
    // Remove anything in parentheses (like notes/clarifications)
    return value.replace(/\s*\([^)]*\)/g, '').trim();
  };

  // Structural & Major Systems
  const roofCondition = extractValue(/Roof Condition:\s*(.+?)(?:\n|$)/i);
  if (roofCondition && !isUnknown(roofCondition)) {
    updates.roof = { condition: '', age: '', leaks: false, notes: '' };
    const mapped = mapRoofCondition(cleanValue(roofCondition));
    if (mapped) updates.roof.condition = mapped;
  } else {
    unknownFields.push('Roof Condition');
  }

  const roofYear = extractValue(/Roof Year.*?:\s*(.+?)(?:\n|$)/i);
  if (roofYear && !isUnknown(roofYear)) {
    const yearMatch = roofYear.match(/\d{4}/);
    if (yearMatch) {
      updates.roof = updates.roof || { condition: '', age: '', leaks: false, notes: '' };
      updates.roof.roofYear = parseInt(yearMatch[0]);
    }
  }

  const foundation = extractValue(/Foundation:\s*(.+?)(?:\n|$)/i);
  if (foundation && !isUnknown(foundation)) {
    updates.foundation = { condition: '', notes: '' };
    const mapped = mapFoundation(cleanValue(foundation));
    if (mapped) updates.foundation.condition = mapped;
  } else {
    unknownFields.push('Foundation');
  }

  const hvac = extractValue(/HVAC System:\s*(.+?)(?:\n|$)/i);
  if (hvac && !isUnknown(hvac)) {
    updates.hvac = { condition: '', age: '', numberOfUnits: '', notes: '' };
    const cleanedHvac = cleanValue(hvac);
    
    // Extract system type (Central, Mini-Split, etc.)
    const mappedType = mapHVACType(cleanedHvac);
    if (mappedType) updates.hvac.systemType = mappedType;
    
    // Extract condition (Updated, Old, etc.) from parenthetical or inline text
    const conditionMapped = mapHVACCondition(cleanedHvac);
    if (conditionMapped) updates.hvac.condition = conditionMapped;
  } else {
    unknownFields.push('HVAC System');
  }

  const plumbing = extractValue(/Plumbing:\s*(.+?)(?:\n|$)/i);
  if (plumbing && !isUnknown(plumbing)) {
    updates.plumbing = { condition: '', pipeMaterial: '', leaks: false, waterHeater: '', notes: '' };
    const mapped = mapPlumbing(cleanValue(plumbing));
    if (mapped) updates.plumbing.condition = mapped;
  } else {
    unknownFields.push('Plumbing');
  }

  const electrical = extractValue(/Electrical:\s*(.+?)(?:\n|$)/i);
  if (electrical && !isUnknown(electrical)) {
    updates.electrical = { condition: '', panelSize: '', wiringType: '', notes: '' };
    const mapped = mapElectrical(cleanValue(electrical));
    if (mapped) updates.electrical.condition = mapped;
  } else {
    unknownFields.push('Electrical');
  }

  // Interior
  const kitchen = extractValue(/Kitchen:\s*(.+?)(?:\n|$)/i);
  if (kitchen && !isUnknown(kitchen)) {
    updates.kitchen = { condition: '', cabinets: '', countertops: '', appliances: '', flooring: '', notes: '' };
    const mapped = mapKitchenCondition(cleanValue(kitchen));
    if (mapped) updates.kitchen.condition = mapped;
  } else {
    unknownFields.push('Kitchen');
  }

  const bathrooms = extractValue(/Bathrooms.*?:\s*(.+?)(?:\n|$)/i);
  if (bathrooms && !isUnknown(bathrooms)) {
    // Note: DealNotes.bathrooms is an array, but we'll set a generic note for overall condition
    // The actual form may handle this differently - storing in generalNotes instead
  } else {
    unknownFields.push('Bathrooms');
  }

  const flooring = extractValue(/Flooring:\s*(.+?)(?:\n|$)/i);
  if (flooring && !isUnknown(flooring)) {
    updates.interior = updates.interior || { 
      flooring: '', 
      walls: '', 
      ceilings: '', 
      lighting: '', 
      openFloorPlan: false, 
      notes: '' 
    };
    const mapped = mapFlooringCondition(cleanValue(flooring));
    if (mapped) updates.interior.flooring = mapped;
  } else {
    unknownFields.push('Flooring');
  }

  const wallsPaint = extractValue(/Walls.*?Paint:\s*(.+?)(?:\n|$)/i);
  if (wallsPaint && !isUnknown(wallsPaint)) {
    updates.interior = { 
      flooring: '', 
      walls: '', 
      ceilings: '', 
      lighting: '', 
      openFloorPlan: false, 
      notes: '' 
    };
    const mapped = mapWallsCondition(cleanValue(wallsPaint));
    if (mapped) updates.interior.walls = mapped;
  } else {
    unknownFields.push('Walls & Paint');
  }

  const appliances = extractValue(/Appliances:\s*(.+?)(?:\n|$)/i);
  if (appliances && !isUnknown(appliances)) {
    updates.kitchen = updates.kitchen || { condition: '', cabinets: '', countertops: '', appliances: '', flooring: '', notes: '' };
    const mapped = mapAppliances(cleanValue(appliances));
    if (mapped) updates.kitchen.appliances = mapped;
  } else {
    unknownFields.push('Appliances');
  }

  // Exterior
  const siding = extractValue(/Siding.*?Exterior:\s*(.+?)(?:\n|$)/i);
  if (siding && !isUnknown(siding)) {
    updates.exterior = { 
      siding: '', 
      sidingType: '', 
      windows: '', 
      doors: '', 
      gutters: '', 
      landscaping: '', 
      fencing: '', 
      driveway: '', 
      notes: '' 
    };
    const mapped = mapExteriorCondition(cleanValue(siding));
    if (mapped) updates.exterior.siding = mapped;
  } else {
    unknownFields.push('Siding/Exterior');
  }

  const windows = extractValue(/Windows:\s*(.+?)(?:\n|$)/i);
  if (windows && !isUnknown(windows)) {
    updates.exterior = updates.exterior || { 
      siding: '', 
      sidingType: '', 
      windows: '', 
      doors: '', 
      gutters: '', 
      landscaping: '', 
      fencing: '', 
      driveway: '', 
      notes: '' 
    };
    const mapped = mapWindowsType(cleanValue(windows));
    if (mapped) updates.exterior.windowsType = mapped;
  } else {
    unknownFields.push('Windows');
  }

  const doors = extractValue(/Doors:\s*(.+?)(?:\n|$)/i);
  if (doors && !isUnknown(doors)) {
    updates.exterior = updates.exterior || { 
      siding: '', 
      sidingType: '', 
      windows: '', 
      doors: '', 
      gutters: '', 
      landscaping: '', 
      fencing: '', 
      driveway: '', 
      notes: '' 
    };
    const mapped = mapDoorsCondition(cleanValue(doors));
    if (mapped) updates.exterior.doors = mapped;
  } else {
    unknownFields.push('Doors');
  }

  const landscaping = extractValue(/Landscaping:\s*(.+?)(?:\n|$)/i);
  if (landscaping && !isUnknown(landscaping)) {
    updates.exterior = updates.exterior || { 
      siding: '', 
      sidingType: '', 
      windows: '', 
      doors: '', 
      gutters: '', 
      landscaping: '', 
      fencing: '', 
      driveway: '', 
      notes: '' 
    };
    const mapped = mapLandscaping(cleanValue(landscaping));
    if (mapped) updates.exterior.landscaping = mapped;
  } else {
    unknownFields.push('Landscaping');
  }

  // Major Issues - uses additionalIssues structure
  const mold = extractValue(/Mold Present:\s*(.+?)(?:\n|$)/i);
  if (mold && !isUnknown(mold)) {
    updates.additionalIssues = updates.additionalIssues || {
      mold: false,
      termites: false,
      waterDamage: false,
      fireDamage: false,
      structuralIssues: false,
      codeViolations: false,
      other: ''
    };
    updates.additionalIssues.mold = mapYesNo(mold);
  }

  const termite = extractValue(/Termite Damage:\s*(.+?)(?:\n|$)/i);
  if (termite && !isUnknown(termite)) {
    updates.additionalIssues = updates.additionalIssues || {
      mold: false,
      termites: false,
      waterDamage: false,
      fireDamage: false,
      structuralIssues: false,
      codeViolations: false,
      other: ''
    };
    updates.additionalIssues.termites = mapYesNo(termite);
  }

  const waterDamage = extractValue(/Water Damage:\s*(.+?)(?:\n|$)/i);
  if (waterDamage && !isUnknown(waterDamage)) {
    updates.additionalIssues = updates.additionalIssues || {
      mold: false,
      termites: false,
      waterDamage: false,
      fireDamage: false,
      structuralIssues: false,
      codeViolations: false,
      other: ''
    };
    updates.additionalIssues.waterDamage = mapYesNo(waterDamage);
  }

  const structural = extractValue(/Structural Issues:\s*(.+?)(?:\n|$)/i);
  if (structural && !isUnknown(structural)) {
    updates.additionalIssues = updates.additionalIssues || {
      mold: false,
      termites: false,
      waterDamage: false,
      fireDamage: false,
      structuralIssues: false,
      codeViolations: false,
      other: ''
    };
    updates.additionalIssues.structuralIssues = mapYesNo(structural);
  }

  const codeViolations = extractValue(/Code Violations.*?Permits:\s*(.+?)(?:\n|$)/i);
  if (codeViolations && !isUnknown(codeViolations)) {
    updates.additionalIssues = updates.additionalIssues || {
      mold: false,
      termites: false,
      waterDamage: false,
      fireDamage: false,
      structuralIssues: false,
      codeViolations: false,
      other: ''
    };
    updates.additionalIssues.codeViolations = mapYesNo(codeViolations);
  }

  // Extract and format only sections A, C, D for the notes field
  const formattedNotes = extractAndFormatSections(text);
  
  return {
    updates,
    unknownFields,
    fullText: formattedNotes
  };
}

// Mapping functions to convert ChatGPT values to form dropdown values
// Based on actual form dropdown values from DealNotes type

function mapRoofCondition(value: string): 'New (0-5 yrs)' | 'Good (6-15 yrs)' | 'Fair (16-20 yrs)' | 'Poor (20+ yrs)' | 'Needs Replacement' | null {
  const lower = value.toLowerCase();
  if (lower.includes('new')) return 'New (0-5 yrs)';
  if (lower.includes('needs replacement') || lower.includes('replace')) return 'Needs Replacement';
  if (lower.includes('functional') || lower.includes('good')) return 'Good (6-15 yrs)';
  if (lower.includes('fair')) return 'Fair (16-20 yrs)';
  if (lower.includes('poor')) return 'Poor (20+ yrs)';
  return null;
}

function mapFoundation(value: string): 'Good' | 'Minor Cracks' | 'Major Issues' | null {
  const lower = value.toLowerCase();
  if (lower.includes('movement') || lower.includes('major') || lower.includes('repair')) return 'Major Issues';
  if (lower.includes('crack')) return 'Minor Cracks';
  if (lower.includes('good') || lower.includes('excellent')) return 'Good';
  return null;
}

function mapHVACType(value: string): 'Central AC' | 'Mini-Split' | 'Window Units' | 'Package Unit' | 'Heat Pump' | 'None' | null {
  const lower = value.toLowerCase();
  if (lower.includes('none')) return 'None';
  if (lower.includes('window')) return 'Window Units';
  if (lower.includes('mini') || lower.includes('split')) return 'Mini-Split';
  if (lower.includes('package')) return 'Package Unit';
  if (lower.includes('heat pump')) return 'Heat Pump';
  if (lower.includes('central')) return 'Central AC';
  return null;
}

function mapHVACCondition(value: string): 'New (0-5 yrs)' | 'Good (6-10 yrs)' | 'Fair (11-15 yrs)' | 'Old (15+ yrs)' | 'Not Working' | null {
  const lower = value.toLowerCase();
  if (lower.includes('new') || lower.includes('updated')) return 'New (0-5 yrs)';
  if (lower.includes('not working') || lower.includes('broken')) return 'Not Working';
  if (lower.includes('old') || lower.includes('15+')) return 'Old (15+ yrs)';
  if (lower.includes('fair')) return 'Fair (11-15 yrs)';
  if (lower.includes('good') || lower.includes('functional')) return 'Good (6-10 yrs)';
  return null;
}

function mapPlumbing(value: string): 'Good' | 'Has Issues' | 'Needs Replacement' | null {
  const lower = value.toLowerCase();
  if (lower.includes('excellent') || lower.includes('updated') || lower.includes('good')) return 'Good';
  if (lower.includes('mixed') || lower.includes('issue') || lower.includes('cast iron')) return 'Has Issues';
  if (lower.includes('replacement') || lower.includes('replace')) return 'Needs Replacement';
  return null;
}

function mapElectrical(value: string): 'Updated' | 'Adequate' | 'Needs Work' | 'Unsafe' | null {
  const lower = value.toLowerCase();
  if (lower.includes('updated')) return 'Updated';
  if (lower.includes('functional') || lower.includes('adequate')) return 'Adequate';
  if (lower.includes('outdated') || lower.includes('needs work')) return 'Needs Work';
  if (lower.includes('unsafe')) return 'Unsafe';
  return null;
}

function mapKitchenCondition(value: string): 'Good' | 'Dated' | 'Needs Full Rehab' | null {
  const lower = value.toLowerCase();
  if (lower.includes('modern') || lower.includes('updated') || lower.includes('good') || lower.includes('excellent')) return 'Good';
  if (lower.includes('dated') || lower.includes('functional')) return 'Dated';
  if (lower.includes('original') || lower.includes('rehab')) return 'Needs Full Rehab';
  return null;
}

function mapFlooringCondition(value: string): 'Good' | 'Mixed' | 'Needs Replacement' | null {
  const lower = value.toLowerCase();
  if (lower.includes('replacement') || lower.includes('replace') || lower.includes('damaged')) return 'Needs Replacement';
  if (lower.includes('mixed') || lower.includes('worn')) return 'Mixed';
  if (lower.includes('good') || lower.includes('excellent')) return 'Good';
  return null;
}

function mapWallsCondition(value: string): 'Good' | 'Needs Paint' | 'Needs Repair' | null {
  const lower = value.toLowerCase();
  if (lower.includes('repair')) return 'Needs Repair';
  if (lower.includes('paint')) return 'Needs Paint';
  if (lower.includes('good') || lower.includes('excellent')) return 'Good';
  return null;
}

function mapAppliances(value: string): 'All Good' | 'Old' | 'Missing/Broken' | null {
  const lower = value.toLowerCase();
  if (lower.includes('all new') || lower.includes('all included') || lower.includes('all good') || lower.includes('partial') || lower.includes('most') || lower.includes('essential')) return 'All Good';
  if (lower.includes('missing') || lower.includes('broken') || lower.includes('none')) return 'Missing/Broken';
  if (lower.includes('old')) return 'Old';
  return null;
}

function mapExteriorCondition(value: string): 'Good' | 'Needs Paint' | 'Needs Repair' | null {
  const lower = value.toLowerCase();
  if (lower.includes('replacement') || lower.includes('repair')) return 'Needs Repair';
  if (lower.includes('paint')) return 'Needs Paint';
  if (lower.includes('good') || lower.includes('excellent')) return 'Good';
  return null;
}

function mapWindowsType(value: string): 'Impact-Rated' | 'Hurricane' | 'Double Pane' | 'Single Pane' | 'Mixed' | 'Unknown' | null {
  const lower = value.toLowerCase();
  if (lower.includes('impact')) return 'Impact-Rated';
  if (lower.includes('hurricane')) return 'Hurricane';
  if (lower.includes('double')) return 'Double Pane';
  if (lower.includes('single') || lower.includes('non-impact') || lower.includes('original')) return 'Single Pane';
  if (lower.includes('partial') || lower.includes('mixed')) return 'Mixed';
  return null;
}

function mapDoorsCondition(value: string): 'Good' | 'Needs Replacement' | null {
  const lower = value.toLowerCase();
  if (lower.includes('replacement') || lower.includes('repair') || lower.includes('worn')) return 'Needs Replacement';
  if (lower.includes('good') || lower.includes('excellent')) return 'Good';
  return null;
}

function mapLandscaping(value: string): 'Well Maintained' | 'Overgrown' | 'Minimal' | null {
  const lower = value.toLowerCase();
  if (lower.includes('well') || lower.includes('maintained') || lower.includes('heavy')) return 'Well Maintained';
  if (lower.includes('overgrown')) return 'Overgrown';
  if (lower.includes('minimal') || lower.includes('standard')) return 'Minimal';
  return null;
}

function mapYesNo(value: string): boolean {
  const lower = value.toLowerCase();
  return lower.includes('yes') || lower === 'y';
}
