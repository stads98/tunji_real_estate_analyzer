// backend_service/src/services/globalAssumptions.service.js
const GlobalAssumptions = require("../../schemas/globalAssumptions.model");
const logger = require("../../config/logger");

class GlobalAssumptionsService {
  // Get global assumptions for user
  async getAssumptions() {
    try {
      let assumptions = await GlobalAssumptions.findOne({
        isActive: true,
      });

      if (!assumptions) {
        // Create default assumptions if none exist
        assumptions = await this.createDefaultAssumptions();
      }

      await logger.info("Global assumptions retrieved", {
        service: "GlobalAssumptionsService",
        method: "getAssumptions",
        section8ZipCount: assumptions.section8ZipData?.length || 0,
      });

      return assumptions;
    } catch (error) {
      await logger.error(error, {
        service: "GlobalAssumptionsService",
        method: "getAssumptions",
      });
      throw error;
    }
  }

  // Update global assumptions with validation
  async updateAssumptions(updateData) {
    try {
      let assumptions = await GlobalAssumptions.findOne({
        isActive: true,
      });

      // Validate update data
      const validatedData = this.validateAssumptionsData(updateData);

      if (assumptions) {
        // Update existing
        assumptions = await GlobalAssumptions.findOneAndUpdate(
          { isActive: true },
          { ...validatedData, updatedAt: new Date() },
          { new: true, runValidators: true }
        );
      } else {
        // Create new
        assumptions = new GlobalAssumptions({
          ...validatedData,
          isActive: true,
        });
        await assumptions.save();
      }

      await logger.info("Global assumptions updated", {
        service: "GlobalAssumptionsService",
        method: "updateAssumptions",
        updatedFields: Object.keys(updateData),
      });

      return assumptions;
    } catch (error) {
      await logger.error(error, {
        service: "GlobalAssumptionsService",
        method: "updateAssumptions",
      });
      throw error;
    }
  }

  // Create default assumptions
  async createDefaultAssumptions() {
    try {
      const defaultAssumptions = new GlobalAssumptions({
        ltrVacancyMonths: 1,
        section8VacancyMonths: 0.5,
        maintenancePercent: 5,
        rentGrowthPercent: 3,
        appreciationPercent: 3,
        propertyTaxIncreasePercent: 3,
        insuranceIncreasePercent: 5,
        section8ZipData: this.getDefaultSection8Data(),
        isActive: true,
      });

      await defaultAssumptions.save();

      await logger.info("Default assumptions created", {
        service: "GlobalAssumptionsService",
        method: "createDefaultAssumptions",
      });

      return defaultAssumptions;
    } catch (error) {
      await logger.error(error, {
        service: "GlobalAssumptionsService",
        method: "createDefaultAssumptions",
      });
      throw error;
    }
  }

  // Update Section 8 zip data
  async updateSection8ZipData(zipData) {
    try {
      const assumptions = await this.getAssumptions();

      // Validate and normalize zip data
      const validatedZipData = this.validateAndNormalizeZipData(zipData);

      assumptions.section8ZipData = validatedZipData;
      await assumptions.save();

      await logger.info("Section 8 zip data updated", {
        service: "GlobalAssumptionsService",
        method: "updateSection8ZipData",
        zipCount: validatedZipData.length,
      });

      return assumptions;
    } catch (error) {
      await logger.error(error, {
        service: "GlobalAssumptionsService",
        method: "updateSection8ZipData",
      });
      throw error;
    }
  }

  // Add single Section 8 zip entry
  async addSection8ZipEntry(zipEntry) {
    try {
      const assumptions = await this.getAssumptions();

      // Validate the new entry
      const validatedEntry = this.validateZipEntry(zipEntry);

      // Check if zip already exists
      const existingIndex = assumptions.section8ZipData.findIndex(
        (z) => z.zipCode === validatedEntry.zipCode
      );

      if (existingIndex >= 0) {
        assumptions.section8ZipData[existingIndex] = validatedEntry;
      } else {
        assumptions.section8ZipData.push(validatedEntry);
      }

      await assumptions.save();

      await logger.info("Section 8 zip entry added/updated", {
        service: "GlobalAssumptionsService",
        method: "addSection8ZipEntry",
        zipCode: validatedEntry.zipCode,
      });

      return assumptions;
    } catch (error) {
      await logger.error(error, {
        service: "GlobalAssumptionsService",
        method: "addSection8ZipEntry",
        zipCode: zipEntry.zipCode,
      });
      throw error;
    }
  }

  // Remove Section 8 zip entry
  async removeSection8ZipEntry(zipCode) {
    try {
      const assumptions = await this.getAssumptions();

      assumptions.section8ZipData = assumptions.section8ZipData.filter(
        (z) => z.zipCode !== zipCode
      );

      await assumptions.save();

      await logger.info("Section 8 zip entry removed", {
        service: "GlobalAssumptionsService",
        method: "removeSection8ZipEntry",
        zipCode,
      });

      return assumptions;
    } catch (error) {
      await logger.error(error, {
        service: "GlobalAssumptionsService",
        method: "removeSection8ZipEntry",
        zipCode,
      });
      throw error;
    }
  }

