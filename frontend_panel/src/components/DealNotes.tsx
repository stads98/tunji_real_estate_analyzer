// src/components/DealNotes.tsx
import React, { useState, useEffect } from "react";
import { MessageSquare, Pin, Trash2, Send, Loader2 } from "lucide-react";
import { TeamNote } from "../types/deal";
import { dashboardService } from "../services/dashboard.service";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { toast } from "sonner";

interface DealNotesProps {
  dealId: string;
  onNotesChange?: () => void;
}

export const DealNotes: React.FC<DealNotesProps> = ({
  dealId,
  onNotesChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<TeamNote[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<"user1" | "user2">("user1");
  const [loading, setLoading] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [userSettings, setUserSettings] = useState({
    user1Name: "Dan",
    user2Name: "Eman",
  });

  // Load notes and user settings
  useEffect(() => {
    loadNotes();
    loadUserSettings();
  }, [isOpen, dealId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const response = await dashboardService.getTeamNotes({
        dealId,
        sortBy: "newest",
      });
      setNotes(response.data);
    } catch (error) {
      console.error("Failed to load notes:", error);
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const loadUserSettings = async () => {
    try {
      const response = await dashboardService.getUserSettings();
      setUserSettings(response.data);
    } catch (error) {
      console.error("Failed to load user settings:", error);
    }
  };

  const refreshNotes = () => {
    loadNotes();
    onNotesChange?.();
  };

  const handleAddNote = async () => {
    if (!newMessage.trim()) return;

    try {
      setAddingNote(true);
      await dashboardService.createTeamNote({
        dealId,
        author: currentUser,
        message: newMessage.trim(),
        isPinned: false,
      });

      setNewMessage("");
      refreshNotes();
      toast.success("Note added successfully");
    } catch (error) {
      console.error("Failed to add note:", error);
      toast.error("Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await dashboardService.deleteTeamNote(noteId);
      refreshNotes();
      toast.success("Note deleted successfully");
    } catch (error) {
      console.error("Failed to delete note:", error);
      toast.error("Failed to delete note");
    }
  };

  const handleTogglePin = async (noteId: string) => {
    try {
      const note = notes.find((n) => n.id === noteId);
      if (note) {
        await dashboardService.updateTeamNote(noteId, {
          isPinned: !note.isPinned,
        });
        refreshNotes();
        toast.success(note.isPinned ? "Note unpinned" : "Note pinned");
      }
    } catch (error) {
      console.error("Failed to update note:", error);
      toast.error("Failed to update note");
    }
  };

  const getAuthorName = (author: string): string => {
    switch (author) {
      case "user1":
        return userSettings.user1Name || "Dan";
      case "user2":
        return userSettings.user2Name || "Eman";
      case "system":
        return "System";
      default:
        return author;
    }
  };

  // FIXED: Use createdAt field from API response instead of timestamp
  const getNoteDate = (note: TeamNote): Date => {
    // Use createdAt, updatedAt, or fallback to current date
    return new Date(
      note.createdAt || note.updatedAt || new Date().toISOString()
    );
  };

  // FIXED: Updated to use note object instead of just timestamp string
  const formatRelativeTime = (note: TeamNote) => {
    const date = getNoteDate(note);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // FIXED: Updated sorting to use proper date fields
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return getNoteDate(b).getTime() - getNoteDate(a).getTime();
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Notes</span>
          {notes.length > 0 ? (
            <Badge variant="secondary" className="ml-auto">
              {notes.length}
            </Badge>
          ) : (
            <Badge variant="secondary" className="ml-auto">
              0
            </Badge>
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-3">
        {/* Add Note Form */}
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Posting as:</Label>
            <select
              value={currentUser}
              onChange={(e) =>
                setCurrentUser(e.target.value as "user1" | "user2")
              }
              className="flex-1 rounded border border-border bg-background px-3 py-1.5 text-sm font-medium"
            >
              <option value="user1">👤 {getAuthorName("user1")}</option>
              <option value="user2">👤 {getAuthorName("user2")}</option>
            </select>
          </div>

          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Write a note as ${getAuthorName(currentUser)}...`}
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleAddNote();
              }
            }}
          />

          <Button
            onClick={handleAddNote}
            size="sm"
            disabled={!newMessage.trim() || addingNote}
            className="w-full"
          >
            {addingNote ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Add Note as {getAuthorName(currentUser)}
          </Button>
        </div>

        {/* Notes List */}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sortedNotes.length > 0 ? (
          <div className="space-y-2">
            {sortedNotes.map((note) => (
              <div
                key={note.id}
                className={`relative rounded-lg border p-3 ${
                  note.isPinned
                    ? "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
                    : note.isSystemNote
                    ? "border-slate-300 bg-slate-50/50"
                    : "border-border bg-background"
                }`}
              >
                {/* FIXED: Better layout to prevent badge overlap */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    {/* Header - FIXED: Better badge layout without absolute positioning */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Pinned Badge - only show if pinned */}
                      {note.isPinned && (
                        <Badge
                          variant="outline"
                          className="border-amber-500 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        >
                          <Pin className="mr-1 h-3 w-3" />
                          Pinned
                        </Badge>
                      )}

                      {/* Author Badge */}
                      <Badge
                        variant={
                          note.author === "user1" ? "default" : "secondary"
                        }
                        className={`text-xs font-semibold ${
                          note.isSystemNote
                            ? "bg-slate-500 text-white"
                            : note.author === "user1"
                            ? "bg-blue-600 text-white"
                            : "bg-purple-600 text-white"
                        }`}
                      >
                        {note.isSystemNote ? "🔒" : "👤"}{" "}
                        {getAuthorName(note.author)}
                      </Badge>

                      {/* Relative time */}
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(note)}
                      </span>
                    </div>

                    {/* Message */}
                    <p className="text-sm leading-relaxed">{note.message}</p>
                  </div>

                  <div className="flex gap-1 items-center">
                    {!note.isSystemNote ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePin(note.id)}
                          className="h-7 w-7 p-0"
                          title={note.isPinned ? "Unpin" : "Pin"}
                        >
                          <Pin
                            className={`h-3.5 w-3.5 ${
                              note.isPinned ? "fill-current text-amber-600" : ""
                            }`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNote(note.id)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground italic px-1">
                        Auto
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No notes yet. Add your first note above.
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
