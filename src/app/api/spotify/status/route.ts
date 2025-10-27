import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEncryptionKey } from '@/lib/spotify/auth';
import type { SpotifyStatusDto } from '@/types';

export const runtime = 'nodejs';

export async function GET() {
  // Check authentication first
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  try {
    const encryptionKey = await getEncryptionKey();

    // Call RPC function to get token data (if it exists and is encrypted)
    const { data, error } = await supabase.rpc('get_spotify_tokens', {
      p_user_id: user.id,
      p_encryption_key: encryptionKey,
    });

    // RPC returns empty array if no tokens found
    if (error || !data || data.length === 0) {
      const status: SpotifyStatusDto = {
        linked: false,
      };
      return NextResponse.json(status);
    }

    // Extract expiry information from the first result
    const tokenData = data[0];
    const status: SpotifyStatusDto = {
      linked: true,
      expiresAt: tokenData.expires_at,
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Failed to get Spotify status:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get Spotify status' } },
      { status: 500 }
    );
  }
}

