// backend/controllers/upload.controller.js
const uploadService = require("../services/upload.service");
const { sendResponse } = require("../utils/utils");
const { STATUS, ERROR_MESSAGES } = require("../constants/constants");
const logger = require("../../config/logger");

class UploadController {
  // Upload single file
  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return sendResponse(res, 400, {
          status: STATUS.FAILED,
          message: "No file uploaded",
        });
      }

      const result = await uploadService.uploadFile(req.file);

      await logger.info("File uploaded successfully", {
        controller: "UploadController",
        method: "uploadFile",
        fileName: req.file.originalname,
        fileSize: req.file.size,
      });

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: result,
        message: "File uploaded successfully",
      });
    } catch (error) {
      await logger.error(error, {
        controller: "UploadController",
        method: "uploadFile",
        fileName: req.file?.originalname,
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Upload multiple files
  async bulkUploadFiles(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return sendResponse(res, 400, {
          status: STATUS.FAILED,
          message: "No files uploaded",
        });
      }

      const results = await uploadService.bulkUploadFiles(req.files);

      await logger.info("Multiple files uploaded successfully", {
        controller: "UploadController",
        method: "bulkUploadFiles",
        fileCount: req.files.length,
        successfulUploads: results.length,
      });

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: results,
        message: `${results.length} files uploaded successfully`,
      });
    } catch (error) {
      await logger.error(error, {
        controller: "UploadController",
        method: "bulkUploadFiles",
        fileCount: req.files?.length,
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Delete file
  async deleteFile(req, res) {
    try {
      const { fileName } = req.params;

      if (!fileName) {
        return sendResponse(res, 400, {
          status: STATUS.FAILED,
          message: "File name is required",
        });
      }

      const result = await uploadService.deleteFile(fileName);

      await logger.info("File deleted successfully", {
        controller: "UploadController",
        method: "deleteFile",
        fileName: fileName,
      });

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: result,
        message: "File deleted successfully",
      });
    } catch (error) {
      await logger.error(error, {
        controller: "UploadController",
        method: "deleteFile",
        fileName: req.params.fileName,
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }
}

const uploadController = new UploadController();
module.exports = uploadController;
