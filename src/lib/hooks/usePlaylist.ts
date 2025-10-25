'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  PlaylistDto,
  PlaylistTrackDto,
  PlaylistTrackListDto,
  UpdatePlaylistCommand,
  AddTracksCommand,
  ReorderTracksExplicitCommand,
  ExportToSpotifyCommand,
  ExportToSpotifyResponseDto,
  ErrorResponse,
} from '@/types';

interface UsePlaylistState {
  playlist: PlaylistDto | null;
  tracks: PlaylistTrackDto[];
  loading: boolean;
  loadingTracks: boolean;
  error: string | null;
}

interface UsePlaylistActions {
  fetchPlaylist: () => Promise<void>;
  update: (data: UpdatePlaylistCommand) => Promise<PlaylistDto>;
  remove: () => Promise<void>;
  fetchTracks: () => Promise<void>;
  addTracks: (command: AddTracksCommand) => Promise<void>;
  removeTrack: (position: number) => Promise<void>;
  reorderTracks: (command: ReorderTracksExplicitCommand) => Promise<void>;
  exportToSpotify: (command: ExportToSpotifyCommand) => Promise<ExportToSpotifyResponseDto>;
}

export function usePlaylist(playlistId: string): UsePlaylistState & UsePlaylistActions {
  const [state, setState] = useState<UsePlaylistState>({
    playlist: null,
    tracks: [],
    loading: false,
    loadingTracks: false,
    error: null,
  });

  const handleError = useCallback((error: unknown): string => {
    if (error instanceof Error) return error.message;
    return 'An unexpected error occurred';
  }, []);

  const fetchPlaylist = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`/api/playlists/${playlistId}`);
      if (!res.ok) {
        const err: ErrorResponse = await res.json();
        throw new Error(err.error.message || 'Failed to fetch playlist');
      }
      const data: PlaylistDto = await res.json();
      setState((prev) => ({ ...prev, playlist: data, loading: false }));
    } catch (e) {
      setState((prev) => ({ ...prev, loading: false, error: handleError(e) }));
    }
  }, [playlistId, handleError]);

  const fetchTracks = useCallback(async () => {
    setState((prev) => ({ ...prev, loadingTracks: true, error: null }));
    try {
      const res = await fetch(`/api/playlists/${playlistId}/tracks?pageSize=100`);
      if (!res.ok) {
        const err: ErrorResponse = await res.json();
        throw new Error(err.error.message || 'Failed to fetch tracks');
      }
      const data: PlaylistTrackListDto = await res.json();
      setState((prev) => ({ ...prev, tracks: data.items || [], loadingTracks: false }));
    } catch (e) {
      setState((prev) => ({ ...prev, loadingTracks: false, error: handleError(e) }));
    }
  }, [playlistId, handleError]);

  const update = useCallback(
    async (data: UpdatePlaylistCommand): Promise<PlaylistDto> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const res = await fetch(`/api/playlists/${playlistId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err: ErrorResponse = await res.json();
          throw new Error(err.error.message || 'Failed to update playlist');
        }
        const updated: PlaylistDto = await res.json();
        setState((prev) => ({ ...prev, playlist: updated, loading: false }));
        return updated;
      } catch (e) {
        setState((prev) => ({ ...prev, loading: false, error: handleError(e) }));
        throw e;
      }
    },
    [playlistId, handleError]
  );

  const remove = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err: ErrorResponse = await res.json();
        throw new Error(err.error.message || 'Failed to delete playlist');
      }
      setState((prev) => ({ ...prev, loading: false }));
    } catch (e) {
      setState((prev) => ({ ...prev, loading: false, error: handleError(e) }));
      throw e;
    }
  }, [playlistId, handleError]);

  const addTracks = useCallback(
    async (command: AddTracksCommand): Promise<void> => {
      try {
        const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(command),
        });
        if (!res.ok) {
          const err: ErrorResponse = await res.json();
          throw new Error(err.error.message || 'Failed to add tracks');
        }
        // Refetch tracks after adding
        await fetchTracks();
      } catch (e) {
        setState((prev) => ({ ...prev, error: handleError(e) }));
        throw e;
      }
    },
    [playlistId, handleError, fetchTracks]
  );

  const removeTrack = useCallback(
    async (position: number): Promise<void> => {
      try {
        const res = await fetch(`/api/playlists/${playlistId}/tracks/${position}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const err: ErrorResponse = await res.json();
          throw new Error(err.error.message || 'Failed to remove track');
        }
        // Refetch tracks after removing
        await fetchTracks();
      } catch (e) {
        setState((prev) => ({ ...prev, error: handleError(e) }));
        throw e;
      }
    },
    [playlistId, handleError, fetchTracks]
  );

  const reorderTracks = useCallback(
    async (command: ReorderTracksExplicitCommand): Promise<void> => {
      try {
        const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(command),
        });
        if (!res.ok) {
          const err: ErrorResponse = await res.json();
          throw new Error(err.error.message || 'Failed to reorder tracks');
        }
        // Refetch tracks after reordering
        await fetchTracks();
      } catch (e) {
        setState((prev) => ({ ...prev, error: handleError(e) }));
        throw e;
      }
    },
    [playlistId, handleError, fetchTracks]
  );

  const exportToSpotify = useCallback(
    async (command: ExportToSpotifyCommand): Promise<ExportToSpotifyResponseDto> => {
      try {
        const res = await fetch(`/api/playlists/${playlistId}/export/spotify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(command),
        });
        if (!res.ok) {
          const err: ErrorResponse = await res.json();
          throw new Error(err.error.message || 'Failed to export to Spotify');
        }
        const result: ExportToSpotifyResponseDto = await res.json();
        return result;
      } catch (e) {
        setState((prev) => ({ ...prev, error: handleError(e) }));
        throw e;
      }
    },
    [playlistId, handleError]
  );

  useEffect(() => {
    fetchPlaylist();
    fetchTracks();
  }, [playlistId, fetchPlaylist, fetchTracks]);

  return {
    ...state,
    fetchPlaylist,
    update,
    remove,
    fetchTracks,
    addTracks,
    removeTrack,
    reorderTracks,
    exportToSpotify,
  };
}


