//src/components/UnifiedDashboard.tsx
import { useState, useEffect, useMemo } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import {
  DealInputs,
  GlobalAssumptions,
  Strategy,
  UnitDetail,
  DealNotes,
  ZillowComp,
  SavedDeal,
  UnitData,
  DealStage,
  DEAL_SCHEMA_VERSION,
} from "../types/deal";
import {
  calculateLTR,
  calculateSection8,
  calculateAirbnb,
  calculateRehab,
  formatCurrency,
  formatPercent,
} from "../utils/calculations";
import { calculateRehabScenarios } from "../utils/rehabCalculations";
import {
  extractZipCode,
  autoPopulateSection8Rents,
  getSection8Rent,
} from "../utils/section8Helper";
import {
  calculateCurrentInsurance,
  calculateRehabInsurance,
  getInsuranceRateDescription,
} from "../utils/insuranceCalculator";
import {
  calculateRehabEstimate,
  getUnitTypeFromCount,
} from "../utils/rehabEstimator";
import { withAutoCalcs } from "../utils/autoCalcs";
import { getDefaultNotes } from "../utils/defaultNotes";
import { PhotoGallery } from "./PhotoGallery";
import {
  Home,
  Building2,
  Palmtree,
  Settings,
  Plus,
  Trash2,
  Save,
  Eye,
  Hammer,
  MapPin,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  FileText,
  Calculator,
  Star,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ImageIcon,
  Loader2,
  Loader,
  MessageSquare,
  BookOpen,
  Activity,
} from "lucide-react";
import { CashFlowChart } from "./charts/CashFlowChart";
import { LoanBalanceEquityChart } from "./charts/LoanBalanceEquityChart";
import { ROIChart } from "./charts/ROIChart";
import { RehabEstimateForm } from "./RehabEstimateForm"; // v256_change: Streamlined rehab-focused form
import { ARVCalculator, SubjectProperty } from "./ARVCalculator";
import { parseZillowForSale } from "../utils/zillowParser";
import { toast } from "sonner";
import { dashboardService } from "../services/dashboard.service";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { DealNotes as DealNotesComp } from "./DealNotes";
import { getStageInfo, getStagesByPhase } from "../utils/dealStages";
import { getNotesForDeal, loadTeamNotes } from "../utils/teamNotesStorage";
import { PipelineStats } from "./PipelineStats";
import { UserGuide } from "./UserGuide";
import { TeamNotesTab } from "./TeamNotesTab";
import { BulkPasteDialog } from "./BulkPasteDialog";
import { BulkProperty } from "../utils/zillowBulkParser";

interface UnifiedDashboardProps {
  globalAssumptions: GlobalAssumptions;
  onOpenAssumptions: () => void;
}

// v253_change: getDefaultNotes moved to utils/defaultNotes.ts