  // Get Section 8 rent for specific zip and bedroom count
  async getSection8RentForZip(zipCode, beds) {
    try {
      const assumptions = await this.getAssumptions();
      const zipData = assumptions.section8ZipData.find(
        (z) => z.zipCode === zipCode
      );

      if (!zipData || !zipData.rents) {
        return null;
      }

      // Convert beds to the appropriate key
      let bedKey;
      if (beds === 0) {
        bedKey = "studio";
      } else {
        bedKey = `${beds}bed`;
      }

      return zipData.rents[bedKey] || null;
    } catch (error) {
      await logger.error(error, {
        service: "GlobalAssumptionsService",
        method: "getSection8RentForZip",
        zipCode,
        beds,
      });
      return null;
    }
  }

  // Bulk import Section 8 data
  async bulkImportSection8Data(importData) {
    try {
      const assumptions = await this.getAssumptions();

      // Process and validate all entries
      const validatedEntries = importData
        .map((entry) => this.validateZipEntry(entry))
        .filter((entry) => entry !== null);

      // Merge with existing data
      const existingMap = new Map(
        assumptions.section8ZipData.map((z) => [z.zipCode, z])
      );

      validatedEntries.forEach((entry) => {
        existingMap.set(entry.zipCode, entry);
      });

      assumptions.section8ZipData = Array.from(existingMap.values());
      await assumptions.save();

      await logger.info("Section 8 data bulk imported", {
        service: "GlobalAssumptionsService",
        method: "bulkImportSection8Data",
        importedCount: validatedEntries.length,
      });

      return assumptions;
    } catch (error) {
      await logger.error(error, {
        service: "GlobalAssumptionsService",
        method: "bulkImportSection8Data",
        importCount: importData.length,
      });
      throw error;
    }
  }

  // Reset assumptions to defaults
  async resetToDefaults() {
    try {
      await GlobalAssumptions.findOneAndUpdate(
        { isActive: true },
        { isActive: false }
      );

      const defaultAssumptions = await this.createDefaultAssumptions();

      await logger.info("Assumptions reset to defaults", {
        service: "GlobalAssumptionsService",
        method: "resetToDefaults",
      });

      return defaultAssumptions;
    } catch (error) {
      await logger.error(error, {
        service: "GlobalAssumptionsService",
        method: "resetToDefaults",
      });
      throw error;
    }
  }

  // Export assumptions for backup or transfer
  async exportAssumptions() {
    try {
      const assumptions = await this.getAssumptions();

      const exportData = {
        ...assumptions.toObject(),
        exportVersion: "1.0",
        exportDate: new Date().toISOString(),
      };

      // Remove internal fields
      delete exportData._id;
      delete exportData.isActive;
      delete exportData.__v;

      return exportData;
    } catch (error) {
      await logger.error(error, {
        service: "GlobalAssumptionsService",
        method: "exportAssumptions",
      });
      throw error;
    }
  }

  // Import assumptions from backup
  async importAssumptions(importData) {
    try {
      // Validate import data structure
      if (!importData || typeof importData !== "object") {
        throw new Error("Invalid import data format");
      }

      // Update with imported data
      const assumptions = await this.updateAssumptions(importData);

      await logger.info("Assumptions imported successfully", {
        service: "GlobalAssumptionsService",
        method: "importAssumptions",
        importedFields: Object.keys(importData),
      });

      return assumptions;
    } catch (error) {
      await logger.error(error, {
        service: "GlobalAssumptionsService",
        method: "importAssumptions",
      });
      throw error;
    }
  }

  // ========== PRIVATE HELPER METHODS ==========

  // Validate assumptions data before saving
  validateAssumptionsData(data) {
    const validated = { ...data };

    // Ensure percentages are within reasonable bounds
    if (validated.maintenancePercent !== undefined) {
      validated.maintenancePercent = Math.max(
        0,
        Math.min(50, validated.maintenancePercent)
      );
    }

    if (validated.rentGrowthPercent !== undefined) {
      validated.rentGrowthPercent = Math.max(
        -10,
        Math.min(20, validated.rentGrowthPercent)
      );
    }

    // Ensure vacancy months are reasonable
    if (validated.ltrVacancyMonths !== undefined) {
      validated.ltrVacancyMonths = Math.max(
        0,
        Math.min(12, validated.ltrVacancyMonths)
      );
    }

    return validated;
  }

  // Validate and normalize Section 8 zip data
  validateAndNormalizeZipData(zipData) {
    return zipData
      .map((entry) => this.validateZipEntry(entry))
      .filter((entry) => entry !== null)
      .sort((a, b) => a.zipCode.localeCompare(b.zipCode));
  }

  // Validate single zip entry
  validateZipEntry(entry) {
    if (!entry.zipCode || !/^\d{5}$/.test(entry.zipCode)) {
      return null;
    }

    if (!entry.zone || entry.zone < 1 || entry.zone > 19) {
      return null;
    }

    // Ensure all rent fields are numbers
    const validatedRents = {};
    const bedTypes = [
      "studio",
      "1bed",
      "2bed",
      "3bed",
      "4bed",
      "5bed",
      "6bed",
      "7bed",
    ];

    bedTypes.forEach((bedType) => {
      const rent = entry.rents?.[bedType];
      validatedRents[bedType] =
        rent && !isNaN(rent) ? Math.max(0, Number(rent)) : undefined;
    });

    return {
      zipCode: entry.zipCode,
      zone: Number(entry.zone),
      rents: validatedRents,
    };
  }

  // Get default Section 8 data
  getDefaultSection8Data() {
    return [
      {
        zipCode: "33301",
        zone: 1,
        rents: {
          studio: 1200,
          "1bed": 1300,
          "2bed": 1500,
          "3bed": 1800,
          "4bed": 2100,
        },
      },
    ];
  }
}

module.exports = new GlobalAssumptionsService();
