/**
 * Zillow Bulk Favorites Parser
 * Parses pasted Zillow favorites list and extracts property details
 */

export interface BulkProperty {
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  mlsId?: string;
}

export function parseZillowBulkFavorites(text: string): BulkProperty[] {
  const properties: BulkProperty[] = [];

  // Clean up the text first - remove extra whitespace
  const cleanedText = text.trim();

  // Split by "Compare" but be more careful about empty chunks
  const chunks = cleanedText.split(/Compare\s*\n/);

  for (const chunk of chunks) {
    const trimmedChunk = chunk.trim();
    if (!trimmedChunk) continue;

    try {
      const property = parsePropertyChunk(trimmedChunk);
      if (property && property.address && property.price > 0) {
        properties.push(property);
      }
    } catch (e) {
      console.warn("Failed to parse chunk:", trimmedChunk, e);
    }
  }

  return properties;
}

function parsePropertyChunk(chunk: string): BulkProperty | null {
  const lines = chunk
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l);

  let price: number | null = null;
  let beds: number | null = null;
  let baths: number | null = null;
  let sqft: number | null = null;
  let address: string | null = null;
  let mlsId: string | null = null;

  for (const line of lines) {
    // Price: $325,000
    if (line.startsWith("$") && !line.includes("bd") && !line.includes("ba")) {
      const priceMatch = line.match(/\$?([\d,]+)/);
      if (priceMatch) {
        price = parseInt(priceMatch[1].replace(/,/g, ""));
      }
    }

    // Beds/Baths/Sqft: "3 bds2 ba1,354 sqft" or "3 bds 2 ba 1,354 sqft"
    if (line.includes("bd") && line.includes("ba") && line.includes("sqft")) {
      // Extract beds
      const bedsMatch = line.match(/(\d+)\s*bds?/i);
      if (bedsMatch) {
        beds = parseInt(bedsMatch[1]);
      }

      // Extract baths
      const bathsMatch = line.match(/(\d+(?:\.\d+)?)\s*ba/i);
      if (bathsMatch) {
        baths = parseFloat(bathsMatch[1]);
      }

      // Extract sqft
      const sqftMatch = line.match(/([\d,]+)\s*sqft/i);
      if (sqftMatch) {
        sqft = parseInt(sqftMatch[1].replace(/,/g, ""));
      }
    }

    // Address: Full street address with city, state, zip
    // Pattern: "75 NW 83rd St, Miami, FL 33150"
    if (line.match(/\d+\s+[^,]+,\s*[^,]+,\s*FL\s+\d{5}/)) {
      address = line;
    }

    // MLS ID: "MLS ID #A11903191"
    if (line.includes("MLS ID")) {
      const mlsMatch = line.match(/MLS ID #?([A-Z0-9]+)/i);
      if (mlsMatch) {
        mlsId = mlsMatch[1];
      }
    }
  }

  // Validate required fields
  if (!address || !price) {
    return null;
  }

  // Return property with defaults for missing values
  return {
    address,
    price,
    beds: beds || 0,
    baths: baths || 0,
    sqft: sqft || 0,
    mlsId: mlsId || undefined,
  };
}

/**
 * Preview function to show what will be parsed
 */
export function previewBulkParse(text: string): {
  success: number;
  failed: number;
  properties: BulkProperty[];
} {
  const properties = parseZillowBulkFavorites(text);

  return {
    success: properties.length,
    failed: 0, // Could enhance to track failed chunks
    properties,
  };
}

/**
 * Validate a single property has minimum required data
 */
export function validateBulkProperty(property: BulkProperty): boolean {
  return !!(property.address && property.price > 0);
}
