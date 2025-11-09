// middlewares/validators.js
const { body, param, query, validationResult } = require("express-validator");
const { STATUS, ERROR_MESSAGES } = require("../constants/constants");

// Common validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: STATUS.FAILED,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      errors: errors.array(),
    });
  }
  next();
};

// Validate MongoDB ObjectId
const validateObjectId = (paramName) => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName} format`),
  handleValidationErrors,
];

// Validate Zip Code parameter
const zipCodeParamValidation = [
  param("zipCode")
    .matches(/^\d{5}$/)
    .withMessage("Invalid zip code format"),
  handleValidationErrors,
];

// ID Validation
const idValidation = validateObjectId("id");

// Get deals validation
const getDealsValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),

  query("search")
    .optional()
    .isString()
    .withMessage("Search must be a string")
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search query too long")
    .escape(),

  query("minPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum price must be a positive number")
    .toFloat(),

  query("maxPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum price must be a positive number")
    .toFloat(),

  query("minUnits")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Minimum units must be a positive integer")
    .toInt(),

  query("maxUnits")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Maximum units must be a positive integer")
    .toInt(),

  query("isRehab")
    .optional()
    .isBoolean()
    .withMessage("isRehab must be a boolean")
    .toBoolean(),

  query("sortBy")
    .optional()
    .isString()
    .withMessage("Sort field must be a string")
    .trim()
    .isIn([
      "createdAt",
      "updatedAt",
      "purchasePrice",
      "units",
      "address",
      "yearBuilt",
    ])
    .withMessage("Invalid sort field"),

  query("sortOrder")
    .optional()
    .isString()
    .withMessage("Sort order must be a string")
    .trim()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be 'asc' or 'desc'"),

  handleValidationErrors,
];

// Create deal validation
const createDealValidation = [
  body("address")
    .notEmpty()
    .withMessage("Address is required")
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Address too long"),
  body("units")
    .isInt({ min: 1, max: 50 })
    .withMessage("Units must be between 1 and 50"),
  body("totalSqft")
    .isFloat({ min: 0 })
    .withMessage("Total square footage must be a positive number"),
  body("yearBuilt")
    .isInt({ min: 1800, max: new Date().getFullYear() })
    .withMessage("Invalid year built"),
  body("purchasePrice")
    .isFloat({ min: 0 })
    .withMessage("Purchase price must be a positive number"),
  body("loanInterestRate")
    .isFloat({ min: 0, max: 50 })
    .withMessage("Loan interest rate must be between 0 and 50"),
  body("loanTerm")
    .isInt({ min: 1, max: 50 })
    .withMessage("Loan term must be between 1 and 50 years"),
  body("downPayment")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Down payment must be between 0 and 100"),
  body("acquisitionCosts")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Acquisition costs must be between 0 and 100"),
  body("propertyTaxes")
    .isFloat({ min: 0 })
    .withMessage("Property taxes must be a positive number"),
  body("propertyInsurance")
    .isFloat({ min: 0 })
    .withMessage("Property insurance must be a positive number"),
  body("isRehab")
    .optional()
    .isBoolean()
    .withMessage("isRehab must be a boolean"),
  body("rehabCost")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Rehab cost must be a positive number"),
  body("unitDetails")
    .isArray({ min: 1, max: 50 })
    .withMessage("Must have between 1 and 50 units"),
  body("unitDetails.*.beds")
    .isFloat({ min: 0, max: 10 })
    .withMessage("Unit beds must be between 0 and 10"),
  body("unitDetails.*.baths")
    .isFloat({ min: 0, max: 10 })
    .withMessage("Unit baths must be between 0 and 10"),
  body("unitDetails.*.sqft")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Unit square footage must be a positive number"),
  body("unitDetails.*.section8Rent")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Section 8 rent must be a positive number"),
  body("unitDetails.*.marketRent")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Market rent must be a positive number"),
  body("unitDetails.*.afterRehabMarketRent")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("After rehab market rent must be a positive number"),
  body("unitDetails.*.strAnnualRevenue")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("STR annual revenue must be a positive number"),
  body("unitDetails.*.strAnnualExpenses")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("STR annual expenses must be a positive number"),
  handleValidationErrors,
];

// Update deal validation
const updateDealValidation = [
  body("address")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Address too long"),
  body("units")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Units must be between 1 and 50"),
  body("totalSqft")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Total square footage must be a positive number"),
  body("purchasePrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Purchase price must be a positive number"),
  body("loanInterestRate")
    .optional()
    .isFloat({ min: 0, max: 50 })
    .withMessage("Loan interest rate must be between 0 and 50"),
  body("loanTerm")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Loan term must be between 1 and 50 years"),
  body("downPayment")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Down payment must be between 0 and 100"),
  body("acquisitionCosts")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Acquisition costs must be between 0 and 100"),
  body("propertyTaxes")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Property taxes must be a positive number"),
  body("propertyInsurance")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Property insurance must be a positive number"),
  body("isRehab")
    .optional()
    .isBoolean()
    .withMessage("isRehab must be a boolean"),
  body("rehabCost")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Rehab cost must be a positive number"),
  body("unitDetails")
    .optional()
    .isArray({ min: 1, max: 50 })
    .withMessage("Must have between 1 and 50 units"),
  body("unitDetails.*.beds")
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage("Unit beds must be between 0 and 10"),
  body("unitDetails.*.baths")
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage("Unit baths must be between 0 and 10"),
  body("unitDetails.*.sqft")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Unit square footage must be a positive number"),
  body("unitDetails.*.section8Rent")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Section 8 rent must be a positive number"),
  body("unitDetails.*.marketRent")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Market rent must be a positive number"),
  body("unitDetails.*.afterRehabMarketRent")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("After rehab market rent must be a positive number"),
  handleValidationErrors,
];

// Bulk create deals validation
const bulkCreateDealsValidation = [
  body("deals")
    .isArray({ min: 1, max: 100 })
    .withMessage("Deals must be an array with 1 to 100 items"),
  body("deals.*.address")
    .notEmpty()
    .withMessage("Address is required for each deal")
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Address too long"),
  body("deals.*.purchasePrice")
    .isFloat({ min: 0 })
    .withMessage("Purchase price must be a positive number for each deal"),
  body("deals.*.units")
    .isInt({ min: 1, max: 50 })
    .withMessage("Units must be between 1 and 50 for each deal"),
  handleValidationErrors,
];

// Get Section 8 rent validation
const getSection8RentValidation = [
  query("zipCode")
    .notEmpty()
    .withMessage("zipCode query parameter is required")
    .matches(/^\d{5}$/)
    .withMessage("zipCode must be a valid 5-digit zip code")
    .trim(),

  query("beds")
    .notEmpty()
    .withMessage("beds query parameter is required")
    .isInt({ min: 0, max: 10 })
    .withMessage("beds must be an integer between 0 and 10")
    .toInt(),

  handleValidationErrors,
];

// Update assumptions validation
const updateAssumptionsValidation = [
  body("ltrVacancyMonths")
    .optional()
    .isFloat({ min: 0, max: 12 })
    .withMessage("LTR vacancy months must be between 0 and 12"),
  body("section8VacancyMonths")
    .optional()
    .isFloat({ min: 0, max: 12 })
    .withMessage("Section 8 vacancy months must be between 0 and 12"),
  body("maintenancePercent")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Maintenance percent must be between 0 and 100"),
  body("rentGrowthPercent")
    .optional()
    .isFloat({ min: -100, max: 100 })
    .withMessage("Rent growth percent must be between -100 and 100"),
  body("appreciationPercent")
    .optional()
    .isFloat({ min: -100, max: 100 })
    .withMessage("Appreciation percent must be between -100 and 100"),
  body("propertyTaxIncreasePercent")
    .optional()
    .isFloat({ min: -100, max: 100 })
    .withMessage("Property tax increase percent must be between -100 and 100"),
  body("insuranceIncreasePercent")
    .optional()
    .isFloat({ min: -100, max: 100 })
    .withMessage("Insurance increase percent must be between -100 and 100"),
  body("section8ZipData")
    .optional()
    .isArray()
    .withMessage("Section 8 zip data must be an array"),
  handleValidationErrors,
];

// Update Section 8 zip data validation
const updateSection8ZipDataValidation = [
  body("zipData")
    .isArray({ max: 1000 })
    .withMessage("zipData must be an array with up to 1000 items"),
  body("zipData.*.zipCode")
    .isString()
    .matches(/^\d{5}$/)
    .withMessage("Invalid zip code format"),
  body("zipData.*.zone")
    .isInt({ min: 1, max: 19 })
    .withMessage("Zone must be between 1 and 19"),
  body("zipData.*.rents")
    .optional()
    .isObject()
    .withMessage("Rents must be an object"),
  body("zipData.*.rents.studio")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Studio rent must be a positive number"),
  body("zipData.*.rents.1bed")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("1 bed rent must be a positive number"),
  body("zipData.*.rents.2bed")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("2 bed rent must be a positive number"),
  body("zipData.*.rents.3bed")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("3 bed rent must be a positive number"),
  body("zipData.*.rents.4bed")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("4 bed rent must be a positive number"),
  body("zipData.*.rents.5bed")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("5 bed rent must be a positive number"),
  body("zipData.*.rents.6bed")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("6 bed rent must be a positive number"),
  body("zipData.*.rents.7bed")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("7 bed rent must be a positive number"),
  handleValidationErrors,
];

// Add Section 8 zip entry validation
const addSection8ZipEntryValidation = [
  body("zipCode")
    .isString()
    .matches(/^\d{5}$/)
    .withMessage("Invalid zip code format"),
  body("zone")
    .isInt({ min: 1, max: 19 })
    .withMessage("Zone must be between 1 and 19"),
  body("rents").optional().isObject().withMessage("Rents must be an object"),
  body("rents.studio")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Studio rent must be a positive number"),
  body("rents.1bed")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("1 bed rent must be a positive number"),
  body("rents.2bed")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("2 bed rent must be a positive number"),
  body("rents.3bed")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("3 bed rent must be a positive number"),
  body("rents.4bed")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("4 bed rent must be a positive number"),
  body("rents.5bed")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("5 bed rent must be a positive number"),
  body("rents.6bed")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("6 bed rent must be a positive number"),
  body("rents.7bed")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("7 bed rent must be a positive number"),
  handleValidationErrors,
];

// Bulk import Section 8 data validation
const bulkImportSection8DataValidation = [
  body("importData")
    .isArray({ max: 1000 })
    .withMessage("importData must be an array with up to 1000 items"),
  body("importData.*.zipCode")
    .isString()
    .matches(/^\d{5}$/)
    .withMessage("Invalid zip code format"),
  body("importData.*.zone")
    .isInt({ min: 1, max: 19 })
    .withMessage("Zone must be between 1 and 19"),
  body("importData.*.rents")
    .optional()
    .isObject()
    .withMessage("Rents must be an object"),
  handleValidationErrors,
];

// Import assumptions validation
const importAssumptionsValidation = [
  body().isObject().withMessage("Import data must be an object"),
  body("ltrVacancyMonths")
    .optional()
    .isFloat({ min: 0, max: 12 })
    .withMessage("LTR vacancy months must be between 0 and 12"),
  body("section8VacancyMonths")
    .optional()
    .isFloat({ min: 0, max: 12 })
    .withMessage("Section 8 vacancy months must be between 0 and 12"),
  body("maintenancePercent")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Maintenance percent must be between 0 and 100"),
  body("rentGrowthPercent")
    .optional()
    .isFloat({ min: -100, max: 100 })
    .withMessage("Rent growth percent must be between -100 and 100"),
  body("appreciationPercent")
    .optional()
    .isFloat({ min: -100, max: 100 })
    .withMessage("Appreciation percent must be between -100 and 100"),
  body("propertyTaxIncreasePercent")
    .optional()
    .isFloat({ min: -100, max: 100 })
    .withMessage("Property tax increase percent must be between -100 and 100"),
  body("insuranceIncreasePercent")
    .optional()
    .isFloat({ min: -100, max: 100 })
    .withMessage("Insurance increase percent must be between -100 and 100"),
  body("section8ZipData")
    .optional()
    .isArray()
    .withMessage("Section 8 zip data must be an array"),
  handleValidationErrors,
];

module.exports = {
  idValidation,
  zipCodeParamValidation,
  getDealsValidation,
  createDealValidation,
  updateDealValidation,
  bulkCreateDealsValidation,

  getSection8RentValidation,
  updateAssumptionsValidation,
  updateSection8ZipDataValidation,
  addSection8ZipEntryValidation,
  bulkImportSection8DataValidation,
  importAssumptionsValidation,
  handleValidationErrors,
};
