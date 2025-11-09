import React, { useState } from 'react';
import { MessageSquare, Pin, Trash2, Send } from 'lucide-react';
import { TeamNote } from '../types/deal';
import {
  getNotesForDeal,
  addTeamNote,
  deleteTeamNote,
  togglePinNote,
  getAuthorName,
} from '../utils/teamNotesStorage';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';

interface DealNotesProps {
  dealId: string;
  onNotesChange?: () => void;
}

export const DealNotes: React.FC<DealNotesProps> = ({
  dealId,
  onNotesChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<TeamNote[]>(() => getNotesForDeal(dealId));
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<'user1' | 'user2'>('user1');

  const refreshNotes = () => {
    setNotes(getNotesForDeal(dealId));
    onNotesChange?.();
  };

  const handleAddNote = () => {
    if (!newMessage.trim()) return;

    addTeamNote(dealId, currentUser, newMessage);
    setNewMessage('');
    refreshNotes();
  };

  const handleDeleteNote = (noteId: string) => {
    deleteTeamNote(noteId);
    refreshNotes();
  };

  const handleTogglePin = (noteId: string) => {
    togglePinNote(noteId);
    refreshNotes();
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
          <MessageSquare className="h-4 w-4" />
          <span>Notes</span>
          {notes.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {notes.length}
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
              onChange={e => setCurrentUser(e.target.value as 'user1' | 'user2')}
              className="flex-1 rounded border border-border bg-background px-3 py-1.5 text-sm font-medium"
            >
              <option value="user1">👤 {getAuthorName('user1')} (Dan)</option>
              <option value="user2">👤 {getAuthorName('user2')} (Eman)</option>
            </select>
          </div>

          <Textarea
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder={`Write a note as ${getAuthorName(currentUser)}...`}
            className="min-h-[60px] resize-none"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleAddNote();
              }
            }}
          />

          <Button
            onClick={handleAddNote}
            size="sm"
            disabled={!newMessage.trim()}
            className="w-full"
          >
            <Send className="mr-2 h-4 w-4" />
            Add Note as {getAuthorName(currentUser)}
          </Button>
        </div>

        {/* Notes List */}
        {sortedNotes.length > 0 ? (
          <div className="space-y-2">
            {sortedNotes.map(note => (
              <div
                key={note.id}
                className={`relative rounded-lg border p-3 ${
                  note.isPinned
                    ? 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20'
                    : note.isSystemNote
                      ? 'border-slate-300 bg-slate-50/50'
                      : 'border-border bg-background'
                }`}
              >
                {note.isPinned && (
                  <div className="absolute -top-2 left-3">
                    <Badge
                      variant="outline"
                      className="border-amber-500 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    >
                      <Pin className="mr-1 h-3 w-3" />
                      Pinned
                    </Badge>
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={note.author === 'user1' ? 'default' : 'secondary'}
                        className={`text-xs font-semibold ${
                          note.isSystemNote
                            ? 'bg-slate-500 text-white'
                            : note.author === 'user1' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-purple-600 text-white'
                        }`}
                      >
                        {note.isSystemNote ? '🔒' : '👤'} {getAuthorName(note?.author)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(note.timestamp)}
                      </span>
                    </div>
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
                          title={note.isPinned ? 'Unpin' : 'Pin'}
                        >
                          <Pin
                            className={`h-3.5 w-3.5 ${
                              note.isPinned ? 'fill-current text-amber-600' : ''
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
