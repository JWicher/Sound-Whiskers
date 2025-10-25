'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaylistHeader } from '@/components/playlists/PlaylistHeader';
import { PlaylistMetaSection } from '@/components/playlists/PlaylistMetaSection';
import { ReorderableTrackList } from '@/components/playlists/ReorderableTrackList';
import { UnsavedChangesBar } from '@/components/playlists/UnsavedChangesBar';
import { AddTracksDialog } from '@/components/playlists/AddTracksDialog';
import { ExportDialog } from '@/components/playlists/ExportDialog';
import { ConfirmDialog } from '@/components/playlists/ConfirmDialog';
import { usePlaylist } from '@/lib/hooks/usePlaylist';
import type { PlaylistTrackDto, ReorderTracksExplicitCommand } from '@/types';

interface PlaylistDetailClientProps {
    id: string;
}

export function PlaylistDetailClient({ id }: PlaylistDetailClientProps) {
    const router = useRouter();
    const {
        playlist,
        tracks,
        loading,
        loadingTracks,
        error,
        update,
        remove,
        removeTrack,
        reorderTracks,
        fetchTracks,
    } = usePlaylist(id);

    // Modal states
    const [showAddTracksDialog, setShowAddTracksDialog] = useState(false);
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showRemoveTrackConfirm, setShowRemoveTrackConfirm] = useState(false);
    const [selectedTrackForRemoval, setSelectedTrackForRemoval] = useState<number | null>(null);

    // Unsaved changes tracking
    const [modifiedTracks, setModifiedTracks] = useState<PlaylistTrackDto[] | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Check if order has changed
    const hasUnsavedChanges = useMemo(() => {
        if (!modifiedTracks) return false;
        return JSON.stringify(modifiedTracks) !== JSON.stringify(tracks);
    }, [modifiedTracks, tracks]);

    // Get existing track URIs for duplicate checking
    const existingTrackUris = useMemo(() => tracks.map((t) => t.trackUri), [tracks]);

    // Handle drag end - detect position changes
    const handleDragEnd = (newOrder: PlaylistTrackDto[]) => {
        setModifiedTracks(newOrder);
    };

    // Save reordered tracks
    const handleSaveOrder = async () => {
        if (!modifiedTracks) return;

        setIsSavingOrder(true);
        try {
            const command: ReorderTracksExplicitCommand = {
                ordered: modifiedTracks.map((track) => ({
                    position: track.position,
                    trackUri: track.trackUri,
                })),
            };
            await reorderTracks(command);
            setModifiedTracks(null);
            toast.success('Tracks reordered successfully');
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to save order';
            toast.error(message);
        } finally {
            setIsSavingOrder(false);
        }
    };

    // Discard changes
    const handleDiscardChanges = () => {
        setModifiedTracks(null);
    };

    // Handle add tracks - refetch after adding
    const handleTrackAdded = async () => {
        await fetchTracks();
        toast.success('Track added successfully');
    };

    // Handle remove track
    const handleRemoveTrackClick = (position: number) => {
        setSelectedTrackForRemoval(position);
        setShowRemoveTrackConfirm(true);
    };

    const handleConfirmRemoveTrack = async () => {
        if (selectedTrackForRemoval === null) return;
        try {
            await removeTrack(selectedTrackForRemoval);
            setShowRemoveTrackConfirm(false);
            setSelectedTrackForRemoval(null);
            toast.success('Track removed');
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to remove track';
            toast.error(message);
        }
    };

    // Handle delete playlist
    const handleDeletePlaylist = async () => {
        setIsDeleting(true);
        try {
            await remove();
            toast.success('Playlist deleted');
            router.push('/playlists');
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to delete playlist';
            toast.error(message);
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle export
    const handleExportSuccess = async () => {
        await fetchTracks(); // Refetch to update track count if needed
        toast.success('Playlist exported to Spotify!');
    };

    // Handle update playlist metadata
    const handleUpdatePlaylist = async (data: {
        name?: string;
        description?: string | null;
    }) => {
        try {
            await update(data);
            toast.success('Playlist updated');
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to update playlist';
            toast.error(message);
            throw e;
        }
    };

    if (loading && !playlist) {
        return (
            <div className="container mx-auto py-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading playlist...
                </div>
            </div>
        );
    }

    if (error && !playlist) {
        return (
            <div className="container mx-auto py-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-destructive">Failed to load playlist</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" onClick={() => router.push('/playlists')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Playlists
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!playlist) return null;

    const trackCount = playlist.trackCount ?? tracks.length;
    const displayTracks = modifiedTracks || tracks;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/playlists')}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </div>

            {/* Title and export button */}
            <PlaylistHeader
                playlistName={playlist.name}
                trackCount={trackCount}
                onExportClick={() => setShowExportDialog(true)}
                isLoading={loading}
                isLoadingTracks={loadingTracks}
                disableExport={!playlist}
            />

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column - Metadata and actions */}
                <div className="lg:col-span-1">
                    <PlaylistMetaSection
                        playlist={playlist}
                        isLoading={loading}
                        onAddTracksClick={() => setShowAddTracksDialog(true)}
                        onDeletePlaylistClick={() => setShowDeleteConfirm(true)}
                        onUpdatePlaylist={handleUpdatePlaylist}
                        isSaving={loading}
                    />
                </div>

                {/* Right column - Track list */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Unsaved changes bar */}
                    {hasUnsavedChanges && (
                        <UnsavedChangesBar
                            isVisible={hasUnsavedChanges}
                            isSaving={isSavingOrder}
                            onSaveOrder={handleSaveOrder}
                            onDiscardChanges={handleDiscardChanges}
                        />
                    )}

                    {/* Track list */}
                    <ReorderableTrackList
                        tracks={displayTracks}
                        isLoading={loadingTracks}
                        onDragEnd={handleDragEnd}
                        onRemoveTrack={handleRemoveTrackClick}
                    />
                </div>
            </div>

            {/* Modals */}
            <AddTracksDialog
                playlistId={id}
                isOpen={showAddTracksDialog}
                onOpenChange={setShowAddTracksDialog}
                onTrackAdded={handleTrackAdded}
                existingTrackUris={existingTrackUris}
            />

            <ExportDialog
                playlistId={id}
                playlistName={playlist.name}
                trackCount={trackCount}
                isOpen={showExportDialog}
                onOpenChange={setShowExportDialog}
                onExportSuccess={handleExportSuccess}
            />

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Delete Playlist"
                description="Are you sure? This action cannot be undone."
                onOpenChange={setShowDeleteConfirm}
                onConfirm={handleDeletePlaylist}
                isLoading={isDeleting}
                confirmText="Delete"
            />

            <ConfirmDialog
                isOpen={showRemoveTrackConfirm}
                title="Remove Track"
                description="Are you sure you want to remove this track from the playlist?"
                onOpenChange={setShowRemoveTrackConfirm}
                onConfirm={handleConfirmRemoveTrack}
                confirmText="Remove"
            />
        </div>
    );
}


