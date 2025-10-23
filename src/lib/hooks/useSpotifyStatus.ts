'use client';

import useSWR from 'swr';
import { toast } from 'sonner';
import type { SpotifyStatusDto } from '@/types';

const fetcher = async (url: string): Promise<SpotifyStatusDto> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || 'Failed to fetch Spotify status');
  }
  return res.json();
};

export function useSpotifyStatus() {
  const { data, error, isLoading, mutate } = useSWR<SpotifyStatusDto>(
    '/api/spotify/status',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const unlinkSpotify = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/spotify/link', {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error?.message || 'Failed to unlink Spotify');
        return false;
      }

      // Update cache to show not linked
      await mutate({ linked: false }, false);
      
      toast.success('Spotify account unlinked successfully');
      return true;
    } catch {
      toast.error('Something went wrong. Please try again.');
      return false;
    }
  };

  const linkSpotify = () => {
    // Redirect to OAuth flow
    window.location.href = '/api/spotify/login';
  };

  return {
    status: data,
    isLoading,
    error,
    unlinkSpotify,
    linkSpotify,
    refresh: mutate,
  };
}

