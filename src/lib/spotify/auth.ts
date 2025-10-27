import { ApiError } from '@/lib/errors/ApiError';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export async function getEncryptionKey(): Promise<string> {
  const encryptionKey = process.env.SPOTIFY_ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Server misconfiguration: SPOTIFY_ENCRYPTION_KEY not configured');
  }

  return encryptionKey;
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function exchangeAuthorizationCode(code: string): Promise<TokenData> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Spotify OAuth credentials not configured');
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Spotify token exchange failed:', error);
      throw new ApiError(401, 'SPOTIFY_AUTH_FAILED', `Failed to exchange authorization code: ${error.error_description || 'Unknown error'}`);
    }

    const data: SpotifyTokenResponse = await response.json();

    // Calculate expiry time (current time + expires_in seconds)
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || '',
      expiresAt,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error('Spotify token exchange error:', error);
    throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Failed to exchange authorization code');
  }
}

/**
 * Generate authorization URL for Spotify OAuth flow
 */
export function generateAuthorizationUrl(state: string): string {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Spotify OAuth credentials not configured');
  }

  const scope = 'playlist-modify-private playlist-modify-public';

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope,
    state,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * Refresh expired access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenData> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Spotify OAuth credentials not configured');
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Spotify token refresh failed:', error);
      throw new ApiError(401, 'SPOTIFY_AUTH_FAILED', 'Failed to refresh access token');
    }

    const data: SpotifyTokenResponse = await response.json();

    // Calculate expiry time (current time + expires_in seconds)
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Use existing refresh token if not provided
      expiresAt,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error('Spotify token refresh error:', error);
    throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Failed to refresh access token');
  }
}

/**
 * Generate random state string for CSRF protection
 */
export function generateRandomState(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
