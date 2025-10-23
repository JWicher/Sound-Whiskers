import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SpotifyStatusDto } from '@/types';

export async function GET() {
  try {
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

    // TODO: Check spotify_tokens table for user's token
    // For now, return not linked
    const status: SpotifyStatusDto = {
      linked: false,
    };

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get Spotify status' } },
      { status: 500 }
    );
  }
}

