// backend_service/schemas/deal.model.js
const mongoose = require("mongoose");

const unitDetailSchema = new mongoose.Schema({
  beds: { type: Number, required: true },
  baths: { type: Number, required: true },
  sqft: { type: Number },
  section8Rent: { type: Number },
  marketRent: { type: Number },
  afterRehabMarketRent: { type: Number },
  strAnnualRevenue: { type: Number },
  strAnnualExpenses: { type: Number },
});

const zillowCompSchema = new mongoose.Schema({
  id: { type: String, required: true },
  address: { type: String, required: true },
  soldPrice: { type: Number, required: true },
  soldDate: { type: String, required: true },
  beds: { type: Number, required: true },
  baths: { type: Number, required: true },
  sqft: { type: Number, required: true },
  propertyType: { type: String, required: true },
  yearBuilt: { type: Number, required: true },
  pricePerSqft: { type: Number, required: true },
  description: { type: String },
  zillowLink: { type: String },
  zestimate: { type: Number },
  rentZestimate: { type: Number },
  photos: [
    {
      id: String,
      url: String,
      isPrimary: Boolean,
    },
  ],
  lat: { type: Number },
  lng: { type: Number },
});

const dealNotesSchema = new mongoose.Schema(
  {
    // Realtor info
    realtorName: String,
    realtorPhone: String,
    realtorEmail: String,
    realtorNotes: String,

    // Property assessment
    sellerMotivation: String,
    overallCondition: String,
    estimatedRehabCost: String,

    // Structural systems
    roof: {
      condition: String,
      age: String,
      roofYear: Number,
      leaks: Boolean,
      notes: String,
    },
    foundation: {
      condition: String,
      notes: String,
    },
    hvac: {
      condition: String,
      age: String,
      systemType: String,
      numberOfUnits: String,
      notes: String,
    },
    plumbing: {
      condition: String,
      pipeMaterial: String,
      pipeAge: String,
      waterHeater: String,
      leaks: Boolean,
      notes: String,
    },
    electrical: {
      condition: String,
      panelSize: String,
      panelAmperage: String,
      wiringType: String,
      notes: String,
    },
    exterior: {
      siding: String,
      sidingType: String,
      windows: String,
      doors: String,
      gutters: String,
      landscaping: String,
      fencing: String,
      driveway: String,
      notes: String,
    },
    kitchen: {
      condition: String,
      cabinets: String,
      countertops: String,
      appliances: String,
      flooring: String,
      notes: String,
    },
    bathrooms: [
      {
        location: String,
        condition: String,
        vanity: String,
        toilet: String,
        tubShower: String,
        tile: String,
        notes: String,
      },
    ],
    bedrooms: [
      {
        location: String,
        flooring: String,
        closets: String,
        condition: String,
        notes: String,
      },
    ],
    interior: {
      flooring: String,
      walls: String,
      ceilings: String,
      lighting: String,
      openFloorPlan: Boolean,
      notes: String,
    },
    pool: {
      hasPool: Boolean,
      condition: String,
      equipment: String,
      notes: String,
    },
    additionalIssues: {
      mold: Boolean,
      moldDetails: String,
      termites: Boolean,
      termitesDetails: String,
      waterDamage: Boolean,
      waterDamageDetails: String,
      fireDamage: Boolean,
      fireDamageDetails: String,
      structuralIssues: Boolean,
      structuralIssuesDetails: String,
      codeViolations: Boolean,
      codeViolationsDetails: String,
      other: String,
    },
    generalNotes: String,
    isScopeFinalized: Boolean,

    // Additional fields for enhanced calculations
    floodZone: Boolean,
    confidenceScore: Number,
    _rehabLevel: String,
    _rehabCostPsqft: Number,
    _riskScore: Number,

    lastUpdated: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false }
);

const dealSchema = new mongoose.Schema(
  {
    // Basic property info
    address: { type: String, required: true, trim: true },
    units: { type: Number, required: true, min: 1 },
    unitDetails: [unitDetailSchema],
    totalSqft: { type: Number, required: true },
    yearBuilt: { type: Number, required: true },

    // Financial inputs
    purchasePrice: { type: Number, required: true },
    maxOffer: { type: Number },
    isOffMarket: { type: Boolean, default: false },

    // Loan parameters
    loanInterestRate: { type: Number, required: true },
    loanTerm: { type: Number, required: true },
    downPayment: { type: Number, required: true },
    acquisitionCosts: { type: Number, required: true },
    acquisitionCostsAmount: { type: Number },
    setupFurnishCost: { type: Number, default: 0 },

    // Property expenses
    propertyTaxes: { type: Number, required: true },
    propertyInsurance: { type: Number, required: true },
    hasHurricaneWindows: { type: Boolean, default: false },
    hasNewRoof: { type: Boolean, default: false },

    // Rehab/BRRRR fields
    isRehab: { type: Boolean, default: false },
    rehabUnitType: {
      type: String,
      enum: ["single", "duplex", "triplex", "quad"],
    },
    rehabCondition: {
      type: String,
      enum: ["light", "lite+", "medium", "heavy", "fullgut"],
    },
    rehabCost: { type: Number, default: 0 },
    rehabMonths: { type: Number, default: 6 },
    rehabFinancingRate: { type: Number, default: 11.0 },
    rehabEntryPoints: { type: Number, default: 6.0 },
    rehabExitPoints: { type: Number, default: 5.0 },

    // Bridge loan parameters
    bridgeLTC: { type: Number, default: 90 },
    bridgeRehabBudgetPercent: { type: Number, default: 100 },
    bridgeMaxARLTV: { type: Number, default: 70 },
    bridgeSettlementCharges: { type: Number },

    // Exit strategy
    exitStrategy: { type: String, enum: ["sell", "refi"], default: "refi" },
    exitRefiLTV: { type: Number, default: 75 },
    exitRefiRate: { type: Number, default: 7.25 },
    afterRepairValue: { type: Number, default: 0 },
    rehabPropertyTaxes: { type: Number, default: 0 },
    rehabPropertyInsurance: { type: Number, default: 0 },
    sellClosingCosts: { type: Number, default: 8 },
    dscrAcquisitionCosts: { type: Number },

    // ARV calculator
    arvComps: [zillowCompSchema],
    subjectLat: { type: Number },
    subjectLng: { type: Number },
    calculatedARV: { type: Number, default: 0 },
    subjectPropertyDescription: { type: String },
    subjectPropertyZillowLink: { type: String },

    strADR: { type: Number }, // DEPRECATED but needed for compatibility
    hasHurricaneWindows: { type: Boolean, default: false },
    hasNewRoof: { type: Boolean, default: false },
    setupFurnishCost: { type: Number, default: 0 },
    rehabPropertyTaxes: { type: Number, default: 0 },
    rehabPropertyInsurance: { type: Number, default: 0 },
    dscrAcquisitionCosts: { type: Number },

    // Property photos and notes
    photos: [
      {
        id: String,
        url: String,
        isPrimary: Boolean,
      },
    ],
    notes: dealNotesSchema,

    // Metadata
    isActive: { type: Boolean, default: true },
    schemaVersion: { type: Number, default: 3 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        ret.savedAt = ret.createdAt;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for better query performance
dealSchema.index({ createdAt: -1 });
dealSchema.index({ address: "text" });
dealSchema.index({ isActive: 1 });
dealSchema.index({ "unitDetails.beds": 1 });
dealSchema.index({ purchasePrice: 1 });

const Deal = mongoose.model("Deal", dealSchema);
module.exports = Deal;
