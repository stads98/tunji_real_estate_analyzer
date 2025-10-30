import { SubjectProperty } from '../components/ARVCalculator';

export const parseZillowForSale = (rawData: string): Partial<SubjectProperty> | null => {
  try {
    const property: Partial<SubjectProperty> = {};

    // Detect if this is an off-market property
    const isOffMarket = /Off market/i.test(rawData);
    if (isOffMarket) {
      property.isOffMarket = true;
      console.log('Zillow Parser - Detected OFF MARKET property');
    }

    // Extract address
    const addressMatch = rawData.match(/(\d+(?:-\d+)?\s+[NSEW]?[WE]?\s+\d+(?:st|nd|rd|th)\s+(?:St|Ave|Rd|Dr|Ct|Ln|Way|Blvd|Pl|Ter)[^,]*,\s*[^,]+,\s*FL\s+\d{5})/i);
    if (addressMatch) {
      property.address = addressMatch[1].trim();
    }

    // Extract asking price - handle multiple formats with better newline support
    // For OFF-MARKET properties, use Zestimate as purchase price (extracted later)
    // For ON-MARKET properties: "For sale $549,000" or "For sale\n$549,000" or "$549,000" standalone
    if (!isOffMarket) {
      let priceMatch = rawData.match(/For sale[\s\r\n]+\$?([\d,]+)/i);
      if (!priceMatch) {
        // Try without "For sale" but with $ at start of line
        priceMatch = rawData.match(/^\s*\$([\d,]+)/m);
      }
      if (!priceMatch) {
        // Last resort: find first big number with $ in first 500 chars
        const firstPart = rawData.substring(0, 500);
        const matches = firstPart.match(/\$([\d,]+)/g);
        if (matches && matches.length > 0) {
          // Get the first match that looks like a realistic price (> $50k)
          for (const match of matches) {
            const value = parseInt(match.replace(/[$,]/g, ''));
            if (value >= 50000 && value <= 10000000) {
              priceMatch = [match, value.toString()];
              break;
            }
          }
        }
      }
      if (priceMatch) {
        const priceValue = parseInt(priceMatch[1].replace(/,/g, ''));
        console.log('Zillow Parser - Price match:', priceMatch[1], '→', priceValue);
        // Only accept realistic property prices
        if (priceValue >= 10000 && priceValue <= 50000000) {
          property.purchasePrice = priceValue;
        } else {
          console.warn('Zillow Parser - Price out of range:', priceValue);
        }
      } else {
        console.warn('Zillow Parser - No price match found');
      }
    } else {
      console.log('Zillow Parser - Off-market property, will use Zestimate as purchase price');
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
    const livableAreaMatch = rawData.match(/Total interior livable area:\s*([\d,]+)\s*sqft/i);
    const sqftMatch = rawData.match(/([\d,]+)\s*sqft/i);
    if (livableAreaMatch) {
      property.sqft = parseInt(livableAreaMatch[1].replace(/,/g, ''));
    } else if (sqftMatch) {
      property.sqft = parseInt(sqftMatch[1].replace(/,/g, ''));
    }

    // Extract year built
    const yearMatch = rawData.match(/(?:Built in|Year built:?)\s*(\d{4})/i);
    if (yearMatch) {
      property.yearBuilt = parseInt(yearMatch[1]);
    }

    // Extract property type and determine units
    let typeMatch = rawData.match(/Property subtype:\s*([^\n]+)/i);
    if (!typeMatch) {
      typeMatch = rawData.match(/Home type:\s*([^\n]+)/i);
    }
    if (!typeMatch) {
      typeMatch = rawData.match(/\b(Duplex|Triplex|Quadplex|Single Family|MultiFamily|Multi Family|Condo|Townhouse)\b/i);
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
        property.units = unitsMatch ? parseInt(unitsMatch[1]) : 2;
      } else {
        property.units = 1;
      }
    }

    // Extract Zestimate - handle multiple formats and filter unrealistic values
    // Match "Zestimate" followed by optional ® and price, or price followed by "Zestimate"
    let zestimateMatch = rawData.match(/Zestimate[^\d]*\$?([\d,]+)/i);
    if (!zestimateMatch) {
      zestimateMatch = rawData.match(/\$([\d,]+)[^\d]*Zestimate/i);
    }
    if (zestimateMatch) {
      const zestValue = parseInt(zestimateMatch[1].replace(/,/g, ''));
      console.log('Zillow Parser - Zestimate match:', zestimateMatch[1], '→', zestValue);
      // Only accept realistic property values (above $10,000)
      if (zestValue >= 10000) {
        property.zestimate = zestValue;
        // For off-market properties, use Zestimate as purchase price
        if (isOffMarket && !property.purchasePrice) {
          property.purchasePrice = zestValue;
          console.log('Zillow Parser - Using Zestimate as purchase price for off-market property:', zestValue);
        }
      } else {
        console.warn('Zillow Parser - Zestimate too low:', zestValue);
      }
    } else {
      console.warn('Zillow Parser - No Zestimate found');
    }

    // Extract Rent Zestimate - multiple formats and filter unrealistic values
    // "Rent Zestimate: $3,729/mo" or "Est.: $3,655/mo"
    let rentEstMatch = rawData.match(/(?:Rent Zestimate|Est\.)[^\d]*\$?([\d,]+)\s*\/\s*mo/i);
    if (!rentEstMatch) {
      // Just look for $/mo pattern
      rentEstMatch = rawData.match(/\$([\d,]+)\s*\/\s*mo/);
    }
    if (rentEstMatch) {
      const rentValue = parseInt(rentEstMatch[1].replace(/,/g, ''));
      // Only accept realistic rent values (above $500)
      if (rentValue >= 500) {
        property.rentZestimate = rentValue;
      }
    } else if (rawData.match(/Rent Zestimate[^\n]*Not available/i)) {
      property.rentZestimate = 0;
    }

    // Extract description - comes after "What's special" section
    // Look for a paragraph of text that appears to be the main property description
    // It typically comes after the feature list and before administrative text
    // Handle both formats: with blank line separator OR features run together
    let descMatch = rawData.match(/What's special\s*\n.*?\n\s*\n([A-Z][\s\S]*?)(?:\n\s*\nHide|\n\s*\n\d+\s+days\s+on\s+Zillow|Zillow last checked|Listing updated)/i);
    
    if (!descMatch) {
      // Try alternative format where features and description run together
      // Extract everything between "What's special" and terminating keywords using [\s\S] to match all characters including newlines
      const whatSpecialMatch = rawData.match(/What's special\s*\n([\s\S]*?)(?:\nHide|\n\d+\s+days\s+on\s+Zillow|\nZillow last checked|\nListing updated)/i);
      if (whatSpecialMatch) {
        console.log('Zillow Parser - Found What\'s special section, length:', whatSpecialMatch[1].length);
        const content = whatSpecialMatch[1].trim();
        console.log('Zillow Parser - Content preview:', content.substring(0, 200));
        
        // Look for complete sentences (multiple sentences ending with . or !)
        // Match text that has at least 2 sentences with proper spacing
        const sentencesMatch = content.match(/([A-Z][^.!?]*[.!?](?:\s+[A-Z][^.!?]*[.!?])+)/);
        if (sentencesMatch) {
          console.log('Zillow Parser - Found multi-sentence description:', sentencesMatch[1].substring(0, 100));
          descMatch = [sentencesMatch[0], sentencesMatch[1]];
        } else {
          // Fallback: look for any substantial sentence with proper word spacing
          const singleSentenceMatch = content.match(/([A-Z][a-z]+\s+[^!.]*[!.])/);
          if (singleSentenceMatch && singleSentenceMatch[1].length > 100) {
            console.log('Zillow Parser - Found single sentence description:', singleSentenceMatch[1].substring(0, 100));
            descMatch = [singleSentenceMatch[0], singleSentenceMatch[1]];
          } else {
            console.log('Zillow Parser - No description pattern matched in What\'s special section');
          }
        }
      } else {
        console.log('Zillow Parser - What\'s special section not found');
      }
    } else {
      console.log('Zillow Parser - Found description with blank line format');
    }
    
    if (descMatch) {
      // Extract just the first substantial paragraph (before any double newline or administrative text)
      let desc = descMatch[1];
      console.log('Zillow Parser - Raw descMatch[1] length:', desc ? desc.length : 0, 'Preview:', desc ? desc.substring(0, 150) : 'EMPTY');
      // If there are multiple paragraphs, take all of them up to reasonable limit
      const paragraphs = desc.split(/\n\s*\n/);
      const mainDesc = paragraphs[0];
      console.log('Zillow Parser - mainDesc length:', mainDesc ? mainDesc.length : 0, 'Preview:', mainDesc ? mainDesc.substring(0, 150) : 'EMPTY');
      if (mainDesc && mainDesc.length > 50) {
        desc = mainDesc
          .trim()
          .replace(/\s+/g, ' ') // Replace multiple spaces/newlines with single space
          .replace(/\n/g, ' ')  // Replace newlines with spaces
          .substring(0, 1000);  // Limit to 1000 chars for full description
        property.description = desc;
        console.log('Zillow Parser - ✓ Description extracted, length:', desc.length, 'Preview:', desc.substring(0, 100));
      } else {
        console.log('Zillow Parser - ✗ Description rejected - too short:', mainDesc ? mainDesc.length : 0, 'chars (need >50)');
      }
    } else {
      console.log('Zillow Parser - No description found');
    }

    return property;
  } catch (error) {
    console.error('Error parsing Zillow data:', error);
    return null;
  }
};
