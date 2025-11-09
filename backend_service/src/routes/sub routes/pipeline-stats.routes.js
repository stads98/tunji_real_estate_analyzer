// backend_service/routes/sub routes/pipeline-stats.routes.js
const express = require("express");
const router = express.Router();
const pipelineStatsController = require("../../controllers/pipeline-stats.controller");

// Pipeline stats routes
router.route("/").get(pipelineStatsController.getPipelineStats);

// Deal stage timeline
router
  .route("/deals/:id/stage-timeline")
  .get(pipelineStatsController.getDealStageTimeline);

module.exports = router;
