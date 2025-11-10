import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
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
  Trash2,
  Plus,
  Calculator,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Eye,
  Upload,
  Image as ImageIcon,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { MapSection } from "./MapSection";
import { DragDropUpload } from "./DragDropUpload";

export interface ZillowComp {
  id: string;
  address: string;
  soldPrice: number;
  soldDate: string;
  beds: number;
  baths: number;
  sqft: number;
  propertyType: string;
  yearBuilt: number;
  zestimate: number | null; // null if not available
  rentZestimate: number | null; // null if not available
  pricePerSqft: number;
  description: string;
  zillowLink: string;
  lotSize?: number;
  hasPool?: boolean;
  parkingSpaces?: number;
  daysOnMarket?: number;
  photos?: { id: string; url: string; isPrimary?: boolean }[]; // Photo gallery for comp properties
  lat?: number; // Latitude for map display
  lng?: number; // Longitude for map display
}

export interface SubjectProperty {
  address: string;
  purchasePrice: number;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number;
  propertyType: string;
  units: number;
  isOffMarket?: boolean; // Flag for off-market properties
  zestimate?: number | null;
  rentZestimate?: number | null;
  lotSize?: number;
  hasPool?: boolean;
  parkingSpaces?: number;
  description?: string;
  daysOnMarket?: number; // Days on Zillow market
  listingDate?: string; // Calculated listing date (YYYY-MM-DD)
  zillowLink?: string; // Zillow listing URL
  lat?: number; // Latitude for map display
  lng?: number; // Longitude for map display
}

interface ARVCalculatorProps {
  comps: ZillowComp[];
  calculatedARV: number;
  onCompsChange: (comps: ZillowComp[]) => void;
  onARVChange: (arv: number) => void;
  subjectProperty?: SubjectProperty;
  onSubjectPropertyChange?: (property: SubjectProperty) => void;
  subjectPhotos?: {
    id: string;
    url: string;
    isPrimary?: boolean;
  }[]; // Photos from main property
  onSubjectPhotosChange?: (
    photos: { id: string; url: string; isPrimary?: boolean }[]
  ) => void; // Callback to update main property photos
  expandedDescriptions?: Record<string, boolean>; // External state for expanded descriptions
  onExpandedDescriptionsChange?: (expanded: Record<string, boolean>) => void; // Callback to update expanded state
  hoveredCompId?: string | null; // Comp ID being hovered on map
  onCompHover?: (compId: string | null) => void; // Called when hovering table row
}

