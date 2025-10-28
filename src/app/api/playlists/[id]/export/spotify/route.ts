import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEncryptionKey, refreshAccessToken } from '@/lib/spotify/auth';
import { ApiError } from '@/lib/errors/ApiError';
import { handleApiError } from '@/lib/errors/handleApiError';
import { z } from 'zod';
import type { ExportToSpotifyCommand, ExportToSpotifyResponseDto } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 second timeout

const exportCommandSchema = z.object({
  description: z.string().nullable().optional(),
});

async function getUserId() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

function unauthorized() {
  return NextResponse.json(
    { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
    { status: 401 }
  );
}

/**
 * Get valid Spotify access token (refreshes if expired)
 */
async function getValidAccessToken(userId: string): Promise<string> {
  const supabase = createClient();
  const encryptionKey = await getEncryptionKey();

  // Get tokens from database
  const { data, error } = await supabase.rpc('get_spotify_tokens', {
    p_user_id: userId,
    p_encryption_key: encryptionKey,
  });

  if (error || !data || data.length === 0) {
    throw new ApiError(403, 'SPOTIFY_NOT_LINKED', 'Spotify account not linked');
  }

  const tokenData = data[0];
  const now = new Date();
  const expiresAt = new Date(tokenData.expires_at);

  // If token is still valid, return it
  if (expiresAt > now) {
    return tokenData.access_token;
  }

  // Token expired, refresh it
  const refreshedTokens = await refreshAccessToken(tokenData.refresh_token);

  // Store new tokens
  await supabase.rpc('store_spotify_tokens', {
    p_user_id: userId,
    p_access_token: refreshedTokens.accessToken,
    p_refresh_token: refreshedTokens.refreshToken,
    p_expires_at: refreshedTokens.expiresAt,
    p_encryption_key: encryptionKey,
  });

  return refreshedTokens.accessToken;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    // Parse and validate request body
    const body = await request.json();
    const parseResult = exportCommandSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parseResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const command: ExportToSpotifyCommand = parseResult.data;
    const playlistId = params.id;
    const supabase = createClient();

    // Verify playlist exists and is owned by user
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('id, name, owner_id')
      .eq('id', playlistId)
      .eq('owner_id', userId)
      .eq('is_deleted', false)
      .single();

    if (playlistError || !playlist) {
      throw new ApiError(404, 'NOT_FOUND', 'Playlist not found');
    }

    // Get all tracks from the playlist
    const { data: tracks, error: tracksError } = await supabase
      .from('playlist_tracks')
      .select('track_uri, artist, title, album, position')
      .eq('playlist_id', playlistId)
      .eq('is_deleted', false)
      .order('position', { ascending: true });

    if (tracksError) {
      throw tracksError;
    }

    // Check if playlist has tracks
    if (!tracks || tracks.length === 0) {
      throw new ApiError(409, 'EMPTY_PLAYLIST', 'Cannot export empty playlist');
    }

    // Get valid access token (auto-refreshes if needed)
    const accessToken = await getValidAccessToken(userId);

    // 1. Get Spotify user ID
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      if (userResponse.status === 429) {
        throw new ApiError(429, 'RATE_LIMIT_EXCEEDED', 'Spotify rate limit exceeded. Please try again later.');
      }
      if (userResponse.status === 401) {
        throw new ApiError(403, 'SPOTIFY_NOT_LINKED', 'Spotify authentication failed. Please re-link your account.');
      }
      throw new ApiError(502, 'SPOTIFY_API_ERROR', `Failed to get Spotify user data: ${userResponse.status}`);
    }

    const userData = await userResponse.json();

    // 2. Create playlist on Spotify
    const playlistName = playlist.name;
    const createPlaylistResponse = await fetch(
      `https://api.spotify.com/v1/users/${userData.id}/playlists`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: playlistName,
          public: false,
          description: command.description || 'Exported from Sound Whiskers',
        }),
      }
    );

    if (!createPlaylistResponse.ok) {
      if (createPlaylistResponse.status === 429) {
        throw new ApiError(429, 'RATE_LIMIT_EXCEEDED', 'Spotify rate limit exceeded. Please try again later.');
      }
      throw new ApiError(502, 'SPOTIFY_API_ERROR', `Failed to create Spotify playlist: ${createPlaylistResponse.status}`);
    }

    const playlistData = await createPlaylistResponse.json();

    // 3. Add tracks to the playlist
    // Spotify API accepts up to 100 tracks per request, so we may need to batch
    const trackUris = tracks.map((track) => track.track_uri);
    const batchSize = 100;

    for (let i = 0; i < trackUris.length; i += batchSize) {
      const batch = trackUris.slice(i, i + batchSize);

      const addTracksResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uris: batch,
          }),
        }
      );

      if (!addTracksResponse.ok) {
        if (addTracksResponse.status === 429) {
          throw new ApiError(429, 'RATE_LIMIT_EXCEEDED', 'Spotify rate limit exceeded. Please try again later.');
        }
        throw new ApiError(502, 'SPOTIFY_API_ERROR', `Failed to add tracks to Spotify playlist: ${addTracksResponse.status}`);
      }
    }

    // 4. Return success response
    const response: ExportToSpotifyResponseDto = {
      spotifyPlaylistId: playlistData.id,
      spotifyPlaylistUrl: playlistData.external_urls.spotify,
      exported: tracks.length,
      note: 'Re-export creates a new copy',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        {
          error: {
            code: 'TIMEOUT',
            message: 'Export operation timed out. Please try again.',
          },
        },
        { status: 504 }
      );
    }

    return handleApiError(error);
  }
}

