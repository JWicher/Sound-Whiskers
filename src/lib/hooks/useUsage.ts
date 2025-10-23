'use client';

import useSWR from 'swr';
import type { ProfileUsageDto } from '@/types';

const fetcher = async (url: string): Promise<ProfileUsageDto> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || 'Failed to fetch usage');
  }
  return res.json();
};

export function useUsage() {
  const { data, error, isLoading, mutate } = useSWR<ProfileUsageDto>(
    '/api/profile/usage',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    usage: data,
    isLoading,
    error,
    refresh: mutate,
  };
}

