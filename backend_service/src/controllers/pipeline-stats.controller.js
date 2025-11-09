// backend_service/controllers/pipeline-stats.controller.js
const pipelineStatsService = require("../services/pipeline-stats.service");
const { sendResponse } = require("../utils/utils");
const { STATUS, ERROR_MESSAGES } = require("../constants/constants");
const logger = require("../../config/logger");

class PipelineStatsController {
  // Get pipeline statistics
  async getPipelineStats(req, res) {
    try {
      const {
        timeFrame = 'month',
        startDate,
        endDate,
      } = req.query;

      const stats = await pipelineStatsService.getPipelineStats({
        timeFrame,
        startDate,
        endDate,
      });

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: stats,
        message: "Pipeline statistics retrieved successfully",
      });
    } catch (error) {
      await logger.error(error, {
        controller: "PipelineStatsController",
        method: "getPipelineStats",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Get deal stage timeline
  async getDealStageTimeline(req, res) {
    try {
      const { id } = req.params;

      const timeline = await pipelineStatsService.getDealStageTimeline(id);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: timeline,
        message: "Deal stage timeline retrieved successfully",
      });
    } catch (error) {
      await logger.error(error, {
        controller: "PipelineStatsController",
        method: "getDealStageTimeline",
        dealId: req.params.id,
      });

      if (error.message === "Deal not found") {
        return sendResponse(res, 404, {
          status: STATUS.FAILED,
          message: ERROR_MESSAGES.NOT_FOUND,
        });
      }

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }
}

const pipelineStatsController = new PipelineStatsController();
module.exports = pipelineStatsController;