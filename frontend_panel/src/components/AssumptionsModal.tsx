// components/AssumptionsModal.tsx
import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { GlobalAssumptions, Section8ZipData } from "../types/deal";
import {
  Plus,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { dashboardService } from "../services/dashboard.service";
import { toast } from "sonner";

interface AssumptionsModalProps {
  key: string;
  assumptions: GlobalAssumptions;
  onSave: (assumptions: GlobalAssumptions) => Promise<void>;
  onBack: () => void;
  onReset: () => Promise<void>;
  saving?: boolean;
  loadAssumptions: () => Promise<void>;
}

export function AssumptionsModal({
  assumptions,
  onSave,
  onBack,
  onReset,
  saving = false,
  loadAssumptions,
}: AssumptionsModalProps) {
  const [localAssumptions, setLocalAssumptions] =
    useState<GlobalAssumptions>(assumptions);
  const [savingSection8, setSavingSection8] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const section8FileInputRef = useRef<HTMLInputElement>(null);
  const assumptionsFileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof GlobalAssumptions, value: number) => {
    setLocalAssumptions((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await onSave(localAssumptions);
    } catch (error) {
      // Error is already handled in the parent component
    }
  };

  const handleSection8Update = async () => {
    try {
      setSavingSection8(true);
      const response = await dashboardService.updateSection8ZipData(
        localAssumptions.section8ZipData
      );
      setLocalAssumptions(response.data);
      toast.success("Section 8 data updated successfully!");
      await loadAssumptions();
    } catch (error) {
      console.error("Failed to update Section 8 data:", error);
      toast.error("Failed to update Section 8 data");
    } finally {
      setSavingSection8(false);
    }
  };

  const handleAddZipEntry = async (zipEntry: Section8ZipData) => {
    try {
      const response = await dashboardService.addSection8ZipEntry(zipEntry);
      setLocalAssumptions(response.data);
      toast.success("Zip code added successfully!");
    } catch (error) {
      console.error("Failed to add zip code:", error);
      toast.error("Failed to add zip code");
    }
  };

  const handleRemoveZipEntry = async (zipCode: string) => {
    try {
      const response = await dashboardService.removeSection8ZipEntry(zipCode);
      setLocalAssumptions(response.data);
      toast.success("Zip code removed successfully!");
      await loadAssumptions();
    } catch (error) {
      console.error("Failed to remove zip code:", error);
      toast.error("Failed to remove zip code");
    }
  };

  // Enhanced file parsing for both JSON and CSV
  const parseSection8File = async (file: File): Promise<Section8ZipData[]> => {
    const text = await file.text();

    if (file.name.toLowerCase().endsWith(".csv")) {
      return parseSection8CSV(text);
    } else {
      return parseSection8JSON(text);
    }
  };

  const parseSection8CSV = (csvText: string): Section8ZipData[] => {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("CSV file is empty or has no data rows");
    }

    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().toLowerCase().replace(/"/g, ""));

    return lines
      .slice(1)
      .map((line, index) => {
        // Handle quoted values that might contain commas
        const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
        const entry: Section8ZipData = {
          zipCode: "",
          zone: 1,
          rents: {},
        };

        headers.forEach((header, index) => {
          const value = values[index];
          if (!value || value === "") return;

          switch (header) {
            case "zipcode":
            case "zip":
              entry.zipCode = value;
              break;
            case "zone":
              entry.zone = parseInt(value) || 1;
              break;
            case "studio":
            case "1bed":
            case "2bed":
            case "3bed":
            case "4bed":
            case "5bed":
            case "6bed":
            case "7bed":
              const rentValue = parseInt(value);
              if (!isNaN(rentValue)) {
                entry.rents[header] = rentValue;
              }
              break;
          }
        });

        if (!entry.zipCode) {
          throw new Error(`Row ${index + 2}: Missing zip code`);
        }

        return entry;
      })
      .filter((entry) => entry.zipCode); // Filter out entries without zip codes
  };

  const parseSection8JSON = (jsonText: string): Section8ZipData[] => {
    try {
      const data = JSON.parse(jsonText);

      // Handle different JSON formats
      if (Array.isArray(data)) {
        return data;
      } else if (data.section8ZipData && Array.isArray(data.section8ZipData)) {
        return data.section8ZipData;
      } else if (
        data.data?.section8ZipData &&
        Array.isArray(data.data.section8ZipData)
      ) {
        return data.data.section8ZipData;
      } else if (data.importData && Array.isArray(data.importData)) {
        return data.importData;
      }

      throw new Error(
        "Invalid JSON format for Section 8 data. Expected array or object with section8ZipData/importData array."
      );
    } catch (error) {
      throw new Error(
        `Invalid JSON: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleBulkImport = async (file: File) => {
    try {
      setImporting(true);
      const importData = await parseSection8File(file);

      if (!Array.isArray(importData) || importData.length === 0) {
        throw new Error("No valid Section 8 data found in file");
      }

      // Use the bulk import endpoint with the correct format
      const response = await dashboardService.bulkImportSection8Data(
        importData
      );
      setLocalAssumptions(response.data);
      toast.success(`Successfully imported ${importData.length} zip codes!`);
      await loadAssumptions();
    } catch (error) {
      console.error("Failed to import Section 8 data:", error);
      toast.error(
        `Failed to import Section 8 data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setImporting(false);
    }
  };

  // Use the backend export service directly
  const handleExportAssumptions = async () => {
    try {
      setExporting(true);
      await dashboardService.exportAssumptions();
      // The service already handles the file download, so we just show success
      toast.success("Assumptions exported successfully!");
    } catch (error) {
      console.error("Failed to export assumptions:", error);
      toast.error("Failed to export assumptions");
    } finally {
      setExporting(false);
    }
  };

  const handleImportAssumptions = async (file: File) => {
    try {
      setImporting(true);
      const text = await file.text();
      const importData = JSON.parse(text);

      // Extract assumptions from different possible formats
      let assumptionsData;

      if (importData.data) {
        // Format: {status: "success", data: {...}, message: "..."}
        assumptionsData = importData.data;
      } else if (importData.ltrVacancyMonths !== undefined) {
        // Direct assumptions object (import body format)
        assumptionsData = importData;
      } else {
        throw new Error("Invalid assumptions file format");
      }

      // Update local state with imported data - this will auto-fill the form
      setLocalAssumptions((prev) => ({
        ...prev,
        ...assumptionsData,
        // Preserve the section8ZipData structure
        section8ZipData:
          assumptionsData.section8ZipData || prev.section8ZipData,
      }));

      toast.success(
        "Assumptions imported successfully! Form has been updated. Click 'Save All Assumptions' to apply changes."
      );
    } catch (error) {
      console.error("Failed to import assumptions:", error);
      toast.error(
        `Failed to import assumptions: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "section8" | "assumptions"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (type === "section8") {
      handleBulkImport(file);
    } else {
      handleImportAssumptions(file);
    }

    // Reset the input
    event.target.value = "";
  };

  const addNewZipCode = () => {
    const newZipData: Section8ZipData = {
      zipCode: "",
      zone: 1,
      rents: {},
    };
    setLocalAssumptions((prev) => ({
      ...prev,
      section8ZipData: [...prev.section8ZipData, newZipData],
    }));
  };

  const updateZipData = (index: number, updates: Partial<Section8ZipData>) => {
    const newZipData = [...localAssumptions.section8ZipData];
    newZipData[index] = { ...newZipData[index], ...updates };
    setLocalAssumptions((prev) => ({ ...prev, section8ZipData: newZipData }));
  };

  const updateZipRent = (
    index: number,
    bedType: string,
    value: number | undefined
  ) => {
    const newZipData = [...localAssumptions.section8ZipData];
    newZipData[index] = {
      ...newZipData[index],
      rents: { ...newZipData[index].rents, [bedType]: value },
    };
    setLocalAssumptions((prev) => ({ ...prev, section8ZipData: newZipData }));
  };

  // Export Section 8 as CSV
  const handleExportSection8CSV = async () => {
    try {
      setExporting(true);

      const headers = [
        "zipCode",
        "zone",
        "studio",
        "1bed",
        "2bed",
        "3bed",
        "4bed",
        "5bed",
        "6bed",
        "7bed",
      ];
      const csvRows = [headers.join(",")];

      localAssumptions.section8ZipData.forEach((zipData) => {
        const row = headers.map((header) => {
          if (header === "zipCode") return `"${zipData.zipCode}"`;
          if (header === "zone") return zipData.zone.toString();
          const rentValue = zipData.rents[header as keyof typeof zipData.rents];
          return rentValue ? rentValue.toString() : "";
        });
        csvRows.push(row.join(","));
      });

      const csvString = csvRows.join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `section8-data-${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Section 8 data exported as CSV!");
    } catch (error) {
      console.error("Failed to export Section 8 CSV:", error);
      toast.error("Failed to export Section 8 data");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportAssumptions}
          disabled={exporting}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export Assumptions
        </Button>
        <div className="relative">
          <Input
            type="file"
            accept=".json"
            onChange={(e) => handleFileUpload(e, "assumptions")}
            className="hidden"
            id="import-assumptions"
            ref={assumptionsFileInputRef}
          />
          <Button variant="outline" size="sm" asChild disabled={importing}>
            <label
              htmlFor="import-assumptions"
              className="cursor-pointer flex items-center gap-2"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Import Assumptions
            </label>
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={onReset} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          Reset to Defaults
        </Button>
      </div>

      {/* Operating Assumptions */}
      <Card>
        <CardHeader>
          <CardTitle>Operating Assumptions</CardTitle>
          <CardDescription>
            Global assumptions applied to all deal calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2">Parameter</TableHead>
                <TableHead className="w-1/2">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Long-Term Rental Vacancy (months/year)</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    max="12"
                    step="0.1"
                    value={localAssumptions.ltrVacancyMonths}
                    onChange={(e) =>
                      handleChange("ltrVacancyMonths", Number(e.target.value))
                    }
                    className="h-9 w-24"
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Section 8 Vacancy (months/year)</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    max="12"
                    step="0.1"
                    value={localAssumptions.section8VacancyMonths}
                    onChange={(e) =>
                      handleChange(
                        "section8VacancyMonths",
                        Number(e.target.value)
                      )
                    }
                    className="h-9 w-24"
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Maintenance (% of income)</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={localAssumptions.maintenancePercent}
                    onChange={(e) =>
                      handleChange("maintenancePercent", Number(e.target.value))
                    }
                    className="h-9 w-24"
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Rent Growth (% per year)</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={localAssumptions.rentGrowthPercent}
                    onChange={(e) =>
                      handleChange("rentGrowthPercent", Number(e.target.value))
                    }
                    className="h-9 w-24"
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Property Appreciation (% per year)</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={localAssumptions.appreciationPercent}
                    onChange={(e) =>
                      handleChange(
                        "appreciationPercent",
                        Number(e.target.value)
                      )
                    }
                    className="h-9 w-24"
                  />
                </TableCell>
              </TableRow>
              <TableRow className="bg-orange-50">
                <TableCell className="font-medium">
                  Property Tax Increase (% per year)
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={localAssumptions.propertyTaxIncreasePercent}
                    onChange={(e) =>
                      handleChange(
                        "propertyTaxIncreasePercent",
                        Number(e.target.value)
                      )
                    }
                    className="h-9 w-24"
                  />
                </TableCell>
              </TableRow>
              <TableRow className="bg-orange-50">
                <TableCell className="font-medium">
                  Insurance Increase (% per year)
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={localAssumptions.insuranceIncreasePercent}
                    onChange={(e) =>
                      handleChange(
                        "insuranceIncreasePercent",
                        Number(e.target.value)
                      )
                    }
                    className="h-9 w-24"
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section 8 Voucher Data */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Section 8 Voucher Data by Zip Code</CardTitle>
              <CardDescription>
                Add zip codes with Section 8 maximum voucher amounts by bedroom
                count
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSection8CSV}
                disabled={
                  exporting || localAssumptions.section8ZipData.length === 0
                }
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <div className="relative">
                <Input
                  type="file"
                  accept=".json,.csv"
                  onChange={(e) => handleFileUpload(e, "section8")}
                  className="hidden"
                  id="import-section8"
                  ref={section8FileInputRef}
                />
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={importing}
                >
                  <label
                    htmlFor="import-section8"
                    className="cursor-pointer flex items-center gap-2"
                  >
                    {importing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Import CSV/JSON
                  </label>
                </Button>
              </div>
              <Button
                onClick={handleSection8Update}
                disabled={savingSection8}
                size="sm"
              >
                {savingSection8 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Section 8 Data"
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto w-full">
            <Table className="min-w-[1400px] w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[130px]">Zip Code</TableHead>
                  <TableHead className="text-center w-[120px]">Zone</TableHead>
                  <TableHead className="text-center w-[120px]">
                    Studio
                  </TableHead>
                  <TableHead className="text-center w-[120px]">1 Bed</TableHead>
                  <TableHead className="text-center w-[120px]">2 Bed</TableHead>
                  <TableHead className="text-center w-[120px]">3 Bed</TableHead>
                  <TableHead className="text-center w-[120px]">4 Bed</TableHead>
                  <TableHead className="text-center w-[120px]">5 Bed</TableHead>
                  <TableHead className="text-center w-[120px]">6 Bed</TableHead>
                  <TableHead className="text-center w-[120px]">7 Bed</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localAssumptions.section8ZipData.map((zipData, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={zipData.zipCode}
                        onChange={(e) =>
                          updateZipData(index, { zipCode: e.target.value })
                        }
                        maxLength={5}
                        placeholder="33311"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        max="19"
                        value={zipData.zone || 1}
                        onChange={(e) =>
                          updateZipData(index, { zone: Number(e.target.value) })
                        }
                        className="h-8 text-center"
                      />
                    </TableCell>
                    {[
                      "studio",
                      "1bed",
                      "2bed",
                      "3bed",
                      "4bed",
                      "5bed",
                      "6bed",
                      "7bed",
                    ].map((bedType) => (
                      <TableCell key={bedType}>
                        <Input
                          type="number"
                          min="0"
                          step="50"
                          value={
                            zipData.rents[
                              bedType as keyof typeof zipData.rents
                            ] || ""
                          }
                          onChange={(e) =>
                            updateZipRent(
                              index,
                              bedType,
                              e.target.value
                                ? Number(e.target.value)
                                : undefined
                            )
                          }
                          placeholder="0"
                          className="h-8 text-center"
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveZipEntry(zipData.zipCode)}
                        disabled={savingSection8 || !zipData.zipCode}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {localAssumptions.section8ZipData.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="text-center text-muted-foreground py-8"
                    >
                      No Section 8 zip codes configured. Add your first zip code
                      to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <Button
            variant="outline"
            onClick={addNewZipCode}
            className="w-full mt-4"
            disabled={savingSection8}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Zip Code
          </Button>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Save All Assumptions"
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
          disabled={saving}
        >
          Cancel
        </Button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-900 text-sm">
          <strong>Import/Export Notes:</strong>
          <br />
          • Assumptions export uses backend format with status/data/message
          structure
          <br />
          • Section 8 data supports both JSON (array or importData format) and
          CSV imports
          <br />
          • Imported assumptions automatically populate the form fields
          <br />• CSV format for Section 8 should include columns: zipCode,
          zone, studio, 1bed, 2bed, etc.
        </p>
      </div>
    </div>
  );
}
