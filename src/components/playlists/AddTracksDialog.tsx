'use client';

import { useState, useEffect } from 'react';
import type { AddTracksCommand, SpotifySearchResultDto } from '@/types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useSpotifySearch } from '@/lib/hooks/useSpotifySearch';
import { AlertCircle, Plus, Loader2 } from 'lucide-react';

interface AddTracksDialogProps {
    playlistId: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onTrackAdded: () => Promise<void>;
    existingTrackUris: string[];
}

export function AddTracksDialog({
    playlistId,
    isOpen,
    onOpenChange,
    onTrackAdded,
    existingTrackUris,
}: AddTracksDialogProps) {
    const [artist, setArtist] = useState('');
    const [title, setTitle] = useState('');
    const [isAddingTrack, setIsAddingTrack] = useState(false);
    const [duplicateError, setDuplicateError] = useState<string | null>(null);
    const [addError, setAddError] = useState<string | null>(null);

    const { results, loading, error, search, clearResults } = useSpotifySearch(350);

    // Search when artist or title changes
    useEffect(() => {
        if (!isOpen) return;

        const minLength = 2;
        if (artist.length < minLength) {
            clearResults();
            setDuplicateError(null);
            return;
        }

        search({ artist, title: title || undefined, limit: 10 });
    }, [artist, title, isOpen, search, clearResults]);

    const handleAddTrack = async (result: SpotifySearchResultDto) => {
        if (existingTrackUris.includes(result.trackUri)) {
            setDuplicateError(result.trackId);
            return;
        }

        setIsAddingTrack(true);
        setAddError(null);
        try {
            const command: AddTracksCommand = {
                tracks: [
                    {
                        trackUri: result.trackUri,
                        artist: result.artist,
                        title: result.title,
                        album: result.album,
                    },
                ],
                insertAfterPosition: 0,
            };

            const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(command),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error.message || 'Failed to add track');
            }

            // Refetch playlists and close dialog
            await onTrackAdded();
            setArtist('');
            setTitle('');
            clearResults();
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to add track';
            setAddError(message);
        } finally {
            setIsAddingTrack(false);
        }
    };

    const handleClose = () => {
        setArtist('');
        setTitle('');
        setDuplicateError(null);
        setAddError(null);
        clearResults();
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Tracks</DialogTitle>
                    <DialogDescription>
                        Search for songs to add to your playlist. Enter artist name (required) and optionally
                        a track title.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search Form */}
                    <div className="space-y-3">
                        <div>
                            <label htmlFor="artist-input" className="block text-sm font-medium mb-1">
                                Artist Name
                            </label>
                            <Input
                                id="artist-input"
                                placeholder="e.g., Ed Sheeran"
                                value={artist}
                                onChange={(e) => setArtist(e.target.value)}
                                disabled={isAddingTrack}
                            />
                            {artist.length > 0 && artist.length < 2 && (
                                <p className="text-xs text-destructive mt-1">Minimum 2 characters</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="title-input" className="block text-sm font-medium mb-1">
                                Track Title (Optional)
                            </label>
                            <Input
                                id="title-input"
                                placeholder="e.g., Shape of You"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                disabled={isAddingTrack}
                            />
                        </div>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {addError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{addError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Results */}
                    <div className="space-y-2">
                        {loading && (
                            <div className="space-y-2">
                                {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-16 w-full" />
                                ))}
                            </div>
                        )}

                        {!loading && results.length === 0 && artist.length >= 2 && (
                            <div className="text-center py-6">
                                <p className="text-muted-foreground">No results found</p>
                            </div>
                        )}

                        {results.map((result) => {
                            const isDuplicate = existingTrackUris.includes(result.trackUri);
                            const hasDuplicateError = duplicateError === result.trackId;

                            return (
                                <Card key={result.trackId} className="p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{result.title}</p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {result.artist} • {result.album}
                                            </p>
                                            {isDuplicate && (
                                                <p className="text-xs text-destructive mt-1">Already in playlist</p>
                                            )}
                                            {hasDuplicateError && (
                                                <p className="text-xs text-destructive mt-1">Failed to add - duplicate</p>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleAddTrack(result)}
                                            disabled={isDuplicate || isAddingTrack}
                                            variant={isDuplicate ? 'outline' : 'default'}
                                        >
                                            {isAddingTrack ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Plus className="mr-1 h-4 w-4" />
                                                    Add
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isAddingTrack}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
