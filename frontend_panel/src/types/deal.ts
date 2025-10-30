// v253_change: Canonical UnitDetail type - used everywhere in app
export type UnitDetail = {
  beds: number;
  baths: number;
  sqft?: number;
  section8Rent?: number;
  marketRent?: number;
  afterRehabMarketRent?: number;
  strMonthlyRevenue?: number; // DEPRECATED: kept for backward compatibility, migrated to strAnnualRevenue
  strAnnualRevenue?: number; // Annual STR revenue per unit (vacancy already accounted for by AirDNA)
  strAnnualExpenses?: number; // Annual STR operating expenses per unit
};

// v253_change: Alias for backward compatibility
export type UnitData = UnitDetail;

export interface ZillowComp {
  id: string;
  address: string;
  soldPrice: number;
  soldDate: string;
  beds: number;
  baths: number;
  sqft: number;
  propertyType: string;
  yearBuilt: number;
  zestimate?: number; // Optional - no longer displayed in UI
  rentZestimate?: number; // Optional - no longer displayed in UI
  pricePerSqft: number;
  description: string;
  zillowLink: string;
  photos?: { id: string; url: string; isPrimary?: boolean }[]; // Photo gallery for comp properties
  lat?: number; // Latitude for map display (optional, can be geocoded from address)
  lng?: number; // Longitude for map display (optional, can be geocoded from address)
}

// v253_change: Schema version constant
export const DEAL_SCHEMA_VERSION = 3;

export interface DealInputs {
  id?: string;
  address: string;
  units: number;
  unitDetails: UnitDetail[];
  totalSqft: number;
  yearBuilt: number;
  // strOccupancy: number;
  // schemaVersion: number;
  purchasePrice: number;
  maxOffer?: number; // Maximum offer price locked in for VA
  isOffMarket?: boolean; // Flag for off-market properties (imported from Zillow off-market listings)
  strADR: number; // DEPRECATED: Keep for backward compatibility only
  propertyTaxes: number;
  
  propertyInsurance: number;
  hasHurricaneWindows?: boolean; // Impact-rated or hurricane windows for insurance discount (FL)
  hasNewRoof?: boolean; // Roof 0-5 years old for insurance discount (FL)
  loanInterestRate: number;
  loanTerm: number;
  downPayment: number;
  acquisitionCosts: number; // Percentage (for backward compatibility and calculating defaults)
  acquisitionCostsAmount?: number; // Editable dollar amount (prepopulates at 5% but editable)
  setupFurnishCost: number; // Cosmetic renovation/furnishing cost - applies to all strategies (LTR, Section 8, Airbnb)

  // Renovation/Rehab fields
  isRehab: boolean;
  rehabUnitType: "single" | "duplex" | "triplex" | "quad";
  rehabCondition: "light" | "lite+" | "medium" | "heavy" | "fullgut";
  rehabCost: number;
  rehabMonths: number;
  rehabFinancingRate: number;
  rehabEntryPoints: number;
  rehabExitPoints: number;

  // Bridge Loan Parameters (Entry)
  bridgeLTC: number; // Loan-to-Cost % (default 90) - % of (Purchase + Rehab) financed
  bridgeRehabBudgetPercent: number; // Rehab budget % (default 100) - % of rehab financed
  bridgeMaxARLTV: number; // Max ARLTV cap (default 70) - max loan as % of ARV upfront

  // Exit Refi Parameters
  exitStrategy: "sell" | "refi"; // Exit strategy: sell or refinance & hold
  exitRefiLTV: number; // Refi LTV % (default 75) - refinance at % of ARV
  exitRefiRate: number; // Exit refi interest rate % (often different from purchase loan)

  afterRepairValue: number;
  rehabPropertyTaxes: number; // Annual taxes based on ARV
  rehabPropertyInsurance: number; // Annual insurance based on ARV
  sellClosingCosts: number; // % of sale price

