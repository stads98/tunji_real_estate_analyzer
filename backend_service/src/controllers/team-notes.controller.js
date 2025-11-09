// backend_service/controllers/team-notes.controller.js
const teamNotesService = require("../services/team-notes.service");
const { sendResponse } = require("../utils/utils");
const { STATUS, ERROR_MESSAGES } = require("../constants/constants");
const logger = require("../../config/logger");

class TeamNotesController {
  // Get all team notes
  async getTeamNotes(req, res) {
    try {
      const {
        dealId,
        author,
        dateFilter = "all",
        sortBy = "pinned",
        search,
        page = 1,
        limit = 50,
      } = req.query;

      const result = await teamNotesService.getTeamNotes({
        dealId,
        author,
        dateFilter,
        sortBy,
        search,
        page: parseInt(page),
        limit: parseInt(limit),
      });

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: result.notes,
        pagination: result.pagination,
        message: "Team notes retrieved successfully",
      });
    } catch (error) {
      await logger.error(error, {
        controller: "TeamNotesController",
        method: "getTeamNotes",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Create team note
  async createTeamNote(req, res) {
    try {
      const noteData = req.body;

      const note = await teamNotesService.createTeamNote(noteData);

      return sendResponse(res, 201, {
        status: STATUS.SUCCESS,
        data: note,
        message: "Team note created successfully",
      });
    } catch (error) {
      await logger.error(error, {
        controller: "TeamNotesController",
        method: "createTeamNote",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Update team note
  async updateTeamNote(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const note = await teamNotesService.updateTeamNote(id, updateData);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: note,
        message: "Team note updated successfully",
      });
    } catch (error) {
      await logger.error(error, {
        controller: "TeamNotesController",
        method: "updateTeamNote",
        noteId: req.params.id,
      });

      if (error.message === "Team note not found") {
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

  // Delete team note
  async deleteTeamNote(req, res) {
    try {
      const { id } = req.params;

      const result = await teamNotesService.deleteTeamNote(id);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: result.message,
      });
    } catch (error) {
      await logger.error(error, {
        controller: "TeamNotesController",
        method: "deleteTeamNote",
        noteId: req.params.id,
      });

      if (error.message === "Team note not found") {
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

  // Delete all team notes
  async deleteAllTeamNotes(req, res) {
    try {
      const result = await teamNotesService.deleteAllTeamNotes();

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        message: result.message,
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      await logger.error(error, {
        controller: "TeamNotesController",
        method: "deleteAllTeamNotes",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Get user settings
  async getUserSettings(req, res) {
    try {
      const settings = await teamNotesService.getUserSettings();

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: settings,
        message: "User settings retrieved successfully",
      });
    } catch (error) {
      await logger.error(error, {
        controller: "TeamNotesController",
        method: "getUserSettings",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // Update user settings
  async updateUserSettings(req, res) {
    try {
      const updateData = req.body;

      const settings = await teamNotesService.updateUserSettings(updateData);

      return sendResponse(res, 200, {
        status: STATUS.SUCCESS,
        data: settings,
        message: "User settings updated successfully",
      });
    } catch (error) {
      await logger.error(error, {
        controller: "TeamNotesController",
        method: "updateUserSettings",
      });

      return sendResponse(res, 500, {
        status: STATUS.FAILED,
        message: error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }
  }
}

const teamNotesController = new TeamNotesController();
module.exports = teamNotesController;
