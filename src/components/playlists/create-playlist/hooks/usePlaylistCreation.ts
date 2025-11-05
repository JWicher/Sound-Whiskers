import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { CreatePlaylistCommand, PlaylistDto } from '@/types';

interface UsePlaylistCreationOptions {
    onPlaylistCreated: (command: CreatePlaylistCommand) => Promise<PlaylistDto>;
}

export function usePlaylistCreation({ onPlaylistCreated }: UsePlaylistCreationOptions) {
    const [isCreating, setIsCreating] = useState(false);

    const createPlaylist = useCallback(
        async (command: CreatePlaylistCommand) => {
            setIsCreating(true);

            try {
                const playlist = await onPlaylistCreated(command);

                toast.success('Playlist created successfully!');

                return playlist;
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Failed to create playlist';
                toast.error(message);
                return null;
            } finally {
                setIsCreating(false);
            }
        },
        [onPlaylistCreated],
    );

    return {
        isCreating,
        createPlaylist,
    };
}

