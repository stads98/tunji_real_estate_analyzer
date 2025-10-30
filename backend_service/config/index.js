// config/index.js
module.exports = {
  port: process.env.PORT || 5000,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  backendUrl: process.env.BACKEND_URL || "http://localhost:5000",
  webName: process.env.WEB_NAME || "Real Estate Deal Analyzer",
  db: {
    mongodb: {
      uri: process.env.MONGODB_URI || "",
    },
  },
  env: process.env.NODE_ENV || "development",

  logtail: {
    apikey: process.env.LOGTAIL_API_KEY || "",
    endpoint: process.env.LOGTAIL_ENDPOINT || "",
  },

  providers: {
    email: {
      service: process.env.EMAIL_SERVICE || "gmail",
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE || false,
      username: process.env.EMAIL_USERNAME || "your_email@gmail.com",
      password: process.env.EMAIL_PASSWORD || "your_email_password",
    },
  },

  // ImgBB Configuration
  imgbb: {
    apiKey: process.env.IMGBB_API_KEY || "",
    uploadUrl: process.env.IMGBB_UPLOAD_URL || "https://api.imgbb.com/1/upload",
  },

  fileStorage: {
    uploadDir: process.env.UPLOAD_DIR || "./uploads",
    publicUrl: process.env.PUBLIC_URL || "http://localhost:5000/uploads",
    uploadLimits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      allowedMimeTypes: [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ],
    },
  },

  defaultProvider: {
    fileStorage: process.env.DEFAULT_STORAGE_PROVIDER || "imgbb",
  },
};
