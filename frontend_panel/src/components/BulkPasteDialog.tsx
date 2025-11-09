// src/components/BulkPasteDialog.tsx
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import {
  CheckCircle,
  AlertTriangle,
  Home,
  Copy,
  Loader2,
  X,
} from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import {
  BulkProperty,
  parseZillowBulkFavorites,
} from "../utils/zillowBulkParser";
import { dashboardService } from "../services/dashboard.service";
import { toast } from "sonner";

interface BulkPasteDialogProps {
  open: boolean;
  loadDealsFromAPI: () => Promise<void>; // Add this
  onOpenChange: (open: boolean) => void;
}

export function BulkPasteDialog({
  open,
  onOpenChange,
  loadDealsFromAPI,
}: BulkPasteDialogProps) {
  const [pastedText, setPastedText] = useState("");
  const [parsedProperties, setParsedProperties] = useState<BulkProperty[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<Set<number>>(
    new Set()
  );

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setPastedText("");
      setParsedProperties([]);
      setShowPreview(false);
      setSelectedProperties(new Set());
    }
  }, [open]);

  const handleParse = () => {
    if (!pastedText.trim()) {
      toast.error("Please paste some text first");
      return;
    }

    try {
      const properties = parseZillowBulkFavorites(pastedText);

      // Remove duplicates based on address
      const uniqueProperties = properties.filter(
        (property, index, self) =>
          index ===
          self.findIndex(
            (p) => p.address.toLowerCase() === property.address.toLowerCase()
          )
      );

      setParsedProperties(uniqueProperties);
      setShowPreview(true);

      // Auto-select all properties
      setSelectedProperties(new Set(uniqueProperties.map((_, index) => index)));

      toast.success(`Found ${uniqueProperties.length} unique properties`);
    } catch (error) {
      console.error("Failed to parse properties:", error);
      toast.error("Failed to parse the pasted text. Please check the format.");
    }
  };

  const handleImport = async () => {
    const propertiesToImport = parsedProperties.filter((_, index) =>
      selectedProperties.has(index)
    );

    if (propertiesToImport.length === 0) {
      toast.error("Please select at least one property to import");
      return;
    }

    try {
      setLoading(true);
      const response = await dashboardService.bulkImportDealsWithStaging(
        propertiesToImport
      );

      toast.success(
        response.message || `${response.data.length} deals imported in Stage 1`
      );

      // Reset and close
      handleCancel();

      await loadDealsFromAPI();
    } catch (error) {
      console.error("Failed to import deals:", error);
      toast.error("Failed to import deals");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPastedText("");
    setParsedProperties([]);
    setShowPreview(false);
    setSelectedProperties(new Set());
    onOpenChange(false);
  };

  const togglePropertySelection = (index: number) => {
    const newSelected = new Set(selectedProperties);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedProperties(newSelected);
  };

  const selectAllProperties = () => {
    if (selectedProperties.size === parsedProperties.length) {
      setSelectedProperties(new Set());
    } else {
      setSelectedProperties(new Set(parsedProperties.map((_, index) => index)));
    }
  };

  const removeProperty = (index: number) => {
    const newProperties = parsedProperties.filter((_, i) => i !== index);
    setParsedProperties(newProperties);

    const newSelected = new Set(selectedProperties);
    newSelected.delete(index);

    // Update indices for remaining selections
    const updatedSelected = new Set<number>();
    Array.from(newSelected).forEach((oldIndex) => {
      if (oldIndex > index) {
        updatedSelected.add(oldIndex - 1);
      } else if (oldIndex < index) {
        updatedSelected.add(oldIndex);
      }
    });

    setSelectedProperties(updatedSelected);
  };

  const exampleText = `$325,000
3 bds2 ba1,354 sqftHouse for sale
75 NW 83rd St, Miami, FL 33150
MLS ID #A11903191, Julies Realty, LLC

Compare
$315,000
2 bds1 ba1,121 sqftHouse for sale
1935 SW 67th Ter, North Lauderdale, FL 33068
MLS ID #F10532733, EXP Realty LLC`;

  const selectedCount = selectedProperties.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Copy className="h-5 w-5" />
            Bulk Paste Zillow Favorites
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Paste your Zillow favorites list to quickly create multiple deals in
            Stage 1
          </DialogDescription>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-4">
            <Alert className="text-sm">
              <Home className="h-4 w-4" />
              <AlertDescription>
                <strong>How to use:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Go to your Zillow favorites page</li>
                  <li>Copy the entire list (Ctrl+A, Ctrl+C)</li>
                  <li>Paste it here</li>
                  <li>Click "Parse & Preview"</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium block">
                Paste Zillow Favorites:
              </label>
              <Textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={exampleText}
                className="min-h-[200px] resize-none font-mono text-xs sm:text-sm"
              />
              <p className="text-xs text-muted-foreground">
                The parser will automatically extract: Address, Price, Beds,
                Baths, and Square Footage
              </p>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleParse}
                disabled={!pastedText.trim()}
                className="sm:w-auto"
              >
                Parse & Preview
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg gap-2">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900 text-sm sm:text-base">
                    {parsedProperties.length} properties found ({selectedCount}{" "}
                    selected)
                  </p>
                  <p className="text-xs sm:text-sm text-green-700">
                    Selected properties will be created in Stage 1
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-gray-100 border-gray-300 text-gray-700 text-xs">
                  Stage 1
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllProperties}
                  className="text-xs h-7"
                >
                  {selectedProperties.size === parsedProperties.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm sm:text-base">Preview:</h3>
                <span className="text-xs text-muted-foreground">
                  {selectedCount} of {parsedProperties.length} selected
                </span>
              </div>
              <ScrollArea className="h-[300px] sm:h-[400px] border rounded-lg">
                <div className="p-2 sm:p-4 space-y-2">
                  {parsedProperties.map((property, index) => (
                    <div
                      key={index}
                      className={`p-3 border rounded-lg space-y-2 transition-colors ${
                        selectedProperties.has(index)
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedProperties.has(index)}
                            onChange={() => togglePropertySelection(index)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {property.address}
                            </p>
                            {property.mlsId && (
                              <p className="text-xs text-muted-foreground mt-1">
                                MLS: {property.mlsId}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProperty(index)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pl-7">
                        <div>
                          <span className="text-muted-foreground">Price:</span>
                          <p className="font-medium truncate">
                            ${property.price.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Beds:</span>
                          <p className="font-medium">
                            {property.beds || "N/A"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Baths:</span>
                          <p className="font-medium">
                            {property.baths || "N/A"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Sqft:</span>
                          <p className="font-medium">
                            {property.sqft
                              ? property.sqft.toLocaleString()
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {parsedProperties.length === 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  No properties could be parsed. Make sure you copied the entire
                  Zillow favorites list.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
                className=" sm:w-auto"
              >
                Back to Edit
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedCount === 0 || loading}
                className=" sm:w-auto"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Import {selectedCount} {selectedCount === 1 ? "Deal" : "Deals"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
