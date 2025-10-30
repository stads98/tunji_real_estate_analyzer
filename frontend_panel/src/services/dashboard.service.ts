// src/services/dashboard.service.ts
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import {
  DealInputs,
  Section8ZipData,
  GlobalAssumptions,
  SavedDeal,
} from "../types/deal";
import {
  AssumptionsResponse,
  BulkOperationResponse,
  DealResponse,
  ErrorResponse,
  PaginatedResponse,
  Section8RentResponse,
  StatisticsResponse,
} from "../types/service";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

class DashboardService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Error handler
  private handleError(error: AxiosError<ErrorResponse>): never {
    console.error("API Error:", error);

    const response = error.response?.data;

    if (response?.errors && Array.isArray(response.errors)) {
      // Validation errors - combine all error messages
      const errorMessages = response.errors.map((err) => err.msg).join(", ");
      const finalMessage =
        errorMessages || response.message || "Validation failed";
      toast.error(finalMessage);
      throw new Error(finalMessage);
    }

    if (response?.message) {
      toast.error(response.message);
      throw new Error(response.message);
    }

    if (error.code === "NETWORK_ERROR" || error.code === "ECONNREFUSED") {
      const message =
        "Unable to connect to server. Please check your connection.";
      toast.error(message);
      throw new Error(message);
    }

    const message = error.message || "An unexpected error occurred";
    toast.error(message);
    throw new Error(message);
  }

  // ========== DEAL ENDPOINTS ==========

  // Get all deals with pagination and filtering
  async getDeals(
    params: {
      page?: number;
      limit?: number;
      search?: string;
      minPrice?: number;
      maxPrice?: number;
      minUnits?: number;
      maxUnits?: number;
      isRehab?: boolean;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ): Promise<PaginatedResponse<SavedDeal>> {
    try {
      const response = await this.api.get("/api/deals", { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Get single deal by ID
  async getDeal(id: string): Promise<DealResponse> {
    try {
      const response = await this.api.get(`/api/deals/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Create new deal
  async createDeal(
    dealData: DealInputs
  ): Promise<{ status: string; data: SavedDeal; message: string }> {
    try {
      const response = await this.api.post("/api/deals", dealData);
      toast.success(response.data.message || "Deal created successfully");
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // ========== UPLOAD ENDPOINTS ==========
  // Upload single file to VPS
  async uploadFile(file: File): Promise<{
    fileUrl: string;
    fileName: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
  }> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await this.api.post("/api/upload/file", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000, // 30 seconds for file uploads
      });

      // ✅ Use relative URL as returned by backend
      return response.data.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Upload multiple files to VPS
  async uploadMultipleFiles(files: File[]): Promise<
    Array<{
      fileUrl: string;
      fileName: string;
      originalName: string;
      fileSize: number;
      mimeType: string;
    }>
  > {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await this.api.post("/api/upload/files", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 60000, // 60 seconds for multiple files
      });

      // ✅ Use relative URLs as returned by backend
      return response.data.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Delete file from VPS
  async deleteFile(fileName: string): Promise<{ success: boolean }> {
    try {
      const response = await this.api.delete(`/api/upload/file/${fileName}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Update existing deal
  async updateDeal(
    id: string,
    updateData: Partial<DealInputs>
  ): Promise<{ status: string; data: SavedDeal; message: string }> {
    try {
      const response = await this.api.put(`/api/deals/${id}`, updateData);
      toast.success(response.data.message || "Deal updated successfully");
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Delete deal
  async deleteDeal(id: string): Promise<{ status: string; message: string }> {
    try {
      const response = await this.api.delete(`/api/deals/${id}`);
      toast.success(response.data.message || "Deal deleted successfully");
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Delete all deals
  async deleteAllDeals(): Promise<{
    status: string;
    message: string;
    deletedCount: number;
  }> {
    try {
      const response = await this.api.delete("/api/deals");
      toast.success(response.data.message || "All deals deleted successfully");
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Bulk create deals (import)
  async bulkCreateDeals(deals: DealInputs[]): Promise<BulkOperationResponse> {
    try {
      const response = await this.api.post("/api/deals/bulk", { deals });
      toast.success(
        response.data.message ||
          `${response.data.data.length} deals imported successfully`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Export deals
  async exportDeals(): Promise<{
    status: string;
    data: SavedDeal[];
    message: string;
  }> {
    try {
      const response = await this.api.get("/api/deals/export");
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Get deal statistics for dashboard
  async getDealStatistics(): Promise<StatisticsResponse> {
    try {
      const response = await this.api.get("/api/deals/statistics");
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // ========== GLOBAL ASSUMPTIONS ENDPOINTS ==========

  // Get global assumptions
  async getAssumptions(): Promise<AssumptionsResponse> {
    try {
      const response = await this.api.get("/api/deals/assumptions/global");
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Update global assumptions
  async updateAssumptions(
    updateData: Partial<GlobalAssumptions>
  ): Promise<AssumptionsResponse> {
    try {
      const response = await this.api.put(
        "/api/deals/assumptions/global",
        updateData
      );
      toast.success(
        response.data.message || "Assumptions updated successfully"
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Reset assumptions to defaults
  async resetAssumptions(): Promise<AssumptionsResponse> {
    try {
      const response = await this.api.delete("/api/deals/assumptions/global");
      toast.success(response.data.message || "Assumptions reset to defaults");
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // ========== SECTION 8 DATA ENDPOINTS ==========

  // Update Section 8 zip data
  async updateSection8ZipData(
    zipData: Section8ZipData[]
  ): Promise<AssumptionsResponse> {
    try {
      const response = await this.api.put("/api/deals/assumptions/section8", {
        zipData,
      });
      toast.success(
        response.data.message || "Section 8 data updated successfully"
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Add single Section 8 zip entry
  async addSection8ZipEntry(
    zipEntry: Section8ZipData
  ): Promise<AssumptionsResponse> {
    try {
      const response = await this.api.post(
        "/api/deals/assumptions/section8",
        zipEntry
      );
      toast.success(
        response.data.message || "Section 8 zip entry added successfully"
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Remove Section 8 zip entry
  async removeSection8ZipEntry(zipCode: string): Promise<AssumptionsResponse> {
    try {
      const response = await this.api.delete(
        `/api/deals/assumptions/section8/${zipCode}`
      );
      toast.success(
        response.data.message || "Section 8 zip entry removed successfully"
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Get Section 8 rent for specific zip and bedroom count
  async getSection8Rent(
    zipCode: string,
    beds: number
  ): Promise<Section8RentResponse> {
    try {
      const response = await this.api.get("/api/deals/assumptions/section8", {
        params: { zipCode, beds },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Bulk import Section 8 data
  async bulkImportSection8Data(
    importData: Section8ZipData[]
  ): Promise<AssumptionsResponse> {
    try {
      const response = await this.api.post(
        "/api/deals/assumptions/section8/bulk/import",
        { importData }
      );
      toast.success(
        response.data.message || "Section 8 data imported successfully"
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // ========== ASSUMPTIONS UTILITY ENDPOINTS ==========

  // Export assumptions
  async exportAssumptions(): Promise<{
    status: string;
    data: any;
    message: string;
  }> {
    try {
      const response = await this.api.get("/api/deals/assumptions/export", {
        responseType: "blob",
      });

      // Handle file download
      const blob = new Blob([response.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `assumptions-export-${Date.now()}.json`;
      link.click();
      window.URL.revokeObjectURL(url);

      return {
        status: "success",
        data: {},
        message: "Assumptions exported successfully",
      };
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Import assumptions
  async importAssumptions(importData: any): Promise<AssumptionsResponse> {
    try {
      const response = await this.api.post(
        "/api/deals/assumptions/import",
        importData
      );
      toast.success(
        response.data.message || "Assumptions imported successfully"
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // ========== UTILITY METHODS ==========

  // Health check
  async healthCheck(): Promise<{
    status: string;
    message: string;
    version: string;
  }> {
    try {
      const response = await this.api.get("/health");
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // ========== CUSTOM QUERY METHODS ==========

  // Search deals by address
  async searchDealsByAddress(
    query: string,
    limit: number = 10
  ): Promise<SavedDeal[]> {
    try {
      const response = await this.getDeals({
        search: query,
        limit,
        sortBy: "address",
        sortOrder: "asc",
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Get rehab deals only
  async getRehabDeals(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<SavedDeal>> {
    try {
      const response = await this.getDeals({
        page,
        limit,
        isRehab: true,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      return response;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Get deals by price range
  async getDealsByPriceRange(
    minPrice: number,
    maxPrice: number,
    page: number = 1
  ): Promise<PaginatedResponse<SavedDeal>> {
    try {
      const response = await this.getDeals({
        page,
        minPrice,
        maxPrice,
        sortBy: "purchasePrice",
        sortOrder: "asc",
      });
      return response;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // ========== BATCH OPERATIONS ==========

  // Batch update multiple deals
  async batchUpdateDeals(
    updates: Array<{ id: string; data: Partial<DealInputs> }>
  ): Promise<
    Array<{ id: string; success: boolean; data?: SavedDeal; error?: string }>
  > {
    try {
      const results = await Promise.allSettled(
        updates.map(async (update) => {
          try {
            const result = await this.updateDeal(update.id, update.data);
            return { id: update.id, success: true, data: result.data };
          } catch (error) {
            return {
              id: update.id,
              success: false,
              error: (error as Error).message,
            };
          }
        })
      );

      return results.map((result) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          return { id: "unknown", success: false, error: "Unknown error" };
        }
      });
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Duplicate deal
  async duplicateDeal(
    dealId: string,
    newAddress?: string
  ): Promise<{ status: string; data: SavedDeal; message: string }> {
    try {
      const originalDeal = await this.getDeal(dealId);
      const dealData = { ...originalDeal.data, id: undefined };

      if (newAddress) {
        dealData.address = newAddress;
      } else {
        dealData.address = `${dealData.address} (Copy)`;
      }

      return await this.createDeal(dealData);
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // Quick health check
  async quickHealthCheck(): Promise<boolean> {
    try {
      const response = await this.healthCheck();
      return response.status === "success";
    } catch (error) {
      return false;
    }
  }
}

export const dashboardService = new DashboardService();
