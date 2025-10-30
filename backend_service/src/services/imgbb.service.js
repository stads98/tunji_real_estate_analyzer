// backend/services/imgbb.service.js
const axios = require('axios');
const FormData = require('form-data');
const logger = require("../../config/logger");
const config = require("../../config");

class ImgBBService {
  async uploadFile(file) {
    try {
      // Convert file buffer to base64
      const base64Image = file.buffer.toString('base64');
      
      // Create form data
      const formData = new FormData();
      formData.append('image', base64Image);

      // Upload to ImgBB
      const response = await axios.post(
        `${config.imgbb.uploadUrl}?key=${config.imgbb.apiKey}`, 
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 30000, // 30 second timeout
        }
      );

      if (!response.data.success) {
        throw new Error(`ImgBB API error: ${response.data.error?.message || 'Unknown error'}`);
      }

      const imgbbData = response.data.data;

      await logger.info("File uploaded to ImgBB", {
        service: "ImgBBService",
        method: "uploadFile",
        fileName: file.originalname,
        imgbbId: imgbbData.id,
        fileSize: file.size,
      });

      return {
        fileName: imgbbData.id, // Use ImgBB ID as filename
        originalName: file.originalname,
        fileUrl: imgbbData.url, // Direct image URL from ImgBB CDN
        thumbUrl: imgbbData.thumb?.url, // Thumbnail URL if available
        displayUrl: imgbbData.display_url, // Display URL
        deleteUrl: imgbbData.delete_url, // URL to delete the image
        imgbbId: imgbbData.id,
        fileSize: imgbbData.size,
        mimeType: file.mimetype,
        width: imgbbData.width,
        height: imgbbData.height,
      };
    } catch (error) {
      await logger.error(error, {
        service: "ImgBBService",
        method: "uploadFile",
        fileName: file.originalname,
      });
      
      if (error.response) {
        // ImgBB API returned an error
        throw new Error(`ImgBB upload failed: ${error.response.data.error?.message || error.response.statusText}`);
      } else if (error.request) {
        // Network error
        throw new Error('ImgBB upload failed: Network error - could not reach ImgBB API');
      } else {
        // Other error
        throw new Error(`ImgBB upload failed: ${error.message}`);
      }
    }
  }

  async bulkUploadFiles(files) {
    try {
      const uploadPromises = files.map((file) => this.uploadFile(file));
      const results = await Promise.all(uploadPromises);

      return results;
    } catch (error) {
      await logger.error(error, {
        service: "ImgBBService",
        method: "bulkUploadFiles",
        fileCount: files.length,
      });
      throw error;
    }
  }

  // Note: ImgBB doesn't provide a direct API for deletion via the free tier
  // Images will remain on their servers but are only accessible via the direct URL
  async deleteFile(fileName) {
    try {
      // With free ImgBB tier, we can't programmatically delete files
      // But we can track that we've "deleted" it from our app
      await logger.info("File marked as deleted from ImgBB (free tier limitation)", {
        service: "ImgBBService",
        method: "deleteFile",
        fileName: fileName,
      });

      return { 
        success: true,
        message: "File marked as deleted (ImgBB free tier doesn't support programmatic deletion)"
      };
    } catch (error) {
      await logger.error(error, {
        service: "ImgBBService",
        method: "deleteFile",
        fileName: fileName,
      });
      throw new Error(`Failed to mark file as deleted: ${error.message}`);
    }
  }
}

module.exports = new ImgBBService();