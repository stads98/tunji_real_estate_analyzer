// backend_service/schemas/user-settings.model.js
const mongoose = require("mongoose");

const userSettingsSchema = new mongoose.Schema(
  {
    user1Name: {
      type: String,
      default: "Dan",
    },
    user2Name: {
      type: String,
      default: "Eman",
    },
     user3Name: {
      type: String,
      default: "Ayhumi",
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Single document for user settings
userSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const UserSettings = mongoose.model("UserSettings", userSettingsSchema);
module.exports = UserSettings;
