// backend/routes/upload.routes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const uploadController = require("../../controllers/upload.controller");
const config = require("../../../config");
const fs = require("fs").promises;
const path = require("path");

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.fileStorage.uploadLimits.fileSize,
  },
  fileFilter: (req, file, cb) => {
    if (
      config.fileStorage.uploadLimits.allowedMimeTypes.includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Upload routes
router.post("/file", upload.single("file"), uploadController.uploadFile);
router.post(
  "/files",
  upload.array("files", 10),
  uploadController.bulkUploadFiles
);
router.delete("/file/:fileName", uploadController.deleteFile);

module.exports = router;
