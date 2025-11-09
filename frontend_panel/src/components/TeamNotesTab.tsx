import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Pin,
  Trash2,
  Filter,
  SortAsc,
  SortDesc,
  Settings,
  Calendar,
} from 'lucide-react';
import { TeamNote, SavedDeal } from '../types/deal';
import {
  getAllNotesSorted,
  deleteTeamNote,
  togglePinNote,
  getAuthorName,
  loadUserSettings,
  saveUserSettings,
  clearAllTeamNotes,
} from '../utils/teamNotesStorage';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Label } from './ui/label';

interface TeamNotesTabProps {
  savedDeals: SavedDeal[];
}

export const TeamNotesTab: React.FC<TeamNotesTabProps> = ({ savedDeals }) => {
  const [notes, setNotes] = useState<TeamNote[]>([]);
  const [filterDeal, setFilterDeal] = useState<string>('all');
  const [filterAuthor, setFilterAuthor] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'pinned'>('pinned');
  const [searchQuery, setSearchQuery] = useState('');
  
  // User settings
  const [user1Name, setUser1Name] = useState('');
  const [user2Name, setUser2Name] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    loadNotes();
    loadNames();
  }, []);

  const loadNotes = () => {
    const allNotes = getAllNotesSorted(sortBy);
    setNotes(allNotes);
  };

  const loadNames = () => {
    const settings = loadUserSettings();
    setUser1Name(settings.user1Name || '');
    setUser2Name(settings.user2Name || '');
  };

  const handleSaveSettings = () => {
    saveUserSettings({
      user1Name: user1Name || 'You',
      user2Name: user2Name || 'Partner',
    });
    setSettingsOpen(false);
    loadNames();
    loadNotes();
  };

  const handleDeleteNote = (noteId: string) => {
    deleteTeamNote(noteId);
    loadNotes();
  };

  const handleTogglePin = (noteId: string) => {
    togglePinNote(noteId);
    loadNotes();
  };

  const handleClearAllNotes = () => {
    if (window.confirm('⚠️ Are you sure you want to delete ALL notes?\n\nThis will permanently delete all team notes (user notes and system notes) and cannot be undone.\n\nDownload a backup first if you want to preserve them.')) {
      clearAllTeamNotes();
      loadNotes();
    }
  };

  const getDealAddress = (dealId: string): string => {
    const deal = savedDeals.find(d => d.id === dealId);
    return deal?.address || 'Unknown Address';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatRelativeTime = (timestamp: string) => {
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

  // Date filter helper functions
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isThisWeek = (date: Date): boolean => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return date >= weekAgo;
  };

  const isThisMonth = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Filter and search notes
  const filteredNotes = notes.filter(note => {
    if (filterDeal !== 'all' && note.dealId !== filterDeal) return false;
    if (filterAuthor !== 'all' && note.author !== filterAuthor) return false;
    
    // Date filtering
    if (filterDate !== 'all') {
      const noteDate = new Date(note.timestamp);
      if (filterDate === 'today' && !isToday(noteDate)) return false;
      if (filterDate === 'week' && !isThisWeek(noteDate)) return false;
      if (filterDate === 'month' && !isThisMonth(noteDate)) return false;
    }
    
    if (searchQuery && !note.message.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const pinnedCount = notes.filter(n => n.isPinned).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl">
            <MessageSquare className="h-6 w-6" />
            Team Notes
          </h1>
          <p className="text-sm text-muted-foreground">
            Collaborate with your team on deals
          </p>
        </div>

        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Team Member Names</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="user1" className="text-sm font-medium">
                  👤 Dan (User 1)
                </Label>
                <Input
                  id="user1"
                  value={user1Name}
                  onChange={e => setUser1Name(e.target.value)}
                  placeholder="Dan"
                  className="font-medium"
                />
                <p className="text-xs text-muted-foreground">This is you (Dan)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="user2" className="text-sm font-medium">
                  👤 Eman (User 2)
                </Label>
                <Input
                  id="user2"
                  value={user2Name}
                  onChange={e => setUser2Name(e.target.value)}
                  placeholder="Eman"
                  className="font-medium"
                />
                <p className="text-xs text-muted-foreground">Your partner (Eman)</p>
              </div>
              <Button onClick={handleSaveSettings} className="w-full">
                Save Names
              </Button>
              
              {/* Clear All Notes Section */}
              <div className="pt-4 border-t border-border">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-red-600">
                    🗑️ Danger Zone
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete all team notes (user notes and system notes).
                    This cannot be undone!
                  </p>
                  <Button 
                    onClick={handleClearAllNotes} 
                    variant="destructive" 
                    className="w-full"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All Notes
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl">{notes.length}</div>
          <div className="text-sm text-muted-foreground">Total Notes</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl">{pinnedCount}</div>
          <div className="text-sm text-muted-foreground">Pinned</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl">{savedDeals.length}</div>
          <div className="text-sm text-muted-foreground">Active Deals</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        <Select value={filterDate} onValueChange={(value: any) => setFilterDate(value as 'all' | 'today' | 'week' | 'month')}>
          <SelectTrigger className="w-[160px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterDeal} onValueChange={setFilterDeal}>
          <SelectTrigger className="w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by deal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Deals</SelectItem>
            {savedDeals.map(deal => (
              <SelectItem key={deal.id} value={deal.id}>
                {deal.address}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterAuthor} onValueChange={setFilterAuthor}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by author" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Authors</SelectItem>
            <SelectItem value="user1">👤 {getAuthorName('user1')} (Dan)</SelectItem>
            <SelectItem value="user2">👤 {getAuthorName('user2')} (Eman)</SelectItem>
            <SelectItem value="system">🔒 System</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={(value: string) => {
            setSortBy(value as 'newest' | 'oldest' | 'pinned');
            loadNotes();
          }}
        >
          <SelectTrigger className="w-[160px]">
            {sortBy === 'oldest' ? (
              <SortAsc className="mr-2 h-4 w-4" />
            ) : (
              <SortDesc className="mr-2 h-4 w-4" />
            )}
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pinned">Pinned First</SelectItem>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notes List */}
      {filteredNotes.length > 0 ? (
        <div className="space-y-3">
          {filteredNotes.map(note => (
            <div
              key={note.id}
              className={`relative rounded-lg border p-4 ${
                note.isPinned
                  ? 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20'
                  : note.isSystemNote
                    ? 'border-slate-300 bg-slate-50/50'
                    : 'border-border bg-card'
              }`}
            >
              {note.isPinned && (
                <div className="absolute -top-2 left-4">
                  <Badge
                    variant="outline"
                    className="border-amber-500 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  >
                    <Pin className="mr-1 h-3 w-3" />
                    Pinned
                  </Badge>
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* Header */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={`font-semibold ${
                        note.isSystemNote
                          ? 'bg-slate-500 text-white hover:bg-slate-600'
                          : note.author === 'user1' 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {note.isSystemNote ? '🔒' : '👤'} {getAuthorName(note.author)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(note.timestamp)}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {getDealAddress(note.dealId)}
                    </span>
                  </div>

                  {/* Message */}
                  <p className="text-sm leading-relaxed">{note.message}</p>

                  {/* Full timestamp */}
                  <div className="text-xs text-muted-foreground">
                    {formatTimestamp(note.timestamp)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 items-center min-w-[80px] justify-end">
                  {!note.isSystemNote ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePin(note.id)}
                        className="h-8 w-8 p-0"
                        title={note.isPinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin
                          className={`h-4 w-4 ${
                            note.isPinned ? 'fill-current text-amber-600' : ''
                          }`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground italic px-2">
                      Auto-tracked
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg">No notes found</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery || filterDeal !== 'all' || filterAuthor !== 'all'
              ? 'Try adjusting your filters'
              : 'Add notes to deals to start collaborating'}
          </p>
        </div>
      )}
    </div>
  );
};