  // Settlement Charges (editable dollar amounts)
  bridgeSettlementCharges?: number; // Acquisition costs for bridge loan (prepopulates at 6% of purchase price - 1% higher than standard due to bridge loan costs)
  dscrAcquisitionCosts?: number; // DSCR refinance closing costs for BRRRR exit (prepopulates at 5% of ARV but editable)

  // Property notes and condition assessment
  notes?: DealNotes;

  // v254_change: Multi-photo gallery support (non-breaking addition)
  photos?: { id: string; url: string; isPrimary?: boolean }[];
  photoUrl?: string; // Legacy field - kept for backward compatibility, migrated to photos[0] at runtime

  // ARV Calculator - Comparable Sales
  arvComps?: ZillowComp[];
  subjectLat?: number; // Subject property latitude for map and distance calculations
  subjectLng?: number; // Subject property longitude for map and distance calculations
  calculatedARV?: number; // ARV calculated from comps (median sold price)
  subjectPropertyDescription?: string; // Property description extracted from Zillow listing
  subjectPropertyZillowLink?: string; // Zillow listing URL for subject property
}

export interface Section8ZipData {
  zipCode: string;
  zone: number; // HACFL Payment Standard Zone (1-19)
  rents: {
    studio?: number;
    "1bed"?: number;
    "2bed"?: number;
    "3bed"?: number;
    "4bed"?: number;
    "5bed"?: number;
    "6bed"?: number;
    "7bed"?: number;
  };
}

export interface GlobalAssumptions {
  ltrVacancyMonths: number;
  section8VacancyMonths: number;
  maintenancePercent: number;
  rentGrowthPercent: number;
  appreciationPercent: number;
  propertyTaxIncreasePercent: number; // Annual property tax increase % (default 3%)
  insuranceIncreasePercent: number; // Annual insurance increase % (default 5% for FL)
  section8ZipData: Section8ZipData[];
  updatedAt?: string;
}

export interface YearProjection {
  year: number;
  grossIncome: number;
  noi: number;
  debtService: number;
  cashFlow: number;
  appreciation: number;
  propertyValue: number; // Current property value with appreciation
  equity: number;
  annualReturn: number; // This year's cash flow + appreciation
  cumulativeCashFlow: number; // Total cash flow from all years
  cumulativeReturn: number; // Total returns from all years (cash flow + appreciation)
  loanBalance: number; // Remaining loan balance for refi tracking
}

export interface StrategyResults {
  year1Summary: {
    grossIncome: number;
    vacancy: number;
    expenses: number;
    noi: number;
    debtService: number;
    cashFlow: number;
    capRate: number;
    dscr: number;
    cashOnCash: number;
  };
  cashInvested: number; // Total cash invested for ROI calculations
  projections: YearProjection[];
}

export type Strategy = "ltr" | "section8" | "airbnb" | "rehab";

// v253_change: SavedDeal type with schema versioning
export interface SavedDeal extends DealInputs {
  id: string;
  savedAt: string;
  schemaVersion: number;
}

// Property Condition Assessment Notes
export interface DealNotes {
  // Realtor contact info
  realtorName: string;
  realtorPhone: string;
  realtorEmail: string;
  realtorNotes: string;

  // Seller motivation
  sellerMotivation: string;

  // Overall property assessment
  overallCondition:
    | "Excellent"
    | "Good"
    | "Fair"
    | "Poor"
    | "Uninhabitable"
    | "";
  estimatedRehabCost: string;

