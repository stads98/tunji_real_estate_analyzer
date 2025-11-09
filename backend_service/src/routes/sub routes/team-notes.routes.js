// backend_service/routes/sub routes/team-notes.routes.js
const express = require("express");
const router = express.Router();
const teamNotesController = require("../../controllers/team-notes.controller");
const {
  getTeamNotesValidation,
  createTeamNoteValidation,
  updateTeamNoteValidation,
  deleteTeamNoteValidation,
  updateUserSettingsValidation,
} = require("../../validators/team.validators");

// Team notes routes
router
  .route("/")
  .get(getTeamNotesValidation, teamNotesController.getTeamNotes)
  .post(createTeamNoteValidation, teamNotesController.createTeamNote)
  .delete(teamNotesController.deleteAllTeamNotes);

router
  .route("/:id")
  .patch(updateTeamNoteValidation, teamNotesController.updateTeamNote)
  .delete(deleteTeamNoteValidation, teamNotesController.deleteTeamNote);

// User settings routes
router
  .route("/user-settings")
  .get(teamNotesController.getUserSettings)
  .put(updateUserSettingsValidation, teamNotesController.updateUserSettings);

module.exports = router;
