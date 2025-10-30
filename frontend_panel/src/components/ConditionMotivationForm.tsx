import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
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
import { Checkbox } from "./ui/checkbox";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { DealNotes } from "../types/deal";
import {
  Plus,
  Trash2,
  Calculator,
  TrendingUp,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import {
  analyzePropertyCondition,
  getConditionScoreDescription,
  formatBreakdown,
  RehabEstimateResult,
} from "../utils/intelligentRehabEstimator";
import { formatCurrency } from "../utils/calculations";
import { toast } from "sonner";
import { LineItemEditor, LineItem } from "./LineItemEditor";
import { generateLineItems } from "../utils/lineItemGenerator";

interface ConditionMotivationFormProps {
  notes: DealNotes;
  onChange: (notes: DealNotes) => void;
  address?: string;
  totalSqft?: number;
  units?: number;
  onRehabEstimateGenerated?: (estimate: RehabEstimateResult) => void;
  onRehabCostChange?: (cost: number) => void; // New callback for total rehab cost changes
}

export function ConditionMotivationForm({
  notes,
  onChange,
  address,
  totalSqft = 1500,
  units = 1,
  onRehabEstimateGenerated,
  onRehabCostChange,
}: ConditionMotivationFormProps) {
  const [localNotes, setLocalNotes] = useState<DealNotes>(notes);
  const [estimateResult, setEstimateResult] =
    useState<RehabEstimateResult | null>(null);
  const [showEstimateDetails, setShowEstimateDetails] = useState(false);
  const [estimateIsStale, setEstimateIsStale] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Notify parent when line items total changes
  useEffect(() => {
    const total = lineItems.reduce((sum, item) => sum + item.estimatedCost, 0);
    if (onRehabCostChange && total > 0) {
      onRehabCostChange(total);
    }
  }, [lineItems, onRehabCostChange]);

  // Auto-save when notes change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange({
        ...localNotes,
        lastUpdated: new Date().toISOString(),
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [localNotes]);

  // Update local notes when parent notes change (e.g., loading a different deal)
  useEffect(() => {
    setLocalNotes(notes);
  }, [notes.lastUpdated]);

  const updateField = (path: string[], value: any) => {
    setLocalNotes((prev) => {
      const updated = { ...prev };
      let current: any = updated;

      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }

      current[path[path.length - 1]] = value;
      return updated;
    });

    // Mark estimate as stale when ANY field changes (all details affect rehab costs)
    // Exclude only metadata fields that don't impact cost calculations
    const excludedFields = ["lastUpdated", "estimatedRehabCost"];
    if (estimateResult && !excludedFields.includes(path[0])) {
      setEstimateIsStale(true);
    }
  };

  const addBathroom = () => {
    setLocalNotes((prev) => ({
      ...prev,
      bathrooms: [
        ...prev.bathrooms,
        {
          location: `Bathroom ${prev.bathrooms.length + 1}`,
          condition: "",
          vanity: "",
          toilet: "",
          tubShower: "",
          tile: "",
          notes: "",
        },
      ],
    }));
    // Mark estimate as stale when room count changes
    if (estimateResult) {
      setEstimateIsStale(true);
    }
  };

  const removeBathroom = (index: number) => {
    setLocalNotes((prev) => ({
      ...prev,
      bathrooms: prev.bathrooms.filter((_, i) => i !== index),
    }));
    // Mark estimate as stale when room count changes
    if (estimateResult) {
      setEstimateIsStale(true);
    }
  };

  const addBedroom = () => {
    setLocalNotes((prev) => ({
      ...prev,
      bedrooms: [
        ...prev.bedrooms,
        {
          location: `Bedroom ${prev.bedrooms.length + 1}`,
          flooring: "",
          closets: "",
          condition: "",
          notes: "",
        },
      ],
    }));
    // Mark estimate as stale when room count changes
    if (estimateResult) {
      setEstimateIsStale(true);
    }
  };

  const removeBedroom = (index: number) => {
    setLocalNotes((prev) => ({
      ...prev,
      bedrooms: prev.bedrooms.filter((_, i) => i !== index),
    }));
    // Mark estimate as stale when room count changes
    if (estimateResult) {
      setEstimateIsStale(true);
    }
  };

  const handleGenerateEstimate = () => {
    try {
      const result = analyzePropertyCondition(localNotes, totalSqft, units);
      setEstimateResult(result);
      setShowEstimateDetails(true);
      setEstimateIsStale(false); // Clear stale flag

      // Generate detailed line items from property condition
      const generatedItems = generateLineItems(localNotes, totalSqft, units);
      setLineItems(generatedItems);

      // Update the estimated rehab cost field
      updateField(["estimatedRehabCost"], formatCurrency(result.estimatedCost));

      // Notify parent component if callback provided
      if (onRehabEstimateGenerated) {
        onRehabEstimateGenerated(result);
      }

      toast.success(
        `Generated ${generatedItems.length} line items for scope of work!`
      );
    } catch (error) {
      toast.error("Error generating estimate. Please check condition data.");
      console.error("Estimate generation error:", error);
    }
  };

  // Calculate live rough estimates for quick feedback (no AI, just simple math)
  const calculateQuickEstimates = () => {
    const estimates: { item: string; cost: string }[] = [];

    // Roof
    if (localNotes.roof.condition?.includes("Needs Replacement")) {
      const roofCost = Math.round((totalSqft / 100) * 1800); // ~$18/sqft for roof
      estimates.push({
        item: "Roof Replacement",
        cost: `~${(roofCost / 1000).toFixed(0)}k`,
      });
    } else if (localNotes.roof.leaks) {
      estimates.push({ item: "Roof Repairs", cost: "~$3-5k" });
    }

    // HVAC
    if (
      localNotes.hvac.condition &&
      (localNotes.hvac.condition.includes("Old") ||
        localNotes.hvac.condition.includes("Not Working"))
    ) {
      const hvacUnits = parseInt(localNotes.hvac.numberOfUnits) || units || 1;
      estimates.push({
        item: `HVAC Replacement (${hvacUnits} unit${hvacUnits > 1 ? "s" : ""})`,
        cost: `~${(hvacUnits * 6).toFixed(0)}k`,
      });
    }

    // Kitchen
    if (localNotes.kitchen.condition === "Needs Full Rehab") {
      estimates.push({ item: "Kitchen Full Remodel", cost: "~$15-25k" });
    } else if (localNotes.kitchen.condition === "Dated") {
      estimates.push({ item: "Kitchen Cosmetic Update", cost: "~$5-10k" });
    }

    // Bathrooms
    const poorBaths = localNotes.bathrooms.filter(
      (b) => b.condition === "Poor"
    ).length;
    if (poorBaths > 0) {
      estimates.push({
        item: `Bathroom Remodel${poorBaths > 1 ? "s" : ""} (${poorBaths})`,
        cost: `~${(poorBaths * 10).toFixed(0)}k`,
      });
    }

    // Plumbing
    if (localNotes.plumbing.pipeMaterial === "Galvanized") {
      estimates.push({ item: "Galvanized Pipe Replacement", cost: "~$8-15k" });
    }

    // Electrical
    if (
      localNotes.electrical.wiringType === "Knob & Tube" ||
      localNotes.electrical.wiringType === "Aluminum"
    ) {
      estimates.push({ item: "Complete Rewiring", cost: "~$10-20k" });
    }

    // Windows
    if (
      localNotes.exterior.windows === "Old Single Pane" ||
      localNotes.exterior.windows === "Broken/Missing"
    ) {
      estimates.push({ item: "Window Replacement", cost: "~$8-15k" });
    }

    // Red flags
    if (localNotes.additionalIssues.waterDamage) {
      estimates.push({ item: "Water Damage Repairs", cost: "~$3-10k" });
    }
    if (localNotes.additionalIssues.mold) {
      estimates.push({ item: "Mold Remediation", cost: "~$5-15k" });
    }
    if (
      localNotes.additionalIssues.structuralIssues ||
      localNotes.foundation.condition === "Major Issues"
    ) {
      estimates.push({ item: "Structural Repairs", cost: "~$10-50k+" });
    }

    return estimates;
  };

  const applyPreset = (
    presetType: "cosmetic" | "kitchen-bath" | "major-systems" | "full-gut"
  ) => {
    const presets = {
      cosmetic: {
        overallCondition: "Good" as const,
        roof: {
          condition: "Good (6-15 yrs)" as const,
          age: "10",
          leaks: false,
          notes: "",
        },
        hvac: {
          condition: "Good (6-10 yrs)" as const,
          age: "8",
          numberOfUnits: "1",
          notes: "",
        },
        kitchen: {
          condition: "Dated" as const,
          cabinets: "Good",
          countertops: "Laminate Worn",
          appliances: "Old",
          flooring: "Needs Replacement",
          notes: "",
        },
        interior: {
          flooring: "Needs Replacement",
          walls: "Needs Paint",
          ceilings: "Good",
          lighting: "Outdated",
          openFloorPlan: false,
          notes: "",
        },
        exterior: {
          ...localNotes.exterior,
          siding: "Needs Paint" as const,
          windows: "Good" as const,
        },
        plumbing: { ...localNotes.plumbing, condition: "Good" as const },
        electrical: {
          ...localNotes.electrical,
          condition: "Adequate" as const,
        },
        foundation: { ...localNotes.foundation, condition: "Good" as const },
      },
      "kitchen-bath": {
        overallCondition: "Fair" as const,
        roof: {
          condition: "Fair (16-20 yrs)" as const,
          age: "18",
          leaks: false,
          notes: "",
        },
        hvac: {
          condition: "Good (6-10 yrs)" as const,
          age: "8",
          numberOfUnits: "1",
          notes: "",
        },
        kitchen: {
          condition: "Needs Full Rehab" as const,
          cabinets: "Needs Replacement",
          countertops: "Needs Replacement",
          appliances: "Missing/Broken",
          flooring: "Needs Replacement",
          notes: "",
        },
        interior: {
          flooring: "Mixed",
          walls: "Needs Paint",
          ceilings: "Good",
          lighting: "Outdated",
          openFloorPlan: false,
          notes: "",
        },
        exterior: {
          ...localNotes.exterior,
          siding: "Good" as const,
          windows: "Good" as const,
        },
        plumbing: { ...localNotes.plumbing, condition: "Good" as const },
        electrical: {
          ...localNotes.electrical,
          condition: "Adequate" as const,
        },
        foundation: { ...localNotes.foundation, condition: "Good" as const },
      },
      "major-systems": {
        overallCondition: "Fair" as const,
        roof: {
          condition: "Needs Replacement" as const,
          age: "25",
          leaks: true,
          notes: "Roof replacement needed",
        },
        hvac: {
          condition: "Old (15+ yrs)" as const,
          age: "18",
          numberOfUnits: "1",
          notes: "Needs replacement",
        },
        kitchen: {
          condition: "Dated" as const,
          cabinets: "Worn",
          countertops: "Laminate Worn",
          appliances: "Old",
          flooring: "Vinyl",
          notes: "",
        },
        interior: {
          flooring: "Good",
          walls: "Good",
          ceilings: "Good",
          lighting: "Adequate",
          openFloorPlan: false,
          notes: "",
        },
        exterior: {
          ...localNotes.exterior,
          siding: "Needs Repair" as const,
          windows: "Old Single Pane" as const,
        },
        plumbing: {
          ...localNotes.plumbing,
          condition: "Has Issues" as const,
          pipeMaterial: "Galvanized",
          leaks: true,
        },
        electrical: {
          ...localNotes.electrical,
          condition: "Needs Work" as const,
          wiringType: "Aluminum",
        },
        foundation: {
          ...localNotes.foundation,
          condition: "Minor Cracks" as const,
        },
      },
      "full-gut": {
        overallCondition: "Poor" as const,
        roof: {
          condition: "Needs Replacement" as const,
          age: "30",
          leaks: true,
          notes: "Complete replacement",
        },
        hvac: {
          condition: "Not Working" as const,
          age: "25",
          numberOfUnits: "1",
          notes: "Replace all systems",
        },
        kitchen: {
          condition: "Needs Full Rehab" as const,
          cabinets: "Needs Replacement",
          countertops: "Needs Replacement",
          appliances: "Missing/Broken",
          flooring: "Needs Replacement",
          notes: "Complete kitchen gut",
        },
        interior: {
          flooring: "Needs Replacement",
          walls: "Needs Repair",
          ceilings: "Needs Repair",
          lighting: "Outdated",
          openFloorPlan: false,
          notes: "Complete interior renovation",
        },
        exterior: {
          ...localNotes.exterior,
          siding: "Needs Replacement" as const,
          windows: "Broken/Missing" as const,
        },
        plumbing: {
          ...localNotes.plumbing,
          condition: "Needs Replacement" as const,
          pipeMaterial: "Galvanized",
          leaks: true,
        },
        electrical: {
          ...localNotes.electrical,
          condition: "Unsafe" as const,
          wiringType: "Knob & Tube",
        },
        foundation: {
          ...localNotes.foundation,
          condition: "Major Issues" as const,
          notes: "Structural repairs needed",
        },
      },
    };

    const selectedPreset = presets[presetType];
    const presetNames = {
      cosmetic: "Cosmetic Only",
      "kitchen-bath": "Kitchen/Bath",
      "major-systems": "Major Systems",
      "full-gut": "Full Gut",
    };

    setLocalNotes((prev) => ({
      ...prev,
      ...selectedPreset,
      estimatedRehabCost: "", // Clear so new estimate can be generated
    }));

    // Mark estimate as stale when preset is applied
    if (estimateResult) {
      setEstimateIsStale(true);
    }

    toast.success(
      `Applied ${presetNames[presetType]} preset. Click "Generate Estimate" to calculate cost.`
    );
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl">Property Condition - Quick Assessment</h3>
          <p className="text-sm text-muted-foreground">
            {address ||
              "Focus on major cost drivers: Roof, HVAC, Kitchen, Baths, and red flags"}
          </p>
        </div>
        {localNotes.overallCondition && (
          <Badge variant="outline" className="text-sm px-4 py-2">
            {localNotes.overallCondition}
          </Badge>
        )}
      </div>

      {localNotes.lastUpdated && (
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date(localNotes.lastUpdated).toLocaleString()}
        </p>
      )}

      {/* Quick Help Card */}
      <Alert>
        <AlertDescription>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="font-medium mb-1">⚡ Speed Tips:</p>
              <p className="text-sm text-muted-foreground">
                1. Start with a <strong>Quick Preset</strong> below • 2. Focus
                on <strong>Roof, HVAC, Kitchen, Baths</strong> • 3. Check any{" "}
                <strong>Red Flags</strong> • 4. Click{" "}
                <strong>Generate Estimate</strong> • 5. Done in 5 minutes!
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium text-green-600">Target: 5-10 min</p>
              <p className="text-xs text-muted-foreground">
                vs 20+ min traditional
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Quick Presets for Common Scenarios */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">⚡ Quick Presets</CardTitle>
          <p className="text-sm text-muted-foreground">
            Start with a common scenario, then customize
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset("cosmetic")}
            >
              💄 Cosmetic Only
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset("kitchen-bath")}
            >
              🏠 Kitchen/Bath
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset("major-systems")}
            >
              🔧 Major Systems
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset("full-gut")}
            >
              🏗️ Full Gut
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deal Context - Collapsed */}
      <Collapsible>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <div>
                  <CardTitle>Deal Context & Contacts (Optional)</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Realtor info and seller motivation
                  </p>
                </div>
                <ChevronDown className="h-5 w-5" />
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div>
                <Label>Seller Motivation</Label>
                <Textarea
                  value={localNotes.sellerMotivation}
                  onChange={(e) =>
                    updateField(["sellerMotivation"], e.target.value)
                  }
                  placeholder="e.g., Relocating, financial distress, tired landlord, estate sale, divorce..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Realtor Name</Label>
                  <Input
                    value={localNotes.realtorName}
                    onChange={(e) =>
                      updateField(["realtorName"], e.target.value)
                    }
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={localNotes.realtorPhone}
                    onChange={(e) =>
                      updateField(["realtorPhone"], e.target.value)
                    }
                    placeholder="(954) 555-1234"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={localNotes.realtorEmail}
                    onChange={(e) =>
                      updateField(["realtorEmail"], e.target.value)
                    }
                    placeholder="john@realty.com"
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Overall Property Assessment */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Property Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Overall Condition</Label>
              <Select
                value={localNotes.overallCondition}
                onValueChange={(val) => updateField(["overallCondition"], val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excellent">
                    Excellent - Move-in Ready
                  </SelectItem>
                  <SelectItem value="Good">
                    Good - Minor Updates Needed
                  </SelectItem>
                  <SelectItem value="Fair">
                    Fair - Moderate Rehab Required
                  </SelectItem>
                  <SelectItem value="Poor">
                    Poor - Major Rehab Required
                  </SelectItem>
                  <SelectItem value="Uninhabitable">
                    Uninhabitable - Full Gut
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estimated Rehab Cost</Label>
              <Input
                value={localNotes.estimatedRehabCost}
                onChange={(e) =>
                  updateField(["estimatedRehabCost"], e.target.value)
                }
                placeholder="$50,000"
              />
            </div>
          </div>

          {/* Intelligent Estimate Generator */}
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  AI-Powered Rehab Estimator
                </h4>
                <p className="text-sm text-muted-foreground">
                  Analyzes all condition data to generate intelligent cost
                  estimate
                </p>
              </div>
              <Button
                onClick={handleGenerateEstimate}
                variant={estimateIsStale ? "destructive" : "default"}
                size="sm"
                className={estimateIsStale ? "animate-pulse" : ""}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                {estimateIsStale
                  ? "Update Estimate (Changed)"
                  : estimateResult
                  ? "Regenerate Estimate"
                  : "Generate Estimate"}
              </Button>
            </div>

            {estimateResult && (
              <Alert
                className={`mt-3 ${
                  estimateIsStale ? "border-orange-300 bg-orange-50/50" : ""
                }`}
              >
                <AlertCircle
                  className={`h-4 w-4 ${
                    estimateIsStale ? "text-orange-600" : ""
                  }`}
                />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Estimated Cost:</span>
                        <span
                          className={`text-lg font-semibold ${
                            estimateIsStale
                              ? "text-orange-600 line-through"
                              : "text-green-600"
                          }`}
                        >
                          {formatCurrency(estimateResult.estimatedCost)}
                        </span>
                        {estimateIsStale && (
                          <Badge
                            variant="outline"
                            className="text-orange-600 border-orange-300"
                          >
                            Outdated - Regenerate
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setShowEstimateDetails(!showEstimateDetails)
                        }
                      >
                        {showEstimateDetails ? "Hide Details" : "Show Details"}
                      </Button>
                    </div>

                    {showEstimateDetails && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Suggested Level:</span>
                          <Badge variant="outline">
                            {estimateResult.suggestedCondition.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Condition Score:</span>
                          <span>{estimateResult.conditionScore}/100</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-2">
                          {getConditionScoreDescription(
                            estimateResult.conditionScore
                          )}
                        </div>
                        {estimateResult.majorIssues.length > 0 && (
                          <div className="mt-3 border-t pt-2">
                            <p className="text-sm font-medium mb-1">
                              Major Issues Identified:
                            </p>
                            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                              {estimateResult.majorIssues.map((issue, idx) => (
                                <li key={idx}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="mt-2 text-xs text-muted-foreground">
                          Based on {totalSqft} sqft, {units} unit
                          {units > 1 ? "s" : ""}
                        </div>
                      </>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Line Item Editor - Detailed Scope of Work */}
      {lineItems.length > 0 && (
        <LineItemEditor
          lineItems={lineItems}
          onChange={setLineItems}
          totalSqft={totalSqft}
        />
      )}

      {/* Structural & Major Systems */}
      <Card>
        <CardHeader>
          <CardTitle>Structural & Major Systems</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Roof */}
          <div className="space-y-3 border-b pb-4">
            <h4 className="font-medium">Roof</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Condition</Label>
                <Select
                  value={localNotes.roof.condition}
                  onValueChange={(val) =>
                    updateField(["roof", "condition"], val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New (0-5 yrs)">
                      New (0-5 years)
                    </SelectItem>
                    <SelectItem value="Good (6-15 yrs)">
                      Good (6-15 years)
                    </SelectItem>
                    <SelectItem value="Fair (16-20 yrs)">
                      Fair (16-20 years)
                    </SelectItem>
                    <SelectItem value="Poor (20+ yrs)">
                      Poor (20+ years)
                    </SelectItem>
                    <SelectItem value="Needs Replacement">
                      Needs Replacement
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Age (years)</Label>
                <Input
                  value={localNotes.roof.age}
                  onChange={(e) => updateField(["roof", "age"], e.target.value)}
                  placeholder="10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={localNotes.roof.leaks}
                onCheckedChange={(checked) =>
                  updateField(["roof", "leaks"], checked)
                }
              />
              <Label>Has Leaks or Water Damage</Label>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={localNotes.roof.notes}
                onChange={(e) => updateField(["roof", "notes"], e.target.value)}
                placeholder="Details about roof condition, materials, etc."
                rows={2}
              />
            </div>
          </div>

          {/* Foundation */}
          <div className="space-y-3 border-b pb-4">
            <h4 className="font-medium">Foundation</h4>
            <div>
              <Label>Condition</Label>
              <Select
                value={localNotes.foundation.condition}
                onValueChange={(val) =>
                  updateField(["foundation", "condition"], val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excellent">Excellent</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Minor Cracks">Minor Cracks</SelectItem>
                  <SelectItem value="Major Issues">Major Issues</SelectItem>
                  <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={localNotes.foundation.notes}
                onChange={(e) =>
                  updateField(["foundation", "notes"], e.target.value)
                }
                placeholder="Details about foundation issues, settlement, etc."
                rows={2}
              />
            </div>
          </div>

          {/* HVAC */}
          <div className="space-y-3 border-b pb-4">
            <h4 className="font-medium">HVAC System</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Condition</Label>
                <Select
                  value={localNotes.hvac.condition}
                  onValueChange={(val) =>
                    updateField(["hvac", "condition"], val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New (0-5 yrs)">
                      New (0-5 years)
                    </SelectItem>
                    <SelectItem value="Good (6-10 yrs)">
                      Good (6-10 years)
                    </SelectItem>
                    <SelectItem value="Fair (11-15 yrs)">
                      Fair (11-15 years)
                    </SelectItem>
                    <SelectItem value="Old (15+ yrs)">
                      Old (15+ years)
                    </SelectItem>
                    <SelectItem value="Not Working">Not Working</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Age (years)</Label>
                <Input
                  value={localNotes.hvac.age}
                  onChange={(e) => updateField(["hvac", "age"], e.target.value)}
                  placeholder="8"
                />
              </div>
              <div>
                <Label>Number of Units</Label>
                <Input
                  value={localNotes.hvac.numberOfUnits}
                  onChange={(e) =>
                    updateField(["hvac", "numberOfUnits"], e.target.value)
                  }
                  placeholder="1"
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={localNotes.hvac.notes}
                onChange={(e) => updateField(["hvac", "notes"], e.target.value)}
                placeholder="Details about HVAC system, efficiency, etc."
                rows={2}
              />
            </div>
          </div>

          {/* Plumbing */}
          <div className="space-y-3 border-b pb-4">
            <h4 className="font-medium">Plumbing</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Condition</Label>
                <Select
                  value={localNotes.plumbing.condition}
                  onValueChange={(val) =>
                    updateField(["plumbing", "condition"], val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Excellent">Excellent</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Has Issues">Has Issues</SelectItem>
                    <SelectItem value="Needs Replacement">
                      Needs Replacement
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pipe Material</Label>
                <Select
                  value={localNotes.plumbing.pipeMaterial}
                  onValueChange={(val) =>
                    updateField(["plumbing", "pipeMaterial"], val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Copper">Copper</SelectItem>
                    <SelectItem value="PEX">PEX</SelectItem>
                    <SelectItem value="PVC">PVC</SelectItem>
                    <SelectItem value="Galvanized">Galvanized (Old)</SelectItem>
                    <SelectItem value="Mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Water Heater</Label>
                <Select
                  value={localNotes.plumbing.waterHeater}
                  onValueChange={(val) =>
                    updateField(["plumbing", "waterHeater"], val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Old">Old</SelectItem>
                    <SelectItem value="Needs Replacement">
                      Needs Replacement
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={localNotes.plumbing.leaks}
                onCheckedChange={(checked) =>
                  updateField(["plumbing", "leaks"], checked)
                }
              />
              <Label>Has Leaks or Plumbing Issues</Label>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={localNotes.plumbing.notes}
                onChange={(e) =>
                  updateField(["plumbing", "notes"], e.target.value)
                }
                placeholder="Details about plumbing issues, water pressure, etc."
                rows={2}
              />
            </div>
          </div>

          {/* Electrical */}
          <div className="space-y-3">
            <h4 className="font-medium">Electrical</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Condition</Label>
                <Select
                  value={localNotes.electrical.condition}
                  onValueChange={(val) =>
                    updateField(["electrical", "condition"], val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Updated">Updated</SelectItem>
                    <SelectItem value="Adequate">Adequate</SelectItem>
                    <SelectItem value="Needs Work">Needs Work</SelectItem>
                    <SelectItem value="Unsafe">Unsafe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Panel Size (Amps)</Label>
                <Input
                  value={localNotes.electrical.panelSize}
                  onChange={(e) =>
                    updateField(["electrical", "panelSize"], e.target.value)
                  }
                  placeholder="200"
                />
              </div>
              <div>
                <Label>Wiring Type</Label>
                <Select
                  value={localNotes.electrical.wiringType}
                  onValueChange={(val) =>
                    updateField(["electrical", "wiringType"], val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Modern">Modern (Romex)</SelectItem>
                    <SelectItem value="Aluminum">Aluminum</SelectItem>
                    <SelectItem value="Knob & Tube">
                      Knob & Tube (Old)
                    </SelectItem>
                    <SelectItem value="Mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={localNotes.electrical.notes}
                onChange={(e) =>
                  updateField(["electrical", "notes"], e.target.value)
                }
                placeholder="Details about electrical issues, outlets, GFCI, etc."
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exterior - Collapsed, lower priority unless major issues */}
      <Collapsible>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <div>
                  <CardTitle>Exterior (Optional Details)</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Expand if exterior needs major work
                  </p>
                </div>
                <ChevronDown className="h-5 w-5" />
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Siding Condition</Label>
                  <Select
                    value={localNotes.exterior.siding}
                    onValueChange={(val) =>
                      updateField(["exterior", "siding"], val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Excellent">Excellent</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Needs Paint">Needs Paint</SelectItem>
                      <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                      <SelectItem value="Needs Replacement">
                        Needs Replacement
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Siding Type</Label>
                  <Select
                    value={localNotes.exterior.sidingType}
                    onValueChange={(val) =>
                      updateField(["exterior", "sidingType"], val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Stucco">Stucco</SelectItem>
                      <SelectItem value="Vinyl">Vinyl</SelectItem>
                      <SelectItem value="Wood">Wood</SelectItem>
                      <SelectItem value="Brick">Brick</SelectItem>
                      <SelectItem value="Concrete Block">
                        Concrete Block
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Windows</Label>
                  <Select
                    value={localNotes.exterior.windows}
                    onValueChange={(val) =>
                      updateField(["exterior", "windows"], val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Old Single Pane">
                        Old Single Pane
                      </SelectItem>
                      <SelectItem value="Broken/Missing">
                        Broken/Missing
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Doors</Label>
                  <Select
                    value={localNotes.exterior.doors}
                    onValueChange={(val) =>
                      updateField(["exterior", "doors"], val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Excellent">Excellent</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Worn">Worn</SelectItem>
                      <SelectItem value="Needs Replacement">
                        Needs Replacement
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Gutters</Label>
                  <Select
                    value={localNotes.exterior.gutters}
                    onValueChange={(val) =>
                      updateField(["exterior", "gutters"], val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                      <SelectItem value="Missing">Missing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Landscaping</Label>
                  <Select
                    value={localNotes.exterior.landscaping}
                    onValueChange={(val) =>
                      updateField(["exterior", "landscaping"], val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
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
                <div>
                  <Label>Fencing</Label>
                  <Select
                    value={localNotes.exterior.fencing}
                    onValueChange={(val) =>
                      updateField(["exterior", "fencing"], val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                      <SelectItem value="None">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Driveway</Label>
                  <Select
                    value={localNotes.exterior.driveway}
                    onValueChange={(val) =>
                      updateField(["exterior", "driveway"], val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Excellent">Excellent</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Cracked">Cracked</SelectItem>
                      <SelectItem value="Needs Replacement">
                        Needs Replacement
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={localNotes.exterior.notes}
                  onChange={(e) =>
                    updateField(["exterior", "notes"], e.target.value)
                  }
                  placeholder="Details about exterior condition, curb appeal, etc."
                  rows={2}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Kitchen */}
      <Card>
        <CardHeader>
          <CardTitle>Kitchen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Overall Condition</Label>
              <Select
                value={localNotes.kitchen.condition}
                onValueChange={(val) =>
                  updateField(["kitchen", "condition"], val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Modern">
                    Modern - Fully Renovated
                  </SelectItem>
                  <SelectItem value="Updated">
                    Updated - Good Condition
                  </SelectItem>
                  <SelectItem value="Dated">Dated - Functional</SelectItem>
                  <SelectItem value="Needs Full Rehab">
                    Needs Full Rehab
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cabinets</Label>
              <Select
                value={localNotes.kitchen.cabinets}
                onValueChange={(val) =>
                  updateField(["kitchen", "cabinets"], val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excellent">Excellent</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Worn">Worn</SelectItem>
                  <SelectItem value="Needs Replacement">
                    Needs Replacement
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Countertops</Label>
              <Select
                value={localNotes.kitchen.countertops}
                onValueChange={(val) =>
                  updateField(["kitchen", "countertops"], val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type/condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Granite/Quartz">Granite/Quartz</SelectItem>
                  <SelectItem value="Laminate Good">Laminate - Good</SelectItem>
                  <SelectItem value="Laminate Worn">Laminate - Worn</SelectItem>
                  <SelectItem value="Needs Replacement">
                    Needs Replacement
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Appliances</Label>
              <Select
                value={localNotes.kitchen.appliances}
                onValueChange={(val) =>
                  updateField(["kitchen", "appliances"], val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All New">All New/Stainless</SelectItem>
                  <SelectItem value="Most Good">Most Good</SelectItem>
                  <SelectItem value="Old">Old</SelectItem>
                  <SelectItem value="Missing/Broken">Missing/Broken</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Flooring</Label>
              <Select
                value={localNotes.kitchen.flooring}
                onValueChange={(val) =>
                  updateField(["kitchen", "flooring"], val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tile">Tile</SelectItem>
                  <SelectItem value="Vinyl">Vinyl</SelectItem>
                  <SelectItem value="Wood">Wood</SelectItem>
                  <SelectItem value="Needs Replacement">
                    Needs Replacement
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={localNotes.kitchen.notes}
              onChange={(e) =>
                updateField(["kitchen", "notes"], e.target.value)
              }
              placeholder="Details about kitchen layout, size, etc."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bathrooms - Simplified */}
      <Card>
        <CardHeader>
          <CardTitle>Bathrooms - Quick Assessment</CardTitle>
          <p className="text-sm text-muted-foreground">
            Overall bathroom condition (major cost driver)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Number of Bathrooms Needing Full Remodel</Label>
              <Input
                type="number"
                min="0"
                value={
                  localNotes.bathrooms.filter((b) => b.condition === "Poor")
                    .length
                }
                onChange={(e) => {
                  const count = parseInt(e.target.value) || 0;
                  const baths = Array(count)
                    .fill(null)
                    .map((_, i) => ({
                      location: `Bathroom ${i + 1}`,
                      condition: "Poor" as const,
                      vanity: "Needs Replacement",
                      toilet: "Needs Replacement",
                      tubShower: "Cracked/Damaged",
                      tile: "Cracked/Missing",
                      notes: "",
                    }));
                  updateField(["bathrooms"], baths);
                }}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Average Bathroom Condition</Label>
              <Select
                value={localNotes.bathrooms[0]?.condition || ""}
                onValueChange={(val) => {
                  // Set all bathrooms to same condition for simplicity
                  const updated = localNotes.bathrooms.map((bath) => ({
                    ...bath,
                    condition: val as any,
                  }));
                  if (updated.length === 0 && val) {
                    updated.push({
                      location: "Bathroom 1",
                      condition: val as any,
                      vanity: val === "Poor" ? "Needs Replacement" : "Good",
                      toilet: "Good",
                      tubShower: val === "Poor" ? "Worn/Stained" : "Good",
                      tile: val === "Poor" ? "Dated" : "Good",
                      notes: "",
                    });
                  }
                  updateField(["bathrooms"], updated);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select overall condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excellent">
                    Excellent - Recently Updated
                  </SelectItem>
                  <SelectItem value="Good">Good - Functional</SelectItem>
                  <SelectItem value="Dated">
                    Dated - Needs Cosmetic Update
                  </SelectItem>
                  <SelectItem value="Poor">
                    Poor - Full Remodel Needed
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Bathroom Notes (Optional)</Label>
            <Textarea
              value={localNotes.bathrooms[0]?.notes || ""}
              onChange={(e) => {
                const updated =
                  localNotes.bathrooms.length > 0
                    ? localNotes.bathrooms.map((bath) => ({
                        ...bath,
                        notes: e.target.value,
                      }))
                    : [
                        {
                          location: "Bathroom 1",
                          condition: "",
                          vanity: "",
                          toilet: "",
                          tubShower: "",
                          tile: "",
                          notes: e.target.value,
                        },
                      ];
                updateField(["bathrooms"], updated);
              }}
              placeholder="Any critical bathroom issues..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bedrooms - Simplified - Usually not a major cost driver */}
      <Card>
        <CardHeader>
          <CardTitle>Bedrooms - Quick Notes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Bedrooms are typically low-cost (paint/carpet/fixtures)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Flooring Condition</Label>
              <Select
                value={localNotes.bedrooms[0]?.flooring || ""}
                onValueChange={(val) => {
                  const updated =
                    localNotes.bedrooms.length > 0
                      ? localNotes.bedrooms.map((bed) => ({
                          ...bed,
                          flooring: val as any,
                        }))
                      : [
                          {
                            location: "Bedrooms",
                            flooring: val as any,
                            closets: "",
                            condition: "",
                            notes: "",
                          },
                        ];
                  updateField(["bedrooms"], updated);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tile">Tile/Wood - Good</SelectItem>
                  <SelectItem value="Carpet Good">Carpet - Good</SelectItem>
                  <SelectItem value="Carpet Worn">
                    Carpet - Worn (Replace)
                  </SelectItem>
                  <SelectItem value="Needs Replacement">
                    All Flooring Needs Replacement
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Paint/Wall Condition</Label>
              <Select
                value={localNotes.bedrooms[0]?.condition || ""}
                onValueChange={(val) => {
                  const updated =
                    localNotes.bedrooms.length > 0
                      ? localNotes.bedrooms.map((bed) => ({
                          ...bed,
                          condition: val as any,
                        }))
                      : [
                          {
                            location: "Bedrooms",
                            flooring: "",
                            closets: "",
                            condition: val as any,
                            notes: "",
                          },
                        ];
                  updateField(["bedrooms"], updated);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excellent">
                    Excellent - Recently Painted
                  </SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Needs Paint">Needs Paint</SelectItem>
                  <SelectItem value="Needs Work">
                    Needs Repairs + Paint
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interior General - Collapsed by default, usually low cost */}
      <Collapsible>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <div>
                  <CardTitle>Interior - General (Optional Details)</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Usually low-cost items - expand if needed
                  </p>
                </div>
                <ChevronDown className="h-5 w-5" />
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Overall Flooring</Label>
                  <Select
                    value={localNotes.interior.flooring}
                    onValueChange={(val) =>
                      updateField(["interior", "flooring"], val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Excellent">Excellent</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Mixed">Mixed</SelectItem>
                      <SelectItem value="Needs Replacement">
                        Needs Replacement
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Walls</Label>
                  <Select
                    value={localNotes.interior.walls}
                    onValueChange={(val) =>
                      updateField(["interior", "walls"], val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Excellent">Excellent</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Needs Paint">Needs Paint</SelectItem>
                      <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={localNotes.interior.notes}
                  onChange={(e) =>
                    updateField(["interior", "notes"], e.target.value)
                  }
                  placeholder="Details about layout, flow, etc."
                  rows={2}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Pool - Collapsed unless applicable */}
      <Collapsible>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={localNotes.pool.hasPool}
                    onCheckedChange={(checked) => {
                      updateField(["pool", "hasPool"], checked);
                      if (!checked) {
                        updateField(["pool", "condition"], "");
                        updateField(["pool", "equipment"], "");
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <CardTitle>Pool (Check if property has pool)</CardTitle>
                </div>
                <ChevronDown className="h-5 w-5" />
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          {localNotes.pool.hasPool && (
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Pool Condition</Label>
                    <Select
                      value={localNotes.pool.condition}
                      onValueChange={(val) =>
                        updateField(["pool", "condition"], val)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Excellent">Excellent</SelectItem>
                        <SelectItem value="Good">Good - Functional</SelectItem>
                        <SelectItem value="Needs Repair">
                          Needs Repair ($3-5k)
                        </SelectItem>
                        <SelectItem value="Not Working">
                          Not Working ($8-15k)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Equipment Age</Label>
                    <Select
                      value={localNotes.pool.equipment}
                      onValueChange={(val) =>
                        updateField(["pool", "equipment"], val)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New (0-3 years)</SelectItem>
                        <SelectItem value="Good">Good (4-8 years)</SelectItem>
                        <SelectItem value="Old">Old (8+ years)</SelectItem>
                        <SelectItem value="Needs Replacement">
                          Needs Replacement
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          )}
        </Card>
      </Collapsible>

      {/* Additional Issues - RED FLAGS ONLY */}
      <Card className="border-red-200 bg-red-50/30">
        <CardHeader>
          <CardTitle className="text-red-700">
            🚩 Red Flags & Deal Breakers
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Check any major issues that significantly impact cost
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={localNotes.additionalIssues.structuralIssues}
                onCheckedChange={(checked) =>
                  updateField(["additionalIssues", "structuralIssues"], checked)
                }
              />
              <Label className="font-medium">
                Structural/Foundation Issues
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={localNotes.additionalIssues.mold}
                onCheckedChange={(checked) =>
                  updateField(["additionalIssues", "mold"], checked)
                }
              />
              <Label>Mold or Mildew (visible)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={localNotes.additionalIssues.termites}
                onCheckedChange={(checked) =>
                  updateField(["additionalIssues", "termites"], checked)
                }
              />
              <Label>Termites/Pest Damage</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={localNotes.additionalIssues.waterDamage}
                onCheckedChange={(checked) =>
                  updateField(["additionalIssues", "waterDamage"], checked)
                }
              />
              <Label>Significant Water Damage</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={localNotes.additionalIssues.fireDamage}
                onCheckedChange={(checked) =>
                  updateField(["additionalIssues", "fireDamage"], checked)
                }
              />
              <Label>Fire Damage</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={localNotes.additionalIssues["code violations"]}
                onCheckedChange={(checked) =>
                  updateField(["additionalIssues", "code violations"], checked)
                }
              />
              <Label>Active Code Violations</Label>
            </div>
          </div>
          {(localNotes.additionalIssues.mold ||
            localNotes.additionalIssues.termites ||
            localNotes.additionalIssues.waterDamage ||
            localNotes.additionalIssues.fireDamage ||
            localNotes.additionalIssues.structuralIssues ||
            localNotes.additionalIssues["code violations"]) && (
            <Alert className="bg-red-100 border-red-300">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Warning:</strong> These red flags significantly increase
                rehab costs and timeline. Get professional inspections before
                making offers.
              </AlertDescription>
            </Alert>
          )}
          <div>
            <Label>Other Critical Issues</Label>
            <Textarea
              value={localNotes.additionalIssues.other}
              onChange={(e) =>
                updateField(["additionalIssues", "other"], e.target.value)
              }
              placeholder="Any other major issues (e.g., unpermitted additions, environmental hazards, title issues)..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Summary Helper - LIVE UPDATES */}
      {(() => {
        const quickEstimates = calculateQuickEstimates();
        return (
          quickEstimates.length > 0 && (
            <Card className="bg-blue-50/50 border-blue-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-blue-900">
                    📊 Quick Cost Summary (Live)
                  </CardTitle>
                  {estimateIsStale && (
                    <Badge variant="destructive" className="animate-pulse">
                      Conditions Changed
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Updates automatically as you change conditions
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Major Cost Drivers Identified:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {quickEstimates.map((estimate, idx) => (
                      <li key={idx}>
                        {estimate.item}: {estimate.cost}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-3 border-t">
                    <p className="text-xs text-muted-foreground italic">
                      💡 <strong>Rough quick-math estimates above.</strong>{" "}
                      Click "Generate Estimate" for AI-powered detailed
                      analysis.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        );
      })()}

      {/* General Notes - Collapsed */}
      <Collapsible>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <div>
                  <CardTitle>ChatGPT Insights + Notes (Optional)</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Any other observations
                  </p>
                </div>
                <ChevronDown className="h-5 w-5" />
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <Textarea
                value={localNotes.generalNotes}
                onChange={(e) => updateField(["generalNotes"], e.target.value)}
                placeholder="Any additional observations, concerns, or notes about the property..."
                rows={3}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
