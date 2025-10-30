import React, { useState, useEffect } from "react";
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
import { DealInputs, UnitData } from "../types/deal";
import { ArrowLeft } from "lucide-react";
import { Separator } from "./ui/separator";

interface DealInputFormProps {
  onSubmit: (inputs: DealInputs) => void;
  onBack: () => void;
  initialData?: DealInputs;
}

export function DealInputForm({
  onSubmit,
  onBack,
  initialData,
}: DealInputFormProps) {
  const [inputs, setInputs] = useState<DealInputs>(
    initialData || {
      address: "",
      units: 1,
      unitDetails: [{ beds: 3, baths: 2, section8Rent: 1650 }],
      totalSqft: 1500,
      purchasePrice: 250000,
      section8Multiplier: 1.1,
      strADR: 150,
      strOccupancy: 70,
      propertyTaxes: 3000,
      propertyInsurance: 1000,
      loanInterestRate: 7.0,
      loanTerm: 30,
      downPayment: 20,
      acquisitionCosts: 3,
      setupFurnishCost: 15000,
      isRehab: false,
      rehabCost: 0,
      rehabMonths: 0,
      rehabFinancingRate: 11.0,
      rehabEntryPoints: 6.0,
      rehabExitPoints: 5.0,
      afterRepairValue: 0,
      sellClosingCosts: 6,
    }
  );

  // Update unitDetails array when units count changes
  useEffect(() => {
    const currentCount = inputs.unitDetails.length;
    const newCount = inputs.units;

    if (newCount > currentCount) {
      // Add new units with default values
      const newUnits: UnitData[] = Array(newCount - currentCount)
        .fill(null)
        .map(() => ({
          beds: 3,
          baths: 2,
          section8Rent: 1650,
        }));
      setInputs((prev) => ({
        ...prev,
        unitDetails: [...prev.unitDetails, ...newUnits],
      }));
    } else if (newCount < currentCount) {
      // Remove excess units
      setInputs((prev) => ({
        ...prev,
        unitDetails: prev.unitDetails.slice(0, newCount),
      }));
    }
  }, [inputs.units]);

  const handleChange = (field: keyof DealInputs, value: string | number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleUnitChange = (
    index: number,
    field: keyof UnitData,
    value: number
  ) => {
    setInputs((prev) => ({
      ...prev,
      unitDetails: prev.unitDetails.map((unit, i) =>
        i === index ? { ...unit, [field]: value } : unit
      ),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(inputs);
  };

  const totalMarketRent = inputs.unitDetails.reduce(
    (sum, unit) => sum + unit.marketRent,
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Deal Input Form</CardTitle>
              <CardDescription>
                Enter property details to analyze across multiple rental
                strategies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Property Details */}
              <div>
                <h3 className="mb-4">Property Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={inputs.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      placeholder="123 Main St, City, State 12345"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="units">Number of Units</Label>
                    <Input
                      id="units"
                      type="number"
                      min="1"
                      max="10"
                      value={inputs.units}
                      onChange={(e) =>
                        handleChange("units", Number(e.target.value))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="totalSqft">Total SQFT</Label>
                    <Input
                      id="totalSqft"
                      type="number"
                      min="0"
                      value={inputs.totalSqft}
                      onChange={(e) =>
                        handleChange("totalSqft", Number(e.target.value))
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Individual Unit Details */}
              <div>
                <h3 className="mb-4">Unit Details</h3>
                <div className="space-y-4">
                  {inputs.unitDetails.map((unit, index) => (
                    <Card key={index} className="bg-gray-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                          Unit {index + 1}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor={`unit-${index}-beds`}>Beds</Label>
                            <Input
                              id={`unit-${index}-beds`}
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
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor={`unit-${index}-baths`}>Baths</Label>
                            <Input
                              id={`unit-${index}-baths`}
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
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor={`unit-${index}-rent`}>
                              Est. Market Rent (monthly $)
                            </Label>
                            <Input
                              id={`unit-${index}-rent`}
                              type="number"
                              min="0"
                              value={unit.marketRent}
                              onChange={(e) =>
                                handleUnitChange(
                                  index,
                                  "marketRent",
                                  Number(e.target.value)
                                )
                              }
                              required
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Total Market Rent Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-blue-900">
                        Total Monthly Market Rent
                      </span>
                      <span className="text-xl font-semibold text-blue-900">
                        ${totalMarketRent.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Financial Details */}
              <div>
                <h3 className="mb-4">Purchase & Financing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="purchasePrice">Purchase Price ($)</Label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      min="0"
                      value={inputs.purchasePrice}
                      onChange={(e) =>
                        handleChange("purchasePrice", Number(e.target.value))
                      }
                      required
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
                        handleChange("downPayment", Number(e.target.value))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="loanInterestRate">
                      Loan Interest Rate (%)
                    </Label>
                    <Input
                      id="loanInterestRate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={inputs.loanInterestRate}
                      onChange={(e) =>
                        handleChange("loanInterestRate", Number(e.target.value))
                      }
                      required
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
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="acquisitionCosts">
                      Acquisition Costs (%)
                    </Label>
                    <Input
                      id="acquisitionCosts"
                      type="number"
                      min="0"
                      step="0.1"
                      value={inputs.acquisitionCosts}
                      onChange={(e) =>
                        handleChange("acquisitionCosts", Number(e.target.value))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="propertyTaxes">
                      Property Taxes (annual $)
                    </Label>
                    <Input
                      id="propertyTaxes"
                      type="number"
                      min="0"
                      value={inputs.propertyTaxes}
                      onChange={(e) =>
                        handleChange("propertyTaxes", Number(e.target.value))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="propertyInsurance">
                      Property Insurance (annual $)
                    </Label>
                    <Input
                      id="propertyInsurance"
                      type="number"
                      min="0"
                      value={inputs.propertyInsurance}
                      onChange={(e) =>
                        handleChange(
                          "propertyInsurance",
                          Number(e.target.value)
                        )
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Rental Income */}
              <div>
                <h3 className="mb-4">Strategy-Specific Parameters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="section8Multiplier">
                      Section 8 Multiplier
                    </Label>
                    <Input
                      id="section8Multiplier"
                      type="number"
                      min="0"
                      step="0.01"
                      value={inputs.section8Multiplier}
                      onChange={(e) =>
                        handleChange(
                          "section8Multiplier" as keyof DealInputs,
                          Number(e.target.value)
                        )
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="strADR">STR Average Daily Rate ($)</Label>
                    <Input
                      id="strADR"
                      type="number"
                      min="0"
                      value={inputs.strADR}
                      onChange={(e) =>
                        handleChange("strADR", Number(e.target.value))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="strOccupancy">STR Occupancy (%)</Label>
                    <Input
                      id="strOccupancy"
                      type="number"
                      min="0"
                      max="100"
                      value={inputs.strOccupancy}
                      onChange={(e) =>
                        handleChange("strOccupancy" as keyof DealInputs, Number(e.target.value))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="setupFurnishCost">
                      Setup/Furnish Cost ($ - STR only)
                    </Label>
                    <Input
                      id="setupFurnishCost"
                      type="number"
                      min="0"
                      value={inputs.setupFurnishCost}
                      onChange={(e) =>
                        handleChange("setupFurnishCost", Number(e.target.value))
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg">
                Calculate Financials
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
