import { NextRequest, NextResponse } from 'next/server';
import { spotifySearchQuerySchema } from '@/lib/validators/playlistSchemas';
import { getSpotifyAccessToken } from '@/lib/utils';
import { ApiError } from '@/lib/errors/ApiError';
import { handleApiError } from '@/lib/errors/handleApiError';
import type { SpotifySearchDto, SpotifySearchResultDto } from '@/types';

// Use Node.js runtime for external API integration
export const runtime = 'nodejs';

// Spotify API search response type
interface SpotifySearchResponse {
  tracks: {
    items: Array<{
      id: string;
      name: string;
      artists: Array<{ name: string }>;
      album: { name: string };
      uri: string;
    }>;
    next?: string;
  };
}

/**
 * GET /api/spotify/search
 * Search for songs on Spotify with artist + title query
 * 
 * Query params:
 * - artist (required): Artist name
 * - title (optional): Track title (partial match)
 * - limit (optional): Number of results (default 10, max 10)
 * - market (optional): ISO 3166-1 alpha-2 country code
 * - cursor (optional): Pagination cursor (not typically used)
 * 
 * Response: SpotifySearchDto with deduplicated tracks
 */
export async function GET(request: NextRequest) {
  try {
    // Validate and parse query parameters
    const queryParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = spotifySearchQuerySchema.safeParse(queryParams);

    if (!parseResult.success) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Invalid query parameters',
        { issues: parseResult.error.issues }
      );
    }

    const { artist, title, limit, market } = parseResult.data;

    // Build Spotify search query with Spotify operators
    // Format: track:TITLE artist:ARTIST
    let spotifyQuery = `artist:"${artist}"`;
    if (title) {
      spotifyQuery = `track:"${title}" ${spotifyQuery}`;
    }

    // Get Spotify access token with timeout
    let token: string;
    try {
      token = await Promise.race([
        getSpotifyAccessToken(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Spotify auth timeout')), 10000)
        ),
      ]);
    } catch (error) {
      console.error('Spotify authentication failed in search route', error);
      throw new ApiError(
        502,
        'UPSTREAM_ERROR',
        'Failed to authenticate with Spotify'
      );
    }

    // Construct search URL with parameters
    const searchUrl = new URL('https://api.spotify.com/v1/search');
    searchUrl.searchParams.set('q', spotifyQuery);
    searchUrl.searchParams.set('type', 'track');
    searchUrl.searchParams.set('limit', String(limit));
    if (market) {
      searchUrl.searchParams.set('market', market);
    }

    // Execute Spotify search with 25-second timeout
    let searchResponse: Response;
    try {
      searchResponse = await Promise.race([
        fetch(searchUrl.toString(), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Spotify search timeout')), 25000)
        ),
      ]);
    } catch (error) {
      console.error('Spotify search request timed out or failed', error);
      throw new ApiError(504, 'TIMEOUT', 'Spotify search timed out');
    }

    // Handle Spotify API errors
    if (searchResponse.status === 429) {
      throw new ApiError(429, 'RATE_LIMITED', 'Spotify rate limit exceeded');
    }

    if (!searchResponse.ok) {
      if (searchResponse.status === 401) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Invalid Spotify credentials');
      }
      throw new ApiError(
        502,
        'UPSTREAM_ERROR',
        `Spotify API error: ${searchResponse.statusText}`
      );
    }

    const data = (await searchResponse.json()) as SpotifySearchResponse;

    // Deduplicate tracks by track ID and map to our DTO format
    const seenTrackIds = new Set<string>();
    const uniqueResults: SpotifySearchResultDto[] = [];

    for (const track of data.tracks.items) {
      // Skip duplicates
      if (seenTrackIds.has(track.id)) {
        continue;
      }

      seenTrackIds.add(track.id);

      uniqueResults.push({
        trackId: track.id,
        trackUri: track.uri,
        title: track.name,
        artist: track.artists[0]?.name || 'Unknown Artist',
        album: track.album.name,
      });
    }

    const response: SpotifySearchDto = {
      items: uniqueResults,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error);
  }
}
