// backend_service/src/services/deal.service.js
const Deal = require("../../schemas/deal.model");
const GlobalAssumptions = require("../../schemas/globalAssumptions.model");
const logger = require("../../config/logger");

class DealService {
  // Get all deals for user with pagination and filtering
  async getDeals({
    page = 1,
    limit = 10,
    search,
    minPrice,
    maxPrice,
    minUnits,
    maxUnits,
    isRehab,
    sortBy = "createdAt",
    sortOrder = "desc",
  }) {
    try {
      let query = { isActive: true };

      // Search across address
      if (search) {
        query.$or = [
          { address: { $regex: search, $options: "i" } },
          { "notes.realtorName": { $regex: search, $options: "i" } },
        ];
      }

      // Filter by price range
      if (minPrice || maxPrice) {
        query.purchasePrice = {};
        if (minPrice) query.purchasePrice.$gte = parseInt(minPrice);
        if (maxPrice) query.purchasePrice.$lte = parseInt(maxPrice);
      }

      // Filter by units
      if (minUnits || maxUnits) {
        query.units = {};
        if (minUnits) query.units.$gte = parseInt(minUnits);
        if (maxUnits) query.units.$lte = parseInt(maxUnits);
      }

      // Filter by rehab status
      if (isRehab !== undefined) {
        query.isRehab = isRehab === "true";
      }

      // Sort options
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

      const deals = await Deal.find(query)
        .select("-isActive -__v")
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort(sortOptions);

      const total = await Deal.countDocuments(query);

      await logger.info("Deals retrieved successfully", {
        service: "DealService",
        method: "getDeals",
        count: deals.length,
        total,
        page,
        limit,
      });

      return {
        deals,
        pagination: {
          total_pages: Math.ceil(total / limit),
          current_page: parseInt(page),
          total,
          limit: parseInt(limit),
          has_more: page < Math.ceil(total / limit),
        },
      };
    } catch (error) {
      await logger.error(error, {
        service: "DealService",
        method: "getDeals",
      });
      throw error;
    }
  }

  // Get deal by ID - simplified, no calculations
  async getDealById(dealId) {
    try {
      const deal = await Deal.findOne({ _id: dealId, isActive: true });

      if (!deal) {
        throw new Error("Deal not found");
      }

      // Get user's global assumptions
      const assumptions = await GlobalAssumptions.findOne({
        isActive: true,
      });

      await logger.info("Deal retrieved", {
        service: "DealService",
        method: "getDealById",
        dealId,
      });

      return {
        deal,
        assumptions: assumptions || this.getDefaultAssumptions(),
      };
    } catch (error) {
      await logger.error(error, {
        service: "DealService",
        method: "getDealById",
        dealId,
      });
      throw error;
    }
  }

  // Create new deal - simplified, no auto-calculations
  async createDeal(dealData) {
    try {
      const deal = new Deal({
        ...dealData,
        schemaVersion: 3,
      });

      await deal.save();

      await logger.info("Deal created successfully", {
        service: "DealService",
        method: "createDeal",
        dealId: deal._id,
        address: deal.address,
      });

      return deal;
    } catch (error) {
      await logger.error(error, {
        service: "DealService",
        method: "createDeal",
      });
      throw error;
    }
  }

  // Update deal - simplified, no recalculations
  async updateDeal(dealId, updateData) {
    try {
      const existingDeal = await Deal.findOne({
        _id: dealId,
        isActive: true,
      });

      if (!existingDeal) {
        throw new Error("Deal not found");
      }

      const deal = await Deal.findOneAndUpdate(
        { _id: dealId, isActive: true },
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      await logger.info("Deal updated successfully", {
        service: "DealService",
        method: "updateDeal",
        dealId,
        updatedFields: Object.keys(updateData),
      });

      return deal;
    } catch (error) {
      await logger.error(error, {
        service: "DealService",
        method: "updateDeal",
        dealId,
      });
      throw error;
    }
  }

  // Permanently delete deal
  async deleteDeal(dealId) {
    try {
      const deal = await Deal.findByIdAndDelete(dealId);

      if (!deal) {
        throw new Error("Deal not found");
      }

      await logger.info("Deal permanently deleted", {
        service: "DealService",
        method: "deleteDeal",
        dealId,
        address: deal.address,
      });

      return { message: "Deal permanently deleted successfully" };
    } catch (error) {
      await logger.error(error, {
        service: "DealService",
        method: "deleteDeal",
        dealId,
      });
      throw error;
    }
  }

  // Bulk create deals - simplified, no processing
  async bulkCreateDeals(dealsData) {
    try {
      const dealsWithUser = dealsData.map((dealData) => ({
        ...dealData,
        schemaVersion: 3,
      }));

      const result = await Deal.insertMany(dealsWithUser);

      await logger.info("Bulk deals created successfully", {
        service: "DealService",
        method: "bulkCreateDeals",
        count: result.length,
      });

      return result;
    } catch (error) {
      await logger.error(error, {
        service: "DealService",
        method: "bulkCreateDeals",
        dealCount: dealsData.length,
      });
      throw error;
    }
  }

  // Export deals - raw data only, no enhancements
  async exportDeals() {
    try {
      const deals = await Deal.find({ isActive: true })
        .select("-isActive -__v")
        .sort({ createdAt: -1 });

      await logger.info("Deals exported successfully", {
        service: "DealService",
        method: "exportDeals",
        count: deals.length,
      });

      return deals;
    } catch (error) {
      await logger.error(error, {
        service: "DealService",
        method: "exportDeals",
      });
      throw error;
    }
  }

  // Get deal statistics - simple counts only
  async getDealStatistics() {
    try {
      const deals = await Deal.find({ isActive: true });

      const stats = {
        totalDeals: deals.length,
        totalInvestment: deals.reduce(
          (sum, deal) => sum + deal.purchasePrice,
          0
        ),
        rehabDeals: deals.filter((deal) => deal.isRehab).length,
        multiFamilyDeals: deals.filter((deal) => deal.units > 1).length,
        avgPrice:
          deals.length > 0
            ? deals.reduce((sum, deal) => sum + deal.purchasePrice, 0) /
              deals.length
            : 0,
        avgUnits:
          deals.length > 0
            ? deals.reduce((sum, deal) => sum + deal.units, 0) / deals.length
            : 0,
      };

      return stats;
    } catch (error) {
      await logger.error(error, {
        service: "DealService",
        method: "getDealStatistics",
      });
      throw error;
    }
  }

  // Get default assumptions
  getDefaultAssumptions() {
    return {
      ltrVacancyMonths: 1,
      section8VacancyMonths: 0.5,
      maintenancePercent: 5,
      rentGrowthPercent: 3,
      appreciationPercent: 3,
      propertyTaxIncreasePercent: 3,
      insuranceIncreasePercent: 5,
      section8ZipData: [],
    };
  }

  // Delete all deals
  async deleteAllDeals() {
    try {
      const result = await Deal.deleteMany({});

      await logger.info("All deals deleted permanently", {
        service: "DealService",
        method: "deleteAllDeals",
        deletedCount: result.deletedCount,
      });

      return {
        message: "All deals deleted successfully",
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      await logger.error(error, {
        service: "DealService",
        method: "deleteAllDeals",
      });
      throw error;
    }
  }
}

module.exports = new DealService();
