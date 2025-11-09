// backend_service/src/services/team-notes.service.js
const TeamNote = require("../../schemas/team-notes.model");
const UserSettings = require("../../schemas/user-settings.model");
const logger = require("../../config/logger");

class TeamNotesService {
  // Get all team notes with filtering
  async getTeamNotes({
    dealId,
    author,
    dateFilter = "all",
    sortBy = "pinned",
    search,
    page = 1,
    limit = 50,
  }) {
    try {
      let query = {};

      // Filter by deal
      if (dealId && dealId !== "all") {
        query.dealId = dealId;
      }

      // Filter by author
      if (author && author !== "all") {
        query.author = author;
      }

      // Date filtering
      if (dateFilter !== "all") {
        const now = new Date();
        let startDate;

        switch (dateFilter) {
          case "today":
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case "week":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        }

        if (startDate) {
          query.createdAt = { $gte: startDate };
        }
      }

      // Search in message
      if (search) {
        query.message = { $regex: search, $options: "i" };
      }

      // Sort options
      let sortOptions = {};
      switch (sortBy) {
        case "newest":
          sortOptions = { createdAt: -1 };
          break;
        case "oldest":
          sortOptions = { createdAt: 1 };
          break;
        case "pinned":
          sortOptions = { isPinned: -1, createdAt: -1 };
          break;
      }

      const notes = await TeamNote.find(query)
        .sort(sortOptions)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await TeamNote.countDocuments(query);

      await logger.info("Team notes retrieved", {
        service: "TeamNotesService",
        method: "getTeamNotes",
        count: notes.length,
        filters: { dealId, author, dateFilter, search },
      });

      return {
        notes,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      await logger.error(error, {
        service: "TeamNotesService",
        method: "getTeamNotes",
      });
      throw error;
    }
  }

  // Create team note
  async createTeamNote(noteData) {
    try {
      const note = new TeamNote({
        ...noteData,
        timestamp: new Date(),
      });

      await note.save();

      // Populate with deal info if needed
      await note.populate("dealId", "address");

      await logger.info("Team note created", {
        service: "TeamNotesService",
        method: "createTeamNote",
        noteId: note._id,
        dealId: noteData.dealId,
        author: noteData.author,
      });

      return note;
    } catch (error) {
      await logger.error(error, {
        service: "TeamNotesService",
        method: "createTeamNote",
      });
      throw error;
    }
  }

  // Update team note (primarily for pinning)
  async updateTeamNote(noteId, updateData) {
    try {
      const note = await TeamNote.findByIdAndUpdate(noteId, updateData, {
        new: true,
        runValidators: true,
      });

      if (!note) {
        throw new Error("Team note not found");
      }

      await logger.info("Team note updated", {
        service: "TeamNotesService",
        method: "updateTeamNote",
        noteId,
        updatedFields: Object.keys(updateData),
      });

      return note;
    } catch (error) {
      await logger.error(error, {
        service: "TeamNotesService",
        method: "updateTeamNote",
        noteId,
      });
      throw error;
    }
  }

  // Delete team note
  async deleteTeamNote(noteId) {
    try {
      const note = await TeamNote.findByIdAndDelete(noteId);

      if (!note) {
        throw new Error("Team note not found");
      }

      await logger.info("Team note deleted", {
        service: "TeamNotesService",
        method: "deleteTeamNote",
        noteId,
      });

      return { message: "Team note deleted successfully" };
    } catch (error) {
      await logger.error(error, {
        service: "TeamNotesService",
        method: "deleteTeamNote",
        noteId,
      });
      throw error;
    }
  }

  // Delete all team notes
  async deleteAllTeamNotes() {
    try {
      const result = await TeamNote.deleteMany({});

      await logger.info("All team notes deleted", {
        service: "TeamNotesService",
        method: "deleteAllTeamNotes",
        deletedCount: result.deletedCount,
      });

      return {
        message: "All team notes deleted successfully",
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      await logger.error(error, {
        service: "TeamNotesService",
        method: "deleteAllTeamNotes",
      });
      throw error;
    }
  }

  // Get user settings
  async getUserSettings() {
    try {
      const settings = await UserSettings.getSettings();

      await logger.info("User settings retrieved", {
        service: "TeamNotesService",
        method: "getUserSettings",
      });

      return settings;
    } catch (error) {
      await logger.error(error, {
        service: "TeamNotesService",
        method: "getUserSettings",
      });
      throw error;
    }
  }

  // Update user settings
  async updateUserSettings(updateData) {
    try {
      const settings = await UserSettings.getSettings();

      const updatedSettings = await UserSettings.findByIdAndUpdate(
        settings._id,
        updateData,
        { new: true, runValidators: true }
      );

      await logger.info("User settings updated", {
        service: "TeamNotesService",
        method: "updateUserSettings",
        updatedFields: Object.keys(updateData),
      });

      return updatedSettings;
    } catch (error) {
      await logger.error(error, {
        service: "TeamNotesService",
        method: "updateUserSettings",
      });
      throw error;
    }
  }
}

module.exports = new TeamNotesService();
