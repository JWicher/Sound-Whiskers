'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  PlaylistListDto, 
  PlaylistDto, 
  CreatePlaylistCommand, 
  UpdatePlaylistCommand,
  ListPlaylistsOptions,
  ErrorResponse 
} from '@/types';

interface UsePlaylistsState {
  playlists: PlaylistListDto | null;
  loading: boolean;
  error: string | null;
}

interface UsePlaylistsActions {
  fetchPlaylists: (options?: Partial<ListPlaylistsOptions>) => Promise<void>;
  createPlaylist: (data: CreatePlaylistCommand) => Promise<PlaylistDto>;
  updatePlaylist: (id: string, data: UpdatePlaylistCommand) => Promise<PlaylistDto>;
  deletePlaylist: (id: string) => Promise<void>;
  refreshPlaylists: () => Promise<void>;
}

interface UsePlaylistsReturn extends UsePlaylistsState, UsePlaylistsActions {}

const DEFAULT_OPTIONS: ListPlaylistsOptions = {
  page: 1,
  pageSize: 10,
  sort: 'updated_at.desc',
  isDeleted: false
};

export function usePlaylists(): UsePlaylistsReturn {
  const [state, setState] = useState<UsePlaylistsState>({
    playlists: null,
    loading: false,
    error: null
  });

  const [currentOptions, setCurrentOptions] = useState<ListPlaylistsOptions>(DEFAULT_OPTIONS);

  const handleError = useCallback((error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }, []);

  const fetchPlaylists = useCallback(async (options?: Partial<ListPlaylistsOptions>) => {
    const mergedOptions = { ...currentOptions, ...options };
    setCurrentOptions(mergedOptions);
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const searchParams = new URLSearchParams({
        page: mergedOptions.page.toString(),
        pageSize: mergedOptions.pageSize.toString(),
        sort: mergedOptions.sort,
        isDeleted: mergedOptions.isDeleted.toString(),
        ...(mergedOptions.search && { search: mergedOptions.search })
      });

      const response = await fetch(`/api/playlists?${searchParams}`);
      
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error.message || 'Failed to fetch playlists');
      }

      const data: PlaylistListDto = await response.json();
      setState(prev => ({ ...prev, playlists: data, loading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: handleError(error) 
      }));
    }
  }, [currentOptions, handleError]);

  const createPlaylist = useCallback(async (data: CreatePlaylistCommand): Promise<PlaylistDto> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error.message || 'Failed to create playlist');
      }

      const playlist: PlaylistDto = await response.json();
      setState(prev => ({ ...prev, loading: false }));
      
      // Refresh the list after creating
      await fetchPlaylists();
      
      return playlist;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: handleError(error) 
      }));
      throw error;
    }
  }, [fetchPlaylists, handleError]);

  const updatePlaylist = useCallback(async (id: string, data: UpdatePlaylistCommand): Promise<PlaylistDto> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch(`/api/playlists/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error.message || 'Failed to update playlist');
      }

      const playlist: PlaylistDto = await response.json();
      setState(prev => ({ ...prev, loading: false }));
      
      // Refresh the list after updating
      await fetchPlaylists();
      
      return playlist;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: handleError(error) 
      }));
      throw error;
    }
  }, [fetchPlaylists, handleError]);

  const deletePlaylist = useCallback(async (id: string): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch(`/api/playlists/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error.message || 'Failed to delete playlist');
      }

      setState(prev => ({ ...prev, loading: false }));
      
      // Refresh the list after deleting
      await fetchPlaylists();
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: handleError(error) 
      }));
      throw error;
    }
  }, [fetchPlaylists, handleError]);

  const refreshPlaylists = useCallback(async () => {
    await fetchPlaylists();
  }, [fetchPlaylists]);

  // Initial fetch on mount
  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  return {
    playlists: state.playlists,
    loading: state.loading,
    error: state.error,
    fetchPlaylists,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    refreshPlaylists
  };
}