  // Structural & Major Systems
  roof: {
    condition:
      | "New (0-5 yrs)"
      | "Good (6-15 yrs)"
      | "Fair (16-20 yrs)"
      | "Poor (20+ yrs)"
      | "Needs Replacement"
      | "";
    age: string;
    roofYear?: number; // Year roof was installed/replaced
    leaks: boolean;
    notes: string;
  };
  foundation: {
    condition:
      | "Excellent"
      | "Good"
      | "Minor Cracks"
      | "Major Issues"
      | "Needs Repair"
      | "";
    notes: string;
  };
  hvac: {
    condition:
      | "New (0-5 yrs)"
      | "Good (6-10 yrs)"
      | "Fair (11-15 yrs)"
      | "Old (15+ yrs)"
      | "Not Working"
      | "";
    age: string;
    systemType?:
      | "Central AC"
      | "Mini-Split"
      | "Window Units"
      | "Package Unit"
      | "Heat Pump"
      | "None"
      | "";
    numberOfUnits: string;
    notes: string;
  };
  plumbing: {
    condition: "Excellent" | "Good" | "Has Issues" | "Needs Replacement" | "";
    pipeMaterial:
      | "Copper"
      | "PEX"
      | "PVC"
      | "Galvanized"
      | "Mixed"
      | "Unknown"
      | "";
    pipeAge?: "Original" | "10-20 yrs" | "20+ yrs" | "Recently Updated" | "";
    waterHeater: "New" | "Good" | "Old" | "Needs Replacement" | "";
    leaks: boolean;
    notes: string;
  };
  electrical: {
    condition: "Updated" | "Adequate" | "Needs Work" | "Unsafe" | "";
    panelSize: string;
    panelAmperage?: "100A" | "150A" | "200A" | "200A+" | "Unknown" | "";
    wiringType: "Modern" | "Aluminum" | "Knob & Tube" | "Mixed" | "";
    notes: string;
  };

  // Exterior
  exterior: {
    siding:
      | "Excellent"
      | "Good"
      | "Needs Paint"
      | "Needs Repair"
      | "Needs Replacement"
      | "";
    sidingType: "Stucco" | "Vinyl" | "Wood" | "Brick" | "Concrete Block" | "";
    windows: "New" | "Good" | "Old Single Pane" | "Broken/Missing" | "";
    windowsType?:
      | "Impact-Rated"
      | "Hurricane"
      | "Double Pane"
      | "Single Pane"
      | "Mixed"
      | "Unknown"
      | "";
    windowsCondition?:
      | "Excellent"
      | "Good"
      | "Some Broken"
      | "Many Broken"
      | "All Need Replacement"
      | "";
    doors: "Excellent" | "Good" | "Worn" | "Needs Replacement" | "";
    gutters: "Good" | "Needs Repair" | "Missing" | "";
    landscaping: "Well Maintained" | "Overgrown" | "Minimal" | "";
    fencing: "Good" | "Needs Repair" | "None" | "";
    driveway: "Excellent" | "Good" | "Cracked" | "Needs Replacement" | "";
    notes: string;
  };

  // Interior - Kitchen
  kitchen: {
    condition: "Modern" | "Updated" | "Dated" | "Needs Full Rehab" | "";
    cabinets: "Excellent" | "Good" | "Worn" | "Needs Replacement" | "";
    countertops:
      | "Granite/Quartz"
      | "Laminate Good"
      | "Laminate Worn"
      | "Needs Replacement"
      | "";
    appliances: "All New" | "Most Good" | "Old" | "Missing/Broken" | "";
    flooring: "Tile" | "Vinyl" | "Wood" | "Needs Replacement" | "";
    notes: string;
  };

  // Interior - Bathrooms
  bathrooms: Array<{
    location: string; // e.g., "Master", "Hall Bath", "Guest"
    condition: "Excellent" | "Good" | "Dated" | "Poor" | "";
    vanity: "Modern" | "Good" | "Worn" | "Needs Replacement" | "";
    toilet: "Good" | "Needs Replacement" | "";
    tubShower: "Excellent" | "Good" | "Worn/Stained" | "Cracked/Damaged" | "";
    tile: "Modern" | "Good" | "Dated" | "Cracked/Missing" | "";
    notes: string;
  }>;

  // Interior - Bedrooms
  bedrooms: Array<{
    location: string; // e.g., "Master", "Bedroom 2"
    flooring:
      | "Tile"
      | "Wood"
      | "Carpet Good"
      | "Carpet Worn"
      | "Needs Replacement"
      | "";
    closets: "Excellent" | "Adequate" | "Small" | "None" | "";
    condition: "Excellent" | "Good" | "Needs Paint" | "Needs Work" | "";
    notes: string;
  }>;

