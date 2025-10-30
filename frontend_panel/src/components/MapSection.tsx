import { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Button } from "./ui/button";
import { MapPin, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { geocodeAddress, clearGeocodeCache } from "../utils/geocoding";

// Import Leaflet dynamically to avoid SSR issues
import L from "leaflet";

// Load Leaflet CSS from CDN to avoid build errors with image imports
if (
  typeof document !== "undefined" &&
  !document.getElementById("leaflet-css")
) {
  const link = document.createElement("link");
  link.id = "leaflet-css";
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
  link.crossOrigin = "";
  document.head.appendChild(link);
}

// Fix for default marker icons in Leaflet - use CDN URLs instead of importing PNGs
const iconRetinaUrl =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const shadowUrl =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

// Fix Leaflet default icon issue
const defaultIcon = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

export interface MapProperty {
  id: string;
  type: "subject" | "comp";
  address: string;
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  soldDate?: string;
  yearBuilt?: number;
  lat?: number;
  lng?: number;
}

interface MapSectionProps {
  subjectProperty?: MapProperty;
  comps: MapProperty[];
  onGeocodeComplete?: (
    properties: Map<string, { lat: number; lng: number }>
  ) => void;
  hoveredCompId?: string | null; // Comp ID being hovered in table
  onCompHover?: (compId: string | null) => void; // Called when hovering map marker
}

export function MapSection({
  subjectProperty,
  comps,
  onGeocodeComplete,
  hoveredCompId,
  onCompHover,
}: MapSectionProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodedProperties, setGeocodedProperties] = useState<
    Map<string, { lat: number; lng: number }>
  >(new Map());
  const [mapReady, setMapReady] = useState(false);
  const markersRef = useRef<L.Marker[]>([]);

  // Track previous values to prevent unnecessary marker recreation
  const prevDataRef = useRef<string>("");

  // Clean address by removing duplicate markers like "(2)", "(3)", etc.
  const cleanAddress = (address: string): string => {
    return address.replace(/\s*\(\d+\)\s*$/, "").trim();
  };

  // Get geocoded coordinates for an address (checks both original and cleaned address)
  const getGeocodedCoords = (
    address: string
  ): { lat: number; lng: number } | undefined => {
    return (
      geocodedProperties.get(address) ||
      geocodedProperties.get(cleanAddress(address))
    );
  };

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

  // Format comparison difference with color coding
  const formatDifference = (
    compValue: number | undefined,
    subjectValue: number | undefined,
    formatter: (val: number) => string,
    higherIsBetter: boolean = true
  ): string => {
    if (compValue === undefined || subjectValue === undefined) return "";

    const diff = compValue - subjectValue;
    if (diff === 0) return "";

    const isPositive = diff > 0;
    const color = isPositive === higherIsBetter ? "#16a34a" : "#dc2626"; // green or red
    const sign = isPositive ? "+" : "";

    return `<span style="color: ${color}; font-weight: 600;">(${sign}${formatter(
      diff
    )})</span>`;
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map centered on Broward County, FL
    const map = L.map(mapContainerRef.current).setView([26.1224, -80.1373], 11);

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Geocode addresses that don't have coordinates
  const handleGeocode = async (forceRefresh = false) => {
    setIsGeocoding(true);

    // Clear cache if this is a forced refresh
    if (forceRefresh) {
      clearGeocodeCache();
      setGeocodedProperties(new Map()); // Also clear local state
      toast.info("Cache cleared, fetching fresh coordinates...");
    }

    const newGeocodedProperties = forceRefresh
      ? new Map()
      : new Map(geocodedProperties);
    let geocodedCount = 0;

    try {
      // Collect addresses that need geocoding
      const addressesToGeocode: MapProperty[] = [];

      if (subjectProperty && !subjectProperty.lat) {
        const cleaned = cleanAddress(subjectProperty.address);
        if (
          !newGeocodedProperties.has(subjectProperty.address) &&
          !newGeocodedProperties.has(cleaned)
        ) {
          addressesToGeocode.push(subjectProperty);
        }
      }

      for (const comp of comps) {
        if (!comp.lat) {
          const cleaned = cleanAddress(comp.address);
          if (
            !newGeocodedProperties.has(comp.address) &&
            !newGeocodedProperties.has(cleaned)
          ) {
            addressesToGeocode.push(comp);
          }
        }
      }

      if (addressesToGeocode.length === 0) {
        toast.info("All addresses already have coordinates");
        setIsGeocoding(false);
        return;
      }

      toast.info(
        `Geocoding ${addressesToGeocode.length} address${
          addressesToGeocode.length > 1 ? "es" : ""
        }...`,
        {
          description: "This may take a few seconds (rate limited to 1/sec)",
        }
      );

      // Geocode each address with rate limiting
      const failedAddresses: string[] = [];
      for (let i = 0; i < addressesToGeocode.length; i++) {
        const property = addressesToGeocode[i];
        const result = await geocodeAddress(property.address);

        if (result.success) {
          // Store with both original and cleaned address to ensure lookup works
          const cleaned = cleanAddress(property.address);
          newGeocodedProperties.set(property.address, {
            lat: result.lat,
            lng: result.lng,
          });
          if (cleaned !== property.address) {
            newGeocodedProperties.set(cleaned, {
              lat: result.lat,
              lng: result.lng,
            });
          }
          geocodedCount++;
        } else {
          console.warn(
            `Failed to geocode: ${property.address} (${i + 1})`,
            result.error
          );
          failedAddresses.push(property.address);
        }

        // Rate limit: 1 request per second
        if (i < addressesToGeocode.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      setGeocodedProperties(newGeocodedProperties);

      if (onGeocodeComplete) {
        onGeocodeComplete(newGeocodedProperties);
      }

      // Show results
      if (geocodedCount > 0 && failedAddresses.length === 0) {
        toast.success(
          `Successfully geocoded ${geocodedCount} address${
            geocodedCount > 1 ? "es" : ""
          }`
        );
      } else if (geocodedCount > 0 && failedAddresses.length > 0) {
        toast.warning(
          `Geocoded ${geocodedCount} of ${addressesToGeocode.length} addresses`,
          {
            description: `Could not locate: ${failedAddresses.join(
              ", "
            )}. Try entering nearby address or use manual coordinates.`,
          }
        );
      } else {
        toast.error("Failed to geocode any addresses", {
          description:
            "The free geocoding service could not find these addresses. Try simplifying the address (remove unit #) or use a nearby address.",
        });
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast.error("Error geocoding addresses");
    } finally {
      setIsGeocoding(false);
    }
  };

  // Update markers when properties or geocoding changes
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    // Create a fingerprint of current data
    const currentData = JSON.stringify({
      subject: subjectProperty
        ? {
            address: subjectProperty.address,
            lat: subjectProperty.lat,
            lng: subjectProperty.lng,
            price: subjectProperty.price,
            beds: subjectProperty.beds,
            baths: subjectProperty.baths,
            sqft: subjectProperty.sqft,
            yearBuilt: subjectProperty.yearBuilt,
          }
        : null,
      comps: comps.map((c) => ({
        id: c.id,
        address: c.address,
        lat: c.lat,
        lng: c.lng,
        price: c.price,
        beds: c.beds,
        baths: c.baths,
        sqft: c.sqft,
        soldDate: c.soldDate,
        yearBuilt: c.yearBuilt,
      })),
      geocoded: Array.from(geocodedProperties.entries()),
    });

    // Skip if data hasn't changed
    if (currentData === prevDataRef.current) {
      return;
    }

    // Update the ref with current data
    prevDataRef.current = currentData;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds: L.LatLngBounds = L.latLngBounds([]);
    let hasMarkers = false;

    // DEBUG: Log all properties and their coordinates (only on actual marker creation)
    console.log("=== MAP DEBUG ===");
    console.log("Subject Property:", subjectProperty);
    console.log("Comps:", comps);
    console.log(
      "Geocoded Properties:",
      Array.from(geocodedProperties.entries())
    );

    // Add subject property marker (blue)
    if (subjectProperty) {
      const lat =
        subjectProperty.lat ?? getGeocodedCoords(subjectProperty.address)?.lat;
      const lng =
        subjectProperty.lng ?? getGeocodedCoords(subjectProperty.address)?.lng;

      console.log(
        `Subject: "${subjectProperty.address}" -> lat: ${lat}, lng: ${lng}`
      );

      if (lat && lng) {
        const subjectIcon = L.divIcon({
          html: `<div style="background-color: #2563eb; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  </svg>
                </div>`,
          className: "",
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const marker = L.marker([lat, lng], { icon: subjectIcon })
          .bindPopup(
            `
            <div style="min-width: 220px;">
              <div style="font-weight: 600; color: #2563eb; margin-bottom: 8px; font-size: 14px;">
                📍 SUBJECT PROPERTY
              </div>
              <div style="margin-bottom: 8px; font-size: 12px; color: #64748b;">${
                subjectProperty.address
              }</div>
              <div style="border-top: 1px solid #e2e8f0; padding-top: 8px;">
                <div style="margin-bottom: 4px; font-size: 13px;"><strong>Purchase Price:</strong> ${
                  subjectProperty.price?.toLocaleString() || "N/A"
                }</div>
                <div style="margin-bottom: 4px; font-size: 13px;"><strong>Beds:</strong> ${
                  subjectProperty.beds || "N/A"
                }</div>
                <div style="margin-bottom: 4px; font-size: 13px;"><strong>Baths:</strong> ${
                  subjectProperty.baths || "N/A"
                }</div>
                <div style="margin-bottom: 4px; font-size: 13px;"><strong>Sqft:</strong> ${
                  subjectProperty.sqft?.toLocaleString() || "N/A"
                }</div>
                ${
                  subjectProperty.yearBuilt
                    ? `<div style="font-size: 13px;"><strong>Year Built:</strong> ${subjectProperty.yearBuilt}</div>`
                    : ""
                }
              </div>
            </div>
          `
          )
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
        bounds.extend([lat, lng]);
        hasMarkers = true;
      }
    }

    // Add comp markers (red) with offset detection for overlapping coordinates
    // First, group comps by location to detect overlaps
    const locationGroups = new Map<
      string,
      { comps: typeof comps; coords: { lat: number; lng: number } }
    >();

    comps.forEach((comp) => {
      const lat = comp.lat ?? getGeocodedCoords(comp.address)?.lat;
      const lng = comp.lng ?? getGeocodedCoords(comp.address)?.lng;

      if (lat && lng) {
        const key = `${lat.toFixed(7)},${lng.toFixed(7)}`;
        if (!locationGroups.has(key)) {
          locationGroups.set(key, { comps: [], coords: { lat, lng } });
        }
        locationGroups.get(key)!.comps.push(comp);
      }
    });

    // Now render markers with offsets for overlapping locations
    locationGroups.forEach(({ comps: groupedComps, coords }) => {
      groupedComps.forEach((comp, offsetIndex) => {
        const index = comps.indexOf(comp);
        console.log(
          `Comp ${index + 1}: "${comp.address}" -> lat: ${coords.lat}, lng: ${
            coords.lng
          }${
            groupedComps.length > 1
              ? ` (offset ${offsetIndex + 1}/${groupedComps.length})`
              : ""
          }`
        );

        // Apply small circular offset if multiple markers at same location
        let offsetLat = coords.lat;
        let offsetLng = coords.lng;

        if (groupedComps.length > 1) {
          // Offset distance in degrees (about 5-10 meters)
          const offsetDistance = 0.00008;
          const angle = (offsetIndex / groupedComps.length) * 2 * Math.PI;
          offsetLat += offsetDistance * Math.cos(angle);
          offsetLng += offsetDistance * Math.sin(angle);
        }

        const compIcon = L.divIcon({
          html: `<div style="background-color: #dc2626; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">
                  ${index + 1}
                </div>`,
          className: "",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        // Calculate distance from subject property
        let distanceText = "";
        if (subjectProperty) {
          const subjectLat =
            subjectProperty.lat ??
            getGeocodedCoords(subjectProperty.address)?.lat;
          const subjectLng =
            subjectProperty.lng ??
            getGeocodedCoords(subjectProperty.address)?.lng;

          if (subjectLat && subjectLng) {
            const distance = calculateDistance(
              subjectLat,
              subjectLng,
              coords.lat,
              coords.lng
            );
            distanceText = `<div style="margin-bottom: 8px; padding: 6px; background: #f0f9ff; border-left: 3px solid #0ea5e9; font-size: 12px;">
              <strong>📍 Distance:</strong> ${
                distance < 0.1
                  ? `${Math.round(distance * 5280)} ft`
                  : `${distance.toFixed(2)} mi`
              } from subject
            </div>`;
          }
        }

        // Generate comparison differences
        const priceDiff = formatDifference(
          comp.price,
          subjectProperty?.price,
          (val) => `${Math.abs(val).toLocaleString()}`,
          true
        );

        const bedsDiff = formatDifference(
          comp.beds,
          subjectProperty?.beds,
          (val) => `${Math.abs(val)} bed${Math.abs(val) !== 1 ? "s" : ""}`,
          true
        );

        const bathsDiff = formatDifference(
          comp.baths,
          subjectProperty?.baths,
          (val) => `${Math.abs(val)} bath${Math.abs(val) !== 1 ? "s" : ""}`,
          true
        );

        const sqftDiff = formatDifference(
          comp.sqft,
          subjectProperty?.sqft,
          (val) => `${Math.abs(val).toLocaleString()} sqft`,
          true
        );

        const yearDiff = formatDifference(
          comp.yearBuilt,
          subjectProperty?.yearBuilt,
          (val) => `${Math.abs(val)} yr${Math.abs(val) !== 1 ? "s" : ""}`,
          false // older is worse
        );

        const marker = L.marker([offsetLat, offsetLng], { icon: compIcon })
          .bindPopup(
            `
            <div style="min-width: 220px;">
              <div style="font-weight: 600; color: #dc2626; margin-bottom: 8px; font-size: 14px;">
                Comp #${index + 1}
              </div>
              <div style="margin-bottom: 8px; font-size: 12px; color: #64748b;">${
                comp.address
              }</div>
              ${distanceText}
              <div style="border-top: 1px solid #e2e8f0; padding-top: 8px;">
                <div style="margin-bottom: 4px; font-size: 13px;">
                  <strong>Sold Price:</strong> ${
                    comp.price?.toLocaleString() || "N/A"
                  } ${priceDiff}
                </div>
                ${
                  comp.soldDate
                    ? `<div style="margin-bottom: 4px; font-size: 13px;"><strong>Sale Date:</strong> ${comp.soldDate}</div>`
                    : ""
                }
                <div style="margin-bottom: 4px; font-size: 13px;">
                  <strong>Beds:</strong> ${comp.beds ?? "N/A"} ${bedsDiff}
                </div>
                <div style="margin-bottom: 4px; font-size: 13px;">
                  <strong>Baths:</strong> ${comp.baths ?? "N/A"} ${bathsDiff}
                </div>
                <div style="margin-bottom: 4px; font-size: 13px;">
                  <strong>Sqft:</strong> ${
                    comp.sqft?.toLocaleString() || "N/A"
                  } ${sqftDiff}
                </div>
                ${
                  comp.yearBuilt || subjectProperty?.yearBuilt
                    ? `<div style="margin-bottom: 4px; font-size: 13px;">
                  <strong>Year Built:</strong> ${
                    comp.yearBuilt ?? "N/A"
                  } ${yearDiff}
                </div>`
                    : ""
                }
              </div>
              ${
                groupedComps.length > 1
                  ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #dc2626; font-style: italic;">⚠️ Marker offset applied (${groupedComps.length} comps at this location)</div>`
                  : ""
              }
            </div>
          `
          )
          .addTo(mapRef.current!);

        // Add hover event listeners for map marker hover
        marker.on("mouseover", () => {
          if (onCompHover) {
            onCompHover(comp.id);
          }
        });

        marker.on("mouseout", () => {
          if (onCompHover) {
            onCompHover(null);
          }
        });

        // Store comp ID in marker for later access
        (marker as any)._compId = comp.id;

        markersRef.current.push(marker);
        bounds.extend([offsetLat, offsetLng]);
        hasMarkers = true;
      });
    });

    // Fit bounds to show all markers
    if (hasMarkers && bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }

    console.log(`=== MARKERS CREATED: ${markersRef.current.length} ===`);
    console.log("================");
  }, [subjectProperty, comps, geocodedProperties, mapReady]); // Deps trigger check, but ref prevents recreation

  // Check if we need geocoding
  const needsGeocoding = () => {
    if (
      subjectProperty &&
      !subjectProperty.lat &&
      !getGeocodedCoords(subjectProperty.address)
    ) {
      return true;
    }
    return comps.some((comp) => !comp.lat && !getGeocodedCoords(comp.address));
  };

  // Count properties with coordinates
  const propertiesWithCoords = () => {
    let count = 0;
    if (
      subjectProperty &&
      (subjectProperty.lat || getGeocodedCoords(subjectProperty.address))
    ) {
      count++;
    }
    count += comps.filter(
      (comp) => comp.lat || getGeocodedCoords(comp.address)
    ).length;
    return count;
  };

  const totalProperties = (subjectProperty ? 1 : 0) + comps.length;
  const coordCount = propertiesWithCoords();

  // Effect: Animate marker when table row is hovered
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    // Find the marker for the hovered comp
    markersRef.current.forEach((marker) => {
      const compId = (marker as any)._compId;
      const markerElement = marker.getElement();

      if (markerElement) {
        if (compId === hoveredCompId && hoveredCompId !== null) {
          // Apply hover animation to marker WITHOUT transform (which causes position issues)
          markerElement.style.transition =
            "filter 0.2s ease, box-shadow 0.2s ease";
          markerElement.style.zIndex = "1000";
          markerElement.style.filter =
            "brightness(1.2) drop-shadow(0 6px 12px rgba(220, 38, 38, 0.6))";

          // Add ring effect to the inner div
          const innerDiv = markerElement.querySelector("div") as HTMLElement;
          if (innerDiv) {
            innerDiv.style.boxShadow =
              "0 0 0 4px rgba(220, 38, 38, 0.3), 0 4px 12px rgba(0,0,0,0.4)";
          }
        } else {
          // Remove hover animation
          markerElement.style.zIndex = "";
          markerElement.style.filter = "";

          // Remove ring effect
          const innerDiv = markerElement.querySelector("div") as HTMLElement;
          if (innerDiv) {
            innerDiv.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
          }
        }
      }
    });
  }, [hoveredCompId, mapReady]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Property Location Map
            </CardTitle>
            <CardDescription>
              Visual comparison of subject property and comparable sales
              {coordCount > 0 &&
                ` • Showing ${coordCount} of ${totalProperties} ${
                  totalProperties === 1 ? "property" : "properties"
                }`}
            </CardDescription>
          </div>
          {totalProperties > 0 && (
            <Button
              onClick={() => handleGeocode(!needsGeocoding())}
              disabled={isGeocoding}
              variant={needsGeocoding() ? "default" : "outline"}
              size="sm"
            >
              {isGeocoding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Geocoding Addresses...
                </>
              ) : needsGeocoding() ? (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  Load Map & Calculate Distances
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-Geocode & Update Map
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {totalProperties === 0 ? (
          <div className="flex items-center justify-center h-[400px] bg-muted/30 rounded-lg border-2 border-dashed">
            <div className="text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">
                Add subject property and comps to see them on the map
              </p>
            </div>
          </div>
        ) : coordCount === 0 ? (
          <div className="flex items-center justify-center h-[400px] bg-muted/30 rounded-lg border-2 border-dashed">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="mb-4 text-muted-foreground">
                Click "Load Map Locations" to geocode addresses
              </p>
              <Button
                onClick={() => handleGeocode(false)}
                disabled={isGeocoding}
              >
                {isGeocoding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Geocoding...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Load Map Locations
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <div
                ref={mapContainerRef}
                className="h-[500px] w-full rounded-lg border overflow-hidden"
                style={{ zIndex: 0 }}
              />
              {isGeocoding && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-50">
                  <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <div className="space-y-2">
                      <p className="font-semibold">Geocoding addresses...</p>
                      <p className="text-sm text-muted-foreground">
                        Loading property locations on map
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow"></div>
                  <span>Subject Property</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow"></div>
                  <span>
                    Comparable Sales (
                    {
                      comps.filter(
                        (c) => c.lat || geocodedProperties.has(c.address)
                      ).length
                    }
                    )
                  </span>
                </div>
              </div>
              {(() => {
                // Check for overlapping markers
                const coordsMap = new Map<string, string[]>();
                comps.forEach((comp) => {
                  const lat =
                    comp.lat ?? geocodedProperties.get(comp.address)?.lat;
                  const lng =
                    comp.lng ?? geocodedProperties.get(comp.address)?.lng;
                  if (lat && lng) {
                    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
                    if (!coordsMap.has(key)) coordsMap.set(key, []);
                    coordsMap.get(key)!.push(comp.address);
                  }
                });
                const overlapping = Array.from(coordsMap.entries()).filter(
                  ([_, addrs]) => addrs.length > 1
                );

                if (overlapping.length > 0) {
                  return (
                    <div className="text-sm bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-600">ℹ️</span>
                        <div className="flex-1">
                          <span className="font-semibold text-blue-800">
                            Overlapping Locations Detected:
                          </span>
                          <span className="text-blue-700 ml-1">
                            {overlapping
                              .map(([_, addrs]) => addrs.length)
                              .reduce((a, b) => a + b, 0)}{" "}
                            comps share geocoded locations. Markers have been
                            offset slightly for visibility. This is normal for
                            properties on the same street.
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
