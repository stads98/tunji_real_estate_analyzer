//backend_service/schemas/globalAssumptions.model.js
const mongoose = require("mongoose");

const section8ZipDataSchema = new mongoose.Schema(
  {
    zipCode: { type: String, required: true },
    zone: { type: Number, required: true },
    rents: {
      studio: Number,
      "1bed": Number,
      "2bed": Number,
      "3bed": Number,
      "4bed": Number,
      "5bed": Number,
      "6bed": Number,
      "7bed": Number,
    },
  },
  { _id: false }
);

const globalAssumptionsSchema = new mongoose.Schema(
  {
    ltrVacancyMonths: { type: Number, default: 1 },
    section8VacancyMonths: { type: Number, default: 0.5 },
    maintenancePercent: { type: Number, default: 5 },
    rentGrowthPercent: { type: Number, default: 3 },
    appreciationPercent: { type: Number, default: 3 },
    propertyTaxIncreasePercent: { type: Number, default: 3 },
    insuranceIncreasePercent: { type: Number, default: 5 },
    section8ZipData: [section8ZipDataSchema],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const GlobalAssumptions = mongoose.model(
  "GlobalAssumptions",
  globalAssumptionsSchema
);
module.exports = GlobalAssumptions;
