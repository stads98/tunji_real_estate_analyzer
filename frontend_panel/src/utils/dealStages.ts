import { DealStage, DealStageInfo } from "../types/deal";

/**
 * Deal Stage Configuration
 * Defines the workflow stages for tracking deal progress from initial data to final outcome
 */
export const DEAL_STAGES: Record<DealStage, DealStageInfo> = {
  'stage1-basic-data': {
    stage: 'stage1-basic-data',
    label: 'Needs Basic Data',
    shortLabel: 'Basic Data',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100 border-gray-300',
    description: 'Initial data entry - address, units, price',
    order: 1,
  },
  'stage2-ready-comps': {
    stage: 'stage2-ready-comps',
    label: 'Adding Comps & Pictures',
    shortLabel: 'Comps',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 border-blue-300',
    description: 'Adding comparables and property photos',
    order: 2,
  },
  'stage3-data-collection': {
    stage: 'stage3-data-collection',
    label: 'Speaking to Realtor',
    shortLabel: 'Realtor',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100 border-purple-300',
    description: 'Speaking to realtor and collecting notes',
    order: 3,
  },
  'stage4-ready-offer': {
    stage: 'stage4-ready-offer',
    label: 'Filling Out Rehab Info',
    shortLabel: 'Rehab',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100 border-orange-300',
    description: 'Filling out rehab information and estimates',
    order: 4,
  },
  'stage5-offer-submitted': {
    stage: 'stage5-offer-submitted',
    label: 'Ready for Max Offer',
    shortLabel: 'Max Offer',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100 border-indigo-300',
    description: 'Ready to calculate and submit max offer',
    order: 5,
  },
  'stage6-accepted': {
    stage: 'stage6-accepted',
    label: 'Offer Accepted',
    shortLabel: 'Accepted',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-300',
    description: 'Offer submitted - waiting on outcome (Accepted)',
    order: 6,
  },
  'stage6-rejected': {
    stage: 'stage6-rejected',
    label: 'Offer Rejected',
    shortLabel: 'Rejected',
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-300',
    description: 'Offer submitted - waiting on outcome (Rejected)',
    order: 6,
  },
  'stage6-counter': {
    stage: 'stage6-counter',
    label: 'Counter-Offer',
    shortLabel: 'Counter',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100 border-amber-300',
    description: 'Offer submitted - waiting on outcome (Counter)',
    order: 6,
  },
  'archived': {
    stage: 'archived',
    label: 'Archived',
    shortLabel: 'Archived',
    color: 'text-slate-500',
    bgColor: 'bg-slate-50 border-slate-200',
    description: 'Deal closed or no longer pursuing',
    order: 99,
  },
};

/**
 * Get stage info for a given stage
 */
export function getStageInfo(stage: DealStage | undefined): DealStageInfo {
  if (!stage || !DEAL_STAGES[stage]) {
    return DEAL_STAGES['stage1-basic-data'];
  }
  return DEAL_STAGES[stage];
}

/**
 * Get all stages in order
 */
export function getAllStages(): DealStageInfo[] {
  return Object.values(DEAL_STAGES).sort((a, b) => a.order - b.order);
}

/**
 * Get stages grouped by workflow phase
 */
export function getStagesByPhase() {
  return {
    active: [
      DEAL_STAGES['stage1-basic-data'],
      DEAL_STAGES['stage2-ready-comps'],
      DEAL_STAGES['stage3-data-collection'],
      DEAL_STAGES['stage4-ready-offer'],
      DEAL_STAGES['stage5-offer-submitted'],
    ],
    outcomes: [
      DEAL_STAGES['stage6-accepted'],
      DEAL_STAGES['stage6-rejected'],
      DEAL_STAGES['stage6-counter'],
    ],
    closed: [
      DEAL_STAGES['archived'],
    ],
  };
}

/**
 * Get default stage for new deals
 */
export function getDefaultStage(): DealStage {
  return 'stage1-basic-data';
}

/**
 * Get next suggested stage based on deal data completeness
 * This helps auto-suggest when to move to next stage
 */
export function suggestNextStage(currentStage: DealStage, dealData: any): DealStage | null {
  switch (currentStage) {
    case 'stage1-basic-data':
      // Move to stage 2 when basic data is filled
      if (dealData.address && dealData.units && dealData.purchasePrice) {
        return 'stage2-ready-comps';
      }
      break;
    
    case 'stage2-ready-comps':
      // Move to stage 3 when comps/photos are added
      if (dealData.comparables?.length > 0 || dealData.photos?.length > 0) {
        return 'stage3-data-collection';
      }
      break;
    
    case 'stage3-data-collection':
      // Move to stage 4 when notes are collected (checking for notes in notes field)
      if (dealData.notes?.notes || dealData.teamNotes?.length > 0) {
        return 'stage4-ready-offer';
      }
      break;
    
    case 'stage4-ready-offer':
      // Move to stage 5 when rehab info is filled out
      if (dealData.isScopeFinalized || dealData.lineItems?.length > 0 || dealData.rehabBudget > 0) {
        return 'stage5-offer-submitted';
      }
      break;
    
    case 'stage5-offer-submitted':
      // Stage 5 is "Ready for Max Offer" - user manually submits to stage 6
      // No auto-progression from here
      return null;
    
    default:
      return null;
  }
  
  return null;
}

/**
 * Check if stage can transition to another stage
 */
export function canTransitionTo(from: DealStage, to: DealStage): boolean {
  // Can always move backwards or to archived
  if (to === 'archived') return true;
  
  const fromOrder = DEAL_STAGES[from].order;
  const toOrder = DEAL_STAGES[to].order;
  
  // Can move backwards
  if (toOrder < fromOrder) return true;
  
  // Can move forward by one stage
  if (toOrder === fromOrder + 1) return true;
  
  // Can move from stage 5 to any stage 6 outcome
  if (from === 'stage5-offer-submitted' && toOrder === 6) return true;
  
  // Can move between stage 6 outcomes
  if (fromOrder === 6 && toOrder === 6) return true;
  
  return false;
}

/**
 * Format stage for display in compact spaces
 */
export function formatStageCompact(stage: DealStage | undefined): string {
  const info = getStageInfo(stage);
  return info.shortLabel;
}

/**
 * Get stage color classes for Tailwind
 */
export function getStageColorClasses(stage: DealStage | undefined): {
  text: string;
  bg: string;
  badge: string;
} {
  const info = getStageInfo(stage);
  return {
    text: info.color,
    bg: info.bgColor,
    badge: `${info.bgColor} ${info.color} border`,
  };
}
