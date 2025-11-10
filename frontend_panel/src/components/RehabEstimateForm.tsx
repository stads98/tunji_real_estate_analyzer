import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { DealNotes } from "../types/deal";
import {
  Calculator,
  AlertCircle,
  Copy,
  Check,
  Info,
  Target,
  Wand2,
  Trash2,
} from "lucide-react";
import {
  analyzePropertyCondition,
  RehabEstimateResult,
} from "../utils/intelligentRehabEstimator";
import { formatCurrency } from "../utils/calculations";
import { toast } from "sonner";
import { LineItemEditor, LineItem } from "./LineItemEditor";
import { generateLineItems } from "../utils/lineItemGenerator";
import {
  calculateConfidence,
  ConfidenceResult,
} from "../utils/confidenceCalculator";
import {
  calculateCostRange,
  CostRangeResult,
} from "../utils/costRangeCalculator";
import {
  applySmartDefaults,
  getHiddenAssumptions,
} from "../utils/smartDefaults";
import { parseChatGPTResponse } from "../utils/chatgptParser";
import { getDefaultNotes } from "../utils/defaultNotes";

interface RehabEstimateFormProps {
  notes: DealNotes;
  onChange: (notes: DealNotes) => void;
  totalSqft?: number;
  units?: number;
  yearBuilt?: number;
  onRehabEstimateGenerated?: (estimate: RehabEstimateResult) => void;
  onRehabCostChange?: (cost: number) => void;
  // NEW: Auto-save integration props
  currentDealId?: string | null;
  onAutoSaveTrigger?: () => void;
  autoSaveEnabled?: boolean;
}