export function UnifiedDashboard({
  globalAssumptions,
  onOpenAssumptions,
}: UnifiedDashboardProps) {
  const [inputs, setInputs] = useState<DealInputs>({
    address: "",
    units: 1,
    unitDetails: [
      {
        beds: 3,
        baths: 2,
        section8Rent: 1650,
        strAnnualRevenue: 28800, // $2400/mo × 12 months (vacancy already accounted for by AirDNA)
        strAnnualExpenses: 5000, // Annual operating expenses
      },
    ],
    totalSqft: 1500,
    yearBuilt: 1990,
    purchasePrice: 350000,
    maxOffer: undefined, // Max offer to lock in for VA
    hasHurricaneWindows: false, // Impact/hurricane windows for FL insurance discount
    hasNewRoof: false, // Roof 0-5 years for FL insurance discount
    strADR: 125, // Deprecated but kept for backward compatibility
    propertyTaxes: Math.round(350000 * 0.02), // 2.0% for Broward County investment properties (non-homestead)
    propertyInsurance: calculateCurrentInsurance(350000, 1990), // Age-based insurance with FL discounts
    loanInterestRate: 7.25,
    loanTerm: 30,
    downPayment: 25,
    acquisitionCosts: 5,
    acquisitionCostsAmount: undefined,
    setupFurnishCost: 0, // Cosmetic renovation/furnishing - optional for all strategies
    isRehab: false,
    rehabUnitType: "single",
    rehabCondition: "medium",
    rehabCost: 0,
    rehabMonths: 6,
    rehabFinancingRate: 11.0,
    rehabEntryPoints: 6.0,
    rehabExitPoints: 5.0,
    bridgeLTC: 90,
    bridgeRehabBudgetPercent: 100,
    bridgeMaxARLTV: 70,
    exitStrategy: "refi",
    exitRefiLTV: 75,
    exitRefiRate: 7.25,
    afterRepairValue: 0,
    rehabPropertyTaxes: 0,
    rehabPropertyInsurance: 0,
    sellClosingCosts: 8,
    bridgeSettlementCharges: undefined,
    dscrAcquisitionCosts: undefined,
    notes: getDefaultNotes(),
    arvComps: [],
    subjectLat: 0,
    subjectLng: 0,
    calculatedARV: 0,
    photos: [], // v254_change: Initialize photos array
  });

  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>("ltr");
  const [savedDeals, setSavedDeals] = useState<SavedDeal[]>([]);
  const [currentDealId, setCurrentDealId] = useState<string | null>(null);
  const [comparisonYear, setComparisonYear] = useState<3 | 5 | 7 | 10>(5);
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null);
  const [timeHorizon, setTimeHorizon] = useState<5 | 7 | 10 | 15 | 30>(30);
  const [isTableExpanded, setIsTableExpanded] = useState(false);
  const [projectionMode, setProjectionMode] = useState<"realistic" | "lender">(
    "realistic"
  );
  const [hasManuallySelectedTab, setHasManuallySelectedTab] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [mainView, setMainView] = useState<
    "overview" | "condition" | "arv" | "teamnotes" | "stats" | "guide"
  >("overview");

  // Team notes state for badge counts
  const [teamNotesCount, setTeamNotesCount] = useState({ total: 0, pinned: 0 });

  // Track if unit details are auto-populated (for multi-family)
  const [unitsAutoPopulated, setUnitsAutoPopulated] = useState(false);

  // Multi-family total inputs (for 2-4 units only)
  const [totalBeds, setTotalBeds] = useState(0);
  const [totalBaths, setTotalBaths] = useState(0);

  // v253_change: Multi-unit distribution preview state
  const [distributionPreview, setDistributionPreview] = useState<
    UnitDetail[] | null
  >(null);

  // Zillow Quick Start
  const [showZillowQuickStart, setShowZillowQuickStart] = useState(false);
  const [zillowQuickStartData, setZillowQuickStartData] = useState("");

  // Bulk Paste
  const [showBulkPaste, setShowBulkPaste] = useState(false);

  // ARV Calculator expanded descriptions state
  const [arvExpandedDescriptions, setArvExpandedDescriptions] = useState<
    Record<string, boolean>
  >({});

  // ARV Map/Table hover sync state
  const [hoveredCompId, setHoveredCompId] = useState<string | null>(null);

  // Sorting state for saved deals table
  type SortColumn =
    | "address"
    | "maxOffer"
    | "price"
    | "units"
    | "ltrCF"
    | "ltrDSCR"
    | "s8CF"
    | "s8DSCR"
    | "strCF"
    | "strDSCR"
    | "best";
  type SortDirection = "asc" | "desc";
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [savingDeal, setSavingDeal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load saved deals from API on component mount
  useEffect(() => {
    loadDealsFromAPI();
  }, []);

  // Load deals from backend API
  const loadDealsFromAPI = async () => {
    try {
      setLoading(true);
      const response = await dashboardService.getDeals({
        page: 1,
        limit: 100, // Load all deals for now
      });
      setSavedDeals(response.data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("Failed to load deals:", error);
      toast.error("Failed to load saved deals");
    }
  };

  // Update team notes count
  useEffect(() => {
    const updateNotesCount = () => {
      const allNotes = loadTeamNotes();
      setTeamNotesCount({
        total: allNotes.length,
        pinned: allNotes.filter((n) => n.isPinned).length,
      });
    };

    updateNotesCount();

    // Update every 2 seconds to catch changes
    const interval = setInterval(updateNotesCount, 2000);
    return () => clearInterval(interval);
  }, [savedDeals]);

  // v253_change: Update units when count changes (with loop guard)
  useEffect(() => {
    if (inputs.units !== inputs.unitDetails.length) {
      const newUnitDetails = [...inputs.unitDetails];

      if (inputs.units > inputs.unitDetails.length) {
        // Add units
        const lastUnit = inputs.unitDetails[inputs.unitDetails.length - 1] || {
          beds: 3,
          baths: 2,
          section8Rent: 1650,
          strAnnualRevenue: 28800,
          strAnnualExpenses: 5000,
          strOccupancy: 75,
        };
        while (newUnitDetails.length < inputs.units) {
          newUnitDetails.push({ ...lastUnit });
        }
      } else {
        // Remove units
        newUnitDetails.length = inputs.units;
      }

      // v253_change: Shallow compare to prevent re-setting same state
      const isDifferent =
        newUnitDetails.some((unit, idx) => {
          const existing = inputs.unitDetails[idx];
          return (
            !existing ||
            unit.beds !== existing.beds ||
            unit.baths !== existing.baths ||
            unit.section8Rent !== existing.section8Rent
          );
        }) || newUnitDetails.length !== inputs.unitDetails.length;

      if (isDifferent) {
        setInputs((prev) => ({ ...prev, unitDetails: newUnitDetails }));
      }
    }
  }, [inputs.units, inputs.unitDetails.length]);

  // Auto-update rehab cost estimate when units, sqft, or condition changes
  useEffect(() => {
    if (inputs.isRehab) {
      const unitType = getUnitTypeFromCount(inputs.units);
      const estimate = calculateRehabEstimate(
        inputs.totalSqft,
        unitType,
        inputs.rehabCondition
      );
      if (estimate !== inputs.rehabCost) {
        setInputs((prev) => ({
          ...prev,
          rehabCost: estimate,
          rehabUnitType: unitType,
        }));
      }
    }
  }, [inputs.units, inputs.totalSqft, inputs.rehabCondition, inputs.isRehab]);

  // Auto-populate DSCR Acquisition Costs to 5% of ARV when ARV changes
  useEffect(() => {
    if (inputs.afterRepairValue > 0) {
      const defaultAmount = Math.round(inputs.afterRepairValue * 0.05);
      // Only update if current value is undefined or doesn't match the 5% calculation
      // This allows the auto-population while still respecting manual edits
      if (
        inputs.dscrAcquisitionCosts === undefined ||
        inputs.dscrAcquisitionCosts !== defaultAmount
      ) {
        setInputs((prev) => ({ ...prev, dscrAcquisitionCosts: defaultAmount }));
      }
    }
  }, [inputs.afterRepairValue]);

  // Helper function to distribute total beds/baths/sqft across units for multi-family properties
  // Returns an array of {beds, baths, sqft} for each individual unit
  // SQFT is distributed PROPORTIONALLY based on bedroom count (not evenly split)
  const distributeUnitsSpecs = (
    totalBedsInput: number,
    totalBathsInput: number,
    totalSqft: number,
    unitCount: number
  ): Array<{ beds: number; baths: number; sqft: number }> => {
    // Distribute beds across units (always whole numbers)
    const bedsPerUnit = Math.floor(totalBedsInput / unitCount);
    const bedsRemainder = totalBedsInput % unitCount;

    // Distribute baths across units (always whole numbers for multi-family)
    const bathsPerUnit = Math.floor(totalBathsInput / unitCount);
    const bathsRemainder = totalBathsInput % unitCount;

    // Create array of units with beds/baths distributed
    const unitsWithBeds = Array.from({ length: unitCount }, (_, i) => ({
      beds: bedsPerUnit + (i < bedsRemainder ? 1 : 0),
      baths: bathsPerUnit + (i < bathsRemainder ? 1 : 0),
    }));

    // Calculate sqft proportionally based on bedroom count
    // Example: 5 total beds, 2,300 sqft → Unit with 3 beds gets 60% (1,380 sqft), Unit with 2 beds gets 40% (920 sqft)
    const units = unitsWithBeds.map((unit) => {
      const proportion = unit.beds / totalBedsInput;
      const sqft = Math.round(totalSqft * proportion);
      return { ...unit, sqft };
    });

    return units;
  };

  // v253_change: Refactored to use centralized withAutoCalcs for basic auto-calculations
  const handleChange = (
    field: keyof DealInputs,
    value:
      | string
      | number
      | boolean
      | undefined
      | { id: string; url: string; isPrimary?: boolean }[]
  ) => {
    setInputs((prev) => {
      // Apply basic auto-calcs (taxes, insurance, ARV defaults) via centralized utility
      let updated = withAutoCalcs(prev, { [field]: value });

      // v253_change: Multi-unit distribution with preview (totalSqft changes)
      if (field === "totalSqft" && typeof value === "number") {
        if (
          prev.units >= 2 &&
          prev.units <= 4 &&
          value > 0 &&
          totalBeds > 0 &&
          totalBaths > 0
        ) {
          const distributedUnits = distributeUnitsSpecs(
            totalBeds,
            totalBaths,
            value,
            prev.units
          );
          const zipCode = extractZipCode(prev.address);
          const newUnitDetails = distributedUnits.map((unit, i) => {
            const section8Rent = zipCode
              ? getSection8Rent(
                  unit.beds,
                  zipCode,
                  globalAssumptions.section8ZipData
                ) || 0
              : prev.unitDetails[i]?.section8Rent || 0;

            return {
              beds: unit.beds,
              baths: unit.baths,
              sqft: unit.sqft,
              section8Rent,
              marketRent: prev.unitDetails[i]?.marketRent,
              afterRehabMarketRent: prev.unitDetails[i]?.afterRehabMarketRent,
              strMonthlyRevenue: prev.unitDetails[i]?.strMonthlyRevenue || 2400,
            };
          });

          // Show preview instead of applying immediately
          setDistributionPreview(newUnitDetails);
          // Don't update yet - wait for user to apply
        }
      }

      // Complex logic: Section 8 auto-population when address changes
      if (field === "address" && typeof value === "string") {
        const zipCode = extractZipCode(value);
        if (zipCode) {
          const autoPopulatedUnits = autoPopulateSection8Rents(
            value,
            prev.unitDetails,
            globalAssumptions
          );
          if (
            JSON.stringify(autoPopulatedUnits) !==
            JSON.stringify(prev.unitDetails)
          ) {
            const unitsWithAfterRepair = autoPopulatedUnits.map((unit) => {
              const afterRehabMarketRent =
                unit.section8Rent !== undefined
                  ? Math.round(unit.section8Rent * 1.3)
                  : undefined;
              return {
                ...unit,
                afterRehabMarketRent,
              };
            });
            updated = { ...updated, unitDetails: unitsWithAfterRepair };
            toast.success(
              `Section 8 rents auto-populated from zip code ${zipCode}`
            );
          }
        }
      }

      // Complex logic: ARV and after-repair rents when Enable Rehab is checked
      if (field === "isRehab" && value === true) {
        const arv = Math.round(prev.purchasePrice * 1.3);
        const unitsWithAfterRepair = prev.unitDetails.map((unit) => ({
          ...unit,
          afterRehabMarketRent:
            unit.section8Rent !== undefined
              ? Math.round(unit.section8Rent * 1.3)
              : undefined,
        }));
        updated = {
          ...updated,
          afterRepairValue: arv,
          rehabPropertyTaxes: Math.round(arv * 0.02),
          rehabPropertyInsurance: calculateRehabInsurance(
            arv,
            prev.yearBuilt,
            prev.totalSqft
          ),
          unitDetails: unitsWithAfterRepair,
        };
        toast.success(
          "ARV and after-repair rents auto-populated at 30% above current values!"
        );
      }

      // v253_change: Unit distribution with preview (units count changes)
      if (field === "units" && typeof value === "number") {
        if (
          value >= 2 &&
          value <= 4 &&
          prev.totalSqft > 0 &&
          totalBeds > 0 &&
          totalBaths > 0
        ) {
          const distributedUnits = distributeUnitsSpecs(
            totalBeds,
            totalBaths,
            prev.totalSqft,
            value
          );
          const zipCode = extractZipCode(prev.address);
          const newUnitDetails = distributedUnits.map((unit, i) => {
            const section8Rent = zipCode
              ? getSection8Rent(
                  unit.beds,
                  zipCode,
                  globalAssumptions.section8ZipData
                ) || 0
              : prev.unitDetails[i]?.section8Rent || 0;

            return {
              beds: unit.beds,
              baths: unit.baths,
              sqft: unit.sqft,
              section8Rent,
              marketRent: prev.unitDetails[i]?.marketRent,
              afterRehabMarketRent: prev.unitDetails[i]?.afterRehabMarketRent,
              strMonthlyRevenue: prev.unitDetails[i]?.strMonthlyRevenue || 2400,
            };
          });

          // Show preview instead of applying immediately
          setDistributionPreview(newUnitDetails);
          // Don't update yet - wait for user to apply
        }
      }

      return updated;
    });
  };

  const handleUnitChange = (
    index: number,
    field: keyof UnitData,
    value: number
  ) => {
    const newUnitDetails = [...inputs.unitDetails];
    newUnitDetails[index] = { ...newUnitDetails[index], [field]: value };

    // Mark units as manually edited (no longer auto-populated)
    if (field === "beds" || field === "baths") {
      setUnitsAutoPopulated(false);
    }

    // If beds changed and we have a detected zip code, auto-populate Section 8 rent
    if (field === "beds") {
      const zipCode = extractZipCode(inputs.address);
      if (zipCode) {
        const zipData = globalAssumptions.section8ZipData.find(
          (z) => z.zipCode === zipCode
        );
        if (zipData) {
          const bedKey =
            value === 0
              ? "studio"
              : (`${value}bed` as keyof typeof zipData.rents);
          const section8Rent = zipData.rents[bedKey];
          if (section8Rent) {
            newUnitDetails[index] = {
              ...newUnitDetails[index],
              section8Rent,
              marketRent: undefined, // Clear custom market rent when Section 8 changes
              afterRehabMarketRent: Math.round(section8Rent * 1.3), // Auto-populate at 30% higher
            };
            toast.success(
              `Unit ${
                index + 1
              }: Section 8 rent updated to ${section8Rent} for ${value} bed`
            );
          }
        }
      }
    }

    // If section8Rent changed, clear custom market rent and auto-populate afterRehabMarketRent
    if (field === "section8Rent") {
      newUnitDetails[index] = {
        ...newUnitDetails[index],
        marketRent: undefined, // Clear custom market rent when Section 8 changes
        afterRehabMarketRent: Math.round(value * 1.3),
      };
    }

    setInputs((prev) => ({ ...prev, unitDetails: newUnitDetails }));
  };

  // v253_change: Apply the distribution preview
  const handleApplyDistribution = () => {
    if (distributionPreview) {
      setInputs((prev) => ({ ...prev, unitDetails: distributionPreview }));
      setUnitsAutoPopulated(true);
      setDistributionPreview(null);
      toast.success(
        `Applied distribution: ${distributionPreview.length} units configured`
      );
    }
  };

  // v253_change: Dismiss the distribution preview
  const handleDismissDistribution = () => {
    setDistributionPreview(null);
  };

  const formatNumber = (num: number | string): string => {
    const value = typeof num === "string" ? num : num.toString();
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const parseNumber = (value: string): number => {
    return Number(value.replace(/,/g, ""));
  };

  const handleNumberInput = (field: keyof DealInputs, value: string) => {
    const numValue = parseNumber(value);
    if (!isNaN(numValue)) {
      handleChange(field, numValue);
    }
  };

  // Handler for changing deal stage
  const handleStageChange = async (dealId: string, newStage: DealStage) => {
    try {
      // Get the old stage before updating
      const deal = savedDeals.find((d) => d.id === dealId);
      const oldStage = deal?.dealStage;

      // Update deal stage via API - use proper type casting
      await dashboardService.updateDeal(dealId, {
        ...deal, // Include all existing deal data
        dealStage: newStage,
        stageUpdatedAt: new Date().toISOString(),
      } as Partial<DealInputs> & { dealStage: DealStage; stageUpdatedAt: string });

      // Update local state
      setSavedDeals((deals) =>
        deals.map((deal) =>
          deal.id === dealId
            ? {
                ...deal,
                dealStage: newStage,
                stageUpdatedAt: new Date().toISOString(),
              }
            : deal
        )
      );

      // Add system note for stage change
      if (oldStage && oldStage !== newStage) {
        const oldStageInfo = getStageInfo(oldStage);
        const newStageInfo = getStageInfo(newStage);

        // Special tracking for Stage 5 (Ready for Max Offer)
        if (newStage === "stage5-offer-submitted") {
          // Calculate days in pipeline (from creation to now)
          let daysInPipeline = 0;
          if (deal?.createdAt) {
            const created = new Date(deal.createdAt);
            const now = new Date();
            daysInPipeline = Math.floor(
              (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
            );
          }

          // Get days on Zillow (from deal data)
          const daysOnZillow = deal?.daysOnMarket || 0;

          // Build message with tracking info
          let message = `Stage updated: ${oldStageInfo.label} → ${newStageInfo.label}`;

          // Add pipeline time tracking
          if (daysInPipeline > 0) {
            message += ` | Processed in ${daysInPipeline} day${
              daysInPipeline !== 1 ? "s" : ""
            }`;
          }

          // Add Zillow listing time
          if (daysOnZillow > 0) {
            message += ` | Listed ${daysOnZillow} day${
              daysOnZillow !== 1 ? "s" : ""
            } on Zillow`;
          }

          // Create system note via API
          await dashboardService.createTeamNote({
            dealId,
            author: "system",
            message,
            isPinned: false,
            isSystemNote: true,
            changeType: "stage",
          });
        } else {
          // Standard stage change note
          await dashboardService.createTeamNote({
            dealId,
            author: "system",
            message: `Stage updated: ${oldStageInfo.label} → ${newStageInfo.label}`,
            isPinned: false,
            isSystemNote: true,
            changeType: "stage",
          });
        }
      }

      toast.success(`Stage updated to: ${getStageInfo(newStage).label}`);
    } catch (error) {
      console.error("Failed to update deal stage:", error);
      toast.error("Failed to update deal stage");
    }
  };

  const handleNotesChange = (notes: DealNotes) => {
    setInputs((prev) => ({ ...prev, notes }));
  };

  const handleARVCompsChange = (comps: ZillowComp[]) => {
    setInputs((prev) => ({ ...prev, arvComps: comps }));
  };

  const handleCalculatedARVChange = (arv: number) => {
    setInputs((prev) => ({
      ...prev,
      calculatedARV: arv,
      // Auto-update the afterRepairValue in bridge loan section
      afterRepairValue: arv,
      // Update rehab property taxes and insurance based on new ARV
      rehabPropertyTaxes: Math.round(arv * 0.02),
      rehabPropertyInsurance: calculateRehabInsurance(
        arv,
        prev.yearBuilt,
        prev.totalSqft
      ),
    }));
    if (arv > 0) {
      toast.success(
        `ARV updated to ${formatCurrency(
          arv
        )} - Bridge loan values auto-updated`
      );
    }
  };

  const handleSubjectPropertyChange = (property: SubjectProperty) => {
    // Update totalBeds/totalBaths state for multi-family UI
    if (property.beds) setTotalBeds(property.beds);
    if (property.baths) setTotalBaths(property.baths);

    setInputs((prev) => {
      const updates: Partial<DealInputs> = {
        address: property.address || prev.address,
        purchasePrice: property.purchasePrice || prev.purchasePrice,
        totalSqft: property.sqft || prev.totalSqft,
        yearBuilt: property.yearBuilt || prev.yearBuilt,
        units: property.units || prev.units,
        subjectPropertyDescription:
          property.description || prev.subjectPropertyDescription,
        subjectPropertyZillowLink:
          property.zillowLink !== undefined
            ? property.zillowLink
            : prev.subjectPropertyZillowLink,
        // Store geocoded coordinates for distance calculations
        subjectLat: property.lat !== undefined ? property.lat : prev.subjectLat,
        subjectLng: property.lng !== undefined ? property.lng : prev.subjectLng,
      };

      // Update property taxes and insurance based on new values
      if (property.purchasePrice) {
        updates.propertyTaxes = Math.round(property.purchasePrice * 0.02);
      }
      if (property.purchasePrice && property.yearBuilt) {
        updates.propertyInsurance = calculateCurrentInsurance(
          property.purchasePrice,
          property.yearBuilt
        );
      }

      // Update unit details with new bed/bath counts
      if (property.beds || property.baths) {
        const totalBeds =
          property.beds ||
          prev.unitDetails.reduce((sum, unit) => sum + unit.beds, 0);
        const totalBaths =
          property.baths ||
          prev.unitDetails.reduce((sum, unit) => sum + unit.baths, 0);
        const units = property.units || prev.units;

        if (units === 1) {
          // Single unit - direct assignment
          const zipCode = extractZipCode(property.address || prev.address);
          const section8Rent = zipCode
            ? getSection8Rent(
                totalBeds,
                zipCode,
                globalAssumptions.section8ZipData
              ) || 0
            : prev.unitDetails[0]?.section8Rent || 0;

          updates.unitDetails = [
            {
              beds: totalBeds,
              baths: totalBaths,
              sqft: property.sqft || prev.totalSqft,
              section8Rent,
              strMonthlyRevenue:
                property.rentZestimate ||
                prev.unitDetails[0]?.strMonthlyRevenue ||
                2400,
            },
          ];
        } else if (units >= 2 && units <= 4) {
          // Multi-family - distribute beds/baths across units
          const distributedUnits = distributeUnitsSpecs(
            totalBeds,
            totalBaths,
            property.sqft || prev.totalSqft,
            units
          );
          const zipCode = extractZipCode(property.address || prev.address);
          updates.unitDetails = distributedUnits.map((unit) => {
            const section8Rent = zipCode
              ? getSection8Rent(
                  unit.beds,
                  zipCode,
                  globalAssumptions.section8ZipData
                ) || 0
              : 0;

            return {
              beds: unit.beds,
              baths: unit.baths,
              sqft: unit.sqft,
              section8Rent,
              strMonthlyRevenue: property.rentZestimate
                ? Math.round(property.rentZestimate / units)
                : 2400,
            };
          });
          setUnitsAutoPopulated(true);
        }
      }

      return { ...prev, ...updates };
    });
  };

  const totalSection8Rent = inputs.unitDetails.reduce(
    (sum, unit) => sum + (unit.section8Rent || 0),
    0
  );
  const totalMarketRent = inputs.unitDetails.reduce(
    (sum, unit) => sum + (unit.marketRent ?? (unit.section8Rent || 0) / 1.1),
    0
  );

  // Handler for totalBeds/totalBaths changes (triggers auto-population with individual distribution)
  const handleTotalBedsChange = (value: number) => {
    setTotalBeds(value);
    if (
      inputs.units >= 2 &&
      inputs.units <= 4 &&
      value > 0 &&
      totalBaths > 0 &&
      inputs.totalSqft > 0
    ) {
      const distributedUnits = distributeUnitsSpecs(
        value,
        totalBaths,
        inputs.totalSqft,
        inputs.units
      );
      const zipCode = extractZipCode(inputs.address);
      const newUnitDetails = distributedUnits.map((unit, i) => {
        // Calculate Section 8 rent based on NEW bedroom count
        const section8Rent = zipCode
          ? getSection8Rent(
              unit.beds,
              zipCode,
              globalAssumptions.section8ZipData
            ) || 0
          : inputs.unitDetails[i]?.section8Rent || 0;

        return {
          beds: unit.beds,
          baths: unit.baths,
          sqft: unit.sqft,
          section8Rent,
          marketRent: inputs.unitDetails[i]?.marketRent,
          afterRehabMarketRent: inputs.unitDetails[i]?.afterRehabMarketRent,
        };
      });
      setInputs((prev) => ({ ...prev, unitDetails: newUnitDetails }));
      setUnitsAutoPopulated(true);
    }
  };

  const handleTotalBathsChange = (value: number) => {
    setTotalBaths(value);
    if (
      inputs.units >= 2 &&
      inputs.units <= 4 &&
      totalBeds > 0 &&
      value > 0 &&
      inputs.totalSqft > 0
    ) {
      const distributedUnits = distributeUnitsSpecs(
        totalBeds,
        value,
        inputs.totalSqft,
        inputs.units
      );
      const zipCode = extractZipCode(inputs.address);
      const newUnitDetails = distributedUnits.map((unit, i) => {
        // Calculate Section 8 rent based on NEW bedroom count
        const section8Rent = zipCode
          ? getSection8Rent(
              unit.beds,
              zipCode,
              globalAssumptions.section8ZipData
            ) || 0
          : inputs.unitDetails[i]?.section8Rent || 0;

        return {
          beds: unit.beds,
          baths: unit.baths,
          sqft: unit.sqft,
          section8Rent,
          marketRent: inputs.unitDetails[i]?.marketRent,
          afterRehabMarketRent: inputs.unitDetails[i]?.afterRehabMarketRent,
        };
      });
      setInputs((prev) => ({ ...prev, unitDetails: newUnitDetails }));
      setUnitsAutoPopulated(true);
    }
  };

  // Helper to get default inputs (same as handleNewDeal)
  const getDefaultInputs = (): DealInputs => {
    const defaultPurchasePrice = 350000;
    return {
      address: "",
      units: 1,
      unitDetails: [
        { beds: 3, baths: 2, section8Rent: 1650, strMonthlyRevenue: 2400 },
      ],
      totalSqft: 1500,
      yearBuilt: 1990,
      purchasePrice: defaultPurchasePrice,
      strADR: 125,
      propertyTaxes: Math.round(defaultPurchasePrice * 0.02),
      propertyInsurance: calculateCurrentInsurance(defaultPurchasePrice, 1990),
      loanInterestRate: 7.25,
      loanTerm: 30,
      downPayment: 25,
      acquisitionCosts: 5,
      acquisitionCostsAmount: undefined,
      setupFurnishCost: 0, // Cosmetic renovation/furnishing - optional for all strategies
      isRehab: false,
      rehabUnitType: "single",
      rehabCondition: "medium",
      rehabCost: 0,
      rehabMonths: 6,
      rehabFinancingRate: 11.0,
      rehabEntryPoints: 4.0,
      rehabExitPoints: 3.0,
      bridgeLTC: 90,
      bridgeRehabBudgetPercent: 100,
      bridgeMaxARLTV: 70,
      exitStrategy: "refi",
      exitRefiLTV: 75,
      exitRefiRate: 7.25,
      afterRepairValue: 0,
      rehabPropertyTaxes: 0,
      rehabPropertyInsurance: 0,
      sellClosingCosts: 8,
      bridgeSettlementCharges: undefined,
      dscrAcquisitionCosts: undefined,
      notes: getDefaultNotes(),
    };
  };

  const handleZillowQuickStart = () => {
    if (!zillowQuickStartData.trim()) {
      toast.error("Please paste Zillow listing data");
      return;
    }

    const parsed = parseZillowForSale(zillowQuickStartData);
    if (!parsed || !parsed.address) {
      toast.error(
        "Could not parse Zillow data. Make sure you copied from a For Sale listing."
      );
      return;
    }

    // Create new deal with parsed data
    const zipCode = extractZipCode(parsed.address || "");
    const totalBeds = parsed.beds || 3;
    const totalBaths = parsed.baths || 2;
    const units = parsed.units || 1;
    const sqft = parsed.sqft || 1500;

    // Set totalBeds/totalBaths state for multi-family
    if (units >= 2 && units <= 4) {
      setTotalBeds(totalBeds);
      setTotalBaths(totalBaths);
    }

    // Distribute beds/baths across units
    let unitDetails: any[] = [];
    if (units === 1) {
      const section8Rent = zipCode
        ? getSection8Rent(
            totalBeds,
            zipCode,
            globalAssumptions.section8ZipData
          ) || 0
        : 0;
      unitDetails = [
        {
          beds: totalBeds,
          baths: totalBaths,
          sqft: sqft,
          section8Rent,
          strMonthlyRevenue: parsed.rentZestimate || 2400,
        },
      ];
    } else if (units >= 2 && units <= 4) {
      const distributedUnits = distributeUnitsSpecs(
        totalBeds,
        totalBaths,
        sqft,
        units
      );
      unitDetails = distributedUnits.map((unit) => {
        const section8Rent = zipCode
          ? getSection8Rent(
              unit.beds,
              zipCode,
              globalAssumptions.section8ZipData
            ) || 0
          : 0;
        return {
          beds: unit.beds,
          baths: unit.baths,
          sqft: unit.sqft,
          section8Rent,
          strMonthlyRevenue: parsed.rentZestimate
            ? Math.round(parsed.rentZestimate / units)
            : 2400,
        };
      });
      setUnitsAutoPopulated(true);
    }

    // Calculate taxes and insurance
    const propertyTaxes = Math.round((parsed.purchasePrice || 250000) * 0.02);
    const propertyInsurance = calculateCurrentInsurance(
      parsed.purchasePrice || 250000,
      parsed.yearBuilt || 1980,
      sqft
    );

    // Create new inputs
    const newInputs: DealInputs = {
      ...getDefaultInputs(),
      address: parsed.address || "",
      purchasePrice: parsed.purchasePrice || 250000,
      isOffMarket: parsed.isOffMarket || false, // Flag for off-market properties
      totalSqft: sqft,
      yearBuilt: parsed.yearBuilt || 1980,
      units: units,
      propertyTaxes: propertyTaxes,
      propertyInsurance: propertyInsurance,
      unitDetails: unitDetails,
      notes: getDefaultNotes(),
      subjectPropertyDescription: parsed.description || "", // Store description from Zillow parser
    };

    setInputs(newInputs);
    setCurrentDealId(null);
    setShowZillowQuickStart(false);
    setZillowQuickStartData("");

    // Auto-expand subject property description if available
    if (parsed.description && parsed.description.trim().length > 0) {
      setArvExpandedDescriptions({ subject: true });
    }

    // Build toast description
    const descParts = [
      parsed.isOffMarket ? "🔶 OFF MARKET" : null,
      `${totalBeds}bd/${totalBaths}ba`,
      `${sqft.toLocaleString()} sqft`,
      `${units} unit${units > 1 ? "s" : ""}`,
      parsed.purchasePrice
        ? `${formatCurrency(parsed.purchasePrice)} ${
            parsed.isOffMarket ? "Zestimate" : "asking"
          }`
        : null,
      !parsed.isOffMarket && parsed.zestimate
        ? `${formatCurrency(parsed.zestimate)} Zestimate`
        : null,
      parsed.rentZestimate
        ? `${formatCurrency(parsed.rentZestimate)}/mo rent est.`
        : null,
    ]
      .filter(Boolean)
      .join(" • ");

    toast.success(`🚀 New deal started: ${parsed.address}`, {
      description: descParts,
    });
  };

  // Updated save deal function with VPS file upload
  const handleSaveDeal = async () => {
    if (!inputs.address.trim()) {
      toast.error("Please enter an address before saving");
      return;
    }

    try {
      setSavingDeal(true);

      // Convert and upload photos to VPS
      let photosToSave = inputs.photos || [];

      if (photosToSave.length > 0) {
        const uploadResults = await Promise.all(
          photosToSave.map(async (photo) => {
            try {
              let file: File | null = null;

              // Convert base64 or blob URL to File object
              if (
                photo.url.startsWith("data:") ||
                photo.url.startsWith("blob:")
              ) {
                const response = await fetch(photo.url);
                const blob = await response.blob();
                file = new File([blob], `photo-${Date.now()}.jpg`, {
                  type: "image/jpeg",
                });
              }

              if (file) {
                // Upload to VPS using the service
                const result = await dashboardService.uploadFile(file);
                return {
                  ...photo,
                  url: result.fileUrl, // VPS file URL
                  fileName: result.fileName, // Store file name for future reference
                  originalName: result.originalName,
                  fileSize: result.fileSize,
                  mimeType: result.mimeType,
                };
              }

              // If it's already a VPS URL or external URL, keep it as is
              return photo;
            } catch (error) {
              console.error("Failed to upload photo to VPS:", error);
              // Fallback: keep the original URL but mark as not uploaded
              return {
                ...photo,
                uploadFailed: true,
              };
            }
          })
        );

        photosToSave = uploadResults;
      }

      const dealToSave: DealInputs = {
        ...inputs,
        photos: photosToSave,
      };

      // Rest of your save logic...
      let result: { data: SavedDeal; message?: string };
      if (currentDealId) {
        result = await dashboardService.updateDeal(currentDealId, dealToSave);
        setSavedDeals((prev) =>
          prev.map((d) =>
            d.id === currentDealId ? { ...result.data, id: currentDealId } : d
          )
        );
      } else {
        result = await dashboardService.createDeal(dealToSave);
        const newDeal = { ...result.data, id: result.data.id };
        setSavedDeals((prev) => [...prev, newDeal]);
        setCurrentDealId(newDeal.id);
      }

      // Show upload summary
      const successfulUploads = photosToSave.filter(
        (p: any) => !p.uploadFailed
      ).length;
      const failedUploads = photosToSave.filter(
        (p: any) => !!p.uploadFailed
      ).length;

      let description = "";
      if (successfulUploads > 0) {
        description += `${successfulUploads} photos uploaded to server`;
      }
      if (failedUploads > 0) {
        description += `${
          description ? ", " : ""
        }${failedUploads} photos failed to upload`;
      }

      toast.success(result.message, {
        description: description || undefined,
      });

      await loadDealsFromAPI();
    } catch (error) {
      console.error("Failed to save deal:", error);
      toast.error("Failed to save deal");
    } finally {
      setSavingDeal(false);
    }
  };

  // Updated load deal function
  const handleLoadDeal = async (deal: SavedDeal) => {
    try {
      const response = await dashboardService.getDeal(deal.id);

      // Handle backward compatibility with old saved deals
      const loadedDeal = { ...response.data };

      // If old format with propertyTaxesInsurance, split it
      if (
        "propertyTaxesInsurance" in loadedDeal &&
        typeof (loadedDeal as any).propertyTaxesInsurance === "number"
      ) {
        const oldValue = (loadedDeal as any).propertyTaxesInsurance;
        loadedDeal.propertyTaxes = Math.round(oldValue * 0.75);
        loadedDeal.propertyInsurance = Math.round(oldValue * 0.25);
        delete (loadedDeal as any).propertyTaxesInsurance;
      }

      // Migrate marketRent to section8Rent in unitDetails
      if (loadedDeal.unitDetails && Array.isArray(loadedDeal.unitDetails)) {
        loadedDeal.unitDetails = loadedDeal.unitDetails.map((unit: any) => {
          if ("marketRent" in unit && !("section8Rent" in unit)) {
            const multiplier = (loadedDeal as any).section8Multiplier ?? 1.1;
            return {
              beds: unit.beds,
              baths: unit.baths,
              section8Rent: Math.round(unit.marketRent * multiplier),
            };
          }
          return unit;
        });
      }

      // Ensure notes exist with new structure (backward compatibility)
      if (!loadedDeal.notes) {
        loadedDeal.notes = getDefaultNotes();
      } else {
        // Migrate old notes structure to new structure
        const oldNotes = loadedDeal.notes as any;
        if (
          oldNotes.realtor ||
          oldNotes.propertyCondition ||
          oldNotes.occupancy ||
          oldNotes.market ||
          oldNotes.motivation ||
          oldNotes.followUp
        ) {
          // Old structure detected - migrate to new structure
          loadedDeal.notes = {
            ...getDefaultNotes(),
            realtorName: oldNotes.realtor?.name || "",
            realtorPhone: oldNotes.realtor?.phone || "",
            realtorEmail: "",
            realtorNotes: oldNotes.realtor?.responseSummary || "",
            sellerMotivation: oldNotes.motivation?.reasonSelling || "",
            overallCondition:
              oldNotes.propertyCondition?.overallCondition || "",
            estimatedRehabCost:
              oldNotes.propertyCondition?.estimatedRehabCost || "",
            generalNotes: oldNotes.followUp?.notes || "",
            lastUpdated: oldNotes.lastUpdated || "",
          };
        } else if (!oldNotes.roof || !oldNotes.foundation) {
          // Notes exist but might be incomplete - merge with defaults
          loadedDeal.notes = {
            ...getDefaultNotes(),
            ...loadedDeal.notes,
          };
        }
      }

      // Add default ARV fields if missing
      if (!loadedDeal.arvComps) {
        loadedDeal.arvComps = [];
      }
      if (!loadedDeal.calculatedARV) {
        loadedDeal.calculatedARV = 0;
      }

      setInputs(loadedDeal);
      setCurrentDealId(deal.id);
      setHasManuallySelectedTab(false);
      toast.success("Deal loaded successfully");
      // await loadDealsFromAPI();
    } catch (error) {
      console.error("Failed to load deal:", error);
      toast.error("Failed to load deal");
    }
  };

  // Enhanced export deals function with CSV generation
  const handleExportDeals = async (format: "json" | "csv" = "csv") => {
    if (savedDeals.length === 0) {
      toast.error("No deals to export");
      return;
    }

    try {
      if (format === "json") {
        // Use existing JSON export service and handle download client-side
        await exportDealsAsJSON();
      } else {
        // Generate CSV client-side
        await exportDealsAsCSV(savedDeals);
      }

      // Show success message
      const totalSubjectPhotos = savedDeals.reduce(
        (sum, deal) => sum + (deal.photos?.length || 0),
        0
      );
      const totalCompPhotos = savedDeals.reduce(
        (sum, deal) =>
          sum +
          (deal.arvComps?.reduce(
            (compSum, comp) => compSum + (comp.photos?.length || 0),
            0
          ) || 0),
        0
      );
      const totalPhotos = totalSubjectPhotos + totalCompPhotos;

      toast.success(
        `Exported ${
          savedDeals.length
        } deals as ${format.toUpperCase()} with ${totalPhotos} photos!`,
        {
          description: `${totalSubjectPhotos} subject photos + ${totalCompPhotos} comp photos`,
        }
      );
    } catch (error) {
      console.error("Failed to export deals:", error);
      toast.error(`Failed to export deals as ${format.toUpperCase()}`);
    }
  };

  // Client-side JSON export function
  const exportDealsAsJSON = async () => {
    try {
      // Get the deals data from the backend
      const response = await dashboardService.exportDeals();

      // Create and download JSON file client-side
      const jsonContent = JSON.stringify(response.data, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `deals-export-${new Date().toISOString().split("T")[0]}.json`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export JSON:", error);
      throw new Error("Failed to export JSON file");
    }
  };

  // Client-side CSV export function
  const exportDealsAsCSV = async (deals: SavedDeal[]) => {
    try {
      const csvContent = convertDealsToCSV(deals);

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `deals-export-${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate CSV:", error);
      throw new Error("Failed to generate CSV file");
    }
  };

  // Convert deals to CSV format
  const convertDealsToCSV = (deals: SavedDeal[]): string => {
    const headers = [
      "address",
      "units",
      "total_sqft",
      "year_built",
      "purchase_price",
      "property_taxes",
      "property_insurance",
      "loan_interest_rate",
      "loan_term",
      "down_payment",
      "acquisition_costs",
      "acquisition_costs_amount",
      "setup_furnish_cost",
      "total_beds",
      "total_baths",
      "total_market_rent",
      "total_section8_rent",
      "is_rehab",
      "rehab_cost",
      "rehab_condition",
      "rehab_months",
      "after_repair_value",
      "exit_strategy",
      "sell_closing_costs",
      "has_hurricane_windows",
      "has_new_roof",
      "subject_lat", // NEW
      "subject_lng", // NEW
      "notes",
    ];

    const csvRows = [headers.join(",")];

    deals.forEach((deal) => {
      const totalBeds = deal.unitDetails.reduce(
        (sum, unit) => sum + unit.beds,
        0
      );
      const totalBaths = deal.unitDetails.reduce(
        (sum, unit) => sum + unit.baths,
        0
      );
      const totalMarketRent = deal.unitDetails.reduce(
        (sum, unit) => sum + (unit.marketRent || 0),
        0
      );
      const totalSection8Rent = deal.unitDetails.reduce(
        (sum, unit) => sum + (unit.section8Rent || 0),
        0
      );

      const row = [
        `"${deal.address.replace(/"/g, '""')}"`,
        deal.units,
        deal.totalSqft,
        deal.yearBuilt,
        deal.purchasePrice,
        deal.propertyTaxes,
        deal.propertyInsurance,
        deal.loanInterestRate,
        deal.loanTerm,
        deal.downPayment,
        deal.acquisitionCosts,
        deal.acquisitionCostsAmount || "",
        deal.setupFurnishCost || 0,
        totalBeds,
        totalBaths,
        totalMarketRent,
        totalSection8Rent,
        deal.isRehab ? "true" : "false",
        deal.rehabCost || 0,
        deal.rehabCondition || "",
        deal.rehabMonths || 6,
        deal.afterRepairValue || 0,
        deal.exitStrategy || "refi",
        deal.sellClosingCosts || 8,
        deal.hasHurricaneWindows ? "true" : "false",
        deal.hasNewRoof ? "true" : "false",
        deal.subjectLat || "", // NEW
        deal.subjectLng || "", // NEW
        `"${(deal.notes?.generalNotes || "").replace(/"/g, '""')}"`,
      ];

      csvRows.push(row.join(","));
    });

    return csvRows.join("\n");
  };

  // Enhanced import deals function
  const handleImportDeals = (format: "json" | "csv" = "csv") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = format === "csv" ? ".csv" : "application/json";
    input.multiple = false;

    input.onchange = async (e: Event) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      try {
        const file = files[0];
        const text = await file.text();

        if (format === "csv") {
          await handleCSVImport(text);
        } else {
          await handleJSONImport(text);
        }
      } catch (error) {
        console.error("Import error:", error);
        toast.error(`Failed to import deals from ${format.toUpperCase()}`);
      }
    };
    input.click();
  };

  // Handle JSON import using existing service
  const handleJSONImport = async (jsonText: string) => {
    const importedData = JSON.parse(jsonText);

    let dealsToImport: DealInputs[] = [];

    // Handle different JSON formats
    if (Array.isArray(importedData)) {
      dealsToImport = importedData;
    } else if (importedData.data && Array.isArray(importedData.data)) {
      dealsToImport = importedData.data;
    } else if (importedData.deals && Array.isArray(importedData.deals)) {
      dealsToImport = importedData.deals;
    } else {
      toast.error("Invalid format: Expected an array of deals");
      return;
    }

    // Clean the deals data for import
    const cleanedDeals = dealsToImport.map((deal) => ({
      ...deal,
      id: undefined, // Let backend generate new ID
      _id: undefined, // Remove MongoDB _id if present
      createdAt: undefined,
      updatedAt: undefined,
      savedAt: undefined,
      // Remove calculated fields that should be regenerated
      calculatedSummary: undefined,
      performanceIndicators: undefined,
      // Ensure unitDetails is properly structured
      unitDetails:
        deal.unitDetails?.map((unit) => ({
          beds: unit.beds || 0,
          baths: unit.baths || 1,
          sqft: unit.sqft,
          section8Rent: unit.section8Rent,
          marketRent: unit.marketRent,
          afterRehabMarketRent: unit.afterRehabMarketRent,
          strAnnualRevenue: unit.strAnnualRevenue,
          strAnnualExpenses: unit.strAnnualExpenses,
          _id: undefined, // Remove MongoDB _id
        })) || [],
    }));

    try {
      // Use the existing bulkCreateDeals service
      const response = await dashboardService.bulkCreateDeals(cleanedDeals);

      // Reload deals from API to reflect changes
      await loadDealsFromAPI();

      toast.success(
        `Imported ${cleanedDeals.length} deals successfully from JSON!`
      );
    } catch (error) {
      console.error("Bulk import error:", error);
      throw error;
    }
  };

  // Handle CSV import using existing service
  const handleCSVImport = async (csvText: string) => {
    try {
      // Parse CSV and convert to deal format
      const dealsToImport = parseDealsCSV(csvText);

      if (dealsToImport.length === 0) {
        toast.error("No valid deals found in CSV file");
        return;
      }

      // Use existing bulkCreateDeals service
      await dashboardService.bulkCreateDeals(dealsToImport);

      // Reload deals from API to reflect changes
      await loadDealsFromAPI();

      toast.success(
        `Imported ${dealsToImport.length} deals successfully from CSV!`
      );
    } catch (error) {
      console.error("CSV import error:", error);
      throw error;
    }
  };

  // Parse CSV into DealInputs format (same as before but optimized)
  const parseDealsCSV = (csvText: string): DealInputs[] => {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("CSV file is empty or has no data rows");
    }

    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().toLowerCase().replace(/"/g, ""));
    const deals: DealInputs[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      try {
        const values = parseCSVLine(line);
        const deal = createDealFromCSVRow(headers, values, i);

        if (deal.address && deal.units > 0) {
          deals.push(deal);
        }
      } catch (error) {
        console.warn(`Skipping row ${i + 1} due to error:`, error);
      }
    }

    return deals;
  };

  // Helper function to parse CSV line with quoted values
  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current.trim().replace(/^"|"$/g, ""));
    return values;
  };

  // Create DealInputs from CSV row
  const createDealFromCSVRow = (
    headers: string[],
    values: string[],
    rowIndex: number
  ): DealInputs => {
    const deal: DealInputs = {
      address: "",
      units: 1,
      unitDetails: [],
      totalSqft: 0,
      yearBuilt: new Date().getFullYear(),
      purchasePrice: 0,
      strADR: 125,
      propertyTaxes: 0,
      propertyInsurance: 0,
      loanInterestRate: 7.25,
      loanTerm: 30,
      downPayment: 20,
      acquisitionCosts: 5,
      acquisitionCostsAmount: undefined,
      setupFurnishCost: 0,
      isRehab: false,
      rehabUnitType: "single",
      rehabCondition: "light",
      rehabCost: 0,
      rehabMonths: 6,
      rehabFinancingRate: 11,
      rehabEntryPoints: 6,
      rehabExitPoints: 5,
      bridgeLTC: 90,
      bridgeRehabBudgetPercent: 100,
      bridgeMaxARLTV: 70,
      bridgeSettlementCharges: undefined,
      exitStrategy: "refi",
      exitRefiLTV: 75,
      exitRefiRate: 7.25,
      afterRepairValue: 0,
      rehabPropertyTaxes: 0,
      rehabPropertyInsurance: 0,
      sellClosingCosts: 8,
      dscrAcquisitionCosts: undefined,
      isOffMarket: false,
      hasHurricaneWindows: false,
      hasNewRoof: false,
      notes: {
        realtorName: "",
        realtorPhone: "",
        realtorEmail: "",
        realtorNotes: "",
        sellerMotivation: "",
        overallCondition: "",
        estimatedRehabCost: "",
        roof: { condition: "", age: "", leaks: false, notes: "" },
        foundation: { condition: "", notes: "" },
        hvac: {
          condition: "",
          age: "",
          systemType: "",
          numberOfUnits: "",
          notes: "",
        },
        plumbing: {
          condition: "",
          pipeMaterial: "",
          pipeAge: "",
          waterHeater: "",
          leaks: false,
          notes: "",
        },
        electrical: {
          condition: "",
          panelSize: "",
          panelAmperage: "",
          wiringType: "",
          notes: "",
        },
        exterior: {
          siding: "",
          sidingType: "",
          windows: "",
          doors: "",
          gutters: "",
          landscaping: "",
          fencing: "",
          driveway: "",
          notes: "",
        },
        kitchen: {
          condition: "",
          cabinets: "",
          countertops: "",
          appliances: "",
          flooring: "",
          notes: "",
        },
        bathrooms: [],
        bedrooms: [],
        interior: {
          flooring: "",
          walls: "",
          ceilings: "",
          lighting: "",
          openFloorPlan: false,
          notes: "",
        },
        pool: { hasPool: false, condition: "", equipment: "", notes: "" },
        additionalIssues: {
          mold: false,
          moldDetails: "",
          termites: false,
          termitesDetails: "",
          waterDamage: false,
          waterDamageDetails: "",
          fireDamage: false,
          fireDamageDetails: "",
          structuralIssues: false,
          structuralIssuesDetails: "",
          codeViolations: false,
          codeViolationsDetails: "",
          other: "",
        },
        generalNotes: "",
        lastUpdated: new Date().toISOString(),
      },
      photos: [],
      arvComps: [],
    };

    // Map CSV columns to deal properties
    headers.forEach((header, index) => {
      const value = values[index];
      if (!value || value === "") return;

      try {
        const numValue = parseFloat(value);
        const intValue = parseInt(value);
        const boolValue = value.toLowerCase() === "true" || value === "1";

        switch (header) {
          // Basic info
          case "address":
            deal.address = value;
            break;
          case "units":
            deal.units = intValue || 1;
            break;
          case "totalsqft":
          case "total_sqft":
            deal.totalSqft = intValue || 0;
            break;
          case "yearbuilt":
          case "year_built":
            deal.yearBuilt = intValue || new Date().getFullYear();
            break;

          // Financials
          case "purchaseprice":
          case "purchase_price":
            deal.purchasePrice = numValue || 0;
            break;
          case "propertytaxes":
          case "property_taxes":
            deal.propertyTaxes = numValue || 0;
            break;
          case "propertyinsurance":
          case "property_insurance":
            deal.propertyInsurance = numValue || 0;
            break;
          case "loaninterestrate":
          case "loan_interest_rate":
            deal.loanInterestRate = numValue || 7.25;
            break;
          case "loanterm":
          case "loan_term":
            deal.loanTerm = intValue || 30;
            break;
          case "downpayment":
          case "down_payment":
            deal.downPayment = numValue || 20;
            break;
          case "acquisitioncosts":
          case "acquisition_costs":
            deal.acquisitionCosts = numValue || 5;
            break;
          case "acquisition_costs_amount":
            deal.acquisitionCostsAmount = numValue;
            break;
          case "setup_furnish_cost":
            deal.setupFurnishCost = numValue || 0;
            break;

          // Unit details (aggregated - creates single unit entry)
          case "total_beds":
          case "beds":
            if (deal.unitDetails.length === 0) {
              deal.unitDetails.push(createUnitDetail(intValue || 0, 1, 0, 0));
            } else {
              deal.unitDetails[0].beds = intValue || 0;
            }
            break;
          case "total_baths":
          case "baths":
            if (deal.unitDetails.length === 0) {
              deal.unitDetails.push(createUnitDetail(0, intValue || 1, 0, 0));
            } else {
              deal.unitDetails[0].baths = intValue || 1;
            }
            break;
          case "total_market_rent":
          case "market_rent":
            if (deal.unitDetails.length === 0) {
              deal.unitDetails.push(createUnitDetail(0, 1, numValue || 0, 0));
            } else {
              deal.unitDetails[0].marketRent = numValue || 0;
            }
            break;
          case "total_section8_rent":
          case "section8_rent":
            if (deal.unitDetails.length === 0) {
              deal.unitDetails.push(createUnitDetail(0, 1, 0, numValue || 0));
            } else {
              deal.unitDetails[0].section8Rent = numValue || 0;
            }
            break;

          // Rehab fields
          case "is_rehab":
          case "isrehab":
            deal.isRehab = boolValue;
            break;
          case "rehab_cost":
            deal.rehabCost = numValue || 0;
            break;
          case "rehab_condition":
            if (
              ["light", "lite+", "medium", "heavy", "fullgut"].includes(
                value.toLowerCase()
              )
            ) {
              deal.rehabCondition = value.toLowerCase() as any;
            }
            break;
          case "after_repair_value":
          case "arv":
            deal.afterRepairValue = numValue || 0;
            break;

          // Exit strategy
          case "exit_strategy":
            if (
              value.toLowerCase() === "sell" ||
              value.toLowerCase() === "refi"
            ) {
              deal.exitStrategy = value.toLowerCase() as "sell" | "refi";
            }
            break;
          case "sell_closing_costs":
            deal.sellClosingCosts = numValue || 8;
            break;

          // Features
          case "has_hurricane_windows":
            deal.hasHurricaneWindows = boolValue;
            break;
          case "has_new_roof":
            deal.hasNewRoof = boolValue;
            break;

          // Notes
          case "notes":
          case "general_notes":
            if (deal.notes) {
              deal.notes.generalNotes = value;
            }
            break;
        }
      } catch (error) {
        console.warn(
          `Error parsing column "${header}" at row ${rowIndex + 1}:`,
          error
        );
      }
    });

    return deal;
  };

  // Helper function to create unit detail
  const createUnitDetail = (
    beds: number,
    baths: number,
    marketRent: number,
    section8Rent: number
  ) => ({
    beds,
    baths,
    marketRent,
    section8Rent,
  });

  const hasNotesData = (): boolean => {
    if (!inputs.notes) return false;
    const notes = inputs.notes;

    // Check if any key fields have been filled in
    return !!(
      notes.realtorName ||
      notes.sellerMotivation ||
      notes.overallCondition ||
      notes.roof?.condition ||
      notes.foundation?.condition ||
      notes.hvac?.condition ||
      notes.kitchen?.condition ||
      notes.bathrooms?.length > 0 ||
      notes.bedrooms?.length > 0 ||
      notes.generalNotes
    );
  };

  const handleNewDeal = () => {
    const defaultPurchasePrice = 350000;
    setInputs({
      address: "",
      units: 1,
      unitDetails: [
        { beds: 3, baths: 2, section8Rent: 1650, strMonthlyRevenue: 2400 },
      ],
      totalSqft: 1500,
      yearBuilt: 1990,
      purchasePrice: defaultPurchasePrice,
      strADR: 125, // Deprecated but kept for backward compatibility
      propertyTaxes: Math.round(defaultPurchasePrice * 0.02), // 2.0% for Broward County investment properties (non-homestead)
      propertyInsurance: calculateCurrentInsurance(defaultPurchasePrice, 1990), // Age-based insurance
      loanInterestRate: 7.25,
      loanTerm: 30,
      downPayment: 25,
      acquisitionCosts: 5,
      acquisitionCostsAmount: undefined,
      setupFurnishCost: 5000,
      isRehab: false,
      rehabUnitType: "single",
      rehabCondition: "medium",
      rehabCost: 0,
      rehabMonths: 6,
      rehabFinancingRate: 11.0,
      rehabEntryPoints: 4.0,
      rehabExitPoints: 3.0,
      bridgeLTC: 90,
      bridgeRehabBudgetPercent: 100,
      bridgeMaxARLTV: 70,
      exitStrategy: "refi",
      exitRefiLTV: 75,
      exitRefiRate: 7.25,
      afterRepairValue: 0,
      rehabPropertyTaxes: 0,
      rehabPropertyInsurance: 0,
      sellClosingCosts: 8,
      bridgeSettlementCharges: undefined,
      dscrAcquisitionCosts: undefined,
      notes: getDefaultNotes(),
    });
    setCurrentDealId(null);
    setHasManuallySelectedTab(false); // Reset manual selection for new deal
    toast.success("New deal started");
  };

  // Updated delete deal function with API integration
  const handleDeleteDeal = async (id: string) => {
    try {
      setDeletingDealId(id);

      await dashboardService.deleteDeal(id);

      // Remove from local state after successful API call
      setSavedDeals((prev) => prev.filter((d) => d.id !== id));
      if (currentDealId === id) {
        setCurrentDealId(null);
      }

      toast.success("Deal deleted successfully");
      await loadDealsFromAPI();
    } catch (error) {
      console.error("Failed to delete deal:", error);
      toast.error("Failed to delete deal");
    } finally {
      setDeletingDealId(null);
    }
  };

  // v253_change: Memoized heavy calculations to prevent re-computing on every render
  // These calculations run 30-year projections and are expensive
  const ltrResultsRealistic = useMemo(
    () => calculateLTR(inputs, globalAssumptions, false),
    [inputs, globalAssumptions]
  );
  const ltrResultsLender = useMemo(
    () => calculateLTR(inputs, globalAssumptions, true),
    [inputs, globalAssumptions]
  );
  const ltrResults =
    projectionMode === "lender" ? ltrResultsLender : ltrResultsRealistic;

  const section8ResultsRealistic = useMemo(
    () => calculateSection8(inputs, globalAssumptions, false),
    [inputs, globalAssumptions]
  );
  const section8ResultsLender = useMemo(
    () => calculateSection8(inputs, globalAssumptions, true),
    [inputs, globalAssumptions]
  );
  const section8Results =
    projectionMode === "lender"
      ? section8ResultsLender
      : section8ResultsRealistic;

  const airbnbResultsRealistic = useMemo(
    () => calculateAirbnb(inputs, globalAssumptions, false),
    [inputs, globalAssumptions]
  );
  const airbnbResultsLender = useMemo(
    () => calculateAirbnb(inputs, globalAssumptions, true),
    [inputs, globalAssumptions]
  );
  const airbnbResults =
    projectionMode === "lender" ? airbnbResultsLender : airbnbResultsRealistic;

  const rehabResultsRealistic = useMemo(
    () =>
      inputs.isRehab && inputs.rehabCost > 0
        ? calculateRehab(inputs, globalAssumptions, false)
        : null,
    [inputs, globalAssumptions]
  );
  const rehabResultsLender = useMemo(
    () =>
      inputs.isRehab && inputs.rehabCost > 0
        ? calculateRehab(inputs, globalAssumptions, true)
        : null,
    [inputs, globalAssumptions]
  );
  const rehabResults =
    inputs.isRehab && inputs.rehabCost > 0
      ? projectionMode === "lender"
        ? rehabResultsLender
        : rehabResultsRealistic
      : null;

  const getBestStrategy = () => {
    // Use Cash-on-Cash % for comparison (factors in initial capital investment)
    const cashOnCash = {
      ltr: ltrResults.year1Summary.cashOnCash || 0,
      section8: section8Results.year1Summary.cashOnCash || 0,
      airbnb: airbnbResults.year1Summary.cashOnCash || 0,
      rehab: rehabResults?.year1Summary.cashOnCash || 0,
    };

    const maxCashOnCash = Math.max(
      cashOnCash.ltr,
      cashOnCash.section8,
      cashOnCash.airbnb,
      cashOnCash.rehab
    );

    if (cashOnCash.rehab === maxCashOnCash && rehabResults) return "rehab";
    if (cashOnCash.airbnb === maxCashOnCash) return "airbnb";
    if (cashOnCash.section8 === maxCashOnCash) return "section8";
    return "ltr";
  };

  const bestStrategy = getBestStrategy();

  // v253_change: Memoize rehab scenarios calculation (used in comparison table)
  const rehabScenarios = useMemo(
    () =>
      inputs.isRehab && inputs.rehabCost > 0
        ? calculateRehabScenarios(inputs)
        : null,
    [inputs]
  );

  // Sort handler for saved deals table
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      // New column - default to descending for numbers, ascending for text
      setSortColumn(column);
      setSortDirection(
        column === "address" || column === "best" ? "asc" : "desc"
      );
    }
  };

  // Compute sorted deals
  const sortedDeals = useMemo(() => {
    if (!sortColumn) return savedDeals;

    return [...savedDeals].sort((a, b) => {
      const aCalcs = {
        ltr: calculateLTR(a, globalAssumptions),
        sec8: calculateSection8(a, globalAssumptions),
        str: calculateAirbnb(a, globalAssumptions),
      };
      const bCalcs = {
        ltr: calculateLTR(b, globalAssumptions),
        sec8: calculateSection8(b, globalAssumptions),
        str: calculateAirbnb(b, globalAssumptions),
      };

      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "address":
          aValue = (a.address || "").toLowerCase();
          bValue = (b.address || "").toLowerCase();
          break;
        case "maxOffer":
          aValue = a.maxOffer || 0;
          bValue = b.maxOffer || 0;
          break;
        case "price":
          aValue = a.purchasePrice || 0;
          bValue = b.purchasePrice || 0;
          break;
        case "units":
          aValue = a.units || 0;
          bValue = b.units || 0;
          break;
        case "ltrCF":
          aValue = aCalcs.ltr.year1Summary.cashFlow || 0;
          bValue = bCalcs.ltr.year1Summary.cashFlow || 0;
          break;
        case "ltrDSCR":
          aValue = aCalcs.ltr.year1Summary.dscr || 0;
          bValue = bCalcs.ltr.year1Summary.dscr || 0;
          break;
        case "s8CF":
          aValue = aCalcs.sec8.year1Summary.cashFlow || 0;
          bValue = bCalcs.sec8.year1Summary.cashFlow || 0;
          break;
        case "s8DSCR":
          aValue = aCalcs.sec8.year1Summary.dscr || 0;
          bValue = bCalcs.sec8.year1Summary.dscr || 0;
          break;
        case "strCF":
          aValue = aCalcs.str.year1Summary.cashFlow || 0;
          bValue = bCalcs.str.year1Summary.cashFlow || 0;
          break;
        case "strDSCR":
          aValue = aCalcs.str.year1Summary.dscr || 0;
          bValue = bCalcs.str.year1Summary.dscr || 0;
          break;
        case "best":
          const aYear5ROI = {
            ltr: aCalcs.ltr.projections[4]?.cumulativeReturn || 0,
            section8: aCalcs.sec8.projections[4]?.cumulativeReturn || 0,
            airbnb: aCalcs.str.projections[4]?.cumulativeReturn || 0,
          };
          const bYear5ROI = {
            ltr: bCalcs.ltr.projections[4]?.cumulativeReturn || 0,
            section8: bCalcs.sec8.projections[4]?.cumulativeReturn || 0,
            airbnb: bCalcs.str.projections[4]?.cumulativeReturn || 0,
          };
          let aBest = "LTR";
          if (
            aYear5ROI.airbnb >= aYear5ROI.ltr &&
            aYear5ROI.airbnb >= aYear5ROI.section8
          ) {
            aBest = "Airbnb";
          } else if (aYear5ROI.section8 >= aYear5ROI.ltr) {
            aBest = "Section 8";
          }
          let bBest = "LTR";
          if (
            bYear5ROI.airbnb >= bYear5ROI.ltr &&
            bYear5ROI.airbnb >= bYear5ROI.section8
          ) {
            bBest = "Airbnb";
          } else if (bYear5ROI.section8 >= bYear5ROI.ltr) {
            bBest = "Section 8";
          }
          aValue = aBest;
          bValue = bBest;
          break;
      }

      // Compare values
      let comparison = 0;
      if (typeof aValue === "string") {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = aValue - bValue;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [savedDeals, sortColumn, sortDirection, globalAssumptions]);

  // Auto-select best strategy tab only when user hasn't manually selected a tab
  useEffect(() => {
    if (!hasManuallySelectedTab) {
      setSelectedStrategy(bestStrategy);
    }
  }, [bestStrategy, hasManuallySelectedTab]);

  // Sort icon component for table headers
  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  const renderYear1Summary = (
    results: typeof ltrResults,
    strategyName: string,
    icon: React.ReactNode,
    strategyKey: string
  ) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle>{strategyName}</CardTitle>
            {results.year1Summary.dscr < 1.0 && (
              <Badge variant="destructive" className="ml-2">
                DSCR Below 1.0
              </Badge>
            )}
          </div>
          {bestStrategy === strategyKey && (
            <Badge variant="default" className="bg-green-600">
              Best Cash-on-Cash ROI
            </Badge>
          )}
        </div>
        <CardDescription>
          Year 1 Summary
          {strategyKey === "section8" && (
            <span className="text-green-600 ml-2">
              • Using Section 8 Voucher Amounts
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-muted-foreground">Gross Income</p>
            <p>{formatCurrency(results.year1Summary.grossIncome)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Vacancy</p>
            <p>{formatCurrency(results.year1Summary.vacancy)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Expenses</p>
            <p>{formatCurrency(results.year1Summary.expenses)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">NOI</p>
            <p>{formatCurrency(results.year1Summary.noi)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Debt Service</p>
            <p>{formatCurrency(results.year1Summary.debtService)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Cash Flow</p>
            <p
              className={
                results.year1Summary.cashFlow >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }
            >
              {formatCurrency(results.year1Summary.cashFlow)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Cap Rate</p>
            <p>{formatPercent(results.year1Summary.capRate)}</p>
          </div>
          <div
            className={
              results.year1Summary.dscr < 1.0
                ? "bg-red-50 border border-red-200 rounded p-2"
                : ""
            }
          >
            <p className="text-muted-foreground">DSCR</p>
            <p
              className={
                results.year1Summary.dscr >= 1.0
                  ? "text-green-600"
                  : "text-red-600"
              }
            >
              {results.year1Summary.dscr.toFixed(2)}
            </p>
            {results.year1Summary.dscr < 1.0 && (
              <p className="text-red-600 text-xs mt-1">Below 1.0 threshold</p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground">Cash-on-Cash</p>
            <p>{formatPercent(results.year1Summary.cashOnCash)}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded p-2">
            <p className="text-muted-foreground">Closing Costs</p>
            <p className="text-orange-700">
              {formatCurrency(
                inputs.acquisitionCostsAmount ?? inputs.purchasePrice * 0.05
              )}
            </p>
            <p className="text-orange-600 text-xs mt-1">Money lost to fees</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <p className="text-muted-foreground">Total Cash in Deal</p>
            <p className="text-blue-700">
              {formatCurrency(results.cashInvested)}
            </p>
            <p className="text-blue-600 text-xs mt-1">Total capital invested</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderProjectionTable = (results: typeof ltrResults) => {
    const allProjections = results.projections.slice(0, timeHorizon);
    const displayedProjections = isTableExpanded
      ? allProjections
      : allProjections.slice(0, 5);

    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle>{timeHorizon}-Year Projection</CardTitle>
              <CardDescription>
                Detailed financial projections over {timeHorizon} years
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {/* DSCR Badge */}
              <div
                className={`px-3 py-2 rounded-lg border-2 ${
                  results.year1Summary.dscr >= 1.25
                    ? "bg-green-50 border-green-500"
                    : results.year1Summary.dscr >= 1.0
                    ? "bg-yellow-50 border-yellow-500"
                    : "bg-red-50 border-red-500"
                }`}
              >
                <div className="text-xs text-muted-foreground mb-1">DSCR</div>
                <div
                  className={`text-lg ${
                    results.year1Summary.dscr >= 1.25
                      ? "text-green-700"
                      : results.year1Summary.dscr >= 1.0
                      ? "text-yellow-700"
                      : "text-red-700"
                  }`}
                >
                  {results.year1Summary.dscr.toFixed(2)}x
                </div>
              </div>
              {/* Toggle Buttons */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                <Button
                  variant={projectionMode === "realistic" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setProjectionMode("realistic")}
                  className={
                    projectionMode === "realistic" ? "bg-blue-600" : ""
                  }
                >
                  Realistic
                </Button>
                <Button
                  variant={projectionMode === "lender" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setProjectionMode("lender")}
                  className={projectionMode === "lender" ? "bg-blue-600" : ""}
                >
                  Lender DSCR
                </Button>
              </div>
            </div>
          </div>
          {projectionMode === "lender" && (
            <div className="mt-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded p-2">
              ℹ️ Lender DSCR View: No vacancies assumed (100% occupancy) - This
              is how lenders calculate DSCR for loan qualification
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Gross Income</TableHead>
                  <TableHead className="text-right">NOI</TableHead>
                  <TableHead className="text-right">Debt Service</TableHead>
                  <TableHead className="text-right">Cash Flow</TableHead>
                  <TableHead className="text-right">Appreciation</TableHead>
                  <TableHead className="text-right">Equity</TableHead>
                  <TableHead className="text-right">Annual Return</TableHead>
                  <TableHead className="text-right">Cumulative Cash</TableHead>
                  <TableHead className="text-right">
                    Cumulative Return
                  </TableHead>
                  <TableHead className="text-right">Cumulative ROI %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedProjections.map((projection) => {
                  const cumulativeROI =
                    (projection.cumulativeReturn / results.cashInvested) * 100;
                  return (
                    <TableRow key={projection.year}>
                      <TableCell>{projection.year}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(projection.grossIncome)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(projection.noi)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(projection.debtService)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${
                          projection.cashFlow >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(projection.cashFlow)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(projection.appreciation)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(projection.equity)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(projection.annualReturn)}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {formatCurrency(projection.cumulativeCashFlow)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(projection.cumulativeReturn)}
                      </TableCell>
                      <TableCell className="text-right text-purple-600">
                        {formatPercent(cumulativeROI)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {allProjections.length > 5 && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTableExpanded(!isTableExpanded)}
              >
                {isTableExpanded
                  ? "Show Less"
                  : `View All ${timeHorizon} Years`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderCharts = (results: typeof ltrResults) => {
    // Determine initial property value for refi threshold calculations
    const initialPropertyValue =
      results === rehabResults ? inputs.afterRepairValue : inputs.purchasePrice;
    const timeHorizons: Array<5 | 7 | 10 | 15 | 30> = [5, 7, 10, 15, 30];

    return (
      <Collapsible open={showCharts} onOpenChange={setShowCharts}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h3>Performance Analysis</h3>
                <p className="text-muted-foreground">
                  View projections across different time horizons
                </p>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                  {showCharts ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Hide Charts
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show Charts
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
            {showCharts && (
              <div className="flex gap-1">
                {timeHorizons.map((horizon) => (
                  <Button
                    key={horizon}
                    variant={timeHorizon === horizon ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeHorizon(horizon)}
                  >
                    {horizon}Y
                  </Button>
                ))}
              </div>
            )}
          </div>
          <CollapsibleContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
              <CashFlowChart
                projections={results.projections}
                timeHorizon={timeHorizon}
              />
              <LoanBalanceEquityChart
                projections={results.projections}
                initialPropertyValue={initialPropertyValue}
                timeHorizon={timeHorizon}
              />
              <div className="lg:col-span-2">
                <ROIChart
                  projections={results.projections}
                  timeHorizon={timeHorizon}
                />
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-6">
          <div className="py-4 flex items-center justify-between">
            <h1>Deal Analyzer Dashboard</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleNewDeal}>
                <Plus className="mr-2 h-4 w-4" />
                New Deal
              </Button>
              <Button
                variant="default"
                onClick={handleSaveDeal}
                disabled={savingDeal}
              >
                {savingDeal ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {savingDeal
                  ? "Saving..."
                  : currentDealId
                  ? "Update Deal"
                  : "Save Deal"}
              </Button>
              <Button variant="outline" onClick={onOpenAssumptions}>
                <Settings className="mr-2 h-4 w-4" />
                Assumptions
              </Button>
            </div>
          </div>

          {/* v253_change: Top Bar Indicators - Verdict, Lender Mode, Funds Gap */}
          {inputs.address && (
            <div className="border-t border-border py-3 flex items-center justify-between gap-4">
              {/* Left: Deal Address */}
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate text-sm">{inputs.address}</span>
              </div>

              {/* Center: Indicators */}
              <div className="flex items-center gap-3 flex-wrap justify-center">
                {/* Best Strategy Verdict Chip */}
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                  <span className="text-xs text-muted-foreground">Best:</span>
                  <Badge
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {bestStrategy === "ltr" && "🏠 Long-Term"}
                    {bestStrategy === "section8" && "🎫 Section 8"}
                    {bestStrategy === "airbnb" && "🏖️ Airbnb"}
                    {bestStrategy === "rehab" && "🔨 Rehab"}
                  </Badge>
                  <span className="text-xs">
                    {bestStrategy === "ltr" &&
                      formatPercent(ltrResults.year1Summary.cashOnCash)}
                    {bestStrategy === "section8" &&
                      formatPercent(section8Results.year1Summary.cashOnCash)}
                    {bestStrategy === "airbnb" &&
                      formatPercent(airbnbResults.year1Summary.cashOnCash)}
                    {bestStrategy === "rehab" &&
                      rehabResults &&
                      formatPercent(rehabResults.year1Summary.cashOnCash)}
                  </span>
                </div>

                {/* Lender Mode Toggle */}
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                  <span className="text-xs text-muted-foreground">View:</span>
                  <div className="flex gap-1">
                    <Button
                      variant={
                        projectionMode === "realistic" ? "default" : "ghost"
                      }
                      size="sm"
                      onClick={() => setProjectionMode("realistic")}
                      className={`h-6 px-2 text-xs ${
                        projectionMode === "realistic"
                          ? ""
                          : "hover:bg-transparent"
                      }`}
                    >
                      Realistic
                    </Button>
                    <Button
                      variant={
                        projectionMode === "lender" ? "default" : "ghost"
                      }
                      size="sm"
                      onClick={() => setProjectionMode("lender")}
                      className={`h-6 px-2 text-xs ${
                        projectionMode === "lender"
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "hover:bg-transparent"
                      }`}
                    >
                      Lender
                    </Button>
                  </div>
                </div>

                {/* Funds Gap Display (BRRRR deals only) */}
                {inputs.isRehab &&
                  inputs.rehabCost > 0 &&
                  rehabScenarios &&
                  (() => {
                    const fundsGap =
                      rehabScenarios?.refiScenario?.fundsGap ?? 0;
                    return (
                      <div
                        className={`flex items-center gap-2 rounded-full px-3 py-1 border ${
                          fundsGap > 0
                            ? "bg-red-50 border-red-200"
                            : "bg-green-50 border-green-200"
                        }`}
                      >
                        <span className="text-xs text-muted-foreground">
                          Funds Gap:
                        </span>
                        <span
                          className={`text-xs ${
                            fundsGap > 0 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {formatCurrency(Math.abs(fundsGap))}
                          {fundsGap > 0 ? " Short" : " Surplus"}
                        </span>
                      </div>
                    );
                  })()}
              </div>

              {/* Right: Spacer for balance */}
              <div className="min-w-0"></div>
            </div>
          )}

          {/* NOTE: CHECK FOR THE NEW COMPONENT HERE  */}
          {/* View Navigation Tabs */}
          <div className="flex items-center gap-2 border-t border-border pt-2 pb-0">
            <Button
              variant={mainView === "overview" ? "default" : "ghost"}
              onClick={() => setMainView("overview")}
              size="sm"
            >
              <Home className="mr-2 h-4 w-4" />
              Overview & Analysis
            </Button>
            <Button
              variant={mainView === "condition" ? "default" : "ghost"}
              onClick={() => setMainView("condition")}
              size="sm"
              className="relative"
            >
              <FileText className="mr-2 h-4 w-4" />
              Rehab Estimate
              {hasNotesData() && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></span>
              )}
            </Button>
            <Button
              variant={mainView === "arv" ? "default" : "ghost"}
              onClick={() => setMainView("arv")}
              size="sm"
              className="relative"
            >
              <Calculator className="mr-2 h-4 w-4" />
              ARV Calculator
              {inputs.arvComps && inputs.arvComps.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {inputs.arvComps.length}
                </Badge>
              )}
            </Button>

            {/* NOTE: CHECK FOR THE NEW COMPONENT HERE  */}
            <Button
              variant={mainView === "teamnotes" ? "default" : "ghost"}
              onClick={() => setMainView("teamnotes")}
              size="sm"
              className="relative"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Team Notes
              {teamNotesCount.pinned > 0 ? (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                  {teamNotesCount.pinned}
                </Badge>
              ) : teamNotesCount.total > 0 ? (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {teamNotesCount.total}
                </Badge>
              ) : null}
            </Button>
            <Button
              variant={mainView === "stats" ? "default" : "ghost"}
              onClick={() => setMainView("stats")}
              size="sm"
              className="relative"
            >
              <Activity className="mr-2 h-4 w-4" />
              Pipeline Stats
            </Button>
            <Button
              variant={mainView === "guide" ? "default" : "ghost"}
              onClick={() => setMainView("guide")}
              size="sm"
              className="ml-auto"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              User Guide
            </Button>
          </div>
        </div>
      </div>

      {/* NOTE: CHECK FOR THE NEW COMPONENT HERE  */}
      <div className="max-w-[1800px] mx-auto p-6">
        {mainView === "arv" ? (
          /* ARV Calculator View */
          <div>
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2>ARV Calculator - Comparable Sales Analysis</h2>
                  <p className="text-muted-foreground mt-1">
                    Add comparable sales from Zillow to automatically calculate
                    your After Repair Value. The ARV will update the Bridge Loan
                    section.
                  </p>
                </div>
                {(inputs.calculatedARV ?? 0) > 0 && inputs.isRehab && (
                  <Button
                    variant="outline"
                    onClick={() => setMainView("overview")}
                  >
                    <Home className="mr-2 h-4 w-4" />
                    View Bridge Loan Analysis
                  </Button>
                )}
              </div>
              {(inputs.calculatedARV ?? 0) > 0 && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-green-700">
                        Calculated ARV (updates Bridge Loan)
                      </div>
                      <div className="text-2xl font-bold text-green-800">
                        {formatCurrency(inputs.calculatedARV ?? 0)}
                      </div>
                    </div>
                    {inputs.purchasePrice > 0 && (
                      <div className="text-right">
                        <div className="text-sm text-green-700">
                          Potential Profit (ARV - Purchase)
                        </div>
                        <div className="text-xl font-semibold text-green-800">
                          {formatCurrency(
                            (inputs.calculatedARV ?? 0) - inputs.purchasePrice
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!inputs.isRehab && (inputs.calculatedARV ?? 0) > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    💡 Enable "Renovation/Rehab Project" in the Overview tab to
                    use the calculated ARV in your bridge loan analysis.
                  </p>
                </div>
              )}
            </div>
            <ARVCalculator
              comps={(inputs.arvComps || []).map((c) => ({
                ...c,
                // Normalize zestimate and rentZestimate undefined -> null to satisfy ARVCalculator's ZillowComp type
                zestimate: c.zestimate ?? null,
                rentZestimate: c.rentZestimate ?? null,
              }))}
              calculatedARV={inputs.calculatedARV || 0}
              onCompsChange={(comps) =>
                handleARVCompsChange(
                  (comps as unknown as ZillowComp[]).map((c) => ({
                    ...c,
                    // Convert ARVCalculator's zestimate and rentZestimate null -> undefined expected by shared type
                    zestimate: (c as any).zestimate ?? undefined,
                    rentZestimate: (c as any).rentZestimate ?? undefined,
                  }))
                )
              }
              onARVChange={handleCalculatedARVChange}
              subjectProperty={{
                address: inputs.address,
                purchasePrice: inputs.purchasePrice,
                beds: inputs.unitDetails.reduce(
                  (sum, unit) => sum + unit.beds,
                  0
                ),
                baths: inputs.unitDetails.reduce(
                  (sum, unit) => sum + unit.baths,
                  0
                ),
                sqft: inputs.totalSqft,
                yearBuilt: inputs.yearBuilt,
                propertyType:
                  inputs.units > 1
                    ? `${inputs.units}-Unit Multifamily`
                    : "Single Family",
                units: inputs.units,
                description: inputs.subjectPropertyDescription || "",
                zillowLink: inputs.subjectPropertyZillowLink || "",
                lat: inputs.subjectLat,
                lng: inputs.subjectLng,
              }}
              onSubjectPropertyChange={handleSubjectPropertyChange}
              subjectPhotos={inputs.photos || []}
              onSubjectPhotosChange={(photos) => handleChange("photos", photos)}
              expandedDescriptions={arvExpandedDescriptions}
              onExpandedDescriptionsChange={setArvExpandedDescriptions}
              hoveredCompId={hoveredCompId}
              onCompHover={setHoveredCompId}
            />
          </div>
        ) : mainView === "condition" ? (
          /* Rehab Estimate Form - v256_change: Streamlined rehab-focused form */
          <RehabEstimateForm
            notes={inputs.notes || getDefaultNotes()}
            onChange={handleNotesChange}
            totalSqft={inputs.totalSqft}
            units={inputs.units}
            yearBuilt={inputs.yearBuilt}
            onRehabCostChange={(cost) => {
              // Update rehab cost when line items change
              if (inputs.isRehab) {
                setInputs((prev) => ({
                  ...prev,
                  rehabCost: cost,
                }));
              }
            }}
            onRehabEstimateGenerated={(estimate) => {
              // Auto-populate rehab fields if isRehab is true
              if (inputs.isRehab) {
                setInputs((prev) => ({
                  ...prev,
                  rehabCost: estimate.estimatedCost,
                  rehabCondition: estimate.suggestedCondition,
                }));
              }
            }}
          />
        ) : mainView === "teamnotes" ? (
          /* Team Notes - Collaboration hub */
          <TeamNotesTab savedDeals={savedDeals} />
        ) : mainView === "stats" ? (
          /* Pipeline Stats - Analytics & Metrics */
          <PipelineStats savedDeals={savedDeals} />
        ) : mainView === "guide" ? (
          /* User Guide - Help & Documentation */
          <UserGuide />
        ) : (
          /* Main Overview & Analysis View */
          <>
            {/* Saved Deals Table */}
            {savedDeals.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CardTitle>Saved Deals</CardTitle>
                        {(() => {
                          // Calculate storage usage
                          try {
                            const dealsStr = JSON.stringify(savedDeals);
                            const sizeBytes = new Blob([dealsStr]).size;
                            const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(
                              2
                            );
                            const percentage = Math.min(
                              100,
                              (sizeBytes / (5 * 1024 * 1024)) * 100
                            ); // Assume 5MB limit
                            const color =
                              percentage > 80
                                ? "text-red-600"
                                : percentage > 60
                                ? "text-orange-600"
                                : "text-green-600";
                            return (
                              <Badge
                                variant="outline"
                                className={`${color} text-xs`}
                              >
                                {sizeMB} MB
                              </Badge>
                            );
                          } catch (e) {
                            return null;
                          }
                        })()}
                      </div>
                      <CardDescription>
                        Click any deal to view and compare side by side
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportDeals("csv")}
                          disabled={savedDeals.length === 0}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export CSV
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportDeals("json")}
                          disabled={savedDeals.length === 0}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export JSON
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleImportDeals("csv")}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Import CSV
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleImportDeals("json")}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Import JSON
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowBulkPaste(true)}
                        className="border-purple-600 text-purple-600 hover:bg-purple-50"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Bulk Paste Favorites
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (
                            window.confirm(
                              `🗑️ Remove photos from all ${savedDeals.length} deals to free up storage?\n\nDeal data will be preserved.\nDownload a backup first to preserve photos.`
                            )
                          ) {
                            const dealsWithoutPhotos = savedDeals.map(
                              (deal) => ({
                                ...deal,
                                photos: [],
                                arvComps: deal.arvComps?.map((comp) => ({
                                  ...comp,
                                  photos: [],
                                })),
                              })
                            );
                            setSavedDeals(dealsWithoutPhotos);
                            toast.success(
                              "Photos removed from all deals. Storage space freed up!",
                              {
                                description:
                                  "Deal calculations and data preserved.",
                              }
                            );
                          }
                        }}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      >
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Strip Photos
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (savedDeals.length === 0) {
                            toast.info("No deals to delete");
                            return;
                          }

                          if (
                            window.confirm(
                              `⚠️ Are you sure you want to PERMANENTLY DELETE ALL ${savedDeals.length} deals?\n\nThis action cannot be undone and will remove all deals from the database!\n\nTIP: Export a backup first if you might need them later.`
                            )
                          ) {
                            try {
                              const result =
                                await dashboardService.deleteAllDeals();

                              // Clear local state after successful API call
                              setSavedDeals([]);
                              setCurrentDealId(null);

                              toast.success(
                                `Successfully deleted ${result.deletedCount} deals from the database`
                              );

                              // Optional: Refresh the deals list to ensure consistency
                              await loadDealsFromAPI();
                            } catch (error) {
                              console.error(
                                "Failed to delete all deals:",
                                error
                              );
                            }
                          }
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={savedDeals.length === 0}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete All ({savedDeals.length})
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {savedDeals.length > 0 && !loading && (
                    <div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[60px]">Photo</TableHead>
                            <TableHead
                              className="max-w-[180px] truncate cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("address")}
                            >
                              <div className="flex items-center">
                                <span>Address</span>
                                <SortIcon column="address" />
                              </div>
                            </TableHead>
                            <TableHead
                              className="text-right bg-amber-50 cursor-pointer hover:bg-amber-100 select-none"
                              onClick={() => handleSort("maxOffer")}
                            >
                              <div className="flex items-center justify-end gap-1">
                                <Star className="h-3 w-3 text-amber-600 fill-amber-600" />
                                <span>Max Offer</span>
                                <SortIcon column="maxOffer" />
                              </div>
                            </TableHead>
                            <TableHead
                              className="text-right cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("price")}
                            >
                              <div className="flex items-center justify-end">
                                <span>Price</span>
                                <SortIcon column="price" />
                              </div>
                            </TableHead>
                            <TableHead
                              className="text-center w-[50px] cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("units")}
                            >
                              <div className="flex items-center justify-center">
                                <span>Units</span>
                                <SortIcon column="units" />
                              </div>
                            </TableHead>
                            <TableHead
                              className="text-right cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("ltrCF")}
                            >
                              <div className="flex items-center justify-end">
                                <span>LTR CF</span>
                                <SortIcon column="ltrCF" />
                              </div>
                            </TableHead>
                            <TableHead
                              className="text-right w-[60px] cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("ltrDSCR")}
                            >
                              <div className="flex items-center justify-end">
                                <span>DSCR</span>
                                <SortIcon column="ltrDSCR" />
                              </div>
                            </TableHead>
                            <TableHead
                              className="text-right cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("s8CF")}
                            >
                              <div className="flex items-center justify-end">
                                <span>S8 CF</span>
                                <SortIcon column="s8CF" />
                              </div>
                            </TableHead>
                            <TableHead
                              className="text-right w-[60px] cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("s8DSCR")}
                            >
                              <div className="flex items-center justify-end">
                                <span>DSCR</span>
                                <SortIcon column="s8DSCR" />
                              </div>
                            </TableHead>
                            <TableHead
                              className="text-right cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("strCF")}
                            >
                              <div className="flex items-center justify-end">
                                <span>STR CF</span>
                                <SortIcon column="strCF" />
                              </div>
                            </TableHead>
                            <TableHead
                              className="text-right w-[60px] cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("strDSCR")}
                            >
                              <div className="flex items-center justify-end">
                                <span>DSCR</span>
                                <SortIcon column="strDSCR" />
                              </div>
                            </TableHead>
                            <TableHead
                              className="text-center w-[80px] cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("best")}
                            >
                              <div className="flex items-center justify-center">
                                <span>Best</span>
                                <SortIcon column="best" />
                              </div>
                            </TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedDeals.map((deal) => {
                            const ltr = calculateLTR(deal, globalAssumptions);
                            const sec8 = calculateSection8(
                              deal,
                              globalAssumptions
                            );
                            const str = calculateAirbnb(
                              deal,
                              globalAssumptions
                            );

                            const year5ROI = {
                              ltr: ltr.projections[4]?.cumulativeReturn || 0,
                              section8:
                                sec8.projections[4]?.cumulativeReturn || 0,
                              airbnb: str.projections[4]?.cumulativeReturn || 0,
                            };

                            let bestStrat = "LTR";
                            if (
                              year5ROI.airbnb >= year5ROI.ltr &&
                              year5ROI.airbnb >= year5ROI.section8
                            ) {
                              bestStrat = "Airbnb";
                            } else if (year5ROI.section8 >= year5ROI.ltr) {
                              bestStrat = "Section 8";
                            }

                            return (
                              <TableRow
                                key={deal.id}
                                className={`transition-all duration-300 ${
                                  deletingDealId === deal.id
                                    ? "opacity-0 scale-95"
                                    : currentDealId === deal.id
                                    ? "bg-blue-50"
                                    : "cursor-pointer hover:bg-muted/50"
                                }`}
                                onClick={() => handleLoadDeal(deal)}
                              >
                                <TableCell className="w-[60px] p-1">
                                  {(() => {
                                    const primaryPhoto =
                                      deal.photos?.find((p) => p.isPrimary) ||
                                      deal.photos?.[0];
                                    return primaryPhoto ? (
                                      <div className="w-12 h-12 rounded overflow-hidden border border-border">
                                        <img
                                          src={primaryPhoto.url}
                                          alt="Property"
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center border border-border">
                                        <Home className="w-5 h-5 text-muted-foreground" />
                                      </div>
                                    );
                                  })()}
                                </TableCell>
                                <TableCell
                                  className="max-w-[180px] text-sm"
                                  title={deal.address || "No address"}
                                >
                                  <div className="flex flex-col gap-1.5">
                                    <span className="truncate">
                                      {deal.address || "No address"}
                                    </span>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {deal.isOffMarket && (
                                        <Badge className="shrink-0 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white border-2 border-orange-700 shadow-md px-2.5 py-0.5 font-bold tracking-wide">
                                          🔶 OFF MARKET
                                        </Badge>
                                      )}
                                      {deal.notes &&
                                        deal.notes.overallCondition && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs w-fit"
                                          >
                                            {deal.notes.overallCondition}
                                          </Badge>
                                        )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right text-sm bg-amber-50">
                                  {deal.maxOffer ? (
                                    <span className="font-semibold text-amber-900">
                                      {formatCurrency(deal.maxOffer)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {formatCurrency(deal.purchasePrice)}
                                </TableCell>
                                <TableCell className="text-center">
                                  {deal.units}
                                </TableCell>
                                <TableCell
                                  className={`text-right text-sm ${
                                    ltr.year1Summary.cashFlow >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {formatCurrency(ltr.year1Summary.cashFlow)}
                                </TableCell>
                                <TableCell
                                  className={`text-right text-sm ${
                                    ltr.year1Summary.dscr >= 1.0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {ltr.year1Summary.dscr.toFixed(2)}
                                </TableCell>
                                <TableCell
                                  className={`text-right text-sm ${
                                    sec8.year1Summary.cashFlow >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {formatCurrency(sec8.year1Summary.cashFlow)}
                                </TableCell>
                                <TableCell
                                  className={`text-right text-sm ${
                                    sec8.year1Summary.dscr >= 1.0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {sec8.year1Summary.dscr.toFixed(2)}
                                </TableCell>
                                <TableCell
                                  className={`text-right text-sm ${
                                    str.year1Summary.cashFlow >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {formatCurrency(str.year1Summary.cashFlow)}
                                </TableCell>
                                <TableCell
                                  className={`text-right text-sm ${
                                    str.year1Summary.dscr >= 1.0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {str.year1Summary.dscr.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="text-xs">
                                    {bestStrat}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    {/* ERROR FROM BACKEND */}
                                    <Select
                                      value={
                                        deal.dealStage || "stage1-basic-data"
                                      }
                                      onValueChange={(stage: DealStage) =>
                                        handleStageChange(deal.id, stage)
                                      }
                                    >
                                      <SelectTrigger
                                        className="h-8 w-[140px] text-xs"
                                        onClick={(e: any) =>
                                          e.stopPropagation()
                                        }
                                      >
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent
                                        onClick={(e: any) =>
                                          e.stopPropagation()
                                        }
                                      >
                                        <SelectGroup>
                                          <SelectLabel>
                                            Active Stages
                                          </SelectLabel>
                                          {getStagesByPhase().active.map(
                                            (stage) => (
                                              <SelectItem
                                                key={stage.stage}
                                                value={stage.stage}
                                              >
                                                {stage.label}
                                              </SelectItem>
                                            )
                                          )}
                                        </SelectGroup>
                                        <SelectSeparator />
                                        <SelectGroup>
                                          <SelectLabel>Outcomes</SelectLabel>
                                          {getStagesByPhase().outcomes.map(
                                            (stage) => (
                                              <SelectItem
                                                key={stage.stage}
                                                value={stage.stage}
                                              >
                                                {stage.label}
                                              </SelectItem>
                                            )
                                          )}
                                        </SelectGroup>
                                        <SelectSeparator />
                                        <SelectItem value="archived">
                                          Archived
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e: any) => {
                                        e.stopPropagation();
                                        handleLoadDeal(deal);
                                      }}
                                      title="View deal"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e: any) =>
                                            e.stopPropagation()
                                          }
                                          title="Team notes"
                                          className="relative"
                                        >
                                          <MessageSquare className="h-4 w-4" />
                                          {(() => {
                                            const notesCount = getNotesForDeal(
                                              deal.id
                                            ).length;
                                            const pinnedCount = getNotesForDeal(
                                              deal.id
                                            ).filter((n) => n.isPinned).length;
                                            return notesCount > 0 ? (
                                              <Badge
                                                variant={
                                                  pinnedCount > 0
                                                    ? "destructive"
                                                    : "secondary"
                                                }
                                                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                                              >
                                                {notesCount}
                                              </Badge>
                                            ) : null;
                                          })()}
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent
                                        className="max-w-2xl max-h-[80vh] overflow-y-auto"
                                        onClick={(e: any) =>
                                          e.stopPropagation()
                                        }
                                      >
                                        <DialogHeader>
                                          <DialogTitle>Team Notes</DialogTitle>
                                          <DialogDescription>
                                            {deal.address}
                                          </DialogDescription>
                                        </DialogHeader>
                                        <DealNotesComp
                                          dealId={deal.id}
                                          onNotesChange={() => {
                                            // Force re-render to update badge counts
                                            setSavedDeals([...savedDeals]);
                                          }}
                                        />
                                      </DialogContent>
                                    </Dialog>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e: any) => {
                                        e.stopPropagation();
                                        setDeletingDealId(deal.id);
                                        setTimeout(() => {
                                          handleDeleteDeal(deal.id);
                                          setDeletingDealId(null);
                                        }, 300);
                                      }}
                                      className="hover:bg-red-100 hover:text-red-600"
                                      title="Delete deal"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            {loading && (
              <div className="flex p-4 mb-6  items-center justify-center h-64 bg-muted/30 border-2 border-dashed border-border rounded-lg">
                <div className="text-gray-600 dark:text-gray-400 flex justify-center items-center gap-2">
                  <Loader className="animate-spin text-gray-500 dark:text-gray-400 h-4 w-4" />
                  Loading deals...
                </div>
              </div>
            )}
            {savedDeals.length === 0 && !loading && (
              <div className="mb-6 p-6 bg-muted/30 border-2 border-dashed border-border rounded-lg">
                <div className="flex flex-col items-center justify-center gap-3 text-center">
                  <p className="text-muted-foreground">
                    No saved deals yet. Start by creating a new deal or import
                    existing deals.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleImportDeals("csv")}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Deals from File
                  </Button>
                </div>
              </div>
            )}
            {/* v253_change: Multi-unit Distribution Preview Card */}
            {distributionPreview && (
              <Card className="mb-6 border-2 border-blue-300 bg-blue-50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-blue-900">
                        🏢 Unit Distribution Preview
                      </CardTitle>
                      <CardDescription>
                        Review the auto-generated bed/bath/sqft distribution
                        before applying
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleApplyDistribution}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Apply Distribution
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDismissDistribution}
                      >
                        ✖️ Dismiss
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Beds</TableHead>
                        <TableHead className="text-right">Baths</TableHead>
                        <TableHead className="text-right">Sqft</TableHead>
                        <TableHead className="text-right">
                          Section 8 Rent
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distributionPreview.map((unit, index) => (
                        <TableRow key={index} className="bg-white">
                          <TableCell>Unit {index + 1}</TableCell>
                          <TableCell className="text-right">
                            {unit.beds}
                          </TableCell>
                          <TableCell className="text-right">
                            {unit.baths}
                          </TableCell>
                          <TableCell className="text-right">
                            {unit.sqft ? unit.sqft.toLocaleString() : "N/A"}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {unit.section8Rent
                              ? formatCurrency(unit.section8Rent)
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-blue-100/50 border-t-2 border-blue-300">
                        <TableCell className="font-medium">Total</TableCell>
                        <TableCell className="text-right font-medium">
                          {distributionPreview.reduce(
                            (sum, u) => sum + u.beds,
                            0
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {distributionPreview.reduce(
                            (sum, u) => sum + u.baths,
                            0
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {distributionPreview
                            .reduce((sum, u) => sum + (u.sqft ?? 0), 0)
                            .toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(
                            distributionPreview.reduce(
                              (sum, u) => sum + (u.section8Rent || 0),
                              0
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Left Side: Input Form */}
              <div className="xl:col-span-4">
                <Card className="sticky top-6">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>Property Details</CardTitle>
                        <CardDescription>
                          Enter deal information to see live analysis
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowZillowQuickStart(true)}
                        className="bg-purple-50 border-purple-300 hover:bg-purple-100 text-purple-700 shrink-0"
                      >
                        <Home className="mr-2 h-4 w-4" />
                        Paste from Zillow
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={inputs.address}
                          onChange={(e) =>
                            handleChange("address", e.target.value)
                          }
                          placeholder="123 Main St, City, State 12345"
                        />
                        {(() => {
                          const detectedZip = extractZipCode(inputs.address);
                          const zipData =
                            globalAssumptions.section8ZipData.find(
                              (z) => z.zipCode === detectedZip
                            );
                          if (detectedZip && zipData) {
                            return (
                              <div className="flex items-center gap-2 mt-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded p-2">
                                <MapPin className="h-4 w-4" />
                                <span>
                                  Zip {detectedZip} detected • HACFL Zone{" "}
                                  {zipData.zone}
                                </span>
                              </div>
                            );
                          } else if (detectedZip) {
                            return (
                              <div className="flex items-center gap-2 mt-2 text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded p-2">
                                <MapPin className="h-4 w-4" />
                                <span>
                                  Zip {detectedZip} detected • No Section 8 data
                                  (add in Assumptions)
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="subjectLat">Latitude</Label>
                          <Input
                            id="subjectLat"
                            type="number"
                            step="any"
                            value={inputs.subjectLat || ""}
                            onChange={(e) =>
                              handleChange("subjectLat", Number(e.target.value))
                            }
                            placeholder="26.1224"
                          />
                        </div>
                        <div>
                          <Label htmlFor="subjectLng">Longitude</Label>
                          <Input
                            id="subjectLng"
                            type="number"
                            step="any"
                            value={inputs.subjectLng || ""}
                            onChange={(e) =>
                              handleChange("subjectLng", Number(e.target.value))
                            }
                            placeholder="-80.1373"
                          />
                        </div>
                      </div>
                      {/* Max Offer - Locked In */}
                      <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="h-5 w-5 text-amber-600 fill-amber-600" />
                          <Label
                            htmlFor="maxOffer"
                            className="text-amber-900 m-0"
                          >
                            MAX OFFER (Locked In)
                          </Label>
                        </div>
                        <Input
                          id="maxOffer"
                          value={formatNumber(inputs.maxOffer || 0)}
                          onChange={(e) =>
                            handleChange(
                              "maxOffer",
                              parseNumber(e.target.value)
                            )
                          }
                          placeholder="Enter max offer price"
                          className="border-amber-300 bg-white text-lg h-12"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="units">Units (#)</Label>
                          <Input
                            id="units"
                            type="number"
                            min="1"
                            max="10"
                            value={inputs.units}
                            onChange={(e) =>
                              handleChange("units", Number(e.target.value))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="yearBuilt">Year Built</Label>
                          <Input
                            id="yearBuilt"
                            type="number"
                            min="1900"
                            max={new Date().getFullYear()}
                            value={inputs.yearBuilt}
                            onChange={(e) =>
                              handleChange("yearBuilt", Number(e.target.value))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="totalSqft">Total SQFT</Label>
                          <Input
                            id="totalSqft"
                            value={formatNumber(inputs.totalSqft)}
                            onChange={(e) =>
                              handleNumberInput("totalSqft", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Multi-Family Total Inputs (2-4 units only) */}
                    {inputs.units >= 2 && inputs.units <= 4 && (
                      <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm">
                          🏢 Multi-Family Property Totals
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Enter total beds, baths, and sqft across all{" "}
                          {inputs.units} units
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label htmlFor="totalBeds" className="text-xs">
                              Total Beds
                            </Label>
                            <Input
                              id="totalBeds"
                              type="number"
                              min="0"
                              value={totalBeds || ""}
                              onChange={(e) =>
                                handleTotalBedsChange(Number(e.target.value))
                              }
                              placeholder={`e.g., ${inputs.units * 2}`}
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label htmlFor="totalBaths" className="text-xs">
                              Total Baths
                            </Label>
                            <Input
                              id="totalBaths"
                              type="number"
                              min="0"
                              step="0.5"
                              value={totalBaths || ""}
                              onChange={(e) =>
                                handleTotalBathsChange(Number(e.target.value))
                              }
                              placeholder={`e.g., ${inputs.units * 1.5}`}
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label htmlFor="totalSqftMulti" className="text-xs">
                              Total SQFT
                            </Label>
                            <div className="text-sm p-2 bg-muted rounded border border-border h-9 flex items-center">
                              {inputs.totalSqft.toLocaleString()} sq ft
                            </div>
                          </div>
                        </div>
                        {totalBeds > 0 &&
                          totalBaths > 0 &&
                          inputs.totalSqft > 0 &&
                          (() => {
                            // Calculate proportional sqft distribution preview
                            const distributedUnits = distributeUnitsSpecs(
                              totalBeds,
                              totalBaths,
                              inputs.totalSqft,
                              inputs.units
                            );
                            return (
                              <div className="bg-white/70 border border-blue-300 rounded p-2 text-xs space-y-1">
                                <div className="text-muted-foreground">
                                  📊 Distribution Preview (proportional by
                                  bedrooms):
                                </div>
                                <div className="grid grid-cols-2 gap-1">
                                  {distributedUnits.map((unit, i) => (
                                    <div key={i} className="text-blue-700">
                                      Unit {i + 1}: {unit.beds}bd/{unit.baths}ba
                                      • {unit.sqft.toLocaleString()} sqft
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                      </div>
                    )}

                    {/* Unit Details */}
                    <div className="space-y-2">
                      <h4>Unit Details</h4>

                      {/* Auto-populated confirmation for Multi-Family (2-4 units) */}
                      {inputs.units >= 2 &&
                        inputs.units <= 4 &&
                        unitsAutoPopulated && (
                          <div className="bg-green-50 border border-green-300 rounded-lg p-2">
                            <p className="text-xs text-green-700">
                              ✓ Units auto-populated from totals ({totalBeds}{" "}
                              beds, {totalBaths} baths distributed across{" "}
                              {inputs.units} units)
                            </p>
                          </div>
                        )}

                      {inputs.unitDetails.map((unit, index) => {
                        return (
                          <div
                            key={index}
                            className="bg-muted/50 border border-border rounded p-2"
                          >
                            <div className="grid grid-cols-4 gap-2 items-end">
                              <div>
                                <Label
                                  htmlFor={`beds-${index}`}
                                  className="text-xs"
                                >
                                  Beds
                                </Label>
                                <Input
                                  id={`beds-${index}`}
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={unit.beds}
                                  onChange={(e) =>
                                    handleUnitChange(
                                      index,
                                      "beds",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label
                                  htmlFor={`baths-${index}`}
                                  className="text-xs"
                                >
                                  Baths
                                </Label>
                                <Input
                                  id={`baths-${index}`}
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={unit.baths}
                                  onChange={(e) =>
                                    handleUnitChange(
                                      index,
                                      "baths",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label
                                  htmlFor={`rent-${index}`}
                                  className="text-xs"
                                >
                                  Sec8 Max
                                </Label>
                                <Input
                                  id={`rent-${index}`}
                                  value={formatNumber(unit.section8Rent || 0)}
                                  onChange={(e) =>
                                    handleUnitChange(
                                      index,
                                      "section8Rent",
                                      parseNumber(e.target.value)
                                    )
                                  }
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label
                                  htmlFor={`market-${index}`}
                                  className="text-xs"
                                >
                                  Market Rent
                                </Label>
                                <Input
                                  id={`market-${index}`}
                                  value={formatNumber(
                                    unit.marketRent ??
                                      Math.round((unit.section8Rent || 0) / 1.1)
                                  )}
                                  onChange={(e) =>
                                    handleUnitChange(
                                      index,
                                      "marketRent",
                                      parseNumber(e.target.value)
                                    )
                                  }
                                  className="h-8"
                                  placeholder={formatNumber(
                                    Math.round((unit.section8Rent || 0) / 1.1)
                                  )}
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-muted-foreground">
                                Unit {index + 1}:{" "}
                                {unit.marketRent ? (
                                  <span className="text-blue-600">
                                    Using custom market rent
                                  </span>
                                ) : (
                                  <span>
                                    Auto-calculated market ≈ $
                                    {formatNumber(
                                      Math.round((unit.section8Rent || 0) / 1.1)
                                    )}
                                  </span>
                                )}
                              </p>
                              {inputs.units >= 2 &&
                                inputs.units <= 4 &&
                                unit.sqft && (
                                  <p className="text-xs text-muted-foreground">
                                    {unit.sqft.toLocaleString()} sq ft
                                  </p>
                                )}
                            </div>
                          </div>
                        );
                      })}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Total Section 8 Max:</span>
                          <span className="font-semibold">
                            ${formatNumber(Math.round(totalSection8Rent))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Est. Market Rent:
                          </span>
                          <span className="text-muted-foreground">
                            ${formatNumber(Math.round(totalMarketRent))}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground text-center pt-0.5 border-t border-blue-300">
                          Sec8 voucher ≈ 1.1x market
                        </div>
                      </div>
                    </div>

                    {/* v254_change: Property Photos Gallery - Moved lower */}
                    <PhotoGallery
                      photos={inputs.photos || []}
                      onChange={(photos) => handleChange("photos", photos)}
                    />

                    {/* Purchase & Financing */}
                    <div className="space-y-4 border-2 border-indigo-200 bg-indigo-50/30 rounded-lg p-4">
                      <h4 className="text-indigo-900 border-b border-indigo-300 pb-2">
                        DSCR Loan (LTR/STR)
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Label htmlFor="purchasePrice">
                            Purchase Price ($)
                          </Label>
                          <Input
                            id="purchasePrice"
                            value={formatNumber(inputs.purchasePrice)}
                            onChange={(e) =>
                              handleNumberInput("purchasePrice", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="downPayment">Down Payment (%)</Label>
                          <Input
                            id="downPayment"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={inputs.downPayment}
                            onChange={(e) =>
                              handleChange(
                                "downPayment",
                                Number(e.target.value)
                              )
                            }
                          />
                          {(() => {
                            // Calculate DSCR loan down payment (always based on down payment %)
                            const dscrDownPayment =
                              inputs.purchasePrice * (inputs.downPayment / 100);

                            return (
                              <p className="text-xs text-muted-foreground mt-1">
                                Cash down:{" "}
                                <strong>
                                  {formatCurrency(dscrDownPayment)}
                                </strong>{" "}
                                (DSCR loan)
                              </p>
                            );
                          })()}
                        </div>
                        <div>
                          <Label htmlFor="loanInterestRate">
                            Interest Rate (%)
                          </Label>
                          <Input
                            id="loanInterestRate"
                            type="number"
                            min="0"
                            step="0.01"
                            value={inputs.loanInterestRate}
                            onChange={(e) =>
                              handleChange(
                                "loanInterestRate",
                                Number(e.target.value)
                              )
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="loanTerm">Loan Term (years)</Label>
                          <Input
                            id="loanTerm"
                            type="number"
                            min="1"
                            value={inputs.loanTerm}
                            onChange={(e) =>
                              handleChange("loanTerm", Number(e.target.value))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="acquisitionCostsAmount">
                            Acquisition Costs
                          </Label>
                          <Input
                            id="acquisitionCostsAmount"
                            type="text"
                            value={(() => {
                              const defaultAmount = Math.round(
                                inputs.purchasePrice * 0.05
                              );
                              const currentValue =
                                inputs.acquisitionCostsAmount ?? defaultAmount;
                              return formatNumber(currentValue);
                            })()}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/,/g, "");
                              const numValue =
                                rawValue === "" ? undefined : Number(rawValue);
                              handleChange("acquisitionCostsAmount", numValue);
                            }}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Prepopulates at 5% (editable)
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="propertyTaxes">
                            Property Taxes ($/year)
                          </Label>
                          <Input
                            id="propertyTaxes"
                            value={formatNumber(inputs.propertyTaxes)}
                            onChange={(e) =>
                              handleNumberInput("propertyTaxes", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="propertyInsurance">
                            Property Insurance ($/year)
                          </Label>
                          <Input
                            id="propertyInsurance"
                            value={formatNumber(inputs.propertyInsurance)}
                            onChange={(e) =>
                              handleNumberInput(
                                "propertyInsurance",
                                e.target.value
                              )
                            }
                          />
                          {/* Florida Insurance Discounts */}
                          <div className="mt-2 space-y-1.5 bg-blue-50 border border-blue-200 rounded-lg p-2">
                            <p className="text-xs font-medium text-blue-900 mb-1">
                              🌴 Florida Wind Mitigation Discounts
                            </p>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="hasHurricaneWindows"
                                checked={inputs.hasHurricaneWindows || false}
                                onChange={(e) =>
                                  handleChange(
                                    "hasHurricaneWindows",
                                    e.target.checked
                                  )
                                }
                                className="h-4 w-4 cursor-pointer rounded border-2 border-blue-400 appearance-none bg-white checked:bg-blue-600 checked:border-blue-600 checked:after:content-['✓'] checked:after:text-white checked:after:text-xs checked:after:flex checked:after:items-center checked:after:justify-center"
                              />
                              <Label
                                htmlFor="hasHurricaneWindows"
                                className="text-xs cursor-pointer text-blue-900"
                              >
                                Hurricane/Impact Windows (12% discount)
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="hasNewRoof"
                                checked={inputs.hasNewRoof || false}
                                onChange={(e) =>
                                  handleChange("hasNewRoof", e.target.checked)
                                }
                                className="h-4 w-4 cursor-pointer rounded border-2 border-blue-400 appearance-none bg-white checked:bg-blue-600 checked:border-blue-600 checked:after:content-['✓'] checked:after:text-white checked:after:text-xs checked:after:flex checked:after:items-center checked:after:justify-center"
                              />
                              <Label
                                htmlFor="hasNewRoof"
                                className="text-xs cursor-pointer text-blue-900"
                              >
                                New Roof (0-5 yrs old) (17% discount)
                              </Label>
                            </div>
                            {(inputs.hasHurricaneWindows ||
                              inputs.hasNewRoof) && (
                              <p className="text-xs text-green-700 pt-1 border-t border-blue-300">
                                ✓ Auto-applied to insurance calculation
                              </p>
                            )}
                            {inputs.notes?.exterior?.windowsType &&
                              (inputs.notes.exterior.windowsType ===
                                "Impact-Rated" ||
                                inputs.notes.exterior.windowsType ===
                                  "Hurricane") &&
                              !inputs.hasHurricaneWindows && (
                                <p className="text-xs text-orange-700 pt-1 border-t border-blue-300">
                                  💡 Detected "
                                  {inputs.notes.exterior.windowsType}" in rehab
                                  estimate - check box to apply discount
                                </p>
                              )}
                            {inputs.notes?.roof?.condition ===
                              "New (0-5 yrs)" &&
                              !inputs.hasNewRoof && (
                                <p className="text-xs text-orange-700 pt-1 border-t border-blue-300">
                                  💡 Detected new roof in rehab estimate - check
                                  box to apply discount
                                </p>
                              )}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="setupFurnishCost">
                            Cosmetic Renovation/Furnishing
                          </Label>
                          <Input
                            id="setupFurnishCost"
                            type="text"
                            value={formatNumber(inputs.setupFurnishCost || 0)}
                            onChange={(e) =>
                              handleNumberInput(
                                "setupFurnishCost",
                                e.target.value
                              )
                            }
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Light rehab, furnishing, or cosmetic upgrades
                            (applies to all strategies)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Rental Strategy Parameters */}
                    <div className="space-y-4 border-2 border-cyan-200 bg-cyan-50/30 rounded-lg p-4">
                      <h4 className="text-cyan-900 border-b border-cyan-300 pb-2">
                        🏖️ Short-Term Rental (Airbnb) Parameters
                      </h4>

                      {/* Per-Unit STR Annual Revenue, Expenses, and Occupancy */}
                      <div>
                        <Label className="text-sm mb-2 block">
                          STR Performance Data (Per Unit)
                        </Label>
                        <p className="text-xs text-muted-foreground mb-3">
                          Enter annual revenue, annual operating expenses, and
                          occupancy % for each unit
                        </p>
                        {inputs.unitDetails.map((unit, index) => (
                          <div
                            key={index}
                            className="bg-white border border-cyan-200 rounded-lg p-3 mb-2"
                          >
                            <div className="mb-2">
                              <Label className="text-xs">
                                Unit {index + 1} - {unit.beds}bd/{unit.baths}ba
                              </Label>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label
                                  htmlFor={`str-annual-revenue-${index}`}
                                  className="text-xs"
                                >
                                  Annual Revenue ($)
                                </Label>
                                <Input
                                  id={`str-annual-revenue-${index}`}
                                  value={formatNumber(
                                    unit.strAnnualRevenue || 0
                                  )}
                                  onChange={(e) =>
                                    handleUnitChange(
                                      index,
                                      "strAnnualRevenue",
                                      parseNumber(e.target.value)
                                    )
                                  }
                                  className="h-8"
                                  placeholder="e.g., 28800"
                                />
                              </div>
                              <div>
                                <Label
                                  htmlFor={`str-annual-expenses-${index}`}
                                  className="text-xs"
                                >
                                  Annual Expenses ($)
                                </Label>
                                <Input
                                  id={`str-annual-expenses-${index}`}
                                  value={formatNumber(
                                    unit.strAnnualExpenses || 0
                                  )}
                                  onChange={(e) =>
                                    handleUnitChange(
                                      index,
                                      "strAnnualExpenses",
                                      parseNumber(e.target.value)
                                    )
                                  }
                                  className="h-8"
                                  placeholder="e.g., 5000"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-2 space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>Total Annual Gross Revenue:</span>
                            <span className="font-semibold">
                              $
                              {formatNumber(
                                inputs.unitDetails.reduce(
                                  (sum, unit) =>
                                    sum + (unit.strAnnualRevenue || 0),
                                  0
                                )
                              )}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Total Annual Operating Expenses:</span>
                            <span className="font-semibold">
                              $
                              {formatNumber(
                                inputs.unitDetails.reduce(
                                  (sum, unit) =>
                                    sum + (unit.strAnnualExpenses || 0),
                                  0
                                )
                              )}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Net Revenue (after occupancy & expenses):
                            </span>
                            <span className="text-muted-foreground">
                              $
                              {formatNumber(
                                inputs.unitDetails.reduce((sum, unit) => {
                                  // STR annual revenue already has occupancy factored in by AirDNA
                                  const grossRevenue =
                                    unit.strAnnualRevenue || 0;
                                  return (
                                    sum +
                                    grossRevenue -
                                    (unit.strAnnualExpenses || 0)
                                  );
                                }, 0)
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Renovation/Rehab Section */}
                    <div className="space-y-4 border-2 border-orange-300 bg-orange-50/30 rounded-lg p-4">
                      <div className="flex items-center justify-between border-b border-orange-300 pb-2">
                        <h4 className="text-orange-900">
                          🔨 Renovation/Rehab Project
                        </h4>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="isRehab" className="cursor-pointer">
                            Enable Rehab
                          </Label>
                          <input
                            type="checkbox"
                            id="isRehab"
                            checked={inputs.isRehab}
                            onChange={(e) =>
                              handleChange("isRehab", e.target.checked)
                            }
                            className="h-5 w-5 cursor-pointer rounded border-2 border-gray-400 appearance-none bg-white checked:bg-orange-600 checked:border-orange-600 checked:after:content-['✓'] checked:after:text-white checked:after:flex checked:after:items-center checked:after:justify-center"
                          />
                        </div>
                      </div>

                      {inputs.isRehab && (
                        <div className="space-y-4 border border-orange-200 bg-orange-50/50 rounded-lg p-4">
                          <div className="space-y-4">
                            {/* Rehab Cost - Display Only */}
                            <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-blue-900">
                                  Renovation Cost
                                </Label>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setMainView("condition")}
                                  className="h-7 text-xs"
                                >
                                  <FileText className="mr-1 h-3 w-3" />
                                  Edit in Condition & Motivation
                                </Button>
                              </div>
                              <div className="h-12 flex items-center justify-center rounded border-2 bg-white border-blue-600 text-blue-700">
                                <span className="font-semibold text-2xl">
                                  {formatCurrency(inputs.rehabCost)}
                                </span>
                              </div>
                              <p className="text-xs text-blue-700 mt-2 text-center">
                                💡 To edit scope of work and line items, go to
                                the Condition & Motivation tab
                              </p>
                            </div>

                            {/* Bridge Loan Parameters */}
                            <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4">
                              <h5 className="text-sm mb-3 pb-2 border-b border-green-400">
                                🏦 Bridge Loan (Entry)
                              </h5>

                              <div className="grid grid-cols-3 gap-4 mb-4">
                                <div>
                                  <Label htmlFor="bridgeLTC">LTC %</Label>
                                  <Input
                                    id="bridgeLTC"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={inputs.bridgeLTC}
                                    onChange={(e) =>
                                      handleChange(
                                        "bridgeLTC",
                                        Number(e.target.value)
                                      )
                                    }
                                  />
                                  {(() => {
                                    const totalProjectCost =
                                      inputs.purchasePrice + inputs.rehabCost;
                                    const purchaseLoan =
                                      inputs.purchasePrice *
                                      (inputs.bridgeLTC / 100);
                                    const rehabLoan =
                                      inputs.rehabCost *
                                      (inputs.bridgeRehabBudgetPercent / 100);
                                    const bridgeLoan = purchaseLoan + rehabLoan;
                                    const downPayment =
                                      totalProjectCost - bridgeLoan;
                                    const bridgeSettlementCharges =
                                      inputs.bridgeSettlementCharges ??
                                      inputs.purchasePrice * 0.06;
                                    const totalCashNeeded =
                                      downPayment + bridgeSettlementCharges;

                                    return (
                                      <p className="text-xs text-green-600 mt-1">
                                        Cash In:{" "}
                                        <strong>
                                          {formatCurrency(totalCashNeeded)}
                                        </strong>
                                      </p>
                                    );
                                  })()}
                                </div>
                                <div>
                                  <Label htmlFor="bridgeRehabBudgetPercent">
                                    Rehab % Financed
                                  </Label>
                                  <Input
                                    id="bridgeRehabBudgetPercent"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={inputs.bridgeRehabBudgetPercent}
                                    onChange={(e) =>
                                      handleChange(
                                        "bridgeRehabBudgetPercent",
                                        Number(e.target.value)
                                      )
                                    }
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    % of rehab financed
                                  </p>
                                </div>
                                <div>
                                  <Label htmlFor="rehabMonths">
                                    Duration (months)
                                  </Label>
                                  <Input
                                    id="rehabMonths"
                                    type="number"
                                    min="0"
                                    value={inputs.rehabMonths}
                                    onChange={(e) =>
                                      handleChange(
                                        "rehabMonths",
                                        Number(e.target.value)
                                      )
                                    }
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Rehab timeline
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <Label htmlFor="afterRepairValue">
                                      After Repair Value - ARV ($)
                                    </Label>
                                    {inputs.calculatedARV &&
                                      inputs.calculatedARV > 0 &&
                                      inputs.arvComps &&
                                      inputs.arvComps.length > 0 && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs bg-green-50 border-green-500 text-green-700"
                                        >
                                          <Calculator className="h-3 w-3 mr-1" />
                                          {inputs.arvComps.length} comps
                                        </Badge>
                                      )}
                                  </div>
                                  <Input
                                    id="afterRepairValue"
                                    value={formatNumber(
                                      inputs.afterRepairValue
                                    )}
                                    onChange={(e) =>
                                      handleNumberInput(
                                        "afterRepairValue",
                                        e.target.value
                                      )
                                    }
                                    className={
                                      inputs.calculatedARV &&
                                      inputs.calculatedARV > 0 &&
                                      inputs.arvComps &&
                                      inputs.arvComps.length > 0
                                        ? "border-green-500 bg-green-50/30"
                                        : ""
                                    }
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {inputs.calculatedARV &&
                                    inputs.calculatedARV > 0 &&
                                    inputs.arvComps &&
                                    inputs.arvComps.length > 0
                                      ? `Auto-populated from ${
                                          inputs.arvComps.length
                                        } comparable sale${
                                          inputs.arvComps.length > 1 ? "s" : ""
                                        }`
                                      : "Expected value after renovations"}
                                  </p>
                                </div>
                                <div>
                                  {(() => {
                                    // Bridge loan = (Purchase × LTC%) + (Rehab × Financed Rehab Budget %)
                                    const purchaseLoan =
                                      inputs.purchasePrice *
                                      (inputs.bridgeLTC / 100);
                                    const rehabLoan =
                                      inputs.rehabCost *
                                      (inputs.bridgeRehabBudgetPercent / 100);
                                    const totalBridgeLoan =
                                      purchaseLoan + rehabLoan;
                                    const arltv =
                                      inputs.afterRepairValue > 0
                                        ? (totalBridgeLoan /
                                            inputs.afterRepairValue) *
                                          100
                                        : 0;

                                    return (
                                      <div>
                                        <Label>ARLTV</Label>
                                        <div className="h-10 flex items-center justify-center rounded border-2 bg-white border-blue-600 text-blue-700">
                                          <span className="font-semibold text-lg">
                                            {arltv.toFixed(1)}%
                                          </span>
                                        </div>
                                        <p className="text-xs mt-1 text-muted-foreground">
                                          Bridge Loan / ARV
                                        </p>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-4 mb-4">
                                <div>
                                  <Label htmlFor="rehabFinancingRate">
                                    Interest Rate (%)
                                  </Label>
                                  <Input
                                    id="rehabFinancingRate"
                                    type="number"
                                    min="0"
                                    step="0.25"
                                    value={inputs.rehabFinancingRate}
                                    onChange={(e) =>
                                      handleChange(
                                        "rehabFinancingRate",
                                        Number(e.target.value)
                                      )
                                    }
                                  />
                                  {(() => {
                                    const purchaseLoan =
                                      inputs.purchasePrice *
                                      (inputs.bridgeLTC / 100);
                                    const rehabLoan =
                                      inputs.rehabCost *
                                      (inputs.bridgeRehabBudgetPercent / 100);
                                    const bridgeLoan = purchaseLoan + rehabLoan;
                                    const monthlyRate =
                                      inputs.rehabFinancingRate / 100 / 12;
                                    const interestCost =
                                      bridgeLoan *
                                      monthlyRate *
                                      inputs.rehabMonths;

                                    return (
                                      <p className="text-xs text-green-600 mt-1">
                                        Interest:{" "}
                                        <strong>
                                          {formatCurrency(interestCost)}
                                        </strong>
                                      </p>
                                    );
                                  })()}
                                </div>
                                <div>
                                  <Label htmlFor="bridgeSettlementCharges">
                                    Acquisition Costs (Bridge)
                                  </Label>
                                  <Input
                                    id="bridgeSettlementCharges"
                                    type="text"
                                    value={(() => {
                                      const defaultAmount = Math.round(
                                        inputs.purchasePrice * 0.06
                                      );
                                      const currentValue =
                                        inputs.bridgeSettlementCharges ??
                                        defaultAmount;
                                      return formatNumber(currentValue);
                                    })()}
                                    onChange={(e) => {
                                      const rawValue = e.target.value.replace(
                                        /,/g,
                                        ""
                                      );
                                      const numValue =
                                        rawValue === ""
                                          ? undefined
                                          : Number(rawValue);
                                      handleChange(
                                        "bridgeSettlementCharges",
                                        numValue
                                      );
                                    }}
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Prepopulates at 6% (1% higher due to bridge
                                    loan costs)
                                  </p>
                                </div>
                                <div></div>
                              </div>

                              {(() => {
                                const totalProjectCost =
                                  inputs.purchasePrice + inputs.rehabCost;
                                const purchaseLoan =
                                  inputs.purchasePrice *
                                  (inputs.bridgeLTC / 100);
                                const rehabLoan =
                                  inputs.rehabCost *
                                  (inputs.bridgeRehabBudgetPercent / 100);
                                const bridgeLoan = purchaseLoan + rehabLoan;
                                const downPayment =
                                  totalProjectCost - bridgeLoan;
                                const bridgeSettlementCharges =
                                  inputs.bridgeSettlementCharges ??
                                  inputs.purchasePrice * 0.06;
                                const monthlyRate =
                                  inputs.rehabFinancingRate / 100 / 12;
                                const interestCost =
                                  bridgeLoan * monthlyRate * inputs.rehabMonths;
                                const totalUpfrontCash =
                                  downPayment + bridgeSettlementCharges;
                                const cashPercent = (
                                  (totalUpfrontCash / totalProjectCost) *
                                  100
                                ).toFixed(1);

                                return (
                                  <div className="bg-green-100 border border-green-600 p-3 rounded mt-3">
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm">
                                          Total Upfront Cash:
                                        </span>
                                        <div className="text-right">
                                          <div className="font-semibold text-lg">
                                            {formatCurrency(totalUpfrontCash)}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            ({cashPercent}% of total project)
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-xs text-green-800 border-t border-green-600 pt-2 space-y-0.5">
                                        <div className="flex justify-between">
                                          <span>Down payment:</span>
                                          <span>
                                            {formatCurrency(downPayment)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>
                                            Total Bridge Settlement Charges (6%
                                            of purchase):
                                          </span>
                                          <span>
                                            {formatCurrency(
                                              bridgeSettlementCharges
                                            )}
                                          </span>
                                        </div>
                                        <div className="flex justify-between font-semibold border-t border-green-600 pt-1 mt-1">
                                          <span>
                                            Bridge loan interest only (
                                            {inputs.rehabMonths} mo @{" "}
                                            {inputs.rehabFinancingRate}%):
                                          </span>
                                          <span>
                                            {formatCurrency(interestCost)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Exit Refi Parameters */}
                            <div className="bg-purple-50 border-2 border-purple-400 rounded-lg p-4">
                              <h5 className="text-sm mb-3 pb-2 border-b border-purple-400">
                                📊 Exit Refinance (DSCR Loan)
                              </h5>

                              {/* After Repair Market Rents */}
                              <div className="mb-4 pb-4 border-b border-purple-300">
                                <Label className="mb-2 block">
                                  After Repair Market Rents
                                </Label>
                                <div className="space-y-2">
                                  {inputs.unitDetails.map((unit, index) => (
                                    <div
                                      key={index}
                                      className="grid grid-cols-[1fr_2fr_auto] gap-3 items-center bg-white p-2 rounded border border-purple-200"
                                    >
                                      <div className="text-sm">
                                        <div className="font-medium">
                                          Unit {index + 1}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {unit.beds}bd/{unit.baths}ba
                                        </div>
                                      </div>
                                      <Input
                                        id={`after-rehab-${index}`}
                                        value={formatNumber(
                                          unit.afterRehabMarketRent || 0
                                        )}
                                        onChange={(e) =>
                                          handleUnitChange(
                                            index,
                                            "afterRehabMarketRent",
                                            parseNumber(e.target.value)
                                          )
                                        }
                                        placeholder="0"
                                      />
                                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                                        was $
                                        {formatNumber(
                                          unit.marketRent ??
                                            Math.round(
                                              (unit.section8Rent || 0) / 1.1
                                            )
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="bg-purple-100 border border-purple-400 p-2 rounded mt-2 text-center">
                                  <strong>Total Monthly Rent:</strong> $
                                  {formatNumber(
                                    Math.round(
                                      inputs.unitDetails.reduce(
                                        (sum, unit) =>
                                          sum +
                                          (unit.afterRehabMarketRent || 0),
                                        0
                                      )
                                    )
                                  )}
                                </div>
                              </div>

                              {/* Taxes and Insurance */}
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <Label htmlFor="rehabPropertyTaxes">
                                    Property Taxes ($/year)
                                  </Label>
                                  <Input
                                    id="rehabPropertyTaxes"
                                    value={formatNumber(
                                      inputs.rehabPropertyTaxes
                                    )}
                                    onChange={(e) =>
                                      handleNumberInput(
                                        "rehabPropertyTaxes",
                                        e.target.value
                                      )
                                    }
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    2.0% of ARV
                                  </p>
                                </div>
                                <div>
                                  <Label htmlFor="rehabPropertyInsurance">
                                    Insurance ($/year)
                                  </Label>
                                  <Input
                                    id="rehabPropertyInsurance"
                                    value={formatNumber(
                                      inputs.rehabPropertyInsurance
                                    )}
                                    onChange={(e) =>
                                      handleNumberInput(
                                        "rehabPropertyInsurance",
                                        e.target.value
                                      )
                                    }
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {getInsuranceRateDescription(
                                      inputs.yearBuilt,
                                      inputs.totalSqft
                                    )}
                                  </p>
                                </div>
                              </div>

                              {/* Exit Refi LTV, Rate and DSCR */}
                              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-purple-300">
                                <div>
                                  <Label htmlFor="exitRefiLTV">
                                    Exit Refi LTV %
                                  </Label>
                                  <Input
                                    id="exitRefiLTV"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={inputs.exitRefiLTV}
                                    onChange={(e) =>
                                      handleChange(
                                        "exitRefiLTV",
                                        Number(e.target.value)
                                      )
                                    }
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Standard: 75%
                                  </p>
                                </div>
                                <div>
                                  <Label htmlFor="exitRefiRate">
                                    Exit Refi Rate %
                                  </Label>
                                  <Input
                                    id="exitRefiRate"
                                    type="number"
                                    min="0"
                                    max="20"
                                    step="0.125"
                                    value={inputs.exitRefiRate}
                                    onChange={(e) =>
                                      handleChange(
                                        "exitRefiRate",
                                        Number(e.target.value)
                                      )
                                    }
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    DSCR loan rate
                                  </p>
                                </div>
                                <div>
                                  <Label htmlFor="dscrAcquisitionCosts">
                                    DSCR Acquisition Costs
                                  </Label>
                                  <Input
                                    id="dscrAcquisitionCosts"
                                    type="text"
                                    value={(() => {
                                      const defaultAmount = Math.round(
                                        inputs.afterRepairValue * 0.05
                                      );
                                      const currentValue =
                                        inputs.dscrAcquisitionCosts ??
                                        defaultAmount;
                                      return formatNumber(currentValue);
                                    })()}
                                    onChange={(e) => {
                                      const rawValue = e.target.value.replace(
                                        /,/g,
                                        ""
                                      );
                                      const numValue =
                                        rawValue === ""
                                          ? undefined
                                          : Number(rawValue);
                                      handleChange(
                                        "dscrAcquisitionCosts",
                                        numValue
                                      );
                                    }}
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Prepopulates at 5% of ARV (editable)
                                  </p>
                                </div>
                                <div>
                                  {(() => {
                                    // Calculate After Repair DSCR using EXIT REFI RATE
                                    const newLoanAmount =
                                      inputs.afterRepairValue *
                                      (inputs.exitRefiLTV / 100);
                                    const monthlyRate =
                                      inputs.exitRefiRate / 100 / 12;
                                    const numPayments = inputs.loanTerm * 12;
                                    const newMonthlyPayment =
                                      (newLoanAmount *
                                        (monthlyRate *
                                          Math.pow(
                                            1 + monthlyRate,
                                            numPayments
                                          ))) /
                                      (Math.pow(1 + monthlyRate, numPayments) -
                                        1);
                                    const newAnnualDebtService =
                                      newMonthlyPayment * 12;

                                    // Calculate After Repair NOI (using after rehab market rents)
                                    const totalAfterRehabRent =
                                      inputs.unitDetails.reduce(
                                        (sum, unit) =>
                                          sum +
                                          (unit.afterRehabMarketRent || 0),
                                        0
                                      );
                                    const annualGrossIncome =
                                      totalAfterRehabRent * 12;
                                    const vacancyLoss =
                                      annualGrossIncome *
                                      (globalAssumptions.ltrVacancyMonths / 12);
                                    const effectiveIncome =
                                      annualGrossIncome - vacancyLoss;
                                    const maintenance =
                                      effectiveIncome *
                                      (globalAssumptions.maintenancePercent /
                                        100);
                                    const totalExpenses =
                                      inputs.rehabPropertyTaxes +
                                      inputs.rehabPropertyInsurance +
                                      maintenance;
                                    const noi = effectiveIncome - totalExpenses;

                                    const dscr =
                                      newAnnualDebtService > 0
                                        ? noi / newAnnualDebtService
                                        : 0;

                                    let dscrColor =
                                      "bg-red-100 border-red-500 text-red-700";
                                    let dscrStatus = "Too Low";

                                    if (dscr >= 1.1) {
                                      dscrColor =
                                        "bg-green-100 border-green-600 text-green-700";
                                      dscrStatus = "Strong";
                                    } else if (dscr >= 1.0) {
                                      dscrColor =
                                        "bg-yellow-100 border-yellow-500 text-yellow-700";
                                      dscrStatus = "Marginal";
                                    }

                                    // Calculate DSCR @ 0% Vacancy (for lender qualification)
                                    const effectiveIncomeNoVacancy =
                                      annualGrossIncome; // No vacancy deduction
                                    const maintenanceNoVacancy =
                                      effectiveIncomeNoVacancy *
                                      (globalAssumptions.maintenancePercent /
                                        100);
                                    const totalExpensesNoVacancy =
                                      inputs.rehabPropertyTaxes +
                                      inputs.rehabPropertyInsurance +
                                      maintenanceNoVacancy;
                                    const noiNoVacancy =
                                      effectiveIncomeNoVacancy -
                                      totalExpensesNoVacancy;
                                    const dscrNoVacancy =
                                      newAnnualDebtService > 0
                                        ? noiNoVacancy / newAnnualDebtService
                                        : 0;

                                    let dscrNoVacancyColor =
                                      "bg-red-100 border-red-500 text-red-700";
                                    let dscrNoVacancyStatus = "Too Low";

                                    if (dscrNoVacancy >= 1.1) {
                                      dscrNoVacancyColor =
                                        "bg-green-100 border-green-600 text-green-700";
                                      dscrNoVacancyStatus = "Strong";
                                    } else if (dscrNoVacancy >= 1.0) {
                                      dscrNoVacancyColor =
                                        "bg-yellow-100 border-yellow-500 text-yellow-700";
                                      dscrNoVacancyStatus = "Marginal";
                                    }

                                    return (
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <Label>After Repair DSCR</Label>
                                          <div
                                            className={`h-10 flex items-center justify-center rounded border-2 ${dscrColor}`}
                                          >
                                            <span className="font-semibold text-lg">
                                              {dscr.toFixed(2)}
                                            </span>
                                          </div>
                                          <p
                                            className={`text-xs mt-1 ${
                                              dscr < 1.0
                                                ? "text-red-600"
                                                : dscr < 1.1
                                                ? "text-yellow-600"
                                                : "text-green-600"
                                            }`}
                                          >
                                            {dscrStatus}
                                          </p>
                                        </div>
                                        <div>
                                          <Label>DSCR @ 0% Vacancy</Label>
                                          <div
                                            className={`h-10 flex items-center justify-center rounded border-2 ${dscrNoVacancyColor}`}
                                          >
                                            <span className="font-semibold text-lg">
                                              {dscrNoVacancy.toFixed(2)}
                                            </span>
                                          </div>
                                          <p
                                            className={`text-xs mt-1 ${
                                              dscrNoVacancy < 1.0
                                                ? "text-red-600"
                                                : dscrNoVacancy < 1.1
                                                ? "text-yellow-600"
                                                : "text-green-600"
                                            }`}
                                          >
                                            {dscrNoVacancyStatus}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Selling Costs */}
                              <div className="mt-4 pt-4 border-t border-purple-300">
                                <Label htmlFor="sellClosingCosts">
                                  Selling Costs % (if selling)
                                </Label>
                                <Input
                                  id="sellClosingCosts"
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={inputs.sellClosingCosts}
                                  onChange={(e) =>
                                    handleChange(
                                      "sellClosingCosts",
                                      Number(e.target.value)
                                    )
                                  }
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Agent fees, closing costs (typically 8-10%)
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Side: Results */}
              <div className="xl:col-span-8">
                <div className="mb-6">
                  <h2>Live Analysis Results</h2>
                  <p className="text-muted-foreground">
                    {inputs.address || "Enter an address"} • {inputs.units} unit
                    {inputs.units > 1 ? "s" : ""} •{" "}
                    {formatNumber(inputs.totalSqft)} sqft
                  </p>
                </div>

                {/* Rehab Exit Strategy Comparison */}
                {inputs.isRehab && inputs.rehabCost > 0 && (
                  <Card className="mb-6 border-orange-300 bg-orange-50/30">
                    <CardHeader>
                      <CardTitle>Rehab Exit Strategy Comparison</CardTitle>
                      <CardDescription>
                        Compare selling vs refinancing after renovation
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const { sellScenario, refiScenario } =
                          calculateRehabScenarios(inputs);

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* SELL Scenario */}
                            <div className="bg-white border-2 border-red-200 rounded-lg p-4">
                              <h4 className="mb-4 flex items-center gap-2">
                                Sell After Rehab
                              </h4>
                              <div className="space-y-3">
                                {(() => {
                                  // Calculate real down payment based on bridge loan
                                  const totalProjectCost =
                                    inputs.purchasePrice + inputs.rehabCost;
                                  // Bridge loan = (Purchase × LTC%) + (Rehab × Financed Rehab Budget %)
                                  const purchaseLoan =
                                    inputs.purchasePrice *
                                    (inputs.bridgeLTC / 100);
                                  const rehabLoan =
                                    inputs.rehabCost *
                                    (inputs.bridgeRehabBudgetPercent / 100);
                                  const bridgeLoan = purchaseLoan + rehabLoan;
                                  const realDownPayment =
                                    totalProjectCost - bridgeLoan;

                                  return (
                                    <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                                      <div className="flex justify-between">
                                        <span>Down Payment (cash)</span>
                                        <span>
                                          {formatCurrency(realDownPayment)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>
                                          Total Bridge Settlement Charges (6% of
                                          purchase)
                                        </span>
                                        <span>
                                          {formatCurrency(
                                            sellScenario.entryPointsCost
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>
                                          Carrying Costs ({inputs.rehabMonths}mo
                                          interest+taxes+insurance)
                                        </span>
                                        <span>
                                          {formatCurrency(
                                            sellScenario.rehabCarryingCosts
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-muted-foreground border-t pt-1 mt-1">
                                        <span>
                                          Bridge Loan ({inputs.bridgeLTC}% LTC)
                                        </span>
                                        <span>${formatNumber(bridgeLoan)}</span>
                                      </div>
                                      <div className="flex justify-between text-muted-foreground text-[10px]">
                                        <span className="italic">
                                          • Purchase + Rehab financed
                                        </span>
                                        <span className="italic">
                                          ${formatNumber(inputs.rehabCost)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}
                                <div className="flex justify-between border-y py-3 bg-blue-50 px-2">
                                  <span className="font-semibold text-lg">
                                    💰 Total Cash in Deal
                                  </span>
                                  <span className="font-semibold text-lg text-blue-700">
                                    {formatCurrency(
                                      sellScenario.totalCashInvested
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Sale Price (ARV)
                                  </span>
                                  <span>
                                    {formatCurrency(inputs.afterRepairValue)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>
                                    - Selling Costs ({inputs.sellClosingCosts}%)
                                  </span>
                                  <span className="text-red-600">
                                    -
                                    {formatCurrency(sellScenario.sellingCosts!)}
                                  </span>
                                </div>
                                <div className="border-t pt-2 flex justify-between">
                                  <span className="text-muted-foreground">
                                    Net Profit
                                  </span>
                                  <span
                                    className={
                                      sellScenario.netProfit! >= 0
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }
                                  >
                                    {formatCurrency(sellScenario.netProfit!)}
                                  </span>
                                </div>
                                {(() => {
                                  const roi =
                                    (sellScenario.netProfit! /
                                      sellScenario.totalCashInvested) *
                                    100;
                                  let bgColor =
                                    "bg-red-100 border-2 border-red-400";
                                  let textColor = "text-red-700";
                                  let label = "Weak ROI";

                                  if (roi >= 20) {
                                    bgColor =
                                      "bg-green-100 border-2 border-green-400";
                                    textColor = "text-green-700";
                                    label = "Strong ROI";
                                  } else if (roi >= 10) {
                                    bgColor =
                                      "bg-yellow-100 border-2 border-yellow-400";
                                    textColor = "text-yellow-700";
                                    label = "Moderate ROI";
                                  }

                                  return (
                                    <div className={`${bgColor} p-3 rounded`}>
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm">{label}</span>
                                        <span
                                          className={`text-2xl font-bold ${textColor}`}
                                        >
                                          {roi.toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* REFI Scenario */}
                            <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
                              <h4 className="mb-4 flex items-center gap-2">
                                <span className="text-blue-600">🏦</span>{" "}
                                Refinance & Hold (BRRRR)
                              </h4>
                              <div className="space-y-3">
                                {(() => {
                                  // Calculate real down payment based on bridge loan
                                  const totalProjectCost =
                                    inputs.purchasePrice + inputs.rehabCost;
                                  // Bridge loan = (Purchase × LTC%) + (Rehab × Financed Rehab Budget %)
                                  const purchaseLoan =
                                    inputs.purchasePrice *
                                    (inputs.bridgeLTC / 100);
                                  const rehabLoan =
                                    inputs.rehabCost *
                                    (inputs.bridgeRehabBudgetPercent / 100);
                                  const bridgeLoan = purchaseLoan + rehabLoan;
                                  const realDownPayment =
                                    totalProjectCost - bridgeLoan;

                                  return (
                                    <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                                      <div className="flex justify-between">
                                        <span>Down Payment (cash)</span>
                                        <span>
                                          {formatCurrency(realDownPayment)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>
                                          Total Bridge Settlement Charges (6% of
                                          purchase)
                                        </span>
                                        <span>
                                          {formatCurrency(
                                            refiScenario.entryPointsCost
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>
                                          Carrying Costs ({inputs.rehabMonths}mo
                                          interest+taxes+insurance)
                                        </span>
                                        <span>
                                          {formatCurrency(
                                            refiScenario.rehabCarryingCosts
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-muted-foreground border-t pt-1 mt-1">
                                        <span>
                                          Bridge Loan ({inputs.bridgeLTC}% LTC)
                                        </span>
                                        <span>${formatNumber(bridgeLoan)}</span>
                                      </div>
                                      <div className="flex justify-between text-muted-foreground text-[10px]">
                                        <span className="italic">
                                          • Purchase + Rehab financed
                                        </span>
                                        <span className="italic">
                                          ${formatNumber(inputs.rehabCost)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}
                                <div className="flex justify-between border-y py-3 bg-blue-50 px-2">
                                  <span className="font-semibold text-lg">
                                    💰 Total Cash in Deal
                                  </span>
                                  <span className="font-semibold text-lg text-blue-700">
                                    {formatCurrency(
                                      refiScenario.totalCashInvested
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    New Loan ({inputs.exitRefiLTV}% LTV)
                                  </span>
                                  <span>
                                    {formatCurrency(
                                      refiScenario.newLoanAmount!
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>
                                    - DSCR Acquisition Costs (5% of ARV)
                                  </span>
                                  <span className="text-red-600">
                                    -
                                    {formatCurrency(
                                      refiScenario.exitPointsCost
                                    )}
                                  </span>
                                </div>
                                <div className="border-t pt-2 flex justify-between">
                                  <span className="text-muted-foreground">
                                    Cash Out on Refi
                                  </span>
                                  <span
                                    className={
                                      refiScenario.cashOutAmount! >= 0
                                        ? "text-green-600"
                                        : "text-orange-600"
                                    }
                                  >
                                    {formatCurrency(
                                      refiScenario.cashOutAmount!
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    New Monthly Payment
                                  </span>
                                  <span>
                                    {formatCurrency(
                                      refiScenario.newMonthlyPayment!
                                    )}
                                  </span>
                                </div>
                                {(() => {
                                  const capitalLeft =
                                    refiScenario.totalCashInvested -
                                    refiScenario.cashOutAmount!;
                                  const cashOutPercent =
                                    (refiScenario.cashOutAmount! /
                                      refiScenario.totalCashInvested) *
                                    100;
                                  let bgColor =
                                    "bg-red-100 border-2 border-red-400";
                                  let textColor = "text-red-700";
                                  let label = "Low Recovery";
                                  let statusLine = "";

                                  if (cashOutPercent >= 100) {
                                    bgColor =
                                      "bg-green-100 border-2 border-green-500";
                                    textColor = "text-green-700";
                                    label = "Perfect BRRRR";
                                    statusLine =
                                      capitalLeft <= 0
                                        ? "All cash recovered!"
                                        : "Full recovery achieved";
                                  } else if (cashOutPercent >= 80) {
                                    bgColor =
                                      "bg-green-100 border-2 border-green-400";
                                    textColor = "text-green-700";
                                    label = "Excellent Recovery";
                                    statusLine = "Most capital recovered";
                                  } else if (cashOutPercent >= 50) {
                                    bgColor =
                                      "bg-yellow-100 border-2 border-yellow-400";
                                    textColor = "text-yellow-700";
                                    label = "Good Recovery";
                                    statusLine = "Partial capital recovered";
                                  } else {
                                    statusLine = "Most capital still tied up";
                                  }

                                  return (
                                    <div className={`${bgColor} p-3 rounded`}>
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm">{label}</span>
                                        <span
                                          className={`text-lg font-bold ${textColor}`}
                                        >
                                          {cashOutPercent.toFixed(0)}%
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-xs mb-1">
                                        <span>Capital Left In:</span>
                                        <span className="font-semibold">
                                          {capitalLeft > 0
                                            ? formatCurrency(capitalLeft)
                                            : "$0"}
                                        </span>
                                      </div>
                                      <div className="text-xs text-muted-foreground border-t border-current/20 pt-1">
                                        <div>{statusLine}</div>
                                        <div>
                                          +{" "}
                                          {formatCurrency(
                                            Math.round(
                                              refiScenario.equityRetained!
                                            )
                                          )}{" "}
                                          equity + cash flow
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}

                <Tabs
                  value={selectedStrategy}
                  onValueChange={(v: string) => {
                    setSelectedStrategy(v as Strategy);
                    setHasManuallySelectedTab(true);
                  }}
                  className="space-y-6"
                >
                  <TabsList
                    className={`grid w-full ${
                      inputs.isRehab && rehabResults
                        ? "max-w-2xl grid-cols-4"
                        : "max-w-md grid-cols-3"
                    }`}
                  >
                    <TabsTrigger
                      value="ltr"
                      className="flex items-center gap-2"
                    >
                      <Home className="h-4 w-4" />
                      Long-Term
                    </TabsTrigger>
                    <TabsTrigger
                      value="section8"
                      className="flex items-center gap-2"
                    >
                      <Building2 className="h-4 w-4" />
                      Section 8
                    </TabsTrigger>
                    <TabsTrigger
                      value="airbnb"
                      className="flex items-center gap-2"
                    >
                      <Palmtree className="h-4 w-4" />
                      Airbnb
                    </TabsTrigger>
                    {inputs.isRehab && rehabResults && (
                      <TabsTrigger
                        value="rehab"
                        className="flex items-center gap-2"
                      >
                        <Hammer className="h-4 w-4" />
                        Rehab/Refi
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="ltr" className="space-y-6">
                    {renderYear1Summary(
                      ltrResults,
                      "Long-Term Rental",
                      <Home className="h-5 w-5" />,
                      "ltr"
                    )}
                    {renderProjectionTable(ltrResults)}
                    {renderCharts(ltrResults)}
                  </TabsContent>

                  <TabsContent value="section8" className="space-y-6">
                    {renderYear1Summary(
                      section8Results,
                      "Section 8 Rental",
                      <Building2 className="h-5 w-5" />,
                      "section8"
                    )}
                    {renderProjectionTable(section8Results)}
                    {renderCharts(section8Results)}
                  </TabsContent>

                  <TabsContent value="airbnb" className="space-y-6">
                    {renderYear1Summary(
                      airbnbResults,
                      "Short-Term Rental (Airbnb)",
                      <Palmtree className="h-5 w-5" />,
                      "airbnb"
                    )}
                    {renderProjectionTable(airbnbResults)}
                    {renderCharts(airbnbResults)}
                  </TabsContent>

                  {inputs.isRehab && rehabResults && (
                    <TabsContent value="rehab" className="space-y-6">
                      {renderYear1Summary(
                        rehabResults,
                        "Rehab & Refinance (BRRRR)",
                        <Hammer className="h-5 w-5" />,
                        "rehab"
                      )}
                      {renderProjectionTable(rehabResults)}
                      {renderCharts(rehabResults)}
                    </TabsContent>
                  )}
                </Tabs>

                {/* Max Offer Banner */}
                {inputs.maxOffer && inputs.maxOffer > 0 && (
                  <div className="mt-6 bg-gradient-to-r from-amber-100 to-amber-50 border-2 border-amber-500 rounded-lg p-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Star className="h-8 w-8 text-amber-600 fill-amber-600" />
                        <div>
                          <div className="text-sm text-amber-800">
                            MAX OFFER (LOCKED IN)
                          </div>
                          <div className="text-3xl font-bold text-amber-900">
                            {formatCurrency(inputs.maxOffer)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-amber-700">
                          vs Purchase Price
                        </div>
                        <div
                          className={`text-lg font-semibold ${
                            inputs.maxOffer < inputs.purchasePrice
                              ? "text-green-700"
                              : "text-red-700"
                          }`}
                        >
                          {inputs.maxOffer < inputs.purchasePrice ? "▼" : "▲"}{" "}
                          {formatCurrency(
                            Math.abs(inputs.purchasePrice - inputs.maxOffer)
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comparison Widget */}
                <Card className="mt-6 bg-blue-50 border-blue-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Strategy Comparison</CardTitle>
                        <CardDescription>
                          Year 1 & Year {comparisonYear} Cash-on-Cash +{" "}
                          {comparisonYear}-Year Cumulative Returns
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {([3, 5, 7, 10] as const).map((year) => (
                          <Button
                            key={year}
                            variant={
                              comparisonYear === year ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setComparisonYear(year)}
                            className={
                              comparisonYear === year ? "bg-blue-600" : ""
                            }
                          >
                            {year}Y
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      // Use Cash-on-Cash % for primary comparison (factors in upfront capital)
                      const ltrCashOnCash =
                        ltrResults.year1Summary.cashOnCash || 0;
                      const section8CashOnCash =
                        section8Results.year1Summary.cashOnCash || 0;
                      const airbnbCashOnCash =
                        airbnbResults.year1Summary.cashOnCash || 0;
                      const rehabRefiCashOnCash =
                        rehabResults?.year1Summary.cashOnCash || 0;

                      // Calculate Rehab/Sell ROI (using memoized rehabScenarios)
                      let rehabSellROI = 0;
                      let rehabSellProfit = 0;
                      if (rehabScenarios) {
                        const { sellScenario } = rehabScenarios;
                        rehabSellROI =
                          sellScenario.totalCashInvested > 0
                            ? (sellScenario.netProfit! /
                                sellScenario.totalCashInvested) *
                              100
                            : 0;
                        rehabSellProfit = sellScenario.netProfit || 0;
                      }

                      // Get cumulative returns for the selected year
                      const yearIndex = comparisonYear - 1;
                      const ltrReturn =
                        ltrResults.projections[yearIndex]?.cumulativeReturn ||
                        0;
                      const section8Return =
                        section8Results.projections[yearIndex]
                          ?.cumulativeReturn || 0;
                      const airbnbReturn =
                        airbnbResults.projections[yearIndex]
                          ?.cumulativeReturn || 0;
                      const rehabRefiReturn =
                        rehabResults?.projections[yearIndex]
                          ?.cumulativeReturn || 0;

                      // Calculate CoC % for selected year (cumulative cash flow / initial investment)
                      const ltrCoCYear = ltrResults.projections[yearIndex]
                        ? (ltrResults.projections[yearIndex]
                            .cumulativeCashFlow /
                            (inputs.purchasePrice * (inputs.downPayment / 100) +
                              inputs.purchasePrice *
                                (inputs.acquisitionCosts / 100))) *
                          100
                        : 0;
                      const section8CoCYear = section8Results.projections[
                        yearIndex
                      ]
                        ? (section8Results.projections[yearIndex]
                            .cumulativeCashFlow /
                            (inputs.purchasePrice * (inputs.downPayment / 100) +
                              inputs.purchasePrice *
                                (inputs.acquisitionCosts / 100))) *
                          100
                        : 0;
                      const airbnbCoCYear = airbnbResults.projections[yearIndex]
                        ? (airbnbResults.projections[yearIndex]
                            .cumulativeCashFlow /
                            (inputs.purchasePrice * (inputs.downPayment / 100) +
                              inputs.purchasePrice *
                                (inputs.acquisitionCosts / 100) +
                              inputs.setupFurnishCost)) *
                          100
                        : 0;

                      // ===== 3-YEAR TOTAL ROI COMPARISON (APPLES TO APPLES) =====
                      // Compare all strategies based on 3-year total return trajectory
                      const threeYearIndex = 2; // Year 3 (index 2)

                      // Calculate initial investment for each strategy
                      const ltrInitialInvestment =
                        inputs.purchasePrice * (inputs.downPayment / 100) +
                        inputs.purchasePrice * (inputs.acquisitionCosts / 100);
                      const section8InitialInvestment = ltrInitialInvestment;
                      const airbnbInitialInvestment =
                        ltrInitialInvestment + inputs.setupFurnishCost;
                      const rehabRefiInitialInvestment =
                        rehabScenarios?.refiScenario.capitalLeftInDeal || 0;

                      // Calculate 3-year total ROI % for rental strategies
                      const ltr3YearReturn =
                        ltrResults.projections[threeYearIndex]
                          ?.cumulativeReturn || 0;
                      const ltr3YearROI =
                        ltrInitialInvestment > 0
                          ? (ltr3YearReturn / ltrInitialInvestment) * 100
                          : 0;

                      const section83YearReturn =
                        section8Results.projections[threeYearIndex]
                          ?.cumulativeReturn || 0;
                      const section83YearROI =
                        section8InitialInvestment > 0
                          ? (section83YearReturn / section8InitialInvestment) *
                            100
                          : 0;

                      const airbnb3YearReturn =
                        airbnbResults.projections[threeYearIndex]
                          ?.cumulativeReturn || 0;
                      const airbnb3YearROI =
                        airbnbInitialInvestment > 0
                          ? (airbnb3YearReturn / airbnbInitialInvestment) * 100
                          : 0;

                      const rehabRefi3YearReturn =
                        rehabResults?.projections[threeYearIndex]
                          ?.cumulativeReturn || 0;
                      const rehabRefi3YearROI =
                        rehabRefiInitialInvestment > 0
                          ? (rehabRefi3YearReturn /
                              rehabRefiInitialInvestment) *
                            100
                          : 0;

                      // Rehab/Sell: One-time ROI (already a %, no time dimension)
                      const rehabSell3YearROI = rehabSellROI; // Already in %

                      // Find the best strategy based on 3-year total ROI %
                      const strategies = [
                        { name: "ltr", value: ltr3YearROI },
                        { name: "section8", value: section83YearROI },
                        { name: "airbnb", value: airbnb3YearROI },
                        { name: "rehabSell", value: rehabSell3YearROI },
                        { name: "rehabRefi", value: rehabRefi3YearROI },
                      ];

                      // Sort by value descending and get the best
                      const bestStrategy = strategies.reduce((best, current) =>
                        current.value > best.value ? current : best
                      );

                      // Only mark as "best" if it's actually profitable (positive)
                      const hasProfitableStrategy = bestStrategy.value > 0;
                      const isBestStrategy = (strategyName: string) =>
                        hasProfitableStrategy &&
                        bestStrategy.name === strategyName;

                      // Debug: Log the comparison values (helpful for troubleshooting)
                      if (
                        typeof window !== "undefined" &&
                        (window as any).DEBUG_COC
                      ) {
                        console.log(
                          "🔍 Strategy Comparison Debug (3-Year Total ROI):",
                          {
                            "LTR 3-Year ROI": ltr3YearROI.toFixed(2) + "%",
                            "Section 8 3-Year ROI":
                              section83YearROI.toFixed(2) + "%",
                            "Airbnb 3-Year ROI":
                              airbnb3YearROI.toFixed(2) + "%",
                            "Rehab/Sell ROI":
                              rehabSell3YearROI.toFixed(2) + "%",
                            "Rehab/Refi 3-Year ROI":
                              rehabRefi3YearROI.toFixed(2) + "%",
                            bestStrategy: bestStrategy.name,
                            bestValue: bestStrategy.value.toFixed(2) + "%",
                            hasProfitableStrategy,
                          }
                        );
                      }

                      return (
                        <div
                          className={`grid grid-cols-1 gap-4 ${
                            inputs.isRehab && inputs.rehabCost > 0
                              ? "md:grid-cols-5"
                              : "md:grid-cols-3"
                          }`}
                        >
                          <div
                            className={`p-4 rounded-lg border-2 ${
                              isBestStrategy("ltr")
                                ? "bg-green-100 border-green-500"
                                : "bg-white border-gray-200"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Home className="h-4 w-4" />
                                <p className="text-sm">Long-Term</p>
                              </div>
                              {isBestStrategy("ltr") && (
                                <Badge
                                  variant="default"
                                  className="bg-green-600 text-xs"
                                >
                                  BEST ROI
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-1">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Year 1 CoC
                                </p>
                                <p className="text-xl font-semibold">
                                  {ltrCashOnCash.toFixed(1)}%
                                </p>
                              </div>
                              {comparisonYear > 1 && (
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Year {comparisonYear} CoC
                                  </p>
                                  <p className="text-lg font-semibold">
                                    {ltrCoCYear.toFixed(1)}%
                                  </p>
                                </div>
                              )}
                              <div className="pt-1 border-t">
                                <p className="text-xs text-muted-foreground">
                                  {comparisonYear}-Year Total Return
                                </p>
                                <p className="text-lg font-semibold">
                                  {formatCurrency(ltrReturn)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div
                            className={`p-4 rounded-lg border-2 ${
                              isBestStrategy("section8")
                                ? "bg-green-100 border-green-500"
                                : "bg-white border-gray-200"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                <p className="text-sm">Section 8</p>
                              </div>
                              {isBestStrategy("section8") && (
                                <Badge
                                  variant="default"
                                  className="bg-green-600 text-xs"
                                >
                                  BEST ROI
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-1">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Year 1 CoC
                                </p>
                                <p className="text-xl font-semibold">
                                  {section8CashOnCash.toFixed(1)}%
                                </p>
                              </div>
                              {comparisonYear > 1 && (
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Year {comparisonYear} CoC
                                  </p>
                                  <p className="text-lg font-semibold">
                                    {section8CoCYear.toFixed(1)}%
                                  </p>
                                </div>
                              )}
                              <div className="pt-1 border-t">
                                <p className="text-xs text-muted-foreground">
                                  {comparisonYear}-Year Total Return
                                </p>
                                <p className="text-lg font-semibold">
                                  {formatCurrency(section8Return)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div
                            className={`p-4 rounded-lg border-2 ${
                              isBestStrategy("airbnb")
                                ? "bg-green-100 border-green-500"
                                : "bg-white border-gray-200"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Palmtree className="h-4 w-4" />
                                <p className="text-sm">Airbnb</p>
                              </div>
                              {isBestStrategy("airbnb") && (
                                <Badge
                                  variant="default"
                                  className="bg-green-600 text-xs"
                                >
                                  BEST ROI
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-1">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Year 1 CoC
                                </p>
                                <p className="text-xl font-semibold">
                                  {airbnbCashOnCash.toFixed(1)}%
                                </p>
                              </div>
                              {comparisonYear > 1 && (
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Year {comparisonYear} CoC
                                  </p>
                                  <p className="text-lg font-semibold">
                                    {airbnbCoCYear.toFixed(1)}%
                                  </p>
                                </div>
                              )}
                              <div className="pt-1 border-t">
                                <p className="text-xs text-muted-foreground">
                                  {comparisonYear}-Year Total Return
                                </p>
                                <p className="text-lg font-semibold">
                                  {formatCurrency(airbnbReturn)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {inputs.isRehab && inputs.rehabCost > 0 && (
                            <>
                              <div
                                className={`p-4 rounded-lg border-2 ${
                                  isBestStrategy("rehabSell")
                                    ? "bg-green-100 border-green-500"
                                    : "bg-white border-gray-200"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Hammer className="h-4 w-4 text-red-600" />
                                    <p className="text-sm">Rehab/Sell</p>
                                  </div>
                                  {isBestStrategy("rehabSell") && (
                                    <Badge
                                      variant="default"
                                      className="bg-green-600 text-xs"
                                    >
                                      BEST ROI
                                    </Badge>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      ROI (One-Time)
                                    </p>
                                    <p className="text-xl font-semibold">
                                      {rehabSellROI.toFixed(1)}%
                                    </p>
                                  </div>
                                  <div className="pt-1 border-t">
                                    <p className="text-xs text-muted-foreground">
                                      Net Profit (Exit)
                                    </p>
                                    <p className="text-lg font-semibold">
                                      {formatCurrency(rehabSellProfit)}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {rehabResults && (
                                <div
                                  className={`p-4 rounded-lg border-2 ${
                                    isBestStrategy("rehabRefi")
                                      ? "bg-green-100 border-green-500"
                                      : "bg-white border-gray-200"
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Hammer className="h-4 w-4 text-blue-600" />
                                      <p className="text-sm">Rehab/Refi</p>
                                    </div>
                                    {isBestStrategy("rehabRefi") && (
                                      <Badge
                                        variant="default"
                                        className="bg-green-600 text-xs"
                                      >
                                        BEST ROI
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        Cash-on-Cash ROI
                                      </p>
                                      <p className="text-xl font-semibold">
                                        {rehabRefiCashOnCash.toFixed(1)}%
                                      </p>
                                    </div>
                                    <div className="pt-1 border-t">
                                      <p className="text-xs text-muted-foreground">
                                        Year {comparisonYear} Total Return
                                      </p>
                                      <p className="text-lg font-semibold">
                                        {formatCurrency(rehabRefiReturn)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick Start from Zillow Dialog */}
      <Dialog
        open={showZillowQuickStart}
        onOpenChange={setShowZillowQuickStart}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-purple-600" />
              Paste from Zillow
            </DialogTitle>
            <DialogDescription>
              Paste a Zillow "For Sale" listing to auto-fill all property
              details
            </DialogDescription>
          </DialogHeader>

          {/* Button at top */}
          <div className="flex gap-2 justify-end pb-2 border-b">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowZillowQuickStart(false);
                setZillowQuickStartData("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleZillowQuickStart}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={!zillowQuickStartData.trim()}
            >
              <Home className="mr-2 h-4 w-4" />
              Auto-Fill Fields
            </Button>
          </div>

          <div className="space-y-4 overflow-y-auto flex-1">
            <div>
              <Label htmlFor="zillow-data">
                Zillow Listing (Ctrl+A to select all, Ctrl+C to copy)
              </Label>
              <Textarea
                id="zillow-data"
                value={zillowQuickStartData}
                onChange={(e) => setZillowQuickStartData(e.target.value)}
                placeholder="Go to Zillow For Sale listing → Select All (Ctrl+A) → Copy (Ctrl+C) → Paste here&#10;&#10;Extracts: Address, Price, Beds, Baths, Sqft, Year, Property Type, Units, Zestimate, Rent Estimate"
                rows={6}
                className="font-mono text-sm"
                autoFocus
              />
            </div>

            {/* Preview parsed data */}
            {zillowQuickStartData.trim() &&
              (() => {
                const parsed = parseZillowForSale(zillowQuickStartData);
                if (parsed && parsed.address) {
                  return (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="text-sm text-green-900 mb-3 flex items-center gap-2">
                        <strong>Preview - Data Ready to Import</strong>
                      </h4>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        {parsed.address && (
                          <div>
                            <span className="text-muted-foreground">
                              Address:
                            </span>{" "}
                            <strong>{parsed.address}</strong>
                          </div>
                        )}
                        {parsed.purchasePrice && (
                          <div>
                            <span className="text-muted-foreground">
                              Purchase Price:
                            </span>{" "}
                            <strong>
                              {formatCurrency(parsed.purchasePrice)}
                            </strong>
                          </div>
                        )}
                        {parsed.beds !== undefined && (
                          <div>
                            <span className="text-muted-foreground">
                              Total Beds:
                            </span>{" "}
                            <strong>{parsed.beds}</strong>
                          </div>
                        )}
                        {parsed.baths !== undefined && (
                          <div>
                            <span className="text-muted-foreground">
                              Total Baths:
                            </span>{" "}
                            <strong>{parsed.baths}</strong>
                          </div>
                        )}
                        {parsed.sqft && (
                          <div>
                            <span className="text-muted-foreground">
                              Square Feet:
                            </span>{" "}
                            <strong>{parsed.sqft.toLocaleString()}</strong>
                          </div>
                        )}
                        {parsed.yearBuilt && (
                          <div>
                            <span className="text-muted-foreground">
                              Year Built:
                            </span>{" "}
                            <strong>{parsed.yearBuilt}</strong>
                          </div>
                        )}
                        {parsed.propertyType && (
                          <div>
                            <span className="text-muted-foreground">
                              Property Type:
                            </span>{" "}
                            <strong>{parsed.propertyType}</strong>
                          </div>
                        )}
                        {parsed.units && (
                          <div>
                            <span className="text-muted-foreground">
                              Units:
                            </span>{" "}
                            <strong>
                              {parsed.units} unit{parsed.units > 1 ? "s" : ""}
                            </strong>
                          </div>
                        )}
                        {parsed.zestimate && parsed.zestimate >= 10000 && (
                          <div>
                            <span className="text-muted-foreground">
                              Zestimate:
                            </span>{" "}
                            <strong>{formatCurrency(parsed.zestimate)}</strong>
                          </div>
                        )}
                        {parsed.rentZestimate &&
                          parsed.rentZestimate >= 500 && (
                            <div>
                              <span className="text-muted-foreground">
                                Rent Estimate:
                              </span>{" "}
                              <strong>
                                {formatCurrency(parsed.rentZestimate)}/mo
                              </strong>
                            </div>
                          )}
                        {parsed.description && (
                          <div className="col-span-2 pt-2 border-t border-green-300">
                            <span className="text-muted-foreground">
                              Description:
                            </span>{" "}
                            <strong className="text-green-900">
                              {parsed.description.substring(0, 200)}
                              {parsed.description.length > 200 ? "..." : ""}
                            </strong>
                            {parsed.description.length > 200 && (
                              <span className="text-muted-foreground ml-2">
                                ({parsed.description.length} chars total)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                } else if (zillowQuickStartData.length > 100) {
                  return (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-xs text-yellow-800">
                        <strong>Parsing incomplete.</strong> Make sure you
                        copied the full Zillow "For Sale" listing page. Address,
                        price, beds, baths, and sqft are required.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-xs text-purple-800">
                <strong>✨ Auto-fills:</strong> Address • Purchase Price •
                Beds/Baths per Unit • Square Footage • Year Built • Property
                Type • Section 8 Rents (by ZIP) • STR Revenue Estimate •
                Property Taxes & Insurance
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Paste Dialog */}
      <BulkPasteDialog
        open={showBulkPaste}
        onOpenChange={setShowBulkPaste}
        loadDealsFromAPI={loadDealsFromAPI}
      />
    </div>
  );
}
