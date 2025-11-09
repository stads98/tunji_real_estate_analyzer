// backend_service/src/services/pipeline-stats.service.js
const Deal = require("../../schemas/deal.model");
const logger = require("../../config/logger");

class PipelineStatsService {
  // Get pipeline statistics
  async getPipelineStats({ timeFrame = "month", startDate, endDate }) {
    try {
      // Calculate date range
      const dateRange = this.calculateDateRange(timeFrame, startDate, endDate);

      const deals = await Deal.find({
        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
        isActive: true,
      });

      // Calculate statistics
      const stats = {
        dealsCreated: deals.length,
        dealsToStage5: deals.filter((deal) =>
          ["stage4-ready-offer", "stage5-offer-submitted"].includes(
            deal.dealStage
          )
        ).length,
        dealsWithMaxOffer: deals.filter(
          (deal) => deal.maxOffer && deal.maxOffer > 0
        ).length,
        currentStage5: deals.filter((deal) =>
          ["stage4-ready-offer", "stage5-offer-submitted"].includes(
            deal.dealStage
          )
        ).length,
        avgDaysToStage5: this.calculateAvgDaysToStage5(deals),
        conversionRate: this.calculateConversionRate(deals),
        avgMaxOffer: this.calculateAvgMaxOffer(deals),
        stageDistribution: this.calculateStageDistribution(deals),
      };

      await logger.info("Pipeline stats calculated", {
        service: "PipelineStatsService",
        method: "getPipelineStats",
        timeFrame,
        dealCount: deals.length,
      });

      return stats;
    } catch (error) {
      await logger.error(error, {
        service: "PipelineStatsService",
        method: "getPipelineStats",
      });
      throw error;
    }
  }

  // Calculate date range based on timeframe
  calculateDateRange(timeFrame, customStart, customEnd) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (timeFrame) {
      case "today":
        return { start: today, end: now };
      case "week":
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        return { start: weekStart, end: now };
      case "month":
        const monthStart = new Date(today);
        monthStart.setDate(today.getDate() - 30);
        return { start: monthStart, end: now };
      case "custom":
        return {
          start: new Date(customStart),
          end: new Date(customEnd),
        };
      default:
        return { start: today, end: now };
    }
  }

  // Calculate average days to reach Stage 5
  calculateAvgDaysToStage5(deals) {
    const stage5Deals = deals.filter(
      (deal) =>
        ["stage4-ready-offer", "stage5-offer-submitted"].includes(
          deal.dealStage
        ) &&
        deal.createdAt &&
        deal.stageUpdatedAt
    );

    if (stage5Deals.length === 0) return 0;

    const totalDays = stage5Deals.reduce((sum, deal) => {
      const created = new Date(deal.createdAt);
      const stageUpdate = new Date(deal.stageUpdatedAt);
      const days = Math.floor(
        (stageUpdate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
      );
      return sum + days;
    }, 0);

    return Math.round(totalDays / stage5Deals.length);
  }

  // Calculate conversion rate (deals created -> deals to Stage 5)
  calculateConversionRate(deals) {
    const dealsToStage5 = deals.filter((deal) =>
      ["stage4-ready-offer", "stage5-offer-submitted"].includes(deal.dealStage)
    ).length;

    return deals.length > 0
      ? Math.round((dealsToStage5 / deals.length) * 100)
      : 0;
  }

  // Calculate average max offer
  calculateAvgMaxOffer(deals) {
    const dealsWithMaxOffer = deals.filter(
      (deal) => deal.maxOffer && deal.maxOffer > 0
    );

    if (dealsWithMaxOffer.length === 0) return 0;

    const totalMaxOffer = dealsWithMaxOffer.reduce(
      (sum, deal) => sum + deal.maxOffer,
      0
    );
    return Math.round(totalMaxOffer / dealsWithMaxOffer.length);
  }

  // Calculate stage distribution
  calculateStageDistribution(deals) {
    return {
      stage1: deals.filter((d) => d.dealStage === "stage1-basic-data").length,
      stage2: deals.filter((d) => d.dealStage === "stage2-ready-comps").length,
      stage3: deals.filter((d) => d.dealStage === "stage3-data-collection")
        .length,
      stage4: deals.filter((d) => d.dealStage === "stage4-ready-offer").length,
      stage5: deals.filter((d) => d.dealStage === "stage5-offer-submitted")
        .length,
      stage6: deals.filter((d) =>
        ["stage6-accepted", "stage6-rejected", "stage6-counter"].includes(
          d.dealStage
        )
      ).length,
      archived: deals.filter((d) => d.dealStage === "archived").length,
    };
  }

  // Get deal stage timeline
  async getDealStageTimeline(dealId) {
    try {
      const deal = await Deal.findById(dealId);

      if (!deal) {
        throw new Error("Deal not found");
      }

      // This would typically come from an audit log
      // For now, we'll create a simple timeline
      const timeline = [
        {
          stage: deal.dealStage || "stage1-basic-data",
          timestamp: deal.stageUpdatedAt || deal.createdAt,
          description: `Moved to ${deal.dealStage || "Stage 1"}`,
        },
      ];

      if (deal.createdAt) {
        timeline.unshift({
          stage: "created",
          timestamp: deal.createdAt,
          description: "Deal created",
        });
      }

      await logger.info("Deal stage timeline retrieved", {
        service: "PipelineStatsService",
        method: "getDealStageTimeline",
        dealId,
      });

      return timeline.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
    } catch (error) {
      await logger.error(error, {
        service: "PipelineStatsService",
        method: "getDealStageTimeline",
        dealId,
      });
      throw error;
    }
  }
}

module.exports = new PipelineStatsService();
