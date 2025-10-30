import { GlobalAssumptions, Section8ZipData, UnitData } from '../types/deal';

/**
 * Extract zip code from address string
 * Looks for 5-digit zip code pattern
 */
export function extractZipCode(address: string): string | null {
  // Match 5-digit zip code (last 5 digits in address)
  const zipMatch = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return zipMatch ? zipMatch[1] : null;
}

/**
 * Get Section 8 rent for a specific bedroom count and zip code
 */
export function getSection8Rent(
  beds: number,
  zipCode: string,
  section8ZipData: Section8ZipData[]
): number | null {
  const zipData = section8ZipData.find(z => z.zipCode === zipCode);
  if (!zipData) return null;

  // Map bedroom count to rent key
  const bedKey = beds === 0 ? 'studio' : `${beds}bed` as keyof typeof zipData.rents;
  return zipData.rents[bedKey] || null;
}

/**
 * Auto-populate Section 8 rents for all units based on address zip code
 */
export function autoPopulateSection8Rents(
  address: string,
  unitDetails: UnitData[],
  globalAssumptions: GlobalAssumptions
): UnitData[] {
  const zipCode = extractZipCode(address);
  if (!zipCode) return unitDetails;

  return unitDetails.map(unit => {
    const section8Rent = getSection8Rent(unit.beds, zipCode, globalAssumptions.section8ZipData);
    if (section8Rent) {
      return { ...unit, section8Rent };
    }
    return unit;
  });
}

/**
 * Get bed count label for display
 */
export function getBedLabel(beds: number): string {
  if (beds === 0) return 'Studio';
  if (beds === 1) return '1 Bed';
  return `${beds} Bed`;
}
