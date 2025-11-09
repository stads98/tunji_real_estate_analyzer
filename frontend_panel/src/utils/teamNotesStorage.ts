import { TeamNote, UserSettings } from "../types/deal";

const TEAM_NOTES_KEY = "deal-analyzer-team-notes";
const USER_SETTINGS_KEY = "deal-analyzer-user-settings";

// Default user settings - Dan and Eman
const DEFAULT_USER_SETTINGS: UserSettings = {
  user1Name: "Dan",
  user2Name: "Eman",
};

// Load all team notes from localStorage
export const loadTeamNotes = (): TeamNote[] => {
  try {
    const stored = localStorage.getItem(TEAM_NOTES_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error loading team notes:", error);
    return [];
  }
};

// Save all team notes to localStorage
export const saveTeamNotes = (notes: TeamNote[]): boolean => {
  try {
    localStorage.setItem(TEAM_NOTES_KEY, JSON.stringify(notes));
    return true;
  } catch (error) {
    console.error("Error saving team notes:", error);
    return false;
  }
};

// Clear all team notes
export const clearAllTeamNotes = (): boolean => {
  try {
    localStorage.setItem(TEAM_NOTES_KEY, JSON.stringify([]));
    return true;
  } catch (error) {
    console.error("Error clearing team notes:", error);
    return false;
  }
};

// Add a new note
export const addTeamNote = (
  dealId: string,
  author: "user1" | "user2",
  message: string
): TeamNote => {
  const note: TeamNote = {
    id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    dealId,
    author,
    message: message.trim(),
    timestamp: new Date().toISOString(),
    isPinned: false,
  };

  const allNotes = loadTeamNotes();
  allNotes.push(note);
  saveTeamNotes(allNotes);

  return note;
};

// Add a system-generated note for change tracking
export const addSystemNote = (
  dealId: string,
  message: string,
  changeType: "stage" | "maxOffer" | "rehab" | "offMarket" | "price"
): TeamNote => {
  const note: TeamNote = {
    id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    dealId,
    author: "system",
    message: message.trim(),
    timestamp: new Date().toISOString(),
    isPinned: false,
    isSystemNote: true,
    changeType,
  };

  const allNotes = loadTeamNotes();
  allNotes.push(note);
  saveTeamNotes(allNotes);

  return note;
};

// Update a note (edit message or toggle pin)
export const updateTeamNote = (
  noteId: string,
  updates: Partial<TeamNote>
): boolean => {
  try {
    const allNotes = loadTeamNotes();
    const noteIndex = allNotes.findIndex((n) => n.id === noteId);

    if (noteIndex === -1) return false;

    allNotes[noteIndex] = { ...allNotes[noteIndex], ...updates };
    return saveTeamNotes(allNotes);
  } catch (error) {
    console.error("Error updating team note:", error);
    return false;
  }
};

// Delete a note (system notes cannot be deleted)
export const deleteTeamNote = (noteId: string): boolean => {
  try {
    const allNotes = loadTeamNotes();
    const note = allNotes.find((n) => n.id === noteId);

    // Prevent deletion of system notes
    if (note?.isSystemNote) {
      console.warn("Cannot delete system-generated notes");
      return false;
    }

    const filtered = allNotes.filter((n) => n.id !== noteId);
    return saveTeamNotes(filtered);
  } catch (error) {
    console.error("Error deleting team note:", error);
    return false;
  }
};

// Toggle pin status
export const togglePinNote = (noteId: string): boolean => {
  const allNotes = loadTeamNotes();
  const note = allNotes.find((n) => n.id === noteId);
  if (!note) return false;

  return updateTeamNote(noteId, { isPinned: !note.isPinned });
};

// Get notes for a specific deal
export const getNotesForDeal = (dealId: string): TeamNote[] => {
  const allNotes = loadTeamNotes();
  return allNotes.filter((n) => n.dealId === dealId);
};

// Get all notes sorted
export const getAllNotesSorted = (
  sortBy: "newest" | "oldest" | "pinned" = "newest"
): TeamNote[] => {
  const allNotes = loadTeamNotes();

  if (sortBy === "pinned") {
    return allNotes.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  if (sortBy === "oldest") {
    return allNotes.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  // Default: newest first
  return allNotes.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

// User settings management
export const loadUserSettings = (): UserSettings => {
  try {
    const stored = localStorage.getItem(USER_SETTINGS_KEY);
    if (!stored) return DEFAULT_USER_SETTINGS;
    return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(stored) };
  } catch (error) {
    console.error("Error loading user settings:", error);
    return DEFAULT_USER_SETTINGS;
  }
};

export const saveUserSettings = (settings: UserSettings): boolean => {
  try {
    localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error("Error saving user settings:", error);
    return false;
  }
};

// Get display name for author
export const getAuthorName = (author: "user1" | "user2" | "system"): string => {
  if (author === "system") return "System";
  const settings = loadUserSettings();
  return author === "user1" ? settings.user1Name : settings.user2Name;
};

// Delete all notes for a deal (when deal is deleted)
export const deleteNotesForDeal = (dealId: string): boolean => {
  try {
    const allNotes = loadTeamNotes();
    const filtered = allNotes.filter((n) => n.dealId !== dealId);
    return saveTeamNotes(filtered);
  } catch (error) {
    console.error("Error deleting notes for deal:", error);
    return false;
  }
};
