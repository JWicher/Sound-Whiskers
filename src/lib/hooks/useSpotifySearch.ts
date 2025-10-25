import { useState, useCallback, useRef } from 'react';
import type { SpotifySearchResultDto } from '@/types';

interface SearchParams {
  artist: string;
  title?: string;
  limit?: number;
  market?: string;
}

interface UseSpotifySearchState {
  results: SpotifySearchResultDto[];
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook for searching Spotify tracks via /api/spotify/search
 * Provides debounced search, loading states, and error handling
 */
export function useSpotifySearch(debounceMs = 300) {
  const [state, setState] = useState<UseSpotifySearchState>({
    results: [],
    loading: false,
    error: null,
  });

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(
    async (params: SearchParams) => {
      // Clear previous timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Guard: validate required artist parameter
      if (!params.artist || params.artist.trim().length === 0) {
        setState({
          results: [],
          loading: false,
          error: 'Artist name is required',
        });
        return;
      }

      // Debounce the search
      debounceTimeoutRef.current = setTimeout(async () => {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        try {
          const queryParams = new URLSearchParams();
          queryParams.append('artist', params.artist);
          if (params.title) {
            queryParams.append('title', params.title);
          }
          if (params.limit) {
            queryParams.append('limit', String(params.limit));
          }
          if (params.market) {
            queryParams.append('market', params.market);
          }

          const response = await fetch(`/api/spotify/search?${queryParams}`);

          if (!response.ok) {
            const errorData = await response.json();
            const message =
              errorData.error?.message || 'Search failed';
            throw new Error(message);
          }

          const data = await response.json();
          setState({
            results: data.items || [],
            loading: false,
            error: null,
          });
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'Unknown error occurred';
          setState({
            results: [],
            loading: false,
            error: errorMessage,
          });
        }
      }, debounceMs);
    },
    [debounceMs]
  );

  const clearResults = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    setState({
      results: [],
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    search,
    clearResults,
  };
}
