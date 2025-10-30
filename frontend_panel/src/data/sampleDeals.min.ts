// v253_change: Minimal sample deals (2 high-quality examples only)
import { SavedDeal, DEAL_SCHEMA_VERSION } from '../types/deal';

export const minimalSampleDeals: SavedDeal[] = [
  // Sample A - Duplex Medium Rehab (BRRRR)
  {
    id: 'sample-brrrr-duplex',
    savedAt: '2025-01-14T12:00:00Z',
    schemaVersion: DEAL_SCHEMA_VERSION,
    
    address: '2145 Monroe St, Hollywood, FL 33020',
    units: 2,
    unitDetails: [
      { 
        beds: 2, 
        baths: 2, 
        sqft: 1100, 
        section8Rent: 2475, 
        afterRehabMarketRent: 2650,
        strMonthlyRevenue: 2400
      },
      { 
        beds: 2, 
        baths: 1, 
        sqft: 1100, 
        section8Rent: 2475, 
        afterRehabMarketRent: 2400,
        strMonthlyRevenue: 2400
      }
    ],
    totalSqft: 2200,
    yearBuilt: 1978,
    purchasePrice: 485000,
    strADR: 0,
    strOccupancy: 70,
    propertyTaxes: 9700, // Auto-calc: 2% of purchase
    propertyInsurance: 6600, // Auto-calc based on year/sqft
    loanInterestRate: 7.5,
    loanTerm: 30,
    downPayment: 25,
    acquisitionCosts: 5,
    acquisitionCostsAmount: 24250,
    setupFurnishCost: 15000,
    
    // BRRRR fields
    isRehab: true,
    rehabUnitType: 'duplex',
    rehabCondition: 'medium',
    rehabCost: 85000,
    rehabMonths: 6,
    rehabFinancingRate: 12,
    rehabEntryPoints: 2,
    rehabExitPoints: 1,
    
    bridgeLTC: 90,
    bridgeRehabBudgetPercent: 100,
    bridgeMaxARLTV: 70,
    
    exitStrategy: 'refi',
    exitRefiLTV: 75,
    exitRefiRate: 7.5,
    
    afterRepairValue: 685000,
    rehabPropertyTaxes: 13700, // 2% of ARV
    rehabPropertyInsurance: 8200,
    sellClosingCosts: 8,
    
    bridgeSettlementCharges: 29100, // 6% of purchase
    dscrAcquisitionCosts: 34250, // 5% of ARV
    
    notes: {
      realtorName: '',
      realtorPhone: '',
      realtorEmail: '',
      realtorNotes: '',
      sellerMotivation: 'Out-of-state owner, wants quick close',
      overallCondition: 'Fair',
      estimatedRehabCost: '$85,000',
      roof: {
        condition: 'Fair (16-20 yrs)',
        age: '15',
        leaks: false,
        notes: 'Worn but functional, budget for replacement in 5 years'
      },
      foundation: {
        condition: 'Good',
        notes: 'Minor stucco cracks typical for age'
      },
      hvac: {
        condition: 'Good (6-10 yrs)',
        age: '10',
        numberOfUnits: '2',
        notes: 'Both units working, regular maintenance'
      },
      plumbing: {
        condition: 'Has Issues',
        pipeMaterial: 'Mixed',
        waterHeater: 'Good',
        leaks: false,
        notes: 'Cast iron drains, some galvanized supply lines - plan upgrades'
      },
      electrical: {
        condition: 'Adequate',
        panelSize: '100A',
        wiringType: 'Modern',
        notes: 'Original panels but functional'
      },
      kitchen: {
        condition: 'Dated',
        cabinets: 'Worn',
        countertops: 'Laminate Worn',
        appliances: 'Old',
        flooring: 'Needs Replacement',
        notes: 'Original 1980s kitchens, full renovation planned'
      },
      bathrooms: [],
      bedrooms: [],
      interior: {
        flooring: 'Needs Replacement',
        walls: 'Needs Paint',
        ceilings: 'Good',
        lighting: 'Outdated',
        openFloorPlan: false,
        notes: 'Tile floors are dated, walls need paint throughout'
      },
      exterior: {
        siding: 'Needs Paint',
        sidingType: 'Stucco',
        windows: 'Old Single Pane',
        doors: 'Good',
        gutters: 'Good',
        landscaping: 'Minimal',
        fencing: 'None',
        driveway: 'Cracked',
        notes: 'Minor stucco cracks, needs paint'
      },
      pool: {
        hasPool: false,
        condition: '',
        equipment: '',
        notes: ''
      },
      additionalIssues: {
        mold: false,
        termites: false,
        waterDamage: false,
        fireDamage: false,
        structuralIssues: false,
        codeViolations: false,
        other: ''
      },
      generalNotes: 'Solid duplex in good area. Needs full cosmetic update but good bones. Section 8 demand is very strong in this zip.',
      lastUpdated: '2025-01-14T12:00:00Z'
    },
    
    arvComps: [],
    calculatedARV: 0
  },
  
  // Sample B - Triplex Light Rehab (Section 8 LTR)
  {
    id: 'sample-section8-triplex',
    savedAt: '2025-01-14T12:00:00Z',
    schemaVersion: DEAL_SCHEMA_VERSION,
    
    address: '3850 NW 88th Ave, Coral Springs, FL 33065',
    units: 3,
    unitDetails: [
      { 
        beds: 2, 
        baths: 2, 
        sqft: 1000, 
        section8Rent: 2350,
        marketRent: 2136,
        strMonthlyRevenue: 2400
      },
      { 
        beds: 2, 
        baths: 1, 
        sqft: 950, 
        section8Rent: 2163,
        marketRent: 1966,
        strMonthlyRevenue: 2400
      },
      { 
        beds: 1, 
        baths: 1, 
        sqft: 900, 
        section8Rent: 1817,
        marketRent: 1652,
        strMonthlyRevenue: 1800
      }
    ],
    totalSqft: 2850,
    yearBuilt: 1992,
    purchasePrice: 465000,
    strADR: 0,
    strOccupancy: 65,
    propertyTaxes: 9300, // Auto-calc: 2% of purchase
    propertyInsurance: 5700, // Auto-calc based on year/sqft
    loanInterestRate: 7.5,
    loanTerm: 30,
    downPayment: 25,
    acquisitionCosts: 5,
    acquisitionCostsAmount: 23250,
    setupFurnishCost: 25000,
    
    // No major rehab
    isRehab: false,
    rehabUnitType: 'triplex',
    rehabCondition: 'light',
    rehabCost: 0,
    rehabMonths: 0,
    rehabFinancingRate: 0,
    rehabEntryPoints: 0,
    rehabExitPoints: 0,
    
    bridgeLTC: 90,
    bridgeRehabBudgetPercent: 100,
    bridgeMaxARLTV: 70,
    
    exitStrategy: 'refi',
    exitRefiLTV: 75,
    exitRefiRate: 7.5,
    
    afterRepairValue: 0,
    rehabPropertyTaxes: 0,
    rehabPropertyInsurance: 0,
    sellClosingCosts: 8,
    
    bridgeSettlementCharges: 0,
    dscrAcquisitionCosts: 0,
    
    notes: {
      realtorName: '',
      realtorPhone: '',
      realtorEmail: '',
      realtorNotes: '',
      sellerMotivation: 'Retiring landlord, managed property for 15+ years',
      overallCondition: 'Good',
      estimatedRehabCost: '$0',
      roof: {
        condition: 'Good (6-15 yrs)',
        age: '12',
        leaks: false,
        notes: 'Barrel tile, well maintained'
      },
      foundation: {
        condition: 'Excellent',
        notes: 'CBS construction, no visible issues'
      },
      hvac: {
        condition: 'Good (6-10 yrs)',
        age: '8',
        numberOfUnits: '3',
        notes: 'All units working, serviced annually'
      },
      plumbing: {
        condition: 'Good',
        pipeMaterial: 'Mixed',
        waterHeater: 'Good',
        leaks: false,
        notes: 'Copper/PVC mix, no known issues'
      },
      electrical: {
        condition: 'Updated',
        panelSize: '200A',
        wiringType: 'Modern',
        notes: 'Panel updated 2005, separate meters for each unit'
      },
      kitchen: {
        condition: 'Dated',
        cabinets: 'Good',
        countertops: 'Laminate Good',
        appliances: 'Most Good',
        flooring: 'Tile',
        notes: 'Functional but dated, tenants are happy'
      },
      bathrooms: [],
      bedrooms: [],
      interior: {
        flooring: 'Good',
        walls: 'Good',
        ceilings: 'Good',
        lighting: 'Adequate',
        openFloorPlan: false,
        notes: 'Well maintained by long-term tenants'
      },
      exterior: {
        siding: 'Good',
        sidingType: 'Stucco',
        windows: 'Good',
        doors: 'Good',
        gutters: 'Good',
        landscaping: 'Well Maintained',
        fencing: 'Good',
        driveway: 'Good',
        notes: 'Clean property, good curb appeal'
      },
      pool: {
        hasPool: false,
        condition: '',
        equipment: '',
        notes: ''
      },
      additionalIssues: {
        mold: false,
        termites: false,
        waterDamage: false,
        fireDamage: false,
        structuralIssues: false,
        codeViolations: false,
        other: ''
      },
      generalNotes: 'Turnkey triplex with 2 vacant units (recently renovated) and 1 tenant-occupied unit. Excellent Section 8 opportunity in Coral Springs.',
      lastUpdated: '2025-01-14T12:00:00Z'
    },
    
    arvComps: [],
    calculatedARV: 0
  }
];
