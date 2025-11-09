// backend_service/routes/sub routes/pipeline-stats.routes.js
const express = require("express");
const router = express.Router();
const pipelineStatsController = require("../../controllers/pipeline-stats.controller");
const {
  getPipelineStatsValidation,
  getDealStageTimelineValidation,
} = require("../../validators/team.validators");

// Pipeline stats routes
router
  .route("/")
  .get(getPipelineStatsValidation, pipelineStatsController.getPipelineStats);

// Deal stage timeline
router
  .route("/deals/:id/stage-timeline")
  .get(
    getDealStageTimelineValidation,
    pipelineStatsController.getDealStageTimeline
  );

module.exports = router;
