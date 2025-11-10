// backend_service/validators/team.validators.js
const { body, query, param } = require("express-validator");
const mongoose = require("mongoose");

// Common validation rules
const objectIdValidation = (field) =>
  param(field).custom((value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error(`Invalid ${field} format`);
    }
    return true;
  });

const optionalObjectIdValidation = (field) =>
  query(field)
    .optional()
    .custom((value) => {
      if (value && value !== "all" && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error(`Invalid ${field} format`);
      }
      return true;
    });

// Team notes validators
const getTeamNotesValidation = [
  query("dealId")
    .optional()
    .custom((value) => {
      if (value && value !== "all" && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid dealId format");
      }
      return true;
    })
    .withMessage('dealId must be a valid ObjectId or "all"'),

  query("author")
    .optional()
    .isIn(["user1", "user2", "system", "all"])
    .withMessage("author must be user1, user2, system, or all"),

  query("dateFilter")
    .optional()
    .isIn(["today", "week", "month", "all"])
    .withMessage("dateFilter must be today, week, month, or all"),

  query("sortBy")
    .optional()
    .isIn(["newest", "oldest", "pinned"])
    .withMessage("sortBy must be newest, oldest, or pinned"),

  query("search")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("search must be between 1 and 100 characters")
    .trim(),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100")
    .toInt(),
];

const createTeamNoteValidation = [
  body("dealId")
    .notEmpty()
    .withMessage("dealId is required")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid dealId format");
      }
      return true;
    }),

  body("author")
    .notEmpty()
    .withMessage("author is required")
    .isIn(["user1", "user2", "system"])
    .withMessage("author must be user1, user2, or system"),

  body("message")
    .notEmpty()
    .withMessage("message is required")
    .isLength({ min: 1, max: 1000 })
    .withMessage("message must be between 1 and 1000 characters")
    .trim()
    .escape(),

  body("isPinned")
    .optional()
    .isBoolean()
    .withMessage("isPinned must be a boolean")
    .toBoolean(),

  body("isSystemNote")
    .optional()
    .isBoolean()
    .withMessage("isSystemNote must be a boolean")
    .toBoolean(),

  body("changeType")
    .optional()
    .isIn(["stage", "maxOffer", "rehab", "offMarket", "price", null])
    .withMessage(
      "changeType must be stage, maxOffer, rehab, offMarket, price, or null"
    ),
];

const updateTeamNoteValidation = [
  param("id").custom((value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error("Invalid note id format");
    }
    return true;
  }),

  body("isPinned")
    .optional()
    .isBoolean()
    .withMessage("isPinned must be a boolean")
    .toBoolean(),

  body("message")
    .optional()
    .isLength({ min: 1, max: 1000 })
    .withMessage("message must be between 1 and 1000 characters")
    .trim()
    .escape(),

  // Ensure at least one field is provided for update
  body().custom((value) => {
    const { isPinned, message } = value;
    if (!isPinned && !message) {
      throw new Error(
        "At least one field (isPinned or message) must be provided for update"
      );
    }
    return true;
  }),
];

const deleteTeamNoteValidation = [
  param("id").custom((value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error("Invalid note id format");
    }
    return true;
  }),
];

const updateUserSettingsValidation = [
  body("user1Name")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("user1Name must be between 1 and 50 characters")
    .trim()
    .escape(),

  body("user2Name")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("user2Name must be between 1 and 50 characters")
    .trim()
    .escape(),

  body("user3Name")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("user3Name must be between 1 and 50 characters")
    .trim()
    .escape(),

  // Ensure at least one field is provided for update
  body().custom((value) => {
    const { user1Name, user2Name, user3Name } = value;
    if (!user1Name && !user2Name && !user3Name) {
      throw new Error(
        "At least one field (user1Name, user2Name or user3Name) must be provided for update"
      );
    }
    return true;
  }),
];

// Pipeline stats validators
const getPipelineStatsValidation = [
  query("timeFrame")
    .optional()
    .isIn(["today", "week", "month", "custom"])
    .withMessage("timeFrame must be today, week, month, or custom"),

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be a valid ISO 8601 date")
    .custom((value, { req }) => {
      if (req.query.timeFrame === "custom" && !value) {
        throw new Error("startDate is required when timeFrame is custom");
      }
      return true;
    }),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be a valid ISO 8601 date")
    .custom((value, { req }) => {
      if (req.query.timeFrame === "custom" && !value) {
        throw new Error("endDate is required when timeFrame is custom");
      }
      return true;
    }),

  query().custom((value, { req }) => {
    const { timeFrame, startDate, endDate } = req.query;
    if (timeFrame === "custom" && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        throw new Error("startDate must be before endDate");
      }
    }
    return true;
  }),
];

const getDealStageTimelineValidation = [
  param("id").custom((value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error("Invalid deal id format");
    }
    return true;
  }),
];

module.exports = {
  getTeamNotesValidation,
  createTeamNoteValidation,
  updateTeamNoteValidation,
  deleteTeamNoteValidation,
  updateUserSettingsValidation,
  getPipelineStatsValidation,
  getDealStageTimelineValidation,
  objectIdValidation,
  optionalObjectIdValidation,
};
