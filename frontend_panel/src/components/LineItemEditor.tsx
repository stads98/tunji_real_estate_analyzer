import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Plus, Trash2, GripVertical, FileText } from "lucide-react";
import { formatCurrency, parseCurrency } from "../utils/calculations";

export interface LineItem {
  id: string;
  category:
    | "structural"
    | "systems"
    | "interior"
    | "exterior"
    | "Custom"
    | "Additional Work";
  description: string;
  estimatedCost: number;
  isManuallyEdited?: boolean;
}

interface LineItemEditorProps {
  lineItems: LineItem[];
  onChange: (lineItems: LineItem[]) => void;
  totalSqft?: number;
}
const categoryColors = {
  structural: "bg-red-100 text-red-800 border-red-200",
  systems: "bg-orange-100 text-orange-800 border-orange-200",
  interior: "bg-blue-100 text-blue-800 border-blue-200",
  exterior: "bg-green-100 text-green-800 border-green-200",
};

const categoryLabels = {
  structural: "Structural",
  systems: "Systems",
  interior: "Interior",
  exterior: "Exterior",
};

export function LineItemEditor({
  lineItems,
  onChange,
  totalSqft,
}: LineItemEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const totalCost = lineItems.reduce(
    (sum, item) => sum + item.estimatedCost,
    0
  );

  const updateLineItem = (id: string, updates: Partial<LineItem>) => {
    onChange(
      lineItems.map((item) =>
        item.id === id ? { ...item, ...updates, isManuallyEdited: true } : item
      )
    );
  };

  const removeLineItem = (id: string) => {
    onChange(lineItems.filter((item) => item.id !== id));
  };

  const addCustomLineItem = () => {
    const newItem: LineItem = {
      id: `custom-${Date.now()}`,
      category: "interior",
      description: "Custom Line Item",
      estimatedCost: 0,
      isManuallyEdited: true,
    };
    onChange([...lineItems, newItem]);
    setEditingId(newItem.id);
  };

  const handleCostChange = (id: string, value: string) => {
    const numericValue = parseCurrency(value);
    updateLineItem(id, { estimatedCost: numericValue });
  };

  const formatCostInput = (cost: number) => {
    return cost === 0 ? "" : cost.toString();
  };

  const groupedItems = lineItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, LineItem[]>);

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="bg-muted/50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Scope of Work - Detailed Line Items</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Edit costs and descriptions. Add custom items. Ready for lender
                submission.
              </p>
            </div>
          </div>
          <Button onClick={addCustomLineItem} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Line Items by Category */}
        <div className="space-y-6">
          {(["structural", "systems", "interior", "exterior"] as const).map(
            (category) => {
              const items = groupedItems[category] || [];
              if (items.length === 0) return null;

              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge
                      className={categoryColors[category]}
                      variant="outline"
                    >
                      {categoryLabels[category]}
                    </Badge>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Description
                            </Label>
                            <Input
                              value={item.description}
                              onChange={(e) =>
                                updateLineItem(item.id, {
                                  description: e.target.value,
                                })
                              }
                              className="h-9"
                              placeholder="Item description"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Estimated Cost
                            </Label>
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                  $
                                </span>
                                <Input
                                  type="text"
                                  value={formatCostInput(item.estimatedCost)}
                                  onChange={(e) =>
                                    handleCostChange(item.id, e.target.value)
                                  }
                                  className="h-9 pl-6"
                                  placeholder="0"
                                />
                              </div>
                              {item.isManuallyEdited && (
                                <Badge
                                  variant="outline"
                                  className="text-xs whitespace-nowrap"
                                >
                                  Edited
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Select
                            value={item.category}
                            onValueChange={(value: any) =>
                              updateLineItem(item.id, { category: value })
                            }
                          >
                            <SelectTrigger className="h-9 w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="structural">
                                Structural
                              </SelectItem>
                              <SelectItem value="systems">Systems</SelectItem>
                              <SelectItem value="interior">Interior</SelectItem>
                              <SelectItem value="exterior">Exterior</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLineItem(item.id)}
                            className="h-9 w-9 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
          )}

          {lineItems.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>
                No line items yet. Fill out property condition details above to
                generate items,
              </p>
              <p>or click "Add Item" to create custom line items.</p>
            </div>
          )}
        </div>

        {/* Total Summary */}
        {lineItems.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border-2 border-primary/20">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Estimated Rehab Cost
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lineItems.length} line item
                  {lineItems.length !== 1 ? "s" : ""}
                  {totalSqft &&
                    ` • ${formatCurrency(totalCost / totalSqft)}/sqft`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(totalCost)}
                </p>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {(["structural", "systems", "interior", "exterior"] as const).map(
                (category) => {
                  const items = groupedItems[category] || [];
                  const categoryTotal = items.reduce(
                    (sum, item) => sum + item.estimatedCost,
                    0
                  );
                  if (categoryTotal === 0) return null;

                  return (
                    <div
                      key={category}
                      className="p-3 rounded-lg border bg-card"
                    >
                      <Badge
                        className={`${categoryColors[category]} mb-2`}
                        variant="outline"
                      >
                        {categoryLabels[category]}
                      </Badge>
                      <p className="font-bold">
                        {formatCurrency(categoryTotal)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {items.length} items
                      </p>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