export function ARVCalculator({
  comps,
  calculatedARV,
  onCompsChange,
  onARVChange,
  subjectProperty,
  onSubjectPropertyChange,
  subjectPhotos,
  onSubjectPhotosChange,
  expandedDescriptions: externalExpandedDescriptions,
  onExpandedDescriptionsChange,
  hoveredCompId,
  onCompHover,
}: ARVCalculatorProps) {
  const [pasteData, setPasteData] = useState("");
  const [subjectPasteData, setSubjectPasteData] = useState("");
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [previewPhotos, setPreviewPhotos] = useState<
    { id: string; url: string; isPrimary?: boolean }[]
  >([]);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewType, setPreviewType] = useState<"subject" | "comp" | null>(
    null
  );
  const [previewCompId, setPreviewCompId] = useState<string | null>(null);

  // Use external state if provided, otherwise use internal state
  const [internalExpandedDescriptions, setInternalExpandedDescriptions] =
    useState<Record<string, boolean>>({});
  const expandedDescriptions =
    externalExpandedDescriptions ?? internalExpandedDescriptions;

  // Unified setter that accepts a SetStateAction so callers can pass either
  // a new Record<string, boolean> or an updater function (prev => next).
  const setExpandedDescriptions = (
    updater: React.SetStateAction<Record<string, boolean>>
  ) => {
    if (onExpandedDescriptionsChange) {
      // If caller provided an updater function, apply it to the current
      // expandedDescriptions (which may be external or internal) to compute
      // the new value, then forward that new value to the external callback.
      if (typeof updater === "function") {
        const fn = updater as (
          prev: Record<string, boolean>
        ) => Record<string, boolean>;
        const newVal = fn(expandedDescriptions);
        onExpandedDescriptionsChange(newVal);
      } else {
        // Direct value provided
        onExpandedDescriptionsChange(updater);
      }
    } else {
      // No external callback — use internal setter which accepts SetStateAction
      setInternalExpandedDescriptions(updater);
    }
  };

  // Hover state for row highlighting
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // Calculate distance between two points using Haversine formula (returns miles)
  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Format distance for display
  const formatDistance = (miles: number): string => {
    if (miles < 0.1) {
      return `${Math.round(miles * 5280)} ft`;
    }
    return `${miles.toFixed(2)} mi`;
  };

  // Calculate time difference from today
  const getTimeAgo = (
    dateString: string
  ): { text: string; color: string; months: number } | null => {
    if (!dateString) return null;

    try {
      // Parse date - handle formats like "10/21/22", "10/21/2022", "2022-10-21"
      const parts = dateString.split(/[\/\-]/);
      let month: number, day: number, year: number;

      if (parts.length === 3) {
        // Assume MM/DD/YY or MM/DD/YYYY format
        month = parseInt(parts[0]);
        day = parseInt(parts[1]);
        year = parseInt(parts[2]);

        // Handle 2-digit years
        if (year < 100) {
          year += year > 50 ? 1900 : 2000;
        }

        const saleDate = new Date(year, month - 1, day);
        const today = new Date();
        const diffMs = today.getTime() - saleDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffMonths = Math.floor(diffDays / 30.44); // Average month length
        const diffYears = Math.floor(diffDays / 365.25);

        let text: string;
        let color: string;

        if (diffDays < 0) {
          // Future date
          text = "Future";
          color = "#dc2626"; // red
        } else if (diffDays < 30) {
          text =
            diffDays === 0
              ? "Today"
              : diffDays === 1
              ? "1 day ago"
              : `${diffDays} days ago`;
          color = "#16a34a"; // green - very recent
        } else if (diffMonths < 6) {
          text = diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`;
          color = "#16a34a"; // green - recent
        } else if (diffMonths < 12) {
          text = `${diffMonths} months ago`;
          color = "#ca8a04"; // yellow - moderately old
        } else if (diffYears < 2) {
          text = diffMonths === 12 ? "1 year ago" : `${diffMonths} months ago`;
          color = "#ea580c"; // orange - old
        } else {
          text = diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
          color = "#dc2626"; // red - very old
        }

        return { text, color, months: diffMonths };
      }
    } catch (error) {
      console.error("Error parsing date:", dateString, error);
    }

    return null;
  };

  // Parse Zillow data
  const parseZillowData = (rawData: string): Partial<ZillowComp> | null => {
    try {
      const comp: Partial<ZillowComp> = {
        id: Date.now().toString() + Math.random(),
        zillowLink: "",
      };

      // Extract address (first line with pattern like "1320 NW 44th St, Miami, FL 33142" or "1126 NW 4th Av, Fort Lauderdale, FL 33311")
      // Updated to include abbreviated street types (Av, Rd, Dr, etc.)
      const addressMatch = rawData.match(
        /(\d+\s+[NSEW]?[WE]?\s+\d+(?:st|nd|rd|th)\s+(?:St|Street|Ave|Avenue|Av|Rd|Road|Dr|Drive|Ct|Court|Ln|Lane|Way|Blvd|Boulevard|Pl|Place|Ter|Terrace)[^,]*,\s*[^,]+,\s*FL\s+\d{5})/i
      );
      if (addressMatch) {
        comp.address = addressMatch[1].trim();
      }

      // Extract sold price and date (pattern: "Sold for $637,000 on 07/17/25" or "$400,000\n...Sold")
      let soldMatch = rawData.match(
        /Sold for \$?([\d,]+)\s+on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i
      );
      if (soldMatch) {
        comp.soldPrice = parseInt(soldMatch[1].replace(/,/g, ""));
        comp.soldDate = soldMatch[2];
      } else {
        // Alternative pattern: price at beginning followed by "Sold" later
        const priceMatch = rawData.match(/^\s*\$?([\d,]+)/);
        const dateMatch = rawData.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
        if (priceMatch && rawData.toLowerCase().includes("sold")) {
          comp.soldPrice = parseInt(priceMatch[1].replace(/,/g, ""));
          if (dateMatch) {
            comp.soldDate = dateMatch[1];
          }
        }
      }

      // Extract beds (pattern: "4\nbeds" or "4 bd" or "4\nbed")
      // Handle missing data like "--" or "0"
      const bedsMatch = rawData.match(/(\d+)\s*(?:bd|beds?)\b/i);
      if (bedsMatch) {
        comp.beds = parseInt(bedsMatch[1]);
      } else {
        // Check for explicit "-- beds" or "0 beds"
        if (rawData.match(/--\s*(?:bd|beds?)\b/i)) {
          comp.beds = 0; // Unknown beds
        }
      }

      // Extract baths (pattern: "2\nbaths" or "2 ba" or "2.5 bath")
      // Handle missing data like "0 baths"
      const bathsMatch = rawData.match(/(\d+(?:\.\d+)?)\s*(?:ba|baths?)\b/i);
      if (bathsMatch) {
        comp.baths = parseFloat(bathsMatch[1]);
      }

      // Extract sqft (pattern: "1,440\nsqft" or "1,440 sqft" or "1440sqft")
      const sqftMatch = rawData.match(/([\d,]+)\s*sqft/i);
      if (sqftMatch) {
        comp.sqft = parseInt(sqftMatch[1].replace(/,/g, ""));
      }

      // Extract property type (Duplex, Single Family, etc.)
      const typeMatch = rawData.match(
        /(Duplex|Single Family|Triplex|Quadruplex|Townhouse|Condo|MultiFamily)/i
      );
      if (typeMatch) {
        comp.propertyType = typeMatch[1];
      }

      // Extract year built (pattern: "Built in 1956")
      const yearMatch = rawData.match(/Built in (\d{4})/i);
      if (yearMatch) {
        comp.yearBuilt = parseInt(yearMatch[1]);
      }

      // Extract Zestimate (pattern: "$635,200 Zestimate®" or "Zestimate®\n$635,200")
      const zestimateMatch =
        rawData.match(/Zestimate[®]?\s*\n?\$?([\d,]+)/i) ||
        rawData.match(/\$?([\d,]+)\s*Zestimate/i);
      if (zestimateMatch) {
        comp.zestimate = parseInt(zestimateMatch[1].replace(/,/g, ""));
      }

      // Extract Rent Zestimate (pattern: "$3,692/mo" or "Rent Zestimate®\n$3,692/mo")
      let rentMatch =
        rawData.match(/Rent Zestimate[®]?\s*\n?\$?([\d,]+)\/mo/i) ||
        rawData.match(/\$?([\d,]+)\/mo.*Rent/i);
      if (!rentMatch) {
        rentMatch = rawData.match(/\$([\d,]+)\s*Estimated rent/i);
      }
      if (rentMatch) {
        comp.rentZestimate = parseInt(rentMatch[1].replace(/,/g, ""));
      }

      // Extract price per sqft (pattern: "$442/sqft" or "$324/sqft")
      const ppsfMatch = rawData.match(/\$?([\d,]+)\/sqft/i);
      if (ppsfMatch) {
        comp.pricePerSqft = parseInt(ppsfMatch[1].replace(/,/g, ""));
      } else if (comp.soldPrice && comp.sqft) {
        // Calculate if not found
        comp.pricePerSqft = Math.round(comp.soldPrice / comp.sqft);
      }

      // Extract description from "What's special" section
      const descMatch = rawData.match(
        /What's special\s*\n([\s\S]*?)(?:\n\n|\d+\s+days\s+on\s+Zillow|Zillow last checked|Hide)/i
      );
      if (descMatch) {
        // Clean up the description - remove extra whitespace and newlines
        const desc = descMatch[1]
          .trim()
          .replace(/\s+/g, " ") // Replace multiple spaces/newlines with single space
          .replace(/\n/g, " ") // Replace newlines with spaces
          .substring(0, 500); // Limit to 500 chars
        comp.description = desc;
      }

      // Validate that we have minimum required fields
      if (!comp.soldPrice || !comp.soldDate) {
        return null;
      }

      return comp;
    } catch (error) {
      console.error("Error parsing Zillow data:", error);
      return null;
    }
  };

  const handleParse = () => {
    if (!pasteData.trim()) {
      toast.error("Please paste Zillow data first");
      return;
    }

    const parsed = parseZillowData(pasteData);

    if (!parsed || !parsed.soldPrice) {
      toast.error(
        'Could not parse data. Make sure you copied the full Zillow listing including "Sold for $XXX on MM/DD/YY"'
      );
      return;
    }

    // Check for duplicate address - only if we successfully parsed an address
    const addressToCheck = parsed.address?.toLowerCase().trim();
    if (addressToCheck && addressToCheck !== "unknown address") {
      const isDuplicate = comps.some(
        (comp) => comp.address.toLowerCase().trim() === addressToCheck
      );
      if (isDuplicate) {
        toast.error(
          `This property (${parsed.address}) has already been added as a comp`
        );
        return;
      }
    }

    const newComp: ZillowComp = {
      id: parsed.id || Date.now().toString(),
      address: parsed.address || "Unknown Address",
      soldPrice: parsed.soldPrice,
      soldDate: parsed.soldDate || "",
      beds: parsed.beds || 0,
      baths: parsed.baths || 0,
      sqft: parsed.sqft || 0,
      propertyType: parsed.propertyType || "",
      yearBuilt: parsed.yearBuilt || 0,
      zestimate: parsed.zestimate !== undefined ? parsed.zestimate : null,
      rentZestimate:
        parsed.rentZestimate !== undefined ? parsed.rentZestimate : null,
      pricePerSqft: parsed.pricePerSqft || 0,
      description: parsed.description || "",
      zillowLink: parsed.zillowLink || "",
      lotSize: parsed.lotSize,
      hasPool: parsed.hasPool,
      parkingSpaces: parsed.parkingSpaces,
      daysOnMarket: parsed.daysOnMarket,
    };

    const updatedComps = [...comps, newComp];
    onCompsChange(updatedComps);
    setPasteData("");
    toast.success(`Added comp: ${newComp.address}`);
  };

  const handleRemoveComp = (id: string) => {
    const updatedComps = comps.filter((c) => c.id !== id);
    onCompsChange(updatedComps);
    toast.success("Comp removed");
  };

  const handleCompFieldChange = (
    id: string,
    field: keyof ZillowComp,
    value: string | number
  ) => {
    const updatedComps = comps.map((comp) => {
      if (comp.id === id) {
        return { ...comp, [field]: value };
      }
      return comp;
    });
    onCompsChange(updatedComps);
  };

  // Parse Subject Property from Zillow (For Sale listing)
  const parseSubjectProperty = (
    rawData: string
  ): Partial<SubjectProperty> | null => {
    try {
      const property: Partial<SubjectProperty> = {};

      // Extract address
      const addressMatch = rawData.match(
        /(\d+(?:-\d+)?\s+[NSEW]?[WE]?\s+\d+(?:st|nd|rd|th)\s+(?:St|Ave|Rd|Dr|Ct|Ln|Way|Blvd|Pl|Ter)[^,]*,\s*[^,]+,\s*FL\s+\d{5})/i
      );
      if (addressMatch) {
        property.address = addressMatch[1].trim();
      }

      // Extract asking price (For sale: "$559,900" or "For sale\n$559,900")
      const priceMatch =
        rawData.match(/For sale\s*\n?\s*\$?([\d,]+)/i) ||
        rawData.match(/^\s*\$?([\d,]+)/);
      if (priceMatch) {
        property.purchasePrice = parseInt(priceMatch[1].replace(/,/g, ""));
      }

      // Extract beds
      const bedsMatch = rawData.match(/(\d+)\s*(?:bd|beds?)\b/i);
      if (bedsMatch) {
        property.beds = parseInt(bedsMatch[1]);
      } else if (rawData.match(/--\s*(?:bd|beds?)\b/i)) {
        property.beds = 0;
      }

      // Extract baths
      const bathsMatch = rawData.match(/(\d+(?:\.\d+)?)\s*(?:ba|baths?)\b/i);
      if (bathsMatch) {
        property.baths = parseFloat(bathsMatch[1]);
      } else if (rawData.match(/0\s*(?:ba|baths?)\b/i)) {
        property.baths = 0;
      }

      // Extract sqft - prioritize "Total interior livable area" over general sqft
      const livableAreaMatch = rawData.match(
        /Total interior livable area:\s*([\d,]+)\s*sqft/i
      );
      const sqftMatch = rawData.match(/([\d,]+)\s*sqft/i);
      if (livableAreaMatch) {
        property.sqft = parseInt(livableAreaMatch[1].replace(/,/g, ""));
      } else if (sqftMatch) {
        property.sqft = parseInt(sqftMatch[1].replace(/,/g, ""));
      }

      // Extract year built
      const yearMatch = rawData.match(/(?:Built in|Year built:?)\s*(\d{4})/i);
      if (yearMatch) {
        property.yearBuilt = parseInt(yearMatch[1]);
      }

      // Extract property type and determine units
      // Look for: Property subtype, Home type, or standalone keywords
      let typeMatch = rawData.match(/Property subtype:\s*([^\n]+)/i);
      if (!typeMatch) {
        typeMatch = rawData.match(/Home type:\s*([^\n]+)/i);
      }
      if (!typeMatch) {
        typeMatch = rawData.match(
          /\b(Duplex|Triplex|Quadplex|Single Family|MultiFamily|Multi Family|Condo|Townhouse)\b/i
        );
      }

      if (typeMatch) {
        const type = typeMatch[1].trim();
        property.propertyType = type;

        // Determine units based on property type
        if (/duplex/i.test(type)) {
          property.units = 2;
        } else if (/triplex/i.test(type)) {
          property.units = 3;
        } else if (/quadplex|fourplex/i.test(type)) {
          property.units = 4;
        } else if (/single/i.test(type)) {
          property.units = 1;
        } else if (/multi/i.test(type)) {
          // Try to extract unit count from data
          const unitsMatch = rawData.match(/(\d+)\s*units/i);
          property.units = unitsMatch ? parseInt(unitsMatch[1]) : 2; // Default to 2 if not specified
        } else {
          property.units = 1; // Default for condo, townhouse, etc.
        }
      }

      // Extract Zestimate
      const zestimateMatch = rawData.match(/\$?([\d,]+)\s*Zestimate®/i);
      if (zestimateMatch) {
        property.zestimate = parseInt(zestimateMatch[1].replace(/,/g, ""));
      }

      // Extract Rent Zestimate - multiple formats:
      // "Est.: $3,729/mo" or "Rent Zestimate®\n\nNot available" or "$1,500/mo rent"
      const rentEstMatch =
        rawData.match(/Est\.?\s*:?\s*\$?([\d,]+)\/mo/i) ||
        rawData.match(/Rent Zestimate®\s*\$?([\d,]+)/i);
      if (rentEstMatch) {
        property.rentZestimate = parseInt(rentEstMatch[1].replace(/,/g, ""));
      } else if (rawData.match(/Rent Zestimate®\s*Not available/i)) {
        property.rentZestimate = 0;
      }

      // Extract description - comes after "What's special" section
      // Look for a paragraph of text that appears to be the main property description
      // It typically comes after the feature list and before administrative text
      // Handle both formats: with blank line separator OR features run together
      let descMatch = rawData.match(
        /What's special[^]*?\n\s*\n([A-Z][^]*?)(?:\s*Hide|\s*\d+\s+days\s+on\s+Zillow|Zillow last checked|Listing updated)/i
      );

      if (!descMatch) {
        // Try alternative format where features and description run together
        // Extract everything between "What's special" and terminating keywords
        const whatSpecialMatch = rawData.match(
          /What's special([^]*?)(?:Hide|\d+\s+days\s+on\s+Zillow|Zillow last checked|Listing updated)/i
        );
        if (whatSpecialMatch) {
          const content = whatSpecialMatch[1];
          // Look for complete sentences (multiple sentences ending with . or !)
          // Match text that has at least 2 sentences with proper spacing
          const sentencesMatch = content.match(
            /([A-Z][^.!?]*(?:[.!?](?:\s+[A-Z][^.!?]*[.!?])+))/
          );
          if (sentencesMatch) {
            descMatch = [sentencesMatch[0], sentencesMatch[1]];
          } else {
            // Fallback: look for any substantial sentence with proper word spacing
            const singleSentenceMatch = content.match(
              /([A-Z][a-z]+\s+[^!.]*[!.])/
            );
            if (singleSentenceMatch && singleSentenceMatch[1].length > 100) {
              descMatch = [singleSentenceMatch[0], singleSentenceMatch[1]];
            }
          }
        }
      }

      if (descMatch) {
        // Extract just the first substantial paragraph (before any double newline or administrative text)
        let desc = descMatch[1];
        // If there are multiple paragraphs, take all of them up to reasonable limit
        const paragraphs = desc.split(/\n\s*\n/);
        const mainDesc = paragraphs[0];
        if (mainDesc && mainDesc.length > 50) {
          desc = mainDesc
            .trim()
            .replace(/\s+/g, " ") // Replace multiple spaces/newlines with single space
            .replace(/\n/g, " ") // Replace newlines with spaces
            .substring(0, 1000); // Limit to 1000 chars for full description
          property.description = desc;
        }
      }

      return property;
    } catch (error) {
      console.error("Error parsing subject property:", error);
      return null;
    }
  };

  const handleParseSubjectProperty = () => {
    if (!subjectPasteData.trim()) {
      toast.error("Please paste Zillow listing data");
      return;
    }

    if (!onSubjectPropertyChange) {
      toast.error("Subject property updates not supported");
      return;
    }

    const parsed = parseSubjectProperty(subjectPasteData);
    if (!parsed || !parsed.address) {
      toast.error(
        "Could not parse subject property data. Make sure you copied from a Zillow For Sale listing."
      );
      return;
    }

    const newProperty: SubjectProperty = {
      address: parsed.address || "",
      purchasePrice: parsed.purchasePrice || 0,
      beds: parsed.beds || 0,
      baths: parsed.baths || 0,
      sqft: parsed.sqft || 0,
      yearBuilt: parsed.yearBuilt || 0,
      propertyType: parsed.propertyType || "",
      units: parsed.units || 1,
      zestimate: parsed.zestimate,
      rentZestimate: parsed.rentZestimate,
      description: parsed.description,
    };

    console.log("ARVCalculator - Subject property parsed:", {
      address: newProperty.address,
      purchasePrice: newProperty.purchasePrice,
      description: newProperty.description
        ? newProperty.description.substring(0, 100) + "..."
        : "NO DESCRIPTION",
    });

    onSubjectPropertyChange(newProperty);
    setSubjectPasteData("");

    // Auto-expand description if available
    if (parsed.description && parsed.description.trim().length > 0) {
      setExpandedDescriptions((prev) => ({ ...prev, subject: true }));
    }

    // Build description with all extracted data
    const descParts = [
      `${newProperty.beds}bd/${newProperty.baths}ba`,
      `${newProperty.sqft.toLocaleString()} sqft`,
      `${newProperty.units} unit${newProperty.units > 1 ? "s" : ""}`,
      newProperty.purchasePrice > 0
        ? `${formatCurrency(newProperty.purchasePrice)} asking`
        : null,
      newProperty.zestimate
        ? `${formatCurrency(newProperty.zestimate)} Zestimate`
        : null,
      newProperty.rentZestimate
        ? `${formatCurrency(newProperty.rentZestimate)}/mo rent est.`
        : null,
    ]
      .filter(Boolean)
      .join(" • ");

    toast.success(`Subject property loaded: ${newProperty.address}`, {
      description: descParts,
    });
  };

  // Calculate ARV based on comps with intelligent adjustments
  useEffect(() => {
    if (comps.length === 0) {
      if (calculatedARV !== 0) {
        onARVChange(0);
      }
      return;
    }

    // If no subject property data, fall back to simple median
    if (!subjectProperty || !subjectProperty.sqft) {
      const sortedPrices = [...comps].sort((a, b) => a.soldPrice - b.soldPrice);
      const median =
        comps.length % 2 === 0
          ? Math.round(
              (sortedPrices[comps.length / 2 - 1].soldPrice +
                sortedPrices[comps.length / 2].soldPrice) /
                2
            )
          : sortedPrices[Math.floor(comps.length / 2)].soldPrice;
      if (calculatedARV !== median) {
        onARVChange(median);
      }
      return;
    }

    // Intelligent ARV calculation with adjustments
    const adjustedComps = comps.map((comp) => {
      let adjustedPrice = comp.soldPrice;
      let similarityScore = 100; // Start at 100%

      // Adjust for square footage difference (primary factor)
      if (comp.sqft > 0 && subjectProperty.sqft > 0) {
        const sqftDiff = subjectProperty.sqft - comp.sqft;
        const pricePerSqft = comp.soldPrice / comp.sqft;
        // Adjust price based on sqft difference
        adjustedPrice += sqftDiff * pricePerSqft;

        // Penalize similarity for large sqft differences
        const sqftDiffPercent = Math.abs(sqftDiff) / subjectProperty.sqft;
        similarityScore -= sqftDiffPercent * 30; // Max 30 point penalty for sqft
      }

      // Adjust for bedroom difference
      if (comp.beds > 0 && subjectProperty.beds > 0) {
        const bedDiff = subjectProperty.beds - comp.beds;
        // Each bedroom worth approximately 8-10% of property value
        adjustedPrice += bedDiff * (comp.soldPrice * 0.09);

        // Penalize similarity for bedroom mismatch
        const bedDiffAbs = Math.abs(bedDiff);
        similarityScore -= bedDiffAbs * 10; // 10 points per bedroom difference
      }

      // Adjust for bathroom difference
      if (comp.baths > 0 && subjectProperty.baths > 0) {
        const bathDiff = subjectProperty.baths - comp.baths;
        // Each bathroom worth approximately 5-7% of property value
        adjustedPrice += bathDiff * (comp.soldPrice * 0.06);

        // Penalize similarity for bathroom mismatch
        const bathDiffAbs = Math.abs(bathDiff);
        similarityScore -= bathDiffAbs * 5; // 5 points per bathroom difference
      }

      // Adjust for age/year built
      if (comp.yearBuilt > 0 && subjectProperty.yearBuilt > 0) {
        const ageDiff = comp.yearBuilt - subjectProperty.yearBuilt;
        // Newer properties worth approximately 0.5-1% more per year
        adjustedPrice -= ageDiff * (comp.soldPrice * 0.007);

        // Penalize similarity for large age differences
        const ageDiffAbs = Math.abs(ageDiff);
        if (ageDiffAbs > 10) {
          similarityScore -= Math.min(ageDiffAbs / 2, 15); // Max 15 point penalty
        }
      }

      // Bonus for property type match
      if (comp.propertyType && subjectProperty.propertyType) {
        const compType = comp.propertyType.toLowerCase();
        const subjectType = subjectProperty.propertyType.toLowerCase();
        if (compType.includes("multi") && subjectType.includes("multi")) {
          similarityScore += 10; // Bonus for both being multifamily
        } else if (compType === subjectType) {
          similarityScore += 5; // Bonus for exact match
        } else {
          similarityScore -= 10; // Penalty for type mismatch
        }
      }

      // Ensure similarity score is between 0 and 100
      similarityScore = Math.max(0, Math.min(100, similarityScore));

      return {
        ...comp,
        adjustedPrice: Math.round(adjustedPrice),
        similarityScore,
      };
    });

    // Calculate weighted average based on similarity scores
    let totalWeightedPrice = 0;
    let totalWeight = 0;

    adjustedComps.forEach((comp) => {
      const weight = comp.similarityScore / 100;
      totalWeightedPrice += comp.adjustedPrice * weight;
      totalWeight += weight;
    });

    const weightedARV =
      totalWeight > 0
        ? Math.round(totalWeightedPrice / totalWeight)
        : Math.round(
            adjustedComps.reduce((sum, c) => sum + c.adjustedPrice, 0) /
              adjustedComps.length
          );

    // Only update if ARV actually changed to prevent infinite loops
    if (calculatedARV !== weightedARV) {
      onARVChange(weightedARV);
    }
  }, [
    comps,
    subjectProperty?.beds,
    subjectProperty?.baths,
    subjectProperty?.sqft,
    subjectProperty?.yearBuilt,
    subjectProperty?.propertyType,
  ]);

  const formatCurrency = (num: number) => {
    if (!num) return "$0";
    return "$" + num.toLocaleString();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    // Try to parse MM/DD/YY format
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const [month, day, year] = parts;
      const fullYear =
        year.length === 2
          ? parseInt(year) > 50
            ? "19" + year
            : "20" + year
          : year;
      return `${month}/${day}/${fullYear}`;
    }
    return dateStr;
  };

  const toggleDescription = (id: string) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Photo preview handlers
  const handlePreviewPhotos = (
    photos: { id: string; url: string; isPrimary?: boolean }[],
    title: string,
    type: "subject" | "comp",
    compId?: string
  ) => {
    if (!photos || photos.length === 0) {
      toast.error("No photos available to preview");
      return;
    }
    setPreviewPhotos(photos);
    setPreviewTitle(title);
    setPreviewType(type);
    setPreviewCompId(compId || null);
    setPhotoPreviewOpen(true);
  };

  // Handle photo deletion
  const handleDeletePhoto = (photoId: string) => {
    if (previewType === "subject" && onSubjectPhotosChange && subjectPhotos) {
      const updatedPhotos = subjectPhotos.filter((p) => p.id !== photoId);
      onSubjectPhotosChange(updatedPhotos);
      setPreviewPhotos(updatedPhotos);
      toast.success("Photo deleted from subject property");

      if (updatedPhotos.length === 0) {
        setPhotoPreviewOpen(false);
      }
    } else if (previewType === "comp" && previewCompId) {
      const updatedComps = comps.map((comp) => {
        if (comp.id === previewCompId) {
          const updatedPhotos = (comp.photos || []).filter(
            (p) => p.id !== photoId
          );
          return { ...comp, photos: updatedPhotos };
        }
        return comp;
      });
      onCompsChange(updatedComps);

      const updatedPhotos = previewPhotos.filter((p) => p.id !== photoId);
      setPreviewPhotos(updatedPhotos);
      toast.success("Photo deleted from comp property");

      if (updatedPhotos.length === 0) {
        setPhotoPreviewOpen(false);
      }
    }
  };

  // Handle photo upload for comps
  const handleCompPhotoUpload = (
    compId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const url = e.target?.result as string;
      const newPhoto = {
        id: `photo-${Date.now()}`,
        url,
        isPrimary: false,
      };

      const updatedComps = comps.map((comp) => {
        if (comp.id === compId) {
          const existingPhotos = comp.photos || [];
          return {
            ...comp,
            photos: [...existingPhotos, newPhoto],
          };
        }
        return comp;
      });

      onCompsChange(updatedComps);
      toast.success("Photo added to comp property");
    };

    reader.readAsDataURL(file);
  };

  // Handle drag-and-drop for subject property
  const handleSubjectPhotoDrop = (files: FileList) => {
    if (!onSubjectPhotosChange) {
      toast.error("Photo upload not supported for subject property");
      return;
    }

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please drop an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const newPhoto = {
        id: `photo-${Date.now()}`,
        url,
        isPrimary: (subjectPhotos?.length || 0) === 0,
      };

      const updatedPhotos = [...(subjectPhotos || []), newPhoto];
      onSubjectPhotosChange(updatedPhotos);
      toast.success("Photo added to subject property");
    };

    reader.readAsDataURL(file);
  };

  // Handle drag-and-drop for comp property
  const handleCompPhotoDrop = (compId: string, files: FileList) => {
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please drop an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const newPhoto = {
        id: `photo-${Date.now()}`,
        url,
        isPrimary: false,
      };

      const updatedComps = comps.map((comp) => {
        if (comp.id === compId) {
          const existingPhotos = comp.photos || [];
          return {
            ...comp,
            photos: [...existingPhotos, newPhoto],
          };
        }
        return comp;
      });

      onCompsChange(updatedComps);
      toast.success("Photo added to comp property");
    };

    reader.readAsDataURL(file);
  };

  // Handle photo upload for subject property
  const handleSubjectPhotoUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!onSubjectPhotosChange) {
      toast.error("Photo upload not supported for subject property");
      return;
    }

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const url = e.target?.result as string;
      const newPhoto = {
        id: `photo-${Date.now()}`,
        url,
        isPrimary: (subjectPhotos?.length || 0) === 0, // First photo is primary
      };

      const updatedPhotos = [...(subjectPhotos || []), newPhoto];
      onSubjectPhotosChange(updatedPhotos);
      toast.success("Photo added to subject property");
    };

    reader.readAsDataURL(file);
  };

  // Calculate similarity score and adjusted price for a single comp using weighted scoring
  const getCompAdjustment = (comp: ZillowComp) => {
    if (!subjectProperty || !subjectProperty.sqft) {
      return { adjustedPrice: comp.soldPrice, similarityScore: 100 };
    }

    let adjustedPrice = comp.soldPrice;

    // WEIGHTED SCORING SYSTEM
    // Each sub-score is normalized to 0-100, then weighted

    // 1. DISTANCE SCORE (25% weight)
    let distanceScore = 50; // Default if no coords available
    if (subjectProperty.lat && subjectProperty.lng && comp.lat && comp.lng) {
      const distance = calculateDistance(
        subjectProperty.lat,
        subjectProperty.lng,
        comp.lat,
        comp.lng
      );
      if (distance <= 0.25) {
        distanceScore = 100;
      } else if (distance <= 0.5) {
        distanceScore = 80;
      } else if (distance <= 1.0) {
        distanceScore = 50;
      } else {
        // Linear decay from 50 to 0 between 1 and 3 miles
        distanceScore = Math.max(0, 50 - (distance - 1.0) * 25);
      }
    }

    // 2. RECENCY SCORE (20% weight)
    let recencyScore = 50; // Default if no date
    if (comp.soldDate) {
      try {
        const soldDate = new Date(comp.soldDate);
        const now = new Date();
        const monthsAgo =
          (now.getTime() - soldDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

        if (monthsAgo <= 6) {
          recencyScore = 100;
        } else if (monthsAgo <= 12) {
          recencyScore = 50 + ((12 - monthsAgo) / 6) * 50; // Linear 100-50
        } else if (monthsAgo <= 18) {
          recencyScore = ((18 - monthsAgo) / 6) * 50; // Linear 50-0
        } else {
          recencyScore = 0;
        }
      } catch {
        recencyScore = 50; // Parse error fallback
      }
    }

    // 3. LIVING AREA SCORE (20% weight)
    let livingAreaScore = 100;
    if (comp.sqft > 0 && subjectProperty.sqft > 0) {
      const sqftDiff = subjectProperty.sqft - comp.sqft;
      const pricePerSqft = comp.soldPrice / comp.sqft;
      adjustedPrice += sqftDiff * pricePerSqft;

      const sqftDiffPercent = (Math.abs(sqftDiff) / subjectProperty.sqft) * 100;
      const penalty = Math.min(sqftDiffPercent * 2, 30); // 2 points per %, max 30
      livingAreaScore = Math.max(0, 100 - penalty);
    }

    // 4. BEDS/BATHS SCORE (10% weight)
    let bedsBathsScore = 100;
    if (comp.beds > 0 && subjectProperty.beds > 0) {
      const bedDiff = subjectProperty.beds - comp.beds;
      adjustedPrice += bedDiff * (comp.soldPrice * 0.09);
      bedsBathsScore -= Math.abs(bedDiff) * 10;
    }
    if (comp.baths > 0 && subjectProperty.baths > 0) {
      const bathDiff = subjectProperty.baths - comp.baths;
      adjustedPrice += bathDiff * (comp.soldPrice * 0.06);
      bedsBathsScore -= Math.abs(bathDiff) * 5;
    }
    bedsBathsScore = Math.max(0, bedsBathsScore);

    // 5. CONDITION KEYWORDS SCORE (10% weight)
    let conditionScore = 100;
    const compDesc = (comp.description || "").toLowerCase();
    const subjectDesc = (subjectProperty.description || "").toLowerCase();

    const compUpdated =
      compDesc.includes("updated") ||
      compDesc.includes("renovated") ||
      compDesc.includes("remodeled");
    const subjectUpdated =
      subjectDesc.includes("updated") ||
      subjectDesc.includes("renovated") ||
      subjectDesc.includes("remodeled");
    const compAsIs =
      compDesc.includes("as-is") ||
      compDesc.includes("as is") ||
      compDesc.includes("fixer");
    const subjectAsIs =
      subjectDesc.includes("as-is") ||
      subjectDesc.includes("as is") ||
      subjectDesc.includes("fixer");

    if (compUpdated && subjectUpdated) {
      conditionScore = 110; // Bonus for both updated
    } else if (compAsIs !== subjectAsIs) {
      conditionScore = 90; // Penalty if condition mismatch
    }
    conditionScore = Math.max(0, Math.min(100, conditionScore));

    // 6. YEAR BUILT SCORE (5% weight)
    let yearBuiltScore = 100;
    if (comp.yearBuilt > 0 && subjectProperty.yearBuilt > 0) {
      const ageDiff = comp.yearBuilt - subjectProperty.yearBuilt;
      adjustedPrice -= ageDiff * (comp.soldPrice * 0.007);

      const ageDiffAbs = Math.abs(ageDiff);
      if (ageDiffAbs > 10) {
        const penalty = Math.min((ageDiffAbs - 10) * 1.5, 15);
        yearBuiltScore = Math.max(0, 100 - penalty);
      }
    }

    // 7. $/SQFT ALIGNMENT SCORE (10% weight)
    let pricePerSqftScore = 100;
    if (
      comp.sqft > 0 &&
      subjectProperty.sqft > 0 &&
      comp.soldPrice > 0 &&
      subjectProperty.purchasePrice > 0
    ) {
      const compPPSF = comp.soldPrice / comp.sqft;
      const subjectPPSF = subjectProperty.purchasePrice / subjectProperty.sqft;
      const ppsfDiffPercent =
        Math.abs((compPPSF - subjectPPSF) / subjectPPSF) * 100;
      const penalty = Math.min(ppsfDiffPercent * 0.3, 20); // 0.3 points per %, max 20
      pricePerSqftScore = Math.max(0, 100 - penalty);
    }

    // CALCULATE WEIGHTED AVERAGE
    const weights = {
      distance: 0.25,
      recency: 0.2,
      livingArea: 0.2,
      bedsBaths: 0.1,
      condition: 0.1,
      yearBuilt: 0.05,
      pricePerSqft: 0.1,
    };

    const finalScore =
      distanceScore * weights.distance +
      recencyScore * weights.recency +
      livingAreaScore * weights.livingArea +
      bedsBathsScore * weights.bedsBaths +
      conditionScore * weights.condition +
      yearBuiltScore * weights.yearBuilt +
      pricePerSqftScore * weights.pricePerSqft;

    const similarityScore = Math.max(0, Math.min(100, Math.round(finalScore)));

    return {
      adjustedPrice: Math.round(adjustedPrice),
      similarityScore,
    };
  };

  // Get detailed score breakdown for tooltip display
  const getScoreBreakdown = (comp: ZillowComp) => {
    if (!subjectProperty || !subjectProperty.sqft) {
      return null;
    }

    // 1. DISTANCE SCORE (25% weight)
    let distanceScore = 50;
    let distance: number | null = null;
    if (subjectProperty.lat && subjectProperty.lng && comp.lat && comp.lng) {
      const d = calculateDistance(
        subjectProperty.lat,
        subjectProperty.lng,
        comp.lat,
        comp.lng
      );
      distance = d;
      if (d <= 0.25) {
        distanceScore = 100;
      } else if (d <= 0.5) {
        distanceScore = 80;
      } else if (d <= 1.0) {
        distanceScore = 50;
      } else {
        distanceScore = Math.max(0, 50 - (d - 1.0) * 25);
      }
    }

    // 2. RECENCY SCORE (20% weight)
    let recencyScore = 50;
    let monthsAgo: number | null = null;
    if (comp.soldDate) {
      try {
        const soldDate = new Date(comp.soldDate);
        const now = new Date();
        monthsAgo =
          (now.getTime() - soldDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

        if (monthsAgo <= 6) {
          recencyScore = 100;
        } else if (monthsAgo <= 12) {
          recencyScore = 50 + ((12 - monthsAgo) / 6) * 50;
        } else if (monthsAgo <= 18) {
          recencyScore = ((18 - monthsAgo) / 6) * 50;
        } else {
          recencyScore = 0;
        }
      } catch {
        recencyScore = 50;
      }
    }

    // 3. LIVING AREA SCORE (20% weight)
    let livingAreaScore = 100;
    let sqftDiffPercent = 0;
    if (comp.sqft > 0 && subjectProperty.sqft > 0) {
      const sqftDiff = subjectProperty.sqft - comp.sqft;
      sqftDiffPercent = (Math.abs(sqftDiff) / subjectProperty.sqft) * 100;
      const penalty = Math.min(sqftDiffPercent * 2, 30);
      livingAreaScore = Math.max(0, 100 - penalty);
    }

    // 4. BEDS/BATHS SCORE (10% weight)
    let bedsBathsScore = 100;
    if (comp.beds > 0 && subjectProperty.beds > 0) {
      const bedDiff = subjectProperty.beds - comp.beds;
      bedsBathsScore -= Math.abs(bedDiff) * 10;
    }
    if (comp.baths > 0 && subjectProperty.baths > 0) {
      const bathDiff = subjectProperty.baths - comp.baths;
      bedsBathsScore -= Math.abs(bathDiff) * 5;
    }
    bedsBathsScore = Math.max(0, bedsBathsScore);

    // 5. CONDITION KEYWORDS SCORE (10% weight)
    let conditionScore = 100;
    const compDesc = (comp.description || "").toLowerCase();
    const subjectDesc = (subjectProperty.description || "").toLowerCase();

    const compUpdated =
      compDesc.includes("updated") ||
      compDesc.includes("renovated") ||
      compDesc.includes("remodeled");
    const subjectUpdated =
      subjectDesc.includes("updated") ||
      subjectDesc.includes("renovated") ||
      subjectDesc.includes("remodeled");
    const compAsIs =
      compDesc.includes("as-is") ||
      compDesc.includes("as is") ||
      compDesc.includes("fixer");
    const subjectAsIs =
      subjectDesc.includes("as-is") ||
      subjectDesc.includes("as is") ||
      subjectDesc.includes("fixer");

    if (compUpdated && subjectUpdated) {
      conditionScore = 110;
    } else if (compAsIs !== subjectAsIs) {
      conditionScore = 90;
    }
    conditionScore = Math.max(0, Math.min(100, conditionScore));

    // 6. YEAR BUILT SCORE (5% weight)
    let yearBuiltScore = 100;
    let ageDiff = 0;
    if (comp.yearBuilt > 0 && subjectProperty.yearBuilt > 0) {
      ageDiff = comp.yearBuilt - subjectProperty.yearBuilt;
      const ageDiffAbs = Math.abs(ageDiff);
      if (ageDiffAbs > 10) {
        const penalty = Math.min((ageDiffAbs - 10) * 1.5, 15);
        yearBuiltScore = Math.max(0, 100 - penalty);
      }
    }

    // 7. $/SQFT ALIGNMENT SCORE (10% weight)
    let pricePerSqftScore = 100;
    let ppsfDiffPercent = 0;
    if (
      comp.sqft > 0 &&
      subjectProperty.sqft > 0 &&
      comp.soldPrice > 0 &&
      subjectProperty.purchasePrice > 0
    ) {
      const compPPSF = comp.soldPrice / comp.sqft;
      const subjectPPSF = subjectProperty.purchasePrice / subjectProperty.sqft;
      ppsfDiffPercent = Math.abs((compPPSF - subjectPPSF) / subjectPPSF) * 100;
      const penalty = Math.min(ppsfDiffPercent * 0.3, 20);
      pricePerSqftScore = Math.max(0, 100 - penalty);
    }

    // CALCULATE WEIGHTED AVERAGE
    const weights = {
      distance: 0.25,
      recency: 0.2,
      livingArea: 0.2,
      bedsBaths: 0.1,
      condition: 0.1,
      yearBuilt: 0.05,
      pricePerSqft: 0.1,
    };

    const finalScore =
      distanceScore * weights.distance +
      recencyScore * weights.recency +
      livingAreaScore * weights.livingArea +
      bedsBathsScore * weights.bedsBaths +
      conditionScore * weights.condition +
      yearBuiltScore * weights.yearBuilt +
      pricePerSqftScore * weights.pricePerSqft;

    return {
      distanceScore: Math.round(distanceScore),
      recencyScore: Math.round(recencyScore),
      livingAreaScore: Math.round(livingAreaScore),
      bedsBathsScore: Math.round(bedsBathsScore),
      conditionScore: Math.round(conditionScore),
      yearBuiltScore: Math.round(yearBuiltScore),
      pricePerSqftScore: Math.round(pricePerSqftScore),
      finalScore: Math.round(finalScore),
      distance,
      monthsAgo,
      sqftDiffPercent,
      ageDiff,
      ppsfDiffPercent,
    };
  };

  const getStats = () => {
    if (comps.length === 0) return null;

    const prices = comps.map((c) => c.soldPrice);
    const avgPrice = Math.round(
      prices.reduce((a, b) => a + b, 0) / prices.length
    );
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const sqfts = comps.filter((c) => c.sqft > 0).map((c) => c.sqft);
    const avgSqft =
      sqfts.length > 0
        ? Math.round(sqfts.reduce((a, b) => a + b, 0) / sqfts.length)
        : 0;

    const ppSquare = comps
      .filter((c) => c.pricePerSqft > 0)
      .map((c) => c.pricePerSqft);
    const avgPPSqft =
      ppSquare.length > 0
        ? Math.round(ppSquare.reduce((a, b) => a + b, 0) / ppSquare.length)
        : 0;

    return {
      avgPrice,
      minPrice,
      maxPrice,
      avgSqft,
      avgPPSqft,
    };
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Comparable Sale (Zillow Data)</CardTitle>
          <CardDescription>
            Copy and paste entire Zillow "Sold" listing pages to automatically
            extract comparable sale details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Paste Zillow Sold Listing Data</Label>
            <Textarea
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              placeholder="Copy the entire Zillow sold listing page (Ctrl+A, Ctrl+C) and paste here..."
              rows={8}
              className="font-mono text-sm"
            />
          </div>
          <Button onClick={handleParse} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Parse & Add Comp
          </Button>
        </CardContent>
      </Card>

      {(comps.length > 0 || (subjectProperty && subjectProperty.address)) && (
        <>
          {comps.length > 0 && comps.length < 3 && (
            <Card className="border-yellow-400 bg-yellow-50/50">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div>
                    <h4 className="text-sm text-yellow-800 mb-1">
                      Limited Data Warning
                    </h4>
                    <p className="text-sm text-yellow-700">
                      You have only {comps.length} comp
                      {comps.length > 1 ? "s" : ""}. For a more accurate ARV
                      estimate, add at least 3-5 comparable sales.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Comparable Sales ({comps.length})</CardTitle>
                  <CardDescription>
                    {subjectProperty && subjectProperty.sqft > 0
                      ? "ARV calculated using weighted analysis with adjustments for beds, baths, sqft, and age"
                      : "ARV is calculated as the median sold price of all comps"}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    Calculated ARV
                  </div>
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(calculatedARV)}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {subjectProperty &&
                subjectProperty.sqft > 0 &&
                comps.length > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-blue-900 mb-1">
                          Intelligent ARV Analysis
                        </h4>
                        <p className="text-xs text-blue-700">
                          Each comp is automatically adjusted for differences in
                          beds, baths, square footage, age, and property type.
                          The "Match %" shows how similar each comp is to your
                          subject property. Higher match scores carry more
                          weight in the final ARV calculation.
                        </p>
                        <div className="mt-2 flex gap-3 text-xs">
                          <div>
                            <Badge variant="default" className="bg-green-600">
                              80%+
                            </Badge>{" "}
                            Excellent Match
                          </div>
                          <div>
                            <Badge
                              variant="secondary"
                              className="bg-yellow-600"
                            >
                              60-79%
                            </Badge>{" "}
                            Good Match
                          </div>
                          <div>
                            <Badge
                              variant="outline"
                              className="bg-orange-600 text-white"
                            >
                              &lt;60%
                            </Badge>{" "}
                            Fair Match
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {stats && (
                <div className="grid grid-cols-5 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Average Price
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(stats.avgPrice)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Price Range
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(stats.minPrice)} -{" "}
                      {formatCurrency(stats.maxPrice)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Avg Sqft
                    </div>
                    <div className="font-semibold">
                      {stats.avgSqft.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Avg $/sqft
                    </div>
                    <div className="font-semibold">${stats.avgPPSqft}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {subjectProperty && subjectProperty.sqft > 0
                        ? "Weighted ARV"
                        : "Median (ARV)"}
                    </div>
                    <div className="font-semibold text-green-600">
                      {formatCurrency(calculatedARV)}
                    </div>
                  </div>
                </div>
              )}

              {/* Geocoding Info Banner - only show if Distance column is visible but coordinates missing */}
              {subjectProperty &&
                subjectProperty.sqft > 0 &&
                comps.length > 0 &&
                (() => {
                  const hasSubjectCoords =
                    subjectProperty.lat && subjectProperty.lng;
                  const missingCompCoords = comps.some(
                    (comp) => !comp.lat || !comp.lng
                  );

                  if (!hasSubjectCoords || missingCompCoords) {
                    return (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-300 rounded-lg">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-700" />
                          <div className="text-sm text-blue-800">
                            <strong>Distance column:</strong> Scroll down to the
                            map and click{" "}
                            <strong>"Geocode All Addresses"</strong> to
                            calculate distances from subject property to each
                            comp.
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Price</TableHead>
                      {subjectProperty && subjectProperty.sqft > 0 && (
                        <>
                          <TableHead>Adj. Value</TableHead>
                          <TableHead title="Weighted Match Score: Distance 25% (100≤0.25mi, 80≤0.5mi, 50≤1mi) • Recency 20% (100≤6mo, 50≤12mo) • Living Area 20% (-2pts per % diff, max -30) • Beds/Baths 10% (-10 per bed, -5 per bath) • Condition 10% (+10 both updated, -10 mismatch) • Year Built 5% (-1.5 per yr over 10yr diff, max -15) • $/sqft Alignment 10% (-0.3 per % diff, max -20). Green ≥80%, Yellow 60-79%, Orange <60%.">
                            Match %
                          </TableHead>
                          <TableHead>Distance</TableHead>
                        </>
                      )}
                      <TableHead>Sale/List Date</TableHead>
                      <TableHead>Beds/Baths</TableHead>
                      <TableHead>Sqft</TableHead>
                      <TableHead>$/Sqft</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Photos</TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Subject Property Row */}
                    {subjectProperty && subjectProperty.address && (
                      <>
                        <TableRow className="bg-blue-100 border-4 border-blue-500">
                          <TableCell className="font-semibold">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-700 text-white px-3 py-1">
                                SUBJECT PROPERTY
                              </Badge>
                              <span className="font-semibold">
                                {subjectProperty.address}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-blue-900 text-base">
                              {formatCurrency(subjectProperty.purchasePrice)}
                            </div>
                            <div className="text-xs text-blue-700">
                              Purchase Price
                            </div>
                          </TableCell>
                          {subjectProperty.sqft > 0 && (
                            <>
                              <TableCell>
                                <div className="text-base text-green-700 font-bold">
                                  {formatCurrency(calculatedARV)}
                                </div>
                                <div className="text-xs text-green-600">
                                  ARV (Calculated)
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-blue-700 text-white">
                                  100%
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  -
                                </span>
                              </TableCell>
                            </>
                          )}
                          <TableCell>
                            <span className="text-sm text-blue-700 font-medium">
                              Current Listing
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-blue-900">
                              {subjectProperty.beds} / {subjectProperty.baths}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-blue-900">
                              {subjectProperty.sqft.toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="default"
                              className="bg-blue-700 text-white"
                            >
                              $
                              {subjectProperty.sqft > 0
                                ? Math.round(
                                    subjectProperty.purchasePrice /
                                      subjectProperty.sqft
                                  )
                                : 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-blue-900">
                              {subjectProperty.propertyType || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-blue-900">
                              {subjectProperty.yearBuilt || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DragDropUpload
                              onFilesSelected={handleSubjectPhotoDrop}
                              accept="image/*"
                              className="inline-block"
                            >
                              <div className="flex gap-2">
                                {subjectPhotos && subjectPhotos.length > 0 ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handlePreviewPhotos(
                                        subjectPhotos,
                                        `Subject Property: ${subjectProperty.address}`,
                                        "subject"
                                      )
                                    }
                                    className="gap-1"
                                  >
                                    <Eye className="h-4 w-4" />
                                    <span>{subjectPhotos.length}</span>
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    Drag photo here
                                  </span>
                                )}
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleSubjectPhotoUpload}
                                    className="hidden"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                  >
                                    <span>
                                      <Upload className="h-3 w-3" />
                                    </span>
                                  </Button>
                                </label>
                              </div>
                            </DragDropUpload>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 items-center">
                              <Input
                                value={subjectProperty.zillowLink || ""}
                                onChange={(e) => {
                                  if (onSubjectPropertyChange) {
                                    onSubjectPropertyChange({
                                      ...subjectProperty,
                                      zillowLink: e.target.value,
                                    });
                                  }
                                }}
                                placeholder="Paste Zillow URL"
                                className="w-[140px] text-xs"
                              />
                              {subjectProperty.zillowLink &&
                                subjectProperty.zillowLink.trim() && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      window.open(
                                        subjectProperty.zillowLink,
                                        "_blank"
                                      )
                                    }
                                    title="Open Zillow listing"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {subjectProperty.description &&
                            subjectProperty.description.trim().length > 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleDescription("subject")}
                                title={
                                  expandedDescriptions["subject"]
                                    ? "Hide description"
                                    : "View description"
                                }
                              >
                                {expandedDescriptions["subject"] ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            ) : (
                              <span
                                className="text-xs text-red-500"
                                title={`Debug: desc=${
                                  subjectProperty.description
                                    ? "exists(" +
                                      subjectProperty.description.length +
                                      " chars)"
                                    : "null/undefined"
                                }`}
                              >
                                {subjectProperty.description
                                  ? `✓ ${subjectProperty.description.length}ch`
                                  : "✗ No desc"}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                        {/* Subject Property Description Row */}
                        {subjectProperty.description &&
                          subjectProperty.description.trim().length > 0 &&
                          expandedDescriptions["subject"] && (
                            <TableRow
                              key="subject-desc"
                              className="bg-blue-50/50"
                            >
                              <TableCell
                                colSpan={subjectProperty.sqft > 0 ? 15 : 13}
                              >
                                <div className="py-2 px-4">
                                  <div className="flex items-start gap-2">
                                    <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                                      Description:
                                    </div>
                                  </div>
                                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                    {subjectProperty.description}
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                      </>
                    )}

                    {/* Comps Rows */}
                    {comps.map((comp, index) => {
                      const adjustment = getCompAdjustment(comp);
                      const hasDescription =
                        comp.description && comp.description.trim().length > 0;
                      const isHovered =
                        hoveredRowId === comp.id || hoveredCompId === comp.id;
                      return (
                        <React.Fragment key={comp.id}>
                          <TableRow
                            className={`transition-all duration-200 ease-in-out cursor-pointer ${
                              isHovered
                                ? "bg-blue-100 shadow-md scale-[1.01] dark:bg-blue-900/40"
                                : "hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                            }`}
                            onMouseEnter={() => {
                              console.log(
                                "Hovering comp:",
                                comp.id,
                                comp.address
                              );
                              setHoveredRowId(comp.id);
                              if (onCompHover) {
                                onCompHover(comp.id);
                              }
                            }}
                            onMouseLeave={() => {
                              console.log("Left comp:", comp.id);
                              setHoveredRowId(null);
                              if (onCompHover) {
                                onCompHover(null);
                              }
                            }}
                          >
                            <TableCell className="max-w-[180px]">
                              <div className="flex items-center gap-2">
                                <div
                                  className="flex-shrink-0 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold"
                                  style={{
                                    boxShadow: isHovered
                                      ? "0 0 0 3px rgba(220, 38, 38, 0.3)"
                                      : "none",
                                    transform: isHovered
                                      ? "scale(1.2)"
                                      : "scale(1)",
                                    transition: "all 0.2s ease",
                                  }}
                                >
                                  {index + 1}
                                </div>
                                <Input
                                  value={comp.address}
                                  onChange={(e) =>
                                    handleCompFieldChange(
                                      comp.id,
                                      "address",
                                      e.target.value
                                    )
                                  }
                                  className="w-full text-sm"
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={comp.soldPrice.toLocaleString()}
                                onChange={(e) => {
                                  const val = parseInt(
                                    e.target.value.replace(/,/g, "")
                                  );
                                  if (!isNaN(val))
                                    handleCompFieldChange(
                                      comp.id,
                                      "soldPrice",
                                      val
                                    );
                                }}
                                className="w-[100px] text-sm"
                              />
                            </TableCell>
                            {subjectProperty && subjectProperty.sqft > 0 && (
                              <>
                                <TableCell>
                                  <div className="text-sm font-semibold text-blue-700">
                                    {formatCurrency(adjustment.adjustedPrice)}
                                  </div>
                                  {adjustment.adjustedPrice !==
                                    comp.soldPrice && (
                                    <div className="text-xs text-muted-foreground">
                                      {adjustment.adjustedPrice > comp.soldPrice
                                        ? "+"
                                        : ""}
                                      {formatCurrency(
                                        adjustment.adjustedPrice -
                                          comp.soldPrice
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <TooltipProvider>
                                    <Tooltip delayDuration={150}>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2 cursor-help">
                                          <Badge
                                            variant={
                                              adjustment.similarityScore >= 80
                                                ? "default"
                                                : adjustment.similarityScore >=
                                                  60
                                                ? "secondary"
                                                : "outline"
                                            }
                                            className={
                                              adjustment.similarityScore >= 80
                                                ? "bg-green-600"
                                                : adjustment.similarityScore >=
                                                  60
                                                ? "bg-yellow-600"
                                                : "bg-orange-600 text-white"
                                            }
                                          >
                                            {adjustment.similarityScore}%
                                          </Badge>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="right"
                                        className="max-w-sm p-4 bg-slate-900 text-white border-slate-700"
                                      >
                                        {(() => {
                                          const breakdown =
                                            getScoreBreakdown(comp);
                                          if (!breakdown)
                                            return (
                                              <p className="text-xs">
                                                No breakdown available
                                              </p>
                                            );

                                          return (
                                            <div className="space-y-2">
                                              <div className="font-semibold text-sm mb-2 border-b border-slate-600 pb-2">
                                                Match Score Breakdown
                                              </div>

                                              {/* Distance */}
                                              <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-300">
                                                  📍 Distance (25%)
                                                  {breakdown.distance !==
                                                    null && (
                                                    <span className="text-slate-400 ml-1">
                                                      —{" "}
                                                      {breakdown.distance < 0.1
                                                        ? "<0.1"
                                                        : breakdown.distance.toFixed(
                                                            2
                                                          )}{" "}
                                                      mi
                                                    </span>
                                                  )}
                                                </span>
                                                <span
                                                  className={`font-semibold ${
                                                    breakdown.distanceScore >=
                                                    80
                                                      ? "text-green-400"
                                                      : breakdown.distanceScore >=
                                                        50
                                                      ? "text-yellow-400"
                                                      : "text-orange-400"
                                                  }`}
                                                >
                                                  {breakdown.distanceScore}
                                                </span>
                                              </div>

                                              {/* Recency */}
                                              <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-300">
                                                  🕒 Recency (20%)
                                                  {breakdown.monthsAgo !==
                                                    null && (
                                                    <span className="text-slate-400 ml-1">
                                                      —{" "}
                                                      {Math.round(
                                                        breakdown.monthsAgo
                                                      )}
                                                      mo ago
                                                    </span>
                                                  )}
                                                </span>
                                                <span
                                                  className={`font-semibold ${
                                                    breakdown.recencyScore >= 80
                                                      ? "text-green-400"
                                                      : breakdown.recencyScore >=
                                                        50
                                                      ? "text-yellow-400"
                                                      : "text-orange-400"
                                                  }`}
                                                >
                                                  {breakdown.recencyScore}
                                                </span>
                                              </div>

                                              {/* Living Area */}
                                              <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-300">
                                                  📐 Living Area (20%)
                                                  <span className="text-slate-400 ml-1">
                                                    —{" "}
                                                    {breakdown.sqftDiffPercent.toFixed(
                                                      1
                                                    )}
                                                    % diff
                                                  </span>
                                                </span>
                                                <span
                                                  className={`font-semibold ${
                                                    breakdown.livingAreaScore >=
                                                    80
                                                      ? "text-green-400"
                                                      : breakdown.livingAreaScore >=
                                                        50
                                                      ? "text-yellow-400"
                                                      : "text-orange-400"
                                                  }`}
                                                >
                                                  {breakdown.livingAreaScore}
                                                </span>
                                              </div>

                                              {/* Beds/Baths */}
                                              <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-300">
                                                  🛏️ Beds/Baths (10%)
                                                </span>
                                                <span
                                                  className={`font-semibold ${
                                                    breakdown.bedsBathsScore >=
                                                    80
                                                      ? "text-green-400"
                                                      : breakdown.bedsBathsScore >=
                                                        50
                                                      ? "text-yellow-400"
                                                      : "text-orange-400"
                                                  }`}
                                                >
                                                  {breakdown.bedsBathsScore}
                                                </span>
                                              </div>

                                              {/* Condition */}
                                              <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-300">
                                                  ✨ Condition (10%)
                                                </span>
                                                <span
                                                  className={`font-semibold ${
                                                    breakdown.conditionScore >=
                                                    80
                                                      ? "text-green-400"
                                                      : breakdown.conditionScore >=
                                                        50
                                                      ? "text-yellow-400"
                                                      : "text-orange-400"
                                                  }`}
                                                >
                                                  {breakdown.conditionScore}
                                                </span>
                                              </div>

                                              {/* Year Built */}
                                              <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-300">
                                                  📅 Year Built (5%)
                                                  <span className="text-slate-400 ml-1">
                                                    —{" "}
                                                    {breakdown.ageDiff > 0
                                                      ? "+"
                                                      : ""}
                                                    {breakdown.ageDiff}yr
                                                  </span>
                                                </span>
                                                <span
                                                  className={`font-semibold ${
                                                    breakdown.yearBuiltScore >=
                                                    80
                                                      ? "text-green-400"
                                                      : breakdown.yearBuiltScore >=
                                                        50
                                                      ? "text-yellow-400"
                                                      : "text-orange-400"
                                                  }`}
                                                >
                                                  {breakdown.yearBuiltScore}
                                                </span>
                                              </div>

                                              {/* $/sqft Alignment */}
                                              <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-300">
                                                  💰 $/sqft Align (10%)
                                                  <span className="text-slate-400 ml-1">
                                                    —{" "}
                                                    {breakdown.ppsfDiffPercent.toFixed(
                                                      1
                                                    )}
                                                    % diff
                                                  </span>
                                                </span>
                                                <span
                                                  className={`font-semibold ${
                                                    breakdown.pricePerSqftScore >=
                                                    80
                                                      ? "text-green-400"
                                                      : breakdown.pricePerSqftScore >=
                                                        50
                                                      ? "text-yellow-400"
                                                      : "text-orange-400"
                                                  }`}
                                                >
                                                  {breakdown.pricePerSqftScore}
                                                </span>
                                              </div>

                                              <div className="border-t border-slate-600 pt-2 mt-2">
                                                <div className="flex justify-between items-center text-xs font-semibold">
                                                  <span className="text-white">
                                                    Weighted Average
                                                  </span>
                                                  <span
                                                    className={`text-base ${
                                                      breakdown.finalScore >= 80
                                                        ? "text-green-400"
                                                        : breakdown.finalScore >=
                                                          60
                                                        ? "text-yellow-400"
                                                        : "text-orange-400"
                                                    }`}
                                                  >
                                                    {breakdown.finalScore}%
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell>
                                  {(() => {
                                    const subjectLat = subjectProperty?.lat;
                                    const subjectLng = subjectProperty?.lng;
                                    const compLat = comp.lat;
                                    const compLng = comp.lng;

                                    if (
                                      subjectLat &&
                                      subjectLng &&
                                      compLat &&
                                      compLng
                                    ) {
                                      const distance = calculateDistance(
                                        subjectLat,
                                        subjectLng,
                                        compLat,
                                        compLng
                                      );
                                      return (
                                        <div className="text-sm font-medium text-blue-700">
                                          {formatDistance(distance)}
                                        </div>
                                      );
                                    }

                                    // Show helpful message if coordinates missing
                                    if (!subjectLat || !subjectLng) {
                                      return (
                                        <span
                                          className="text-xs text-orange-600"
                                          title="Geocode subject property first"
                                        >
                                          Need subject
                                        </span>
                                      );
                                    }
                                    if (!compLat || !compLng) {
                                      return (
                                        <span
                                          className="text-xs text-orange-600"
                                          title="Use the map section below to geocode this address"
                                        >
                                          Geocode →
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className="text-xs text-muted-foreground">
                                        N/A
                                      </span>
                                    );
                                  })()}
                                </TableCell>
                              </>
                            )}
                            <TableCell>
                              <div className="space-y-1">
                                <Input
                                  value={comp.soldDate}
                                  onChange={(e) =>
                                    handleCompFieldChange(
                                      comp.id,
                                      "soldDate",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Sale/List date"
                                  className="w-[110px] text-sm"
                                  title="Enter sale date for sold comps or list date for active listings"
                                />
                                {(() => {
                                  const timeAgo = getTimeAgo(comp.soldDate);
                                  if (timeAgo) {
                                    return (
                                      <div
                                        className="text-xs font-semibold"
                                        style={{ color: timeAgo.color }}
                                        title={`${
                                          timeAgo.months
                                        } months ago - ${
                                          timeAgo.months < 6
                                            ? "Very relevant"
                                            : timeAgo.months < 12
                                            ? "Moderately relevant"
                                            : "Less relevant (older data)"
                                        }`}
                                      >
                                        {timeAgo.text}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 items-center text-sm">
                                <Input
                                  type="number"
                                  value={comp.beds || ""}
                                  onChange={(e) =>
                                    handleCompFieldChange(
                                      comp.id,
                                      "beds",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-12 text-sm"
                                />
                                /
                                <Input
                                  type="number"
                                  value={comp.baths || ""}
                                  onChange={(e) =>
                                    handleCompFieldChange(
                                      comp.id,
                                      "baths",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-12 text-sm"
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={comp.sqft || ""}
                                onChange={(e) =>
                                  handleCompFieldChange(
                                    comp.id,
                                    "sqft",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-20 text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                $
                                {comp.pricePerSqft ||
                                  (comp.sqft > 0
                                    ? Math.round(comp.soldPrice / comp.sqft)
                                    : 0)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={comp.propertyType || ""}
                                onChange={(e) =>
                                  handleCompFieldChange(
                                    comp.id,
                                    "propertyType",
                                    e.target.value
                                  )
                                }
                                className="w-24 text-sm"
                                placeholder="Type"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={comp.yearBuilt || ""}
                                onChange={(e) =>
                                  handleCompFieldChange(
                                    comp.id,
                                    "yearBuilt",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-16 text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <DragDropUpload
                                onFilesSelected={(files) =>
                                  handleCompPhotoDrop(comp.id, files)
                                }
                                accept="image/*"
                                className="inline-block"
                              >
                                <div className="flex gap-2">
                                  {comp.photos && comp.photos.length > 0 ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handlePreviewPhotos(
                                          comp.photos!,
                                          `Comp: ${comp.address}`,
                                          "comp",
                                          comp.id
                                        )
                                      }
                                      className="gap-1"
                                    >
                                      <Eye className="h-3 w-3" />
                                      <span className="text-xs">
                                        {comp.photos.length}
                                      </span>
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      Drag photo
                                    </span>
                                  )}
                                  <label className="cursor-pointer">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) =>
                                        handleCompPhotoUpload(comp.id, e)
                                      }
                                      className="hidden"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      asChild
                                    >
                                      <span>
                                        <Upload className="h-3 w-3" />
                                      </span>
                                    </Button>
                                  </label>
                                </div>
                              </DragDropUpload>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 items-center">
                                <Input
                                  value={comp.zillowLink || ""}
                                  onChange={(e) =>
                                    handleCompFieldChange(
                                      comp.id,
                                      "zillowLink",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Paste Zillow URL"
                                  className="w-[140px] text-xs"
                                />
                                {comp.zillowLink && comp.zillowLink.trim() && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      window.open(comp.zillowLink, "_blank")
                                    }
                                    title="Open Zillow listing"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {hasDescription && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleDescription(comp.id)}
                                    title={
                                      expandedDescriptions[comp.id]
                                        ? "Hide description"
                                        : "View description"
                                    }
                                  >
                                    {expandedDescriptions[comp.id] ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveComp(comp.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {/* Description Row - Shows below the comp when expanded */}
                          {hasDescription && expandedDescriptions[comp.id] && (
                            <TableRow
                              key={`${comp.id}-desc`}
                              className="bg-muted/30"
                            >
                              <TableCell
                                colSpan={
                                  subjectProperty && subjectProperty.sqft > 0
                                    ? 15
                                    : 13
                                }
                              >
                                <div className="py-2 px-4">
                                  <div className="flex items-start gap-2">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                      Description:
                                    </div>
                                  </div>
                                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                    {comp.description}
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Message when subject property exists but no comps */}
              {subjectProperty &&
                subjectProperty.address &&
                comps.length === 0 && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                    <p className="text-sm text-blue-800">
                      <strong>Subject property loaded!</strong> Now add 3-5
                      comparable sales above to calculate ARV.
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      💡 Find similar sold properties on Zillow, copy the entire
                      listing page, and paste above.
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>
        </>
      )}

      {comps.length === 0 && !(subjectProperty && subjectProperty.address) && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calculator className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No comps added yet. Paste Zillow data above to get started.</p>
            <p className="text-sm mt-2">
              💡 Tip: Add 3-5 comparable sales for the most accurate ARV
              estimate.
            </p>
            <div className="mt-4 text-left max-w-md mx-auto bg-muted/30 p-4 rounded-lg">
              <h5 className="text-sm mb-2">How to use:</h5>
              <ol className="text-xs space-y-1 list-decimal list-inside">
                <li>
                  Find sold properties on Zillow similar to your subject
                  property
                </li>
                <li>Select all (Ctrl+A) on the Zillow listing page</li>
                <li>Copy (Ctrl+C) and paste into the text area above</li>
                <li>
                  Click "Parse & Add Comp" to extract the data automatically
                </li>
                <li>Repeat for 3-5 comparable properties</li>
                <li>ARV will calculate as the median of all comp prices</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interactive Map */}
      {(subjectProperty || comps.length > 0) && (
        <MapSection
          subjectProperty={
            subjectProperty
              ? {
                  id: "subject",
                  type: "subject",
                  address: subjectProperty.address,
                  price: subjectProperty.purchasePrice,
                  beds: subjectProperty.beds,
                  baths: subjectProperty.baths,
                  sqft: subjectProperty.sqft,
                  lat: subjectProperty.lat,
                  lng: subjectProperty.lng,
                }
              : undefined
          }
          comps={comps.map((comp) => ({
            id: comp.id,
            type: "comp",
            address: comp.address,
            price: comp.soldPrice,
            beds: comp.beds,
            baths: comp.baths,
            sqft: comp.sqft,
            soldDate: comp.soldDate,
            lat: comp.lat,
            lng: comp.lng,
          }))}
          hoveredCompId={hoveredCompId}
          onCompHover={onCompHover}
          onGeocodeComplete={(geocodedData) => {
            // Update comps with geocoded coordinates
            const updatedComps = comps.map((comp) => {
              const geocoded = geocodedData.get(comp.address);
              if (geocoded && !comp.lat) {
                return { ...comp, lat: geocoded.lat, lng: geocoded.lng };
              }
              return comp;
            });
            if (JSON.stringify(updatedComps) !== JSON.stringify(comps)) {
              onCompsChange(updatedComps);
            }

            // Update subject property if needed
            if (
              subjectProperty &&
              !subjectProperty.lat &&
              onSubjectPropertyChange
            ) {
              const geocoded = geocodedData.get(subjectProperty.address);
              if (geocoded) {
                onSubjectPropertyChange({
                  ...subjectProperty,
                  lat: geocoded.lat,
                  lng: geocoded.lng,
                });
              }
            }
          }}
        />
      )}

      {/* Photo Preview Dialog */}
      <Dialog open={photoPreviewOpen} onOpenChange={setPhotoPreviewOpen}>
        <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
            <DialogDescription>
              View and manage property photos. Click delete to remove a photo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {previewPhotos.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <ImageIcon className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>No photos to display</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8">
                {previewPhotos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <ImageWithFallback
                      src={photo.url}
                      alt="Property photo"
                      className="w-full max-h-[80vh] object-contain rounded-lg border-2 border-border bg-black/5"
                    />
                    {photo.isPrimary && (
                      <div className="absolute top-4 right-4 bg-yellow-500 text-white px-3 py-2 rounded text-sm">
                        Primary
                      </div>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
