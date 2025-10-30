import { ZillowComp, SubjectProperty } from '../components/ARVCalculator';

export interface SampleDeal {
  id: string;
  name: string;
  description: string;
  
  // Property Info
  address: string;
  purchasePrice: number;
  beds: number;
  baths: number;
  sqft: number;
  lotSize: number;
  yearBuilt: number;
  propertyType: string;
  units: number;
  zipCode: string;
  hasPool?: boolean;
  parkingSpaces?: number;
  
  // Financing
  downPaymentPercent: number;
  interestRate: number;
  loanTermYears: number;
  
  // Income - LTR (per unit for multi-family)
  ltrMonthlyRent: number;
  
  // Income - Section 8
  section8MonthlyRent: number;
  
  // Income - STR
  strDailyRate: number;
  strOccupancyPercent: number;
  strMonthlyRevenue: number; // Per unit for multi-family
  
  // Operating Expenses
  monthlyPropertyTax: number;
  monthlyInsurance: number;
  monthlyHOA: number;
  utilities: {
    electric: number;
    water: number;
    gas: number;
    other: number;
  };
  
  // Rehab Details
  needsRehab: boolean;
  condition?: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Severe';
  sellerMotivation?: 'Extremely Motivated' | 'Very Motivated' | 'Moderately Motivated' | 'Slightly Motivated' | 'Not Motivated';
  conditionNotes?: string;
  motivationNotes?: string;
  rehabBudget?: number;
  afterRepairValue?: number;
  
  // Scope of Work (if rehab)
  scopeOfWork?: {
    category: string;
    items: {
      name: string;
      cost: number;
      notes?: string;
    }[];
  }[];
  
  // ARV Calculator Data
  subjectProperty?: SubjectProperty;
  comps?: ZillowComp[];
}

