import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { exchangeAuthorizationCode, getEncryptionKey } from '@/lib/spotify/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('Spotify OAuth error:', error);
    const errorDescription = searchParams.get('error_description') || error;
    return NextResponse.redirect(
      new URL(
        `/profile?error=spotify_auth_denied&details=${encodeURIComponent(errorDescription)}`,
        process.env.NEXT_PUBLIC_APP_URL
      )
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/profile?error=spotify_invalid_callback', process.env.NEXT_PUBLIC_APP_URL)
    );
  }

  // Verify state for CSRF protection
  const cookieStore = cookies();
  const storedState = cookieStore.get('spotify_oauth_state')?.value;

  if (!storedState || storedState !== state) {
    console.error('State mismatch - potential CSRF attack');
    cookieStore.delete('spotify_oauth_state');
    return NextResponse.redirect(
      new URL('/profile?error=spotify_state_mismatch', process.env.NEXT_PUBLIC_APP_URL)
    );
  }

  // Clear the state cookie
  cookieStore.delete('spotify_oauth_state');

  try {
    // Get authenticated user
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL('/auth/login?next=/profile', process.env.NEXT_PUBLIC_APP_URL)
      );
    }

    // Exchange authorization code for tokens
    const tokens = await exchangeAuthorizationCode(code);

    // Get encryption key from Supabase Secrets
    const encryptionKey = await getEncryptionKey();

    // Store tokens using RPC function (handles encryption)
    const { error: storeError } = await supabase.rpc('store_spotify_tokens', {
      p_user_id: user.id,
      p_access_token: tokens.accessToken,
      p_refresh_token: tokens.refreshToken,
      p_expires_at: tokens.expiresAt,
      p_encryption_key: encryptionKey,
    });

    if (storeError) {
      console.error('Failed to store Spotify tokens:', storeError);
      throw new Error('Failed to store authentication tokens');
    }

    // Redirect to profile with success message
    return NextResponse.redirect(
      new URL('/profile?spotify=linked', process.env.NEXT_PUBLIC_APP_URL)
    );
  } catch (error) {
    console.error('Spotify OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(
        '/profile?error=spotify_token_exchange_failed&details=' +
          encodeURIComponent((error instanceof Error ? error.message : 'Unknown error') || 'Failed to link Spotify'),
        process.env.NEXT_PUBLIC_APP_URL
      )
    );
  }
}