export function RehabEstimateForm({
  notes,
  onChange,
  totalSqft = 1500,
  units = 1,
  yearBuilt,
  onRehabEstimateGenerated,
  onRehabCostChange,
  // NEW: Auto-save props
  onAutoSaveTrigger,
  autoSaveEnabled = true,
}: RehabEstimateFormProps) {
  const [localNotes, setLocalNotes] = useState<DealNotes>(notes);
  const [estimateResult, setEstimateResult] =
    useState<RehabEstimateResult | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>(notes.lineItems || []);
  const [isFinalized, setIsFinalized] = useState(
    notes.isScopeFinalized || false
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<ConfidenceResult | null>(null);
  const [costRange, setCostRange] = useState<CostRangeResult | null>(null);
  const [showParseDialog, setShowParseDialog] = useState(false);
  const [parseText, setParseText] = useState("");
  const [showClearConfirmDialog, setShowClearConfirmDialog] = useState(false);

  // Add these at the top of your component
  const prevNotesRef = useRef<DealNotes>(localNotes);
  const isManualUpdate = useRef(false);

  // Helper function to detect significant changes
  const hasSignificantChanges = (
    current: DealNotes,
    previous: DealNotes
  ): boolean => {
    if (!previous) return true;

    const significantFields = [
      "overallCondition",
      "roof.condition",
      "foundation.condition",
      "hvac.condition",
      "plumbing.condition",
      "electrical.condition",
      "kitchen.condition",
      "bathrooms",
      "interior.flooring",
      "interior.walls",
      "exterior.siding",
      "exterior.windows",
      "exterior.doors",
      "additionalIssues",
    ];

    return significantFields.some((field) => {
      const keys = field.split(".");
      let currentVal: any = current;
      let prevVal: any = previous;

      for (const key of keys) {
        currentVal = currentVal?.[key];
        prevVal = prevVal?.[key];
      }

      return currentVal !== prevVal;
    });
  };

  // Track changes for auto-save
  const handleChangeWithAutoSave = useCallback(
    (newNotes: DealNotes) => {
      setLocalNotes(newNotes);

      // Immediately notify parent of changes
      onChange(newNotes);

      // Trigger auto-save if enabled
      if (autoSaveEnabled && onAutoSaveTrigger) {
        onAutoSaveTrigger();
      }
    },
    [onChange, onAutoSaveTrigger, autoSaveEnabled]
  );

  // Update local notes when parent notes change (e.g., from saved deal)
  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  // Copy to clipboard helper with fallback for permissions issues
  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) {
      toast.error("No value to copy");
      return;
    }

    // Try modern Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopiedField(fieldName);
          toast.success(`${fieldName} copied!`);
          setTimeout(() => setCopiedField(null), 2000);
        })
        .catch(() => {
          // Fallback to legacy method
          fallbackCopy(text, fieldName);
        });
    } else {
      // Use fallback method directly
      fallbackCopy(text, fieldName);
    }
  };

  // Fallback copy method using textarea
  const fallbackCopy = (text: string, fieldName: string) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-999999px";
    textarea.style.top = "-999999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      const successful = document.execCommand("copy");
      if (successful) {
        setCopiedField(fieldName);
        toast.success(`${fieldName} copied!`);
        setTimeout(() => setCopiedField(null), 2000);
      } else {
        toast.error("Failed to copy. Please copy manually.");
      }
    } catch (err) {
      toast.error("Failed to copy. Please copy manually.");
    }

    document.body.removeChild(textarea);
  };

  // Helper to check if field should be highlighted as unknown
  // Checks both: 1) if parser marked it unknown, 2) if actual value is empty/unknown
  const isFieldUnknown = (fieldName: string): boolean => {
    // Also check if the actual field value is empty or "Unknown"
    const checkValue = (value: string | undefined | null): boolean => {
      if (!value || value === "") return true;
      if (value.toLowerCase() === "unknown") return true;
      return false;
    };

    // Map field names to actual note values - check current state
    switch (fieldName) {
      case "Roof Condition":
        return checkValue(localNotes.roof?.condition);
      case "Foundation":
        return checkValue(localNotes.foundation?.condition);
      case "HVAC Condition":
        return checkValue(localNotes.hvac?.condition);
      case "HVAC System Type":
        return checkValue(localNotes.hvac?.systemType);
      case "Plumbing":
        return checkValue(localNotes.plumbing?.condition);
      case "Electrical":
        return checkValue(localNotes.electrical?.condition);
      case "Kitchen":
        return checkValue(localNotes.kitchen?.condition);
      case "Bathrooms":
        return checkValue(localNotes.bathrooms?.[0]?.condition);
      case "Flooring":
        return checkValue(localNotes.interior?.flooring);
      case "Walls & Paint":
        return checkValue(localNotes.interior?.walls);
      case "Appliances":
        return checkValue(localNotes.kitchen?.appliances);
      case "Siding/Exterior":
        return checkValue(localNotes.exterior?.siding);
      case "Windows":
        return checkValue(localNotes.exterior?.windows);
      case "Windows Type":
        return checkValue(localNotes.exterior?.windowsType);
      case "Doors":
        return checkValue(localNotes.exterior?.doors);
      case "Landscaping":
        return checkValue(localNotes.exterior?.landscaping);
      default:
        return false;
    }
  };

  // Enhanced ChatGPT parse handler
  const handleParseChatGPT = useCallback(() => {
    if (!parseText.trim()) {
      toast.error("Please paste ChatGPT response text");
      return;
    }

    const {
      updates,
      unknownFields: newUnknownFields,
      fullText,
    } = parseChatGPTResponse(parseText);

    // Type-safe deep merge - only update known DealNotes fields
    const updatedNotes: DealNotes = {
      ...localNotes,
      // Only spread known top-level fields from updates
      ...(updates.realtorName !== undefined && {
        realtorName: updates.realtorName,
      }),
      ...(updates.realtorPhone !== undefined && {
        realtorPhone: updates.realtorPhone,
      }),
      ...(updates.realtorEmail !== undefined && {
        realtorEmail: updates.realtorEmail,
      }),
      ...(updates.realtorNotes !== undefined && {
        realtorNotes: updates.realtorNotes,
      }),
      ...(updates.sellerMotivation !== undefined && {
        sellerMotivation: updates.sellerMotivation,
      }),
      ...(updates.overallCondition !== undefined && {
        overallCondition: updates.overallCondition,
      }),
      ...(updates.estimatedRehabCost !== undefined && {
        estimatedRehabCost: updates.estimatedRehabCost,
      }),

      // Nested objects with type safety (same as before but with lastUpdated)
      roof: updates.roof
        ? {
            ...localNotes.roof,
            ...(updates.roof.condition !== undefined && {
              condition: updates.roof.condition,
            }),
            ...(updates.roof.age !== undefined && { age: updates.roof.age }),
            ...(updates.roof.roofYear !== undefined && {
              roofYear: updates.roof.roofYear,
            }),
            ...(updates.roof.leaks !== undefined && {
              leaks: updates.roof.leaks,
            }),
            ...(updates.roof.notes !== undefined && {
              notes: updates.roof.notes,
            }),
          }
        : localNotes.roof,

      foundation: updates.foundation
        ? {
            ...localNotes.foundation,
            ...(updates.foundation.condition !== undefined && {
              condition: updates.foundation.condition,
            }),
            ...(updates.foundation.notes !== undefined && {
              notes: updates.foundation.notes,
            }),
          }
        : localNotes.foundation,

      hvac: updates.hvac
        ? {
            ...localNotes.hvac,
            ...(updates.hvac.condition !== undefined && {
              condition: updates.hvac.condition,
            }),
            ...(updates.hvac.age !== undefined && { age: updates.hvac.age }),
            ...(updates.hvac.systemType !== undefined && {
              systemType: updates.hvac.systemType,
            }),
            ...(updates.hvac.numberOfUnits !== undefined && {
              numberOfUnits: updates.hvac.numberOfUnits,
            }),
            ...(updates.hvac.notes !== undefined && {
              notes: updates.hvac.notes,
            }),
          }
        : localNotes.hvac,

      plumbing: updates.plumbing
        ? {
            ...localNotes.plumbing,
            ...(updates.plumbing.condition !== undefined && {
              condition: updates.plumbing.condition,
            }),
            ...(updates.plumbing.pipeMaterial !== undefined && {
              pipeMaterial: updates.plumbing.pipeMaterial,
            }),
            ...(updates.plumbing.pipeAge !== undefined && {
              pipeAge: updates.plumbing.pipeAge,
            }),
            ...(updates.plumbing.waterHeater !== undefined && {
              waterHeater: updates.plumbing.waterHeater,
            }),
            ...(updates.plumbing.leaks !== undefined && {
              leaks: updates.plumbing.leaks,
            }),
            ...(updates.plumbing.notes !== undefined && {
              notes: updates.plumbing.notes,
            }),
          }
        : localNotes.plumbing,

      electrical: updates.electrical
        ? {
            ...localNotes.electrical,
            ...(updates.electrical.condition !== undefined && {
              condition: updates.electrical.condition,
            }),
            ...(updates.electrical.panelSize !== undefined && {
              panelSize: updates.electrical.panelSize,
            }),
            ...(updates.electrical.panelAmperage !== undefined && {
              panelAmperage: updates.electrical.panelAmperage,
            }),
            ...(updates.electrical.wiringType !== undefined && {
              wiringType: updates.electrical.wiringType,
            }),
            ...(updates.electrical.notes !== undefined && {
              notes: updates.electrical.notes,
            }),
          }
        : localNotes.electrical,

      kitchen: updates.kitchen
        ? {
            ...localNotes.kitchen,
            ...(updates.kitchen.condition !== undefined && {
              condition: updates.kitchen.condition,
            }),
            ...(updates.kitchen.cabinets !== undefined && {
              cabinets: updates.kitchen.cabinets,
            }),
            ...(updates.kitchen.countertops !== undefined && {
              countertops: updates.kitchen.countertops,
            }),
            ...(updates.kitchen.appliances !== undefined && {
              appliances: updates.kitchen.appliances,
            }),
            ...(updates.kitchen.flooring !== undefined && {
              flooring: updates.kitchen.flooring,
            }),
            ...(updates.kitchen.notes !== undefined && {
              notes: updates.kitchen.notes,
            }),
          }
        : localNotes.kitchen,

      // Keep existing bathrooms array - don't modify from updates
      bathrooms: localNotes.bathrooms,

      interior: updates.interior
        ? {
            ...localNotes.interior,
            ...(updates.interior.flooring !== undefined && {
              flooring: updates.interior.flooring,
            }),
            ...(updates.interior.walls !== undefined && {
              walls: updates.interior.walls,
            }),
            ...(updates.interior.ceilings !== undefined && {
              ceilings: updates.interior.ceilings,
            }),
            ...(updates.interior.lighting !== undefined && {
              lighting: updates.interior.lighting,
            }),
            ...(updates.interior.openFloorPlan !== undefined && {
              openFloorPlan: updates.interior.openFloorPlan,
            }),
            ...(updates.interior.notes !== undefined && {
              notes: updates.interior.notes,
            }),
          }
        : localNotes.interior,

      exterior: updates.exterior
        ? {
            ...localNotes.exterior,
            ...(updates.exterior.siding !== undefined && {
              siding: updates.exterior.siding,
            }),
            ...(updates.exterior.sidingType !== undefined && {
              sidingType: updates.exterior.sidingType,
            }),
            ...(updates.exterior.windows !== undefined && {
              windows: updates.exterior.windows,
            }),
            ...(updates.exterior.windowsType !== undefined && {
              windowsType: updates.exterior.windowsType,
            }),
            ...(updates.exterior.windowsCondition !== undefined && {
              windowsCondition: updates.exterior.windowsCondition,
            }),
            ...(updates.exterior.doors !== undefined && {
              doors: updates.exterior.doors,
            }),
            ...(updates.exterior.gutters !== undefined && {
              gutters: updates.exterior.gutters,
            }),
            ...(updates.exterior.landscaping !== undefined && {
              landscaping: updates.exterior.landscaping,
            }),
            ...(updates.exterior.fencing !== undefined && {
              fencing: updates.exterior.fencing,
            }),
            ...(updates.exterior.driveway !== undefined && {
              driveway: updates.exterior.driveway,
            }),
            ...(updates.exterior.notes !== undefined && {
              notes: updates.exterior.notes,
            }),
          }
        : localNotes.exterior,

      additionalIssues: updates.additionalIssues
        ? {
            ...localNotes.additionalIssues,
            ...(updates.additionalIssues.mold !== undefined && {
              mold: updates.additionalIssues.mold,
            }),
            ...(updates.additionalIssues.moldDetails !== undefined && {
              moldDetails: updates.additionalIssues.moldDetails,
            }),
            ...(updates.additionalIssues.termites !== undefined && {
              termites: updates.additionalIssues.termites,
            }),
            ...(updates.additionalIssues.termitesDetails !== undefined && {
              termitesDetails: updates.additionalIssues.termitesDetails,
            }),
            ...(updates.additionalIssues.waterDamage !== undefined && {
              waterDamage: updates.additionalIssues.waterDamage,
            }),
            ...(updates.additionalIssues.waterDamageDetails !== undefined && {
              waterDamageDetails: updates.additionalIssues.waterDamageDetails,
            }),
            ...(updates.additionalIssues.fireDamage !== undefined && {
              fireDamage: updates.additionalIssues.fireDamage,
            }),
            ...(updates.additionalIssues.fireDamageDetails !== undefined && {
              fireDamageDetails: updates.additionalIssues.fireDamageDetails,
            }),
            ...(updates.additionalIssues.structuralIssues !== undefined && {
              structuralIssues: updates.additionalIssues.structuralIssues,
            }),
            ...(updates.additionalIssues.structuralIssuesDetails !==
              undefined && {
              structuralIssuesDetails:
                updates.additionalIssues.structuralIssuesDetails,
            }),
            ...(updates.additionalIssues.codeViolations !== undefined && {
              codeViolations: updates.additionalIssues.codeViolations,
            }),
            ...(updates.additionalIssues.codeViolationsDetails !==
              undefined && {
              codeViolationsDetails:
                updates.additionalIssues.codeViolationsDetails,
            }),
            ...(updates.additionalIssues.other !== undefined && {
              other: updates.additionalIssues.other,
            }),
          }
        : localNotes.additionalIssues,

      // Put the full response into generalNotes
      generalNotes: fullText,
      lastUpdated: new Date().toISOString(),
    };

    setLocalNotes(updatedNotes);

    // Trigger auto-save with parsed data
    handleChangeWithAutoSave(updatedNotes);

    // Count actual fields filled (non-empty values in updates)
    const fieldsFilledCount = Object.keys(updates).reduce((count, key) => {
      const updateValue = (updates as any)[key];
      if (updateValue && typeof updateValue === "object") {
        return (
          count +
          Object.keys(updateValue).filter(
            (k) => (updateValue as any)[k] && (updateValue as any)[k] !== ""
          ).length
        );
      }
      return count;
    }, 0);

    // Close dialog
    setShowParseDialog(false);
    setParseText("");

    if (fieldsFilledCount > 0) {
      toast.success(
        `Auto-filled ${fieldsFilledCount} field${
          fieldsFilledCount === 1 ? "" : "s"
        } and saved changes!`
      );
      if (newUnknownFields.length > 0) {
        toast.info(
          `${newUnknownFields.length} field${
            newUnknownFields.length === 1 ? "" : "s"
          } still unknown (highlighted below)`,
          {
            duration: 5000,
          }
        );
      }
    } else {
      toast.warning("No matching fields found in the text");
    }
  }, [localNotes, parseText, handleChangeWithAutoSave]);

  const handleBathroomConditionChange = useCallback(
    (val: string) => {
      const bathroomCondition = val as
        | "Excellent"
        | "Good"
        | "Poor"
        | "Dated"
        | "";

      const updatedBathrooms: DealNotes["bathrooms"] =
        localNotes.bathrooms.length > 0
          ? localNotes.bathrooms.map((b) => ({
              ...b,
              condition: bathroomCondition,
            }))
          : [
              {
                location: "Bathroom 1",
                condition: bathroomCondition,
                vanity: "",
                toilet: "",
                tubShower: "",
                tile: "",
                notes: "",
              },
            ];

      const updatedNotes = {
        ...localNotes,
        bathrooms: updatedBathrooms,
        lastUpdated: new Date().toISOString(),
      };

      handleChangeWithAutoSave(updatedNotes);
    },
    [localNotes, handleChangeWithAutoSave]
  );

  // Enhanced clear rehab section handler
  const handleClearRehabSection = useCallback(() => {
    const defaultNotes = getDefaultNotes();

    // Reset all local state
    setLocalNotes(defaultNotes);
    setLineItems([]);
    setEstimateResult(null);
    setConfidence(null);
    setCostRange(null);
    setIsFinalized(false);

    // Notify parent with cleared data
    handleChangeWithAutoSave({
      ...defaultNotes,
      lastUpdated: new Date().toISOString(),
    });

    // Close dialog and show success
    setShowClearConfirmDialog(false);
    toast.success("Rehab section cleared and changes saved!");
  }, [handleChangeWithAutoSave]);

  // Enhanced line items change handler
  const handleLineItemsChange = useCallback(
    (newLineItems: LineItem[]) => {
      setLineItems(newLineItems);

      // Convert LineItem[] to DealNotes['lineItems'] type
      const compatibleLineItems: DealNotes["lineItems"] = newLineItems.map(
        (item) => ({
          id: item.id,
          category: item.category as
            | "structural"
            | "systems"
            | "interior"
            | "exterior",
          description: item.description,
          estimatedCost: item.estimatedCost,
        })
      );

      // Update notes with new line items and trigger auto-save
      const updatedNotes = {
        ...localNotes,
        lineItems: compatibleLineItems,
        lastUpdated: new Date().toISOString(),
      };

      handleChangeWithAutoSave(updatedNotes);

      // Notify parent of cost changes
      if (onRehabCostChange) {
        const totalCost = newLineItems.reduce(
          (sum, item) => sum + item.estimatedCost,
          0
        );
        onRehabCostChange(totalCost);
      }
    },
    [localNotes, handleChangeWithAutoSave, onRehabCostChange]
  );

  // Enhanced finalize handler
  const handleFinalizeScope = useCallback(() => {
    setIsFinalized(true);

    const updatedNotes = {
      ...localNotes,
      isScopeFinalized: true,
      lastUpdated: new Date().toISOString(),
    };

    handleChangeWithAutoSave(updatedNotes);
    toast.success("Scope of work finalized and saved!");
  }, [localNotes, handleChangeWithAutoSave]);

  // Enhanced edit scope handler
  const handleEditScope = useCallback(() => {
    setIsFinalized(false);

    const updatedNotes = {
      ...localNotes,
      isScopeFinalized: false,
      lastUpdated: new Date().toISOString(),
    };

    handleChangeWithAutoSave(updatedNotes);
  }, [localNotes, handleChangeWithAutoSave]);

  // Sync isFinalized state when notes change (e.g., when loading saved deal)
  useEffect(() => {
    setIsFinalized(notes.isScopeFinalized || false);
  }, [notes.isScopeFinalized]);

  // Notify parent when line items total changes
  useEffect(() => {
    const total = lineItems.reduce((sum, item) => sum + item.estimatedCost, 0);
    if (onRehabCostChange && total > 0) {
      onRehabCostChange(total);
    }
  }, [lineItems, onRehabCostChange]);

  // Update local notes and lineItems when parent notes change
  useEffect(() => {
    setLocalNotes(notes);
    if (notes.lineItems) {
      setLineItems(notes.lineItems);
    }
  }, [notes.lastUpdated]);

  // Calculate confidence score whenever notes change
  useEffect(() => {
    const result = calculateConfidence(localNotes, yearBuilt, totalSqft);
    setConfidence(result);
  }, [localNotes, yearBuilt, totalSqft]);

  // Calculate cost range whenever line items change
  useEffect(() => {
    if (lineItems.length > 0) {
      const range = calculateCostRange(lineItems, localNotes, totalSqft, units);
      setCostRange(range);
    } else {
      setCostRange(null);
    }
  }, [lineItems, localNotes, totalSqft, units]);

  // Enhanced smart defaults application
  useEffect(() => {
    if (localNotes.roof.roofYear) {
      const { updatedNotes, appliedDefaults } = applySmartDefaults(
        localNotes,
        yearBuilt
      );

      // Only update if defaults were actually applied
      if (appliedDefaults.length > 0) {
        const notesWithDefaults = {
          ...updatedNotes,
          lastUpdated: new Date().toISOString(),
        };

        setLocalNotes(notesWithDefaults);
        handleChangeWithAutoSave(notesWithDefaults);

        // Show subtle notification for applied defaults
        const warningDefaults = appliedDefaults.filter((d) => d.includes("⚠️"));
        if (warningDefaults.length > 0) {
          toast.info(
            `Applied ${appliedDefaults.length} smart default${
              appliedDefaults.length > 1 ? "s" : ""
            } based on property data`,
            {
              description: warningDefaults[0],
            }
          );
        }
      }
    }
  }, [localNotes.roof.roofYear, yearBuilt, handleChangeWithAutoSave]);

  // Enhanced auto-regenerate estimate - fix the type issue
  useEffect(() => {
    // Only auto-regenerate if we've already generated an estimate at least once
    // AND if there are significant changes (not just typing)
    if (lineItems.length > 0 && !isManualUpdate.current) {
      // Debounce to avoid excessive recalculations while typing
      const timer = setTimeout(() => {
        try {
          const result = analyzePropertyCondition(localNotes, totalSqft, units);
          setEstimateResult(result);

          // Only regenerate if there are actual condition changes
          const shouldRegenerate = hasSignificantChanges(
            localNotes,
            prevNotesRef.current
          );

          if (shouldRegenerate) {
            const generatedItems = generateLineItems(
              localNotes,
              totalSqft,
              units
            );

            // Preserve custom items
            const generatedCategories = new Set(
              generatedItems.map((item) => item.category)
            );
            const customItems = lineItems.filter((existingItem) => {
              const isCustomCategory = !generatedCategories.has(
                existingItem.category
              );
              const isCustomItem =
                existingItem.category === "Custom" ||
                existingItem.category === "Additional Work" ||
                !generatedItems.some(
                  (genItem) =>
                    genItem.category === existingItem.category &&
                    genItem.description === existingItem.description
                );
              return isCustomCategory || isCustomItem;
            });

            // Merge generated items with preserved custom items
            const mergedItems = [...generatedItems, ...customItems];
            setLineItems(mergedItems);

            // Update notes
            const totalCost = mergedItems.reduce(
              (sum, item) => sum + item.estimatedCost,
              0
            );
            const updatedNotes = {
              ...localNotes,
              estimatedRehabCost: formatCurrency(totalCost),
              lineItems: mergedItems.map((item) => ({
                id: item.id,
                category: item.category as
                  | "structural"
                  | "systems"
                  | "interior"
                  | "exterior",
                description: item.description,
                estimatedCost: item.estimatedCost,
              })),
              lastUpdated: new Date().toISOString(),
            };

            handleChangeWithAutoSave(updatedNotes);

            if (onRehabEstimateGenerated) {
              onRehabEstimateGenerated({
                ...result,
                estimatedCost: totalCost,
              });
            }
          }

          // Update previous notes reference
          prevNotesRef.current = localNotes;
        } catch (error) {
          console.error("Auto-estimate update error:", error);
        }
      }, 2000); // Increase debounce time

      return () => clearTimeout(timer);
    }
  }, [
    // Only depend on actual condition fields, not lineItems.length
    localNotes.overallCondition,
    localNotes.roof.condition,
    localNotes.foundation.condition,
    localNotes.hvac.condition,
    localNotes.plumbing.condition,
    localNotes.electrical.condition,
    localNotes.kitchen.condition,
    localNotes.bathrooms,
    localNotes.interior.flooring,
    localNotes.interior.walls,
    localNotes.exterior.siding,
    localNotes.exterior.windows,
    localNotes.exterior.doors,
    localNotes.additionalIssues,
    totalSqft,
    units,
    handleChangeWithAutoSave,
    onRehabEstimateGenerated,
  ]);

  // Enhanced updateField function with auto-save
  const updateField = useCallback(
    (path: string[], value: any) => {
      setLocalNotes((prev) => {
        const updated = { ...prev };
        let current: any = updated;

        for (let i = 0; i < path.length - 1; i++) {
          current[path[i]] = { ...current[path[i]] };
          current = current[path[i]];
        }

        current[path[path.length - 1]] = value;

        // Notify parent immediately
        onChange(updated);

        // Trigger auto-save
        if (autoSaveEnabled && onAutoSaveTrigger) {
          onAutoSaveTrigger();
        }

        return updated;
      });
    },
    [onChange, onAutoSaveTrigger, autoSaveEnabled]
  );

  // Enhanced generate estimate handler - fix the type issue
  const handleGenerateEstimate = () => {
    try {
      const result = analyzePropertyCondition(localNotes, totalSqft, units);
      setEstimateResult(result);

      // Generate detailed line items
      const generatedItems = generateLineItems(localNotes, totalSqft, units);

      // Preserve custom line items
      const generatedCategories = new Set(
        generatedItems.map((item) => item.category)
      );
      const customItems = lineItems.filter((existingItem) => {
        const isCustomCategory = !generatedCategories.has(
          existingItem.category
        );
        const isCustomItem =
          existingItem.category === "Custom" ||
          existingItem.category === "Additional Work" ||
          !generatedItems.some(
            (genItem) =>
              genItem.category === existingItem.category &&
              genItem.description === existingItem.description
          );
        return isCustomCategory || isCustomItem;
      });

      // Merge generated items with preserved custom items
      const mergedItems = [...generatedItems, ...customItems];

      // Update lineItems state FIRST
      setLineItems(mergedItems);

      // Convert for notes
      const compatibleLineItems: DealNotes["lineItems"] = mergedItems.map(
        (item) => ({
          id: item.id,
          category: item.category as
            | "structural"
            | "systems"
            | "interior"
            | "exterior",
          description: item.description,
          estimatedCost: item.estimatedCost,
        })
      );

      // Calculate total cost
      const totalCost = mergedItems.reduce(
        (sum, item) => sum + item.estimatedCost,
        0
      );

      // Update notes with estimate - do this ONCE
      const updatedNotes = {
        ...localNotes,
        estimatedRehabCost: formatCurrency(totalCost),
        lineItems: compatibleLineItems,
        lastUpdated: new Date().toISOString(),
      };

      // Update local state and trigger auto-save ONCE
      setLocalNotes(updatedNotes);
      handleChangeWithAutoSave(updatedNotes);

      // Notify parent components
      if (onRehabEstimateGenerated) {
        onRehabEstimateGenerated({
          ...result,
          estimatedCost: totalCost,
        });
      }

      const customCount = customItems.length;
      toast.success(
        `Generated ${generatedItems.length} line items${
          customCount > 0
            ? ` + ${customCount} custom item${
                customCount > 1 ? "s" : ""
              } preserved`
            : ""
        } • ${formatCurrency(totalCost)} total`,
        {
          description: "Working condition repairs",
        }
      );
    } catch (error) {
      toast.error("Error generating estimate. Please check condition data.");
      console.error("Estimate generation error:", error);
    }
  };
  return (
    <div className="space-y-6">
      {/* Header Card with Clear Button */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Rehab Estimate
              </CardTitle>
              <CardDescription>
                Quick property assessment to estimate repair costs. Costs update
                automatically as you fill out property conditions. Click "Apply
                Suggested Rehab" to generate initial scope of work.
              </CardDescription>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowClearConfirmDialog(true)}
              className="flex items-center gap-2 shrink-0"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Confidence & Cost Range Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Confidence Score */}
        {confidence && (
          <Card className={`border-2 ${confidence.color}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Estimate Confidence
                </CardTitle>
                <Badge
                  variant={
                    confidence.level === "Very High" ||
                    confidence.level === "High"
                      ? "default"
                      : "destructive"
                  }
                >
                  {confidence.score}% {confidence.level}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {confidence.missingFields.length > 0 && (
                <div className="text-xs">
                  <p className="font-medium mb-1">Missing data:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                    {confidence.missingFields.slice(0, 3).map((field, i) => (
                      <li key={i}>{field}</li>
                    ))}
                  </ul>
                </div>
              )}
              {confidence.assumptions.length > 0 && (
                <div className="text-xs pt-2 border-t">
                  <p className="font-medium mb-1">Key assumptions:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                    {confidence.assumptions.slice(0, 2).map((assumption, i) => (
                      <li key={i}>{assumption}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cost Range Summary */}
        {costRange && lineItems.length > 0 && (
          <Card className="border-2 border-purple-200 bg-purple-50/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Expected Cost Range
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">
                  Low estimate:
                </span>
                <span className="font-semibold">
                  {formatCurrency(costRange.lowEstimate)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">
                  Most likely:
                </span>
                <span className="font-semibold text-purple-700">
                  {formatCurrency(costRange.midEstimate)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">
                  High estimate:
                </span>
                <span className="font-semibold">
                  {formatCurrency(costRange.highEstimate)}
                </span>
              </div>
              {costRange.topDrivers.length > 0 && (
                <div className="text-xs pt-2 border-t">
                  <p className="font-medium mb-1">Top cost drivers:</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    {costRange.topDrivers.slice(0, 3).map((driver, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{driver.category}</span>
                        <span>{formatCurrency(driver.highCost)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Assumptions Summary - Shows what we're guessing */}
      {(() => {
        const assumptions = getHiddenAssumptions(
          localNotes,
          yearBuilt,
          totalSqft
        );
        return assumptions.length > 0 ? (
          <Card className="border-amber-200 bg-amber-50/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-amber-700" />
                <CardTitle className="text-sm">Assumptions Made</CardTitle>
              </div>
              <CardDescription className="text-xs">
                These are assumptions based on property age and available data.
                Verify during inspection!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {assumptions.map((assumption, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-700 mt-0.5">•</span>
                    <span className="text-muted-foreground">{assumption}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* Realtor Contact Info */}
      <Card className="border-blue-200 bg-blue-50/20">
        <CardHeader>
          <CardTitle className="text-base">Realtor Contact</CardTitle>
          <CardDescription className="text-xs">
            Quick access to listing agent info
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <div className="flex gap-2">
                <Input
                  value={localNotes.realtorName}
                  onChange={(e) => updateField(["realtorName"], e.target.value)}
                  placeholder="Agent name"
                  className="text-sm h-9"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0"
                  onClick={() =>
                    copyToClipboard(localNotes.realtorName, "Name")
                  }
                >
                  {copiedField === "Name" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <div className="flex gap-2">
                <Input
                  value={localNotes.realtorPhone}
                  onChange={(e) =>
                    updateField(["realtorPhone"], e.target.value)
                  }
                  placeholder="(954) 555-1234"
                  className="text-sm h-9"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0"
                  onClick={() =>
                    copyToClipboard(localNotes.realtorPhone, "Phone")
                  }
                >
                  {copiedField === "Phone" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <div className="flex gap-2">
                <Input
                  value={localNotes.realtorEmail}
                  onChange={(e) =>
                    updateField(["realtorEmail"], e.target.value)
                  }
                  placeholder="agent@realty.com"
                  className="text-sm h-9"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0"
                  onClick={() =>
                    copyToClipboard(localNotes.realtorEmail, "Email")
                  }
                >
                  {copiedField === "Email" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Notes Section - Compact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Seller Motivation */}
        <Card className="border-amber-200 bg-amber-50/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Seller Motivation - Why selling?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={localNotes.sellerMotivation}
              onChange={(e) =>
                updateField(["sellerMotivation"], e.target.value)
              }
              placeholder="e.g., Relocating, needs quick sale..."
              rows={2}
              className="text-sm"
            />
          </CardContent>
        </Card>

        {/* ChatGPT Insights + Notes */}
        <Card className="border-gray-200 bg-gray-50/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                ChatGPT Insights + Notes
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowParseDialog(true)}
                  className="h-7 gap-1.5 px-2"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  <span className="text-xs">Parse Response</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const prompt = `ChatGPT Insights Prompt (Master VA Version – Rehab & Realtor Call)

Task: Analyze the Zillow listing text below and output six structured sections. Use only factual data. Avoid fluff or repetition.

---

🧩 HOUSE RULES
- Use only facts stated or clearly implied by the listing.
- If something isn't stated, mark it as "Unknown." Never assume.
- Map all answers exactly to the dropdown options used in the analyzer (shown below).
- Do not repeat questions if the answer is already known.
- Keep total output ≤ 350 words.

---

🧩 OUTPUT FORMAT RULES (IMPORTANT)
- Section A (QUICK SUMMARY): Each line must start with a hyphen (-)
- Section C (COST DRIVERS): Each line must start with a hyphen (-)
- Section D (REALTOR QUESTIONS): Use numbered list (1. 2. 3. etc.)
- All other sections: Use hyphens (-) for each item
- Do NOT use markdown bullets (•) or emojis in output
- Do NOT add extra blank lines between items
- Keep the format tight and clean so it can be pasted directly into the CRM

---

(A) QUICK SUMMARY (5–12 lines)
Summarize only investment-critical details. Each line MUST start with "-":
Example format:
- Price: $479,000 ($333/sf)
- Property type: Duplex (2 units, 2 bed / 1 bath each)
- Year built & living area: 1985; 1,440 sf
- Roof: Shingle; condition Unknown
- HVAC: Window Units (heating: Window/Wall; cooling: Wall/Window Unit[s])
- Plumbing: Public sewer; material Unknown
- Electrical: Unknown
- Windows: Unknown
- Flood/insurance: FEMA Zone X (shaded, moderate risk)
- Tenant/occupancy: Unknown
- Title flags: None stated
- Neighborhood note: Washington Park Fourth Add subdivision
- Insurance/Rehab Risk flagged: window units; roof year/condition unknown

---

(B) CONDITION SUMMARY (MATCHES REHAB FORM)
Use only dropdown values shown below. If data is missing, write "Unknown."

1. Structural & Major Systems
- Roof Condition: New (0-5 yrs) / Good (6-15 yrs) / Fair (16-20 yrs) / Poor (20+ yrs) / Needs Replacement / Unknown
- Roof Year: YYYY or Unknown
- Foundation: Good / Minor Cracks / Major Issues / Unknown
- HVAC Condition: New (0-5 yrs) / Good (6-10 yrs) / Fair (11-15 yrs) / Old (15+ yrs) / Not Working / Unknown
- HVAC System Type: Central AC / Mini-Split / Window Units / Package Unit / Heat Pump / None / Unknown
- Plumbing: Good / Has Issues / Needs Replacement / Unknown
- Electrical: Updated / Adequate / Needs Work / Unsafe / Unknown

2. Interior
- Kitchen: Good / Dated / Needs Full Rehab / Unknown
- Bathrooms (Overall): Good / Dated / Poor / Unknown
- Flooring: Good / Mixed / Needs Replacement / Unknown
- Walls & Paint: Good / Needs Paint / Needs Repair / Unknown
- Appliances: All Good / Old / Missing/Broken / Unknown

3. Exterior
- Siding/Exterior: Good / Needs Paint / Needs Repair / Unknown
- Window Type: Impact-Rated / Hurricane / Double Pane / Single Pane / Mixed / Unknown
- Doors: Good / Needs Replacement / Unknown
- Landscaping: Well Maintained / Overgrown / Minimal / Unknown

4. Major Issues (if any)
- Mold Present: Yes / No / Unknown
- Termite Damage: Yes / No / Unknown
- Water Damage: Yes / No / Unknown
- Structural Issues: Yes / No / Unknown
- Code Violations/Permits: Yes / No / Unknown

5. Rehab Level
- Working Condition (rent-ready, basic contractor-grade finishes)

---

(B.2) CONFIDENCE LEVEL
- High = All major systems known
- Medium = 1–2 unknown
- Low = 3+ unknown or missing roof/plumbing/electrical

---

(C) COST DRIVERS & AUTO-ASSUMPTIONS
Summarize what's affecting rehab cost. Each line MUST start with "-":
Example format:
- Window A/C only → HVAC upgrade likely (+$10K)
- Roof year not stated → assume Functional until confirmed
- Pre-1970 CBS → possible cast-iron risk (+$10K) not applied (built 1985)
- Flood zone AE → +10% insurance/rebuild factor not applied (Zone X shaded)

---

(D) REALTOR FOLLOW-UP QUESTIONS (3–8 lines)
Show only questions for missing or risk-related Unknown fields from section B.  
Use NUMBERED LIST format (1. 2. 3. etc.):
Example format:
1. Why is the seller selling and what's their timeline or urgency?
2. What year was the roof last replaced or permitted?
3. What plumbing material is used (PVC or cast iron)?
4. Is the electrical panel updated or original?
5. Are the windows impact or standard?
6. Are both units currently occupied and separately metered?
7. Any open permits or code violations?
8. Could you text or email 3–5 recent photos (roof, kitchen, bathrooms, electrical panel, windows) for verification?

---

(E) DEAL RISK RATING
- ✅ Green: clean structure, minimal rehab
- ⚠️ Yellow: moderate unknowns or cosmetic rehab
- ❌ Red: major title/flood/structural issues or tenant access restrictions
- Add one-line reason (e.g., "⚠️ Yellow — roof age unknown, window units increase rehab cost.")

---

(F) COPY-TO-REHAB SECTION (for CRM import)
- Rehab Input Summary: Roof: Functional | Plumbing: Unknown | Electrical: Updated | HVAC: Window Units | Kitchen: Dated | Baths: Dated | Windows: Original | Rehab Level: Working Condition | Confidence: Medium

---

🧩 SOUTH FLORIDA RULES (built-in logic)
- Year Built < 1970 → +$10K plumbing/electrical risk
- Flood Zone ≠ X → +10% cost factor
- Window Units only → add HVAC upgrade note
- "As-is," "tenant occupied," or "handyman" → downgrade 1 risk level

---

Input: Paste the Zillow listing or MLS text below. ChatGPT will generate all six sections automatically, formatted only with hyphens ("-") instead of bullets.`;
                    copyToClipboard(prompt, "ChatGPT Prompt");
                  }}
                  className="h-7 gap-1.5 px-2"
                >
                  {copiedField === "ChatGPT Prompt" ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span className="text-xs">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span className="text-xs">Copy ChatGPT Prompt</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={localNotes.generalNotes}
              onChange={(e) => updateField(["generalNotes"], e.target.value)}
              placeholder="Any other observations..."
              rows={2}
              className="text-sm"
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Assessment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Structural & Major Systems */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              1. Structural & Major Systems
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Roof */}
            <div className="space-y-2">
              <Label>Roof Condition</Label>
              <Select
                value={localNotes.roof.condition}
                onValueChange={(val: any) =>
                  updateField(["roof", "condition"], val)
                }
              >
                <SelectTrigger
                  className={
                    isFieldUnknown("Roof Condition")
                      ? "bg-yellow-100 border-yellow-400"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New (0-5 yrs)">New (0-5 yrs)</SelectItem>
                  <SelectItem value="Good (6-15 yrs)">
                    Good (6-15 yrs)
                  </SelectItem>
                  <SelectItem value="Fair (16-20 yrs)">
                    Fair (16-20 yrs)
                  </SelectItem>
                  <SelectItem value="Poor (20+ yrs)">Poor (20+ yrs)</SelectItem>
                  <SelectItem value="Needs Replacement">
                    Needs Replacement
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Roof Year - Optional detailed input */}
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">
                  Roof Year (optional - auto-calculates age)
                </Label>
                <Input
                  type="number"
                  value={localNotes.roof.roofYear || ""}
                  onChange={(e) =>
                    updateField(
                      ["roof", "roofYear"],
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  placeholder="e.g., 2018"
                  className="h-8 text-sm"
                  min="1900"
                  max={new Date().getFullYear()}
                />
                {localNotes.roof.roofYear && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Roof age auto-calculated:{" "}
                    {new Date().getFullYear() - localNotes.roof.roofYear} years
                    old
                  </p>
                )}
              </div>
            </div>

            {/* Foundation */}
            <div className="space-y-2">
              <Label>Foundation</Label>
              <Select
                value={localNotes.foundation.condition}
                onValueChange={(val: any) =>
                  updateField(["foundation", "condition"], val)
                }
              >
                <SelectTrigger
                  className={
                    isFieldUnknown("Foundation")
                      ? "bg-yellow-100 border-yellow-400"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Minor Cracks">Minor Cracks</SelectItem>
                  <SelectItem value="Major Issues">Major Issues</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* HVAC */}
            <div className="space-y-2">
              <Label>HVAC System</Label>
              <Select
                value={localNotes.hvac.condition}
                onValueChange={(val: any) =>
                  updateField(["hvac", "condition"], val)
                }
              >
                <SelectTrigger
                  className={
                    isFieldUnknown("HVAC Condition")
                      ? "bg-yellow-100 border-yellow-400"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New (0-5 yrs)">New (0-5 yrs)</SelectItem>
                  <SelectItem value="Good (6-10 yrs)">
                    Good (6-10 yrs)
                  </SelectItem>
                  <SelectItem value="Fair (11-15 yrs)">
                    Fair (11-15 yrs)
                  </SelectItem>
                  <SelectItem value="Old (15+ yrs)">Old (15+ yrs)</SelectItem>
                  <SelectItem value="Not Working">Not Working</SelectItem>
                </SelectContent>
              </Select>

              {/* HVAC System Type - New detailed field */}
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">
                  System Type (affects replacement cost)
                </Label>
                <Select
                  value={localNotes.hvac.systemType || ""}
                  onValueChange={(val: any) =>
                    updateField(["hvac", "systemType"], val)
                  }
                >
                  <SelectTrigger
                    className={`h-8 ${
                      isFieldUnknown("HVAC System Type")
                        ? "bg-yellow-100 border-yellow-400"
                        : ""
                    }`}
                  >
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Central AC">Central AC</SelectItem>
                    <SelectItem value="Mini-Split">Mini-Split</SelectItem>
                    <SelectItem value="Window Units">Window Units</SelectItem>
                    <SelectItem value="Package Unit">Package Unit</SelectItem>
                    <SelectItem value="Heat Pump">Heat Pump</SelectItem>
                    <SelectItem value="None">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Plumbing */}
            <div className="space-y-2">
              <Label>Plumbing</Label>
              <Select
                value={localNotes.plumbing.condition}
                onValueChange={(val: any) =>
                  updateField(["plumbing", "condition"], val)
                }
              >
                <SelectTrigger
                  className={
                    isFieldUnknown("Plumbing")
                      ? "bg-yellow-100 border-yellow-400"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Has Issues">Has Issues</SelectItem>
                  <SelectItem value="Needs Replacement">
                    Needs Replacement
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Plumbing Material - New detailed field */}
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">
                  Pipe Material (critical for cost)
                </Label>
                <Select
                  value={localNotes.plumbing.pipeMaterial || ""}
                  onValueChange={(val: any) =>
                    updateField(["plumbing", "pipeMaterial"], val)
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select material..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Copper">Copper (Good)</SelectItem>
                    <SelectItem value="PEX">PEX (Modern)</SelectItem>
                    <SelectItem value="PVC">PVC (Standard)</SelectItem>
                    <SelectItem value="Galvanized">
                      Galvanized (OLD - Replace)
                    </SelectItem>
                    <SelectItem value="Mixed">Mixed Materials</SelectItem>
                    <SelectItem value="Unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pipe Age - New detailed field */}
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">
                  Pipe Age (optional)
                </Label>
                <Select
                  value={localNotes.plumbing.pipeAge || ""}
                  onValueChange={(val: any) =>
                    updateField(["plumbing", "pipeAge"], val)
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select age..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Recently Updated">
                      Recently Updated
                    </SelectItem>
                    <SelectItem value="10-20 yrs">10-20 years old</SelectItem>
                    <SelectItem value="20+ yrs">20+ years old</SelectItem>
                    <SelectItem value="Original">Original to house</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Electrical */}
            <div className="space-y-2">
              <Label>Electrical</Label>
              <Select
                value={localNotes.electrical.condition}
                onValueChange={(val: any) =>
                  updateField(["electrical", "condition"], val)
                }
              >
                <SelectTrigger
                  className={
                    isFieldUnknown("Electrical")
                      ? "bg-yellow-100 border-yellow-400"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Updated">Updated</SelectItem>
                  <SelectItem value="Adequate">Adequate</SelectItem>
                  <SelectItem value="Needs Work">Needs Work</SelectItem>
                  <SelectItem value="Unsafe">Unsafe</SelectItem>
                </SelectContent>
              </Select>

              {/* Electrical Panel Amperage - New detailed field */}
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">
                  Panel Amperage
                </Label>
                <Select
                  value={localNotes.electrical.panelAmperage || ""}
                  onValueChange={(val: any) =>
                    updateField(["electrical", "panelAmperage"], val)
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select amperage..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100A">100 Amp (Minimum)</SelectItem>
                    <SelectItem value="150A">150 Amp (Standard)</SelectItem>
                    <SelectItem value="200A">200 Amp (Preferred)</SelectItem>
                    <SelectItem value="200A+">200+ Amp (Excellent)</SelectItem>
                    <SelectItem value="Unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interior */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Interior</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Kitchen */}
            <div className="space-y-2">
              <Label>Kitchen</Label>
              <Select
                value={localNotes.kitchen.condition}
                onValueChange={(val: any) =>
                  updateField(["kitchen", "condition"], val)
                }
              >
                <SelectTrigger
                  className={
                    isFieldUnknown("Kitchen")
                      ? "bg-yellow-100 border-yellow-400"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Dated">Dated</SelectItem>
                  <SelectItem value="Needs Full Rehab">
                    Needs Full Rehab
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bathrooms Overall */}
            <div className="space-y-2">
              <Label>Bathrooms (Overall)</Label>
              <Select
                value={localNotes.bathrooms[0]?.condition || ""}
                onValueChange={(val: string) =>
                  handleBathroomConditionChange(val)
                }
              >
                <SelectTrigger
                  className={
                    isFieldUnknown("Bathrooms")
                      ? "bg-yellow-100 border-yellow-400"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excellent">Excellent</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                  <SelectItem value="Dated">Dated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Flooring */}
            <div className="space-y-2">
              <Label>Flooring</Label>
              <Select
                value={localNotes.bathrooms[0]?.condition || ""}
                onValueChange={handleBathroomConditionChange}
              >
                <SelectTrigger
                  className={
                    isFieldUnknown("Bathrooms")
                      ? "bg-yellow-100 border-yellow-400"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excellent">Excellent</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                  <SelectItem value="Dated">Dated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Walls & Paint */}
            <div className="space-y-2">
              <Label>Walls & Paint</Label>
              <Select
                value={localNotes.interior.walls}
                onValueChange={(val: any) =>
                  updateField(["interior", "walls"], val)
                }
              >
                <SelectTrigger
                  className={
                    isFieldUnknown("Walls & Paint")
                      ? "bg-yellow-100 border-yellow-400"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Needs Paint">Needs Paint</SelectItem>
                  <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Appliances */}
            <div className="space-y-2">
              <Label>Appliances</Label>
              <Select
                value={localNotes.kitchen.appliances}
                onValueChange={(val: any) =>
                  updateField(["kitchen", "appliances"], val)
                }
              >
                <SelectTrigger
                  className={
                    isFieldUnknown("Appliances")
                      ? "bg-yellow-100 border-yellow-400"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Good">All Good</SelectItem>
                  <SelectItem value="Old">Old</SelectItem>
                  <SelectItem value="Missing/Broken">Missing/Broken</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Exterior */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Exterior</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Siding */}
            <div className="space-y-2">
              <Label>Siding/Exterior</Label>
              <Select
                value={localNotes.exterior.siding}
                onValueChange={(val: any) =>
                  updateField(["exterior", "siding"], val)
                }
              >
                <SelectTrigger
                  className={
                    isFieldUnknown("Siding/Exterior")
                      ? "bg-yellow-100 border-yellow-400"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Needs Paint">Needs Paint</SelectItem>
                  <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Windows */}
            <div className="space-y-2">
              <Label>Windows</Label>
              <Select
                value={localNotes.exterior.windows}
                onValueChange={(val: any) =>
                  updateField(["exterior", "windows"], val)
                }
              >
                <SelectTrigger
                  className={
                    isFieldUnknown("Windows")
                      ? "bg-yellow-100 border-yellow-400"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Old Single Pane">
                    Old Single Pane
                  </SelectItem>
                  <SelectItem value="Broken/Missing">Broken/Missing</SelectItem>
                </SelectContent>
              </Select>

              {/* Windows Type - New detailed field */}
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">
                  Window Type (FL important!)
                </Label>
                <Select
                  value={localNotes.exterior.windowsType || ""}
                  onValueChange={(val: any) =>
                    updateField(["exterior", "windowsType"], val)
                  }
                >
                  <SelectTrigger
                    className={`h-8 ${
                      isFieldUnknown("Windows Type")
                        ? "bg-yellow-100 border-yellow-400"
                        : ""
                    }`}
                  >
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Impact-Rated">
                      Impact-Rated (Best)
                    </SelectItem>
                    <SelectItem value="Hurricane">Hurricane Windows</SelectItem>
                    <SelectItem value="Double Pane">Double Pane</SelectItem>
                    <SelectItem value="Single Pane">
                      Single Pane (Old)
                    </SelectItem>
                    <SelectItem value="Mixed">Mixed Types</SelectItem>
                    <SelectItem value="Unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Windows Condition - New detailed field */}
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">
                  Window Condition Detail
                </Label>
                <Select
                  value={localNotes.exterior.windowsCondition || ""}
                  onValueChange={(val: any) =>
                    updateField(["exterior", "windowsCondition"], val)
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="How many broken?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Good">All Good</SelectItem>
                    <SelectItem value="Some Broken">
                      Some Broken (1-3)
                    </SelectItem>
                    <SelectItem value="Many Broken">
                      Many Broken (4+)
                    </SelectItem>
                    <SelectItem value="All Need Replacement">
                      All Need Replacement
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Doors */}
            <div className="space-y-2">
              <Label>Doors</Label>
              <Select
                value={localNotes.exterior.doors}
                onValueChange={(val: any) =>
                  updateField(["exterior", "doors"], val)
                }
              >
                <SelectTrigger
                  className={
                    isFieldUnknown("Doors")
                      ? "bg-yellow-100 border-yellow-400"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Needs Replacement">
                    Needs Replacement
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Landscaping */}
            <div className="space-y-2">
              <Label>Landscaping</Label>
              <Select
                value={localNotes.exterior.landscaping}
                onValueChange={(val: any) =>
                  updateField(["exterior", "landscaping"], val)
                }
              >
                <SelectTrigger
                  className={
                    isFieldUnknown("Landscaping")
                      ? "bg-yellow-100 border-yellow-400"
                      : ""
                  }
                >
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Well Maintained">
                    Well Maintained
                  </SelectItem>
                  <SelectItem value="Overgrown">Overgrown</SelectItem>
                  <SelectItem value="Minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Additional Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              4. Major Issues (if any)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localNotes.additionalIssues.mold}
                  onChange={(e) =>
                    updateField(["additionalIssues", "mold"], e.target.checked)
                  }
                  className="h-4 w-4"
                />
                Mold Present
              </Label>
              {localNotes.additionalIssues.mold && (
                <Textarea
                  value={localNotes.additionalIssues.moldDetails || ""}
                  onChange={(e) =>
                    updateField(
                      ["additionalIssues", "moldDetails"],
                      e.target.value
                    )
                  }
                  placeholder="Describe mold location, severity, and affected areas..."
                  rows={2}
                  className="text-sm mt-2"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localNotes.additionalIssues.termites}
                  onChange={(e) =>
                    updateField(
                      ["additionalIssues", "termites"],
                      e.target.checked
                    )
                  }
                  className="h-4 w-4"
                />
                Termite Damage
              </Label>
              {localNotes.additionalIssues.termites && (
                <Textarea
                  value={localNotes.additionalIssues.termitesDetails || ""}
                  onChange={(e) =>
                    updateField(
                      ["additionalIssues", "termitesDetails"],
                      e.target.value
                    )
                  }
                  placeholder="Describe termite damage location, extent, and visible signs..."
                  rows={2}
                  className="text-sm mt-2"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localNotes.additionalIssues.waterDamage}
                  onChange={(e) =>
                    updateField(
                      ["additionalIssues", "waterDamage"],
                      e.target.checked
                    )
                  }
                  className="h-4 w-4"
                />
                Water Damage
              </Label>
              {localNotes.additionalIssues.waterDamage && (
                <Textarea
                  value={localNotes.additionalIssues.waterDamageDetails || ""}
                  onChange={(e) =>
                    updateField(
                      ["additionalIssues", "waterDamageDetails"],
                      e.target.value
                    )
                  }
                  placeholder="Describe water damage location, source, and repairs needed..."
                  rows={2}
                  className="text-sm mt-2"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localNotes.additionalIssues.structuralIssues}
                  onChange={(e) =>
                    updateField(
                      ["additionalIssues", "structuralIssues"],
                      e.target.checked
                    )
                  }
                  className="h-4 w-4"
                />
                Structural Issues
              </Label>
              {localNotes.additionalIssues.structuralIssues && (
                <Textarea
                  value={
                    localNotes.additionalIssues.structuralIssuesDetails || ""
                  }
                  onChange={(e) =>
                    updateField(
                      ["additionalIssues", "structuralIssuesDetails"],
                      e.target.value
                    )
                  }
                  placeholder="Describe structural issues (sagging floors, cracked beams, foundation settling, etc.)..."
                  rows={2}
                  className="text-sm mt-2"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localNotes.additionalIssues.codeViolations}
                  onChange={(e) =>
                    updateField(
                      ["additionalIssues", "codeViolations"],
                      e.target.checked
                    )
                  }
                  className="h-4 w-4"
                />
                Code Violations
              </Label>
              {localNotes.additionalIssues.codeViolations && (
                <Textarea
                  value={
                    localNotes.additionalIssues.codeViolationsDetails || ""
                  }
                  onChange={(e) =>
                    updateField(
                      ["additionalIssues", "codeViolationsDetails"],
                      e.target.value
                    )
                  }
                  placeholder="Describe code violations and citation details..."
                  rows={2}
                  className="text-sm mt-2"
                />
              )}
            </div>
            {localNotes.additionalIssues.other && (
              <div className="pt-2">
                <Textarea
                  value={localNotes.additionalIssues.other}
                  onChange={(e) =>
                    updateField(["additionalIssues", "other"], e.target.value)
                  }
                  placeholder="Other issues..."
                  rows={2}
                  className="text-sm"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generate Button */}
      <Button onClick={handleGenerateEstimate} size="lg" className="w-full">
        <Calculator className="mr-2 h-5 w-5" />
        Apply Suggested Rehab
      </Button>

      {/* Estimate Result Alert */}
      {estimateResult && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <span>
              Estimated Rehab Cost:{" "}
              <strong>
                {formatCurrency(
                  lineItems.reduce((sum, item) => sum + item.estimatedCost, 0)
                )}
              </strong>
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Line Items Editor or Finalized View */}
      {lineItems.length > 0 && !isFinalized && (
        <>
          <LineItemEditor
            lineItems={lineItems}
            onChange={handleLineItemsChange}
            totalSqft={totalSqft}
          />
          <Button
            onClick={handleFinalizeScope}
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Finalize Scope of Work
          </Button>
        </>
      )}

      {/* Finalized Receipt View */}
      {lineItems.length > 0 && isFinalized && (
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Scope of Work - Finalized
              </CardTitle>
              <Button onClick={handleEditScope} variant="outline" size="sm">
                Edit
              </Button>
            </div>
            <CardDescription>
              Clean summary of all rehab items and costs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 bg-white rounded-lg p-4 border">
              {/* Group by category */}
              {["structural", "systems", "interior", "exterior"].map(
                (category) => {
                  const categoryItems = lineItems.filter(
                    (item) => item.category === category
                  );
                  if (categoryItems.length === 0) return null;

                  return (
                    <div key={category} className="space-y-1">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide pt-2 pb-1 border-b">
                        {category}
                      </div>
                      {categoryItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center py-1 text-sm"
                        >
                          <span className="text-muted-foreground">
                            {item.description}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(item.estimatedCost)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }
              )}

              {/* Total */}
              <div className="pt-3 mt-3 border-t-2 border-green-600 space-y-1">
                <div className="flex justify-between items-center">
                  <span>Total Rehab Cost</span>
                  <span className="text-lg">
                    {formatCurrency(
                      lineItems.reduce(
                        (sum, item) => sum + item.estimatedCost,
                        0
                      )
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Cost per Square Foot</span>
                  <span>
                    $
                    {(
                      lineItems.reduce(
                        (sum, item) => sum + item.estimatedCost,
                        0
                      ) / totalSqft
                    ).toFixed(2)}
                    /sqft
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parse ChatGPT Response Dialog */}
      <Dialog open={showParseDialog} onOpenChange={setShowParseDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Parse ChatGPT Response</DialogTitle>
            <DialogDescription>
              Paste the complete ChatGPT response below. The parser will
              automatically extract condition values and fill in matching
              fields. Unknown fields will be highlighted in yellow.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ChatGPT Response</Label>
              <Textarea
                value={parseText}
                onChange={(e) => setParseText(e.target.value)}
                placeholder="Paste the complete ChatGPT analysis here..."
                rows={15}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Tip: Use the "Copy ChatGPT Prompt" button, send it to ChatGPT
                with the listing, then paste the complete response here.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowParseDialog(false);
                setParseText("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleParseChatGPT} disabled={!parseText.trim()}>
              <Wand2 className="h-4 w-4 mr-2" />
              Parse & Auto-Fill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Rehab Section Confirmation Dialog */}
      <Dialog
        open={showClearConfirmDialog}
        onOpenChange={setShowClearConfirmDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Clear All Rehab Data?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete ALL rehab data including:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>All property condition assessments</li>
                  <li>Detailed scope of work & line items</li>
                  <li>Cost estimates & assumptions</li>
                  <li>Realtor contact information</li>
                  <li>ChatGPT insights & general notes</li>
                </ul>
                <p className="mt-2 font-semibold">
                  This action cannot be undone!
                </p>
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClearConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearRehabSection}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Yes, Clear Everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
