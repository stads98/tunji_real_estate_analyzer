// v253_change: Default notes structure factory
import { DealNotes } from '../types/deal';

export function getDefaultNotes(): DealNotes {
  return {
    realtorName: '',
    realtorPhone: '',
    realtorEmail: '',
    realtorNotes: '',
    sellerMotivation: '',
    overallCondition: '',
    estimatedRehabCost: '',
    roof: {
      condition: '',
      age: '',
      roofYear: undefined,
      leaks: false,
      notes: ''
    },
    foundation: {
      condition: '',
      notes: ''
    },
    hvac: {
      condition: '',
      age: '',
      systemType: '',
      numberOfUnits: '',
      notes: ''
    },
    plumbing: {
      condition: '',
      pipeMaterial: '',
      pipeAge: '',
      waterHeater: '',
      leaks: false,
      notes: ''
    },
    electrical: {
      condition: '',
      panelSize: '',
      panelAmperage: '',
      wiringType: '',
      notes: ''
    },
    exterior: {
      siding: '',
      sidingType: '',
      windows: '',
      windowsType: '',
      windowsCondition: '',
      doors: '',
      gutters: '',
      landscaping: '',
      fencing: '',
      driveway: '',
      notes: ''
    },
    kitchen: {
      condition: '',
      cabinets: '',
      countertops: '',
      appliances: '',
      flooring: '',
      notes: ''
    },
    bathrooms: [],
    bedrooms: [],
    interior: {
      flooring: '',
      walls: '',
      ceilings: '',
      lighting: '',
      openFloorPlan: false,
      notes: ''
    },
    pool: {
      hasPool: false,
      condition: '',
      equipment: '',
      notes: ''
    },
    additionalIssues: {
      mold: false,
      moldDetails: '',
      termites: false,
      termitesDetails: '',
      waterDamage: false,
      waterDamageDetails: '',
      fireDamage: false,
      fireDamageDetails: '',
      structuralIssues: false,
      structuralIssuesDetails: '',
      codeViolations: false,
      codeViolationsDetails: '',
      other: ''
    },
    generalNotes: '',
    lastUpdated: new Date().toISOString(),
    isScopeFinalized: false,
    floodZone: false,
    confidenceScore: undefined
  };
}
