'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PlaylistDto, UpdatePlaylistCommand, ErrorResponse } from '@/types';

interface UsePlaylistState {
  playlist: PlaylistDto | null;
  loading: boolean;
  error: string | null;
}

interface UsePlaylistActions {
  fetchPlaylist: () => Promise<void>;
  update: (data: UpdatePlaylistCommand) => Promise<PlaylistDto>;
  remove: () => Promise<void>;
}

export function usePlaylist(playlistId: string): UsePlaylistState & UsePlaylistActions {
  const [state, setState] = useState<UsePlaylistState>({ playlist: null, loading: false, error: null });

  const handleError = useCallback((error: unknown): string => {
    if (error instanceof Error) return error.message;
    return 'An unexpected error occurred';
  }, []);

  const fetchPlaylist = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`/api/playlists/${playlistId}`);
      if (!res.ok) {
        const err: ErrorResponse = await res.json();
        throw new Error(err.error.message || 'Failed to fetch playlist');
      }
      const data: PlaylistDto = await res.json();
      setState(prev => ({ ...prev, playlist: data, loading: false }));
    } catch (e) {
      setState(prev => ({ ...prev, loading: false, error: handleError(e) }));
    }
  }, [playlistId, handleError]);

  const update = useCallback(async (data: UpdatePlaylistCommand): Promise<PlaylistDto> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
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
      setState(prev => ({ ...prev, playlist: updated, loading: false }));
      return updated;
    } catch (e) {
      setState(prev => ({ ...prev, loading: false, error: handleError(e) }));
      throw e;
    }
  }, [playlistId, handleError]);

  const remove = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err: ErrorResponse = await res.json();
        throw new Error(err.error.message || 'Failed to delete playlist');
      }
      setState(prev => ({ ...prev, loading: false }));
    } catch (e) {
      setState(prev => ({ ...prev, loading: false, error: handleError(e) }));
      throw e;
    }
  }, [playlistId, handleError]);

  useEffect(() => {
    fetchPlaylist();
  }, [fetchPlaylist]);

  return { ...state, fetchPlaylist, update, remove };
}


