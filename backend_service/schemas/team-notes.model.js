// backend_service/schemas/team-notes.model.js
const mongoose = require("mongoose");

const teamNoteSchema = new mongoose.Schema(
  {
    dealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deal",
      required: true,
    },
    author: {
      type: String,
      enum: ["user1", "user2", "user3", "system"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isSystemNote: {
      type: Boolean,
      default: false,
    },
    changeType: {
      type: String,
      enum: ["stage", "maxOffer", "rehab", "offMarket", "price", null],
      default: null,
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

// Indexes for better query performance
teamNoteSchema.index({ dealId: 1, createdAt: -1 });
teamNoteSchema.index({ author: 1 });
teamNoteSchema.index({ isPinned: 1 });
teamNoteSchema.index({ isSystemNote: 1 });
teamNoteSchema.index({ createdAt: -1 });

const TeamNote = mongoose.model("TeamNote", teamNoteSchema);
module.exports = TeamNote;
