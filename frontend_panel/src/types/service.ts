// src/types/service.ts
import { GlobalAssumptions, SavedDeal } from "./deal";

// Define error response types
export interface ValidationError {
  type: string;
  value: string;
  msg: string;
  path: string;
  location: string;
}

export interface ErrorResponse {
  status: string;
  message: string;
  errors?: ValidationError[];
}

// Response types
export interface PaginatedResponse<T> {
  status: string;
  data: T[];
  pagination: {
    total_pages: number;
    current_page: number;
    total: number;
    limit: number;
    has_more: boolean;
  };
}

export interface DealResponse {
  status: string;
  data: SavedDeal;
  assumptions: GlobalAssumptions;
}

export interface AssumptionsResponse {
  status: string;
  data: GlobalAssumptions;
  message: string;
}

export interface Section8RentResponse {
  status: string;
  data: {
    zipCode: string;
    beds: number;
    section8Rent: number;
  };
  message: string;
}

export interface StatisticsResponse {
  status: string;
  data: {
    totalDeals: number;
    totalInvestment: number;
    rehabDeals: number;
    multiFamilyDeals: number;
    avgPrice: number;
    avgUnits: number;
  };
  message: string;
}

export interface BulkOperationResponse {
  status: string;
  data: any[];
  message: string;
  summary?: {
    totalImported?: number;
    failedImports?: number;
    importedEntries?: number;
    totalEntries?: number;
    zonesUpdated?: number[];
  };
}
