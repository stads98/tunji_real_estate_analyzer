// backend_service/routes/sub routes/team-notes.routes.js
const express = require("express");
const router = express.Router();
const teamNotesController = require("../../controllers/team-notes.controller");

// Team notes routes
router
  .route("/")
  .get(teamNotesController.getTeamNotes)
  .post(teamNotesController.createTeamNote)
  .delete(teamNotesController.deleteAllTeamNotes);

router
  .route("/:id")
  .patch(teamNotesController.updateTeamNote)
  .delete(teamNotesController.deleteTeamNote);

// User settings routes
router
  .route("/user-settings")
  .get(teamNotesController.getUserSettings)
  .put(teamNotesController.updateUserSettings);

module.exports = router;
