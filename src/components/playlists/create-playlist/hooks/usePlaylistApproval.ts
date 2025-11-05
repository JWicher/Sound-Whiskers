import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { AddTracksCommand, CreatePlaylistCommand, GeneratePlaylistResponseDto, PlaylistDto } from '@/types';

interface UsePlaylistApprovalOptions {
    onPlaylistCreated: (command: CreatePlaylistCommand) => Promise<PlaylistDto>;
    refreshPlaylists: () => Promise<void>;
    onReset: () => void;
}

export function usePlaylistApproval({
    onPlaylistCreated,
    refreshPlaylists,
    onReset,
}: UsePlaylistApprovalOptions) {
    const [isApproving, setIsApproving] = useState(false);

    const approvePlaylist = useCallback(
        async (preview: GeneratePlaylistResponseDto) => {
            setIsApproving(true);

            let loadingToastId: string | number | undefined;

            try {
                const command: CreatePlaylistCommand = {
                    name: preview.playlistName || 'AI Generated Playlist',
                    description: preview.playlistDescription || preview.summary || null,
                };

                const playlist = await onPlaylistCreated(command);
                toast.success('Playlist created successfully!');

                const tracks = preview.items
                    .filter((item) => Boolean(item.trackUri))
                    .map((item) => ({
                        trackUri: item.trackUri,
                        artist: item.artist,
                        title: item.title,
                        album: item.album,
                    }));

                if (tracks.length > 0) {
                    loadingToastId = toast.loading('Adding tracks to playlist...');

                    const tracksCommand: AddTracksCommand = {
                        tracks,
                        insertAfterPosition: 0,
                    };

                    const addTracksResponse = await fetch(`/api/playlists/${playlist.id}/tracks`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(tracksCommand),
                    });

                    if (!addTracksResponse.ok) {
                        const errorData = await addTracksResponse.json().catch(() => null);
                        console.error('Failed to add tracks:', errorData);
                        toast.error('Could not add tracks to playlist.');
                    }
                } else {
                    toast.warning(
                        'Playlist created, but no tracks could be found on Spotify. Add tracks manually.',
                    );
                }

                if (preview.summary) {
                    toast.info(preview.summary);
                }

                await refreshPlaylists();
                onReset();
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Failed to create playlist';
                toast.error(message);
            } finally {
                if (loadingToastId) {
                    toast.dismiss(loadingToastId);
                }
                setIsApproving(false);
            }
        },
        [onPlaylistCreated, onReset, refreshPlaylists],
    );

    return {
        isApproving,
        approvePlaylist,
    };
}

