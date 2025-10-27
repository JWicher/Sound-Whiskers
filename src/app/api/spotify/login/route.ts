import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { generateAuthorizationUrl, generateRandomState } from '@/lib/spotify/auth';

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
    // Generate state for CSRF protection
    const state = generateRandomState();

    // Store state in secure, httpOnly cookie with 10-minute expiry
    const cookieStore = cookies();
    cookieStore.set('spotify_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    // Generate authorization URL
    const authUrl = generateAuthorizationUrl(state);

    // Redirect to Spotify authorization endpoint
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Failed to start Spotify OAuth:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to start Spotify OAuth' } },
      { status: 500 }
    );
  }
}