  // Interior - General
  interior: {
    flooring: "Excellent" | "Good" | "Mixed" | "Needs Replacement" | "";
    walls: "Excellent" | "Good" | "Needs Paint" | "Needs Repair" | "";
    ceilings: "Excellent" | "Good" | "Stains/Cracks" | "Needs Repair" | "";
    lighting: "Modern" | "Adequate" | "Outdated" | "";
    openFloorPlan: boolean;
    notes: string;
  };

  // Special Features
  pool: {
    hasPool: boolean;
    condition: "Excellent" | "Good" | "Needs Repair" | "Not Working" | "";
    equipment: "New" | "Good" | "Old" | "Needs Replacement" | "";
    notes: string;
  };

  // Additional Issues
  additionalIssues: {
    mold: boolean;
    moldDetails?: string;
    termites: boolean;
    termitesDetails?: string;
    waterDamage: boolean;
    waterDamageDetails?: string;
    fireDamage: boolean;
    fireDamageDetails?: string;
    structuralIssues: boolean;
    structuralIssuesDetails?: string;
    codeViolations: boolean;
    codeViolationsDetails?: string;
    other: string;
  };

  // General notes
  generalNotes: string;
  lastUpdated: string;
  isScopeFinalized?: boolean; // Track if scope of work is finalized
  lineItems?: Array<{
    id: string;
    category: "structural" | "systems" | "interior" | "exterior";
    description: string;
    estimatedCost: number;
  }>; // Scope of work line items

  // Hidden logic fields for enhanced calculations
  floodZone?: boolean; // In FEMA flood zone (affects insurance and foundation concerns)
  confidenceScore?: number; // 0-100 calculated based on data completeness

  // v255_change: Derived/calculated fields (non-breaking additions)
  _rehabLevel?: "light" | "medium" | "heavy";
  _rehabCostPsqft?: number;
  _rehabCostEstimate?: number;
  _riskScore?: number;
  _followUp?: string[]; // Fields marked as "Unknown" that need follow-up
  _calc?: {
    version: number;
    timestamp: string;
  };

  // v255_change: Enhanced condition fields for VA workflow
  foundationType?: "Slab" | "Crawl" | "Basement" | "Unknown" | "";
  roofAge?: number;
  structuralIssues?: boolean;
  hvacType?: "Central" | "Window" | "Both" | "None" | "";
  hvacCount?: number;
  hvacAge?: number;
  hvacWorking?: "Yes" | "No" | "Partial" | "Unknown" | "";
  electricalUpdated?: "Yes" | "No" | "Unknown" | "";
  electricalIssues?: string;
  waterHeaterAge?: number;
  waterHeaterWorking?: "Yes" | "No" | "Unknown" | "";
  kitchenConditionLevel?: "New" | "Average" | "Old" | "Full Gut" | "";
  bathroomsConditionLevel?: "New" | "Average" | "Old" | "Full Gut" | "";
  flooringCondition?: "Tile" | "Vinyl" | "Wood" | "Carpet" | "Damaged" | "";
  interiorPaintNeeded?: boolean;
  windowsType?: "Impact" | "Original" | "Broken" | "Unknown" | "";
  ceilingStains?: boolean;
  neighborhoodTier?: "A" | "B" | "C" | "D" | "";
  crimeRisk?: "Low" | "Medium" | "High" | "";
  insuranceZone?: "Standard" | "Flood" | "Windstorm" | "";
  proximityToWater?: number; // feet
  sellingReason?:
    | "Retiring"
    | "Relocating"
    | "Tenant Issue"
    | "Out-of-State"
    | "Estate"
    | "Vacant"
    | "Other"
    | "";
  timelinePressure?: boolean;
  flexibleOnPrice?: boolean;
  asIsAccepted?: boolean;
}
