// controllers/deal.controller.js
const dealService = require("../services/deal.service");
const { sendResponse } = require("../utils/utils");
const { STATUS, ERROR_MESSAGES } = require("../constants/constants");
const logger = require("../../config/logger");

class DealController {
  // Get all deals for user
  async getDeals(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        minPrice,
        maxPrice,
        minUnits,
        maxUnits,
        isRehab,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const result = await dealService.getDeals({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        minPrice,
        maxPrice,
        minUnits,
        maxUnits,
        isRehab,
        sortBy,
        sortOrder,
      });

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: result.deals,
        pagination: result.pagination,
      });
    } catch (error) {
      await logger.error(error, {
        controller: "DealController",
        method: "getDeals",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Get single deal
  async getDeal(req, res) {
    try {
      const { id } = req.params;

      const result = await dealService.getDealById(id);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: result.deal,
        assumptions: result.assumptions,
      });
    } catch (error) {
      await logger.error(error, {
        controller: "DealController",
        method: "getDeal",
        dealId: req.params.id,
      });

      if (error.message === "Deal not found") {
        return sendResponse(res, 404, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.NOT_FOUND,
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Create new deal
  async createDeal(req, res) {
    try {
      const dealData = req.body;

      const deal = await dealService.createDeal(dealData);

      return sendResponse(res, 201, {
        status: STATUS.SUCCESS,
        data: deal,
        message: "Deal created successfully",
      });
    } catch (error) {
      await logger.error(error, {
        controller: "DealController",
        method: "createDeal",
      });

      if (error.name === "ValidationError") {
        return sendResponse(res, 400, {
          status: STATUS.FAILED,
          message: "Validation error",
          errors: error.errors,
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Update deal
  async updateDeal(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const deal = await dealService.updateDeal(id, updateData);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: deal,
        message: "Deal updated successfully",
      });
    } catch (error) {
      await logger.error(error, {
        controller: "DealController",
        method: "updateDeal",
        dealId: req.params.id,
      });

      if (error.message === "Deal not found") {
        return sendResponse(res, 404, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.NOT_FOUND,
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Delete deal
  async deleteDeal(req, res) {
    try {
      const { id } = req.params;

      const result = await dealService.deleteDeal(id);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: result.message,
      });
    } catch (error) {
      await logger.error(error, {
        controller: "DealController",
        method: "deleteDeal",
        dealId: req.params.id,
      });

      if (error.message === "Deal not found") {
        return sendResponse(res, 404, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.NOT_FOUND,
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Bulk create deals (import)
  async bulkCreateDeals(req, res) {
    try {
      const { deals } = req.body;

      if (!Array.isArray(deals) || deals.length === 0) {
        return sendResponse(res, 400, {
          status: STATUS.FAILED,
          message: "Deals array is required and cannot be empty",
        });
      }

      // Validate maximum bulk import size
      if (deals.length > 100) {
        return sendResponse(res, 400, {
          status: STATUS.FAILED,
          message: "Cannot import more than 100 deals at once",
        });
      }

      const result = await dealService.bulkCreateDeals(deals);

      return sendResponse(res, 201, {
        status: STATUS.SUCCESS,
        data: result,
        message: `${result.length} deals imported successfully`,
      });
    } catch (error) {
      await logger.error(error, {
        controller: "DealController",
        method: "bulkCreateDeals",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Export deals
  async exportDeals(req, res) {
    try {
      const deals = await dealService.exportDeals();

      // Set headers for JSON download
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=deals-export-${Date.now()}.json`
      );

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: deals,
        message: `${deals.length} deals exported successfully`,
        exportInfo: {
          exportedAt: new Date().toISOString(),
          totalDeals: deals.length,
        },
      });
    } catch (error) {
      await logger.error(error, {
        controller: "DealController",
        method: "exportDeals",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Get deal statistics for dashboard
  async getDealStatistics(req, res) {
    try {
      const statistics = await dealService.getDealStatistics();

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: statistics,
        message: "Deal statistics retrieved successfully",
      });
    } catch (error) {
      await logger.error(error, {
        controller: "DealController",
        method: "getDealStatistics",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async deleteAllDeals(req, res) {
    try {
      const result = await dealService.deleteAllDeals();

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: result.message,
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      await logger.error(error, {
        controller: "DealController",
        method: "deleteAllDeals",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Add this method to your existing DealController class
  async bulkCreateDealsWithStaging(req, res) {
    try {
      const { properties } = req.body;

      if (!Array.isArray(properties) || properties.length === 0) {
        return sendResponse(res, 400, {
          status: STATUS.FAILED,
          message: "Properties array is required and cannot be empty",
        });
      }

      // Validate maximum bulk import size
      if (properties.length > 100) {
        return sendResponse(res, 400, {
          status: STATUS.FAILED,
          message: "Cannot import more than 100 properties at once",
        });
      }

      // Validate required fields for each property
      const validationErrors = [];
      properties.forEach((property, index) => {
        if (!property.address) {
          validationErrors.push(`Property ${index + 1}: address is required`);
        }
        if (!property.price || property.price <= 0) {
          validationErrors.push(
            `Property ${index + 1}: valid price is required`
          );
        }
      });

      if (validationErrors.length > 0) {
        return sendResponse(res, 400, {
          status: STATUS.FAILED,
          message: "Validation errors",
          errors: validationErrors,
        });
      }

      const result = await dealService.bulkCreateDealsWithStaging(properties);

      return sendResponse(res, 201, {
        status: STATUS.SUCCESS,
        data: result,
        message: `${result.length} deals imported successfully in Stage 1`,
      });
    } catch (error) {
      await logger.error(error, {
        controller: "DealController",
        method: "bulkCreateDealsWithStaging",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }
}

const dealController = new DealController();
module.exports = dealController;
