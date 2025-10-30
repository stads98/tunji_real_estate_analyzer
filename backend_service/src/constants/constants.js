// backend_service/src/constants/messages.js
// Server Health
const HEALTH_STATUS = {
  UP: "UP",
  DOWN: "DOWN",
};

// Status messages
const STATUS = {
  FAILED: "failed",
  SUCCESS: "success",
  ERROR: "error",
};

const ERROR_MESSAGES = {
  INTERNAL_SERVER_ERROR: "Internal server error",
  VALIDATION_ERROR: "Validation error",
  NOT_FOUND: "Resource not found",
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Forbidden access",
};

const DEAL_SCHEMA_VERSION = 3;

module.exports = {
  STATUS,
  HEALTH_STATUS,
  ERROR_MESSAGES,
  DEAL_SCHEMA_VERSION,
};
