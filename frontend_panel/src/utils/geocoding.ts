// Geocoding utility using Nominatim (OpenStreetMap) - 100% free, no API key required
// Rate limit: 1 request per second (per Nominatim usage policy)

interface GeocodeResult {
  lat: number;
  lng: number;
  success: boolean;
  error?: string;
}

// Simple cache to avoid repeated API calls and prevent loops
const geocodeCache = new Map<string, GeocodeResult>();

/**
 * Clear the geocoding cache
 * Useful when forcing fresh lookups
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
  console.log('🗑️ Geocode cache cleared');
}

/**
 * Geocode an address to lat/lng coordinates using Nominatim (OpenStreetMap)
 * 100% free with no API key required - respects 1 req/sec rate limit
 * Includes smart fallback strategies for better address matching
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  // Clean address - remove duplicate markers like "(2)", "(3)", etc.
  const cleanAddress = address.replace(/\s*\(\d+\)\s*$/, '').trim();
  
  // Check cache first to prevent duplicate requests and loops
  if (geocodeCache.has(cleanAddress)) {
    return geocodeCache.get(cleanAddress)!;
  }

  try {
    console.log(`🗺️ Geocoding with Nominatim: ${cleanAddress}`);
    
    // Try exact address first
    let response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanAddress)}&format=json&limit=1&addressdetails=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BrowardRealEstateAnalyzer/1.0' // Required by Nominatim usage policy
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    let data = await response.json();

    // Fallback strategy: If exact address fails, try simplified version (street + city)
    if (!data || data.length === 0) {
      console.log(`⚠️ Exact match failed, trying simplified address...`);
      
      // Extract street and city (e.g., "2610 NW 14th St, Fort Lauderdale, FL" becomes "NW 14th St, Fort Lauderdale, FL")
      const simplified = cleanAddress.replace(/^\d+\s+/, ''); // Remove house number
      
      if (simplified !== cleanAddress) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
        
        response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(simplified)}&format=json&limit=1&addressdetails=1`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'BrowardRealEstateAnalyzer/1.0'
            }
          }
        );
        
        if (response.ok) {
          data = await response.json();
          if (data && data.length > 0) {
            console.log(`✅ Simplified address matched: ${simplified}`);
          }
        }
      }
    }

    if (data && data.length > 0) {
      const result: GeocodeResult = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        success: true
      };
      
      // Cache the result to prevent duplicate requests
      geocodeCache.set(cleanAddress, result);
      
      return result;
    } else {
      const result: GeocodeResult = {
        lat: 0,
        lng: 0,
        success: false,
        error: 'Address not found - try entering without unit number or use nearby address'
      };
      // Cache failed results too to avoid retry loops
      geocodeCache.set(cleanAddress, result);
      return result;
    }
  } catch (error) {
    console.error('Nominatim geocoding error:', error);
    const result: GeocodeResult = {
      lat: 0,
      lng: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    // Cache errors to prevent retry loops
    geocodeCache.set(cleanAddress, result);
    return result;
  }
}

/**
 * Geocode multiple addresses with rate limiting (1 per second)
 * Required by Nominatim usage policy
 */
export async function geocodeAddresses(addresses: string[]): Promise<Map<string, GeocodeResult>> {
  const results = new Map<string, GeocodeResult>();
  
  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];
    
    // Check cache first
    if (geocodeCache.has(address)) {
      results.set(address, geocodeCache.get(address)!);
      continue;
    }
    
    // Geocode with rate limiting
    const result = await geocodeAddress(address);
    results.set(address, result);
    
    // Rate limit: wait 1 second between requests (except for last one)
    // This is required by Nominatim usage policy
    if (i < addresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}
