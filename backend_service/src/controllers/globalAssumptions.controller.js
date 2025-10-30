// controllers/globalAssumptions.controller.js
const assumptionsService = require("../services/globalAssumptions.service");
const { sendResponse } = require("../utils/utils");
const { STATUS, ERROR_MESSAGES } = require("../constants/constants");
const logger = require("../../config/logger");

class GlobalAssumptionsController {
  // Get global assumptions
  async getAssumptions(req, res) {
    try {
      const assumptions = await assumptionsService.getAssumptions();

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: assumptions,
        message: "Global assumptions retrieved successfully",
      });
    } catch (error) {
      await logger.error(error, {
        controller: "GlobalAssumptionsController",
        method: "getAssumptions",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Update global assumptions
  async updateAssumptions(req, res) {
    try {
      const updateData = req.body;

      const assumptions = await assumptionsService.updateAssumptions(
        updateData
      );

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: assumptions,
        message: "Global assumptions updated successfully",
      });
    } catch (error) {
      await logger.error(error, {
        controller: "GlobalAssumptionsController",
        method: "updateAssumptions",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Update Section 8 zip data
  async updateSection8ZipData(req, res) {
    try {
      const { zipData } = req.body;

      if (!Array.isArray(zipData)) {
        return sendResponse(res, 400, {
          status: STATUS.FAILED,
          message: "zipData must be an array",
        });
      }

      const assumptions = await assumptionsService.updateSection8ZipData(
        zipData
      );

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: assumptions,
        message: "Section 8 zip data updated successfully",
        summary: {
          totalZips: assumptions.section8ZipData.length,
        },
      });
    } catch (error) {
      await logger.error(error, {
        controller: "GlobalAssumptionsController",
        method: "updateSection8ZipData",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Add single Section 8 zip entry
  async addSection8ZipEntry(req, res) {
    try {
      const zipEntry = req.body;

      const assumptions = await assumptionsService.addSection8ZipEntry(
        zipEntry
      );

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: assumptions,
        message: "Section 8 zip entry added successfully",
      });
    } catch (error) {
      await logger.error(error, {
        controller: "GlobalAssumptionsController",
        method: "addSection8ZipEntry",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Remove Section 8 zip entry
  async removeSection8ZipEntry(req, res) {
    try {
      const { zipCode } = req.params;

      const assumptions = await assumptionsService.removeSection8ZipEntry(
        zipCode
      );

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: assumptions,
        message: "Section 8 zip entry removed successfully",
      });
    } catch (error) {
      await logger.error(error, {
        controller: "GlobalAssumptionsController",
        method: "removeSection8ZipEntry",
        zipCode: req.params.zipCode,
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Get Section 8 rent for specific zip
  async getSection8Rent(req, res) {
    try {
      const { zipCode, beds } = req.query;

      if (!zipCode || !beds) {
        return sendResponse(res, 400, {
          status: STATUS.FAILED,
          message: "zipCode and beds parameters are required",
        });
      }

      const rent = await assumptionsService.getSection8RentForZip(
        zipCode,
        parseInt(beds)
      );

      if (rent === null) {
        return sendResponse(res, 404, {
          status: STATUS.FAILED,
          message: `No Section 8 data found for zip code ${zipCode} and ${beds} bedroom(s)`,
        });
      }

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: {
          zipCode,
          beds: parseInt(beds),
          section8Rent: rent,
        },
        message: "Section 8 rent found successfully",
      });
    } catch (error) {
      await logger.error(error, {
        controller: "GlobalAssumptionsController",
        method: "getSection8Rent",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Bulk import Section 8 data
  async bulkImportSection8Data(req, res) {
    try {
      const { importData } = req.body;

      if (!Array.isArray(importData)) {
        return sendResponse(res, 400, {
          status: STATUS.FAILED,
          message: "importData must be an array",
        });
      }

      const assumptions = await assumptionsService.bulkImportSection8Data(
        importData
      );

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: assumptions,
        message: "Section 8 data imported successfully",
        summary: {
          importedEntries: importData.length,
          totalEntries: assumptions.section8ZipData.length,
        },
      });
    } catch (error) {
      await logger.error(error, {
        controller: "GlobalAssumptionsController",
        method: "bulkImportSection8Data",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Reset assumptions to defaults
  async resetAssumptions(req, res) {
    try {
      const assumptions = await assumptionsService.resetToDefaults();

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: assumptions,
        message: "Assumptions reset to defaults successfully",
      });
    } catch (error) {
      await logger.error(error, {
        controller: "GlobalAssumptionsController",
        method: "resetAssumptions",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Export assumptions
  async exportAssumptions(req, res) {
    try {
      const exportData = await assumptionsService.exportAssumptions();

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=assumptions-export-${Date.now()}.json`
      );

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: exportData,
        message: "Assumptions exported successfully",
      });
    } catch (error) {
      await logger.error(error, {
        controller: "GlobalAssumptionsController",
        method: "exportAssumptions",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Import assumptions
  async importAssumptions(req, res) {
    try {
      const importData = req.body;

      const assumptions = await assumptionsService.importAssumptions(
        importData
      );

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: assumptions,
        message: "Assumptions imported successfully",
      });
    } catch (error) {
      await logger.error(error, {
        controller: "GlobalAssumptionsController",
        method: "importAssumptions",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }
}

const globalAssumptionsController = new GlobalAssumptionsController();
module.exports = globalAssumptionsController;
