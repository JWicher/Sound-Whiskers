import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Spotify token cache (in-memory, 1 hour expiry)
interface SpotifyTokenCache {
  token: string;
  expiresAt: number;
}

let spotifyTokenCache: SpotifyTokenCache | null = null;

/**
 * Gets a valid Spotify API access token using Client Credentials flow
 * Tokens are cached for ~1 hour to reduce API calls
 */
export async function getSpotifyAccessToken(): Promise<string> {
  const now = Date.now();
  
  // Return cached token if still valid
  if (spotifyTokenCache && spotifyTokenCache.expiresAt > now) {
    return spotifyTokenCache.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify credentials in environment variables');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Failed to get Spotify token: ${response.statusText}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  
  // Cache token with 5-minute buffer before expiry
  spotifyTokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in - 300) * 1000,
  };

  return data.access_token;
}
