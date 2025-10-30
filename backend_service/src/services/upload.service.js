// backend/services/upload.service.js
const logger = require("../../config/logger");
const config = require("../../config");
const imgbbService = require("./imgbb.service");

class UploadService {
  constructor() {
    this.provider = config.defaultProvider.fileStorage;
  }

  // Upload single file using ImgBB
  async uploadFile(file) {
    try {
      // Use ImgBB for file storage
      const result = await imgbbService.uploadFile(file);

      await logger.info("File uploaded via ImgBB", {
        service: "UploadService",
        method: "uploadFile",
        provider: this.provider,
        fileName: file.originalname,
        imgbbId: result.imgbbId,
        fileSize: file.size,
      });

      return {
        fileName: result.fileName,
        originalName: result.originalName,
        fileUrl: result.fileUrl, // ImgBB CDN URL (no CORS issues!)
        thumbUrl: result.thumbUrl, // Thumbnail URL
        displayUrl: result.displayUrl, // Display URL
        imgbbId: result.imgbbId,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      await logger.error(error, {
        service: "UploadService",
        method: "uploadFile",
        fileName: file.originalname,
      });
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  // Upload multiple files
  async bulkUploadFiles(files) {
    try {
      const uploadPromises = files.map((file) => this.uploadFile(file));
      const results = await Promise.all(uploadPromises);

      return results;
    } catch (error) {
      await logger.error(error, {
        service: "UploadService",
        method: "bulkUploadFiles",
        fileCount: files.length,
      });
      throw error;
    }
  }

  // Generate unique file name (kept for reference, but ImgBB generates its own IDs)
  generateFileName(originalName) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split(".").pop();
    return `deal-photo-${timestamp}-${randomString}.${extension}`;
  }

  // Delete file from ImgBB
  async deleteFile(fileName) {
    try {
      const result = await imgbbService.deleteFile(fileName);

      await logger.info("File deletion processed", {
        service: "UploadService",
        method: "deleteFile",
        fileName: fileName,
        provider: this.provider,
      });

      return result;
    } catch (error) {
      await logger.error(error, {
        service: "UploadService",
        method: "deleteFile",
        fileName: fileName,
      });
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
}

module.exports = new UploadService();
