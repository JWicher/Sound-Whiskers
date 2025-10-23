'use client';

import useSWR from 'swr';
import { toast } from 'sonner';
import type { ProfileDto, UpdateProfileCommand } from '@/types';

const fetcher = async (url: string): Promise<ProfileDto> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || 'Failed to fetch profile');
  }
  return res.json();
};

export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR<ProfileDto>(
    '/api/profile',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const updateUsername = async (command: UpdateProfileCommand): Promise<boolean> => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error?.message || 'Failed to update username');
        return false;
      }

      const updatedProfile = await res.json();
      
      // Update cache with new profile data
      await mutate(updatedProfile, false);
      
      toast.success('Username updated successfully');
      return true;
    } catch {
      toast.error('Something went wrong. Please try again.');
      return false;
    }
  };

  return {
    profile: data,
    isLoading,
    error,
    updateUsername,
    refresh: mutate,
  };
}

