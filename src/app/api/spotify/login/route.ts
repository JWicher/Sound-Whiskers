import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // TODO: Implement Spotify OAuth flow
    // For now, redirect back to profile with error
    return NextResponse.redirect(new URL('/profile?error=spotify_not_configured', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to start Spotify OAuth' } },
      { status: 500 }
    );
  }
}