export const sampleDeals: SampleDeal[] = [
  // DEAL 1: Excellent Cash Flow Duplex - Light Rehab
  {
    id: 'deal-1',
    name: '🏆 Pompano Beach Duplex - Strong Section 8',
    description: 'Light cosmetic rehab duplex in high-demand Section 8 area. Both units 2/1, recently updated systems. Seller inherited property and wants quick sale.',
    
    address: '1847 NW 6th Street, Pompano Beach, FL 33069',
    purchasePrice: 385000,
    beds: 4, // Total for duplex
    baths: 2,
    sqft: 1680,
    lotSize: 6500,
    yearBuilt: 1968,
    propertyType: 'Duplex',
    units: 2,
    zipCode: '33069',
    hasPool: false,
    parkingSpaces: 2,
    
    downPaymentPercent: 25,
    interestRate: 7.25,
    loanTermYears: 30,
    
    // Each unit rents for $1,650/month LTR
    ltrMonthlyRent: 3300,
    
    // Section 8: 2BR in 33069 = $1,853/unit (Broward Zone 10)
    section8MonthlyRent: 3706,
    
    // STR: Not ideal location for Airbnb
    strDailyRate: 120,
    strOccupancyPercent: 50,
    strMonthlyRevenue: 1800, // Per unit
    
    monthlyPropertyTax: 450,
    monthlyInsurance: 320,
    monthlyHOA: 0,
    utilities: {
      electric: 0, // Tenant pays
      water: 140, // Owner pays
      gas: 0,
      other: 0
    },
    
    needsRehab: true,
    condition: 'Fair',
    sellerMotivation: 'Very Motivated',
    conditionNotes: 'Roof 8 years old, AC units 4 years old. Needs interior paint, flooring, kitchen/bath updates. Solid CBS construction. Minor foundation cracks (typical for age).',
    motivationNotes: 'Estate sale - siblings inherited from parents and want to split proceeds quickly. Property has been vacant 3 months. Will consider offers.',
    rehabBudget: 42000,
    afterRepairValue: 465000,
    
    scopeOfWork: [
      {
        category: 'Interior',
        items: [
          { name: 'Interior Paint (both units)', cost: 4800, notes: 'Sherwin Williams - neutral colors' },
          { name: 'Luxury Vinyl Plank Flooring', cost: 8400, notes: '1,680 sqft @ $5/sqft installed' },
          { name: 'Kitchen Updates (cabinets, counters)', cost: 12000, notes: 'Reface cabinets, new quartz counters, fixtures' },
          { name: 'Bathroom Updates', cost: 6500, notes: 'New vanities, toilets, tile surrounds' },
          { name: 'Light Fixtures & Ceiling Fans', cost: 1800, notes: 'Modern LED fixtures throughout' }
        ]
      },
      {
        category: 'Exterior',
        items: [
          { name: 'Exterior Paint', cost: 3500, notes: 'Pressure wash and paint' },
          { name: 'Landscaping Cleanup', cost: 1200, notes: 'Tree trimming, mulch, sod repair' }
        ]
      },
      {
        category: 'Contingency & Permits',
        items: [
          { name: 'Permits & Inspections', cost: 800 },
          { name: 'Contingency (10%)', cost: 3000 }
        ]
      }
    ],
    
    subjectProperty: {
      address: '1847 NW 6th Street, Pompano Beach, FL 33069',
      purchasePrice: 385000,
      beds: 4,
      baths: 2,
      sqft: 1680,
      yearBuilt: 1968,
      propertyType: 'Duplex',
      units: 2,
      zestimate: 412000,
      rentZestimate: 3200,
      lotSize: 6500,
      hasPool: false,
      parkingSpaces: 2
    },
    
    comps: [
      {
        id: 'comp-1-1',
        address: '1823 NW 7th Street, Pompano Beach, FL 33069',
        soldPrice: 425000,
        soldDate: '08/15/2024',
        beds: 4,
        baths: 2,
        sqft: 1720,
        propertyType: 'Duplex',
        yearBuilt: 1965,
        zestimate: 438000,
        rentZestimate: 3400,
        pricePerSqft: 247,
        description: 'Fully renovated duplex, 2/1 each unit. New roof (2022), impact windows, updated kitchens and baths. Strong rental history.',
        zillowLink: 'https://www.zillow.com/homedetails/1823-NW-7th-St-Pompano-Beach-FL-33069',
        lotSize: 6800,
        hasPool: false,
        parkingSpaces: 2,
        daysOnMarket: 21
      },
      {
        id: 'comp-1-2',
        address: '1756 NW 5th Street, Pompano Beach, FL 33069',
        soldPrice: 398000,
        soldDate: '09/22/2024',
        beds: 4,
        baths: 2,
        sqft: 1640,
        propertyType: 'Duplex',
        yearBuilt: 1971,
        zestimate: 405000,
        rentZestimate: 3150,
        pricePerSqft: 243,
        description: 'Investment duplex with updated AC and electrical. Original kitchen/baths but well-maintained. Tenants in place.',
        zillowLink: 'https://www.zillow.com/homedetails/1756-NW-5th-St-Pompano-Beach-FL-33069',
        lotSize: 6200,
        hasPool: false,
        parkingSpaces: 2,
        daysOnMarket: 34
      },
      {
        id: 'comp-1-3',
        address: '1934 NW 8th Avenue, Pompano Beach, FL 33069',
        soldPrice: 410000,
        soldDate: '07/30/2024',
        beds: 4,
        baths: 2,
        sqft: 1700,
        propertyType: 'Duplex',
        yearBuilt: 1969,
        zestimate: 422000,
        rentZestimate: 3300,
        pricePerSqft: 241,
        description: 'Corner lot duplex. Partially updated - one unit renovated, one original. Both units occupied.',
        zillowLink: 'https://www.zillow.com/homedetails/1934-NW-8th-Ave-Pompano-Beach-FL-33069',
        lotSize: 7100,
        hasPool: false,
        parkingSpaces: 2,
        daysOnMarket: 28
      },
      {
        id: 'comp-1-4',
        address: '1512 NW 6th Court, Pompano Beach, FL 33069',
        soldPrice: 375000,
        soldDate: '10/05/2024',
        beds: 4,
        baths: 2,
        sqft: 1620,
        propertyType: 'Duplex',
        yearBuilt: 1967,
        zestimate: 389000,
        rentZestimate: 3100,
        pricePerSqft: 231,
        description: 'Needs work. Sold as-is. Original everything but solid structure. Investor special.',
        zillowLink: 'https://www.zillow.com/homedetails/1512-NW-6th-Ct-Pompano-Beach-FL-33069',
        lotSize: 6000,
        hasPool: false,
        parkingSpaces: 2,
        daysOnMarket: 67
      }
    ]
  },

  // DEAL 2: Marginal Single Family - Heavy Rehab
  {
    id: 'deal-2',
    name: '⚠️ Fort Lauderdale Fixer - Heavy Rehab',
    description: 'Distressed 3/2 in C+ neighborhood. Needs complete gut renovation. Low purchase price but high rehab cost. Marginal numbers on LTR, better for STR or flip.',
    
    address: '2145 SW 25th Avenue, Fort Lauderdale, FL 33312',
    purchasePrice: 285000,
    beds: 3,
    baths: 2,
    sqft: 1440,
    lotSize: 7200,
    yearBuilt: 1974,
    propertyType: 'Single Family',
    units: 1,
    zipCode: '33312',
    hasPool: true, // Needs resurfacing
    parkingSpaces: 1,
    
    downPaymentPercent: 25,
    interestRate: 7.5,
    loanTermYears: 30,
    
    ltrMonthlyRent: 2400,
    
    // Section 8: 3BR in 33312 = $2,221 (Broward Zone 7)
    section8MonthlyRent: 2221,
    
    // STR: Decent location, 3 miles from beach
    strDailyRate: 165,
    strOccupancyPercent: 65,
    strMonthlyRevenue: 3217,
    
    monthlyPropertyTax: 385,
    monthlyInsurance: 285,
    monthlyHOA: 0,
    utilities: {
      electric: 0,
      water: 85,
      gas: 0,
      other: 45 // Pool service
    },
    
    needsRehab: true,
    condition: 'Poor',
    sellerMotivation: 'Extremely Motivated',
    conditionNotes: 'Property is distressed. Roof is 22 years old with multiple leaks. AC not working. Extensive water damage in kitchen and master bath. Electrical needs updating. Pool needs resurfacing. Foundation is solid.',
    motivationNotes: 'Pre-foreclosure. Owner lost job and cannot make payments. Bank starting foreclosure process. Needs to sell within 30 days to avoid foreclosure on credit.',
    rehabBudget: 89500,
    afterRepairValue: 425000,
    
    scopeOfWork: [
      {
        category: 'Major Systems',
        items: [
          { name: 'New Roof (Architectural Shingles)', cost: 14500, notes: '1,440 sqft @ $10/sqft' },
          { name: 'New HVAC System (3-ton)', cost: 8500, notes: 'Complete system replacement' },
          { name: 'Electrical Panel Upgrade', cost: 3200, notes: '200 amp panel, GFCI outlets' },
          { name: 'Plumbing Repairs', cost: 4800, notes: 'Re-pipe kitchen/baths, new fixtures' }
        ]
      },
      {
        category: 'Interior',
        items: [
          { name: 'Drywall Repair (Water Damage)', cost: 6500, notes: 'Kitchen and master bath areas' },
          { name: 'Interior Paint (Complete)', cost: 4200, notes: 'All walls, ceilings, trim' },
          { name: 'Flooring (LVP + Tile)', cost: 9800, notes: 'LVP in living areas, tile in wet areas' },
          { name: 'Kitchen Renovation', cost: 15000, notes: 'New cabinets, granite counters, appliances' },
          { name: 'Bathroom Renovations (2 baths)', cost: 11000, notes: 'Complete demo and rebuild' },
          { name: 'Interior Doors & Hardware', cost: 2400, notes: 'All doors and hardware' }
        ]
      },
      {
        category: 'Exterior',
        items: [
          { name: 'Pool Resurfacing', cost: 3800, notes: 'Marcite resurfacing, new tile' },
          { name: 'Pool Equipment', cost: 1500, notes: 'New pump and filter' },
          { name: 'Exterior Paint', cost: 2800, notes: 'Complete exterior' },
          { name: 'Landscaping', cost: 1500, notes: 'Cleanup, sod, irrigation repair' }
        ]
      },
      {
        category: 'Contingency & Permits',
        items: [
          { name: 'Permits & Inspections', cost: 2000 },
          { name: 'Contingency (10%)', cost: 8000 }
        ]
      }
    ],
    
    subjectProperty: {
      address: '2145 SW 25th Avenue, Fort Lauderdale, FL 33312',
      purchasePrice: 285000,
      beds: 3,
      baths: 2,
      sqft: 1440,
      yearBuilt: 1974,
      propertyType: 'Single Family',
      units: 1,
      zestimate: null, // No Zestimate for distressed property
      rentZestimate: null,
      lotSize: 7200,
      hasPool: true,
      parkingSpaces: 1
    },
    
    comps: [
      {
        id: 'comp-2-1',
        address: '2234 SW 26th Avenue, Fort Lauderdale, FL 33312',
        soldPrice: 445000,
        soldDate: '09/12/2024',
        beds: 3,
        baths: 2,
        sqft: 1520,
        propertyType: 'Single Family',
        yearBuilt: 1976,
        zestimate: 452000,
        rentZestimate: 2650,
        pricePerSqft: 293,
        description: 'Completely renovated. New everything - roof, AC, kitchen, baths. Modern finishes. Pool redone.',
        zillowLink: '',
        lotSize: 7500,
        hasPool: true,
        parkingSpaces: 2,
        daysOnMarket: 15
      },
      {
        id: 'comp-2-2',
        address: '2056 SW 27th Terrace, Fort Lauderdale, FL 33312',
        soldPrice: 398000,
        soldDate: '08/28/2024',
        beds: 3,
        baths: 2,
        sqft: 1380,
        propertyType: 'Single Family',
        yearBuilt: 1972,
        zestimate: 412000,
        rentZestimate: 2450,
        pricePerSqft: 288,
        description: 'Updated kitchen and baths. Newer AC. Original roof (good condition). No pool.',
        zillowLink: '',
        lotSize: 6800,
        hasPool: false,
        parkingSpaces: 1,
        daysOnMarket: 42
      },
      {
        id: 'comp-2-3',
        address: '2187 SW 24th Court, Fort Lauderdale, FL 33312',
        soldPrice: 418000,
        soldDate: '09/30/2024',
        beds: 3,
        baths: 2,
        sqft: 1465,
        propertyType: 'Single Family',
        yearBuilt: 1975,
        zestimate: 425000,
        rentZestimate: 2550,
        pricePerSqft: 285,
        description: 'Nicely updated home with pool. Impact windows, newer roof (2020). Granite counters, stainless appliances.',
        zillowLink: '',
        lotSize: 7100,
        hasPool: true,
        parkingSpaces: 2,
        daysOnMarket: 23
      }
    ]
  },

  // DEAL 3: Excellent STR Opportunity - Moderate Rehab
  {
    id: 'deal-3',
    name: '🏖️ Hollywood Beach Bungalow - STR Gold',
    description: 'Charming 2/2 cottage just 4 blocks from Hollywood Beach. Perfect for Airbnb. Needs moderate updating but great bones. Walk to Broadwalk.',
    
    address: '456 Hayes Street, Hollywood, FL 33019',
    purchasePrice: 475000,
    beds: 2,
    baths: 2,
    sqft: 1180,
    lotSize: 5200,
    yearBuilt: 1955,
    propertyType: 'Single Family',
    units: 1,
    zipCode: '33019',
    hasPool: false,
    parkingSpaces: 1,
    
    downPaymentPercent: 25,
    interestRate: 7.375,
    loanTermYears: 30,
    
    ltrMonthlyRent: 2600,
    
    // Section 8: 2BR in 33019 = $1,853 (Broward Zone 10)
    section8MonthlyRent: 1853,
    
    // STR: Prime location! 4 blocks to beach
    strDailyRate: 210,
    strOccupancyPercent: 72,
    strMonthlyRevenue: 4536,
    
    monthlyPropertyTax: 520,
    monthlyInsurance: 340,
    monthlyHOA: 0,
    utilities: {
      electric: 150, // Owner pays for STR
      water: 95,
      gas: 0,
      other: 75 // Internet, cable for STR
    },
    
    needsRehab: true,
    condition: 'Fair',
    sellerMotivation: 'Moderately Motivated',
    conditionNotes: 'Cute cottage with original charm. Roof is 6 years old, AC is 8 years old (working). Needs kitchen/bath updates, flooring, fresh paint. Hurricane windows already installed. Solid CBS construction.',
    motivationNotes: 'Seller relocating to Atlanta for new job. Would like to close within 60 days. Open to reasonable offers.',
    rehabBudget: 48500,
    afterRepairValue: 565000,
    
    scopeOfWork: [
      {
        category: 'Interior - STR Ready',
        items: [
          { name: 'Kitchen Renovation', cost: 18000, notes: 'White shaker cabinets, quartz, subway tile, stainless appliances' },
          { name: 'Bathroom Updates (2)', cost: 10500, notes: 'Modern vanities, tile showers, fixtures' },
          { name: 'Flooring (Wide Plank LVP)', cost: 7200, notes: 'Waterproof LVP throughout' },
          { name: 'Interior Paint (Coastal Colors)', cost: 3800, notes: 'Light, bright beach colors' },
          { name: 'Lighting & Fans', cost: 2200, notes: 'Modern coastal fixtures' }
        ]
      },
      {
        category: 'STR Furnishings',
        items: [
          { name: 'Furniture Package', cost: 8500, notes: 'Complete coastal chic furnishing' },
          { name: 'Decor & Artwork', cost: 1500, notes: 'Beach-themed decor' }
        ]
      },
      {
        category: 'Exterior',
        items: [
          { name: 'Exterior Paint (Tropical Colors)', cost: 2800, notes: 'Coral or seafoam exterior' },
          { name: 'Landscaping Enhancement', cost: 1800, notes: 'Tropical plants, pavers, lighting' }
        ]
      },
      {
        category: 'Contingency',
        items: [
          { name: 'Permits', cost: 800 },
          { name: 'Contingency (5%)', cost: 2400 }
        ]
      }
    ],
    
    subjectProperty: {
      address: '456 Hayes Street, Hollywood, FL 33019',
      purchasePrice: 475000,
      beds: 2,
      baths: 2,
      sqft: 1180,
      yearBuilt: 1955,
      propertyType: 'Single Family',
      units: 1,
      zestimate: 498000,
      rentZestimate: 2700,
      lotSize: 5200,
      hasPool: false,
      parkingSpaces: 1
    },
    
    comps: [
      {
        id: 'comp-3-1',
        address: '432 McKinley Street, Hollywood, FL 33019',
        soldPrice: 585000,
        soldDate: '08/20/2024',
        beds: 2,
        baths: 2,
        sqft: 1240,
        propertyType: 'Single Family',
        yearBuilt: 1952,
        zestimate: 595000,
        rentZestimate: 2900,
        pricePerSqft: 472,
        description: 'Completely renovated beach cottage. 3 blocks to beach. Impact windows, new kitchen/baths, beautiful finishes.',
        zillowLink: '',
        lotSize: 5400,
        hasPool: false,
        parkingSpaces: 1,
        daysOnMarket: 12
      },
      {
        id: 'comp-3-2',
        address: '523 Grant Street, Hollywood, FL 33019',
        soldPrice: 545000,
        soldDate: '09/15/2024',
        beds: 2,
        baths: 2,
        sqft: 1150,
        propertyType: 'Single Family',
        yearBuilt: 1957,
        zestimate: 558000,
        rentZestimate: 2750,
        pricePerSqft: 474,
        description: 'Charming updated bungalow. 5 blocks to Broadwalk. Updated kitchen, impact windows, newer AC.',
        zillowLink: '',
        lotSize: 5000,
        hasPool: false,
        parkingSpaces: 1,
        daysOnMarket: 18
      },
      {
        id: 'comp-3-3',
        address: '378 Cleveland Street, Hollywood, FL 33019',
        soldPrice: 520000,
        soldDate: '07/28/2024',
        beds: 2,
        baths: 1.5,
        sqft: 1120,
        propertyType: 'Single Family',
        yearBuilt: 1954,
        zestimate: 535000,
        rentZestimate: 2650,
        pricePerSqft: 464,
        description: 'Cute cottage near beach. Partially updated. Original charm maintained. 6 blocks to beach.',
        zillowLink: '',
        lotSize: 4800,
        hasPool: false,
        parkingSpaces: 1,
        daysOnMarket: 31
      },
      {
        id: 'comp-3-4',
        address: '612 Madison Street, Hollywood, FL 33019',
        soldPrice: 565000,
        soldDate: '09/05/2024',
        beds: 3,
        baths: 2,
        sqft: 1280,
        propertyType: 'Single Family',
        yearBuilt: 1956,
        zestimate: 578000,
        rentZestimate: 2850,
        pricePerSqft: 441,
        description: 'Fully renovated. 3 blocks to beach. Open floor plan, impact windows, modern kitchen.',
        zillowLink: '',
        lotSize: 5500,
        hasPool: false,
        parkingSpaces: 2,
        daysOnMarket: 9
      }
    ]
  },

  // DEAL 4: Value-Add Triplex - Heavy Rehab/Conversion
  {
    id: 'deal-4',
    name: '💎 Dania Beach Triplex - Value Add',
    description: 'Triplex with separate meters. One unit needs complete renovation, two units need updates. Strong upside potential in improving neighborhood.',
    
    address: '789 SW 4th Avenue, Dania Beach, FL 33004',
    purchasePrice: 520000,
    beds: 9, // 3 units x 3 beds
    baths: 3,
    sqft: 2640,
    lotSize: 8400,
    yearBuilt: 1962,
    propertyType: 'Triplex',
    units: 3,
    zipCode: '33004',
    hasPool: false,
    parkingSpaces: 3,
    
    downPaymentPercent: 25,
    interestRate: 7.5,
    loanTermYears: 30,
    
    // Each unit can rent for $1,750/month = $5,250 total
    ltrMonthlyRent: 5250,
    
    // Section 8: 3BR in 33004 = $2,221/unit x 3 = $6,663 (Broward Zone 7)
    section8MonthlyRent: 6663,
    
    // STR: 1 mile from airport, not ideal but possible
    strDailyRate: 140,
    strOccupancyPercent: 55,
    strMonthlyRevenue: 2310, // Per unit
    
    monthlyPropertyTax: 615,
    monthlyInsurance: 425,
    monthlyHOA: 0,
    utilities: {
      electric: 0, // Separate meters
      water: 245, // Owner pays
      gas: 0,
      other: 90 // Trash, pest control
    },
    
    needsRehab: true,
    condition: 'Poor',
    sellerMotivation: 'Very Motivated',
    conditionNotes: 'Unit 1: Needs complete gut renovation (vacant). Unit 2: Needs kitchen/bath updates (tenant at $1,400/mo). Unit 3: Needs cosmetic work (tenant at $1,350/mo). Roof is 12 years old (good). Two units have newer AC, one needs replacement.',
    motivationNotes: 'Out-of-state owner tired of managing. Had bad property manager. Wants to 1031 exchange into passive investment. Will negotiate on price for quick close.',
    rehabBudget: 78000,
    afterRepairValue: 685000,
    
    scopeOfWork: [
      {
        category: 'Unit 1 - Complete Renovation',
        items: [
          { name: 'Kitchen Renovation', cost: 12000, notes: 'New cabinets, counters, appliances' },
          { name: 'Bathroom Renovation', cost: 6500, notes: 'Complete demo and rebuild' },
          { name: 'Flooring (LVP)', cost: 4800, notes: '880 sqft @ $5.50/sqft' },
          { name: 'Interior Paint', cost: 2200, notes: 'Complete unit' },
          { name: 'New AC Unit (2-ton)', cost: 6500, notes: 'High efficiency system' },
          { name: 'Electrical Updates', cost: 2800, notes: 'Outlets, switches, fixtures' }
        ]
      },
      {
        category: 'Unit 2 - Kitchen/Bath Update',
        items: [
          { name: 'Kitchen Update', cost: 7500, notes: 'Reface cabinets, new counters' },
          { name: 'Bathroom Update', cost: 4200, notes: 'New vanity, toilet, tile' },
          { name: 'Paint & Flooring', cost: 3500, notes: 'Touch up paint, LVP in kitchen/bath' }
        ]
      },
      {
        category: 'Unit 3 - Cosmetic Update',
        items: [
          { name: 'Paint & Minor Repairs', cost: 2500, notes: 'Full paint, minor fixes' },
          { name: 'Appliance Updates', cost: 1800, notes: 'New stove, refrigerator' }
        ]
      },
      {
        category: 'Exterior & Common',
        items: [
          { name: 'Exterior Paint', cost: 4500, notes: 'Complete exterior' },
          { name: 'Landscaping', cost: 2200, notes: 'Cleanup, irrigation, sod' },
          { name: 'Parking Area', cost: 1800, notes: 'Repave driveway' }
        ]
      },
      {
        category: 'Contingency & Permits',
        items: [
          { name: 'Permits', cost: 1500 },
          { name: 'Contingency (10%)', cost: 7000 }
        ]
      }
    ],
    
    subjectProperty: {
      address: '789 SW 4th Avenue, Dania Beach, FL 33004',
      purchasePrice: 520000,
      beds: 9,
      baths: 3,
      sqft: 2640,
      yearBuilt: 1962,
      propertyType: 'Triplex',
      units: 3,
      zestimate: 565000,
      rentZestimate: 4800,
      lotSize: 8400,
      hasPool: false,
      parkingSpaces: 3
    },
    
    comps: [
      {
        id: 'comp-4-1',
        address: '845 SW 3rd Avenue, Dania Beach, FL 33004',
        soldPrice: 695000,
        soldDate: '08/10/2024',
        beds: 9,
        baths: 3,
        sqft: 2700,
        propertyType: 'Triplex',
        yearBuilt: 1965,
        zestimate: 712000,
        rentZestimate: 5400,
        pricePerSqft: 257,
        description: 'Fully renovated triplex. All units 3/1. New kitchens, baths, flooring. Strong rental income.',
        zillowLink: '',
        lotSize: 8800,
        hasPool: false,
        parkingSpaces: 3,
        daysOnMarket: 24
      },
      {
        id: 'comp-4-2',
        address: '612 SW 5th Street, Dania Beach, FL 33004',
        soldPrice: 625000,
        soldDate: '09/18/2024',
        beds: 9,
        baths: 3,
        sqft: 2580,
        propertyType: 'Triplex',
        yearBuilt: 1960,
        zestimate: 645000,
        rentZestimate: 5100,
        pricePerSqft: 242,
        description: 'Good condition triplex. Updated AC and roofs. Original kitchens/baths. All units rented.',
        zillowLink: '',
        lotSize: 8200,
        hasPool: false,
        parkingSpaces: 3,
        daysOnMarket: 38
      },
      {
        id: 'comp-4-3',
        address: '723 SW 6th Avenue, Dania Beach, FL 33004',
        soldPrice: 658000,
        soldDate: '07/22/2024',
        beds: 9,
        baths: 3,
        sqft: 2620,
        propertyType: 'Triplex',
        yearBuilt: 1963,
        zestimate: 675000,
        rentZestimate: 5250,
        pricePerSqft: 251,
        description: 'Well-maintained triplex. Two units updated, one original. Separate meters. Good location.',
        zillowLink: '',
        lotSize: 8500,
        hasPool: false,
        parkingSpaces: 3,
        daysOnMarket: 29
      },
      {
        id: 'comp-4-4',
        address: '534 SW 2nd Court, Dania Beach, FL 33004',
        soldPrice: 595000,
        soldDate: '09/30/2024',
        beds: 6,
        baths: 3,
        sqft: 2400,
        propertyType: 'Triplex',
        yearBuilt: 1958,
        zestimate: 615000,
        rentZestimate: 4900,
        pricePerSqft: 248,
        description: 'Smaller triplex (2/1 units). Needs work but solid structure. Investor special.',
        zillowLink: '',
        lotSize: 7800,
        hasPool: false,
        parkingSpaces: 3,
        daysOnMarket: 52
      }
    ]
  },

  // DEAL 5: Turnkey Single Family - No Rehab
  {
    id: 'deal-5',
    name: '✅ Coral Springs Turnkey - No Rehab',
    description: 'Move-in ready 4/2 in desirable Coral Springs. Completely renovated in 2022. Lower cash flow but stable, low maintenance. Great for passive investor.',
    
    address: '3456 NW 98th Way, Coral Springs, FL 33065',
    purchasePrice: 575000,
    beds: 4,
    baths: 2,
    sqft: 2180,
    lotSize: 8200,
    yearBuilt: 1985,
    propertyType: 'Single Family',
    units: 1,
    zipCode: '33065',
    hasPool: true,
    parkingSpaces: 2,
    
    downPaymentPercent: 25,
    interestRate: 7.125,
    loanTermYears: 30,
    
    ltrMonthlyRent: 3200,
    
    // Section 8: 4BR in 33065 = $2,590 (Broward Zone 12)
    section8MonthlyRent: 2590,
    
    // STR: Not allowed in Coral Springs
    strDailyRate: 0,
    strOccupancyPercent: 0,
    strMonthlyRevenue: 0,
    
    monthlyPropertyTax: 695,
    monthlyInsurance: 385,
    monthlyHOA: 85, // Community amenities
    utilities: {
      electric: 0,
      water: 0,
      gas: 0,
      other: 95 // Pool service
    },
    
    needsRehab: false,
    condition: 'Excellent',
    sellerMotivation: 'Not Motivated',
    conditionNotes: 'Perfect condition. Completely renovated in 2022 - new roof, new AC (2-ton), impact windows, modern kitchen with quartz counters and stainless appliances, updated baths, new flooring throughout. Pool resurfaced in 2023. Nothing needed.',
    motivationNotes: 'Seller inherited from parents and prefers to sell rather than manage. Not in a rush but will sell at market price. Property is currently vacant and ready to show.',
    rehabBudget: 0,
    afterRepairValue: 575000, // Already at ARV
    
    subjectProperty: {
      address: '3456 NW 98th Way, Coral Springs, FL 33065',
      purchasePrice: 575000,
      beds: 4,
      baths: 2,
      sqft: 2180,
      yearBuilt: 1985,
      propertyType: 'Single Family',
      units: 1,
      zestimate: 582000,
      rentZestimate: 3300,
      lotSize: 8200,
      hasPool: true,
      parkingSpaces: 2
    },
    
    comps: [
      {
        id: 'comp-5-1',
        address: '3512 NW 97th Avenue, Coral Springs, FL 33065',
        soldPrice: 595000,
        soldDate: '09/08/2024',
        beds: 4,
        baths: 2,
        sqft: 2240,
        propertyType: 'Single Family',
        yearBuilt: 1987,
        zestimate: 605000,
        rentZestimate: 3400,
        pricePerSqft: 266,
        description: 'Beautiful updated home with pool. Impact windows, granite kitchen, newer AC and roof.',
        zillowLink: '',
        lotSize: 8500,
        hasPool: true,
        parkingSpaces: 2,
        daysOnMarket: 19
      },
      {
        id: 'comp-5-2',
        address: '3387 NW 99th Terrace, Coral Springs, FL 33065',
        soldPrice: 568000,
        soldDate: '08/25/2024',
        beds: 4,
        baths: 2,
        sqft: 2150,
        propertyType: 'Single Family',
        yearBuilt: 1984,
        zestimate: 578000,
        rentZestimate: 3250,
        pricePerSqft: 264,
        description: 'Well-maintained home. Updated kitchen and baths. No pool. Impact windows.',
        zillowLink: '',
        lotSize: 7800,
        hasPool: false,
        parkingSpaces: 2,
        daysOnMarket: 26
      },
      {
        id: 'comp-5-3',
        address: '3445 NW 96th Drive, Coral Springs, FL 33065',
        soldPrice: 589000,
        soldPrice: 589000,
        soldDate: '09/20/2024',
        beds: 4,
        baths: 2.5,
        sqft: 2200,
        propertyType: 'Single Family',
        yearBuilt: 1986,
        zestimate: 598000,
        rentZestimate: 3350,
        pricePerSqft: 268,
        description: 'Gorgeous remodeled home. Pool, impact windows, open kitchen, luxury finishes.',
        zillowLink: '',
        lotSize: 8400,
        hasPool: true,
        parkingSpaces: 2,
        daysOnMarket: 14
      },
      {
        id: 'comp-5-4',
        address: '3298 NW 100th Avenue, Coral Springs, FL 33065',
        soldPrice: 555000,
        soldDate: '07/30/2024',
        beds: 3,
        baths: 2,
        sqft: 2080,
        propertyType: 'Single Family',
        yearBuilt: 1983,
        zestimate: 568000,
        rentZestimate: 3150,
        pricePerSqft: 267,
        description: 'Nice updated 3/2 with pool. Smaller but well done. Impact windows, updated interior.',
        zillowLink: '',
        lotSize: 7600,
        hasPool: true,
        parkingSpaces: 2,
        daysOnMarket: 33
      },
      {
        id: 'comp-5-5',
        address: '3567 NW 98th Lane, Coral Springs, FL 33065',
        soldPrice: 578000,
        soldDate: '09/14/2024',
        beds: 4,
        baths: 2,
        sqft: 2190,
        propertyType: 'Single Family',
        yearBuilt: 1985,
        zestimate: 590000,
        rentZestimate: 3280,
        pricePerSqft: 264,
        description: 'Move-in ready. Pool, updated throughout. Great neighborhood. Family-friendly.',
        zillowLink: '',
        lotSize: 8100,
        hasPool: true,
        parkingSpaces: 2,
        daysOnMarket: 22
      }
    ]
  }
];
