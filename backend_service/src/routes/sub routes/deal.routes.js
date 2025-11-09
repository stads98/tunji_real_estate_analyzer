// routes/deal.routes.js
const express = require("express");
const router = express.Router();
const dealController = require("../../controllers/deal.controller");
const assumptionsController = require("../../controllers/globalAssumptions.controller");
const {
  idValidation,
  getDealsValidation,
  createDealValidation,
  updateDealValidation,
  bulkCreateDealsValidation,
  updateAssumptionsValidation,
  updateSection8ZipDataValidation,
  addSection8ZipEntryValidation,
  bulkImportSection8DataValidation,
  importAssumptionsValidation,
  zipCodeParamValidation,
  getSection8RentValidation,
} = require("../../validators/deal.validators");

// ========== DEAL ROUTES ==========

// Deal collection routes
router
  .route("/")
  .get(getDealsValidation, dealController.getDeals)
  .post(createDealValidation, dealController.createDeal)
  .delete(dealController.deleteAllDeals);

// Bulk operations
router
  .route("/bulk")
  .post(bulkCreateDealsValidation, dealController.bulkCreateDeals);

router.route("/export").get(dealController.exportDeals);

// Statistics
router.route("/statistics").get(dealController.getDealStatistics);

// Individual deal routes
router
  .route("/:id")
  .get(idValidation, dealController.getDeal)
  .put(idValidation, updateDealValidation, dealController.updateDeal)
  .delete(idValidation, dealController.deleteDeal);

// ========== GLOBAL ASSUMPTIONS ROUTES ==========

// Main assumptions routes
router
  .route("/assumptions/global")
  .get(assumptionsController.getAssumptions)
  .put(updateAssumptionsValidation, assumptionsController.updateAssumptions)
  .delete(assumptionsController.resetAssumptions);

// Section 8 data management
router
  .route("/assumptions/section8")
  .put(
    updateSection8ZipDataValidation,
    assumptionsController.updateSection8ZipData
  )
  .post(
    addSection8ZipEntryValidation,
    assumptionsController.addSection8ZipEntry
  )
  .get(getSection8RentValidation, assumptionsController.getSection8Rent);

// Individual Section 8 zip operations
router
  .route("/assumptions/section8/:zipCode")
  .delete(zipCodeParamValidation, assumptionsController.removeSection8ZipEntry);

// Bulk Section 8 operations
router
  .route("/assumptions/section8/bulk/import")
  .post(
    bulkImportSection8DataValidation,
    assumptionsController.bulkImportSection8Data
  );

// Assumptions utilities
router
  .route("/assumptions/export")
  .get(assumptionsController.exportAssumptions);

router
  .route("/assumptions/import")
  .post(importAssumptionsValidation, assumptionsController.importAssumptions);

router
  .route("/bulk-with-staging")
  .post( dealController.bulkCreateDealsWithStaging);

module.exports = router;
